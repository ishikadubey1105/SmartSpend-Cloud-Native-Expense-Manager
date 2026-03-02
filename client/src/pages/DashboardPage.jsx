import { useEffect, useState, useCallback } from 'react';
import { analyticsAPI, expenseAPI } from '../services/api';
import { exportAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

function StatCard({ label, value, change, icon, color, delay = 0 }) {
    return (
        <div className="stat-card animate-in" style={{ animationDelay: `${delay}ms` }}>
            <div className="flex justify-between items-center mb-4">
                <span className="metric-label">{label}</span>
                <div
                    className="cat-icon"
                    style={{ background: `${color}20`, color, width: 40, height: 40, fontSize: '1.2rem' }}
                >
                    {icon}
                </div>
            </div>
            <div className="metric-value" style={{ color }}>
                ₹{typeof value === 'number' ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : value}
            </div>
            {change != null && (
                <div style={{ marginTop: 'var(--space-3)' }}>
                    <span className={`metric-change ${change >= 0 ? 'up' : 'down'}`}>
                        {change >= 0 ? '▲' : '▼'} {Math.abs(change)} this month
                    </span>
                </div>
            )}
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
            }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                {payload.map((p, i) => (
                    <p key={i} style={{ color: p.color, fontWeight: 600, fontSize: '0.9rem' }}>
                        ₹{Number(p.value).toLocaleString('en-IN')}
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

export default function DashboardPage() {
    const { dbUser } = useAuth();
    const [summary, setSummary] = useState(null);
    const [trends, setTrends] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [s, t, c] = await Promise.all([
                analyticsAPI.getSummary(),
                analyticsAPI.getTrends(),
                analyticsAPI.getCategories(),
            ]);
            setSummary(s.data);
            setTrends(t.data.slice(-6));
            setCategories(c.data.slice(0, 6));
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

    if (loading) return (
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4, margin: '0 auto 16px' }} />
                <p className="text-muted">Loading your dashboard...</p>
            </div>
        </div>
    );

    const budgetPct = summary?.budgetUsedPercent || 0;

    return (
        <div>
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>
                        Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
                        {dbUser?.displayName?.split(' ')[0] || 'there'} 👋
                    </h1>
                    <p className="text-secondary text-sm mt-2">Here's what's happening with your finances today.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="btn btn-ghost btn-sm">
                        📥 CSV
                    </button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn btn-secondary btn-sm">
                        📄 PDF Report
                    </button>
                </div>
            </div>

            {/* Budget alert banner */}
            {budgetPct >= 80 && summary?.monthlyBudget && (
                <div className={`alert ${budgetPct >= 100 ? 'alert-danger' : 'alert-warning'} mb-6 animate-in`}>
                    <span style={{ fontSize: '1.2rem' }}>{budgetPct >= 100 ? '🚨' : '⚠️'}</span>
                    <div>
                        <strong>{budgetPct >= 100 ? 'Budget Exceeded!' : 'Budget Alert!'}</strong>
                        <span style={{ marginLeft: 8 }}>
                            You've used {budgetPct.toFixed(0)}% of your ₹{summary.monthlyBudget.toLocaleString('en-IN')} monthly budget.
                        </span>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid-4 mb-6">
                <StatCard label="Total This Month" value={summary?.totalThisMonth || 0} icon="💰" color="var(--primary-light)" change={summary?.monthlyCount} delay={0} />
                <StatCard label="Today's Spend" value={summary?.totalToday || 0} icon="📅" color="var(--accent)" change={summary?.todayCount} delay={50} />
                <StatCard label="All-Time Total" value={summary?.totalAllTime || 0} icon="🏦" color="var(--success)" delay={100} />
                <StatCard
                    label="Budget Used"
                    value={`${budgetPct.toFixed(0)}%`}
                    icon="🎯"
                    color={budgetPct >= 100 ? 'var(--danger)' : budgetPct >= 80 ? 'var(--warning)' : 'var(--success)'}
                    delay={150}
                />
            </div>

            {/* Charts Row */}
            <div className="grid-2 mb-6">
                {/* Spending Trend */}
                <div className="card animate-in stagger-2">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Spending Trend</h3>
                            <p className="text-xs text-muted mt-1">Last 6 months overview</p>
                        </div>
                        <span className="badge badge-primary">6M</span>
                    </div>
                    <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={trends}>
                            <defs>
                                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2.5} fill="url(#gradBlue)" dot={{ fill: '#7c3aed', r: 4 }} activeDot={{ r: 6 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Breakdown */}
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
                                    <Pie data={categories} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                                        {categories.map((c, i) => (
                                            <Cell key={i} fill={CATEGORY_COLORS[c.category] || '#94a3b8'} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {categories.map((c, i) => {
                                    const total = categories.reduce((s, x) => s + x.total, 0);
                                    const pct = total ? ((c.total / total) * 100).toFixed(0) : 0;
                                    return (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{ fontSize: '0.9rem' }}>{CATEGORY_EMOJI[c.category] || '📌'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{c.category}</span>
                                                    <span style={{ color: 'var(--text-muted)' }}>{pct}%</span>
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
                            <p>No data this month</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Bar Chart + Recent Expenses */}
            <div className="grid-2">
                {/* Monthly Bar Chart */}
                <div className="card animate-in stagger-4">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Monthly Comparison</h3>
                            <p className="text-xs text-muted mt-1">Total spending per month</p>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={trends} barSize={20}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" fill="url(#barGrad)" radius={[6, 6, 0, 0]}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#7c3aed" />
                                        <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                </defs>
                            </Bar>
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
                    </div>
                    {summary?.recentExpenses?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {summary.recentExpenses.map((exp, i) => (
                                <div
                                    key={exp._id}
                                    className="fade-in-item"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                        padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                                        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
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
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            {exp.category} · {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.9rem', flexShrink: 0 }}>
                                        −₹{exp.amount.toLocaleString('en-IN')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                            <div className="empty-state-icon">🧾</div>
                            <h3>No transactions yet</h3>
                            <p>Add your first expense to get started</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
