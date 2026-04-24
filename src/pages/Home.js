import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaBolt,
  FaCar,
  FaCheckCircle,
  FaComments,
  FaCreditCard,
  FaLock,
  FaTags,
} from "react-icons/fa";
import { subscribeAllCars } from "../firebase/cars";
import { useAuth } from "../contexts/AuthContext";
import ContactSection from "../components/ContactSection";

const HERO_BG =
  "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2200&q=80";

/* ── responsive styles injected once ── */
const PLACEHOLDER = "/placeholder.png";

const WHY_ITEMS = [
  { icon: FaBolt, title: "Instant Booking", text: "Reserve your car in under 60 seconds — no paperwork." },
  { icon: FaCheckCircle, title: "Verified Fleet", text: "Every car is verified for quality and safety standards." },
  { icon: FaTags, title: "Best Rates", text: "Transparent daily pricing with zero hidden fees." },
  { icon: FaCreditCard, title: "TPE Payment Available", text: "Pay securely via TPE upon delivery — fast, safe, and reliable." },
  { icon: FaComments, title: "24/7 Support", text: "Our team is available on WhatsApp around the clock." },
  { icon: FaLock, title: "Secure Checkout", text: "Protected booking flow — your data stays private." },
];

function useHomeCars() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeAllCars(
      (cars) => {
        // Normalise images so we always work with URL strings
        const normalised = cars.map((car) => ({
          ...car,
          imageUrl: (() => {
            const firstImg = Array.isArray(car.images) ? car.images[0] : null;
            if (typeof firstImg === "string") return firstImg || car.imageUrl;
            if (firstImg && typeof firstImg === "object") return firstImg.url || car.imageUrl;
            return car.imageUrl;
          })(),
        }));
        setCars(normalised.slice(0, 6));
        setLoading(false);
      },
      () => { setCars([]); setLoading(false); }
    );
    return () => unsub();
  }, []);

  return { cars, loading };
}

