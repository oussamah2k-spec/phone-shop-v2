import { useEffect } from "react";
import { DEFAULT_SOCIAL_IMAGE, SITE_NAME, getAbsoluteUrl } from "../seo/site";

function upsertMeta(attributeName, attributeValue, content) {
  if (!attributeValue) {
    return;
  }

  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }
  element.setAttribute("href", href);
}

function upsertStructuredData(structuredData) {
  const existing = document.head.querySelector("script[data-seo-jsonld='true']");
  if (!structuredData) {
    existing?.remove();
    return;
  }

  const nextValue = JSON.stringify(structuredData);
  if (existing) {
    existing.textContent = nextValue;
    return;
  }

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.dataset.seoJsonld = "true";
  script.textContent = nextValue;
  document.head.appendChild(script);
}

function Seo({
  title,
  description,
  path = "",
  image = DEFAULT_SOCIAL_IMAGE,
  robots = "index, follow",
  keywords = "location voiture Taroudant, location auto Taroudant, location de voiture Taroudant",
  structuredData,
}) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const absoluteUrl = getAbsoluteUrl(path);
    const absoluteImage = getAbsoluteUrl(image);

    document.title = fullTitle;
    document.documentElement.lang = "fr";

    upsertMeta("name", "description", description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", robots);
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", absoluteUrl);
    upsertMeta("property", "og:image", absoluteImage);
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", absoluteImage);
    upsertLink("canonical", absoluteUrl);
    upsertStructuredData(structuredData);
  }, [description, image, keywords, path, robots, structuredData, title]);

  return null;
}

export default Seo;