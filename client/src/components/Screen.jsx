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
                        const barHeight = totalVotes === 0 ? 0 : (program.votes / maxVotes) * 100;

                        return (
                            <div key={program.id} style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'all 0.8s ease'
                            }}>
                                {/* 柱体轨道 - 负责提供定位基准 */}
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
                                        fontSize: '2.8rem',
                                        fontWeight: '900',
                                        color: index === 0 ? '#efd3d7' : 'white',
                                        textShadow: '0 4px 10px rgba(0,0,0,0.5)',
                                        transition: 'bottom 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        zIndex: 10
                                    }}>
                                        {program.votes}
                                    </div>

                                    {/* 3D 柱体 */}
                                    <div style={{
                                        width: '75%',
                                        height: `${barHeight}%`,
                                        minHeight: barHeight > 0 ? '4px' : '0',
                                        background: index === 0
                                            ? 'linear-gradient(to top, #8e9aaf 0%, #efd3d7 100%)'
                                            : 'linear-gradient(to top, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.2) 100%)',
                                        borderRadius: '12px 12px 0 0',
                                        boxShadow: index === 0
                                            ? '0 0 50px rgba(239, 211, 215, 0.4), inset 0 2px 5px rgba(255,255,255,0.5)'
                                            : 'inset 0 1px 2px rgba(255,255,255,0.2)',
                                        transition: 'height 1s cubic-bezier(0.17, 0.67, 0.83, 0.67)',
                                        position: 'relative',
                                        border: '1px solid rgba(255,255,255,0.1)'
                                    }}>
                                        {/* 侧边高光装饰 */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: '4px',
                                            bottom: 0,
                                            width: '20%',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: '8px 0 0 0'
                                        }} />
                                    </div>
                                </div>

                                {/* 节目底部卡片 */}
                                <div style={{
                                    textAlign: 'center',
                                    padding: '1.5rem 0.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    borderRadius: '15px',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    height: '11rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center'
                                }}>
                                    <div style={{ fontSize: '1.2rem', color: '#cbc0d3', marginBottom: '0.4rem' }}>{program.category}</div>
                                    <div style={{
                                        fontSize: '1.6rem',
                                        fontWeight: '700',
                                        lineHeight: '1.2',
                                        marginBottom: '0.8rem',
                                        height: '3.8rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {program.name}
                                    </div>
                                    <div style={{
                                        fontSize: '2.2rem',
                                        color: index === 0 ? '#ffd700' : index === 1 ? '#e0e0e0' : index === 2 ? '#cd7f32' : 'white'
                                    }}>
                                        {index === 0 ? '👑' : `#${index + 1}`}
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
