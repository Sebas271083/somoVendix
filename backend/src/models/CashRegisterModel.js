import { query } from '../config/database.js';

const PAYMENT_LABEL = {
  efectivo: 'Efectivo',
  debito: 'Débito',
  credito: 'Crédito',
  transferencia: 'Transferencia',
  cuenta_corriente: 'Cta. Corriente',
  cuotas: 'Cuotas',
  mixto: 'Mixto',
};

export const CashRegisterModel = {
  // Returns the open register for a specific user (or any open register if no user_id)
  async getOpen(tenant_id, user_id = null) {
    let sql = `SELECT cr.*, u.name AS user_name
               FROM cash_registers cr JOIN users u ON cr.user_id = u.id
               WHERE cr.tenant_id = ? AND cr.status = 'open'`;
    const params = [tenant_id];
    if (user_id) { sql += ' AND cr.user_id = ?'; params.push(user_id); }
    sql += ' ORDER BY cr.opened_at DESC LIMIT 1';
    const rows = await query(sql, params);
    return rows[0] || null;
  },

  // Returns ALL open registers (admin view for multiple cashiers)
  async getAllOpen(tenant_id) {
    return query(
      `SELECT cr.*, u.name AS user_name,
         COALESCE(SUM(CASE WHEN s.status='completed' THEN s.total ELSE 0 END),0) AS running_total,
         COUNT(CASE WHEN s.status='completed' THEN 1 END) AS sales_count
       FROM cash_registers cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN sales s ON s.cash_register_id = cr.id
       WHERE cr.tenant_id = ? AND cr.status = 'open'
       GROUP BY cr.id
       ORDER BY cr.opened_at DESC`,
      [tenant_id]
    );
  },

  async findById(id) {
    const rows = await query('SELECT cr.*, u.name AS user_name FROM cash_registers cr JOIN users u ON cr.user_id = u.id WHERE cr.id = ?', [id]);
    const register = rows[0];
    if (!register) return null;
    try {
      register.movements = await query(
        `SELECT cm.*, COALESCE(cm.user_name_snapshot, u.name, 'Sistema') AS user_name
         FROM cash_movements cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.cash_register_id = ?
         ORDER BY cm.created_at`,
        [id]
      );
    } catch {
      register.movements = await query(
        'SELECT cm.* FROM cash_movements cm WHERE cm.cash_register_id = ? ORDER BY cm.created_at',
        [id]
      );
    }
    return register;
  },

  async open({ tenant_id, user_id, opening_amount, register_name }) {
    try {
      const result = await query(
        `INSERT INTO cash_registers (tenant_id, user_id, opening_amount, status, register_name)
         VALUES (?, ?, ?, 'open', ?)`,
        [tenant_id, user_id, opening_amount, register_name || null]
      );
      return result.insertId;
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        // register_name column not yet migrated
        const result = await query(
          `INSERT INTO cash_registers (tenant_id, user_id, opening_amount, status)
           VALUES (?, ?, ?, 'open')`,
          [tenant_id, user_id, opening_amount]
        );
        return result.insertId;
      }
      throw err;
    }
  },

  async close(id, { counted_amount, notes }) {
    try {
      await query(
        `UPDATE cash_registers SET counted_amount=?, notes=?, status='closed', closed_at=NOW() WHERE id=?`,
        [counted_amount ?? null, notes || null, id]
      );
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        await query(
          `UPDATE cash_registers SET closing_amount=?, notes=?, status='closed', closed_at=NOW() WHERE id=?`,
          [counted_amount ?? null, notes || null, id]
        );
      } else { throw err; }
    }
  },

  async addMovement({ cash_register_id, type, amount, description, tenant_id, user_id, user_name_snapshot }) {
    try {
      const result = await query(
        `INSERT INTO cash_movements
           (tenant_id, cash_register_id, type, amount, description, user_id, user_name_snapshot)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenant_id, cash_register_id, type, amount, description, user_id || null, user_name_snapshot || null]
      );
      return result.insertId;
    } catch (err) {
      if (err.code === 'ER_BAD_FIELD_ERROR') {
        const result = await query(
          `INSERT INTO cash_movements (tenant_id, cash_register_id, type, amount, description)
           VALUES (?, ?, ?, ?, ?)`,
          [tenant_id, cash_register_id, type, amount, description]
        );
        return result.insertId;
      }
      throw err;
    }
  },

  async getSummary(id) {
    // Sales breakdown by payment method
    const salesByMethod = await query(
      `SELECT payment_method,
         COALESCE(SUM(total),0) AS total,
         COUNT(*) AS count
       FROM sales
       WHERE cash_register_id = ? AND status = 'completed'
       GROUP BY payment_method`,
      [id]
    );

    // Cash in movements
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

    // Movements with user info (defensive: user_id/user_name_snapshot may not exist yet)
    let movements;
    try {
      movements = await query(
        `SELECT cm.*, COALESCE(cm.user_name_snapshot, u.name, 'Sistema') AS user_name
         FROM cash_movements cm
         LEFT JOIN users u ON cm.user_id = u.id
         WHERE cm.cash_register_id = ?
         ORDER BY cm.created_at`,
        [id]
      );
    } catch {
      movements = await query(
        'SELECT cm.* FROM cash_movements cm WHERE cm.cash_register_id = ? ORDER BY cm.created_at',
        [id]
      );
    }

    const salesTotal = salesByMethod.reduce((s, r) => s + parseFloat(r.total), 0);
    const cashSales = parseFloat(salesByMethod.find(r => r.payment_method === 'efectivo')?.total || 0);
    const salesCount = salesByMethod.reduce((s, r) => s + parseInt(r.count), 0);

    // Expected cash = opening + cash sales + extra income - withdrawals
    // (fetched from register in controller)
    return {
      sales: salesTotal,
      sales_count: salesCount,
      cash_sales: cashSales,
      income: parseFloat(income.total),
      expenses: parseFloat(expenses.total),
      sales_by_method: salesByMethod.map(r => ({
        method: r.payment_method,
        label: PAYMENT_LABEL[r.payment_method] || r.payment_method,
        total: parseFloat(r.total),
        count: parseInt(r.count),
      })),
      movements,
    };
  },

  async getHistory(tenant_id, limit = 50) {
    const registers = await query(
      `SELECT cr.*, u.name AS user_name
       FROM cash_registers cr
       JOIN users u ON u.id = cr.user_id
       WHERE cr.tenant_id = ? AND cr.status = 'closed'
       ORDER BY cr.closed_at DESC
       LIMIT ?`,
      [tenant_id, limit]
    );

    if (!registers.length) return [];

    // Get sales breakdown for each register in one query
    const ids = registers.map(r => r.id);
    const salesRows = await query(
      `SELECT cash_register_id, payment_method,
         COALESCE(SUM(total),0) AS total,
         COUNT(*) AS count
       FROM sales
       WHERE cash_register_id IN (${ids.map(() => '?').join(',')}) AND status='completed'
       GROUP BY cash_register_id, payment_method`,
      ids
    );

    const movRows = await query(
      `SELECT cash_register_id, type, COALESCE(SUM(amount),0) AS total
       FROM cash_movements
       WHERE cash_register_id IN (${ids.map(() => '?').join(',')})
       GROUP BY cash_register_id, type`,
      ids
    );

    return registers.map(r => {
      const rSales = salesRows.filter(s => s.cash_register_id === r.id);
      const salesTotal = rSales.reduce((s, x) => s + parseFloat(x.total), 0);
      const cashSales = parseFloat(rSales.find(x => x.payment_method === 'efectivo')?.total || 0);
      const salesCount = rSales.reduce((s, x) => s + parseInt(x.count), 0);
      const income = parseFloat(movRows.find(m => m.cash_register_id === r.id && m.type === 'income')?.total || 0);
      const expenses = parseFloat(movRows.find(m => m.cash_register_id === r.id && m.type === 'expense')?.total || 0);
      const expectedCash = parseFloat(r.opening_amount) + cashSales + income - expenses;
      const diff = r.counted_amount !== null
        ? parseFloat(r.counted_amount) - expectedCash
        : null;
      return {
        ...r,
        sales_total: salesTotal,
        sales_count: salesCount,
        cash_sales: cashSales,
        income,
        expenses,
        expected_cash: expectedCash,
        diff,
        sales_by_method: rSales.map(x => ({
          method: x.payment_method,
          label: PAYMENT_LABEL[x.payment_method] || x.payment_method,
          total: parseFloat(x.total),
          count: parseInt(x.count),
        })),
      };
    });
  },
};