const HOME_CSS = `
  .home-wrap {
    --bg: #0b0b0b;
    --surface: #111111;
    --accent: #ff2c2c;
    --accent-dark: #c91d1d;
    --text: #ffffff;
    --muted: rgba(255,255,255,0.66);
    --muted-soft: rgba(255,255,255,0.46);
    --container-pad: clamp(24px, 5vw, 48px);
    background: var(--bg);
    color: var(--text);
    font-family: "Segoe UI", "Inter", sans-serif;
    min-height: 100vh;
  }

  /* Navbar */
  .home-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 50;
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px var(--container-pad);
    background: rgba(11,11,11,0.86);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
    transition: background 0.3s ease, border-color 0.3s ease;
  }
  .home-nav-brand {
    text-decoration: none; font-weight: 800; font-size: 1.25rem;
    color: #fff; letter-spacing: -0.02em;
  }
  .home-nav-links { display: flex; align-items: center; gap: 22px; }
  .home-nav-link {
    color: var(--muted); text-decoration: none;
    font-size: 0.88rem; font-weight: 500;
    letter-spacing: 0.01em;
    border: none;
    background: transparent;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.2s ease, transform 0.2s ease;
  }
  .home-nav-link:hover { color: var(--accent); transform: translateY(-1px); }
  .home-nav-link.is-active {
    color: var(--accent);
  }
  .home-nav-cta {
    padding: 10px 22px; border-radius: 999px;
    background: var(--accent);
    color: #fff !important; font-weight: 700;
    box-shadow: 0 8px 20px rgba(255,44,44,0.36);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
  }
  .home-nav-cta:hover {
    background: var(--accent-dark);
    transform: translateY(-2px) scale(1.02);
    box-shadow: 0 14px 28px rgba(255,44,44,0.5);
  }

  /* Hero */
  .home-hero {
    position: relative; overflow: hidden;
    height: 90vh;
    min-height: 90vh;
    width: 100%;
    display: flex;
    align-items: center;
  }  .home-hero::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 20%, rgba(255,44,44,0.15), transparent 65%);
    pointer-events: none;
    z-index: 2;
  }  .home-hero-bg {
    position: absolute; inset: -4%;
    background-size: cover; background-position: center;
    animation: cinematic-pan 14s ease-in-out alternate infinite;
    z-index: 0;
  }
  .home-hero-overlay {
    position: absolute; inset: 0; z-index: 1;
    background: linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.4));
  }
  .home-hero-content {
    position: relative; z-index: 2;
    width: 100%; max-width: 1200px;
    margin: 0 auto;
    padding: 120px var(--container-pad) 84px;
    box-sizing: border-box;
    display: grid;
    gap: 28px;
    justify-items: start;
    text-align: left;
  }
  .home-hero-copy { max-width: 620px; }
  .home-hero-title {
    font-size: clamp(2.6rem, 7.2vw, 5.2rem);
    font-weight: 800; letter-spacing: -0.035em;
    line-height: 1.06; margin: 0;
    text-shadow: 0 14px 32px rgba(0,0,0,0.5);
  }
  .home-hero-subtitle {
    font-size: clamp(1rem, 1.8vw, 1.18rem);
    color: rgba(255,255,255,0.85); margin: 16px 0 0;
    max-width: 480px;
    line-height: 1.6;
  }
  .home-cta-primary {
    padding: 14px 30px; border-radius: 12px;
    background: var(--accent);
    color: #fff; text-decoration: none; font-weight: 700;
    font-size: 0.95rem;
    box-shadow: 0 12px 30px rgba(255,44,44,0.38);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    display: inline-flex; align-items: center;
  }
  .home-cta-primary:hover {
    background: var(--accent-dark);
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 20px 40px rgba(255,44,44,0.54);
  }
  .home-cta-secondary {
    padding: 13px 28px; border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.2);
    color: #fff; text-decoration: none; font-weight: 600;
    font-size: 0.95rem;
    backdrop-filter: blur(8px);
    transition: background 0.3s ease, border-color 0.3s ease, color 0.3s ease;
    display: inline-flex; align-items: center;
  }
  .home-cta-secondary:hover {
    background: rgba(255,44,44,0.12);
    border-color: rgba(255,44,44,0.45);
    color: #fff;
  }

  /* Glass search */
  .home-search {
    margin-top: 4px;
    display: grid;
    grid-template-columns: repeat(2, minmax(170px, 1fr)) auto;
    align-items: end;
    gap: 12px;
    max-width: 760px;
    padding: 18px;
    border-radius: 16px;
    border: 1px solid rgba(255,255,255,0.2);
    background: linear-gradient(130deg, rgba(17,17,17,0.84), rgba(17,17,17,0.58));
    backdrop-filter: blur(24px) saturate(150%);
    box-shadow: 0 20px 50px rgba(0,0,0,0.42);
  }
  .home-search-field {
    display: flex; flex-direction: column; gap: 7px;
    padding: 10px 14px; border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.14);
    background: rgba(0,0,0,0.36);
    cursor: text;
  }
  .home-search-field:focus-within {
    border-color: rgba(255,44,44,0.58);
  }
  .home-search-label {
    color: rgba(255,255,255,0.72); font-size: 0.72rem;
    text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600;
    pointer-events: none;
  }
  .home-search-input {
    border: none; background: transparent; color: #fff;
    font-size: 0.92rem; font-family: inherit; width: 100%;
  }
  .home-search-input:focus { outline: none; }
  .home-search-input::placeholder { color: rgba(255,255,255,0.38); }
  .home-search-input[type="date"]::-webkit-calendar-picker-indicator {
    filter: invert(1); opacity: 0.85; cursor: pointer;
  }
  .home-search-btn {
    min-height: 56px; padding: 0 26px;
    border-radius: 12px; border: none;
    background: var(--accent);
    color: #fff; font-weight: 700; font-size: 0.95rem;
    font-family: inherit; cursor: pointer;
    box-shadow: 0 10px 26px rgba(255,44,44,0.4);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    white-space: nowrap;
  }
  .home-search-btn:hover {
    background: var(--accent-dark);
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 16px 34px rgba(255,44,44,0.52);
  }

  /* ── Section shell ── */
  .home-section {
    max-width: 1200px;
    margin: 0 auto;
    padding: 88px var(--container-pad);
    box-sizing: border-box;
  }
  .home-section-kicker {
    color: var(--accent); text-transform: uppercase; letter-spacing: 0.16em;
    font-size: 0.72rem; font-weight: 700; margin: 0 0 10px;
  }
  .home-section-title {
    font-size: clamp(1.8rem, 4vw, 2.9rem); font-weight: 800;
    letter-spacing: -0.03em; margin: 0 0 10px;
    color: #fff;
  }
  .home-section-sub { color: var(--muted-soft); font-size: 1rem; margin: 0; }
  .home-section-head {
    display: flex; align-items: flex-end; justify-content: space-between;
    flex-wrap: wrap; gap: 16px; margin-bottom: 48px;
  }

  /* ── Cars grid ── */
  .home-cars-section { background: #0b0b0b; }
  .home-cars-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 28px;
  }
  .home-car-card {
    border-radius: 16px; overflow: hidden;
    background: var(--surface);
    border: 1px solid rgba(255,255,255,0.07);
    box-shadow: 0 8px 32px rgba(0,0,0,0.45);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
    display: flex; flex-direction: column;
  }
  .home-car-card:hover {
    transform: translateY(-4px) scale(1.03);
    box-shadow: 0 24px 56px rgba(255,44,44,0.3);
    border-color: rgba(255,44,44,0.4);
  }
  .home-car-img-wrap {
    position: relative; aspect-ratio: 16/10; overflow: hidden;
  }
  .home-car-img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform 0.5s ease;
    display: block;
  }
  .home-car-card:hover .home-car-img { transform: scale(1.08); }
  .home-car-badge {
    position: absolute; top: 12px; left: 12px;
    background: var(--accent); color: #fff;
    font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; padding: 4px 11px; border-radius: 999px;
    backdrop-filter: blur(6px);
  }
  .home-car-badge.available {
    background: rgba(34,197,94,0.9);
  }
  .home-car-body { padding: 20px 22px 22px; display: flex; flex-direction: column; flex: 1; gap: 10px; }
  .home-car-type {
    color: var(--accent); font-size: 0.68rem;
    text-transform: uppercase; letter-spacing: 0.12em; font-weight: 700;
    margin: 0;
  }
  .home-car-name {
    font-size: 1.12rem; font-weight: 800; margin: 0;
    color: #fff; letter-spacing: -0.02em; line-height: 1.25;
  }
  .home-car-desc {
    font-size: 0.86rem; color: var(--muted-soft);
    line-height: 1.6; margin: 0; flex: 1;
  }
  .home-car-footer {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 12px; margin-top: 4px; padding-top: 14px;
    border-top: 1px solid rgba(255,255,255,0.07);
  }
  .home-car-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .home-car-price { display: flex; align-items: baseline; gap: 2px; }
  .home-car-price-cur { font-size: 0.85rem; color: rgba(255,255,255,0.6); font-weight: 600; }
  .home-car-price-amt {
    font-size: 1.55rem; font-weight: 800; color: #fff; letter-spacing: -0.03em;
  }
  .home-car-price-per {
    font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-left: 2px;
  }
  .home-car-btn {
    padding: 10px 22px; border-radius: 12px; border: none;
    background: var(--accent);
    color: #fff; font-weight: 700; font-size: 0.82rem;
    font-family: inherit; cursor: pointer;
    box-shadow: 0 8px 20px rgba(255,44,44,0.38);
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    text-decoration: none; display: inline-flex; align-items: center;
    white-space: nowrap;
  }
  .home-car-btn-secondary {
    padding: 10px 18px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.24);
    color: #ffffff;
    background: transparent;
    font-weight: 700;
    font-size: 0.82rem;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    transition: border-color 0.25s ease, background 0.25s ease;
  }
  .home-car-btn-secondary:hover {
    border-color: rgba(255,44,44,0.55);
    background: rgba(255,44,44,0.12);
  }
  .home-car-btn:hover {
    background: var(--accent-dark);
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 14px 28px rgba(255,44,44,0.56);
  }
  .home-cars-empty {
    grid-column: 1/-1; text-align: center;
    padding: 80px 24px; display: flex; flex-direction: column;
    align-items: center; gap: 12px;
  }
  .home-cars-empty-icon { font-size: 3rem; line-height: 1; }
  .home-cars-empty-title {
    font-size: 1.1rem; font-weight: 700; color: rgba(255,255,255,0.55); margin: 0;
  }
  .home-cars-empty-sub {
    font-size: 0.85rem; color: rgba(255,255,255,0.3); margin: 0;
  }
  .home-cars-see-all {
    margin-top: 52px; display: flex; justify-content: center;
  }
  .home-cars-see-all a {
    padding: 13px 30px; border-radius: 12px;
    border: 1px solid rgba(255,44,44,0.45); color: #fff;
    background: rgba(255,44,44,0.12);
    text-decoration: none; font-weight: 700; font-size: 0.92rem;
    transition: background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
  }
  .home-cars-see-all a:hover {
    background: rgba(255,44,44,0.2); color: #fff;
    box-shadow: 0 10px 28px rgba(255,44,44,0.3);
  }

  /* ── Why choose us ── */
  .home-why { background: #0d0d0d; }
  .home-why-grid {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }
  .home-why-card {
    padding: 28px 24px; border-radius: 18px;
    background: var(--surface);
    border: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(10px);
    transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
  }
  .home-why-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 18px 44px rgba(255,44,44,0.2);
    border-color: rgba(255,44,44,0.28);
  }
  .home-why-icon {
    font-size: 2rem; display: block; margin-bottom: 16px;
  }
  .home-why-title {
    font-size: 1rem; font-weight: 700; margin: 0 0 8px; color: #fff;
  }
  .home-why-text {
    font-size: 0.9rem; color: var(--muted-soft);
    margin: 0; line-height: 1.6;
  }

  /* ── Divider ── */
  .home-divider {
    width: 100%; height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,44,44,0.24), transparent);
    margin: 0;
  }

  /* ── Skeleton ── */
  .home-car-skeleton {
    border-radius: 20px; overflow: hidden;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
  }
  .home-car-skeleton-img {
    aspect-ratio: 16/10;
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 400% 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
  }
  .home-car-skeleton-body { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
  .home-car-skeleton-line {
    height: 12px; border-radius: 6px;
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 400% 100%;
    animation: skeleton-shimmer 1.6s ease-in-out infinite;
  }
  .home-car-skeleton-line.short { width: 45%; }
  .home-car-skeleton-line.long  { width: 78%; }
  @keyframes skeleton-shimmer {
    0%   { background-position: 100% 0; }
    100% { background-position: -100% 0; }
  }
  @keyframes cinematic-pan {
    0% { transform: scale(1.02); }
    100% { transform: scale(1.08); }
  }

  /* ── Responsive ── */
  @media (max-width: 1024px) {
    .home-cars-grid, .home-why-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 860px) {
    .home-hero-content { justify-items: center; text-align: center; }
    .home-hero-copy { max-width: 680px; }
    .home-hero-subtitle { margin-left: auto; margin-right: auto; }
    .home-search { grid-template-columns: 1fr; width: 100%; max-width: 560px; }
    .home-search-btn { grid-column: 1 / -1; }
  }
  @media (max-width: 640px) {
    .home-nav { padding: 14px 16px; }
    .home-nav-links { gap: 12px; }
    .home-nav-link { font-size: 0.78rem; }
    .home-nav-cta { padding: 8px 12px; }
    .home-search { grid-template-columns: 1fr; }
    .home-search-btn { grid-column: unset; }
    .home-hero-content { padding: 96px var(--container-pad) 72px; }
    .home-hero-title { font-size: clamp(2.1rem, 9.2vw, 2.8rem); }
    .home-cars-grid, .home-why-grid { grid-template-columns: 1fr; }
    .home-section { padding: 72px var(--container-pad); }
    .home-car-card:hover { transform: scale(1.02); }
  }
`;

