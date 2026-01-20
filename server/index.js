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

// 💡 核心稳定性优化：开启 WAL 模式，防止在高并发投票时出现 "Database is locked" 导致进程奔溃
db.pragma('journal_mode = WAL');

// 🛡️ 全局异常捕获：防止未捕获的异步错误或数据库异常直接杀掉 Node 进程
process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

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

    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
    );
`);

// 初始化默认数据
try {
    const rowCount = db.prepare('SELECT count(*) as count FROM programs').get();
    if (rowCount.count === 0) {
        const insert = db.prepare('INSERT INTO programs (name, category, votes) VALUES (?, ?, ?)');
        const defaultPrograms = [
            { name: "精彩开场秀", category: "开场节目", votes: 0 },
            { name: "创意光影舞", category: "舞蹈", votes: 0 },
            { name: "团队风采展示", category: "展示", votes: 0 },
            { name: "互动魔术表演", category: "魔术", votes: 0 },
            { name: "年度荣誉颁奖", category: "颁奖", votes: 0 }
        ];
        for (const p of defaultPrograms) {
            insert.run(p.name, p.category, p.votes);
        }
    }

    const settingsCount = db.prepare('SELECT count(*) as count FROM settings').get();
    if (settingsCount.count === 0) {
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('event_title', '2026 年度盛典实时投票');
    }

    const userCount = db.prepare('SELECT count(*) as count FROM users').get();
    if (userCount.count === 0) {
        db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', 'admin123');
    }
} catch (err) {
    console.error('Database Initialization Error:', err);
}

// 辅助函数：获取所有节目并广播
const broadcastUpdate = () => {
    try {
        const programs = db.prepare('SELECT * FROM programs').all();
        io.emit('vote_update', programs);
        return programs;
    } catch (err) {
        console.error('Broadcast Update Error:', err);
    }
};

// --- API 接口 ---

// 获取系统设置
app.get('/api/settings', (req, res) => {
    try {
        const settings = db.prepare('SELECT * FROM settings').all();
        const config = {};
        settings.forEach(s => config[s.key] = s.value);
        res.json(config);
    } catch (err) {
        console.error('API Error /api/settings:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 更新系统设置
app.post('/api/settings', (req, res) => {
    try {
        const { event_title } = req.body;
        if (event_title) {
            db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('event_title', event_title);
            io.emit('settings_update', { event_title });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('API Error /api/settings POST:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 管理员登录
app.post('/api/admin/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
        if (user) {
            res.json({ success: true, token: 'vibevote_secret_token_2026' }); // 静态 token 模拟
        } else {
            res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
    } catch (err) {
        console.error('API Error /api/admin/login:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 获取节目列表
app.get('/api/programs', (req, res) => {
    try {
        const programs = db.prepare('SELECT * FROM programs').all();
        res.json(programs);
    } catch (err) {
        console.error('API Error /api/programs:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 新增节目
app.post('/api/programs', (req, res) => {
    try {
        let { name, category } = req.body;

        // 数据校验
        name = name?.toString().trim();
        category = category?.toString().trim() || '未分类';

        if (!name) return res.status(400).json({ error: '节目名称不能为空' });
        if (name.length > 100) return res.status(400).json({ error: '节目名称过长' });

        const stmt = db.prepare('INSERT INTO programs (name, category, votes) VALUES (?, ?, 0)');
        const result = stmt.run(name, category);
        broadcastUpdate();
        res.status(201).json({ id: result.lastInsertRowid, name, category, votes: 0 });
    } catch (err) {
        console.error('API Error /api/programs POST:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 编辑节目
app.put('/api/programs/:id', (req, res) => {
    try {
        const { id } = req.params;
        let { name, category, votes } = req.body;

        // 数据校验与转换
        name = name?.toString().trim();
        category = category?.toString().trim() || '未分类';
        const votesInt = parseInt(votes, 10);

        if (!name) return res.status(400).json({ error: '节目名称不能为空' });
        if (isNaN(votesInt) || votesInt < 0) return res.status(400).json({ error: '票数必须为非负整数' });
        if (name.length > 100) return res.status(400).json({ error: '节目名称过长' });

        const stmt = db.prepare('UPDATE programs SET name = ?, category = ?, votes = ? WHERE id = ?');
        const result = stmt.run(name, category, votesInt, id);

        if (result.changes > 0) {
            broadcastUpdate();
            return res.json({ id, name, category, votes: votesInt });
        }
        res.status(404).json({ error: "节目未找到" });
    } catch (err) {
        console.error('API Error /api/programs PUT:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 删除节目
app.delete('/api/programs/:id', (req, res) => {
    try {
        const { id } = req.params;
        db.prepare('DELETE FROM programs WHERE id = ?').run(id);
        db.prepare('DELETE FROM votes_log WHERE program_id = ?').run(id);
        broadcastUpdate();
        res.json({ success: true });
    } catch (err) {
        console.error('API Error /api/programs DELETE:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// 重置所有投票
app.post('/api/reset', (req, res) => {
    try {
        db.prepare('UPDATE programs SET votes = 0').run();
        db.prepare('DELETE FROM votes_log').run();
        broadcastUpdate();
        io.emit('reset_voted_status'); // 通知客户端清除本地记忆
        res.json({ success: true, message: "所有数据已重置" });
    } catch (err) {
        console.error('API Error /api/reset:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
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
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Ready for connections on all interfaces (0.0.0.0)`);
});
