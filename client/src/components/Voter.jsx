import React, { useState, useEffect } from 'react';
import { Heart, QrCode } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { io } from 'socket.io-client';

// 自动识别后端地址
// 自动识别后端地址：如果是生产环境（端口不是 5173），直接使用当前 origin
const API_BASE = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;

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
    try {
        // 使用 encodeURIComponent 处理特殊字符，防止 btoa 报错
        return btoa(encodeURIComponent(info.join('|')));
    } catch (e) {
        return 'fallback_fp_' + Math.random().toString(36).substr(2, 9);
    }
};

const Voter = () => {
    const [programs, setPrograms] = useState([]);
    const [votedId, setVotedId] = useState(null);
    const [eventTitle, setEventTitle] = useState('载入中...');
    const [fingerprint] = useState(getFingerprint());
    const [confirmId, setConfirmId] = useState(null); // 确认弹窗
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

                // 同步服务器端投票状态，解决本地缓存与服务器不一致（如重置后）的问题
                fetch(`${API_BASE}/api/vote/status?userId=${userId}&fingerprint=${fingerprint}`)
                    .then(res => res.json())
                    .then(status => {
                        if (status.hasVoted) {
                            setVotedId(status.programId);
                            localStorage.setItem('has_voted_for', status.programId);
                        } else {
                            // 服务器显示未投票，清除本地状态
                            setVotedId(null);
                            localStorage.removeItem('has_voted_for');
                        }
                    })
                    .catch(err => console.error("Sync vote status error:", err));
            });

        return () => socket.disconnect();
    }, [userId, fingerprint]);

    useEffect(() => {
        if (eventTitle) {
            document.title = `${eventTitle} - 投票端`;
        }
    }, [eventTitle]);

    const handleVoteClick = (programId) => {
        if (votedId) return;
        setConfirmId(programId);
    };

    const confirmVote = async () => {
        if (!confirmId) return;
        const programId = confirmId;
        setConfirmId(null);

        try {
            const res = await fetch(`${API_BASE}/api/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    programId,
                    userId,
                    fingerprint
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

    const handleRevokeVote = async () => {
        if (!confirm('确定要撤销投票并重新选择吗？')) return;

        try {
            const res = await fetch(`${API_BASE}/api/vote/revoke`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    fingerprint
                })
            });

            if (res.ok) {
                setVotedId(null);
                localStorage.removeItem('has_voted_for');
            } else {
                const err = await res.json();
                alert(err.error || '操作失败');
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
        }
    };

    const [showQR, setShowQR] = useState(false);

    return (
        <div className="container" style={{ paddingBottom: '6rem' }}>
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
                            onClick={() => handleVoteClick(program.id)}
                            disabled={!!votedId}
                            style={{
                                border: votedId === program.id ? 'none' : '1px solid var(--primary)',
                                background: votedId === program.id ? 'var(--primary)' : 'transparent',
                                color: votedId === program.id ? 'white' : 'var(--primary)',
                                minWidth: '80px',
                                opacity: votedId && votedId !== program.id ? 0.5 : 1
                            }}
                        >
                            <Heart size={18} fill={votedId === program.id ? "white" : "none"} />
                            {votedId === program.id ? '已投' : '投票'}
                        </button>
                    </div>
                ))}
            </div>

            {/* 确认弹窗 */}
            {confirmId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }} onClick={() => setConfirmId(null)}>
                    <div className="glass-card animate-scale-in" style={{ padding: '2rem', maxWidth: '300px', width: '90%', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 1rem 0' }}>确认投票</h3>
                        <p style={{ marginBottom: '1.5rem' }}>
                            您要投给《{programs.find(p => p.id === confirmId)?.name}》吗？
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button className="btn btn-outline" onClick={() => setConfirmId(null)}>取消</button>
                            <button className="btn btn-primary" onClick={confirmVote}>确认</button>
                        </div>
                    </div>
                </div>
            )}

            {votedId && (
                <div style={{
                    position: 'fixed', bottom: '1.5rem', left: '1.5rem', right: '1.5rem',
                    background: 'var(--white)', padding: '1rem', borderRadius: '15px',
                    textAlign: 'center', boxShadow: 'var(--shadow)', color: 'var(--primary)',
                    border: '1px solid var(--primary-light)',
                    zIndex: 100
                }}>
                    <div style={{ marginBottom: '0.5rem' }}>感谢参与！投票结果将在大屏幕实时展示。</div>
                    <button
                        onClick={handleRevokeVote}
                        style={{
                            background: 'none', border: 'none',
                            color: '#999', textDecoration: 'underline',
                            fontSize: '0.9rem', cursor: 'pointer'
                        }}
                    >
                        撤销投票并重新选择
                    </button>
                </div>
            )}
        </div>
    );
};

export default Voter;