const CARD_ANIM = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.5, ease: "easeOut" },
};

export default function Home() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isAuthorizedAdmin } = useAuth();
  const { cars, loading } = useHomeCars();

  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");

  function handleSearch(e) {
    e.preventDefault();
    navigate("/store");
  }

  function handleHomeBookNow() {
    navigate("/cars");
  }

  function handleContactClick() {
    const section = document.getElementById("contact-section");
    if (!section) {
      return;
    }

    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState({}, "", "#contact-section");
  }

  useEffect(() => {
    const shouldScroll = location.hash === "#contact-section";
    if (!shouldScroll) {
      return;
    }

    const timer = window.setTimeout(() => {
      const section = document.getElementById("contact-section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    let shouldScrollFromSession = false;

    try {
      shouldScrollFromSession = window.sessionStorage.getItem("scrollToContactSection") === "1";
      if (shouldScrollFromSession) {
        window.sessionStorage.removeItem("scrollToContactSection");
      }
    } catch {
      shouldScrollFromSession = false;
    }

    if (!shouldScrollFromSession) {
      return;
    }

    const timer = window.setTimeout(() => {
      const section = document.getElementById("contact-section");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, "", "#contact-section");
    }, 80);

    return () => window.clearTimeout(timer);
  }, []);

  function getCarImg(car) {
    if (Array.isArray(car?.images) && car.images[0]) {
      const img = car.images[0];
      return typeof img === "string" ? img : img?.url || PLACEHOLDER;
    }
    return car?.imageUrl || PLACEHOLDER;
  }

  function getCarPrice(car) {
    const n = parseFloat(String(car?.price ?? "").replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }

  return (
    <>
      <style>{HOME_CSS}</style>

      <div className="home-wrap">
        {/* ── Navbar ── */}
        <header className="home-nav">
          <Link to="/" className="home-nav-brand">BIZZINE CARS</Link>
          <nav className="home-nav-links">
            <Link to="/" className="home-nav-link">Home</Link>
            <Link to="/store" className="home-nav-link">Cars</Link>
            {isAuthenticated && isAuthorizedAdmin && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <Link to="/admin" className="home-nav-link">Admin</Link>
              </motion.div>
            )}
            <button
              type="button"
              className={`home-nav-link ${location.hash === "#contact-section" ? "is-active" : ""}`}
              onClick={handleContactClick}
            >
              Contact
            </button>
          </nav>
        </header>

        {/* ── Hero ── */}
        <section className="home-hero" aria-label="Car rental hero">
          <div
            className="home-hero-bg"
            style={{ backgroundImage: `url(${HERO_BG})` }}
            aria-hidden="true"
          />
          <div className="home-hero-overlay" aria-hidden="true" />

          <motion.div
            className="home-hero-content"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
          >
            <div className="home-hero-copy">
              <motion.h1
                className="home-hero-title"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.68 }}
              >
                Rent Your Dream Car
              </motion.h1>

              <motion.p
                className="home-hero-subtitle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.36 }}
              >
                Premium cars. Easy booking. Luxury experience.
              </motion.p>
            </div>

            {/* Glass search bar */}
            <motion.form
              className="home-search"
              onSubmit={handleSearch}
              aria-label="Search rental cars"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              <label className="home-search-field">
                <span className="home-search-label">Pick-up date</span>
                <input
                  type="date"
                  className="home-search-input"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                />
              </label>

              <label className="home-search-field">
                <span className="home-search-label">Return date</span>
                <input
                  type="date"
                  className="home-search-input"
                  min={pickupDate || undefined}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </label>

              <button type="submit" className="home-search-btn">
                Search Cars
              </button>
            </motion.form>
          </motion.div>
        </section>

        {/* ── Cars Section ── */}
        <div className="home-divider" />
        <div className="home-cars-section">
          <div className="home-section">
            <motion.div
              className="home-section-head"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div>
                <p className="storefront-section-kicker">Our Fleet</p>
                <h2 className="home-section-title">Featured Cars</h2>
              </div>
              <Link to="/store" className="home-cta-secondary" style={{ whiteSpace: "nowrap" }}>
                View All Cars
              </Link>
            </motion.div>

            <div className="home-cars-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="home-car-skeleton">
                    <div className="home-car-skeleton-img" />
                    <div className="home-car-skeleton-body">
                      <div className="home-car-skeleton-line short" />
                      <div className="home-car-skeleton-line long" />
                      <div className="home-car-skeleton-line short" />
                    </div>
                  </div>
                ))
              ) : cars.length === 0 ? (
                <div className="home-cars-empty">
                  <span className="home-cars-empty-icon"><FaCar /></span>
                  <p className="home-cars-empty-title">No cars available yet</p>
                  <p className="home-cars-empty-sub">Add your first car from the admin panel to get started.</p>
                </div>
              ) : (
                cars.map((car, i) => (
                  <motion.article
                    key={car.id}
                    className="home-car-card car-card"
                    initial={{ opacity: 0, y: 36 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ duration: 0.48, delay: i * 0.09, ease: "easeOut" }}
                  >
                    <div className="home-car-img-wrap">
                      <img
                        src={getCarImg(car)}
                        alt={car.name || "Car"}
                        className="home-car-img car-image"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.target.src = "/placeholder.png";
                        }}
                      />
                      <span className="home-car-badge available">Available</span>
                      {car.featured && <span className="home-car-badge" style={{ left: "auto", right: 12 }}>Featured</span>}
                    </div>
                    <div className="home-car-body car-info">
                      <p className="home-car-type">{car.brand || "Sedan"}</p>
                      <h3 className="home-car-name">{car.name || "Untitled"}</h3>
                      <p className="home-car-desc">
                        {car.description
                          ? car.description.slice(0, 88) + (car.description.length > 88 ? "…" : "")
                          : "Premium vehicle available for daily rental. Verified and ready to drive."}
                      </p>
                      <div className="home-car-footer">
                        <div className="home-car-price">
                          <span className="home-car-price-cur">$</span>
                          <span className="home-car-price-amt">{getCarPrice(car)}</span>
                          <span className="home-car-price-per">/ day</span>
                        </div>
                        <div className="home-car-actions">
                          <button
                            type="button"
                            className="home-car-btn btn-primary"
                            onClick={handleHomeBookNow}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))
              )}
            </div>

            <div className="home-cars-see-all">
              <Link to="/store">Browse Full Fleet →</Link>
            </div>
          </div>
        </div>

        {/* ── Why Choose Us ── */}
        <div className="home-divider" />
        <div className="home-why">
          <div className="home-section">
            <div className="home-section-head">
              <div>
                <p className="home-section-kicker">Why BIZZINE CARS</p>
                <h2 className="home-section-title">The smarter way to rent</h2>
                <p className="home-section-sub">Everything you need for a hassle-free experience</p>
              </div>
            </div>

            <div className="home-why-grid">
              {WHY_ITEMS.map((item, i) => {
                const WhyIcon = item.icon;

                return (
                  <motion.article
                    key={item.title}
                    className="home-why-card"
                    {...CARD_ANIM}
                    transition={{ ...CARD_ANIM.transition, delay: i * 0.08 }}
                  >
                    <span className="home-why-icon"><WhyIcon /></span>
                    <h3 className="home-why-title">{item.title}</h3>
                    <p className="home-why-text">{item.text}</p>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>

      </div>

      <ContactSection />
    </>
  );
}
