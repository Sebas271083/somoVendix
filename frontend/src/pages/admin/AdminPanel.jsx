import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/api.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import toast from 'react-hot-toast';
import {
  Users, LogOut, RefreshCw, Plus, X, ChevronRight,
  Mail, Calendar, ShoppingBag,
  Shield, Clock, AlertTriangle, CheckCircle2, Ban, RotateCcw,
  ToggleLeft, ToggleRight, Search, Sun, Moon,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

// Usa la misma base URL que api.js para que en producción apunte al backend correcto
const ADMIN_API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api/admin`
  : '/api/admin';

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token');
  const { method = 'GET', body } = options;
  const res = await fetch(`${ADMIN_API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 401) throw Object.assign(new Error('Unauthorized'), { status: 401 });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || 'Error'), { status: res.status });
  }
  return res.json();
};

const ALL_FEATURES = [
  { key: 'reports',     label: 'Reportes y estadísticas' },
  { key: 'receivables', label: 'Cuentas a cobrar' },
  { key: 'cashflow',    label: 'Flujo de caja' },
  { key: 'expenses',    label: 'Gastos' },
  { key: 'suppliers',   label: 'Proveedores y compras' },
  { key: 'crm',         label: 'CRM y campañas' },
];

const STATUS_META = {
  trial:     { label: 'Trial',      color: '#F59E0B', bg: 'rgba(245,158,11,.15)' },
  active:    { label: 'Activo',     color: '#10B981', bg: 'rgba(16,185,129,.15)' },
  suspended: { label: 'Suspendido', color: '#EF4444', bg: 'rgba(239,68,68,.15)'  },
  cancelled: { label: 'Cancelado',  color: '#6B7280', bg: 'rgba(107,114,128,.15)'},
};

const PLAN_COLORS = {
  free:     '#6B7280',
  pro:      '#6366F1',
  business: '#8B5CF6',
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const initials = (name) => name?.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// ── sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.cancelled;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ color: m.color, backgroundColor: m.bg }}>
      {m.label}
    </span>
  );
}

function PlanBadge({ slug, name }) {
  const color = PLAN_COLORS[slug] || PLAN_COLORS.free;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
          style={{ color, backgroundColor: `${color}22` }}>
      {name}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="rounded-xl p-4 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value ?? 0}</p>
    </div>
  );
}

// ── Create Tenant Modal ────────────────────────────────────────────────────────

