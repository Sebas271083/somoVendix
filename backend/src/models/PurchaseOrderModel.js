import { query, getConnection } from '../config/database.js';
import { StockLotModel } from './StockLotModel.js';

export const PurchaseOrderModel = {
  async findAll({ tenant_id, status } = {}) {
    let sql = `
      SELECT po.*, s.name AS supplier_name, u.name AS user_name,
             COUNT(poi.id) AS item_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN users u ON po.user_id = u.id
      LEFT JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.tenant_id = ?
    `;
    const params = [tenant_id];
    if (status) { sql += ' AND po.status = ?'; params.push(status); }
    sql += ' GROUP BY po.id ORDER BY po.created_at DESC LIMIT 100';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT po.*, s.name AS supplier_name, u.name AS user_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN users u ON po.user_id = u.id
       WHERE po.id = ?`,
      [id]
    );
    const po = rows[0];
    if (!po) return null;
    po.items = await query(
      `SELECT poi.*, p.name AS product_name, p.code AS product_code, p.stock AS current_stock
       FROM purchase_order_items poi
       JOIN products p ON poi.product_id = p.id
       WHERE poi.purchase_order_id = ?`,
      [id]
    );
    return po;
  },

  async create({ tenant_id, supplier_id, user_id, items, notes, expected_date }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_cost, 0);

      const [result] = await conn.execute(
        `INSERT INTO purchase_orders (tenant_id, supplier_id, user_id, subtotal, total, notes, expected_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tenant_id, supplier_id || null, user_id, subtotal, subtotal, notes || null, expected_date || null]
      );
      const po_id = result.insertId;

      for (const item of items) {
        await conn.execute(
          `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, subtotal)
           VALUES (?, ?, ?, ?, ?)`,
          [po_id, item.product_id, item.quantity, item.unit_cost, item.quantity * item.unit_cost]
        );
      }

      await conn.commit();
      return po_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async receive(id, user_id) {
    const po = await PurchaseOrderModel.findById(id);
    if (!po) throw Object.assign(new Error('OC no encontrada'), { status: 404 });
    if (po.status !== 'pending') throw Object.assign(new Error('La OC ya fue procesada'), { status: 400 });

    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE purchase_orders SET status = 'received', received_at = NOW() WHERE id = ?`,
        [id]
      );

      for (const item of po.items) {
        const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
        const before = prod?.stock ?? 0;
        const after = before + item.quantity;

        await conn.execute('UPDATE products SET stock = ?, cost = ? WHERE id = ?',
          [after, item.unit_cost, item.product_id]
        );
        await conn.execute(
          `INSERT INTO stock_movements
             (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
           VALUES (?, 'purchase', ?, ?, ?, ?, ?, ?)`,
          [item.product_id, item.quantity, before, after, id, `OC #${id} recibida`, user_id]
        );

        // Crear lote para FIFO
        await StockLotModel.create({
          tenant_id: po.tenant_id,
          product_id: item.product_id,
          variant_id: null,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          purchase_order_id: id,
        });
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async cancel(id) {
    const po = await PurchaseOrderModel.findById(id);
    if (!po) throw Object.assign(new Error('OC no encontrada'), { status: 404 });
    if (po.status === 'received') throw Object.assign(new Error('No se puede cancelar una OC recibida'), { status: 400 });
    await query(`UPDATE purchase_orders SET status = 'cancelled' WHERE id = ?`, [id]);
  },
};
