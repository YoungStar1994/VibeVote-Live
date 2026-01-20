import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCw, Save, X } from 'lucide-react';

const API_BASE = 'http://localhost:3001';

const Admin = () => {
    const [programs, setPrograms] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', category: '', votes: 0 });
    const [isAdding, setIsAdding] = useState(false);

    const fetchPrograms = () => {
        fetch(`${API_BASE}/api/programs`)
            .then(res => res.json())
            .then(data => setPrograms(data));
    };

    useEffect(() => {
        fetchPrograms();
    }, []);

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

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: 'var(--primary)' }}>节目管理后台</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" style={{ color: '#ff4757', border: '1px solid #ff4757' }} onClick={handleResetAll}>
                        <RefreshCw size={18} /> 重置所有投票
                    </button>
                    <button className="btn btn-primary" onClick={() => { setIsAdding(true); setEditForm({ name: '', category: '', votes: 0 }); }}>
                        <Plus size={18} /> 新增节目
                    </button>
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
