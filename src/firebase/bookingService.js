/**
 * 🔥 PRODUCTION-LEVEL BOOKING SERVICE
 *
 * Optimized for public bookings (no login required).
 * Compatible with Firestore rules that allow public create.
 *
 * Features:
 * - Simple, direct addDoc write (no complex duplicate logic)
 * - Proper error handling for Firestore permission errors
 * - Frontend validation before submission
 * - Clean, maintainable code
 */

import {
  addDoc,
  collection,
  deleteDoc,
  documentId,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./index";

const BOOKING_CACHE_PREFIX = "booking-cache:";

function generateToken() {
  return Math.random().toString(36).substring(2, 12);
}

function normalizeCreatedAt(createdAt) {
  if (createdAt && typeof createdAt === "object" && typeof createdAt.toMillis === "function") {
    return createdAt.toMillis();
  }
  const numeric = Number(createdAt);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toCachedBooking(bookingId, bookingData = {}) {
  return {
    id: bookingId,
    ...bookingData,
    createdAtMs: Date.now(),
  };
}

function setCachedBooking(bookingId, bookingData) {
  if (typeof window === "undefined" || !bookingId) {
    return;
  }

  try {
    const payload = toCachedBooking(bookingId, bookingData);
    window.sessionStorage.setItem(`${BOOKING_CACHE_PREFIX}${bookingId}`, JSON.stringify(payload));
  } catch (cacheError) {
    // Cache writes are best-effort and should never break booking creation.
  }
}

export function getCachedBookingById(bookingId) {
  if (typeof window === "undefined" || !bookingId) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(`${BOOKING_CACHE_PREFIX}${bookingId}`);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Create a booking (public - no login required)
 * REQUIRED FIELDS (validated by Firestore rules):
 * - name: string (customer name)
 * - phone: string (customer phone)
 * - carName: string (car name)
 * - createdAt: serverTimestamp()
 *
 * OPTIONAL FIELDS:
 * - address, startDate, endDate, price, quantity, etc.
 */
export async function createBooking(payload) {
  try {
    // Validation: Check required fields
    const name = String(payload?.name || payload?.userName || payload?.customerName || "").trim();
    const phone = String(payload?.phone || "").trim();
    const carName = String(payload?.carName || "").trim();

    if (!name || name.length < 2) {
      return {
        success: false,
        error: "Name must be at least 2 characters",
        orderId: null,
      };
    }

    if (!phone || phone.length < 3) {
      return {
        success: false,
        error: "Phone number must be at least 3 characters",
        orderId: null,
      };
    }

    if (!carName) {
      return {
        success: false,
        error: "Car name is required",
        orderId: null,
      };
    }

    const bookingToken = generateToken();
    const quantity = Number(payload?.quantity) || 1;
    const price = Number(payload?.price) || 0;
    const totalPrice = Number(payload?.totalPrice) || Number(payload?.total) || (price * quantity);

    // Build clean booking document
    const bookingData = {
      // REQUIRED (per Firestore rules validation)
      name: name,
      userName: name,
      customerName: name,
      phone: phone,
      carName: carName,
      createdAt: serverTimestamp(),

      // OPTIONAL (additional useful fields)
      address: String(payload?.address || "").trim(),
      startDate: payload?.startDate || null,
      endDate: payload?.endDate || null,
      checkIn: payload?.checkIn || payload?.startDate || null,
      checkOut: payload?.checkOut || payload?.endDate || null,
      price: price,
      quantity: quantity,
      totalPrice: totalPrice,
      total: totalPrice,
      carId: String(payload?.carId || payload?.productId || "").trim(),
      image: payload?.image || "",
      items: Array.isArray(payload?.items) ? payload.items : [],
      source: payload?.source || "web",
      status: "pending",
      bookingToken,
      updatedAt: serverTimestamp(),
    };

    // Write to Firestore and use generated document ID as booking ID.
    const docRef = await addDoc(collection(db, "bookings"), bookingData);
    const bookingId = docRef.id;
    setCachedBooking(bookingId, bookingData);

    console.log("✅ Booking created:", bookingId);

    return {
      success: true,
      error: null,
      orderId: bookingId,
      bookingToken,
      booking: {
        id: bookingId,
        ...bookingData,
      },
    };
  } catch (error) {
    // Handle specific Firestore errors
    const errorMessage = String(error?.message || "Failed to create booking");
    const errorCode = String(error?.code || "").toLowerCase();

    // Permission denied (e.g., if rules change to restrict public create)
    if (errorCode === "permission-denied" || errorMessage.toLowerCase().includes("missing or insufficient permissions")) {
      console.error("❌ Permission denied - bookings can only be created by authenticated users");
      return {
        success: false,
        error: "Booking system is temporarily unavailable. Please try again later.",
        orderId: null,
      };
    }

    // Network or other errors
    console.error("❌ Booking error:", errorMessage);
    return {
      success: false,
      error: errorMessage,
      orderId: null,
    };
  }
}

/**
 * Fetch single booking by ID (for confirmation page)
 */
export async function getBookingById(orderId) {
  try {
    const bookingRef = doc(db, "bookings", orderId);
    const snap = await getDoc(bookingRef);
    
    if (!snap.exists()) {
      return null;
    }

    return {
      id: snap.id,
      ...snap.data(),
      createdAtMs: normalizeCreatedAt(snap.data().createdAt),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch a single booking by ID + token.
 * This supports secure rules where booking reads require matching token.
 */
export async function getBookingByIdWithToken(orderId, token) {
  const safeOrderId = String(orderId || "").trim();
  const safeToken = String(token || "").trim();

  if (!safeOrderId || !safeToken) {
    return { booking: null, code: "invalid-args" };
  }

  try {
    const secureQuery = query(
      collection(db, "bookings"),
      where(documentId(), "==", safeOrderId),
      where("bookingToken", "==", safeToken),
      limit(1)
    );

    const snapshot = await getDocs(secureQuery);
    if (snapshot.empty) {
      return { booking: null, code: "not-found" };
    }

    const first = snapshot.docs[0];
    const data = first.data() || {};
    return {
      booking: {
        id: first.id,
        ...data,
        createdAtMs: normalizeCreatedAt(data.createdAt),
      },
      code: null,
    };
  } catch (error) {
    return {
      booking: null,
      code: String(error?.code || "unknown").toLowerCase(),
      error,
    };
  }
}

/**
 * Fetch user's bookings from Firestore (replaces cart-based bookings!)
 */
export async function getUserBookings(userName) {
  try {
    const q = query(
      collection(db, "bookings"),
      where("userName", "==", userName)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAtMs: normalizeCreatedAt(doc.data().createdAt),
    })).sort((a, b) => b.createdAtMs - a.createdAtMs);
  } catch {
    return [];
  }
}

/**
 * Subscribe to all bookings real-time (for admin panel)
 */
export function getBookings(onNext, onError) {
  return onSnapshot(
    collection(db, "bookings"),
    (snapshot) => {
      const mapped = snapshot.docs.map((entry) => {
        const data = entry.data() || {};
        return {
          id: entry.id,
          ...data,
          // Support both old 'userName' and new 'name' field names
          userName: data.name || data.userName || "Unknown",
          createdAtMs: normalizeCreatedAt(data.createdAt),
        };
      });

      const sorted = mapped.sort((a, b) => b.createdAtMs - a.createdAtMs);
      onNext(sorted);
    },
    onError
  );
}

/**
 * Update booking status (pending → confirmed → completed, cancelled)
 * Only allowed if authenticated (per Firestore rules)
 */
export async function updateBookingStatus(bookingId, status) {
  try {
    await updateDoc(doc(db, "bookings", bookingId), {
      status: String(status).trim().toLowerCase(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to update booking status:", error);
    return { success: false, error };
  }
}

/**
 * Delete booking
 * Only allowed if authenticated (per Firestore rules)
 */
export async function removeBooking(bookingId) {
  try {
    await deleteDoc(doc(db, "bookings", bookingId));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete booking:", error);
    return { success: false, error };
  }
}
