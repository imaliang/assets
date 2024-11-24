#!/bin/bash

clear
VERSION="1.1.0"
echo -e "\e[1;32mVersion-${VERSION}\e[0m"
export LC_ALL=C
export UUID=${UUID:-'1bda59f5-0750-498f-77a9-a7721d6346c3'} 
export NEZHA_SERVER=${NEZHA_SERVER:-''}      
export NEZHA_PORT=${NEZHA_PORT:-'5555'}             
export NEZHA_KEY=${NEZHA_KEY:-''}                
export PORT=${PORT:-'60000'} 


USERNAME=$(whoami)
HOSTNAME=$(hostname)
DATE_FORMAT_S=$(date +%s)
DATE_FORMAT=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M:%S')
NUM=$( [[ "$HOSTNAME" =~ ^s([0-9]|[1-2][0-9]|30)\.serv00\.com$ ]] && echo "${BASH_REMATCH[1]}" || echo 1 )
[[ "$HOSTNAME" == "s1.ct8.pl" ]] && HTML_DIR="/home/${USERNAME}/domains/${USERNAME}.ct8.pl/public_html" || HTML_DIR="/home/${USERNAME}/domains/${USERNAME}.serv00.net/public_html"

LOG_FILE="${HTML_DIR}/hy.log"
check_log_file() {
    local log_file_path=$1
    if [ -f "$log_file_path" ]; then
        local logSize=$(stat -f%z "$log_file_path")
        if [[ -n $logSize && $logSize -ge 102400 ]]; then
            rm "$log_file_path"
        fi
    fi
}
check_log_file "$LOG_FILE"
add_log() {
    local new_content="${DATE_FORMAT} - ${VERSION} - ${1}"
    if [ -f "$LOG_FILE" ]; then
        existing_content=$(cat "$LOG_FILE")
        combined_content="$new_content\n$existing_content"
        echo -e "$combined_content" > "$LOG_FILE"
    else
        echo -e "$new_content" > "$LOG_FILE"
    fi
}


check_ip1() {
    local t_host="$1"
    local t_ip="$2"
    if [ -z "$t_ip" ]; then
        return 1
    fi
    local response=$(curl -s --max-time 10 'https://www.vps234.com/ipcheck/getdata/' --data-raw "ip=${t_ip}")
    echo "host=${t_host}, ip=${t_ip}, vps234 response=${response}"
    add_log "host=${t_host}, ip=${t_ip}, vps234 response=${response}"
    # 检查响应是否包含 "innerICMP":true 或 "innerTCP":true
    if [ -z "$response" ] || ! echo "$response" | grep -Eq '"innerICMP":true|"innerTCP":true'; then
        return 1  # 返回 1 表示不可用
    else
        return 0  # 返回 0 表示可用
    fi
}

check_ip2() {
    local t_host="$1"
    local t_ip="$2"
    if [ -z "$t_ip" ]; then
        return 1
    fi
    local url="https://www.toolsdaquan.com/toolapi/public/ipchecking/$t_ip/22"
    local response=$(curl -s --location --max-time 10 --request GET "$url" --header 'Referer: https://www.toolsdaquan.com/ipcheck')
    echo "host=${t_host}, ip=${t_ip}, toolsdaquan response=${response}"
    add_log "host=${t_host}, ip=${t_ip}, toolsdaquan response=${response}"
    if [ -z "$response" ] || ! echo "$response" | grep -Eq '"icmp":"success"|"tcp":"success"'; then
        return 1  # 返回1表示不可用
    else
        return 0  # 返回0表示可用
    fi
}

check_ip() {
    local t_host="$1"
    local t_ip="$2"
    if [ -z "$t_ip" ]; then
        return 1
    fi
    if check_ip1 "$t_host" "$t_ip"; then
        return 0
    fi
    if check_ip2 "$t_host" "$t_ip"; then
        return 0
    fi
    return 1
}

# 检查是否有 "hysteria2" 的进程在运行
C_IP=""
process_status=$(pgrep -f "config.yaml" >/dev/null 2>&1; echo $?)
if [ $process_status -eq 0 ]; then
    echo "hy2 进程正在运行..."
    add_log "hy2 is running..."
    if [ -f "$HTML_DIR/cg.json" ]; then
        C_IP=$(grep '"ip"' "$HTML_DIR/cg.json" | sed 's/.*"ip": "\(.*\)",/\1/')
        if [ -n "$C_IP" ]; then
            CHECK_TIME_S=$(grep '"check_time_s"' "$HTML_DIR/cg.json" | sed -E 's/.*"check_time_s": *"([^"]+)".*/\1/')
            C_TIME_S=$(date +%s)
            T_DIFF=$((C_TIME_S - CHECK_TIME_S))
            if [ "$T_DIFF" -gt 36000 ]; then
                add_log "start check ip ${C_IP}..."
                if check_ip "$C_IP" "$C_IP"; then
                    add_log "ip available."
                    cat <<EOF > $HTML_DIR/cg.json
{
  "username": "$USERNAME",
  "num": "$NUM",
  "check_time": "$DATE_FORMAT",
  "check_time_s": "$C_TIME_S",
  "type": "hysteria2",
  "ip": "$C_IP",
  "port": "$PORT"
}
EOF
                    exit 0
                else
                    add_log "ip not available, start install hy2..."
                fi
            else
                exit 0
            fi
        else
            add_log "ip is null, start install hy2..."
        fi
    fi
