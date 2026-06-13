import { query } from '../config/database.js';

export const PlanModel = {
  async findAll() {
    const rows = await query('SELECT * FROM plans WHERE is_active = 1 ORDER BY id');
    return rows.map(p => ({
      ...p,
      features: typeof p.features === 'string' ? JSON.parse(p.features) : p.features,
    }));
  },

  async findById(id) {
    const rows = await query('SELECT * FROM plans WHERE id = ?', [id]);
    if (!rows[0]) return null;
    const p = rows[0];
    p.features = typeof p.features === 'string' ? JSON.parse(p.features) : p.features;
    return p;
  },

  // Uso actual del tenant para comparar con límites
  async getTenantUsage(tenant_id) {
    const [[products]] = await query(
      'SELECT COUNT(*) AS count FROM products WHERE tenant_id = ? AND active = 1',
      [tenant_id]
    );
    const [[users]] = await query(
      'SELECT COUNT(*) AS count FROM users WHERE tenant_id = ? AND active = 1',
      [tenant_id]
    );
    const [[salesMonth]] = await query(
      `SELECT COUNT(*) AS count FROM sales
       WHERE tenant_id = ? AND status='completed'
         AND MONTH(created_at) = MONTH(CURDATE())
         AND YEAR(created_at) = YEAR(CURDATE())`,
      [tenant_id]
    );
    return {
      products: products.count,
      users: users.count,
      sales_this_month: salesMonth.count,
    };
  },
};
