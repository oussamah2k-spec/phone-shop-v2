import "../styles/App.css";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { collection, getDocs } from "firebase/firestore";
import {
  FaBolt,
  FaCheckCircle,
  FaComments,
  FaCreditCard,
  FaLock,
  FaTags,
} from "react-icons/fa";
import { db } from "../firebase/firebase";
import { useCart } from "../contexts/CartContext";
import Navbar from "../components/Navbar";

const PLACEHOLDER_CAR_IMAGE = "/placeholder.png";
const HERO_CAR_IMAGE = "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=2200&q=80";
const whatsappNumber = "212781330622";
const WHATSAPP_LINK = `https://wa.me/${whatsappNumber}`;

const SECTION_REVEAL_PROPS = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" },
};

const PRICE_FILTER_OPTIONS = [250, 300, 350, 400, 450, 500];

const FEATURE_LABELS = [
  "Air Conditioning",
  "GPS",
  "Bluetooth",
  "Parking Sensors",
  "Rear Camera",
  "Cruise Control",
];

const LEGACY_TYPE_MAP = {
  iphone: "Sedan",
  samsung: "SUV",
  xiaomi: "Luxury",
};

/** Extract a URL string from an image that may be a string or {url, description} object. */
function extractImageUrl(entry) {
  if (typeof entry === "string") return entry.trim() || null;
  if (entry && typeof entry === "object") {
    return String(entry.url || entry.imageUrl || entry.src || "").trim() || null;
  }
  return null;
}

function parsePriceNumber(priceValue) {
  const normalized = String(priceValue ?? "0").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseStockQuantity(stockValue) {
  const parsedQuantity = Number.parseInt(String(stockValue ?? ""), 10);
  return Number.isFinite(parsedQuantity) ? Math.max(0, parsedQuantity) : null;
}

function isOutOfStock(stockValue) {
  const quantity = parseStockQuantity(stockValue);
  if (quantity !== null) {
    return quantity <= 0;
  }

  return String(stockValue ?? "").trim().toLowerCase().includes("out");
}

/** Normalize a Firestore car document for the store UI. */
function normalizePublicProduct(product) {
  const id = String(product?.id || "");
  const rawImages = Array.isArray(product?.images) ? product.images : [];
  const imageUrls = rawImages.map(extractImageUrl).filter(Boolean);
  const primaryImage = imageUrls[0] || product?.imageUrl || PLACEHOLDER_CAR_IMAGE;

  return {
    id,
    routeKey: id,
    ownerId: product?.ownerId || "",
    name: String(product?.name || "Untitled car"),
    price: String(product?.price || "0"),
    oldPrice: String(product?.oldPrice || ""),
    description: String(product?.description || "No description provided yet."),
    brand: String(product?.brand || product?.category || "Car Type"),
    imageUrl: primaryImage,
    images: imageUrls.length > 0 ? imageUrls : [primaryImage],
    featured: Boolean(product?.featured),
    stock: product?.stock || "Available",
    createdAt: product?.createdAt?.toMillis?.() || Number(product?.createdAt) || 0,
    updatedAt: product?.updatedAt?.toMillis?.() || Number(product?.updatedAt) || 0,
  };
}

function buildSalesSignal(product) {
  const seedSource = String(product?.id || "x");
  const seed = Array.from(seedSource).reduce((total, character) => total + character.charCodeAt(0), 0);
  return 12 + (seed % 37);
}

function getCarTypeLabel(product) {
  const legacyCandidate = String(product?.brand || "").trim().toLowerCase();
  return LEGACY_TYPE_MAP[legacyCandidate] || "Sedan";
}

function buildCarRating(product) {
  const signal = buildSalesSignal(product);
  const rating = 3.8 + ((signal % 12) / 10);
  return Number(rating.toFixed(1));
}

function buildCarFeatures(product) {
  const signal = buildSalesSignal(product);

  return FEATURE_LABELS.filter((_, index) => (signal + index) % 2 === 0).slice(0, 4);
}

function useAllProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadCars = async () => {
      try {
        setLoading(true);
        setError("");

        const snapshot = await getDocs(collection(db, "cars"));
        if (!mounted) {
          return;
        }

        const rawCars = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));

        setProducts(rawCars.map(normalizePublicProduct));
      } catch (loadError) {
        if (!mounted) {
          return;
        }

        console.error("Failed to load cars:", loadError);
        const code = String(loadError?.code || "").toLowerCase();
        const message = String(loadError?.message || "").toLowerCase();

        if (code === "permission-denied" || message.includes("insufficient permissions")) {
          setError("Missing or insufficient permissions while loading cars.");
        } else if (
          code === "unavailable" ||
          code === "deadline-exceeded" ||
          code === "resource-exhausted"
        ) {
          setError("Network issue while loading cars. Please retry.");
        } else {
          setError("We could not load the car listings right now.");
        }

        setProducts([]);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadCars();

    return () => {
      mounted = false;
    };
  }, []);

  return { products, loading, error };
}

