import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, X, Loader2, GripVertical, Eye, EyeOff, TrendingUp } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

const EMPTY_FORM = { label: "", price: "", unit: "Ton", sort_order: 0 };

export default function AdminSteelPrices() {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/steel-prices/admin/list");
      setPrices(res.data);
    } catch (err) {
      toast.error(err.message || "Couldn't load steel prices.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ ...EMPTY_FORM, sort_order: prices.length }); setModalOpen(true); };
  const openEdit = (p) => { setEditing(p); setForm({ label: p.label, price: p.price, unit: p.unit, sort_order: p.sort_order }); setModalOpen(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await adminApiFetch(`/steel-prices/admin/${editing.id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success("Price updated.");
      } else {
        await adminApiFetch("/steel-prices/admin", { method: "POST", body: JSON.stringify(form) });
        toast.success("Price added — ticker updated.");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't save price.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await adminApiFetch(`/steel-prices/admin/${p.id}`, { method: "PUT", body: JSON.stringify({ is_active: !p.is_active }) });
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update.");
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.label}" from the ticker?`)) return;
    try {
      await adminApiFetch(`/steel-prices/admin/${p.id}`, { method: "DELETE" });
      toast.success("Deleted.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't delete.");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight flex items-center gap-2">
            <TrendingUp size={20} className="text-orange-500" /> Steel Price Ticker
          </h1>
          <p className="text-steel-500 text-sm">Controls the live scrolling price ticker on the website header.</p>
        </div>
        <button onClick={openCreate} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5">
          <Plus size={14} /> Add Price
        </button>
      </div>

      {loading ? (
        <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : !prices.length ? (
        <div className="card p-12 text-center text-steel-500">No prices yet — add your first ticker item.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Label</th>
                <th>Price</th>
                <th>Unit</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className={cn(!p.is_active && "opacity-50")}>
                  <td className="w-8"><GripVertical size={14} className="text-steel-300" /></td>
                  <td className="font-semibold text-navy-950">{p.label}</td>
                  <td className="font-bold text-orange-500">{fmt(p.price)}</td>
                  <td>{p.unit}</td>
                  <td>
                    <button onClick={() => toggleActive(p)} className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                      p.is_active ? "bg-green-100 text-green-700" : "bg-steel-100 text-steel-500")}>
                      {p.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                      {p.is_active ? "Live" : "Hidden"}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(p)} className="p-1.5 hover:bg-steel-100 rounded-lg text-steel-500"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(p)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-navy-950">{editing ? "Edit Price" : "Add Ticker Price"}</h2>
                <button onClick={() => setModalOpen(false)}><X size={18} className="text-steel-400" /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-steel-500 mb-1 block">Label</label>
                  <input required value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })}
                    placeholder="TMT FE500 12mm" className="form-input w-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-steel-500 mb-1 block">Price (₹)</label>
                    <input required type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="form-input w-full" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-steel-500 mb-1 block">Unit</label>
                    <input required value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                      placeholder="Ton / kg" className="form-input w-full" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-steel-500 mb-1 block">Sort Order</label>
                  <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} className="form-input w-full" />
                </div>
                <button type="submit" disabled={saving} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin" />} {editing ? "Save Changes" : "Add to Ticker"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
