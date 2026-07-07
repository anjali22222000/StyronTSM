import { useState, useEffect, useCallback } from "react";
import { Search, Ban, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { API_BASE_URL } from "../../lib/apiClient";
import { cn } from "../../utils";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/users/admin/list?search=${encodeURIComponent(q)}&limit=50`);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.message || "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleStatus = async (u) => {
    const nextStatus = u.status === "active" ? "suspended" : "active";
    if (!confirm(`${nextStatus === "suspended" ? "Suspend" : "Reactivate"} ${u.email}?`)) return;
    try {
      await adminApiFetch(`/users/admin/${u.id}/status`, { method: "PATCH", body: JSON.stringify({ status: nextStatus }) });
      toast.success(`User ${nextStatus === "suspended" ? "suspended" : "reactivated"}.`);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update user.");
    }
  };

  const exportUsers = async () => {
    try {
      const token = localStorage.getItem("styron_admin_access_token");
      const res = await fetch(`${API_BASE_URL}/users/admin/export/excel?search=${encodeURIComponent(search)}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "users-export.xlsx"; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight">Users</h1>
          <p className="text-steel-500 text-sm">{total} registered customer{total !== 1 ? "s" : ""}</p>
        </div>
        <button onClick={exportUsers} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
          <FileSpreadsheet size={14} /> Export Excel
        </button>
      </div>

      <div className="card p-3 mb-4 flex items-center gap-2">
        <Search size={15} className="text-steel-400 ml-2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name, email, or phone…"
          className="flex-1 text-sm outline-none bg-transparent py-1.5"
        />
        <button onClick={() => load()} className="btn-outline text-xs py-1.5 px-3">Search</button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Registered</th><th>Verified</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-steel-400">Loading…</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-steel-400">No users found.</td></tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-navy-950">{u.name || "—"}</td>
                    <td className="text-steel-600">{u.email}</td>
                    <td className="text-steel-500">{u.phone || "—"}</td>
                    <td className="text-steel-500">{new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                    <td><span className={cn("badge", u.is_verified ? "badge-green" : "badge-steel")}>{u.is_verified ? "Verified" : "Pending"}</span></td>
                    <td><span className={cn("badge", u.status === "active" ? "badge-green" : "badge-red")}>{u.status}</span></td>
                    <td>
                      <button onClick={() => toggleStatus(u)} className="btn-outline text-xs py-1.5 px-2.5">
                        {u.status === "active" ? <><Ban size={12} /> Suspend</> : <><CheckCircle2 size={12} /> Reactivate</>}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
