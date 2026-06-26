import { useState, useEffect } from 'react';
import { X, CreditCard, Banknote, Smartphone, BookOpen, Layers, Star, CalendarDays } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { salesApi, customersApi } from '../../services/api.js';
import ReceiptModal from './ReceiptModal.jsx';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'debito', label: 'Débito', icon: CreditCard },
  { key: 'credito', label: 'Crédito', icon: CreditCard },
  { key: 'transferencia', label: 'Transferencia', icon: Smartphone },
  { key: 'cuenta_corriente', label: 'Cta. Cte.', icon: BookOpen },
  { key: 'mixto', label: 'Mixto', icon: Layers },
  { key: 'cuotas', label: 'Cuotas', icon: CalendarDays },
];

function quickCashAmounts(total) {
  const rounds = [100, 500, 1000, 5000];
  const amounts = rounds.map((r) => Math.ceil(total / r) * r);
  return [...new Set(amounts)].filter((v) => v >= total).slice(0, 4);
}

const SPLIT_METHODS = [
  { key: 'efectivo', label: 'Efectivo' },
  { key: 'debito', label: 'Débito' },
  { key: 'credito', label: 'Crédito' },
  { key: 'transferencia', label: 'Transfer.' },
];

export default function PaymentModal({ onClose, onSuccess }) {
  const { items, customer, grossSubtotal, itemDiscountTotal, subtotal, discountAmount, tax, total, discount } = useCart();
  const [method, setMethod] = useState('efectivo');
  const [cash, setCash] = useState('');
  const [tip, setTip] = useState('');
  const [loading, setLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [nInstallments, setNInstallments] = useState(3);
  const [interestRate, setInterestRate] = useState(0);
  const [split, setSplit] = useState([
    { method: 'efectivo', amount: '' },
    { method: 'debito', amount: '' },
  ]);
  const [pointsInput, setPointsInput] = useState('');
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(false);

  const hasLoyalty = customer?.id && customer.id !== 1 && (customer.points_balance > 0);

  useEffect(() => {
    const pts = parseInt(pointsInput) || 0;
    if (!pts || !hasLoyalty) { setLoyaltyDiscount(0); return; }
    const t = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await customersApi.loyaltyPreview(customer.id, pts);
        setLoyaltyDiscount(res.discount || 0);
      } catch { setLoyaltyDiscount(0); }
      finally { setPreviewLoading(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [pointsInput, customer?.id, hasLoyalty]);

  const tipAmount = parseFloat(tip) || 0;
  const grandTotal = Math.max(0, total + tipAmount - loyaltyDiscount);
  const cashEntered = parseFloat(cash) || 0;
  const change = method === 'efectivo' && cashEntered > 0 ? cashEntered - grandTotal : 0;

  const splitTotal = split.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const splitRemaining = grandTotal - splitTotal;
  const splitValid = Math.abs(splitRemaining) < 0.01;

  const updateSplit = (idx, key, val) => {
    setSplit(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, [key]: val } : r);
      if (key === 'amount' && idx === 0 && next.length === 2) {
        const entered = parseFloat(val) || 0;
        const remaining = grandTotal - entered;
        if (remaining > 0) next[1] = { ...next[1], amount: remaining.toFixed(2) };
        else next[1] = { ...next[1], amount: '' };
      }
      return next;
    });
  };

  const handleConfirm = async () => {
    if (method === 'mixto' && !splitValid) {
      toast.error(`Falta distribuir ${fmt(splitRemaining)}`);
      return;
    }
    setLoading(true);
    try {
      const paymentDetails = method === 'mixto'
        ? { split: split.map(r => ({ method: r.method, amount: parseFloat(r.amount) || 0 })), tip: tipAmount }
        : method === 'efectivo'
          ? { cash: cashEntered, change: Math.max(0, change), tip: tipAmount }
          : { tip: tipAmount };

      const sale = await salesApi.create({
        customer_id: customer?.id || null,
        items: items.map((i) => ({
          product_id: i.product_id,
          variant_id: i.variant_id ?? null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.item_discount || 0,
          subtotal: i.subtotal,
          notes: i.item_notes || null,
        })),
        subtotal,
        discount: discountAmount,
        tax,
        total: grandTotal,
        payment_method: method,
        payment_details: paymentDetails,
        redeem_points: parseInt(pointsInput) || 0,
        ...(method === 'cuotas' ? { installments: { n: nInstallments, interest_rate: interestRate } } : {}),
      });
      toast.success('Venta registrada');
      setCompletedSale(sale);
      onSuccess();
    } catch (err) {
      toast.error(err?.error || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => `$${Number(n || 0).toLocaleString('es-AR')}`;
  const suggestions = quickCashAmounts(grandTotal);

  if (completedSale) {
    return <ReceiptModal sale={completedSale} onClose={onClose} />;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl w-full max-w-md shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>Cobrar venta</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)' }} className="hover:opacity-70 transition-opacity">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resumen */}
          <div className="rounded-xl p-4 space-y-1.5" style={{ backgroundColor: 'var(--bg)' }}>
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>Subtotal</span>
              <span>$ {grossSubtotal.toLocaleString('es-AR')}</span>
            </div>
            {itemDiscountTotal > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desc. por ítem</span>
                <span>-$ {itemDiscountTotal.toLocaleString('es-AR')}</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Desc. global ({discount}%)</span>
                <span>-$ {discountAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm" style={{ color: 'var(--muted)' }}>
              <span>IVA 21%</span>
              <span>$ {tax.toLocaleString('es-AR')}</span>
            </div>
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>Desc. puntos</span>
                <span>-$ {loyaltyDiscount.toLocaleString('es-AR')}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-sm" style={{ color: 'var(--brand)' }}>
                <span>Propina</span>
                <span>+$ {tipAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg pt-1.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--ink)' }}>Total</span>
              <span style={{ color: 'var(--brand)' }}>$ {grandTotal.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink)' }}>Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className="flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors"
                  style={method === key
                    ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }
                    : { borderColor: 'var(--border)', color: 'var(--muted)' }
                  }
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Mixto */}
          {method === 'mixto' && (
            <div className="space-y-3">
              {split.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={row.method}
                    onChange={e => updateSplit(idx, 'method', e.target.value)}
                    className="input flex-1 py-2 text-sm"
                  >
                    {SPLIT_METHODS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={row.amount}
                    onChange={e => updateSplit(idx, 'amount', e.target.value)}
                    placeholder="$ 0"
                    className="input w-32 py-2 text-sm"
                  />
                </div>
              ))}
              <div className={`rounded-lg px-4 py-2.5 flex justify-between items-center text-sm font-semibold ${
                splitValid ? 'bg-green-50 text-green-700' : splitRemaining > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
              }`}>
                <span>{splitValid ? 'Total cubierto' : splitRemaining > 0 ? 'Falta cubrir' : 'Excede total'}</span>
                <span>{splitValid ? fmt(grandTotal) : fmt(Math.abs(splitRemaining))}</span>
              </div>
            </div>
          )}

          {/* Efectivo */}
          {method === 'efectivo' && (
            <div className="space-y-2">
              <label className="text-sm font-medium block" style={{ color: 'var(--ink)' }}>Monto recibido</label>
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder={`$ ${grandTotal.toLocaleString('es-AR')}`}
                className="input"
                autoFocus
              />
              <div className="flex gap-2 flex-wrap">
                {suggestions.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCash(String(amt))}
                    className="px-3 py-1 rounded-lg border text-xs font-medium transition-colors"
                    style={cashEntered === amt
                      ? { borderColor: 'var(--brand)', backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }
                      : { borderColor: 'var(--border)', color: 'var(--muted)' }
                    }
                  >
                    $ {amt.toLocaleString('es-AR')}
                  </button>
                ))}
              </div>
              {cashEntered > 0 && (
                <div className={`rounded-lg px-4 py-2.5 flex justify-between items-center font-semibold ${
                  change >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  <span className="text-sm">{change >= 0 ? 'Vuelto' : 'Falta'}</span>
                  <span className="text-lg">$ {Math.abs(change).toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
          )}

          {/* Cuotas */}
          {method === 'cuotas' && (
            <div className="space-y-3">
              {!customer?.id && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  Se recomienda seleccionar un cliente para vincular las cuotas a su cuenta.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Cantidad de cuotas</label>
                  <select value={nInstallments} onChange={e => setNInstallments(Number(e.target.value))} className="input py-2 text-sm">
                    {[2,3,4,6,9,12,18,24].map(n => <option key={n} value={n}>{n} cuotas</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs block mb-1" style={{ color: 'var(--muted)' }}>Interés total (%)</label>
                  <input type="number" min="0" step="0.5" value={interestRate}
                    onChange={e => setInterestRate(parseFloat(e.target.value) || 0)}
                    className="input py-2 text-sm" />
                </div>
              </div>
              {(() => {
                const total_int = grandTotal * (1 + interestRate / 100);
                const per = total_int / nInstallments;
                return (
                  <div className="rounded-xl p-3 text-sm border" style={{ backgroundColor: 'var(--brand-soft)', borderColor: 'var(--brand)/20' }}>
                    <div className="flex justify-between" style={{ color: 'var(--brand)' }}>
                      <span>Total con interés</span>
                      <span className="font-semibold">$ {total_int.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between mt-1" style={{ color: 'var(--brand)' }}>
                      <span>{nInstallments} cuotas de</span>
                      <span className="font-bold text-base">$ {per.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Puntos de fidelización */}
          {hasLoyalty && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500" />
                  Puntos disponibles: <strong>{customer.points_balance}</strong>
                </span>
                {loyaltyDiscount > 0 && (
                  <span className="text-xs text-green-700 font-semibold">-{fmt(loyaltyDiscount)}</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={customer.points_balance}
                  value={pointsInput}
                  onChange={(e) => setPointsInput(e.target.value)}
                  placeholder="Puntos a canjear"
                  className="input flex-1 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setPointsInput(String(customer.points_balance))}
                  className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                >
                  Usar todos
                </button>
              </div>
              {previewLoading && <p className="text-xs" style={{ color: 'var(--muted)' }}>Calculando descuento...</p>}
            </div>
          )}

          {/* Propina */}
          <div>
            <label className="text-sm font-medium block mb-1" style={{ color: 'var(--ink)' }}>
              Propina <span className="font-normal" style={{ color: 'var(--muted)' }}>(opcional)</span>
            </label>
            <input
              type="number"
              min="0"
              value={tip}
              onChange={(e) => setTip(e.target.value)}
              placeholder="$ 0"
              className="input"
            />
          </div>
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={loading || !items.length || (method === 'efectivo' && cashEntered > 0 && change < 0)}
            className="btn-success flex-1 justify-center disabled:opacity-50"
          >
            {loading ? 'Procesando...' : `Confirmar $ ${grandTotal.toLocaleString('es-AR')}`}
          </button>
        </div>
      </div>
    </div>
  );
}
