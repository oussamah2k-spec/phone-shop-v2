import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./index";
import { auth } from "./firebase";

const CARS_COL = "cars";
const ADMIN_UID = "ydasD0Te2vYPQV2NrhBfRTtkyiD3";

function assertAuthorizedAdmin() {
  const currentUser = auth.currentUser;

  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  if (currentUser.uid !== ADMIN_UID) {
    throw new Error("Not authorized");
  }

  return currentUser;
}

/** Real-time listener for all cars, ordered newest first. */
export function subscribeAllCars(onNext, onError) {
  const q = query(collection(db, CARS_COL), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snapshot) => {
      const cars = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      onNext(cars);
    },
    onError
  );
}

/** Real-time listener for a single car document. */
export function subscribeCarById(id, onNext, onError) {
  return onSnapshot(
    doc(db, CARS_COL, id),
    (snap) => {
      if (!snap.exists()) {
        onNext(null);
        return;
      }
      onNext({ id: snap.id, ...snap.data() });
    },
    onError
  );
}

/** One-shot read for a single car. */
export async function getCarById(id) {
  const snap = await getDoc(doc(db, CARS_COL, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** One-shot read of all cars (for stock map, etc.). */
export async function getCarsOnce() {
  const q = query(collection(db, CARS_COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Add a new car to Firestore.
 * @param {object} data - Car fields (name, price, images, brand, stock, etc.)
 * @returns {Promise<DocumentReference>}
 */
export async function addCar(data) {
  const currentUser = assertAuthorizedAdmin();
  const now = serverTimestamp();

  return addDoc(collection(db, CARS_COL), {
    ...data,
    userId: currentUser.uid,
    createdAt: now,
    updatedAt: now,
  });
}

/**
 * Update an existing car document.
 * @param {string} id - Firestore document ID
 * @param {object} data - Fields to update
 */
export async function updateCar(id, data) {
  assertAuthorizedAdmin();

  return updateDoc(doc(db, CARS_COL, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Permanently delete a car document.
 * @param {string} id - Firestore document ID
 */
export async function deleteCar(id) {
  assertAuthorizedAdmin();
  return deleteDoc(doc(db, CARS_COL, id));
}
