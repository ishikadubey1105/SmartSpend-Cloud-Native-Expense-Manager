import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function WrappedModal({ onClose }) {
    const [step, setStep] = useState(0);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await analyticsAPI.getSummary(); // Borrow the dashboard stats for the wrapped
                setData(res.data);
            } catch {
                toast.error("Failed to generate your Wrapped experience.");
                onClose();
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [onClose]);

    // Space/Tap advances story, Esc closes
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === ' ' || e.key === 'ArrowRight') setStep(s => Math.min(s + 1, 4));
            if (e.key === 'ArrowLeft') setStep(s => Math.max(s - 1, 0));
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Auto advance every 6 seconds
    useEffect(() => {
        if (loading || !data) return;
        if (step > 4) {
            onClose();
            return;
        }
        const timer = setTimeout(() => {
            setStep(s => s + 1);
        }, 6000);
        return () => clearTimeout(timer);
    }, [step, loading, data, onClose]);

    if (loading) return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="w-16 h-16 rounded-full border-4 border-[#ff007f]/20 border-t-[#ff007f] animate-spin" />
        </div>
    );

    const slides = [
        {
            bg: 'linear-gradient(135deg, #1e1b4b, #312e81, #0f172a)',
            content: (
                <div className="text-center px-4">
                    <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", bounce: 0.6, duration: 1 }}>
                        <h2 className="text-3xl font-black text-white/50 mb-2 uppercase tracking-[0.3em]">Are you ready?</h2>
                    </motion.div>
                    <motion.h1 initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 filter drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]">
                        Your<br />SmartSpend<br />Wrapped
                    </motion.h1>
                </div>
            )
        },
        {
            bg: 'linear-gradient(135deg, #022c22, #064e3b, #020617)',
            content: (
                <div className="text-center px-4 w-full">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl font-black text-emerald-400/80 mb-6 uppercase tracking-[0.2em]">This Month, You Dropped</motion.h2>
                    <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.5, duration: 1 }} className="text-7xl md:text-9xl font-black text-emerald-400 filter drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]">
                        ₹{(data?.totalThisMonth || 0).toLocaleString()}
                    </motion.div>
                    <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }} className="text-xl text-emerald-200/50 mt-8 font-bold">Across {data?.monthlyCount || 0} transactions</motion.p>
                </div>
            )
        },
        {
            bg: 'linear-gradient(135deg, #450a0a, #7f1d1d, #020617)',
            content: (
                <div className="text-center px-4 w-full">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-black text-rose-400/80 mb-8 uppercase tracking-[0.2em]">Your undeniable obsession was</motion.h2>
                    <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', bounce: 0.4 }} className="text-6xl md:text-8xl font-black text-rose-400 filter drop-shadow-[0_0_40px_rgba(225,29,72,0.6)]">
                        {data?.categoryBreakdown?.[0]?.category || "Unknown"}
                    </motion.div>
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, type: 'spring' }} className="inline-block mt-8 bg-rose-500/20 border border-rose-500/50 rounded-full px-6 py-3">
                        <span className="text-3xl font-black text-rose-200">₹{(data?.categoryBreakdown?.[0]?.total || 0).toLocaleString()}</span>
                    </motion.div>
                </div>
            )
        },
        {
            bg: 'linear-gradient(135deg, #172554, #1e3a8a, #020617)',
            content: (
                <div className="text-center px-4 w-full flex flex-col items-center">
                    <motion.h2 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-black text-blue-400/80 mb-8 uppercase tracking-[0.2em]">Your Current Trajectory</motion.h2>

                    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', duration: 1 }} className="relative w-64 h-64 flex flex-col items-center justify-center rounded-full border-[8px] border-blue-500/30">
                        <div className="text-5xl font-black text-blue-400">₹{(data?.predictedMonthEnd || 0).toLocaleString()}</div>
                        <div className="text-sm font-bold text-blue-200/60 uppercase tracking-widest mt-2">Predicted Run Rate</div>
                    </motion.div>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="mt-8 text-xl font-medium text-blue-200">
                        {data?.predictedMonthEnd > (data?.monthlyBudget || Infinity) ? "⚠️ You're pacing over your budget." : "✨ You're pacing beautifully on target."}
                    </motion.p>
                </div>
            )
        },
        {
            bg: 'linear-gradient(135deg, #020617, #0f172a, #020617)',
            content: (
                <div className="text-center px-4 w-full">
                    <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', bounce: 0.6 }} className="text-[100px] mb-6">🏆</motion.div>
                    <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="text-5xl md:text-7xl font-black text-white filter drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                        Keep Grinding.
                    </motion.h1>
                    <motion.button
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onClose}
                        className="mt-12 bg-white text-black font-black uppercase tracking-widest px-8 py-4 rounded-2xl hover:bg-gray-200 transition-colors"
                    >
                        Share & Exit
                    </motion.button>
                </div>
            )
        }
    ];

    if (step > 4) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setStep(s => s + 1)}
                className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer selection:bg-transparent"
                style={{ background: slides[step].bg }}
            >
                {/* Progress bars at top */}
                <div className="absolute top-6 left-6 right-6 flex gap-2 z-10">
                    {slides.map((_, i) => (
                        <div key={i} className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-md">
                            <motion.div
                                className="h-full bg-white rounded-full"
                                initial={{ width: i < step ? '100%' : '0%' }}
                                animate={{ width: i < step ? '100%' : (i === step ? '100%' : '0%') }}
                                transition={{ duration: i === step ? 6 : 0, ease: 'linear' }}
                            />
                        </div>
                    ))}
                </div>

                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-10 right-6 text-white/50 hover:text-white font-bold p-2 z-20">
                    ✕ CLOSE
                </button>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 50, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -50, scale: 1.05 }}
                        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-full flex items-center justify-center"
                    >
                        {slides[step].content}
                    </motion.div>
                </AnimatePresence>

            </motion.div>
        </AnimatePresence>
    );
}
