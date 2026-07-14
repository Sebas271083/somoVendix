import { query, getConnection } from '../config/database.js';

export const StocktakeModel = {
  async findAll(tenant_id) {
    return query(
      `SELECT ss.*, u.name AS created_by_name, uc.name AS closed_by_name,
              l.name AS location_name,
              (SELECT COUNT(*) FROM stocktake_items si WHERE si.session_id = ss.id) AS item_count,
              (SELECT COUNT(*) FROM stocktake_items si WHERE si.session_id = ss.id AND si.counted_qty IS NOT NULL) AS counted_count
       FROM stocktake_sessions ss
       JOIN users u ON ss.created_by = u.id
       LEFT JOIN users uc ON ss.closed_by = uc.id
       LEFT JOIN locations l ON ss.location_id = l.id
       WHERE ss.tenant_id = ?
       ORDER BY ss.created_at DESC`,
      [tenant_id]
    );
  },

  async findById(id) {
    const rows = await query(
      `SELECT ss.*, u.name AS created_by_name, l.name AS location_name
       FROM stocktake_sessions ss
       JOIN users u ON ss.created_by = u.id
       LEFT JOIN locations l ON ss.location_id = l.id
       WHERE ss.id = ?`,
      [id]
    );
    const session = rows[0];
    if (!session) return null;

    session.items = await query(
      `SELECT si.*, p.name AS product_name, p.code,
              (SELECT GROUP_CONCAT(pav.value ORDER BY pa.position SEPARATOR ' / ')
               FROM variant_attribute_values vav
               JOIN product_attribute_values pav ON vav.attribute_value_id = pav.id
               JOIN product_attributes pa ON pav.attribute_id = pa.id
               WHERE vav.variant_id = si.variant_id) AS variant_label,
              (si.counted_qty - si.expected_qty) AS difference
       FROM stocktake_items si
       JOIN products p ON si.product_id = p.id
       WHERE si.session_id = ?
       ORDER BY p.name`,
      [id]
    );
    return session;
  },

  // Crear sesión y pre-llenar con todos los productos activos
  async create({ tenant_id, location_id, notes, created_by }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO stocktake_sessions (tenant_id, location_id, notes, created_by)
         VALUES (?, ?, ?, ?)`,
        [tenant_id, location_id || null, notes || null, created_by]
      );
      const session_id = result.insertId;

      // Pre-llenar con productos sin variantes
      const products = await query(
        'SELECT id, stock FROM products WHERE tenant_id = ? AND active = 1 AND (has_variants = 0 OR has_variants IS NULL)',
        [tenant_id]
      );
      for (const p of products) {
        await conn.execute(
          'INSERT INTO stocktake_items (session_id, product_id, variant_id, expected_qty) VALUES (?, ?, NULL, ?)',
          [session_id, p.id, p.stock]
        );
      }

      // Pre-llenar variantes
      const variants = await query(
        `SELECT pv.id, pv.product_id, pv.stock
         FROM product_variants pv
         JOIN products p ON p.id = pv.product_id
         WHERE p.tenant_id = ? AND p.active = 1 AND pv.active = 1`,
        [tenant_id]
      );
      for (const v of variants) {
        await conn.execute(
          'INSERT INTO stocktake_items (session_id, product_id, variant_id, expected_qty) VALUES (?, ?, ?, ?)',
          [session_id, v.product_id, v.id, v.stock]
        );
      }

      await conn.commit();
      return session_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  // Actualizar cantidad contada de un ítem
  async updateItem(item_id, counted_qty) {
    await query(
      'UPDATE stocktake_items SET counted_qty = ? WHERE id = ?',
      [counted_qty, item_id]
    );
  },

  // Cerrar sesión y aplicar ajustes de stock
  async close(session_id, closed_by, tenant_id) {
    const session = await StocktakeModel.findById(session_id);
    if (!session) throw Object.assign(new Error('Sesión no encontrada'), { status: 404 });
    if (session.status === 'closed') throw Object.assign(new Error('La sesión ya está cerrada'), { status: 400 });

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      for (const item of session.items) {
        if (item.counted_qty === null) continue;
        const diff = item.counted_qty - item.expected_qty;
        if (Math.abs(diff) < 0.001) continue;

        if (item.variant_id) {
          const [[v]] = await conn.execute('SELECT stock FROM product_variants WHERE id = ?', [item.variant_id]);
          const before = v?.stock ?? 0;
          const after = before + diff;
          await conn.execute('UPDATE product_variants SET stock = ? WHERE id = ?', [after, item.variant_id]);
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, notes, user_id)
             VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`,
            [item.product_id, diff, before, after, `Inventario físico #${session_id}`, closed_by]
          );
        } else {
          const [[p]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          const before = p?.stock ?? 0;
          const after = before + diff;
          await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [after, item.product_id]);
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, notes, user_id)
             VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`,
            [item.product_id, diff, before, after, `Inventario físico #${session_id}`, closed_by]
          );

          // Sincronizar location_stock
          if (session.location_id) {
            await conn.execute(
              `INSERT INTO location_stock (location_id, product_id, variant_id, quantity)
               VALUES (?, ?, 0, ?)
               ON DUPLICATE KEY UPDATE quantity = GREATEST(0, quantity + ?)`,
              [session.location_id, item.product_id, Math.max(0, item.counted_qty), diff]
            );
          }
        }
      }

      await conn.execute(
        `UPDATE stocktake_sessions SET status='closed', closed_by=?, closed_at=NOW() WHERE id=?`,
        [closed_by, session_id]
      );

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
