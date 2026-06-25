import { query, getConnection } from '../config/database.js';

export const CustomerModel = {
  async findAll(search, tenant_id) {
    const params = [tenant_id];
    let baseSql = `
      SELECT c.*,
             MAX(s.created_at) AS last_purchase_at,
             COUNT(CASE WHEN s.status='completed' THEN 1 END) AS purchase_count,
             SUM(CASE WHEN s.status='completed' THEN s.total ELSE 0 END) AS total_purchased
      FROM customers c
      LEFT JOIN sales s ON s.customer_id = c.id AND s.tenant_id = c.tenant_id
      WHERE c.tenant_id = ?
    `;
    if (search) {
      baseSql += ' AND (c.name LIKE ? OR c.document_number LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    baseSql += ' GROUP BY c.id ORDER BY c.name';

    try {
      let sql = `
        SELECT c.*,
               MAX(s.created_at) AS last_purchase_at,
               COUNT(CASE WHEN s.status='completed' THEN 1 END) AS purchase_count,
               SUM(CASE WHEN s.status='completed' THEN s.total ELSE 0 END) AS total_purchased,
               pl.discount_pct AS segment_discount_pct
        FROM customers c
        LEFT JOIN sales s ON s.customer_id = c.id AND s.tenant_id = c.tenant_id
        LEFT JOIN price_lists pl ON pl.tenant_id = c.tenant_id AND pl.segment = c.segment
        WHERE c.tenant_id = ?
      `;
      const p = [tenant_id];
      if (search) {
        sql += ' AND (c.name LIKE ? OR c.document_number LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
        p.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }
      sql += ' GROUP BY c.id ORDER BY c.name';
      return await query(sql, p);
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
        return query(baseSql, params);
      }
      throw err;
    }
  },

  async findById(id) {
    try {
      const rows = await query(
        `SELECT c.*, pl.discount_pct AS segment_discount_pct
         FROM customers c
         LEFT JOIN price_lists pl ON pl.tenant_id = c.tenant_id AND pl.segment = c.segment
         WHERE c.id = ?`,
        [id]
      );
      return rows[0] || null;
    } catch (err) {
      if (err.code === 'ER_NO_SUCH_TABLE') {
        const rows = await query('SELECT * FROM customers WHERE id = ?', [id]);
        return rows[0] || null;
      }
      throw err;
    }
  },

  async findBySegment(segment, tenant_id) {
    const sql = segment === 'all'
      ? 'SELECT * FROM customers WHERE tenant_id = ? AND active = 1'
      : 'SELECT * FROM customers WHERE tenant_id = ? AND segment = ? AND active = 1';
    return query(sql, segment === 'all' ? [tenant_id] : [tenant_id, segment]);
  },

  async create({ name, document_type, document_number, email, phone, address, credit_limit, notes, segment, birthday, tags, preferences, iva_condition, tenant_id }) {
    const result = await query(
      `INSERT INTO customers (tenant_id, name, document_type, document_number, email, phone, address, credit_limit, notes, segment, birthday, tags, preferences, iva_condition)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, name, document_type || 'DNI', document_number || null,
       email || null, phone || null, address || null, credit_limit || 0, notes || null,
       segment || 'general', birthday || null,
       tags ? JSON.stringify(typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : null,
       preferences || null, iva_condition || 'consumidor_final']
    );
    return result.insertId;
  },

  async update(id, { name, document_type, document_number, email, phone, address, credit_limit, notes, segment, birthday, tags, preferences, iva_condition }) {
    await query(
      `UPDATE customers SET name=?, document_type=?, document_number=?, email=?, phone=?, address=?,
       credit_limit=?, notes=?, segment=?, birthday=?, tags=?, preferences=?, iva_condition=?
       WHERE id=?`,
      [name, document_type || 'DNI', document_number, email, phone, address,
       credit_limit || 0, notes ?? null,
       segment || 'general', birthday || null,
       tags ? JSON.stringify(typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : tags) : null,
       preferences || null, iva_condition || 'consumidor_final', id]
    );
  },

  async updateBalance(id, amount, conn) {
    const execute = conn
      ? (sql, p) => conn.execute(sql, p)
      : (sql, p) => query(sql, p);
    await execute('UPDATE customers SET balance = balance + ? WHERE id = ?', [amount, id]);
  },

  async getSalesHistory(customer_id) {
    return query(
      `SELECT s.id, s.ticket_number, s.total, s.subtotal, s.discount,
              s.payment_method, s.status, s.created_at, u.name AS user_name
       FROM sales s LEFT JOIN users u ON s.user_id = u.id
       WHERE s.customer_id = ? ORDER BY s.created_at DESC`,
      [customer_id]
    );
  },

  async getPaymentsHistory(customer_id) {
    return query(
      `SELECT p.*, u.name AS user_name FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.customer_id = ? ORDER BY p.created_at DESC`,
      [customer_id]
    );
  },

  async getMetrics(customer_id) {
    const [[metrics]] = await query(
      `SELECT
         COUNT(CASE WHEN status='completed' THEN 1 END) AS total_purchases,
         SUM(CASE WHEN status='completed' THEN total ELSE 0 END) AS total_spent,
         AVG(CASE WHEN status='completed' THEN total END) AS avg_ticket,
         MIN(CASE WHEN status='completed' THEN created_at END) AS first_purchase,
         MAX(CASE WHEN status='completed' THEN created_at END) AS last_purchase
       FROM sales WHERE customer_id = ?`,
      [customer_id]
    );
    const purchases = metrics.total_purchases || 0;
    const daysSinceFirst = metrics.first_purchase
      ? Math.max(1, Math.ceil((new Date() - new Date(metrics.first_purchase)) / 86400000))
      : 0;
    const frequency = purchases > 1 ? Math.round(daysSinceFirst / purchases) : null;
    const ltv = daysSinceFirst > 0 && metrics.avg_ticket
      ? Math.round((parseFloat(metrics.avg_ticket) * 30) / Math.max(1, frequency || daysSinceFirst))
      : 0;
    return {
      total_purchases: purchases,
      total_spent: parseFloat(metrics.total_spent || 0),
      avg_ticket: parseFloat(metrics.avg_ticket || 0),
      first_purchase: metrics.first_purchase,
      last_purchase: metrics.last_purchase,
      frequency_days: frequency,
      ltv_monthly: ltv,
    };
  },

  async getAccountSummary(customer_id) {
    const customer = await CustomerModel.findById(customer_id);
    const sales = await CustomerModel.getSalesHistory(customer_id);
    const payments = await CustomerModel.getPaymentsHistory(customer_id);
    const metrics = await CustomerModel.getMetrics(customer_id);
    const totalPurchased = sales.filter(s => s.status === 'completed').reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    return { customer, sales, payments, totalPurchased, totalPaid, metrics };
  },

  // Precio list settings
  async getPriceLists(tenant_id) {
    return query('SELECT * FROM price_lists WHERE tenant_id = ? ORDER BY segment', [tenant_id]);
  },

  async updatePriceList(tenant_id, segment, discount_pct) {
    await query(
      `INSERT INTO price_lists (tenant_id, name, segment, discount_pct)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE discount_pct = ?, name = VALUES(name)`,
      [tenant_id, segment, segment, discount_pct, discount_pct]
    );
  },

  // CSV import
  async importMany(customers, tenant_id) {
    const conn = await getConnection();
    const results = { created: 0, updated: 0, errors: [] };
    try {
      await conn.beginTransaction();
      for (const [idx, row] of customers.entries()) {
        try {
          if (!row.name) { results.errors.push({ row: idx + 1, error: 'Nombre requerido' }); continue; }
          const existing = row.document_number
            ? (await conn.execute('SELECT id FROM customers WHERE document_number = ? AND tenant_id = ?', [row.document_number, tenant_id]))[0][0]
            : null;
          if (existing) {
            await conn.execute(
              `UPDATE customers SET name=?, email=?, phone=?, address=?, segment=?, birthday=? WHERE id=?`,
              [row.name, row.email || null, row.phone || null, row.address || null, row.segment || 'general', row.birthday || null, existing.id]
            );
            results.updated++;
          } else {
            await conn.execute(
              `INSERT INTO customers (tenant_id, name, document_type, document_number, email, phone, address, segment, birthday)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [tenant_id, row.name, row.document_type || 'DNI', row.document_number || null,
               row.email || null, row.phone || null, row.address || null, row.segment || 'general', row.birthday || null]
            );
            results.created++;
          }
        } catch (err) {
          results.errors.push({ row: idx + 1, error: err.message });
        }
      }
      await conn.commit();
    } catch (err) {
      await conn.rollback(); throw err;
    } finally { conn.release(); }
    return results;
  },
};
