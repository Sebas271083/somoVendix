import { query, getConnection } from '../config/database.js';
import bcrypt from 'bcryptjs';

const safeParse = (v) => {
  if (!v) return {};
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return {}; }
};

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
    // t.features = p.features (plan defaults); t.features_override = tenant-level overrides
    const planFeatures = safeParse(t.features);
    const override = safeParse(t.features_override);
    t.features = { ...planFeatures, ...override };
    return t;
  },

  async findById(id) {
    const rows = await query(
      `SELECT t.*, p.name AS plan_name, p.slug AS plan_slug,
              p.max_products, p.max_users, p.max_sales_per_month, p.features AS plan_features_raw
       FROM tenants t JOIN plans p ON t.plan_id = p.id WHERE t.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    const t = rows[0];
    const planFeatures = safeParse(t.plan_features_raw);
    const override = safeParse(t.features_override);
    t.plan_features = planFeatures;
    t.features = { ...planFeatures, ...override };
    delete t.plan_features_raw;
    return t;
  },

  async create({ name, subdomain, email, adminName, adminPassword, planSlug = 'pro' }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[plan]] = await conn.execute('SELECT id FROM plans WHERE slug = ?', [planSlug]);
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

      const hash = await bcrypt.hash(adminPassword, 10);
      await conn.execute(
        `INSERT INTO users (tenant_id, name, email, password, role)
         VALUES (?, ?, ?, ?, 'admin')`,
        [tenant_id, adminName, email, hash]
      );

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

      await conn.execute(
        `INSERT INTO categories (tenant_id, name, slug, color) VALUES (?, 'General', 'general', '#6366f1')`,
        [tenant_id]
      );

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

  async getAll() {
    return query(
      `SELECT t.id, t.name, t.subdomain, t.email, t.status, t.trial_ends_at,
              t.created_at, t.notes,
              p.name AS plan_name, p.slug AS plan_slug,
              (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) AS users_count,
              (SELECT COUNT(*) FROM sales s WHERE s.tenant_id = t.id AND s.status='completed') AS total_sales,
              (SELECT MAX(s.created_at) FROM sales s WHERE s.tenant_id = t.id AND s.status='completed') AS last_sale_at
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
    const allowed = ['plan_id', 'status', 'name', 'email', 'trial_ends_at', 'notes'];
    const keys = Object.keys(fields).filter(k => allowed.includes(k));
    if (!keys.length) return;
    const sql = `UPDATE tenants SET ${keys.map(k => `${k}=?`).join(', ')} WHERE id=?`;
    await query(sql, [...keys.map(k => fields[k]), id]);
  },

  async updateFeatures(id, features_override) {
    await query(
      'UPDATE tenants SET features_override = ? WHERE id = ?',
      [features_override ? JSON.stringify(features_override) : null, id]
    );
  },

  async extendTrial(id, days) {
    await query(
      `UPDATE tenants
       SET trial_ends_at = DATE_ADD(GREATEST(COALESCE(trial_ends_at, NOW()), NOW()), INTERVAL ? DAY),
           status = 'trial'
       WHERE id = ?`,
      [parseInt(days, 10), id]
    );
    await query(
      `UPDATE subscriptions
       SET trial_ends_at = (SELECT trial_ends_at FROM tenants WHERE id = ?),
           status = 'trialing'
       WHERE tenant_id = ?`,
      [id, id]
    );
  },

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
