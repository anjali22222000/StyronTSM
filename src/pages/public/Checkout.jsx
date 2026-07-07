import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, MapPin, CreditCard, CheckCircle2, Loader2, ChevronRight, Shield } from "lucide-react";
import { selectCartItems, selectCartSubtotal, selectCoupon, selectUser, selectIsAuth, clearCart, setCredentials } from "../../store";
import { fmt, calcGST, PRODUCT_EMOJI, PRODUCT_BG, cn } from "../../utils";
import { apiFetch } from "../../lib/apiClient";
import toast from "react-hot-toast";

const STEPS = [
  { id: "email",   label: "Email",    icon: Mail },
  { id: "otp",     label: "Verify",   icon: Shield },
  { id: "address", label: "Address",  icon: MapPin },
  { id: "payment", label: "Payment",  icon: CreditCard },
];

const PAY_METHODS = [
  { id: "upi",     emoji: "📱", label: "UPI" },
  { id: "card",    emoji: "💳", label: "Card" },
  { id: "netbank", emoji: "🏦", label: "Net Banking" },
  { id: "emi",     emoji: "📅", label: "EMI" },
  { id: "paylater",emoji: "⏳", label: "Pay Later" },
  { id: "cod",     emoji: "💵", label: "COD" },
];

const STATES = ["Andhra Pradesh","Delhi","Goa","Gujarat","Karnataka","Kerala","Maharashtra","Punjab","Rajasthan","Tamil Nadu","Telangana","Uttar Pradesh","West Bengal"];

