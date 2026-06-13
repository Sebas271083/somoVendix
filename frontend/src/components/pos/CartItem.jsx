import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem } = useCart();

  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-800 leading-tight truncate">{item.name}</p>
          <p className="text-[11px] text-gray-400">{item.code} · $ {item.unit_price.toLocaleString('es-AR')} c/u</p>
        </div>
        <button
          onClick={() => removeItem(item.product_id)}
          className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:border-blue-400 transition-colors"
          >
            <Minus size={11} />
          </button>
          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
          <button
            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
            className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center hover:border-blue-400 transition-colors"
          >
            <Plus size={11} />
          </button>
        </div>
        <span className="text-sm font-semibold text-gray-800">
          $ {item.subtotal.toLocaleString('es-AR')}
        </span>
      </div>
    </div>
  );
}
