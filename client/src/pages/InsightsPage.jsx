import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { insightsAPI, analyticsAPI, expenseAPI } from '../services/api';
import SpendingHeatmap from '../components/SpendingHeatmap';
import toast from 'react-hot-toast';
// Note: analyticsAPI.getHeatmap() is the efficient dedicated heatmap endpoint

const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };
const CATEGORY_COLORS = { Food: '#fbbf24', Transport: '#60a5fa', Shopping: '#a78bfa', Bills: '#f87171', Health: '#34d399', Education: '#fb923c', Entertainment: '#f472b6', Other: '#94a3b8' };

// ── Streaming Markdown Renderer ──────────────────────────────────────────────
function StreamingText({ text, speed = 8 }) {
    const [displayed, setDisplayed] = useState('');
    const iRef = useRef(0);

    useEffect(() => {
        setDisplayed('');
        iRef.current = 0;
        if (!text) return;
        const interval = setInterval(() => {
            iRef.current += speed;
            setDisplayed(text.slice(0, iRef.current));
            if (iRef.current >= text.length) clearInterval(interval);
        }, 16);
        return () => clearInterval(interval);
    }, [text, speed]);

    const html = displayed
        .replace(/^### (.*$)/gm, '<h3 style="color:#0ea5e9;font-size:0.95rem;font-weight:800;margin:16px 0 6px;letter-spacing:0.05em">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 style="color:#e2e8f0;font-size:1.05rem;font-weight:800;margin:18px 0 8px">$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#e2e8f0">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em style="color:#94a3b8">$1</em>')
        .replace(/^- (.*$)/gm, '<li style="margin:4px 0;padding-left:4px">$1</li>')
        .replace(/\n\n/g, '</p><p style="margin:8px 0">')
        .replace(/₹/g, '<span style="color:#10b981">₹</span>');

    return (
        <div
            style={{ lineHeight: 1.8, color: '#94a3b8', fontSize: '0.875rem' }}
            dangerouslySetInnerHTML={{ __html: `<p style="margin:0">${html}</p>` }}
        />
    );
}

// ── Anomaly Card ─────────────────────────────────────────────────────────────
function AnomalyCard({ anomaly, index }) {
    const color = CATEGORY_COLORS[anomaly.category] || '#94a3b8';
    return (
        <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + index * 0.08 }}
            style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.15)',
                display: 'flex', alignItems: 'center', gap: 14,
            }}
        >
            <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: `${color}15`,
                border: `2px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', flexShrink: 0,
            }}>
                {CATEGORY_EMOJI[anomaly.category] || '📌'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {anomaly.title}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 2 }}>
                    {anomaly.category} · {new Date(anomaly.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#f87171', marginTop: 2 }}>
                    {anomaly.zScore}σ above category average (avg ₹{(anomaly.categoryMean || 0).toLocaleString('en-IN')})
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontWeight: 800, color: '#f87171', fontSize: '1rem' }}>
                    ₹{anomaly.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </div>
                <div style={{ fontSize: '0.6rem', color: '#ef4444', fontWeight: 700, letterSpacing: '0.05em', marginTop: 2 }}>ANOMALY</div>
            </div>
        </motion.div>
    );
}

// ── Ring Gauge (reusable) ────────────────────────────────────────────────────
function RingGauge({ percent, color, size = 80, stroke = 7, label }) {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const dash = Math.min((percent / 100) * circ, circ);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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
                        transition={{ duration: 1.4, ease: 'easeOut', delay: 0.3 }}
                        style={{ filter: `drop-shadow(0 0 5px ${color}80)` }}
                    />
                </svg>
                <div style={{
                    position: 'absolute', inset: 0, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column',
                }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 900, color }}>{Math.round(percent)}%</div>
                </div>
            </div>
            {label && <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>{label}</div>}
        </div>
    );
}

// ── GlassPane ────────────────────────────────────────────────────────────────
function GlassPane({ children, delay = 0, accentColor, className }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay, type: 'spring', bounce: 0.3 }}
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
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

// ── Finance Tips ─────────────────────────────────────────────────────────────
const TIPS = [
    { icon: '⚡', rule: '50/30/20', desc: '50% needs · 30% wants · 20% savings', color: '#fbbf24' },
    { icon: '🎯', rule: 'Pay Yourself First', desc: 'Save before spending, not after', color: '#10b981' },
    { icon: '🛡️', rule: 'Emergency Fund', desc: '3–6 months of expenses in liquid savings', color: '#0ea5e9' },
    { icon: '🔁', rule: 'Automate Savings', desc: 'Set up auto-transfers on salary day', color: '#a78bfa' },
    { icon: '📉', rule: 'Track Daily', desc: 'Log expenses same-day for accuracy', color: '#f472b6' },
];

// ── Main Component ────────────────────────────────────────────────────────────
export default function InsightsPage() {
    const [insights, setInsights] = useState('');
    const [anomalies, setAnomalies] = useState([]);
    const [recurring, setRecurring] = useState(null);
    const [heatmapData, setHeatmapData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [autoTitle, setAutoTitle] = useState('');
    const [autoCat, setAutoCat] = useState('');
    const [autocatLoading, setAutocatLoading] = useState(false);
    const catDebounceRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            setDataLoading(true);
            try {
                const [r, a, h] = await Promise.all([
                    analyticsAPI.getRecurring(),
                    expenseAPI.getAnomalies(),
                    analyticsAPI.getHeatmap(),
                ]);
                setRecurring(r.data);
                setAnomalies(a.data || []);
                setHeatmapData(h.data || []);
            } catch { /* silent */ }
            finally { setDataLoading(false); }
        };
        init();
    }, []);

    // Live AI categorization with debounce
    const handleAutoTitleChange = (val) => {
        setAutoTitle(val);
        setAutoCat('');
        if (catDebounceRef.current) clearTimeout(catDebounceRef.current);
        if (val.trim().length < 2) return;
        catDebounceRef.current = setTimeout(async () => {
            setAutocatLoading(true);
            try {
                const res = await insightsAPI.categorize(val.trim());
                setAutoCat(res.data.category);
            } catch { /* silent */ }
            finally { setAutocatLoading(false); }
        }, 500);
    };

    const generateInsights = async () => {
        setLoading(true);
        setInsights('');
        try {
            const result = await insightsAPI.get();
            setInsights(result.data.insights);
        } catch (err) {
            toast.error(err.message || 'Failed to get AI insights');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ color: '#e2e8f0', minHeight: '100%' }}>
            {/* Override page background colors */}
            <style>{`
                .page-content { background: transparent !important; }
                body { background-color: #020617 !important; }
            `}</style>

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginBottom: 28 }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(14,165,233,0.2))',
                        border: '1px solid rgba(124,58,237,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.3rem',
                    }}>🤖</div>
                    <div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>AI Intelligence Hub</h1>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Powered by Google Gemini 2.0 Flash</p>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', color: '#a78bfa', padding: '4px 12px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        AI Powered
                    </div>
                </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>

                {/* ── AI Insights Panel ─────────────────────────────────────────── */}
                <GlassPane delay={0.05} accentColor="#7c3aed">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Personalized Analysis</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>AI Financial Insights</div>
                        </div>
                        <button
                            onClick={generateInsights}
                            disabled={loading}
                            style={{
                                background: loading ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.2)',
                                border: '1px solid rgba(124,58,237,0.4)',
                                borderRadius: 10, padding: '8px 14px',
                                color: '#a78bfa', fontWeight: 700, fontSize: '0.8rem',
                                cursor: loading ? 'wait' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                                transition: 'all 0.2s',
                            }}
                        >
                            {loading ? (
                                <>
                                    <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite' }} />
                                    Analyzing...
                                </>
                            ) : insights ? '🔄 Refresh' : '✨ Generate'}
                        </button>
                    </div>

                    {/* Empty state */}
                    {!insights && !loading && (
                        <motion.div style={{ textAlign: 'center', padding: '32px 0' }}>
                            <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>🧠</div>
                            <div style={{ fontWeight: 700, color: '#e2e8f0', marginBottom: 8 }}>Ready for Analysis</div>
                            <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: 20, maxWidth: 280, margin: '0 auto 20px', lineHeight: 1.6 }}>
                                Gemini AI will analyze your spending, budgets, and patterns to give you personalized insights.
                            </div>
                            <motion.button
                                onClick={generateInsights}
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                style={{
                                    background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                                    border: 'none', borderRadius: 12,
                                    padding: '12px 24px', color: '#fff',
                                    fontWeight: 800, fontSize: '0.9rem',
                                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)',
                                }}
                            >
                                ✨ Generate AI Report
                            </motion.button>
                        </motion.div>
                    )}

                    {/* Loading skeleton */}
                    {loading && (
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid rgba(124,58,237,0.3)', borderTopColor: '#a78bfa', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
                                <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Gemini is analyzing your finances...</span>
                            </div>
                            {[80, 60, 75, 50, 70, 65].map((w, i) => (
                                <div key={i} style={{ height: 12, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 10, width: `${w}%`, animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
                            ))}
                        </div>
                    )}

                    {/* Insights content */}
                    {insights && !loading && (
                        <div style={{
                            background: 'rgba(124,58,237,0.04)',
                            border: '1px solid rgba(124,58,237,0.12)',
                            borderRadius: 14, padding: 18, maxHeight: 380, overflowY: 'auto',
                        }}>
                            <StreamingText text={insights} speed={12} />
                        </div>
                    )}
                </GlassPane>

                {/* ── Anomaly Detector ──────────────────────────────────────────── */}
                <GlassPane delay={0.1} accentColor="#ef4444">
                    <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Statistical Outlier Detection</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>🔍 Anomalies</div>
                            {anomalies.length > 0 && (
                                <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 99, padding: '2px 8px', fontSize: '0.65rem', fontWeight: 800, color: '#f87171' }}>
                                    {anomalies.length} found
                                </div>
                            )}
                        </div>
                    </div>

                    {dataLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#475569', fontSize: '0.8rem' }}>
                            <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(239,68,68,0.2)', borderTopColor: '#f87171', animation: 'spin 0.7s linear infinite' }} />
                            Scanning transactions...
                        </div>
                    ) : anomalies.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>✅</div>
                            <div style={{ fontWeight: 700, color: '#10b981', marginBottom: 4 }}>All Clear!</div>
                            <div style={{ fontSize: '0.8rem', color: '#475569' }}>No spending anomalies detected this month</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 340, overflowY: 'auto' }}>
                            {anomalies.map((a, i) => (
                                <AnomalyCard key={a._id} anomaly={a} index={i} />
                            ))}
                        </div>
                    )}
                </GlassPane>
            </div>

            {/* ── Second Row: Auto-categorize + Recurring + Tips ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 18, marginBottom: 18 }}>

                {/* AI Auto Categorize */}
                <GlassPane delay={0.15} accentColor="#10b981">
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Live AI Classifier</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>🏷️ Auto-Categorize</div>
                    <div style={{ position: 'relative', marginBottom: 10 }}>
                        <input
                            value={autoTitle}
                            onChange={e => handleAutoTitleChange(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAutoTitleChange(autoTitle)}
                            placeholder="Type expense title..."
                            maxLength={100}
                            style={{
                                width: '100%', background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(16,185,129,0.2)',
                                borderRadius: 10, padding: '10px 36px 10px 12px',
                                color: '#e2e8f0', fontSize: '0.85rem',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: '0.9rem' }}>
                            {autocatLoading
                                ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.2)', borderTopColor: '#10b981', animation: 'spin 0.7s linear infinite' }} />
                                : autoCat ? (CATEGORY_EMOJI[autoCat] || '✨') : '🔍'}
                        </div>
                    </div>

                    <AnimatePresence>
                        {autoCat && !autocatLoading && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                style={{ overflow: 'hidden' }}
                            >
                                <div style={{
                                    padding: '12px 14px', borderRadius: 12,
                                    background: `${CATEGORY_COLORS[autoCat]}12`,
                                    border: `1px solid ${CATEGORY_COLORS[autoCat]}25`,
                                    display: 'flex', alignItems: 'center', gap: 12,
                                }}>
                                    <span style={{ fontSize: '1.8rem' }}>{CATEGORY_EMOJI[autoCat] || '📌'}</span>
                                    <div>
                                        <div style={{ fontWeight: 800, color: CATEGORY_COLORS[autoCat], fontSize: '1rem' }}>{autoCat}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>AI suggested category</div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </GlassPane>

                {/* Recurring vs Discretionary */}
                <GlassPane delay={0.2} accentColor="#0ea5e9">
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Burn Analysis</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>🔄 Fixed vs Variable</div>
                    {dataLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '16px 0' }}>
                            {[0, 1].map(i => <div key={i} style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />)}
                        </div>
                    ) : recurring ? (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 16 }}>
                                <RingGauge percent={recurring.recurringPercent} color="#0ea5e9" label="Fixed" />
                                <RingGauge percent={100 - recurring.recurringPercent} color="#10b981" label="Variable" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#64748b', fontWeight: 600 }}>Fixed (Recurring)</span>
                                    <span style={{ color: '#0ea5e9', fontWeight: 800 }}>₹{recurring.totalRecurring.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                                    <span style={{ color: '#64748b', fontWeight: 600 }}>Variable</span>
                                    <span style={{ color: '#10b981', fontWeight: 800 }}>₹{recurring.totalDiscretionary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', color: '#475569', fontSize: '0.8rem', padding: '20px 0' }}>No recurring expenses this month</div>
                    )}
                </GlassPane>

                {/* Finance Tips */}
                <GlassPane delay={0.25} accentColor="#fbbf24">
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Wealth Principles</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0', marginBottom: 14 }}>💡 Smart Rules</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {TIPS.map(({ icon, rule, desc, color }) => (
                            <motion.div
                                key={rule}
                                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '8px 10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)',
                                    cursor: 'default',
                                }}
                            >
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                                    background: `${color}15`,
                                    border: `1px solid ${color}25`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.9rem',
                                }}>{icon}</div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#e2e8f0' }}>{rule}</div>
                                    <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: 1 }}>{desc}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </GlassPane>
            </div>

            {/* ── Spending Heatmap ─────────────────────────────────────────────── */}
            <GlassPane delay={0.3} accentColor="#10b981">
                <div style={{ marginBottom: 18 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Past 52 Weeks</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#e2e8f0' }}>📅 Spending Activity Heatmap</div>
                </div>
                {dataLoading ? (
                    <div style={{ color: '#475569', fontSize: '0.8rem', padding: '16px 0' }}>Loading heatmap data...</div>
                ) : (
                    <SpendingHeatmap dailyData={heatmapData} />
                )}
            </GlassPane>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
            `}</style>
        </div>
    );
}
