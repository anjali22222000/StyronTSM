# Styron TSM Backend — Phase 1 (Auth Foundation)

This is an **addition**, not a replacement: it lives in `backend/` next to your
existing `styron-demo` frontend and doesn't touch any existing frontend file.

## What's included

### Phase 1 — Auth foundation
- User registration with real email OTP, login, JWT access/refresh tokens
- Admin login with 2FA (password + email OTP), account lockout

### Phase 2 — Catalog, Orders, Contacts, Notifications (NEW)
- **Products**: public browse/search/filter by category, admin CRUD with multi-image upload to Cloudinary, stock tracking, draft/active/archived status
- **Categories**: admin create, public list
- **Orders**: guest or logged-in checkout, server-side price re-validation (never trusts client-submitted prices), stock decrement, full status timeline (`placed → processing → manufacturing → quality_check → dispatched → delivered`), public tracking by order number + email/phone (no login required), admin status updates that email the customer automatically
- **Contact form**: public submission, admin inbox with search/filter, reply-by-email, delete
- **Notifications**: admin gets pinged on new registrations, new orders, new contact inquiries; users get pinged on order status changes; both have read/unread + mark-all-read

### Phase 3 — AI Chatbot + WhatsApp (NEW)
- **WhatsApp**: floating button, every page, opens `wa.me` with a pre-filled message
- **Chatbot**: floating widget (bubble + panel), typing animation, persisted history (localStorage + DB),
  calls the **Anthropic API** (`claude-sonnet-4-6`) grounded in a knowledge base built from:
  company info, policies, FAQs (static, in `src/data/knowledgeBase.js`), and **live product data**
  pulled from MySQL via keyword retrieval (so prices/stock are never stale or hallucinated)
- Escalation detection (frustration / "talk to a human" phrasing) auto-notifies admins
- Full conversation logging (`chatbot_sessions`, `chatbot_logs`) + an admin analytics endpoint

## What's NOT in this phase yet
Frontend wiring of the auth/products/orders APIs (login, registration, checkout, tracking pages still
use local/mock state), hidden admin portal routing, and full admin dashboards for users/products/orders/contacts.

## Setup

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   - `DB_*` — your local/remote MySQL credentials
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — generate with:
     `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `GMAIL_USER` — the Gmail address that will send OTP emails
   - `GMAIL_APP_PASSWORD` — **not your Gmail password.** Generate one at
     https://myaccount.google.com/apppasswords (requires 2-Step Verification
     enabled on that Google account)
   - `CLOUDINARY_*` — from your Cloudinary dashboard (free tier is fine):
     https://console.cloudinary.com/console

3. **Create the database tables**
   ```bash
   npm run migrate
   ```
   This runs every `.sql` file in `migrations/` **in order**, including
   `004_product_rich_fields.sql` (requires MySQL 8.0.29+ / MariaDB with
   `ADD COLUMN IF NOT EXISTS` support — run the `ALTER TABLE` statements
   manually if your MySQL is older). Safe to re-run on an existing database.

4. **Create your first admin account** (there's no signup UI for admins by design)
   ```bash
   node src/db/seedAdmin.js
   ```
   Uses `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` from `.env`.
   Change the password after first login.

5. **Seed the product catalog** (bridges the frontend's mock catalog into MySQL
   with matching IDs, so checkout works immediately)
   ```bash
   node src/db/seedProducts.js
   ```

6. **Run the server**
   ```bash
   npm run dev      # with auto-reload
   # or
   npm start
   ```
   You should see `✅ MySQL connected.` and `✅ Gmail SMTP connected.`
   Health check: `GET http://localhost:5000/api/health`

