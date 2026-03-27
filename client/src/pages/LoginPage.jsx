import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { userAPI } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' | 'register'
    const [step, setStep] = useState(1); // 1 = Basic Info, 2 = Profile
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (mode === 'login') {
            if (!email || !password) return toast.error('Please fill all fields');
            setLoading(true);
            try {
                await signInWithEmail(email, password);
                toast.success('Welcome back! 👋');
            } catch (err) {
                toast.error(err.message?.replace('Firebase: ', '').replace('(auth/', '').replace(').', '') || 'Authentication failed');
            } finally {
                setLoading(false);
            }
            return;
        }

        // Registration Flow
        if (mode === 'register') {
            if (step === 1) {
                if (!email || !password || !name) return toast.error('Please complete all fields');
                if (password.length < 6) return toast.error('Password must be at least 6 characters');
                setStep(2); // Slide to step 2
                return;
            }

            if (step === 2) {
                if (!age || !gender) return toast.error('Please select age and gender to personalize your experience.');
                setLoading(true);
                try {
                    // Create Firebase user
                    await signUpWithEmail(email, password, name);
                    
                    // The AuthContext onAuthStateChanged listener syncs the user to MongoDB backend.
                    // We wait 1.5 seconds to ensure the backend document is inserted before we update it.
                    await new Promise(r => setTimeout(r, 1500));
                    
                    // Append our specific age and gender data to MongoDB directly
                    await userAPI.updateProfile({ 
                        displayName: name,
                        age: parseInt(age, 10), 
                        gender 
                    });
                    
                    toast.success('Account fully set up! 🎉');
                } catch (err) {
                    toast.error(err.message?.replace('Firebase: ', '').replace('(auth/', '').replace(').', '') || 'Registration failed');
                    setStep(1); // Send back on fail
                } finally {
                    setLoading(false);
                }
            }
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

    const GENDER_OPTIONS = [
        { id: 'Male', icon: '👨' },
        { id: 'Female', icon: '👩' },
        { id: 'Other', icon: '🌈' },
        { id: 'Secret', icon: '🕵️' }
    ];

    return (
        <div className="auth-page bg-[var(--bg-base)] text-[var(--text-primary)] min-h-screen flex">
            {/* Left — Brand Hero */}
            <div className="auth-left flex-1 hidden md:flex flex-col justify-center p-12 lg:p-24 relative overflow-hidden" style={{ background: 'var(--grad-primary)' }}>
                {/* Decorative background vectors */}
                <div className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-white/10 blur-[100px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[var(--accent)]/30 blur-[120px] rounded-full pointer-events-none" />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="flex items-center gap-4 mb-16">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border border-white/20 bg-white/10 backdrop-blur-md">
                            S
                        </div>
                        <div>
                            <div className="text-3xl font-black text-white tracking-tight drop-shadow-md">SmartSpend</div>
                            <div className="text-xs text-white/70 tracking-[0.2em] uppercase font-bold mt-1">Cloud Expense Manager</div>
                        </div>
                    </div>

                    <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tight mb-8">
                        Take control of<br />your finances.
                    </h1>
                    <p className="text-white/80 text-xl leading-relaxed mb-16 max-w-xl font-medium">
                        Track every rupee, visualize spending patterns, set budgets, and get AI-powered insights — all in one beautiful cloud-native platform.
                    </p>

                    {/* Feature bullets */}
                    <div className="grid grid-cols-1 gap-6">
                        {[
                            { icon: '🎯', text: 'Real-time Analytics & Infographics' },
                            { icon: '🤖', text: 'Gemini 2.0 Auto-Categorization & Receipt OCR' },
                            { icon: '💰', text: 'Budget alerts before you overspend' },
                        ].map((f, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }} 
                                animate={{ opacity: 1, x: 0 }} 
                                transition={{ delay: 0.3 + i * 0.1 }}
                                key={i} className="flex items-center gap-4 bg-black/20 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl w-fit drop-shadow-lg"
                            >
                                <span className="text-2xl drop-shadow-md">{f.icon}</span>
                                <span className="text-white/90 font-bold tracking-wide">{f.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right — Auth Form */}
            <div className="auth-right flex-1 flex flex-col justify-center p-8 sm:p-12 lg:p-24 relative" style={{ background: 'var(--bg-base)' }}>
                <div className="max-w-md w-full mx-auto relative z-10">
                    {/* Top Switcher */}
                    <div className="flex bg-[var(--bg-hover)] p-1 rounded-xl mb-12 border border-[var(--border)] relative overflow-hidden">
                        <motion.div 
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-sm"
                            animate={{ left: mode === 'login' ? '4px' : 'calc(50%)' }}
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                        />
                        <button onClick={() => { setMode('login'); setStep(1); }} className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${mode === 'login' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Sign In</button>
                        <button onClick={() => setMode('register')} className={`flex-1 py-3 text-sm font-bold relative z-10 transition-colors ${mode === 'register' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>Sign Up</button>
                    </div>

                    <h2 className="text-3xl font-black mb-2 text-[var(--text-primary)] tracking-tight">
                        {mode === 'login' ? 'Welcome back.' : (step === 1 ? 'Create an account.' : 'Tell us about yourself.')}
                    </h2>
                    <p className="text-[var(--text-muted)] mb-10 text-sm font-medium">
                        {mode === 'login'
                            ? 'Sign in to jump back into your financial dashboard.'
                            : (step === 1 ? 'Start managing your expenses smarter today.' : 'This helps our AI personalize your financial insights.')}
                    </p>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5 relative">
                        <AnimatePresence mode="wait">
                            {(mode === 'login' || (mode === 'register' && step === 1)) && (
                                <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-5">
                                    {mode === 'register' && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs uppercase font-extrabold tracking-widest text-[var(--text-secondary)]">Full Name</label>
                                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Arjun Sharma" className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl p-4 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-colors" />
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs uppercase font-extrabold tracking-widest text-[var(--text-secondary)]">Email Address</label>
                                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl p-4 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-colors" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs uppercase font-extrabold tracking-widest text-[var(--text-secondary)]">Password</label>
                                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full bg-[var(--bg-hover)] border border-[var(--border)] rounded-xl p-4 text-[var(--text-primary)] font-medium outline-none focus:border-[var(--primary)] transition-colors" />
                                    </div>
                                </motion.div>
                            )}

                            {mode === 'register' && step === 2 && (
                                <motion.div key="step2" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex flex-col gap-8">
                                    {/* Innovative Age component */}
                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs uppercase font-extrabold tracking-widest text-[var(--text-secondary)]">How old are you?</label>
                                            <span className="text-2xl font-black text-[var(--primary)]">{age || '-'}</span>
                                        </div>
                                        <input type="range" min="13" max="100" value={age || 25} onChange={(e) => setAge(e.target.value)}
                                            className="w-full h-3 bg-[var(--bg-hover)] rounded-full appearance-none outline-none border border-[var(--border)]"
                                            style={{ accentColor: 'var(--primary)' }}
                                        />
                                        <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] px-1">
                                            <span>Teens</span><span>Young Adult</span><span>Adult</span><span>Senior</span>
                                        </div>
                                    </div>

                                    {/* Innovative Gender Selection */}
                                    <div className="flex flex-col gap-3">
                                        <label className="text-xs uppercase font-extrabold tracking-widest text-[var(--text-secondary)]">Gender Identity</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {GENDER_OPTIONS.map((g) => (
                                                <button key={g.id} type="button" onClick={() => setGender(g.id)}
                                                    className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${gender === g.id ? 'bg-[var(--primary-subtle)] border-[var(--primary)] shadow-[0_0_15px_var(--primary-glow)]' : 'bg-[var(--bg-hover)] border-[var(--border)] hover:border-[var(--text-muted)]'}`}
                                                >
                                                    <span className="text-2xl drop-shadow-sm">{g.icon}</span>
                                                    <span className={`font-bold ${gender === g.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>{g.id}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="flex gap-3 mt-6">
                            {mode === 'register' && step === 2 && (
                                <button type="button" onClick={() => setStep(1)} className="p-4 rounded-xl font-bold bg-[var(--bg-hover)] text-[var(--text-primary)] border border-[var(--border)] hover:bg-[var(--bg-elevated)] transition-colors">
                                    Back
                                </button>
                            )}
                            <button type="submit" disabled={loading} className="flex-1 p-4 rounded-xl font-black uppercase tracking-widest text-white shadow-xl flex justify-center items-center transition-transform hover:scale-[1.02]" style={{ background: 'var(--grad-primary)' }}>
                                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (mode === 'login' ? 'Sign In' : (step === 1 ? 'Continue' : 'Create Account'))}
                            </button>
                        </div>
                    </form>

                    {mode === 'login' && (
                        <>
                            <div className="my-8 flex items-center gap-4 text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">
                                <div className="h-px bg-[var(--border)] flex-1" /> OR <div className="h-px bg-[var(--border)] flex-1" />
                            </div>
                            <button onClick={handleGoogle} disabled={loading} className="w-full flex items-center justify-center gap-3 p-4 rounded-xl bg-white text-black font-bold shadow-sm hover:bg-gray-100 transition-colors border border-gray-200">
                                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                Continue with Google
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
