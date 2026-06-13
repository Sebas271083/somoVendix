import { query } from '../config/database.js';

export const CashFlowModel = {
  async findAll({ from, to, type, category, payment_method, tenant_id } = {}) {
    let sql = `
      SELECT cf.*, u.name AS user_name
      FROM cash_flow cf
      LEFT JOIN users u ON cf.user_id = u.id
      WHERE cf.tenant_id = ?
    `;
    const params = [tenant_id];
    if (from)           { sql += ' AND DATE(cf.created_at) >= ?'; params.push(from); }
    if (to)             { sql += ' AND DATE(cf.created_at) <= ?'; params.push(to); }
    if (type)           { sql += ' AND cf.type = ?';              params.push(type); }
    if (category)       { sql += ' AND cf.category = ?';          params.push(category); }
    if (payment_method) { sql += ' AND cf.payment_method = ?';    params.push(payment_method); }
    sql += ' ORDER BY cf.created_at DESC';
    return query(sql, params);
  },

  async create({ type, amount, description, category, payment_method, reference_type, reference_id, user_id, tenant_id }) {
    const result = await query(
      `INSERT INTO cash_flow (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, type, amount, description, category || 'General', payment_method || 'efectivo',
       reference_type || null, reference_id || null, user_id]
    );
    return result.insertId;
  },

  async delete(id) {
    await query('DELETE FROM cash_flow WHERE id = ?', [id]);
  },

  async getDailySummary(date, tenant_id) {
    const rows = await query(
      `SELECT
         SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS total_income,
         SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS total_expense,
         SUM(CASE WHEN type='income'  THEN amount ELSE -amount END) AS balance,
         COUNT(*) AS total_movements
       FROM cash_flow
       WHERE tenant_id = ? AND DATE(created_at) = ?`,
      [tenant_id, date]
    );
    return rows[0];
  },

  async getPeriodSummary(from, to, tenant_id) {
    return query(
      `SELECT
         DATE(created_at) AS date,
         SUM(CASE WHEN type='income'  THEN amount ELSE 0 END) AS income,
         SUM(CASE WHEN type='expense' THEN amount ELSE 0 END) AS expense
       FROM cash_flow
       WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [tenant_id, from, to]
    );
  },

  async getCategoryBreakdown(from, to, type, tenant_id) {
    let sql = `
      SELECT category,
             SUM(amount) AS total,
             COUNT(*) AS count
      FROM cash_flow
      WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?
    `;
    const params = [tenant_id, from, to];
    if (type) { sql += ' AND type = ?'; params.push(type); }
    sql += ' GROUP BY category ORDER BY total DESC';
    return query(sql, params);
  },
};
