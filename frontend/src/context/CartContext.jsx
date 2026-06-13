import { createContext, useContext, useState, useCallback } from 'react';

const CartContext = createContext(null);

const IVA_RATE = 0.21;

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState({ id: 1, name: 'Consumidor Final' });
  const [discount, setDiscount] = useState(0);

  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + qty, subtotal: (i.quantity + qty) * i.unit_price }
            : i
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          code: product.code,
          unit_price: product.price,
          quantity: qty,
          subtotal: product.price * qty,
          item_discount: 0,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((product_id, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product_id !== product_id));
    } else {
      setItems((prev) =>
        prev.map((i) =>
          i.product_id === product_id
            ? { ...i, quantity, subtotal: quantity * i.unit_price }
            : i
        )
      );
    }
  }, []);

  const removeItem = useCallback((product_id) => {
    setItems((prev) => prev.filter((i) => i.product_id !== product_id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer({ id: 1, name: 'Consumidor Final' });
    setDiscount(0);
  }, []);

  const subtotal = items.reduce((acc, i) => acc + i.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const tax = afterDiscount * IVA_RATE;
  const total = afterDiscount;

  return (
    <CartContext.Provider
      value={{
        items,
        customer,
        setCustomer,
        discount,
        setDiscount,
        addItem,
        updateQuantity,
        removeItem,
        clearCart,
        subtotal,
        discountAmount,
        tax,
        total,
        itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
