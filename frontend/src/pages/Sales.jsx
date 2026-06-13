import { useState, useEffect } from 'react';
import { Search, Eye, XCircle } from 'lucide-react';
import { salesApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const METHOD_LABEL = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  cuenta_corriente: 'Cta. Cte.',
  mixto: 'Mixto',
};

export default function Sales() {
  const { isAdmin } = useAuth();
  const [sales, setSales] = useState([]);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  });

  const load = async () => {
    setLoading(true);
    try { setSales(await salesApi.list(filters)); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta venta? Se restituirá el stock.')) return;
    try { await salesApi.cancel(id); toast.success('Venta cancelada'); load(); }
    catch (err) { toast.error(err?.error || 'Error'); }
  };

  const total = sales.filter(s => s.status === 'completed').reduce((a, s) => a + Number(s.total), 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Facturación</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Desde</label>
          <input type="date" value={filters.from} onChange={(e) => setFilters(p => ({ ...p, from: e.target.value }))} className="input w-auto" />
          <label className="text-sm text-gray-500">Hasta</label>
          <input type="date" value={filters.to} onChange={(e) => setFilters(p => ({ ...p, to: e.target.value }))} className="input w-auto" />
        </div>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Ventas del período</p>
          <p className="text-2xl font-bold text-gray-900">{sales.filter(s => s.status === 'completed').length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Total facturado</p>
          <p className="text-2xl font-bold text-blue-700">$ {total.toLocaleString('es-AR')}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Canceladas</p>
          <p className="text-2xl font-bold text-red-500">{sales.filter(s => s.status === 'cancelled').length}</p>
        </div>
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
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
              : sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs">#{s.ticket_number}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(s.created_at).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3">{s.customer_name || 'Consumidor Final'}</td>
                    <td className="px-4 py-3 text-gray-500">{s.user_name}</td>
                    <td className="px-4 py-3"><span className="badge bg-blue-100 text-blue-700">{METHOD_LABEL[s.payment_method]}</span></td>
                    <td className="px-4 py-3 font-semibold text-blue-700">$ {Number(s.total).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {s.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => salesApi.get(s.id).then(setDetail)} className="text-gray-400 hover:text-blue-600 transition-colors">
                          <Eye size={15} />
                        </button>
                        {isAdmin && s.status === 'completed' && (
                          <button onClick={() => handleCancel(s.id)} className="text-gray-400 hover:text-red-600 transition-colors">
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
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-5 border-b flex justify-between items-center">
              <h3 className="font-semibold">Ticket #{detail.ticket_number}</h3>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-gray-500">{new Date(detail.created_at).toLocaleString('es-AR')} · {detail.user_name}</div>
              <div className="text-sm font-medium">{detail.customer_name || 'Consumidor Final'}</div>
              <div className="border rounded-lg divide-y">
                {detail.items?.map((item) => (
                  <div key={item.id} className="flex justify-between px-3 py-2 text-sm">
                    <span>{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">$ {Number(item.subtotal).toLocaleString('es-AR')}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>$ {Number(detail.subtotal).toLocaleString('es-AR')}</span></div>
                {Number(detail.discount) > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-$ {Number(detail.discount).toLocaleString('es-AR')}</span></div>}
                <div className="flex justify-between font-bold text-base pt-1 border-t"><span>Total</span><span className="text-blue-700">$ {Number(detail.total).toLocaleString('es-AR')}</span></div>
              </div>
              <p className="text-sm text-gray-500">Pago: <span className="font-medium">{METHOD_LABEL[detail.payment_method]}</span></p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
