import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) return toast.error('Please fill all fields');
        if (mode === 'register' && !name) return toast.error('Name is required');
        setLoading(true);
        try {
            if (mode === 'login') {
                await signInWithEmail(email, password);
                toast.success('Welcome back! 👋');
            } else {
                await signUpWithEmail(email, password, name);
                toast.success('Account created! 🎉');
            }
        } catch (err) {
            toast.error(err.message?.replace('Firebase: ', '').replace('(auth/', '').replace(').', '') || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        setLoading(true);
        try {
            await signInWithGoogle();
            toast.success('Signed in with Google! 🚀');
        } catch (err) {
            console.error(err);
            toast.error(`Google sign-in failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left — Brand Hero */}
            <div className="auth-left">
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-10)' }}>
                        <div className="logo-mark" style={{ width: 48, height: 48, fontSize: '1.4rem' }}>S</div>
                        <div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>SmartSpend</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em' }}>CLOUD EXPENSE MANAGER</div>
                        </div>
                    </div>

                    <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 'var(--space-5)' }}>
                        Take control of<br />your finances.
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: 'var(--space-10)', maxWidth: 420 }}>
                        Track every rupee, visualize spending patterns, set budgets, and get AI-powered insights — all in one beautiful cloud-native platform.
                    </p>

                    {/* Feature bullets */}
                    {[
                        { icon: '📊', text: 'Real-time analytics & spending charts' },
                        { icon: '🔔', text: 'Smart budget alerts before you overspend' },
                        { icon: '📄', text: 'Export reports to CSV & PDF instantly' },
                        { icon: '☁️', text: 'Cloud-native — always synced, always fast' },
                    ].map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', animation: `slideInLeft ${300 + i * 80}ms var(--ease-spring) both` }}>
                            <span style={{ fontSize: '1.2rem' }}>{f.icon}</span>
                            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>{f.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right — Auth Form */}
            <div className="auth-right">
                <div className="auth-form-wrapper animate-in">
                    {/* Logo on mobile */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-8)' }}>
                        <div className="logo-mark">S</div>
                        <div className="logo-text"><span>Smart</span>Spend</div>
                    </div>

                    <h2 style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)' }}>
                        {mode === 'login' ? 'Welcome back' : 'Create your account'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
                        {mode === 'login'
                            ? 'Sign in to continue to SmartSpend'
                            : 'Start managing your expenses smarter'}
                    </p>

                    {/* Google Sign In */}
                    <button
                        onClick={handleGoogle}
                        disabled={loading}
                        className="btn btn-ghost"
                        style={{ width: '100%', justifyContent: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', padding: '12px' }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                        Continue with Google
                    </button>

                    <div className="divider-text">or</div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        {mode === 'register' && (
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Arjun Sharma"
                                    className="form-input"
                                    autoComplete="name"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="form-input"
                                autoComplete="email"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="form-input"
                                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={loading}
                            style={{ justifyContent: 'center', marginTop: 'var(--space-2)' }}
                        >
                            {loading ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Processing...</> : (mode === 'login' ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-light)', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                        >
                            {mode === 'login' ? 'Create one' : 'Sign in'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
