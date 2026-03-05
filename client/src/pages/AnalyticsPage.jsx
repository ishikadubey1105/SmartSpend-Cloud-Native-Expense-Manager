import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI, exportAPI } from '../services/api';
import SpendingHeatmap from '../components/SpendingHeatmap';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };

// ── Ring Gauge Component ─────────────────────────────────────────────────────
function RingGauge({ percent, color, size = 60, stroke = 6 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = Math.min((percent / 100) * circ, circ);
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
                    style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column',
            }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color }}>{Math.round(percent)}%</div>
            </div>
        </div>
    );
}

// ── GlassPane Component ──────────────────────────────────────────────────────
function GlassPane({ children, delay = 0, accentColor = null, className = "", style = {} }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, type: 'spring', bounce: 0.3 }}
            className={className}
            style={{
                background: 'rgba(15,23,42,0.6)',
                border: `1px solid ${accentColor ? accentColor + '20' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 20,
                padding: 24,
                backdropFilter: 'blur(20px)',
                boxShadow: accentColor
                    ? `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${accentColor}10`
                    : '0 8px 32px rgba(0,0,0,0.4)',
                position: 'relative',
                overflow: 'hidden',
                ...style
            }}
        >
            {accentColor && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                }} />
            )}
            {children}
        </motion.div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '10px 14px', backdropFilter: 'blur(10px)' }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: 4 }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color || '#38bdf8', fontWeight: 600, margin: 0 }}>
                        {p.name}: ₹{Number(p.value).toLocaleString('en-IN')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
}

export default function AnalyticsPage() {
    const [trends, setTrends] = useState([]);
    const [categories, setCategories] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [daily, setDaily] = useState([]);
    const [heatmap, setHeatmap] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, c, p, d, h] = await Promise.all([
                analyticsAPI.getTrends(),
                analyticsAPI.getCategories({ month: selectedMonth, year: selectedYear }),
                analyticsAPI.getPaymentMethods(),
                analyticsAPI.getDaily(),
                analyticsAPI.getHeatmap()
            ]);
            setTrends(t.data);
            setCategories(c.data);
            setPaymentMethods(p.data);
            setDaily(d.data);
            setHeatmap(h.data || []);
        } catch {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => { load(); }, [load]);

    const handleExport = async (type) => {
        setExporting(true);
        const toastId = toast.loading(`Preparing ${type.toUpperCase()}...`);
        try {
            await exportAPI.download(type, { month: selectedMonth, year: selectedYear });
            toast.success(`${type.toUpperCase()} exported successfully!`, { id: toastId });
        } catch {
            toast.error('Export failed', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const totalSpent = categories.reduce((s, c) => s + c.total, 0);
    const topCategory = categories[0];
    const avgPerDay = daily.length ? daily.reduce((s, d) => s + d.total, 0) / daily.length : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-[#0ea5e9]/20 border-t-[#0ea5e9] animate-spin" />
                <p className="text-slate-400 font-medium tracking-widest uppercase text-xs">Analyzing Data Vault...</p>
            </div>
        </div>
    );

    return (
        <div className="pb-10 text-slate-200">
            {/* Override page background colors */}
            <style>{`
                .page-content { background: transparent !important; }
                body { background-color: #020617 !important; }
            `}</style>

            {/* Header Controls */}
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 mt-2">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0ea5e9]/30 to-[#7c3aed]/20 border border-[#0ea5e9]/30 flex items-center justify-center text-xl">
                            📊
                        </div>
                        Analytics Matrix
                    </h1>
                    <p className="text-slate-400 text-sm mt-2 font-medium">Deep insights into your financial telemetry</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800 backdrop-blur-md">
                    <select
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:border-[#0ea5e9]/50 transition-colors cursor-pointer appearance-none"
                        value={selectedMonth} onChange={(e) => setSelectedMonth(+e.target.value)}
                    >
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select
                        className="bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-2 outline-none focus:border-[#0ea5e9]/50 transition-colors cursor-pointer appearance-none"
                        value={selectedYear} onChange={(e) => setSelectedYear(+e.target.value)}
                    >
                        {years.map((y) => <option key={y}>{y}</option>)}
                    </select>
                    <div className="w-px h-6 bg-slate-700 mx-1" />
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-bold rounded-xl px-4 py-2 transition-colors flex items-center gap-2">
                        📥 CSV
                    </button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="bg-gradient-to-r from-[#0ea5e9] to-[#3b82f6] hover:brightness-110 border-none text-white text-sm font-bold rounded-xl px-4 py-2 transition-all shadow-[0_0_15px_rgba(14,165,233,0.3)] flex items-center gap-2">
                        📄 Report
                    </button>
                </div>
            </motion.div>

            {/* Quick KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { label: 'Total MTD', value: `₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '💸', color: '#0ea5e9', sub: `${months[selectedMonth - 1]} ${selectedYear}` },
                    { label: 'Top Category', value: topCategory?.category || '—', icon: CATEGORY_EMOJI[topCategory?.category] || '📊', color: CATEGORY_COLORS[topCategory?.category] || '#a78bfa', sub: topCategory ? `₹${topCategory.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '' },
                    { label: 'Avg Daily Spend', value: `₹${avgPerDay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '📉', color: '#10b981', sub: `${daily.length} active days processed` },
                ].map((s, i) => (
                    <GlassPane key={i} delay={0.1 + i * 0.1} accentColor={s.color} className="flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{s.label}</span>
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border border-white/5" style={{ background: `${s.color}15`, color: s.color }}>
                                {s.icon}
                            </div>
                        </div>
                        <div className="text-3xl font-black tracking-tight" style={{ color: s.color, filter: `drop-shadow(0 0 10px ${s.color}40)` }}>{s.value}</div>
                        {s.sub && <p className="text-xs text-slate-500 font-medium mt-2">{s.sub}</p>}
                    </GlassPane>
                ))}
            </div>

            {/* 12-Month Area Chart */}
            <GlassPane delay={0.4} accentColor="#7c3aed" className="mb-8">
                <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#a78bfa] block mb-1">Macro Trends</span>
                    <h3 className="text-lg font-bold text-slate-200">12-Month Telemetry</h3>
                </div>
                <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.5} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                            <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                            <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                            <Area type="monotone" dataKey="total" name="Total Spent" stroke="#a78bfa" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" activeDot={{ r: 6, fill: '#a78bfa', stroke: '#020617', strokeWidth: 2 }} />
                            <Area type="monotone" dataKey="count" name="Transactions" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </GlassPane>

            {/* Category Analysis Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Category Breakdown list with RingGauges */}
                <GlassPane delay={0.5} accentColor="#fbbf24">
                    <div className="mb-6 mb-8">
                        <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#fbbf24] block mb-1">Micro Analysis</span>
                        <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">Distribution Matrix</h3>
                    </div>
                    {categories.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 font-medium">No telemetry data acquired.</div>
                    ) : (
                        <div className="flex flex-col gap-5 max-h-[340px] overflow-y-auto pr-2 custom-scrollbar">
                            {categories.map((c, i) => {
                                const pct = totalSpent ? ((c.total / totalSpent) * 100) : 0;
                                const usedPct = c.budget ? Math.min((c.total / c.budget) * 100, 100) : null;
                                const color = CATEGORY_COLORS[c.category] || '#94a3b8';

                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.5 + i * 0.1 }}
                                        className="flex items-center gap-5 p-3 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 border border-white/5" style={{ background: `${color}15`, color }}>
                                            {CATEGORY_EMOJI[c.category] || '📌'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-end mb-1">
                                                <div className="font-bold text-slate-200 truncate">{c.category}</div>
                                                <div className="font-black text-[1.1rem]" style={{ color }}>₹{c.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400">{c.count} txns · {pct.toFixed(1)}% of total</span>
                                                {c.budget && (
                                                    <span className={`font-bold ${usedPct >= 100 ? 'text-red-400' : usedPct >= 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {usedPct.toFixed(0)}% of budget
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Circular progress replace flat bar */}
                                        <div className="shrink-0 flex items-center justify-center pl-2 border-l border-slate-700/50">
                                            <RingGauge percent={pct} color={color} size={46} stroke={4} />
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </GlassPane>

                {/* Payment Methods and Daily Bar Chart */}
                <div className="flex flex-col gap-8">
                    {/* Payment Methods */}
                    <GlassPane delay={0.6} accentColor="#10b981" className="flex-1">
                        <div className="mb-2">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#10b981] block mb-1">Source Tracking</span>
                            <h3 className="text-lg font-bold text-slate-200">Payment Vectors</h3>
                        </div>
                        {paymentMethods.length === 0 ? (
                            <div className="text-center py-8 text-slate-500 font-medium">No vectors detected.</div>
                        ) : (
                            <div className="h-[200px] w-full flex items-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={paymentMethods} dataKey="total" nameKey="_id"
                                            cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                                            paddingAngle={8} label={false}
                                        >
                                            {paymentMethods.map((_, i) => (
                                                <Cell key={i} fill={['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#f472b6', '#60a5fa'][i % 7]} className="drop-shadow-lg outline-none" style={{ filter: `drop-shadow(0 0 6px ${['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#f472b6', '#60a5fa'][i % 7]}50)` }} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </GlassPane>

                    {/* Daily Activity Bar */}
                    <GlassPane delay={0.7} accentColor="#f43f5e" className="flex-1">
                        <div className="mb-4">
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#fb7185] block mb-1">Velocity</span>
                            <h3 className="text-lg font-bold text-slate-200">Daily Burn Rate</h3>
                        </div>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fb7185" stopOpacity={1} />
                                            <stop offset="100%" stopColor="#e11d48" stopOpacity={0.8} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <XAxis dataKey="_id" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                    <Bar dataKey="total" name="Spent" fill="url(#barGrad)" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </GlassPane>
                </div>
            </div>

            {/* Yearly Heatmap */}
            <GlassPane delay={0.9} accentColor="#0ea5e9">
                <div className="mb-6">
                    <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#38bdf8] block mb-1">Global History</span>
                    <h3 className="text-lg font-bold text-slate-200">Yearly Activity Heatmap</h3>
                </div>
                {heatmap.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 font-medium">Generating matrix points...</div>
                ) : (
                    <div className="overflow-hidden">
                        <SpendingHeatmap dailyData={heatmap} />
                    </div>
                )}
            </GlassPane>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </div>
    );
}
