import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { expenseAPI, insightsAPI } from '../services/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Education', 'Entertainment', 'Other'];
const PAYMENT_METHODS = ['UPI', 'Cash', 'Credit Card', 'Debit Card', 'Net Banking', 'Wallet'];
const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };
const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };

function RingGauge({ percent, color, size = 56, stroke = 5 }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = Math.min((percent / 100) * circ, circ);
    return (
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
                <motion.circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    initial={{ strokeDashoffset: circ }}
                    animate={{ strokeDashoffset: circ - dash }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '0.6rem', fontWeight: 800, color,
            }}>
                {Math.round(percent)}%
            </div>
        </div>
    );
}

export default function QuickAddModal({ onClose, onAdded, initialData }) {
    const [form, setForm] = useState({
        title: initialData?.title || '',
        amount: initialData?.amount || '',
        category: initialData?.category || '',
        paymentMethod: 'UPI',
        date: new Date().toISOString().split('T')[0],
        tags: '',
    });
    const [suggestedCat, setSuggestedCat] = useState('');
    const [catLoading, setCatLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [budgetAlert, setBudgetAlert] = useState(null);
    const titleRef = useRef(null);
    const fileRef = useRef(null);
    const debounceRef = useRef(null);

    // Focus on open
    useEffect(() => {
        setTimeout(() => titleRef.current?.focus(), 100);
        // ESC to close
        const onKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    // Live AI categorization with 600ms debounce
    const autoCateg = useCallback((title) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (title.trim().length < 3) { setSuggestedCat(''); return; }
        debounceRef.current = setTimeout(async () => {
            setCatLoading(true);
            try {
                const res = await insightsAPI.categorize(title.trim());
                setSuggestedCat(res.data.category);
                // Auto-apply if user hasn't chosen yet
                setForm(f => f.category ? f : { ...f, category: res.data.category });
            } catch { /* silent */ }
            finally { setCatLoading(false); }
        }, 600);
    }, []);

    const handleTitleChange = (e) => {
        const val = e.target.value;
        setForm(f => ({ ...f, title: val }));
        autoCateg(val);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title || !form.amount || !form.category) {
            toast.error('Please fill in title, amount and category');
            return;
        }
        setSubmitting(true);
        try {
            const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
            const res = await expenseAPI.create({
                title: form.title,
                amount: parseFloat(form.amount),
                category: form.category,
                paymentMethod: form.paymentMethod,
                date: form.date,
                tags,
            });
            if (res.budgetAlert) {
                setBudgetAlert(res.budgetAlert);
                setTimeout(() => { onAdded?.(); onClose(); }, 2500);
            } else {
                toast.success(`✅ ₹${parseFloat(form.amount).toLocaleString('en-IN')} added!`);
                onAdded?.();
                onClose();
            }
        } catch (err) {
            toast.error(err.message || 'Failed to add expense');
        } finally {
            setSubmitting(false);
        }
    };

    const handleReceiptUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image too large. Max 5MB.');
            return;
        }

        setScanning(true);
        const toastId = toast.loading('📸 OCR scanning receipt with AI...');

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                try {
                    const result = await insightsAPI.scanReceipt(reader.result, file.type);
                    const d = result.data;

                    setForm(f => ({
                        ...f,
                        title: d.title || f.title,
                        amount: d.amount ? String(d.amount) : f.amount,
                        date: d.date || f.date,
                        category: d.category !== 'Other' || !f.category ? d.category : f.category
                    }));
                    if (d.category && d.category !== 'Other') setSuggestedCat(d.category);

                    toast.success('✨ Receipt scanned successfully!', { id: toastId });
                } catch (err) {
                    toast.error('Failed to parse receipt', { id: toastId });
                } finally {
                    setScanning(false);
                }
            };
        } catch (err) {
            toast.error('File read error', { id: toastId });
            setScanning(false);
        }
    };

    const color = CATEGORY_COLORS[form.category] || '#64748b';
    const catPercent = form.amount ? Math.min((parseFloat(form.amount) / 5000) * 100, 100) : 0;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, zIndex: 9000,
                    background: 'rgba(2,6,23,0.85)',
                    backdropFilter: 'blur(12px)',
                }}
            />

            {/* Modal */}
            <motion.div
                key="modal"
                initial={{ opacity: 0, scale: 0.88, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
                style={{
                    position: 'fixed', top: '50%', left: '50%', zIndex: 9001,
                    transform: 'translate(-50%, -50%)',
                    width: 'min(520px, 95vw)',
                    background: 'linear-gradient(135deg, rgba(15,23,42,0.98), rgba(2,6,23,0.98))',
                    border: '1px solid rgba(14,165,233,0.15)',
                    borderRadius: 24,
                    overflow: 'hidden',
                    boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(14,165,233,0.05)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top glow line */}
                <div style={{ height: 2, background: `linear-gradient(90deg, transparent, ${color}, transparent)`, transition: 'background 0.4s' }} />

                {/* Header */}
                <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 8, fontSize: '1.2rem',
                                background: form.category ? `${color}20` : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.3s',
                            }}>
                                {form.category ? (CATEGORY_EMOJI[form.category] || '📌') : '⚡'}
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#e2e8f0' }}>Quick Add Expense</div>
                                <div style={{ fontSize: '0.7rem', color: '#475569', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                    Alt+N to open · Esc to close
                                </div>
                            </div>
                        </div>
                    </div>
                    {form.category && (
                        <RingGauge percent={catPercent} color={color} />
                    )}
                </div>

                {/* Budget Alert Banner */}
                <AnimatePresence>
                    {budgetAlert && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{
                                margin: '12px 24px 0',
                                padding: '10px 14px',
                                borderRadius: 10,
                                background: budgetAlert.type === 'exceeded' ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                                border: `1px solid ${budgetAlert.type === 'exceeded' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                fontSize: '0.8rem',
                                color: budgetAlert.type === 'exceeded' ? '#fca5a5' : '#fde68a',
                                fontWeight: 600,
                            }}
                        >
                            {budgetAlert.message}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Hidden file input */}
                    <input type="file" ref={fileRef} accept="image/*" onChange={handleReceiptUpload} style={{ display: 'none' }} />

                    {/* Title with live AI badge & OCR Upload */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block' }}>
                                Expense Title
                            </label>

                            <motion.button
                                type="button"
                                disabled={scanning}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    fontSize: '0.7rem', fontWeight: 800, color: '#0ea5e9', cursor: 'pointer',
                                    background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)',
                                    padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6,
                                    opacity: scanning ? 0.6 : 1
                                }}
                            >
                                {scanning ? '⏳ Scanning...' : '📸 Scan Receipt'}
                            </motion.button>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={titleRef}
                                value={form.title}
                                onChange={handleTitleChange}
                                placeholder="e.g. Swiggy dinner, Uber ride, Netflix..."
                                maxLength={100}
                                required
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${form.title ? 'rgba(14,165,233,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: 10,
                                    padding: '10px 38px 10px 12px',
                                    color: '#e2e8f0',
                                    fontSize: '0.9rem',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {/* AI status indicator */}
                            <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                                {catLoading ? (
                                    <div style={{
                                        width: 16, height: 16, borderRadius: '50%',
                                        border: '2px solid rgba(14,165,233,0.2)',
                                        borderTopColor: '#0ea5e9',
                                        animation: 'spin 0.8s linear infinite',
                                    }} />
                                ) : suggestedCat ? (
                                    <span style={{ fontSize: '1rem' }}>{CATEGORY_EMOJI[suggestedCat] || '✨'}</span>
                                ) : null}
                            </div>
                        </div>
                        {suggestedCat && !catLoading && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                style={{
                                    marginTop: 6, display: 'flex', alignItems: 'center', gap: 6,
                                    fontSize: '0.72rem', color: '#64748b',
                                }}
                            >
                                <span style={{ fontSize: '0.65rem', background: 'rgba(79,209,155,0.12)', color: '#34d399', padding: '2px 6px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.05em' }}>AI</span>
                                Suggests:
                                <button
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, category: suggestedCat }))}
                                    style={{
                                        background: `${CATEGORY_COLORS[suggestedCat]}20`,
                                        border: `1px solid ${CATEGORY_COLORS[suggestedCat]}40`,
                                        borderRadius: 6,
                                        padding: '2px 8px',
                                        color: CATEGORY_COLORS[suggestedCat],
                                        fontWeight: 700,
                                        fontSize: '0.72rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {CATEGORY_EMOJI[suggestedCat]} {suggestedCat}
                                </button>
                            </motion.div>
                        )}
                    </div>

                    {/* Amount + Date row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }}>Amount (₹)</label>
                            <input
                                type="number"
                                min="0.01" step="0.01"
                                value={form.amount}
                                onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                placeholder="0.00"
                                required
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${form.amount ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.07)'}`,
                                    borderRadius: 10, padding: '10px 12px',
                                    color: '#10b981', fontSize: '1rem', fontWeight: 700,
                                    outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                        <div>
                            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, display: 'block' }}>Date</label>
                            <input
                                type="date"
                                value={form.date}
                                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    borderRadius: 10, padding: '10px 12px',
                                    color: '#e2e8f0', fontSize: '0.85rem',
                                    outline: 'none', boxSizing: 'border-box',
                                    colorScheme: 'dark',
                                }}
                            />
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Category</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, category: cat }))}
                                    style={{
                                        padding: '6px 4px',
                                        borderRadius: 8,
                                        border: form.category === cat
                                            ? `1px solid ${CATEGORY_COLORS[cat]}`
                                            : '1px solid rgba(255,255,255,0.05)',
                                        background: form.category === cat
                                            ? `${CATEGORY_COLORS[cat]}18`
                                            : 'rgba(255,255,255,0.02)',
                                        cursor: 'pointer',
                                        color: form.category === cat ? CATEGORY_COLORS[cat] : '#64748b',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        display: 'flex', flexDirection: 'column',
                                        alignItems: 'center', gap: 3,
                                        transition: 'all 0.2s',
                                        boxShadow: form.category === cat ? `0 0 12px ${CATEGORY_COLORS[cat]}30` : 'none',
                                    }}
                                >
                                    <span style={{ fontSize: '1rem' }}>{CATEGORY_EMOJI[cat]}</span>
                                    <span>{cat}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Payment method */}
                    <div>
                        <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, display: 'block' }}>Payment Method</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {PAYMENT_METHODS.map(pm => (
                                <button
                                    key={pm}
                                    type="button"
                                    onClick={() => setForm(f => ({ ...f, paymentMethod: pm }))}
                                    style={{
                                        padding: '5px 12px',
                                        borderRadius: 20,
                                        border: form.paymentMethod === pm
                                            ? '1px solid rgba(14,165,233,0.5)'
                                            : '1px solid rgba(255,255,255,0.05)',
                                        background: form.paymentMethod === pm
                                            ? 'rgba(14,165,233,0.12)'
                                            : 'rgba(255,255,255,0.02)',
                                        color: form.paymentMethod === pm ? '#0ea5e9' : '#64748b',
                                        fontSize: '0.75rem', fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                    }}
                                >
                                    {pm}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <input
                            placeholder="Tags (comma-separated, e.g. work, personal)"
                            value={form.tags}
                            onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                            style={{
                                width: '100%',
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: 10, padding: '8px 12px',
                                color: '#94a3b8', fontSize: '0.8rem',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    {/* Submit */}
                    <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            width: '100%', padding: '13px',
                            borderRadius: 12, border: 'none',
                            background: form.category
                                ? `linear-gradient(135deg, ${color}, ${color}cc)`
                                : 'linear-gradient(135deg, #0ea5e9, #10b981)',
                            color: '#fff', fontWeight: 800,
                            fontSize: '0.95rem', cursor: submitting ? 'wait' : 'pointer',
                            boxShadow: form.category ? `0 4px 20px ${color}40` : '0 4px 20px rgba(14,165,233,0.3)',
                            transition: 'all 0.3s', opacity: submitting ? 0.7 : 1,
                            letterSpacing: '0.05em',
                        }}
                    >
                        {submitting ? '⏳ Saving...' : `✨ Add Expense${form.amount ? ` — ₹${parseFloat(form.amount || 0).toLocaleString('en-IN')}` : ''}`}
                    </motion.button>
                </form>

                {/* Spinner keyframe */}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </motion.div>
        </AnimatePresence>
    );
}
