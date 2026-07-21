import { useState } from 'react';
import { Minus, Plus, Trash2, Percent, MessageSquare } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';

export default function CartItem({ item }) {
  const { updateQuantity, removeItem, updateItemDiscount, updateItemNotes } = useCart();
  const [showNotes, setShowNotes] = useState(false);

  const originalSubtotal = item.unit_price * item.quantity;
  const hasDiscount = item.item_discount > 0;
  const hasNotes = item.item_notes?.trim().length > 0;

  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
      {/* Product name + actions row */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold leading-snug flex-1 min-w-0" style={{ color: 'var(--ink)' }}>
          {item.name}
          {item.variant_label && (
            <span className="ml-1 text-[10px] font-normal text-indigo-500">{item.variant_label}</span>
          )}
        </p>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={() => setShowNotes((v) => !v)}
            title="Nota del ítem"
            className="p-1 rounded transition-colors"
            style={{ color: hasNotes || showNotes ? 'var(--brand)' : 'var(--border)' }}
            onMouseEnter={e => { if (!hasNotes && !showNotes) e.currentTarget.style.color = 'var(--muted)'; }}
            onMouseLeave={e => { if (!hasNotes && !showNotes) e.currentTarget.style.color = 'var(--border)'; }}
          >
            <MessageSquare size={12} />
          </button>
          <button
            onClick={() => removeItem(item.cartKey)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--border)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--border)'}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Unit price */}
      <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
        ${item.unit_price.toLocaleString('es-AR')} c/u
      </p>

      {/* Qty + discount + subtotal */}
      <div className="flex items-center justify-between mt-2 gap-1">
        {/* Qty controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
            className="w-6 h-6 rounded-lg border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <Minus size={10} />
          </button>
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={e => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1) updateQuantity(item.cartKey, v);
            }}
            onFocus={e => { e.target.select(); e.target.style.borderColor = 'var(--brand)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
            className="w-9 text-center text-sm font-bold rounded-lg transition-colors"
            style={{
              color: 'var(--ink)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)',
              outline: 'none',
              padding: '1px 2px',
            }}
          />
          <button
            onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
            className="w-6 h-6 rounded-lg border flex items-center justify-center transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            <Plus size={10} />
          </button>
        </div>

        {/* Discount */}
        <div className="flex items-center gap-0.5" style={{ color: 'var(--muted)' }}>
          <Percent size={9} />
          <input
            type="number"
            min="0"
            max="100"
            value={item.item_discount || ''}
            onChange={(e) => updateItemDiscount(item.cartKey, e.target.value)}
            placeholder="0"
            className="w-9 px-1 py-0.5 rounded-lg text-[11px] text-center bg-transparent"
            style={{ border: '1px solid var(--border)', color: 'var(--ink)' }}
          />
        </div>

        {/* Subtotal */}
        <div className="text-right">
          {hasDiscount && (
            <p className="text-[10px] line-through leading-none" style={{ color: 'var(--muted)' }}>
              ${originalSubtotal.toLocaleString('es-AR')}
            </p>
          )}
          <span className="text-sm font-bold" style={{ color: hasDiscount ? '#16a34a' : 'var(--ink)' }}>
            ${item.subtotal.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {showNotes && (
        <textarea
          rows={2}
          value={item.item_notes || ''}
          onChange={(e) => updateItemNotes(item.cartKey, e.target.value)}
          placeholder="Nota para este producto..."
          className="mt-2 w-full px-2.5 py-1.5 rounded-xl text-xs resize-none focus:outline-none"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg)',
            color: 'var(--ink)',
          }}
          autoFocus
        />
      )}
    </div>
  );
}
