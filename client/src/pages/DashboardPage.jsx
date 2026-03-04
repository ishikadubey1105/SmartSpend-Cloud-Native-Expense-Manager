import { useEffect, useState, useCallback } from 'react';
import { analyticsAPI, expenseAPI, exportAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const CATEGORY_COLORS = {
    Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa',
    Bills: '#f87171', Health: '#34d399', Education: '#fb923c',
    Entertainment: '#f472b6', Other: '#94a3b8',
};
const CATEGORY_EMOJI = {
    Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡',
    Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌',
};

// ── Skeleton Cards ──────────────────────────────────────────────────────────
function SkeletonStatCard() {
    return (
        <div className="stat-card">
            <div className="flex justify-between items-center mb-4">
                <div className="skeleton" style={{ width: 100, height: 12, borderRadius: 4 }} />
                <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
            </div>
            <div className="skeleton" style={{ width: 120, height: 32, borderRadius: 6, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 4 }} />
        </div>
    );
}

function SkeletonChartCard() {
    return (
        <div className="card">
            <div className="flex justify-between items-center mb-6">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 80, height: 10, borderRadius: 4 }} />
                </div>
                <div className="skeleton" style={{ width: 40, height: 22, borderRadius: 99 }} />
            </div>
            <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 8 }} />
        </div>
    );
}

