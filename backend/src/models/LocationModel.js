import { query, getConnection } from '../config/database.js';

export const LocationModel = {
  async findAll(tenant_id) {
    return query(
      'SELECT * FROM locations WHERE tenant_id = ? AND active = 1 ORDER BY is_default DESC, name',
      [tenant_id]
    );
  },

  async findById(id) {
    const rows = await query('SELECT * FROM locations WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async create({ tenant_id, name, description, is_default }) {
    if (is_default) {
      await query('UPDATE locations SET is_default = 0 WHERE tenant_id = ?', [tenant_id]);
    }
    const result = await query(
      'INSERT INTO locations (tenant_id, name, description, is_default) VALUES (?, ?, ?, ?)',
      [tenant_id, name, description || null, is_default ? 1 : 0]
    );
    return result.insertId;
  },

  async update(id, { name, description, is_default, active }, tenant_id) {
    if (is_default) {
      await query('UPDATE locations SET is_default = 0 WHERE tenant_id = ?', [tenant_id]);
    }
    await query(
      'UPDATE locations SET name=?, description=?, is_default=?, active=? WHERE id=?',
      [name, description || null, is_default ? 1 : 0, active !== false ? 1 : 0, id]
    );
  },

  // Stock de todos los productos en una ubicación
  async getStock(location_id) {
    return query(
      `SELECT ls.*, p.name AS product_name, p.code, p.min_stock,
              c.name AS category_name, c.color AS category_color,
              pv.label AS variant_label
       FROM location_stock ls
       JOIN products p ON ls.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_variants pv ON ls.variant_id > 0 AND pv.id = ls.variant_id
       WHERE ls.location_id = ?
       ORDER BY p.name`,
      [location_id]
    );
  },

  // Transferir stock entre ubicaciones
  async transfer({ from_location_id, to_location_id, product_id, variant_id = 0, quantity, user_id, tenant_id }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      // Verificar stock origen
      const [[src]] = await conn.execute(
        'SELECT quantity FROM location_stock WHERE location_id = ? AND product_id = ? AND variant_id = ?',
        [from_location_id, product_id, variant_id]
      );
      if (!src || src.quantity < quantity) {
        throw Object.assign(new Error('Stock insuficiente en la ubicación de origen'), { status: 400 });
      }

      // Descontar de origen
      await conn.execute(
        'UPDATE location_stock SET quantity = quantity - ? WHERE location_id = ? AND product_id = ? AND variant_id = ?',
        [quantity, from_location_id, product_id, variant_id]
      );

      // Agregar a destino (upsert)
      await conn.execute(
        `INSERT INTO location_stock (location_id, product_id, variant_id, quantity)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
        [to_location_id, product_id, variant_id, quantity, quantity]
      );

      // Movimiento de stock
      await conn.execute(
        `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, notes, user_id)
         VALUES (?, 'transfer', ?, ?, ?, ?, ?)`,
        [product_id, quantity, src.quantity, src.quantity - quantity,
         `Transferencia entre depósitos`, user_id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Sincronizar location_stock para la ubicación default al ajustar stock
  async syncDefault(tenant_id, product_id, variant_id = 0, delta) {
    const rows = await query(
      'SELECT id FROM locations WHERE tenant_id = ? AND is_default = 1 LIMIT 1',
      [tenant_id]
    );
    if (!rows[0]) return;
    await query(
      `INSERT INTO location_stock (location_id, product_id, variant_id, quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + ?)`,
      [rows[0].id, product_id, variant_id, Math.max(0, delta), delta]
    );
  },
};
