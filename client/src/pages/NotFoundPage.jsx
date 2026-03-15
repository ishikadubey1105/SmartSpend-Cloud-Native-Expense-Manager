import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFoundPage() {
    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            textAlign: 'center',
        }}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', bounce: 0.35 }}
            >
                <div style={{
                    fontSize: '7rem',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 900,
                    background: 'var(--grad-primary)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    lineHeight: 1,
                    marginBottom: 'var(--space-4)',
                }}>
                    404
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                    Page not found
                </h2>
                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.9375rem',
                    maxWidth: 400,
                    margin: '0 auto',
                    lineHeight: 1.7,
                    marginBottom: 'var(--space-6)',
                }}>
                    The page you're looking for doesn't exist or has been moved.
                </p>
                <Link to="/dashboard" className="btn btn-primary" style={{ padding: '12px 28px' }}>
                    Back to Dashboard
                </Link>
            </motion.div>
        </div>
    );
}
