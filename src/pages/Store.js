import "../styles/App.css";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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

const CATEGORY_LABEL_MAP = {
  iPhone: "Sedan",
  Samsung: "SUV",
  Xiaomi: "Luxury",
};

const ROOM_TYPE_OPTIONS = ["Sedan", "SUV", "Luxury"];

const PRICE_FILTER_OPTIONS = [
  { value: "all", label: "Any price" },
  { value: "0-120", label: "Up to $120" },
  { value: "121-220", label: "$121 - $220" },
  { value: "221+", label: "$221+" },
];

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

function getDisplayRoomType(brand) {
  return CATEGORY_LABEL_MAP[brand] || String(brand || "Sedan");
}

function buildRoomRating(product) {
  const signal = buildSalesSignal(product);
  const rating = 3.8 + ((signal % 12) / 10);
  return Number(rating.toFixed(1));
}

function buildRoomAmenities(product) {
  const signal = buildSalesSignal(product);
  const roomType = getDisplayRoomType(product?.brand);

  return {
    wifi: true,
    ac: signal % 2 === 0 || roomType === "Deluxe Room" || roomType === "Suite",
    breakfast: signal % 3 !== 0 || roomType === "Suite",
  };
}

function matchesPriceRange(price, selectedRange) {
  if (selectedRange === "all") {
    return true;
  }

  if (selectedRange === "0-120") {
    return price <= 120;
  }

  if (selectedRange === "121-220") {
    return price >= 121 && price <= 220;
  }

  if (selectedRange === "221+") {
    return price >= 221;
  }

  return true;
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
  const ratingValue = buildRoomRating(product);
  const filledStars = Math.max(1, Math.min(5, Math.round(ratingValue)));
  const ratingStars = `${"★".repeat(filledStars)}${"☆".repeat(5 - filledStars)}`;
  const roomType = getDisplayRoomType(product.brand);
  const roomsLeft = hasNumericStock ? stockValue : null;
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
            {outOfStock ? "Unavailable" : "Available"}
          </span>
          {hasNumericStock && roomsLeft <= 2 && (
            <span className="badge badge-limited" title={`Only ${roomsLeft} cars left`}>
              Limited: {roomsLeft} left
            </span>
          )}
          <span className="badge verified" title="Verified rental">
            Verified
          </span>
        </div>

      </div>

      {/* Product Info */}
      <div className="product-info car-info">
        <p className="room-type-label">{roomType}</p>
        <h3>{name}</h3>

        {/* Product Rating */}
        <div className="product-rating" aria-label={`Rated ${ratingValue} out of 5 stars`}>
          <span className="stars">{ratingStars}</span>
          <span>({buildSalesSignal(product)} reviews)</span>
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
          {roomsLeft !== null && (
            <p className="booking-stat">
              {roomsLeft <= 2 ? (
                <span style={{ color: 'var(--danger)' }}>
                  <strong>{roomsLeft}</strong> car{roomsLeft !== 1 ? 's' : ''} left
                </span>
              ) : (
                <span>
                  <strong>{roomsLeft}</strong> car{roomsLeft !== 1 ? 's' : ''} available
                </span>
              )}
            </p>
          )}
        </div>

        {/* Description */}
        <p className="product-description">{shortDescription}</p>

        {/* Product Actions */}
        <div className="product-actions">
          <div className="product-pricing">
            <p className="product-price-label">Price per day</p>
            <div className="product-price">
              <span className="product-price-currency">$</span>
              {priceNumber}
              <span className="product-price-period">/day</span>
            </div>
            {hasDiscount && (
              <p className="product-old-price">${oldPriceNumber}/day</p>
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


const FiltersSidebar = memo(function FiltersSidebar({
  priceRange,
  onPriceRangeChange,
  selectedRoomTypes,
  onToggleRoomType,
  minimumRating,
  onMinimumRatingChange,
  amenityFilters,
  onToggleAmenity,
}) {
  return (
    <aside className="hotel-filter-sidebar" aria-label="Car filters">
      <div className="hotel-filter-group">
        <h3>Price range</h3>
        <div className="hotel-filter-stack">
          {PRICE_FILTER_OPTIONS.map((option) => (
            <label key={option.value} className="hotel-filter-check">
              <input
                type="radio"
                name="price-range"
                checked={priceRange === option.value}
                onChange={() => onPriceRangeChange(option.value)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="hotel-filter-group">
        <h3>Room type</h3>
        <div className="hotel-filter-stack">
          {ROOM_TYPE_OPTIONS.map((roomType) => (
            <label key={roomType} className="hotel-filter-check">
              <input
                type="checkbox"
                checked={selectedRoomTypes.includes(roomType)}
                onChange={() => onToggleRoomType(roomType)}
              />
              <span>{roomType}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="hotel-filter-group">
        <h3>Rating</h3>
        <div className="hotel-filter-stack">
          <label className="hotel-filter-check">
            <input
              type="radio"
              name="rating-min"
              checked={minimumRating === 4}
              onChange={() => onMinimumRatingChange(4)}
            />
            <span>4+ stars</span>
          </label>
          <label className="hotel-filter-check">
            <input
              type="radio"
              name="rating-min"
              checked={minimumRating === 3}
              onChange={() => onMinimumRatingChange(3)}
            />
            <span>3+ stars</span>
          </label>
          <label className="hotel-filter-check">
            <input
              type="radio"
              name="rating-min"
              checked={minimumRating === 0}
              onChange={() => onMinimumRatingChange(0)}
            />
            <span>Any rating</span>
          </label>
        </div>
      </div>

      <div className="hotel-filter-group">
        <h3>Amenities</h3>
        <div className="hotel-filter-stack">
          <label className="hotel-filter-check">
            <input
              type="checkbox"
              checked={amenityFilters.wifi}
              onChange={() => onToggleAmenity("wifi")}
            />
            <span>WiFi</span>
          </label>
          <label className="hotel-filter-check">
            <input
              type="checkbox"
              checked={amenityFilters.ac}
              onChange={() => onToggleAmenity("ac")}
            />
            <span>AC</span>
          </label>
          <label className="hotel-filter-check">
            <input
              type="checkbox"
              checked={amenityFilters.breakfast}
              onChange={() => onToggleAmenity("breakfast")}
            />
            <span>Breakfast</span>
          </label>
        </div>
      </div>
    </aside>
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
  const [selectedBrand, setSelectedBrand] = useState("All");
  const [priceRange, setPriceRange] = useState("all");
  const [selectedRoomTypes, setSelectedRoomTypes] = useState([]);
  const [minimumRating, setMinimumRating] = useState(0);
  const [amenityFilters, setAmenityFilters] = useState({ wifi: false, ac: false, breakfast: false });
  const [sortBy, setSortBy] = useState("popular");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("success");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

  const handleBrandChange = useCallback((brand) => {
    setSelectedBrand(brand);
  }, []);

  const handleToggleRoomType = useCallback((roomType) => {
    setSelectedRoomTypes((currentTypes) => (
      currentTypes.includes(roomType)
        ? currentTypes.filter((entry) => entry !== roomType)
        : [...currentTypes, roomType]
    ));
  }, []);

  const handleToggleAmenity = useCallback((amenityKey) => {
    setAmenityFilters((currentAmenities) => ({
      ...currentAmenities,
      [amenityKey]: !currentAmenities[amenityKey],
    }));
  }, []);

  const handleSearchSuggestionSelect = useCallback((suggestion) => {
    setSearchTerm(suggestion);
  }, []);

  const handleHeroSearchSubmit = useCallback((event) => {
    event.preventDefault();

    if (pickupLocation.trim().length > 0) {
      setSearchTerm(pickupLocation.trim());
    }

    const catalogueSection = document.getElementById("catalogue");
    if (catalogueSection) {
      catalogueSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [pickupLocation]);

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
    const uniqueBrands = Array.from(new Set(products.map((product) => product.brand).filter(Boolean)));
    return ["All", ...uniqueBrands];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesBrand = selectedBrand === "All" || product.brand === selectedBrand;
      const safeName = String(product?.name || "").toLowerCase();
      const safeDescription = String(product?.description || "").toLowerCase();
      const roomType = getDisplayRoomType(product.brand);
      const roomRating = buildRoomRating(product);
      const roomAmenities = buildRoomAmenities(product);
      const roomPrice = parsePriceNumber(product.price);
      const matchesSearch =
        !normalizedSearch ||
        safeName.includes(normalizedSearch) ||
        safeDescription.includes(normalizedSearch);

      const matchesPrice = matchesPriceRange(roomPrice, priceRange);
      const matchesRoomType = selectedRoomTypes.length === 0 || selectedRoomTypes.includes(roomType);
      const matchesRating = minimumRating === 0 || roomRating >= minimumRating;
      const matchesAmenities = Object.entries(amenityFilters)
        .every(([amenityKey, isRequired]) => !isRequired || roomAmenities[amenityKey]);

      return matchesBrand && matchesSearch && matchesPrice && matchesRoomType && matchesRating && matchesAmenities;
    });
  }, [amenityFilters, deferredSearchTerm, minimumRating, priceRange, products, selectedBrand, selectedRoomTypes]);

  const sortedCatalogueProducts = useMemo(() => {
    return [...filteredProducts].sort((firstRoom, secondRoom) => {
      if (sortBy === "price") {
        return parsePriceNumber(firstRoom.price) - parsePriceNumber(secondRoom.price);
      }

      if (sortBy === "rating") {
        return buildRoomRating(secondRoom) - buildRoomRating(firstRoom);
      }

      return buildSalesSignal(secondRoom) - buildSalesSignal(firstRoom);
    });
  }, [filteredProducts, sortBy]);

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
    selectedBrand !== "All" ||
    priceRange !== "all" ||
    selectedRoomTypes.length > 0 ||
    minimumRating > 0 ||
    Object.values(amenityFilters).some(Boolean);

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

          <motion.form
            className="lux-hero-search"
            onSubmit={handleHeroSearchSubmit}
            aria-label="Find rental cars"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.28 }}
          >
            <label className="lux-search-field">
              <span>Pick-up date</span>
              <input
                type="date"
                value={pickupDate}
                onChange={(event) => setPickupDate(event.target.value)}
              />
            </label>

            <label className="lux-search-field">
              <span>Return date</span>
              <input
                type="date"
                min={pickupDate || undefined}
                value={returnDate}
                onChange={(event) => setReturnDate(event.target.value)}
              />
            </label>

            <label className="lux-search-field">
              <span>Location</span>
              <input
                type="text"
                value={pickupLocation}
                onChange={(event) => setPickupLocation(event.target.value)}
                placeholder="Casablanca, Rabat, Marrakech"
              />
            </label>

            <button type="submit" className="lux-search-submit">
              Search
            </button>
          </motion.form>
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
            <h2 className="storefront-toolbar-title">Available Cars</h2>
            <p className="storefront-toolbar-count">
              {filteredProducts.length} {filteredProducts.length === 1 ? "car" : "cars"} found
            </p>
          </div>

          <div className="storefront-toolbar-controls">
            <div className="storefront-brand-filters" role="group" aria-label="Filter cars by category">
              {brandOptions.map((brand) => (
                <motion.button
                  key={brand}
                  type="button"
                  className={`storefront-filter-btn ${selectedBrand === brand ? "active" : ""}`}
                  onClick={() => handleBrandChange(brand)}
                  aria-pressed={selectedBrand === brand}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {brand === "All" ? "All Cars" : (CATEGORY_LABEL_MAP[brand] || brand)}
                </motion.button>
              ))}
            </div>

            <label className="hotel-sort-select" aria-label="Sort cars">
              <span>Sort by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                <option value="price">Price low to high</option>
                <option value="rating">Rating</option>
                <option value="popular">Popular</option>
              </select>
            </label>
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
        <motion.section className="storefront-section panel hotel-catalog-layout section" id="catalogue" {...SECTION_REVEAL_PROPS}>
          <div className="storefront-section-head">
            <div>
              <p className="storefront-section-kicker">Rental cars</p>
              <h2>All Cars</h2>
            </div>
            <p>{availableCatalogueProducts.length} cars</p>
          </div>

          <div className="hotel-catalog-content">
            <FiltersSidebar
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              selectedRoomTypes={selectedRoomTypes}
              onToggleRoomType={handleToggleRoomType}
              minimumRating={minimumRating}
              onMinimumRatingChange={setMinimumRating}
              amenityFilters={amenityFilters}
              onToggleAmenity={handleToggleAmenity}
            />

            <div className="storefront-grid hotel-results-grid">
              {availableCatalogueProducts.map((product) => (
                <ProductCard
                  key={`catalogue-${product.routeKey}`}
                  product={product}
                  onBookNow={handleBookNow}
                />
              ))}
            </div>
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