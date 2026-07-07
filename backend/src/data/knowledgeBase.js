// Static knowledge base — company info, policies, FAQs.
// This is the "non-product" half of the RAG knowledge base; product data is
// pulled live from MySQL in chatbotController.js so it's never stale.
//
// IMPORTANT: Update phone/email/address here to match Footer.jsx / About.jsx
// if those ever change — they're currently kept in sync manually.

export const COMPANY_INFO = `
Company: Styron TSM
Industry: Steel manufacturing & supply (TMT bars, structural steel, wire products, steel pipes)
Phone: +91 12345 67890
Email: sales@styrontsm.com
Address: Industrial Area, City, State 400001, India
Standards followed: IS 1786:2008 (TMT bars), IS 2062:2011 (structural steel), IS 1566:2000 (wire products)
Certifications: BIS certified manufacturing
`.trim();

export const POLICIES = `
Ordering: Orders can be placed online via the website (Checkout) or by contacting sales directly.
Minimum order: Varies by product, shown on each product page (minOrder field).
Payment: Standard B2B payment terms; contact sales for credit terms on bulk orders.
Delivery process: Order Placed -> Processing -> Manufacturing -> Quality Check -> Dispatch -> Delivered.
  Each order can be tracked using the order number and the email/phone used at checkout, no login required.
Quality assurance: Every batch is mill-tested; a Mill Test Certificate (MTC) is provided with orders on request.
Returns: Steel products are made-to-order/batch-tested; returns are handled case-by-case for verified
  manufacturing defects — contact support with your order number.
`.trim();

export const FAQS = [
  {
    q: "How do I register an account?",
    a: "Click the account icon, choose Register, and enter your name, email, password, and phone number. We email you a one-time verification code — enter it to activate your account.",
  },
  {
    q: "I didn't receive my OTP / verification code.",
    a: "Check your spam folder first. You can request a new code after 60 seconds using 'Resend OTP'. Codes expire after 10 minutes and allow up to 5 attempts.",
  },
  {
    q: "How do I track my order?",
    a: "Go to the Track Order page and enter your order number along with the email or phone number you used at checkout. No login is required.",
  },
  {
    q: "What are your delivery stages?",
    a: "Order Placed, Processing, Manufacturing, Quality Check, Dispatch, then Delivered. You'll see a live timeline on the tracking page, and we email you whenever the status changes.",
  },
  {
    q: "Do you offer bulk / wholesale pricing?",
    a: "Yes, for bulk orders please contact our sales team directly via phone, email, or the Contact page for custom pricing and credit terms.",
  },
  {
    q: "What grades of TMT bars do you supply?",
    a: "We primarily supply Fe 500D TMT bars (high ductility, ideal for seismic zones) in multiple diameters, manufactured per IS 1786:2008. Check the Products page for current sizes and stock.",
  },
  {
    q: "Can I get a Mill Test Certificate (MTC)?",
    a: "Yes, every batch is mill-tested and an MTC can be provided with your order — mention it when placing your order or contact support afterward.",
  },
  {
    q: "How do I contact support?",
    a: "Use the Contact page, email sales@styrontsm.com, call +91 12345 67890, or use the WhatsApp button on any page for a quick chat.",
  },
];

/** Builds the FAQ section as a single string block for the LLM prompt. */
export function faqsAsText() {
  return FAQS.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");
}
