import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommandPalette() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [loadingAI, setLoadingAI] = useState(false);

    // We can also have an event emitter or context to trigger add expense,
    // but for simplicity, we'll route to expenses and open it via a query param 
    // or just display a toast. Alternatively we can dispatch a custom event.

    const navigate = useNavigate();
    const inputRef = useRef(null);

    // Toggle with Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(o => !o);
                setQuery('');
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    if (!open) return null;

    const commands = [
        { name: 'Go to Dashboard', action: () => navigate('/dashboard'), icon: '⚡' },
        { name: 'View All Expenses', action: () => navigate('/expenses'), icon: '💳' },
        { name: 'Analyze Spending', action: () => navigate('/analytics'), icon: '📊' },
        { name: 'Manage Budgets', action: () => navigate('/budgets'), icon: '🎯' },
        { name: 'Ask AI Insights', action: () => navigate('/insights'), icon: '🤖' },
        { name: 'Profile Settings', action: () => navigate('/settings'), icon: '⚙️' },
        { name: 'Subscriptions', action: () => navigate('/subscriptions'), icon: '♾️' },
        { name: 'Export CSV Report', action: () => { window.location.href = '/api/export/csv'; }, icon: '📥' },
    ];

    const filtered = commands.filter(cmd => cmd.name.toLowerCase().includes(query.toLowerCase()));

    const handleSelect = (action) => {
        action();
        setOpen(false);
        setQuery('');
    };

    const handleAICommand = async () => {
        if (!query.trim()) return;
        setLoadingAI(true);
        toast.loading("Omni-Search processing...", { id: 'omni' });

        try {
            const res = await insightsAPI.command(query);
            const data = res.data;

            if (data.intent === 'NAVIGATE' && data.path) {
                toast.success(`Navigating to ${data.path}`, { id: 'omni' });
                navigate(data.path.toLowerCase());
                setOpen(false);
            } else if (data.intent === 'ADD_EXPENSE' && data.expense) {
                toast.success(`Omni-Search created expense drafting shortcut!`, { id: 'omni' });
                // We'll dispatch a global event to open the QuickAddModal with prefilled data
                window.dispatchEvent(new CustomEvent('open-quick-add', { detail: data.expense }));
                setOpen(false);
            } else {
                toast.error("Omni-Search could not interpret your command.", { id: 'omni' });
            }
        } catch (error) {
            toast.error("Omni-Search AI failed.", { id: 'omni' });
        } finally {
            setLoadingAI(false);
            setQuery('');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered.length > 0 && query.trim() !== '') {
                // Execute first match
                handleSelect(filtered[0].action);
            } else if (query.trim() !== '') {
                // Execute AI
                handleAICommand();
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] z-[9999]" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-xl bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl overflow-hidden shadow-[#3b82f6]/10"
            >
                <div className="flex items-center px-4 py-3 border-b border-slate-800">
                    <span className="text-xl text-slate-400 mr-3">
                        {loadingAI ? (
                            <div className="w-5 h-5 border-2 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
                        ) : '⌘'}
                    </span>
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search pages or ask Omni-Search to act (e.g. 'spent 500 on coffee')"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={loadingAI}
                        className="w-full bg-transparent text-slate-100 text-lg outline-none placeholder:text-slate-500 font-medium"
                    />
                    <div className="flex gap-1 ml-2">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-1 rounded border border-slate-700">ESC</span>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2" style={{ scrollbarWidth: 'none' }}>
                    {query.trim() !== '' && (
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#60a5fa] mb-1">
                            Omni-Search AI
                        </div>
                    )}
                    {query.trim() !== '' && (
                        <button
                            onClick={handleAICommand}
                            className="w-full flex items-center gap-4 px-4 py-3 bg-[#3b82f6]/10 rounded-xl text-left border border-[#3b82f6]/30 mb-2 transition-colors hover:bg-[#3b82f6]/20"
                        >
                            <span className="text-2xl animate-pulse">✨</span>
                            <div className="flex flex-col">
                                <span className="text-blue-300 font-bold">Ask Omni-Search AI</span>
                                <span className="text-blue-300/60 text-xs mt-0.5 max-w-[90%] truncate">"{query}" — press Enter to process with Gemini</span>
                            </div>
                            <span className="ml-auto text-[#60a5fa] font-mono text-xs font-bold border border-[#3b82f6]/30 px-2 rounded bg-blue-900/50">ENTER ↵</span>
                        </button>
                    )}

                    {filtered.length > 0 && (
                        <div className="px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-500 mt-2 mb-1">
                            System Commands
                        </div>
                    )}

                    {filtered.map((cmd, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleSelect(cmd.action)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors mb-1 ${idx === 0 && query.trim() !== '' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 text-slate-300'}`}
                        >
                            <span className="text-xl opacity-80">{cmd.icon}</span>
                            <span className="font-medium text-[15px]">{cmd.name}</span>
                        </button>
                    ))}

                    {filtered.length === 0 && query.trim() === '' && (
                        <div className="py-8 text-center flex flex-col items-center">
                            <span className="text-4xl mb-3 opacity-20">🧭</span>
                            <span className="text-slate-500 font-medium text-sm">Start typing to search or give an Omni-Command.</span>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
