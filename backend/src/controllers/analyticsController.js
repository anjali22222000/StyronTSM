import { pool } from "../config/db.js";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function adminDashboardAnalytics(req, res) {
  // ── Revenue: last 10 calendar months + this-month-vs-last-month growth ──
  const [monthlyRows] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') as ym, SUM(total) as revenue, COUNT(*) as orderCount
     FROM orders WHERE status != 'cancelled' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 10 MONTH)
     GROUP BY ym ORDER BY ym ASC`
  );
  const now = new Date();
  const months = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const found = monthlyRows.find((r) => r.ym === ym);
    months.push({ label: MONTH_LABELS[d.getMonth()], revenue: found ? Number(found.revenue) : 0, orders: found ? found.orderCount : 0 });
  }
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2] || { revenue: 0, orders: 0 };

  // ── New customers this month vs last month ──
  const [[customerThisMonth]] = await pool.query(
    `SELECT COUNT(*) as c FROM users WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  );
  const [[customerLastMonth]] = await pool.query(
    `SELECT COUNT(*) as c FROM users
     WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
       AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  );

  // ── Quotations this month vs last month ──
  const [[quotThisMonth]] = await pool.query(
    `SELECT COUNT(*) as c FROM quotations WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  );
  const [[quotLastMonth]] = await pool.query(
    `SELECT COUNT(*) as c FROM quotations
     WHERE created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 1 MONTH)
       AND created_at < DATE_FORMAT(CURDATE(), '%Y-%m-01')`
  );

  // ── Payments summary ──
  const [[paymentsSummary]] = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status='paid' THEN amount ELSE 0 END),0) as totalPaid,
      COUNT(CASE WHEN status='pending' THEN 1 END) as pendingCount,
      COUNT(CASE WHEN status='paid' THEN 1 END) as paidCount
     FROM payments`
  );

  // ── Top products by revenue, this calendar month ──
  const [topProducts] = await pool.query(
    `SELECT oi.product_name as name, SUM(oi.quantity) as units, SUM(oi.line_total) as revenue
     FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.status != 'cancelled' AND o.created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
     GROUP BY oi.product_name ORDER BY revenue DESC LIMIT 5`
  );
  const topRevenueTotal = topProducts.reduce((s, p) => s + Number(p.revenue), 0) || 1;
  const topProductsWithPct = topProducts.map((p) => ({
    name: p.name, units: p.units, revenue: Number(p.revenue),
    pct: Math.round((Number(p.revenue) / topRevenueTotal) * 1000) / 10,
  }));

  // ── Recent orders ──
  const [recentOrders] = await pool.query(
    `SELECT id, order_number, guest_name, user_id, total, status, created_at FROM orders
     ORDER BY created_at DESC LIMIT 5`
  );
  const recentOrderIds = recentOrders.map((o) => o.order_number);
 const [firstItems] = recentOrderIds.length
  ? await pool.query(
      `SELECT order_id, ANY_VALUE(product_name) AS product_name
       FROM order_items
       WHERE order_id IN (
         SELECT id FROM orders WHERE order_number IN (?)
       )
       GROUP BY order_id`,
      [recentOrderIds]
    )
  : [[]];
  // ── Inventory health: active products, flagged by min_stock ──
  const [inventory] = await pool.query(
    `SELECT name, sku, stock_quantity, min_stock FROM products
     WHERE status = 'active' ORDER BY (stock_quantity <= min_stock) DESC, stock_quantity ASC LIMIT 8`
  );

  res.json({
    success: true,
    data: {
      revenue: {
        mtd: thisMonth.revenue,
        growth: pctChange(thisMonth.revenue, lastMonth.revenue),
        months: months.map((m) => m.label),
        monthly: months.map((m) => Math.round(m.revenue / 100000)), // in lakhs, matching original UI's *100000 multiplier
      },
      orders: {
        mtd: thisMonth.orders,
        growth: pctChange(thisMonth.orders, lastMonth.orders),
        monthly: months.map((m) => m.orders),
      },
      customers: {
        newMtd: customerThisMonth.c,
        growth: pctChange(customerThisMonth.c, customerLastMonth.c),
      },
      quotations: { mtd: quotThisMonth.c, growth: pctChange(quotThisMonth.c, quotLastMonth.c) },
      payments: {
        totalPaid: Number(paymentsSummary.totalPaid),
        pendingCount: paymentsSummary.pendingCount,
        paidCount: paymentsSummary.paidCount,
      },
      topProducts: topProductsWithPct,
      recentOrders: recentOrders.map((o) => ({
        id: o.order_number,
        customer: o.guest_name || (o.user_id ? `Account #${o.user_id}` : "Guest"),
        product: firstItems.find((i) => i.order_id === o.id)?.product_name || "Multiple items",
        date: new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
        amount: Number(o.total),
        status: o.status,
      })),
      inventory: inventory.map((p) => {
        const max = Math.max(p.stock_quantity, p.min_stock * 3, 1);
        return {
          name: p.name, sku: p.sku || "—", available: p.stock_quantity, max,
          unit: "units", low: p.stock_quantity <= p.min_stock, incoming: 0,
        };
      }),
    },
  });
}
