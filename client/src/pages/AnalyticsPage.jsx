import { useState, useEffect, useCallback } from 'react';
import { analyticsAPI, expenseAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar
} from 'recharts';

const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</p>
                {payload.map((p, i) => <p key={i} style={{ color: p.color || 'var(--primary-light)', fontWeight: 600 }}>₹{Number(p.value).toLocaleString('en-IN')}</p>)}
            </div>
        );
    }
    return null;
};

export default function AnalyticsPage() {
    const [trends, setTrends] = useState([]);
    const [categories, setCategories] = useState([]);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [daily, setDaily] = useState([]);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, c, p, d] = await Promise.all([
                analyticsAPI.getTrends(),
                analyticsAPI.getCategories({ month: selectedMonth, year: selectedYear }),
                analyticsAPI.getPaymentMethods(),
                analyticsAPI.getDaily(),
            ]);
            setTrends(t.data);
            setCategories(c.data);
            setPaymentMethods(p.data);
            setDaily(d.data);
        } catch {
            toast.error('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    useEffect(() => { load(); }, [load]);

    const handleExport = async (type) => {
        setExporting(true);
        try {
            await exportAPI.download(type, { month: selectedMonth, year: selectedYear });
            toast.success(`${type.toUpperCase()} exported!`);
        } catch { toast.error('Export failed'); }
        finally { setExporting(false); }
    };

    const totalSpent = categories.reduce((s, c) => s + c.total, 0);
    const topCategory = categories[0];
    const avgPerDay = daily.length ? daily.reduce((s, d) => s + d.total, 0) / daily.length : 0;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const years = [2024, 2025, 2026];

    if (loading) return (
        <div className="flex items-center justify-center" style={{ minHeight: '60vh' }}>
            <div style={{ textAlign: 'center' }}>
                <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4, margin: '0 auto 16px' }} />
                <p className="text-muted">Crunching your numbers...</p>
            </div>
        </div>
    );

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>Analytics</h1>
                    <p className="text-secondary text-sm mt-2">Deep insights into your spending patterns</p>
                </div>
                <div className="flex gap-3 flex-wrap items-center">
                    <select className="form-select" style={{ width: 'auto' }} value={selectedMonth} onChange={(e) => setSelectedMonth(+e.target.value)}>
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 'auto' }} value={selectedYear} onChange={(e) => setSelectedYear(+e.target.value)}>
                        {years.map((y) => <option key={y}>{y}</option>)}
                    </select>
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="btn btn-ghost btn-sm">📥 CSV</button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn btn-secondary btn-sm">📄 PDF</button>
                </div>
            </div>

            {/* Quick insight cards */}
            <div className="grid-3 mb-6">
                {[
                    { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '💸', color: 'var(--primary-light)', sub: `${months[selectedMonth - 1]} ${selectedYear}` },
                    { label: 'Top Category', value: topCategory?.category || '—', icon: CATEGORY_EMOJI[topCategory?.category] || '📊', color: CATEGORY_COLORS[topCategory?.category] || 'var(--accent)', sub: topCategory ? `₹${topCategory.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : '' },
                    { label: 'Avg Daily Spend', value: `₹${avgPerDay.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '📅', color: 'var(--success)', sub: `${daily.length} active days` },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="metric-label">{s.label}</span>
                            <div className="cat-icon" style={{ background: `${s.color}20`, color: s.color, width: 40, height: 40, fontSize: '1.2rem' }}>{s.icon}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        {s.sub && <p className="text-xs text-muted mt-2">{s.sub}</p>}
                    </div>
                ))}
            </div>

            {/* 12-Month Trend */}
            <div className="card mb-6 animate-in stagger-1">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 style={{ fontSize: '1rem' }}>12-Month Spending Trend</h3>
                        <p className="text-xs text-muted mt-1">Monthly totals over the past year</p>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={trends}>
                        <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.35} />
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area type="monotone" dataKey="total" name="Total Spent" stroke="#7c3aed" strokeWidth={2.5} fill="url(#g1)" dot={{ fill: '#7c3aed', r: 3 }} activeDot={{ r: 6 }} />
                        <Area type="monotone" dataKey="count" name="No. of Expenses" stroke="#06b6d4" strokeWidth={2} fill="url(#g2)" dot={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Category + Payment Row */}
            <div className="grid-2 mb-6">
                {/* Category Table */}
                <div className="card animate-in stagger-2">
                    <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-5)' }}>Category Breakdown</h3>
                    {categories.length === 0
                        ? <div className="empty-state" style={{ padding: 'var(--space-8)' }}><div className="empty-state-icon">📊</div><p>No data this month</p></div>
                        : <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {categories.map((c, i) => {
                                const pct = totalSpent ? ((c.total / totalSpent) * 100).toFixed(1) : 0;
                                return (
                                    <div key={i} className="fade-in-item" style={{ animationDelay: `${i * 40}ms` }}>
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <span style={{ fontSize: '1rem' }}>{CATEGORY_EMOJI[c.category] || '📌'}</span>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{c.category}</span>
                                                {c.budget && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Budget</span>}
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: c.budgetUsed >= 100 ? 'var(--danger)' : c.budgetUsed >= 80 ? 'var(--warning)' : 'var(--text-primary)' }}>
                                                    ₹{c.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                                </div>
                                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{pct}% of total · {c.count} txns</div>
                                            </div>
                                        </div>
                                        <div className="progress-bar">
                                            <div
                                                className={`progress-fill ${c.budgetUsed >= 100 ? 'danger' : c.budgetUsed >= 80 ? 'warning' : ''}`}
                                                style={{ width: `${Math.min(pct, 100)}%`, background: !c.budgetUsed ? (CATEGORY_COLORS[c.category] || '#94a3b8') : undefined }}
                                            />
                                        </div>
                                        {c.budget && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                                Budget: ₹{c.budget.toLocaleString('en-IN')} · Used: {c.budgetUsed}%
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    }
                </div>

                {/* Payment Method Pie */}
                <div className="card animate-in stagger-3">
                    <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-5)' }}>Payment Methods</h3>
                    {paymentMethods.length === 0
                        ? <div className="empty-state" style={{ padding: 'var(--space-8)' }}><div className="empty-state-icon">💳</div><p>No data</p></div>
                        : <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={paymentMethods} dataKey="total" nameKey="_id" cx="50%" cy="50%" outerRadius={80} paddingAngle={3} label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                                        {paymentMethods.map((_, i) => (
                                            <Cell key={i} fill={['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f472b6', '#60a5fa'][i % 7]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => `₹${v.toLocaleString('en-IN')}`} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                                {paymentMethods.map((m, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ width: 10, height: 10, borderRadius: 2, background: ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#f472b6', '#60a5fa'][i % 7] }} />
                                        {m._id} (₹{m.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })})
                                    </div>
                                ))}
                            </div>
                        </>
                    }
                </div>
            </div>

            {/* Daily Spending Bar */}
            <div className="card animate-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 style={{ fontSize: '1rem' }}>Daily Spending — {months[selectedMonth - 1]}</h3>
                        <p className="text-xs text-muted mt-1">Spending for each day of the month</p>
                    </div>
                </div>
                {daily.length === 0
                    ? <div className="empty-state" style={{ padding: 'var(--space-8)' }}><div className="empty-state-icon">📅</div><p>No daily data</p></div>
                    : <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={daily} barSize={16}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="_id" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(1)}k`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="total" name="Spent" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                }
            </div>
        </div>
    );
}
