import { useState, useEffect } from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, History, Download, X, ChevronRight, ChevronDown, Layers, ArrowRightLeft, Warehouse } from 'lucide-react';
import { productsApi, reportsApi, locationsApi } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import toast from 'react-hot-toast';

const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
const TYPE_LABELS = { sale: 'Venta', restock: 'Reposición', adjustment: 'Ajuste', cancel: 'Anulación' };
const TYPE_COLORS = { sale: 'text-red-600', restock: 'text-green-600', adjustment: 'text-brand', cancel: 'text-orange-600' };

function stockStatus(stock, min_stock) {
  if (stock <= 0) return { label: 'Sin stock', color: 'bg-red-100 text-red-700' };
  if (stock <= min_stock) return { label: 'Stock bajo', color: 'bg-amber-100 text-amber-700' };
  return { label: 'Normal', color: 'bg-green-100 text-green-700' };
}

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
                    <td className={`px-4 py-2 font-medium ${TYPE_COLORS[m.type] || 'text-gray-700'}`}>{TYPE_LABELS[m.type] || m.type}</td>
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

function AdjustModal({ target, productId, isVariant, onClose, onDone }) {
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const currentStock = target.stock ?? 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isVariant) {
        await productsApi.adjustVariantStock(productId, target.id, { quantity: parseInt(qty), reason });
      } else {
        await productsApi.adjustStock(target.id, { quantity: parseInt(qty), reason });
      }
      toast.success('Stock ajustado');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al ajustar stock');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="font-semibold text-lg mb-1">Ajustar stock</h3>
        <p className="text-sm text-gray-500 mb-4">
          {target.label ?? target.name}
          {isVariant && <span className="ml-1 text-indigo-500 text-xs">(variante)</span>}
          {' '}· Actual: <strong>{currentStock}</strong> u.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Cantidad <span className="text-gray-400 font-normal">(+ ingreso, − egreso)</span>
            </label>
            <input required type="number" value={qty} onChange={e => setQty(e.target.value)}
              className="input text-lg font-semibold" placeholder="ej: 50 o -10" autoFocus />
            {qty && (
              <p className="text-xs text-gray-500 mt-1">
                Nuevo stock: <strong>{currentStock + parseInt(qty || 0)}</strong>
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Motivo</label>
            <input value={reason} onChange={e => setReason(e.target.value)}
              className="input" placeholder="Compra, merma, inventario..." />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {parseInt(qty) > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />} Confirmar
            </button>
          </div>
        </form>
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

function TransferModal({ locations, onClose, onDone }) {
  const [fromId, setFromId] = useState(locations[0]?.id || '');
  const [toId, setToId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [locationStock, setLocationStock] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (fromId) {
      locationsApi.getStock(fromId).then(setLocationStock).catch(() => {});
    }
  }, [fromId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!toId || toId === String(fromId)) return toast.error('Seleccioná un destino distinto al origen');
    setLoading(true);
    try {
      await locationsApi.transfer(fromId, { to_location_id: toId, product_id: productId, quantity: parseFloat(quantity) });
      toast.success('Transferencia realizada');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al transferir');
    } finally { setLoading(false); }
  };

  const toOptions = locations.filter(l => String(l.id) !== String(fromId));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl shadow-xl p-6 max-w-sm w-full" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg flex items-center gap-2" style={{ color: 'var(--ink)' }}><ArrowRightLeft size={18} /> Transferir stock</h3>
          <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Origen</label>
            <select value={fromId} onChange={e => setFromId(e.target.value)} required className="input text-sm">
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Producto</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} required className="input text-sm">
              <option value="">Seleccionar...</option>
              {locationStock.filter(s => s.quantity > 0).map(s => (
                <option key={`${s.product_id}-${s.variant_id}`} value={s.product_id}>
                  {s.product_name}{s.variant_label ? ` (${s.variant_label})` : ''} — {s.quantity} u.
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Destino</label>
            <select value={toId} onChange={e => setToId(e.target.value)} required className="input text-sm">
              <option value="">Seleccionar...</option>
              {toOptions.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>Cantidad</label>
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} required min="0.01" step="0.01"
              className="input text-sm" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-sm">Cancelar</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center text-sm disabled:opacity-60">
              {loading ? 'Transfiriendo...' : 'Transferir'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Stock() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [inventoryValue, setInventoryValue] = useState(null);
  const [historyProduct, setHistoryProduct] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState([]);
  const [activeLocation, setActiveLocation] = useState(null);
  const [locationStock, setLocationStock] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);

  // Expanded variant rows
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [variantData, setVariantData] = useState({});
  const [loadingVariants, setLoadingVariants] = useState(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const [all, low, inv, locs] = await Promise.all([
        productsApi.list({ active: undefined }),
        productsApi.lowStock(),
        reportsApi.inventoryValue(),
        locationsApi.list(),
      ]);
      setProducts(all);
      setLowStock(low);
      setInventoryValue(inv);
      setLocations(locs);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (activeLocation) {
      locationsApi.getStock(activeLocation).then(setLocationStock).catch(() => {});
    } else {
      setLocationStock([]);
    }
  }, [activeLocation]);

  const toggleExpand = async (productId) => {
    const next = new Set(expandedIds);
    if (next.has(productId)) {
      next.delete(productId);
      setExpandedIds(next);
      return;
    }
    next.add(productId);
    setExpandedIds(next);
    if (!variantData[productId]) {
      setLoadingVariants(prev => new Set([...prev, productId]));
      try {
        const { variants } = await productsApi.getVariants(productId);
        setVariantData(prev => ({ ...prev, [productId]: variants }));
      } catch {
        toast.error('Error al cargar variantes');
      } finally {
        setLoadingVariants(prev => { const s = new Set(prev); s.delete(productId); return s; });
      }
    }
  };

  const refreshVariants = async (productId) => {
    try {
      const { variants } = await productsApi.getVariants(productId);
      setVariantData(prev => ({ ...prev, [productId]: variants }));
    } catch {}
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden p-5 gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl font-semibold">Stock e Inventario</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {locations.length > 0 && (
            <select
              value={activeLocation || ''}
              onChange={e => setActiveLocation(e.target.value || null)}
              className="input text-sm py-1.5"
            >
              <option value="">Todos los depósitos</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.is_default ? ' (Principal)' : ''}</option>)}
            </select>
          )}
          {isAdmin && locations.length > 1 && (
            <button onClick={() => setShowTransfer(true)}
              className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
              <ArrowRightLeft size={15} /> Transferir
            </button>
          )}
          <button onClick={() => exportCSV(activeLocation ? locationStock.map(s => ({ ...s, stock: s.quantity })) : products)}
            className="flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50">
            <Download size={15} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Inventory value stats — hardcoded classes to avoid Tailwind purge */}
      {inventoryValue && isAdmin && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl p-3" style={{ backgroundColor: 'var(--brand-soft)', border: '1px solid var(--border)' }}>
            <p className="text-xs font-medium" style={{ color: 'var(--brand)' }}>Total unidades</p>
            <p className="text-xl font-bold mt-0.5" style={{ color: 'var(--brand)' }}>{inventoryValue.total_units}</p>
          </div>
          <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
            <p className="text-xs font-medium text-orange-600">Valor al costo</p>
            <p className="text-xl font-bold text-orange-700 mt-0.5">{fmt(inventoryValue.inventory_cost)}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3">
            <p className="text-xs font-medium text-indigo-600">Valor de venta</p>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">{fmt(inventoryValue.inventory_value)}</p>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-3">
            <p className="text-xs font-medium text-green-600">Margen potencial</p>
            <p className="text-xl font-bold text-green-700 mt-0.5">{fmt(inventoryValue.potential_profit)}</p>
          </div>
        </div>
      )}

      {/* Alert */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={22} className="text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900">
              {lowStock.length === 1
                ? `Stock crítico: ${lowStock[0].name}`
                : `Stock bajo en ${lowStock.length} productos`}
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              {lowStock.length === 1
                ? `${lowStock[0].stock} u. disponibles · mínimo configurado: ${lowStock[0].min_stock} u.`
                : lowStock.map(p => p.name).join(', ')}
            </p>
          </div>
          <button
            onClick={() => {
              const id = lowStock.length === 1 ? lowStock[0].id : lowStock[0].id;
              document.getElementById(`stock-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }}
            className="flex-shrink-0 text-xs font-semibold text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            {lowStock.length === 1 ? 'Ver producto' : `Ver primero (${lowStock.length})`}
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
            <tr>
              <th className="w-8 px-2 py-3" />
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
                  <tr key={i}><td colSpan={8}><div className="h-10 m-2 bg-gray-100 rounded animate-pulse" /></td></tr>
                ))
              : products.map(p => {
                  const status = stockStatus(p.stock, p.min_stock);
                  const isExpanded = expandedIds.has(p.id);
                  const variants = variantData[p.id] ?? [];
                  const isLoadingV = loadingVariants.has(p.id);

                  return [
                    // Product row — id para scroll desde el banner de alerta
                    <tr id={`stock-row-${p.id}`} key={`p-${p.id}`} className={`hover:bg-gray-50 transition-colors ${p.stock <= p.min_stock && !p.has_variants ? 'bg-amber-50/30' : ''}`}>
                      <td className="px-2 py-3 text-center">
                        {!!p.has_variants ? (
                          <button onClick={() => toggleExpand(p.id)}
                            className="text-gray-400 hover:text-indigo-600 transition-colors">
                            {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                          </button>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          {p.name}
                          {!!p.has_variants && (
                            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 font-medium">
                              <Layers size={9} /> variantes
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.code}</td>
                      <td className="px-4 py-3 text-center font-semibold text-lg">
                        {!!p.has_variants ? <span className="text-gray-400 text-sm">—</span> : p.stock}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{!!p.has_variants ? '—' : p.min_stock}</td>
                      <td className="px-4 py-3 text-center">
                        {!p.has_variants && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 text-right text-gray-500">
                          {!!p.has_variants ? '—' : fmt(p.stock * p.cost)}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setHistoryProduct(p)} title="Ver historial"
                            className="p-1 rounded transition-colors"
                            style={{ color: 'var(--brand)' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--brand-soft)'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                            <History size={15} />
                          </button>
                          {isAdmin && !p.has_variants && (
                            <button
                              onClick={() => setAdjustTarget({ target: p, productId: p.id, isVariant: false })}
                              className="text-xs border rounded-lg px-2 py-1 text-gray-500 hover:bg-gray-100">
                              Ajustar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>,

                    // Variant sub-rows
                    isExpanded && (
                      isLoadingV ? (
                        <tr key={`loading-${p.id}`}>
                          <td colSpan={8} className="px-8 py-2 bg-indigo-50/40">
                            <div className="h-4 bg-indigo-100 rounded animate-pulse w-48" />
                          </td>
                        </tr>
                      ) : variants.map(v => {
                        const vs = stockStatus(v.stock, v.min_stock);
                        return (
                          <tr key={`v-${v.id}`} className="bg-indigo-50/30 hover:bg-indigo-50/60 transition-colors">
                            <td className="px-2 py-2" />
                            <td className="px-4 py-2 pl-8 text-indigo-700 text-xs font-medium">
                              ↳ {v.label}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-gray-400">{v.sku || v.barcode || '—'}</td>
                            <td className="px-4 py-2 text-center font-semibold">{v.stock}</td>
                            <td className="px-4 py-2 text-center text-gray-500">{v.min_stock}</td>
                            <td className="px-4 py-2 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${vs.color}`}>
                                {vs.label}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-2 text-right text-gray-400 text-xs">—</td>
                            )}
                            <td className="px-4 py-2">
                              {isAdmin && (
                                <div className="flex justify-end">
                                  <button
                                    onClick={() => setAdjustTarget({ target: v, productId: p.id, isVariant: true })}
                                    className="text-xs border rounded-lg px-2 py-1 text-indigo-500 border-indigo-200 hover:bg-indigo-50">
                                    Ajustar
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ),
                  ];
                })}
          </tbody>
        </table>
      </div>

      {/* Vista por depósito */}
      {activeLocation && (
        <div className="card overflow-auto">
          <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
            <Warehouse size={16} className="text-brand" />
            <span className="text-sm font-medium text-gray-700">
              Stock en: <strong>{locations.find(l => String(l.id) === String(activeLocation))?.name}</strong>
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500">Producto</th>
                <th className="text-left px-4 py-3 text-gray-500 hidden sm:table-cell">Variante</th>
                <th className="text-center px-4 py-3 text-gray-500">Cantidad</th>
                <th className="text-center px-4 py-3 text-gray-500">Mínimo</th>
                <th className="text-center px-4 py-3 text-gray-500">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {locationStock.length === 0
                ? <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin stock registrado en este depósito</td></tr>
                : locationStock.map(s => {
                  const st = stockStatus(s.quantity, s.min_stock);
                  return (
                    <tr key={s.id} className={s.quantity <= s.min_stock ? 'bg-amber-50/30' : ''}>
                      <td className="px-4 py-2.5 font-medium">{s.product_name}</td>
                      <td className="px-4 py-2.5 text-xs text-indigo-600 hidden sm:table-cell">{s.variant_label || '—'}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-lg">{s.quantity}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500">{s.min_stock}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>
      )}

      {adjustTarget && (
        <AdjustModal
          target={adjustTarget.target}
          productId={adjustTarget.productId}
          isVariant={adjustTarget.isVariant}
          onClose={() => setAdjustTarget(null)}
          onDone={() => {
            if (adjustTarget.isVariant) refreshVariants(adjustTarget.productId);
            else load();
          }}
        />
      )}

      {historyProduct && <HistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}

      {showTransfer && (
        <TransferModal
          locations={locations}
          onClose={() => setShowTransfer(false)}
          onDone={() => {
            load();
            if (activeLocation) locationsApi.getStock(activeLocation).then(setLocationStock).catch(() => {});
          }}
        />
      )}
    </div>
  );
}
