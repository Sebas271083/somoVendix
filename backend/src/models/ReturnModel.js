import { query, getConnection } from '../config/database.js';

export const ReturnModel = {
  async create({ tenant_id, sale_id, user_id, items, reason, refund_method, total, type = 'return', replacement_items = [] }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[sale]] = await conn.execute(
        'SELECT * FROM sales WHERE id = ? AND tenant_id = ?',
        [sale_id, tenant_id]
      );
      if (!sale) throw Object.assign(new Error('Venta no encontrada'), { status: 404 });
      if (sale.status === 'cancelled') throw Object.assign(new Error('La venta está cancelada'), { status: 400 });

      for (const item of items) {
        const [[orig]] = await conn.execute(
          'SELECT quantity FROM sale_items WHERE id = ? AND sale_id = ?',
          [item.sale_item_id, sale_id]
        );
        if (!orig) throw Object.assign(new Error(`Ítem ${item.sale_item_id} no pertenece a esta venta`), { status: 400 });
        if (item.quantity > orig.quantity) throw Object.assign(new Error('Cantidad a devolver supera la vendida'), { status: 400 });
      }

      const returnTotal = items.reduce((s, i) => s + i.subtotal, 0);
      const replacementTotal = replacement_items.reduce((s, i) => s + i.subtotal, 0);
      const net = replacementTotal - returnTotal; // >0 cliente paga, <0 se le devuelve

      const [[{ next_cn }]] = await conn.execute(
        'SELECT COALESCE(MAX(credit_note_number), 0) + 1 AS next_cn FROM returns WHERE tenant_id = ?',
        [tenant_id]
      );

      const [result] = await conn.execute(
        `INSERT INTO returns (tenant_id, sale_id, user_id, reason, refund_method, total, type, credit_note_number, credit_note_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [tenant_id, sale_id, user_id, reason || null, refund_method, Math.abs(net || returnTotal), type, next_cn]
      );
      const return_id = result.insertId;

      // Procesar ítems devueltos → restock
      for (const item of items) {
        await conn.execute(
          `INSERT INTO return_items (return_id, sale_item_id, product_id, quantity, unit_price, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [return_id, item.sale_item_id, item.product_id, item.quantity, item.unit_price, item.subtotal]
        );
        const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const before = prod?.stock ?? 0;
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements
             (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
           VALUES (?, 'restock', ?, ?, ?, ?, ?, ?)`,
          [item.product_id, item.quantity, before, before + item.quantity, return_id,
           type === 'exchange' ? 'Cambio por falla' : 'Devolución', user_id]
        );
      }

      // Procesar ítems de reemplazo → descontar stock
      for (const item of replacement_items) {
        const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const before = prod?.stock ?? 0;
        await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements
             (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
           VALUES (?, 'exchange_out', ?, ?, ?, ?, 'Reemplazo por cambio', ?)`,
          [item.product_id, item.quantity, before, before - item.quantity, return_id, user_id]
        );
      }

      // Movimientos de caja según diferencia
      if (type === 'exchange') {
        if (net > 0) {
          // Cliente paga la diferencia
          await conn.execute(
            `INSERT INTO cash_flow
               (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
             VALUES (?, 'income', ?, ?, 'Ventas', ?, 'return', ?, ?)`,
            [tenant_id, net, `Diferencia cambio venta #${sale.ticket_number}`, refund_method, return_id, user_id]
          );
        } else if (net < 0) {
          // Se devuelve la diferencia al cliente
          if (refund_method !== 'cuenta_corriente') {
            await conn.execute(
              `INSERT INTO cash_flow
                 (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
               VALUES (?, 'expense', ?, ?, 'Devoluciones', ?, 'return', ?, ?)`,
              [tenant_id, Math.abs(net), `Diferencia cambio venta #${sale.ticket_number}`, refund_method, return_id, user_id]
            );
          }
        }
        // net === 0 → sin movimiento de caja
      } else {
        // Devolución simple
        if (sale.customer_id) {
          if (refund_method === 'cuenta_corriente' || sale.payment_method === 'cuenta_corriente') {
            await conn.execute(
              'UPDATE customers SET balance = balance - ? WHERE id = ?',
              [returnTotal, sale.customer_id]
            );
          }
        }
        if (refund_method !== 'cuenta_corriente') {
          await conn.execute(
            `INSERT INTO cash_flow
               (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
             VALUES (?, 'expense', ?, ?, 'Devoluciones', ?, 'return', ?, ?)`,
            [tenant_id, returnTotal, `Devolución venta #${sale.ticket_number}`, refund_method, return_id, user_id]
          );
        }
      }

      await conn.commit();
      return return_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async findAll({ tenant_id, from, to } = {}) {
    let sql = `
      SELECT r.*, s.ticket_number, c.name AS customer_name, u.name AS user_name
      FROM returns r
      JOIN sales s ON r.sale_id = s.id
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.tenant_id = ?
    `;
    const params = [tenant_id];
    if (from) { sql += ' AND DATE(r.credit_note_date) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(r.credit_note_date) <= ?'; params.push(to); }
    sql += ' ORDER BY r.id DESC LIMIT 200';
    return query(sql, params);
  },

  async findBySale(sale_id) {
    return query(
      `SELECT r.*, u.name AS user_name,
              JSON_ARRAYAGG(JSON_OBJECT(
                'product_id', ri.product_id,
                'quantity', ri.quantity,
                'unit_price', ri.unit_price,
                'subtotal', ri.subtotal
              )) AS items
       FROM returns r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN return_items ri ON ri.return_id = r.id
       WHERE r.sale_id = ?
       GROUP BY r.id`,
      [sale_id]
    );
  },
};
