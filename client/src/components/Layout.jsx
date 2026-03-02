import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
    { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
    { to: '/expenses', icon: '💳', label: 'Expenses' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/budgets', icon: '🎯', label: 'Budgets' },
];

export default function Layout({ children }) {
    const { user, dbUser, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();

    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/login');
            toast.success('Signed out successfully');
        } catch {
            toast.error('Sign out failed');
        }
    };

    const displayName = dbUser?.displayName || user?.displayName || user?.email?.split('@')[0] || 'User';
    const avatarInitial = displayName.charAt(0).toUpperCase();

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99, backdropFilter: 'blur(4px)' }}
                />
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                {/* Logo */}
                <div className="sidebar-logo">
                    <div className="logo-mark">S</div>
                    <div>
                        <div className="logo-text"><span>Smart</span>Spend</div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>CLOUD EXPENSE MANAGER</div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav">
                    <div className="nav-section-title">Main Menu</div>
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                            onClick={() => setSidebarOpen(false)}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}

                    <div className="nav-section-title" style={{ marginTop: 'var(--space-4)' }}>Account</div>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={() => setSidebarOpen(false)}
                    >
                        <span className="nav-item-icon">⚙️</span> Settings
                    </NavLink>
                    <button
                        onClick={handleSignOut}
                        className="nav-item"
                        style={{ width: '100%', background: 'none', border: '1px solid transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--danger)', marginTop: 'auto' }}
                    >
                        <span className="nav-item-icon">🚪</span> Sign Out
                    </button>
                </nav>

                {/* User footer */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user?.photoURL
                            ? <img src={user.photoURL} alt={displayName} />
                            : avatarInitial
                        }
                    </div>
                    <div className="user-info">
                        <div className="user-name">{displayName}</div>
                        <div className="user-email">{user?.email}</div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="main-content">
                {/* Topbar */}
                <header className="topbar">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="btn btn-ghost btn-icon"
                            style={{ display: 'none' }}
                            id="menu-btn"
                        >
                            ☰
                        </button>
                    </div>
                    <div className="topbar-actions">
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                padding: '6px 14px',
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--success-subtle)',
                                border: '1px solid rgba(16,185,129,0.2)',
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', animation: 'pulse-glow 2s infinite' }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Live</span>
                        </div>
                    </div>
                </header>

                <div className="page-content animate-fade">
                    {children}
                </div>
            </main>
        </div>
    );
}