else
    add_log "hy2 not exist, start install hy2..."
fi

[[ "$HOSTNAME" == "s1.ct8.pl" ]] && DOMAINS=("cache1.ct8.pl" "web1.ct8.pl") || DOMAINS=("cache${NUM}.serv00.com" "web${NUM}.serv00.com")

ip=$(curl -s --max-time 1.5 ipv4.ip.sb)
if [ -n "$ip" ] && ! check_ip "$ip" "$ip"; then
    ip=""
fi
if [ -z "$ip" ]; then
    for domain in "${DOMAINS[@]}"; do
        m_ip=$(host "$domain" | grep "has address" | awk '{print $4}')
        if check_ip "$domain" "$m_ip"; then
            ip="$m_ip"
            break
        fi
    done
fi

HOST_IP="$ip"

cat <<EOF > $HTML_DIR/cg.json
{
  "username": "$USERNAME",
  "num": "$NUM",
  "check_time": "$DATE_FORMAT",
  "check_time_s": "$DATE_FORMAT_S",
  "type": "hysteria2",
  "ip": "$HOST_IP",
  "port": "$PORT"
}
EOF
# 判断 HOST_IP 是否为空
if [ -z "$HOST_IP" ]; then
  add_log "not find available ip."
  echo "找不到可用IP..."
  exit 0
else
  echo "找到可用IP: $HOST_IP"
fi

if [[ $process_status -eq 0 && "$ip" == "$C_IP" ]]; then
    echo "可用IP没变化 退出安装."
    exit 0
fi

curl -o $HTML_DIR/index.html https://raw.githubusercontent.com/imaliang/assets/master/html/rocket/index.html
echo -e "\e[1;32m自定义检查执行完成\e[0m"
echo -e "\e[1;32m-----------------------------\e[0m"
###################################################################


[[ "$HOSTNAME" == "s1.ct8.pl" ]] && WORKDIR="/home/${USERNAME}/domains/${USERNAME}.ct8.pl/logs" || WORKDIR="/home/${USERNAME}/domains/${USERNAME}.serv00.net/logs"
[ -d "$WORKDIR" ] || (mkdir -p "$WORKDIR" && chmod 777 "$WORKDIR" && cd "$WORKDIR")
ps aux | grep $(whoami) | grep -v "sshd\|bash\|grep" | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1

# Download Dependency Files
# clear
echo -e "\e[1;35m正在安装中,请稍等...\e[0m"
ARCH=$(uname -m) && DOWNLOAD_DIR="." && mkdir -p "$DOWNLOAD_DIR" && FILE_INFO=()
if [ "$ARCH" == "arm" ] || [ "$ARCH" == "arm64" ] || [ "$ARCH" == "aarch64" ]; then
    FILE_INFO=("https://download.hysteria.network/app/latest/hysteria-freebsd-arm64 web" "https://github.com/eooce/test/releases/download/ARM/swith npm")
elif [ "$ARCH" == "amd64" ] || [ "$ARCH" == "x86_64" ] || [ "$ARCH" == "x86" ]; then
    FILE_INFO=("https://download.hysteria.network/app/latest/hysteria-freebsd-amd64 web" "https://github.com/eooce/test/releases/download/freebsd/npm npm")
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi
declare -A FILE_MAP
generate_random_name() {
    local chars=abcdefghijklmnopqrstuvwxyz1234567890
    local name=""
    for i in {1..6}; do
        name="$name${chars:RANDOM%${#chars}:1}"
    done
    echo "$name"
}
download_file() {
    local URL=$1
    local NEW_FILENAME=$2

    if command -v curl >/dev/null 2>&1; then
        curl -L -sS -o "$NEW_FILENAME" "$URL"
        echo -e "\e[1;32mDownloaded $NEW_FILENAME by curl\e[0m"
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O "$NEW_FILENAME" "$URL"
        echo -e "\e[1;32mDownloaded $NEW_FILENAME by wget\e[0m"
    else
        echo -e "\e[1;33mNeither curl nor wget is available for downloading\e[0m"
        exit 1
    fi
}
for entry in "${FILE_INFO[@]}"; do
    URL=$(echo "$entry" | cut -d ' ' -f 1)
    RANDOM_NAME=$(generate_random_name)
    NEW_FILENAME="$DOWNLOAD_DIR/$RANDOM_NAME"
    
    download_file "$URL" "$NEW_FILENAME"
    
    chmod +x "$NEW_FILENAME"
    FILE_MAP[$(echo "$entry" | cut -d ' ' -f 2)]="$NEW_FILENAME"
