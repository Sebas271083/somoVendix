import { useState, useEffect } from 'react';
import { Search, Eye, XCircle, Printer } from 'lucide-react';
import { salesApi, settingsApi, usersApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReceiptModal from '../components/pos/ReceiptModal.jsx';
import toast from 'react-hot-toast';

const METHOD_LABEL = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  cuenta_corriente: 'Cta. Cte.',
  mixto: 'Mixto',
  cuotas: 'Cuotas',
};

export default function Sales() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [users, setUsers] = useState([]);
  const [detail, setDetail] = useState(null);
  const [receiptSale, setReceiptSale] = useState(null);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    payment_method: '',
    user_id: '',
    search: '',
  });

  useEffect(() => {
    settingsApi.getAll().then(setSettings).catch(() => {});
    usersApi.list().then(setUsers).catch(() => {});
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { from, to, payment_method, user_id } = filters;
      const params = { from, to };
      if (payment_method) params.payment_method = payment_method;
      if (user_id) params.user_id = user_id;
      setSales(await salesApi.list(params));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters.from, filters.to, filters.payment_method, filters.user_id]);

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta venta? Se restituirá el stock.')) return;
    try { await salesApi.cancel(id); toast.success('Venta cancelada'); load(); }
    catch (err) { toast.error(err?.error || 'Error'); }
  };

  const openDetail = async (sale) => {
    const full = await salesApi.get(sale.id);
    setDetail(full);
  };

  const openReceipt = async (sale) => {
    const full = detail?.id === sale.id ? detail : await salesApi.get(sale.id);
    setReceiptSale(full);
    setDetail(null);
  };

  const datePresets = (() => {
    const toStr = (d) => d.toISOString().split('T')[0];
    const now = new Date();
    const todayStr = toStr(now);
    const ago = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return toStr(d); };
    const weekStart = () => { const d = new Date(); d.setDate(d.getDate() - (d.getDay() || 7) + 1); return toStr(d); };
    const monthStart = () => toStr(new Date(now.getFullYear(), now.getMonth(), 1));
    return [
      { label: 'Hoy',          from: todayStr,    to: todayStr   },
      { label: 'Ayer',         from: ago(1),       to: ago(1)     },
      { label: 'Esta semana',  from: weekStart(),  to: todayStr   },
      { label: 'Este mes',     from: monthStart(), to: todayStr   },
      { label: 'Últ. 30d',    from: ago(30),      to: todayStr   },
    ];
  })();

  const filtered = sales.filter(s => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      if (!s.customer_name?.toLowerCase().includes(q) &&
          !String(s.ticket_number).includes(q)) return false;
    }
    return true;
  });

  const total = filtered.filter(s => s.status === 'completed').reduce((a, s) => a + Number(s.total), 0);
  const f = (key) => (e) => setFilters(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Facturación</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {datePresets.map(p => {
            const active = filters.from === p.from && filters.to === p.to;
            return (
              <button key={p.label}
                onClick={() => setFilters(prev => ({ ...prev, from: p.from, to: p.to }))}
                className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                style={active
                  ? { backgroundColor: 'var(--brand)', color: '#fff', borderColor: 'var(--brand)' }
                  : { backgroundColor: 'var(--surface)', color: 'var(--muted)', borderColor: 'var(--border)' }
                }
                onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; } }}
              >
                {p.label}
              </button>
            );
          })}
          <span className="text-gray-200 select-none">|</span>
          <label className="text-sm text-gray-500">Desde</label>
          <input type="date" value={filters.from} onChange={f('from')} className="input w-auto" />
          <label className="text-sm text-gray-500">Hasta</label>
          <input type="date" value={filters.to} onChange={f('to')} className="input w-auto" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={f('search')}
            placeholder="Buscar cliente o ticket..." className="input pl-8 w-56" />
        </div>
        <select value={filters.payment_method} onChange={f('payment_method')} className="input w-auto">
          <option value="">Todos los métodos</option>
          {Object.entries(METHOD_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {isAdmin && (
          <select value={filters.user_id} onChange={f('user_id')} className="input w-auto">
            <option value="">Todos los vendedores</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Ventas del período</p>
          <p className="text-2xl font-bold text-gray-900">{filtered.filter(s => s.status === 'completed').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturado</p>
          <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>$ {total.toLocaleString('es-AR')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Canceladas</p>
          {(() => { const n = filtered.filter(s => s.status === 'cancelled').length; return (
            <p className={`text-2xl font-bold ${n > 0 ? 'text-red-500' : 'text-gray-400'}`}>{n}</p>
          ); })()}
        </div>
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="border-b sticky top-0" style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
            <tr>
              {['Ticket', 'Fecha', 'Cliente', 'Vendedor', 'Pago', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={8}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">#{s.ticket_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3">{s.customer_name || 'Consumidor Final'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.user_name}</td>
                    <td className="px-4 py-3"><span className="badge bg-brand-soft text-brand">{METHOD_LABEL[s.payment_method] ?? s.payment_method}</span></td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--brand)' }}>$ {Number(s.total).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {s.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openDetail(s)} className="text-gray-400 transition-colors" title="Ver detalle"
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
                          onMouseLeave={e => e.currentTarget.style.color = ''}>
                          <Eye size={15} />
                        </button>
                        {s.status === 'completed' && (
                          <button onClick={() => openReceipt(s)} className="text-gray-400 hover:text-indigo-600 transition-colors" title="Reimprimir ticket">
                            <Printer size={15} />
                          </button>
                        )}
                        {isAdmin && s.status === 'completed' && (
                          <button onClick={() => handleCancel(s.id)} className="text-gray-400 hover:text-red-600 transition-colors" title="Cancelar venta">
                            <XCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>Ticket #{detail.ticket_number}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => openReceipt(detail)} className="btn-secondary text-sm px-3 py-1.5">
                  <Printer size={14} /> Reimprimir
                </button>
                <button onClick={() => setDetail(null)} style={{ color: 'var(--muted)' }} className="hover:opacity-70">✕</button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm" style={{ color: 'var(--muted)' }}>{new Date(detail.created_at).toLocaleString('es-AR')} · {detail.user_name}</div>
              <div className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{detail.customer_name || 'Consumidor Final'}</div>
              <div className="rounded-lg divide-y" style={{ border: '1px solid var(--border)' }}>
                {detail.items?.map((item) => (
                  <div key={item.id} className="flex justify-between px-3 py-2 text-sm" style={{ color: 'var(--ink)', borderColor: 'var(--border)' }}>
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">$ {Number(item.subtotal).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
              <div className="rounded-lg p-3 space-y-1 text-sm" style={{ backgroundColor: 'var(--bg)' }}>
                <div className="flex justify-between" style={{ color: 'var(--muted)' }}><span>Subtotal</span><span>$ {Number(detail.subtotal).toLocaleString('es-AR')}</span></div>
                {Number(detail.discount) > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-$ {Number(detail.discount).toLocaleString('es-AR')}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1 border-t" style={{ borderColor: 'var(--border)' }}><span style={{ color: 'var(--ink)' }}>Total</span><span style={{ color: 'var(--brand)' }}>$ {Number(detail.total).toLocaleString('es-AR')}</span></div>
              </div>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Pago: <span className="font-medium" style={{ color: 'var(--ink)' }}>{METHOD_LABEL[detail.payment_method] ?? detail.payment_method}</span></p>
            </div>
          </div>
        </div>
      )}

      {receiptSale && (
        <ReceiptModal sale={receiptSale} settings={settings} onClose={() => setReceiptSale(null)} />
      )}
    </div>
  );
}
