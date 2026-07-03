import { query } from '../config/database.js';

export const ReportModel = {
  async getSalesByPeriod(from, to, tenant_id) {
    return query(
      `SELECT
         DATE(s.created_at) AS date,
         COUNT(*) AS count,
         SUM(s.total) AS total,
         SUM(s.discount) AS discounts,
         AVG(s.total) AS avg_ticket,
         SUM(si.quantity * p.cost) AS cost,
         SUM(s.total) - SUM(si.quantity * p.cost) AS profit
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       JOIN products p ON p.id = si.product_id
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
         SUM(si.quantity * p.cost) AS total_cost,
         SUM(si.subtotal) - SUM(si.quantity * p.cost) AS profit,
         COUNT(DISTINCT si.sale_id) AS sale_count
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.tenant_id = ? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
       GROUP BY p.id
       ORDER BY total_qty DESC
       LIMIT ${parseInt(limit) || 10}`,
      [tenant_id, from, to]
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
       LIMIT ${parseInt(limit) || 10}`,
      [tenant_id, from, to]
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
         COALESCE(c.name, 'Sin categoría') AS category_name,
         c.color,
         SUM(si.quantity) AS total_qty,
         SUM(si.subtotal) AS total_revenue,
         SUM(si.quantity * p.cost) AS total_cost,
         SUM(si.subtotal) - SUM(si.quantity * p.cost) AS profit
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
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

  async getIncomeStatement(from, to, tenant_id) {
    const [[sales], [cogs], [returns], [expenses]] = await Promise.all([
      query(
        `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total),0) AS revenue,
                COALESCE(SUM(discount),0) AS discounts
         FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'`,
        [tenant_id, from, to]
      ),
      query(
        `SELECT COALESCE(SUM(si.quantity * p.cost),0) AS cogs
         FROM sales s
         JOIN sale_items si ON si.sale_id = s.id
         JOIN products p ON p.id = si.product_id
         WHERE s.tenant_id=? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status='completed'`,
        [tenant_id, from, to]
      ),
      query(
        `SELECT COALESCE(SUM(total),0) AS total FROM returns
         WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ?`,
        [tenant_id, from, to]
      ),
      query(
        `SELECT COALESCE(SUM(amount),0) AS total FROM expenses
         WHERE tenant_id=? AND status='paid' AND DATE(paid_at) BETWEEN ? AND ?`,
        [tenant_id, from, to]
      ),
    ]);
    const expensesByCategory = await query(
      `SELECT category, COALESCE(SUM(amount),0) AS total FROM expenses
       WHERE tenant_id=? AND status='paid' AND DATE(paid_at) BETWEEN ? AND ?
       GROUP BY category ORDER BY total DESC`,
      [tenant_id, from, to]
    );
    const byCategory = await query(
      `SELECT COALESCE(c.name,'Sin categoría') AS category_name,
              COALESCE(SUM(si.subtotal),0) AS revenue,
              COALESCE(SUM(si.quantity * p.cost),0) AS cost,
              COALESCE(SUM(si.subtotal) - SUM(si.quantity * p.cost),0) AS gross_profit
       FROM sale_items si
       JOIN products p ON si.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       JOIN sales s ON si.sale_id = s.id
       WHERE s.tenant_id=? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status='completed'
       GROUP BY c.id ORDER BY revenue DESC`,
      [tenant_id, from, to]
    );

    const revenue     = parseFloat(sales.revenue);
    const cogs_total  = parseFloat(cogs.cogs);
    const returns_amt = parseFloat(returns.total);
    const net_revenue = revenue - returns_amt;
    const gross_profit = net_revenue - cogs_total;
    const expenses_total = parseFloat(expenses.total);
    const operating_profit = gross_profit - expenses_total;

    return {
      sales_count:        parseInt(sales.sales_count),
      revenue,
      discounts:          parseFloat(sales.discounts),
      returns:            returns_amt,
      net_revenue,
      cogs:               cogs_total,
      gross_profit,
      gross_margin:       net_revenue > 0 ? (gross_profit / net_revenue * 100) : 0,
      expenses:           expenses_total,
      operating_profit,
      operating_margin:   net_revenue > 0 ? (operating_profit / net_revenue * 100) : 0,
      by_category:        byCategory,
      expenses_by_category: expensesByCategory,
    };
  },

  async getComparison(from, to, tenant_id) {
    const fromDate = new Date(from);
    const toDate   = new Date(to);
    const diffDays = Math.round((toDate - fromDate) / 86400000) + 1;
    const prevToDate   = new Date(fromDate.getTime() - 86400000);
    const prevFromDate = new Date(prevToDate.getTime() - (diffDays - 1) * 86400000);
    const prevFrom = prevFromDate.toISOString().split('T')[0];
    const prevTo   = prevToDate.toISOString().split('T')[0];

    const [[cur], [prev], [curProfit], [prevProfit], curDays, prevDays] = await Promise.all([
      query(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue,
             COALESCE(AVG(total),0) AS avg_ticket, COALESCE(SUM(discount),0) AS discounts
             FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'`,
        [tenant_id, from, to]),
      query(`SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS revenue,
             COALESCE(AVG(total),0) AS avg_ticket, COALESCE(SUM(discount),0) AS discounts
             FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'`,
        [tenant_id, prevFrom, prevTo]),
      query(`SELECT COALESCE(SUM(si.subtotal - si.quantity*p.cost),0) AS profit
             FROM sales s JOIN sale_items si ON si.sale_id=s.id JOIN products p ON p.id=si.product_id
             WHERE s.tenant_id=? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status='completed'`,
        [tenant_id, from, to]),
      query(`SELECT COALESCE(SUM(si.subtotal - si.quantity*p.cost),0) AS profit
             FROM sales s JOIN sale_items si ON si.sale_id=s.id JOIN products p ON p.id=si.product_id
             WHERE s.tenant_id=? AND DATE(s.created_at) BETWEEN ? AND ? AND s.status='completed'`,
        [tenant_id, prevFrom, prevTo]),
      query(`SELECT DATE(created_at) AS date, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
             FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'
             GROUP BY DATE(created_at) ORDER BY date`,
        [tenant_id, from, to]),
      query(`SELECT DATE(created_at) AS date, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
             FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'
             GROUP BY DATE(created_at) ORDER BY date`,
        [tenant_id, prevFrom, prevTo]),
    ]);

    const chart = [];
    for (let i = 0; i < diffDays; i++) {
      const cd = new Date(fromDate.getTime() + i * 86400000).toISOString().split('T')[0];
      const pd = new Date(prevFromDate.getTime() + i * 86400000).toISOString().split('T')[0];
      const cf = curDays.find(r => r.date?.toString().startsWith(cd));
      const pf = prevDays.find(r => r.date?.toString().startsWith(pd));
      chart.push({ day: `D${i+1}`, actual: parseFloat(cf?.revenue||0), anterior: parseFloat(pf?.revenue||0) });
    }

    const growth = (a, b) => parseFloat(b) > 0 ? ((parseFloat(a) - parseFloat(b)) / parseFloat(b) * 100) : null;
    return {
      current:  { from, to, count: parseInt(cur.count), revenue: parseFloat(cur.revenue), avg_ticket: parseFloat(cur.avg_ticket), profit: parseFloat(curProfit.profit) },
      previous: { from: prevFrom, to: prevTo, count: parseInt(prev.count), revenue: parseFloat(prev.revenue), avg_ticket: parseFloat(prev.avg_ticket), profit: parseFloat(prevProfit.profit) },
      growth: {
        revenue:    growth(cur.revenue, prev.revenue),
        count:      growth(cur.count, prev.count),
        avg_ticket: growth(cur.avg_ticket, prev.avg_ticket),
        profit:     growth(curProfit.profit, prevProfit.profit),
      },
      chart,
    };
  },

  async getProjection(tenant_id) {
    const now    = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today  = now.toISOString().split('T')[0];
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth  = now.getDate();

    const [dailySales, last3m] = await Promise.all([
      query(`SELECT DATE(created_at) AS date, COALESCE(SUM(total),0) AS revenue
             FROM sales WHERE tenant_id=? AND DATE(created_at) BETWEEN ? AND ? AND status='completed'
             GROUP BY DATE(created_at) ORDER BY date`,
        [tenant_id, mStart, today]),
      query(`SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COALESCE(SUM(total),0) AS revenue, COUNT(*) AS count
             FROM sales WHERE tenant_id=? AND DATE(created_at) >= DATE_SUB(CURDATE(), INTERVAL 90 DAY) AND status='completed'
             GROUP BY month ORDER BY month`,
        [tenant_id]),
    ]);

    const filled = [];
    for (let i = 1; i <= dayOfMonth; i++) {
      const d = new Date(now.getFullYear(), now.getMonth(), i).toISOString().split('T')[0];
      const f = dailySales.find(s => s.date?.toString().startsWith(d));
      filled.push({ day: i, date: d, revenue: parseFloat(f?.revenue || 0) });
    }

    const n    = filled.length;
    const sumY = filled.reduce((s, d) => s + d.revenue, 0);
    const avg  = sumY / Math.max(n, 1);

    let a = avg, b = 0;
    if (n >= 2) {
      const sumX  = filled.reduce((s, d) => s + d.day, 0);
      const sumXY = filled.reduce((s, d) => s + d.day * d.revenue, 0);
      const sumX2 = filled.reduce((s, d) => s + d.day * d.day, 0);
      b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      a = (sumY - b * sumX) / n;
    }

    const projection = [];
    let projTotal = sumY;
    for (let i = dayOfMonth + 1; i <= daysInMonth; i++) {
      const v = Math.max(0, a + b * i);
      projTotal += v;
      projection.push({ day: i, projected: Math.round(v) });
    }

    const trend = b > avg * 0.02 ? 'up' : b < -avg * 0.02 ? 'down' : 'stable';
    return {
      daily: filled,
      projection,
      projected_total: Math.round(projTotal),
      actual_to_date:  Math.round(sumY),
      daily_avg:       Math.round(avg),
      trend,
      days_elapsed:    dayOfMonth,
      days_remaining:  daysInMonth - dayOfMonth,
      days_in_month:   daysInMonth,
      monthly_context: last3m,
    };
  },

  async getReturnsSummary(from, to, tenant_id) {
    const rows = await query(
      `SELECT
         COUNT(*) AS count,
         SUM(r.total) AS total,
         SUM(CASE WHEN r.type = 'exchange' THEN 1 ELSE 0 END) AS exchanges,
         SUM(CASE WHEN r.type = 'return' OR r.type IS NULL THEN 1 ELSE 0 END) AS returns,
         r.refund_method
       FROM returns r
       WHERE r.tenant_id = ? AND DATE(r.created_at) BETWEEN ? AND ?
       GROUP BY r.refund_method`,
      [tenant_id, from, to]
    );
    const totals = await query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total),0) AS total
       FROM returns WHERE tenant_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
      [tenant_id, from, to]
    );
    return { by_method: rows, summary: totals[0] };
  },

  async getDashboardStats(tenant_id) {
    // Use CURDATE() / DATE_FORMAT(CURDATE(),...) so the comparison uses the DB server's
    // local date — avoids mismatch when Node.js toISOString() gives UTC but timestamps
    // are stored in local timezone.
    const [todayStats] = await query(
      `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total),0) AS sales_total, COALESCE(AVG(total),0) AS avg_ticket
       FROM sales WHERE tenant_id = ? AND DATE(created_at) = CURDATE() AND status = 'completed'`,
      [tenant_id]
    );
    const [todayProfit] = await query(
      `SELECT COALESCE(SUM(si.subtotal - si.quantity * p.cost), 0) AS profit
       FROM sales s
       JOIN sale_items si ON si.sale_id = s.id
       JOIN products p ON p.id = si.product_id
       WHERE s.tenant_id = ? AND DATE(s.created_at) = CURDATE() AND s.status = 'completed'`,
      [tenant_id]
    );
    const [monthStats] = await query(
      `SELECT COUNT(*) AS sales_count, COALESCE(SUM(total),0) AS sales_total
       FROM sales WHERE tenant_id = ? AND DATE(created_at) >= DATE_FORMAT(CURDATE(),'%Y-%m-01') AND status = 'completed'`,
      [tenant_id]
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
    const paymentMethods = await query(
      `SELECT payment_method, COUNT(*) AS count, COALESCE(SUM(total),0) AS total
       FROM sales WHERE tenant_id = ? AND DATE(created_at) = CURDATE() AND status = 'completed'
       GROUP BY payment_method ORDER BY total DESC`,
      [tenant_id]
    );
    const [openRegister] = await query(
      `SELECT cr.id, cr.opening_amount, cr.opened_at, u.name AS user_name
       FROM cash_registers cr JOIN users u ON u.id = cr.user_id
       WHERE cr.tenant_id = ? AND cr.status = 'open' LIMIT 1`,
      [tenant_id]
    );
    const [pendingOC] = await query(
      `SELECT COUNT(*) AS count FROM purchase_orders WHERE tenant_id = ? AND status = 'pending'`,
      [tenant_id]
    );
    const recentSales = await query(
      `SELECT s.id, s.ticket_number, s.total, s.payment_method, s.created_at, c.name AS customer_name
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.tenant_id = ? AND s.status = 'completed'
       ORDER BY s.created_at DESC LIMIT 5`,
      [tenant_id]
    );

    return {
      today: { ...todayStats, profit: todayProfit.profit },
      month: monthStats,
      low_stock_count: lowStockCount.count,
      receivables_total: receivablesTotal.total,
      expenses_month: expensesMonth.total,
      payment_methods: paymentMethods,
      open_register: openRegister || null,
      pending_oc: pendingOC.count,
      recent_sales: recentSales,
    };
  },
};