done
wait

# Generate cert
openssl req -x509 -nodes -newkey ec:<(openssl ecparam -name prime256v1) -keyout "$WORKDIR/server.key" -out "$WORKDIR/server.crt" -subj "/CN=bing.com" -days 36500

####################################

# Generate configuration file
cat << EOF > config.yaml
listen: $HOST_IP:$PORT

tls:
  cert: "$WORKDIR/server.crt"
  key: "$WORKDIR/server.key"

auth:
  type: password
  password: "$UUID"

fastOpen: true

masquerade:
  type: proxy
  proxy:
    url: https://bing.com
    rewriteHost: true

transport:
  udp:
    hopInterval: 30s
EOF

run() {
  if [ -e "$(basename ${FILE_MAP[npm]})" ]; then
    tlsPorts=("443" "8443" "2096" "2087" "2083" "2053")
    if [[ "${tlsPorts[*]}" =~ "${NEZHA_PORT}" ]]; then
      NEZHA_TLS="--tls"
    else
      NEZHA_TLS=""
    fi
    if [ -n "$NEZHA_SERVER" ] && [ -n "$NEZHA_PORT" ] && [ -n "$NEZHA_KEY" ]; then
      export TMPDIR=$(pwd)
      nohup ./"$(basename ${FILE_MAP[npm]})" -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &
      sleep 1
      pgrep -x "$(basename ${FILE_MAP[npm]})" > /dev/null && echo -e "\e[1;32m$(basename ${FILE_MAP[npm]}) is running\e[0m" || { echo -e "\e[1;35m$(basename ${FILE_MAP[npm]}) is not running, restarting...\e[0m"; pkill -f "$(basename ${FILE_MAP[npm]})" && nohup ./"$(basename ${FILE_MAP[npm]})" -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 & sleep 2; echo -e "\e[1;32m"$(basename ${FILE_MAP[npm]})" restarted\e[0m"; }
    else
      echo -e "\e[1;35mNEZHA variable is empty, skipping running\e[0m"
    fi
  fi

  if [ -e "$(basename ${FILE_MAP[web]})" ]; then
    nohup ./"$(basename ${FILE_MAP[web]})" server config.yaml >/dev/null 2>&1 &
    sleep 1
    pgrep -x "$(basename ${FILE_MAP[web]})" > /dev/null && echo -e "\e[1;32m$(basename ${FILE_MAP[web]}) is running\e[0m" || { echo -e "\e[1;35m$(basename ${FILE_MAP[web]}) is not running, restarting...\e[0m"; pkill -f "$(basename ${FILE_MAP[web]})" && nohup ./"$(basename ${FILE_MAP[web]})" server config.yaml >/dev/null 2>&1 & sleep 2; echo -e "\e[1;32m$(basename ${FILE_MAP[web]}) restarted\e[0m"; }
  fi
rm -rf "$(basename ${FILE_MAP[web]})" "$(basename ${FILE_MAP[npm]})"
}
run

get_name() { if [ "$HOSTNAME" = "s1.ct8.pl" ]; then SERVER="CT8"; else SERVER=$(echo "$HOSTNAME" | cut -d '.' -f 1); fi; echo "$SERVER"; }
NAME="$(get_name)-hy2"

ISP=$(curl -s --max-time 2 https://speed.cloudflare.com/meta | awk -F\" '{print $26}' | sed -e 's/ /_/g' || echo "0")

echo -e "\e[1;32mHysteria2安装成功\033[0m\n"
echo -e "\e[1;32m本机IP：$HOST_IP\033[0m\n"
echo -e "\e[1;33mV2rayN 或 Nekobox、小火箭等直接导入,跳过证书验证需设置为true\033[0m\n"
echo -e "\e[1;32mhysteria2://$UUID@$HOST_IP:$PORT/?sni=www.bing.com&alpn=h3&insecure=1#$ISP-$NAME\033[0m\n"
echo -e "\e[1;33mSurge\033[0m"
echo -e "\e[1;32m$ISP-$NAME = hysteria2, $HOST_IP, $PORT, password = $UUID, skip-cert-verify=true, sni=www.bing.com\033[0m\n"
echo -e "\e[1;33mClash\033[0m"
cat << EOF
- name: $ISP-$NAME
  type: hysteria2
  server: $HOST_IP
  port: $PORT
  password: $UUID
  alpn:
    - h3
  sni: www.bing.com
  skip-cert-verify: true
  fast-open: true
EOF
rm -rf config.yaml fake_useragent_0.2.0.json
echo -e "\n\e[1;32mRuning done!\033[0m"
echo -e "\e[1;35m原脚本地址：https://github.com/eooce/scripts\e[0m"

add_log "hy2 install success."

exit 0