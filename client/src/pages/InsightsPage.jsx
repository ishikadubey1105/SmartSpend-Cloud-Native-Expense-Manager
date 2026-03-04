import { useState, useEffect } from 'react';
import { insightsAPI, analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

// Simple markdown renderer (no library needed)
function MarkdownContent({ text }) {
    const html = text
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^- (.*$)/gm, '<li>$1</li>');
    return (
        <div
            style={{ lineHeight: 1.8, color: 'var(--text-secondary)' }}
            dangerouslySetInnerHTML={{
                __html: `<p>${html}</p>`.replace(/<\/p><p><h/g, '<h').replace(/<\/h([1-3])><\/p>/g, '</h$1>'),
            }}
        />
    );
}

function SkeletonBlock({ width = '100%', height = 20 }) {
    return <div className="skeleton" style={{ width, height, borderRadius: 6 }} />;
}

export default function InsightsPage() {
    const [insights, setInsights] = useState('');
    const [anomalies, setAnomalies] = useState([]);
    const [recurring, setRecurring] = useState(null);
    const [loading, setLoading] = useState(false);
    const [recurringLoading, setRecurringLoading] = useState(true);
    const [autoTitle, setAutoTitle] = useState('');
    const [autoCat, setAutoCat] = useState('');
    const [autocatLoading, setAutoCatLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setRecurringLoading(true);
            try {
                const [r] = await Promise.all([
                    analyticsAPI.getRecurring(),
                ]);
                setRecurring(r.data);
            } catch {
                // silent
            } finally {
                setRecurringLoading(false);
            }
        };
        load();
    }, []);

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

    const handleCategorize = async () => {
        if (!autoTitle.trim()) return toast.error('Enter an expense title first');
        setAutoCatLoading(true);
        setAutoCat('');
        try {
            const result = await insightsAPI.categorize(autoTitle.trim());
            setAutoCat(result.data.category);
            toast.success(`AI suggests: ${result.data.category}`);
        } catch {
            toast.error('Auto-categorize failed');
        } finally {
            setAutoCatLoading(false);
        }
    };

    const CATEGORY_EMOJI = { Food: '🍔', Transport: '🚗', Shopping: '🛍️', Bills: '⚡', Health: '💊', Education: '📚', Entertainment: '🎮', Other: '📌' };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 style={{ fontSize: '1.75rem' }}>🤖 AI Insights</h1>
                <p className="text-secondary text-sm mt-2">Powered by Google Gemini 2.0 Flash — your personal finance AI</p>
            </div>

            {/* Main Grid */}
            <div className="grid-2 mb-6" style={{ alignItems: 'start' }}>
                {/* AI Insights Panel */}
                <div className="card animate-in" style={{ minHeight: 400 }}>
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 style={{ fontSize: '1rem' }}>Personalized Financial Insights</h3>
                            <p className="text-xs text-muted mt-1">AI analyzes your actual spending + budget data</p>
                        </div>
                        <div style={{
                            padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                            background: 'linear-gradient(135deg, #7c3aed22, #06b6d422)',
                            border: '1px solid rgba(124,58,237,0.3)',
                            color: 'var(--primary-light)',
                        }}>Gemini AI</div>
                    </div>

                    {!insights && !loading && (
                        <div style={{ textAlign: 'center', padding: 'var(--space-10) 0' }}>
                            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>🧠</div>
                            <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>Get Your AI Report</h3>
                            <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-6)', maxWidth: 300, margin: '0 auto var(--space-6)' }}>
                                Click below to generate a personalized analysis of your spending patterns, budget health, and savings opportunities.
                            </p>
                            <button onClick={generateInsights} className="btn btn-primary" style={{ gap: 8 }}>
                                ✨ Generate AI Insights
                            </button>
                            <p className="text-xs text-muted" style={{ marginTop: 'var(--space-3)' }}>Requires VITE_GEMINI_API_KEY to be configured</p>
                        </div>
                    )}

                    {loading && (
                        <div style={{ padding: 'var(--space-8) 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                                <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} />
                                <span className="text-secondary text-sm">Gemini AI is analyzing your finances...</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <SkeletonBlock height={16} width="80%" />
                                <SkeletonBlock height={14} width="60%" />
                                <SkeletonBlock height={14} width="70%" />
                                <SkeletonBlock height={16} width="50%" />
                                <SkeletonBlock height={14} width="65%" />
                                <SkeletonBlock height={14} width="75%" />
                            </div>
                        </div>
                    )}

                    {insights && !loading && (
                        <>
                            <div style={{
                                background: 'rgba(124,58,237,0.06)',
                                border: '1px solid rgba(124,58,237,0.2)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-5)',
                                marginBottom: 'var(--space-5)',
                            }}>
                                <MarkdownContent text={insights} />
                            </div>
                            <button onClick={generateInsights} className="btn btn-ghost btn-sm">
                                🔄 Refresh Analysis
                            </button>
                        </>
                    )}
                </div>

                {/* Sidebar: Auto-categorize + Tips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                    {/* AI Auto-Categorize */}
                    <div className="card animate-in stagger-1">
                        <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-4)' }}>🏷️ AI Auto-Categorize</h3>
                        <p className="text-xs text-muted mb-3">Type an expense title and let AI suggest the right category</p>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                            <input
                                className="form-input"
                                style={{ flexGrow: 1 }}
                                value={autoTitle}
                                onChange={(e) => setAutoTitle(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCategorize()}
                                placeholder="e.g. Uber ride, Netflix, Gym"
                                maxLength={100}
                            />
                            <button onClick={handleCategorize} disabled={autocatLoading} className="btn btn-primary btn-sm">
                                {autocatLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '✨'}
                            </button>
                        </div>
                        {autoCat && (
                            <div className="alert alert-info" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <span style={{ fontSize: '1.4rem' }}>{CATEGORY_EMOJI[autoCat] || '📌'}</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{autoCat}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>AI suggested category</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recurring vs Discretionary */}
                    <div className="card animate-in stagger-2">
                        <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-4)' }}>🔄 Fixed vs Variable Spending</h3>
                        {recurringLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                <SkeletonBlock height={60} />
                                <SkeletonBlock height={40} width="70%" />
                            </div>
                        ) : recurring ? (
                            <>
                                <div className="flex gap-3 mb-4">
                                    <div className="stat-card" style={{ padding: 'var(--space-4)', flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                                            ₹{recurring.totalRecurring.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Recurring (Fixed)</div>
                                    </div>
                                    <div className="stat-card" style={{ padding: 'var(--space-4)', flex: 1, textAlign: 'center' }}>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--success)' }}>
                                            ₹{recurring.totalDiscretionary.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>Discretionary</div>
                                    </div>
                                </div>
                                <div className="progress-bar mb-2">
                                    <div className="progress-fill" style={{ width: `${recurring.recurringPercent}%` }} />
                                </div>
                                <p className="text-xs text-muted">
                                    {recurring.recurringPercent}% of your spending is fixed/recurring this month
                                </p>
                                {recurring.recurring.length > 0 && (
                                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                        {recurring.recurring.slice(0, 4).map((r, i) => (
                                            <div key={i} className="flex justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <span>{CATEGORY_EMOJI[r._id] || '📌'} {r._id}</span>
                                                <span style={{ fontWeight: 600 }}>₹{r.total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="empty-state" style={{ padding: 'var(--space-6)' }}>
                                <div className="empty-state-icon" style={{ fontSize: '1.5rem' }}>🔄</div>
                                <p className="text-sm">No recurring expenses this month</p>
                            </div>
                        )}
                    </div>

                    {/* Finance Tips */}
                    <div className="card animate-in stagger-3">
                        <h3 style={{ fontSize: '0.95rem', marginBottom: 'var(--space-4)' }}>💡 Smart Finance Rules</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {[
                                { rule: '50/30/20', desc: '50% needs, 30% wants, 20% savings' },
                                { rule: 'Track Daily', desc: 'Log expenses the same day for accuracy' },
                                { rule: 'Budget Buffer', desc: 'Set limits at 80% of actual budget' },
                                { rule: 'Recurring First', desc: 'Plan discretionary spend after fixed costs' },
                            ].map(({ rule, desc }) => (
                                <div key={rule} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', background: 'rgba(124,58,237,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--primary-light)', flexShrink: 0 }}>
                                        {rule}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
