import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebase/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { MAX_CARS } from "../utils/limits";

const AuthContext = createContext();
const ADMIN_UID = "ydasD0Te2vYPQV2NrhBfRTtkyiD3";

function isAdminUser(user) {
  return Boolean(user?.uid) && user.uid === ADMIN_UID;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userPlan, setUserPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          setUser(currentUser);
          
          // Fetch user plan info
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists() && userSnap.data()?.plan) {
            setUserPlan(userSnap.data().plan);
          } else {
            // Default plan for new users
            setUserPlan({ type: "Free", productsLimit: MAX_CARS, createdAt: Date.now() });
          }
        } else {
          setUser(null);
          setUserPlan(null);
        }
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setUserPlan(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userPlan,
    loading,
    error,
    logout,
    isAuthenticated: !!user,
    isAdmin: isAdminUser(user),
    isAuthorizedAdmin: isAdminUser(user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
