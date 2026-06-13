import { useState } from 'react';
import { Trash2, UserPlus, Percent } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import CartItem from './CartItem.jsx';
import PaymentModal from './PaymentModal.jsx';
import CustomerSearch from './CustomerSearch.jsx';

export default function Cart() {
  const {
    items, customer, setCustomer, discount, setDiscount,
    subtotal, discountAmount, tax, total, itemCount, clearCart,
  } = useCart();

  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);

  return (
    <div className="w-72 bg-white border-l border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Ticket actual</h2>
          {itemCount > 0 && (
            <p className="text-xs text-gray-400">{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</p>
          )}
        </div>
        {items.length > 0 && (
          <button
            onClick={clearCart}
            className="text-gray-300 hover:text-red-500 transition-colors"
            title="Vaciar carrito"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {/* Customer */}
      <div className="px-4 py-2 border-b border-gray-50">
        <button
          onClick={() => setShowCustomer(true)}
          className="flex items-center gap-2 w-full text-left"
        >
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold flex-shrink-0">
            {customer?.name?.charAt(0) ?? 'C'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">{customer?.name ?? 'Consumidor Final'}</p>
            <p className="text-[11px] text-blue-500 flex items-center gap-1">
              <UserPlus size={10} /> Cambiar cliente
            </p>
          </div>
        </button>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-300 text-sm gap-2">
            <span className="text-4xl">🛒</span>
            <p>Agregá productos al ticket</p>
          </div>
        ) : (
          items.map((item) => <CartItem key={item.product_id} item={item} />)
        )}
      </div>

      {/* Discount */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <Percent size={14} className="text-gray-400" />
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              className="w-16 px-2 py-1 border border-gray-200 rounded text-sm text-center"
              placeholder="0"
            />
            <span className="text-xs text-gray-500">% descuento global</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="px-4 py-3 border-t border-gray-100 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Subtotal</span>
          <span>$ {subtotal.toLocaleString('es-AR')}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-xs text-green-600">
            <span>Descuentos</span>
            <span>-$ {discountAmount.toLocaleString('es-AR')}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-gray-500">
          <span>IVA 21%</span>
          <span>$ {tax.toLocaleString('es-AR')}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200 mt-1">
          <span>Total</span>
          <span className="text-blue-700">$ {total.toLocaleString('es-AR')}</span>
        </div>
      </div>

      {/* Checkout button */}
      <div className="p-4 pt-0">
        <button
          onClick={() => setShowPayment(true)}
          disabled={!items.length}
          className="btn-success w-full justify-center py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Cobrar $ {total.toLocaleString('es-AR')}
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            setShowPayment(false);
            clearCart();
          }}
        />
      )}

      {showCustomer && (
        <CustomerSearch
          onSelect={(c) => { setCustomer(c); setShowCustomer(false); }}
          onClose={() => setShowCustomer(false)}
        />
      )}
    </div>
  );
}
