import { motion } from "framer-motion";

const SUPPORT_PHONE = "911234567890"; // matches Footer.jsx / About.jsx contact number, no spaces/plus for wa.me
const PREFILLED_MESSAGE = "Hello, I have a query regarding Styron TSM.";

/**
 * Fixed floating WhatsApp button. Rendered globally in App.jsx so it's visible
 * on every page without touching any existing layout/page component.
 */
export default function WhatsAppButton({ bottomOffset = 0 }) {
  const href = `https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent(PREFILLED_MESSAGE)}`;

  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on WhatsApp"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.4, type: "spring", stiffness: 260, damping: 20 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      style={{ bottom: `${20 + bottomOffset}px` }}
      className="fixed right-4 md:right-6 z-[60] w-13 h-13 md:w-14 md:h-14 rounded-full
                 bg-[#25D366] shadow-lg shadow-black/20 flex items-center justify-center
                 hover:shadow-xl transition-shadow"
    >
      <svg viewBox="0 0 32 32" className="w-7 h-7 md:w-8 md:h-8" fill="white" aria-hidden="true">
        <path d="M16.001 3C9.373 3 4 8.373 4 15.001c0 2.347.656 4.61 1.899 6.586L4 29l7.59-1.876a11.95 11.95 0 0 0 4.41.84h.001c6.628 0 12.001-5.373 12.001-12.001C28.002 8.373 22.63 3 16.001 3Zm0 21.6h-.001a9.55 9.55 0 0 1-4.87-1.334l-.349-.207-3.617.894.928-3.59-.227-.368a9.557 9.557 0 0 1-1.466-5.0c0-5.292 4.31-9.6 9.605-9.6 2.566 0 4.978 1 6.792 2.815a9.535 9.535 0 0 1 2.812 6.79c-.003 5.293-4.313 9.6-9.607 9.6Zm5.265-7.193c-.288-.144-1.706-.842-1.971-.938-.264-.096-.456-.144-.648.144-.192.288-.744.938-.912 1.13-.168.193-.336.217-.624.073-.288-.144-1.215-.448-2.314-1.428-.855-.762-1.432-1.704-1.6-1.992-.168-.288-.018-.444.126-.587.13-.129.288-.337.432-.505.144-.168.192-.288.288-.48.096-.193.048-.361-.024-.505-.072-.144-.648-1.562-.888-2.14-.234-.563-.472-.487-.648-.496l-.552-.01c-.192 0-.504.072-.768.36-.264.288-1.008.985-1.008 2.402 0 1.417 1.032 2.786 1.176 2.978.144.193 2.03 3.1 4.919 4.347.687.297 1.223.474 1.641.607.689.219 1.317.188 1.813.114.553-.083 1.706-.697 1.946-1.371.24-.673.24-1.25.168-1.371-.072-.12-.264-.193-.552-.337Z" />
      </svg>
    </motion.a>
  );
}
