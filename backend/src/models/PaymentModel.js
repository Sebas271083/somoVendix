import { query, getConnection } from '../config/database.js';

export const PaymentModel = {
  async findByCustomer(customer_id) {
    return query(
      `SELECT p.*, u.name AS user_name, s.ticket_number
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN sales s ON p.sale_id = s.id
       WHERE p.customer_id = ?
       ORDER BY p.created_at DESC`,
      [customer_id]
    );
  },

  async findAll({ customer_id, from, to, tenant_id } = {}) {
    let sql = `
      SELECT p.*, c.name AS customer_name, u.name AS user_name
      FROM payments p
      LEFT JOIN customers c ON p.customer_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.tenant_id = ?
    `;
    const params = [tenant_id];
    if (customer_id) { sql += ' AND p.customer_id = ?'; params.push(customer_id); }
    if (from) { sql += ' AND DATE(p.created_at) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(p.created_at) <= ?'; params.push(to); }
    sql += ' ORDER BY p.created_at DESC';
    return query(sql, params);
  },

  async create({ customer_id, sale_id = null, amount, method, notes, user_id, tenant_id }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO payments (tenant_id, customer_id, sale_id, amount, method, notes, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenant_id, customer_id, sale_id, amount, method, notes || null, user_id]
      );

      await conn.execute(
        'UPDATE customers SET balance = balance - ? WHERE id = ?',
        [amount, customer_id]
      );

      await conn.execute(
        `INSERT INTO cash_flow (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
         VALUES (?, 'income', ?, 'Pago de deuda cliente', 'Cobro deuda', ?, 'payment', ?, ?)`,
        [tenant_id, amount, method, result.insertId, user_id]
      );

      await conn.commit();
      return result.insertId;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getReceivables({ min_balance = 0, tenant_id } = {}) {
    return query(
      `SELECT c.*,
         COUNT(DISTINCT s.id) AS total_sales,
         MAX(s.created_at) AS last_sale_date
       FROM customers c
       LEFT JOIN sales s ON s.customer_id = c.id AND s.status = 'completed'
       WHERE c.tenant_id = ? AND c.balance > ?
       GROUP BY c.id
       ORDER BY c.balance DESC`,
      [tenant_id, min_balance]
    );
  },

  async getTotalReceivables(tenant_id) {
    const rows = await query(
      'SELECT COALESCE(SUM(balance), 0) AS total FROM customers WHERE tenant_id = ? AND balance > 0',
      [tenant_id]
    );
    return rows[0]?.total || 0;
  },
};
