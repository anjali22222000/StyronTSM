import { pool } from "../config/db.js";
import { slugify } from "../utils/slug.js";
import { uploadBufferToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { streamExcel } from "../utils/excelExport.js";
import PDFDocument from "pdfkit";

/** Parses a field that may arrive as a JSON string (multipart form) or already-parsed array. */
function parseArrayField(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Attaches images, specs, applications, certifications, related product summaries, and
 * category info to a list of product rows — used by both public and admin endpoints so
 * the shape returned always matches what the storefront UI expects. */
async function attachFullDetails(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p.id);

  const [images] = await pool.query(
    `SELECT * FROM product_images WHERE product_id IN (?) ORDER BY is_primary DESC, sort_order ASC`,
    [ids]
  );
  const [specs] = await pool.query(
    `SELECT * FROM product_specs WHERE product_id IN (?) ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const [applications] = await pool.query(
    `SELECT * FROM product_applications WHERE product_id IN (?) ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const [certifications] = await pool.query(
    `SELECT * FROM product_certifications WHERE product_id IN (?) ORDER BY sort_order ASC, id ASC`,
    [ids]
  );
  const [related] = await pool.query(
    `SELECT pr.product_id, p.id, p.name, p.slug, p.price, p.unit, p.grade,
            c.slug as category_slug
     FROM product_related pr
     JOIN products p ON p.id = pr.related_product_id
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE pr.product_id IN (?) ORDER BY pr.sort_order ASC`,
    [ids]
  );
  const [categories] = await pool.query(`SELECT id, name, slug, icon FROM categories`);
  const categoryById = Object.fromEntries(categories.map((c) => [c.id, c]));

  return products.map((p) => {
    const cat = categoryById[p.category_id];
    return {
      ...p,
      category: cat?.slug || null,
      categoryLabel: cat?.name || null,
      images: images.filter((i) => i.product_id === p.id),
      specs: Object.fromEntries(specs.filter((s) => s.product_id === p.id).map((s) => [s.spec_key, s.spec_value])),
      applications: applications.filter((a) => a.product_id === p.id).map((a) => a.application),
      certifications: certifications.filter((c) => c.product_id === p.id).map((c) => c.certification),
      related: related.filter((r) => r.product_id === p.id).map((r) => ({
        id: r.id, name: r.name, slug: r.slug, price: r.price, unit: r.unit, grade: r.grade, category: r.category_slug,
      })),
    };
  });
}

// ---------------------------------------------------------------
// PUBLIC
// ---------------------------------------------------------------

export async function listProducts(req, res) {
  const { category, search, page = 1, limit = 60 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = ["status = 'active'"];
  const params = [];
  if (category) {
    where.push("category_id = (SELECT id FROM categories WHERE slug = ?)");
    params.push(category);
  }
  if (search) {
    where.push("(name LIKE ? OR description LIKE ? OR grade LIKE ? OR sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT * FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products WHERE ${whereClause}`, params);

  res.json({
    success: true,
    data: { products: await attachFullDetails(rows), total, page: Number(page), limit: Number(limit) },
  });
}

export async function getProductBySlug(req, res) {
  const [rows] = await pool.query("SELECT * FROM products WHERE slug = ? AND status = 'active'", [req.params.slug]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Product not found." });
  const [withDetails] = await attachFullDetails(rows);
  res.json({ success: true, data: withDetails });
}

export async function listCategories(req, res) {
  const [rows] = await pool.query(
    `SELECT c.id, c.name as label, c.slug, c.icon,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.status = 'active') as count
     FROM categories c ORDER BY c.name ASC`
  );
  res.json({ success: true, data: rows });
}

// ---------------------------------------------------------------
// ADMIN
// ---------------------------------------------------------------

export async function adminListProducts(req, res) {
  const { page = 1, limit = 20, search = "", status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(name LIKE ? OR sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  const whereClause = where.join(" AND ");

  const [rows] = await pool.query(
    `SELECT * FROM products WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, Number(limit), offset]
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM products WHERE ${whereClause}`, params);

  res.json({ success: true, data: { products: await attachFullDetails(rows), total, page: Number(page), limit: Number(limit) } });
}

const RICH_FIELDS = [
  "category_id", "grade", "size", "unit", "price", "mrp", "gst_percent", "stock_quantity", "sku", "status",
  "badge", "badge_label", "min_stock", "min_order", "weight_per_meter", "description", "long_description",
  "rating", "review_count",
];

export async function createProduct(req, res) {
  const { name } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Name is required." });

  let slug = slugify(name);
  const [clash] = await pool.query("SELECT id FROM products WHERE slug = ?", [slug]);
  if (clash.length) slug = `${slug}-${Date.now().toString(36)}`;

  const columns = ["name", "slug"];
  const placeholders = ["?", "?"];
  const values = [name, slug];
  for (const field of RICH_FIELDS) {
    if (req.body[field] !== undefined && req.body[field] !== "") {
      columns.push(field);
      placeholders.push("?");
      values.push(req.body[field]);
    }
  }

  const [result] = await pool.query(
    `INSERT INTO products (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`,
    values
  );
  const productId = result.insertId;

  await saveRichRelations(productId, req.body);
  if (req.files?.length) await uploadProductImages(productId, req.files);

  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [productId]);
  const [withDetails] = await attachFullDetails(rows);
  res.status(201).json({ success: true, message: "Product created.", data: withDetails });
}

export async function updateProduct(req, res) {
  const { id } = req.params;
  const updates = [];
  const params = [];

  for (const field of RICH_FIELDS) {
    if (req.body[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(req.body[field] === "" ? null : req.body[field]);
    }
  }
  if (req.body.name) {
    updates.push("name = ?", "slug = ?");
    params.push(req.body.name, `${slugify(req.body.name)}-${id}`);
  }

  if (updates.length) {
    params.push(id);
    await pool.query(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, params);
  }

 await saveRichRelations(id, req.body);
  if (req.files?.length) await uploadProductImages(id, req.files, { replace: true });
  
  const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [id]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Product not found." });
  const [withDetails] = await attachFullDetails(rows);
  res.json({ success: true, message: "Product updated.", data: withDetails });
}

/** Replaces specs/applications/certifications/related rows wholesale when provided —
 * simpler and less error-prone than diffing, and these lists are short. */
async function saveRichRelations(productId, body) {
  if (body.specs !== undefined) {
    const specs = parseArrayField(body.specs); // [{key, value}]
    await pool.query("DELETE FROM product_specs WHERE product_id = ?", [productId]);
    if (specs.length) {
      const rows = specs.map((s, i) => [productId, s.key, s.value, i]);
      await pool.query("INSERT INTO product_specs (product_id, spec_key, spec_value, sort_order) VALUES ?", [rows]);
    }
  }
  if (body.applications !== undefined) {
    const apps = parseArrayField(body.applications); // [string]
    await pool.query("DELETE FROM product_applications WHERE product_id = ?", [productId]);
    if (apps.length) {
      const rows = apps.map((a, i) => [productId, a, i]);
      await pool.query("INSERT INTO product_applications (product_id, application, sort_order) VALUES ?", [rows]);
    }
  }
  if (body.certifications !== undefined) {
    const certs = parseArrayField(body.certifications); // [string]
    await pool.query("DELETE FROM product_certifications WHERE product_id = ?", [productId]);
    if (certs.length) {
      const rows = certs.map((c, i) => [productId, c, i]);
      await pool.query("INSERT INTO product_certifications (product_id, certification, sort_order) VALUES ?", [rows]);
    }
  }
  if (body.related !== undefined) {
    const relatedIds = parseArrayField(body.related).filter((rid) => Number(rid) !== Number(productId)); // [id]
    await pool.query("DELETE FROM product_related WHERE product_id = ?", [productId]);
    if (relatedIds.length) {
      const rows = relatedIds.map((rid, i) => [productId, rid, i]);
      await pool.query("INSERT INTO product_related (product_id, related_product_id, sort_order) VALUES ?", [rows]);
    }
  }
}

export async function deleteProduct(req, res) {
  const { id } = req.params;
  const [images] = await pool.query("SELECT cloudinary_id FROM product_images WHERE product_id = ?", [id]);
  for (const img of images) {
    await deleteFromCloudinary(img.cloudinary_id).catch(() => {}); // best-effort cleanup
  }
  const [result] = await pool.query("DELETE FROM products WHERE id = ?", [id]);
  if (!result.affectedRows) return res.status(404).json({ success: false, message: "Product not found." });
  res.json({ success: true, message: "Product deleted." });
}

export async function deleteProductImage(req, res) {
  const { imageId } = req.params;
  const [rows] = await pool.query("SELECT * FROM product_images WHERE id = ?", [imageId]);
  if (!rows.length) return res.status(404).json({ success: false, message: "Image not found." });
  await deleteFromCloudinary(rows[0].cloudinary_id).catch(() => {});
  await pool.query("DELETE FROM product_images WHERE id = ?", [imageId]);
  res.json({ success: true, message: "Image removed." });
}

async function uploadProductImages(productId, files, { replace = false } = {}) {
  if (replace) {
    // Editing a product with a new image should replace the old one, not just
    // pile onto an invisible gallery the admin UI has no way to manage.
    const [existing] = await pool.query(
      "SELECT cloudinary_id FROM product_images WHERE product_id = ?",
      [productId]
    );
    for (const img of existing) {
      await deleteFromCloudinary(img.cloudinary_id).catch(() => {}); // best-effort cleanup
    }
    await pool.query("DELETE FROM product_images WHERE product_id = ?", [productId]);
  }

  const [[{ count }]] = await pool.query("SELECT COUNT(*) as count FROM product_images WHERE product_id = ?", [
    productId,
  ]);
  let sortOrder = count;
  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer);
    await pool.query(
      `INSERT INTO product_images (product_id, url, cloudinary_id, is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [productId, result.secure_url, result.public_id, count === 0 && sortOrder === count ? 1 : 0, sortOrder]
    );
    sortOrder += 1;
  }
}
export async function createCategory(req, res) {
  const { name, description, icon } = req.body;
  const slug = slugify(name);
  const [result] = await pool.query(
    "INSERT INTO categories (name, slug, description, icon) VALUES (?, ?, ?, ?)",
    [name, slug, description || null, icon || null]
  );
  res.status(201).json({ success: true, data: { id: result.insertId, name, slug, icon } });
}

// ---------------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------------

async function fetchExportableProducts(search) {
  const where = ["1=1"];
  const params = [];
  if (search) {
    where.push("(p.name LIKE ? OR p.sku LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }
  const [rows] = await pool.query(
    `SELECT p.name, p.sku, c.name as category, p.stock_quantity, p.unit, p.price, p.status, p.created_at
     FROM products p LEFT JOIN categories c ON c.id = p.category_id
     WHERE ${where.join(" AND ")} ORDER BY p.created_at DESC`,
    params
  );
  return rows;
}

export async function adminExportProductsExcel(req, res) {
  const { search = "" } = req.query;
  const rows = await fetchExportableProducts(search);
  const data = rows.map((p) => ({
    name: p.name,
    sku: p.sku || "",
    category: p.category || "",
    stock: p.stock_quantity,
    unit: p.unit || "",
    price: Number(p.price),
    status: p.status,
    createdDate: new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
  }));
  await streamExcel(
    res,
    "products-export.xlsx",
    [
      { header: "Product Name", key: "name", width: 28 },
      { header: "SKU", key: "sku", width: 16 },
      { header: "Category", key: "category", width: 20 },
      { header: "Stock", key: "stock", width: 10 },
      { header: "Unit", key: "unit", width: 10 },
      { header: "Price", key: "price", width: 14 },
      { header: "Status", key: "status", width: 12 },
      { header: "Created Date", key: "createdDate", width: 16 },
    ],
    data,
    "Products"
  );
}

export async function adminExportProductsPdf(req, res) {
  const { search = "" } = req.query;
  const rows = await fetchExportableProducts(search);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'attachment; filename="products-export.pdf"');

  const doc = new PDFDocument({ size: "A4", margin: 36, layout: "landscape" });
  doc.pipe(res);

  doc.fontSize(16).font("Helvetica-Bold").fillColor("#0b1628").text("Styron TSM — Product List", { align: "left" });
  doc.fontSize(9).font("Helvetica").fillColor("#64748b").text(`Generated: ${new Date().toLocaleString("en-IN")}`);
  doc.moveDown(1);

  const colWidths = [170, 90, 110, 60, 60, 80, 70, 90];
  const headers = ["Name", "SKU", "Category", "Stock", "Unit", "Price", "Status", "Created"];
  let y = doc.y;
  const startX = doc.x;

  function drawRow(values, opts = {}) {
    let x = startX;
    doc.font(opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8.5).fillColor(opts.color || "#0b1628");
    values.forEach((v, i) => {
      doc.text(String(v), x, y, { width: colWidths[i], ellipsis: true });
      x += colWidths[i];
    });
  }

  doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 18).fill("#0b1628");
  drawRow(headers, { bold: true, color: "#ffffff" });
  y += 18;

  rows.forEach((p, idx) => {
    if (y > 540) { doc.addPage({ layout: "landscape" }); y = doc.y; }
    if (idx % 2 === 0) {
      doc.rect(startX, y - 4, colWidths.reduce((a, b) => a + b, 0), 16).fill("#f8fafc");
    }
    drawRow([
      p.name, p.sku || "—", p.category || "—", p.stock_quantity, p.unit || "—",
      `Rs.${Number(p.price).toLocaleString("en-IN")}`, p.status,
      new Date(p.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
    ]);
    y += 16;
  });

  doc.end();
}