// ── Custom Tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px', minWidth: 140,
            }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.875rem' }}>
                        {p.name === 'ma3' ? '3M Avg: ' : 'Total: '}₹{Number(p.value).toLocaleString('en-IN')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, subLabel, icon, color, delay = 0 }) {
    return (
        <div className="stat-card animate-in" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex justify-between items-center mb-4">
                <span className="metric-label">{label}</span>
                <div className="cat-icon" style={{ background: `${color}20`, color, width: 40, height: 40, fontSize: '1.2rem' }}>
                    {icon}
                </div>
            </div>
            <div className="metric-value" style={{ color }}>
                {typeof value === 'string' ? value : `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
            </div>
            {subLabel && (
                <div style={{ marginTop: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {subLabel}
                </div>
            )}
        </div>
    );
}

export default function DashboardPage() {
    const { dbUser } = useAuth();
    const navigate = useNavigate();
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [categories, setCategories] = useState([]);
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [s, t, c, a] = await Promise.all([
                analyticsAPI.getSummary(),
                analyticsAPI.getTrends(),
                analyticsAPI.getCategories(),
                expenseAPI.getAnomalies(),
            ]);
            setSummary(s.data);
            setTrends(t.data.slice(-6));
            setCategories(c.data.slice(0, 6));
            setAnomalies(a.data || []);
        } catch {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleExport = async (type) => {
        setExporting(true);
        try {
            await exportAPI.download(type);
            toast.success(`${type.toUpperCase()} exported!`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const greet = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const budgetPct = summary?.budgetUsedPercent || 0;
    const hasAnomalies = anomalies.length > 0;
    const prediction = summary?.predictedMonthEnd;
    const willExceed = prediction && summary?.monthlyBudget && prediction > summary.monthlyBudget;

    if (loading) return (
        <div className="animate-fade">
            {/* Skeleton Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <div className="skeleton" style={{ width: 280, height: 36, borderRadius: 8, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 4 }} />
                </div>
                <div className="flex gap-3">
                    <div className="skeleton" style={{ width: 80, height: 36, borderRadius: 8 }} />
                    <div className="skeleton" style={{ width: 100, height: 36, borderRadius: 8 }} />
                </div>
            </div>
            {/* Skeleton Stat Grid */}
            <div className="grid-4 mb-6">
                {[0, 1, 2, 3].map(i => <SkeletonStatCard key={i} />)}
            </div>
            {/* Skeleton Chart Grid */}
            <div className="grid-2 mb-6">
                <SkeletonChartCard />
                <SkeletonChartCard />
            </div>
        </div>
    );

    return (
        <div>
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>
                        {greet()}, {dbUser?.displayName?.split(' ')[0] || 'there'} 👋
                    </h1>
                    <p className="text-secondary text-sm mt-2">Here's what's happening with your finances today.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="btn btn-ghost btn-sm">📥 CSV</button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn btn-secondary btn-sm">📄 PDF Report</button>
                </div>
            </div>

            {/* ── Anomaly Alert ─────────────────────────────────────────────────── */}
            {hasAnomalies && (
                <div className="alert alert-warning mb-6 animate-in" role="alert" style={{ alignItems: 'flex-start', cursor: 'pointer' }} onClick={() => navigate('/expenses')}>
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>🔍</span>
                    <div>
                        <strong>Unusual spending detected</strong>
                        <p style={{ fontSize: '0.84rem', marginTop: 4, lineHeight: 1.5 }}>
                            {anomalies.length} expense{anomalies.length > 1 ? 's' : ''} this month {anomalies.length > 1 ? 'are' : 'is'} significantly higher than your average: {' '}
                            {anomalies.slice(0, 2).map(a => `${a.title} (₹${a.amount.toLocaleString('en-IN')} vs avg ₹${a.categoryMean})`).join(', ')}
                            {anomalies.length > 2 ? ` +${anomalies.length - 2} more` : ''}. Click to review →
                        </p>
                    </div>
                </div>
            )}

            {/* ── Budget Alert ─────────────────────────────────────────────────── */}
            {budgetPct >= 80 && summary?.monthlyBudget && (
                <div className={`alert ${budgetPct >= 100 ? 'alert-danger' : 'alert-warning'} mb-4 animate-in`} role="alert">
                    <span style={{ fontSize: '1.2rem' }}>{budgetPct >= 100 ? '🚨' : '⚠️'}</span>
                    <div>
                        <strong>{budgetPct >= 100 ? 'Monthly Budget Exceeded!' : 'Budget Alert!'}</strong>
                        <span style={{ marginLeft: 8, fontWeight: 400 }}>
                            You've used {budgetPct.toFixed(0)}% of your ₹{summary.monthlyBudget.toLocaleString('en-IN')} monthly budget.
                        </span>
                    </div>
                </div>
            )}

            {/* ── Spend Prediction Callout ──────────────────────────────────────── */}
            {prediction > 0 && summary?.dayOfMonth >= 5 && (
                <div className="prediction-callout mb-6 animate-in stagger-1">
                    <div style={{
                        width: 44, height: 44, borderRadius: 'var(--radius-md)', flexShrink: 0,
                        background: willExceed ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
                    }}>
                        {willExceed ? '📈' : '✅'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: willExceed ? 'var(--warning)' : 'var(--success)' }}>
                            Month-End Prediction: ₹{prediction.toLocaleString('en-IN')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                            Based on your pace (₹{summary.totalThisMonth.toLocaleString('en-IN')} in {summary.dayOfMonth} days).
                            {willExceed
                                ? ` You're on track to exceed your ₹${summary.monthlyBudget.toLocaleString('en-IN')} budget by ₹${(prediction - summary.monthlyBudget).toLocaleString('en-IN')}.`
                                : summary.monthlyBudget
                                    ? ` Within your ₹${summary.monthlyBudget.toLocaleString('en-IN')} budget — great job! 🎉`
                                    : ' Set a monthly budget in Settings to track progress.'
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stat Cards ────────────────────────────────────────────────────── */}
            <div className="grid-4 mb-6" role="region" aria-label="Financial summary">
                <StatCard label="Total This Month" value={summary?.totalThisMonth || 0} icon="💰" color="var(--primary-light)" subLabel={`${summary?.monthlyCount || 0} transactions`} delay={0} />
                <StatCard label="Today's Spend" value={summary?.totalToday || 0} icon="📅" color="var(--accent)" subLabel={`${summary?.todayCount || 0} today`} delay={50} />
                <StatCard label="All-Time Total" value={summary?.totalAllTime || 0} icon="🏦" color="var(--success)" subLabel={`${summary?.totalExpenses || 0} expenses`} delay={100} />
                <StatCard
                    label="Budget Used"
                    value={summary?.monthlyBudget ? `${budgetPct.toFixed(0)}%` : '—'}
                    icon="🎯"
                    color={budgetPct >= 100 ? 'var(--danger)' : budgetPct >= 80 ? 'var(--warning)' : 'var(--success)'}
                    subLabel={summary?.monthlyBudget ? `₹${summary.monthlyBudget.toLocaleString('en-IN')} limit` : 'No budget set'}
                    delay={150}
                />
            </div>

            {/* ── Charts Row ────────────────────────────────────────────────────── */}
            <div className="grid-2 mb-6">
                {/* Spending Trend + Rolling Average */}
                <div className="card animate-in stagger-2">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Spending Trend</h3>
                            <p className="text-xs text-muted mt-1">Monthly totals + 3-month rolling average</p>
                        </div>
                        <span className="badge badge-primary">6M</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={trends} aria-label="Monthly spending trend chart">
                            <defs>
                                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="gradMA" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone" dataKey="total" name="total"
                                stroke="#7c3aed" strokeWidth={2.5}
                                fill="url(#gradBlue)"
                                dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 6 }}
                            />
                            <Area
                                type="monotone" dataKey="ma3" name="ma3"
                                stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="5 3"
                                fill="url(#gradMA)"
                                dot={false} activeDot={{ r: 5 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                    <div className="flex gap-4 mt-3" style={{ justifyContent: 'center' }}>
                        <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-block', width: 16, height: 3, background: '#7c3aed', borderRadius: 2 }} />Monthly Spend
                        </div>
                        <div className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'inline-block', width: 16, height: 2, background: '#06b6d4', borderRadius: 2, borderTop: '2px dashed #06b6d4' }} />3M Rolling Avg
                        </div>
                    </div>
                </div>

                {/* Category Breakdown Donut */}
                <div className="card animate-in stagger-3">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Category Breakdown</h3>
                            <p className="text-xs text-muted mt-1">This month by category</p>
                        </div>
                        <span className="badge badge-primary">MTD</span>
                    </div>
                    {categories.length > 0 ? (
                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                            <ResponsiveContainer width="45%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={categories} dataKey="total" nameKey="category"
                                        cx="50%" cy="50%" innerRadius={48} outerRadius={78} paddingAngle={3}
                                        aria-label="Expense category distribution pie chart"
                                    >
                                        {categories.map((c, i) => (
                                            <Cell key={i} fill={CATEGORY_COLORS[c.category] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Spent']} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {categories.map((c, i) => {
                                    const total = categories.reduce((s, x) => s + x.total, 0);
                                    const pct = total ? ((c.total / total) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{ fontSize: '0.85rem' }}>{CATEGORY_EMOJI[c.category] || '📌'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: 3 }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }} className="truncate">{c.category}</span>
                                                    <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginLeft: 4 }}>{pct}%</span>
                                                </div>
                                                <div className="progress-bar" style={{ height: 4 }}>
                                                    <div className="progress-fill" style={{ width: `${pct}%`, background: CATEGORY_COLORS[c.category] || '#94a3b8' }} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                            <div className="empty-state-icon">📊</div>
                            <h3>No data this month</h3>
                            <p>Add expenses to see your category breakdown</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Bottom Row ────────────────────────────────────────────────────── */}
            <div className="grid-2">
                {/* Monthly Bar Chart */}
                <div className="card animate-in stagger-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Monthly Comparison</h3>
                            <p className="text-xs text-muted mt-1">Total spending per month</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200} aria-label="Monthly spending bar chart">
                        <BarChart data={trends} barSize={18}>
                            <defs>
                                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#7c3aed" />
                                    <stop offset="100%" stopColor="#06b6d4" />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            {summary?.monthlyBudget && (
                                <ReferenceLine y={summary.monthlyBudget} stroke="var(--danger)" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: 'Budget', fill: 'var(--danger)', fontSize: 10 }} />
                            )}
                            <Bar dataKey="total" name="total" fill="url(#barGrad)" radius={[5, 5, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Recent Transactions */}
                <div className="card animate-in">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Recent Transactions</h3>
                            <p className="text-xs text-muted mt-1">Your latest 5 expenses</p>
                        </div>
                        <button onClick={() => navigate('/expenses')} className="btn btn-ghost btn-sm" style={{ fontSize: '0.78rem' }}>
                            View all →
                        </button>
                    </div>
                    {summary?.recentExpenses?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {summary.recentExpenses.map((exp, i) => {
                                const isAnomaly = anomalies.some(a => a._id === exp._id);
                                return (
                                    <div
                                        key={exp._id}
                                        className="fade-in-item"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                                            background: isAnomaly ? 'rgba(245,158,11,0.06)' : 'rgba(255,255,255,0.02)',
                                            border: `1px solid ${isAnomaly ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
                                            animationDelay: `${i * 60}ms`,
                                        }}
                                    >
                                        <div
                                            className="cat-icon"
                                            style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] || '#94a3b8', flexShrink: 0 }}
                                        >
                                            {CATEGORY_EMOJI[exp.category] || '📌'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: '0.875rem', fontWeight: 500 }} className="truncate">{exp.title}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                                {exp.category} · {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                                            <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.875rem' }}>
                                                −₹{exp.amount.toLocaleString('en-IN')}
                                            </div>
                                            {isAnomaly && <span className="anomaly-badge">⚠ Unusual</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                            <div className="empty-state-icon">🧾</div>
                            <h3>No transactions yet</h3>
                            <p>Add your first expense to get started</p>
                            <button className="btn btn-primary btn-sm mt-4" onClick={() => navigate('/expenses')}>+ Add Expense</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
