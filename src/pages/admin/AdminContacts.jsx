import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Trash2, Mail } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { cn } from "../../utils";
import toast from "react-hot-toast";

const STATUS_BADGE = { new: "badge-blue", replied: "badge-green", closed: "badge-steel" };

export default function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "50", ...(search ? { search } : {}), ...(statusFilter ? { status: statusFilter } : {}) });
      const res = await adminApiFetch(`/contacts/admin/list?${qs}`);
      setContacts(res.data.contacts);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.message || "Couldn't load inquiries.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const openReply = (c) => { setSelected(c); setReply(c.admin_reply || ""); };

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await adminApiFetch(`/contacts/admin/${selected.id}/reply`, { method: "POST", body: JSON.stringify({ reply }) });
      toast.success("Reply sent to customer.");
      setSelected(null);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't send reply.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Delete inquiry from ${c.name}?`)) return;
    try {
      await adminApiFetch(`/contacts/admin/${c.id}`, { method: "DELETE" });
      toast.success("Inquiry deleted.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't delete inquiry.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight">Contact Inquiries</h1>
          <p className="text-steel-500 text-sm">{total} inquir{total !== 1 ? "ies" : "y"}</p>
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input text-xs py-2 px-3 w-auto cursor-pointer">
          <option value="">All statuses</option>
          <option value="new">New</option>
          <option value="replied">Replied</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="card p-3 mb-4 flex items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name, email, or message…"
          className="flex-1 text-sm outline-none bg-transparent py-1.5 px-2"
        />
        <button onClick={() => load()} className="btn-outline text-xs py-1.5 px-3">Search</button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>From</th><th>Message</th><th>Status</th><th>Received</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-steel-400">Loading…</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-steel-400">No inquiries found.</td></tr>
              ) : (
                contacts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium text-navy-950">{c.name}</p>
                      <p className="text-xs text-steel-500">{c.email}</p>
                    </td>
                    <td className="text-steel-600 max-w-xs truncate">{c.message}</td>
                    <td><span className={cn("badge", STATUS_BADGE[c.status] || "badge-steel")}>{c.status}</span></td>
                    <td className="text-steel-500">{new Date(c.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openReply(c)} className="btn-outline text-xs py-1.5 px-2.5"><Mail size={12} /> Reply</button>
                        <button onClick={() => handleDelete(c)} className="btn-outline text-xs py-1.5 px-2.5 text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
                      </div>
                    </td>
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
              onClick={(e) => e.stopPropagation()} className="card p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-navy-950 text-lg">{selected.name}</h2>
                <button onClick={() => setSelected(null)} className="text-steel-400 hover:text-navy-950"><X size={18} /></button>
              </div>
              <div className="bg-steel-50 rounded-xl p-3 text-sm text-steel-700 mb-4">{selected.message}</div>
              <label className="form-label">Your reply (emailed to {selected.email})</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} className="form-input mt-1" rows={4} />
              <button onClick={handleReply} disabled={sending || !reply.trim()} className="btn-primary w-full justify-center py-2.5 mt-4">
                {sending ? <><Loader2 size={14} className="animate-spin" /> Sending…</> : "Send Reply"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
