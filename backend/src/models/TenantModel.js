import { query, getConnection } from '../config/database.js';
import bcrypt from 'bcryptjs';

export const TenantModel = {
  async findBySubdomain(subdomain) {
    const rows = await query(
      `SELECT t.*, p.name AS plan_name, p.slug AS plan_slug,
              p.max_products, p.max_users, p.max_sales_per_month, p.features,
              s.status AS subscription_status, s.trial_ends_at
       FROM tenants t
       JOIN plans p ON t.plan_id = p.id
       LEFT JOIN subscriptions s ON s.tenant_id = t.id AND s.status IN ('trialing','active')
       WHERE t.subdomain = ?`,
      [subdomain]
    );
    if (!rows[0]) return null;
    const t = rows[0];
    try { t.features = typeof t.features === 'string' ? JSON.parse(t.features) : t.features; }
    catch { t.features = {}; }
    return t;
  },

  async findById(id) {
    const rows = await query(
      `SELECT t.*, p.name AS plan_name, p.slug AS plan_slug,
              p.max_products, p.max_users, p.max_sales_per_month, p.features
       FROM tenants t JOIN plans p ON t.plan_id = p.id WHERE t.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    const t = rows[0];
    try { t.features = typeof t.features === 'string' ? JSON.parse(t.features) : t.features; }
    catch { t.features = {}; }
    return t;
  },

  async create({ name, subdomain, email, adminName, adminPassword }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Obtener plan Pro por defecto (trial 14 días)
      const [[plan]] = await conn.execute("SELECT id FROM plans WHERE slug = 'pro'");
      const trialEnd = new Date(Date.now() + 14 * 86400000);

      const [tenantRes] = await conn.execute(
        `INSERT INTO tenants (name, subdomain, email, plan_id, status, trial_ends_at)
         VALUES (?, ?, ?, ?, 'trial', ?)`,
        [name, subdomain, email, plan.id, trialEnd]
      );
      const tenant_id = tenantRes.insertId;

      await conn.execute(
        `INSERT INTO subscriptions (tenant_id, plan_id, status, trial_ends_at)
         VALUES (?, ?, 'trialing', ?)`,
        [tenant_id, plan.id, trialEnd]
      );

      // Crear usuario admin del tenant
      const hash = await bcrypt.hash(adminPassword, 10);
      await conn.execute(
        `INSERT INTO users (tenant_id, name, email, password, role)
         VALUES (?, ?, ?, ?, 'admin')`,
        [tenant_id, adminName, email, hash]
      );

      // Settings iniciales del tenant
      const defaultSettings = [
        ['business_name', name],
        ['currency', 'ARS'], ['currency_symbol', '$'],
        ['receipt_footer', '¡Gracias por tu compra!'],
        ['tax_enabled', '0'], ['tax_rate', '21'],
        ['logo_url', ''], ['thermal_printer_width', '80'],
      ];
      for (const [k, v] of defaultSettings) {
        await conn.execute(
          'INSERT INTO settings (tenant_id, `key`, `value`) VALUES (?, ?, ?)',
          [tenant_id, k, v]
        );
      }

      // Categoría inicial
      await conn.execute(
        `INSERT INTO categories (tenant_id, name, slug, color) VALUES (?, 'General', 'general', '#6366f1')`,
        [tenant_id]
      );

      // Cliente "Consumidor Final"
      await conn.execute(
        `INSERT INTO customers (tenant_id, name, document_type, document_number)
         VALUES (?, 'Consumidor Final', 'DNI', '00000000')`,
        [tenant_id]
      );

      await conn.commit();
      return tenant_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async subdomainExists(subdomain) {
    const rows = await query('SELECT id FROM tenants WHERE subdomain = ?', [subdomain]);
    return rows.length > 0;
  },

  // Métricas para super-admin
  async getAll() {
    return query(
      `SELECT t.*, p.name AS plan_name, p.slug AS plan_slug,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS users_count,
              (SELECT COUNT(*) FROM sales s WHERE s.tenant_id = t.id AND s.status='completed') AS total_sales
       FROM tenants t JOIN plans p ON t.plan_id = p.id
       ORDER BY t.created_at DESC`
    );
  },

  async getStats() {
    const [counts] = await query(`
      SELECT
        COUNT(*) AS total,
        SUM(status = 'trial') AS trialing,
        SUM(status = 'active') AS active,
        SUM(status = 'suspended') AS suspended,
        SUM(status = 'cancelled') AS cancelled
      FROM tenants
    `);
    const planBreakdown = await query(
      `SELECT p.name, p.slug, COUNT(t.id) AS count
       FROM plans p LEFT JOIN tenants t ON t.plan_id = p.id
       GROUP BY p.id ORDER BY p.id`
    );
    return { counts, planBreakdown };
  },

  async update(id, fields) {
    const allowed = ['plan_id', 'status', 'name'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return;
    const sql = `UPDATE tenants SET ${keys.map(k => `${k}=?`).join(', ')} WHERE id=?`;
    await query(sql, [...keys.map(k => fields[k]), id]);
  },

  // Verificar si el trial expiró → bajar a plan gratis
  async checkTrials() {
    await query(
      `UPDATE tenants t
       JOIN subscriptions s ON s.tenant_id = t.id
       SET t.plan_id = (SELECT id FROM plans WHERE slug='free'),
           t.status = 'active',
           s.status = 'cancelled'
       WHERE t.status = 'trial'
         AND t.trial_ends_at < NOW()`
    );
  },
};
