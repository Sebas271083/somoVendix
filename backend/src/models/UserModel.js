import { query } from '../config/database.js';

export const UserModel = {
  async findByEmail(email, tenant_id) {
    const rows = await query(
      'SELECT * FROM users WHERE email = ? AND tenant_id = ? AND active = 1',
      [email, tenant_id]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const rows = await query(
      'SELECT id, name, email, role, branch_id, tenant_id, active FROM users WHERE id = ?',
      [id]
    );
    return rows[0] || null;
  },

  async findAll(tenant_id) {
    return query(
      `SELECT u.id, u.name, u.email, u.role, u.active, u.created_at
       FROM users u
       WHERE u.tenant_id = ?
       ORDER BY u.name`,
      [tenant_id]
    );
  },

  async create({ name, email, password, role, tenant_id }) {
    const result = await query(
      'INSERT INTO users (tenant_id, name, email, password, role) VALUES (?, ?, ?, ?, ?)',
      [tenant_id, name, email, password, role]
    );
    return result.insertId;
  },

  async update(id, { name, email, role, active }) {
    await query(
      'UPDATE users SET name=?, email=?, role=?, active=? WHERE id=?',
      [name, email, role, active, id]
    );
  },

  async updatePassword(id, password) {
    await query('UPDATE users SET password=? WHERE id=?', [password, id]);
  },
};
