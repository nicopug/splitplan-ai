import React, { useState, useEffect, useRef } from 'react';
import { adminVerifyToken, adminGetStats, adminGetLeads, adminApproveB2B } from '../api';

// ─── minimal terminal palette (self-contained, no Tailwind theme vars) ────────
const c = {
    bg: '#0a0a0a',
    surface: '#111111',
    border: '#1f1f1f',
    borderHover: '#2a2a2a',
    text: '#e4e4e4',
    muted: '#555555',
    accent: '#22c55e',   // green-500
    accentDim: '#16a34a',
    danger: '#ef4444',
    warning: '#f59e0b',
    blue: '#3b82f6',
};

const input = {
    background: c.surface,
    border: `1px solid ${c.border}`,
    borderRadius: 4,
    color: c.text,
    padding: '8px 12px',
    fontSize: 13,
    fontFamily: 'monospace',
    width: '100%',
    outline: 'none',
    boxSizing: 'border-box',
};

const btn = (variant = 'primary', disabled = false) => ({
    padding: '8px 20px',
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    border: 'none',
    borderRadius: 4,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    background: variant === 'primary' ? c.accent
        : variant === 'danger' ? c.danger
        : c.border,
    color: variant === 'muted' ? c.muted : '#000',
    transition: 'opacity 0.15s',
});

// ─── Lock Screen ──────────────────────────────────────────────────────────────
function LockScreen({ onUnlock }) {
    const [token, setToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!token.trim()) return;
        setLoading(true);
        setError('');
        try {
            await adminVerifyToken(token.trim());
            sessionStorage.setItem('_sa_token', token.trim());
            onUnlock(token.trim());
        } catch {
            setError('ACCESSO NEGATO — Token non valido.');
            setToken('');
            inputRef.current?.focus();
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div style={{ width: '100%', maxWidth: 380 }}>
                <div style={{ marginBottom: 32, textAlign: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.3em', color: c.muted, marginBottom: 8 }}>
                        SPLITPLAN · RESTRICTED ACCESS
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, color: c.accent }}>
                        ⬡ SYSTEM OVERRIDE
                    </div>
                </div>

                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, padding: 28 }}>
                    <form onSubmit={handleSubmit}>
                        <label style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: c.muted, display: 'block', marginBottom: 8 }}>
                            ADMIN TOKEN
                        </label>
                        <input
                            ref={inputRef}
                            type="password"
                            value={token}
                            onChange={e => setToken(e.target.value)}
                            placeholder="••••••••••••••••"
                            style={input}
                            autoComplete="off"
                        />
                        {error && (
                            <div style={{ marginTop: 10, fontFamily: 'monospace', fontSize: 11, color: c.danger }}>
                                ✗ {error}
                            </div>
                        )}
                        <button
                            type="submit"
                            disabled={loading || !token.trim()}
                            style={{ ...btn('primary', loading || !token.trim()), width: '100%', marginTop: 16 }}
                        >
                            {loading ? 'VERIFICA...' : 'ACCEDI'}
                        </button>
                    </form>
                </div>

                <div style={{ marginTop: 20, textAlign: 'center', fontFamily: 'monospace', fontSize: 10, color: c.muted }}>
                    Questo URL non è indicizzato né linkato.
                </div>
            </div>
        </div>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, padding: '20px 24px', flex: 1 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.2em', color: c.muted, marginBottom: 8 }}>{label}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 32, fontWeight: 900, color: color || c.text }}>{value ?? '—'}</div>
        </div>
    );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
