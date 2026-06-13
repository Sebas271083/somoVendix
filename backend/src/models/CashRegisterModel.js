import { query } from '../config/database.js';

export const CashRegisterModel = {
  async getOpen(tenant_id) {
    const rows = await query(
      `SELECT cr.*, u.name AS user_name
       FROM cash_registers cr JOIN users u ON cr.user_id = u.id
       WHERE cr.tenant_id = ? AND cr.status = 'open'
       ORDER BY cr.opened_at DESC LIMIT 1`,
      [tenant_id]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query('SELECT * FROM cash_registers WHERE id = ?', [id]);
    const register = rows[0];
    if (!register) return null;
    register.movements = await query(
      'SELECT * FROM cash_movements WHERE cash_register_id = ? ORDER BY created_at',
      [id]
    );
    return register;
  },

  async open({ tenant_id, user_id, opening_amount }) {
    const result = await query(
      `INSERT INTO cash_registers (tenant_id, user_id, opening_amount, status)
       VALUES (?, ?, ?, 'open')`,
      [tenant_id, user_id, opening_amount]
    );
    return result.insertId;
  },

  async close(id, { closing_amount, notes }) {
    await query(
      `UPDATE cash_registers SET closing_amount=?, notes=?, status='closed', closed_at=NOW()
       WHERE id=?`,
      [closing_amount, notes, id]
    );
  },

  async addMovement({ cash_register_id, type, amount, description, tenant_id }) {
    const result = await query(
      `INSERT INTO cash_movements (tenant_id, cash_register_id, type, amount, description)
       VALUES (?, ?, ?, ?, ?)`,
      [tenant_id, cash_register_id, type, amount, description]
    );
    return result.insertId;
  },

  async getSummary(id) {
    const [income] = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM cash_movements
       WHERE cash_register_id = ? AND type = 'income'`,
      [id]
    );
    const [expenses] = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM cash_movements
       WHERE cash_register_id = ? AND type = 'expense'`,
      [id]
    );
    const [sales] = await query(
      `SELECT COALESCE(SUM(total),0) AS total FROM sales
       WHERE cash_register_id = ? AND status = 'completed'`,
      [id]
    );
    return {
      income: income.total,
      expenses: expenses.total,
      sales: sales.total,
    };
  },
};
