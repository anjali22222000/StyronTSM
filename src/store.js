import { configureStore, createSlice } from "@reduxjs/toolkit";

// ── Auth slice ──────────────────────────────────────────────────────────────
const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    otpStep: "idle", // idle | sent | verified
    otpEmail: null,
  },
  reducers: {
    setCredentials(state, { payload }) {
      state.user = payload.user;
      state.accessToken = payload.access || null;
      state.isAuthenticated = true;
      state.otpStep = "verified";
      try {
        if (payload.access) localStorage.setItem("styron_access_token", payload.access);
      } catch { /* storage unavailable — non-critical */ }
    },
    setOtpSent(state, { payload }) {
      state.otpStep = "sent";
      state.otpEmail = payload;
    },
    setOtpIdle(state) { state.otpStep = "idle"; },
    logout(state) {
      state.user = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      state.otpStep = "idle";
      state.otpEmail = null;
      try { localStorage.removeItem("styron_access_token"); } catch { /* non-critical */ }
    },
  },
});

// ── Cart slice ──────────────────────────────────────────────────────────────
const loadCart = () => {
  try { return JSON.parse(localStorage.getItem("styron_cart") || "[]"); }
  catch { return []; }
};
const saveCart = (items) => localStorage.setItem("styron_cart", JSON.stringify(items));

const cartSlice = createSlice({
  name: "cart",
  initialState: { items: loadCart(), coupon: null, drawerOpen: false },
  reducers: {
    addItem(state, { payload: { product, quantity = 1 } }) {
      const ex = state.items.find(i => i.productId === product.id);
      if (ex) ex.qty += quantity;
      else state.items.push({ productId: product.id, product, qty: quantity });
      saveCart(state.items);
    },
    removeItem(state, { payload: id }) {
      state.items = state.items.filter(i => i.productId !== id);
      saveCart(state.items);
    },
    updateQty(state, { payload: { id, qty } }) {
      const item = state.items.find(i => i.productId === id);
      if (item) { item.qty = Math.max(1, qty); saveCart(state.items); }
    },
    applyCoupon(state, { payload }) { state.coupon = payload; },
    clearCoupon(state) { state.coupon = null; },
    clearCart(state) { state.items = []; state.coupon = null; saveCart([]); },
    toggleDrawer(state) { state.drawerOpen = !state.drawerOpen; },
    setDrawer(state, { payload }) { state.drawerOpen = payload; },
  },
});

// ── Admin auth slice ────────────────────────────────────────────────────────
// Deliberately separate from the customer `auth` slice — admin sessions use a
// different token, different cookie path, and a different login flow (2FA).
const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState: {
    admin: null,
    accessToken: null,
    isAuthenticated: false,
  },
  reducers: {
    setAdminCredentials(state, { payload }) {
      state.admin = payload.admin;
      state.accessToken = payload.access;
      state.isAuthenticated = true;
      try {
        if (payload.access) localStorage.setItem("styron_admin_access_token", payload.access);
      } catch { /* storage unavailable — non-critical */ }
    },
    adminLogout(state) {
      state.admin = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      try { localStorage.removeItem("styron_admin_access_token"); } catch { /* non-critical */ }
    },
  },
});
export const { setAdminCredentials, adminLogout } = adminAuthSlice.actions;
export const selectAdmin = s => s.adminAuth.admin;
export const selectIsAdminAuth = s => s.adminAuth.isAuthenticated;

// ── UI slice ────────────────────────────────────────────────────────────────
const uiSlice = createSlice({
  name: "ui",
  initialState: { authModalOpen: false, authContext: null, mobileMenuOpen: false },
  reducers: {
    openAuthModal(state, { payload }) { state.authModalOpen = true; state.authContext = payload || null; },
    closeAuthModal(state) { state.authModalOpen = false; state.authContext = null; },
    toggleMobileMenu(state) { state.mobileMenuOpen = !state.mobileMenuOpen; },
    closeMobileMenu(state) { state.mobileMenuOpen = false; },
  },
});

export const { setCredentials, setOtpSent, setOtpIdle, logout } = authSlice.actions;
export const { addItem, removeItem, updateQty, applyCoupon, clearCoupon, clearCart, toggleDrawer, setDrawer } = cartSlice.actions;
export const { openAuthModal, closeAuthModal, toggleMobileMenu, closeMobileMenu } = uiSlice.actions;

// Selectors
export const selectUser = s => s.auth.user;
export const selectAccessToken = s => s.auth.accessToken;
export const selectIsAuth = s => s.auth.isAuthenticated;
export const selectOtpStep = s => s.auth.otpStep;
export const selectOtpEmail = s => s.auth.otpEmail;
export const selectCartItems = s => s.cart.items;
export const selectCartCount = s => s.cart.items.reduce((a, i) => a + i.qty, 0);
export const selectCartSubtotal = s => s.cart.items.reduce((a, i) => a + i.product.price * i.qty, 0);
export const selectCoupon = s => s.cart.coupon;
export const selectDrawerOpen = s => s.cart.drawerOpen;
export const selectAuthModalOpen = s => s.ui.authModalOpen;
export const selectAuthContext = s => s.ui.authContext;
export const selectMobileMenuOpen = s => s.ui.mobileMenuOpen;

export const store = configureStore({
  reducer: { auth: authSlice.reducer, adminAuth: adminAuthSlice.reducer, cart: cartSlice.reducer, ui: uiSlice.reducer },
});
