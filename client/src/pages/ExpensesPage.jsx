import { useState, useEffect, useCallback } from 'react';
import { expenseAPI, exportAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'UPI', 'Net Banking', 'Wallet', 'Other'];
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };
const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };

function ExpenseForm({ initial, onSave, onCancel, loading }) {
    const [form, setForm] = useState(initial || {
        title: '', amount: '', category: 'Food', description: '',
        date: new Date().toISOString().split('T')[0], paymentMethod: 'UPI',
        isRecurring: false, recurringInterval: null, tags: '',
    });

    const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

    return (
        <form
            onSubmit={(e) => { e.preventDefault(); onSave({ ...form, amount: parseFloat(form.amount), tags: form.tags ? form.tags.split(',').map(t => t.trim()) : [] }); }}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                <div className="form-group">
                    <label className="form-label">Title *</label>
                    <input className="form-input" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Zomato order" required />
                </div>
                <div className="form-group">
                    <label className="form-label">Amount (₹) *</label>
                    <input className="form-input" type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" required />
                </div>
            </div>
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={(e) => set('category', e.target.value)}>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.paymentMethod} onChange={(e) => set('paymentMethod', e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={form.date?.split('T')[0] || form.date} onChange={(e) => set('date', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">Tags (comma separated)</label>
                    <input className="form-input" value={typeof form.tags === 'string' ? form.tags : (form.tags || []).join(', ')} onChange={(e) => set('tags', e.target.value)} placeholder="work, personal" />
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional note..." rows={2} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                <input type="checkbox" id="recurring" checked={form.isRecurring} onChange={(e) => set('isRecurring', e.target.checked)} style={{ cursor: 'pointer' }} />
                <label htmlFor="recurring" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>Recurring expense</label>
                {form.isRecurring && (
                    <select className="form-select" style={{ width: 'auto' }} value={form.recurringInterval || 'monthly'} onChange={(e) => set('recurringInterval', e.target.value)}>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                )}
            </div>
            <div className="flex justify-end gap-3" style={{ marginTop: 'var(--space-2)' }}>
                <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
                    {initial ? 'Update Expense' : 'Add Expense'}
                </button>
            </div>
        </form>
    );
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [pagination, setPagination] = useState({});
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [saving, setSaving] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [exporting, setExporting] = useState(false);
    const [filters, setFilters] = useState({ page: 1, limit: 15, search: '', category: '', startDate: '', endDate: '' });

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await expenseAPI.getAll({ ...filters, search: filters.search || undefined, category: filters.category || undefined, startDate: filters.startDate || undefined, endDate: filters.endDate || undefined });
            setExpenses(res.data);
            setPagination(res.pagination);
        } catch {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { load(); }, [load]);

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
                    setTimeout(() => toast(res.budgetAlert.message, { icon: res.budgetAlert.type === 'exceeded' ? '🚨' : '⚠️', duration: 5000 }), 500);
                }
            }
            setModalOpen(false);
            setEditTarget(null);
            load();
        } catch (err) {
            toast.error(err.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this expense?')) return;
        try {
            await expenseAPI.delete(id);
            toast.success('Expense deleted');
            load();
        } catch {
            toast.error('Delete failed');
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`Delete ${selected.size} expenses?`)) return;
        try {
            await expenseAPI.bulkDelete([...selected]);
            setSelected(new Set());
            toast.success(`${selected.size} expenses deleted`);
            load();
        } catch {
            toast.error('Bulk delete failed');
        }
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

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6" style={{ flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem' }}>Expenses</h1>
                    <p className="text-secondary text-sm mt-2">
                        {pagination.total || 0} total records
                    </p>
                </div>
                <div className="flex gap-3 flex-wrap">
                    {selected.size > 0 && (
                        <button onClick={handleBulkDelete} className="btn btn-danger btn-sm">
                            🗑️ Delete ({selected.size})
                        </button>
                    )}
                    <button onClick={() => handleExport('csv')} disabled={exporting} className="btn btn-ghost btn-sm">📥 CSV</button>
                    <button onClick={() => handleExport('pdf')} disabled={exporting} className="btn btn-ghost btn-sm">📄 PDF</button>
                    <button
                        onClick={() => { setEditTarget(null); setModalOpen(true); }}
                        className="btn btn-primary"
                    >
                        + Add Expense
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex flex-wrap gap-3">
                    <input
                        className="form-input"
                        style={{ flex: '1 1 200px', minWidth: 160 }}
                        placeholder="🔍  Search expenses..."
                        value={filters.search}
                        onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                    />
                    <select
                        className="form-select"
                        style={{ flex: '0 1 160px' }}
                        value={filters.category}
                        onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
                    >
                        <option value="">All Categories</option>
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input
                        type="date"
                        className="form-input"
                        style={{ flex: '0 1 160px' }}
                        value={filters.startDate}
                        onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value, page: 1 }))}
                    />
                    <input
                        type="date"
                        className="form-input"
                        style={{ flex: '0 1 160px' }}
                        value={filters.endDate}
                        onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value, page: 1 }))}
                    />
                    {(filters.search || filters.category || filters.startDate || filters.endDate) && (
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setFilters({ page: 1, limit: 15, search: '', category: '', startDate: '', endDate: '' })}
                        >
                            ✕ Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div className="empty-state" style={{ padding: 'var(--space-12)' }}>
                        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                    </div>
                ) : expenses.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧾</div>
                        <h3>No expenses found</h3>
                        <p>Add your first expense or adjust your filters</p>
                        <button className="btn btn-primary btn-sm mt-4" onClick={() => setModalOpen(true)}>
                            + Add Expense
                        </button>
                    </div>
                ) : (
                    <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>
                                        <input
                                            type="checkbox"
                                            checked={selected.size === expenses.length && expenses.length > 0}
                                            onChange={(e) => e.target.checked ? setSelected(new Set(expenses.map(ex => ex._id))) : setSelected(new Set())}
                                        />
                                    </th>
                                    <th>Expense</th>
                                    <th>Category</th>
                                    <th>Amount</th>
                                    <th>Method</th>
                                    <th>Date</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {expenses.map((exp, i) => (
                                    <tr key={exp._id} className="fade-in-item" style={{ animationDelay: `${i * 30}ms` }}>
                                        <td>
                                            <input type="checkbox" checked={selected.has(exp._id)} onChange={() => toggleSelect(exp._id)} />
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{exp.title}</div>
                                            {exp.description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate">{exp.description}</div>}
                                            {exp.isRecurring && <span className="badge badge-primary" style={{ marginTop: 4, fontSize: '0.65rem' }}>🔄 Recurring</span>}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <div className="cat-icon" style={{ background: `${CATEGORY_COLORS[exp.category]}20`, color: CATEGORY_COLORS[exp.category] || '#94a3b8', width: 28, height: 28, fontSize: '0.85rem' }}>
                                                    {CATEGORY_EMOJI[exp.category] || '📌'}
                                                </div>
                                                <span style={{ fontSize: '0.875rem' }}>{exp.category}</span>
                                            </div>
                                        </td>
                                        <td style={{ fontWeight: 700, color: 'var(--danger)' }}>
                                            −₹{exp.amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                                        </td>
                                        <td>
                                            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{exp.paymentMethod}</span>
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                                            {new Date(exp.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => { setEditTarget(exp); setModalOpen(true); }}
                                                    className="btn btn-ghost btn-sm btn-icon"
                                                    title="Edit"
                                                >✏️</button>
                                                <button
                                                    onClick={() => handleDelete(exp._id)}
                                                    className="btn btn-danger btn-sm btn-icon"
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
                            <button
                                disabled={pagination.page === 1}
                                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                                className="btn btn-ghost btn-sm"
                            >← Prev</button>
                            <button
                                disabled={pagination.page === pagination.pages}
                                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                                className="btn btn-ghost btn-sm"
                            >Next →</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editTarget ? '✏️ Edit Expense' : '➕ Add Expense'}</h3>
                            <button onClick={() => { setModalOpen(false); setEditTarget(null); }} className="btn btn-ghost btn-icon" style={{ padding: 6 }}>✕</button>
                        </div>
                        <ExpenseForm
                            initial={editTarget}
                            onSave={handleSave}
                            onCancel={() => { setModalOpen(false); setEditTarget(null); }}
                            loading={saving}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
