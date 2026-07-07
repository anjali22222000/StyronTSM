import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, X, ShoppingCart, User, ChevronDown, Phone,
  Zap, FileText, Package, LayoutDashboard, LogOut,
  Calculator,
} from "lucide-react";
import {
  selectIsAuth, selectUser, selectCartCount, selectMobileMenuOpen,
  toggleDrawer, openAuthModal, logout, toggleMobileMenu, closeMobileMenu,
} from "../../store";
import SteelPriceTicker from "./SteelPriceTicker";
import toast from "react-hot-toast";

const NAV = [
  { label: "Products",   to: "/products" },
  { label: "Estimator",  to: "/ai-estimator" },
  { label: "Quotation",  to: "/quotation" },
  { label: "Track",      to: "/track" },
  { label: "About",      to: "/about" },
  { label: "Contact",    to: "/contact" },
];

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef(null);

  const isAuth = useSelector(selectIsAuth);
  const user = useSelector(selectUser);
  const cartCount = useSelector(selectCartCount);
  const mobileOpen = useSelector(selectMobileMenuOpen);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  useEffect(() => {
    const h = (e) => { if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    setUserMenuOpen(false);
    toast.success("Signed out");
    navigate("/");
  };

  const initial = user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U";

  return (
    <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? "bg-navy-950/98 backdrop-blur-sm shadow-navy" : "bg-navy-950"}`}>
      {/* Topbar: live steel price ticker */}
      <div className="hidden md:block border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <SteelPriceTicker />
          </div>
          <div className="flex items-center gap-5 pr-4 shrink-0">
            <a href="tel:+911234567890" className="flex items-center gap-1.5 text-xs text-steel-500 hover:text-white transition-colors">
              <Phone size={11} /> +91 12345 67890
            </a>
            <Link to="/track" className="text-xs text-steel-500 hover:text-white transition-colors">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <nav className="container">
        <div className="flex items-center h-14 gap-6">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shadow-orange group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-sm">S</span>
            </div>
            <div className="leading-none">
              <span className="text-white font-black text-base tracking-tight">Styron</span>
              <span className="text-orange-500 font-black text-base"> TSM</span>
            </div>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1">
            {NAV.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `nav-link text-sm ${isActive ? "nav-link-active" : ""}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Cart */}
            <button
              onClick={() => dispatch(toggleDrawer())}
              className="relative w-9 h-9 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-steel-400 hover:text-white transition-all"
              aria-label="Shopping cart"
            >
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {cartCount > 9 ? "9+" : cartCount}
                </motion.span>
              )}
            </button>

            {/* Auth */}
            <div className="hidden lg:flex">
              {isAuth ? (
                <div className="relative" ref={userRef}>
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                  >
                    <div className="w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {initial}
                    </div>
                    <span className="text-sm text-white font-medium max-w-[100px] truncate">
                      {user?.full_name?.split(" ")[0] || "Account"}
                    </span>
                    <ChevronDown size={13} className={`text-steel-400 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-lg border border-steel-200 py-1.5 overflow-hidden z-50"
                      >
                        <div className="px-4 py-2.5 border-b border-steel-100">
                          <p className="text-sm font-semibold text-navy-950 truncate">{user?.full_name || "My Account"}</p>
                          <p className="text-xs text-steel-500 truncate">{user?.email}</p>
                        </div>
                        {[
                          { to: "/account", icon: LayoutDashboard, label: "Dashboard" },
                          { to: "/account/orders", icon: Package, label: "My Orders" },
                          { to: "/account/invoices", icon: FileText, label: "Invoices" },
                        ].map(({ to, icon: Icon, label }) => (
                          <Link key={to} to={to} onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-steel-700 hover:bg-steel-50 hover:text-navy-950 transition-colors">
                            <Icon size={15} className="text-steel-400" /> {label}
                          </Link>
                        ))}
                        <div className="border-t border-steel-100 mt-1 pt-1">
                          <button onClick={handleLogout}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                            <LogOut size={15} /> Sign Out
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={() => dispatch(openAuthModal("account"))}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-xl transition-all shadow-orange active:scale-95"
                >
                  <User size={15} /> Sign In
                </button>
              )}
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => dispatch(toggleMobileMenu())}
              className="lg:hidden w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="lg:hidden overflow-hidden border-t border-white/10 bg-navy-950"
          >
            <div className="container py-3 flex flex-col gap-0.5">
              {NAV.map(({ label, to }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => dispatch(closeMobileMenu())}
                  className={({ isActive }) =>
                    `px-3 py-3 rounded-xl text-sm font-medium transition-colors ${isActive ? "bg-white/10 text-orange-400" : "text-steel-400 hover:text-white hover:bg-white/5"}`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <div className="border-t border-white/10 pt-3 mt-2">
                {isAuth ? (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-white font-medium">{user?.full_name || user?.email}</span>
                    <button onClick={handleLogout} className="text-xs text-red-400">Sign Out</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { dispatch(closeMobileMenu()); dispatch(openAuthModal("account")); }}
                    className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl text-sm"
                  >
                    Sign In / Create Account
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
