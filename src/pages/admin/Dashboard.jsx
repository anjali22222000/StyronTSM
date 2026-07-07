import { ADMIN_BASE_PATH } from "../../config/adminRoutes";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { TrendingUp, TrendingDown, Package, Users, FileText, ShoppingCart, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { fmt, STATUS_CONFIG, INR_WORDS } from "../../utils";
import { Link } from "react-router-dom";

const PIE_COLORS = ["#0b1628", "#f97316", "#64748b", "#16a34a", "#7c3aed"];

// Backend order statuses don't map 1:1 onto STATUS_CONFIG (built for a different
// status set) — same bridging approach used in TrackOrder.jsx / AdminOrders.jsx.
const BACKEND_STATUS_TO_BADGE = {
  placed: "confirmed", processing: "confirmed", manufacturing: "manufacturing",
  quality_check: "packed", dispatched: "shipped", delivered: "delivered", cancelled: "cancelled",
};

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApiFetch("/analytics/admin/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || "Couldn't load analytics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>;
  }
  if (error || !data) {
    return <div className="py-24 text-center text-steel-500">{error || "No data available."}</div>;
  }

  const { revenue, orders, customers, quotations, payments, topProducts, recentOrders, inventory } = data;
  const lowStockCount = inventory.filter(i => i.low).length;

  const revenueData = revenue.months.map((m, i) => ({
    month: m,
    revenue: revenue.monthly[i] * 100000,
    orders: orders.monthly?.[i] ?? 0,
  })).filter(d => d.revenue > 0);

  const trendData = revenueData.map(d => ({
    month: d.month,
    Revenue: d.revenue,
    Orders: d.orders,
  }));

  const KPI_CARDS = [
    { label: "Revenue (MTD)", value: `₹${INR_WORDS(revenue.mtd)}`, change: revenue.growth, positive: revenue.growth >= 0, icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
    { label: "Orders (MTD)",  value: orders.mtd,                   change: orders.growth,   positive: orders.growth >= 0, icon: ShoppingCart, color: "bg-green-50 text-green-600" },
    { label: "New Customers", value: customers.newMtd,             change: customers.growth, positive: customers.growth >= 0, icon: Users, color: "bg-purple-50 text-purple-600" },
    { label: "Quotations",    value: quotations.mtd,               change: quotations.growth, positive: quotations.growth >= 0, icon: FileText, color: "bg-orange-50 text-orange-600" },
    { label: "Payments Collected", value: `₹${INR_WORDS(payments?.totalPaid || 0)}`, change: 0, positive: true, icon: TrendingUp, color: "bg-teal-50 text-teal-600", hideChange: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight">Admin Dashboard</h1>
          <p className="text-steel-500 text-sm">Good morning · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/quotation" className="btn-outline text-xs py-2 px-4">New Quotation</Link>
          <Link to="/products" className="btn-primary text-xs py-2 px-4">+ Add Product</Link>
        </div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 font-medium">
            <strong>{lowStockCount} product{lowStockCount !== 1 ? "s" : ""}</strong> running low on stock —
            <button className="text-orange-500 font-bold ml-1 hover:underline">View inventory →</button>
          </p>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {KPI_CARDS.map(({ label, value, change, positive, icon: Icon, color, hideChange }, i) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className="card p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider">{label}</p>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon size={16} />
              </div>
            </div>
            <p className="text-2xl font-black text-navy-950 tracking-tight mb-1">{value}</p>
            {!hideChange && (
              <div className="flex items-center gap-1.5">
                {positive ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
                <span className={`text-xs font-bold ${positive ? "text-green-600" : "text-red-600"}`}>
                  {positive ? "+" : ""}{change}%
                </span>
                <span className="text-xs text-steel-400">vs last month</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Revenue bar chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-navy-950">Monthly Revenue</h3>
            <span className="badge badge-green text-xs">+{revenue.growth}% YOY</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip
                formatter={v => [fmt(v), "Revenue"]}
                contentStyle={{ background: "#0b1628", border: "none", borderRadius: "10px", color: "white", fontSize: "12px" }}
                cursor={{ fill: "rgba(11,22,40,0.04)" }}
              />
              <Bar dataKey="revenue" fill="#0b1628" radius={[4, 4, 0, 0]}>
                {revenueData.map((entry, i) => (
                  <Cell key={i} fill={i === revenueData.length - 1 ? "#f97316" : "#0b1628"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top products pie */}
        <div className="card p-5">
          <h3 className="font-bold text-navy-950 mb-5">Revenue Mix</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={topProducts.slice(0, 5)} dataKey="revenue" cx="50%" cy="50%" innerRadius={35} outerRadius={55}>
                {topProducts.slice(0, 5).map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={v => [fmt(v), "Revenue"]} contentStyle={{ background: "#0b1628", border: "none", borderRadius: "10px", color: "white", fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-3">
            {topProducts.slice(0, 4).map(({ name, revenue: rev, pct }, i) => (
              <div key={name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: PIE_COLORS[i] }} />
                <span className="text-xs text-steel-600 flex-1 truncate">{name.split("—")[0].trim()}</span>
                <span className="text-xs font-bold text-navy-950">{fmt(rev)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sales Trend + Monthly Orders */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Sales Trend (Area) */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-navy-950">Sales Trend</h3>
            <span className="text-xs text-steel-400">Last 12 months</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip
                formatter={(v, name) => [name === "Revenue" ? fmt(v) : v, name]}
                contentStyle={{ background: "#0b1628", border: "none", borderRadius: "10px", color: "white", fontSize: "11px" }}
              />
              <Area type="monotone" dataKey="Revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Orders Line */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-navy-950">Monthly Orders</h3>
            <span className={`badge ${orders.growth >= 0 ? "badge-green" : "badge-red"} text-xs`}>{orders.growth >= 0 ? "+" : ""}{orders.growth}% vs last month</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <defs>
                <linearGradient id="ordGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0b1628" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#0b1628" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                formatter={(v) => [v, "Orders"]}
                contentStyle={{ background: "#0b1628", border: "none", borderRadius: "10px", color: "white", fontSize: "11px" }}
              />
              <Line type="monotone" dataKey="Orders" stroke="#0b1628" strokeWidth={2.5} dot={{ r: 3, fill: "#f97316", strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Orders + Inventory row */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent orders */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-100 flex items-center justify-between">
            <h3 className="font-bold text-navy-950">Recent Orders</h3>
             <Link to={`${ADMIN_BASE_PATH}/orders`}className="text-xs text-orange-500 font-semibold hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
          </div>
          <div className="divide-y divide-steel-100">
            {recentOrders.map(o => (
              <div key={o.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-steel-50 transition-colors">
                <div className="w-9 h-9 bg-navy-950 rounded-xl flex items-center justify-center text-orange-400 text-xs font-black flex-shrink-0">
                  {o.id.slice(-3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-navy-950 text-sm truncate">{o.customer}</p>
                  <p className="text-xs text-steel-500 truncate">{o.product} · {o.date}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-navy-950 text-sm">{fmt(o.amount)}</p>
                  <span className={`${STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[o.status]]?.cls || "badge-steel"} badge text-xs mt-0.5`}>
                    {STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[o.status]]?.label || o.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory health */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-steel-100 flex items-center justify-between">
            <h3 className="font-bold text-navy-950">Inventory Health</h3>
            <span className="badge badge-red text-xs">{lowStockCount} Low Stock</span>
          </div>
          <div className="p-5 space-y-4">
            {inventory.map(item => {
              const avPct = Math.round((item.available / item.max) * 100);
              return (
                <div key={item.sku}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <p className="text-sm font-semibold text-navy-950">{item.name}</p>
                      <p className="text-xs text-steel-500">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold ${item.low ? "text-red-600" : "text-green-600"}`}>
                        {item.available} {item.unit}
                      </span>
                      {item.incoming > 0 && (
                        <p className="text-xs text-blue-500">+{item.incoming} incoming</p>
                      )}
                    </div>
                  </div>
                  <div className="h-2 bg-steel-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.low ? "bg-red-500" : avPct > 60 ? "bg-green-500" : "bg-yellow-400"}`}
                      style={{ width: `${avPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top products table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100">
          <h3 className="font-bold text-navy-950">Top Products This Month</h3>
        </div>
        <div className="table-wrapper rounded-none border-0">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th>Units Sold</th>
                <th>Revenue</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.name}>
                  <td className="font-bold text-navy-950 w-8">{i + 1}</td>
                  <td><span className="font-semibold text-navy-950">{p.name}</span></td>
                  <td>{p.units} MT/SQM/KG</td>
                  <td className="font-bold text-navy-950">{fmt(p.revenue)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-steel-100 rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-orange-500 rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-steel-600">{p.pct}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
