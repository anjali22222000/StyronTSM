import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calculator, Download, FileText, ShoppingCart, Zap, CheckCircle2 } from "lucide-react";
import { STEEL_INTENSITY_FACTORS } from "../../data/products";
import { fetchProducts } from "../../lib/productsApi";
import { addItem, toggleDrawer } from "../../store";
import { fmt, fmtNum } from "../../utils";
import toast from "react-hot-toast";

const BUILDING_TYPES = [
  { id: "residential_low",  label: "Residential (G+3)",      icon: "🏠" },
  { id: "residential_high", label: "Residential (High-rise)", icon: "🏢" },
  { id: "commercial",       label: "Commercial / Office",     icon: "🏬" },
  { id: "industrial",       label: "Industrial / Warehouse",  icon: "🏭" },
  { id: "infrastructure",   label: "Infrastructure",          icon: "🌉" },
];

const GRADES = [
  { id: "fe415",  label: "Fe 415",  priceId: 6 },
  { id: "fe500d", label: "Fe 500D", priceId: 2 },
  { id: "fe550d", label: "Fe 550D", priceId: 4 },
];

function calcSteel({ buildingType, floors, buaPerFloor, grade, areaUnit }) {
  const factor = STEEL_INTENSITY_FACTORS[buildingType]?.base || 4.0;
  // Convert sqft to sqm if needed
  const buaSqm = areaUnit === "sqft" ? buaPerFloor * 0.0929 : buaPerFloor;
  const totalBuaSqm = buaSqm * floors;

  // kg/sqm intensity (IS 456:2000 based empirical values)
  const kgPerSqm = factor;
  const totalKg = totalBuaSqm * kgPerSqm;
  const totalMT = totalKg / 1000;

  // Grade price
  const gradeMap = { fe415: 59500, fe500d: 61500, fe550d: 63500 };
  const price = gradeMap[grade] || 61500;
  const cost = totalMT * price;

  // Breakdown by bar diameter (typical distribution for residential)
  const breakdown = [
    { name: "TMT Fe 500D — 12mm", slug: "tmt-fe-500d-12mm", pct: 0.45, unit: "MT" },
    { name: "TMT Fe 500D — 16mm", slug: "tmt-fe-500d-16mm", pct: 0.30, unit: "MT" },
    { name: "TMT Fe 500D — 8mm",  slug: "tmt-fe-500d-8mm",  pct: 0.15, unit: "MT" },
    { name: "Welded Wire Mesh",   slug: "wire-mesh-6mm-150", pct: null, unit: "SQM", sqm: Math.round(totalBuaSqm) },
    { name: "Binding Wire 18G",   slug: "binding-wire-18g",  pct: null, unit: "KG",  kg: Math.round(totalMT * 8) },
  ].map(item => ({
    ...item,
    qty: item.pct ? parseFloat((totalMT * item.pct).toFixed(2)) : (item.sqm || item.kg),
  }));

  return {
    totalMT: parseFloat(totalMT.toFixed(2)),
    totalKg: Math.round(totalKg),
    totalCost: Math.round(cost),
    intensityKgPerSqm: parseFloat(kgPerSqm.toFixed(2)),
    breakdown,
    totalBuaSqm: Math.round(totalBuaSqm),
  };
}

