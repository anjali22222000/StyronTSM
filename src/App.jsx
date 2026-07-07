import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import PublicLayout from "./components/layout/PublicLayout";
import { DashboardLayout } from "./components/layout/PublicLayout";
import AuthModal from "./components/auth/AuthModal";
import CartDrawer from "./components/cart/CartDrawer";
import WhatsAppButton from "./components/support/WhatsAppButton";
import ChatbotWidget from "./components/support/ChatbotWidget";

// Pages
import Home from "./pages/public/Home";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import Cart from "./pages/public/Cart";
import Checkout from "./pages/public/Checkout";
import OrderSuccess from "./pages/public/OrderSuccess";
import TrackOrder from "./pages/public/TrackOrder";
import AIEstimator from "./pages/public/AIEstimator";
import Quotation from "./pages/public/Quotation";
import About from "./pages/public/About";
import Contact from "./pages/public/Contact";
import NotFound from "./pages/public/NotFound";

// Dashboards
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminContacts from "./pages/admin/AdminContacts";
import AdminQuotations from "./pages/admin/AdminQuotations";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSteelPrices from "./pages/admin/AdminSteelPrices";
import AdminFeaturedProducts from "./pages/admin/AdminFeaturedProducts";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import AdminRouteGuard from "./components/admin/AdminRouteGuard";
import { ADMIN_BASE_PATH } from "./config/adminRoutes";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerOrders from "./pages/customer/Orders";
import CustomerInvoices from "./pages/customer/Invoices";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <AuthModal />
      <CartDrawer />
      <WhatsAppButton />
      <ChatbotWidget />

      <Routes>
        {/* Public */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/track" element={<TrackOrder />} />
          <Route path="/ai-estimator" element={<AIEstimator />} />
          <Route path="/quotation" element={<Quotation />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Admin */}
        <Route path={ADMIN_BASE_PATH} element={<AdminRouteGuard />}>
          <Route element={<DashboardLayout role="admin" />}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="quotations" element={<AdminQuotations />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="steel-prices" element={<AdminSteelPrices />} />
            <Route
              path="featured-products"
              element={<AdminFeaturedProducts />}
            />
            <Route
              path="email-templates"
              element={<AdminEmailTemplates />}
            />
            <Route path="contacts" element={<AdminContacts />} />
          </Route>
        </Route>

        {/* Customer */}
        <Route path="/account" element={<DashboardLayout role="customer" />}>
          <Route index element={<CustomerDashboard />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="invoices" element={<CustomerInvoices />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}