import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const NAV = [
    { to: '/dashboard', icon: '⚡', label: 'Dashboard' },
    { to: '/expenses', icon: '💳', label: 'Expenses' },
    { to: '/analytics', icon: '📊', label: 'Analytics' },
    { to: '/budgets', icon: '🎯', label: 'Budgets' },
    { to: '/insights', icon: '🤖', label: 'AI Insights', badge: 'NEW' },
];

export default function Layout({ children }) {
    const { user, dbUser, signOut } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const sidebarRef = useRef(null);

    // Close sidebar on route change (mobile nav)
    useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

    // Escape key + focus trap for sidebar
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        document.body.style.overflow = sidebarOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

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
    const pageTitle = NAV.find((n) => location.pathname.startsWith(n.to))?.label || 'SmartSpend';

    return (
        <div className="app-layout">
            {/* Mobile backdrop overlay */}
            {sidebarOpen && (
                <div
                    aria-hidden="true"
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.65)',
                        zIndex: 199,
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                    }}
                />
            )}

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`sidebar ${sidebarOpen ? 'open' : ''}`}
                aria-label="Main navigation"
            >
                {/* Logo + mobile close button */}
                <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div className="logo-mark">S</div>
                        <div>
                            <div className="logo-text"><span>Smart</span>Spend</div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>CLOUD EXPENSE MANAGER</div>
                        </div>
                    </div>
                    {/* Close button — only shows on mobile */}
                    <button
                        onClick={() => setSidebarOpen(false)}
                        aria-label="Close navigation"
                        style={{
                            display: 'none',
                            background: 'none', border: 'none',
                            color: 'var(--text-muted)', fontSize: '1.4rem',
                            cursor: 'pointer', padding: 4,
                            lineHeight: 1,
                        }}
                        className="sidebar-close-btn"
                    >
                        ✕
                    </button>
                </div>

                {/* Nav */}
                <nav className="sidebar-nav" role="navigation" aria-label="App sections">
                    <div className="nav-section-title">Main Menu</div>
                    {NAV.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-item-icon">{item.icon}</span>
                            {item.label}
                            {item.badge && (
                                <span style={{
                                    marginLeft: 'auto',
                                    fontSize: '0.6rem', fontWeight: 700,
                                    background: 'var(--primary-light)',
                                    color: '#fff', padding: '2px 6px',
                                    borderRadius: 99, letterSpacing: '0.05em',
                                }}>
                                    {item.badge}
                                </span>
                            )}
                        </NavLink>
                    ))}

                    <div className="nav-section-title" style={{ marginTop: 'var(--space-4)' }}>Account</div>
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <span className="nav-item-icon">⚙️</span> Settings
                    </NavLink>
                    <button
                        onClick={handleSignOut}
                        className="nav-item"
                        aria-label="Sign out"
                        style={{ width: '100%', background: 'none', border: '1px solid transparent', textAlign: 'left', cursor: 'pointer', color: 'var(--danger)', marginTop: 'auto' }}
                    >
                        <span className="nav-item-icon">🚪</span> Sign Out
                    </button>
                </nav>

                {/* User card */}
                <div className="sidebar-user">
                    <div className="user-avatar">
                        {user?.photoURL
                            ? <img src={user.photoURL} alt={displayName} />
                            : avatarInitial
                        }
                    </div>
                    <div className="user-info">
                        <div className="user-name">{displayName}</div>
                        <div className="user-email" title={user?.email}>{user?.email}</div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content" id="main-content">
                {/* Topbar */}
                <header className="topbar" role="banner">
                    <div className="flex items-center gap-3">
                        {/* ── Hamburger ─ visible on mobile ── */}
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="btn btn-ghost btn-icon hamburger-btn"
                            aria-label="Open navigation menu"
                            aria-expanded={sidebarOpen}
                            aria-controls="sidebar-nav"
                        >
                            <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>☰</span>
                        </button>
                        {/* Mobile logo in topbar */}
                        <div className="topbar-mobile-logo">
                            <span style={{ color: 'var(--primary-light)', fontWeight: 900 }}>Smart</span>Spend
                        </div>
                        {/* Desktop page title */}
                        <span className="topbar-page-title">{pageTitle}</span>
                    </div>

                    <div className="topbar-actions">
                        {/* Live indicator */}
                        <div
                            style={{
                                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                padding: '6px 14px', borderRadius: 'var(--radius-full)',
                                background: 'var(--success-subtle)',
                                border: '1px solid rgba(16,185,129,0.2)',
                            }}
                        >
                            <span style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: 'var(--success)', display: 'inline-block',
                                animation: 'pulse-glow 2s infinite',
                            }} />
                            <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>Live</span>
                        </div>
                    </div>
                </header>

                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    );
}
