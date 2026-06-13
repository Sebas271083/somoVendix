import { useState } from 'react';
import { X, CreditCard, Banknote, Smartphone, BookOpen, Layers } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import { salesApi } from '../../services/api.js';
import toast from 'react-hot-toast';

const PAYMENT_METHODS = [
  { key: 'efectivo', label: 'Efectivo', icon: Banknote },
  { key: 'debito', label: 'Débito', icon: CreditCard },
  { key: 'credito', label: 'Crédito', icon: CreditCard },
  { key: 'transferencia', label: 'Transferencia', icon: Smartphone },
  { key: 'cuenta_corriente', label: 'Cta. Cte.', icon: BookOpen },
  { key: 'mixto', label: 'Mixto', icon: Layers },
];

export default function PaymentModal({ onClose, onSuccess }) {
  const { items, customer, subtotal, discountAmount, tax, total, discount } = useCart();
  const [method, setMethod] = useState('efectivo');
  const [cash, setCash] = useState('');
  const [loading, setLoading] = useState(false);

  const change = method === 'efectivo' && cash ? parseFloat(cash) - total : 0;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await salesApi.create({
        customer_id: customer?.id || null,
        items: items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.item_discount || 0,
          subtotal: i.subtotal,
        })),
        subtotal,
        discount: discountAmount,
        tax,
        total,
        payment_method: method,
        payment_details: method === 'efectivo' ? { cash: parseFloat(cash || 0), change: Math.max(0, change) } : {},
      });
      toast.success('Venta registrada');
      onSuccess();
    } catch (err) {
      toast.error(err?.error || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Cobrar venta</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Resumen */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Subtotal</span>
              <span>$ {subtotal.toLocaleString('es-AR')}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Descuento ({discount}%)</span>
                <span>-$ {discountAmount.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600">
              <span>IVA 21%</span>
              <span>$ {tax.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-1 border-t border-gray-200">
              <span>Total</span>
              <span className="text-blue-700">$ {total.toLocaleString('es-AR')}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Método de pago</p>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setMethod(key)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-xs font-medium transition-colors ${
                    method === key
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Efectivo: campo de monto recibido */}
          {method === 'efectivo' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto recibido</label>
              <input
                type="number"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
                placeholder={`$ ${total.toLocaleString('es-AR')}`}
                className="input"
              />
              {change > 0 && (
                <p className="text-sm text-green-600 font-medium mt-1">
                  Vuelto: $ {change.toLocaleString('es-AR')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
          <button
            onClick={handleConfirm}
            disabled={loading || !items.length}
            className="btn-success flex-1 justify-center disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </div>
  );
}
