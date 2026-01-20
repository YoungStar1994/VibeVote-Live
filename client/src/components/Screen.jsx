import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import confetti from 'canvas-confetti';

const SOCKET_SERVER = 'http://localhost:3001';

const Screen = () => {
    const [programs, setPrograms] = useState([]);

    useEffect(() => {
        const socket = io(SOCKET_SERVER);

        socket.on('init_data', (data) => {
            setPrograms(data.sort((a, b) => b.votes - a.votes));
        });

        socket.on('vote_update', (data) => {
            setPrograms(data.sort((a, b) => b.votes - a.votes));
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { y: 0.6 },
                colors: ['#8e9aaf', '#cbc0d3', '#efd3d7', '#feeafa']
            });
        });

        return () => socket.disconnect();
    }, []);

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
                <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{
                        fontSize: '4rem',
                        marginBottom: '0.5rem',
                        textShadow: '0 0 20px rgba(239, 211, 215, 0.3)',
                        background: 'linear-gradient(45deg, #efd3d7, #8e9aaf)',
                        WebkitBackgroundClip: 'text',
                        WebkitFillColor: 'transparent',
                        fontWeight: '800'
                    }}>
                        瑜伽普拉提 2026 年会盛典
                    </h1>
                    <div style={{ fontSize: '1.8rem', opacity: 0.9 }}>
                        实时投票总数: <span style={{ color: '#efd3d7', fontSize: '2.5rem', fontWeight: 'bold' }}>{totalVotes}</span>
                    </div>
                </header>

                {/* 图表核心区域 */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'stretch',
                    justifyContent: 'space-around',
                    gap: '2rem',
                    padding: '1rem'
                }}>
                    {programs.map((program, index) => {
                        // 颜色系统定义
                        const colors = [
                            { primary: '#efd3d7', secondary: '#8e9aaf', glow: 'rgba(239, 211, 215, 0.4)' }, // 1st: 粉灰
                            { primary: '#cbc0d3', secondary: '#8e9aaf', glow: 'rgba(203, 192, 211, 0.3)' }, // 2nd: 紫灰
                            { primary: '#dee2e6', secondary: '#adb5bd', glow: 'rgba(222, 226, 230, 0.2)' }, // 3rd: 浅灰
                            { primary: '#f7d1cd', secondary: '#e8acb1', glow: 'rgba(247, 209, 205, 0.2)' }, // 4th: 珊瑚红
                            { primary: '#e2ece9', secondary: '#bccad6', glow: 'rgba(226, 236, 233, 0.2)' }, // 5th: 豆沙绿
                        ];
                        const itemColor = colors[index] || { primary: 'rgba(255,255,255,0.4)', secondary: 'rgba(255,255,255,0.1)', glow: 'none' };

                        // 比例逻辑调整：
                        // 1. 设置一个基础高度 (4px)，即使 0 票也显示极细的线条
                        // 2. 使用更激进的非线性比例，让差距在视觉上更明显但不会完全消失
                        const barHeight = totalVotes === 0 ? 0 : (program.votes / maxVotes) * 100;

                        return (
                            <div key={program.id} style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                filter: index >= 3 ? 'grayscale(0.3)' : 'none'
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
                                        bottom: `calc(${barHeight}% + 15px)`,
                                        fontSize: index === 0 ? '3.5rem' : '2.5rem',
                                        fontWeight: '900',
                                        color: itemColor.primary,
                                        textShadow: `0 0 15px ${itemColor.glow}, 0 4px 10px rgba(0,0,0,0.5)`,
                                        transition: 'all 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        zIndex: 10,
                                        transform: index === 0 ? 'scale(1.2)' : 'scale(1)'
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
                                    padding: '1.5rem 0.5rem',
                                    background: index === 0 ? 'rgba(239, 211, 215, 0.1)' : 'rgba(255,255,255,0.03)',
                                    borderRadius: '20px',
                                    border: index === 0 ? '1px solid rgba(239, 211, 215, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                    height: '12rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    transition: 'all 0.5s ease',
                                    transform: index === 0 ? 'translateY(-5px)' : 'none',
                                    boxShadow: index === 0 ? '0 10px 30px rgba(0,0,0,0.3)' : 'none'
                                }}>
                                    <div style={{ fontSize: '1.3rem', color: '#cbc0d3', marginBottom: '0.5rem', letterSpacing: '2px' }}>
                                        {program.category}
                                    </div>
                                    <div style={{
                                        fontSize: index === 0 ? '2rem' : '1.7rem',
                                        fontWeight: '800',
                                        lineHeight: '1.3',
                                        marginBottom: '0.8rem',
                                        height: '4.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: index === 0 ? '#efd3d7' : 'white',
                                        padding: '0 10px'
                                    }}>
                                        {program.name}
                                    </div>
                                    <div style={{
                                        fontSize: index === 0 ? '2.8rem' : '2.2rem',
                                        color: index === 0 ? '#ffd700' : index === 1 ? '#e0e0e0' : index === 2 ? '#cd7f32' : 'rgba(255,255,255,0.5)',
                                        filter: index < 3 ? 'drop-shadow(0 0 10px rgba(255,215,0,0.3))' : 'none'
                                    }}>
                                        {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <footer style={{
                    marginTop: '2rem',
                    textAlign: 'center',
                    padding: '1.5rem',
                    fontSize: '1.4rem',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '20px',
                    backdropFilter: 'blur(10px)',
                    color: 'rgba(255,255,255,0.6)'
                }}>
                    微信扫码 · 立即为您的最爱打 Call
                </footer>
            </div>
        </div>
    );
};

export default Screen;
