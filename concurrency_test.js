const http = require('http');

/**
 * VibeVote-Live 并发压力测试工具 (增强版)
 * 1. 自动获取节目 ID，避免硬编码错误。
 * 2. 模拟真实高并发投票，验证稳定性。
 */

const TARGET_URL = process.argv[2] || 'http://localhost:3001';
const CONCURRENT_USERS = parseInt(process.argv[3]) || 500;

console.log(`\n🔍 正在获取节目列表...`);

http.get(`${TARGET_URL}/api/programs`, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        try {
            const programs = JSON.parse(body);
            if (!programs || programs.length === 0) {
                console.error('❌ 错误：数据库中没有节目，请先通过管理后台添加。');
                process.exit(1);
            }
            const programIds = programs.map(p => p.id);
            runTest(programIds);
        } catch (e) {
            console.error('❌ 解析响应失败:', e.message);
            process.exit(1);
        }
    });
}).on('error', (e) => {
    console.error('❌ 无法连接到服务器:', e.message);
    process.exit(1);
});

let successCount = 0;
let failCount = 0;
let errorCount = 0;
let completedCount = 0;
let startTime = 0;

function runTest(programIds) {
    console.log(`\n🚀 启动定时稳定性测试 (每 1 秒/次)...`);
    console.log(`📍 目标地址: ${TARGET_URL}`);
    console.log(`🎯 涉及节目数: ${programIds.length}`);
    console.log(`计划执行次数: ${CONCURRENT_USERS}`);
    console.log(`---------------------------------------\n`);

    startTime = Date.now();
    let count = 0;
    const interval = setInterval(() => {
        count++;
        // 随机选择一个节目 ID
        const randomId = programIds[Math.floor(Math.random() * programIds.length)];
        sendVote(count, randomId);

        if (count >= CONCURRENT_USERS) {
            clearInterval(interval);
            console.log(`\n⏳ 所有请求已发出，等待最后响应...`);
        }
    }, 1000);
}

function sendVote(userId, programId) {
    const data = JSON.stringify({
        programId: programId,
        userId: `stress_${userId}_${Math.random().toString(36).substr(2, 5)}`,
        fingerprint: `fp_${userId}_${Date.now()}_${Math.random()}`
    });

    const url = new URL(`${TARGET_URL}/api/vote`);
    const options = {
        hostname: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
            if (res.statusCode === 200) {
                successCount++;
            } else {
                failCount++;
                if (failCount <= 3) {
                    console.log(`[FAIL] User ${userId} Status: ${res.statusCode}, Body: ${body}`);
                }
            }
            checkComplete();
        });
    });

    req.on('error', () => {
        errorCount++;
        checkComplete();
    });

    req.write(data);
    req.end();
}

function checkComplete() {
    completedCount++;
    if (completedCount === CONCURRENT_USERS) {
        const duration = (Date.now() - startTime) / 1000;
        const rps = (CONCURRENT_USERS / duration).toFixed(2);

        console.log(`\n📊 测试完成报告:`);
        console.log(`⏱️  总耗时: ${duration}s`);
        console.log(`⚡ RPS (每秒处理请求): ${rps}`);
        console.log(`✅ 成功数: ${successCount}`);
        console.log(`❌ 业务失败: ${failCount}`);
        console.log(`⚠️  网络错误: ${errorCount}`);

        if (errorCount === 0 && successCount > 0) {
            console.log(`\n🎊 稳定性结论: 【极佳】。成功承受瞬时压力，无连接异常。`);
        } else if (errorCount > 0) {
            console.log(`\n🚩 结论: 【不稳定】。出现了连接重置，请检查服务器负载。`);
        }
    }
}
