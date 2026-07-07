import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useDispatch } from "react-redux";
import {
  ArrowRight, Shield, Zap, FileText, Calculator,
  Star, CheckCircle2, Package, TrendingUp, Building2,
  Factory, HardHat, Truck, Award,
} from "lucide-react";
import { fetchCategories, mapProduct } from "../../lib/productsApi";
import { apiFetch } from "../../lib/apiClient";
import { addItem, toggleDrawer } from "../../store";
import { fmt, PRODUCT_EMOJI, PRODUCT_BG, BADGE_COLOR, cn } from "../../utils";
import toast from "react-hot-toast";

const fade = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45 } } };
const stagger = { show: { transition: { staggerChildren: 0.08 } } };

const STATS = [
  { val: "25+",   lbl: "Years Experience", icon: Award },
  { val: "500 MT",lbl: "Monthly Capacity",  icon: Factory },
  { val: "5,000+",lbl: "Projects Delivered",icon: Building2 },
  { val: "ISO",   lbl: "9001:2015 Certified",icon: Shield },
];

const FEATURES = [
  { icon: Shield,    title: "BIS Certified Steel",    desc: "Every product meets Bureau of Indian Standards IS 1786:2008 — verified by third-party testing labs." },
  { icon: Zap,       title: "48-Hour Dispatch",        desc: "Same-day processing for in-stock items. Real-time tracking from our warehouse to your site." },
  { icon: Calculator,title: "AI Steel Estimator",      desc: "Enter building dimensions, get instant steel quantity and cost estimates with a downloadable PDF report." },
  { icon: FileText,  title: "Auto GST Invoices",       desc: "Compliant GST invoices and quotations auto-generated and emailed within seconds of ordering." },
  { icon: Truck,     title: "Pan-India Delivery",      desc: "Delivery to 500+ cities. Freight-on-road pricing included. Dedicated logistics partner network." },
  { icon: Package,   title: "Mill Test Certificates",  desc: "Every order ships with a Mill Test Certificate (MTC) confirming chemical and mechanical properties." },
];

const INDUSTRIES = [
  { label: "Residential",    icon: Building2, desc: "Villas, apartments, housing complexes" },
  { label: "Commercial",     icon: Building2, desc: "Offices, malls, hotels, hospitals" },
  { label: "Industrial",     icon: Factory,   desc: "Factories, warehouses, sheds" },
  { label: "Infrastructure", icon: HardHat,   desc: "Roads, bridges, metro rail, dams" },
];

const TESTIMONIALS = [
  { name: "Rajesh Kumar",    co: "Kumar Constructions, Mumbai",  rating: 5, text: "Styron's TMT bars have been our go-to for 5 years. Quality is rock-solid, delivery always on time. The online ordering system and auto-GST invoice saves us hours every month." },
  { name: "Priya Sharma",    co: "Sharma Builders, Pune",        rating: 5, text: "The AI estimator predicted our 12-floor project steel consumption within 2% accuracy. Saved 3 hours of manual calculation and helped us quote clients faster." },
  { name: "Mohammed Ali",    co: "Al Noor Infrastructure, Chennai",rating: 5, text: "Best bulk pricing in the market. The digital quotation system generates professional PDFs instantly — our client presentations look world-class now." },
];

