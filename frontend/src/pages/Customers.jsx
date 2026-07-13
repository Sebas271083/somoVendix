import { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Edit2, History, DollarSign, Send, X, AlertTriangle,
  MessageSquare, Clock, Star, BarChart2, Upload, Tag, ChevronDown, Trash2, UserX,
} from 'lucide-react';
import { customersApi, paymentsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const SEGMENTS = [
  { value: 'general', label: 'General', color: 'bg-gray-100 text-gray-600' },
  { value: 'minorista', label: 'Minorista', color: 'bg-brand-soft text-brand' },
  { value: 'mayorista', label: 'Mayorista', color: 'bg-purple-100 text-purple-700' },
  { value: 'vip', label: 'VIP', color: 'bg-amber-100 text-amber-700' },
];

const segmentInfo = (v) => SEGMENTS.find((s) => s.value === v) || SEGMENTS[0];

const EMPTY = {
  name: '', document_type: 'DNI', document_number: '', email: '', phone: '',
  address: '', credit_limit: 0, notes: '', segment: 'general',
  birthday: '', tags: '', preferences: '', iva_condition: 'consumidor_final',
};

// ── CSV parser ──────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').map((l) => l.replace(/\r$/, ''));
  if (lines.length < 2) throw new Error('El archivo debe tener al menos una fila de datos');
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
  return lines.slice(1).filter(Boolean).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
}

