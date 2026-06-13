import { query } from '../config/database.js';

export const ReportModel = {
  async getSalesByPeriod(from, to, tenant_id) {
    return query(
      `SELECT
         DATE(s.created_at) AS date,
         COUNT(*) AS count,
         SUM(s.total) AS total,
         SUM(s.discount) AS discounts,
         AVG(s.total) AS avg_ticket
       FROM sales s
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY DATE(s.created_at)
       ORDER BY date ASC`,
      [tenant_id, from, to]
    );
  },

  async getSalesByPaymentMethod(from, to, tenant_id) {
    return query(
      `SELECT
         payment_method,
         COUNT(*) AS count,
         SUM(total) AS total
       FROM sales
       WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
       GROUP BY payment_method
       ORDER BY total DESC`,
      [tenant_id, from, to]
    );
  },

  async getTopProducts(from, to, limit = 10, tenant_id) {
    return query(
      `SELECT
         p.id, p.name, p.code,
         c.name AS category_name,
         SUM(si.quantity) AS total_qty,
         SUM(si.subtotal) AS total_revenue,
         COUNT(DISTINCT si.sale_id) AS sale_count
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY p.id
       ORDER BY total_qty DESC
       LIMIT ?`,
      [tenant_id, from, to, limit]
    );
  },

  async getTopCustomers(from, to, limit = 10, tenant_id) {
    return query(
      `SELECT
         c.id, c.name, c.phone,
         COUNT(s.id) AS total_sales,
         SUM(s.total) AS total_spent,
         AVG(s.total) AS avg_ticket,
         MAX(s.created_at) AS last_purchase
       FROM customers c
       JOIN sales s ON s.customer_id = c.id
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
         AND c.name != 'Consumidor Final'
       GROUP BY c.id
       ORDER BY total_spent DESC
       LIMIT ?`,
      [tenant_id, from, to, limit]
    );
  },

  async getSalesBySeller(from, to, tenant_id) {
    return query(
      `SELECT
         u.id, u.name,
         COUNT(s.id) AS total_sales,
         SUM(s.total) AS total_amount,
         AVG(s.total) AS avg_ticket
       FROM users u
       JOIN sales s ON s.user_id = u.id
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY u.id
       ORDER BY total_amount DESC`,
      [tenant_id, from, to]
    );
  },

  async getSalesByCategory(from, to, tenant_id) {
    return query(
      `SELECT
         c.name AS category,
         c.color,
         SUM(si.quantity) AS total_qty,
         SUM(si.subtotal) AS total_revenue
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY c.id
       ORDER BY total_revenue DESC`,
      [tenant_id, from, to]
    );
  },

  async getInventoryValue(tenant_id) {
    const rows = await query(`
      SELECT
        COUNT(*) AS total_products,
        SUM(stock) AS total_units,
        SUM(stock * cost) AS inventory_cost,
        SUM(stock * price) AS inventory_value,
        SUM(stock * (price - cost)) AS potential_profit
      FROM products
      WHERE tenant_id = ? AND active = 1
    `, [tenant_id]);
    return rows[0];
  },

  async getDashboardStats(tenant_id) {
    const today = new Date().toISOString().split('T')[0];
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    const [todayStats] = await query(
      `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total),0) AS sales_total, COALESCE(AVG(total),0) AS avg_ticket
       FROM sales WHERE tenant_id = ? AND DATE(created_at) = ? AND status = 'completed'`,
      [tenant_id, today]
    );
    const [monthStats] = await query(
      `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total),0) AS sales_total
       FROM sales WHERE tenant_id = ? AND DATE(created_at) >= ? AND status = 'completed'`,
      [tenant_id, monthStart]
    );
    const [lowStockCount] = await query(
      `SELECT COUNT(*) AS count FROM products WHERE tenant_id = ? AND stock <= min_stock AND active = 1`,
      [tenant_id]
    );
    const [receivablesTotal] = await query(
      `SELECT COALESCE(SUM(balance),0) AS total FROM customers WHERE tenant_id = ? AND balance > 0`,
      [tenant_id]
    );
    const [expensesMonth] = await query(
      `SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE tenant_id = ? AND status='paid' AND MONTH(paid_at)=MONTH(CURDATE())`,
      [tenant_id]
    );

    return {
      today: todayStats,
      month: monthStats,
      low_stock_count: lowStockCount.count,
      receivables_total: receivablesTotal.total,
      expenses_month: expensesMonth.total,
    };
  },
};