export default function Home() {
  const dispatch = useDispatch();
  const [featured, setFeatured] = useState([]);
  const [CATEGORIES, setCATEGORIES] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/featured-products").then((res) => {
      if (!cancelled) setFeatured((res.data || []).map(mapProduct));
    }).catch(() => {}); // featured section just stays empty on failure — rest of the page still works
    fetchCategories().then((cats) => { if (!cancelled) setCATEGORIES(cats); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleAdd = (product) => {
    dispatch(addItem({ product, quantity: 1 }));
    dispatch(toggleDrawer());
    toast.success(`${product.name} added to cart`);
  };

  return (
    <>
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="bg-steel-hero min-h-[88vh] flex items-center relative overflow-hidden py-16">
        {/* Premium grid overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px)", backgroundSize: "80px 80px" }} />

        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fade} className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-6">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                India's Trusted Steel Reinforcement Platform
              </motion.div>

              <motion.h1 variants={fade} className="text-[clamp(36px,5.5vw,60px)] font-black text-white leading-[1.06] tracking-tight mb-4">
                Built for{" "}
                <span className="text-gradient">Strength.</span>
                <br />
                <span className="text-white/85">Engineered for</span>
                <br />India.
              </motion.h1>

              <motion.p variants={fade} className="text-steel-400 text-lg leading-relaxed max-w-lg mb-8">
                Premium TMT bars, structural steel &amp; wire mesh — IS 1786 certified,
                BIS approved, delivered to your site in 48 hours.
              </motion.p>

              <motion.div variants={fade} className="flex flex-wrap gap-3 mb-8">
                <Link to="/products" className="btn-orange px-7 py-3 text-base font-bold shadow-orange">
                  Shop Products <ArrowRight size={17} />
                </Link>
                <Link to="/ai-estimator" className="flex items-center gap-2 px-7 py-3 bg-white/10 border border-white/15 text-white text-base font-semibold rounded-xl hover:bg-white/20 transition-all">
                  <Calculator size={17} /> AI Estimator
                </Link>
              </motion.div>

              <motion.div variants={fade} className="flex flex-wrap gap-2">
                {["IS 1786:2008 Certified", "BIS Approved", "ISO 9001:2015", "Mill Test Cert"].map(b => (
                  <span key={b} className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 text-steel-400 text-xs font-medium rounded-full">
                    <CheckCircle2 size={11} className="text-green-400" /> {b}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Stats grid */}
            <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
              className="hidden lg:grid grid-cols-2 gap-4">
              {STATS.map(({ val, lbl, icon: Icon }) => (
                <div key={lbl} className="glass-dark rounded-2xl p-6 flex flex-col hover-lift">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={18} className="text-orange-400" />
                  </div>
                  <span className="text-4xl font-black text-white tracking-tight">{val}</span>
                  <span className="text-steel-400 text-sm mt-1">{lbl}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 inset-x-0">
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" className="w-full">
            <path d="M0,48L1440,0L1440,48Z" fill="#f1f5f9" />
          </svg>
        </div>
      </section>

      {/* ── ORANGE STATS BAR ─────────────────────────── */}
      <section className="bg-gradient-to-r from-orange-500 via-orange-500 to-orange-600 py-5 -mt-px shadow-lg">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {STATS.map(({ val, lbl }) => (
              <div key={lbl}>
                <p className="text-2xl font-black text-white">{val}</p>
                <p className="text-orange-100 text-xs mt-0.5 font-medium">{lbl}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container">
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} variants={stagger} className="text-center mb-12">
            <motion.p variants={fade} className="section-label">Why Styron TSM</motion.p>
            <motion.h2 variants={fade} className="section-title">The complete steel supply platform</motion.h2>
            <motion.p variants={fade} className="section-sub max-w-xl mx-auto">From product discovery to doorstep delivery — everything digital, fast, and transparent.</motion.p>
          </motion.div>
          <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }} variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <motion.div key={title} variants={fade} className="hover-lift card p-6 group border-0 shadow-md">
                <div className="w-11 h-11 bg-navy-950 group-hover:bg-orange-500 rounded-xl flex items-center justify-center mb-4 transition-colors duration-200">
                  <Icon size={19} className="text-orange-400 group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-bold text-navy-950 mb-2">{title}</h3>
                <p className="text-sm text-steel-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── FEATURED PRODUCTS ────────────────────────── */}
      <section className="section bg-steel-50">
        <div className="container">
          <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
            <div>
              <p className="section-label">Our Products</p>
              <h2 className="section-title">Quality steel for every project</h2>
            </div>
            <Link to="/products" className="btn-outline text-sm">View all products <ArrowRight size={15} /></Link>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 flex-wrap mb-6">
            {CATEGORIES.map(cat => (
              <Link key={cat.id} to={`/products?cat=${cat.id}`}
                className="flex items-center gap-1.5 px-4 py-2 bg-white border border-steel-200 rounded-full text-sm font-medium text-steel-700 hover:border-navy-950 hover:text-navy-950 transition-all shadow-card">
                {cat.icon} {cat.label}
                <span className="text-xs text-steel-400">({cat.count})</span>
              </Link>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {featured.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="hover-lift card overflow-hidden group cursor-pointer rounded-2xl border border-steel-100"
                onClick={() => window.location.href = `/products/${p.slug}`}
              >
                <div
  className={cn(
    "h-44 relative overflow-hidden flex items-center justify-center",
    !p.images?.length && PRODUCT_BG[p.category]
  )}
>
  {p.images && p.images.length > 0 ? (
    <img
      src={p.images[0].url || p.images[0]}
      alt={p.name}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
    />
  ) : (
    <span className="text-5xl group-hover:scale-110 transition-transform duration-300 select-none">
      {PRODUCT_EMOJI[p.category]}
    </span>
  )}

  {p.badge && (
    <span
      className={cn(
        "absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-xs font-bold",
        BADGE_COLOR[p.badge]
      )}
    >
      {p.badgeLabel}
    </span>
  )}

  {p.stock <= p.minStock && (
    <span className="absolute top-3 right-3 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold">
      Low Stock
    </span>
  )}
</div>
                <div className="p-4">
                  <p className="text-xs text-orange-500 font-bold uppercase tracking-wider mb-1">{p.categoryLabel}</p>
                  <h3 className="font-bold text-navy-950 text-sm leading-snug mb-1">{p.name}</h3>
                  <p className="text-xs text-steel-500 mb-3">{p.grade} · {p.size} · per {p.unit}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-lg font-black text-navy-950">{fmt(p.price)}</span>
                      <span className="text-xs text-steel-400">/{p.unit}</span>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleAdd(p); }}
                      className="w-9 h-9 bg-navy-950 hover:bg-orange-500 text-white rounded-xl flex items-center justify-center transition-all active:scale-90 text-xl font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-1 mt-2.5 text-xs text-steel-400">
                    <Star size={11} className="fill-orange-400 text-orange-400" />
                    <span className="font-medium text-navy-950">{p.rating}</span>
                    <span>({p.reviewCount} reviews)</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI ESTIMATOR CTA ─────────────────────────── */}
      <section className="section bg-navy-950 relative overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(249,115,22,0.12),transparent 70%)" }} />
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/25 text-orange-400 text-xs font-semibold px-3.5 py-1.5 rounded-full mb-5">
                <Zap size={13} /> AI-Powered Tool
              </div>
              <h2 className="text-4xl font-black text-white tracking-tight mb-4 leading-tight">
                Estimate your steel requirements in seconds
              </h2>
              <p className="text-steel-400 leading-relaxed mb-6">
                Enter building type, floors, and area — our AI engine uses IS 456:2000 standards to calculate exact material quantities, costs, and generate a downloadable PDF report.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/ai-estimator" className="btn-orange px-7 py-3 text-base font-bold">
                  <Calculator size={17} /> Try AI Estimator Free
                </Link>
                <Link to="/quotation" className="flex items-center justify-center gap-2 px-7 py-3 border border-white/15 text-white rounded-xl font-semibold hover:bg-white/10 transition-all">
                  <FileText size={17} /> Get Formal Quotation
                </Link>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-3">
              {[
                { label: "Steel Quantity", val: "12.4 MT", note: "Based on IS 456 intensity" },
                { label: "Estimated Cost", val: "₹7.6L", note: "At current market rates" },
                { label: "PDF Report",     val: "Auto",   note: "Email + download" },
                { label: "Accuracy",       val: "±2%",    note: "Verified on 1,000+ projects" },
              ].map(({ label, val, note }) => (
                <div key={label} className="glass rounded-2xl p-5">
                  <p className="text-steel-500 text-xs font-semibold uppercase tracking-wider mb-2">{label}</p>
                  <p className="text-2xl font-black text-orange-400 mb-1">{val}</p>
                  <p className="text-steel-600 text-xs">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES ───────────────────────────────── */}
      <section className="section bg-white">
        <div className="container">
          <div className="text-center mb-10">
            <p className="section-label">Industries Served</p>
            <h2 className="section-title">Built for every sector</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {INDUSTRIES.map(({ label, icon: Icon, desc }) => (
              <Link key={label} to="/products"
                className="card-hover p-6 flex flex-col items-center text-center gap-3 group">
                <div className="w-14 h-14 bg-steel-100 group-hover:bg-navy-950 rounded-2xl flex items-center justify-center transition-all duration-200">
                  <Icon size={24} className="text-navy-950 group-hover:text-orange-400 transition-colors" />
                </div>
                <div>
                  <p className="font-bold text-navy-950">{label}</p>
                  <p className="text-xs text-steel-500 mt-1">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────── */}
      <section className="section bg-steel-50">
        <div className="container">
          <div className="text-center mb-10">
            <p className="section-label">Testimonials</p>
            <h2 className="section-title">Trusted by 5,000+ builders</h2>
            <p className="section-sub max-w-md mx-auto">From independent contractors to large infrastructure companies</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, co, rating, text }) => (
              <motion.div key={name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="card p-6 flex flex-col gap-4">
                <div className="flex gap-0.5">
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star key={i} size={14} className="fill-orange-400 text-orange-400" />
                  ))}
                </div>
                <p className="text-steel-600 text-sm leading-relaxed flex-1">"{text}"</p>
                <div className="flex items-center gap-3 pt-3 border-t border-steel-100">
                  <div className="w-9 h-9 bg-navy-950 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-semibold text-navy-950 text-sm">{name}</p>
                    <p className="text-xs text-steel-500">{co}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────── */}
      <section className="section bg-white">
        <div className="container">
          <div className="bg-hero-pattern rounded-3xl px-8 py-14 md:px-14 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">Ready to build something great?</h2>
              <p className="text-steel-400 mb-8 max-w-md mx-auto">Browse our full catalogue or get an instant AI-powered estimate for your project.</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/products" className="btn-orange px-8 py-3.5 text-base font-bold">Shop Products</Link>
                <Link to="/quotation" className="flex items-center gap-2 px-8 py-3.5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all">
                  Get Quotation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
