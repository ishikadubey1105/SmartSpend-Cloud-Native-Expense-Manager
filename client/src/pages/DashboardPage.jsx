import React, { useEffect, useState, useCallback, useRef } from 'react';
import { analyticsAPI, expenseAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Canvas } from '@react-three/fiber';
import { Sphere, MeshDistortMaterial, OrbitControls, Stars, Float, Sparkles } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import QuickAddModal from '../components/QuickAddModal';
import WrappedModal from '../components/WrappedModal';

const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };

// ── Animated Counter ─────────────────────────────────────────────────────────
function AnimatedCounter({ target, duration = 1200, prefix = '', suffix = '', colorClass = 'text-white' }) {
    const [count, setCount] = useState(0);
    const frameRef = useRef(null);

    useEffect(() => {
        const start = Date.now();
        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out quad
            const eased = 1 - (1 - progress) ** 3;
            setCount(Math.round(eased * target));
            if (progress < 1) frameRef.current = requestAnimationFrame(animate);
        };
        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [target, duration]);

    return (
        <div className="flex flex-col">
            <div className={`text-4xl md:text-5xl font-black tracking-tighter ${colorClass} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                <span className="opacity-70 text-2xl md:text-3xl mr-1 font-medium">{prefix}</span>
                {count.toLocaleString('en-IN')}
                <span className="opacity-70 text-2xl md:text-3xl ml-1 font-medium">{suffix}</span>
            </div>
        </div>
    );
}

// ── 3D Background Engine ─────────────────────────────────────────────────────
function SciFiGalaxy() {
    return (
        <Canvas style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1, background: '#020617', pointerEvents: 'none' }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 10]} intensity={2} color="#0df259" />
            <directionalLight position={[-10, -10, -10]} intensity={2} color="#0ea5e9" />

            <Stars radius={100} depth={50} count={6000} factor={4} saturation={1} fade speed={1.5} />
            <Sparkles count={200} scale={20} size={4} speed={0.4} opacity={0.2} color="#10b981" />

            <Float speed={2} rotationIntensity={1.5} floatIntensity={2} position={[4, 1, -10]}>
                <Sphere args={[2.5, 64, 64]}>
                    <MeshDistortMaterial color="#000000" envMapIntensity={1} clearcoat={1} clearcoatRoughness={0} metalness={0.9} roughness={0.1} distort={0.6} speed={2} emissive="#0ea5e9" emissiveIntensity={0.6} wireframe />
                </Sphere>
            </Float>

            <Float speed={3} rotationIntensity={2} floatIntensity={3} position={[-5, -3, -8]}>
                <Sphere args={[1.5, 64, 64]}>
                    <MeshDistortMaterial color="#000000" emissive="#10b981" emissiveIntensity={0.8} metalness={1} roughness={0} distort={0.5} speed={4} wireframe />
                </Sphere>
            </Float>
            <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
    );
}

// ── Interactive Glass 3D Panes ───────────────────────────────────────────────
function GlassPane({ children, delay = 0, className = "" }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            transition={{ duration: 0.8, delay, type: "spring", bounce: 0.4 }}
            whileHover={{ y: -5, scale: 1.02, transition: { duration: 0.2 } }}
            className={`relative backdrop-blur-2xl bg-[#0f172a]/40 border border-[#1e293b] shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] rounded-[2rem] overflow-hidden ${className}`}
            style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        >
            <div className="absolute -inset-px bg-gradient-to-br from-[#0ea5e9]/20 via-transparent to-[#10b981]/20 opacity-0 hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
            <div className="relative z-10 p-6 sm:p-8 h-full flex flex-col">
                {children}
            </div>
        </motion.div>
    );
}

// ── Kpi Glowing Value ────────────────────────────────────────────────────────
function NeonValue({ label, value, colorClass = "text-white", prefix = "", suffix = "" }) {
    return (
        <div className="flex flex-col">
            <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-1">{label}</span>
            <div className={`text-4xl md:text-5xl font-black tracking-tighter ${colorClass} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                <span className="opacity-70 text-2xl md:text-3xl mr-1 font-medium">{prefix}</span>
                {value}
                <span className="opacity-70 text-2xl md:text-3xl ml-1 font-medium">{suffix}</span>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [quickAddOpen, setQuickAddOpen] = useState(false);
    const [quickAddData, setQuickAddData] = useState(null);
    const [wrappedOpen, setWrappedOpen] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [s, c] = await Promise.all([
                analyticsAPI.getSummary(),
                analyticsAPI.getCategories()
            ]);
            setSummary(s.data);
            setCategories(c.data.slice(0, 6));
        } catch {
            toast.error('Data Sync Failure: Retrying Connection...');
        } finally {
            setLoading(false);
        }
    }, []);

    // Alt+N global shortcut to open Quick Add
    useEffect(() => {
        const handler = (e) => {
            if (e.altKey && e.key.toLowerCase() === 'n') {
                e.preventDefault();
                setQuickAddData(null);
                setQuickAddOpen(true);
            }
        };
        const omniHandler = (e) => {
            setQuickAddData(e.detail);
            setQuickAddOpen(true);
        };
        window.addEventListener('keydown', handler);
        window.addEventListener('open-quick-add', omniHandler);
        return () => {
            window.removeEventListener('keydown', handler);
            window.removeEventListener('open-quick-add', omniHandler);
        };
    }, []);

    useEffect(() => {
        loadData();
        document.body.classList.add('cyberspace-mode');
        return () => document.body.classList.remove('cyberspace-mode');
    }, [loadData]);

    const budgetPct = summary?.budgetUsedPercent || 0;
    const isDanger = budgetPct >= 90;

    if (loading) {
        return (
            <div className="w-full h-[80vh] flex flex-col items-center justify-center pointer-events-none">
                <style>{`
                    .cyberspace-mode { background-color: #020617 !important; color: white !important; }
                    .cyberspace-mode main { background: transparent !important; }
                    .bg-surface { background: rgba(15, 23, 42, 0.4) !important; backdrop-filter: blur(12px) !important; border-color: rgba(255,255,255,0.05) !important; color: white !important; }
                    .text-slate-800 { color: white !important; }
                `}</style>
                <div className="w-16 h-16 rounded-full border-t-2 border-b-2 border-[#0ea5e9] animate-spin border-t-transparent shadow-[0_0_15px_#0ea5e9]"></div>
                <div className="mt-8 text-[#0ea5e9] tracking-[0.3em] font-bold text-sm uppercase animate-pulse">Initializing Spatial Matrix</div>
            </div>
        );
    }

    return (
        <div className="relative min-h-full pb-12 overflow-hidden w-full text-slate-100">
            {/* Global Override Styles to make it seamlessly dark across the whole app wrapper */}
            <style>{`
                .cyberspace-mode { background-color: #020617 !important; color: white !important; }
                .cyberspace-mode .min-h-screen, .cyberspace-mode main { background: transparent !important; }
                .bg-surface { background: rgba(15, 23, 42, 0.3) !important; backdrop-filter: blur(20px) !important; border-color: rgba(255,255,255,0.05) !important; color: white !important; }
                .text-slate-800, .text-slate-900 { color: white !important; }
                .text-slate-500, .text-slate-600 { color: #94a3b8 !important; }
                .border-slate-100, .border-slate-200 { border-color: rgba(255,255,255,0.05) !important; }
            `}</style>

            <SciFiGalaxy />

            <div className="relative z-10 w-full max-w-7xl mx-auto selection:bg-[#0ea5e9]/30">
                {/* Holographic Header */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="mb-10 lg:mb-16 mt-4 flex justify-between items-end flex-wrap gap-4"
                >
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
                            <span className="text-[10px] tracking-[0.3em] uppercase text-[#10b981] font-bold">System Online • Connection Secure</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-[#e2e8f0] to-[#94a3b8]">
                            Command Center
                        </h1>
                        <p className="text-slate-400 font-medium text-sm lg:text-base mt-2 max-w-lg leading-relaxed">
                            Welcome back, Agent {dbUser?.displayName?.split(' ')[0] || 'User'}. Your financial metrics are fully synced and rendering in real-time.
                        </p>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => setWrappedOpen(true)}
                        className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white font-black uppercase text-sm px-6 py-3 rounded-xl tracking-widest shadow-[0_4px_30px_rgba(236,72,153,0.3)] hover:shadow-[0_4px_40px_rgba(236,72,153,0.5)] transition-all flex items-center gap-2"
                    >
                        ▶ Play Wrapped
                    </motion.button>
                </motion.div>

                {/* Quick Add FAB */}
                <motion.button
                    onClick={() => setQuickAddOpen(true)}
                    whileHover={{ scale: 1.1, boxShadow: '0 0 30px rgba(16,185,129,0.5)' }}
                    whileTap={{ scale: 0.9 }}
                    title="Quick Add Expense (Alt+N)"
                    className="fixed bottom-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{
                        background: 'linear-gradient(135deg, #10b981, #0ea5e9)',
                        boxShadow: '0 4px 24px rgba(16,185,129,0.35), 0 0 0 1px rgba(16,185,129,0.2)',
                    }}
                >
                    ＋
                </motion.button>

                {/* Quick Add Modal */}
                <AnimatePresence>
                    {quickAddOpen && (
                        <QuickAddModal
                            onClose={() => setQuickAddOpen(false)}
                            onAdded={loadData}
                        />
                    )}
                </AnimatePresence>

                {/* ── Core Metrics Grid ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <GlassPane delay={0.1}>
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-2 block">Total Spend / MTD</span>
                        <AnimatedCounter
                            target={Math.round(summary?.totalThisMonth || 0)}
                            prefix="₹"
                            colorClass="text-white"
                        />
                        <div className="mt-auto pt-6 flex justify-between items-center text-xs font-bold uppercase tracking-wider text-slate-400">
                            <span>{summary?.monthlyCount || 0} Transactions</span>
                            <span className="text-[#0ea5e9] bg-[#0ea5e9]/10 px-2 py-1 rounded">Volume Normal</span>
                        </div>
                    </GlassPane>

                    <GlassPane delay={0.2} className="relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#10b981] rounded-full mix-blend-screen filter blur-[50px] opacity-20 group-hover:opacity-40 transition-opacity duration-700" />
                        <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-2 block">Daily Telemetry</span>
                        <AnimatedCounter
                            target={Math.round(summary?.totalToday || 0)}
                            prefix="₹"
                            colorClass="text-[#10b981]"
                        />
                        <div className="mt-auto pt-6 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                            <span>Today's Load</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-pulse" />Live</span>
                        </div>
                    </GlassPane>

                    <GlassPane delay={0.3} className="md:col-span-2 relative">
                        <div className="flex flex-col md:flex-row gap-6 justify-between h-full">
                            <div className="flex flex-col z-10">
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold mb-3">Core Budget Integrity</span>
                                <div className="text-5xl font-black flex items-baseline gap-2">
                                    <span className={isDanger ? 'text-red-500' : 'text-white'}>{budgetPct.toFixed(1)}</span>
                                    <span className="text-2xl text-slate-500">%</span>
                                </div>
                                <div className="mt-auto pt-4 text-sm font-medium text-slate-400">
                                    Limit: <span className="text-white font-bold">₹{summary?.monthlyBudget?.toLocaleString('en-IN') || 'Unset'}</span>
                                </div>
                            </div>

                            {/* Futuristic Progress HUD */}
                            <div className="relative w-full md:w-1/2 flex items-center justify-center pb-4 md:pb-0">
                                <svg viewBox="0 0 100 50" className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                    <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="#1e293b" strokeWidth="6" strokeLinecap="round" />
                                    <motion.path
                                        d="M 10 50 A 40 40 0 0 1 90 50"
                                        fill="none"
                                        stroke={isDanger ? '#ef4444' : '#0ea5e9'}
                                        strokeWidth="6"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: Math.min(budgetPct / 100, 1) }}
                                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
                                    />
                                    <text x="50" y="45" textAnchor="middle" fill="white" className="font-bold text-[12px] tracking-widest">
                                        {isDanger ? 'CRITICAL' : 'STABLE'}
                                    </text>
                                </svg>
                            </div>
                        </div>
                    </GlassPane>
                </div>

                {/* ── Month-End Prediction Card ── */}
                <GlassPane delay={0.45} className="mb-6">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <span className="text-xs uppercase tracking-[0.2em] text-[#fbbf24] font-bold mb-2 block flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-[#fbbf24] rounded-full animate-pulse inline-block" />
                                AI Month-End Forecast
                            </span>
                            <div className="text-3xl font-black text-[#fbbf24]">
                                ₹{(summary?.predictedMonthEnd || 0).toLocaleString('en-IN')}
                            </div>
                            <div className="text-slate-400 text-xs mt-1 font-medium">
                                Projected spend · Day {summary?.dayOfMonth || 0} of {summary?.daysInMonth || 30}
                            </div>
                        </div>

                        {/* Burn-rate progress */}
                        <div className="flex-1 max-w-md">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                <span>Burn Rate</span>
                                <span className="text-[#fbbf24]">{summary?.dayOfMonth}/{summary?.daysInMonth} days</span>
                            </div>
                            <div className="h-2 w-full bg-[#0f172a] rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${((summary?.dayOfMonth || 0) / (summary?.daysInMonth || 30)) * 100}%` }}
                                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                                    className="h-full rounded-full bg-gradient-to-r from-[#fbbf24] to-[#f59e0b]"
                                    style={{ boxShadow: '0 0 10px rgba(251,191,36,0.5)' }}
                                />
                            </div>
                            {summary?.monthlyBudget > 0 && (
                                <div className="text-xs text-slate-500 mt-2">
                                    {summary.predictedMonthEnd > summary.monthlyBudget
                                        ? <span className="text-red-400 font-bold">⚠ On pace to exceed budget by ₹{(summary.predictedMonthEnd - summary.monthlyBudget).toLocaleString('en-IN')}</span>
                                        : <span className="text-[#10b981] font-bold">✓ On track to save ₹{(summary.monthlyBudget - summary.predictedMonthEnd).toLocaleString('en-IN')}</span>
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </GlassPane>

                {/* ── Data Streams & Visualizations ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Category Topography */}
                    <GlassPane delay={0.4} colSpan={1} className="flex flex-col">
                        <h3 className="text-xs uppercase tracking-[0.2em] text-[#0ea5e9] font-bold mb-6 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-[#0ea5e9] rounded-full" />
                            Vector Breakdown
                        </h3>
                        <div className="flex flex-col gap-4 flex-1">
                            {categories.map((c, i) => {
                                const total = categories.reduce((s, x) => s + x.total, 0);
                                const pct = total ? ((c.total / total) * 100) : 0;
                                const color = CATEGORY_COLORS[c.category] || '#94a3b8';

                                return (
                                    <div key={i} className="group cursor-default relative">
                                        <div className="flex justify-between items-end mb-2 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <span className="text-lg bg-black/20 p-2 rounded-xl backdrop-blur-sm border border-white/5">{CATEGORY_EMOJI[c.category] || '📌'}</span>
                                                <span className="font-bold text-slate-200 tracking-wide text-sm">{c.category}</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-black text-white">₹{c.total.toLocaleString()}</div>
                                                <div className="text-[10px] text-slate-400 font-bold uppercase">{pct.toFixed(1)}%</div>
                                            </div>
                                        </div>
                                        {/* Sci-fi Bar */}
                                        <div className="h-1.5 w-full bg-[#0f172a] rounded-full overflow-hidden relative border border-white/5">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${pct}%` }}
                                                transition={{ duration: 1, delay: 0.6 + (i * 0.1) }}
                                                className="absolute top-0 left-0 h-full rounded-full"
                                                style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            {categories.length === 0 && (
                                <div className="text-center text-slate-500 text-sm py-10 uppercase tracking-widest font-bold border border-dashed border-slate-700 rounded-xl">No Vector Data</div>
                            )}
                        </div>
                    </GlassPane>

                    {/* Transaction Data Stream */}
                    <GlassPane delay={0.5} colSpan={2}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs uppercase tracking-[0.2em] text-[#10b981] font-bold flex items-center gap-2">
                                <div className="w-1.5 h-1.5 bg-[#10b981] rounded-full" />
                                Live Transaction Stream
                            </h3>
                            <button onClick={() => navigate('/expenses')} className="text-[10px] uppercase font-bold tracking-widest border border-slate-700 px-3 py-1.5 rounded-full hover:bg-slate-800 transition-colors text-white">
                                Access Logs &rarr;
                            </button>
                        </div>

                        <div className="flex flex-col gap-3">
                            {summary?.recentExpenses?.length > 0 ? summary.recentExpenses.map((exp, i) => (
                                <motion.div
                                    key={exp._id}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ duration: 0.5, delay: 0.8 + (i * 0.1) }}
                                    className="flex justify-between items-center p-4 bg-gradient-to-r from-black/40 to-black/10 border border-slate-800/50 rounded-2xl hover:border-slate-600 transition-colors group relative overflow-hidden"
                                >
                                    {/* Scanline effect */}
                                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-transparent via-white/20 to-transparent transform -translate-y-full group-hover:translate-y-full transition-transform duration-1000" />

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-xl shadow-inner border border-white/5 group-hover:bg-white/10 transition-colors">
                                            {CATEGORY_EMOJI[exp.category] || '📌'}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-white tracking-wide">{exp.title}</span>
                                            <span className="text-[11px] font-mono text-slate-400 mt-1 uppercase">
                                                [{exp.category}] // {new Date(exp.date).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end relative z-10">
                                        <span className="font-black text-rose-400 text-lg flex items-center gap-1">
                                            <span className="text-[10px] border border-rose-400/30 px-1 rounded text-rose-400/80 mr-1">OUT</span>
                                            ₹{exp.amount.toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </motion.div>
                            )) : (
                                <div className="h-40 flex items-center justify-center text-slate-500 font-mono text-sm border border-slate-800 rounded-2xl bg-black/20">
                                    &gt; NO_DATA_DETECTED_IN_STREAM
                                </div>
                            )}
                        </div>
                    </GlassPane>

                </div>
            </div>
            {quickAddOpen && (
                <QuickAddModal
                    onClose={() => setQuickAddOpen(false)}
                    onAdded={() => { loadData(); setQuickAddOpen(false); }}
                    initialData={quickAddData}
                />
            )}

            {wrappedOpen && <WrappedModal onClose={() => setWrappedOpen(false)} />}
        </div>
    );
}
