import { useState, useEffect } from 'react';
import { Trash2, UserPlus, Percent, Plus, X, ShoppingCart as CartIcon } from 'lucide-react';
import { useCart } from '../../context/CartContext.jsx';
import CartItem from './CartItem.jsx';
import PaymentModal from './PaymentModal.jsx';
import CustomerSearch from './CustomerSearch.jsx';

export default function Cart({ className = '' }) {
  const {
    items, customer, setCustomer, discount, setDiscount,
    grossSubtotal, itemDiscountTotal, subtotal, discountAmount, tax, total, itemCount,
    clearCart,
    tickets, activeId, newTicket, switchTicket, closeTicket,
  } = useCart();

  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      const tag = e.target.tagName;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (e.key === 'F8' && !typing && items.length > 0 && !showPayment) {
        e.preventDefault();
        setShowPayment(true);
      }
      if (e.key === 'F9' && !typing) {
        e.preventDefault();
        newTicket();
      }
      if (e.key === 'Escape' && showPayment) {
        setShowPayment(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [items, showPayment, newTicket]);

  return (
    <div
      className={`w-full md:w-72 flex flex-col h-full pb-16 md:pb-0 ${className}`}
      style={{
        backgroundColor: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-4px 0 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 px-2 pt-2 pb-0 border-b overflow-x-auto"
           style={{ backgroundColor: 'var(--bg)', borderColor: 'var(--border)' }}>
        {tickets.map((t, i) => (
          <div key={t.id} className="flex items-center flex-shrink-0">
            <button
              onClick={() => switchTicket(t.id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg text-xs font-medium transition-colors"
              style={t.id === activeId
                ? { backgroundColor: 'var(--surface)', color: 'var(--brand)', border: '1px solid var(--border)', borderBottom: '1px solid var(--surface)' }
                : { color: 'var(--muted)' }
              }
            >
              <span>T{i + 1}</span>
              {t.items.length > 0 && (
                <span className="text-[9px] px-1 rounded-full"
                      style={t.id === activeId
                        ? { backgroundColor: 'var(--brand-soft)', color: 'var(--brand)' }
                        : { backgroundColor: 'var(--border)', color: 'var(--muted)' }
                      }>
                  {t.items.length}
                </span>
              )}
            </button>
            {tickets.length > 1 && (
              <button
                onClick={() => closeTicket(t.id)}
                className="ml-0.5 hover:text-red-400 transition-colors"
                title="Cerrar ticket"
                style={{ color: 'var(--border)' }}
              >
                <X size={10} />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={newTicket}
          className="flex-shrink-0 ml-1 p-1 rounded-md transition-colors"
          title="Nuevo ticket (F9)"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--brand)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
        >
          <Plus size={13} />
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
           style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Ticket actual</h2>
          {itemCount > 0 && (
            <p className="text-xs" style={{ color: 'var(--muted)' }}>{itemCount} {itemCount === 1 ? 'unidad' : 'unidades'}</p>
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

      {/* Cliente */}
      <div className="px-4 py-2.5 border-b" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setShowCustomer(true)}
          className="flex items-center gap-2.5 w-full text-left rounded-xl px-2.5 py-1.5 transition-colors"
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={customer
              ? { backgroundColor: 'var(--brand)', color: '#fff' }
              : { backgroundColor: 'var(--bg)', color: 'var(--muted)', border: '1px solid var(--border)' }
            }
          >
            {customer?.name?.charAt(0)?.toUpperCase() ?? <UserPlus size={13} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate" style={{ color: customer ? 'var(--ink)' : 'var(--muted)' }}>
              {customer?.name ?? 'Consumidor final'}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--brand)' }}>
              {customer ? 'Cliente con cuenta · cambiar' : 'Agregar cliente'}
            </p>
          </div>
        </button>
      </div>

      {/* Ítems */}
      <div className="flex-1 overflow-y-auto px-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                 style={{ backgroundColor: 'var(--brand-soft)' }}>
              <CartIcon size={24} style={{ color: 'var(--brand)', opacity: 0.6 }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Ticket vacío</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Hacé clic en un producto para agregarlo</p>
            </div>
          </div>
        ) : (
          items.map((item) => <CartItem key={item.cartKey} item={item} />)
        )}
      </div>

      {/* Descuento global */}
      {items.length > 0 && (
        <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2">
            <Percent size={14} style={{ color: 'var(--muted)' }} />
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-16 px-2 py-1 rounded text-sm text-center"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--ink)' }}
              placeholder="0"
            />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>% descuento global</span>
          </div>
        </div>
      )}

      {/* Totales */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>Subtotal</span>
            <span>$ {grossSubtotal.toLocaleString('es-AR')}</span>
          </div>
          {itemDiscountTotal > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Desc. por ítem</span>
              <span>-$ {itemDiscountTotal.toLocaleString('es-AR')}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-xs text-green-600">
              <span>Desc. global ({discount}%)</span>
              <span>-$ {discountAmount.toLocaleString('es-AR')}</span>
            </div>
          )}
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>IVA 21%</span>
            <span>incluido</span>
          </div>
        </div>
        <div className="flex justify-between items-baseline mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Total</span>
          <span className="text-2xl font-bold tracking-tight" style={{ color: 'var(--brand)' }}>
            ${total.toLocaleString('es-AR')}
          </span>
        </div>
      </div>

      {/* Botón cobrar */}
      <div className="p-4 pt-2">
        <button
          onClick={() => setShowPayment(true)}
          disabled={!items.length}
          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-35 disabled:cursor-not-allowed"
          style={{
            fontSize: items.length ? '15px' : '14px',
            backgroundColor: items.length ? '#16a34a' : 'var(--brand)',
            boxShadow: items.length ? '0 4px 20px rgba(22,163,74,0.40)' : 'none',
          }}
          onMouseEnter={e => { if (items.length) e.currentTarget.style.backgroundColor = '#15803d'; }}
          onMouseLeave={e => { if (items.length) e.currentTarget.style.backgroundColor = '#16a34a'; }}
          title="Cobrar (F8)"
        >
          <CartIcon size={16} />
          Cobrar ${total.toLocaleString('es-AR')}
        </button>
      </div>

      {showPayment && (
        <PaymentModal
          onClose={() => setShowPayment(false)}
          onSuccess={() => {
            closeTicket(activeId);
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
