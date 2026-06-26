import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/api.js';
import toast from 'react-hot-toast';
import {
  Users, LogOut, RefreshCw, Plus, X, ChevronRight,
  Mail, Calendar, ShoppingBag,
  Shield, Clock, AlertTriangle, CheckCircle2, Ban, RotateCcw,
  ToggleLeft, ToggleRight, Search,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

const adminFetch = async (path, options = {}) => {
  const token = localStorage.getItem('admin_token');
  const { method = 'GET', body } = options;
  const res = await fetch(`/api/admin${path}`, {
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
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <p className="text-gray-400 text-xs mb-1">{label}</p>
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Nuevo cliente</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Nombre del negocio *</label>
              <input value={form.name} onChange={set('name')} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Subdominio *</label>
              <div className="flex items-center gap-1">
                <input value={form.subdomain} onChange={set('subdomain')} required pattern="[a-z0-9-]+"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:border-indigo-500 outline-none" />
                <span className="text-gray-500 text-xs whitespace-nowrap">.gestix.app</span>
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Plan inicial</label>
              <select value={form.planSlug} onChange={set('planSlug')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none">
                {plans.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Email del negocio *</label>
              <input type="email" value={form.email} onChange={set('email')} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Nombre del admin *</label>
              <input value={form.adminName} onChange={set('adminName')} required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contraseña inicial *</label>
              <input type="password" value={form.adminPassword} onChange={set('adminPassword')} required minLength={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50">
              {saving ? 'Creando...' : 'Crear cliente'}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2.5 rounded-lg text-sm transition-colors">
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
    <div className="flex flex-col h-full bg-gray-950 border-l border-gray-800 w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 font-bold text-sm flex-shrink-0">
            {initials(tenant.name)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{tenant.name}</p>
            <p className="text-xs text-gray-500 font-mono">{tenant.subdomain}.gestix.app</p>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0 ml-2">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!detail ? (
          <div className="flex items-center justify-center h-32 text-gray-600 text-sm">Cargando...</div>
        ) : (
          <div className="p-5 space-y-6">

            {/* Info */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail size={13} className="text-gray-600 flex-shrink-0" />
                <span className="text-gray-300">{detail.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <PlanBadge slug={detail.plan_slug} name={detail.plan_name} />
                <StatusBadge status={detail.status} />
                {detail.status === 'trial' && detail.trial_ends_at && (
                  <span className="text-xs text-amber-400">
                    trial hasta {fmtDate(detail.trial_ends_at)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
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
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Estado</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => changeStatus('active')}
                  disabled={detail.status === 'active' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(16,185,129,.15)', color: '#10B981' }}
                  onMouseEnter={e => { if (detail.status !== 'active') e.currentTarget.style.backgroundColor = 'rgba(16,185,129,.25)'; }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(16,185,129,.15)'}
                >
                  <CheckCircle2 size={13} /> Activar
                </button>
                <button
                  onClick={() => changeStatus('suspended')}
                  disabled={detail.status === 'suspended' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(239,68,68,.12)', color: '#EF4444' }}
                  onMouseEnter={e => { if (detail.status !== 'suspended') e.currentTarget.style.backgroundColor = 'rgba(239,68,68,.22)'; }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(239,68,68,.12)'}
                >
                  <Ban size={13} /> Suspender
                </button>
                <button
                  onClick={() => changeStatus('trial')}
                  disabled={detail.status === 'trial' || saving === 'status'}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(245,158,11,.12)', color: '#F59E0B' }}
                  onMouseEnter={e => { if (detail.status !== 'trial') e.currentTarget.style.backgroundColor = 'rgba(245,158,11,.22)'; }}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(245,158,11,.12)'}
                >
                  <Clock size={13} /> Poner en trial
                </button>
                {!confirmCancel ? (
                  <button
                    onClick={() => setConfirmCancel(true)}
                    disabled={detail.status === 'cancelled' || saving === 'status'}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
                    style={{ backgroundColor: 'rgba(107,114,128,.12)', color: '#9CA3AF' }}
                    onMouseEnter={e => { if (detail.status !== 'cancelled') e.currentTarget.style.backgroundColor = 'rgba(107,114,128,.22)'; }}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(107,114,128,.12)'}
                  >
                    <Ban size={13} /> Cancelar cuenta
                  </button>
                ) : (
                  <button
                    onClick={() => changeStatus('cancelled')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors bg-red-900/40 text-red-400"
                  >
                    <AlertTriangle size={13} /> ¿Confirmar?
                  </button>
                )}
              </div>
            </section>

            {/* Plan */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Plan</h3>
              <div className="flex gap-2">
                <select
                  value={selectedPlan}
                  onChange={e => setSelectedPlan(e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                >
                  {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <button
                  onClick={savePlan}
                  disabled={String(selectedPlan) === String(detail.plan_id) || saving === 'plan'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {saving === 'plan' ? '...' : 'Guardar'}
                </button>
              </div>
            </section>

            {/* Trial */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Extender trial</h3>
              <div className="flex gap-2 items-center">
                <input
                  type="number" min="1" max="365"
                  value={trialDays}
                  onChange={e => setTrialDays(Number(e.target.value))}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm text-center focus:border-indigo-500 outline-none"
                />
                <span className="text-gray-500 text-sm">días</span>
                <button
                  onClick={doExtendTrial}
                  disabled={saving === 'trial'}
                  className="ml-auto px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                >
                  {saving === 'trial' ? '...' : 'Extender'}
                </button>
              </div>
              {detail.trial_ends_at && (
                <p className="text-xs text-gray-600 mt-1.5">
                  Trial actual: hasta {fmtDate(detail.trial_ends_at)}
                </p>
              )}
            </section>

            {/* Módulos */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-600">Módulos</h3>
                {hasUnsavedFeatures && (
                  <button
                    onClick={saveFeatures}
                    disabled={saving === 'features'}
                    className="text-xs px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    {saving === 'features' ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {ALL_FEATURES.map(({ key, label }) => {
                  const isOn = effectiveFeatures[key] ?? false;
                  const isOverridden = featOverride[key] !== undefined;
                  const planDefault = detail.plan_features?.[key] ?? false;
                  return (
                    <div key={key}
                      className="flex items-center justify-between px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                    >
                      <div>
                        <p className="text-sm text-gray-200">{label}</p>
                        {isOverridden && (
                          <p className="text-[10px] text-indigo-400 flex items-center gap-1">
                            <Shield size={9} /> override
                            {' · '}
                            <button onClick={() => resetFeature(key)} className="hover:text-indigo-300 underline">
                              restaurar plan
                            </button>
                          </p>
                        )}
                        {!isOverridden && (
                          <p className="text-[10px] text-gray-600">del plan</p>
                        )}
                      </div>
                      <button onClick={() => toggleFeature(key)} className="flex-shrink-0 ml-3">
                        {isOn
                          ? <ToggleRight size={24} className="text-emerald-400" />
                          : <ToggleLeft size={24} className="text-gray-600" />
                        }
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Notas */}
            <section>
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-gray-600 mb-3">Notas internas</h3>
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
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:border-indigo-500 outline-none placeholder:text-gray-600"
      />
      {dirty && (
        <button onClick={save} disabled={saving}
          className="mt-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-xs font-medium transition-colors">
          {saving ? 'Guardando...' : 'Guardar nota'}
        </button>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const navigate = useNavigate();
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-500">
      Cargando panel...
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-5 py-3.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">G</div>
          <div>
            <span className="font-semibold text-white text-sm">Super Admin</span>
            <span className="text-gray-600 text-xs ml-2">Gestix</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            <Plus size={14} /> Nuevo cliente
          </button>
          <button onClick={handleCheckTrials}
            className="flex items-center gap-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
            <RefreshCw size={14} /> Trials
          </button>
          <button onClick={load}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" title="Actualizar">
            <RotateCcw size={14} />
          </button>
          <button onClick={handleLogout}
            className="p-2 rounded-lg text-gray-600 hover:text-gray-300 transition-colors" title="Cerrar sesión">
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="px-5 pt-5 pb-4 flex-shrink-0">
        {stats?.counts && (
          <div className="grid grid-cols-5 gap-3 mb-4">
            <StatCard label="Total clientes"  value={stats.counts.total}     color="#E5E7EB" />
            <StatCard label="En trial"        value={stats.counts.trialing}  color="#F59E0B" />
            <StatCard label="Activos"         value={stats.counts.active}    color="#10B981" />
            <StatCard label="Suspendidos"     value={stats.counts.suspended} color="#EF4444" />
            <StatCard label="Cancelados"      value={stats.counts.cancelled} color="#6B7280" />
          </div>
        )}
        {stats?.planBreakdown && (
          <div className="grid grid-cols-3 gap-3">
            {stats.planBreakdown.map(p => (
              <div key={p.slug} className="bg-gray-900 rounded-xl px-4 py-3 border border-gray-800 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">{p.name}</p>
                  <p className="text-lg font-bold text-white">{p.count}</p>
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
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre, subdominio o email..."
                className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-gray-600 outline-none"
              />
            </div>
            <select
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-300 focus:border-gray-600 outline-none"
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
              <thead className="sticky top-0 bg-gray-900 z-10">
                <tr>
                  {['Cliente', 'Subdominio', 'Plan', 'Estado', 'Ventas', 'Trial/Alta', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-[11px] text-gray-500 font-semibold uppercase tracking-wider border-b border-gray-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-600">
                      {search || filterStatus ? 'Sin resultados para este filtro' : 'No hay clientes aún'}
                    </td>
                  </tr>
                )}
                {filtered.map(t => (
                  <tr
                    key={t.id}
                    onClick={() => setSelected(t.id === selected?.id ? null : t)}
                    className="cursor-pointer transition-colors"
                    style={{
                      backgroundColor: selected?.id === t.id ? 'rgba(99,102,241,.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,.03)'; }}
                    onMouseLeave={e => { if (selected?.id !== t.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                             style={{ backgroundColor: `${PLAN_COLORS[t.plan_slug] || '#6366F1'}22`, color: PLAN_COLORS[t.plan_slug] || '#6366F1' }}>
                          {initials(t.name)}
                        </div>
                        <div>
                          <p className="font-medium text-white text-sm">{t.name}</p>
                          <p className="text-[11px] text-gray-500">{t.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-400">{t.subdomain}</td>
                    <td className="px-4 py-3">
                      <PlanBadge slug={t.plan_slug} name={t.plan_name} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-sm">{t.total_sales ?? 0}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {t.status === 'trial' && t.trial_ends_at
                        ? <span className="text-amber-500">hasta {fmtDate(t.trial_ends_at)}</span>
                        : fmtDate(t.created_at)
                      }
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight size={14} className={`transition-transform ${selected?.id === t.id ? 'rotate-90 text-indigo-400' : 'text-gray-700'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-2.5 border-t border-gray-800 flex-shrink-0">
            <p className="text-xs text-gray-600">
              {filtered.length} de {tenants.length} clientes
              {(search || filterStatus) && (
                <button onClick={() => { setSearch(''); setFilterStatus(''); }} className="ml-2 text-indigo-400 hover:text-indigo-300">
                  Limpiar filtros
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="hidden lg:flex flex-col flex-1 min-h-0 border-l border-gray-800">
            <DetailPanel
              tenant={selected}
              plans={plans}
              onClose={() => setSelected(null)}
              onRefresh={() => {
                load();
                // Keep the updated tenant in the list after refresh
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile detail modal */}
      {selected && (
        <div className="lg:hidden fixed inset-0 z-40 bg-gray-950 flex flex-col">
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
