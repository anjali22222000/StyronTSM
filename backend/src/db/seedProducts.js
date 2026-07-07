// Seeds MySQL `categories` + `products` (+ specs/applications/certifications/
// related/images) from the frontend's mock catalog (src/data/products.js),
// preserving the same numeric product IDs the frontend cart/checkout already
// uses. Run after `npm run migrate`:  node src/db/seedProducts.js
//
// Re-running is safe: products already present (by ID) are skipped entirely
// (including their specs/applications/etc, which only get (re)written when the
// product itself is newly inserted).
import dotenv from "dotenv";
dotenv.config();
import { pool } from "../config/db.js";
import { slugify } from "../utils/slug.js";
import { CATEGORIES, PRODUCTS } from "../../../src/data/products.js";

async function seed() {
  console.log(`Seeding ${CATEGORIES.length} categories and ${PRODUCTS.length} products…`);

  const categoryIdMap = {};
  for (const cat of CATEGORIES) {
    const slug = slugify(cat.label);
    const [existing] = await pool.query("SELECT id FROM categories WHERE slug = ?", [slug]);
    if (existing.length) {
      categoryIdMap[cat.id] = existing[0].id;
      // Backfill icon if missing (e.g. category was created before the icon column existed).
      await pool.query("UPDATE categories SET icon = COALESCE(icon, ?) WHERE id = ?", [cat.icon || null, existing[0].id]);
      continue;
    }
    const [result] = await pool.query("INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)", [
      cat.label,
      slug,
      cat.icon || null,
    ]);
    categoryIdMap[cat.id] = result.insertId;
  }

  let inserted = 0;
  let skipped = 0;
  for (const p of PRODUCTS) {
    const [existing] = await pool.query("SELECT id FROM products WHERE id = ?", [p.id]);
    if (existing.length) {
      skipped += 1;
      continue;
    }

    await pool.query(
      `INSERT INTO products
         (id, category_id, name, slug, grade, size, description, long_description,
          price, mrp, gst_percent, currency, unit, stock_quantity, min_stock, min_order,
          weight_per_meter, sku, badge, badge_label, rating, review_count, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        p.id,
        categoryIdMap[p.category] || null,
        p.name,
        p.slug,
        p.grade || null,
        p.size || null,
        p.description || null,
        p.longDesc || null,
        p.price,
        p.mrp || null,
        p.gst || 18,
        p.unit || "unit",
        p.stock || 0,
        p.minStock || 0,
        p.minOrder || 1,
        p.weight_per_meter || null,
        p.sku || null,
        p.badge || null,
        p.badgeLabel || null,
        p.rating || 0,
        p.reviewCount || 0,
      ]
    );

    if (p.specs && Object.keys(p.specs).length) {
      const rows = Object.entries(p.specs).map(([k, v], i) => [p.id, k, v, i]);
      await pool.query("INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES ?", [rows]);
    }
    if (p.applications?.length) {
      const rows = p.applications.map((a, i) => [p.id, a, i]);
      await pool.query("INSERT INTO product_applications (product_id, application, sort_order) VALUES ?", [rows]);
    }
    if (p.certifications?.length) {
      const rows = p.certifications.map((c, i) => [p.id, c, i]);
      await pool.query("INSERT INTO product_certifications (product_id, certification, sort_order) VALUES ?", [rows]);
    }

    inserted += 1;
  }

  // Related products reference each other by ID, so do this pass only after
  // every product row exists (avoids FK errors on forward references).
  let relatedLinks = 0;
  for (const p of PRODUCTS) {
    if (!p.related?.length) continue;
    const [already] = await pool.query("SELECT id FROM product_related WHERE product_id = ?", [p.id]);
    if (already.length) continue; // already seeded (product wasn't newly inserted this run)
    const rows = p.related.map((relatedId, i) => [p.id, relatedId, i]);
    await pool.query(
      "INSERT IGNORE INTO product_related (product_id, related_product_id, sort_order) VALUES ?",
      [rows]
    );
    relatedLinks += rows.length;
  }

  // Keep AUTO_INCREMENT ahead of the highest manually-inserted ID so future
  // admin-created products don't collide.
  const [[{ maxId }]] = await pool.query("SELECT MAX(id) as maxId FROM products");
  if (maxId) {
    await pool.query(`ALTER TABLE products AUTO_INCREMENT = ?`, [maxId + 1]);
  }

  console.log(`Done. Inserted ${inserted} products (+${relatedLinks} related-product links), skipped ${skipped} already present.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Product seeding failed:", err.message);
  process.exit(1);
});
