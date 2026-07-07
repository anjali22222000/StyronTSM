import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Package, Truck, CheckCircle2, Clock, MapPin, Phone } from "lucide-react";
import { fmt, STATUS_CONFIG } from "../../utils";
import { apiFetch } from "../../lib/apiClient";

// Maps backend order statuses onto the existing STATUS_CONFIG badge styles
// (which were designed for a different status set) without touching that
// shared config — avoids affecting any other page that uses STATUS_CONFIG.
const BACKEND_STATUS_TO_BADGE = {
  placed: "confirmed",
  processing: "confirmed",
  manufacturing: "manufacturing",
  quality_check: "packed",
  dispatched: "shipped",
  delivered: "delivered",
  cancelled: "cancelled",
};

const TIMELINE_LABELS = {
  placed: "Order Placed",
  processing: "Processing",
  manufacturing: "Manufacturing",
  quality_check: "Quality Check",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_ICONS = {
  confirmed: "✅", manufacturing: "⚙️", packed: "📦",
  shipped: "🚚", out_for_delivery: "🛵", delivered: "✓",
};

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [result, setResult] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTrack = async () => {
    if (!orderId.trim() || !emailInput.trim()) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await apiFetch(
        `/orders/track?orderNumber=${encodeURIComponent(orderId.trim())}&contact=${encodeURIComponent(emailInput.trim())}`
      );
      const { order, items, tracking } = res.data;
      setResult({
        id: order.order_number,
        customer: order.guest_name || "Account holder",
        company: "",
        status: BACKEND_STATUS_TO_BADGE[order.status] || "pending",
        date: order.created_at,
        items: items.map((it) => ({ name: it.product_name, qty: it.quantity, unit: "", price: it.unit_price })),
        total: order.total,
        timeline: tracking.map((t, i) => ({
          label: TIMELINE_LABELS[t.status] || t.status,
          note: t.note || "",
          time: new Date(t.created_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }),
          done: i < tracking.length - 1,
          current: i === tracking.length - 1,
        })),
      });
    } catch (err) {
      setResult(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-10 max-w-3xl">
      {/* Header */}
      <div className="text-center mb-10">
        <p className="section-label">Order Tracking</p>
        <h1 className="section-title mb-3">Track Your Order</h1>
        <p className="section-sub mx-auto max-w-md">Enter your order ID and the email or phone used at checkout to get real-time status updates.</p>
      </div>

      {/* Search */}
      <div className="card p-6 mb-8">
        <div className="grid sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="form-label">Order ID</label>
            <input value={orderId} onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. STY-20260620-1234"
              className="form-input mt-1" />
          </div>
          <div>
            <label className="form-label">Email or Phone</label>
            <input value={emailInput} onChange={e => setEmailInput(e.target.value)}
              placeholder="The email or phone used at checkout"
              className="form-input mt-1" onKeyDown={e => e.key === "Enter" && handleTrack()} />
          </div>
        </div>
        <button onClick={handleTrack} disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? "Searching…" : <><Search size={15} /> Track Order</>}
        </button>
      </div>

      {/* Not found */}
      {notFound && (
        <div className="card p-8 text-center">
          <Package size={36} className="text-steel-300 mx-auto mb-3" />
          <h3 className="font-bold text-navy-950 mb-1">Order not found</h3>
          <p className="text-steel-500 text-sm">Please check your Order ID and Gmail address</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {/* Order header */}
          <div className="card p-6 mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs text-steel-500 mb-1">Order ID</p>
                <p className="text-xl font-black text-navy-950 tracking-tight">{result.id}</p>
                <p className="text-sm text-steel-500 mt-1">{result.customer} · {result.company}</p>
              </div>
              <div className="text-right">
                <span className={`${STATUS_CONFIG[result.status]?.cls || "badge-steel"} badge text-sm px-3 py-1.5`}>
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_CONFIG[result.status]?.dot || "bg-steel-400"}`} />
                  {STATUS_CONFIG[result.status]?.label || result.status}
                </span>
                <p className="text-xs text-steel-400 mt-2">Ordered: {new Date(result.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
              </div>
            </div>

            {/* Shipment info */}
            {result.carrier && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Carrier</p>
                    <p className="font-bold text-navy-950">{result.carrier}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Tracking No.</p>
                    <p className="font-bold text-orange-500">{result.trackingNo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wider mb-1">Est. Delivery</p>
                    <p className="font-bold text-navy-950">
                      {new Date(result.estimatedDelivery).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="border-t border-steel-100 pt-4">
              <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-3">Order Items</p>
              <div className="space-y-2">
                {result.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-steel-700">{item.name} × {item.qty} {item.unit}</span>
                    <span className="font-semibold text-navy-950">{fmt(item.price * item.qty)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-black text-navy-950 pt-2 border-t border-steel-100">
                  <span>Total (incl. GST)</span>
                  <span className="text-orange-500">{fmt(result.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          {result.timeline?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-navy-950 mb-5 flex items-center gap-2">
                <Clock size={16} className="text-orange-500" /> Order Timeline
              </h3>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-steel-200" />
                <div className="space-y-6">
                  {result.timeline.map((t, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                      className="relative pl-12">
                      <div className={`absolute left-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold z-10 ${
                        t.done ? "bg-green-500 text-white" : t.current ? "bg-orange-500 text-white ring-4 ring-orange-200" : "bg-steel-100 text-steel-400"
                      }`}>
                        {t.done ? "✓" : t.current ? "→" : "○"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-sm ${t.done || t.current ? "text-navy-950" : "text-steel-400"}`}>{t.label}</p>
                          {t.current && <span className="badge badge-orange text-xs">Current</span>}
                        </div>
                        <p className="text-xs text-steel-500 mt-0.5">{t.note}</p>
                        {t.time && <p className="text-xs text-steel-400 mt-1 font-medium">{t.time}</p>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
