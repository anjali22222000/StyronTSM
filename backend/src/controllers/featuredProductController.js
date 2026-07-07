import { pool } from "../config/db.js";

async function attachImages(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);
  const [images] = await pool.query(
    "SELECT * FROM product_images WHERE product_id IN (?) ORDER BY is_primary DESC, sort_order ASC",
    [ids]
  );
  const [categories] = await pool.query("SELECT id, name, slug FROM categories");
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  return products.map((p) => ({
    ...p,
    category: catById[p.category_id]?.slug || null,
    categoryLabel: catById[p.category_id]?.name || null,
    images: images.filter((i) => i.product_id === p.id),
  }));
}

export async function listFeaturedProducts(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, fp.sort_order as featured_order, fp.id as featured_id
     FROM featured_products fp
     JOIN products p ON p.id = fp.product_id
     WHERE fp.is_active = 1 AND p.status = 'active'
     ORDER BY fp.sort_order ASC, fp.id ASC
     LIMIT 4`
  );
  res.json({ success: true, data: await attachImages(rows) });
}

export async function adminListFeaturedProducts(req, res) {
  const [rows] = await pool.query(
    `SELECT fp.*, p.name, p.slug, p.price, p.unit, p.grade, p.status as product_status,
            p.stock_quantity, p.sku
     FROM featured_products fp
     JOIN products p ON p.id = fp.product_id
     ORDER BY fp.sort_order ASC, fp.id ASC`
  );
  res.json({ success: true, data: rows });
}

export async function adminSetFeaturedProducts(req, res) {
  // Accepts { featured: [{ productId, sortOrder, isActive }] }
  const { featured } = req.body;
  if (!Array.isArray(featured)) {
    return res.status(400).json({ success: false, message: "featured must be an array." });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM featured_products");
    for (const item of featured) {
      await conn.query(
        "INSERT INTO featured_products (product_id, sort_order, is_active) VALUES (?, ?, ?)",
        [item.productId, item.sortOrder ?? 0, item.isActive !== false ? 1 : 0]
      );
    }
    await conn.commit();
    res.json({ success: true, message: "Featured products updated." });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function adminUpdateFeatured(req, res) {
  const { id } = req.params;
  const { sort_order, is_active } = req.body;
  const updates = [];
  const params = [];
  if (sort_order !== undefined) { updates.push("sort_order = ?"); params.push(sort_order); }
  if (is_active !== undefined)  { updates.push("is_active = ?");  params.push(is_active ? 1 : 0); }
  if (!updates.length) return res.status(400).json({ success: false, message: "No fields." });
  params.push(id);
  await pool.query(`UPDATE featured_products SET ${updates.join(", ")} WHERE id = ?`, params);
  res.json({ success: true, message: "Updated." });
}

export async function adminRemoveFeatured(req, res) {
  const { id } = req.params;
  await pool.query("DELETE FROM featured_products WHERE id = ?", [id]);
  res.json({ success: true, message: "Removed." });
}

export async function adminAddFeatured(req, res) {
  const { productId, sortOrder = 0 } = req.body;
  if (!productId) return res.status(400).json({ success: false, message: "productId required." });
  const [exists] = await pool.query("SELECT id FROM products WHERE id = ?", [productId]);
  if (!exists.length) return res.status(404).json({ success: false, message: "Product not found." });
  const [result] = await pool.query(
    "INSERT IGNORE INTO featured_products (product_id, sort_order) VALUES (?, ?)",
    [productId, sortOrder]
  );
  res.status(201).json({ success: true, message: "Added.", id: result.insertId });
}
