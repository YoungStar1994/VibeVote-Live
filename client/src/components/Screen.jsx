import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';
import { QRCodeCanvas } from 'qrcode.react';

// 自动识别后端地址：如果是生产环境（端口不是 5173），直接使用当前 origin
const SOCKET_SERVER = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;

const Screen = () => {
    const [programs, setPrograms] = useState([]);
    const [eventTitle, setEventTitle] = useState('加载中...');
    const lastConfettiTime = useRef(0);

    useEffect(() => {
        const socket = io(SOCKET_SERVER);

        // 获取初始设置
        fetch(`${SOCKET_SERVER}/api/settings`)
            .then(res => res.json())
            .then(data => setEventTitle(data.event_title || '年度盛典实时投票'));

        socket.on('init_data', (data) => {
            setPrograms(data.sort((a, b) => b.votes - a.votes));
        });

        socket.on('vote_update', (data) => {
            setPrograms(data.sort((a, b) => b.votes - a.votes));

            // 💡 节流优化：高并发时限制庆祝动画频率 (每秒最多触发一次)
            const now = Date.now();
            if (now - lastConfettiTime.current > 1000) {
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.6 },
                    colors: ['#8e9aaf', '#cbc0d3', '#efd3d7', '#feeafa']
                });
                lastConfettiTime.current = now;
            }
        });

        socket.on('settings_update', (data) => {
            if (data.event_title) setEventTitle(data.event_title);
        });

        return () => socket.disconnect();
    }, []);

    useEffect(() => {
        if (eventTitle) {
            document.title = `${eventTitle} - 实时大屏`;
        }
    }, [eventTitle]);

    const totalVotes = programs.reduce((acc, curr) => acc + curr.votes, 0);
    const maxVotes = programs.length > 0 ? Math.max(...programs.map(p => p.votes), 1) : 1;

    return (
        <div className="screen-mode" style={{
            background: 'radial-gradient(circle at center, #2d3436 0%, #1a1a2e 100%)',
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        }}>
            <div style={{
                width: '95%',
                maxWidth: '1400px',
                height: '90vh',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <header style={{ textAlign: 'center', marginBottom: '1rem', position: 'relative' }}>
                    {/* 右上角二维码 */}
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'white',
                        padding: '8px',
                        borderRadius: '10px',
                        boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 100
                    }}>
                        <QRCodeCanvas
                            value={`${window.location.origin}/vote`}
                            size={80}
                            fgColor="#1a1a2e"
                        />
                    </div>

                    <h1 style={{
                        fontSize: '3rem',
                        marginBottom: '0.2rem',
                        textShadow: '0 0 20px rgba(239, 211, 215, 0.3)',
                        background: 'linear-gradient(45deg, #efd3d7, #8e9aaf)',
                        WebkitBackgroundClip: 'text',
                        WebkitFillColor: 'transparent',
                        fontWeight: '800'
                    }}>
                        {eventTitle}
                    </h1>
                    <div style={{ fontSize: '1.4rem', opacity: 0.9 }}>
                        实时投票总数: <span style={{ color: '#efd3d7', fontSize: '2rem', fontWeight: 'bold' }}>{totalVotes}</span>
                    </div>
                </header>

                {/* 图表核心区域 - 增加权重使柱状图更长 */}
                <div style={{
                    flex: '4',
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'space-around',
                    gap: '2rem',
                    padding: '1rem 0'
                }}>
                    {programs.slice(0, 5).map((program, index) => {
                        // 颜色系统定义
                        const colors = [
                            { primary: '#efd3d7', secondary: '#8e9aaf', glow: 'rgba(239, 211, 215, 0.4)' }, // 1st
                            { primary: '#cbc0d3', secondary: '#8e9aaf', glow: 'rgba(203, 192, 211, 0.3)' }, // 2nd
                            { primary: '#dee2e6', secondary: '#adb5bd', glow: 'rgba(222, 226, 230, 0.2)' }, // 3rd
                            { primary: '#f7d1cd', secondary: '#e8acb1', glow: 'rgba(247, 209, 205, 0.2)' }, // 4th
                            { primary: '#e2ece9', secondary: '#bccad6', glow: 'rgba(226, 236, 233, 0.2)' }, // 5th
                        ];
                        const itemColor = colors[index] || { primary: 'rgba(255,255,255,0.4)', secondary: 'rgba(255,255,255,0.1)', glow: 'none' };
                        const barHeight = totalVotes === 0 ? 0 : (program.votes / maxVotes) * 100;

                        return (
                            <div key={program.id} style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67)'
                            }}>
                                {/* 柱体轨道 */}
                                <div style={{
                                    flex: 1,
                                    position: 'relative',
                                    marginBottom: '1rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'flex-end',
                                    alignItems: 'center'
                                }}>
                                    {/* 票数标签 */}
                                    <div style={{
                                        position: 'absolute',
                                        bottom: `calc(${barHeight}% + 5px)`,
                                        fontSize: index === 0 ? '3rem' : '2rem',
                                        fontWeight: '900',
                                        color: itemColor.primary,
                                        textShadow: `0 0 15px ${itemColor.glow}, 0 4px 10px rgba(0,0,0,0.5)`,
                                        transition: 'all 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        zIndex: 10,
                                        transform: index === 0 ? 'scale(1.1)' : 'scale(1)'
                                    }}>
                                        {program.votes}
                                    </div>

                                    {/* 3D 柱体 */}
                                    <div style={{
                                        width: index === 0 ? '85%' : '75%',
                                        height: `${barHeight}%`,
                                        minHeight: program.votes > 0 ? '8px' : '4px',
                                        background: `linear-gradient(to top, ${itemColor.secondary} 0%, ${itemColor.primary} 100%)`,
                                        borderRadius: '16px 16px 0 0',
                                        boxShadow: `0 0 40px ${itemColor.glow}, inset 0 2px 5px rgba(255,255,255,0.3)`,
                                        transition: 'all 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        position: 'relative',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        opacity: program.votes === 0 ? 0.3 : 1
                                    }}>
                                        {/* 侧边高光装饰 */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: '4px',
                                            bottom: 0,
                                            width: '15%',
                                            background: 'rgba(255,255,255,0.15)',
                                            borderRadius: '12px 0 0 0'
                                        }} />
                                    </div>
                                </div>

                                {/* 节目底部卡片 */}
                                <div style={{
                                    textAlign: 'center',
                                    padding: '0.8rem 0.6rem',
                                    background: index === 0 ? 'rgba(239, 211, 215, 0.12)' : 'rgba(255,255,255,0.03)',
                                    borderRadius: '20px',
                                    border: index === 0 ? '1.5px solid rgba(239, 211, 215, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                    height: '8.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    transition: 'all 0.5s ease',
                                    boxShadow: index === 0 ? '0 15px 35px rgba(0,0,0,0.3)' : 'none',
                                    backdropFilter: 'blur(5px)'
                                }}>
                                    <div style={{
                                        fontSize: '0.9rem',
                                        color: '#cbc0d3',
                                        letterSpacing: '2px',
                                        textTransform: 'uppercase',
                                        opacity: 0.8
                                    }}>
                                        {program.category}
                                    </div>

                                    <div style={{
                                        fontSize: index === 0 ? '1.5rem' : '1.3rem',
                                        fontWeight: '850',
                                        lineHeight: '1.2',
                                        color: index === 0 ? '#efd3d7' : 'white',
                                        wordBreak: 'break-all',
                                        display: '-webkit-box',
                                        WebkitLineClamp: '2',
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        margin: '0.3rem 0',
                                        textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                                    }}>
                                        {program.name}
                                    </div>

                                    <div style={{
                                        marginTop: '0.3rem',
                                        fontSize: '0.9rem',
                                        color: 'rgba(255,255,255,0.3)'
                                    }}>
                                        No.{index + 1}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Screen;
