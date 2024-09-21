#!/bin/bash

# 定义用户名变量
USER_NAME=$USER

# 定义日志文件路径
LOG_FILE="/home/${USER_NAME}/log-hy2.log"

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


# 检查是否有名为 "hysteria2" 的进程在运行
pgrep -f "config.yaml" >> "$LOG_FILE"
process1_status=$?

# 如果没有找到 "hysteria2" 进程，则启动它
if [ $process1_status -ne 0 ]; then
    echo "${DATE_FORMAT} - hysteria2 进程好像出了问题，尝试重新启动它..." >> "$LOG_FILE"
    pkill -u $USER
    bash <(curl -Ls https://github.com/eooce/Sing-box/releases/download/00/2.sh)
    echo "${DATE_FORMAT} - hysteria2 进程已启动." >> "$LOG_FILE"
else
    echo "${DATE_FORMAT} - hysteria2 进程正在运行." >> "$LOG_FILE"
fi