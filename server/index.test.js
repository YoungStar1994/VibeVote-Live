const request = require('supertest');
const path = require('path');
const fs = require('fs');

// 设置测试数据库路径
const testDbPath = path.join(__dirname, 'data.test.db');
process.env.DB_PATH = testDbPath;
process.env.NODE_ENV = 'test';

// 导入 app 和 db
const { app, db } = require('./index');

describe('VibeVote-Live 后端 API 测试', () => {

    // 每次测试前确保数据库是干净且已初始化的
    beforeAll(() => {
        if (fs.existsSync(testDbPath)) {
            fs.unlinkSync(testDbPath);
        }
        // index.js 导入时会自动执行初始化逻辑
    });

    afterAll(() => {
        db.close();
        if (fs.existsSync(testDbPath)) {
            // fs.unlinkSync(testDbPath); // 可选：保留用于手动检查
        }
    });

    describe('基础数据与设置', () => {
        test('GET /api/settings 应返回默认设置', async () => {
            const res = await request(app).get('/api/settings');
            expect(res.statusCode).toBe(200);
            expect(res.body.event_title).toBe('2026 年会节目表演实时投票');
        });

        test('POST /api/settings 应能成功更新标题', async () => {
            const newTitle = '新年度盛典测试';
            const res = await request(app)
                .post('/api/settings')
                .send({ event_title: newTitle });
            expect(res.statusCode).toBe(200);

            const check = await request(app).get('/api/settings');
            expect(check.body.event_title).toBe(newTitle);
        });
    });

    describe('节目管理 (Admin API)', () => {
        let testProgramId;

        test('GET /api/programs 应返回初始节目列表', async () => {
            const res = await request(app).get('/api/programs');
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        test('POST /api/programs 应能添加新节目', async () => {
            const res = await request(app)
                .post('/api/programs')
                .send({ name: '测试节目', category: '测试组' });
            expect(res.statusCode).toBe(201);
            expect(res.body.name).toBe('测试节目');
            testProgramId = res.body.id;
        });

        test('POST /api/programs 应拒绝非法数据 (空名称)', async () => {
            const res = await request(app)
                .post('/api/programs')
                .send({ name: '', category: '测试' });
            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBeDefined();
        });

        test('PUT /api/programs/:id 应能更新节目信息及票数', async () => {
            const res = await request(app)
                .put(`/api/programs/${testProgramId}`)
                .send({ name: '更新后的测试节目', category: '更新组', votes: 100 });
            expect(res.statusCode).toBe(200);
            expect(res.body.votes).toBe(100);
        });

        test('PUT /api/programs/:id 应拒绝负数票数', async () => {
            const res = await request(app)
                .put(`/api/programs/${testProgramId}`)
                .send({ name: '错误测试', category: '错误', votes: -1 });
            expect(res.statusCode).toBe(400);
        });
    });

    describe('投票机制与安全性', () => {
        test('POST /api/vote 应能成功投票', async () => {
            const programs = await request(app).get('/api/programs');
            const target = programs.body[0];
            const initialVotes = target.votes;

            const res = await request(app)
                .post('/api/vote')
                .send({ programId: target.id, fingerprint: 'unique_fp_123' });

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);

            const check = await request(app).get('/api/programs');
            const updated = check.body.find(p => p.id === target.id);
            expect(updated.votes).toBe(initialVotes + 1);
        });

        test('POST /api/vote 应防止重复投票 (同指纹)', async () => {
            const programs = await request(app).get('/api/programs');
            const target = programs.body[0];

            const res = await request(app)
                .post('/api/vote')
                .send({ programId: target.id, fingerprint: 'unique_fp_123' });

            expect(res.statusCode).toBe(403);
            expect(res.body.error).toMatch(/重复投票/);
        });
    });

    describe('管理员安全', () => {
        test('POST /api/admin/login 应验证正确凭据', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({ username: 'admin', password: 'admin123' });
            expect(res.statusCode).toBe(200);
            expect(res.body.token).toBeDefined();
        });

        test('POST /api/admin/login 应拒绝错误凭据', async () => {
            const res = await request(app)
                .post('/api/admin/login')
                .send({ username: 'admin', password: 'wrong_password' });
            expect(res.statusCode).toBe(401);
        });
    });
});
