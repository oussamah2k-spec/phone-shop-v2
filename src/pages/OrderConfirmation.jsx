import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";
import { getBookingByIdWithToken, getCachedBookingById } from "../firebase/bookingService";

function formatMoney(value) {
  const amount = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} DH`;
}

function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const query = new URLSearchParams(location.search);
    const token = query.get("token") || "";

    const loadOrder = async () => {
      try {
        setLoading(true);
        setError("");
        setNotFound(false);
        setBooking(null);

        if (!id) {
          setError("Invalid order URL. Missing order id.");
          return;
        }

        if (!token) {
          setError("Missing booking token. Please use the full confirmation link.");
          return;
        }

        const result = await getBookingByIdWithToken(id, token);

        if (!isMounted) return;

        if (result.booking) {
          setBooking(result.booking);
          return;
        }

        const resultCode = String(result.code || "").toLowerCase();
        if (resultCode === "not-found") {
          const cachedBooking = getCachedBookingById(id);
          if (cachedBooking && cachedBooking.bookingToken === token) {
            setBooking(cachedBooking);
            return;
          }

          setNotFound(true);
          return;
        }

        if (resultCode === "permission-denied") {
          setError("Invalid or missing access token.");
          return;
        }

        if (
          resultCode === "unavailable" ||
          resultCode === "deadline-exceeded" ||
          resultCode === "resource-exhausted"
        ) {
          setError("Network issue while loading order details. Please check your connection and retry.");
          return;
        }

        setError("Error loading order details. Please try again.");
      } catch (loadError) {
        if (!isMounted) return;
        console.error("Failed to load order details:", loadError);

        const errorCode = String(loadError?.code || "").toLowerCase();
        const errorMessage = String(loadError?.message || "").toLowerCase();
        const permissionDenied = errorCode === "permission-denied" || errorMessage.includes("insufficient permissions");
        const networkError = errorCode === "unavailable" || errorCode === "deadline-exceeded" || errorCode === "resource-exhausted";

        if (permissionDenied) {
          const cachedBooking = getCachedBookingById(id);
          if (cachedBooking && cachedBooking.bookingToken === token) {
            setBooking(cachedBooking);
            return;
          }

          setError("Invalid or missing access token.");
          return;
        }

        if (networkError) {
          setError("Network issue while loading order details. Please check your connection and retry.");
          return;
        }

        setError("Error loading order details. Please try again.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [id, location.search]);

  const customerName = booking?.name || booking?.userName || booking?.customerName || "N/A";

  if (loading) {
    return (
      <motion.main
        className="storefront-shell"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Navbar />
        <div className="order-confirmation-container">
          <div className="order-confirmation-card panel">
            <div className="admin-spinner" aria-hidden="true" />
            <p>Loading order details...</p>
          </div>
        </div>
      </motion.main>
    );
  }

  if (error) {
    return (
      <motion.main
        className="storefront-shell"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Navbar />
        <div className="order-confirmation-container">
          <div className="order-confirmation-card panel error">
            <h2>Error Loading Order</h2>
            <p>{error}</p>
            <button
              className="primary-btn storefront-primary-btn"
              onClick={() => navigate("/store")}
            >
              Return to Store
            </button>
          </div>
        </div>
      </motion.main>
    );
  }

  if (notFound || !booking) {
    return (
      <motion.main
        className="storefront-shell"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <Navbar />
        <div className="order-confirmation-container">
          <div className="order-confirmation-card panel error">
            <h2>Order Not Found</h2>
            <p>We could not find this order. Please check your order link.</p>
            <button
              className="primary-btn storefront-primary-btn"
              onClick={() => navigate("/store")}
            >
              Return to Store
            </button>
          </div>
        </div>
      </motion.main>
    );
  }

  return (
    <motion.main
      className="storefront-shell"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <Navbar />

      <div className="order-confirmation-container">
        <motion.div
          className="order-confirmation-card panel success"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="confirmation-header">
            <motion.div
              className="confirmation-checkmark"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              ✓
            </motion.div>
            <h1>Order Confirmed!</h1>
            <p className="confirmation-subtitle">
              Thank you for your booking. Your order has been successfully created.
            </p>
          </div>

          <div className="confirmation-order-id">
            <label>Order ID</label>
            <code>{booking.id}</code>
            <button
              className="copy-btn"
              onClick={() => {
                navigator.clipboard.writeText(booking.id);
              }}
              title="Copy order ID"
            >
              Copy
            </button>
          </div>

          <div className="confirmation-details">
            <div className="details-section">
              <h3>Car Details</h3>
              <div className="detail-row">
                <span className="label">Car:</span>
                <span className="value">{booking.carName || "N/A"}</span>
              </div>
              <div className="detail-row">
                <span className="label">Price per Day:</span>
                <span className="value">{formatMoney(booking.price)}</span>
              </div>
            </div>

            <div className="details-section">
              <h3>Booking Dates</h3>
              <div className="detail-row">
                <span className="label">Pick-up:</span>
                <span className="value">{formatDate(booking.startDate || booking.checkIn || booking.pickupDate)}</span>
              </div>
              <div className="detail-row">
                <span className="label">Return:</span>
                <span className="value">{formatDate(booking.endDate || booking.checkOut || booking.returnDate)}</span>
              </div>
            </div>

            <div className="details-section">
              <h3>Customer Information</h3>
              <div className="detail-row">
                <span className="label">Name:</span>
                <span className="value">{customerName}</span>
              </div>
              <div className="detail-row">
                <span className="label">Phone:</span>
                <span className="value">{booking.phone || "N/A"}</span>
              </div>
              {booking.address ? (
                <div className="detail-row">
                  <span className="label">Address:</span>
                  <span className="value">{booking.address}</span>
                </div>
              ) : null}
            </div>

            <div className="details-section">
              <h3>Total Price</h3>
              <div className="total-price">{formatMoney(booking.totalPrice || booking.total || booking.price)}</div>
            </div>

            {booking.status ? (
              <div className="details-section">
                <h3>Status</h3>
                <div className="status-badge" style={{ textTransform: "capitalize" }}>
                  {booking.status}
                </div>
              </div>
            ) : null}
          </div>

          <div className="confirmation-actions">
            <button
              className="primary-btn storefront-primary-btn"
              onClick={() => navigate("/store")}
            >
              Continue Shopping
            </button>
            <button
              className="ghost-btn storefront-secondary-btn"
              onClick={() => navigate("/cart")}
            >
              View Bookings
            </button>
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}