### Phase 4 — Passwordless auth wired end-to-end (NEW)
The auth design changed from the original spec: your existing `AuthModal.jsx` is
**email + OTP only, no password field** ("Gmail accounts only"). Rather than
redesign that UI, the backend was adapted to match it — one OTP flow that
creates the account on first verification and just logs in on return visits.
`users.password_hash`, `name`, and `phone` are now nullable; `name` is derived
from the email's local part on first signup. `AuthModal.jsx` now calls the
real API (`/api/auth/request-otp`, `/verify-otp`, `/resend-otp`) instead of
`setTimeout` fakes — every visual element, animation, and step is unchanged.

### Phase 5 — Checkout + Track Order wired end-to-end (NEW)
- `npm run migrate` then `node src/db/seedProducts.js` to copy the frontend's mock
  catalog into MySQL **with matching IDs**, so the existing "Add to Cart" flow
  (which references mock product IDs) works against the real `/api/orders` endpoint
  without touching the product-browsing pages yet.
- `Checkout.jsx`: email/OTP steps now call the real passwordless auth API and sign
  the user in app-wide; the address step is now controlled (real values, not
  placeholders) and "Pay Now" creates a real order via `POST /api/orders`.
  Already-authenticated users skip straight to the address step.
  **Payment itself is still a UI mock** — no payment gateway (Razorpay, etc.) is
  wired up; clicking Pay places the order directly, matching "Order Placed" as
  the first real status.
- `TrackOrder.jsx`: now calls `GET /api/orders/track`, accepts email *or* phone
  (matching the backend, not just Gmail), and maps the real status/timeline data
  onto the existing visual design. Carrier/tracking-number fields are hidden
  since that data doesn't exist in the schema — nothing fabricated.

### Phase 6 — Hidden Admin Portal (NEW)
- **All 3 visible admin links removed**: Footer "Admin Panel", Navbar topbar "Admin →",
  and the customer account dropdown's "Admin Panel" item — all violated the
  hidden-admin requirement and are now gone.
- **Secret route**: `/internal-ops-7f3k2x` (defined in `src/config/adminRoutes.js` —
  change this before deploying). Not linked anywhere in the UI; you have to know the URL.
- **Real gate, not just obscurity**: visiting that path while unauthenticated renders
  a full-page login wall (`AdminLogin.jsx`) calling the real `/api/admin-auth`
  endpoints — password, then email OTP 2FA, with account lockout after 5 failed
  attempts (already built in Phase 1). Only on success does `AdminRouteGuard`
  render the actual dashboard.
- Admin session uses its own token/storage key (`styron_admin_access_token`),
  completely separate from the customer login — an admin and a customer can be
  signed in in two different tabs without colliding.

### Phase 7 — Admin CRUD dashboards (NEW)
- **`/products`**: list + search, create/edit modal with multi-image upload to
  Cloudinary, delete (cleans up Cloudinary images too).
- **`/orders`**: list + filter by status, update status with an optional note
  (auto-emails the customer — built in Phase 2, now has a UI).
