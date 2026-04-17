import { initializeApp } from "firebase/app";
import { getDatabase, ref, get } from "firebase/database";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyBfzXuoVfat3UoSl4o4nfxh0TFcoYKxE1s",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "koth-37585.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "koth-37585",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "koth-37585.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "1004147717796",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:1004147717796:web:c49dab3612875ea6281831",
  databaseURL:
    process.env.REACT_APP_FIREBASE_DATABASE_URL ||
    "https://koth-37585-default-rtdb.europe-west1.firebasedatabase.app",
};

function normalizeImages(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images
      .map((entry) => {
        if (typeof entry === "string") {
          const url = entry.trim();
          return url ? { url, description: "Main car view" } : null;
        }

        if (entry && typeof entry === "object") {
          const url = String(entry.url || entry.imageUrl || entry.src || "").trim();
          if (!url) return null;

          return {
            url,
            description: String(entry.description || "Main car view"),
          };
        }

        return null;
      })
      .filter(Boolean);
  }

  if (typeof product?.imageUrl === "string" && product.imageUrl.trim()) {
    return [{ url: product.imageUrl.trim(), description: "Main car view" }];
  }

  return [];
}

async function run() {
  const app = initializeApp(firebaseConfig);
  const rtdb = getDatabase(app);
  const firestore = getFirestore(app);

  const usersSnap = await get(ref(rtdb, "users"));
  const usersVal = usersSnap.val() || {};

  let scanned = 0;
  let migrated = 0;
  let failed = 0;

  for (const [ownerId, userData] of Object.entries(usersVal)) {
    const products = userData?.products || {};

    for (const [productId, product] of Object.entries(products)) {
      scanned += 1;
      const docId = `${ownerId}__${productId}`;
      const images = normalizeImages(product);

      const payload = {
        name: String(product?.name || "Untitled car"),
        price: String(product?.price || "0"),
        oldPrice: String(product?.oldPrice || ""),
        description: String(product?.description || ""),
        brand: String(product?.brand || product?.category || "Sedan"),
        category: String(product?.category || product?.brand || "Sedan"),
        imageUrl: String(images[0]?.url || product?.imageUrl || ""),
        images,
        stock: String(product?.stock || "Available"),
        featured: Boolean(product?.featured),
        ownerId,
        legacyProductId: productId,
        migratedFrom: "rtdb-users-products",
        migratedAt: Date.now(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await setDoc(doc(firestore, "cars", docId), payload, { merge: true });
        migrated += 1;
      } catch (error) {
        failed += 1;
        console.error(`Failed ${docId}:`, error?.message || error);
      }
    }
  }

  console.log("Migration finished");
  console.log(`Scanned: ${scanned}`);
  console.log(`Migrated: ${migrated}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

try {
  await run();
} catch (error) {
  console.error("Migration crashed:", error?.message || error);
  process.exit(1);
}
