#!/bin/bash

# 定义用户名变量
USER_NAME=$USER

# 定义日志文件路径
LOG_FILE="/home/${USER_NAME}/hy2.log"
START_LOG_FILE="/home/${USER_NAME}/hy2s.log"
# 定义文件大小阈值（100 KB = 1024 * 100 字节）
MAX_LOG_SIZE=102400  # 100kb

# 检查日志文件是否存在并获取其大小
if [ -f "$LOG_FILE" ]; then
    LOG_SIZE=$(stat -f%z "$LOG_FILE")
    
    # 确保 LOG_SIZE 是有效的数字
    if [ -n "$LOG_SIZE" ] && [ "$LOG_SIZE" -ge "$MAX_LOG_SIZE" ]; then
        rm "$LOG_FILE"
    fi
fi

# 定义日期格式化为东八区
DATE_FORMAT=$(TZ='Asia/Shanghai' date '+%Y-%m-%d %H:%M:%S')


# 检查是否有 "hysteria2" 的进程在运行
pgrep -f "config.yaml" >> "$LOG_FILE"
process1_status=$?

# 如果找到 "hysteria2" 进程，结束脚本的执行
if [ $process1_status -eq 0 ]; then
    echo "hysteria2 进程正在运行..."
    echo "${DATE_FORMAT} - hysteria2 进程正在运行..." >> "$LOG_FILE"
    exit 0  # 退出脚本
else
    # 如果没有找到 "hysteria2" 进程，则启动它
    echo "${DATE_FORMAT} - Reinstall hy2..." >> "$LOG_FILE"
    echo "${DATE_FORMAT} - Reinstall hy2..." >> "$START_LOG_FILE"
fi
###################################################################
export LC_ALL=C
export UUID=${UUID:-'fc44fe6a-f083-4591-9c03-f8d61dc3907f'} 
export NEZHA_SERVER=${NEZHA_SERVER:-''}      
export NEZHA_PORT=${NEZHA_PORT:-'5555'}             
export NEZHA_KEY=${NEZHA_KEY:-''}                
export PORT=${PORT:-'60000'} 
USERNAME=$(whoami)
HOSTNAME=$(hostname)

[[ "$HOSTNAME" == "s1.ct8.pl" ]] && WORKDIR="domains/${USERNAME}.ct8.pl/logs" || WORKDIR="domains/${USERNAME}.serv00.net/logs"
[ -d "$WORKDIR" ] || (mkdir -p "$WORKDIR" && chmod 777 "$WORKDIR" && cd "$WORKDIR")
ps aux | grep $(whoami) | grep -v "sshd\|bash\|grep" | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1

# Download Dependency Files
clear
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

get_ip() {
  HOSTNAME=$(hostname)
  ip=$(curl -s --max-time 1.5 ipv4.ip.sb)
  if [ -z "$ip" ]; then
    ip=$( [[ "$HOSTNAME" =~ ^s([0-9]|[1-2][0-9]|30)\.serv00\.com$ ]] && echo "cache${BASH_REMATCH[1]}.serv00.com" || echo "$HOSTNAME" )
  else
    url="https://www.toolsdaquan.com/toolapi/public/ipchecking/$ip/22"
    response=$(curl -s --location --max-time 3 --request GET "$url" --header 'Referer: https://www.toolsdaquan.com/ipcheck')
    if [ -z "$response" ] || ! echo "$response" | grep -q '"icmp":"success"'; then
        accessible=false
    else
        accessible=true
    fi
    if [ "$accessible" = false ]; then
        ip=$( [[ "$HOSTNAME" =~ ^s([0-9]|[1-2][0-9]|30)\.serv00\.com$ ]] && echo "cache${BASH_REMATCH[1]}.serv00.com" || echo "$ip" )
    fi
  fi
  echo "$ip"
}
if [[ "$(get_ip)" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    HOST_IP=$(get_ip)
else
    HOST_IP=$(host "$(get_ip)" | grep "has address" | awk '{print $4}')
fi

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


################################################################### 自定义
echo -e "\e[1;32m-----------------------------\e[0m"
[[ "$HOSTNAME" == "s1.ct8.pl" ]] && WORKDIR1="domains/${USERNAME}.ct8.pl/public_html" || WORKDIR1="domains/${USERNAME}.serv00.net/public_html"
cat <<EOF > $WORKDIR1/cg.json
{
  "username": $USERNAME,
  "type": "hysteria2",
  "ip": $HOST_IP,
  "port": $PORT
}
EOF
# 判断 HOST_IP 是否为空
if [ -z "$HOST_IP" ]; then
  echo "HOST_IP 变量为空，开始停止进程..."
  ps aux | grep $(whoami) | grep -v "sshd\|bash\|grep" | awk '{print $2}' | xargs -r kill -9 > /dev/null 2>&1
else
  echo "HOST_IP 变量的值是: $HOST_IP"
fi
curl -o $WORKDIR1/index.html https://raw.githubusercontent.com/imaliang/assets/master/html/rocket/index.html

echo -e "\e[1;32m自定义配置执行完成\e[0m"
echo -e "\e[1;32m-----------------------------\e[0m"
exit 0
