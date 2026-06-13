import { useState, useEffect } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight } from 'lucide-react';
import { productsApi, categoriesApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const EMPTY = { code: '', name: '', description: '', price: '', cost: '', stock: '', min_stock: 5, category_id: '', image_url: '' };

export default function Products() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);

  const load = async (s = search) => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([
        productsApi.list({ search: s, active: undefined }),
        categoriesApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, price: p.price, cost: p.cost }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await productsApi.update(editing.id, form);
        toast.success('Producto actualizado');
      } else {
        await productsApi.create(form);
        toast.success('Producto creado');
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.error || 'Error al guardar');
    }
  };

  const toggleActive = async (p) => {
    try {
      await productsApi.update(p.id, { ...p, active: !p.active });
      load();
    } catch { toast.error('Error'); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        {isAdmin && (
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} /> Nuevo producto
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar productos..."
          className="input pl-9"
        />
      </div>

      {/* Table */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Costo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
              {isAdmin && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className="badge text-white"
                        style={{ backgroundColor: p.category_color || '#9ca3af' }}
                      >
                        {p.category_name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">$ {Number(p.cost).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700">$ {Number(p.price).toLocaleString('es-AR')}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${p.stock <= p.min_stock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                        {p.stock} u.
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <button onClick={() => toggleActive(p)} className={p.active ? 'text-green-500' : 'text-gray-300'}>
                          {p.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                        </button>
                      ) : (
                        <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-600 transition-colors">
                          <Edit2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Código</label>
                <input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Categoría</label>
                <select value={form.category_id} onChange={(e) => setForm(p => ({ ...p, category_id: e.target.value }))} className="input">
                  <option value="">Sin categoría</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                <input required value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Costo</label>
                <input type="number" value={form.cost} onChange={(e) => setForm(p => ({ ...p, cost: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Precio venta *</label>
                <input required type="number" value={form.price} onChange={(e) => setForm(p => ({ ...p, price: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Stock inicial</label>
                <input type="number" value={form.stock} onChange={(e) => setForm(p => ({ ...p, stock: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Stock mínimo</label>
                <input type="number" value={form.min_stock} onChange={(e) => setForm(p => ({ ...p, min_stock: e.target.value }))} className="input" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                <textarea value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="input resize-none" />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1 justify-center">Cancelar</button>
                <button type="submit" className="btn-primary flex-1 justify-center">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
