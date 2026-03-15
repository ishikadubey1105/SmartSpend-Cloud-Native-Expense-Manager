import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[SmartSpend] Uncaught error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--bg-primary, #06061a)',
                    color: 'var(--text-primary, #e2e8f0)',
                    fontFamily: 'Inter, system-ui, sans-serif',
                    padding: '2rem',
                }}>
                    <div style={{ textAlign: 'center', maxWidth: 480 }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.5 }}>⚠️</div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1.5rem' }}>
                            SmartSpend encountered an unexpected error. This has been logged and we'll look into it.
                        </p>
                        <pre style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '8px',
                            padding: '1rem',
                            fontSize: '0.75rem',
                            textAlign: 'left',
                            overflow: 'auto',
                            maxHeight: 150,
                            color: '#ef4444',
                            marginBottom: '1.5rem',
                        }}>
                            {this.state.error?.message || 'Unknown error'}
                        </pre>
                        <button
                            onClick={() => window.location.reload()}
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                                color: '#fff',
                                border: 'none',
                                padding: '12px 32px',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '0.9375rem',
                                cursor: 'pointer',
                            }}
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
