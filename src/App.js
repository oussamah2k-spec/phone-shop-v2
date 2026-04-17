import { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useParams, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { CartProvider } from "./contexts/CartContext";
import { Toaster } from "react-hot-toast";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Home = lazy(() => import("./pages/Home"));
const Store = lazy(() => import("./pages/Store"));
const Admin = lazy(() => import("./admin/AdminDashboard"));
const Login = lazy(() => import("./pages/Login"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const CartPage = lazy(() => import("./pages/CartPage"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));

function AppScreenLoader() {
  return (
    <div className="session-loader-screen">
      <div className="session-loader-card panel">
        <div className="admin-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <AppScreenLoader />;
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function LegacyOrderConfirmationRedirect() {
  const { orderId } = useParams();
  if (!orderId) {
    return <Navigate to="/store" replace />;
  }
  return <Navigate to={`/order/${encodeURIComponent(orderId)}`} replace />;
}

function LegacyOrderConfirmationQueryRedirect() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id") || "";
  const token = searchParams.get("token") || "";

  if (!orderId) {
    return <Navigate to="/store" replace />;
  }

  const tokenPart = token ? `?token=${encodeURIComponent(token)}` : "";
  return <Navigate to={`/order/${encodeURIComponent(orderId)}${tokenPart}`} replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<AppScreenLoader />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/store" element={<Store />} />
        <Route path="/cars" element={<Store />} />
        <Route path="/car/:id" element={<ProductDetails />} />
        <Route path="/product/:ownerId/:productId" element={<ProductDetails />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/order/:id" element={<OrderConfirmation />} />
        <Route path="/order-confirmation" element={<LegacyOrderConfirmationQueryRedirect />} />
        <Route path="/order-confirmation/:orderId" element={<LegacyOrderConfirmationRedirect />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/bookings" element={<Navigate to="/admin" replace />} />
        <Route path="/admin/orders" element={<Navigate to="/admin" replace />} />
        <Route path="/shop" element={<Navigate to="/store" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <Router>
            <Toaster position="top-right" />
            <AppRoutes />
          </Router>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;