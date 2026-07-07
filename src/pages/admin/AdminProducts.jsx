import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Pencil, Trash2, X, Loader2, ImagePlus, FileSpreadsheet, FileText } from "lucide-react";
import { adminApiFetch, adminApiUpload } from "../../lib/adminApiClient";
import { API_BASE_URL } from "../../lib/apiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

const EMPTY_FORM = {
  name: "", description: "", price: "", stock_quantity: "", sku: "", status: "active",
  grade: "", size: "", unit: "unit", mrp: "", gst_percent: "18",
  badge: "", badge_label: "", min_stock: "", min_order: "1", weight_per_meter: "",
  long_description: "", rating: "", review_count: "",
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // product being edited, or null = creating
  const [form, setForm] = useState(EMPTY_FORM);
  const [files, setFiles] = useState([]);
  const [specs, setSpecs] = useState([{ key: "", value: "" }]);
  const [applications, setApplications] = useState([""]);
  const [certifications, setCertifications] = useState("");
  const [related, setRelated] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (q = search) => {
    setLoading(true);
    try {
      const res = await adminApiFetch(`/products/admin/list?search=${encodeURIComponent(q)}&limit=50`);
      setProducts(res.data.products);
      setTotal(res.data.total);
    } catch (err) {
      toast.error(err.message || "Couldn't load products.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openCreate = () => {
    setEditing(null); setForm(EMPTY_FORM); setFiles([]);
    setSpecs([{ key: "", value: "" }]); setApplications([""]); setCertifications(""); setRelated("");
    setModalOpen(true);
  };
  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", price: p.price, stock_quantity: p.stock_quantity,
      sku: p.sku || "", status: p.status, grade: p.grade || "", size: p.size || "", unit: p.unit || "unit",
      mrp: p.mrp || "", gst_percent: p.gst_percent ?? "18", badge: p.badge || "", badge_label: p.badge_label || "",
      min_stock: p.min_stock ?? "", min_order: p.min_order ?? "1", weight_per_meter: p.weight_per_meter || "",
      long_description: p.long_description || "", rating: p.rating ?? "", review_count: p.review_count ?? "",
    });
    setFiles([]);
    const specEntries = Object.entries(p.specs || {});
    setSpecs(specEntries.length ? specEntries.map(([key, value]) => ({ key, value })) : [{ key: "", value: "" }]);
    setApplications(p.applications?.length ? p.applications : [""]);
    setCertifications((p.certifications || []).join(", "));
    setRelated((p.related || []).map((r) => r.id).join(", "));
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      files.forEach((f) => fd.append("images", f));
      fd.append("specs", JSON.stringify(specs.filter((s) => s.key.trim() && s.value.trim())));
      fd.append("applications", JSON.stringify(applications.map((a) => a.trim()).filter(Boolean)));
      fd.append("certifications", JSON.stringify(certifications.split(",").map((c) => c.trim()).filter(Boolean)));
      fd.append("related", JSON.stringify(related.split(",").map((r) => r.trim()).filter(Boolean).map(Number)));

      if (editing) {
        await adminApiUpload(`/products/admin/${editing.id}`, fd, "PUT");
        toast.success("Product updated.");
      } else {
        await adminApiUpload("/products/admin", fd, "POST");
        toast.success("Product created.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't save product.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    try {
      await adminApiFetch(`/products/admin/${p.id}`, { method: "DELETE" });
      toast.success("Product deleted.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't delete product.");
    }
  };

  const exportProducts = async (format) => {
    try {
      const token = localStorage.getItem("styron_admin_access_token");
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`${API_BASE_URL}/products/admin/export/${format}?${params}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `products-export.${format === "excel" ? "xlsx" : "pdf"}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || "Couldn't export.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight">Products</h1>
          <p className="text-steel-500 text-sm">{total} product{total !== 1 ? "s" : ""} in catalog</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportProducts("excel")} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => exportProducts("pdf")} className="btn-outline text-xs py-2 px-4 flex items-center gap-1.5">
            <FileText size={14} /> PDF
          </button>
          <button onClick={openCreate} className="btn-primary text-xs py-2 px-4"><Plus size={14} /> Add Product</button>
        </div>
      </div>

      <div className="card p-3 mb-4 flex items-center gap-2">
        <Search size={15} className="text-steel-400 ml-2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search by name or SKU…"
          className="flex-1 text-sm outline-none bg-transparent py-1.5"
        />
        <button onClick={() => load()} className="btn-outline text-xs py-1.5 px-3">Search</button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrapper border-0 rounded-none">
          <table className="data-table">
            <thead><tr><th>Product</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-steel-400">Loading…</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-steel-400">No products found.</td></tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium text-navy-950">
                      <div className="flex items-center gap-2.5">
                        {p.images?.[0] ? (
                          <img src={p.images[0].url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-steel-100 flex items-center justify-center flex-shrink-0">
                            <ImagePlus size={14} className="text-steel-400" />
                          </div>
                        )}
                        {p.name}
                      </div>
                    </td>
                    <td className="text-steel-500">{p.sku || "—"}</td>
                    <td>{fmt(p.price)}</td>
                    <td className={p.stock_quantity === 0 ? "text-red-500 font-semibold" : ""}>{p.stock_quantity}</td>
                    <td><span className={cn("badge", p.status === "active" ? "badge-green" : "badge-steel")}>{p.status}</span></td>
                    <td>
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => openEdit(p)} className="btn-outline text-xs py-1.5 px-2.5"><Pencil size={12} /></button>
                        <button onClick={() => handleDelete(p)} className="btn-outline text-xs py-1.5 px-2.5 text-red-500 hover:bg-red-50"><Trash2 size={12} /></button>
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
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
              onClick={(e) => e.stopPropagation()} className="card p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-navy-950 text-lg">{editing ? "Edit Product" : "Add Product"}</h2>
                <button onClick={() => setModalOpen(false)} className="text-steel-400 hover:text-navy-950"><X size={18} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-3">
                <div><label className="form-label">Name *</label>
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="form-input mt-1" />
                </div>
                <div><label className="form-label">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="form-input mt-1" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Price (₹) *</label>
                    <input required type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Stock *</label>
                    <input required type="number" min="0" value={form.stock_quantity} onChange={(e) => setForm((f) => ({ ...f, stock_quantity: e.target.value }))} className="form-input mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label className="form-label">MRP (₹)</label>
                    <input type="number" min="0" step="0.01" value={form.mrp} onChange={(e) => setForm((f) => ({ ...f, mrp: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">GST %</label>
                    <input type="number" min="0" max="100" step="0.01" value={form.gst_percent} onChange={(e) => setForm((f) => ({ ...f, gst_percent: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Unit</label>
                    <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="MT, pcs…" className="form-input mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Grade</label>
                    <input value={form.grade} onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))} placeholder="Fe 500D" className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Size</label>
                    <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="8mm" className="form-input mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Min Stock Alert</label>
                    <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Min Order Qty</label>
                    <input type="number" min="1" value={form.min_order} onChange={(e) => setForm((f) => ({ ...f, min_order: e.target.value }))} className="form-input mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">Badge (e.g. "bestseller")</label>
                    <input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Badge Label</label>
                    <input value={form.badge_label} onChange={(e) => setForm((f) => ({ ...f, badge_label: e.target.value }))} placeholder="Best Seller" className="form-input mt-1" />
                  </div>
                </div>
                <div><label className="form-label">Long Description (About tab)</label>
                  <textarea value={form.long_description} onChange={(e) => setForm((f) => ({ ...f, long_description: e.target.value }))} className="form-input mt-1" rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div><label className="form-label">SKU</label>
                    <input value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">Status</label>
                    <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="form-input mt-1 cursor-pointer">
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-steel-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label !mb-0">Specifications</label>
                    <button type="button" onClick={() => setSpecs((s) => [...s, { key: "", value: "" }])} className="text-xs text-orange-500 font-semibold hover:underline">+ Add row</button>
                  </div>
                  {specs.map((s, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={s.key} onChange={(e) => setSpecs((arr) => arr.map((x, j) => j === i ? { ...x, key: e.target.value } : x))} placeholder="Yield Strength" className="form-input text-xs py-1.5" />
                      <input value={s.value} onChange={(e) => setSpecs((arr) => arr.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} placeholder="500 MPa" className="form-input text-xs py-1.5" />
                      <button type="button" onClick={() => setSpecs((arr) => arr.filter((_, j) => j !== i))} className="text-steel-400 hover:text-red-500 px-1"><X size={14} /></button>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-steel-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label !mb-0">Applications</label>
                    <button type="button" onClick={() => setApplications((a) => [...a, ""])} className="text-xs text-orange-500 font-semibold hover:underline">+ Add</button>
                  </div>
                  {applications.map((a, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input value={a} onChange={(e) => setApplications((arr) => arr.map((x, j) => j === i ? e.target.value : x))} placeholder="RCC slabs" className="form-input text-xs py-1.5 flex-1" />
                      <button type="button" onClick={() => setApplications((arr) => arr.filter((_, j) => j !== i))} className="text-steel-400 hover:text-red-500 px-1"><X size={14} /></button>
                    </div>
                  ))}
                </div>

                <div><label className="form-label">Certifications (comma separated)</label>
                  <input value={certifications} onChange={(e) => setCertifications(e.target.value)} placeholder="BIS, IS 1786:2008" className="form-input mt-1" />
                </div>
                <div><label className="form-label">Related Product IDs (comma separated)</label>
                  <input value={related} onChange={(e) => setRelated(e.target.value)} placeholder="2, 3, 4" className="form-input mt-1" />
                </div>

                <div>
                  <label className="form-label">Images {editing && "(uploading replaces the current image)"}</label>
                  <input type="file" multiple accept="image/*" onChange={(e) => setFiles(Array.from(e.target.files || []))} className="form-input mt-1 text-xs" />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-2.5 mt-2">
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : editing ? "Save Changes" : "Create Product"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
