// customer/Dashboard.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Package, FileText, Receipt, MapPin, ArrowRight, ShoppingCart, Calculator, Loader2 } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";
import { fmt, STATUS_CONFIG } from "../../utils";
import { selectUser } from "../../store";

const BACKEND_STATUS_TO_BADGE = {
  placed: "confirmed", processing: "confirmed", manufacturing: "manufacturing",
  quality_check: "packed", dispatched: "shipped", delivered: "delivered", cancelled: "cancelled",
};

export function CustomerDashboard() {
  const user = useSelector(selectUser);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/orders/mine").then((res) => setOrders(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const recentOrder = orders[0];
  const totalSpent = orders.reduce((s, o) => s + Number(o.total), 0);

  const QUICK = [
    { icon: Package,    label: "My Orders",   sub: `${orders.length} order${orders.length !== 1 ? "s" : ""}`, to: "/account/orders" },
    { icon: FileText,   label: "Quotations",  sub: "Request a quote",   to: "/quotation" },
    { icon: Receipt,    label: "Invoices",    sub: "Download GST bills", to: "/account/invoices" },
    { icon: MapPin,     label: "Addresses",   sub: "Manage delivery addresses", to: "/account/addresses" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="bg-navy-950 rounded-2xl p-6 text-white">
        <p className="text-steel-400 text-sm mb-1">Good day,</p>
        <h1 className="text-xl font-black mb-1 tracking-tight">{user?.full_name || "Valued Customer"}</h1>
        <p className="text-steel-400 text-sm">{user?.email}</p>
        <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-white/10">
          {[["Total Orders", String(orders.length)], ["Total Spent", fmt(totalSpent)]].map(([l, v]) => (
            <div key={l}>
              <p className="text-2xl font-black text-orange-400">{v}</p>
              <p className="text-xs text-steel-500 mt-0.5">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        {QUICK.map(({ icon: Icon, label, sub, to }) => (
          <Link key={label} to={to} className="card-hover p-4 flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <Icon size={18} className="text-orange-500" />
            </div>
            <div>
              <p className="font-bold text-navy-950 text-sm">{label}</p>
              <p className="text-xs text-steel-500 mt-0.5">{sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent order */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-steel-100 flex items-center justify-between">
          <h3 className="font-bold text-navy-950">Recent Order</h3>
          <Link to="/account/orders" className="text-xs text-orange-500 font-semibold flex items-center gap-1">All orders <ArrowRight size={12} /></Link>
        </div>
        {loading ? (
          <div className="py-10 text-center"><Loader2 size={22} className="animate-spin text-orange-500 mx-auto" /></div>
        ) : !recentOrder ? (
          <div className="p-8 text-center">
            <Package size={26} className="text-steel-300 mx-auto mb-2" />
            <p className="text-steel-500 text-sm mb-3">No orders yet.</p>
            <Link to="/products" className="btn-primary text-xs py-2 px-4">Browse Products</Link>
          </div>
        ) : (
        <div className="p-5">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <p className="font-black text-navy-950 text-base">{recentOrder.order_number}</p>
              <p className="text-xs text-steel-500">{new Date(recentOrder.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
            </div>
            <span className={`${STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[recentOrder.status]]?.cls || "badge-steel"} badge`}>
              {STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[recentOrder.status]]?.label || recentOrder.status}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {recentOrder.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-steel-600">{item.product_name} × {item.quantity}</span>
                <span className="font-semibold text-navy-950">{fmt(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-steel-100">
            <span className="font-black text-navy-950">Total: {fmt(recentOrder.total)}</span>
            <Link to="/track" className="btn-primary py-2 px-4 text-xs">Track Order</Link>
          </div>
        </div>
        )}
      </div>

      {/* CTA */}
      <div className="grid sm:grid-cols-2 gap-3">
        <Link to="/products" className="card-hover p-5 text-center flex flex-col items-center gap-2">
          <ShoppingCart size={24} className="text-orange-500" />
          <p className="font-bold text-navy-950 text-sm">Shop Products</p>
          <p className="text-xs text-steel-500">Browse the full catalog</p>
        </Link>
        <Link to="/ai-estimator" className="card-hover p-5 text-center flex flex-col items-center gap-2">
          <Calculator size={24} className="text-orange-500" />
          <p className="font-bold text-navy-950 text-sm">AI Estimator</p>
          <p className="text-xs text-steel-500">Calculate steel requirements</p>
        </Link>
      </div>
    </div>
  );
}

export default CustomerDashboard;
