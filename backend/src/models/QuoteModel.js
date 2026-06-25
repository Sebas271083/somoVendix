import { query, getConnection } from '../config/database.js';

export const QuoteModel = {
  async findAll({ tenant_id, from, to, status, customer_id } = {}) {
    let sql = `
      SELECT q.*, u.name AS user_name, c.name AS customer_name
      FROM quotes q
      LEFT JOIN users u ON q.user_id = u.id
      LEFT JOIN customers c ON q.customer_id = c.id
      WHERE q.tenant_id = ?
    `;
    const params = [tenant_id];
    if (from) { sql += ' AND DATE(q.created_at) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(q.created_at) <= ?'; params.push(to); }
    if (status) { sql += ' AND q.status = ?'; params.push(status); }
    if (customer_id) { sql += ' AND q.customer_id = ?'; params.push(customer_id); }
    sql += ' ORDER BY q.id DESC LIMIT 200';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT q.*, u.name AS user_name, c.name AS customer_name, c.email AS customer_email, c.phone AS customer_phone, c.address AS customer_address
       FROM quotes q
       LEFT JOIN users u ON q.user_id = u.id
       LEFT JOIN customers c ON q.customer_id = c.id
       WHERE q.id = ?`,
      [id]
    );
    const quote = rows[0];
    if (!quote) return null;
    quote.items = await query(
      `SELECT qi.*, p.name AS product_name, p.code AS product_code
       FROM quote_items qi JOIN products p ON qi.product_id = p.id
       WHERE qi.quote_id = ?`,
      [id]
    );
    return quote;
  },

  async create({ tenant_id, user_id, customer_id, subtotal, discount, tax, total, notes, valid_until, items }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[{ next_num }]] = await conn.execute(
        'SELECT COALESCE(MAX(quote_number), 0) + 1 AS next_num FROM quotes WHERE tenant_id = ?',
        [tenant_id]
      );

      const [result] = await conn.execute(
        `INSERT INTO quotes (tenant_id, quote_number, customer_id, user_id, subtotal, discount, tax, total, notes, valid_until, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`,
        [tenant_id, next_num, customer_id || null, user_id, subtotal, discount || 0, tax || 0, total, notes || null, valid_until || null]
      );
      const quote_id = result.insertId;

      for (const item of (items || [])) {
        await conn.execute(
          `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, discount, subtotal, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [quote_id, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.subtotal, item.notes || null]
        );
      }

      await conn.commit();
      return quote_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async update(id, { customer_id, subtotal, discount, tax, total, notes, valid_until, status, items }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE quotes SET customer_id=?, subtotal=?, discount=?, tax=?, total=?, notes=?, valid_until=?, status=?
         WHERE id=?`,
        [customer_id || null, subtotal, discount || 0, tax || 0, total, notes || null, valid_until || null, status, id]
      );

      if (items !== undefined) {
        await conn.execute('DELETE FROM quote_items WHERE quote_id = ?', [id]);
        for (const item of items) {
          await conn.execute(
            `INSERT INTO quote_items (quote_id, product_id, quantity, unit_price, discount, subtotal, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, item.product_id, item.quantity, item.unit_price, item.discount || 0, item.subtotal, item.notes || null]
          );
        }
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async delete(id) {
    await query('DELETE FROM quotes WHERE id = ?', [id]);
  },
};
