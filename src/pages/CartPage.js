import "../styles/App.css";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { useCart } from "../contexts/CartContext";
import { getCarsOnce } from "../firebase/cars";
import { createBooking, getBookings } from "../firebase/bookingService";

const PLACEHOLDER_STORE_IMAGE = "/placeholder.png";

function parsePriceNumber(priceValue) {
  const normalized = String(priceValue ?? "0").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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

function normalizeOrderItem(item) {
  return {
    carId: item?.productId || item?.id || "",
    carName: item?.name || "Untitled car",
    image: item?.image || item?.imageUrl || PLACEHOLDER_STORE_IMAGE,
    price: parsePriceNumber(item?.price || 0),
  };
}

const CartItemRow = memo(function CartItemRow({ item, availableStock, onDecrease, onIncrease, onRemove, index = 0 }) {
  const safeQuantity = Math.max(1, Number(item?.quantity) || 1);
  const reachedStockLimit = availableStock !== null && safeQuantity >= availableStock;
  const safeName = String(item?.name || "Untitled car");
  const safePrice = parsePriceNumber(item?.price).toFixed(2);
  const safeImage = item?.image || item?.imageUrl || PLACEHOLDER_STORE_IMAGE;
  const checkInDate = String(item?.checkInDate || "N/A");
  const checkOutDate = String(item?.checkOutDate || "N/A");

  return (
    <motion.article
      className="cart-card"
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -18 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: "easeOut" }}
      layout
    >
      <img
        src={safeImage}
        alt={safeName}
        className="cart-image"
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.target.src = "/placeholder.png";
        }}
      />

      <div className="cart-info">
        <h3>{safeName}</h3>
        <p className="price">${safePrice}/day</p>
        {checkInDate !== "N/A" && (
          <p className="cart-item-dates">Pick-up: {checkInDate} → Return: {checkOutDate}</p>
        )}
        {availableStock !== null && (
          <p className="cart-item-stock">Only {availableStock} left</p>
        )}

        <div className="cart-actions">
          <button type="button" onClick={onDecrease} aria-label={`Decrease quantity for ${safeName}`}>
            −
          </button>
          <span>{safeQuantity}</span>
          <button type="button" onClick={onIncrease} aria-label={`Increase quantity for ${safeName}`} disabled={reachedStockLimit}>
            +
          </button>
        </div>

        <button
          type="button"
          className="remove-btn"
          onClick={onRemove}
          aria-label={`Remove ${safeName} from booking`}
        >
          Remove
        </button>
      </div>
    </motion.article>
  );
});

