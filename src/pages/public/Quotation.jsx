import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Mail, Plus, Trash2, ArrowRight, Loader2 } from "lucide-react";
import { DEMO_QUOTATIONS } from "../../data/products";
import { fetchProducts } from "../../lib/productsApi";
import { fmt, calcGST, genQuotNum } from "../../utils";
import { apiFetch, API_BASE_URL } from "../../lib/apiClient";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";

const QUOT = DEMO_QUOTATIONS[0];

export default function Quotation() {
  const [view, setView] = useState("preview"); // preview | request
  const [items, setItems] = useState(QUOT.items.map((item, i) => ({ ...item, id: i })));
  const nextId = useState(QUOT.items.length)[0];
  const [products, setProducts] = useState([]);

  // Request form state
  const nameRef   = useRef();
  const compRef   = useRef();
  const emailRef  = useRef();
  const phoneRef  = useRef();
  const gstinRef  = useRef();
  const addrRef   = useRef();

  // Live quotation created from the "Request New" tab
  const [createdQuot, setCreatedQuot] = useState(null); // { quotationId, quotationNumber, total }

  // Loading states
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailing, setEmailing] = useState(false);

  useEffect(() => { fetchProducts().then(setProducts).catch(() => {}); }, []);

  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0);
  const { cgst, sgst, total } = { cgst: subtotal * 0.09, sgst: subtotal * 0.09, total: subtotal * 1.18 };

  const updateItem = (id, key, val) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [key]: key === "qty" || key === "rate" ? +val : val } : i));
  };

  // ── Download PDF (for the demo QUOT in preview tab, uses createdQuot if available) ──
  const handleDownload = async () => {
    if (!createdQuot) {
      toast.error("Generate a quotation first using the 'Request New' tab.");
      return;
    }
    setDownloading(true);
    const toastId = toast.loading("Preparing PDF…");
    try {
      let accessToken = null;
      try { accessToken = localStorage.getItem("styron_access_token"); } catch {}
      const res = await fetch(
        `${API_BASE_URL}/quotations/${createdQuot.quotationId}/pdf?token=${createdQuot.quotationNumber}`,
        {
          credentials: "include",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }
      );
      if (!res.ok) throw new Error("PDF generation failed.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `QUOTATION-${createdQuot.quotationNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Download failed.", { id: toastId });
    } finally {
      setDownloading(false);
    }
  };

  // ── Email to customer ──
  const handleEmail = async () => {
    if (!createdQuot) {
      toast.error("Generate a quotation first using the 'Request New' tab.");
      return;
    }
    setEmailing(true);
    const toastId = toast.loading("Sending email…");
    try {
      await apiFetch(`/quotations/${createdQuot.quotationId}/email`, { method: "POST" });
      toast.success("Quotation emailed to customer!", { id: toastId });
    } catch (err) {
      toast.error(err.message || "Email failed.", { id: toastId });
    } finally {
      setEmailing(false);
    }
  };

  // ── Generate quotation from Request tab ──
  const handleGenerate = async () => {
    const customerName  = nameRef.current?.value?.trim();
    const customerEmail = emailRef.current?.value?.trim();
    if (!customerName)  { toast.error("Full name is required."); nameRef.current?.focus(); return; }
    if (!customerEmail) { toast.error("Email is required."); emailRef.current?.focus(); return; }
    if (!items.length)  { toast.error("Add at least one product."); return; }

    setGenerating(true);
    const toastId = toast.loading("Generating quotation…");
    try {
      const res = await apiFetch("/quotations/generate", {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerEmail,
          customerPhone:   phoneRef.current?.value?.trim() || "",
          customerCompany: compRef.current?.value?.trim()  || "",
          customerAddress: addrRef.current?.value?.trim()  || "",
          customerGstin:   gstinRef.current?.value?.trim() || "",
          items: items.map(item => ({
            name:  item.name,
            grade: item.grade || "",
            qty:   item.qty,
            unit:  item.unit || "MT",
            rate:  item.rate,
          })),
        }),
      });

      setCreatedQuot({
        quotationId:     res.data.quotationId,
        quotationNumber: res.data.quotationNumber,
        total:           res.data.total,
      });

      if (res.data.emailSent) {
        toast.success(`Quotation ${res.data.quotationNumber} created & emailed!`, { id: toastId });
      } else {
        toast.success(`Quotation ${res.data.quotationNumber} created. Switch to Preview to download.`, { id: toastId });
      }
      setView("preview");
    } catch (err) {
      toast.error(err.message || "Failed to generate quotation.", { id: toastId });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container py-10 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="section-label">Quotation System</p>
          <h1 className="text-2xl font-black text-navy-950 tracking-tight">Auto-Generated GST Quotation</h1>
          <p className="text-steel-500 text-sm mt-1">Digitally generated · Legally compliant · Emailed instantly</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setView("preview")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${view === "preview" ? "bg-navy-950 text-white" : "btn-outline"}`}>Preview</button>
          <button onClick={() => setView("request")} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${view === "request" ? "bg-navy-950 text-white" : "btn-outline"}`}>Request New</button>
        </div>
      </div>

      {view === "preview" ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          {/* Quotation document */}
          <div className="card overflow-hidden mb-5">
            {/* Header */}
            <div className="bg-navy-950 px-8 py-6 flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                  <span className="text-white font-black">S</span>
                </div>
                <div>
                  <p className="text-white font-black text-lg">Styron TSM</p>
                  <p className="text-steel-400 text-xs">Steel Reinforcement Manufacturing</p>
                  <p className="text-steel-500 text-xs">GSTIN: 27STYR0001M1ZA · ISO 9001:2015</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-steel-500 text-xs uppercase tracking-wider">Quotation No.</p>
                <p className="text-orange-400 font-black text-xl">{QUOT.id}</p>
                <p className="text-steel-400 text-xs mt-1">Date: {new Date(QUOT.date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                <p className="text-steel-400 text-xs">Valid till: {new Date(QUOT.validUntil).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
              </div>
            </div>

            <div className="p-8">
              {/* Bill to */}
              <div className="grid sm:grid-cols-2 gap-5 mb-8">
                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-3">Bill To</p>
                  <p className="font-bold text-navy-950">{QUOT.customer}</p>
                  <p className="text-steel-600 text-sm">{QUOT.contact}</p>
                  <p className="text-steel-500 text-sm">{QUOT.address}</p>
                  <p className="text-steel-500 text-sm mt-1">📞 {QUOT.phone}</p>
                  <p className="text-steel-500 text-sm">GSTIN: {QUOT.gstin}</p>
                </div>
                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="text-xs font-bold text-steel-500 uppercase tracking-wider mb-3">From</p>
                  <p className="font-bold text-navy-950">Styron TSM</p>
                  <p className="text-steel-600 text-sm">Steel Reinforcement Manufacturing</p>
                  <p className="text-steel-500 text-sm">Industrial Area, City, State 400001</p>
                  <p className="text-steel-500 text-sm mt-1">📞 +91 12345 67890</p>
                  <p className="text-steel-500 text-sm">GSTIN: 27STYR0001M1ZA</p>
                </div>
              </div>

              {/* Items table */}
              <div className="table-wrapper mb-6">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Product Description</th>
                      <th>Grade / Std.</th>
                      <th className="text-right">Qty</th>
                      <th>Unit</th>
                      <th className="text-right">Rate</th>
                      <th className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr key={item.id}>
                        <td className="text-steel-400">{i + 1}</td>
                        <td><span className="font-semibold text-navy-950">{item.name}</span></td>
                        <td><span className="badge badge-steel">{item.grade}</span></td>
                        <td className="text-right font-bold">{item.qty}</td>
                        <td className="text-steel-500">{item.unit}</td>
                        <td className="text-right font-medium">{fmt(item.rate)}</td>
                        <td className="text-right font-bold text-navy-950">{fmt(item.qty * item.rate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals + Terms */}
              <div className="grid sm:grid-cols-2 gap-6 items-start">
                <div className="bg-steel-50 rounded-xl p-4 border border-steel-200">
                  <p className="font-bold text-navy-950 text-sm mb-3">Terms & Conditions</p>
                  <ul className="text-xs text-steel-500 space-y-1.5">
                    {["Prices valid for 15 days from quotation date","GST extra as applicable (18%)","50% advance, balance before dispatch","Delivery: 3–5 working days from order confirmation","Subject to stock availability","Mill Test Certificate provided with each order","F.O.R. Destination pricing included"].map(t => (
                      <li key={t} className="flex items-start gap-1.5"><span className="text-orange-500 flex-shrink-0">•</span>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="bg-navy-950 rounded-xl p-5">
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between text-steel-400"><span>Taxable Amount</span><span className="text-white font-medium">{fmt(subtotal)}</span></div>
                    <div className="flex justify-between text-steel-400"><span>CGST @ 9%</span><span className="text-white font-medium">{fmt(cgst)}</span></div>
                    <div className="flex justify-between text-steel-400"><span>SGST @ 9%</span><span className="text-white font-medium">{fmt(sgst)}</span></div>
                    <div className="border-t border-white/15 pt-3 flex justify-between">
                      <span className="text-white font-bold">Grand Total</span>
                      <span className="text-orange-400 font-black text-xl">{fmt(total)}</span>
                    </div>
                  </div>
                  <p className="text-steel-600 text-xs mt-3 pt-3 border-t border-white/10">
                    In words: Rupees {Math.round(total).toLocaleString("en-IN")} only (inclusive of GST)
                  </p>
                </div>
              </div>

              {/* Signature */}
              <div className="mt-8 pt-6 border-t border-steel-200 flex items-end justify-between flex-wrap gap-4">
                <div className="text-xs text-steel-400">
                  <p>This is a computer-generated quotation and is valid without signature.</p>
                  <p>For queries: sales@styrontsm.com · +91 12345 67890</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-steel-500 mb-1">For Styron TSM</p>
                  <p className="font-bold text-navy-950 text-sm">Authorised Signatory</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button onClick={handleDownload} disabled={downloading}
              className="btn-primary flex items-center gap-2 py-3 px-6">
              {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            <button onClick={handleEmail} disabled={emailing}
              className="btn-outline flex items-center gap-2 py-3 px-6">
              {emailing ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {emailing ? "Sending…" : "Email to Customer"}
            </button>
            <Link to="/checkout" className="btn-orange flex items-center gap-2 py-3 px-6">
              <ArrowRight size={15} /> Convert to Order
            </Link>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="card p-6">
            <h2 className="font-bold text-navy-950 mb-5">Request a New Quotation</h2>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div><label className="form-label">Full Name *</label><input ref={nameRef} className="form-input mt-1" placeholder="Full Name" /></div>
              <div><label className="form-label">Company</label><input ref={compRef} className="form-input mt-1" placeholder="Company Name" /></div>
              <div><label className="form-label">Email *</label><input ref={emailRef} type="email" className="form-input mt-1" placeholder="your@email.com" /></div>
              <div><label className="form-label">Phone</label><input ref={phoneRef} className="form-input mt-1" placeholder="+91 98765 43210" /></div>
              <div><label className="form-label">GSTIN (optional)</label><input ref={gstinRef} className="form-input mt-1" placeholder="27ABCDE1234F1Z5" /></div>
              <div className="sm:col-span-2"><label className="form-label">Delivery Address</label><input ref={addrRef} className="form-input mt-1" placeholder="Full delivery address" /></div>
            </div>
            <h3 className="font-bold text-navy-950 mb-3 text-sm">Products Required</h3>
            <div className="space-y-3 mb-4">
              {items.map((item, i) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select value={item.name} onChange={e => {
                      const p = products.find(x => x.name === e.target.value);
                      if (p) updateItem(item.id, "name", p.name);
                    }} className="form-input text-sm cursor-pointer">
                      {products.map(p => <option key={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2"><input type="number" value={item.qty} onChange={e => updateItem(item.id, "qty", e.target.value)} className="form-input text-sm" placeholder="Qty" /></div>
                  <div className="col-span-2"><input value={item.unit} className="form-input text-sm bg-steel-50" readOnly /></div>
                  <div className="col-span-2"><input value={fmt(item.qty * item.rate)} className="form-input text-sm bg-steel-50 font-bold" readOnly /></div>
                  <div className="col-span-1 flex justify-center">
                    <button onClick={() => setItems(prev => prev.filter(x => x.id !== item.id))} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={handleGenerate} disabled={generating}
              className="btn-orange w-full justify-center py-3 text-sm font-bold flex items-center gap-2">
              {generating ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
              {generating ? "Generating…" : "Generate Quotation & Send Email"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
