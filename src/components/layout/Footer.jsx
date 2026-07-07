// Footer.jsx — Premium industrial design upgrade
import { Link, useNavigate } from "react-router-dom";
import { Phone, Mail, MapPin, Shield, Award, CheckCircle2, ExternalLink } from "lucide-react";
import { ADMIN_BASE_PATH } from "../../config/adminRoutes";

const CERTIFICATIONS = ["BIS Certified", "IS 1786:2008", "ISO 9001:2015", "IS 2062:2011"];

const NAV_COLUMNS = [
  {
    title: "Products",
    links: [
      { l: "TMT Bars", h: "/products?cat=tmt" },
      { l: "Structural Steel", h: "/products?cat=structural" },
      { l: "Wire Products", h: "/products?cat=wire" },
      { l: "Steel Pipes", h: "/products?cat=pipes" },
      { l: "All Products", h: "/products" },
    ],
  },
  {
    title: "Company",
    links: [
      { l: "About Us", h: "/about" },
      { l: "Contact Us", h: "/contact" },
      { l: "Track Order", h: "/track" },
    ],
  },
  {
    title: "Tools",
    links: [
      { l: "AI Steel Estimator", h: "/ai-estimator" },
      { l: "Request Quotation", h: "/quotation" },
    ],
  },
];

export function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="bg-navy-950 text-steel-400 mt-auto">

      {/* ── Premium CTA Banner ── */}
      <div className="relative overflow-hidden border-t border-white/5">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/15 via-transparent to-orange-600/5 pointer-events-none" />
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <p className="text-orange-400 text-xs font-bold uppercase tracking-widest">Ready to build?</p>
            </div>
            <h3 className="text-white font-black text-xl leading-tight">
              Get a quotation in under 2 minutes.
            </h3>
            <p className="text-steel-500 text-sm mt-1">AI-powered estimator · Instant pricing · 48h doorstep delivery</p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Link to="/ai-estimator"
              className="btn-orange px-6 py-3 font-bold shadow-orange">
              🧮 AI Estimator
            </Link>
            <Link to="/quotation"
              className="px-6 py-3 border border-white/15 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-all">
              Get Quote
            </Link>
          </div>
        </div>
      </div>

      {/* ── Certification trust strip ── */}
      <div className="border-t border-white/5 bg-white/[0.02] py-3">
        <div className="container flex flex-wrap items-center justify-center gap-4">
          {CERTIFICATIONS.map((c) => (
            <span key={c} className="flex items-center gap-1.5 text-xs text-steel-500 font-medium">
              <CheckCircle2 size={11} className="text-green-500" />
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ── Main footer grid ── */}
      <div className="container py-14">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Brand column */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shadow-orange">
                <span className="text-white font-black text-base">S</span>
              </div>
              <span className="text-white font-black text-lg tracking-tight">
                Styron <span className="text-orange-500">TSM</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-xs text-steel-500">
              India's trusted steel reinforcement manufacturer. Premium TMT bars,
              structural steel, and wire products — BIS certified, IS&nbsp;1786 compliant,
              shipped nationwide.
            </p>

            <div className="mt-6 space-y-3">
              <a href="tel:+911234567890"
                className="flex items-center gap-3 text-sm hover:text-white transition-colors group">
                <span className="w-7 h-7 bg-orange-500/10 group-hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                  <Phone size={12} className="text-orange-500 group-hover:text-white transition-colors" />
                </span>
                +91 12345 67890
              </a>
              <a href="mailto:sales@styrontsm.com"
                className="flex items-center gap-3 text-sm hover:text-white transition-colors group">
                <span className="w-7 h-7 bg-orange-500/10 group-hover:bg-orange-500 rounded-lg flex items-center justify-center transition-colors">
                  <Mail size={12} className="text-orange-500 group-hover:text-white transition-colors" />
                </span>
                sales@styrontsm.com
              </a>
              <span className="flex items-start gap-3 text-sm">
                <span className="w-7 h-7 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MapPin size={12} className="text-orange-500" />
                </span>
                Industrial Area, City, State 400001, India
              </span>
            </div>
          </div>

          {/* Nav columns */}
          {NAV_COLUMNS.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-white font-bold text-sm mb-4 flex items-center gap-2">
                <span className="w-1 h-4 bg-orange-500 rounded-full inline-block" />
                {title}
              </h4>
              <ul className="space-y-2.5">
                {links.map(({ l, h }) => (
                  <li key={l}>
                    <Link to={h}
                      className="text-sm hover:text-white hover:translate-x-0.5 transition-all inline-flex items-center gap-1 group">
                      {l}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="border-t border-white/[0.06]">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-steel-600">
            © {new Date().getFullYear()} Styron TSM Pvt. Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[10px] text-steel-600">
              <Award size={10} className="text-orange-500/60" /> Member, Steel Authority India
            </span>
            {/* Hidden admin entry — looks like a cert badge */}
            <button
              onClick={() => navigate(ADMIN_BASE_PATH)}
              className="text-white/[0.07] hover:text-white/25 transition-colors p-1 rounded"
              aria-label=""
              tabIndex={-1}
            >
              <Shield size={11} />
            </button>
          </div>
        </div>
      </div>

    </footer>
  );
}
