import { useState, useRef, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Shield, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";
import { selectAuthModalOpen, selectOtpStep, selectOtpEmail, closeAuthModal, setOtpSent, setOtpIdle, setCredentials } from "../../store";
import { cn } from "../../utils";
import { apiFetch } from "../../lib/apiClient";
import toast from "react-hot-toast";

export default function AuthModal() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectAuthModalOpen);
  const otpStep = useSelector(selectOtpStep);
  const otpEmail = useSelector(selectOtpEmail);

  const [email, setEmail] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const refs = useRef([]);

  const step = otpStep === "verified" ? 2 : otpStep === "sent" ? 1 : 0;

  useEffect(() => {
    if (otpStep === "sent") { setCountdown(60); setTimeout(() => refs.current[0]?.focus(), 80); }
  }, [otpStep]);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(() => {
    if (otpStep === "verified") {
      const t = setTimeout(() => dispatch(closeAuthModal()), 1400);
      return () => clearTimeout(t);
    }
  }, [otpStep, dispatch]);

  const handleSend = async () => {
    if (!email || !email.includes("@")) { setEmailErr("Enter a valid Gmail address"); return; }
    if (!email.endsWith("@gmail.com")) { setEmailErr("Only Gmail addresses are supported"); return; }
    setEmailErr(""); setSending(true);
    try {
      await apiFetch("/auth/request-otp", { method: "POST", body: JSON.stringify({ email }) });
      dispatch(setOtpSent(email));
      toast.success(`OTP sent to ${email}`);
    } catch (err) {
      setEmailErr(err.message || "Couldn't send the code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
    if (next.every(Boolean) && next.join("").length === 6) {
      setTimeout(() => autoVerify(next.join("")), 200);
    }
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      autoVerify(pasted);
    }
  };

  const [otpErr, setOtpErr] = useState("");

  const autoVerify = async (code) => {
    setVerifying(true);
    setOtpErr("");
    try {
      const res = await apiFetch("/auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ email: otpEmail || email, otp: code }),
      });
      dispatch(setCredentials({
        access: res.data.accessToken,
        user: {
          full_name: res.data.user.name,
          email: res.data.user.email,
          role: "customer",
        },
      }));
      toast.success(res.data.isNewUser ? "Account created!" : "Welcome back!");
    } catch (err) {
      setOtpErr(err.message || "Incorrect code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    try {
      await apiFetch("/auth/resend-otp", { method: "POST", body: JSON.stringify({ email: otpEmail || email }) });
      setOtp(["", "", "", "", "", ""]);
      setCountdown(60);
      toast.success("New OTP sent!");
    } catch (err) {
      toast.error(err.message || "Couldn't resend the code.");
    }
  };

  const handleClose = () => { dispatch(closeAuthModal()); dispatch(setOtpIdle()); setEmail(""); setOtp(["","","","","",""]); };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: "spring", duration: 0.4, bounce: 0.18 }}
            className="fixed inset-0 flex items-center justify-center z-[101] px-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="bg-navy-950 px-6 pt-6 pb-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 bottom-0 opacity-40"
                  style={{ backgroundImage: "radial-gradient(circle at 70% 50%, rgba(249,115,22,0.25), transparent 60%)" }} />
                <button onClick={handleClose}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-all z-10">
                  <X size={14} />
                </button>
                <div className="relative z-10">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center shadow-orange">
                      <span className="text-white font-black text-sm">S</span>
                    </div>
                    <span className="text-white font-black text-base">Styron TSM</span>
                  </div>
                  <h2 className="text-white font-bold text-xl leading-tight">
                    {step === 2 ? "You're in! 🎉" : "Sign in to your account"}
                  </h2>
                  <p className="text-steel-400 text-sm mt-1">No password. Just Gmail + a one-time code.</p>

                  {/* Step indicators */}
                  <div className="flex items-center gap-2 mt-5">
                    {["Email", "Verify OTP", "Done"].map((lbl, i) => (
                      <div key={lbl} className="flex items-center gap-1.5">
                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all",
                          i < step ? "bg-green-500 text-white" : i === step ? "bg-orange-500 text-white" : "bg-white/10 text-white/40")}>
                          {i < step ? "✓" : i + 1}
                        </div>
                        <span className={cn("text-xs font-medium hidden sm:inline", i <= step ? "text-white" : "text-white/40")}>{lbl}</span>
                        {i < 2 && <div className={cn("w-6 h-px", i < step ? "bg-green-500" : "bg-white/20")} />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-6">
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div key="email" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                      <label className="form-label">Gmail address</label>
                      <div className="relative mb-1">
                        <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400 pointer-events-none" />
                        <input
                          type="email" value={email} onChange={e => { setEmail(e.target.value); setEmailErr(""); }}
                          onKeyDown={e => e.key === "Enter" && handleSend()}
                          placeholder="yourname@gmail.com"
                          className={cn("form-input pl-10", emailErr && "border-red-400 focus:ring-red-400")}
                          autoFocus autoComplete="email"
                        />
                      </div>
                      {emailErr && <p className="form-error">{emailErr}</p>}
                      <p className="text-xs text-steel-400 mt-2 mb-4">Works with Google/Gmail accounts only.</p>
                      <button onClick={handleSend} disabled={sending}
                        className="btn-orange w-full justify-center py-3 text-sm">
                        {sending ? <><Loader2 size={15} className="animate-spin" /> Sending OTP…</> : "Send OTP →"}
                      </button>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div key="otp" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>
                      <div className="flex items-center gap-2.5 mb-4 p-3 bg-green-50 rounded-xl border border-green-200">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <Mail size={14} className="text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-navy-950">Code sent to</p>
                          <p className="text-xs text-steel-600 truncate">{otpEmail || email}</p>
                        </div>
                        <button onClick={() => { dispatch(setOtpIdle()); setOtp(["","","","","",""]); }}
                          className="text-xs text-orange-500 hover:underline flex-shrink-0 font-medium">Change</button>
                      </div>
                      <label className="form-label">Enter 6-digit OTP</label>
                      <div className="flex gap-2 mt-2" onPaste={handlePaste}>
                        {otp.map((d, i) => (
                          <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric"
                            maxLength={1} value={d}
                            onChange={e => handleOtpChange(i, e.target.value)}
                            onKeyDown={e => handleKeyDown(i, e)}
                            className="otp-input flex-1"
                            disabled={verifying}
                          />
                        ))}
                      </div>
                      {verifying && (
                        <div className="flex items-center gap-2 mt-3 text-sm text-steel-500">
                          <Loader2 size={13} className="animate-spin" /> Verifying…
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-steel-50 rounded-lg">
                          <Shield size={12} className="text-steel-400" />
                          <p className="text-xs text-steel-500">5 attempts · 10 min expiry</p>
                        </div>
                        {countdown > 0 ? (
                          <span className="text-xs text-steel-400 tabular-nums">Resend in {countdown}s</span>
                        ) : (
                          <button onClick={handleResend}
                            className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-600 font-semibold">
                            <RefreshCw size={11} /> Resend OTP
                          </button>
                        )}
                      </div>
                      {otpErr && <p className="form-error text-center mt-3">{otpErr}</p>}
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      className="flex flex-col items-center py-4 text-center gap-3">
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.1 }}
                        className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={32} className="text-green-500" />
                      </motion.div>
                      <div>
                        <h3 className="text-lg font-bold text-navy-950">Verified!</h3>
                        <p className="text-sm text-steel-500 mt-1">Welcome to Styron TSM</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