// ── AccountModal ─────────────────────────────────────────────────────────────
function AccountModal({ customer, onClose }) {
  const [data, setData] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [loyalty, setLoyalty] = useState([]);
  const [tab, setTab] = useState('sales');
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('note');

  useEffect(() => {
    customersApi.accountSummary(customer.id).then(setData).catch(() => setData({ sales: [], payments: [], totalPurchased: 0, totalPaid: 0 }));
    customersApi.metrics(customer.id).then(setMetrics).catch(() => setMetrics({}));
    customersApi.interactions(customer.id).then(setInteractions).catch(() => {});
    customersApi.loyaltyHistory(customer.id).then(setLoyalty).catch(() => {});
  }, [customer.id]);

  const handleAddInteraction = async () => {
    if (!newNote.trim()) return;
    try {
      await customersApi.createInteraction(customer.id, { type: noteType, body: newNote });
      setNewNote('');
      const updated = await customersApi.interactions(customer.id);
      setInteractions(updated);
      toast.success('Nota guardada');
    } catch { toast.error('Error al guardar'); }
  };

  const handleDeleteInteraction = async (intId) => {
    try {
      await customersApi.deleteInteraction(customer.id, intId);
      setInteractions((prev) => prev.filter((i) => i.id !== intId));
    } catch { toast.error('Error'); }
  };

  const buildWhatsApp = () => {
    if (!data) return '';
    const recent = data.sales.filter((s) => s.status === 'completed').slice(0, 5);
    return [
      `📋 *Resumen de cuenta - ${customer.name}*`,
      `📅 ${new Date().toLocaleDateString('es-AR')}`,
      ``,
      `*Últimas compras:*`,
      ...recent.map((s) => `• ${new Date(s.created_at).toLocaleDateString('es-AR')} — ${fmt(s.total)}`),
      ``,
      `💰 Total comprado: ${fmt(data.totalPurchased)}`,
      `✅ Total pagado: ${fmt(data.totalPaid)}`,
      `⚠️ *Saldo pendiente: ${fmt(customer.balance)}*`,
      ``,
      `¡Gracias por tu confianza! 🙏`,
    ].join('\n');
  };

  const tabs = ['sales', 'payments', 'metrics', 'interactions', 'loyalty', 'whatsapp'];
  const tabLabels = {
    sales: 'Compras', payments: 'Pagos', metrics: 'Métricas',
    interactions: 'Historial CRM', loyalty: 'Puntos', whatsapp: 'WhatsApp',
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl w-full max-w-3xl max-h-[88vh] flex flex-col" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold flex items-center gap-2" style={{ color: 'var(--ink)' }}>
              {customer.name}
              <span className={`text-xs px-2 py-0.5 rounded-full ${segmentInfo(customer.segment)?.color}`}>
                {segmentInfo(customer.segment)?.label}
              </span>
            </h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {customer.phone} · Saldo:{' '}
              <span className={customer.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                {fmt(customer.balance)}
              </span>
              {customer.points_balance > 0 && (
                <span className="ml-2 text-amber-600">
                  <Star size={11} className="inline mb-0.5" /> {customer.points_balance} pts
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={20} /></button>
        </div>

        <div className="flex gap-1 p-3 border-b overflow-x-auto">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
              style={tab === t ? { backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' } : { color: 'var(--muted)' }}>
              {tabLabels[t]}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'sales' && !data ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Cargando...</div>
          ) : tab === 'sales' ? (
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--bg)' }}>
                <tr>
                  {['Fecha', 'Ticket #', 'Método', 'Total', 'Estado'].map((h) => (
                    <th key={h} className="text-left px-3 py-2" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sales.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--muted)' }}>Sin compras registradas</td></tr>
                ) : data.sales.map((s) => (
                  <tr key={s.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--ink)' }}>#{s.ticket_number}</td>
                    <td className="px-3 py-2 capitalize" style={{ color: 'var(--muted)' }}>{s.payment_method?.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-right font-semibold" style={{ color: 'var(--ink)' }}>{fmt(s.total)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'payments' && !data ? (
            <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Cargando...</div>
          ) : tab === 'payments' ? (
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--bg)' }}>
                <tr>
                  {['Fecha', 'Método', 'Notas', 'Monto'].map((h) => (
                    <th key={h} className="text-left px-3 py-2" style={{ color: 'var(--muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.payments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6" style={{ color: 'var(--muted)' }}>Sin pagos registrados</td></tr>
                ) : data.payments.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-2 capitalize" style={{ color: 'var(--ink)' }}>{p.method}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--muted)' }}>{p.notes || '—'}</td>
                    <td className="px-3 py-2 font-semibold text-green-600">+{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'metrics' ? (
            !metrics ? (
              <div className="text-center py-8" style={{ color: 'var(--muted)' }}>Cargando métricas...</div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Total de compras', value: metrics.total_purchases },
                  { label: 'Total gastado', value: fmt(metrics.total_spent) },
                  { label: 'Ticket promedio', value: fmt(metrics.avg_ticket) },
                  { label: 'Frecuencia (días)', value: metrics.frequency_days ? `${Math.round(metrics.frequency_days)} días` : '—' },
                  { label: 'LTV mensual estimado', value: fmt(metrics.ltv_monthly) },
                  { label: 'Primera compra', value: metrics.first_purchase ? new Date(metrics.first_purchase).toLocaleDateString('es-AR') : '—' },
                  { label: 'Última compra', value: metrics.last_purchase ? new Date(metrics.last_purchase).toLocaleDateString('es-AR') : '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg)' }}>
                    <p className="text-xs mb-1" style={{ color: 'var(--muted)' }}>{label}</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>{value ?? '—'}</p>
                  </div>
                ))}
              </div>
            )
          ) : tab === 'interactions' ? (
            <div className="space-y-4">
              <div className="flex gap-2">
                <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="input w-36 py-2 text-sm">
                  <option value="note">Nota</option>
                  <option value="call">Llamada</option>
                  <option value="visit">Visita</option>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
                <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Agregar nota o interacción..." className="input flex-1 py-2 text-sm"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddInteraction()} />
                <button onClick={handleAddInteraction} className="btn-primary px-4 py-2 text-sm">Guardar</button>
              </div>
              {interactions.length === 0 ? (
                <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Sin interacciones registradas</p>
              ) : interactions.map((i) => (
                <div key={i.id} className="flex items-start gap-3 p-3 rounded-lg group" style={{ backgroundColor: 'var(--bg)' }}>
                  <div className="flex-1">
                    <p className="text-xs mb-0.5" style={{ color: 'var(--muted)' }}>
                      <span className="capitalize font-medium" style={{ color: 'var(--ink)' }}>{i.type}</span>{' '}
                      · {new Date(i.created_at).toLocaleDateString('es-AR')} · {i.user_name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--ink)' }}>{i.body}</p>
                  </div>
                  <button onClick={() => handleDeleteInteraction(i.id)}
                    className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : tab === 'loyalty' ? (
            <div className="space-y-3">
              {loyalty.length === 0 ? (
                <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Sin movimientos de puntos</p>
              ) : loyalty.map((l) => (
                <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{l.notes || l.type}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{new Date(l.created_at).toLocaleDateString('es-AR')}</p>
                  </div>
                  <span className={`font-semibold ${l.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {l.points > 0 ? '+' : ''}{l.points} pts
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              <textarea readOnly rows={14}
                className="w-full border rounded-lg p-3 text-sm font-mono resize-none"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--ink)', borderColor: 'var(--border)' }}
                value={buildWhatsApp()} />
              <button onClick={() => { navigator.clipboard.writeText(buildWhatsApp()); toast.success('Copiado'); }}
                className="mt-3 w-full bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 flex items-center justify-center gap-2">
                <Send size={16} /> Copiar para WhatsApp
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── PaymentModal ─────────────────────────────────────────────────────────────
function PaymentModal({ customer, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await paymentsApi.create({ customer_id: customer.id, amount: parseFloat(amount), method });
      toast.success('Pago registrado');
      onSuccess();
    } catch (err) { toast.error(err?.error || 'Error'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl w-full max-w-sm" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Registrar pago</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {customer.name} · Saldo: <strong className="text-red-600">{fmt(customer.balance)}</strong>
          </p>
          <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="input text-lg font-semibold"
            placeholder="Monto recibido" autoFocus />
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input">
            {['efectivo', 'debito', 'credito', 'transferencia'].map((m) => (
              <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
            ))}
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-60">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── PriceListsModal ──────────────────────────────────────────────────────────
function PriceListsModal({ onClose }) {
  const [lists, setLists] = useState([]);
  const [editing, setEditing] = useState({});
  const [saving, setSaving] = useState(null);

  useEffect(() => {
    customersApi.getPriceLists().then(setLists).catch(() => {});
  }, []);

  const handleSave = async (segment) => {
    const pct = parseFloat(editing[segment] ?? '');
    if (isNaN(pct) || pct < 0 || pct > 100) { toast.error('Ingrese un porcentaje válido (0-100)'); return; }
    setSaving(segment);
    try {
      await customersApi.updatePriceList(segment, pct);
      setLists((prev) => prev.map((l) => l.segment === segment ? { ...l, discount_pct: pct } : l));
      setEditing((prev) => { const n = { ...prev }; delete n[segment]; return n; });
      toast.success('Lista de precios actualizada');
    } catch { toast.error('Error al guardar'); }
    finally { setSaving(null); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="rounded-xl shadow-xl w-full max-w-md" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--ink)' }}>Listas de precios por segmento</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }}><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">Descuento automático aplicado al seleccionar un cliente de ese segmento en el POS.</p>
          {lists.map((l) => (
            <div key={l.segment} className="flex items-center gap-3 p-3 border rounded-lg">
              <span className={`text-xs px-2 py-0.5 rounded-full ${segmentInfo(l.segment)?.color}`}>
                {segmentInfo(l.segment)?.label}
              </span>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="number" min="0" max="100" step="0.5"
                  value={editing[l.segment] ?? l.discount_pct ?? 0}
                  onChange={(e) => setEditing((prev) => ({ ...prev, [l.segment]: e.target.value }))}
                  className="input w-24 py-1.5 text-sm"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
              <button
                onClick={() => handleSave(l.segment)}
                disabled={saving === l.segment || !(l.segment in editing)}
                className="btn-primary text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          ))}
        </div>
        <div className="p-5 pt-0">
          <button onClick={onClose} className="w-full btn-secondary justify-center">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Customers() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [accountModal, setAccountModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [priceListsModal, setPriceListsModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const load = async (s = search) => {
    setLoading(true);
    try { setCustomers(await customersApi.list(s)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm(Object.fromEntries(
      Object.entries({ ...EMPTY, ...c }).map(([k, v]) => [k, v ?? ''])
    ));
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        tags: form.tags,
        credit_limit: Number(form.credit_limit) || 0,
      };
      if (editing) { await customersApi.update(editing.id, payload); toast.success('Cliente actualizado'); }
      else { await customersApi.create(payload); toast.success('Cliente creado'); }
      setShowForm(false);
      load();
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
  };

  const handleDeactivate = async (c) => {
    if (!confirm(`¿Desactivar a "${c.name}"? No aparecerá más en la lista.`)) return;
    try {
      await customersApi.deactivate(c.id);
      toast.success('Cliente desactivado');
      load();
    } catch (err) { toast.error(err?.error || 'Error al desactivar'); }
  };

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      const result = await customersApi.importCSV(rows);
      toast.success(`Importados: ${result.created} nuevos, ${result.updated} actualizados`);
      load();
    } catch (err) {
      toast.error(err?.error || err?.message || 'Error al importar CSV');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const f = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => setPriceListsModal(true)}
                className="btn-secondary text-sm flex items-center gap-1.5">
                <Tag size={14} /> Listas de precios
              </button>
              <button onClick={() => fileInputRef.current?.click()} disabled={importing}
                className="btn-secondary text-sm flex items-center gap-1.5">
                <Upload size={14} /> {importing ? 'Importando...' : 'Importar CSV'}
              </button>
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCSVImport} />
            </>
          )}
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus size={14} /> Nuevo cliente
          </button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..." className="input pl-9" />
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b sticky top-0" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            <tr>
              {['Nombre / Segmento', 'Documento', 'Teléfono', 'Última compra', 'Puntos', 'Saldo c/c', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : customers.map((c) => {
                  const balance = Number(c.balance);
                  const limit = Number(c.credit_limit);
                  const overLimit = limit > 0 && balance > limit;
                  const seg = segmentInfo(c.segment);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium flex-wrap">
                          {c.name}
                          <span className="text-[10px] text-gray-300 font-normal">#{c.id}</span>
                          {c.notes && <span title={c.notes} className="text-gray-400"><MessageSquare size={12} /></span>}
                          {overLimit && <span title="Excede límite de crédito" className="text-amber-500"><AlertTriangle size={12} /></span>}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {c.document_number === '00000000' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                              Cliente por defecto del sistema
                            </span>
                          )}
                          {c.segment && c.segment !== 'general' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${seg.color}`}>{seg.label}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.document_type} {c.document_number}</td>
                      <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {c.last_purchase_at
                          ? <span className="flex items-center gap-1"><Clock size={11} />{new Date(c.last_purchase_at).toLocaleDateString('es-AR')}</span>
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.points_balance > 0
                          ? <span className="flex items-center gap-1 text-amber-600 font-medium"><Star size={11} />{c.points_balance}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <span className={balance > 0 ? 'text-red-600' : balance < 0 ? 'text-green-700' : 'text-gray-400'}>{fmt(c.balance)}</span>
                        {overLimit && <span className="ml-1 text-xs text-amber-600">(límite: {fmt(c.credit_limit)})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {balance > 0 && (
                            <button onClick={() => setPayModal(c)} title="Registrar pago"
                              className="text-green-600 hover:bg-green-50 p-1 rounded">
                              <DollarSign size={14} />
                            </button>
                          )}
                          <button onClick={() => setAccountModal(c)} title="Ver cuenta y CRM"
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--brand)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-soft)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                            <History size={14} />
                          </button>
                          <button onClick={() => openEdit(c)}
                            className="text-gray-400 p-1 rounded transition-colors"
                            onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                            onMouseLeave={e => e.currentTarget.style.color = ''}>
                            <Edit2 size={14} />
                          </button>
                          {c.document_number !== '00000000' && (
                            <button onClick={() => handleDeactivate(c)} title="Desactivar cliente"
                              className="text-gray-400 p-1 rounded transition-colors"
                              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                              onMouseLeave={e => e.currentTarget.style.color = ''}>
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                <input required value={form.name} onChange={f('name')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo doc.</label>
                <select value={form.document_type} onChange={f('document_type')} className="input">
                  {['DNI', 'CUIT', 'CUIL', 'Pasaporte'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Número</label>
                <input value={form.document_number} onChange={f('document_number')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Teléfono</label>
                <input value={form.phone} onChange={f('phone')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input type="email" value={form.email} onChange={f('email')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Segmento</label>
                <select value={form.segment} onChange={f('segment')} className="input">
                  {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Condición IVA</label>
                <select value={form.iva_condition || 'consumidor_final'} onChange={f('iva_condition')} className="input">
                  <option value="consumidor_final">Consumidor final</option>
                  <option value="responsable_inscripto">Responsable Inscripto</option>
                  <option value="monotributista">Monotributista</option>
                  <option value="exento">Exento</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Cumpleaños</label>
                <input type="date" value={form.birthday} onChange={f('birthday')} className="input" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label>
                <input value={form.address} onChange={f('address')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Límite cta. cte.</label>
                <input type="number" value={form.credit_limit} onChange={f('credit_limit')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Etiquetas</label>
                <input value={form.tags} onChange={f('tags')} className="input" placeholder="fiel, mayorista, local..." />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Preferencias</label>
                <textarea value={form.preferences} onChange={f('preferences')} rows={2}
                  className="input resize-none" placeholder="Prefiere resmas A4, le gusta tal marca..." />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Notas internas</label>
                <textarea value={form.notes} onChange={f('notes')} rows={2}
                  className="input resize-none" placeholder="Observaciones, recordatorios..." />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {accountModal && <AccountModal customer={accountModal} onClose={() => setAccountModal(null)} />}
      {payModal && (
        <PaymentModal customer={payModal} onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); load(); }} />
      )}
      {priceListsModal && <PriceListsModal onClose={() => setPriceListsModal(false)} />}
    </div>
  );
}
