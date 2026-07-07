import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

const STATUSES = ["placed", "processing", "manufacturing", "quality_check", "dispatched", "delivered", "cancelled"];

const STATUS_LABELS = {
  placed: "Pending",
  processing: "Confirmed",
  manufacturing: "Processing / In Production",
  quality_check: "Packed / QC",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const STATUS_BADGE = {
  placed: "badge-blue", processing: "badge-blue", manufacturing: "badge-orange",
  quality_check: "badge-orange", dispatched: "badge-steel", delivered: "badge-green", cancelled: "badge-red",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = statusFilter ? `?status=${statusFilter}&limit=50` : "?limit=50";
      const res = await adminApiFetch(`/orders/admin/list${qs}`);
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.message || "Couldn't load orders.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openOrder = (o) => { setSelected(o); setNewStatus(o.status); setNote(""); };

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      await adminApiFetch(`/orders/admin/${selected.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus, note: note || undefined }),
      });
      toast.success("Order status updated — customer notified.");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight">Orders</h1>
          <p className="text-steel-500 text-sm">{total} order{total !== 1 ? "s" : ""}</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input text-xs py-2 px-3 w-auto cursor-pointer">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-steel-400">Loading…</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-steel-400">No orders found.</td></tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-bold text-orange-500">{o.order_number}</td>
                    <td className="text-steel-700">{o.guest_name || `User #${o.user_id}`}</td>
                    <td className="font-semibold text-navy-950">{fmt(o.total)}</td>
                    <td><span className={cn("badge", STATUS_BADGE[o.status] || "badge-steel")}>{STATUS_LABELS[o.status] || o.status.replace("_", " ")}</span></td>
                    <td className="text-steel-500">{new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><button onClick={() => openOrder(o)} className="btn-outline text-xs py-1.5 px-3">Update</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setSelected(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()} className="card p-6 w-full max-w-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-navy-950 text-lg">{selected.order_number}</h2>
                <button onClick={() => setSelected(null)} className="text-steel-400 hover:text-navy-950"><X size={18} /></button>
              </div>
              <label className="form-label">New Status</label>
              <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="form-input mt-1 mb-3 cursor-pointer">
                {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s] || s.replace("_", " ")}</option>)}
              </select>
              <label className="form-label">Note (optional, emailed to customer)</label>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} className="form-input mt-1" rows={3} />
              <button onClick={handleUpdate} disabled={updating} className="btn-primary w-full justify-center py-2.5 mt-4">
                {updating ? <><Loader2 size={14} className="animate-spin" /> Updating…</> : "Update Status"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
