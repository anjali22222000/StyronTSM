import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import { apiFetch } from "../../lib/apiClient";
import { fmt } from "../../utils";

export default function SteelPriceTicker() {
  const [prices, setPrices] = useState([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/steel-prices")
      .then((res) => { if (!cancelled) setPrices(res.data || []); })
      .catch(() => {}); // ticker just stays empty on failure — rest of the page still works
    return () => { cancelled = true; };
  }, []);

  if (!prices.length) return null;

  // Duplicate the list so the marquee loops seamlessly.
  const loopItems = [...prices, ...prices];

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-navy-950 via-navy-900 to-navy-950 h-9">
      <div className="flex items-center h-full">
        <div className="hidden sm:flex items-center gap-1.5 bg-orange-500 text-white text-[11px] font-bold px-3 h-full z-10 shrink-0">
          <TrendingUp size={12} />
          LIVE PRICES
        </div>
        <div className="flex-1 overflow-hidden h-full flex items-center">
          <div className="flex w-max animate-ticker-scroll">
            {loopItems.map((p, i) => (
              <span key={`${p.id}-${i}`} className="flex items-center gap-2 px-5 text-xs text-steel-300 whitespace-nowrap shrink-0">
                <span className="w-1 h-1 rounded-full bg-orange-500/70" />
                <span className="font-semibold text-white">{p.label}</span>
                <span className="text-orange-400 font-bold">{fmt(p.price)}/{p.unit}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
