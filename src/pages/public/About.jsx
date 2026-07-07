import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react";

export function About() {
  return (
    <div>
      <div className="bg-navy-950 py-16 text-center">
        <div className="container">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-3">About Us</p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-4">25 Years of Steel Excellence</h1>
          <p className="text-steel-400 max-w-2xl mx-auto">India's trusted steel reinforcement manufacturer — delivering quality, reliability, and innovation to the construction industry since 1999.</p>
        </div>
      </div>
      <div className="container section">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <p className="section-label">Our Story</p>
            <h2 className="section-title mb-4">Built on trust, quality, and Indian engineering</h2>
            <p className="text-steel-600 leading-relaxed mb-4">Founded in 1999, Styron TSM began as a small rolling mill in Maharashtra. Over 25 years, we've grown into one of India's leading steel reinforcement manufacturers, with a monthly production capacity of 500 metric tonnes.</p>
            <p className="text-steel-600 leading-relaxed mb-6">We manufacture TMT bars, structural steel sections, wire products, and steel pipes — all certified to BIS standards and tested in our in-house metallurgical laboratory.</p>
            <Link to="/products" className="btn-orange">Explore Products <ArrowRight size={15} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[["25+","Years Experience"],["500 MT","Monthly Capacity"],["5,000+","Projects Done"],["ISO 9001","Certified"]].map(([v,l]) => (
              <div key={l} className="card p-6 text-center">
                <p className="text-3xl font-black text-orange-500">{v}</p>
                <p className="text-steel-500 text-sm mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


export function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const API =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch(`${API}/contacts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("✅ Message sent successfully");

        setForm({
          name: "",
          email: "",
          phone: "",
          message: "",
        });
      } else {
        setStatus(`❌ ${data.message}`);
      }
    } catch (error) {
      console.error(error);
      setStatus("❌ Failed to send message");
    }

    setLoading(false);
  };

  return (
    <div>
      <div className="bg-navy-950 py-12 text-center">
        <div className="container">
          <p className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-2">
            Contact Us
          </p>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Get in Touch
          </h1>
        </div>
      </div>

      <div className="container py-12 max-w-4xl">
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="card p-6">
            <h2 className="font-bold text-navy-950 text-lg mb-5">
              Send a Message
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="form-input mt-1"
                  required
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="form-input mt-1"
                  required
                />
              </div>

              <div>
                <label className="form-label">Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="form-input mt-1"
                />
              </div>

              <div>
                <label className="form-label">Message</label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  className="form-input mt-1 min-h-[120px]"
                  required
                />
              </div>

              {status && (
                <div className="text-sm font-medium">
                  {status}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-orange w-full justify-center py-3"
              >
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Phone,
                label: "Phone",
                val: "+91 12345 67890",
                href: "tel:+911234567890",
              },
              {
                icon: Mail,
                label: "Email",
                val: "sales@styrontsm.com",
                href: "mailto:sales@styrontsm.com",
              },
              {
                icon: MapPin,
                label: "Address",
                val: "Industrial Area, City, State 400001, India",
                href: "#",
              },
            ].map(({ icon: Icon, label, val, href }) => (
              <a
                key={label}
                href={href}
                className="card-hover p-5 flex items-start gap-4 block"
              >
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={18} className="text-orange-500" />
                </div>

                <div>
                  <p className="font-bold text-navy-950 text-sm">
                    {label}
                  </p>
                  <p className="text-steel-500 text-sm mt-0.5">
                    {val}
                  </p>
                </div>
              </a>
            ))}

            <div className="card p-5">
              <p className="font-bold text-navy-950 text-sm mb-3">
                Business Hours
              </p>

              <div className="space-y-1.5 text-sm text-steel-600">
                <div className="flex justify-between">
                  <span>Monday – Saturday</span>
                  <span className="font-semibold">
                    9:00 AM – 6:00 PM
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="font-semibold text-red-500">
                    Closed
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-20 h-20 bg-navy-950 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-orange-500 font-black text-2xl">404</span>
        </div>
        <h1 className="text-3xl font-black text-navy-950 mb-2 tracking-tight">Page not found</h1>
        <p className="text-steel-500 mb-8 max-w-sm mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="btn-primary">Go Home</Link>
          <Link to="/products" className="btn-outline">Browse Products</Link>
        </div>
      </div>
    </div>
  );
}

export default About;
