// Cart.jsx
import { useSelector, useDispatch } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Tag, X } from "lucide-react";
import { selectCartItems, selectCartSubtotal, selectCoupon, removeItem, updateQty, applyCoupon, clearCoupon } from "../../store";
import { fmt, calcGST, PRODUCT_EMOJI, PRODUCT_BG, cn } from "../../utils";
import { useState } from "react";
import toast from "react-hot-toast";

const COUPONS = { STEEL10: { type: "pct", val: 10, label: "10% off" }, FIRST500: { type: "fixed", val: 500, label: "₹500 off" } };

export default function Cart() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector(selectCartItems);
  const subtotal = useSelector(selectCartSubtotal);
  const coupon = useSelector(selectCoupon);
  const [couponInput, setCouponInput] = useState("");

  const discount = coupon ? (coupon.type === "pct" ? subtotal * coupon.val / 100 : coupon.val) : 0;
  const { gst, total } = calcGST(subtotal - discount);

  const handleCoupon = () => {
    const c = COUPONS[couponInput.toUpperCase()];
    if (c) { dispatch(applyCoupon({ code: couponInput.toUpperCase(), ...c })); toast.success(`Coupon applied — ${c.label}!`); setCouponInput(""); }
    else toast.error("Invalid coupon code");
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-black text-navy-950 mb-6 tracking-tight">Shopping Cart</h1>
      {items.length === 0 ? (
        <div className="card p-20 text-center">
          <ShoppingCart size={48} className="text-steel-300 mx-auto mb-4" />
          <h2 className="font-bold text-navy-950 text-xl mb-2">Your cart is empty</h2>
          <p className="text-steel-500 mb-6">Add steel products to get started</p>
          <Link to="/products" className="btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-6 py-4 border-b border-steel-100 flex items-center justify-between">
              <h2 className="font-bold text-navy-950">{items.length} item{items.length !== 1 ? "s" : ""}</h2>
              <span className="text-sm text-steel-500">{items.reduce((s, i) => s + i.qty, 0)} units total</span>
            </div>
            {items.map(({ productId: id, product: p, qty }) => (
              <div key={id} className="flex gap-4 px-6 py-5 border-b border-steel-100 last:border-0">
                <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0", PRODUCT_BG[p.category])}>{PRODUCT_EMOJI[p.category]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/products/${p.slug}`} className="font-bold text-navy-950 text-sm hover:text-orange-500 transition-colors">{p.name}</Link>
                      <p className="text-xs text-steel-500 mt-0.5">{p.grade} · {p.size} · SKU: {p.sku}</p>
                    </div>
                    <button onClick={() => dispatch(removeItem(id))} className="text-steel-400 hover:text-red-500 transition-colors p-1"><Trash2 size={15} /></button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-steel-200 rounded-xl overflow-hidden">
                      <button onClick={() => { if (qty <= 1) dispatch(removeItem(id)); else dispatch(updateQty({ id, qty: qty - 1 })); }} className="w-9 h-9 flex items-center justify-center text-steel-500 hover:bg-steel-100 font-bold">−</button>
                      <span className="w-10 text-center font-bold text-navy-950 text-sm">{qty}</span>
                      <button onClick={() => dispatch(updateQty({ id, qty: qty + 1 }))} className="w-9 h-9 flex items-center justify-center text-steel-500 hover:bg-steel-100 font-bold">+</button>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-navy-950">{fmt(p.price * qty)}</p>
                      <p className="text-xs text-steel-400">+GST: {fmt(p.price * qty * 1.18)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="card p-5 sticky top-36">
            <h3 className="font-bold text-navy-950 mb-4 pb-3 border-b border-steel-100">Order Summary</h3>
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
                <span className="text-xs font-bold text-green-700 flex items-center gap-1.5"><Tag size={11}/> {coupon.code} — {coupon.label}</span>
                <button onClick={() => dispatch(clearCoupon())} className="text-red-500 text-xs hover:text-red-700"><X size={12}/></button>
              </div>
            ) : (
              <div className="flex gap-2 mb-3">
                <input value={couponInput} onChange={e => setCouponInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCoupon()} placeholder="STEEL10, FIRST500" className="form-input text-xs py-2 flex-1"/>
                <button onClick={handleCoupon} className="btn-primary py-2 px-3 text-xs">Apply</button>
              </div>
            )}
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between text-steel-600"><span>Subtotal</span><span className="font-medium">{fmt(subtotal)}</span></div>
              {discount > 0 && <div className="flex justify-between text-green-600 font-semibold"><span>Discount</span><span>− {fmt(discount)}</span></div>}
              <div className="flex justify-between text-steel-600"><span>GST (18%)</span><span className="font-medium">{fmt(gst)}</span></div>
              <div className="flex justify-between text-steel-600"><span>Shipping</span><span className="text-green-600 font-semibold">FREE</span></div>
              <div className="flex justify-between font-black text-navy-950 text-base pt-3 border-t border-steel-200"><span>Total (incl. GST)</span><span>{fmt(total)}</span></div>
            </div>
            <button onClick={() => navigate("/checkout")} className="btn-orange w-full justify-center mt-4 py-3">Checkout <ArrowRight size={15}/></button>
            <p className="text-center text-xs text-steel-400 mt-2">🔒 Secured by Razorpay</p>
          </div>
        </div>
      )}
    </div>
  );
}
