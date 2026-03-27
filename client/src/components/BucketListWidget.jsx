import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { bucketAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function BucketListWidget() {
    const [items, setItems] = useState([]);
    const [wastedMoney, setWastedMoney] = useState(0);
    const [loading, setLoading] = useState(true);
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [listRes, readinessRes] = await Promise.all([
                bucketAPI.getAll(),
                bucketAPI.getReadiness(),
            ]);
            setItems(listRes.data);
            setWastedMoney(readinessRes.data.unnecessary_spent_90_days);
        } catch (error) {
            console.error("Failed to fetch bucket list", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newItemTitle || !newItemAmount || isNaN(newItemAmount)) return;
        try {
            await bucketAPI.create({ title: newItemTitle, targetAmount: Number(newItemAmount), category: 'Festival' });
            setNewItemTitle('');
            setNewItemAmount('');
            toast.success("Goal added!");
            loadData();
        } catch {
            toast.error("Failed to add goal");
        }
    };

    const handleDelete = async (id) => {
        try {
            await bucketAPI.delete(id);
            toast.success("Goal removed");
            loadData();
        } catch {
            toast.error("Failed to remove goal");
        }
    };

    const toggleFulfilled = async (id, isFulfilled) => {
        try {
            await bucketAPI.update(id, { isFulfilled: !isFulfilled });
            loadData();
        } catch {
            toast.error("Failed to update goal");
        }
    };

    if (loading) return <div className="p-6 text-center text-slate-400">Loading Goals...</div>;

    return (
        <div className="card w-full mb-8 relative z-10" style={{ border: '1px solid var(--border)', background: 'var(--glass-bg)' }}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h3 className="text-xl md:text-2xl font-black flex items-center gap-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        <span className="text-2xl">🎯</span> Festival & Bucket List Radar
                    </h3>
                    <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>
                        See how your "unnecessary spending" could buy things you actually want.
                    </p>
                </div>
                <div className="text-left md:text-right px-4 py-2 rounded-xl" style={{ background: 'var(--danger-subtle)' }}>
                    <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--danger)' }}>💰 Unnecessary Spend (90 Days)</div>
                    <div className="text-3xl font-black flex items-center md:justify-end gap-2" style={{ color: 'var(--danger)' }}>
                        ₹{Math.round(wastedMoney).toLocaleString('en-IN')}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* List & Progress */}
                <div className="flex flex-col gap-4">
                    {items.length === 0 ? (
                        <div className="empty-state p-8 rounded-2xl" style={{ border: '1px dashed var(--border)' }}>
                            <div className="empty-state-icon text-4xl mb-4 opacity-100">🏖️</div>
                            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>No Goals Configured</h3>
                            <p style={{ color: 'var(--text-muted)' }}>Add your upcoming Diwali or wishlist budget to see how closely your past spending habits could cover it!</p>
                        </div>
                    ) : (
                        items.map((item, index) => {
                            const progress = Math.min((wastedMoney / item.targetAmount) * 100, 100);
                            const couldBuy = wastedMoney >= item.targetAmount;
                            
                            return (
                                <motion.div key={item._id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
                                    className="p-5 rounded-2xl relative overflow-hidden group hover:shadow-lg transition-all" 
                                    style={{ background: 'var(--bg-surface)', border: `1px solid ${couldBuy ? 'var(--success)' : 'var(--border)'}` }}>
                                    
                                    <div className="flex justify-between items-center relative z-10 mb-3">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => toggleFulfilled(item._id, item.isFulfilled)} 
                                                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors"
                                                style={{ background: item.isFulfilled ? 'var(--success)' : 'var(--bg-hover)', border: '1px solid var(--border)' }}>
                                                {item.isFulfilled && '✓'}
                                            </button>
                                            <div className="flex flex-col">
                                                <div className="font-bold text-base" style={{ color: 'var(--text-primary)', textDecoration: item.isFulfilled ? 'line-through' : 'none' }}>
                                                    {item.title}
                                                </div>
                                                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                                                    Target: ₹{item.targetAmount.toLocaleString('en-IN')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-[10px] uppercase font-bold tracking-widest" style={{ color: couldBuy ? 'var(--success)' : 'var(--primary)' }}>Readiness</div>
                                                <div className="text-2xl font-black" style={{ color: couldBuy ? 'var(--success)' : 'var(--text-primary)' }}>
                                                    {progress.toFixed(0)}%
                                                </div>
                                            </div>
                                            <button onClick={() => handleDelete(item._id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                                                ✕
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar under the item */}
                                    <div className="h-2 w-full rounded-full overflow-hidden relative" style={{ background: 'var(--bg-elevated)' }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
                                            className="h-full rounded-full" style={{ background: couldBuy ? 'var(--success)' : 'var(--grad-primary)' }}
                                        />
                                    </div>
                                </motion.div>
                            )
                        })
                    )}
                </div>

                {/* Add new Item Form */}
                <div className="flex flex-col h-full justify-between">
                    <form onSubmit={handleAdd} className="flex flex-col gap-5 p-6 rounded-2xl shadow-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                        <h4 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <span style={{ color: 'var(--primary)' }}>+</span> Track New Goal
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="form-group flex flex-col gap-1">
                                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Goal Intent</label>
                                <input type="text" className="form-input" 
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    value={newItemTitle} onChange={e => setNewItemTitle(e.target.value)}
                                    placeholder="e.g. Diwali Gadgets" required />
                            </div>
                            
                            <div className="form-group flex flex-col gap-1">
                                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Target Cost (₹)</label>
                                <input type="number" className="form-input" 
                                    style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                    value={newItemAmount} onChange={e => setNewItemAmount(e.target.value)}
                                    placeholder="20000" required min="1" />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary mt-2 flex justify-center py-3 rounded-xl font-bold tracking-widest text-sm uppercase">
                            Initialize Tracker
                        </button>
                    </form>

                    <div className="mt-6 p-5 rounded-2xl flex items-start gap-4" style={{ background: 'var(--primary-subtle)', border: '1px solid var(--primary-glow)' }}>
                        <div className="text-3xl drop-shadow-md">💡</div>
                        <p className="text-sm font-medium leading-relaxed" style={{ color: 'var(--primary-light)' }}>
                            Watch the percentage grow! This widget aggregates exactly how much you blew on <strong className='text-white'>Shopping</strong>, <strong className='text-white'>Entertainment</strong>, and <strong className='text-white'>Other</strong> expenses in the last 90 days. It instantly proves how easily you could afford your dream purchases if you tighten the belt!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
