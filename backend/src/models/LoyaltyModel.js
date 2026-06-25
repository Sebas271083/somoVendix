import { query, getConnection } from '../config/database.js';

export const LoyaltyModel = {
  async getSettings(tenant_id) {
    const rows = await query(
      "SELECT `key`, `value` FROM settings WHERE tenant_id = ? AND `key` IN ('loyalty_enabled','loyalty_points_per_peso','loyalty_peso_per_point')",
      [tenant_id]
    );
    const s = Object.fromEntries(rows.map(r => [r.key, r.value]));
    return {
      enabled: s.loyalty_enabled === '1',
      pointsPerPeso: parseFloat(s.loyalty_points_per_peso || '0.01'),
      pesoPerPoint: parseFloat(s.loyalty_peso_per_point || '1'),
    };
  },

  // Otorgar puntos por una venta (llamado desde SaleModel)
  async earnFromSale(conn, tenant_id, customer_id, sale_total, sale_id) {
    if (!customer_id) return 0;
    const settings = await LoyaltyModel.getSettings(tenant_id);
    if (!settings.enabled) return 0;

    const points = Math.floor(sale_total * settings.pointsPerPeso);
    if (points <= 0) return 0;

    const [[cur]] = await conn.execute(
      'SELECT points_balance FROM customers WHERE id = ?',
      [customer_id]
    );
    const newBalance = (cur?.points_balance ?? 0) + points;
    await conn.execute('UPDATE customers SET points_balance = ? WHERE id = ?', [newBalance, customer_id]);
    await conn.execute(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, balance_after, reference_type, reference_id, notes)
       VALUES (?, ?, 'earn', ?, ?, 'sale', ?, ?)`,
      [tenant_id, customer_id, points, newBalance, sale_id, `Venta por $${sale_total.toFixed(0)}`]
    );
    return points;
  },

  // Validar y calcular descuento por redención
  async previewRedemption(tenant_id, customer_id, points_to_redeem) {
    const settings = await LoyaltyModel.getSettings(tenant_id);
    const [cur] = await query('SELECT points_balance FROM customers WHERE id = ?', [customer_id]);
    const available = cur?.points_balance ?? 0;
    const redeemable = Math.min(points_to_redeem, available);
    const discount = redeemable * settings.pesoPerPoint;
    return { redeemable, discount, available, pesoPerPoint: settings.pesoPerPoint };
  },

  // Aplicar redención (llamado desde SaleModel dentro de transacción)
  async redeemInSale(conn, tenant_id, customer_id, points, sale_id) {
    const [[cur]] = await conn.execute('SELECT points_balance FROM customers WHERE id = ?', [customer_id]);
    const available = cur?.points_balance ?? 0;
    const actualPoints = Math.min(points, available);
    if (actualPoints <= 0) return 0;

    const settings = await LoyaltyModel.getSettings(tenant_id);
    const newBalance = available - actualPoints;
    const discount = actualPoints * settings.pesoPerPoint;

    await conn.execute('UPDATE customers SET points_balance = ? WHERE id = ?', [newBalance, customer_id]);
    await conn.execute(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, balance_after, reference_type, reference_id, notes)
       VALUES (?, ?, 'redeem', ?, ?, 'redemption', ?, ?)`,
      [tenant_id, customer_id, -actualPoints, newBalance, sale_id, `Descuento $${discount.toFixed(0)}`]
    );
    return discount;
  },

  async getHistory(customer_id) {
    return query(
      'SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50',
      [customer_id]
    );
  },

  async manualAdjust({ tenant_id, customer_id, points, notes, user_id }) {
    const [cur] = await query('SELECT points_balance FROM customers WHERE id = ?', [customer_id]);
    const newBalance = Math.max(0, (cur?.points_balance ?? 0) + points);
    await query('UPDATE customers SET points_balance = ? WHERE id = ?', [newBalance, customer_id]);
    await query(
      `INSERT INTO loyalty_transactions (tenant_id, customer_id, type, points, balance_after, reference_type, notes)
       VALUES (?, ?, 'adjust', ?, ?, 'manual', ?)`,
      [tenant_id, customer_id, points, newBalance, notes || 'Ajuste manual']
    );
    return newBalance;
  },
};