function AdminDashboard({ adminToken, onLogout }) {
    const [stats, setStats] = useState(null);
    const [leads, setLeads] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    // approve-b2b form
    const [form, setForm] = useState({ account_email: '', company_name: '', max_budget: '' });
    const [formLoading, setFormLoading] = useState(false);
    const [formMsg, setFormMsg] = useState(null); // { type: 'ok'|'err', text }

    const fetchAll = async () => {
        setLoadingData(true);
        try {
            const [s, l] = await Promise.all([
                adminGetStats(adminToken),
                adminGetLeads(adminToken),
            ]);
            setStats(s);
            setLeads(l);
        } catch (err) {
            // Token scaduto / revocato → torna alla lock screen
            if (err.message?.includes('403') || err.message?.includes('401')) {
                sessionStorage.removeItem('_sa_token');
                onLogout();
            }
        } finally {
            setLoadingData(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleApprove = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        setFormMsg(null);
        try {
            const body = {
                account_email: form.account_email.trim(),
                company_name: form.company_name.trim(),
                max_budget: form.max_budget ? parseFloat(form.max_budget) : null,
            };
            const res = await adminApproveB2B(adminToken, body);
            setFormMsg({ type: 'ok', text: `✓ Azienda "${res.company_name}" creata (id=${res.company_id}). Manager: ${res.manager_email}` });
            setForm({ account_email: '', company_name: '', max_budget: '' });
            fetchAll();
        } catch (err) {
            setFormMsg({ type: 'err', text: `✗ ${err.message}` });
        } finally {
            setFormLoading(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ minHeight: '100vh', background: c.bg, color: c.text, fontFamily: 'monospace', padding: '32px 24px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                    <div>
                        <div style={{ fontSize: 10, letterSpacing: '0.3em', color: c.muted, marginBottom: 4 }}>SPLITPLAN · SUPER ADMIN</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: c.accent }}>⬡ SYSTEM OVERRIDE</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button onClick={fetchAll} style={btn('muted')} title="Aggiorna">↺ REFRESH</button>
                        <button onClick={() => { sessionStorage.removeItem('_sa_token'); onLogout(); }} style={btn('danger')}>LOGOUT</button>
                    </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
                    <StatCard label="UTENTI TOTALI" value={loadingData ? '...' : stats?.total_users} color={c.blue} />
                    <StatCard label="AZIENDE B2B" value={loadingData ? '...' : stats?.total_companies} color={c.accent} />
                    <StatCard label="DEMO LEADS" value={loadingData ? '...' : stats?.pending_leads} color={c.warning} />
                </div>

                {/* Approve B2B form */}
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, padding: 24, marginBottom: 32 }}>
                    <div style={{ fontSize: 10, letterSpacing: '0.2em', color: c.muted, marginBottom: 16 }}>APPROVA AZIENDA B2B</div>
                    <form onSubmit={handleApprove}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 160px', gap: 12, marginBottom: 12 }}>
                            <div>
                                <label style={{ fontSize: 10, color: c.muted, display: 'block', marginBottom: 6 }}>EMAIL ACCOUNT *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="manager@azienda.com"
                                    value={form.account_email}
                                    onChange={e => setForm(f => ({ ...f, account_email: e.target.value }))}
                                    style={input}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, color: c.muted, display: 'block', marginBottom: 6 }}>NOME AZIENDA *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Acme S.r.l."
                                    value={form.company_name}
                                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                                    style={input}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: 10, color: c.muted, display: 'block', marginBottom: 6 }}>BUDGET MAX (€)</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    placeholder="es. 2000"
                                    value={form.max_budget}
                                    onChange={e => setForm(f => ({ ...f, max_budget: e.target.value }))}
                                    style={input}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <button type="submit" disabled={formLoading} style={btn('primary', formLoading)}>
                                {formLoading ? 'ELABORAZIONE...' : '+ APPROVA AZIENDA'}
                            </button>
                            {formMsg && (
                                <span style={{ fontSize: 12, color: formMsg.type === 'ok' ? c.accent : c.danger }}>
                                    {formMsg.text}
                                </span>
                            )}
                        </div>
                    </form>
                </div>

                {/* Leads table */}
                <div style={{ background: c.surface, border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 10, letterSpacing: '0.2em', color: c.muted }}>DEMO LEADS</div>
                        <div style={{ fontSize: 10, color: c.muted }}>{leads.length} record</div>
                    </div>
                    {loadingData ? (
                        <div style={{ padding: 32, textAlign: 'center', color: c.muted, fontSize: 12 }}>Caricamento...</div>
                    ) : leads.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: c.muted, fontSize: 12 }}>Nessun lead ancora.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: `1px solid ${c.border}` }}>
                                        {['DATA', 'NOME', 'AZIENDA', 'EMAIL', 'TEAM', 'FREQ.', 'MESSAGGIO'].map(h => (
                                            <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 9, letterSpacing: '0.15em', color: c.muted, fontWeight: 700, whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead, i) => (
                                        <tr key={lead.id} style={{ borderBottom: `1px solid ${c.border}`, background: i % 2 === 0 ? 'transparent' : '#0d0d0d' }}>
                                            <td style={{ padding: '10px 16px', color: c.muted, whiteSpace: 'nowrap' }}>{formatDate(lead.created_at)}</td>
                                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{lead.full_name}</td>
                                            <td style={{ padding: '10px 16px', color: c.accent, whiteSpace: 'nowrap' }}>{lead.company_name}</td>
                                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{lead.work_email}</td>
                                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{lead.team_size}</td>
                                            <td style={{ padding: '10px 16px', whiteSpace: 'nowrap' }}>{lead.travel_frequency}</td>
                                            <td style={{ padding: '10px 16px', color: c.muted, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.message || '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

// ─── Root Component ───────────────────────────────────────────────────────────
const SuperAdmin = () => {
    const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('_sa_token') || '');
    const [verified, setVerified] = useState(false);
    const [verifying, setVerifying] = useState(!!sessionStorage.getItem('_sa_token'));

    useEffect(() => {
        const stored = sessionStorage.getItem('_sa_token');
        if (!stored) return;
        // Rivalidazione silente del token già in sessionStorage
        adminVerifyToken(stored)
            .then(() => setVerified(true))
            .catch(() => {
                sessionStorage.removeItem('_sa_token');
                setAdminToken('');
            })
            .finally(() => setVerifying(false));
    }, []);

    if (verifying) {
        return (
            <div style={{ minHeight: '100vh', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: c.muted }}>VERIFICA TOKEN...</div>
            </div>
        );
    }

    if (!verified) {
        return <LockScreen onUnlock={(t) => { setAdminToken(t); setVerified(true); }} />;
    }

    return (
        <AdminDashboard
            adminToken={adminToken}
            onLogout={() => { setAdminToken(''); setVerified(false); }}
        />
    );
};

export default SuperAdmin;
