import "../styles/App.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import Navbar from "../components/Navbar";
import { db } from "../firebase/firebase";

function formatMoney(value) {
  const amount = Number(value) || 0;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)} DH`;
}

function AffiliateDashboard() {
  const [affiliateName, setAffiliateName] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ordersRef = collection(db, "orders");

    const unsubscribe = onSnapshot(
      ordersRef,
      (snapshot) => {
        const mappedOrders = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: String(data.name || "Unknown customer"),
            total: Number(data.total) || 0,
            referrer: String(data.referrer || "direct").trim(),
          };
        });

        setOrders(mappedOrders);
        setLoading(false);
      },
      () => {
        setOrders([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const normalizedAffiliateName = affiliateName.trim().toLowerCase();

  const affiliateOrders = useMemo(() => {
    if (!normalizedAffiliateName) {
      return [];
    }

    return orders.filter(
      (order) => String(order.referrer || "").toLowerCase() === normalizedAffiliateName
    );
  }, [normalizedAffiliateName, orders]);

  const totalOrders = affiliateOrders.length;

  const totalEarnings = useMemo(() => {
    return affiliateOrders.reduce((sum, order) => sum + order.total * 0.2, 0);
  }, [affiliateOrders]);

  return (
    <main className="storefront-shell">
      <Navbar />

      <section className="panel" style={{ marginTop: "1rem", padding: "1.25rem" }}>
        <p className="storefront-section-kicker">Affiliate</p>
        <h1>Affiliate Dashboard</h1>
        <p>Track orders and your 20% commission.</p>

        <div className="cart-customer-form" style={{ marginTop: "1rem", maxWidth: "360px" }}>
          <label htmlFor="affiliate-name">Enter your name</label>
          <input
            id="affiliate-name"
            type="text"
            value={affiliateName}
            onChange={(event) => setAffiliateName(event.target.value)}
            placeholder="Example: ahmed"
          />
        </div>
      </section>

      <section className="panel" style={{ marginTop: "1rem", padding: "1.25rem" }}>
        <div className="admin-stats-grid">
          <article className="stat-card">
            <h3>Total earnings</h3>
            <p className="stat-value">{formatMoney(totalEarnings)}</p>
          </article>
          <article className="stat-card">
            <h3>Total orders</h3>
            <p className="stat-value">{totalOrders}</p>
          </article>
        </div>
      </section>

      <section className="panel" style={{ marginTop: "1rem", padding: "1.25rem", marginBottom: "1rem" }}>
        <h2>Orders</h2>

        {!affiliateName.trim() ? <p>Enter your name to see referred orders.</p> : null}
        {affiliateName.trim() && loading ? <p>Loading orders...</p> : null}
        {affiliateName.trim() && !loading && affiliateOrders.length === 0 ? <p>No orders found for this affiliate.</p> : null}

        {affiliateOrders.length > 0 ? (
          <div className="table-wrapper" style={{ marginTop: "0.75rem" }}>
            <table className="saas-products-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Total</th>
                  <th>Commission</th>
                </tr>
              </thead>
              <tbody>
                {affiliateOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.name}</td>
                    <td>{formatMoney(order.total)}</td>
                    <td>{formatMoney(order.total * 0.2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        <div style={{ marginTop: "1rem" }}>
          <Link className="ghost-btn storefront-secondary-btn" to="/">
            Back to store
          </Link>
        </div>
      </section>
    </main>
  );
}

export default AffiliateDashboard;