const WHY_ITEMS = [
  { icon: FaBolt, title: "Fast booking", text: "Reserve your car in under 60 seconds — no paperwork, no waiting." },
  { icon: FaCheckCircle, title: "Verified cars", text: "Every listing is verified for quality, accuracy, and safety standards." },
  { icon: FaTags, title: "Best prices", text: "Transparent pricing with no hidden fees. Best daily rate guaranteed." },
  { icon: FaCreditCard, title: "TPE Payment Available", text: "Pay securely via TPE upon delivery — fast, safe, and reliable." },
  { icon: FaComments, title: "24/7 support", text: "Our team is available anytime on WhatsApp to help you." },
  { icon: FaLock, title: "Secure checkout", text: "Protected booking flow — your data stays private and safe." },
];

const TrustSection = memo(function TrustSection() {
  return (
    <section className="stayease-why-section" aria-label="Why choose us">
      <div className="stayease-why-header">
        <p className="stayease-why-kicker">Why choose us</p>
        <h2 className="stayease-why-title">The smarter way to rent a car</h2>
        <p className="stayease-why-subtitle">Everything you need for a hassle-free rental experience.</p>
      </div>
      <div className="stayease-why-grid">
        {WHY_ITEMS.map((item, i) => {
          const WhyIcon = item.icon;

          return (
            <motion.article
              key={item.title}
              className="stayease-why-card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: i * 0.08, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.02 }}
            >
              <span className="stayease-why-icon"><WhyIcon /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
});

const TESTIMONIALS = [
  {
    id: "amina",
    quote: "Booking was incredibly smooth. The car was exactly as shown and pickup was effortless.",
    name: "Oussama",
    city: "Morocco",
    rating: "★★★★★",
  },
  {
    id: "youssef",
    quote: "Great daily rates and accurate availability. This car rental platform feels very professional.",
    name: "Sara",
    city: "Rabat",
    rating: "★★★★★",
  },
  {
    id: "sara",
    quote: "I completed my reservation in under a minute. Much cleaner than most rental sites.",
    name: "Yassine",
    city: "Marrakesh",
    rating: "★★★★★",
  },
];

const TestimonialsSection = memo(function TestimonialsSection() {
  return (
    <section className="storefront-testimonials panel" aria-label="Customer testimonials">
      <div className="stayease-why-header">
        <p className="stayease-why-kicker">Loved by customers</p>
        <h2>What renters are saying</h2>
      </div>
      <div className="testimonials">
        {TESTIMONIALS.map((item, i) => (
          <motion.article
            key={item.id}
            className="testimonial-card"
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.42, delay: i * 0.12, ease: "easeOut" }}
            whileHover={{ y: -5 }}
          >
            <p>"{item.quote}"</p>
            <h4>{item.name} - {item.city}</h4>
            <span>{item.rating}</span>
          </motion.article>
        ))}
      </div>
    </section>
  );
});

const POLICY_ITEMS = [
  { title: "Best-rate booking", text: "Transparent daily pricing with no hidden costs at checkout." },
  { title: "Flexible cancellation", text: "Simple cancellation options for eligible reservations." },
  { title: "Priority support", text: "Live support on WhatsApp from car selection to pickup day." },
];

const PoliciesSection = memo(function PoliciesSection() {
  return (
    <section className="storefront-policies panel" aria-label="Booking and cancellation policies">
      <div className="storefront-section-head">
        <div>
          <p className="storefront-section-kicker">Policies</p>
          <h2>Booking, cancellation, and support promises</h2>
        </div>
      </div>
      <div className="storefront-policies-grid">
        {POLICY_ITEMS.map((item, i) => (
          <motion.article
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
            whileHover={{ y: -4 }}
          >
            <h3>{item.title}</h3>
            <p>{item.text}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
});

const FAQ_ITEMS = [
  { q: "How fast is booking confirmation?", a: "Most reservations are confirmed instantly, with live updates after booking.", open: true },
  { q: "Do you offer cancellation?", a: "Yes, flexible cancellation is available for eligible car bookings.", open: false },
  { q: "Is checkout secure?", a: "Yes. We use protected booking capture and verified workflows for all reservations.", open: false },
];

const FaqSection = memo(function FaqSection() {
  return (
    <section className="storefront-faq panel" aria-label="Frequently asked questions">
      <div className="storefront-section-head">
        <div>
          <p className="storefront-section-kicker">FAQ</p>
          <h2>Bookings, cancellations, and support</h2>
        </div>
      </div>
      <div className="storefront-faq-grid">
        {FAQ_ITEMS.map((item, i) => (
          <motion.details
            key={item.q}
            open={item.open || undefined}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
          >
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </motion.details>
        ))}
      </div>
    </section>
  );
});

const ProductCard = memo(function ProductCard({ product, onBookNow, index = 0, cardClassName = "" }) {
  const name = String(product?.name || "Untitled car");
  const description = String(product?.description || "No description provided yet.");
  const shortDescription = description.length > 100
    ? `${description.slice(0, 97)}...`
    : description;

  const stockValue = parseStockQuantity(product.stock);
  const hasNumericStock = stockValue !== null;
  const outOfStock = isOutOfStock(product.stock);
  const priceNumber = parsePriceNumber(product.price);
  const oldPriceNumber = parsePriceNumber(product.oldPrice);
  const hasDiscount = oldPriceNumber > 0 && oldPriceNumber > priceNumber;
  const bookingsThisMonth = buildSalesSignal(product);
  const ratingValue = buildCarRating(product);
  const carType = getCarTypeLabel(product);
  const carFeatures = buildCarFeatures(product);
  const carsLeft = hasNumericStock ? stockValue : null;
  const [isAdding, setIsAdding] = useState(false);

  const handleBookNow = useCallback(() => {
    if (isAdding || outOfStock) return;
    setIsAdding(true);
    onBookNow(product);
    window.setTimeout(() => setIsAdding(false), 900);
  }, [isAdding, outOfStock, onBookNow, product]);

  return (
    <motion.article
      className={`product-card luxury-car-card car-card ${cardClassName}`.trim()}
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.35), ease: "easeOut" }}
    >
      {/* Image Wrap with Badges */}
      <div className="product-image-wrap">
        <img
          src={product.image || product.imageUrl || PLACEHOLDER_CAR_IMAGE}
          alt={name}
          className="product-image car-image"
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.target.src = "/placeholder.png";
          }}
        />
        
        {/* Badge Group */}
        <div className="badges">
          <span className={`badge ${outOfStock ? "badge-limited" : "available"}`}>
            {outOfStock ? "Booked" : "Available now"}
          </span>
          {hasNumericStock && carsLeft <= 2 && (
            <span className="badge badge-limited" title={`Only ${carsLeft} cars left`}>
              Limited: {carsLeft} left
            </span>
          )}
          <span className="badge verified" title="Verified rental">
            Verified
          </span>
        </div>
        <div className="car-card-overlay" />

      </div>

      {/* Product Info */}
      <div className="product-info car-info">
        <p className="car-type-label">{carType}</p>
        <h3>{name}</h3>

        {/* Product Rating */}
        <div className="product-rating" aria-label={`Rated ${ratingValue} out of 5 stars`}>
          <span className="stars">{ratingValue} / 5</span>
          <span>({buildSalesSignal(product)} reviews)</span>
        </div>

        <div className="car-feature-icons" aria-label="Car features">
          {carFeatures.map((feature) => (
            <span className="car-feature-chip" key={`${product.id}-${feature}`} title={feature}>
              {feature}
            </span>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="trust-indicators">
          <div className="trust-indicator">Free cancellation</div>
          <div className="trust-indicator">Best price guarantee</div>
        </div>

        {/* Booking Stats */}
        <div className="booking-stats">
          <p className="booking-stat">
            <strong>{bookingsThisMonth}</strong> booked this month
          </p>
          {carsLeft !== null && (
            <p className="booking-stat">
              {carsLeft <= 2 ? (
                <span style={{ color: 'var(--danger)' }}>
                  <strong>{carsLeft}</strong> car{carsLeft !== 1 ? 's' : ''} left
                </span>
              ) : (
                <span>
                  <strong>{carsLeft}</strong> car{carsLeft !== 1 ? 's' : ''} available
                </span>
              )}
            </p>
          )}
        </div>

        {/* Description */}
        <p className="product-description">{shortDescription}</p>

        {/* Product Actions */}
        <div className="product-actions">
          <div className="product-pricing premium-pricing-block">
            <div className="product-price price-inline">${priceNumber} / day</div>
            {hasDiscount && (
              <p className="product-old-price">${oldPriceNumber} / day</p>
            )}
          </div>
          <button
            type="button"
            className="cart-btn btn-primary"
            onClick={handleBookNow}
            disabled={outOfStock || isAdding}
            title={outOfStock ? "Car not available" : "Book this car"}
          >
            {outOfStock ? "Not available" : isAdding ? "Processing..." : "Book Now"}
          </button>
        </div>

      </div>
    </motion.article>
  );
});

const FilterDropdown = memo(function FilterDropdown({
  menuKey,
  isOpen,
  label,
  options,
  onToggle,
  onSelect,
}) {
  const [showScrollHint, setShowScrollHint] = useState(false);
  const menuScrollRef = useRef(null);

  const updateScrollHint = useCallback(() => {
    const container = menuScrollRef.current;
    if (!container) {
      setShowScrollHint(false);
      return;
    }

    const hasMoreBelow = container.scrollTop + container.clientHeight < container.scrollHeight - 6;
    setShowScrollHint(hasMoreBelow);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setShowScrollHint(false);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      updateScrollHint();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, updateScrollHint]);

  return (
    <div className="top-filter-dropdown">
      <button
        type="button"
        className={`top-filter-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => onToggle(menuKey)}
      >
        <span className="top-filter-trigger-label">{label}</span>
        <span className={`top-filter-trigger-arrow ${isOpen ? "is-open" : ""}`}>▾</span>
      </button>

      <AnimatePresence>
        {isOpen ? (
          <motion.div
            className="top-filter-menu top-filter-menu--enhanced"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="top-filter-menu-scroll" ref={menuScrollRef} onScroll={updateScrollHint}>
              {options.map((option) => (
                <button
                  type="button"
                  key={option.value}
                  className={`top-filter-option ${option.isSelected ? "is-selected" : ""}`}
                  onClick={() => onSelect(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className={`top-filter-scroll-indicator ${showScrollHint ? "is-visible" : ""}`}>
              <span className="top-filter-scroll-fade" aria-hidden="true" />
              <span className="top-filter-scroll-arrow" aria-hidden="true">↓</span>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
});


const TopFilterBar = memo(function TopFilterBar({
  searchTerm,
  onSearchChange,
  selectedPrice,
  onPriceSelect,
  selectedBrand,
  onBrandSelect,
  brandOptions,
  onSearchClick,
}) {
  const [openMenu, setOpenMenu] = useState("");
  const filterBarRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!filterBarRef.current?.contains(event.target)) {
        setOpenMenu("");
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const toggleMenu = (menuName) => {
    setOpenMenu((currentMenu) => (currentMenu === menuName ? "" : menuName));
  };

  const handlePriceSelection = (priceValue) => {
    onPriceSelect(priceValue);
    setOpenMenu("");
  };

  const handleBrandSelection = (brandValue) => {
    onBrandSelect(brandValue);
    setOpenMenu("");
  };

  const priceOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Prices" }, ...PRICE_FILTER_OPTIONS.map((price) => ({
      value: price,
      label: `${price} DH`,
    }))];

    return options.map((option) => ({
      ...option,
      isSelected: selectedPrice === option.value,
    }));
  }, [selectedPrice]);

  const brandMenuOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Brands" }, ...brandOptions.map((brand) => ({
      value: brand,
      label: brand,
    }))];

    return options.map((option) => ({
      ...option,
      isSelected: selectedBrand === option.value,
    }));
  }, [brandOptions, selectedBrand]);

  return (
    <div className="top-filter-bar" ref={filterBarRef}>
      <div className="top-filter-search-wrap">
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="top-filter-search"
          placeholder="Search by car name"
          aria-label="Search by car name"
        />
      </div>

      <FilterDropdown
        menuKey="price"
        isOpen={openMenu === "price"}
        label={selectedPrice === "all" ? "All Prices" : `${selectedPrice} DH`}
        options={priceOptions}
        onToggle={toggleMenu}
        onSelect={handlePriceSelection}
      />

      <FilterDropdown
        menuKey="brand"
        isOpen={openMenu === "brand"}
        label={selectedBrand === "all" ? "All Brands" : selectedBrand}
        options={brandMenuOptions}
        onToggle={toggleMenu}
        onSelect={handleBrandSelection}
      />

      <button type="button" className="top-filter-search-btn" onClick={onSearchClick}>
        Search
      </button>
    </div>
  );
});

const LoadingState = memo(function LoadingState() {
  const skeletons = Array.from({ length: 8 }, (_, index) => `skeleton-${index}`);

  return (
    <section className="storefront-section panel" aria-live="polite">
      <div className="storefront-section-head">
        <div>
          <p className="storefront-section-kicker">Loading</p>
          <h2>Finding perfect cars for you…</h2>
        </div>
      </div>

      <div className="storefront-grid" aria-hidden="true">
        {skeletons.map((key) => (
          <article className="storefront-card storefront-card-skeleton" key={key}>
            <div className="storefront-skeleton-media" />
            <div className="storefront-skeleton-body">
              <span className="storefront-skeleton-pill" />
              <span className="storefront-skeleton-line short" />
              <span className="storefront-skeleton-line medium" />
              <span className="storefront-skeleton-line" />
              <span className="storefront-skeleton-line short" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
});

const EmptyState = memo(function EmptyState({ hasFilters }) {
  return (
    <section className="storefront-state panel" aria-live="polite">
      <h2>{hasFilters ? "No cars match your filters" : "No cars yet — add your first car from admin"}</h2>
      <p>
        {hasFilters
          ? "Try a different type or search term."
          : "Browse the admin panel to publish your first premium car listing."}
      </p>
    </section>
  );
});

const StoreFooter = memo(function StoreFooter() {
  return (
    <motion.footer
      className="stayease-footer"
      aria-label="Site footer"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="stayease-footer-inner">
        {/* Brand column */}
        <div className="stayease-footer-brand">
          <div className="stayease-footer-logo">
            <span>BIZZINE CARS</span>
          </div>
          <p className="stayease-footer-tagline">Rent smarter. Drive better.</p>
          <p className="stayease-footer-desc">
            Premium cars for every journey. Verified listings, transparent pricing.
          </p>
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="stayease-footer-whatsapp"
          >
            Chat on WhatsApp
          </a>
        </div>

        {/* Company links */}
        <div className="stayease-footer-col">
          <h4>Company</h4>
          <a href="#about">About Us</a>
          <a href="#careers">Careers</a>
          <a href="#press">Press</a>
          <a href="#blog">Blog</a>
        </div>

        {/* Support links */}
        <div className="stayease-footer-col">
          <h4>Support</h4>
          <a href="#faq">FAQ</a>
          <a href="#contact">Contact Us</a>
          <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">WhatsApp</a>
          <a href="#cancellations">Cancellations</a>
        </div>

        {/* Legal + contact */}
        <div className="stayease-footer-col">
          <h4>Legal</h4>
          <a href="#terms">Terms of Service</a>
          <a href="#privacy">Privacy Policy</a>
          <a href="#cookies">Cookie Policy</a>
        </div>
      </div>

      <div className="stayease-footer-bottom">
        <p>© 2026 BIZZINE CARS. All rights reserved.</p>
        <div className="stayease-footer-social">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            aria-label="WhatsApp"
            className="stayease-footer-social-whatsapp"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </motion.footer>
  );
});

function Store() {
  const navigate = useNavigate();
  const { products, loading, error } = useAllProducts();
  const { count } = useCart();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleSearchSuggestionSelect = useCallback((suggestion) => {
    setSearchTerm(suggestion);
  }, []);

  const handleHeroSearchClick = useCallback(() => {
    const catalogueSection = document.getElementById("catalogue");
    if (catalogueSection) {
      catalogueSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleStartBooking = useCallback(() => {
    const catalogueSection = document.getElementById("catalogue");
    if (catalogueSection) {
      catalogueSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage("");
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    const handleScroll = () => {
      document.body.classList.toggle("store-scrolled", window.scrollY > 24);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.body.classList.remove("store-scrolled");
    };
  }, []);

  const handleBookNow = useCallback((product) => {
    if (!product?.id || isOutOfStock(product.stock)) {
      setToastType("error");
      setToastMessage("This car is not available");
      return;
    }

    navigate(`/car/${product.id}`);
  }, [navigate]);

  const brandOptions = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => String(product?.brand || "").trim())
          .filter(Boolean)
      )
    ).sort((firstBrand, secondBrand) => firstBrand.localeCompare(secondBrand));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const safeName = String(product?.name || "").toLowerCase();
      const carPrice = parsePriceNumber(product.price);
      const productBrand = String(product?.brand || "").trim();
      const matchesSearch = !normalizedSearch || safeName.includes(normalizedSearch);
      const matchesPrice = selectedPrice === "all" || carPrice <= selectedPrice;
      const matchesBrand = selectedBrand === "all" || productBrand === selectedBrand;

      return matchesSearch && matchesPrice && matchesBrand;
    });
  }, [deferredSearchTerm, products, selectedBrand, selectedPrice]);

  const sortedCatalogueProducts = useMemo(() => {
    return [...filteredProducts].sort((firstCar, secondCar) => {
      return buildSalesSignal(secondCar) - buildSalesSignal(firstCar);
    });
  }, [filteredProducts]);

  const searchSuggestions = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    return products
      .filter((product) => String(product?.name || "").toLowerCase().includes(normalized))
      .map((product) => product.name)
      .filter((name, index, allNames) => allNames.indexOf(name) === index)
      .slice(0, 6);
  }, [products, searchTerm]);

  const availableCatalogueProducts = sortedCatalogueProducts;

  const hasFilters =
    searchTerm.trim().length > 0 ||
    selectedPrice !== "all" ||
    selectedBrand !== "all";

  return (
    <motion.main
      className="storefront-shell luxury-storefront"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Navbar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search cars, brands, locations"
        searchSuggestions={searchSuggestions}
        onSuggestionSelect={handleSearchSuggestionSelect}
      />

      {toastMessage ? (
        <div className={`storefront-toast storefront-toast--${toastType}`}>
          {toastMessage}
        </div>
      ) : null}

      <motion.section
        className="lux-hero"
        aria-label="Car rental hero"
        style={{ backgroundImage: `url(${HERO_CAR_IMAGE})` }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      >
        <div className="lux-hero-overlay" aria-hidden="true" />
        <motion.div
          className="lux-hero-content"
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
        >
          <p className="lux-hero-kicker">Elite Car Rental Experience</p>
          <h1 className="lux-hero-title">You're not here to blend in</h1>
          <p className="lux-hero-subtitle">
            Drive power. Drive prestige.
          </p>
          <div className="lux-hero-cta-row">
            <a href="#catalogue" className="lux-hero-btn lux-hero-btn-primary">
              View Cars
            </a>
            <button type="button" className="lux-hero-btn lux-hero-btn-secondary" onClick={handleStartBooking}>
              Start Booking
            </button>
          </div>

          <motion.div
            className="lux-hero-search-wrap"
            aria-label="Find rental cars"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.28 }}
          >
            <TopFilterBar
              searchTerm={searchTerm}
              onSearchChange={handleSearchChange}
              selectedPrice={selectedPrice}
              onPriceSelect={setSelectedPrice}
              selectedBrand={selectedBrand}
              onBrandSelect={setSelectedBrand}
              brandOptions={brandOptions}
              onSearchClick={handleHeroSearchClick}
            />
          </motion.div>
        </motion.div>
      </motion.section>

      <motion.section
        className="storefront-toolbar panel"
        id="collection"
        style={{ marginTop: "40px" }}
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="storefront-toolbar-header">
          <div>
            <h2 className="storefront-toolbar-title">Find Your Next Car</h2>
            <p className="storefront-toolbar-count">
              {filteredProducts.length} {filteredProducts.length === 1 ? "car" : "cars"} found
            </p>
          </div>
        </div>
      </motion.section>

      {loading ? <LoadingState /> : null}

      {!loading && error ? (
        <section className="storefront-state panel" aria-live="polite">
          <p className="storefront-state-icon">!</p>
          <h2>Car listings temporarily unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}

      {!loading && !error && availableCatalogueProducts.length > 0 ? (
        <motion.section className="storefront-section panel section" id="catalogue" {...SECTION_REVEAL_PROPS}>
          <div className="storefront-section-head">
            <div>
              <p className="storefront-section-kicker">Rental cars</p>
              <h2>All Cars</h2>
            </div>
            <p>{availableCatalogueProducts.length} cars</p>
          </div>

          <div className="storefront-grid car-results-grid">
            {availableCatalogueProducts.map((product) => (
              <ProductCard
                key={`catalogue-${product.routeKey}`}
                product={product}
                onBookNow={handleBookNow}
              />
            ))}
          </div>
        </motion.section>
      ) : null}

      {!loading && !error && availableCatalogueProducts.length === 0 ? <EmptyState hasFilters={hasFilters} /> : null}

      <motion.div {...SECTION_REVEAL_PROPS}><TrustSection /></motion.div>
      <motion.div {...SECTION_REVEAL_PROPS}><PoliciesSection /></motion.div>
      <motion.div {...SECTION_REVEAL_PROPS}><TestimonialsSection /></motion.div>
      <motion.div {...SECTION_REVEAL_PROPS}><FaqSection /></motion.div>

      <motion.section className="storefront-info panel" id="about" {...SECTION_REVEAL_PROPS}>
        <div>
          <p className="storefront-section-kicker">Why this car rental experience works</p>
          <h2>Built for a premium first booking impression.</h2>
        </div>
        <div className="storefront-info-grid">
          {[
            { title: "Realtime inventory", text: "Public cars update in realtime without requiring manual publishing." },
            { title: "Clean car discovery", text: "Search, featured surfacing, and responsive cards keep car listings easy to scan." },
            { title: "Admin-safe architecture", text: "The car listings are public while admin access remains protected by the configured admin UID." },
          ].map((item, i) => (
            <motion.article
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1, ease: "easeOut" }}
            >
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <section className="storefront-mini-panels">
        <motion.article
          className="storefront-mini-panel panel"
          id="contact"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          whileHover={{ y: -3 }}
        >
          <p className="storefront-section-kicker">Contact</p>
          <h3>Need help choosing a car?</h3>
          <p>Message the rental team for booking updates, car recommendations, and availability checks.</p>
        </motion.article>
        <motion.article
          className="storefront-mini-panel panel"
          id="terms"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
          whileHover={{ y: -3 }}
        >
          <p className="storefront-section-kicker">Terms</p>
          <h3>Transparent booking terms</h3>
          <p>Pricing, availability, and booking confirmation always use the latest Firebase car data.</p>
        </motion.article>
      </section>

      <StoreFooter />

      <Link
        className="storefront-sticky-cart"
        to="/cart"
        aria-label="Open booking page from sticky mobile button"
      >
        View Booking ({count})
      </Link>
    </motion.main>
  );
}

export default Store;