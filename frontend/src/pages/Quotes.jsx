import { useState, useEffect, useRef } from 'react';
import { Plus, Eye, Printer, Trash2, Search, X } from 'lucide-react';
import { quotesApi, customersApi, productsApi, settingsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const STATUS_LABEL = { draft: 'Borrador', sent: 'Enviado', accepted: 'Aceptado', rejected: 'Rechazado', expired: 'Vencido' };
const STATUS_COLOR = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-600', expired: 'bg-amber-100 text-amber-700' };

function PrintView({ quote, settings, onClose }) {
  const business = settings?.business_name || 'Mi Negocio';
  const address = settings?.address || '';
  const phone = settings?.phone || '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Presupuesto #{quote.quote_number}</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-primary text-sm px-4 py-2 flex items-center gap-1.5">
              <Printer size={14} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
        </div>
        <div id="quote-print" className="p-6 overflow-y-auto text-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{business}</h2>
              {address && <p className="text-gray-500 text-xs mt-1">{address}</p>}
              {phone && <p className="text-gray-500 text-xs">{phone}</p>}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">Presupuesto</p>
              <p className="text-gray-500 text-xs mt-1">N° {String(quote.quote_number).padStart(4, '0')}</p>
              <p className="text-gray-500 text-xs">{new Date(quote.created_at).toLocaleDateString('es-AR')}</p>
              {quote.valid_until && <p className="text-amber-600 text-xs">Válido hasta: {new Date(quote.valid_until + 'T00:00:00').toLocaleDateString('es-AR')}</p>}
            </div>
          </div>

          {quote.customer_name && (
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="font-medium text-gray-700">{quote.customer_name}</p>
              {quote.customer_phone && <p className="text-gray-500 text-xs">{quote.customer_phone}</p>}
              {quote.customer_address && <p className="text-gray-500 text-xs">{quote.customer_address}</p>}
            </div>
          )}

          <table className="w-full border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-2 text-gray-600">Producto</th>
                <th className="text-center py-2 text-gray-600">Cant.</th>
                <th className="text-right py-2 text-gray-600">Precio unit.</th>
                <th className="text-right py-2 text-gray-600">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {quote.items?.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2">{item.product_name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">$ {Number(item.unit_price).toLocaleString('es-AR')}</td>
                  <td className="py-2 text-right font-medium">$ {Number(item.subtotal).toLocaleString('es-AR')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="ml-auto w-48 space-y-1">
            <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>$ {Number(quote.subtotal).toLocaleString('es-AR')}</span></div>
            {Number(quote.discount) > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-$ {Number(quote.discount).toLocaleString('es-AR')}</span></div>}
            {Number(quote.tax) > 0 && <div className="flex justify-between text-gray-500"><span>IVA 21%</span><span>$ {Number(quote.tax).toLocaleString('es-AR')}</span></div>}
            <div className="flex justify-between font-bold text-lg border-t pt-1"><span>Total</span><span className="text-blue-700">$ {Number(quote.total).toLocaleString('es-AR')}</span></div>
          </div>

          {quote.notes && <p className="mt-4 text-gray-500 text-xs border-t pt-3">{quote.notes}</p>}
          <p className="mt-6 text-center text-gray-400 text-xs">Presupuesto sin validez fiscal · {business}</p>
        </div>
      </div>
    </div>
  );
}

function QuoteForm({ initial, onSave, onClose }) {
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState(initial?.customer_name || '');
  const [selectedCustomer, setSelectedCustomer] = useState(initial?.customer_id ? { id: initial.customer_id, name: initial.customer_name } : null);
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [items, setItems] = useState(initial?.items?.map(i => ({ product_id: i.product_id, product_name: i.product_name, quantity: parseFloat(i.quantity) || 1, unit_price: parseFloat(i.unit_price) || 0, discount: parseFloat(i.discount) || 0, subtotal: parseFloat(i.subtotal) || 0 })) || []);
  const [notes, setNotes] = useState(initial?.notes || '');
  const [validUntil, setValidUntil] = useState(initial?.valid_until?.split('T')[0] || '');
  const [status, setStatus] = useState(initial?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const searchTimer = useRef(null);

  useEffect(() => { customersApi.list('').then(setCustomers).catch(() => {}); }, []);

  const searchProducts = (q) => {
    clearTimeout(searchTimer.current);
    setProductSearch(q);
    if (!q.trim()) { setProductResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try { setProductResults(await productsApi.list({ search: q, limit: 8 })); }
      catch { setProductResults([]); }
    }, 300);
  };

  const addItem = (product) => {
    setItems(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: i.quantity + 1, subtotal: (i.quantity + 1) * i.unit_price }
          : i);
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: parseFloat(product.price) || 0, discount: 0, subtotal: parseFloat(product.price) || 0 }];
    });
    setProductSearch('');
    setProductResults([]);
  };

  const updateItem = (idx, key, val) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [key]: val };
      updated.subtotal = updated.quantity * updated.unit_price * (1 - (updated.discount || 0) / 100);
      return updated;
    }));
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.subtotal) || 0), 0);
  const discount = 0;
  const tax = 0;
  const total = subtotal - discount + tax;

  const handleSave = async () => {
    if (!items.length) return toast.error('Agregá al menos un producto');
    setSaving(true);
    try {
      await onSave({ customer_id: selectedCustomer?.id || null, subtotal, discount, tax, total, notes, valid_until: validUntil || null, status, items });
      onClose();
    } catch (err) { toast.error(err?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold">{initial ? 'Editar presupuesto' : 'Nuevo presupuesto'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Cliente */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Cliente</label>
            <select value={selectedCustomer?.id || ''} onChange={e => {
              const c = customers.find(c => String(c.id) === e.target.value);
              setSelectedCustomer(c || null);
            }} className="input">
              <option value="">Sin cliente</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Buscar producto */}
          <div className="relative">
            <label className="text-sm font-medium text-gray-700 block mb-1">Agregar producto</label>
            <input value={productSearch} onChange={e => searchProducts(e.target.value)}
              placeholder="Buscar por nombre o código..." className="input" />
            {productResults.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 max-h-48 overflow-y-auto">
                {productResults.map(p => (
                  <button key={p.id} onClick={() => addItem(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex justify-between items-center text-sm">
                    <span>{p.name}</span>
                    <span className="text-blue-600 font-medium">$ {Number(p.price).toLocaleString('es-AR')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div className="border rounded-xl divide-y">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2">
                  <span className="flex-1 text-sm">{item.product_name}</span>
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                    className="input w-16 py-1 text-sm text-center" />
                  <input type="number" min="0" value={item.unit_price}
                    onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                    className="input w-28 py-1 text-sm text-right" />
                  <span className="w-28 text-right text-sm font-medium text-blue-700">$ {Number(item.subtotal).toLocaleString('es-AR')}</span>
                  <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                </div>
              ))}
              <div className="flex justify-end px-3 py-2 font-bold text-blue-700">
                Total: $ {total.toLocaleString('es-AR')}
              </div>
            </div>
          )}

          {/* Extra fields */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-600 block mb-1">Válido hasta</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input" />
            </div>
            {initial && (
              <div>
                <label className="text-sm text-gray-600 block mb-1">Estado</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="input">
                  {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="input resize-none" placeholder="Condiciones, observaciones..." />
          </div>
        </div>
        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
            {saving ? 'Guardando...' : 'Guardar presupuesto'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Quotes() {
  const { isAdmin } = useAuth();
  const [quotes, setQuotes] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [printing, setPrinting] = useState(null);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', search: '' });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status) params.status = filters.status;
      setQuotes(await quotesApi.list(params));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); settingsApi.getAll().then(setSettings).catch(() => {}); }, []);
  useEffect(() => { load(); }, [filters.from, filters.to, filters.status]);

  const openPrint = async (q) => {
    const full = await quotesApi.get(q.id);
    setPrinting(full);
  };

  const openEdit = async (q) => {
    const full = await quotesApi.get(q.id);
    setEditing(full);
  };

  const handleCreate = async (data) => {
    await quotesApi.create(data);
    toast.success('Presupuesto creado');
    load();
  };

  const handleUpdate = async (data) => {
    await quotesApi.update(editing.id, data);
    toast.success('Presupuesto actualizado');
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este presupuesto?')) return;
    try { await quotesApi.delete(id); toast.success('Eliminado'); load(); }
    catch (err) { toast.error(err?.error || 'Error'); }
  };

  const filtered = quotes.filter(q => {
    if (!filters.search) return true;
    const s = filters.search.toLowerCase();
    return q.customer_name?.toLowerCase().includes(s) || String(q.quote_number).includes(s);
  });

  const f = (key) => (e) => setFilters(p => ({ ...p, [key]: e.target.value }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-semibold">Presupuestos</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo presupuesto
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={filters.search} onChange={f('search')} placeholder="Buscar cliente o N°..." className="input pl-8 w-52" />
        </div>
        <select value={filters.status} onChange={f('status')} className="input w-auto">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={f('from')} className="input w-auto" placeholder="Desde" />
        <input type="date" value={filters.to} onChange={f('to')} className="input w-auto" placeholder="Hasta" />
      </div>

      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              {['N°', 'Fecha', 'Cliente', 'Vendedor', 'Válido hasta', 'Total', 'Estado', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>)
              : filtered.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">#{String(q.quote_number).padStart(4, '0')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(q.created_at).toLocaleDateString('es-AR')}</td>
                  <td className="px-4 py-3">{q.customer_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{q.user_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{q.valid_until ? new Date(q.valid_until + 'T00:00:00').toLocaleDateString('es-AR') : '—'}</td>
                  <td className="px-4 py-3 font-semibold text-blue-700">$ {Number(q.total).toLocaleString('es-AR')}</td>
                  <td className="px-4 py-3"><span className={`badge ${STATUS_COLOR[q.status]}`}>{STATUS_LABEL[q.status]}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(q)} className="text-gray-400 hover:text-blue-600" title="Editar"><Eye size={15} /></button>
                      <button onClick={() => openPrint(q)} className="text-gray-400 hover:text-indigo-600" title="Ver / Imprimir"><Printer size={15} /></button>
                      {isAdmin && <button onClick={() => handleDelete(q.id)} className="text-gray-400 hover:text-red-600" title="Eliminar"><Trash2 size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {showForm && <QuoteForm onSave={handleCreate} onClose={() => setShowForm(false)} />}
      {editing && <QuoteForm initial={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />}
      {printing && <PrintView quote={printing} settings={settings} onClose={() => setPrinting(null)} />}

      <style>{`@media print { body > *:not(#quote-print) { display: none; } #quote-print { display: block !important; } }`}</style>
    </div>
  );
}
