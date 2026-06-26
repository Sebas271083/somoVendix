import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

const IVA_RATE = 0.21;
const DEFAULT_CUSTOMER = { id: 1, name: 'Consumidor Final' };

let _tid = 0;
const genId = () => ++_tid;

const makeCartKey = (product_id, variant_id) => `${product_id}__${variant_id ?? 0}`;

function emptyTicket() {
  return { id: genId(), items: [], customer: { ...DEFAULT_CUSTOMER }, discount: 0 };
}

export function CartProvider({ children }) {
  const [tickets, setTickets] = useState(() => [emptyTicket()]);
  const [activeId, setActiveId] = useState(() => _tid);

  const updateActive = useCallback((updater) => {
    setTickets((prev) => prev.map((t) => (t.id === activeId ? { ...t, ...updater(t) } : t)));
  }, [activeId]);

  // ── Operaciones de ítems ──────────────────────────────────
  const addItem = useCallback((product, qty = 1) => {
    const vid = product._variant_id ?? null;
    const key = makeCartKey(product.id, vid);
    updateActive((t) => {
      const existing = t.items.find((i) => i.cartKey === key);
      if (existing) {
        const newQty = existing.quantity + qty;
        return {
          items: t.items.map((i) =>
            i.cartKey === key
              ? { ...i, quantity: newQty, subtotal: newQty * i.unit_price * (1 - (i.item_discount || 0) / 100) }
              : i
          ),
        };
      }
      return {
        items: [
          ...t.items,
          {
            cartKey: key,
            product_id: product.id,
            variant_id: vid,
            variant_label: product._variant_label ?? null,
            name: product.name,
            code: product.code,
            unit_price: product.price,
            quantity: qty,
            item_discount: 0,
            item_notes: '',
            subtotal: product.price * qty,
          },
        ],
      };
    });
  }, [updateActive]);

  const updateQuantity = useCallback((cartKey, quantity) => {
    updateActive((t) => ({
      items: quantity <= 0
        ? t.items.filter((i) => i.cartKey !== cartKey)
        : t.items.map((i) =>
            i.cartKey === cartKey
              ? { ...i, quantity, subtotal: quantity * i.unit_price * (1 - (i.item_discount || 0) / 100) }
              : i
          ),
    }));
  }, [updateActive]);

  const updateItemDiscount = useCallback((cartKey, pct) => {
    const d = Math.min(100, Math.max(0, parseFloat(pct) || 0));
    updateActive((t) => ({
      items: t.items.map((i) =>
        i.cartKey === cartKey
          ? { ...i, item_discount: d, subtotal: i.quantity * i.unit_price * (1 - d / 100) }
          : i
      ),
    }));
  }, [updateActive]);

  const updateItemNotes = useCallback((cartKey, notes) => {
    updateActive((t) => ({
      items: t.items.map((i) =>
        i.cartKey === cartKey ? { ...i, item_notes: notes } : i
      ),
    }));
  }, [updateActive]);

  const removeItem = useCallback((cartKey) => {
    updateActive((t) => ({ items: t.items.filter((i) => i.cartKey !== cartKey) }));
  }, [updateActive]);

  // ── Cliente y descuento global ───────────────────────────
  const setCustomer = useCallback((customer) => {
    updateActive((t) => ({
      customer,
      discount: customer?.segment_discount_pct != null
        ? customer.segment_discount_pct
        : t.discount,
    }));
  }, [updateActive]);

  const setDiscount = useCallback((v) => {
    updateActive(() => ({ discount: Math.min(100, Math.max(0, parseFloat(v) || 0)) }));
  }, [updateActive]);

  const clearCart = useCallback(() => {
    updateActive(() => ({ items: [], customer: { ...DEFAULT_CUSTOMER }, discount: 0 }));
  }, [updateActive]);

  // ── Gestión de tickets ───────────────────────────────────
  const newTicket = useCallback(() => {
    const t = emptyTicket();
    setTickets((prev) => [...prev, t]);
    setActiveId(t.id);
  }, []);

  const switchTicket = useCallback((id) => setActiveId(id), []);

  const closeTicket = useCallback((id) => {
    setTickets((prev) => {
      if (prev.length <= 1) {
        return prev.map((t) =>
          t.id === id ? { ...t, items: [], customer: { ...DEFAULT_CUSTOMER }, discount: 0 } : t
        );
      }
      const remaining = prev.filter((t) => t.id !== id);
      if (id === activeId) {
        const idx = prev.findIndex((t) => t.id === id);
        setActiveId(remaining[Math.min(idx, remaining.length - 1)].id);
      }
      return remaining;
    });
  }, [activeId]);

  // ── Valores derivados del ticket activo ──────────────────
  const active = tickets.find((t) => t.id === activeId) ?? tickets[0];
  const { items, customer, discount } = active;

  const grossSubtotal     = items.reduce((acc, i) => acc + i.unit_price * i.quantity, 0);
  const itemDiscountTotal = items.reduce((acc, i) => acc + (i.unit_price * i.quantity - i.subtotal), 0);
  const subtotal          = grossSubtotal - itemDiscountTotal;
  const discountAmount    = (subtotal * discount) / 100;
  const afterDiscount     = subtotal - discountAmount;
  const tax               = afterDiscount * IVA_RATE;
  const total             = afterDiscount;
  const itemCount         = items.reduce((acc, i) => acc + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items, customer, discount,
        setCustomer, setDiscount,
        addItem, updateQuantity, updateItemDiscount, updateItemNotes, removeItem, clearCart,
        grossSubtotal, itemDiscountTotal, subtotal, discountAmount, tax, total, itemCount,
        tickets, activeId, newTicket, switchTicket, closeTicket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
