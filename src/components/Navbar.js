import { memo, useCallback, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

function highlightMatch(text, query) {
  if (!query || !query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, idx) =>
    part.toLowerCase() === query.trim().toLowerCase() ? (
      <mark key={idx} className="search-highlight">{part}</mark>
    ) : (
      part
    )
  );
}

const Navbar = memo(function Navbar({
  compact = false,
  searchTerm = "",
  onSearchChange,
  searchPlaceholder = "Search cars, brands, locations",
  searchSuggestions = [],
  onSuggestionSelect,
}) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const showSearch = typeof onSearchChange === "function";
  const effectiveSearchPlaceholder = searchPlaceholder || "Search cars, brands, locations";
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSearchInput = useCallback((event) => {
    onSearchChange?.(event.target.value);
  }, [onSearchChange]);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const navClassName = ({ isActive }) =>
    `storefront-nav-link ${isActive ? "is-active" : ""}`;

  const contactPathActive = location.pathname === "/" && location.hash === "#contact-section";

  const handleContactClick = useCallback(() => {
    closeMobileMenu();

    const scrollToContactSection = () => {
      const section = document.getElementById("contact-section");
      if (!section) {
        return;
      }

      section.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.replaceState({}, "", "#contact-section");
    };

    if (location.pathname === "/") {
      scrollToContactSection();
      return;
    }

    try {
      window.sessionStorage.setItem("scrollToContactSection", "1");
    } catch {
      // Best effort only.
    }
    navigate("/#contact-section");
  }, [closeMobileMenu, location.pathname, navigate]);

  return (
    <header className={`storefront-topbar storefront-topbar-premium ${compact ? "storefront-topbar-compact" : ""}`}>
      <div className="storefront-topbar-inner">
        <div className="storefront-topbar-left">
          <Link className="storefront-brand" to="/" aria-label="BIZZINE CARS home" onClick={closeMobileMenu}>
            <div className="logo-container">
              <img
                src="/logo.png"
                alt="BIZZINE CARS"
                className="logo-img"
                onError={(e) => {
                  e.target.src = "/placeholder.png";
                }}
              />
              <div className="logo-text">
                <strong>BIZZINE CARS</strong>
                <span className="logo-sub">Premium Car Rental</span>
              </div>
            </div>
          </Link>
        </div>

        {showSearch ? (
          <form className="storefront-nav-search" role="search" onSubmit={(event) => event.preventDefault()}>
            <span className="storefront-search-icon" aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchTerm}
              onChange={handleSearchInput}
              placeholder={effectiveSearchPlaceholder}
              aria-label="Search cars"
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setIsSearchFocused(false), 80);
              }}
            />

            {isSearchFocused && searchSuggestions.length > 0 ? (
              <ul className="storefront-search-suggestions" role="listbox" aria-label="Search suggestions">
                {searchSuggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onMouseDown={() => {
                        onSuggestionSelect?.(suggestion);
                      }}
                    >
                      <span className="suggestion-car-icon" aria-hidden="true">🚗</span>
                      <span>{highlightMatch(suggestion, searchTerm)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </form>
        ) : (
          <div className="storefront-nav-search-placeholder" aria-hidden="true" />
        )}

        <button
          type="button"
          className={`storefront-mobile-toggle ${isMobileMenuOpen ? "is-open" : ""}`}
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen((prev) => !prev)}
        >
          <span />
          <span />
          <span />
        </button>

        <nav className={`storefront-nav ${isMobileMenuOpen ? "is-open" : ""}`} aria-label="Main navigation">
          <NavLink to="/" className={navClassName} onClick={closeMobileMenu}>Home</NavLink>
          <NavLink to="/store" className={navClassName} onClick={closeMobileMenu}>Cars</NavLink>
          <button
            type="button"
            className={`storefront-nav-link ${contactPathActive ? "is-active" : ""}`}
            onClick={handleContactClick}
          >
            Contact
          </button>
          {user ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <NavLink to="/admin" className={navClassName} onClick={closeMobileMenu}>Admin</NavLink>
            </motion.div>
          ) : null}
        </nav>
      </div>
    </header>
  );
});

export default Navbar;
