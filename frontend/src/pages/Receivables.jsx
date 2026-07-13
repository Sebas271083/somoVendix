import { useState, useEffect, useCallback } from 'react';
import { paymentsApi, customersApi } from '../services/api';
import { DollarSign, Search, ChevronDown, ChevronUp, Send, X, CreditCard, Banknote, ArrowLeftRight } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const METHOD_LABELS = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
};

function PaymentModal({ customer, onClose, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('efectivo');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return toast.error('Ingresá un monto válido');
    setLoading(true);
    try {
      await paymentsApi.create({ customer_id: customer.id, amount: parseFloat(amount), method, notes });
      toast.success('Pago registrado correctamente');
      onSuccess();
    } catch (err) {
      toast.error(err?.error || 'Error al registrar el pago');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Registrar pago</h2>
            <p className="text-sm text-gray-500">{customer.name} · Debe {fmt(customer.balance)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Monto recibido</label>
            <input
              type="number" step="0.01" min="0.01" max={customer.balance}
              value={amount} onChange={e => setAmount(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00" autoFocus
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Método de pago</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {Object.entries(METHOD_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Notas (opcional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Pago cuota enero" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 btn-primary justify-center disabled:opacity-60">
              {loading ? 'Registrando...' : 'Confirmar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function WhatsAppModal({ customer, onClose }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customersApi.accountSummary(customer.id).then(setAccount).finally(() => setLoading(false));
  }, [customer.id]);

  const buildMessage = () => {
    if (!account) return '';
    const sales = account.sales.filter(s => s.status === 'completed').slice(0, 5);
    const lines = [
      `📋 *Resumen de cuenta - ${customer.name}*`,
      `📅 Fecha: ${new Date().toLocaleDateString('es-AR')}`,
      ``,
      `*Últimas compras:*`,
      ...sales.map(s => `• ${new Date(s.created_at).toLocaleDateString('es-AR')} — ${fmt(s.total)}`),
      ``,
      `💰 Total comprado: ${fmt(account.totalPurchased)}`,
      `✅ Total pagado: ${fmt(account.totalPaid)}`,
      `⚠️ *Saldo pendiente: ${fmt(customer.balance)}*`,
      ``,
      `¡Gracias por tu confianza! 🙏`,
    ];
    return lines.join('\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(buildMessage());
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Resumen para WhatsApp</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5">
          {loading ? (
            <p className="text-gray-400 text-center py-6">Cargando...</p>
          ) : (
            <textarea readOnly rows={14}
              className="w-full border rounded-lg p-3 text-sm font-mono bg-gray-50 resize-none"
              value={buildMessage()} />
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={onClose}
              className="flex-1 border rounded-lg py-2 text-gray-600 hover:bg-gray-50">Cerrar</button>
            <button onClick={handleCopy}
              className="flex-1 bg-green-600 text-white rounded-lg py-2 font-medium hover:bg-green-700 flex items-center justify-center gap-2">
              <Send size={16} /> Copiar mensaje
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Receivables() {
  const [data, setData] = useState({ customers: [], total: 0 });
  const [search, setSearch] = useState('');
  const [minBalance, setMinBalance] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [payments, setPayments] = useState({});
  const [payModal, setPayModal] = useState(null);
  const [waModal, setWaModal] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await paymentsApi.receivables({ min_balance: minBalance || 0 });
      setData(res);
    } catch { toast.error('Error al cargar cuentas por cobrar'); }
    finally { setLoading(false); }
  }, [minBalance]);

  useEffect(() => { load(); }, [load]);

  const toggleExpand = async (customerId) => {
    if (expanded === customerId) { setExpanded(null); return; }
    setExpanded(customerId);
    if (!payments[customerId]) {
      try {
        const res = await paymentsApi.byCustomer(customerId);
        setPayments(p => ({ ...p, [customerId]: res.payments }));
      } catch { /* ignore */ }
    }
  };

  const filtered = data.customers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search)
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cuentas por cobrar</h1>
        <p className="text-gray-500 text-sm mt-1">Clientes con saldo deudor pendiente</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-sm text-red-600 font-medium">Total a cobrar</p>
          <p className="text-2xl font-bold text-red-700 mt-1">{fmt(data.total)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-600 font-medium">Clientes con deuda</p>
          <p className="text-2xl font-bold text-blue-700 mt-1">{data.customers.length}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <input type="number" value={minBalance} onChange={e => setMinBalance(e.target.value)}
          placeholder="Saldo mínimo $"
          className="w-36 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={load} className="btn-primary px-4 py-2 text-sm">
          Filtrar
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No hay clientes con deuda</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(customer => (
            <div key={customer.id} className="bg-white border rounded-xl overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm flex-shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-400">{customer.phone || 'Sin teléfono'} · {customer.total_sales} compras</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600 text-lg">{fmt(customer.balance)}</p>
                  <p className="text-xs text-gray-400">saldo deudor</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button onClick={() => setPayModal(customer)}
                    className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                    <DollarSign size={13} /> Cobrar
                  </button>
                  <button onClick={() => setWaModal(customer)}
                    className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-1">
                    <Send size={13} /> WA
                  </button>
                  <button onClick={() => toggleExpand(customer.id)}
                    className="text-gray-400 hover:text-gray-600 p-1">
                    {expanded === customer.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Historial de pagos expandido */}
              {expanded === customer.id && (
                <div className="border-t bg-gray-50 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Últimos pagos</p>
                  {(payments[customer.id] || []).length === 0 ? (
                    <p className="text-sm text-gray-400">Sin pagos registrados</p>
                  ) : (
                    <div className="space-y-1">
                      {(payments[customer.id] || []).slice(0, 5).map(p => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{new Date(p.created_at).toLocaleDateString('es-AR')} · {METHOD_LABELS[p.method]}</span>
                          <span className="font-medium text-green-700">+{fmt(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {payModal && (
        <PaymentModal customer={payModal} onClose={() => setPayModal(null)}
          onSuccess={() => { setPayModal(null); load(); }} />
      )}
      {waModal && (
        <WhatsAppModal customer={waModal} onClose={() => setWaModal(null)} />
      )}
    </div>
  );
}
