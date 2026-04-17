import { memo, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

function normalizeImages(images, productName, placeholderImage) {
  const fallbackImage = {
    url: placeholderImage,
    description: `${productName || "Product"} image`,
  };

  if (!Array.isArray(images) || images.length === 0) {
    return [fallbackImage];
  }

  const normalized = images
    .map((image, index) => {
      const url = String(image?.url || "").trim();
      if (!url) {
        return null;
      }

      return {
        url,
        description: String(image?.description || `${productName || "Product"} view ${index + 1}`),
      };
    })
    .filter(Boolean);

  return normalized.length > 0 ? normalized : [fallbackImage];
}

const ProductGallery = memo(function ProductGallery({
  images,
  productName,
  placeholderImage,
  enableFullscreen = true,
  enableZoom = true,
  showNavigation = true,
}) {
  const galleryImages = useMemo(
    () => normalizeImages(images, productName, placeholderImage),
    [images, placeholderImage, productName]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const activeImage = galleryImages[Math.min(activeIndex, galleryImages.length - 1)] || galleryImages[0];
  const hasMultipleImages = showNavigation && galleryImages.length > 1;
  const gallerySignature = useMemo(
    () => galleryImages.map((image) => image.url).join("|"),
    [galleryImages]
  );

  useEffect(() => {
    setActiveIndex(0);
    setIsFullscreenOpen(false);
  }, [gallerySignature, productName]);

  useEffect(() => {
    if (!isFullscreenOpen || typeof window === "undefined") {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsFullscreenOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFullscreenOpen]);

  const handleImageError = (event) => {
    event.target.src = "/placeholder.png";
  };

  const handlePrevImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  };

  const handleNextImage = () => {
    if (!hasMultipleImages) {
      return;
    }

    setActiveIndex((prev) => (prev + 1) % galleryImages.length);
  };

  return (
    <>
      <section className="product-gallery" aria-label={`${productName} gallery`}>
        <div className="product-gallery__stage">
          {hasMultipleImages ? (
            <>
              <button
                type="button"
                className="product-gallery__nav product-gallery__nav--prev"
                onClick={handlePrevImage}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                type="button"
                className="product-gallery__nav product-gallery__nav--next"
                onClick={handleNextImage}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          ) : null}

          <button
            type="button"
            className={`product-gallery__main ${enableZoom ? "is-zoomable" : ""}`}
            onClick={() => enableFullscreen && setIsFullscreenOpen(true)}
            aria-label={enableFullscreen ? `Open ${activeImage.description} in fullscreen` : activeImage.description}
          >
            <div className="product-gallery__main-frame">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage.url}
                  src={activeImage.url}
                  alt={activeImage.description}
                  className="product-gallery__image"
                  loading="lazy"
                  decoding="async"
                  initial={{ opacity: 0.2, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0.15, scale: 1.01 }}
                  transition={{ duration: 0.26, ease: "easeOut" }}
                  onError={handleImageError}
                />
              </AnimatePresence>
            </div>

            <div className="product-gallery__meta">
              <span className="product-gallery__caption">{activeImage.description}</span>
              <span className="product-gallery__counter">{activeIndex + 1} / {galleryImages.length}</span>
            </div>
          </button>
        </div>

        {galleryImages.length > 1 ? (
          <div className="product-gallery__thumbs" role="list" aria-label="Product thumbnails">
            {galleryImages.map((image, index) => (
              <button
                key={`${image.url}-${index}`}
                type="button"
                className={`product-gallery__thumb ${activeIndex === index ? "is-active" : ""}`}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show ${image.description}`}
                aria-pressed={activeIndex === index}
                title={image.description}
              >
                <img
                  src={image.url}
                  alt={image.description}
                  className="product-gallery__thumb-image"
                  loading="lazy"
                  decoding="async"
                  onError={handleImageError}
                />
                <span className="product-gallery__thumb-ring" aria-hidden="true" />
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {enableFullscreen && isFullscreenOpen ? (
          <motion.div
            className="product-gallery__overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => setIsFullscreenOpen(false)}
          >
            <button
              type="button"
              className="product-gallery__overlay-close"
              onClick={() => setIsFullscreenOpen(false)}
              aria-label="Close fullscreen image"
            >
              ✕
            </button>

            {hasMultipleImages ? (
              <>
                <button
                  type="button"
                  className="product-gallery__nav product-gallery__nav--prev product-gallery__nav--overlay"
                  onClick={(event) => {
                    event.stopPropagation();
                    handlePrevImage();
                  }}
                  aria-label="Previous image"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="product-gallery__nav product-gallery__nav--next product-gallery__nav--overlay"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleNextImage();
                  }}
                  aria-label="Next image"
                >
                  ›
                </button>
              </>
            ) : null}

            <motion.img
              key={`overlay-${activeImage.url}`}
              src={activeImage.url}
              alt={activeImage.description}
              className="product-gallery__overlay-image"
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0.2, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.1, scale: 0.985 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
              onError={handleImageError}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
});

export default ProductGallery;