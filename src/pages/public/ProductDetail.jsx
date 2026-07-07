import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, ShoppingCart, Heart, Shield,
  Truck, FileText, CheckCircle2, ChevronRight, Package, Loader2,
} from "lucide-react";
import { fetchProductBySlug, fetchProducts } from "../../lib/productsApi";
import { addItem, toggleDrawer } from "../../store";
import { fmt, calcGST, PRODUCT_EMOJI, PRODUCT_BG, BADGE_COLOR, cn } from "../../utils";
import toast from "react-hot-toast";

export default function ProductDetail() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [wishlist, setWishlist] = useState(false);
  const [activeTab, setActiveTab] = useState("specs");
  const [p, setP] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setQty(1);
    fetchProductBySlug(slug)
      .then(async (product) => {
        if (cancelled) return;
        setP(product);
        if (product.related?.length) {
          // Related IDs reference the full catalog — fetch it once and filter,
          // same approach the original mock-data version used.
          const all = await fetchProducts();
          if (!cancelled) setRelated(all.filter((x) => product.related.includes(x.id)).slice(0, 4));
        } else {
          setRelated([]);
        }
      })
      .catch(() => { if (!cancelled) setNotFound(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="container py-24 text-center">
        <Loader2 size={28} className="animate-spin text-orange-500 mx-auto mb-3" />
        <p className="text-steel-500 text-sm">Loading product…</p>
      </div>
    );
  }
  if (notFound || !p) return (
    <div className="container py-20 text-center">
      <p className="text-4xl mb-4">🔍</p>
      <h2 className="text-xl font-bold text-navy-950 mb-2">Product not found</h2>
      <Link to="/products" className="btn-primary">Back to Products</Link>
    </div>
  );

  const { gst, total } = calcGST(p.price * qty);

  const handleAdd = () => {
    dispatch(addItem({ product: p, quantity: qty }));
    dispatch(toggleDrawer());
    toast.success(`${p.name} × ${qty} added to cart!`);
  };

  const handleBuyNow = () => {
    dispatch(addItem({ product: p, quantity: qty }));
    navigate("/checkout");
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="bg-steel-50 border-b border-steel-200">
        <div className="container py-3">
          <div className="flex items-center gap-2 text-xs text-steel-500">
            <Link to="/" className="hover:text-navy-950 transition-colors">Home</Link>
            <ChevronRight size={12} />
            <Link to="/products" className="hover:text-navy-950 transition-colors">Products</Link>
            <ChevronRight size={12} />
            <Link to={`/products?cat=${p.category}`} className="hover:text-navy-950 transition-colors capitalize">{p.categoryLabel}</Link>
            <ChevronRight size={12} />
            <span className="text-navy-950 font-medium truncate">{p.name}</span>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-steel-500 hover:text-navy-950 transition-colors mb-6">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid lg:grid-cols-2 gap-10 mb-12">
          {/* Image */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className={cn("rounded-2xl h-[340px] lg:h-[420px] flex items-center justify-center relative overflow-hidden border border-steel-200", PRODUCT_BG[p.category])}>
              <span className="text-[110px] select-none">{PRODUCT_EMOJI[p.category]}</span>
              {p.badge && (
                <span className={cn("absolute top-4 left-4 px-3 py-1 rounded-full text-sm font-bold", BADGE_COLOR[p.badge])}>{p.badgeLabel}</span>
              )}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2 flex-wrap">
                {p.certifications?.map(c => (
                  <span key={c} className="px-2.5 py-1 bg-navy-950/80 text-white text-xs font-semibold rounded-lg backdrop-blur-sm flex items-center gap-1.5">
                    <Shield size={10} className="text-orange-400" /> {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-5">
            <div>
              <p className="text-orange-500 text-xs font-bold uppercase tracking-wider mb-1">{p.categoryLabel}</p>
              <h1 className="text-3xl font-black text-navy-950 tracking-tight leading-tight mb-2">{p.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={14} className={i < Math.floor(p.rating) ? "fill-orange-400 text-orange-400" : "text-steel-200 fill-steel-200"} />
                  ))}
                </div>
                <span className="font-bold text-navy-950 text-sm">{p.rating}</span>
                <span className="text-steel-400 text-sm">({p.reviewCount} reviews)</span>
                <span className="badge badge-green text-xs">✓ In Stock</span>
              </div>
              <p className="text-steel-600 text-sm leading-relaxed">{p.description}</p>
            </div>

            {/* Price box */}
            <div className="bg-steel-50 rounded-2xl p-5 border border-steel-200">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-navy-950">{fmt(p.price)}</span>
                <span className="text-steel-500 text-sm">/ {p.unit}</span>
                {p.mrp > p.price && (
                  <span className="text-steel-400 text-sm line-through">{fmt(p.mrp)}</span>
                )}
              </div>
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-green-700 font-semibold bg-green-100 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 size={11} /> +GST: {fmt(p.price * 1.18)}/{p.unit}
                </span>
                {p.mrp > p.price && (
                  <span className="flex items-center gap-1.5 text-orange-700 font-semibold bg-orange-100 px-2.5 py-1 rounded-lg">
                    Save {Math.round((1 - p.price / p.mrp) * 100)}%
                  </span>
                )}
              </div>
              <div className="mt-3 pt-3 border-t border-steel-200 grid grid-cols-2 gap-2 text-xs text-steel-600">
                <span>SKU: <strong className="text-navy-950">{p.sku}</strong></span>
                <span>Min order: <strong className="text-navy-950">{p.minOrder} {p.unit}</strong></span>
                <span>Grade: <strong className="text-navy-950">{p.grade}</strong></span>
                <span>Stock: <strong className={p.stock <= p.minStock ? "text-red-600" : "text-green-600"}>{p.stock} {p.unit}</strong></span>
              </div>
            </div>

            {/* Qty + Add */}
            <div>
              <label className="form-label">Quantity ({p.unit})</label>
              <div className="flex gap-3 mt-1.5">
                <div className="flex items-center border border-steel-200 rounded-xl overflow-hidden bg-white">
                  <button onClick={() => setQty(q => Math.max(p.minOrder || 1, q - 1))}
                    className="w-10 h-11 flex items-center justify-center text-steel-500 hover:bg-steel-100 transition-colors font-bold text-lg">−</button>
                  <span className="w-14 text-center font-bold text-navy-950">{qty}</span>
                  <button onClick={() => setQty(q => Math.min(p.stock, q + 1))}
                    className="w-10 h-11 flex items-center justify-center text-steel-500 hover:bg-steel-100 transition-colors font-bold text-lg">+</button>
                </div>
                <div className="text-xs text-steel-500 self-center">
                  Total: <span className="font-bold text-navy-950 text-sm">{fmt(p.price * qty)}</span>
                  <br /><span className="text-steel-400">(+GST: {fmt(total)})</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleAdd} className="btn-primary flex-1 justify-center py-3">
                <ShoppingCart size={16} /> Add to Cart
              </button>
              <button onClick={handleBuyNow} className="btn-orange flex-1 justify-center py-3">
                Buy Now →
              </button>
              <button onClick={() => setWishlist(v => !v)}
                className={cn("w-12 h-12 border rounded-xl flex items-center justify-center transition-all", wishlist ? "border-red-300 bg-red-50 text-red-500" : "border-steel-200 bg-white text-steel-400 hover:border-red-300 hover:text-red-400")}>
                <Heart size={18} className={wishlist ? "fill-current" : ""} />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { icon: Truck,    label: "Free delivery", sub: "on ₹50,000+ orders" },
                { icon: FileText, label: "GST invoice",    sub: "auto-generated" },
                { icon: Shield,   label: "BIS certified",  sub: "IS 1786:2008" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center p-3 bg-steel-50 rounded-xl">
                  <Icon size={16} className="text-orange-500 mb-1.5" />
                  <p className="text-xs font-semibold text-navy-950">{label}</p>
                  <p className="text-[10px] text-steel-500">{sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mb-12">
          <div className="flex border-b border-steel-200 mb-6 gap-0">
            {["specs", "applications", "about"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn("px-5 py-3 text-sm font-semibold border-b-2 transition-colors capitalize", activeTab === tab ? "border-orange-500 text-orange-500" : "border-transparent text-steel-500 hover:text-navy-950")}>
                {tab === "specs" ? "Specifications" : tab === "applications" ? "Applications" : "About"}
              </button>
            ))}
          </div>

          {activeTab === "specs" && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(p.specs).map(([k, v]) => (
                <div key={k} className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">{k}</p>
                  <p className="font-bold text-navy-950 text-sm">{v}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "applications" && (
            <div className="grid sm:grid-cols-2 gap-3">
              {p.applications?.map(a => (
                <div key={a} className="flex items-center gap-3 p-4 bg-steel-50 rounded-xl border border-steel-200">
                  <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-navy-950">{a}</span>
                </div>
              ))}
            </div>
          )}

          {activeTab === "about" && (
            <div className="max-w-2xl">
              <p className="text-steel-600 leading-relaxed text-sm">{p.longDesc}</p>
            </div>
          )}
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-xl font-black text-navy-950 mb-5 tracking-tight">Related Products</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map(r => (
                <Link key={r.id} to={`/products/${r.slug}`} className="card-hover overflow-hidden group block">
                  <div className={cn("h-32 flex items-center justify-center text-4xl", PRODUCT_BG[r.category])}>
                    <span className="group-hover:scale-110 transition-transform duration-300">{PRODUCT_EMOJI[r.category]}</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-navy-950 text-sm mb-0.5">{r.name}</h3>
                    <p className="text-xs text-steel-500 mb-2">{r.grade}</p>
                    <p className="font-black text-navy-950">{fmt(r.price)}<span className="text-xs text-steel-400 font-normal">/{r.unit}</span></p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
