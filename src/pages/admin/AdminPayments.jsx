import { useState, useEffect, useCallback } from "react";
import { Search, FileSpreadsheet, Loader2, CreditCard, TrendingUp, Clock, CheckCircle2, XCircle } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { API_BASE_URL } from "../../lib/apiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

const STATUS_BADGE = { pending: "badge-yellow", paid: "badge-green", failed: "badge-red", refunded: "badge-steel" };

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await adminApiFetch(`/payments/admin/list?${params}`);
      setPayments(res.data.payments);
      setTotal(res.data.total);
      setSummary(res.data.summary);
    } catch (err) {
      toast.error(err.message || "Couldn't load payments.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (p, status) => {
    setUpdatingId(p.id);
    try {
      await adminApiFetch(`/payments/admin/${p.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast.success(`Marked as ${status}.`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update.");
    } finally {
      setUpdatingId(null);
    }
  };

  const exportData = async (format) => {
    try {
      const token = localStorage.getItem("styron_admin_access_token");
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`${API_BASE_URL}/payments/admin/export/${format}?${params}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `payments-export.${format === "excel" ? "xlsx" : "pdf"}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export.");
    }
  };

  const cards = summary ? [
    { label: "Total Revenue", value: fmt(summary.total_revenue), icon: TrendingUp, color: "bg-green-50 text-green-600" },
    { label: "Today's Revenue", value: fmt(summary.today_revenue), icon: TrendingUp, color: "bg-blue-50 text-blue-600" },
    { label: "Pending", value: summary.pending_count, icon: Clock, color: "bg-yellow-50 text-yellow-600" },
    { label: "Successful", value: summary.paid_count, icon: CheckCircle2, color: "bg-green-50 text-green-600" },
    { label: "Failed", value: summary.failed_count, icon: XCircle, color: "bg-red-50 text-red-600" },
  ] : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight flex items-center gap-2">
            <CreditCard size={20} className="text-orange-500" /> Payments
          </h1>
          <p className="text-steel-500 text-sm">{total} payment record{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportData("excel")} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => exportData("pdf")} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
            <FileSpreadsheet size={14} /> PDF
          </button>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {cards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card p-4">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}><Icon size={15} /></div>
              <p className="text-lg font-black text-navy-950">{value}</p>
              <p className="text-xs text-steel-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-steel-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payment ID, customer, transaction…"
            className="flex-1 text-sm outline-none bg-transparent py-1.5" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input text-sm py-1.5 w-auto">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : !payments.length ? (
        <div className="card p-12 text-center text-steel-500">No payments found.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Payment ID</th><th>Order</th><th>Customer</th><th>Amount</th>
                <th>Method</th><th>Gateway</th><th>Status</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs">{p.payment_id}</td>
                  <td className="text-xs text-steel-500">{p.order_number || "—"}</td>
                  <td>
                    <p className="font-semibold text-navy-950 text-sm">{p.customer_name || "—"}</p>
                    <p className="text-xs text-steel-500">{p.customer_email || ""}</p>
                  </td>
                  <td className="font-bold text-navy-950">{fmt(p.amount)}</td>
                  <td className="text-xs">{p.payment_method || "—"}</td>
                  <td className="text-xs">{p.gateway || "—"}</td>
                  <td><span className={STATUS_BADGE[p.status]}>{p.status}</span></td>
                  <td className="text-steel-500 text-xs">{new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                  <td>
                    {p.status === "pending" && (
                      <div className="flex gap-1 justify-end">
                        <button disabled={updatingId === p.id} onClick={() => updateStatus(p, "paid")} className="text-xs btn-outline py-1 px-2">Mark Paid</button>
                        <button disabled={updatingId === p.id} onClick={() => updateStatus(p, "failed")} className="text-xs btn-outline py-1 px-2 text-red-500">Mark Failed</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