function CartPage() {
  const navigate = useNavigate();
  const { items, total, increaseQty, decreaseQty, removeFromCart, clearCart } = useCart();
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [formError, setFormError] = useState("");
  const [successNote, setSuccessNote] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [stockByCartId, setStockByCartId] = useState({});
  const [realtimeBookings, setRealtimeBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + Math.max(0, Number(item?.quantity) || 0), 0),
    [items]
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cars = await getCarsOnce();
        if (!mounted) return;

        const nextStockByCartId = {};
        cars.forEach((car) => {
          nextStockByCartId[String(car.id)] = {
            quantity: parseStockQuantity(car?.stock),
            outOfStock: isOutOfStock(car?.stock),
          };
        });

        setStockByCartId(nextStockByCartId);
      } catch (error) {
        console.error("Failed to load stock map for booking:", error);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = getBookings(
      (allBookings) => {
        const mapped = allBookings.slice(0, 8).map((data) => ({
          id: data.id,
          carName: data?.carName || "Untitled car",
          userName: data?.userName || data?.customerName || data?.customer?.name || "Unknown",
          status: data?.status || "pending",
          createdAt: data.createdAtMs,
        }));

        setRealtimeBookings(mapped);
        setBookingsLoading(false);
      },
      () => {
        setRealtimeBookings([]);
        setBookingsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getAvailableStock = useCallback((item) => {
    const stockInfo = stockByCartId[item.id];
    if (!stockInfo) {
      return null;
    }

    if (stockInfo.quantity !== null) {
      return stockInfo.quantity;
    }

    return stockInfo.outOfStock ? 0 : null;
  }, [stockByCartId]);

  const getOverLimitItems = useCallback(() => {
    return items.filter((item) => {
      const availableStock = getAvailableStock(item);
      const safeQuantity = Math.max(0, Number(item?.quantity) || 0);
      return availableStock !== null && safeQuantity > availableStock;
    });
  }, [getAvailableStock, items]);

  const handleCustomerInfoChange = useCallback((event) => {
    const { name, value } = event.target;
    setCustomerInfo((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (formError) {
      setFormError("");
    }
  }, [formError]);

  const handleIncreaseQty = useCallback((item) => {
    const availableStock = getAvailableStock(item);
    const safeQuantity = Math.max(0, Number(item?.quantity) || 0);

    if (availableStock !== null && safeQuantity >= availableStock) {
      setFormError(`Only ${availableStock} in stock for ${item.name}.`);
      return;
    }

    increaseQty(item.id);
    if (formError) {
      setFormError("");
    }
  }, [formError, getAvailableStock, increaseQty]);

  const handleDecreaseQty = useCallback((itemId) => {
    decreaseQty(itemId);
    if (formError) {
      setFormError("");
    }
  }, [decreaseQty, formError]);

  const handlePlaceOrder = useCallback(async () => {
    // Prevent double submission
    if (isPlacingOrder) {
      return;
    }

    setSuccessNote("");
    setFormError("");

    // 1️⃣ FRONTEND VALIDATION
    const name = customerInfo.name.trim();
    const phone = customerInfo.phone.trim();
    const address = customerInfo.address.trim();

    if (!name) {
      setFormError("Name is required");
      return;
    }

    if (name.length < 2) {
      setFormError("Name must be at least 2 characters");
      return;
    }

    if (!phone) {
      setFormError("Phone number is required");
      return;
    }

    if (phone.length < 3) {
      setFormError("Phone number must be at least 3 characters");
      return;
    }

    if (items.length === 0) {
      setFormError("Your booking is empty. Add a car first.");
      return;
    }

    // 2️⃣ CHECK STOCK - Validate quantities
    const overLimitItems = getOverLimitItems();
    if (overLimitItems.length > 0) {
      const firstItem = overLimitItems[0];
      const availableStock = getAvailableStock(firstItem);
      setFormError(
        `Cannot book: ${firstItem.name} has only ${availableStock} available for this date.`
      );
      return;
    }

    try {
      setIsPlacingOrder(true);

      const primaryItem = normalizeOrderItem(items[0]);

      // 3️⃣ PREPARE BOOKING DATA
      // Required fields per Firestore rules: name, phone, carName, createdAt (added by serverTimestamp)
      const bookingData = {
        name: name,
        phone: phone,
        carName: primaryItem.carName,
        address: address,
        startDate: String(items[0]?.checkInDate || new Date().toISOString().slice(0, 10)),
        endDate: String(items[0]?.checkOutDate || new Date().toISOString().slice(0, 10)),
        price: primaryItem.price,
        quantity: items[0]?.quantity || 1,
        totalPrice: total || (primaryItem.price * (items[0]?.quantity || 1)),
        source: "web",
      };

      // 4️⃣ CREATE BOOKING WITH FIRESTORE
      const bookingResult = await createBooking(bookingData);

      if (!bookingResult.success) {
        setFormError(bookingResult.error || "Failed to create booking. Please try again.");
        return;
      }

      // 5️⃣ SUCCESS - Clear cart and reset form
      clearCart();
      setCustomerInfo({ name: "", phone: "", address: "" });
      setSuccessNote("✅ Booking created! Redirecting...");

      // 6️⃣ REDIRECT TO CONFIRMATION PAGE
      setTimeout(() => {
        navigate(`/order/${bookingResult.orderId}?token=${encodeURIComponent(bookingResult.bookingToken || "")}`);
      }, 500);
    } catch (error) {
      console.error("Booking error:", error);
      setFormError(error.message || "Failed to place booking. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  }, [clearCart, customerInfo, getAvailableStock, getOverLimitItems, isPlacingOrder, items, total, navigate]);

  return (
    <motion.main
      className="storefront-shell cart-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Navbar />

      {successNote ? <div className="storefront-toast whatsapp-toast">{successNote}</div> : null}

      <section className="cart-page panel">
        <div className="cart-page-head">
          <div>
            <p className="storefront-section-kicker">Booking</p>
            <h1>Your Booking</h1>
            <Link className="ghost-btn storefront-secondary-btn storefront-back-btn" to="/">
              ← Back to cars
            </Link>
          </div>

          {items.length > 0 ? <p className="cart-items-note">{itemCount} cars in your booking</p> : null}

          {items.length > 0 ? (
            <button type="button" className="ghost-btn storefront-secondary-btn" onClick={clearCart}>
              Clear booking
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="cart-empty-state">
            <h2>Your booking is empty</h2>
            <p>Browse cars and add your first booking.</p>
            <Link className="primary-btn storefront-primary-btn" to="/">
              Continue browsing
            </Link>
          </div>
        ) : (
          <div className="cart-layout">
            <section className="cart-items-list" aria-label="Booking items">
              {items.map((item, idx) => {
                const availableStock = getAvailableStock(item);

                return (
                  <CartItemRow
                    key={item.id || `${item?.name || "car"}-${item?.quantity || 1}`}
                    item={item}
                    availableStock={availableStock}
                    onDecrease={() => handleDecreaseQty(item.id)}
                    onIncrease={() => handleIncreaseQty(item)}
                    onRemove={() => removeFromCart(item.id)}
                    index={idx}
                  />
                );
              })}
            </section>

            <motion.aside
              className="cart-summary panel"
              aria-label="Booking summary"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
            >
              <p className="storefront-section-kicker">Booking Summary</p>
              <h2>Total</h2>
              <p className="cart-total">{formatMoney(total)}</p>

              <div className="cart-customer-form" aria-label="Customer details">
                <label htmlFor="customer-name">Name</label>
                <input
                  id="customer-name"
                  name="name"
                  type="text"
                  value={customerInfo.name}
                  onChange={handleCustomerInfoChange}
                  placeholder="Your name"
                  required
                />

                <label htmlFor="customer-phone">Phone</label>
                <input
                  id="customer-phone"
                  name="phone"
                  type="tel"
                  value={customerInfo.phone}
                  onChange={handleCustomerInfoChange}
                  placeholder="+212..."
                  required
                />

                <label htmlFor="customer-address">Address (optional)</label>
                <textarea
                  id="customer-address"
                  name="address"
                  value={customerInfo.address}
                  onChange={handleCustomerInfoChange}
                  placeholder="City, street, building..."
                  rows={3}
                />
              </div>

              {formError ? <p className="cart-form-error">{formError}</p> : null}

              <motion.button
                type="button"
                className="primary-btn storefront-primary-btn cart-checkout-btn"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder || items.length === 0}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {isPlacingOrder ? "Confirming booking..." : "Confirm Booking"}
              </motion.button>

              <p className="cart-summary-note">Booking is placed instantly from this page.</p>
            </motion.aside>
          </div>
        )}
      </section>

      <section className="panel reservation-realtime-panel" aria-live="polite">
        <div className="panel-header">
          <h2>Live Reservations</h2>
          <p>Updates in real-time without page reload.</p>
        </div>

        {bookingsLoading ? (
          <p className="small-text">Loading reservations...</p>
        ) : realtimeBookings.length === 0 ? (
          <p className="small-text">No reservations yet.</p>
        ) : (
          <div className="reservation-realtime-list">
            {realtimeBookings.map((booking) => (
              <article key={booking.id} className="reservation-realtime-item">
                <div>
                  <strong>{booking.carName}</strong>
                  <p className="small-text">{booking.userName} • {formatDateTime(booking.createdAt)}</p>
                </div>
                <span className={`reservation-status reservation-status-${booking.status}`}>{booking.status}</span>
              </article>
            ))}
          </div>
        )}
      </section>
    </motion.main>
  );
}

export default CartPage;
