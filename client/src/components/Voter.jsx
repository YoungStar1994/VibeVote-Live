import React, { useState, useEffect } from 'react';
import { Heart, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { io } from 'socket.io-client';

// 自动识别后端地址
const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001`;

// 简单的设备指纹生成函数
const getFingerprint = () => {
    const info = [
        navigator.userAgent,
        navigator.language,
        screen.colorDepth,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.hardwareConcurrency
    ];
    return btoa(info.join('|'));
};

const Voter = () => {
    const [programs, setPrograms] = useState([]);
    const [votedId, setVotedId] = useState(null);
    const [eventTitle, setEventTitle] = useState('载入中...');
    const [fingerprint] = useState(getFingerprint());
    const [userId] = useState(() => {
        let id = localStorage.getItem('yoga_vote_user_id');
        if (!id) {
            id = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('yoga_vote_user_id', id);
        }
        return id;
    });

    useEffect(() => {
        const socket = io(API_BASE);

        // 获取初始设置
        fetch(`${API_BASE}/api/settings`)
            .then(res => res.json())
            .then(data => setEventTitle(data.event_title || '年度盛典现场投票'));

        // 监听管理员发起的重置信号
        socket.on('reset_voted_status', () => {
            localStorage.removeItem('has_voted_for');
            setVotedId(null);
            alert('投票已重置，您可以重新投票！');
        });

        socket.on('settings_update', (data) => {
            if (data.event_title) setEventTitle(data.event_title);
        });

        fetch(`${API_BASE}/api/programs`)
            .then(res => res.json())
            .then(data => {
                setPrograms(data);
                const savedVote = localStorage.getItem('has_voted_for');
                if (savedVote) setVotedId(parseInt(savedVote));
            });

        return () => socket.disconnect();
    }, []);

    const handleVote = async (programId) => {
        if (votedId) return;

        try {
            const res = await fetch(`${API_BASE}/api/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programId,
                    userId,
                    fingerprint // 发送设备指纹给后端校验
                })
            });

            if (res.ok) {
                setVotedId(programId);
                localStorage.setItem('has_voted_for', programId);
            } else {
                const err = await res.json();
                alert(err.error || '投票失败');
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
        }
    };

    const [showQR, setShowQR] = useState(false);

    return (
        <div className="container" style={{ paddingBottom: '4rem' }}>
            <header style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', right: 0, top: 0 }}>
                    <button
                        onClick={() => setShowQR(!showQR)}
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '10px' }}
                    >
                        <QrCode size={24} />
                    </button>
                </div>

                <h1 style={{ color: 'var(--primary)', fontSize: '1.8rem', padding: '0 40px' }}>{eventTitle}</h1>
                <p style={{ color: '#666', fontSize: '1rem' }}>请为您心仪的节目投上宝贵一票</p>
                <div style={{ fontSize: '0.7rem', color: '#ccc', marginTop: '0.5rem' }}>ID: {userId.slice(-4)}</div>

                {showQR && (
                    <div className="glass-card animate-fade-in" style={{
                        margin: '1rem auto',
                        padding: '1.5rem',
                        display: 'inline-block',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                    }}>
                        <QRCodeCanvas value={`${window.location.origin}/vote`} size={150} />
                        <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--primary)' }}>让旁边的小伙伴扫码参与</p>
                    </div>
                )}
            </header>

            <div style={{ display: 'grid', gap: '1.5rem' }}>
                {programs.map((program, index) => (
                    <div
                        key={program.id}
                        className="glass-card animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    >
                        <div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold' }}>{program.category}</span>
                            <h3 style={{ margin: '0.2rem 0', fontSize: '1.2rem' }}>{program.name}</h3>
                        </div>

                        <button
                            className={`btn ${votedId === program.id ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleVote(program.id)}
                            disabled={!!votedId}
                            style={{
                                border: votedId === program.id ? 'none' : '1px solid var(--primary)',
                                background: votedId === program.id ? 'var(--primary)' : 'transparent',
                                color: votedId === program.id ? 'white' : 'var(--primary)',
                                minWidth: '80px'
                            }}
                        >
                            <Heart size={18} fill={votedId === program.id ? "white" : "none"} />
                            {votedId === program.id ? '已投' : '投票'}
                        </button>
                    </div>
                ))}
            </div>

            {votedId && (
                <div style={{
                    position: 'fixed', bottom: '1.5rem', left: '1.5rem', right: '1.5rem',
                    background: 'var(--accent)', padding: '1rem', borderRadius: '15px',
                    textAlign: 'center', boxShadow: 'var(--shadow)', color: 'var(--primary)',
                    border: '1px solid var(--primary-light)',
                    zIndex: 100
                }}>
                    感谢参与！投票结果将在大屏幕实时展示。
                </div>
            )}
        </div>
    );
};

export default Voter;
