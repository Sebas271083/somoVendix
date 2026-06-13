import { query } from '../config/database.js';

export const CustomerModel = {
  async findAll(search, tenant_id) {
    let sql = 'SELECT * FROM customers WHERE tenant_id = ?';
    const params = [tenant_id];
    if (search) {
      sql += ' AND (name LIKE ? OR document_number LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    sql += ' ORDER BY name';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query('SELECT * FROM customers WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ name, document_type, document_number, email, phone, address, credit_limit, tenant_id }) {
    const result = await query(
      `INSERT INTO customers (tenant_id, name, document_type, document_number, email, phone, address, credit_limit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, name, document_type, document_number, email, phone, address, credit_limit || 0]
    );
    return result.insertId;
  },

  async update(id, { name, document_type, document_number, email, phone, address, credit_limit }) {
    await query(
      `UPDATE customers SET name=?, document_type=?, document_number=?, email=?, phone=?, address=?, credit_limit=?
       WHERE id=?`,
      [name, document_type, document_number, email, phone, address, credit_limit, id]
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
              s.payment_method, s.status, s.created_at,
              u.name AS user_name
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.customer_id = ?
       ORDER BY s.created_at DESC`,
      [customer_id]
    );
  },

  async getPaymentsHistory(customer_id) {
    return query(
      `SELECT p.*, u.name AS user_name
       FROM payments p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.customer_id = ?
       ORDER BY p.created_at DESC`,
      [customer_id]
    );
  },

  async getAccountSummary(customer_id) {
    const customer = await CustomerModel.findById(customer_id);
    const sales = await CustomerModel.getSalesHistory(customer_id);
    const payments = await CustomerModel.getPaymentsHistory(customer_id);
    const totalPurchased = sales
      .filter(s => s.status === 'completed')
      .reduce((sum, s) => sum + parseFloat(s.total), 0);
    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    return { customer, sales, payments, totalPurchased, totalPaid };
  },
};
