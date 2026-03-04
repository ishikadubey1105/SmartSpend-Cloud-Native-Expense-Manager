import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const navigate = useNavigate();
    const inputRef = useRef(null);

    // Toggle with Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(o => !o);
                setQuery('');
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    if (!open) return null;

    const commands = [
        { name: 'Go to Dashboard', action: () => navigate('/dashboard'), icon: '🏠' },
        { name: 'View All Expenses', action: () => navigate('/expenses'), icon: '💸' },
        { name: 'Analyze Spending', action: () => navigate('/analytics'), icon: '📊' },
        { name: 'Manage Budgets', action: () => navigate('/budgets'), icon: '🎯' },
        { name: 'Ask AI Insights', action: () => navigate('/insights'), icon: '✨' },
        { name: 'Profile Settings', action: () => navigate('/settings'), icon: '⚙️' },
        // These could map to modals/actions in an advanced app
        { name: 'Add New Expense', action: () => { navigate('/expenses'); }, icon: '➕' },
        { name: 'Export CSV Report', action: () => { window.location.href = '/api/export/csv'; }, icon: '📥' },
    ];

    const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

    const handleSelect = (action) => {
        action();
        setOpen(false);
        setQuery('');
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setOpen(false)} style={{ alignItems: 'flex-start', paddingTop: '10vh', zIndex: 9999 }}>
            <div className="modal animate-in" style={{ width: '100%', maxWidth: 500, padding: 0, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>

                <div style={{ display: 'flex', alignItems: 'center', padding: '0 var(--space-4)', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>🔍</span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Type a command or search... (ESC to close)"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'transparent', padding: 'var(--space-4)', fontSize: '1.05rem', color: 'var(--text-primary)', outline: 'none' }}
                    />
                </div>

                <div style={{ maxHeight: 300, overflowY: 'auto', padding: 'var(--space-2)' }}>
                    {filtered.length === 0 ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>No commands found</div>
                    ) : (
                        filtered.map((cmd, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelect(cmd.action)}
                                className="command-item"
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)',
                                    background: 'transparent', border: 'none', borderRadius: 8, color: 'var(--text-secondary)',
                                    cursor: 'pointer', textAlign: 'left', transition: 'all 0.1s'
                                }}
                                onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                                onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                            >
                                <span style={{ fontSize: '1.1rem' }}>{cmd.icon}</span>
                                <span>{cmd.name}</span>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
