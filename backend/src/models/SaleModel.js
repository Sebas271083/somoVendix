import { query, getConnection } from '../config/database.js';
import { ProductVariantModel } from './ProductVariantModel.js';
import { StockLotModel } from './StockLotModel.js';
import { LoyaltyModel } from './LoyaltyModel.js';
import { InstallmentModel } from './InstallmentModel.js';

export const SaleModel = {
  async findAll({ from, to, user_id, customer_id, status, ticket_number, payment_method, tenant_id } = {}) {
    let sql = `
      SELECT s.*, u.name AS user_name, c.name AS customer_name
      FROM sales s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.tenant_id = ?
    `;
    const params = [tenant_id];
    if (from) { sql += ' AND DATE(s.created_at) >= ?'; params.push(from); }
    if (to)   { sql += ' AND DATE(s.created_at) <= ?'; params.push(to); }
    if (user_id) { sql += ' AND s.user_id = ?'; params.push(user_id); }
    if (customer_id) { sql += ' AND s.customer_id = ?'; params.push(customer_id); }
    if (status) { sql += ' AND s.status = ?'; params.push(status); }
    if (ticket_number) { sql += ' AND s.ticket_number = ?'; params.push(ticket_number); }
    if (payment_method) { sql += ' AND s.payment_method = ?'; params.push(payment_method); }
    sql += ' ORDER BY s.created_at DESC LIMIT 200';
    return query(sql, params);
  },

  async findById(id) {
    const rows = await query(
      `SELECT s.*, u.name AS user_name,
       c.name AS customer_name, c.email AS customer_email,
       c.iva_condition AS customer_iva_condition,
       c.document_type AS customer_document_type,
       c.document_number AS customer_document_number
       FROM sales s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN customers c ON s.customer_id = c.id
       WHERE s.id = ?`,
      [id]
    );
    const sale = rows[0];
    if (!sale) return null;
    sale.items = await query(
      `SELECT si.*, p.name AS product_name, p.code AS product_code
       FROM sale_items si JOIN products p ON si.product_id = p.id
       WHERE si.sale_id = ?`,
      [id]
    );
    return sale;
  },

  async create({
    customer_id, user_id, tenant_id, items,
    subtotal, discount = 0, tax = 0, total,
    payment_method, payment_details, notes = null,
    paid_amount = null,
    redeem_points = 0,
    installments = null,
  }) {
    const conn = await getConnection();
    try {
      await conn.beginTransaction();

      const [[{ next_num }]] = await conn.execute(
        `SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next_num
         FROM sales WHERE tenant_id = ? AND DATE(created_at) = CURDATE()`,
        [tenant_id]
      );

      // Determinar método de valoración del tenant
      const [[settingRow]] = await conn.execute(
        "SELECT `value` FROM settings WHERE tenant_id = ? AND `key` = 'stock_valuation_method'",
        [tenant_id]
      );
      const valuationMethod = settingRow?.value || 'weighted_avg';

      // Asociar con la caja abierta del usuario si existe
      const [[openRegister]] = await conn.execute(
        `SELECT id FROM cash_registers WHERE tenant_id = ? AND user_id = ? AND status = 'open' LIMIT 1`,
        [tenant_id, user_id]
      );
      const cash_register_id = openRegister?.id || null;

      const [saleResult] = await conn.execute(
        `INSERT INTO sales
           (tenant_id, ticket_number, customer_id, user_id, cash_register_id, subtotal, discount, tax, total,
            payment_method, payment_details, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
        [tenant_id, next_num, customer_id, user_id, cash_register_id, subtotal, discount, tax, total,
         payment_method, JSON.stringify(payment_details || {}), notes]
      );
      const sale_id = saleResult.insertId;

      for (const item of items) {
        const variantId = item.variant_id ?? null;
        let unitCost = 0;

        if (variantId) {
          const [[vProd]] = await conn.execute('SELECT cost FROM product_variants WHERE id = ?', [variantId]);
          unitCost = valuationMethod === 'fifo'
            ? await StockLotModel.deductFIFO(conn, tenant_id, item.product_id, variantId, item.quantity)
            : (vProd?.cost ?? 0);
        } else {
          const [[prod]] = await conn.execute('SELECT cost FROM products WHERE id = ?', [item.product_id]);
          unitCost = valuationMethod === 'fifo'
            ? await StockLotModel.deductFIFO(conn, tenant_id, item.product_id, null, item.quantity)
            : (prod?.cost ?? 0);
        }

        await conn.execute(
          `INSERT INTO sale_items (sale_id, product_id, variant_id, quantity, unit_price, unit_cost, discount, subtotal, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [sale_id, item.product_id, variantId, item.quantity, item.unit_price, unitCost, item.discount || 0, item.subtotal, item.notes || null]
        );

        if (variantId) {
          await ProductVariantModel.adjustStock(variantId, -item.quantity, conn);
          const [[vrow]] = await conn.execute('SELECT stock FROM product_variants WHERE id = ?', [variantId]);
          const afterVStock = (vrow?.stock ?? 0);
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
             VALUES (?, 'sale', ?, ?, ?, ?, 'Venta (variante)', ?)`,
            [item.product_id, item.quantity, afterVStock + item.quantity, afterVStock, sale_id, user_id]
          );
        } else {
          const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          const beforeStock = prod?.stock ?? 0;
          const afterStock = beforeStock - item.quantity;
          await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
             VALUES (?, 'sale', ?, ?, ?, ?, 'Venta', ?)`,
            [item.product_id, item.quantity, beforeStock, afterStock, sale_id, user_id]
          );
        }
      }

      const creditAmount = (paid_amount !== null && paid_amount < total)
        ? total - paid_amount
        : (payment_method === 'cuenta_corriente' || payment_method === 'cuotas' ? total : 0);

      if (creditAmount > 0 && customer_id) {
        await conn.execute(
          'UPDATE customers SET balance = balance + ? WHERE id = ?',
          [creditAmount, customer_id]
        );
        if (paid_amount !== null && paid_amount > 0) {
          await conn.execute(
            `INSERT INTO payments (tenant_id, customer_id, sale_id, amount, method, notes, user_id)
             VALUES (?, ?, ?, ?, ?, 'Pago parcial al momento de la venta', ?)`,
            [tenant_id, customer_id, sale_id, paid_amount, payment_method === 'mixto' ? 'efectivo' : payment_method, user_id]
          );
        }
      }

      const cashAmount = paid_amount !== null ? paid_amount : (payment_method === 'cuenta_corriente' || payment_method === 'cuotas' ? 0 : total);
      if (cashAmount > 0) {
        await conn.execute(
          `INSERT INTO cash_flow (tenant_id, type, amount, description, category, payment_method, reference_type, reference_id, user_id)
           VALUES (?, 'income', ?, ?, 'Ventas', ?, 'sale', ?, ?)`,
          [tenant_id, cashAmount, `Venta #${next_num}`, payment_method, sale_id, user_id]
        );
      }

      // Redimir puntos si se solicitó
      if (redeem_points > 0 && customer_id) {
        await LoyaltyModel.redeemInSale(conn, tenant_id, customer_id, redeem_points, sale_id);
      }

      // Otorgar puntos por la compra
      const amountForPoints = paid_amount !== null ? paid_amount : (payment_method === 'cuenta_corriente' || payment_method === 'cuotas' ? 0 : total);
      if (amountForPoints > 0 && customer_id) {
        await LoyaltyModel.earnFromSale(conn, tenant_id, customer_id, amountForPoints, sale_id);
      }

      // Crear plan de cuotas si corresponde
      if (payment_method === 'cuotas' && installments?.n > 1) {
        const plan_id = await InstallmentModel.createPlan(conn, {
          tenant_id, sale_id, customer_id,
          n_installments: installments.n,
          interest_rate: installments.interest_rate || 0,
          total_sale: total,
        });
        await conn.execute('UPDATE sales SET installment_plan_id = ? WHERE id = ?', [plan_id, sale_id]);
      }

      await conn.commit();
      return sale_id;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async cancel(id, user_id) {
    const sale = await SaleModel.findById(id);
    if (!sale || sale.status === 'cancelled') return;
    const conn = await getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute("UPDATE sales SET status='cancelled' WHERE id=?", [id]);

      for (const item of sale.items) {
        if (item.variant_id) {
          await ProductVariantModel.adjustStock(item.variant_id, item.quantity, conn);
          const [[vrow]] = await conn.execute('SELECT stock FROM product_variants WHERE id = ?', [item.variant_id]);
          const afterVStock = vrow?.stock ?? 0;
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
             VALUES (?, 'cancel', ?, ?, ?, ?, 'Anulación de venta (variante)', ?)`,
            [item.product_id, item.quantity, afterVStock - item.quantity, afterVStock, id, user_id]
          );
        } else {
          const [[prod]] = await conn.execute('SELECT stock FROM products WHERE id = ?', [item.product_id]);
          const beforeStock = prod?.stock ?? 0;
          await conn.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
          await conn.execute(
            `INSERT INTO stock_movements (product_id, type, quantity, before_stock, after_stock, reference_id, notes, user_id)
             VALUES (?, 'cancel', ?, ?, ?, ?, 'Anulación de venta', ?)`,
            [item.product_id, item.quantity, beforeStock, beforeStock + item.quantity, id, user_id]
          );
        }
      }

      if (sale.payment_method === 'cuenta_corriente' && sale.customer_id) {
        await conn.execute(
          'UPDATE customers SET balance = balance - ? WHERE id = ?',
          [sale.total, sale.customer_id]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  async getDailySummary(date, tenant_id) {
    return query(
      `SELECT
         payment_method,
         COUNT(*) AS count,
         SUM(total) AS total_amount,
         SUM(discount) AS total_discounts
       FROM sales
       WHERE tenant_id = ? AND DATE(created_at) = ? AND status = 'completed'
       GROUP BY payment_method`,
      [tenant_id, date]
    );
  },
};
