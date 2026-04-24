import "../styles/App.css";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaWhatsapp } from "react-icons/fa";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { subscribeCarById } from "../firebase/cars";
import Navbar from "../components/Navbar";
import ProductGallery from "../components/ProductGallery";

const PLACEHOLDER_CAR_IMAGE = "/placeholder.png";
const RECENTLY_VIEWED_STORAGE_KEY = "car-rental-recently-viewed";
const WHATSAPP_NUMBER = "212781330622";
const DEFAULT_IMAGE_DESCRIPTIONS = [
  "Main car view",
  "Interior view",
  "Rear view",
  "Side view",
  "Dashboard",
];

function toStartOfDay(dateValue) {
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return null;
  }

  const nextDate = new Date(dateValue);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(dateValue, dayCount) {
  const normalizedDate = toStartOfDay(dateValue);
  if (!normalizedDate) {
    return null;
  }

  const nextDate = new Date(normalizedDate);
  nextDate.setDate(nextDate.getDate() + dayCount);
  return nextDate;
}

function formatDateForBooking(dateValue) {
  const normalizedDate = toStartOfDay(dateValue);
  if (!normalizedDate) {
    return "";
  }

  const year = normalizedDate.getFullYear();
  const month = String(normalizedDate.getMonth() + 1).padStart(2, "0");
  const day = String(normalizedDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parsePriceNumber(priceValue) {
  const normalized = String(priceValue ?? "0").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} DH`;
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

function getCarTypeLabel(brandValue) {
  const normalized = String(brandValue || "").trim().toLowerCase();

  if (normalized === "iphone") {
    return "Sedan";
  }

  if (normalized === "samsung") {
    return "SUV";
  }

  if (normalized === "xiaomi") {
    return "Luxury";
  }

  return String(brandValue || "Sedan");
}

function toGalleryImage(entry, index, carName) {
  const fallbackDescription = DEFAULT_IMAGE_DESCRIPTIONS[index] || `${carName || "Car"} view ${index + 1}`;

  if (typeof entry === "string") {
    return {
      url: entry,
      description: fallbackDescription,
    };
  }

  if (entry && typeof entry === "object") {
    const normalizedUrl = String(entry.url || entry.imageUrl || entry.src || "").trim() || PLACEHOLDER_CAR_IMAGE;

    return {
      url: normalizedUrl,
      description: String(entry.description || fallbackDescription),
    };
  }

  return {
    url: PLACEHOLDER_CAR_IMAGE,
    description: fallbackDescription,
  };
}

function normalizePublicProduct(product, fallbackId, ownerId) {
  const normalizedId = String(product?.id || fallbackId || "");
  const normalizedImages = Array.isArray(product?.images)
    ? product.images
      .map((entry) => {
        if (typeof entry === "string") {
          const url = entry.trim();
          return url ? { url } : null;
        }

        if (entry && typeof entry === "object") {
          const url = String(entry.url || entry.imageUrl || entry.src || "").trim();
          if (!url) {
            return null;
          }

          return {
            url,
            description: String(entry.description || ""),
          };
        }

        return null;
      })
      .filter(Boolean)
    : [];
  const fallbackImage = product?.imageUrl || PLACEHOLDER_CAR_IMAGE;
  const images = normalizedImages.length > 0 ? normalizedImages : [{ url: fallbackImage }];

  return {
    id: normalizedId,
    ownerId: String(product?.ownerId || ""),
    routeKey: normalizedId,
    name: String(product?.name || "Untitled car"),
    price: String(product?.price || "0"),
    oldPrice: String(product?.oldPrice || ""),
    description: String(product?.description || "No description provided yet."),
    brand: String(product?.brand || product?.category || "Unknown brand"),
    imageUrl: images[0]?.url || PLACEHOLDER_CAR_IMAGE,
    images,
    featured: Boolean(product?.featured),
    stock: product?.stock || "Available",
    createdAt: product?.createdAt || 0,
    updatedAt: product?.updatedAt || 0,
  };
}

const DetailSkeleton = memo(function DetailSkeleton() {
  return (
    <section className="storefront-detail-skeleton-shell" aria-live="polite">
      <div className="storefront-detail-hero-skeleton panel">
        <span className="storefront-skeleton-line long" />
        <span className="storefront-skeleton-line short" />
      </div>

      <div className="storefront-detail-layout panel storefront-detail-skeleton">
        <div className="storefront-skeleton-media storefront-detail-skeleton-media" />
        <div className="storefront-skeleton-body storefront-detail-skeleton-body">
          <span className="storefront-skeleton-pill" />
          <span className="storefront-skeleton-line medium" />
          <span className="storefront-skeleton-line short" />
          <span className="storefront-skeleton-line" />
          <span className="storefront-skeleton-line" />
          <span className="storefront-skeleton-line short" />
          <span className="storefront-skeleton-button" />
        </div>
      </div>
    </section>
  );
});

const BookingDateField = memo(function BookingDateField({
  label,
  selectedDate,
  onChange,
  onClear,
  minDate,
  startDate,
  endDate,
  selectsStart = false,
  selectsEnd = false,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleTodayClick = useCallback(() => {
    const todayDate = toStartOfDay(new Date());
    if (!todayDate) {
      return;
    }

    const boundedToday = minDate && todayDate < minDate ? minDate : todayDate;
    onChange(boundedToday);
    setIsOpen(false);
  }, [minDate, onChange]);

  const handleClearClick = useCallback(() => {
    onClear();
    setIsOpen(false);
  }, [onClear]);

  return (
    <label className="storefront-field">
      <span className="storefront-field-label">{label}</span>
      <div className="storefront-field-wrap storefront-field-wrap--datepicker">
        <DatePicker
          selected={selectedDate}
          onChange={(nextDate) => onChange(toStartOfDay(nextDate))}
          minDate={minDate}
          startDate={startDate}
          endDate={endDate}
          selectsStart={selectsStart}
          selectsEnd={selectsEnd}
          shouldCloseOnSelect
          onInputClick={() => setIsOpen(true)}
          onCalendarOpen={() => setIsOpen(true)}
          onCalendarClose={() => setIsOpen(false)}
          onClickOutside={() => setIsOpen(false)}
          open={isOpen}
          dateFormat="yyyy-MM-dd"
          placeholderText="YYYY-MM-DD"
          className="storefront-datepicker-input"
          calendarClassName="storefront-datepicker-calendar"
          popperClassName="storefront-datepicker-popper"
          showPopperArrow={false}
          dayClassName={(dayDate) => {
            const day = toStartOfDay(dayDate);
            if (!day) {
              return undefined;
            }

            if (startDate && endDate && day > startDate && day < endDate) {
              return "storefront-datepicker-day-in-range";
            }

            return undefined;
          }}
          calendarContainer={({ className, children }) => (
            <div className={`${className} storefront-datepicker-shell`}>
              {children}
              <div className="storefront-datepicker-actions">
                <button
                  type="button"
                  className="storefront-datepicker-action-btn"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleTodayClick}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="storefront-datepicker-action-btn is-clear"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={handleClearClick}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        />
      </div>
    </label>
  );
});

function ProductDetails() {
  const { ownerId, productId, id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingAddress, setBookingAddress] = useState("");
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const todayDate = useMemo(() => toStartOfDay(new Date()), []);

  // Auto-clear booking error message after 6 seconds
  useEffect(() => {
    if (!cartMessage) return undefined;
    const timer = window.setTimeout(() => setCartMessage(""), 6000);
    return () => window.clearTimeout(timer);
  }, [cartMessage]);

  useEffect(() => {
    setLoading(true);
    setError("");

    // Support both old route format /product/:ownerId/:productId and new /product/:id
    const carDocId = String(id || productId || "").trim();
    if (!carDocId) {
      setProduct(null);
      setLoading(false);
      return undefined;
    }

    const unsubscribe = subscribeCarById(
      carDocId,
      (carData) => {
        try {
          if (!carData) {
            setProduct(null);
            setLoading(false);
            return;
          }

          setProduct(normalizePublicProduct(carData, carDocId, ownerId));
          setLoading(false);
        } catch (processingError) {
          console.error("Failed to parse car details:", processingError);
          setProduct(null);
          setError("We could not process this car right now.");
          setLoading(false);
        }
      },
      (loadError) => {
        console.error("Failed to load car details:", loadError);
        setError("We could not load this car right now.");
        setProduct(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [id, ownerId, productId]);

  useEffect(() => {
    if (!product || typeof window === "undefined") {
      return;
    }

    const safeId = `${product.ownerId}__${product.id}`;

    try {
      const raw = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(current) ? current : [];
      const next = [safeId, ...list.filter((entryId) => entryId !== safeId)].slice(0, 12);
      window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(next));
    } catch (storageError) {
      console.error("Could not persist recently viewed cars:", storageError);
    }
  }, [product]);

  const productStock = useMemo(() => parseStockQuantity(product?.stock), [product?.stock]);
  const outOfStock = useMemo(() => isOutOfStock(product?.stock), [product?.stock]);
  const priceNumber = useMemo(() => parsePriceNumber(product?.price), [product?.price]);
  const minReturnDate = useMemo(() => {
    if (checkInDate) {
      return addDays(checkInDate, 1);
    }

    return addDays(todayDate, 1);
  }, [checkInDate, todayDate]);

  const handleCheckInChange = useCallback((nextDate) => {
    setCheckInDate(nextDate);
    setCheckOutDate((currentDate) => {
      if (!currentDate || !nextDate) {
        return currentDate;
      }

      return currentDate <= nextDate ? null : currentDate;
    });
  }, []);

  const handleCheckOutChange = useCallback((nextDate) => {
    setCheckOutDate(nextDate);
  }, []);

  const bookingDays = useMemo(() => {
    if (!checkInDate || !checkOutDate) {
      return 0;
    }

    const days = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [checkInDate, checkOutDate]);
  const bookingTotalPrice = useMemo(() => priceNumber * bookingDays, [priceNumber, bookingDays]);
  const hasInvalidDateRange = useMemo(() => {
    if (!checkInDate || !checkOutDate) {
      return false;
    }

    return checkOutDate <= checkInDate;
  }, [checkInDate, checkOutDate]);
  const handleBookOnWhatsApp = useCallback(() => {
    if (!bookingName.trim()) {
      setCartMessage("Please enter your name.");
      return;
    }
    if (!bookingPhone.trim()) {
      setCartMessage("Please enter your phone number.");
      return;
    }
    if (!checkInDate) {
      setCartMessage("Please select a pick-up date.");
      return;
    }
    if (!checkOutDate) {
      setCartMessage("Please select a return date.");
      return;
    }
    if (!bookingName || !bookingPhone || !checkInDate || !checkOutDate) {
      setCartMessage("Please fill all fields");
      return;
    }
    if (checkOutDate <= checkInDate) {
      setCartMessage("Return date must be after pick-up date.");
      return;
    }
    if (bookingTotalPrice <= 0) {
      setCartMessage("Select dates first to calculate total price.");
      return;
    }

    setCartMessage("");

    const totalLine = bookingTotalPrice > 0
      ? `\n\n💵 Total: ${formatCurrency(priceNumber)} x ${bookingDays} day${bookingDays > 1 ? "s" : ""} = ${formatCurrency(bookingTotalPrice)}`
      : "";

    const message = `Hello, I want to book this car:\n\n🚗 Car: ${product?.name || "Car"}\n💰 Price per day: ${formatCurrency(priceNumber)}\n\n👤 Full name: ${bookingName.trim()}\n📞 Phone: ${bookingPhone.trim()}\n📍 Delivery address: ${bookingAddress.trim() || "-"}\n🗓 Rental dates: ${formatDateForBooking(checkInDate)} → ${formatDateForBooking(checkOutDate)}${totalLine}\n\nPlease confirm availability.`;

    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }, [bookingAddress, bookingDays, bookingName, bookingPhone, bookingTotalPrice, checkInDate, checkOutDate, priceNumber, product?.name]);

  if (loading) {
    return (
      <main className="storefront-shell">
        <Navbar compact />
        <DetailSkeleton />
      </main>
    );
  }

  if (error) {
    return (
      <main className="storefront-shell">
        <section className="storefront-state panel" aria-live="polite">
          <p className="storefront-state-icon">!</p>
          <h2>Unable to load car</h2>
          <p>{error}</p>
          <Link className="ghost-btn storefront-secondary-btn" to="/">
            Back to car rental
          </Link>
        </section>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="storefront-shell">
        <section className="storefront-state panel" aria-live="polite">
          <h2>Car not found</h2>
          <p>The item may have been removed or is no longer published.</p>
          <Link className="ghost-btn storefront-secondary-btn" to="/">
            Back to car rental
          </Link>
        </section>
      </main>
    );
  }

  const carTypeLabel = getCarTypeLabel(product.brand);
  const stockLabel = outOfStock
    ? "Out of stock"
    : productStock !== null && productStock < 5
      ? `Only ${productStock} left`
      : "In stock";
  const galleryImages = (Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.imageUrl || PLACEHOLDER_CAR_IMAGE])
    .map((entry, index) => toGalleryImage(entry, index, product.name));
  const shortDescription = String(product.description || "No description provided yet.").trim();
  const hasLongDescription = shortDescription.length > 150;
  const visibleDescription = isDescriptionExpanded || !hasLongDescription
    ? shortDescription
    : `${shortDescription.slice(0, 150)}...`;
  const isBookingDisabled = !bookingName.trim() || !bookingPhone.trim() || !checkInDate || !checkOutDate || hasInvalidDateRange || outOfStock;

  return (
    <motion.main
      className="storefront-shell storefront-detail-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Navbar compact />

      <section className="storefront-detail-breadcrumbs">
        <Link className="ghost-btn storefront-secondary-btn storefront-back-btn" to="/">
          ← Back to car rental
        </Link>
        <Link to="/">Car Rental</Link>
        <span>/</span>
        <span>{product.name}</span>
      </section>

      <section className="car-details-airbnb__hero">
        <h1 className="car-details-airbnb__hero-title">{product.name}</h1>
        <p className="car-details-airbnb__hero-price">{formatCurrency(priceNumber)} / day</p>
      </section>

      <section className="storefront-detail-layout car-details-airbnb car-details-container panel">
        <div className="storefront-detail-left car-gallery car-details-airbnb__left car-details-left">
          <div className="car-details-airbnb__gallery-wrap">
            <ProductGallery
              images={galleryImages}
              productName={product.name}
              placeholderImage={PLACEHOLDER_CAR_IMAGE}
              enableFullscreen
              enableZoom
              showNavigation
            />
          </div>
        </div>

        <aside className="storefront-booking-card panel car-details-airbnb__right car-details-right" aria-label="Booking card">
          <div className="storefront-booking-head car-details-airbnb__info">
            <h2 className="car-details-airbnb__name">Reserve Your Car</h2>
            <p className="car-details-airbnb__subline">Confirmed via WhatsApp</p>
            <span className={`car-details-airbnb__availability-pill ${outOfStock ? "is-out" : "is-in"}`}>
              {outOfStock ? "Unavailable" : "Available Now"}
            </span>
            <div className="storefront-detail-panel car-details-airbnb__meta">
              <div>
                <span>Availability</span>
                <strong className={`storefront-stock-state ${outOfStock ? "is-out" : "is-in"}`}>{stockLabel}</strong>
              </div>
              <div>
                <span>Car type</span>
                <strong>{carTypeLabel}</strong>
              </div>
            </div>
          </div>

          <div className="storefront-booking-inputs" aria-label="Car booking details">
            <label className="storefront-field">
              <span className="storefront-field-label">Full name</span>
              <div className="storefront-field-wrap">
                <span className="storefront-field-icon" aria-hidden="true">👤</span>
                <input
                  type="text"
                  value={bookingName}
                  onChange={(event) => setBookingName(event.target.value)}
                  placeholder="Your full name"
                />
              </div>
            </label>
            <label className="storefront-field">
              <span className="storefront-field-label">Phone number</span>
              <div className="storefront-field-wrap">
                <span className="storefront-field-icon" aria-hidden="true">📞</span>
                <input
                  type="tel"
                  value={bookingPhone}
                  onChange={(event) => setBookingPhone(event.target.value)}
                  placeholder="+212..."
                />
              </div>
            </label>
            <label className="storefront-field">
              <span className="storefront-field-label">Delivery address</span>
              <div className="storefront-field-wrap">
                <span className="storefront-field-icon" aria-hidden="true">📍</span>
                <input
                  type="text"
                  value={bookingAddress}
                  onChange={(event) => setBookingAddress(event.target.value)}
                  placeholder="Street, city, area"
                />
              </div>
            </label>
            <div className="storefront-date-row">
              <BookingDateField
                label="Pick-up date"
                selectedDate={checkInDate}
                onChange={handleCheckInChange}
                onClear={() => {
                  setCheckInDate(null);
                  setCheckOutDate(null);
                }}
                minDate={todayDate}
                startDate={checkInDate}
                endDate={checkOutDate}
                selectsStart
              />

              <BookingDateField
                label="Return date"
                selectedDate={checkOutDate}
                onChange={handleCheckOutChange}
                onClear={() => setCheckOutDate(null)}
                minDate={minReturnDate || undefined}
                startDate={checkInDate}
                endDate={checkOutDate}
                selectsEnd
              />
            </div>

            {checkInDate && checkOutDate ? (
              <p className="storefront-selected-range">
                Selected: {formatDateForBooking(checkInDate)} → {formatDateForBooking(checkOutDate)}
              </p>
            ) : null}
          </div>

          <div className="storefront-booking-total" aria-live="polite">
            <span>Total price</span>
            <strong>{bookingDays > 0 ? formatCurrency(bookingTotalPrice) : "Select dates"}</strong>
            {bookingDays > 0 ? <small>{`${formatCurrency(priceNumber)} x ${bookingDays} day${bookingDays > 1 ? "s" : ""} = ${formatCurrency(bookingTotalPrice)}`}</small> : null}
            {hasInvalidDateRange ? <small className="storefront-range-error">End date must be after start date.</small> : null}
          </div>

          {/* Inline error — placed directly above the action buttons so it is always visible */}
          {cartMessage ? (
            <div className="booking-inline-error" role="alert" aria-live="polite">
              <span aria-hidden="true">⚠</span>
              {cartMessage}
            </div>
          ) : null}

          <div className="storefront-detail-actions">
            <button
              type="button"
              className="storefront-whatsapp-btn"
              onClick={handleBookOnWhatsApp}
              disabled={isBookingDisabled}
            >
              {outOfStock ? "Unavailable" : <><FaWhatsapp aria-hidden="true" /> Book on WhatsApp</>}
            </button>
          </div>
        </aside>

        <section className="car-details-airbnb__description-block panel" aria-label="Car description">
          <h2>Description</h2>
          <p className="storefront-detail-description car-details-airbnb__description">{visibleDescription}</p>
          {hasLongDescription ? (
            <button
              type="button"
              className="car-details-airbnb__description-toggle"
              onClick={() => setIsDescriptionExpanded((prev) => !prev)}
            >
              {isDescriptionExpanded ? "Show less" : "Read more..."}
            </button>
          ) : null}
        </section>
      </section>

    </motion.main>
  );
}

export default ProductDetails;