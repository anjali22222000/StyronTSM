import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs) => twMerge(clsx(inputs));

export const fmt = (n, dec = 0) =>
  "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const fmtNum = (n) => Number(n).toLocaleString("en-IN");

export const calcGST = (amount, rate = 18) => {
  const gst = (amount * rate) / 100;
  return { taxable: amount, gst, cgst: gst / 2, sgst: gst / 2, total: amount + gst };
};

export const genOrderNum = () =>
  "STY-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

export const genQuotNum = () =>
  "QT-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase();

export const BADGE_COLOR = {
  bestseller: "bg-red-100 text-red-700",
  new: "bg-green-100 text-green-700",
  "new-grade": "bg-green-100 text-green-700",
  "in-demand": "bg-blue-100 text-blue-700",
  sale: "bg-yellow-100 text-yellow-800",
  popular: "bg-purple-100 text-purple-700",
  "low-stock": "bg-red-100 text-red-700",
};

export const STATUS_CONFIG = {
  pending:        { label: "Pending",          cls: "status-pending",       dot: "bg-yellow-400" },
  confirmed:      { label: "Confirmed",         cls: "status-confirmed",     dot: "bg-blue-400" },
  manufacturing:  { label: "Manufacturing",     cls: "status-manufacturing", dot: "bg-purple-400" },
  packed:         { label: "Packed",            cls: "status-packed",        dot: "bg-indigo-400" },
  shipped:        { label: "Shipped",           cls: "status-shipped",       dot: "bg-cyan-400" },
  out_for_delivery:{ label: "Out for Delivery", cls: "status-shipped",       dot: "bg-cyan-400" },
  delivered:      { label: "Delivered",         cls: "status-delivered",     dot: "bg-green-400" },
  cancelled:      { label: "Cancelled",         cls: "status-cancelled",     dot: "bg-red-400" },
  sent:           { label: "Sent",              cls: "badge-blue",           dot: "bg-blue-400" },
  accepted:       { label: "Accepted",          cls: "badge-green",          dot: "bg-green-400" },
};

export const PRODUCT_EMOJI = { tmt: "🔩", structural: "📐", wire: "🕸️", pipes: "🔵" };
export const PRODUCT_BG = {
  tmt: "bg-blue-50",
  structural: "bg-purple-50",
  wire: "bg-green-50",
  pipes: "bg-orange-50",
};

export const INR_WORDS = (n) => {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + " Cr";
  if (n >= 100000)   return (n / 100000).toFixed(1) + "L";
  if (n >= 1000)     return (n / 1000).toFixed(1) + "K";
  return String(n);
};
