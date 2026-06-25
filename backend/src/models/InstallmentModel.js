import { query, getConnection } from '../config/database.js';

export const InstallmentModel = {
  async createPlan(conn, { tenant_id, sale_id, customer_id, n_installments, interest_rate, total_sale }) {
    const rate = parseFloat(interest_rate) || 0;
    const totalWithInterest = total_sale * (1 + rate / 100);
    const amountPerInstallment = totalWithInterest / n_installments;

    const [result] = await conn.execute(
      `INSERT INTO installment_plans (tenant_id, sale_id, customer_id, n_installments, amount_per_installment, interest_rate, total_with_interest)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, sale_id, customer_id || null, n_installments, amountPerInstallment, rate, totalWithInterest]
    );
    const plan_id = result.insertId;

    const today = new Date();
    for (let i = 0; i < n_installments; i++) {
      const due = new Date(today);
      due.setMonth(due.getMonth() + i + 1);
      const dueStr = due.toISOString().split('T')[0];
      await conn.execute(
        `INSERT INTO installments (plan_id, installment_number, due_date, amount)
         VALUES (?, ?, ?, ?)`,
        [plan_id, i + 1, dueStr, amountPerInstallment]
      );
    }

    return plan_id;
  },

  async findAll({ tenant_id, status } = {}) {
    let sql = `
      SELECT ip.*, s.ticket_number, c.name AS customer_name,
             COUNT(i.id) AS total_installments,
             SUM(i.paid) AS paid_count,
             SUM(CASE WHEN i.paid = 0 AND i.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_count
      FROM installment_plans ip
      JOIN sales s ON ip.sale_id = s.id
      LEFT JOIN customers c ON ip.customer_id = c.id
      LEFT JOIN installments i ON i.plan_id = ip.id
      WHERE ip.tenant_id = ?
    `;
    const params = [tenant_id];
    sql += ' GROUP BY ip.id ORDER BY ip.id DESC LIMIT 200';
    return query(sql, params);
  },

  async getInstallments(plan_id) {
    return query(
      `SELECT i.*, u.name AS paid_by_name
       FROM installments i
       LEFT JOIN users u ON i.paid_by = u.id
       WHERE i.plan_id = ?
       ORDER BY i.installment_number`,
      [plan_id]
    );
  },

  async markPaid(installment_id, user_id, notes) {
    const [rows] = await query('SELECT * FROM installments WHERE id = ?', [installment_id]);
    const inst = Array.isArray(rows) ? rows[0] : rows;
    if (!inst || inst.paid) throw Object.assign(new Error('Cuota ya pagada o no encontrada'), { status: 400 });

    await query(
      `UPDATE installments SET paid = 1, paid_date = NOW(), paid_by = ?, notes = ?
       WHERE id = ?`,
      [user_id, notes || null, installment_id]
    );

    // Reducir saldo del cliente si aplica
    const [[plan]] = await (async () => {
      const conn = await getConnection();
      try {
        return conn.execute('SELECT * FROM installment_plans WHERE id = ?', [inst.plan_id]);
      } finally { conn.release(); }
    })();

    if (plan?.customer_id) {
      await query(
        'UPDATE customers SET balance = GREATEST(0, balance - ?) WHERE id = ?',
        [inst.amount, plan.customer_id]
      );
    }
  },
};