- **`/users`**: list + search, suspend/reactivate (suspending also revokes that
  user's active sessions immediately). **New backend added this phase**:
  `/api/users/admin/*` didn't exist before — list/get/update/status/delete.
- **`/contacts`**: list + search/filter by status, reply (emails the customer),
  delete.
- Dropped the placeholder "Inventory" and "Settings" nav links that had no
  backing pages — added "Contacts" instead, since that's a real, working screen.
  Honesty over a nav that promises pages that don't exist yet.

### Phase 8 — Full catalog wiring: storefront + rich product data (NEW)
The storefront's mock catalog (`data/products.js`) had structured specs,
applications, certifications, related products, ratings, and badges that the
Phase 2 MySQL schema didn't support. Rather than dumb down the storefront or
fake this data, the schema and admin UI were extended to match it:
- **New migration** (`004_product_rich_fields.sql`): adds `grade`, `size`, `unit`,
  `mrp`, `gst_percent`, `badge`, `badge_label`, `min_stock`, `min_order`,
  `weight_per_meter`, `long_description`, `rating`, `review_count` to `products`,
  plus new tables `product_specs`, `product_applications`,
  `product_certifications`, `product_related`, and an `icon` column on `categories`.
- **`seedProducts.js` rewritten** to populate all of this from the mock catalog
  (specs, applications, certifications, related-product links) — re-run it after
  this migration even if you ran it before; it skips products that already exist.
- **`Products.jsx` and `ProductDetail.jsx`** now fetch from `/api/products` and
  `/api/products/categories` instead of importing the mock arrays. A thin mapper
  in `src/lib/productsApi.js` reshapes API responses into the exact object shape
  the existing JSX already expected, so **no JSX changed** — only the data source.
- **Admin Products form** extended to manage all of it: grade/size/unit/MRP/GST,
  badges, min stock/order, a dynamic spec-sheet editor (key/value rows), a dynamic
  applications list, and comma-separated certifications/related-product-ID fields.

### Phase 9 — Remaining catalog references wired (NEW)
`Home.jsx` (featured products + category pills), `AIEstimator.jsx` (product
lookup when adding recommended items to cart), and `Quotation.jsx` (product
picker dropdown) all imported the mock `PRODUCTS`/`CATEGORIES` arrays directly.
All three now fetch from the real API via the same `productsApi.js` mapper —
**zero JSX changed**, only the data source. `STEEL_INTENSITY_FACTORS` (estimator
math constants) and `DEMO_QUOTATIONS`/`DEMO_ORDERS` (unrelated demo content for
the quotation preview tab and customer order history) intentionally stay as
mock data — they aren't catalog data and were never in scope.

Every public-facing page that touches the product catalog is now wired to MySQL.

### Phase 10 — Real analytics + customer order history (NEW)
- **New endpoint** `GET /api/analytics/admin/dashboard`: computes revenue
  (10-month trend + MTD vs last-month growth), order counts, new-customer counts,
  top products by revenue (current month, from real `order_items`), recent orders,
  and low-stock inventory — all real SQL aggregates, no mock numbers.
- **Honest gap, not fabricated**: there's no quotations system in this build, so
  the Quotations KPI reports `0` rather than a made-up number. Inventory's
  "incoming stock" field also doesn't exist in the schema, so it's `0` — the UI
  already hides that line when it's zero, no JSX change needed.
- **`/api/orders/mine`** now returns each order's line items (previously just
  the order header), since the customer Orders page needs them.
