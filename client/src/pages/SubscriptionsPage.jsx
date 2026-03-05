import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { expenseAPI } from '../services/api';
import toast from 'react-hot-toast';

function GlassPane({ children, delay = 0, accentColor = null, className = "", style = {} }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay, type: 'spring', bounce: 0.3 }}
            className={className}
            style={{
                background: 'rgba(15,23,42,0.6)',
                border: `1px solid ${accentColor ? accentColor + '20' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 20, padding: 24, backdropFilter: 'blur(20px)',
                boxShadow: accentColor ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}10` : '0 8px 32px rgba(0,0,0,0.4)',
                position: 'relative', overflow: 'hidden', ...style
            }}
        >
            {accentColor && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)` }} />
            )}
            {children}
        </motion.div>
    );
}

export default function SubscriptionsPage() {
    const [subs, setSubs] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch recurring expenses
            const res = await expenseAPI.get({ limit: 100, isRecurring: true });

            // Deduplicate by title just in case the history is bloated
            const uniqueSubs = [];
            const titles = new Set();
            for (const item of (res.data.expenses || [])) {
                const normTitle = item.title.trim().toLowerCase();
                if (!titles.has(normTitle)) {
                    titles.add(normTitle);
                    uniqueSubs.push(item);
                }
            }
            setSubs(uniqueSubs);
        } catch (error) {
            toast.error('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const totalMonthly = subs.reduce((sum, s) => sum + s.amount, 0);
    const tenYearSink = totalMonthly * 12 * 10;

    // Gamification Logic
    const badgeUnlocked = totalMonthly < 5000;
    const badgeColor = badgeUnlocked ? '#10b981' : '#f43f5e';

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-[#3b82f6]/20 border-t-[#3b82f6] animate-spin" />
                <p className="text-slate-400 font-bold tracking-widest uppercase text-xs">Accessing Recurring Telemetry...</p>
            </div>
        </div>
    );

    return (
        <div className="pb-10 text-slate-200">
            {/* Override page background colors */}
            <style>{`
                .page-content { background: transparent !important; }
                body { background-color: #020617 !important; }
                .glass-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1); }
            `}</style>

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 mt-2">
                <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3b82f6]/30 to-[#8b5cf6]/20 border border-[#3b82f6]/30 flex items-center justify-center text-xl">
                        ♾️
                    </div>
                    Subscriptions Matrix
                </h1>
                <p className="text-slate-400 text-sm mt-2 font-medium">Manage auto-deducting telemetry and calculate lifetime sinks.</p>
            </motion.div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <GlassPane delay={0.1} accentColor="#3b82f6" className="flex flex-col justify-center">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#60a5fa] block mb-2">Total Monthly Bleed</span>
                    <div className="text-4xl font-black tracking-tight text-[#3b82f6]" style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.4))' }}>
                        ₹{totalMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">Automatically detected by AI auto-detector.</p>
                </GlassPane>

                <GlassPane delay={0.2} accentColor="#ef4444" className="flex flex-col justify-center">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#f87171] block mb-2">10-Year Lifetime Sink</span>
                    <div className="text-4xl font-black tracking-tight text-[#ef4444]" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.4))' }}>
                        ₹{tenYearSink.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-2">What this run rate costs you in a decade.</p>
                </GlassPane>

                {/* Gamification Badge */}
                <GlassPane delay={0.3} accentColor={badgeColor} className="flex flex-col items-center justify-center text-center relative overflow-hidden">
                    {badgeUnlocked && <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />}

                    <motion.div
                        initial={{ scale: 0.5, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: 'spring', bounce: 0.5 }}
                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3 shadow-[0_0_30px_rgba(0,0,0,0.5)] z-10"
                        style={{ background: badgeUnlocked ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #334155, #1e293b)' }}
                    >
                        {badgeUnlocked ? '🎖️' : '🔒'}
                    </motion.div>
                    <span className="text-sm font-bold tracking-tight text-white z-10">
                        {badgeUnlocked ? 'Subscription Ninja' : 'Badge Locked'}
                    </span>
                    <p className="text-xs text-slate-400 font-medium mt-1 z-10 max-w-[80%] mx-auto">
                        {badgeUnlocked ? "You keep your recurring costs strictly under ₹5K/mo. Optimization maximized!" : "Keep recurring costs under ₹5K/mo to unlock this achievement."}
                    </p>
                </GlassPane>
            </div>

            {/* List */}
            <h3 className="text-lg font-bold text-slate-200 mb-4 mt-8">Active Auto-Deductions ({subs.length})</h3>

            {subs.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-medium bg-slate-900/30 rounded-2xl border border-slate-800 backdrop-blur-sm">
                    No recurring telemetry detected.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subs.map((sub, i) => (
                        <motion.div
                            key={sub._id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.4 + i * 0.05 }}
                            className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl glass-card transition-all relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity text-5xl mix-blend-overlay pointer-events-none">
                                ↻
                            </div>

                            <div className="flex justify-between items-start mb-4">
                                <div className="font-bold text-slate-200 text-lg">{sub.title}</div>
                                <div className="text-xs font-bold uppercase tracking-wider text-slate-400 bg-slate-900/80 px-2 py-1 rounded-md border border-slate-700">
                                    {sub.category}
                                </div>
                            </div>

                            <div className="flex items-end justify-between">
                                <div>
                                    <div className="text-sm text-slate-500 font-medium mb-1">Monthly Cost</div>
                                    <div className="font-black text-2xl text-[#3b82f6]">₹{(sub.amount).toLocaleString('en-IN')}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">10yr Impact</div>
                                    <div className="font-bold text-red-400/80 text-sm tracking-tight">
                                        ≈ ₹{(sub.amount * 12 * 10).toLocaleString('en-IN')}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
