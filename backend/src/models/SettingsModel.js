import { query } from '../config/database.js';

export const SettingsModel = {
  async getAll(tenant_id) {
    const rows = await query('SELECT `key`, `value` FROM settings WHERE tenant_id = ?', [tenant_id]);
    return rows.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
  },

  async get(key, tenant_id) {
    const rows = await query(
      'SELECT `value` FROM settings WHERE tenant_id = ? AND `key` = ?',
      [tenant_id, key]
    );
    return rows[0]?.value ?? null;
  },

  async set(key, value, tenant_id) {
    await query(
      'INSERT INTO settings (tenant_id, `key`, `value`) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
      [tenant_id, key, value, value]
    );
  },

  async setMany(data, tenant_id) {
    for (const [key, value] of Object.entries(data)) {
      await SettingsModel.set(key, value, tenant_id);
    }
  },
};
