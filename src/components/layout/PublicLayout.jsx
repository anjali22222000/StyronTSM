import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  LayoutDashboard, Package, FileText, Receipt, User,
  Boxes, Users, LogOut, Menu, X, TrendingUp, Star, CreditCard, Mail,
} from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "./Navbar";
import { Footer } from "./Footer";
import { logout, selectUser, adminLogout, selectAdmin } from "../../store";
import { ADMIN_BASE_PATH } from "../../config/adminRoutes";
import toast from "react-hot-toast";

export default function PublicLayout() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pt-[56px] md:pt-[92px] page-enter">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

const ADMIN_NAV = [
  { to: ADMIN_BASE_PATH, label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: `${ADMIN_BASE_PATH}/products`, label: "Products", icon: Boxes },
  { to: `${ADMIN_BASE_PATH}/orders`, label: "Orders", icon: Package },
  { to: `${ADMIN_BASE_PATH}/quotations`, label: "Quotations", icon: FileText },
  { to: `${ADMIN_BASE_PATH}/payments`, label: "Payments", icon: CreditCard },
  { to: `${ADMIN_BASE_PATH}/users`, label: "Users", icon: Users },
  { to: `${ADMIN_BASE_PATH}/steel-prices`, label: "Steel Prices", icon: TrendingUp },
  { to: `${ADMIN_BASE_PATH}/featured-products`, label: "Featured Products", icon: Star },
  { to: `${ADMIN_BASE_PATH}/email-templates`, label: "Email Templates", icon: Mail },
  { to: `${ADMIN_BASE_PATH}/contacts`, label: "Contacts", icon: FileText },
];

const CUSTOMER_NAV = [
  { to: "/account", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/account/orders", label: "My Orders", icon: Package },
  { to: "/account/invoices", label: "Invoices", icon: Receipt },
  { to: "/account/profile", label: "Profile", icon: User },
];

export function DashboardLayout({ role = "customer" }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const customerUser = useSelector(selectUser);
  const adminUser = useSelector(selectAdmin);
  const user = role === "admin" ? (adminUser ? { full_name: adminUser.name, email: adminUser.email } : null) : customerUser;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = role === "admin" ? ADMIN_NAV : CUSTOMER_NAV;
  const title = role === "admin" ? "Admin Panel" : "My Account";

  const handleLogout = () => {
    if (role === "admin") {
      dispatch(adminLogout());
      toast.success("Signed out");
      navigate("/");
    } else {
      dispatch(logout());
      toast.success("Signed out");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-steel-50 flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {(sidebarOpen || true) && (
          <aside className={`
            fixed inset-y-0 left-0 z-50 w-56 bg-navy-950 flex flex-col
            transition-transform duration-300 lg:translate-x-0
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          `}>
            {/* Logo */}
            <div className="h-14 flex items-center justify-between px-4 border-b border-white/10">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-xs">S</span>
                </div>
                <span className="text-white font-black text-sm">Styron <span className="text-orange-500">TSM</span></span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-steel-500 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {/* User */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {user?.full_name?.[0]?.toUpperCase() || "U"}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{user?.full_name || "Admin User"}</p>
                  <p className="text-steel-500 text-[11px] truncate">{user?.email || "admin@styrontsm.com"}</p>
                </div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 py-3 px-2 overflow-y-auto">
              <div className="space-y-0.5">
                {navItems.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `sidebar-item ${isActive ? "sidebar-item-active" : ""}`
                    }
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </nav>

            {/* Bottom */}
            <div className="px-2 py-3 border-t border-white/10">
              <Link to="/" className="sidebar-item text-xs mb-1">← Back to site</Link>
              <button onClick={handleLogout} className="sidebar-item text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 w-full">
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-steel-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg text-steel-500 hover:bg-steel-100">
              <Menu size={20} />
            </button>
            <h1 className="text-sm font-bold text-navy-950">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-950 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.full_name?.[0]?.toUpperCase() || "A"}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
