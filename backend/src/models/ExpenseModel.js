import { query, getConnection } from '../config/database.js';

export const ExpenseModel = {
  async findAll({ status, category, supplier_id, from, to, tenant_id } = {}) {
    let sql = `
      SELECT e.*, s.name AS supplier_name
      FROM expenses e
      LEFT JOIN suppliers s ON e.supplier_id = s.id
      WHERE e.tenant_id = ?
    `;
    const params = [tenant_id];
    if (status)      { sql += ' AND e.status = ?';      params.push(status); }
    if (category)    { sql += ' AND e.category = ?';    params.push(category); }
    if (supplier_id) { sql += ' AND e.supplier_id = ?'; params.push(supplier_id); }
    if (from)        { sql += ' AND e.due_date >= ?';   params.push(from); }
    if (to)          { sql += ' AND e.due_date <= ?';   params.push(to); }
    sql += ' ORDER BY e.due_date ASC, e.created_at DESC';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT e.*, s.name AS supplier_name FROM expenses e
       LEFT JOIN suppliers s ON e.supplier_id = s.id WHERE e.id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async create({ description, amount, category, due_date, supplier_id, is_recurring, recurrence_period, payment_method, notes, user_id, tenant_id }) {
    const result = await query(
      `INSERT INTO expenses (tenant_id, description, amount, category, due_date, status, supplier_id, is_recurring, recurrence_period, payment_method, notes, user_id)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`,
      [tenant_id, description, amount, category || 'General', due_date || null, supplier_id || null,
       is_recurring ? 1 : 0, recurrence_period || 'monthly', payment_method || 'efectivo', notes || null, user_id]
    );
    return result.insertId;
  },

  async update(id, fields) {
    const allowed = ['description', 'amount', 'category', 'due_date', 'status', 'paid_at', 'supplier_id', 'is_recurring', 'recurrence_period', 'payment_method', 'notes'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return;
    const sql = `UPDATE expenses SET ${keys.map(k => `${k}=?`).join(', ')} WHERE id=?`;
    await query(sql, [...keys.map(k => fields[k]), id]);
  },

  async markPaid(id, user_id, tenant_id) {
    const expense = await ExpenseModel.findById(id);
    if (!expense) throw new Error('Gasto no encontrado');

    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const today = new Date().toISOString().split('T')[0];
      await conn.execute(`UPDATE expenses SET status='paid', paid_at=? WHERE id=?`, [today, id]);
      await conn.execute(
        `INSERT INTO cash_flow (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
         VALUES (?, 'expense', ?, ?, ?, ?, 'expense', ?, ?)`,
        [tenant_id, expense.amount, expense.description, expense.category, expense.payment_method, id, user_id]
      );
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async delete(id) {
    await query('DELETE FROM expenses WHERE id = ?', [id]);
  },

  async updateOverdue(tenant_id) {
    await query(
      `UPDATE expenses SET status='overdue'
       WHERE tenant_id = ? AND status='pending' AND due_date < CURDATE()`,
      [tenant_id]
    );
  },

  async getCategories(tenant_id) {
    const rows = await query(
      'SELECT DISTINCT category FROM expenses WHERE tenant_id = ? AND category IS NOT NULL ORDER BY category',
      [tenant_id]
    );
    return rows.map(r => r.category);
  },

  async getSummary(tenant_id) {
    const rows = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) AS pending_count,
        SUM(CASE WHEN status='paid' THEN 1 ELSE 0 END) AS paid_count,
        SUM(CASE WHEN status='overdue' THEN 1 ELSE 0 END) AS overdue_count,
        SUM(CASE WHEN status='pending' THEN amount ELSE 0 END) AS pending_amount,
        SUM(CASE WHEN status='overdue' THEN amount ELSE 0 END) AS overdue_amount,
        SUM(CASE WHEN status='paid' AND MONTH(paid_at)=MONTH(CURDATE()) THEN amount ELSE 0 END) AS paid_this_month
      FROM expenses
      WHERE tenant_id = ?
    `, [tenant_id]);
    return rows[0];
  },
};
