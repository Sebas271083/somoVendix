import { query } from '../config/database.js';

export const CustomerInteractionModel = {
  async findByCustomer(customer_id) {
    return query(
      `SELECT ci.*, u.name AS user_name
       FROM customer_interactions ci
       JOIN users u ON ci.user_id = u.id
       WHERE ci.customer_id = ?
       ORDER BY ci.created_at DESC
       LIMIT 100`,
      [customer_id]
    );
  },

  async create({ tenant_id, customer_id, type, subject, body, user_id }) {
    const result = await query(
      `INSERT INTO customer_interactions (tenant_id, customer_id, type, subject, body, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [tenant_id, customer_id, type || 'note', subject || null, body, user_id]
    );
    return result.insertId;
  },

  async delete(id) {
    await query('DELETE FROM customer_interactions WHERE id = ?', [id]);
  },
};
