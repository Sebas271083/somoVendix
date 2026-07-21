import { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Search, Edit2, ToggleLeft, ToggleRight, History, FileSpreadsheet, X, Image, TrendingUp, Layers, Copy } from 'lucide-react';
import { productsApi, categoriesApi, suppliersApi, imgUrl } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import VariantEditor from '../components/products/VariantEditor.jsx';
import toast from 'react-hot-toast';

const UNITS = ['unidad', 'kg', 'gr', 'litro', 'ml', 'metro', 'm²', 'caja', 'paquete', 'docena', 'rollo', 'par'];

const EMPTY = {
  code: '', name: '', description: '', price: '', cost: '',
  stock: '', min_stock: 5, category_id: '', image_url: '',
  unit: 'unidad', supplier_id: '',
};

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;

// ── Tooltip accesible ──────────────────────────────────────────────
function Tip({ label, children }) {
  return (
    <div className="relative group/tip inline-flex">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1
                      rounded bg-gray-800 text-white text-[11px] whitespace-nowrap shadow-lg
                      opacity-0 group-hover/tip:opacity-100 transition-opacity z-50">
        {label}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800" />
      </div>
    </div>
  );
}

// ── Modal historial de precios ─────────────────────────────────────
function PriceHistoryModal({ product, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productsApi.priceHistory(product.id)
      .then(setHistory)
      .catch(() => toast.error('Error al cargar historial'))
      .finally(() => setLoading(false));
  }, [product.id]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">Historial de precios</h2>
            <p className="text-sm text-gray-500">{product.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <TrendingUp size={28} className="mx-auto mb-2 opacity-30" />
              <p>Sin cambios de precio registrados</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500">Fecha</th>
                  <th className="text-right px-4 py-2 text-gray-500">Costo</th>
                  <th className="text-right px-4 py-2 text-gray-500">Precio</th>
                  <th className="text-left px-4 py-2 text-gray-500">Usuario</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t">
                    <td className="px-4 py-2 text-gray-500 text-xs">{new Date(h.created_at).toLocaleDateString('es-AR')}</td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-gray-400 text-xs">{fmt(h.old_cost)} →</span>{' '}
                      <span className="font-medium">{fmt(h.new_cost)}</span>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className="text-gray-400 text-xs">{fmt(h.old_price)} →</span>{' '}
                      <span className="font-semibold" style={{ color: 'var(--brand)' }}>{fmt(h.new_price)}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 text-xs">{h.user_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="p-4 border-t flex-shrink-0">
          <button onClick={onClose} className="btn-secondary w-full justify-center">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Modal importación CSV ──────────────────────────────────────────
function CSVImportModal({ onClose, onImported }) {
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) { toast.error('El archivo CSV debe tener encabezado y al menos una fila'); return; }
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    const parsed = lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return {
        code: obj.codigo || obj.code || '',
        name: obj.nombre || obj.name || '',
        price: parseFloat(obj.precio || obj.price || 0),
        cost: parseFloat(obj.costo || obj.cost || 0),
        stock: parseInt(obj.stock || 0),
        min_stock: parseInt(obj.stock_minimo || obj.min_stock || 5),
        unit: obj.unidad || obj.unit || 'unidad',
      };
    }).filter(r => r.name);
    setRows(parsed);
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => parseCSV(ev.target.result);
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(10);
    try {
      setProgress(40);
      const res = await productsApi.importCSV(rows);
      setProgress(100);
      setResult(res);
      onImported();
    } catch (err) {
      toast.error(err?.error || 'Error al importar');
      setProgress(0);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = 'codigo,nombre,precio,costo,stock,stock_minimo,unidad\nABC123,Cuaderno A4,1500,800,50,10,unidad\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'plantilla_productos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h2 className="font-semibold text-gray-900">Importar productos desde CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {result ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600">Creados</p>
                </div>
                <div className="rounded-xl p-4 text-center" style={{ backgroundColor: 'var(--brand-soft)' }}>
                  <p className="text-2xl font-bold" style={{ color: 'var(--brand)' }}>{result.updated}</p>
                  <p className="text-xs" style={{ color: 'var(--brand)' }}>Actualizados</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                  <p className="text-xs text-red-600">Errores</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-xl p-3 space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">Fila {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  El CSV debe tener columnas: <code className="bg-gray-100 px-1 rounded text-xs">codigo, nombre, precio, costo, stock, stock_minimo, unidad</code>
                </p>
                <button onClick={downloadTemplate} className="text-xs hover:underline flex-shrink-0 ml-3" style={{ color: 'var(--brand)' }}>
                  Descargar plantilla
                </button>
              </div>

              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors"
                style={{ borderColor: 'var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.backgroundColor = 'var(--brand-soft)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = ''; }}
              >
                <FileSpreadsheet size={32} className="mx-auto mb-2 text-gray-400" />
                <p className="text-gray-600 font-medium">Hacé clic para seleccionar el archivo CSV</p>
                <p className="text-xs text-gray-400 mt-1">Codificación UTF-8</p>
                <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
              </div>

              {importing && (
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Importando productos…</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ backgroundColor: 'var(--brand)', width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {rows.length > 0 && !importing && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">{rows.length} productos detectados — Vista previa:</p>
                  <div className="border border-gray-200 rounded-xl overflow-hidden max-h-52 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 text-gray-500">Código</th>
                          <th className="text-left px-3 py-2 text-gray-500">Nombre</th>
                          <th className="text-right px-3 py-2 text-gray-500">Precio</th>
                          <th className="text-right px-3 py-2 text-gray-500">Costo</th>
                          <th className="text-right px-3 py-2 text-gray-500">Stock</th>
                          <th className="text-left px-3 py-2 text-gray-500">Unidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-1.5 font-mono text-gray-500">{r.code || '—'}</td>
                            <td className="px-3 py-1.5 font-medium text-gray-800">{r.name}</td>
                            <td className="px-3 py-1.5 text-right">{fmt(r.price)}</td>
                            <td className="px-3 py-1.5 text-right text-gray-500">{fmt(r.cost)}</td>
                            <td className="px-3 py-1.5 text-right">{r.stock}</td>
                            <td className="px-3 py-1.5 text-gray-500">{r.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">
            {result ? 'Cerrar' : 'Cancelar'}
          </button>
          {!result && (
            <button onClick={handleImport} disabled={!rows.length || importing}
              className="btn-primary flex-1 justify-center disabled:opacity-50">
              {importing ? 'Importando…' : `Importar ${rows.length} productos`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────
export default function Products() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterActive, setFilterActive] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState(null);
  const [variantProduct, setVariantProduct] = useState(null);
  const [showCSV, setShowCSV] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const imageInputRef = useRef();

  const load = async (s = search) => {
    setLoading(true);
    try {
      const [prods, cats, sups] = await Promise.all([
        productsApi.list({ search: s, active: undefined }),
        categoriesApi.list(),
        suppliersApi.list(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setSuppliers(sups);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    const t = setTimeout(() => load(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Client-side filtering by category and active status
  const displayedProducts = useMemo(() => {
    let list = products;
    if (filterCategory) list = list.filter(p => String(p.category_id) === filterCategory);
    if (filterActive === 'active') list = list.filter(p => p.active);
    if (filterActive === 'inactive') list = list.filter(p => !p.active);
    return list;
  }, [products, filterCategory, filterActive]);

  const openCreate = () => {
    setEditing(null); setForm(EMPTY);
    setImageFile(null); setImagePreview('');
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    const clean = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? '']));
    setForm({ ...EMPTY, ...clean });
    setImageFile(null);
    setImagePreview(imgUrl(p.image_url) || '');
    setShowForm(true);
  };

  const openDuplicate = (p) => {
    setEditing(null);
    const clean = Object.fromEntries(Object.entries(p).map(([k, v]) => [k, v ?? '']));
    setForm({ ...EMPTY, ...clean, code: '', name: `Copia de ${p.name}`, stock: 0 });
    setImageFile(null);
    setImagePreview(imgUrl(p.image_url) || '');
    setShowForm(true);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      let savedId = editing?.id;
      if (editing) {
        await productsApi.update(editing.id, form);
        toast.success('Producto actualizado');
      } else {
        const created = await productsApi.create(form);
        savedId = created.id;
        toast.success('Producto creado');
      }
      if (imageFile && savedId) {
        try {
          await productsApi.uploadImage(savedId, imageFile);
          toast.success('Imagen subida');
        } catch { toast.error('Producto guardado pero la imagen falló'); }
      }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  // Optimistic toggle with 5-second undo
  const toggleActive = (p) => {
    const newActive = !p.active;
    setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: newActive } : x));

    const cancelledRef = { current: false };

    toast(
      (t) => (
        <span className="flex items-center gap-3 text-sm">
          <span>
            <strong>{p.name}</strong>{' '}
            {newActive ? 'activado' : 'desactivado en POS'}
          </span>
          <button
            className="text-xs font-semibold hover:underline flex-shrink-0" style={{ color: 'var(--brand)' }}
            onClick={() => {
              cancelledRef.current = true;
              setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: p.active } : x));
              toast.dismiss(t.id);
            }}
          >
            Deshacer
          </button>
        </span>
      ),
      { duration: 5000, id: `toggle-${p.id}` }
    );

    setTimeout(async () => {
      if (cancelledRef.current) return;
      try {
        await productsApi.update(p.id, { ...p, active: newActive });
      } catch {
        setProducts(prev => prev.map(x => x.id === p.id ? { ...x, active: p.active } : x));
        toast.error('Error al cambiar estado del producto');
      }
    }, 5200);
  };

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));

  const hasFilters = filterCategory || filterActive !== 'all';

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Productos</h1>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={() => setShowCSV(true)} className="btn-secondary">
              <FileSpreadsheet size={15} /> Importar CSV
            </button>
            <button onClick={openCreate} className="btn-primary">
              <Plus size={16} /> Nuevo producto
            </button>
          </div>
        )}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos…" className="input pl-9 w-56" />
        </div>

        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="input w-44 text-sm"
        >
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="input w-36 text-sm"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          <option value="inactive">Solo inactivos</option>
        </select>

        {hasFilters && (
          <button
            onClick={() => { setFilterCategory(''); setFilterActive('all'); }}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={12} /> Limpiar filtros
          </button>
        )}

        {hasFilters && (
          <span className="text-xs text-gray-400">
            {displayedProducts.length} de {products.length} productos
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm table-responsive">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600 w-10" />
              <th className="text-left px-4 py-3 font-medium text-gray-600">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Categoría</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proveedor</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Unidad</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Costo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Precio</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Stock</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">Estado</th>
              {isAdmin && <th className="px-4 py-3 text-gray-600 font-medium text-center">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={11} className="px-4 py-3">
                    <div className="h-4 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : displayedProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-brand-soft/40 transition-colors duration-100 group">
                    {/* Imagen / placeholder con color de categoría */}
                    <td data-label="" className="px-3 py-2">
                      {p.image_url
                        ? <img src={imgUrl(p.image_url)} alt="" className="w-8 h-8 rounded object-cover" />
                        : (
                          <div
                            className="w-8 h-8 rounded flex items-center justify-center"
                            style={{ backgroundColor: p.category_color ? `${p.category_color}25` : '#f3f4f6' }}
                          >
                            <Image size={16} style={{ color: p.category_color || '#9ca3af' }} />
                          </div>
                        )
                      }
                    </td>
                    <td data-label="Código" className="px-4 py-3 font-mono text-xs text-gray-500">{p.code || '—'}</td>
                    <td data-label="Nombre" className="px-4 py-3 font-medium">{p.name}</td>
                    <td data-label="Categoría" className="px-4 py-3">
                      <span className="badge text-white" style={{ backgroundColor: p.category_color || '#9ca3af' }}>
                        {p.category_name || '—'}
                      </span>
                    </td>
                    <td data-label="Proveedor" className="px-4 py-3 text-gray-500 text-xs">{p.supplier_name || '—'}</td>
                    <td data-label="Unidad" className="px-4 py-3 text-gray-500 text-xs">{p.unit || 'unidad'}</td>
                    <td data-label="Costo" className="px-4 py-3 text-right text-gray-500">{fmt(p.cost)}</td>
                    <td data-label="Precio" className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--brand)' }}>{fmt(p.price)}</td>
                    <td data-label="Stock" className="px-4 py-3 text-center">
                      <span className={`badge ${p.stock <= p.min_stock ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                        {p.stock} {p.unit === 'unidad' ? 'u.' : p.unit}
                      </span>
                    </td>
                    <td data-label="Estado" className="px-4 py-3 text-center">
                      {isAdmin ? (
                        <Tip label={p.active ? 'Activo — clic para desactivar' : 'Inactivo — clic para activar'}>
                          <button onClick={() => toggleActive(p)} className={p.active ? 'text-green-500' : 'text-gray-300'}>
                            {p.active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                        </Tip>
                      ) : (
                        <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {p.active ? 'Activo' : 'Inactivo'}
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td data-label="Acciones" className="px-4 py-3">
                        <div className="flex gap-1 justify-center">
                          <Tip label="Ver historial de precios">
                            <button onClick={() => setPriceHistoryProduct(p)}
                              className="p-1.5 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600 transition-colors">
                              <History size={15} />
                            </button>
                          </Tip>
                          <Tip label="Gestionar variantes">
                            <button onClick={() => setVariantProduct(p)}
                              className={`p-1.5 rounded transition-colors ${p.has_variants
                                ? 'text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50'
                                : 'text-gray-300 hover:text-indigo-500 hover:bg-indigo-50'}`}>
                              <Layers size={15} />
                            </button>
                          </Tip>
                          <Tip label="Duplicar producto">
                            <button onClick={() => openDuplicate(p)}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                              <Copy size={15} />
                            </button>
                          </Tip>
                          <Tip label="Editar producto">
                            <button onClick={() => openEdit(p)}
                              className="p-1.5 rounded text-gray-400 transition-colors"
                              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--brand-soft)'; e.currentTarget.style.color = 'var(--brand)'; }}
                              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = ''; }}>
                              <Edit2 size={15} />
                            </button>
                          </Tip>
                        </div>
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
          <div className="rounded-2xl w-full max-w-xl shadow-2xl max-h-[92vh] overflow-y-auto" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editing ? 'Editar producto' : 'Nuevo producto'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">

              {/* Imagen */}
              <div className="flex items-start gap-4">
                <div
                  onClick={() => imageInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden flex-shrink-0 transition-colors"
                  style={{ borderColor: 'var(--border)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--brand)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  {imagePreview
                    ? <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    : <Image size={24} className="text-gray-300" />
                  }
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Imagen del producto</p>
                  <p className="text-xs text-gray-400 mt-0.5">JPG, PNG hasta 5MB. Hacé clic en el cuadro para seleccionar.</p>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setForm(p => ({ ...p, image_url: '' })); }}
                      className="text-xs text-red-500 hover:text-red-700 mt-1">Quitar imagen</button>
                  )}
                </div>
                <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Código</label>
                  <input value={form.code} onChange={f('code')} className="input" placeholder="Ej: ABC123" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Categoría</label>
                  <select value={form.category_id} onChange={f('category_id')} className="input">
                    <option value="">Sin categoría</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Nombre *</label>
                  <input required value={form.name} onChange={f('name')} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Costo</label>
                  <input type="number" min="0" step="0.01" value={form.cost} onChange={f('cost')} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Precio venta *</label>
                  <input required type="number" min="0" step="0.01" value={form.price} onChange={f('price')} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Stock</label>
                  <input type="number" value={form.stock} onChange={f('stock')} className="input" placeholder="0" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Stock mínimo</label>
                  <input type="number" value={form.min_stock} onChange={f('min_stock')} className="input" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Unidad de medida</label>
                  <select value={form.unit} onChange={f('unit')} className="input">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Proveedor principal</label>
                  <select value={form.supplier_id} onChange={f('supplier_id')} className="input">
                    <option value="">Sin proveedor</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                  <textarea value={form.description} onChange={f('description')} rows={2} className="input resize-none" />
                </div>
              </div>

              {form.cost > 0 && form.price > 0 && (
                <div className="bg-green-50 rounded-xl px-4 py-2.5 flex justify-between text-sm">
                  <span className="text-green-700">Margen de ganancia</span>
                  <span className="font-semibold text-green-700">
                    {(((parseFloat(form.price) - parseFloat(form.cost)) / parseFloat(form.cost)) * 100).toFixed(1)}%
                    {' '}·{' '}{fmt(parseFloat(form.price) - parseFloat(form.cost))} por unidad
                  </span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} disabled={saving} className="btn-secondary flex-1 justify-center disabled:opacity-50">Cancelar</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50 gap-2">
                  {saving && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {priceHistoryProduct && (
        <PriceHistoryModal product={priceHistoryProduct} onClose={() => setPriceHistoryProduct(null)} />
      )}

      {variantProduct && (
        <VariantEditor
          product={variantProduct}
          onClose={(changed) => { setVariantProduct(null); if (changed) load(); }}
        />
      )}

      {showCSV && (
        <CSVImportModal onClose={() => setShowCSV(false)} onImported={load} />
      )}
    </div>
  );
}