function CreateModal({ plans, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', subdomain: '', email: '',
    adminName: '', adminPassword: '', planSlug: 'pro',
  });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => {
    const v = e.target.value;
    setForm(f => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !f.subdomain) {
        next.subdomain = v.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminFetch('/tenants', { method: 'POST', body: form });
      toast.success('Cliente creado exitosamente');
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.message || 'Error al crear cliente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-lg shadow-2xl border"
           style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b"
             style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Nuevo cliente</h2>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--muted)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Nombre del negocio *</label>
              <input value={form.name} onChange={set('name')} required className="input" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Subdominio *</label>
              <div className="flex items-center gap-1">
                <input value={form.subdomain} onChange={set('subdomain')} required pattern="[a-z0-9-]+"
                  className="input flex-1 font-mono" />
                <span className="text-xs whitespace-nowrap" style={{ color: 'var(--muted)' }}>.gestix.app</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Plan inicial</label>
              <select value={form.planSlug} onChange={set('planSlug')} className="input">
                {plans.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Email del negocio *</label>
              <input type="email" value={form.email} onChange={set('email')} required className="input" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Nombre del admin *</label>
              <input value={form.adminName} onChange={set('adminName')} required className="input" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>Contraseña inicial *</label>
              <input type="password" value={form.adminPassword} onChange={set('adminPassword')} required minLength={6} className="input" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear cliente'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center py-2.5">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ tenant, plans, onClose, onRefresh }) {
  const [detail, setDetail] = useState(null);
  const [featOverride, setFeatOverride] = useState({});
  const [trialDays, setTrialDays] = useState(14);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [saving, setSaving] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    setDetail(null);
    setConfirmCancel(false);
    if (!tenant) return;
    superAdminApi.tenant(tenant.id)
      .then(d => {
        setDetail(d);
        setFeatOverride(d.features_override ? { ...d.features_override } : {});
        setSelectedPlan(d.plan_id);
      })
      .catch(() => toast.error('Error al cargar detalle'));
  }, [tenant?.id]);

  const changeStatus = async (status) => {
    setSaving('status');
    try {
      await superAdminApi.updateTenant(tenant.id, { status });
      toast.success(`Estado cambiado a "${STATUS_META[status]?.label || status}"`);
      onRefresh();
      setDetail(d => ({ ...d, status }));
    } catch { toast.error('Error al cambiar estado'); }
    finally { setSaving(''); setConfirmCancel(false); }
  };

  const savePlan = async () => {
    if (!selectedPlan) return;
    setSaving('plan');
    try {
      await superAdminApi.updateTenant(tenant.id, { plan_id: selectedPlan });
      toast.success('Plan actualizado');
      onRefresh();
    } catch { toast.error('Error al cambiar plan'); }
    finally { setSaving(''); }
  };

  const saveFeatures = async () => {
    setSaving('features');
    try {
      await adminFetch(`/tenants/${tenant.id}/features`, {
        method: 'PUT',
        body: { features_override: featOverride },
      });
      toast.success('Módulos actualizados');
      onRefresh();
    } catch { toast.error('Error al guardar módulos'); }
    finally { setSaving(''); }
  };

  const doExtendTrial = async () => {
    setSaving('trial');
    try {
      await adminFetch(`/tenants/${tenant.id}/extend-trial`, {
        method: 'POST',
        body: { days: trialDays },
      });
      toast.success(`Trial extendido ${trialDays} días`);
      onRefresh();
      const d = await superAdminApi.tenant(tenant.id);
      setDetail(d);
    } catch (err) { toast.error(err.message || 'Error'); }
    finally { setSaving(''); }
  };

  const toggleFeature = (key) => {
    const current = detail ? { ...detail.plan_features, ...featOverride } : featOverride;
    const effective = current[key] ?? false;
    setFeatOverride(f => ({ ...f, [key]: !effective }));
  };

  const resetFeature = (key) => {
    setFeatOverride(f => { const n = { ...f }; delete n[key]; return n; });
  };

  const effectiveFeatures = detail
    ? { ...detail.plan_features, ...featOverride }
    : featOverride;

  const hasUnsavedFeatures = JSON.stringify(featOverride) !== JSON.stringify(
    detail?.features_override ? { ...detail.features_override } : {}
  );

  return (
    <div className="flex flex-col h-full w-full border-l" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm flex-shrink-0"
               style={{ backgroundColor: 'rgba(99,102,241,.12)' }}>
            {initials(tenant.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate" style={{ color: 'var(--ink)' }}>{tenant.name}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--muted)' }}>{tenant.subdomain}.gestix.app</p>
          </div>
        </div>
        <button onClick={onClose} className="transition-colors flex-shrink-0 ml-2" style={{ color: 'var(--muted)' }}>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: 'var(--muted)' }}>Cargando...</div>
        ) : (
          <div className="p-5 space-y-6">

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} style={{ color: 'var(--muted)' }} className="flex-shrink-0" />
                <span style={{ color: 'var(--ink)' }}>{detail.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <PlanBadge slug={detail.plan_slug} name={detail.plan_name} />
                <StatusBadge status={detail.status} />
                {detail.status === 'trial' && detail.trial_ends_at && (
                  <span className="text-xs text-amber-500">
                    trial hasta {fmtDate(detail.trial_ends_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--muted)' }}>
                <span className="flex items-center gap-1">
                  <Users size={11} /> {detail.usage?.users ?? 0} usuarios
                </span>
                <span className="flex items-center gap-1">
                  <ShoppingBag size={11} /> {detail.usage?.sales_this_month ?? 0} ventas/mes
                </span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> desde {fmtDate(detail.created_at)}
                </span>
              </div>
            </div>

            {/* Estado */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Estado</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => changeStatus('active')}
                  disabled={detail.status === 'active' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(16,185,129,.15)', color: '#10B981' }}
                >
                  <CheckCircle2 size={13} /> Activar
                </button>
                <button
                  onClick={() => changeStatus('suspended')}
                  disabled={detail.status === 'suspended' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#EF4444' }}
                >
                  <Ban size={13} /> Suspender
                </button>
                <button
                  onClick={() => changeStatus('trial')}
                  disabled={detail.status === 'trial' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(245,158,11,.12)', color: '#F59E0B' }}
                >
                  <Clock size={13} /> Poner en trial
                </button>
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    disabled={detail.status === 'cancelled' || saving === 'status'}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                    style={{ backgroundColor: 'rgba(107,114,128,.12)', color: '#9CA3AF' }}
                  >
                    <Ban size={13} /> Cancelar cuenta
                  </button>
                ) : (
                  <button
                    onClick={() => changeStatus('cancelled')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors"
                    style={{ backgroundColor: 'rgba(239,68,68,.18)', color: '#EF4444' }}
                  >
                    <AlertTriangle size={13} /> ¿Confirmar?
                  </button>
                )}
              </div>
            </section>

            {/* Plan */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Plan</h3>
              <div className="flex gap-2">
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className="input flex-1"
                >
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  onClick={savePlan}
                  disabled={String(selectedPlan) === String(detail.plan_id) || saving === 'plan'}
                  className="btn-primary px-4 disabled:opacity-40"
                >
                  {saving === 'plan' ? '...' : 'Guardar'}
                </button>
              </div>
            </section>

            {/* Trial */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Extender trial</h3>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min="1" max="365"
                  value={trialDays}
                  onChange={e => setTrialDays(Number(e.target.value))}
                  className="input w-20 text-center"
                />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>días</span>
                <button
                  onClick={doExtendTrial}
                  disabled={saving === 'trial'}
                  className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(245,158,11,.15)', color: '#F59E0B' }}
                >
                  {saving === 'trial' ? '...' : 'Extender'}
                </button>
              </div>
              {detail.trial_ends_at && (
                <p className="text-xs mt-1.5" style={{ color: 'var(--muted)' }}>
                  Trial actual: hasta {fmtDate(detail.trial_ends_at)}
                </p>
              )}
            </section>

            {/* Módulos */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>Módulos</h3>
                {hasUnsavedFeatures && (
                  <button
                    onClick={saveFeatures}
                    disabled={saving === 'features'}
                    className="btn-primary text-xs px-3 py-1"
                  >
                    {saving === 'features' ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {ALL_FEATURES.map(({ key, label }) => {
                  const isOn = effectiveFeatures[key] ?? false;
                  const isOverridden = featOverride[key] !== undefined;
                  return (
                    <div key={key}
                      className="flex items-center justify-between px-3 py-2 rounded-lg border"
                      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
                    >
                      <div>
                        <p className="text-sm" style={{ color: 'var(--ink)' }}>{label}</p>
                        {isOverridden ? (
                          <p className="text-[10px] text-indigo-500 flex items-center gap-1">
                            <Shield size={9} /> override
                            {' · '}
                            <button onClick={() => resetFeature(key)} className="hover:text-indigo-400 underline">
                              restaurar plan
                            </button>
                          </p>
                        ) : (
                          <p className="text-[10px]" style={{ color: 'var(--muted)' }}>del plan</p>
                        )}
                      </div>
                      <button onClick={() => toggleFeature(key)} className="flex-shrink-0 ml-3">
                        {isOn
                          ? <ToggleRight size={24} className="text-emerald-500" />
                          : <ToggleLeft size={24} style={{ color: 'var(--muted)' }} />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Notas */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>Notas internas</h3>
              <NotesEditor tenantId={tenant.id} initial={detail.notes} onSaved={onRefresh} />
            </section>

          </div>
        )}
      </div>
    </div>
  );
}

function NotesEditor({ tenantId, initial, onSaved }) {
  const [notes, setNotes] = useState(initial || '');
  const [saving, setSaving] = useState(false);
  const dirty = notes !== (initial || '');

  const save = async () => {
    setSaving(true);
    try {
      await superAdminApi.updateTenant(tenantId, { notes });
      toast.success('Notas guardadas');
      onSaved();
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={3}
        placeholder="Notas privadas sobre este cliente..."
        className="input resize-none"
      />
      {dirty && (
        <button onClick={save} disabled={saving} className="btn-secondary mt-2 text-xs">
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const navigate = useNavigate();
  const { dark, toggle: toggleTheme } = useTheme();
  const [tenants, setTenants] = useState([]);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    if (!token) { navigate('/admin/login'); return; }
    load();
  }, []);

  const load = useCallback(async () => {
    try {
      const [t, s, p] = await Promise.all([
        superAdminApi.tenants(),
        superAdminApi.stats(),
        superAdminApi.plans(),
      ]);
      setTenants(t);
      setStats(s);
      setPlans(p);
    } catch (err) {
      if (err?.status === 401) navigate('/admin/login');
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleCheckTrials = async () => {
    try {
      await superAdminApi.checkTrials();
      toast.success('Trials revisados');
      load();
    } catch { toast.error('Error'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  const filtered = tenants.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.subdomain.toLowerCase().includes(q) || t.email?.toLowerCase().includes(q);
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{ backgroundColor: 'var(--bg)', color: 'var(--muted)' }}>
      Cargando panel...
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Header */}
      <header className="px-5 py-3.5 flex items-center justify-between flex-shrink-0 border-b"
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">G</div>
          <div>
            <span className="font-semibold text-sm" style={{ color: 'var(--ink)' }}>Super Admin</span>
            <span className="text-xs ml-2" style={{ color: 'var(--muted)' }}>Gestix</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary text-sm px-3 py-1.5"
          >
            <Plus size={14} /> Nuevo cliente
          </button>
          <button onClick={handleCheckTrials}
            className="btn-secondary text-sm px-3 py-1.5">
            <RefreshCw size={14} /> Trials
          </button>
          <button onClick={load}
            className="btn-secondary p-2" title="Actualizar">
            <RotateCcw size={14} />
          </button>
          <button onClick={toggleTheme}
            className="btn-secondary p-2" title={dark ? 'Modo claro' : 'Modo oscuro'}>
            {dark ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={handleLogout}
            className="p-2 rounded-lg transition-colors" style={{ color: 'var(--muted)' }} title="Cerrar sesión">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        {stats?.counts && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            <StatCard label="Total clientes"  value={stats.counts.total}     color="var(--ink)"  />
            <StatCard label="En trial"        value={stats.counts.trialing}  color="#F59E0B" />
            <StatCard label="Activos"         value={stats.counts.active}    color="#10B981" />
            <StatCard label="Suspendidos"     value={stats.counts.suspended} color="#EF4444" />
            <StatCard label="Cancelados"      value={stats.counts.cancelled} color="var(--muted)" />
          </div>
        )}
        {stats?.planBreakdown && (
          <div className="grid grid-cols-3 gap-3">
            {stats.planBreakdown.map(p => (
              <div key={p.slug} className="rounded-xl px-4 py-3 border flex items-center justify-between"
                   style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
                <div>
                  <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>{p.name}</p>
                  <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>{p.count}</p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ color: PLAN_COLORS[p.slug] || '#6B7280', backgroundColor: `${PLAN_COLORS[p.slug] || '#6B7280'}22` }}>
                  {p.slug}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0 gap-0">
        {/* List */}
        <div className={`flex flex-col min-h-0 transition-all ${selected ? 'w-full lg:w-[55%]' : 'w-full'}`}>
          {/* Filters */}
          <div className="px-5 pb-3 flex items-center gap-3 flex-shrink-0">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, subdominio o email..."
                className="input pl-9"
              />
            </div>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="input w-auto"
            >
              <option value="">Todos</option>
              <option value="trial">Trial</option>
              <option value="active">Activos</option>
              <option value="suspended">Suspendidos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--surface)' }}>
                <tr>
                  {['Cliente', 'Subdominio', 'Plan', 'Estado', 'Ventas', 'Trial/Alta', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold uppercase tracking-wider border-b"
                        style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-sm" style={{ color: 'var(--muted)' }}>
                      {search || filterStatus ? 'Sin resultados para este filtro' : 'No hay clientes aún'}
                    </td>
                  </tr>
                )}
                {filtered.map((t, i) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t.id === selected?.id ? null : t)}
                    className="cursor-pointer transition-colors border-b table-row-hover"
                    style={{
                      borderColor: 'var(--border)',
                      backgroundColor: selected?.id === t.id ? 'var(--brand-soft)' : 'transparent',
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                             style={{ backgroundColor: `${PLAN_COLORS[t.plan_slug] || '#6366F1'}22`, color: PLAN_COLORS[t.plan_slug] || '#6366F1' }}>
                          {initials(t.name)}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{t.name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--muted)' }}>{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-500">{t.subdomain}</td>
                    <td className="px-4 py-3">
                      <PlanBadge slug={t.plan_slug} name={t.plan_name} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: 'var(--muted)' }}>{t.total_sales ?? 0}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                      {t.status === 'trial' && t.trial_ends_at
                        ? <span className="text-amber-500">hasta {fmtDate(t.trial_ends_at)}</span>
                        : fmtDate(t.created_at)
                      }
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className={`transition-transform ${selected?.id === t.id ? 'rotate-90 text-indigo-500' : ''}`}
                                    style={{ color: selected?.id === t.id ? undefined : 'var(--border)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-2.5 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              {filtered.length} de {tenants.length} clientes
              {(search || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterStatus(''); }}
                        className="ml-2 text-indigo-500 hover:text-indigo-400">
                  Limpiar filtros
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Detail panel — desktop */}
        {selected && (
          <div className="hidden lg:flex flex-col flex-1 min-h-0 border-l" style={{ borderColor: 'var(--border)' }}>
            <DetailPanel
              tenant={selected}
              plans={plans}
              onClose={() => setSelected(null)}
              onRefresh={load}
            />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>
          <DetailPanel
            tenant={selected}
            plans={plans}
            onClose={() => setSelected(null)}
            onRefresh={load}
          />
        </div>
      )}

      {showCreate && (
        <CreateModal
          plans={plans}
          onClose={() => setShowCreate(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
