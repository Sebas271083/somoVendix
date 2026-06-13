import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, History, DollarSign, Send, X } from 'lucide-react';
import { customersApi, paymentsApi } from '../services/api.js';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;
const EMPTY = { name: '', document_type: 'DNI', document_number: '', email: '', phone: '', address: '', credit_limit: 0 };

function AccountModal({ customer, onClose }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('sales');

  useEffect(() => {
    customersApi.accountSummary(customer.id).then(setData);
  }, [customer.id]);

  const buildWhatsApp = () => {
    if (!data) return '';
    const recent = data.sales.filter(s => s.status === 'completed').slice(0, 5);
    return [
      `📋 *Resumen de cuenta - ${customer.name}*`,
      `📅 ${new Date().toLocaleDateString('es-AR')}`,
      ``,
      `*Últimas compras:*`,
      ...recent.map(s => `• ${new Date(s.created_at).toLocaleDateString('es-AR')} — ${fmt(s.total)}`),
      ``,
      `💰 Total comprado: ${fmt(data.totalPurchased)}`,
      `✅ Total pagado: ${fmt(data.totalPaid)}`,
      `⚠️ *Saldo pendiente: ${fmt(customer.balance)}*`,
      ``,
      `¡Gracias por tu confianza! 🙏`,
    ].join('\n');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">{customer.name}</h2>
            <p className="text-sm text-gray-500">
              {customer.phone} · Saldo: <span className={customer.balance > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>{fmt(customer.balance)}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex gap-1 p-3 border-b">
          {['sales', 'payments', 'whatsapp'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}>
              {t === 'sales' ? 'Historial de compras' : t === 'payments' ? 'Pagos recibidos' : 'WhatsApp'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!data ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : tab === 'sales' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500">Fecha</th>
                  <th className="text-left px-3 py-2 text-gray-500">Ticket #</th>
                  <th className="text-left px-3 py-2 text-gray-500">Método</th>
                  <th className="text-right px-3 py-2 text-gray-500">Total</th>
                  <th className="text-left px-3 py-2 text-gray-500">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.sales.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-gray-400">Sin compras registradas</td></tr>
                ) : data.sales.map(s => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-2 text-gray-500">{new Date(s.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-2">#{s.ticket_number}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{s.payment_method?.replace('_', ' ')}</td>
                    <td className="px-3 py-2 text-right font-semibold">{fmt(s.total)}</td>
                    <td className="px-3 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : tab === 'payments' ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-gray-500">Fecha</th>
                  <th className="text-left px-3 py-2 text-gray-500">Método</th>
                  <th className="text-left px-3 py-2 text-gray-500">Notas</th>
                  <th className="text-right px-3 py-2 text-gray-500">Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.payments.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-gray-400">Sin pagos registrados</td></tr>
                ) : data.payments.map(p => (
                  <tr key={p.id} className="border-t">
                    <td className="px-3 py-2 text-gray-500">{new Date(p.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-3 py-2 capitalize">{p.method}</td>
                    <td className="px-3 py-2 text-gray-500">{p.notes || '—'}</td>
                    <td className="px-3 py-2 text-right font-semibold text-green-700">+{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div>
              <textarea readOnly rows={14}
                className="w-full border rounded-lg p-3 text-sm font-mono bg-gray-50 resize-none"
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold">Registrar pago</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-gray-500">{customer.name} · Saldo: <strong className="text-red-600">{fmt(customer.balance)}</strong></p>
          <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Monto recibido" autoFocus />
          <select value={method} onChange={e => setMethod(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="transferencia">Transferencia</option>
          </select>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border rounded-lg py-2 text-gray-600">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 text-white rounded-lg py-2 font-medium hover:bg-blue-700 disabled:opacity-60">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [accountModal, setAccountModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [loading, setLoading] = useState(false);

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
  const openEdit = (c) => { setEditing(c); setForm(c); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await customersApi.update(editing.id, form); toast.success('Cliente actualizado'); }
      else { await customersApi.create(form); toast.success('Cliente creado'); }
      setShowForm(false); load();
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
  };

  const f = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <button onClick={openCreate} className="btn-primary"><Plus size={16} /> Nuevo cliente</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar clientes..." className="input pl-9" />
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {['Nombre', 'Documento', 'Teléfono', 'Email', 'Saldo c/c', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-500">{c.document_type} {c.document_number}</td>
                    <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                    <td className="px-4 py-3 font-medium">
                      <span className={Number(c.balance) > 0 ? 'text-red-600' : 'text-green-600'}>
                        {fmt(c.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Number(c.balance) > 0 && (
                          <button onClick={() => setPayModal(c)} title="Registrar pago"
                            className="text-green-600 hover:bg-green-50 p-1 rounded">
                            <DollarSign size={14} />
                          </button>
                        )}
                        <button onClick={() => setAccountModal(c)} title="Ver cuenta"
                          className="text-blue-500 hover:bg-blue-50 p-1 rounded">
                          <History size={14} />
                        </button>
                        <button onClick={() => openEdit(c)}
                          className="text-gray-400 hover:text-blue-600 p-1 rounded">
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar cliente' : 'Nuevo cliente'}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                <input required value={form.name} onChange={f('name')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo doc.</label>
                <select value={form.document_type} onChange={f('document_type')} className="input">
                  {['DNI', 'CUIT', 'CUIL', 'Pasaporte'].map(t => <option key={t}>{t}</option>)}
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
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Dirección</label>
                <input value={form.address} onChange={f('address')} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Límite cta. cte.</label>
                <input type="number" value={form.credit_limit} onChange={f('credit_limit')} className="input" />
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
    </div>
  );
}
