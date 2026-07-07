import { useState, useEffect, useCallback } from "react";
import { Star, Plus, Trash2, Loader2, GripVertical, Eye, EyeOff, X } from "lucide-react";
import { adminApiFetch } from "../../lib/adminApiClient";
import { fmt, cn } from "../../utils";
import toast from "react-hot-toast";

export default function AdminFeaturedProducts() {
  const [featured, setFeatured] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApiFetch("/featured-products/admin/list");
      setFeatured(res.data);
    } catch (err) {
      toast.error(err.message || "Couldn't load featured products.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openPicker = async () => {
    try {
      const res = await adminApiFetch(`/products/admin/list?search=${encodeURIComponent(search)}&limit=100`);
      setAllProducts(res.data.products);
      setPickerOpen(true);
    } catch (err) {
      toast.error(err.message || "Couldn't load products.");
    }
  };

  const addProduct = async (productId) => {
    setSaving(true);
    try {
      await adminApiFetch("/featured-products/admin/add", {
        method: "POST",
        body: JSON.stringify({ productId, sortOrder: featured.length }),
      });
      toast.success("Added to featured products.");
      setPickerOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't add product. (It may already be featured.)");
    } finally {
      setSaving(false);
    }
  };

  const removeFeatured = async (id) => {
    try {
      await adminApiFetch(`/featured-products/admin/${id}`, { method: "DELETE" });
      toast.success("Removed from featured.");
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't remove.");
    }
  };

  const toggleActive = async (item) => {
    try {
      await adminApiFetch(`/featured-products/admin/${item.id}`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) });
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't update.");
    }
  };

  const moveOrder = async (item, direction) => {
    const idx = featured.findIndex((f) => f.id === item.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= featured.length) return;
    const swapItem = featured[swapIdx];
    try {
      await Promise.all([
        adminApiFetch(`/featured-products/admin/${item.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: swapItem.sort_order }) }),
        adminApiFetch(`/featured-products/admin/${swapItem.id}`, { method: "PATCH", body: JSON.stringify({ sort_order: item.sort_order }) }),
      ]);
      load();
    } catch (err) {
      toast.error(err.message || "Couldn't reorder.");
    }
  };

  const featuredIds = new Set(featured.map((f) => f.product_id));
  const filteredProducts = allProducts.filter((p) => !featuredIds.has(p.id));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-black text-navy-950 tracking-tight flex items-center gap-2">
            <Star size={20} className="text-orange-500" /> Featured Products
          </h1>
          <p className="text-steel-500 text-sm">Controls which products appear on the homepage (max 4 shown).</p>
        </div>
        <button onClick={openPicker} disabled={featured.length >= 4} className="btn-primary text-xs py-2.5 px-4 flex items-center gap-1.5 disabled:opacity-40">
          <Plus size={14} /> Add Product
        </button>
      </div>

      {featured.length >= 4 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs text-blue-700">
          Maximum of 4 featured products reached. Remove one to add another.
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center"><Loader2 size={26} className="animate-spin text-orange-500 mx-auto" /></div>
      ) : !featured.length ? (
        <div className="card p-12 text-center text-steel-500">No featured products yet — add up to 4 to show on the homepage.</div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr><th>Order</th><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {featured.map((f, idx) => (
                <tr key={f.id} className={cn(!f.is_active && "opacity-50")}>
                  <td>
                    <div className="flex items-center gap-1">
                      <button onClick={() => moveOrder(f, "up")} disabled={idx === 0} className="text-steel-400 disabled:opacity-30 text-xs">▲</button>
                      <button onClick={() => moveOrder(f, "down")} disabled={idx === featured.length - 1} className="text-steel-400 disabled:opacity-30 text-xs">▼</button>
                    </div>
                  </td>
                  <td>
                    <p className="font-semibold text-navy-950">{f.name}</p>
                    <p className="text-xs text-steel-500">{f.sku || "—"} · {f.grade || ""}</p>
                  </td>
                  <td className="font-bold text-orange-500">{fmt(f.price)}</td>
                  <td className="text-steel-500 text-sm">{f.stock_quantity}</td>
                  <td>
                    <button onClick={() => toggleActive(f)} className={cn("flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
                      f.is_active ? "bg-green-100 text-green-700" : "bg-steel-100 text-steel-500")}>
                      {f.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                      {f.is_active ? "Visible" : "Hidden"}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => removeFeatured(f.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-500"><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPickerOpen(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-steel-100">
              <h2 className="text-lg font-bold text-navy-950">Choose a Product</h2>
              <button onClick={() => setPickerOpen(false)}><X size={18} className="text-steel-400" /></button>
            </div>
            <div className="p-4 border-b border-steel-100">
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && openPicker()}
                placeholder="Search products…" className="form-input w-full" />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {!filteredProducts.length ? (
                <p className="text-center text-steel-500 text-sm py-8">No products found.</p>
              ) : filteredProducts.map((p) => (
                <button key={p.id} onClick={() => addProduct(p.id)} disabled={saving}
                  className="w-full flex items-center justify-between p-3 hover:bg-steel-50 rounded-xl text-left">
                  <div>
                    <p className="font-semibold text-navy-950 text-sm">{p.name}</p>
                    <p className="text-xs text-steel-500">{p.sku || "—"}</p>
                  </div>
                  <span className="font-bold text-orange-500 text-sm">{fmt(p.price)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
