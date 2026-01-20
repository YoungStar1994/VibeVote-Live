#!/bin/bash

# VibeVote-Live - 2026 年度盛典实时投票系统
# 一键启停脚本 (已适配云服务器 0.0.0.0 部署)

# 获取脚本所在目录
BASE_DIR=$(cd "$(dirname "$0")"; pwd)
CLIENT_DIR="$BASE_DIR/client"
SERVER_DIR="$BASE_DIR/server"

# 获取内网 IP (适配 Mac 和 Linux)
LOCAL_IP="localhost"
if [[ "$OSTYPE" == "darwin"* ]]; then
    LOCAL_IP=$(ipconfig getifaddr en0 || ipconfig getifaddr en1 || echo "localhost")
else
    LOCAL_IP=$(hostname -I | awk '{print $1}' || echo "localhost")
fi

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    VibeVote-Live 实时互动投票系统    ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 检查并安装依赖
if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo -e "${GREEN}[1/3] 正在安装后端依赖...${NC}"
    cd "$SERVER_DIR" && npm install
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    echo -e "${GREEN}[2/3] 正在安装前端依赖...${NC}"
    cd "$CLIENT_DIR" && npm install
fi

# 前端构建 (针对云服务器部署的稳定性优化)
echo -e "${GREEN}[3/3] 正在构建前端生产包 (这能显著提升服务器运行稳定性)...${NC}"
cd "$CLIENT_DIR" && npm run build

# 定义退出清理函数
cleanup() {
    echo -e "\n${RED}正在停止所有服务...${NC}"
    kill $SERVER_PID 2>/dev/null
    exit
}

# 捕获 Ctrl+C
trap cleanup SIGINT

echo -e "${GREEN}正在启动统一后端服务 (Port: 3001, Listen: 0.0.0.0)...${NC}"
echo -e "${YELLOW}提示: 前端已构建并由后端托管，不再需要运行 Vite 进程。${NC}"
cd "$SERVER_DIR" && npm start > "$BASE_DIR/server.log" 2>&1 &
SERVER_PID=$!

sleep 2 # 等待服务初始化

# 检查日志文件是否存在
touch "$BASE_DIR/server.log" "$BASE_DIR/client.log"

echo -e "${BLUE}---------------------------------------${NC}"
echo -e "🚀 ${GREEN}服务已就绪！${NC}"
echo -e "💻 ${BLUE}大屏幕展示: ${NC} http://$LOCAL_IP:3001/"
echo -e "📱 ${BLUE}观众投票端: ${NC} http://$LOCAL_IP:3001/vote"
echo -e "⚙️  ${BLUE}管理后台:  ${NC} http://$LOCAL_IP:3001/admin"
echo -e "${BLUE}---------------------------------------${NC}"
echo -e "${YELLOW}日志追踪:${NC}"
echo -e "📄 后端日志: tail -f server.log"
echo -e "${BLUE}---------------------------------------${NC}"
echo -e "${YELLOW}提示:${NC}"
echo -e "1. 现场投票请务必确保您的移动设备与服务器处于同一网络。"
echo -e "2. 按 ${RED}Ctrl+C${NC} 可以安全停止所有服务并清理进程。"
echo -e "${BLUE}---------------------------------------${NC}"

# 保持脚本运行，等待退出信号
wait
