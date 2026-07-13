import { useState, useEffect } from 'react';
import { Plus, Search, CheckCircle, XCircle, Eye, X, Trash2, ShoppingCart } from 'lucide-react';
import { purchaseOrdersApi, suppliersApi, productsApi } from '../services/api.js';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const STATUS = {
  pending:   { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-700' },
  received:  { label: 'Recibida',   color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelada',  color: 'bg-gray-100 text-gray-500' },
};

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>{s.label}</span>;
}

// ── Formulario de nueva OC ─────────────────────────────────────────
function POForm({ onClose, onSaved }) {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [prodSearch, setProdSearch] = useState('');
  const [prodResults, setProdResults] = useState([]);
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    suppliersApi.list().then(setSuppliers).catch(() => {});
  }, []);

  const searchProducts = async () => {
    if (!prodSearch.trim()) return;
    try {
      const r = await productsApi.list({ search: prodSearch.trim(), active: true });
      setProdResults(r.slice(0, 8));
    } catch { toast.error('Error al buscar productos'); }
  };

  const addItem = (product) => {
    setItems((prev) => {
      const exists = prev.find((i) => i.product_id === product.id);
      if (exists) return prev.map((i) => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product_id: product.id, name: product.name, quantity: 1, unit_cost: parseFloat(product.cost || 0) }];
    });
    setProdResults([]);
    setProdSearch('');
  };

  const updateItem = (idx, field, value) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: parseFloat(value) || 0 } : item));
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const total = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

  const handleSave = async () => {
    if (!items.length) { toast.error('Agregá al menos un producto'); return; }
    setSaving(true);
    try {
      await purchaseOrdersApi.create({
        supplier_id: supplierId || null,
        expected_date: expectedDate || null,
        notes: notes || null,
        items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity, unit_cost: i.unit_cost })),
      });
      toast.success('Orden de compra creada');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al crear la OC');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold">Nueva orden de compra</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Cabecera */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Proveedor</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="input">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha esperada</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="input" />
            </div>
          </div>

          {/* Buscar productos */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Agregar producto</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchProducts()}
                placeholder="Buscar por nombre o código..."
                className="input"
              />
              <button onClick={searchProducts} className="btn-secondary px-3 flex-shrink-0">
                <Search size={15} />
              </button>
            </div>
            {prodResults.length > 0 && (
              <div className="border border-gray-200 rounded-xl mt-2 overflow-hidden">
                {prodResults.map((p) => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full flex justify-between items-center px-4 py-2 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-800">{p.name}</span>
                    <span className="text-gray-400 text-xs">Costo: {fmt(p.cost)} · Stock: {p.stock}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de ítems */}
          {items.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Ítems de la orden</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-500">Producto</th>
                      <th className="text-center px-3 py-2 text-gray-500 w-24">Cantidad</th>
                      <th className="text-right px-3 py-2 text-gray-500 w-32">Costo unitario</th>
                      <th className="text-right px-3 py-2 text-gray-500 w-24">Subtotal</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 font-medium text-gray-800">{item.name}</td>
                        <td className="px-3 py-2">
                          <input type="number" min="1" value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="w-20 mx-auto block px-2 py-1 border border-gray-300 rounded text-center text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" step="0.01" value={item.unit_cost}
                            onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)}
                            className="w-28 ml-auto block px-2 py-1 border border-gray-300 rounded text-right text-sm" />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-700">
                          {fmt(item.quantity * item.unit_cost)}
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t">
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-700">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-gray-900">{fmt(total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." className="input" />
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !items.length} className="btn-primary flex-1 justify-center disabled:opacity-50">
            {saving ? 'Guardando...' : `Crear OC${total > 0 ? ` · ${fmt(total)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista detalle OC ───────────────────────────────────────────────
function PODetail({ po, onClose, onReceive, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">OC #{po.id}</h2>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={po.status} />
              {po.supplier_name && <span className="text-sm text-gray-500">{po.supplier_name}</span>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-gray-500">Fecha creación</span>
            <span className="text-right">{new Date(po.created_at).toLocaleDateString('es-AR')}</span>
            {po.expected_date && <>
              <span className="text-gray-500">Fecha esperada</span>
              <span className="text-right">{new Date(po.expected_date).toLocaleDateString('es-AR')}</span>
            </>}
            {po.received_at && <>
              <span className="text-gray-500">Recibida</span>
              <span className="text-right">{new Date(po.received_at).toLocaleDateString('es-AR')}</span>
            </>}
            <span className="text-gray-500">Creada por</span>
            <span className="text-right">{po.user_name}</span>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Productos</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-gray-500">Producto</th>
                    <th className="text-center px-3 py-2 text-gray-500">Cant.</th>
                    <th className="text-right px-3 py-2 text-gray-500">Costo</th>
                    <th className="text-right px-3 py-2 text-gray-500">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.items || []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="px-3 py-2 font-medium text-gray-800">{item.product_name}
                        <p className="text-xs text-gray-400">Stock actual: {item.current_stock}</p>
                      </td>
                      <td className="px-3 py-2 text-center">{item.quantity}</td>
                      <td className="px-3 py-2 text-right">{fmt(item.unit_cost)}</td>
                      <td className="px-3 py-2 text-right font-semibold">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold">Total</td>
                    <td className="px-3 py-2 text-right font-bold">{fmt(po.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {po.notes && <p className="text-sm text-gray-500 italic">{po.notes}</p>}
        </div>

        {po.status === 'pending' && (
          <div className="flex gap-3 p-5 border-t flex-shrink-0">
            <button onClick={() => onCancel(po.id)} className="btn-secondary flex-1 text-red-600 hover:bg-red-50">
              <XCircle size={15} /> Cancelar OC
            </button>
            <button onClick={() => onReceive(po.id)} className="flex-1 btn bg-green-600 text-white hover:bg-green-700 focus:ring-green-400 justify-center">
              <CheckCircle size={15} /> Marcar recibida
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      setOrders(await purchaseOrdersApi.list(params));
    } catch { toast.error('Error al cargar órdenes'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleReceive = async (id) => {
    try {
      await purchaseOrdersApi.receive(id);
      toast.success('OC recibida — stock actualizado');
      setDetail(null);
      load();
    } catch (err) { toast.error(err?.error || 'Error al recibir la OC'); }
  };

  const handleCancel = async (id) => {
    try {
      await purchaseOrdersApi.cancel(id);
      toast.success('OC cancelada');
      setDetail(null);
      load();
    } catch (err) { toast.error(err?.error || 'Error al cancelar la OC'); }
  };

  const openDetail = async (id) => {
    try { setDetail(await purchaseOrdersApi.get(id)); }
    catch { toast.error('Error al cargar la OC'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de compra</h1>
          <p className="text-gray-500 text-sm mt-1">Gestioná pedidos a proveedores y recepción de mercadería</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} /> Nueva OC
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 mb-4">
        {[['', 'Todas'], ['pending', 'Pendientes'], ['received', 'Recibidas'], ['cancelled', 'Canceladas']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
              statusFilter === v ? 'border-transparent' : 'border-gray-200 hover:border-gray-300'
            }`}
            style={statusFilter === v ? { backgroundColor: 'var(--brand)', color: '#fff' } : { backgroundColor: 'var(--surface)', color: 'var(--ink)' }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Cargando...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-16 text-center">
          <ShoppingCart size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">Sin órdenes de compra</p>
          <p className="text-gray-400 text-sm mt-1">Creá una nueva OC para pedir mercadería a tus proveedores</p>
          <button onClick={() => setShowForm(true)} className="btn-primary mt-4"><Plus size={15} /> Nueva OC</button>
        </div>
      ) : (
        <div className="bg-white border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500">#</th>
                <th className="text-left px-4 py-3 text-gray-500">Proveedor</th>
                <th className="text-left px-4 py-3 text-gray-500">Ítems</th>
                <th className="text-left px-4 py-3 text-gray-500">Estado</th>
                <th className="text-right px-4 py-3 text-gray-500">Total</th>
                <th className="text-left px-4 py-3 text-gray-500">Fecha</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-gray-500">#{po.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{po.supplier_name || <span className="text-gray-400 italic">Sin proveedor</span>}</td>
                  <td className="px-4 py-3 text-gray-500">{po.item_count} ítem{po.item_count !== 1 ? 's' : ''}</td>
                  <td className="px-4 py-3"><StatusBadge status={po.status} /></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{fmt(po.total)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(po.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-2 py-3">
                    <button onClick={() => openDetail(po.id)} className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <POForm onClose={() => setShowForm(false)} onSaved={load} />}
      {detail && (
        <PODetail
          po={detail}
          onClose={() => setDetail(null)}
          onReceive={handleReceive}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
