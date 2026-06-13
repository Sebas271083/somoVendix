import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, History, Download, X } from 'lucide-react';
import { productsApi, reportsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const TYPE_LABELS = { sale: 'Venta', restock: 'Reposición', adjustment: 'Ajuste', cancel: 'Anulación' };
const TYPE_COLORS = { sale: 'text-red-600', restock: 'text-green-600', adjustment: 'text-blue-600', cancel: 'text-orange-600' };

function HistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.stockHistory(product.id).then(setHistory).finally(() => setLoading(false));
  }, [product.id]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-gray-900">Historial de stock</h2>
            <p className="text-sm text-gray-500">{product.name} · Stock actual: {product.stock}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Cargando...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Sin movimientos registrados</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500">Fecha</th>
                  <th className="text-left px-4 py-2 text-gray-500">Tipo</th>
                  <th className="text-right px-4 py-2 text-gray-500">Cantidad</th>
                  <th className="text-right px-4 py-2 text-gray-500">Antes</th>
                  <th className="text-right px-4 py-2 text-gray-500">Después</th>
                  <th className="text-left px-4 py-2 text-gray-500">Notas</th>
                </tr>
              </thead>
              <tbody>
                {history.map(m => (
                  <tr key={m.id} className="border-t">
                    <td className="px-4 py-2 text-gray-500">{new Date(m.created_at).toLocaleDateString('es-AR')}</td>
                    <td className={`px-4 py-2 font-medium ${TYPE_COLORS[m.type] || 'text-gray-700'}`}>
                      {TYPE_LABELS[m.type] || m.type}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${m.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {m.quantity > 0 ? '+' : ''}{m.quantity}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-500">{m.before_stock}</td>
                    <td className="px-4 py-2 text-right font-medium">{m.after_stock}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs">{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function exportCSV(products) {
  const rows = products.map(p => ({
    Código: p.code || '',
    Producto: p.name,
    Categoría: p.category_name || '',
    Stock: p.stock,
    StockMínimo: p.min_stock,
    Costo: p.cost,
    Precio: p.price,
    ValorInventario: p.stock * p.cost,
  }));
  const keys = Object.keys(rows[0]);
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${r[k]}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'inventario.csv'; a.click();
}

export default function Stock() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [adjusting, setAdjusting] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [all, low, inv] = await Promise.all([
        productsApi.list({ active: undefined }),
        productsApi.lowStock(),
        reportsApi.inventoryValue(),
      ]);
      setProducts(all);
      setLowStock(low);
      setInventoryValue(inv);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await productsApi.adjustStock(adjusting.id, { quantity: parseInt(qty), reason });
      toast.success('Stock ajustado');
      setAdjusting(null); setQty(''); setReason('');
      load();
    } catch (err) { toast.error(err?.error || 'Error al ajustar stock'); }
  };

  const stockStatus = (p) => {
    if (p.stock <= 0) return { label: 'Sin stock', color: 'bg-red-100 text-red-700' };
    if (p.stock <= p.min_stock) return { label: 'Stock bajo', color: 'bg-amber-100 text-amber-700' };
    return { label: 'Normal', color: 'bg-green-100 text-green-700' };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Stock e Inventario</h1>
        <button onClick={() => exportCSV(products)}
          className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
          <Download size={15} /> Exportar CSV
        </button>
      </div>

      {/* Inventory value stats */}
      {inventoryValue && isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Total unidades', value: inventoryValue.total_units, isAmount: false, color: 'blue' },
            { label: 'Valor al costo', value: inventoryValue.inventory_cost, isAmount: true, color: 'orange' },
            { label: 'Valor de venta', value: inventoryValue.inventory_value, isAmount: true, color: 'indigo' },
            { label: 'Margen potencial', value: inventoryValue.potential_profit, isAmount: true, color: 'green' },
          ].map(({ label, value, isAmount, color }) => (
            <div key={label} className={`bg-${color}-50 border border-${color}-100 rounded-xl p-3`}>
              <p className={`text-xs font-medium text-${color}-600`}>{label}</p>
              <p className={`text-xl font-bold text-${color}-700 mt-0.5`}>{isAmount ? fmt(value) : value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Stock bajo en {lowStock.length} producto{lowStock.length > 1 ? 's' : ''}</p>
            <p className="text-sm text-amber-600">{lowStock.map(p => p.name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Producto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Mínimo</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
              {isAdmin && <th className="text-right px-4 py-3 font-medium text-gray-600">Val. costo</th>}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : products.map(p => {
                  const status = stockStatus(p);
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.stock <= p.min_stock ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-4 py-3 font-medium">{p.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                      <td className="px-4 py-3 text-center font-semibold text-lg">{p.stock}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{p.min_stock}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-gray-500">{fmt(p.stock * p.cost)}</td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setHistoryProduct(p)} title="Ver historial"
                            className="text-blue-400 hover:text-blue-600 hover:bg-blue-50 p-1 rounded">
                            <History size={15} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => { setAdjusting(p); setQty(''); setReason(''); }}
                              className="text-xs border rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">
                              Ajustar
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

      {adjusting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-semibold text-lg mb-1">Ajustar stock</h3>
            <p className="text-sm text-gray-500 mb-4">{adjusting.name} · Actual: <strong>{adjusting.stock}</strong> u.</p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Cantidad <span className="text-gray-400 font-normal">(+ ingreso, − egreso)</span>
                </label>
                <input required type="number" value={qty} onChange={e => setQty(e.target.value)}
                  className="input text-lg font-semibold" placeholder="ej: 50 o -10" />
                {qty && (
                  <p className="text-xs text-gray-500 mt-1">
                    Nuevo stock: <strong>{adjusting.stock + parseInt(qty || 0)}</strong>
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Motivo</label>
                <input value={reason} onChange={e => setReason(e.target.value)}
                  className="input" placeholder="Compra, merma, inventario..." />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setAdjusting(null)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">
                  {parseInt(qty) > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}
    </div>
  );
}
