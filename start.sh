#!/bin/bash

# 瑜伽投票程序 - 一键启停脚本

# 获取脚本所在目录
BASE_DIR=$(cd "$(dirname "$0")"; pwd)
CLIENT_DIR="$BASE_DIR/client"
SERVER_DIR="$BASE_DIR/server"

# 颜色定义
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 瑜伽普拉提 2026 年会投票系统 ===${NC}"

# 检查依赖
if [ ! -d "$SERVER_DIR/node_modules" ]; then
    echo -e "${GREEN}[1/2] 正在安装后端依赖...${NC}"
    cd "$SERVER_DIR" && npm install
fi

if [ ! -d "$CLIENT_DIR/node_modules" ]; then
    echo -e "${GREEN}[2/2] 正在安装前端依赖...${NC}"
    cd "$CLIENT_DIR" && npm install
fi

# 定义退出清理函数
cleanup() {
    echo -e "\n${RED}正在停止所有服务...${NC}"
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit
}

# 捕获 Ctrl+C
trap cleanup SIGINT

echo -e "${GREEN}正在启动后端服务 (Port: 3001)...${NC}"
cd "$SERVER_DIR" && npm run dev > /dev/null 2>&1 &
SERVER_PID=$!

echo -e "${GREEN}正在启动前端服务 (Port: 5173)...${NC}"
cd "$CLIENT_DIR" && npm run dev > /dev/null 2>&1 &
CLIENT_PID=$!

echo -e "${BLUE}---------------------------------------${NC}"
echo -e "🚀 服务已启动！"
echo -e "💻 大屏幕终端: ${GREEN}http://localhost:5173/${NC}"
echo -e "📱 观众投票端: ${GREEN}http://localhost:5173/vote${NC}"
echo -e "⚙️  管理后台:   ${GREEN}http://localhost:5173/admin${NC}"
echo -e "${BLUE}---------------------------------------${NC}"
echo -e "提示: 按 ${RED}Ctrl+C${NC} 可以停止并退出所有服务。"

# 保持脚本运行，等待退出信号
wait
