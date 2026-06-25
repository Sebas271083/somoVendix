import { query, getConnection } from '../config/database.js';

export const ProductVariantModel = {
  async getByProduct(product_id) {
    const variants = await query(
      `SELECT pv.*,
              GROUP_CONCAT(pav.value ORDER BY pa.position, pav.position SEPARATOR ' / ') AS label,
              GROUP_CONCAT(vav.attribute_value_id ORDER BY pa.position) AS attr_value_ids
       FROM product_variants pv
       LEFT JOIN variant_attribute_values vav ON vav.variant_id = pv.id
       LEFT JOIN product_attribute_values pav ON pav.id = vav.attribute_value_id
       LEFT JOIN product_attributes pa ON pa.id = pav.attribute_id
       WHERE pv.product_id = ?
       GROUP BY pv.id
       ORDER BY pv.id`,
      [product_id]
    );
    return variants.map(v => ({
      ...v,
      attr_value_ids: v.attr_value_ids ? v.attr_value_ids.split(',').map(Number) : [],
    }));
  },

  async getAttributes(product_id) {
    const attrs = await query(
      `SELECT id, name, position FROM product_attributes WHERE product_id = ? ORDER BY position`,
      [product_id]
    );
    for (const attr of attrs) {
      attr.values = await query(
        `SELECT id, value, position FROM product_attribute_values WHERE attribute_id = ? ORDER BY position`,
        [attr.id]
      );
    }
    return attrs;
  },

  async setAttributes(product_id, attributes, tenant_id) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('DELETE FROM product_attributes WHERE product_id = ?', [product_id]);
      for (let i = 0; i < attributes.length; i++) {
        const [res] = await conn.execute(
          'INSERT INTO product_attributes (product_id, tenant_id, name, position) VALUES (?, ?, ?, ?)',
          [product_id, tenant_id, attributes[i].name, i]
        );
        for (let j = 0; j < attributes[i].values.length; j++) {
          await conn.execute(
            'INSERT INTO product_attribute_values (attribute_id, value, position) VALUES (?, ?, ?)',
            [res.insertId, attributes[i].values[j], j]
          );
        }
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  },

  async upsertVariants(product_id, variants, tenant_id) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      for (const v of variants) {
        const price = v.price !== '' && v.price != null ? parseFloat(v.price) : null;
        const cost  = v.cost  !== '' && v.cost  != null ? parseFloat(v.cost)  : null;
        if (v.id) {
          await conn.execute(
            `UPDATE product_variants SET sku=?, barcode=?, price=?, cost=?, stock=?, min_stock=?, active=? WHERE id=?`,
            [v.sku || null, v.barcode || null, price, cost,
             parseInt(v.stock) || 0, parseInt(v.min_stock) || 0, v.active !== false ? 1 : 0, v.id]
          );
        } else {
          const [res] = await conn.execute(
            `INSERT INTO product_variants (product_id, tenant_id, sku, barcode, price, cost, stock, min_stock)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [product_id, tenant_id, v.sku || null, v.barcode || null,
             price, cost, parseInt(v.stock) || 0, parseInt(v.min_stock) || 0]
          );
          v.id = res.insertId;
          for (const avid of (v.attribute_value_ids || [])) {
            await conn.execute(
              'INSERT IGNORE INTO variant_attribute_values (variant_id, attribute_value_id) VALUES (?, ?)',
              [v.id, avid]
            );
          }
        }
      }
      await conn.commit();
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  },

  async findByCode(code, tenant_id) {
    const rows = await query(
      `SELECT pv.*,
              p.name AS product_name, p.id AS product_id,
              p.price AS base_price, p.cost AS base_cost,
              p.image_url, p.category_id, p.has_variants,
              c.name AS category_name, c.color AS category_color,
              GROUP_CONCAT(pav.value ORDER BY pa.position SEPARATOR ' / ') AS label
       FROM product_variants pv
       JOIN products p ON p.id = pv.product_id
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN variant_attribute_values vav ON vav.variant_id = pv.id
       LEFT JOIN product_attribute_values pav ON pav.id = vav.attribute_value_id
       LEFT JOIN product_attributes pa ON pa.id = pav.attribute_id
       WHERE (pv.sku = ? OR pv.barcode = ?) AND pv.tenant_id = ? AND pv.active = 1
       GROUP BY pv.id`,
      [code, code, tenant_id]
    );
    return rows[0] || null;
  },

  async adjustStock(variant_id, delta, conn_) {
    const fn = conn_
      ? (s, p) => conn_.execute(s, p)
      : (s, p) => query(s, p);
    await fn('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [delta, variant_id]);
  },

  async manualAdjust({ variant_id, product_id, quantity, notes, user_id }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      const [[current]] = await conn.execute('SELECT stock FROM product_variants WHERE id = ?', [variant_id]);
      const beforeStock = current?.stock ?? 0;
      const afterStock = beforeStock + quantity;
      await conn.execute('UPDATE product_variants SET stock = stock + ? WHERE id = ?', [quantity, variant_id]);
      await conn.execute(
        `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, notes, user_id)
         VALUES (?, 'adjustment', ?, ?, ?, ?, ?)`,
        [product_id, quantity, beforeStock, afterStock, notes || 'Ajuste manual de variante', user_id]
      );
      await conn.commit();
      return afterStock;
    } catch (e) { await conn.rollback(); throw e; }
    finally { conn.release(); }
  },
};
