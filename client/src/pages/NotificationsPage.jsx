import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { expenseAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const SEVERITY_STYLES = {
    high: { bg: 'var(--danger-subtle)', color: 'var(--danger)', border: 'rgba(239,68,68,0.25)', icon: '🔴' },
    medium: { bg: 'var(--warning-subtle)', color: 'var(--warning)', border: 'rgba(245,158,11,0.25)', icon: '🟡' },
    low: { bg: 'var(--success-subtle)', color: 'var(--success)', border: 'rgba(16,185,129,0.25)', icon: '🟢' },
};

function AnomalyCard({ anomaly, index }) {
    const severity = anomaly.severity || 'medium';
    const style = SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium;
    const { t } = useTranslation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', bounce: 0.3 }}
            className="card"
            style={{
                borderLeft: `4px solid ${style.color}`,
                marginBottom: 'var(--space-4)',
                cursor: 'default',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontSize: '1.25rem' }}>{style.icon}</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>{anomaly.title || anomaly.message}</div>
                        {anomaly.category && (
                            <span className="badge badge-primary" style={{ marginTop: 4 }}>{anomaly.category}</span>
                        )}
                    </div>
                </div>
                <span
                    className="badge"
                    style={{
                        background: style.bg,
                        color: style.color,
                        border: `1px solid ${style.border}`,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}
                >
                    {t(`notifications.severity.${severity}`)}
                </span>
            </div>

            {anomaly.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 'var(--space-3)' }}>
                    {anomaly.description}
                </p>
            )}

            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {anomaly.amount && (
                    <span>Amount: <strong style={{ color: style.color }}>₹{anomaly.amount.toLocaleString('en-IN')}</strong></span>
                )}
                {anomaly.expectedAmount && (
                    <span>Expected: <strong>₹{anomaly.expectedAmount.toLocaleString('en-IN')}</strong></span>
                )}
                {anomaly.date && (
                    <span>{new Date(anomaly.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                )}
            </div>
        </motion.div>
    );
}

export default function NotificationsPage() {
    const { t } = useTranslation();
    const [anomalies, setAnomalies] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await expenseAPI.getAnomalies();
            setAnomalies(res.data || res || []);
        } catch (err) {
            toast.error('Could not load anomaly data');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div className="spinner" style={{ width: 40, height: 40, borderWidth: 4 }} />
            </div>
        );
    }

    return (
        <div style={{ maxWidth: 800 }}>
            <div className="animate-in" style={{ marginBottom: 'var(--space-8)' }}>
                <h1 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.2rem', boxShadow: '0 4px 20px rgba(239,68,68,0.25)',
                    }}>🔔</span>
                    {t('notifications.title')}
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>
                    {t('notifications.subtitle')}
                </p>
            </div>

            {anomalies.length > 0 ? (
                <div>
                    {anomalies.map((a, i) => (
                        <AnomalyCard key={a._id || i} anomaly={a} index={i} />
                    ))}
                </div>
            ) : (
                <div className="card animate-in stagger-1" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                    <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)', opacity: 0.6 }}>✅</div>
                    <h3 style={{ fontSize: '1.25rem', color: 'var(--success)', marginBottom: 'var(--space-2)' }}>
                        {t('notifications.noAlerts')}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        {t('notifications.noAlertsDesc')}
                    </p>
                </div>
            )}
        </div>
    );
}