- **`CustomerOrders.jsx`, `CustomerInvoices.jsx`, `CustomerDashboard.jsx`**
  (account overview's "Recent Order" card + stats) all now fetch real data
  instead of `DEMO_ORDERS`.
- **Known limitation**: invoices show GST as ₹0 — orders don't store a separate
  tax line in the current schema (only `subtotal`/`total`, which are currently
  equal). Showing a real number would mean fabricating it; flagged here instead.

## What's NOT wired yet
Nothing catalog- or dashboard-related remains on mock data. Two structural gaps
remain: no GST/tax breakdown stored per order (noted above), and no
quotations or saved-addresses backend exists (both were never built — outside
the original 14-point spec's explicit scope, surfaced here for visibility).

## API Reference (Phase 1)

### User auth — `/api/auth` (passwordless)
| Method | Path            | Body                | Notes |
|--------|-----------------|----------------------|-------|
| POST   | `/request-otp`  | `email`              | Sends OTP. Works for both new and returning users. |
| POST   | `/verify-otp`   | `email, otp`          | Creates the user on first verification, logs in either way. Returns `accessToken` + sets refresh cookie. |
| POST   | `/resend-otp`   | `email`              | 60s cooldown by default |
| POST   | `/refresh`      | (cookie only)         | Returns new `accessToken` |
| POST   | `/logout`       | (cookie only)         | Revokes refresh token |

### Admin auth — `/api/admin-auth`
| Method | Path            | Body                         | Notes |
|--------|-----------------|-------------------------------|-------|
| POST   | `/login`        | `email, password`             | Step 1 — returns `adminId`, sends OTP |
| POST   | `/verify-otp`   | `adminId, otp`                 | Step 2 — returns `accessToken` |
| POST   | `/resend-otp`   | `adminId`                     | |
| POST   | `/refresh`      | (cookie only)                  | |
| POST   | `/logout`       | (cookie only)                  | |

All responses follow `{ success, message?, data?, errors? }`.
Protect any future route with `requireUser`, `requireAdmin()`, or
`requireAdmin('super_admin')` from `src/middleware/auth.js`.

### Products / Categories — `/api/products`
| Method | Path                        | Auth  | Notes |
|--------|------------------------------|-------|-------|
| GET    | `/`                          | none  | `?category=slug&search=&page=&limit=` |
| GET    | `/categories`                | none  | |
| GET    | `/:slug`                     | none  | |
| GET    | `/admin/list`                | admin | `?status=&search=&page=&limit=` |
| POST   | `/admin`                     | admin | multipart/form-data, field `images` (up to 6) |
| PUT    | `/admin/:id`                 | admin | multipart/form-data, partial update |
| DELETE | `/admin/:id`                 | admin | also deletes Cloudinary images |
| DELETE | `/admin/images/:imageId`     | admin | |
| POST   | `/admin/categories`          | admin | |

### Orders — `/api/orders`
| Method | Path                  | Auth          | Notes |
|--------|------------------------|---------------|-------|
| POST   | `/`                    | optional      | `items:[{productId,quantity}], shippingAddress`, +`guestName/guestEmail/guestPhone` if not logged in |
| GET    | `/track`               | none          | `?orderNumber=&contact=` (email or phone used at checkout) |
| GET    | `/mine`                | user          | |
| GET    | `/admin/list`          | admin         | `?status=&page=&limit=` |
| GET    | `/admin/:id`           | admin         | |
| PATCH  | `/admin/:id/status`    | admin         | `{status, note?}` — emails the customer automatically |

### Contacts — `/api/contacts`
| Method | Path                   | Auth  |
|--------|-------------------------|-------|
| POST   | `/`                     | none  |
| GET    | `/admin/list`           | admin |
| POST   | `/admin/:id/reply`      | admin |
| DELETE | `/admin/:id`            | admin |

### Notifications — `/api/notifications`
| Method | Path           | Auth        |
|--------|-----------------|-------------|
| GET    | `/admin`        | admin       |
| GET    | `/mine`         | user        |
| PATCH  | `/:id/read`     | user/admin  |
| PATCH  | `/read-all`     | user/admin  |

### Users — `/api/users`
| Method | Path                   | Auth          | Notes |
|--------|-------------------------|---------------|-------|
| GET    | `/admin/list`           | admin         | `?search=&status=&page=&limit=` |
| GET    | `/admin/:id`            | admin         | includes that user's orders |
| PUT    | `/admin/:id`            | admin         | update name/phone |
| PATCH  | `/admin/:id/status`     | admin         | `{status: 'active'|'suspended'}` — revokes sessions on suspend |
| DELETE | `/admin/:id`            | super_admin   | |

### Analytics — `/api/analytics`
| Method | Path                | Auth  | Notes |
|--------|----------------------|-------|-------|
| GET    | `/admin/dashboard`   | admin | revenue trend, orders, customers, top products, recent orders, inventory |

### Chatbot — `/api/chatbot`
| Method | Path                      | Auth      | Notes |
|--------|----------------------------|-----------|-------|
| POST   | `/message`                 | optional  | `{sessionId, message}` — rate-limited to 15/min/IP |
| GET    | `/history/:sessionId`      | none      | |
| GET    | `/admin/analytics`         | admin     | totals + recent escalations |
| GET    | `/admin/sessions`          | admin     | |



## Security notes
- Passwords: bcrypt, 10 rounds.
- OTPs: 6-digit, bcrypt-hashed at rest, expire in 10 min, max 5 attempts, 60s resend cooldown.
- Admin lockout: 5 failed password attempts → 15 min lock.
- Refresh tokens: stored as SHA-256 hashes only, httpOnly+sameSite=strict cookies, revocable.
- Rate limiting: global (300/15min), tighter on auth (20/15min) and OTP requests (6/10min).
- `helmet()` sets standard security headers; CORS locked to `CLIENT_URL`.

## Connecting the existing frontend
Nothing in `styron-demo/src` was modified. To wire `AuthModal.jsx` to this API,
the frontend will need an API client (e.g. `axios` with `withCredentials: true`
so the refresh cookie is sent) — that's a good Phase 1.5 step, or we move on to
products/orders next, your call.

### Phase 11 — ERP/CRM Upgrade (NEW)
Adds steel manufacturing ERP capabilities on top of the existing storefront and
admin dashboard, fully backward-compatible — no existing routes, tables, or
components were removed.

**New migration**: `006_erp_upgrade.sql` — adds `company`/`gstin`/`address` to
`users`, plus new tables `invoices`, `steel_prices`, `featured_products`,
`payments`, `email_templates` (with 4 pre-seeded templates). Re-run
`npm run migrate` to apply it; safe on an existing database.

- **Live steel price ticker** (replaces the static "India's #1..." topbar text):
  admin-managed via `/api/steel-prices`, renders as a smooth scrolling marquee
  in `Navbar.jsx` (`SteelPriceTicker.jsx`), admin UI at `/steel-prices`.
- **Featured products** (Home page, now shows 4): admin picks/orders/toggles via
  `/api/featured-products`, admin UI at `/featured-products`. No more hardcoded
  `badge === 'bestseller'` filter.
- **Modern UI**: new `.glass-card`, `.glass-dark`, `.hover-lift`, `.bg-steel-hero`
  utility classes added to `index.css` for the premium industrial look — no
  navigation or workflow changes.
- **Excel exports**: Users (`/api/users/admin/export/excel`), Products
  (`/api/products/admin/export/excel`), Quotations (`/api/quotations/admin/export`),
  Payments (`/api/payments/admin/export/excel`) — all via a shared `exceljs`
  utility (`utils/excelExport.js`).
- **PDF exports**: Products (`/api/products/admin/export/pdf`), Payments
  (`/api/payments/admin/export/pdf`).
- **Quotation management upgrade**: admin list/search/filter (customer, status,
  date range) at `/api/quotations/admin/list`, regenerate at
  `/api/quotations/admin/:id/regenerate`, Excel export — admin UI at `/quotations`.
- **Auto-invoice generation**: when an order's status changes to `processing`
  (this schema's "confirmed" step), an invoice PDF is auto-generated (richer
  layout in `utils/pdfInvoice.js` — logo, GSTIN, billing/shipping, signature),
  stored in the new `invoices` table, and emailed to the customer using the
  editable `invoice_email` template.
- **Payment management** (new module): `/api/payments/admin/*` — list/filter/search,
  manual status updates (pending/paid/failed/refunded), dashboard summary cards
  (total revenue, today's revenue, pending/successful/failed counts), Excel + PDF
  export. Admin UI at `/payments`.
- **Email template management**: `/api/email-templates/admin/*` — admin edits
  subject + HTML body for `order_confirmation`, `order_status_update`,
  `invoice_email`, `quotation_email` with `{{variable}}` placeholders, no code
  deploy needed. Order placement, status updates, and auto-invoices all render
  through these templates now (`getRenderedTemplate()` in
  `controllers/emailTemplateController.js`). Admin UI at `/email-templates`.
- **Dashboard analytics**: added a real Payments-collected KPI card and live
  quotations MTD count (previously hardcoded to `0`) to
  `GET /api/analytics/admin/dashboard`.

All new admin pages are added to the sidebar nav in `PublicLayout.jsx` and
routed in `App.jsx` under the existing hidden `ADMIN_BASE_PATH`; no new public
routes or visible admin links were introduced.
