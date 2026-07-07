// OrderSuccess.jsx
import { useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Package, FileText, ArrowRight, Truck } from "lucide-react";
import { fmt } from "../../utils";

export function OrderSuccess() {
  const { state } = useLocation();
  const orderNum = state?.orderNum || "STY-20250115-A3F9K2";
  const total = state?.total || 0;
  const email = state?.email || "customer@gmail.com";

  const STEPS = ["Order Confirmed", "Manufacturing", "Packed", "Shipped", "Delivered"];

  return (
    <div className="container py-16 max-w-2xl">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center mb-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 size={38} className="text-green-500" />
        </motion.div>
        <h1 className="text-3xl font-black text-navy-950 tracking-tight mb-2">Order Confirmed! 🎉</h1>
        <p className="text-steel-500">GST invoice and order confirmation emailed to <strong className="text-navy-950">{email}</strong></p>
      </motion.div>

      {/* Progress */}
      <div className="card p-5 mb-5">
        <h3 className="font-bold text-navy-950 text-sm mb-4">Order Progress</h3>
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${i === 0 ? "bg-green-500 text-white" : "bg-steel-200 text-steel-400"}`}>
                  {i === 0 ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] mt-1 font-medium text-center leading-tight ${i === 0 ? "text-green-600" : "text-steel-400"}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-0.5 mb-4 mx-0.5 bg-steel-200" />}
            </div>
          ))}
        </div>
      </div>

      {/* Details */}
      <div className="card p-5 mb-5">
        <h3 className="font-bold text-navy-950 mb-4 pb-3 border-b border-steel-100">Order Details</h3>
        <div className="space-y-3 text-sm">
          {[
            { label: "Order Number", value: orderNum, highlight: true },
            { label: "Amount Paid", value: fmt(total) },
            { label: "Estimated Delivery", value: "3–5 Business Days" },
            { label: "Delivery Address", value: "Rajesh Kumar, Plot 12, Andheri East, Mumbai 400069" },
            { label: "Payment Method", value: "UPI (razorpay secured)" },
          ].map(({ label, value, highlight }) => (
            <div key={label} className="flex justify-between items-start gap-4">
              <span className="text-steel-500">{label}</span>
              <span className={`font-semibold text-right ${highlight ? "text-orange-500" : "text-navy-950"}`}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Link to="/track" className="card p-4 text-center hover:shadow-card-hover transition-shadow group cursor-pointer">
          <Truck size={22} className="text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-navy-950 text-sm">Track Order</p>
        </Link>
        <div className="card p-4 text-center hover:shadow-card-hover transition-shadow cursor-pointer group" onClick={() => alert("Invoice PDF downloading…")}>
          <FileText size={22} className="text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-navy-950 text-sm">Download Invoice</p>
        </div>
        <Link to="/products" className="card p-4 text-center hover:shadow-card-hover transition-shadow group">
          <Package size={22} className="text-orange-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-semibold text-navy-950 text-sm">Continue Shopping</p>
        </Link>
      </div>

      <Link to="/account/orders" className="btn-primary w-full justify-center py-3">
        View All Orders <ArrowRight size={15} />
      </Link>
    </div>
  );
}

export default OrderSuccess;
