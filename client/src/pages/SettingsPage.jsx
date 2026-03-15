import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const { user, dbUser, refreshDbUser } = useAuth();
    const { t, i18n } = useTranslation();
    const [form, setForm] = useState({
        displayName: dbUser?.displayName || user?.displayName || '',
        monthlyBudget: dbUser?.monthlyBudget || '',
        currency: dbUser?.currency || 'INR',
        language: i18n.language || 'en',
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await userAPI.updateProfile({ displayName: form.displayName, monthlyBudget: +form.monthlyBudget || 0, currency: form.currency });
            await refreshDbUser();
            toast.success('Profile updated ✅');
        } catch {
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ maxWidth: 720 }}>
            <div className="mb-6">
                <h1 style={{ fontSize: '1.75rem' }}>{t('settings.title')}</h1>
                <p className="text-secondary text-sm mt-2">{t('settings.subtitle')}</p>
            </div>

            {/* Profile Card */}
            <div className="card mb-6 animate-in">
                <div className="flex items-center gap-4 mb-6">
                    <div className="user-avatar" style={{ width: 64, height: 64, fontSize: '1.5rem' }}>
                        {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : form.displayName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{form.displayName || 'Your Name'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{user?.email}</div>
                        <span className="badge badge-success" style={{ marginTop: 6 }}>
                            {user?.providerData?.[0]?.providerId === 'google.com' ? '🔗 Google Account' : '📧 Email Account'}
                        </span>
                    </div>
                </div>
                <div className="divider" />
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                    <div className="form-group">
                        <label className="form-label">{t('settings.displayName')}</label>
                        <input className="form-input" value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} placeholder="Your full name" />
                    </div>
                    <div className="grid-2" style={{ gap: 'var(--space-4)' }}>
                        <div className="form-group">
                            <label className="form-label">{t('settings.monthlyBudget')}</label>
                            <input type="number" className="form-input" value={form.monthlyBudget} onChange={(e) => setForm((f) => ({ ...f, monthlyBudget: e.target.value }))} placeholder="e.g. 20000" min="0" />
                            <p className="text-xs text-muted mt-1">{t('settings.budgetHint')}</p>
                        </div>
                        <div className="form-group">
                            <label className="form-label">{t('settings.currency')}</label>
                            <select className="form-select" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}>
                                <option value="INR">₹ INR — Indian Rupee</option>
                                <option value="USD">$ USD — US Dollar</option>
                                <option value="EUR">€ EUR — Euro</option>
                                <option value="GBP">£ GBP — British Pound</option>
                            </select>
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">{t('settings.language')}</label>
                        <select className="form-select" value={form.language} onChange={(e) => {
                            const lang = e.target.value;
                            setForm((f) => ({ ...f, language: lang }));
                            i18n.changeLanguage(lang);
                            localStorage.setItem('smartspend-lang', lang);
                        }}>
                            <option value="en">🇬🇧 English</option>
                            <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                        </select>
                        <p className="text-xs text-muted mt-1">{t('settings.langHint')}</p>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : null}
                            {t('common.save')}
                        </button>
                    </div>
                </form>
            </div>

            {/* App Info */}
            <div className="card animate-in stagger-1">
                <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-4)' }}>{t('settings.aboutTitle')}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {[
                        { label: 'Version', value: '1.0.0' },
                        { label: 'Stack', value: 'React + Vite + Node.js + MongoDB + Firebase' },
                        { label: 'Hosting', value: 'Cloud-native (Render + Vercel)' },
                        { label: 'PWA', value: 'Installable on mobile & desktop' },
                    ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between" style={{ padding: 'var(--space-3)', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
