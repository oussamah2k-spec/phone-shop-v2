import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const CART_STORAGE_KEY = "phone-shop-cart-v1";

const CartContext = createContext(null);

function readCartFromStorage() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item) => item && typeof item === "object");
  } catch (error) {
    console.error("Failed to read cart from storage:", error);
    return [];
  }
}

function parsePriceNumber(price) {
  const normalized = String(price ?? "0").replace(/[^0-9.]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => readCartFromStorage());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = useCallback((product) => {
    if (!product) {
      return;
    }

    const cartItemId = product?.cartId || `${product?.ownerId || "store"}__${product?.id || "item"}`;

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.id === cartItemId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === cartItemId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentItems,
        {
          id: cartItemId,
          productId: product?.id || "",
          ownerId: product?.ownerId || "",
          name: product?.name || "Untitled product",
          price: product?.price || "0",
          image: product?.image || product?.imageUrl || "",
          imageUrl: product?.imageUrl || "",
          quantity: 1,
        },
      ];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setItems((currentItems) => currentItems.filter((item) => item.id !== productId));
  }, []);

  const increaseQty = useCallback((productId) => {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === productId
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      )
    );
  }, []);

  const decreaseQty = useCallback((productId) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity - 1,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + parsePriceNumber(item.price) * item.quantity, 0),
    [items]
  );

  const count = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      total,
      count,
      addToCart,
      removeFromCart,
      increaseQty,
      decreaseQty,
      clearCart,
    }),
    [items, total, count, addToCart, removeFromCart, increaseQty, decreaseQty, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }

  return context;
}
