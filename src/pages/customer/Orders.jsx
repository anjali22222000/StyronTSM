import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Download, Eye, Package, Loader2 } from "lucide-react";
import { apiFetch, API_BASE_URL } from "../../lib/apiClient";
import { fmt, STATUS_CONFIG } from "../../utils";
import toast from "react-hot-toast";

const BACKEND_STATUS_TO_BADGE = {
  placed: "confirmed", processing: "confirmed", manufacturing: "manufacturing",
  quality_check: "packed", dispatched: "shipped", delivered: "delivered", cancelled: "cancelled",
};

/** Downloads the real invoice PDF from the backend and saves it via the browser. */
async function downloadInvoice(orderId, orderNumber) {
  let accessToken = null;
  try { accessToken = localStorage.getItem("styron_access_token"); } catch { /* non-critical */ }

  const toastId = toast.loading("Preparing invoice…");
  try {
    const res = await fetch(`${API_BASE_URL}/orders/${orderId}/invoice`, {
      credentials: "include",
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
    if (!res.ok) throw new Error("Couldn't generate invoice.");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${orderNumber}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded.", { id: toastId });
  } catch (err) {
    toast.error(err.message || "Couldn't download invoice.", { id: toastId });
  }
}

function useMyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch("/orders/mine")
      .then((res) => setOrders(res.data))
      .catch((err) => setError(err.message || "Couldn't load your orders."))
      .finally(() => setLoading(false));
  }, []);

  return { orders, loading, error };
}

export function CustomerOrders() {
  const { orders, loading, error } = useMyOrders();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-black text-navy-950 tracking-tight">My Orders</h1>
        <Link to="/products" className="btn-orange text-xs py-2 px-4">+ New Order</Link>
      </div>
      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : error ? (
        <p className="text-center text-steel-500 py-16">{error}</p>
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center">
          <Package size={28} className="text-steel-300 mx-auto mb-3" />
          <p className="text-steel-500 text-sm mb-4">You haven't placed any orders yet.</p>
          <Link to="/products" className="btn-primary text-sm">Browse Products</Link>
        </div>
      ) : (
      <div className="space-y-4">
        {orders.map(order => (
          <div key={order.id} className="card overflow-hidden">
            <div className="px-5 py-4 bg-steel-50 border-b border-steel-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-navy-950 rounded-xl flex items-center justify-center">
                  <Package size={16} className="text-orange-400" />
                </div>
                <div>
                  <p className="font-black text-navy-950 text-sm">{order.order_number}</p>
                  <p className="text-xs text-steel-500">{new Date(order.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                </div>
              </div>
              <span className={`${STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[order.status]]?.cls || "badge-steel"} badge`}>
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[order.status]]?.dot || "bg-steel-400"}`} />
                {STATUS_CONFIG[BACKEND_STATUS_TO_BADGE[order.status]]?.label || order.status}
              </span>
            </div>
            <div className="p-5">
              <div className="space-y-2 mb-4">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-steel-600">{item.product_name} × {item.quantity}</span>
                    <span className="font-semibold text-navy-950">{fmt(item.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-steel-100 flex-wrap gap-3">
                <span className="font-black text-navy-950">Total: <span className="text-orange-500">{fmt(order.total)}</span></span>
                <div className="flex gap-2">
                  <Link to="/track" className="btn-outline text-xs py-1.5 px-3"><Eye size={12} /> Track</Link>
                  <button onClick={() => downloadInvoice(order.id, order.order_number)} className="btn-outline text-xs py-1.5 px-3"><Download size={12} /> Invoice</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export function CustomerInvoices() {
  const { orders, loading, error } = useMyOrders();

  return (
    <div>
      <h1 className="text-xl font-black text-navy-950 tracking-tight mb-6">GST Invoices</h1>
      {loading ? (
        <div className="py-16 text-center"><Loader2 size={24} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : error ? (
        <p className="text-center text-steel-500 py-16">{error}</p>
      ) : (
      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>Invoice No.</th><th>Order</th><th>Date</th><th>Amount</th><th>GST</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-steel-400">No invoices yet.</td></tr>
              ) : orders.map((o) => {
                // Orders don't currently store a separate tax line — GST shown as ₹0 until
                // that's added to the schema, rather than fabricating a number.
                const gst = 0;
                return (
                  <tr key={o.id}>
                    <td className="font-bold text-orange-500">INV-{o.order_number.slice(-6)}</td>
                    <td className="font-medium text-navy-950">{o.order_number}</td>
                    <td>{new Date(o.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>{fmt(o.subtotal)}</td>
                    <td>{fmt(gst)}</td>
                    <td className="font-black text-navy-950">{fmt(o.total)}</td>
                    <td>
                      <button onClick={() => downloadInvoice(o.id, o.order_number)} className="btn-outline text-xs py-1.5 px-3">
                        <Download size={12} /> PDF
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </div>
  );
}

export default CustomerOrders;
