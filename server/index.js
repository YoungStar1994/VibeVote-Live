const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// 初始化数据库
const db = new Database(path.join(__dirname, 'data.db'));

// 创建表结构
db.exec(`
    CREATE TABLE IF NOT EXISTS programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        votes INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS votes_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        complex_id TEXT UNIQUE,
        user_id TEXT,
        program_id INTEGER,
        FOREIGN KEY (program_id) REFERENCES programs(id)
    );
`);

// 如果节目表为空，初始化默认数据
const rowCount = db.prepare('SELECT count(*) as count FROM programs').get();
if (rowCount.count === 0) {
    const insert = db.prepare('INSERT INTO programs (name, category, votes) VALUES (?, ?, ?)');
    const defaultPrograms = [
        { name: "开场瑜伽舞：流动的韵律", category: "瑜伽", votes: 0 },
        { name: "普拉提器械展示：核心力量", category: "普拉提", votes: 0 },
        { name: "空中瑜伽：云端漫步", category: "瑜伽", votes: 0 },
        { name: "双人伴侣瑜伽：信任的力量", category: "瑜伽", votes: 0 },
        { name: "禅修与呼吸：宁静之夜", category: "冥想", votes: 0 }
    ];
    for (const p of defaultPrograms) {
        insert.run(p.name, p.category, p.votes);
    }
}

// 辅助函数：获取所有节目并广播
const broadcastUpdate = () => {
    const programs = db.prepare('SELECT * FROM programs').all();
    io.emit('vote_update', programs);
    return programs;
};

// --- API 接口 ---

// 获取节目列表
app.get('/api/programs', (req, res) => {
    const programs = db.prepare('SELECT * FROM programs').all();
    res.json(programs);
});

// 新增节目
app.post('/api/programs', (req, res) => {
    const { name, category } = req.body;
    const stmt = db.prepare('INSERT INTO programs (name, category, votes) VALUES (?, ?, 0)');
    const result = stmt.run(name, category);
    broadcastUpdate();
    res.status(201).json({ id: result.lastInsertRowid, name, category, votes: 0 });
});

// 编辑节目
app.put('/api/programs/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, votes } = req.body;
    const stmt = db.prepare('UPDATE programs SET name = ?, category = ?, votes = ? WHERE id = ?');
    const result = stmt.run(name, category, votes, id);
    if (result.changes > 0) {
        broadcastUpdate();
        return res.json({ id, name, category, votes });
    }
    res.status(404).json({ error: "节目未找到" });
});

// 删除节目
app.delete('/api/programs/:id', (req, res) => {
    const { id } = req.params;
    db.prepare('DELETE FROM programs WHERE id = ?').run(id);
    // 同时清理该节目的投票日志（可选，为了逻辑严谨）
    db.prepare('DELETE FROM votes_log WHERE program_id = ?').run(id);
    broadcastUpdate();
    res.json({ success: true });
});

// 重置所有投票
app.post('/api/reset', (req, res) => {
    db.prepare('UPDATE programs SET votes = 0').run();
    db.prepare('DELETE FROM votes_log').run();
    broadcastUpdate();
    io.emit('reset_voted_status'); // 通知客户端清除本地记忆
    res.json({ success: true, message: "所有数据已重置" });
});

// 投票接口 (数据库持久化 + 增强防刷)
app.post('/api/vote', (req, res) => {
    const { programId, userId, fingerprint } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    if (!programId || !fingerprint) {
        return res.status(400).json({ error: "参数不完整" });
    }

    const complexId = `${fingerprint}_${ip}_${userAgent}`;

    // 使用数据库事务保证原子性
    const transaction = db.transaction(() => {
        // 检查是否已投过票 (基于 complex_id 或 userId)
        const existingVote = db.prepare('SELECT id FROM votes_log WHERE complex_id = ? OR (user_id IS NOT NULL AND user_id = ?)').get(complexId, userId);

        if (existingVote) {
            throw new Error('DUPLICATE_VOTE');
        }

        // 更新票数
        const updateResult = db.prepare('UPDATE programs SET votes = votes + 1 WHERE id = ?').run(programId);
        if (updateResult.changes === 0) {
            throw new Error('PROGRAM_NOT_FOUND');
        }

        // 记录投票日志
        db.prepare('INSERT INTO votes_log (complex_id, user_id, program_id) VALUES (?, ?, ?)').run(complexId, userId, programId);
    });

    try {
        transaction();
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        if (err.message === 'DUPLICATE_VOTE') {
            return res.status(403).json({ error: "检测到重复投票，请勿刷票" });
        }
        if (err.message === 'PROGRAM_NOT_FOUND') {
            return res.status(404).json({ error: "节目未找到" });
        }
        console.error(err);
        res.status(500).json({ error: "服务器内部错误" });
    }
});

io.on('connection', (socket) => {
    const programs = db.prepare('SELECT * FROM programs').all();
    socket.emit('init_data', programs);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
