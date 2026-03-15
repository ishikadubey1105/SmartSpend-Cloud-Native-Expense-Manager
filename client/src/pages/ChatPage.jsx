import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { insightsAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

/* ── Streaming Text Renderer ─────────────────────────────────────────────────── */
function StreamingText({ text, speed = 6 }) {
    const [displayed, setDisplayed] = useState('');
    const idx = useRef(0);

    useEffect(() => {
        idx.current = 0;
        setDisplayed('');
        const interval = setInterval(() => {
            idx.current += 1;
            setDisplayed(text.slice(0, idx.current));
            if (idx.current >= text.length) clearInterval(interval);
        }, speed);
        return () => clearInterval(interval);
    }, [text, speed]);

    return <span style={{ whiteSpace: 'pre-wrap' }}>{displayed}<span className="blinking-cursor">|</span></span>;
}

/* ── Chat Bubble ──────────────────────────────────────────────────────────────── */
function ChatBubble({ message, isUser, isLatest }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', bounce: 0.35, duration: 0.5 }}
            style={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginBottom: 'var(--space-4)',
            }}
        >
            {!isUser && (
                <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: 'var(--grad-primary)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    flexShrink: 0, marginRight: 'var(--space-3)', marginTop: 4,
                    boxShadow: '0 4px 16px var(--primary-glow)',
                }}>
                    🤖
                </div>
            )}
            <div style={{
                maxWidth: '75%',
                padding: 'var(--space-4) var(--space-5)',
                borderRadius: isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                background: isUser
                    ? 'linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%)'
                    : 'var(--glass-bg)',
                border: isUser ? 'none' : '1px solid var(--glass-border)',
                backdropFilter: isUser ? 'none' : 'var(--glass-blur)',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                lineHeight: 1.7,
                boxShadow: isUser ? '0 4px 20px var(--primary-glow)' : 'var(--shadow-sm)',
            }}>
                {!isUser && isLatest ? <StreamingText text={message} /> : (
                    <span style={{ whiteSpace: 'pre-wrap' }}>{message}</span>
                )}
            </div>
            {isUser && (
                <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.08)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
                    flexShrink: 0, marginLeft: 'var(--space-3)', marginTop: 4,
                    border: '1px solid var(--glass-border)',
                }}>
                    👤
                </div>
            )}
        </motion.div>
    );
}

/* ── Suggestion Chip ─────────────────────────────────────────────────────────── */
function SuggestionChip({ text, onClick }) {
    return (
        <motion.button
            whileHover={{ scale: 1.04, y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onClick(text)}
            style={{
                background: 'var(--primary-subtle)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '8px 18px',
                color: 'var(--primary-light)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transition: 'all 200ms',
            }}
        >
            {text}
        </motion.button>
    );
}

/* ── Main Chat Page ──────────────────────────────────────────────────────────── */
export default function ChatPage() {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([
        { role: 'ai', text: t('chat.welcome') }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const sendMessage = async (text) => {
        const query = text || input.trim();
        if (!query || loading) return;

        setMessages(prev => [...prev, { role: 'user', text: query }]);
        setInput('');
        setLoading(true);

        try {
            const res = await insightsAPI.chat(query);
            const reply = res?.reply || res?.data?.reply || res?.data?.response || 'I analyzed your data but couldn\'t generate a response. Please try again.';
            setMessages(prev => [...prev, { role: 'ai', text: reply }]);
        } catch (err) {
            const errMsg = err.message || 'Unable to get a response. Please check your backend connection.';
            toast.error(errMsg);
            setMessages(prev => [...prev, { role: 'ai', text: `⚠️ ${errMsg}` }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const suggestions = [
        t('chat.suggestions.spending'),
        t('chat.suggestions.budget'),
        t('chat.suggestions.savings'),
        t('chat.suggestions.compare'),
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - var(--topbar-height) - 48px)', maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div className="animate-in" style={{ marginBottom: 'var(--space-6)' }}>
                <h1 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: 'var(--grad-primary)', display: 'inline-flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
                        boxShadow: '0 4px 20px var(--primary-glow)',
                    }}>💬</span>
                    {t('chat.title')}
                </h1>
                <p className="text-secondary" style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>
                    {t('chat.subtitle')}
                </p>
            </div>

            {/* Messages Area */}
            <div className="card animate-in stagger-1" style={{
                flex: 1, overflowY: 'auto', padding: 'var(--space-6)',
                display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-4)',
                background: 'rgba(255,255,255,0.015)',
            }}>
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <ChatBubble
                            key={i}
                            message={msg.text}
                            isUser={msg.role === 'user'}
                            isLatest={msg.role === 'ai' && i === messages.length - 1}
                        />
                    ))}
                </AnimatePresence>

                {loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            color: 'var(--text-muted)', fontSize: '0.875rem', padding: 'var(--space-3)',
                        }}
                    >
                        <div style={{
                            width: 36, height: 36, borderRadius: 'var(--radius-md)',
                            background: 'var(--grad-primary)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                            boxShadow: '0 4px 16px var(--primary-glow)',
                        }}>🤖</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                            <span>{t('chat.thinking')}</span>
                        </div>
                    </motion.div>
                )}

                {/* Suggestions — show only when no user messages yet */}
                {messages.length <= 1 && !loading && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        style={{
                            display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)',
                            marginTop: 'auto', paddingTop: 'var(--space-6)',
                            justifyContent: 'center',
                        }}
                    >
                        {suggestions.map((s, i) => (
                            <SuggestionChip key={i} text={s} onClick={sendMessage} />
                        ))}
                    </motion.div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input Bar */}
            <div className="card animate-in stagger-2" style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
            }}>
                <input
                    ref={inputRef}
                    className="form-input"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('chat.placeholder')}
                    disabled={loading}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}
                    autoFocus
                />
                <button
                    className="btn btn-primary"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    style={{ flexShrink: 0, padding: '10px 24px' }}
                >
                    {loading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '➤'}
                    {t('chat.send')}
                </button>
            </div>

            {/* Blinking cursor animation */}
            <style>{`
                .blinking-cursor {
                    animation: blink 1s step-end infinite;
                    color: var(--primary-light);
                    font-weight: 100;
                }
                @keyframes blink { 50% { opacity: 0; } }
            `}</style>
        </div>
    );
}