export default function Checkout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCoupon);
  const user = useSelector(selectUser);
  const isAuth = useSelector(selectIsAuth);
  const [step, setStep] = useState(isAuth ? 2 : 0);
  const [email, setEmail] = useState(user?.email || "customer@gmail.com");
  const [emailErr, setEmailErr] = useState("");
  const [otp, setOtp] = useState(["","","","","",""]);
  const [otpErr, setOtpErr] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [payMethod, setPayMethod] = useState("upi");
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState({
    fullName: user?.full_name || "Rajesh Kumar",
    phone: "+91 98765 43210",
    company: "Kumar Constructions",
    gstin: "27ABCDE1234F1Z5",
    line1: "Plot 12, Industrial Area, Andheri East",
    city: "Mumbai",
    pin: "400069",
    state: "Maharashtra",
  });
  const otpRefs = useRef([]);

  const discount = coupon ? (coupon.type === "pct" ? subtotal * coupon.val / 100 : coupon.val) : 0;
  const { gst, total } = calcGST(subtotal - discount);

  const sendOtp = async () => {
    if (!email.endsWith("@gmail.com")) { setEmailErr("Gmail address required"); return; }
    setEmailErr(""); setSending(true);
    try {
      await apiFetch("/auth/request-otp", { method: "POST", body: JSON.stringify({ email }) });
      setStep(1);
      toast.success(`OTP sent to ${email}`);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setEmailErr(err.message || "Couldn't send the code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every(Boolean)) {
      const code = next.join("");
      setTimeout(async () => {
        setVerifying(true);
        setOtpErr("");
        try {
          const res = await apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp: code }) });
          dispatch(setCredentials({
            access: res.data.accessToken,
            user: { full_name: res.data.user.name, email: res.data.user.email, role: "customer" },
          }));
          setStep(2);
          toast.success("✓ Verified! Complete your address");
        } catch (err) {
          setOtpErr(err.message || "Incorrect code. Please try again.");
          setOtp(["", "", "", "", "", ""]);
          otpRefs.current[0]?.focus();
        } finally {
          setVerifying(false);
        }
      }, 200);
    }
  };

  const handleOtpKey = (i, e) => { if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus(); };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      const shippingAddress = `${address.fullName}, ${address.company ? address.company + ", " : ""}${address.line1}, ${address.city}, ${address.state} ${address.pin}${address.gstin ? ` (GSTIN: ${address.gstin})` : ""}`;
      const res = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify({
          items: items.map(({ productId, qty }) => ({ productId, quantity: qty })),
          shippingAddress,
          guestName: address.fullName,
          guestEmail: email,
          guestPhone: address.phone,
        }),
      });
      dispatch(clearCart());
      navigate("/order-success", { state: { orderNum: res.data.orderNumber, total: res.data.total, email } });
    } catch (err) {
      toast.error(err.message || "Couldn't place your order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  const stepDone = (i) => i < step;
  const stepCurrent = (i) => i === step;

  return (
    <div className="container py-8">
      {/* Step header */}
      <div className="flex items-center gap-0 mb-8 max-w-lg">
        {STEPS.map(({ label, icon: Icon }, i) => (
          <div key={label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                stepDone(i) ? "bg-green-500 text-white" : stepCurrent(i) ? "bg-orange-500 text-white ring-4 ring-orange-200" : "bg-steel-200 text-steel-500")}>
                {stepDone(i) ? <CheckCircle2 size={16} /> : <Icon size={15} />}
              </div>
              <span className={cn("text-xs mt-1 font-medium", stepCurrent(i) ? "text-orange-500" : stepDone(i) ? "text-green-600" : "text-steel-400")}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <div className={cn("flex-1 h-0.5 mb-5 mx-1 transition-colors", i < step ? "bg-green-400" : "bg-steel-200")} />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="wait">
            {/* Step 0: Email */}
            {step === 0 && (
              <motion.div key="email" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card p-6">
                <h2 className="font-bold text-navy-950 text-lg mb-1 flex items-center gap-2"><Mail size={18} className="text-orange-500" /> Sign in with Gmail</h2>
                <p className="text-steel-500 text-sm mb-5">No password required. We'll send a 6-digit code to verify your identity.</p>
                <label className="form-label">Gmail Address</label>
                <input value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                  onKeyDown={e => e.key === "Enter" && sendOtp()}
                  type="email" placeholder="yourname@gmail.com"
                  className={cn("form-input mt-1", emailErr && "border-red-400")} />
                {emailErr && <p className="form-error">{emailErr}</p>}
                <button onClick={sendOtp} disabled={sending} className="btn-primary w-full justify-center py-3 mt-4">
                  {sending ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : "Send OTP →"}
                </button>
              </motion.div>
            )}

            {/* Step 1: OTP */}
            {step === 1 && (
              <motion.div key="otp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card p-6">
                <h2 className="font-bold text-navy-950 text-lg mb-1 flex items-center gap-2"><Shield size={18} className="text-orange-500" /> Verify OTP</h2>
                <p className="text-steel-500 text-sm mb-5">Enter the 6-digit code sent to <strong className="text-navy-950">{email}</strong></p>
                <div className="flex gap-2.5 mb-4">
                  {otp.map((d, i) => (
                    <input key={i} ref={el => otpRefs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d}
                      onChange={e => handleOtpChange(i, e.target.value)} onKeyDown={e => handleOtpKey(i, e)}
                      className="otp-input flex-1" disabled={verifying} />
                  ))}
                </div>
                {verifying && <div className="flex items-center gap-2 text-sm text-steel-500"><Loader2 size={13} className="animate-spin" /> Verifying…</div>}
                {otpErr && <p className="form-error mt-3">{otpErr}</p>}
              </motion.div>
            )}

            {/* Step 2: Address */}
            {step === 2 && (
              <motion.div key="addr" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card p-6">
                <h2 className="font-bold text-navy-950 text-lg mb-5 flex items-center gap-2"><MapPin size={18} className="text-orange-500" /> Delivery Details</h2>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    ["Full Name", "fullName"], ["Phone", "phone"],
                    ["Company Name", "company"], ["GSTIN (optional)", "gstin"],
                  ].map(([l, key]) => (
                    <div key={l}><label className="form-label">{l}</label>
                      <input value={address[key]} onChange={e => setAddress(a => ({ ...a, [key]: e.target.value }))} className="form-input mt-1" />
                    </div>
                  ))}
                  <div className="sm:col-span-2"><label className="form-label">Delivery Address *</label>
                    <input value={address.line1} onChange={e => setAddress(a => ({ ...a, line1: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">City *</label>
                    <input value={address.city} onChange={e => setAddress(a => ({ ...a, city: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div><label className="form-label">PIN Code *</label>
                    <input value={address.pin} onChange={e => setAddress(a => ({ ...a, pin: e.target.value }))} className="form-input mt-1" />
                  </div>
                  <div className="sm:col-span-2"><label className="form-label">State *</label>
                    <select value={address.state} onChange={e => setAddress(a => ({ ...a, state: e.target.value }))} className="form-input mt-1 cursor-pointer">
                      {STATES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <button onClick={() => setStep(3)} className="btn-primary w-full justify-center py-3 mt-5">Continue to Payment →</button>
              </motion.div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <motion.div key="pay" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="card p-6">
                <h2 className="font-bold text-navy-950 text-lg mb-5 flex items-center gap-2"><CreditCard size={18} className="text-orange-500" /> Payment</h2>
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  {PAY_METHODS.map(({ id, emoji, label }) => (
                    <button key={id} onClick={() => setPayMethod(id)}
                      className={cn("p-3 rounded-xl border-2 text-center transition-all", payMethod === id ? "border-orange-500 bg-orange-50" : "border-steel-200 hover:border-steel-300")}>
                      <div className="text-2xl mb-1">{emoji}</div>
                      <div className="text-xs font-semibold text-steel-700">{label}</div>
                    </button>
                  ))}
                </div>
                {payMethod === "upi" && <div className="mb-4"><label className="form-label">UPI ID</label><input defaultValue="rajesh@okaxis" className="form-input mt-1" /></div>}
                {payMethod === "card" && (
                  <div className="space-y-3 mb-4">
                    <div><label className="form-label">Card Number</label><input placeholder="4111 1111 1111 1111" className="form-input mt-1" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="form-label">Expiry</label><input placeholder="MM/YY" className="form-input mt-1" /></div>
                      <div><label className="form-label">CVV</label><input placeholder="•••" type="password" className="form-input mt-1" /></div>
                    </div>
                  </div>
                )}
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 mb-4">
                  <Shield size={14} className="text-green-600 flex-shrink-0" />
                  <p className="text-xs text-green-700 font-medium">Payment secured by Razorpay · PCI DSS Level 1 compliant</p>
                </div>
                <button onClick={placeOrder} disabled={placing}
                  className="btn-orange w-full justify-center py-3.5 text-base font-bold">
                  {placing ? <><Loader2 size={16} className="animate-spin" /> Processing…</> : <>🔒 Pay {fmt(total)} Now</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Order summary sidebar */}
        <div className="card p-5 sticky top-36">
          <h3 className="font-bold text-navy-950 mb-4 pb-3 border-b border-steel-100">Order Summary</h3>
          <div className="space-y-3 mb-4">
            {items.map(({ productId, product: p, qty }) => (
              <div key={productId} className="flex gap-2.5 items-center">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0", PRODUCT_BG[p.category])}>{PRODUCT_EMOJI[p.category]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-navy-950 truncate">{p.name}</p>
                  <p className="text-xs text-steel-500">×{qty} {p.unit}</p>
                </div>
                <span className="text-xs font-bold text-navy-950">{fmt(p.price * qty)}</span>
              </div>
            ))}
          </div>
          <div className="space-y-2 text-sm border-t border-steel-100 pt-3">
            <div className="flex justify-between text-steel-600"><span>Subtotal</span><span>{fmt(subtotal)}</span></div>
            {discount > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>− {fmt(discount)}</span></div>}
            <div className="flex justify-between text-steel-600"><span>GST 18%</span><span>{fmt(gst)}</span></div>
            <div className="flex justify-between text-steel-600"><span>Shipping</span><span className="text-green-600 font-semibold">FREE</span></div>
            <div className="flex justify-between font-black text-navy-950 text-base pt-2 border-t border-steel-200"><span>Total</span><span>{fmt(total)}</span></div>
          </div>
          <p className="text-xs text-steel-400 text-center mt-3">GST invoice auto-emailed after payment</p>
        </div>
      </div>
    </div>
  );
}
