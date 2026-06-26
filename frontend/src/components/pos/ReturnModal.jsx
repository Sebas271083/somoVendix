import { useState, useRef } from 'react';
import { X, Search, RotateCcw, ArrowLeftRight, AlertCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { salesApi, returnsApi, productsApi } from '../../services/api.js';
import toast from 'react-hot-toast';

const REFUND_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'debito', label: 'Débito' },
  { key: 'credito', label: 'Crédito' },
  { key: 'transferencia', label: 'Transferencia' },
  { key: 'cuenta_corriente', label: 'Cta. Cte.' },
];

export default function ReturnModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState('return'); // 'return' | 'exchange'

  // — ticket search —
  const [ticketInput, setTicketInput] = useState('');
  const [sale, setSale] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [searching, setSearching] = useState(false);
  const [ticketError, setTicketError] = useState('');

  // — replacement product search (exchange mode) —
  const [replSearch, setReplSearch] = useState('');
  const [replResults, setReplResults] = useState([]);
  const [replSearching, setReplSearching] = useState(false);
  const [replItems, setReplItems] = useState([]); // [{product, quantity}]
  const replRef = useRef(null);

  // — shared —
  const [refundMethod, setRefundMethod] = useState('efectivo');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  // ── ticket search ──────────────────────────────────────────────
  const handleSearch = async () => {
    if (!ticketInput.trim()) return;
    setSearching(true);
    setTicketError('');
    setSale(null);
    try {
      const results = await salesApi.findByTicket(ticketInput.trim());
      if (!results.length) {
        setTicketError(`No se encontró el ticket #${ticketInput}`);
      } else {
        const found = results[0];
        setSale(found);
        const init = {};
        found.items?.forEach((i) => { init[i.id] = 0; });
        setQuantities(init);
        setRefundMethod(found.payment_method === 'cuenta_corriente' ? 'cuenta_corriente' : 'efectivo');
      }
    } catch {
      setTicketError('Error al buscar la venta');
    } finally {
      setSearching(false);
    }
  };

  const setQty = (itemId, value, max) => {
    const qty = Math.min(max, Math.max(0, parseInt(value) || 0));
    setQuantities((prev) => ({ ...prev, [itemId]: qty }));
  };

  const returnItems = sale?.items?.filter((i) => quantities[i.id] > 0) ?? [];
  const returnTotal = returnItems.reduce((acc, i) => acc + quantities[i.id] * parseFloat(i.unit_price), 0);

  // ── replacement search ─────────────────────────────────────────
  const searchRepl = async () => {
    if (!replSearch.trim()) return;
    setReplSearching(true);
    try {
      const results = await productsApi.list({ search: replSearch.trim(), active: true });
      setReplResults(results.slice(0, 10));
    } catch {
      toast.error('Error al buscar productos');
    } finally {
      setReplSearching(false);
    }
  };

  const addReplItem = (product) => {
    setReplItems((prev) => {
      const exists = prev.find((r) => r.product.id === product.id);
      if (exists) return prev.map((r) => r.product.id === product.id ? { ...r, quantity: r.quantity + 1 } : r);
      return [...prev, { product, quantity: 1 }];
    });
    setReplResults([]);
    setReplSearch('');
    replRef.current?.focus();
  };

  const updateReplQty = (productId, delta) => {
    setReplItems((prev) =>
      prev.map((r) => r.product.id === productId ? { ...r, quantity: Math.max(1, r.quantity + delta) } : r)
    );
  };

  const removeReplItem = (productId) => {
    setReplItems((prev) => prev.filter((r) => r.product.id !== productId));
  };

  const replacementTotal = replItems.reduce((acc, r) => acc + r.quantity * parseFloat(r.product.price), 0);
  const net = replacementTotal - returnTotal; // >0 cliente paga, <0 se devuelve

  // ── confirm ────────────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!returnItems.length) { toast.error('Seleccioná al menos un ítem a devolver'); return; }
    if (mode === 'exchange' && !replItems.length) { toast.error('Seleccioná el producto de reemplazo'); return; }

    setLoading(true);
    try {
      await returnsApi.create({
        sale_id: sale.id,
        type: mode,
        items: returnItems.map((i) => ({
          sale_item_id: i.id,
          product_id: i.product_id,
          quantity: quantities[i.id],
          unit_price: parseFloat(i.unit_price),
          subtotal: quantities[i.id] * parseFloat(i.unit_price),
        })),
        replacement_items: mode === 'exchange' ? replItems.map((r) => ({
          product_id: r.product.id,
          quantity: r.quantity,
          unit_price: parseFloat(r.product.price),
          subtotal: r.quantity * parseFloat(r.product.price),
        })) : [],
        refund_method: refundMethod,
        reason: reason.trim() || null,
        total: mode === 'return' ? returnTotal : Math.abs(net),
      });
      toast.success(mode === 'exchange' ? 'Cambio registrado correctamente' : 'Devolución registrada correctamente');
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.error || 'Error al procesar');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => parseFloat(n).toLocaleString('es-AR');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">Gestionar devolución / cambio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Mode tabs */}
        <div className="flex border-b flex-shrink-0">
          <button
            onClick={() => setMode('return')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              mode === 'return' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <RotateCcw size={15} /> Devolución
          </button>
          <button
            onClick={() => setMode('exchange')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors border-b-2 ${
              mode === 'exchange' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowLeftRight size={15} /> Cambio por falla
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Búsqueda de ticket */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Número de ticket</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: 42"
                className="input"
                autoFocus
              />
              <button onClick={handleSearch} disabled={searching} className="btn-primary px-4 flex-shrink-0">
                <Search size={15} />
                {searching ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            {ticketError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle size={14} /> {ticketError}
              </p>
            )}
          </div>

          {sale && (
            <>
              {/* Info de la venta */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm grid grid-cols-2 gap-x-4 gap-y-0.5">
                <span className="text-gray-500">Ticket</span><span className="font-medium text-right">#{sale.ticket_number}</span>
                <span className="text-gray-500">Cliente</span><span className="font-medium text-right">{sale.customer_name || 'Consumidor Final'}</span>
                <span className="text-gray-500">Fecha</span><span className="text-right">{new Date(sale.created_at).toLocaleDateString('es-AR')}</span>
                <span className="text-gray-500">Total original</span><span className="font-semibold text-right">$ {fmt(sale.total)}</span>
              </div>

              {/* Ítems a devolver */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  {mode === 'exchange' ? 'Producto(s) defectuoso(s) a devolver' : 'Ítems a devolver'}
                </p>
                <div className="space-y-2">
                  {sale.items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-xs text-gray-400">Cant.: {item.quantity} · $ {fmt(item.unit_price)} c/u</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-xs text-gray-400">Cant.:</span>
                        <input
                          type="number"
                          min="0"
                          max={item.quantity}
                          value={quantities[item.id] ?? 0}
                          onChange={(e) => setQty(item.id, e.target.value, item.quantity)}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── EXCHANGE MODE: búsqueda de reemplazo ── */}
              {mode === 'exchange' && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Producto(s) de reemplazo</p>

                  {/* Buscador */}
                  <div className="flex gap-2 mb-2">
                    <input
                      ref={replRef}
                      type="text"
                      value={replSearch}
                      onChange={(e) => setReplSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchRepl()}
                      placeholder="Buscar producto de reemplazo..."
                      className="input text-sm"
                    />
                    <button onClick={searchRepl} disabled={replSearching} className="btn-secondary px-3 flex-shrink-0">
                      <Search size={15} />
                    </button>
                  </div>

                  {/* Resultados */}
                  {replResults.length > 0 && (
                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-2">
                      {replResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addReplItem(p)}
                          className="w-full flex items-center justify-between px-3 py-2 hover:bg-blue-50 text-left border-b border-gray-100 last:border-0 transition-colors"
                        >
                          <span className="text-sm font-medium text-gray-800">{p.name}</span>
                          <span className="text-sm text-blue-600 font-semibold ml-2 flex-shrink-0">$ {fmt(p.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Ítems de reemplazo seleccionados */}
                  {replItems.length > 0 && (
                    <div className="space-y-2">
                      {replItems.map(({ product, quantity }) => (
                        <div key={product.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-blue-50 border border-blue-100">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{product.name}</p>
                            <p className="text-xs text-blue-600">$ {fmt(product.price)} c/u</p>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button onClick={() => updateReplQty(product.id, -1)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white">
                              <Minus size={11} />
                            </button>
                            <span className="w-7 text-center text-sm font-medium">{quantity}</span>
                            <button onClick={() => updateReplQty(product.id, 1)} className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center hover:bg-white">
                              <Plus size={11} />
                            </button>
                          </div>
                          <button onClick={() => removeReplItem(product.id)} className="text-red-400 hover:text-red-600 ml-1">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Panel de totales */}
              {mode === 'return' && returnTotal > 0 && (
                <div className="bg-orange-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm font-medium text-orange-700">Total a devolver</span>
                  <span className="text-lg font-bold text-orange-700">$ {fmt(returnTotal)}</span>
                </div>
              )}

              {mode === 'exchange' && (returnTotal > 0 || replItems.length > 0) && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Valor devuelto</span>
                    <span>$ {fmt(returnTotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Valor reemplazo</span>
                    <span>$ {fmt(replacementTotal)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center font-semibold">
                    {net === 0 && <span className="text-gray-700">Cambio exacto — sin diferencia</span>}
                    {net > 0 && (
                      <>
                        <span className="text-blue-700">El cliente abona</span>
                        <span className="text-blue-700 text-base">$ {fmt(net)}</span>
                      </>
                    )}
                    {net < 0 && (
                      <>
                        <span className="text-orange-700">Se devuelve al cliente</span>
                        <span className="text-orange-700 text-base">$ {fmt(Math.abs(net))}</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Método de cobro/devolución — solo si hay movimiento de dinero */}
              {(mode === 'return' || net !== 0) && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {mode === 'exchange' && net > 0 ? 'Método de cobro de diferencia' : 'Método de devolución'}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {REFUND_METHODS.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setRefundMethod(key)}
                        className={`py-2 px-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                          refundMethod === key
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Motivo <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={mode === 'exchange' ? 'Producto defectuoso, desperfecto de fábrica...' : 'Arrepentimiento, producto defectuoso...'}
                  className="input"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-5 border-t flex-shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={!sale || !returnItems.length || (mode === 'exchange' && !replItems.length) || loading}
            className={`flex-1 btn text-white justify-center disabled:opacity-50 ${
              mode === 'exchange' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-400' : 'bg-orange-500 hover:bg-orange-600 focus:ring-orange-400'
            }`}
          >
            {loading
              ? 'Procesando...'
              : mode === 'exchange'
                ? `Confirmar cambio${net > 0 ? ` · cobra $ ${fmt(net)}` : net < 0 ? ` · devuelve $ ${fmt(Math.abs(net))}` : ' · sin diferencia'}`
                : `Confirmar devolución${returnTotal > 0 ? ` $ ${fmt(returnTotal)}` : ''}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
