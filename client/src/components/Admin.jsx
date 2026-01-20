import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Save, X, QrCode, Lock } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// 自动识别后端地址：如果是通过公网或局域网 IP 访问，则 API 也自动导向该 IP
const API_BASE = `${window.location.protocol}//${window.location.hostname}:3001`;

const Admin = () => {
    const [programs, setPrograms] = useState([]);
    const [isLoggedIn, setIsLoggedIn] = useState(!!sessionStorage.getItem('admin_token'));
    const [loginForm, setLoginForm] = useState({ username: '', password: '' });
    const [loginError, setLoginError] = useState('');

    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', category: '', votes: 0 });
    const [isAdding, setIsAdding] = useState(false);
    const [settings, setSettings] = useState({ event_title: '' });
    const [isEditingSettings, setIsEditingSettings] = useState(false);

    useEffect(() => {
        document.title = "VibeVote 控制中心 | 管理后台";
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        const res = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(loginForm)
        });
        const data = await res.json();
        if (data.success) {
            sessionStorage.setItem('admin_token', data.token);
            setIsLoggedIn(true);
            setLoginError('');
        } else {
            setLoginError(data.message);
        }
    };

    const fetchPrograms = () => {
        fetch(`${API_BASE}/api/programs`)
            .then(res => res.json())
            .then(data => setPrograms(data));
    };

    const fetchSettings = () => {
        fetch(`${API_BASE}/api/settings`)
            .then(res => res.json())
            .then(data => setSettings(data));
    };

    useEffect(() => {
        fetchPrograms();
        fetchSettings();
    }, []);

    const handleSaveSettings = async () => {
        await fetch(`${API_BASE}/api/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });
        setIsEditingSettings(false);
    };

    const handleEdit = (program) => {
        setEditingId(program.id);
        setEditForm({ name: program.name, category: program.category, votes: program.votes });
    };

    const handleSave = async (id) => {
        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_BASE}/api/programs/${id}` : `${API_BASE}/api/programs`;

        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(editForm)
        });

        setEditingId(null);
        setIsAdding(false);
        fetchPrograms();
    };

    const handleDelete = async (id) => {
        if (!window.confirm('确定要删除这个节目吗？')) return;
        await fetch(`${API_BASE}/api/programs/${id}`, { method: 'DELETE' });
        fetchPrograms();
    };

    const handleResetAll = async () => {
        if (!window.confirm('警告：这将清除所有投票记录（包括手机端的锁定）！确定要重置吗？')) return;
        await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
        fetchPrograms();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        setIsLoggedIn(false);
    };

    if (!isLoggedIn) {
        return (
            <div style={{
                height: '80vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div className="glass-card" style={{ padding: '2.5rem', width: '100%', maxWidth: '400px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            background: 'var(--primary)',
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem',
                            color: 'white'
                        }}>
                            <Lock size={30} />
                        </div>
                        <h2 style={{ margin: 0, color: 'var(--primary)' }}>管理后台登录</h2>
                        <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '0.5rem' }}>请输入管理员凭据以继续</p>
                    </div>

                    <form onSubmit={handleLogin} style={{ display: 'grid', gap: '1.2rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#444' }}>用户名</label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ width: '100%', padding: '0.8rem' }}
                                required
                                value={loginForm.username}
                                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#444' }}>密码</label>
                            <input
                                type="password"
                                className="form-input"
                                style={{ width: '100%', padding: '0.8rem' }}
                                required
                                value={loginForm.password}
                                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                            />
                        </div>
                        {loginError && (
                            <div style={{ color: '#ff4757', fontSize: '0.85rem', textAlign: 'center' }}>
                                ⚠️ {loginError}
                            </div>
                        )}
                        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.8rem', fontSize: '1rem' }}>
                            进入管理页面
                        </button>
                    </form>
                    <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: '#999' }}>
                        Default: admin / admin123
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h1 style={{ color: 'var(--primary)', margin: 0 }}>VibeVote 管理后台</h1>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button className="btn btn-outline" style={{ color: '#666', borderColor: '#ccc' }} onClick={handleLogout}>
                            退出登录
                        </button>
                        <button className="btn btn-outline" style={{ color: '#ff4757', border: '1px solid #ff4757' }} onClick={handleResetAll}>
                            <RefreshCw size={18} /> 重置所有投票
                        </button>
                        <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditForm({ name: '', category: '', votes: 0 }); }}>
                            <Plus size={18} /> 新增节目
                        </button>
                    </div>
                </div>

                {/* 系统设置区域 */}
                <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        ⚙️ 系统设置
                    </h3>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: '#666', marginBottom: '0.3rem' }}>活动名称 (Theme Title)</label>
                            {isEditingSettings ? (
                                <input
                                    type="text"
                                    className="form-input"
                                    style={{ width: '100%' }}
                                    value={settings.event_title}
                                    onChange={e => setSettings({ ...settings, event_title: e.target.value })}
                                />
                            ) : (
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{settings.event_title}</div>
                            )}
                        </div>
                        <button
                            className="btn"
                            style={{ background: isEditingSettings ? 'var(--primary)' : '#eee', color: isEditingSettings ? 'white' : '#333' }}
                            onClick={() => isEditingSettings ? handleSaveSettings() : setIsEditingSettings(true)}
                        >
                            {isEditingSettings ? '完成修改' : '修改名称'}
                        </button>
                    </div>
                </div>

                <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ background: 'white', padding: '10px', borderRadius: '10px' }}>
                        <QRCodeCanvas value={`${window.location.origin}/vote`} size={100} />
                    </div>
                    <div>
                        <h4 style={{ margin: '0 0 0.5rem 0' }}>投票入口预览</h4>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                            链接: <a href={`${window.location.origin}/vote`} target="_blank" rel="noreferrer">{window.location.origin}/vote</a>
                        </p>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gap: '1rem' }}>
                {isAdding && (
                    <div className="glass-card animate-fade-in" style={{ border: '2px dashed var(--primary)' }}>
                        <div style={{ display: 'grid', gap: '1rem' }}>
                            <input type="text" placeholder="节目名称" className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                            <input type="text" placeholder="类别" className="form-input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-primary" onClick={() => handleSave()}><Save size={18} /> 保存</button>
                                <button className="btn" onClick={() => setIsAdding(false)}><X size={18} /> 取消</button>
                            </div>
                        </div>
                    </div>
                )}

                {programs.map(program => (
                    <div key={program.id} className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {editingId === program.id ? (
                            <div style={{ display: 'flex', gap: '1rem', flex: 1, marginRight: '1rem' }}>
                                <input type="text" className="form-input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={{ flex: 2 }} />
                                <input type="text" className="form-input" value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} style={{ flex: 1 }} />
                                <input type="number" className="form-input" value={editForm.votes} onChange={e => setEditForm({ ...editForm, votes: parseInt(e.target.value) })} style={{ width: '80px' }} />
                            </div>
                        ) : (
                            <div>
                                <h3 style={{ margin: 0 }}>{program.name}</h3>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>{program.category} · {program.votes} 票</p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {editingId === program.id ? (
                                <button className="btn btn-primary" onClick={() => handleSave(program.id)}><Save size={18} /></button>
                            ) : (
                                <button className="btn" onClick={() => handleEdit(program)}><Edit2 size={18} /></button>
                            )}
                            <button className="btn" style={{ color: '#ff4757' }} onClick={() => handleDelete(program.id)}><Trash2 size={18} /></button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .form-input {
                    padding: 0.8rem;
                    border-radius: 10px;
                    border: 1px solid #ddd;
                    outline: none;
                    transition: border-color 0.3s;
                }
                .form-input:focus {
                    border-color: var(--primary);
                }
            `}</style>
        </div>
    );
};

export default Admin;
