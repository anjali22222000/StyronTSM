import { useState, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, Grid3X3, List, Star, ShoppingCart, X, Loader2 } from "lucide-react";
import { fetchProducts, fetchCategories } from "../../lib/productsApi";
import { addItem, toggleDrawer } from "../../store";
import { fmt, PRODUCT_EMOJI, PRODUCT_BG, BADGE_COLOR, cn } from "../../utils";
import toast from "react-hot-toast";

export default function Products() {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("default");
  const [view, setView] = useState("grid");
  const [PRODUCTS, setPRODUCTS] = useState([]);
  const [CATEGORIES, setCATEGORIES] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const activeCat = searchParams.get("cat") || "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchProducts(), fetchCategories()])
      .then(([products, categories]) => {
        if (cancelled) return;
        setPRODUCTS(products);
        setCATEGORIES(categories);
        setLoadError(null);
      })
      .catch((err) => { if (!cancelled) setLoadError(err.message || "Couldn't load products."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    let list = [...PRODUCTS];
    if (activeCat) list = list.filter(p => p.category === activeCat);
    if (q) list = list.filter(p => [p.name, p.grade, p.size, p.categoryLabel, p.sku].join(" ").toLowerCase().includes(q.toLowerCase()));
    switch (sort) {
      case "price-asc":  return list.sort((a, b) => a.price - b.price);
      case "price-desc": return list.sort((a, b) => b.price - a.price);
      case "rating":     return list.sort((a, b) => b.rating - a.rating);
      case "name":       return list.sort((a, b) => a.name.localeCompare(b.name));
      default:           return list;
    }
  }, [activeCat, q, sort, PRODUCTS]);

  const handleAdd = (e, p) => {
    e.preventDefault(); e.stopPropagation();
    dispatch(addItem({ product: p, quantity: 1 }));
    dispatch(toggleDrawer());
    toast.success(`${p.name} added!`);
  };

  if (loading) {
    return (
      <div className="container py-24 text-center">
        <Loader2 size={28} className="animate-spin text-orange-500 mx-auto mb-3" />
        <p className="text-steel-500 text-sm">Loading catalog…</p>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="container py-24 text-center">
        <p className="text-4xl mb-3">⚠️</p>
        <p className="font-bold text-navy-950">Couldn't load the catalog</p>
        <p className="text-steel-500 text-sm mt-1">{loadError}</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-navy-950 py-10">
        <div className="container">
          <p className="text-steel-500 text-xs mb-2">Home → Products</p>
          <h1 className="text-3xl font-black text-white tracking-tight">Steel Products Catalogue</h1>
          <p className="text-steel-400 mt-2 text-sm">IS 1786 certified · BIS approved · Mill Test Certificates included</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="bg-white border-b border-steel-200 sticky top-[56px] md:top-[92px] z-20">
        <div className="container py-3">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none" />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products, grades, sizes…"
                className="form-input pl-10 py-2 text-sm" />
              {q && <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel-400 hover:text-navy-950"><X size={14} /></button>}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="form-input w-auto py-2 text-sm cursor-pointer">
              <option value="default">Default</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="rating">Top Rated</option>
              <option value="name">Name A–Z</option>
            </select>
            <div className="flex border border-steel-200 rounded-xl overflow-hidden">
              <button onClick={() => setView("grid")} className={cn("p-2 transition-colors", view === "grid" ? "bg-navy-950 text-white" : "bg-white text-steel-400 hover:bg-steel-50")}><Grid3X3 size={15} /></button>
              <button onClick={() => setView("list")} className={cn("p-2 transition-colors", view === "list" ? "bg-navy-950 text-white" : "bg-white text-steel-400 hover:bg-steel-50")}><List size={15} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className="hidden lg:block w-52 flex-shrink-0">
            <div className="card p-4 sticky top-36">
              <h3 className="font-bold text-navy-950 text-sm mb-3 flex items-center gap-2"><SlidersHorizontal size={14} /> Filters</h3>
              <div>
                <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2">Category</p>
                <div className="space-y-1">
                  <button onClick={() => setSearchParams({})}
                    className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", !activeCat ? "bg-navy-950 text-white font-semibold" : "text-steel-700 hover:bg-steel-50")}>
                    All Products <span className="float-right text-xs opacity-60">{PRODUCTS.length}</span>
                  </button>
                  {CATEGORIES.map(cat => (
                    <button key={cat.id} onClick={() => setSearchParams({ cat: cat.id })}
                      className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2", activeCat === cat.id ? "bg-navy-950 text-white font-semibold" : "text-steel-700 hover:bg-steel-50")}>
                      <span>{cat.icon}</span> {cat.label}
                      <span className="ml-auto text-xs opacity-60">{cat.count}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-steel-100">
                <p className="text-xs font-semibold text-steel-500 uppercase tracking-wider mb-2">Grade</p>
                {["Fe 415", "Fe 500D", "Fe 550D", "IS 2062", "IS 1566"].map(g => (
                  <label key={g} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                    <input type="checkbox" className="rounded border-steel-300 text-navy-950" />
                    <span className="text-sm text-steel-700 group-hover:text-navy-950 transition-colors">{g}</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-steel-500">
                Showing <span className="font-semibold text-navy-950">{filtered.length}</span> products
                {activeCat && <> in <span className="font-semibold text-orange-500">{CATEGORIES.find(c=>c.id===activeCat)?.label}</span></>}
              </p>
              {(activeCat || q) && (
                <button onClick={() => { setSearchParams({}); setQ(""); }} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                  <X size={12} /> Clear filters
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="card p-16 text-center">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-bold text-navy-950">No products found</p>
                <p className="text-steel-500 text-sm mt-1">Try a different search or filter</p>
              </div>
            ) : view === "grid" ? (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link to={`/products/${p.slug}`} className="hover-lift card overflow-hidden group block rounded-2xl border border-steel-100">
                      <div className={cn("h-44 flex items-center justify-center text-5xl relative", PRODUCT_BG[p.category])}>
                        {p.images?.length > 0 ? (
  <img
    src={p.images[0].url}
    alt={p.name}
    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
  />
) : (
  <span className="group-hover:scale-110 transition-transform duration-300">
    {PRODUCT_EMOJI[p.category]}
  </span>
)}
                        {p.badge && (
                          <span className={cn("absolute top-3 left-3 text-xs font-bold px-2.5 py-0.5 rounded-full", BADGE_COLOR[p.badge])}>{p.badgeLabel}</span>
                        )}
                        {p.stock <= p.minStock && (
                          <span className="absolute top-3 right-3 badge badge-red text-xs">Low Stock</span>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="text-[11px] text-orange-500 font-bold uppercase tracking-wider mb-1">{p.categoryLabel}</p>
                        <h3 className="font-bold text-navy-950 text-sm mb-0.5 leading-snug">{p.name}</h3>
                        <p className="text-xs text-steel-500 mb-3">{p.grade} · {p.size}</p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-lg font-black text-navy-950">{fmt(p.price)}</span>
                            <span className="text-xs text-steel-400">/{p.unit}</span>
                          </div>
                          <button onClick={e => handleAdd(e, p)}
                            className="w-9 h-9 bg-navy-950 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 text-lg font-bold shadow-card">
                            +
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-steel-100 text-xs text-steel-400">
                          <Star size={11} className="fill-orange-400 text-orange-400" />
                          <span className="font-semibold text-navy-950">{p.rating}</span>
                          <span>({p.reviewCount})</span>
                          <span className="ml-auto">{p.stock} {p.unit} in stock</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              /* List view */
              <div className="space-y-3">
                {filtered.map((p, i) => (
                  <motion.div key={p.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                    <Link to={`/products/${p.slug}`} className="card-hover p-4 flex gap-4 items-center group block">
                      <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center text-3xl flex-shrink-0", PRODUCT_BG[p.category])}>{PRODUCT_EMOJI[p.category]}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[11px] text-orange-500 font-bold uppercase tracking-wider">{p.categoryLabel}</p>
                            <h3 className="font-bold text-navy-950 text-sm">{p.name}</h3>
                            <p className="text-xs text-steel-500">{p.grade} · {p.size} · SKU: {p.sku}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-black text-navy-950 text-lg">{fmt(p.price)}<span className="text-xs text-steel-400 font-normal">/{p.unit}</span></p>
                            <p className="text-xs text-green-600 font-semibold">+GST {fmt(p.price * 1.18)}</p>
                          </div>
                        </div>
                      </div>
                      <button onClick={e => handleAdd(e, p)}
                        className="btn-primary flex-shrink-0 gap-1.5 py-2 px-4 text-xs">
                        <ShoppingCart size={13} /> Add
                      </button>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
