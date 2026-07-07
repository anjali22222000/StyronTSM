import { apiFetch } from "./apiClient";

/** Maps a backend product row (already enriched with specs/applications/etc by
 * the API) into the exact shape `data/products.js`'s mock PRODUCTS used —
 * so Products.jsx / ProductDetail.jsx need zero JSX changes, just a new data source. */
function mapProduct(p) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    category: p.category,
    categoryLabel: p.categoryLabel,
    grade: p.grade,
    size: p.size,
    unit: p.unit || "unit",
    price: Number(p.price),
    mrp: p.mrp ? Number(p.mrp) : Number(p.price),
    gst: Number(p.gst_percent ?? 18),
    sku: p.sku,
    badge: p.badge,
    badgeLabel: p.badge_label,
    stock: p.stock_quantity,
    minStock: p.min_stock ?? 0,
    minOrder: p.min_order ?? 1,
    weight_per_meter: p.weight_per_meter ? Number(p.weight_per_meter) : null,
    description: p.description,
    longDesc: p.long_description,
    specs: p.specs || {},
    applications: p.applications || [],
    images: p.images || [],
    related: (p.related || []).map((r) => r.id),
    certifications: p.certifications || [],
    rating: Number(p.rating || 0),
    reviewCount: p.review_count || 0,
  };
}

function mapCategory(c) {
  return { id: c.slug, label: c.label, icon: c.icon || "📦", count: c.count };
}

export async function fetchProducts({ category, search } = {}) {
  const qs = new URLSearchParams({ limit: "100", ...(category ? { category } : {}), ...(search ? { search } : {}) });
  const res = await apiFetch(`/products?${qs}`);
  return res.data.products.map(mapProduct);
}

export async function fetchProductBySlug(slug) {
  const res = await apiFetch(`/products/${slug}`);
  return mapProduct(res.data);
}

export async function fetchCategories() {
  const res = await apiFetch("/products/categories");
  return res.data.map(mapCategory);
}

/** Resolves a related-product summary (id/name/slug/price/unit/grade/category) into
 * the same shape `related.map(r => x.id)` lookups expect when ProductDetail filters
 * the *full* product list by ID — we already fetch the whole list there, so this
 * mapper isn't needed on its own; kept for reference/clarity. */
export { mapProduct, mapCategory };
