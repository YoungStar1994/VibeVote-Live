const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 模拟节目数据
let programs = [
    { id: 1, name: "开场瑜伽舞：流动的韵律", votes: 0, category: "瑜伽" },
    { id: 2, name: "普拉提器械展示：核心力量", votes: 0, category: "普拉提" },
    { id: 3, name: "空中瑜伽：云端漫步", votes: 0, category: "瑜伽" },
    { id: 4, name: "双人伴侣瑜伽：信任的力量", votes: 0, category: "瑜伽" },
    { id: 5, name: "禅修与呼吸：宁静之夜", votes: 0, category: "冥想" }
];

// 存储用户投票记录 (简单防刷)
const userVotes = new Map();

// 获取节目列表
app.get('/api/programs', (req, res) => {
    res.json(programs);
});

// 节目管理 API
// 新增节目
app.post('/api/programs', (req, res) => {
    const { name, category } = req.body;
    const newProgram = {
        id: programs.length ? Math.max(...programs.map(p => p.id)) + 1 : 1,
        name,
        category,
        votes: 0
    };
    programs.push(newProgram);
    io.emit('vote_update', programs);
    res.status(201).json(newProgram);
});

// 编辑节目
app.put('/api/programs/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, votes } = req.body;
    const index = programs.findIndex(p => p.id === parseInt(id));
    if (index !== -1) {
        programs[index] = { ...programs[index], name, category, votes: votes ?? programs[index].votes };
        io.emit('vote_update', programs);
        return res.json(programs[index]);
    }
    res.status(404).json({ error: "Program not found" });
});

// 删除节目
app.delete('/api/programs/:id', (req, res) => {
    const { id } = req.params;
    programs = programs.filter(p => p.id !== parseInt(id));
    io.emit('vote_update', programs);
    res.json({ success: true });
});

// 全量重置数据
app.post('/api/reset', (req, res) => {
    programs.forEach(p => p.votes = 0);
    userVotes.clear();
    io.emit('vote_update', programs);
    io.emit('reset_voted_status'); // 通知所有客户端清除本地投票状态
    res.json({ success: true, message: "所有数据已重置" });
});

// 投票接口 (增强防刷)
app.post('/api/vote', (req, res) => {
    const { programId, userId, fingerprint } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!programId || !fingerprint) {
        return res.status(400).json({ error: "参数不完整" });
    }

    // 综合指纹：由客户端指纹 + IP + UserAgent 组成
    // 虽然不是 100% 完美，但在年会场景下足以阻挡 99% 的普通用户刷票
    const complexId = `${fingerprint}_${ip}_${userAgent}`;

    if (userVotes.has(complexId) || userVotes.has(userId)) {
        return res.status(403).json({ error: "检测到重复投票，请勿刷票" });
    }

    const program = programs.find(p => p.id === programId);
    if (program) {
        program.votes += 1;
        userVotes.set(complexId, programId);
        if (userId) userVotes.set(userId, programId);

        // 广播更新
        io.emit('vote_update', programs);

        return res.json({ success: true, programs });
    }

    res.status(404).json({ error: "节目未找到" });
});

io.on('connection', (socket) => {
    console.log('a user connected');
    // 连接时发送当前数据
    socket.emit('init_data', programs);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
