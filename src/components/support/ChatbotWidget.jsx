import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, User as UserIcon } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";

const SESSION_KEY = "styron_chat_session_id";
const HISTORY_KEY = "styron_chat_history";

function getOrCreateSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const WELCOME_MESSAGE = {
  role: "assistant",
  message:
    "Hi! I'm the Styron TSM assistant. Ask me about products, pricing, orders, delivery, or anything else — I'm happy to help.",
};

/**
 * Floating AI chatbot. Rendered globally in App.jsx, positioned just above the
 * WhatsApp button so neither overlaps. Doesn't touch any existing component.
 */
export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      return saved ? JSON.parse(saved) : [WELCOME_MESSAGE];
    } catch {
      return [WELCOME_MESSAGE];
    }
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const sessionIdRef = useRef(getOrCreateSessionId());
  const scrollRef = useRef(null);

  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
    } catch {
      // storage full or unavailable — non-critical, history just won't persist
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, open]);

  async function handleSend(e) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isTyping) return;

    setError(null);
    setMessages((prev) => [...prev, { role: "user", message: trimmed }]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await apiFetch("/chatbot/message", {
        method: "POST",
        body: JSON.stringify({ sessionId: sessionIdRef.current, message: trimmed }),
      });
      setMessages((prev) => [...prev, { role: "assistant", message: res.data.reply }]);
    } catch (err) {
      setError("Couldn't reach the assistant. Please try again, or use WhatsApp / the Contact page.");
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <>
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Open chat assistant"}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed right-4 md:right-6 bottom-[84px] md:bottom-[92px] z-[60] w-13 h-13 md:w-14 md:h-14
                   rounded-full bg-orange-500 shadow-lg shadow-black/20 flex items-center justify-center
                   hover:bg-orange-600 hover:shadow-xl transition-colors"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} className="text-white" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageCircle size={24} className="text-white" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[59] bottom-0 right-0 md:bottom-[152px] md:right-6
                       w-full h-full md:w-[380px] md:h-[560px] md:rounded-2xl
                       bg-white shadow-2xl flex flex-col overflow-hidden border border-steel-200"
          >
            {/* Header */}
            <div className="bg-navy-950 px-4 py-3.5 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <Bot size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">Styron TSM Assistant</p>
                  <p className="text-steel-400 text-[11px] leading-tight">Usually replies instantly</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="md:hidden text-steel-400 hover:text-white p-1"
                aria-label="Close chat"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-4 space-y-3 bg-steel-50">
              {messages.map((m, i) => (
                <ChatBubble key={i} role={m.role} message={m.message} />
              ))}
              {isTyping && <TypingBubble />}
              {error && (
                <p className="text-center text-xs text-red-500 bg-red-50 rounded-lg py-2 px-3">{error}</p>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="flex-shrink-0 border-t border-steel-200 bg-white p-3 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about products, orders, delivery…"
                className="flex-1 text-sm rounded-full border border-steel-200 px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                aria-label="Send message"
                className="w-10 h-10 flex-shrink-0 rounded-full bg-orange-500 text-white flex items-center
                           justify-center hover:bg-orange-600 disabled:opacity-40 disabled:hover:bg-orange-500 transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatBubble({ role, message }) {
  const isUser = role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? "bg-navy-950" : "bg-orange-500"
        }`}
      >
        {isUser ? <UserIcon size={12} className="text-white" /> : <Bot size={12} className="text-white" />}
      </div>
      <div
        className={`max-w-[78%] text-sm leading-relaxed px-3.5 py-2.5 rounded-2xl whitespace-pre-wrap ${
          isUser
            ? "bg-navy-950 text-white rounded-br-sm"
            : "bg-white text-steel-800 border border-steel-200 rounded-bl-sm"
        }`}
      >
        {message}
      </div>
    </div>
  );
}

function TypingBubble() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
        <Bot size={12} className="text-white" />
      </div>
      <div className="bg-white border border-steel-200 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-steel-400"
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </div>
  );
}
