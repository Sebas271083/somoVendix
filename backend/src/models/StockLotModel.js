import { query } from '../config/database.js';

export const StockLotModel = {
  // Crear lote al recibir mercadería
  async create({ tenant_id, product_id, variant_id = null, quantity, unit_cost, purchase_order_id = null }) {
    if (quantity <= 0) return;
    await query(
      `INSERT INTO stock_lots (tenant_id, product_id, variant_id, quantity_initial, quantity_remaining, unit_cost, purchase_order_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [tenant_id, product_id, variant_id, quantity, quantity, unit_cost, purchase_order_id]
    );
  },

  // Descontar en FIFO (lotes más viejos primero). Devuelve costo unitario ponderado real
  // Debe llamarse con una conexión activa dentro de una transacción
  async deductFIFO(conn, tenant_id, product_id, variant_id = null, qty) {
    const [lots] = await conn.execute(
      `SELECT id, quantity_remaining, unit_cost
       FROM stock_lots
       WHERE tenant_id = ? AND product_id = ? AND variant_id <=> ? AND quantity_remaining > 0
       ORDER BY received_at ASC`,
      [tenant_id, product_id, variant_id]
    );

    let remaining = qty;
    let totalCost = 0;

    for (const lot of lots) {
      if (remaining <= 0) break;
      const take = Math.min(lot.quantity_remaining, remaining);
      totalCost += take * lot.unit_cost;
      remaining -= take;
      await conn.execute(
        'UPDATE stock_lots SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
        [take, lot.id]
      );
    }

    // Si hay más cantidad que lotes disponibles, usar costo del último lote
    if (remaining > 0) {
      const lastCost = lots.length ? lots[lots.length - 1].unit_cost : 0;
      totalCost += remaining * lastCost;
    }

    return qty > 0 ? totalCost / qty : 0;
  },

  // Restaurar stock a un lote (al cancelar venta)
  async restore(tenant_id, product_id, variant_id = null, quantity, unit_cost) {
    // Busca el lote más reciente activo o crea uno nuevo
    const rows = await query(
      `SELECT id FROM stock_lots
       WHERE tenant_id = ? AND product_id = ? AND variant_id <=> ?
       ORDER BY received_at DESC LIMIT 1`,
      [tenant_id, product_id, variant_id]
    );
    if (rows[0]) {
      await query(
        'UPDATE stock_lots SET quantity_remaining = quantity_remaining + ? WHERE id = ?',
        [quantity, rows[0].id]
      );
    } else {
      await StockLotModel.create({ tenant_id, product_id, variant_id, quantity, unit_cost });
    }
  },

  // Valoración total del inventario por método
  async getInventoryValuation(tenant_id, method = 'weighted_avg') {
    if (method === 'fifo') {
      return query(
        `SELECT p.id, p.name, p.code,
                SUM(sl.quantity_remaining) AS stock,
                SUM(sl.quantity_remaining * sl.unit_cost) AS inventory_cost
         FROM stock_lots sl
         JOIN products p ON sl.product_id = p.id
         WHERE sl.tenant_id = ? AND sl.quantity_remaining > 0
         GROUP BY p.id
         ORDER BY p.name`,
        [tenant_id]
      );
    }
    // weighted_avg: usar products.cost (ya es promedio ponderado actualizado)
    return query(
      `SELECT id, name, code, stock, cost AS unit_cost, stock * cost AS inventory_cost
       FROM products
       WHERE tenant_id = ? AND active = 1 AND has_variants = 0
       ORDER BY name`,
      [tenant_id]
    );
  },

  async getValuationMethod(tenant_id) {
    const rows = await query(
      "SELECT value FROM settings WHERE tenant_id = ? AND `key` = 'stock_valuation_method'",
      [tenant_id]
    );
    return rows[0]?.value || 'weighted_avg';
  },
};
