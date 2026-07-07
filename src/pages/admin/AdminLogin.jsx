import { useState, useRef } from "react";
import { useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Mail, Lock, Loader2, ShieldAlert } from "lucide-react";
import { setAdminCredentials } from "../../store";
import { adminApiFetch } from "../../lib/adminApiClient";
import { cn } from "../../utils";
import toast from "react-hot-toast";

/**
 * Full-page admin login, rendered only when visiting the secret admin route
 * while unauthenticated (see AdminRouteGuard). Not linked anywhere in the
 * public UI. Two steps: password, then email OTP (2FA).
 */
export default function AdminLogin() {
  const dispatch = useDispatch();
  const [step, setStep] = useState("password"); // password | otp
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [adminId, setAdminId] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef([]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await adminApiFetch("/admin-auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setAdminId(res.data.adminId);
      setStep("otp");
      toast.success("Code sent to your email.");
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (i, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    if (next.every(Boolean)) verifyOtp(next.join(""));
  };

  const handleOtpKey = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const verifyOtp = async (code) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminApiFetch("/admin-auth/verify-otp", {
        method: "POST",
        body: JSON.stringify({ adminId, otp: code }),
      });
      dispatch(setAdminCredentials({ access: res.data.accessToken, admin: res.data.admin }));
      toast.success(`Welcome back, ${res.data.admin.name}.`);
    } catch (err) {
      setError(err.message || "Incorrect code.");
      setOtp(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await adminApiFetch("/admin-auth/resend-otp", { method: "POST", body: JSON.stringify({ adminId }) });
      setOtp(["", "", "", "", "", ""]);
      toast.success("New code sent.");
    } catch (err) {
      toast.error(err.message || "Couldn't resend the code.");
    }
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mb-3">
            <ShieldCheck size={26} className="text-white" />
          </div>
          <h1 className="text-white text-xl font-black tracking-tight">Styron TSM</h1>
          <p className="text-steel-400 text-sm">Restricted access</p>
        </div>

        <div className="card p-6 bg-white">
          <AnimatePresence mode="wait">
            {step === "password" ? (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                onSubmit={handlePasswordSubmit}
              >
                <h2 className="font-bold text-navy-950 text-lg mb-1 flex items-center gap-2">
                  <Lock size={18} className="text-orange-500" /> Admin Sign In
                </h2>
                <p className="text-steel-500 text-sm mb-5">Authorized personnel only.</p>

                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input mt-1 mb-3"
                  required
                />
                <label className="form-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input mt-1"
                  required
                />
                {error && <p className="form-error mt-2">{error}</p>}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-4">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : "Continue →"}
                </button>
              </motion.form>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                <h2 className="font-bold text-navy-950 text-lg mb-1 flex items-center gap-2">
                  <Mail size={18} className="text-orange-500" /> Verify It's You
                </h2>
                <p className="text-steel-500 text-sm mb-5">Enter the 6-digit code emailed to you.</p>

                <div className="flex gap-2.5 mb-3">
                  {otp.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKey(i, e)}
                      className="otp-input flex-1"
                      disabled={loading}
                    />
                  ))}
                </div>
                {loading && (
                  <div className="flex items-center gap-2 text-sm text-steel-500 mb-2">
                    <Loader2 size={13} className="animate-spin" /> Verifying…
                  </div>
                )}
                {error && <p className="form-error mb-2">{error}</p>}
                <button onClick={handleResend} type="button" className="text-xs text-orange-500 font-semibold hover:underline">
                  Resend code
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-steel-500 text-xs text-center mt-5 flex items-center justify-center gap-1.5">
          <ShieldAlert size={12} /> Unauthorized access attempts are logged.
        </p>
      </motion.div>
    </div>
  );
}
