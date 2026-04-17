import "../styles/App.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { createBooking } from "../firebase/bookingService";
import Navbar from "../components/Navbar";
import { useCart } from "../contexts/CartContext";

const whatsappNumber = "212781330622";
const CHECKOUT_PLACEHOLDER_IMAGE = "/placeholder.png";

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function normalizeOrderItems(items) {
  return items.map((item) => ({
    id: item?.productId || item?.id || "",
    productId: item?.productId || item?.id || "",
    ownerId: item?.ownerId || "",
    name: item?.name || "Untitled car",
    price: item?.price || "0",
    qty: Number(item?.quantity || item?.qty || 1),
    image: item?.imageUrl || CHECKOUT_PLACEHOLDER_IMAGE,
    imageUrl: item?.imageUrl || CHECKOUT_PLACEHOLDER_IMAGE,
  }));
}

function getBookingDays(item) {
  const start = new Date(item?.checkInDate || "");
  const end = new Date(item?.checkOutDate || "");
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start) {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.ceil((end - start) / msPerDay));
  }

  return Math.max(1, Number(item?.qty || item?.quantity || 1));
}

function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    address: "",
    checkInDate: "",
    checkOutDate: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  useEffect(() => {
    if (items.length === 0) {
      navigate("/cart", { replace: true });
    }
  }, [items.length, navigate]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const summaryRows = useMemo(() => {
    return items.map((item) => {
      const days = getBookingDays(item);
      const pricePerDay = Number.parseFloat(String(item?.price || "0").replace(/[^0-9.]/g, "")) || 0;

      return {
        id: item?.id || item?.productId || `${item?.name || "car"}-${days}`,
        name: item?.name || "Untitled car",
        pricePerDay,
        days,
        lineTotal: pricePerDay * days,
      };
    });
  }, [items]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => {
      if (!prev[name]) {
        return prev;
      }

      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.customerName.trim()) {
      nextErrors.customerName = "Name is required";
    }

    if (!form.phone.trim()) {
      nextErrors.phone = "Phone is required";
    }

    if (!form.checkInDate) {
      nextErrors.checkInDate = "Pick-up date is required";
    }

    if (!form.checkOutDate) {
      nextErrors.checkOutDate = "Return date is required";
    }

    return nextErrors;
  };

  const handleCheckout = async () => {
    setSubmitError("");

    if (!form.customerName.trim() || !form.phone.trim() || !form.checkInDate || !form.checkOutDate) {
      toast.error("Please fill all required fields");
      return;
    }

    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    try {
      setSubmitting(true);
      const normalizedItems = normalizeOrderItems(items);
      const primaryCar = normalizedItems[0] || {};

      const bookingData = {
        carId: primaryCar.productId || primaryCar.id || "",
        carName: primaryCar.name || "Untitled car",
        image: primaryCar.image || primaryCar.imageUrl || CHECKOUT_PLACEHOLDER_IMAGE,
        price: Number.parseFloat(String(primaryCar.price || "0").replace(/[^0-9.]/g, "")) || 0,
        name: form.customerName.trim(),
        userName: form.customerName.trim(),
        startDate: form.checkInDate,
        endDate: form.checkOutDate,
        customerName: form.customerName.trim(),
        phone: form.phone.trim(),
        checkIn: form.checkInDate,
        checkOut: form.checkOutDate,
        address: form.address.trim(),
        status: "pending",
        source: "checkout",
        items: normalizedItems,
        totalPrice: Number(total) || 0,
        total: Number(total) || 0,
      };

      const bookingResult = await createBooking(bookingData);

      if (!bookingResult.success) {
        const nextError = bookingResult.error || "Could not place your order. Please try again.";
        toast.error(nextError);
        setSubmitError(nextError);
        return;
      }

      toast.success("Booking confirmed successfully 🚀");
      const createdOrderId = bookingResult.orderId || bookingResult.id || "";
      const createdBookingToken = bookingResult.bookingToken || "";
      clearCart();
      if (createdOrderId) {
        navigate(`/order/${encodeURIComponent(createdOrderId)}?token=${encodeURIComponent(createdBookingToken)}`, { replace: true });
      }
    } catch (error) {
      toast.error("Something went wrong ❌");
      setSubmitError("Could not place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWhatsAppBooking = () => {
    const name = form.customerName.trim();
    const phone = form.phone.trim();

    if (!name || !phone) {
      alert("Please enter your name and phone number first.");
      return;
    }

    const carName = items[0]?.name || "N/A";
    const pickupDate = form.checkInDate || "N/A";
    const returnDate = form.checkOutDate || "N/A";
    const totalPrice = Number.isFinite(Number(total)) ? Number(total).toFixed(2) : "0.00";

    const message = `Hello, I want to book a car:\n\nName: ${name}\nPhone: ${phone}\nCar: ${carName}\nPick-up: ${pickupDate}\nReturn: ${returnDate}\nTotal Price: $${totalPrice}`;
    const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.main
      className="storefront-shell checkout-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Navbar />

      <section className="checkout-page panel">
        <header className="checkout-head">
          <div>
            <p className="storefront-section-kicker">Secure checkout</p>
            <h1>Complete your reservation</h1>
          </div>
          <p>
            {itemCount} items • {formatMoney(total)}
          </p>
        </header>

        <div className="booking-container">
          {/* LEFT: CAR GALLERY & DETAILS */}
          <motion.div
            className="booking-gallery-section"
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <div className="gallery">
              {items.length > 0 && (
                <>
                  <motion.img
                    key={`main-${items[0]?.id}`}
                    src={items[0]?.imageUrl || CHECKOUT_PLACEHOLDER_IMAGE}
                    alt={items[0]?.name}
                    className="main-img"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    onError={(event) => {
                      event.target.src = "/placeholder.png";
                    }}
                  />
                </>
              )}
            </div>

            <div className="car-details">
              {items.length > 0 && (
                <>
                  <h3 className="car-details-title">{items[0]?.name}</h3>
                  <div className="car-meta">
                    <span className="meta-badge">Premium Rental</span>
                    <span className="meta-rating">★★★★★ (248 reviews)</span>
                  </div>
                  <p className="car-description">
                    Luxury rental experience with professional service, unlimited mileage, and 24/7 roadside assistance. Book with confidence.
                  </p>
                  <div className="car-pricing-summary">
                    <div className="pricing-row">
                      <span>Price per day:</span>
                      <strong>{formatMoney(items[0]?.price)}</strong>
                    </div>
                    <div className="pricing-row">
                      <span>Rental period:</span>
                      <strong>{getBookingDays(items[0])} days</strong>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* RIGHT: BOOKING CARD */}
          <motion.div
            className="booking-card-wrapper"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
          >
            <div className="booking-card">
              <h2 className="booking-card-title">Complete your booking</h2>

              <form
                id="checkout-form"
                className="checkout-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  handleCheckout();
                }}
                noValidate
              >
                {/* NAME */}
                <div className="input-group">
                  <label htmlFor="customerName">Full Name</label>
                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    value={form.customerName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    disabled={submitting}
                    autoComplete="name"
                    required
                  />
                  {errors.customerName && (
                    <span className="input-error">{errors.customerName}</span>
                  )}
                </div>

                {/* PHONE */}
                <div className="input-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    disabled={submitting}
                    autoComplete="tel"
                    required
                  />
                  {errors.phone && (
                    <span className="input-error">{errors.phone}</span>
                  )}
                </div>

                {/* DATE ROW */}
                <div className="date-row">
                  <div className="input-group">
                    <label htmlFor="checkInDate">Check-in Date</label>
                    <input
                      id="checkInDate"
                      name="checkInDate"
                      type="date"
                      value={form.checkInDate}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                    {errors.checkInDate && (
                      <span className="input-error">{errors.checkInDate}</span>
                    )}
                  </div>

                  <div className="input-group">
                    <label htmlFor="checkOutDate">Check-out Date</label>
                    <input
                      id="checkOutDate"
                      name="checkOutDate"
                      type="date"
                      value={form.checkOutDate}
                      onChange={handleChange}
                      disabled={submitting}
                    />
                    {errors.checkOutDate && (
                      <span className="input-error">{errors.checkOutDate}</span>
                    )}
                  </div>
                </div>

                {/* ADDRESS */}
                <div className="input-group">
                  <label htmlFor="address">Delivery Address</label>
                  <textarea
                    id="address"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Street, city, building, floor..."
                    rows={3}
                    disabled={submitting}
                    autoComplete="street-address"
                  />
                  {errors.address && (
                    <span className="input-error">{errors.address}</span>
                  )}
                </div>

                {submitError && (
                  <div className="input-error-block">{submitError}</div>
                )}

                {/* BOOKING SUMMARY */}
                <div className="summary">
                  <div className="summary-title">Booking Summary</div>
                  
                  {summaryRows.map((row) => (
                    <div key={row.id} className="summary-row">
                      <div className="summary-item-info">
                        <span className="summary-item-name">{row.name}</span>
                        <span className="summary-item-meta">
                          {row.days} day{row.days > 1 ? "s" : ""} × {formatMoney(row.pricePerDay)}
                        </span>
                      </div>
                      <span className="summary-item-price">{formatMoney(row.lineTotal)}</span>
                    </div>
                  ))}

                  <div className="summary-divider"></div>

                  <div className="summary-total">
                    <span>Total Price</span>
                    <span className="total-amount">{formatMoney(total)}</span>
                  </div>
                </div>

                {/* BUTTONS */}
                <motion.button
                  type="button"
                  onClick={handleCheckout}
                  className="btn-primary"
                  disabled={submitting || items.length === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {submitting ? (
                    <>
                      <span className="loader-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    "Book Now"
                  )}
                </motion.button>

                 <button
                   type="button"
                   onClick={handleWhatsAppBooking}
                   className="whatsapp-btn">
                  Chat on WhatsApp
                 </button>

                <div className="trust-signals">
                  <div className="trust-item">✓ Secure & encrypted</div>
                  <div className="trust-item">✓ Instant confirmation</div>
                  <div className="trust-item">✓ 24/7 support</div>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      </section>
    </motion.main>
  );
}

export default Checkout;
