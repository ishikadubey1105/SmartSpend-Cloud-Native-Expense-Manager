import { useState, useEffect, useCallback, useRef } from 'react';
import { expenseAPI, exportAPI, insightsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'];
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };
const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };

// ── Inline-validated Expense Form ──────────────────────────────────────────
function ExpenseForm({ initial, onSave, onCancel, loading }) {
    const [form, setForm] = useState(initial || {
        title: '', amount: '', category: 'Food', description: '',
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'UPI', isRecurring: false, recurringInterval: 'monthly', tags: '',
    });
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [aiCatLoading, setAiCatLoading] = useState(false);
    const debounceRef = useRef(null);

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
    const touch = (k) => setTouched((t) => ({ ...t, [k]: true }));

    // Validate a single field
    const validateField = (name, value) => {
        switch (name) {
            case 'title':
                if (!value?.trim()) return 'Title is required';
                if (value.trim().length > 100) return 'Max 100 characters';
                return '';
            case 'amount':
                if (!value) return 'Amount is required';
                if (parseFloat(value) <= 0) return 'Amount must be greater than 0';
                return '';
            case 'date': {
                const d = new Date(value);
                if (isNaN(d.getTime())) return 'Invalid date';
                if (d > new Date()) return 'Date cannot be in the future';
                return '';
            }
            default: return '';
        }
    };

    const validateAll = () => {
        const newErrors = {};
        ['title', 'amount', 'date'].forEach((k) => {
            const e = validateField(k, form[k]);
            if (e) newErrors[k] = e;
        });
        setErrors(newErrors);
        setTouched({ title: true, amount: true, date: true });
        return Object.keys(newErrors).length === 0;
    };

    const handleBlur = (k) => {
        touch(k);
        const e = validateField(k, form[k]);
        setErrors((prev) => ({ ...prev, [k]: e }));
    };

    // AI auto-categorize on title blur — debounced
    const handleTitleBlur = async (val) => {
        handleBlur('title');
        if (!val.trim() || val.trim().length < 3) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setAiCatLoading(true);
            try {
                const res = await insightsAPI.categorize(val.trim());
                const suggested = res.data?.category;
                if (suggested && suggested !== form.category) {
                    set('category', suggested);
                    toast(`🤖 AI suggests: ${suggested}`, { duration: 2500, style: { fontSize: '0.85rem' } });
                }
            } catch { /* silent */ }
            finally { setAiCatLoading(false); }
        }, 700);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateAll()) {
            toast.error('Please fix the errors before saving');
            return;
        }
        onSave({
            ...form,
            amount: parseFloat(form.amount),
            tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        });
    };

    const inputClass = (key) => `form-input ${touched[key] && errors[key] ? 'error' : ''}`;

    return (
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                {/* Title */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-title">
                        Title * {aiCatLoading && <span style={{ fontSize: '0.7rem', color: 'var(--accent)' }}> 🤖 categorizing…</span>}
                    </label>
                    <input
                        id="exp-title"
                        className={inputClass('title')}
                        value={form.title}
                        maxLength={100}
                        onChange={(e) => set('title', e.target.value)}
                        onBlur={(e) => handleTitleBlur(e.target.value)}
                        placeholder="e.g. Zomato order"
                        aria-invalid={!!(touched.title && errors.title)}
                        aria-describedby={errors.title ? 'title-error' : undefined}
                    />
                    {touched.title && errors.title && (
                        <span id="title-error" className="form-error" role="alert">⚠ {errors.title}</span>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {form.title.length}/100
                    </span>
                </div>
                {/* Amount */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-amount">Amount (₹) *</label>
                    <input
                        id="exp-amount"
                        className={inputClass('amount')}
                        type="number" min="0.01" step="0.01"
                        value={form.amount}
                        onChange={(e) => set('amount', e.target.value)}
                        onBlur={() => handleBlur('amount')}
                        placeholder="0.00"
                        aria-invalid={!!(touched.amount && errors.amount)}
                        aria-describedby={errors.amount ? 'amount-error' : undefined}
                    />
                    {touched.amount && errors.amount && (
                        <span id="amount-error" className="form-error" role="alert">⚠ {errors.amount}</span>
                    )}
                </div>
            </div>

            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                {/* Category */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-category">
                        Category {aiCatLoading && <span style={{ fontSize: '0.65rem', color: 'var(--accent)' }}>AI Suggesting…</span>}
                    </label>
                    <select id="exp-category" className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>
                {/* Payment Method */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-method">Payment Method</label>
                    <select id="exp-method" className="form-select" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                {/* Date */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-date">Date *</label>
                    <input
                        id="exp-date"
                        className={inputClass('date')}
                        type="date"
                        max={new Date().toISOString().split('T')[0]}
                        value={form.date?.split('T')[0] || form.date}
                        onChange={(e) => set('date', e.target.value)}
                        onBlur={() => handleBlur('date')}
                        aria-invalid={!!(touched.date && errors.date)}
                    />
                    {touched.date && errors.date && (
                        <span className="form-error" role="alert">⚠ {errors.date}</span>
                    )}
                </div>
                {/* Tags */}
                <div className="form-group">
                    <label className="form-label" htmlFor="exp-tags">Tags (comma separated)</label>
                    <input
                        id="exp-tags"
                        className="form-input"
                        value={typeof form.tags === 'string' ? form.tags : (form.tags || []).join(', ')}
                        onChange={(e) => set('tags', e.target.value)}
                        placeholder="work, personal, travel"
                        maxLength={200}
                    />
                </div>
            </div>

            {/* Description */}
            <div className="form-group">
                <label className="form-label" htmlFor="exp-desc">Description</label>
                <textarea
                    id="exp-desc"
                    className="form-textarea"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Optional note…"
                    rows={2}
                    maxLength={500}
                />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>{(form.description || '').length}/500</span>
            </div>

            {/* Recurring */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="recurring" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>🔄 Recurring expense</label>
                {form.isRecurring && (
                    <select className="form-select" style={{ width: 'auto' }} value={form.recurringInterval || 'monthly'} onChange={(e) => set('recurringInterval', e.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                )}
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: 'var(--space-2)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
                    {initial ? 'Update Expense' : 'Add Expense'}
                </button>
            </div>
        </form>
    );
}

// ── Skeleton Table ──────────────────────────────────────────────────────────
function SkeletonTable() {
    return (
        <div style={{ padding: 'var(--space-4)' }}>
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
                    <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0 }} />
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: '55%', height: 14, borderRadius: 4, marginBottom: 6 }} />
                        <div className="skeleton" style={{ width: '30%', height: 10, borderRadius: 4 }} />
                    </div>
                    <div className="skeleton" style={{ width: 80, height: 14, borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 99 }} />
                    <div className="skeleton" style={{ width: 70, height: 14, borderRadius: 4 }} />
                    <div className="flex gap-2">
                        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                        <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8 }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Confirm Dialog ──────────────────────────────────────────────────────────
function ConfirmDialog({ title, message, onConfirm, onCancel, danger = true }) {
    return (
        <div className="modal-overlay">
            <div className="modal" style={{ maxWidth: 380 }}>
                <div style={{ textAlign: 'center', padding: 'var(--space-4) 0' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>{danger ? '⚠️' : 'ℹ️'}</div>
                    <h3 style={{ marginBottom: 'var(--space-3)' }}>{title}</h3>
                    <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)' }}>{message}</p>
                    <div className="flex gap-3" style={{ justifyContent: 'center' }}>
                        <button onClick={onCancel} className="btn btn-ghost">Cancel</button>
                        <button onClick={onConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}>Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [exporting, setExporting] = useState(false);
    const [confirm, setConfirm] = useState(null); // { title, message, onConfirm }
    const [filters, setFilters] = useState({ page: 1, limit: 15, search: '', category: '', startDate: '', endDate: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = { ...filters };
            if (!params.search) delete params.search;
            if (!params.category) delete params.category;
            if (!params.startDate) delete params.startDate;
            if (!params.endDate) delete params.endDate;
            const res = await expenseAPI.getAll(params);
            setExpenses(res.data);
            setPagination(res.pagination);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

    const closeModal = () => { setModalOpen(false); setEditTarget(null); };

    const handleSave = async (data) => {
        setSaving(true);
        try {
            let res;
            if (editTarget) {
                res = await expenseAPI.update(editTarget._id, data);
                toast.success('Expense updated ✅');
            } else {
                res = await expenseAPI.create(data);
                toast.success('Expense added 🎉');
                if (res.budgetAlert) {
                    setTimeout(() => toast(res.budgetAlert.message, {
                        icon: res.budgetAlert.type === 'exceeded' ? '🚨' : '⚠️',
                        duration: 5500,
                    }), 600);
                }
            }
            closeModal();
            load();
        } catch (err) {
            // Show server-side validation errors if any
            const serverErrors = err?.errors;
            if (Array.isArray(serverErrors) && serverErrors.length > 0) {
                serverErrors.forEach((e) => toast.error(`${e.field}: ${e.message}`, { duration: 4000 }));
            } else {
                toast.error(err.message || 'Failed to save');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = (id, title) => {
        setConfirm({
            title: 'Delete Expense',
            message: `Are you sure you want to delete "${title}"? This action cannot be undone.`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await expenseAPI.delete(id);
                    toast.success('Expense deleted');
                    load();
                } catch {
                    toast.error('Delete failed');
                }
            },
        });
    };

    const handleBulkDelete = () => {
        setConfirm({
            title: 'Delete Multiple Expenses',
            message: `Delete ${selected.size} selected expense${selected.size > 1 ? 's' : ''}? This cannot be undone.`,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await expenseAPI.bulkDelete([...selected]);
                    setSelected(new Set());
                    toast.success(`${selected.size} expenses deleted`);
                    load();
                } catch {
                    toast.error('Bulk delete failed');
                }
            },
        });
    };

    const toggleSelect = (id) => {
        const s = new Set(selected);
        s.has(id) ? s.delete(id) : s.add(id);
        setSelected(s);
    };

    const handleExport = async (type) => {
        setExporting(true);
        try {
            await exportAPI.download(type, { category: filters.category, startDate: filters.startDate, endDate: filters.endDate });
            toast.success(`${type.toUpperCase()} downloaded!`);
        } catch {
            toast.error('Export failed');
        } finally {
            setExporting(false);
        }
    };

    const hasFilters = !!(filters.search || filters.category || filters.startDate || filters.endDate);

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>Expenses</h1>
                    <p className="text-secondary text-sm mt-2">{pagination.total || 0} total records</p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {selected.size > 0 && (
                        <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
                            🗑️ Delete ({selected.size})
                        </button>
                    )}
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="btn btn-ghost btn-sm" aria-label="Export as CSV">📥 CSV</button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn btn-ghost btn-sm" aria-label="Export as PDF">📄 PDF</button>
                    <button onClick={() => { setEditTarget(null); setModalOpen(true); }} className="btn btn-primary" id="add-expense-btn">
                        ＋ Add Expense
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap gap-3">
                    <input
                        className="form-input"
                        style={{ flex: '1 1 200px', minWidth: 160 }}
                        placeholder="🔍 Search expenses…"
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        aria-label="Search expenses"
                    />
                    <select
                        className="form-select" style={{ flex: '0 1 160px' }}
                        value={filters.category}
                        onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
                        aria-label="Filter by category"
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input
                        type="date" className="form-input" style={{ flex: '0 1 155px' }}
                        value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))}
                        aria-label="Start date filter"
                    />
                    <input
                        type="date" className="form-input" style={{ flex: '0 1 155px' }}
                        max={new Date().toISOString().split('T')[0]}
                        value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))}
                        aria-label="End date filter"
                    />
                    {hasFilters && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setFilters({ page: 1, limit: 15, search: '', category: '', startDate: '', endDate: '' })}
                            aria-label="Clear all filters"
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <SkeletonTable />
                ) : expenses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧾</div>
                        <h3>{hasFilters ? 'No matching expenses' : 'No expenses yet'}</h3>
                        <p>{hasFilters ? 'Try adjusting your filters' : 'Add your first expense to get started'}</p>
                        <button className="btn btn-primary btn-sm mt-4" onClick={() => setModalOpen(true)}>
                            ＋ Add Expense
                        </button>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }} role="region" aria-label="Expenses table">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            checked={selected.size === expenses.length && expenses.length > 0}
                                            onChange={(e) => e.target.checked
                                                ? setSelected(new Set(expenses.map(ex => ex._id)))
                                                : setSelected(new Set())}
                                            aria-label="Select all expenses"
                                        />
                                    </th>
                                    <th>Expense</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th className="hide-mobile">Method</th>
                                    <th className="hide-mobile">Date</th>
                                    <th style={{ width: 90 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp, i) => (
                                    <tr key={exp._id} className="fade-in-item" style={{ animationDelay: `${i * 25}ms` }}>
                                        <td>
                                            <input type="checkbox" checked={selected.has(exp._id)} onChange={() => toggleSelect(exp._id)} aria-label={`Select ${exp.title}`} />
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }} className="truncate">{exp.title}</div>
                                            {exp.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="truncate">{exp.description}</div>}
                                            {exp.isRecurring && <span className="badge badge-primary" style={{ marginTop: 4, fontSize: '0.62rem' }}>🔄 {exp.recurringInterval}</span>}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="cat-icon" style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] || '#94a3b8', width: 28, height: 28, fontSize: '0.82rem' }}>
                                                    {CATEGORY_EMOJI[exp.category] || '📌'}
                                                </div>
                                                <span style={{ fontSize: '0.875rem' }}>{exp.category}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)', whiteSpace: 'nowrap' }}>
                                            −₹{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td className="hide-mobile">
                                            <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>{exp.paymentMethod || '—'}</span>
                                        </td>
                                        <td className="hide-mobile" style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', whiteSpace: 'nowrap' }}>
                                            {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setEditTarget(exp); setModalOpen(true); }}
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    aria-label={`Edit ${exp.title}`}
                                                    title="Edit"
                                                >✏️</button>
                                                <button
                                                    onClick={() => handleDelete(exp._id, exp.title)}
                                                    className="btn btn-danger btn-sm btn-icon"
                                                    aria-label={`Delete ${exp.title}`}
                                                    title="Delete"
                                                >🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                    <div className="flex justify-between items-center" style={{ padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            Page {pagination.page} of {pagination.pages} · {pagination.total} records
                        </span>
                        <div className="flex gap-2">
                            <button disabled={pagination.page === 1} onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} className="btn btn-ghost btn-sm">← Prev</button>
                            <button disabled={pagination.page === pagination.pages} onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} className="btn btn-ghost btn-sm">Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="modal-header">
                            <h3 id="modal-title">{editTarget ? '✏️ Edit Expense' : '➕ Add New Expense'}</h3>
                            <button onClick={closeModal} className="btn btn-ghost btn-icon" aria-label="Close dialog" style={{ padding: 6 }}>✕</button>
                        </div>
                        <ExpenseForm
                            initial={editTarget}
                            onSave={handleSave}
                            onCancel={closeModal}
                            loading={saving}
                        />
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
