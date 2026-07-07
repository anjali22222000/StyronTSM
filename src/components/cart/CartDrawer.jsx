import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingCart, Plus, Minus, Trash2, ArrowRight, Tag } from "lucide-react";
import {
  selectCartItems, selectCartSubtotal, selectCartCount, selectDrawerOpen,
  setDrawer, removeItem, updateQty, applyCoupon, clearCoupon, selectCoupon,
} from "../../store";
import { fmt, calcGST } from "../../utils";
import { useState } from "react";
import toast from "react-hot-toast";

const COUPONS = { STEEL10: { type: "pct", val: 10, label: "10% off" }, FIRST500: { type: "fixed", val: 500, label: "₹500 off" } };

export default function CartDrawer() {
  const dispatch = useDispatch();
  const isOpen = useSelector(selectDrawerOpen);
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const count = useSelector(selectCartCount);
  const coupon = useSelector(selectCoupon);
  const [couponInput, setCouponInput] = useState("");

  const close = () => dispatch(setDrawer(false));

  const discount = coupon
    ? coupon.type === "pct" ? subtotal * (coupon.val / 100) : coupon.val
    : 0;
  const afterDiscount = subtotal - discount;
  const { gst, total } = calcGST(afterDiscount);

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    const found = COUPONS[code];
    if (found) { dispatch(applyCoupon({ code, ...found })); toast.success(`Coupon applied — ${found.label}!`); setCouponInput(""); }
    else toast.error("Invalid coupon code");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90]" onClick={close} />

          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-[390px] bg-white shadow-2xl z-[91] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-steel-200 bg-navy-950">
              <div className="flex items-center gap-2.5">
                <ShoppingCart size={18} className="text-orange-400" />
                <span className="font-bold text-white text-base">Cart ({count})</span>
              </div>
              <button onClick={close} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
                  <div className="w-20 h-20 bg-steel-100 rounded-2xl flex items-center justify-center">
                    <ShoppingCart size={32} className="text-steel-300" />
                  </div>
                  <div>
                    <p className="font-bold text-navy-950 text-lg">Your cart is empty</p>
                    <p className="text-steel-500 text-sm mt-1">Add steel products to get started</p>
                  </div>
                  <Link to="/products" onClick={close} className="btn-primary mt-2">Browse Products</Link>
                </div>
              ) : (
                <div className="divide-y divide-steel-100">
                  {items.map(({ productId, product: p, qty }) => (
                    <div key={productId} className="px-5 py-4 flex gap-3">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                        p.category === "tmt" ? "bg-blue-50" : p.category === "structural" ? "bg-purple-50" : p.category === "wire" ? "bg-green-50" : "bg-orange-50"
                      }`}>
                        {p.category === "tmt" ? "🔩" : p.category === "structural" ? "📐" : p.category === "wire" ? "🕸️" : "🔵"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-navy-950 text-sm leading-snug truncate">{p.name}</p>
                        <p className="text-xs text-steel-500 mt-0.5">{p.grade} · {fmt(p.price)}/{p.unit}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center border border-steel-200 rounded-lg overflow-hidden">
                            <button onClick={() => { if (qty <= 1) dispatch(removeItem(productId)); else dispatch(updateQty({ id: productId, qty: qty - 1 })); }}
                              className="w-7 h-7 flex items-center justify-center text-steel-500 hover:bg-steel-100 transition-colors">
                              {qty <= 1 ? <Trash2 size={12} className="text-red-400" /> : <Minus size={12} />}
                            </button>
                            <span className="w-8 text-center text-sm font-bold text-navy-950">{qty}</span>
                            <button onClick={() => dispatch(updateQty({ id: productId, qty: qty + 1 }))}
                              className="w-7 h-7 flex items-center justify-center text-steel-500 hover:bg-steel-100 transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="font-bold text-navy-950 text-sm">{fmt(p.price * qty)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-steel-200 bg-steel-50">
                {/* Coupon */}
                <div className="px-5 py-3 border-b border-steel-200">
                  {coupon ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-green-600" />
                        <span className="text-xs font-bold text-green-700">{coupon.code} — {coupon.label} applied</span>
                      </div>
                      <button onClick={() => dispatch(clearCoupon())} className="text-red-500 hover:text-red-700 text-xs font-semibold">Remove</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={couponInput} onChange={e => setCouponInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleApplyCoupon()}
                        placeholder="Coupon code (STEEL10, FIRST500)"
                        className="form-input text-xs py-2 flex-1" />
                      <button onClick={handleApplyCoupon} className="px-3 py-2 bg-navy-950 text-white text-xs font-bold rounded-xl hover:bg-navy-800 transition-colors">Apply</button>
                    </div>
                  )}
                </div>

                {/* Totals */}
                <div className="px-5 py-4 space-y-2">
                  <div className="flex justify-between text-sm text-steel-600"><span>Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-sm text-green-600 font-semibold"><span>Discount ({coupon?.code})</span><span>− {fmt(discount)}</span></div>}
                  <div className="flex justify-between text-sm text-steel-600"><span>GST (18%)</span><span className="font-medium">{fmt(gst)}</span></div>
                  <div className="flex justify-between text-sm text-steel-600"><span>Shipping</span><span className="text-green-600 font-semibold">FREE</span></div>
                  <div className="flex justify-between font-bold text-navy-950 text-base pt-2 border-t border-steel-200">
                    <span>Total (incl. GST)</span><span>{fmt(total)}</span>
                  </div>
                </div>

                <div className="px-5 pb-5 space-y-2">
                  <Link to="/checkout" onClick={close}
                    className="flex items-center justify-center gap-2 w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-all shadow-orange text-sm">
                    Proceed to Checkout <ArrowRight size={16} />
                  </Link>
                  <Link to="/cart" onClick={close}
                    className="block text-center text-sm text-steel-500 hover:text-navy-950 py-1 transition-colors">
                    View full cart →
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
