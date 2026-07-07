import { useState, useEffect, useCallback } from "react";
import { Search, Download, RefreshCw, Mail, Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { API_BASE_URL } from "../../lib/apiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

const STATUS_BADGE = {
  draft: "badge-steel", sent: "badge-blue", viewed: "badge-blue",
  accepted: "badge-green", rejected: "badge-red", expired: "badge-steel",
};

export default function AdminQuotations() {
  const [quotations, setQuotations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [emailingId, setEmailingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await adminApiFetch(`/quotations/admin/list?${params}`);
      setQuotations(res.data.quotations);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.message || "Couldn't load quotations.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const getAuthToken = () => {
    try { return localStorage.getItem("styron_admin_access_token"); } catch { return null; }
  };

  const downloadPdf = async (q) => {
    try {
      const token = getAuthToken();
      const res = await fetch(`${API_BASE_URL}/quotations/${q.id}/pdf`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to download PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `QUOTATION-${q.quotation_number}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't download PDF.");
    }
  };

  const emailQuotation = async (q) => {
    setEmailingId(q.id);
    try {
      await adminApiFetch(`/quotations/${q.id}/email`, { method: "POST" });
      toast.success(`Emailed to ${q.customer_email}`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't send email.");
    } finally {
      setEmailingId(null);
    }
  };

  const regenerate = async (q) => {
    if (!confirm(`Regenerate quotation for ${q.customer_name}? A new quotation number will be created.`)) return;
    setRegeneratingId(q.id);
    try {
      await adminApiFetch(`/quotations/admin/${q.id}/regenerate`, { method: "POST" });
      toast.success("Quotation regenerated.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't regenerate.");
    } finally {
      setRegeneratingId(null);
    }
  };

  const exportExcel = async () => {
    try {
      const token = getAuthToken();
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const res = await fetch(`${API_BASE_URL}/quotations/admin/export?${params}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "quotations-export.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight flex items-center gap-2">
            <FileText size={20} className="text-orange-500" /> Quotations
          </h1>
          <p className="text-steel-500 text-sm">{total} quotation{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={exportExcel} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
          <FileSpreadsheet size={14} /> Export Excel
        </button>
      </div>

      <div className="card p-4 mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <Search size={15} className="text-steel-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customer, email, or quotation #…"
            className="flex-1 text-sm outline-none bg-transparent py-1.5" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input text-sm py-1.5 w-auto">
          <option value="">All Statuses</option>
          {Object.keys(STATUS_BADGE).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="form-input text-sm py-1.5 w-auto" />
        <span className="text-steel-400 text-xs">to</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="form-input text-sm py-1.5 w-auto" />
      </div>

      {loading ? (
        <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : !quotations.length ? (
        <div className="card p-12 text-center text-steel-500">No quotations found.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation #</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => (
                <tr key={q.id}>
                  <td className="font-mono text-xs font-semibold text-navy-950">{q.quotation_number}</td>
                  <td>
                    <p className="font-semibold text-navy-950">{q.customer_name}</p>
                    <p className="text-xs text-steel-500">{q.customer_email}</p>
                  </td>
                  <td className="font-bold text-navy-950">{fmt(q.total)}</td>
                  <td><span className={cn(STATUS_BADGE[q.status])}>{q.status}</span></td>
                  <td className="text-steel-500 text-xs">{new Date(q.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button title="Download PDF" onClick={() => downloadPdf(q)} className="p-1.5 hover:bg-steel-100 rounded-lg text-steel-500"><Download size={14} /></button>
                      <button title="Email to customer" onClick={() => emailQuotation(q)} disabled={emailingId === q.id} className="p-1.5 hover:bg-steel-100 rounded-lg text-steel-500">
                        {emailingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                      </button>
                      <button title="Regenerate" onClick={() => regenerate(q)} disabled={regeneratingId === q.id} className="p-1.5 hover:bg-steel-100 rounded-lg text-steel-500">
                        {regeneratingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                    </div>
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
