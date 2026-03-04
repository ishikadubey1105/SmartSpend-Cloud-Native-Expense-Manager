import { useState, useEffect, useCallback } from 'react';
import { budgetAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };

// ── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel }) {
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 380 }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>⚠️</div>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>{title}</h3>
                    <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)' }}>{message}</p>
                    <div className="flex gap-3" style={{ justifyContent: 'center' }}>
                        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
                        <button onClick={onConfirm} className="btn btn-danger">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function SkeletonBudgetCard() {
    return (
        <div className="skeleton-card" style={{ minHeight: 200 }}>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 8 }} />
                    <div>
                        <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4, marginBottom: 6 }} />
                        <div className="skeleton" style={{ width: 60, height: 10, borderRadius: 4 }} />
                    </div>
                </div>
                <div className="flex gap-2">
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                </div>
            </div>
            <div className="skeleton" style={{ width: '100%', height: 6, borderRadius: 99 }} />
            <div className="flex justify-between">
                <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 6 }} />
                <div className="skeleton" style={{ width: 70, height: 24, borderRadius: 6 }} />
            </div>
        </div>
    );
}

// ── Budget Card ─────────────────────────────────────────────────────────────
function BudgetCard({ budget, onEdit, onDelete }) {
    const spent = budget.spent || 0;
    const remaining = budget.remaining || Math.max(0, budget.limit - spent);
    const pct = budget.usedPercent ?? (budget.limit ? Math.min((spent / budget.limit) * 100, 100) : 0);
    const isOver = budget.isOverBudget ?? (spent > budget.limit);
    const isWarning = !isOver && pct >= (budget.alertThreshold || 80);

    return (
        <div className="card animate-in" style={{ position: 'relative', overflow: 'hidden' }} role="article" aria-label={`${budget.category} budget`}>
            {/* Top accent */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: isOver ? 'var(--danger)' : isWarning ? 'var(--warning)' : (CATEGORY_COLORS[budget.category] || '#7c3aed') }} />

            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    <div className="cat-icon" style={{ background: `${CATEGORY_COLORS[budget.category] || '#7c3aed'}20`, color: CATEGORY_COLORS[budget.category] || '#7c3aed', width: 40, height: 40 }}>
                        {CATEGORY_EMOJI[budget.category] || '📌'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{budget.category}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Alert at {budget.alertThreshold || 80}% · {budget.transactionCount ?? '—'} txns
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => onEdit(budget)} className="btn btn-ghost btn-sm btn-icon" title="Edit" aria-label={`Edit ${budget.category} budget`}>✏️</button>
                    <button onClick={() => onDelete(budget)} className="btn btn-danger btn-sm btn-icon" title="Delete" aria-label={`Delete ${budget.category} budget`}>🗑️</button>
                </div>
            </div>

            {/* Alert banners */}
            {isOver && (
                <div className="alert alert-danger mb-4" style={{ padding: '8px 12px', fontSize: '0.8rem' }} role="alert">
                    🚨 Budget exceeded by ₹{(spent - budget.limit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
            )}
            {isWarning && (
                <div className="alert alert-warning mb-4" style={{ padding: '8px 12px', fontSize: '0.8rem' }} role="alert">
                    ⚠️ {pct.toFixed(0)}% of budget used — approaching limit
                </div>
            )}

            {/* Progress */}
            <div className="flex justify-between text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                <span>Spent</span>
                <span>{typeof pct === 'number' ? pct.toFixed(0) : pct}%</span>
            </div>
            <div className="progress-bar mb-3" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className={`progress-fill ${isOver ? 'danger' : isWarning ? 'warning' : ''}`}
                    style={{ width: `${Math.min(pct, 100)}%`, background: !isOver && !isWarning ? (CATEGORY_COLORS[budget.category] || '#7c3aed') : undefined }} />
            </div>

            <div className="flex justify-between">
                <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isOver ? 'var(--danger)' : 'var(--text-primary)' }}>
                        ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>spent</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: isOver ? 'var(--danger)' : 'var(--success)' }}>
                        {isOver ? '-' : ''}₹{Math.abs(isOver ? spent - budget.limit : remaining).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isOver ? 'over budget' : 'remaining'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        ₹{budget.limit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>limit</div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function BudgetPage() {
    const now = new Date();
    const [budgets, setBudgets] = useState([]);
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [form, setForm] = useState({ category: 'Food', limit: '', alertThreshold: 80 });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const b = await budgetAPI.getAll({ month, year });
            setBudgets(b.data);
        } catch {
            toast.error('Failed to load budgets');
        } finally {
            setLoading(false);
        }
    }, [month, year]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        // Pre-select first uncovered category
        const covered = new Set(budgets.map(b => b.category));
        const first = CATEGORIES.find(c => !covered.has(c)) || 'Food';
        setEditTarget(null);
        setForm({ category: first, limit: '', alertThreshold: 80 });
        setModalOpen(true);
    };

    const openEdit = (b) => {
        setEditTarget(b);
        setForm({ category: b.category, limit: b.limit, alertThreshold: b.alertThreshold || 80 });
        setModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.limit || isNaN(+form.limit) || +form.limit <= 0) return toast.error('Enter a valid budget limit');
        setSaving(true);
        try {
            await budgetAPI.upsert({ category: form.category, limit: +form.limit, alertThreshold: +form.alertThreshold, month, year });
            toast.success(editTarget ? 'Budget updated ✅' : 'Budget set 🎯');
            setModalOpen(false);
            load();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (budget) => {
        setConfirm({
            title: 'Remove Budget',
            message: `Remove the ₹${budget.limit.toLocaleString('en-IN')} budget for ${budget.category}?`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await budgetAPI.delete(budget._id);
                    toast.success('Budget removed');
                    load();
                } catch { toast.error('Delete failed'); }
            },
        });
    };

    const totalBudget = budgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent = budgets.reduce((s, b) => s + (b.spent || 0), 0);
    const alertCount = budgets.filter(b => b.isOverBudget || b.isNearLimit).length;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>Budget Manager</h1>
                    <p className="text-secondary text-sm mt-2">Set limits. Get alerts. Stay in control.</p>
                </div>
                <div className="flex gap-3 items-center flex-wrap">
                    <select className="form-select" style={{ width: 'auto' }} value={month} onChange={(e) => setMonth(+e.target.value)} aria-label="Select month">
                        {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </select>
                    <select className="form-select" style={{ width: 'auto' }} value={year} onChange={(e) => setYear(+e.target.value)} aria-label="Select year">
                        {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
                    </select>
                    <button onClick={openAdd} className="btn btn-primary" id="set-budget-btn">＋ Set Budget</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid-3 mb-6" role="region" aria-label="Budget summary">
                {[
                    { label: 'Total Budgeted', value: `₹${totalBudget.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '🎯', color: 'var(--primary-light)', sub: `${budgets.length} categories` },
                    { label: 'Total Spent', value: `₹${totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: '💸', color: totalSpent > totalBudget ? 'var(--danger)' : 'var(--success)', sub: totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}% of budget` : '' },
                    { label: 'Active Alerts', value: alertCount, icon: '🔔', color: alertCount > 0 ? 'var(--warning)' : 'var(--success)', sub: alertCount > 0 ? 'Categories need attention' : 'All on track ✅' },
                ].map((s, i) => (
                    <div key={i} className="stat-card animate-in" style={{ animationDelay: `${i * 60}ms` }}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="metric-label">{s.label}</span>
                            <div className="cat-icon" style={{ background: `${s.color}20`, color: s.color, width: 40, height: 40, fontSize: '1.1rem' }}>{s.icon}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                        {s.sub && <p className="text-xs text-muted mt-2">{s.sub}</p>}
                    </div>
                ))}
            </div>

            {/* Budget Cards */}
            {loading ? (
                <div className="grid-auto">
                    {[1, 2, 3].map(i => <SkeletonBudgetCard key={i} />)}
                </div>
            ) : budgets.length === 0 ? (
                <div className="card">
                    <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
                        <div className="empty-state-icon">🎯</div>
                        <h3>No budgets set</h3>
                        <p>Set spending limits per category and get smart alerts before you overspend</p>
                        <button className="btn btn-primary btn-sm mt-4" onClick={openAdd}>Set First Budget</button>
                    </div>
                </div>
            ) : (
                <div className="grid-auto">
                    {budgets.map((b) => (
                        <BudgetCard key={b._id} budget={b} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                </div>
            )}

            {/* Uncovered categories */}
            {budgets.length > 0 && CATEGORIES.filter(c => !budgets.find(b => b.category === c)).length > 0 && (
                <div className="mt-6">
                    <p className="text-xs text-muted mb-3">Categories without a budget:</p>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.filter(c => !budgets.find(b => b.category === c)).map(c => (
                            <button
                                key={c}
                                onClick={() => { setForm({ category: c, limit: '', alertThreshold: 80 }); setEditTarget(null); setModalOpen(true); }}
                                className="badge badge-primary"
                                style={{ cursor: 'pointer', border: '1px dashed rgba(124,58,237,0.4)', background: 'transparent', fontSize: '0.75rem', padding: '4px 12px' }}
                                aria-label={`Set budget for ${c}`}
                            >
                                {CATEGORY_EMOJI[c]} {c} +
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 440 }} role="dialog" aria-modal="true" aria-labelledby="budget-modal-title">
                        <div className="modal-header">
                            <h3 id="budget-modal-title">{editTarget ? '✏️ Edit Budget' : '🎯 Set Budget'}</h3>
                            <button onClick={() => setModalOpen(false)} className="btn btn-ghost btn-icon" aria-label="Close" style={{ padding: 6 }}>✕</button>
                        </div>
                        <p className="text-sm text-muted mb-6">
                            Budget for <strong style={{ color: 'var(--text-primary)' }}>{months[month - 1]} {year}</strong>
                        </p>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="budget-category">Category</label>
                                <select id="budget-category" className="form-select" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} disabled={!!editTarget}>
                                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="budget-limit">Monthly Limit (₹)</label>
                                <input id="budget-limit" type="number" className="form-input" value={form.limit} onChange={(e) => setForm(f => ({ ...f, limit: e.target.value }))} placeholder="e.g. 5000" min="1" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="budget-threshold" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    Alert Threshold <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{form.alertThreshold}%</span>
                                </label>
                                <input id="budget-threshold" type="range" min="50" max="100" step="5" value={form.alertThreshold} onChange={(e) => setForm(f => ({ ...f, alertThreshold: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--primary-light)' }} />
                                <div className="flex justify-between text-xs text-muted"><span>50%</span><span>100%</span></div>
                            </div>
                            <div className="alert alert-info" style={{ fontSize: '0.8rem' }}>
                                🔔 You'll be alerted when {form.alertThreshold}% of ₹{form.limit || '?'} is spent
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <button type="button" onClick={() => setModalOpen(false)} className="btn btn-ghost">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
                                    {editTarget ? 'Update' : 'Set Budget'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirm Dialog */}
            {confirm && (
                <ConfirmDialog
                    title={confirm.title}
                    message={confirm.message}
                    onConfirm={confirm.onConfirm}
                    onCancel={() => setConfirm(null)}
                />
            )}
        </div>
    );
}