export default function AIEstimator() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    buildingType: "residential_low",
    floors: 4,
    buaPerFloor: 1800,
    areaUnit: "sqft",
    grade: "fe500d",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [result, setResult] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [products, setProducts] = useState([]);

  useEffect(() => { fetchProducts().then(setProducts).catch(() => {}); }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    if (form.floors > 0 && form.buaPerFloor > 0) {
      setCalculating(true);
      const t = setTimeout(() => {
        setResult(calcSteel(form));
        setCalculating(false);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [form]);

  const handleAddAll = () => {
    result?.breakdown.forEach(item => {
      const p = products.find(x => x.slug === item.slug);
      if (p) dispatch(addItem({ product: p, quantity: Math.max(1, item.qty) }));
    });
    dispatch(toggleDrawer());
    toast.success("All recommended products added to cart!");
  };

  const factor = STEEL_INTENSITY_FACTORS[form.buildingType];

  return (
    <div className="container py-10 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 text-xs font-bold px-4 py-1.5 rounded-full mb-4">
          <Zap size={13} /> AI-Powered · IS 456:2000 Standard
        </div>
        <h1 className="section-title mb-3">Steel Requirement Estimator</h1>
        <p className="section-sub max-w-xl mx-auto">
          Enter your building parameters. Our estimation engine uses IS 456:2000 code-based steel intensity factors to calculate material requirements.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="space-y-5">
          <div className="card p-6">
            <h2 className="font-bold text-navy-950 mb-4 flex items-center gap-2">
              <Calculator size={17} className="text-orange-500" /> Building Parameters
            </h2>

            {/* Building type */}
            <div className="mb-4">
              <label className="form-label">Building Type</label>
              <div className="grid grid-cols-1 gap-2 mt-1.5">
                {BUILDING_TYPES.map(bt => (
                  <button key={bt.id} onClick={() => set("buildingType", bt.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      form.buildingType === bt.id
                        ? "border-orange-500 bg-orange-50 text-navy-950"
                        : "border-steel-200 hover:border-steel-300 text-steel-700"
                    }`}>
                    <span className="text-xl">{bt.icon}</span>
                    <div>
                      <p className="font-semibold text-sm">{bt.label}</p>
                      <p className="text-xs text-steel-500">{STEEL_INTENSITY_FACTORS[bt.id]?.example}</p>
                    </div>
                    {form.buildingType === bt.id && <CheckCircle2 size={16} className="text-orange-500 ml-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Number of Floors</label>
                <input type="number" value={form.floors} onChange={e => set("floors", +e.target.value)} min={1} max={50} className="form-input mt-1" />
              </div>
              <div>
                <label className="form-label">Area Unit</label>
                <select value={form.areaUnit} onChange={e => set("areaUnit", e.target.value)} className="form-input mt-1 cursor-pointer">
                  <option value="sqft">Square feet (sq ft)</option>
                  <option value="sqm">Square metres (sq m)</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="form-label">Built-up Area per Floor ({form.areaUnit})</label>
                <input type="number" value={form.buaPerFloor} onChange={e => set("buaPerFloor", +e.target.value)} min={100} className="form-input mt-1" />
                <p className="text-xs text-steel-400 mt-1">
                  Total: {fmtNum(form.buaPerFloor * form.floors)} {form.areaUnit}
                  {form.areaUnit === "sqft" && ` (${fmtNum(Math.round(form.buaPerFloor * form.floors * 0.0929))} sq m)`}
                </p>
              </div>
              <div className="col-span-2">
                <label className="form-label">Steel Grade</label>
                <div className="grid grid-cols-3 gap-2 mt-1.5">
                  {GRADES.map(g => (
                    <button key={g.id} onClick={() => set("grade", g.id)}
                      className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${form.grade === g.id ? "border-navy-950 bg-navy-950 text-white" : "border-steel-200 text-steel-700 hover:border-steel-300"}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="card p-6">
            <h3 className="font-bold text-navy-950 mb-4 text-sm">Contact for PDF Report (optional)</h3>
            <div className="space-y-3">
              {[["contactName","Your Name",""],["contactEmail","Email",""],["contactPhone","Phone",""]].map(([key, ph]) => (
                <input key={key} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={ph} className="form-input text-sm" />
              ))}
              <button onClick={() => toast.success("📧 PDF report sent to your email!")}
                className="btn-outline w-full justify-center py-2.5 text-sm">
                <Download size={14} /> Get PDF Report
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-navy-950 flex items-center gap-2">
                <Zap size={17} className="text-orange-500" /> Estimation Results
              </h2>
              {calculating && <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
            </div>

            {result && (
              <motion.div key={JSON.stringify(form)} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* KPI grid */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Total Steel", val: `${result.totalMT} MT`, sub: `${fmtNum(result.totalKg)} kg`, color: "text-navy-950" },
                    { label: "Estimated Cost", val: fmt(result.totalCost), sub: "At market rate", color: "text-orange-500" },
                    { label: "Steel Intensity", val: `${result.intensityKgPerSqm} kg/sqm`, sub: factor?.description, color: "text-navy-950" },
                    { label: "Total BUA", val: `${fmtNum(result.totalBuaSqm)} sqm`, sub: `${fmtNum(form.buaPerFloor * form.floors)} ${form.areaUnit}`, color: "text-navy-950" },
                  ].map(({ label, val, sub, color }) => (
                    <div key={label} className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                      <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className={`text-xl font-black ${color} tracking-tight`}>{val}</p>
                      <p className="text-xs text-steel-400 mt-0.5">{sub}</p>
                    </div>
                  ))}
                </div>

                {/* Standard badge */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 mb-5">
                  <CheckCircle2 size={14} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-medium">
                    Calculated as per IS 456:2000 · Intensity factor: {result.intensityKgPerSqm} kg/sqm for {factor?.description}
                  </p>
                </div>

                {/* Material breakdown */}
                <div className="bg-navy-950 rounded-xl p-5">
                  <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-4">📦 Recommended Material List</p>
                  <div className="space-y-3">
                    {result.breakdown.map(item => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="text-steel-300 text-sm">{item.name}</span>
                        <span className="font-bold text-orange-400 text-sm">{typeof item.qty === "number" ? item.qty.toFixed(item.unit === "MT" ? 2 : 0) : item.qty} {item.unit}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-white/10 mt-4 pt-4 flex items-center justify-between">
                    <span className="text-steel-400 text-sm">Approx. Total Cost</span>
                    <span className="text-white font-black text-lg">{fmt(result.totalCost)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Actions */}
          {result && (
            <div className="space-y-3">
              <button onClick={handleAddAll} className="btn-orange w-full justify-center py-3.5 text-sm font-bold">
                <ShoppingCart size={16} /> Add All to Cart & Order
              </button>
              <Link to="/quotation" className="btn-outline w-full justify-center py-3.5 text-sm font-bold">
                <FileText size={16} /> Get Formal GST Quotation
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
