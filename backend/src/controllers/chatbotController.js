import { pool } from "../config/db.js";
import { askClaude } from "../utils/anthropic.js";
import { COMPANY_INFO, POLICIES, faqsAsText } from "../data/knowledgeBase.js";
import { notifyAdmins } from "../utils/notifications.js";

const ESCALATION_KEYWORDS = [
  "speak to a human",
  "talk to a person",
  "talk to someone",
  "human agent",
  "real person",
  "not helpful",
  "complaint",
  "refund",
  "legal",
  "lawsuit",
  "urgent",
];

const MAX_HISTORY_TURNS = 8; // last N messages kept as conversation context

/**
 * Retrieval step: pulls products whose name/description/category overlaps with
 * the user's message. This is intentionally simple (keyword match against MySQL)
 * rather than vector search — sufficient for a focused product catalog, and it
 * means the chatbot only ever cites real, current stock/price data.
 */
async function retrieveRelevantProducts(query) {
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (!words.length) return [];

  const likeClauses = words.map(() => "(name LIKE ? OR description LIKE ?)").join(" OR ");
  const params = words.flatMap((w) => [`%${w}%`, `%${w}%`]);

  const [rows] = await pool.query(
    `SELECT name, description, price, currency, stock_quantity, sku, status
     FROM products WHERE status = 'active' AND (${likeClauses}) LIMIT 5`,
    params
  );
  return rows;
}

function productsAsText(products) {
  if (!products.length) return "(no specific matching products found in current catalog)";
  return products
    .map(
      (p) =>
        `- ${p.name}: ${p.description ? p.description.slice(0, 150) : "no description"} | Price: ${p.currency} ${p.price} | Stock: ${p.stock_quantity > 0 ? `${p.stock_quantity} available` : "out of stock"} | SKU: ${p.sku || "N/A"}`
    )
    .join("\n");
}

function detectEscalation(message) {
  const lower = message.toLowerCase();
  return ESCALATION_KEYWORDS.some((kw) => lower.includes(kw));
}

async function ensureSession(sessionId, userId) {
  const [rows] = await pool.query("SELECT id FROM chatbot_sessions WHERE id = ?", [sessionId]);
  if (!rows.length) {
    await pool.query("INSERT INTO chatbot_sessions (id, user_id) VALUES (?, ?)", [sessionId, userId || null]);
  } else {
    await pool.query("UPDATE chatbot_sessions SET last_active_at = NOW() WHERE id = ?", [sessionId]);
  }
}

export async function sendMessage(req, res) {
  const { sessionId, message } = req.body;
  const userId = req.auth?.type === "user" ? req.auth.id : null;

  await ensureSession(sessionId, userId);

  // Log the user's message immediately.
  await pool.query(
    "INSERT INTO chatbot_logs (session_id, role, message) VALUES (?, 'user', ?)",
    [sessionId, message]
  );

  const escalate = detectEscalation(message);
  const relevantProducts = await retrieveRelevantProducts(message);

  const [historyRows] = await pool.query(
    `SELECT role, message FROM chatbot_logs WHERE session_id = ? ORDER BY id DESC LIMIT ?`,
    [sessionId, MAX_HISTORY_TURNS]
  );
  const history = historyRows.reverse().map((h) => ({
    role: h.role === "user" ? "user" : "assistant",
    content: h.message,
  }));

  const systemPrompt = buildSystemPrompt(relevantProducts, escalate);

  let replyText;
  let wasFallback = false;
  try {
    replyText = await askClaude({ system: systemPrompt, messages: history });
    if (!replyText) throw new Error("Empty response");
  } catch (err) {
    wasFallback = true;
    replyText =
      "I'm having trouble generating a response right now. Please try again in a moment, or reach our team directly via the Contact page or WhatsApp.";
  }

  await pool.query(
    `INSERT INTO chatbot_logs (session_id, role, message, matched_sources, was_fallback)
     VALUES (?, 'assistant', ?, ?, ?)`,
    [sessionId, replyText, relevantProducts.map((p) => p.sku || p.name).join(", ") || null, wasFallback]
  );

  if (escalate) {
    await pool.query("UPDATE chatbot_sessions SET escalated = 1 WHERE id = ?", [sessionId]);
    await notifyAdmins({
      type: "chatbot_escalation",
      title: "Chatbot conversation needs human attention",
      body: `Session ${sessionId}: "${message.slice(0, 120)}"`,
      link: `/admin/chatbot/${sessionId}`,
    });
  }

  res.json({
    success: true,
    data: { reply: replyText, escalated: escalate, matchedProducts: relevantProducts.length },
  });
}

export async function getHistory(req, res) {
  const { sessionId } = req.params;
  const [rows] = await pool.query(
    "SELECT role, message, created_at FROM chatbot_logs WHERE session_id = ? ORDER BY id ASC",
    [sessionId]
  );
  res.json({ success: true, data: rows });
}

// ---------------------------------------------------------------
// ADMIN ANALYTICS
// ---------------------------------------------------------------

export async function adminChatAnalytics(req, res) {
  const [[totals]] = await pool.query(
    `SELECT
       (SELECT COUNT(*) FROM chatbot_sessions) AS total_sessions,
       (SELECT COUNT(*) FROM chatbot_sessions WHERE escalated = 1) AS escalated_sessions,
       (SELECT COUNT(*) FROM chatbot_logs WHERE role = 'user') AS total_user_messages,
       (SELECT COUNT(*) FROM chatbot_logs WHERE was_fallback = 1) AS fallback_responses`
  );

  const [recentEscalations] = await pool.query(
    `SELECT s.id as session_id, s.last_active_at, s.user_id
     FROM chatbot_sessions s WHERE s.escalated = 1 ORDER BY s.last_active_at DESC LIMIT 20`
  );

  res.json({ success: true, data: { totals, recentEscalations } });
}

export async function adminListSessions(req, res) {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const [rows] = await pool.query(
    `SELECT * FROM chatbot_sessions ORDER BY last_active_at DESC LIMIT ? OFFSET ?`,
    [Number(limit), offset]
  );
  res.json({ success: true, data: rows });
}

function buildSystemPrompt(relevantProducts, escalate) {
  return `You are the AI support assistant for Styron TSM, a steel manufacturing & supply company.
Answer using ONLY the knowledge base below. Be precise, concise, and helpful.

If the answer truly isn't in the knowledge base or the product list, say so honestly and suggest
contacting the team via the Contact page, phone, email, or WhatsApp — do not invent facts, prices,
specs, or policies that aren't given to you here.

${escalate ? "NOTE: This user's message suggests they want a human / are frustrated. Acknowledge that, answer what you can, and let them know a team member will follow up." : ""}

=== COMPANY INFO ===
${COMPANY_INFO}

=== POLICIES ===
${POLICIES}

=== FAQS ===
${faqsAsText()}

=== PRODUCTS MATCHING THIS QUERY ===
${productsAsText(relevantProducts)}

Keep replies under ~120 words unless the user asks for detailed specs.`;
}
