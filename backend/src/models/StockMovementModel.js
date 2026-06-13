import { query, getConnection } from '../config/database.js';

export const StockMovementModel = {
  async findByProduct(product_id, limit = 50) {
    return query(
      `SELECT sm.*, u.name AS user_name
       FROM stock_movements sm
       LEFT JOIN users u ON sm.user_id = u.id
       WHERE sm.product_id = ?
       ORDER BY sm.created_at DESC
       LIMIT ?`,
      [product_id, limit]
    );
  },

  async record({ product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id }, conn) {
    const execute = conn
      ? (sql, p) => conn.execute(sql, p)
      : (sql, p) => query(sql, p);
    await execute(
      `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [product_id, type, quantity, before_stock, after_stock, reference_id || null, notes || null, user_id || null]
    );
  },

  // Ajuste manual de stock con registro de movimiento
  async adjust({ product_id, quantity, notes, user_id }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[product]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [product_id]);
      if (!product) throw new Error('Producto no encontrado');

      const before = product.stock;
      const after = before + quantity;
      await conn.execute('UPDATE products SET stock = ? WHERE id = ?', [after, product_id]);
      await StockMovementModel.record(
        { product_id, type: 'adjustment', quantity, before_stock: before, after_stock: after, notes, user_id },
        conn
      );

      await conn.commit();
      return after;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};
