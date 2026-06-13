import { query, getConnection } from '../config/database.js';

export const SaleModel = {
  async findAll({ from, to, user_id, customer_id, status, tenant_id } = {}) {
    let sql = `
      SELECT s.*, u.name AS user_name, c.name AS customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.tenant_id = ?
    `;
    const params = [tenant_id];
    if (from) { sql += ' AND DATE(s.created_at) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(s.created_at) <= ?'; params.push(to); }
    if (user_id) { sql += ' AND s.user_id = ?'; params.push(user_id); }
    if (customer_id) { sql += ' AND s.customer_id = ?'; params.push(customer_id); }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    sql += ' ORDER BY s.created_at DESC';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT s.*, u.name AS user_name, c.name AS customer_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [id]
    );
    const sale = rows[0];
    if (!sale) return null;
    sale.items = await query(
      `SELECT si.*, p.name AS product_name, p.code AS product_code
       FROM sale_items si JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id]
    );
    return sale;
  },

  async create({
    customer_id, user_id, tenant_id, items,
    subtotal, discount = 0, tax = 0, total,
    payment_method, payment_details, notes = null,
    paid_amount = null,
  }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[{ next_num }]] = await conn.execute(
        `SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_num
         FROM sales WHERE tenant_id = ? AND DATE(created_at) = CURDATE()`,
        [tenant_id]
      );

      const [saleResult] = await conn.execute(
        `INSERT INTO sales
           (tenant_id, ticket_number, customer_id, user_id, subtotal, discount, tax, total,
            payment_method, payment_details, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [tenant_id, next_num, customer_id, user_id, subtotal, discount, tax, total,
         payment_method, JSON.stringify(payment_details || {}), notes]
      );
      const sale_id = saleResult.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, subtotal)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [sale_id, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.subtotal]
        );

        const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const beforeStock = prod?.stock ?? 0;
        const afterStock = beforeStock - item.quantity;

        await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
           VALUES (?, 'sale', ?, ?, ?, ?, 'Venta', ?)`,
          [item.product_id, item.quantity, beforeStock, afterStock, sale_id, user_id]
        );
      }

      const creditAmount = (paid_amount !== null && paid_amount < total)
        ? total - paid_amount
        : (payment_method === 'cuenta_corriente' ? total : 0);

      if (creditAmount > 0 && customer_id) {
        await conn.execute(
          'UPDATE customers SET balance = balance + ? WHERE id = ?',
          [creditAmount, customer_id]
        );
        if (paid_amount !== null && paid_amount > 0) {
          await conn.execute(
            `INSERT INTO payments (tenant_id, customer_id, sale_id, amount, method, notes, user_id)
             VALUES (?, ?, ?, ?, ?, 'Pago parcial al momento de la venta', ?)`,
            [tenant_id, customer_id, sale_id, paid_amount, payment_method === 'mixto' ? 'efectivo' : payment_method, user_id]
          );
        }
      }

      const cashAmount = paid_amount !== null ? paid_amount : (payment_method === 'cuenta_corriente' ? 0 : total);
      if (cashAmount > 0) {
        await conn.execute(
          `INSERT INTO cash_flow (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
           VALUES (?, 'income', ?, ?, 'Ventas', ?, 'sale', ?, ?)`,
          [tenant_id, cashAmount, `Venta #${next_num}`, payment_method, sale_id, user_id]
        );
      }

      await conn.commit();
      return sale_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async cancel(id, user_id) {
    const sale = await SaleModel.findById(id);
    if (!sale || sale.status === 'cancelled') return;
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE sales SET status='cancelled' WHERE id=?", [id]);

      for (const item of sale.items) {
        const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const beforeStock = prod?.stock ?? 0;
        await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        await conn.execute(
          `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
           VALUES (?, 'cancel', ?, ?, ?, ?, 'Anulación de venta', ?)`,
          [item.product_id, item.quantity, beforeStock, beforeStock + item.quantity, id, user_id]
        );
      }

      if (sale.payment_method === 'cuenta_corriente' && sale.customer_id) {
        await conn.execute(
          'UPDATE customers SET balance = balance - ? WHERE id = ?',
          [sale.total, sale.customer_id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getDailySummary(date, tenant_id) {
    return query(
      `SELECT
         payment_method,
         COUNT(*) AS count,
         SUM(total) AS total_amount,
         SUM(discount) AS total_discounts
       FROM sales
       WHERE tenant_id = ? AND DATE(created_at) = ? AND status = 'completed'
       GROUP BY payment_method`,
      [tenant_id, date]
    );
  },
};
