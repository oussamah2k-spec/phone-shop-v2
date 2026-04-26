export const SITE_NAME = "BIZZINE CARS";
export const SITE_URL = process.env.REACT_APP_SITE_URL || "https://bizzinecars.com";
export const PRIMARY_KEYWORD = "location voiture Taroudant";
export const DEFAULT_SOCIAL_IMAGE = "/icon-512.png";
export const DEFAULT_OG_IMAGE = "/icon-512.png";
export const HOME_ROUTE = "/location-voiture-taroudant";
export const CARS_ROUTE = "/location-voiture-taroudant/voitures";
export const CAR_ROUTE_PREFIX = "/location-voiture-taroudant/voiture";
export const CAR_ROUTE_PATTERN = `${CAR_ROUTE_PREFIX}/:id/:slug?`;

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

export function getSiteUrl() {
  return trimTrailingSlash(SITE_URL);
}

export function getAbsoluteUrl(path = "") {
  const normalizedPath = String(path || "").trim();
  const origin = getSiteUrl();

  if (!normalizedPath) {
    return origin;
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `${origin}${normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`}`;
}

export function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "voiture";
}

export function buildCarPath(carOrId, name = "") {
  const id = typeof carOrId === "object" ? String(carOrId?.id || "").trim() : String(carOrId || "").trim();
  const carName = typeof carOrId === "object" ? String(carOrId?.name || name || "") : String(name || "");
  const slug = slugify(carName);

  return `${CAR_ROUTE_PREFIX}/${encodeURIComponent(id)}${slug ? `/${slug}` : ""}`;
}

export function isHomePath(pathname) {
  return pathname === "/" || pathname === HOME_ROUTE;
}

export function buildCarImageAlt(name, detail = "") {
  const safeName = String(name || "Voiture").trim() || "Voiture";
  const safeDetail = String(detail || "").trim();
  return safeDetail
    ? `${safeName} ${safeDetail} - ${PRIMARY_KEYWORD}`
    : `${safeName} - ${PRIMARY_KEYWORD}`;
}

export function optimizeImageUrl(url, options = {}) {
  const rawUrl = String(url || "").trim();
  if (!rawUrl) {
    return rawUrl;
  }

  const width = Number.isFinite(options.width) ? Math.max(100, Math.round(options.width)) : null;
  const quality = options.quality || "auto:good";

  if (rawUrl.includes("res.cloudinary.com") && rawUrl.includes("/image/upload/")) {
    const transformation = ["f_auto", `q_${quality}`, width ? `w_${width}` : "", width ? "c_limit" : ""]
      .filter(Boolean)
      .join(",");

    return rawUrl.replace("/image/upload/", `/image/upload/${transformation}/`);
  }

  if (rawUrl.includes("images.unsplash.com")) {
    try {
      const parsed = new URL(rawUrl);
      parsed.searchParams.set("auto", "format");
      parsed.searchParams.set("fit", "crop");
      parsed.searchParams.set("q", width && width <= 500 ? "75" : "80");
      if (width) {
        parsed.searchParams.set("w", String(width));
      }
      return parsed.toString();
    } catch {
      return rawUrl;
    }
  }

  return rawUrl;
}

export function createLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "CarRental",
    name: SITE_NAME,
    url: getAbsoluteUrl(HOME_ROUTE),
    image: getAbsoluteUrl(DEFAULT_OG_IMAGE),
    telephone: "+212781330622",
    priceRange: "DH",
    areaServed: [
      {
        "@type": "City",
        name: "Taroudant",
      },
      {
        "@type": "Country",
        name: "Maroc",
      },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Taroudant",
      addressCountry: "MA",
    },
    description: "Service de location voiture Taroudant avec voitures premium, réservation rapide et assistance WhatsApp.",
  };
}