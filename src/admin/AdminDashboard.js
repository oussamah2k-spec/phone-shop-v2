import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { serverTimestamp } from "firebase/firestore";
import {
  LayoutDashboard,
  Car,
  AlertTriangle,
  XCircle,
  Clock,
  LogOut as LogOutIcon,
  Settings as SettingsDrawerIcon,
  User,
  Mail,
  BadgeCheck,
  X,
} from "lucide-react";
import { addCar, deleteCar, subscribeAllCars, updateCar } from "../firebase/cars";
import { useAuth } from "../contexts/AuthContext";
import { getCarsLimit } from "../utils/limits";
import { uploadToCloudinary } from "../utils/cloudinary";
import "../styles/App.css";

const PLACEHOLDER_IMAGE = "/placeholder.png";
const ADMIN_UID = "ydasD0Te2vYPQV2NrhBfRTtkyiD3";
const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const DEFAULT_CAR_TYPE = "Sedan";
const DEFAULT_IMAGE_DESCRIPTIONS = [
  "Main car view",
  "Interior view",
  "Rear view",
  "Side view",
  "Dashboard",
];

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Cars", icon: Car },
  { label: "Settings", icon: SettingsDrawerIcon }
];

const initialForm = {
  name: "",
  price: "",
  oldPrice: "",
  description: "",
  brand: DEFAULT_CAR_TYPE,
  features: [],
  stock: "Available",
  featured: false,
};

function normalizeCarType(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCarTypeLabel(value) {
  return normalizeCarType(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapLegacyBrandToCarType(brandValue) {
  const normalized = String(brandValue || "").trim().toLowerCase();

  if (normalized === "iphone") {
    return "Sedan";
  }

  if (normalized === "samsung") {
    return "SUV";
  }

  if (normalized === "xiaomi") {
    return "Luxury";
  }

  return String(brandValue || DEFAULT_CAR_TYPE);
}

function normalizeFeatures(featuresValue) {
  if (!Array.isArray(featuresValue)) {
    return [];
  }

  return featuresValue
    .map((feature) => String(feature || "").trim())
    .filter(Boolean);
}

function formatPriceLabel(priceValue) {
  const normalizedValue = String(priceValue ?? "").replace(/\$/g, "").trim();
  if (!normalizedValue) {
    return "0 DH";
  }

  return /\bDH\b/i.test(normalizedValue) ? normalizedValue : `${normalizedValue} DH`;
}

function getDefaultImageDescription(index, carName = "Car") {
  return DEFAULT_IMAGE_DESCRIPTIONS[index] || `${carName} view ${index + 1}`;
}

function normalizeProductImages(product) {
  const explicitImages = Array.isArray(product?.images)
    ? product.images
      .map((entry, index) => {
        if (typeof entry === "string") {
          const normalizedUrl = entry.trim();
          if (!normalizedUrl) {
            return null;
          }

          return {
            url: normalizedUrl,
            description: getDefaultImageDescription(index, product?.name || "Car"),
          };
        }

        if (entry && typeof entry === "object") {
          const normalizedUrl = String(entry.url || entry.imageUrl || entry.src || "").trim();
          if (!normalizedUrl) {
            return null;
          }

          return {
            url: normalizedUrl,
            description: String(entry.description || getDefaultImageDescription(index, product?.name || "Car")),
          };
        }

        return null;
      })
      .filter(Boolean)
    : [];

  if (explicitImages.length > 0) {
    return explicitImages;
  }

  if (typeof product?.imageUrl === "string" && product.imageUrl.trim().length > 0) {
    return [{
      url: product.imageUrl.trim(),
      description: getDefaultImageDescription(0, product?.name || "Car"),
    }];
  }

  return [{
    url: PLACEHOLDER_IMAGE,
    description: getDefaultImageDescription(0, product?.name || "Car"),
  }];
}

const normalizeProduct = (product, fallbackId) => {
  const images = normalizeProductImages(product);

  return {
    id: product?.id || fallbackId || "",
    name: product?.name || "",
    price: product?.price || "",
    oldPrice: product?.oldPrice || "",
    description: product?.description || "",
    brand: mapLegacyBrandToCarType(product?.brand || product?.category),
    features: normalizeFeatures(product?.features),
    imageUrl: images[0]?.url || PLACEHOLDER_IMAGE,
    images,
    stock: product?.stock || "Available",
    featured: Boolean(product?.featured),
    createdAt:
      product?.createdAt && typeof product.createdAt?.toMillis === "function"
        ? product.createdAt.toMillis()
        : Number(product?.createdAt) || Date.now(),
    updatedAt:
      product?.updatedAt && typeof product.updatedAt?.toMillis === "function"
        ? product.updatedAt.toMillis()
        : Number(product?.updatedAt) || Date.now(),
  };
};

function getPrimaryProductImage(product) {
  if (Array.isArray(product?.images) && product.images.length > 0) {
    const firstImage = product.images[0];

    if (typeof firstImage === "string") {
      return firstImage || PLACEHOLDER_IMAGE;
    }

    if (firstImage && typeof firstImage === "object") {
      return String(firstImage.url || firstImage.imageUrl || firstImage.src || "").trim() || PLACEHOLDER_IMAGE;
    }

    return PLACEHOLDER_IMAGE;
  }

  return product?.imageUrl || PLACEHOLDER_IMAGE;
}

function LoadingSpinner() {
  return <div className="admin-spinner" />;
}

function InputField({
  id,
  label,
  required = false,
  error,
  hint,
  multiline = false,
  children,
  className = "",
  ...inputProps
}) {
  const describedBy = [error ? `${id}-error` : "", hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`form-group ${className}`.trim()}>
      <label htmlFor={id}>{label}{required ? " *" : ""}</label>
      {children || (multiline ? (
        <textarea
          id={id}
          className={error ? "input-invalid" : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
      ) : (
        <input
          id={id}
          className={error ? "input-invalid" : ""}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...inputProps}
        />
      ))}
      {hint ? <p id={`${id}-hint`} className="field-note">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="field-error" role="alert">{error}</p> : null}
    </div>
  );
}

function ImageUpload({
  imageInputRef,
  isImageDropActive,
  isUploadingImages,
  uploadError,
  selectedImages,
  sortedDraftImages,
  formName,
  modalPreviewImage,
  onDrop,
  onDragOver,
  onDragLeave,
  onImageChange,
  onDescriptionChange,
  onSetMain,
  onRemove,
}) {
  return (
    <div className="form-group">
      <label htmlFor="image">Image upload</label>
      <label
        htmlFor="image"
        className={`file-upload premium-dropzone ${isImageDropActive ? "is-drop-active" : ""}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        <input
          id="image"
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          disabled={isUploadingImages}
          onChange={onImageChange}
          className="file-input"
        />
        <p className="file-upload-title">Drop images or click to upload</p>
        <p className="file-hint">
          {isUploadingImages
            ? "Uploading image..."
            : selectedImages.length > 0
            ? `${selectedImages.length} image(s) ready`
            : "JPG/PNG recommended, high quality cover photos"}
        </p>
      </label>

      {uploadError ? <p className="field-error" role="alert">Upload failed</p> : null}

      {sortedDraftImages.length > 0 ? (
        <div className="image-preview-grid" aria-label="Selected car images">
          {sortedDraftImages.map((image, index) => (
            <div
              key={image.id}
              className={`image-preview-tile ${index === 0 ? "is-main" : ""}`}
            >
              <img
                src={image.url || PLACEHOLDER_IMAGE}
                alt={`${formName || "Car"} preview ${index + 1}`}
                className="preview-image"
                onError={(event) => {
                  event.target.src = "/placeholder.png";
                }}
              />
              <input
                type="text"
                className="image-description-input"
                placeholder="Describe this image"
                value={image.description || ""}
                onChange={(event) => onDescriptionChange(image.id, event.target.value)}
                aria-label={`Image description ${index + 1}`}
              />
              <div className="image-preview-actions">
                <button
                  type="button"
                  className={`ghost-btn ${index === 0 ? "active" : ""}`}
                  onClick={() => onSetMain(image.id)}
                  disabled={index === 0}
                >
                  {index === 0 ? "Main" : "Set main"}
                </button>
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => onRemove(image.id)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {modalPreviewImage && (
        <div className="image-preview-card">
          <p className="preview-label">Main image preview</p>
          <img
            src={modalPreviewImage}
            alt={formName || "Preview"}
            className="preview-image"
            onError={(event) => {
              event.target.src = "/placeholder.png";
            }}
          />
        </div>
      )}
    </div>
  );
}

async function compressImageFile(file) {
  if (!(file instanceof File) || !ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return null;
  }

  try {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = sourceUrl;
    });

    const maxDimension = 1600;
    const ratio = Math.min(maxDimension / image.width, maxDimension / image.height, 1);
    const targetWidth = Math.max(1, Math.round(image.width * ratio));
    const targetHeight = Math.max(1, Math.round(image.height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      URL.revokeObjectURL(sourceUrl);
      return file;
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);
    URL.revokeObjectURL(sourceUrl);

    const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
    const quality = outputType === "image/png" ? undefined : 0.82;

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, quality));
    if (!blob) {
      return file;
    }

    if (blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name, {
      type: outputType,
      lastModified: Date.now(),
    });
  } catch (error) {
    return file;
  }
}

function Admin() {
  const navigate = useNavigate();
  const { user, userPlan, logout, loading: authLoading, isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [activeTab, setActiveTab] = useState("Dashboard");
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    carTypes: ["Sedan", "SUV"].map(normalizeCarType),
  });
  const [selectedType, setSelectedType] = useState("");
  const [newType, setNewType] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandFilter, setBrandFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [featureInput, setFeatureInput] = useState("");
  const [selectedImages, setSelectedImages] = useState([]);
  const [mainImageId, setMainImageId] = useState("");
  const [isImageDropActive, setIsImageDropActive] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageUrlDescriptionInput, setImageUrlDescriptionInput] = useState("Main car view");
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [toasts, setToasts] = useState([]);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const nameInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const addToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  // Load cars from Firestore
  useEffect(() => {
    const unsubscribe = subscribeAllCars(
      (cars) => {
        const mapped = cars
          .map((car) => normalizeProduct({ ...car, id: car.id }, car.id))
          .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));
        setProducts(mapped);
        setLoading(false);
      },
      (error) => {
        console.error("Failed to load cars:", error);
        addToast("error", "Could not load cars");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [addToast]);

  const revokeObjectUrls = useCallback((entries) => {
    entries.forEach((entry) => {
      if (entry?.isObjectUrl && typeof entry?.url === "string") {
        URL.revokeObjectURL(entry.url);
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      revokeObjectUrls(selectedImages);
    };
  }, [revokeObjectUrls, selectedImages]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const normalizedBrandFilter = normalizeCarType(brandFilter);
    return products.filter((product) => {
      const matchName = !normalizedSearch || product.name.toLowerCase().includes(normalizedSearch);
      const matchBrand = brandFilter === "All" || normalizeCarType(product.brand) === normalizedBrandFilter;
      return matchName && matchBrand;
    });
  }, [products, searchTerm, brandFilter]);

  const carTypeOptions = useMemo(() => formData.carTypes, [formData.carTypes]);

  const dashboardStats = useMemo(() => {
    const outOfStockCount = products.filter((product) => product.stock === "Out of stock").length;
    const featuredCount = products.filter((product) => product.featured).length;
    const lowStockCount = products.filter((product) => product.stock === "Low stock").length;
    return {
      totalProducts: products.length,
      featuredCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  const recentActivity = useMemo(() => products.slice(0, 5), [products]);

  // Check plan limits
  const planLimit = getCarsLimit(userPlan);
  const canAddProduct = dashboardStats.totalProducts < planLimit;
  const isAdminUid = user?.uid === ADMIN_UID;

  const resetModalState = useCallback(() => {
    revokeObjectUrls(selectedImages);
    setForm(initialForm);
    setSelectedType("");
    setNewType("");
    setSelectedImages([]);
    setMainImageId("");
    setIsImageDropActive(false);
    setImageUrlInput("");
    setImageUrlDescriptionInput("Main car view");
    setIsUploadingImages(false);
    setUploadError("");
    setFeatureInput("");
    setEditingId("");
    setFormErrors({});
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, [revokeObjectUrls, selectedImages]);

  const openAddModal = () => {
    if (!canAddProduct) {
      addToast("error", `You've reached the ${planLimit} car limit. Upgrade your plan.`);
      return;
    }
    resetModalState();
    setIsModalOpen(true);
  };

  const openEditModal = (product) => {
    const normalizedBrandType = normalizeCarType(mapLegacyBrandToCarType(product.brand));

    setFormData((prev) => {
      if (!normalizedBrandType) return prev;
      if (prev.carTypes.some((type) => type.toLowerCase() === normalizedBrandType.toLowerCase())) {
        return prev;
      }

      return {
        ...prev,
        carTypes: [...prev.carTypes, normalizedBrandType],
      };
    });

    const editableImages = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [product.imageUrl || PLACEHOLDER_IMAGE];

    const imageEntries = editableImages.map((imageEntry, index) => ({
      id: `existing-${index}-${Date.now()}`,
      url: typeof imageEntry === "string"
        ? imageEntry
        : String(imageEntry?.url || imageEntry?.imageUrl || imageEntry?.src || "").trim() || PLACEHOLDER_IMAGE,
      description: typeof imageEntry === "object" && imageEntry?.description
        ? String(imageEntry.description)
        : getDefaultImageDescription(index, product?.name || "Car"),
      file: null,
      isObjectUrl: false,
    }));

    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: product.price || "",
      oldPrice: product.oldPrice || "",
      description: product.description || "",
      brand: mapLegacyBrandToCarType(product.brand),
      features: normalizeFeatures(product.features),
      stock: product.stock || "Available",
      featured: Boolean(product.featured),
    });
    setSelectedType(normalizedBrandType);
    setSelectedImages(imageEntries);
    setMainImageId(imageEntries[0]?.id || "");
    setImageUrlInput(product.imageUrl || "");
    setImageUrlDescriptionInput(imageEntries[0]?.description || "Main car view");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    resetModalState();
  };

  useEffect(() => {
    if (!isModalOpen) return undefined;

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("modal-open");
    document.documentElement.classList.add("modal-open");

    const focusTimer = window.requestAnimationFrame(() => {
      nameInputRef.current?.focus();
    });

    const handleEscapeKey = (event) => {
      if (event.key !== "Escape" || isSubmitting) return;
      setIsModalOpen(false);
      resetModalState();
    };

    window.addEventListener("keydown", handleEscapeKey);

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.classList.remove("modal-open");
      document.documentElement.classList.remove("modal-open");
      window.cancelAnimationFrame(focusTimer);
      window.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isModalOpen, isSubmitting, resetModalState]);

  const handleOverlayPointerDown = (event) => {
    if (event.target !== event.currentTarget) return;
    closeModal();
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setFormErrors((prev) => {
      if (!prev[name]) return prev;
      const nextErrors = { ...prev };
      delete nextErrors[name];
      return nextErrors;
    });
  };

  const appendImageFiles = useCallback(async (files) => {
    setUploadError("");
    const fileList = Array.from(files || []);
    const filteredFiles = fileList.filter((file) => ACCEPTED_IMAGE_TYPES.has(file.type));

    if (filteredFiles.length === 0) {
      addToast("error", "Only JPG and PNG files are supported.");
      return;
    }

    const compressedFiles = await Promise.all(
      filteredFiles.map(async (file) => {
        const compressed = await compressImageFile(file);
        return compressed || file;
      })
    );
    setIsUploadingImages(true);

    try {
      const timestamp = Date.now();
      const uploadedUrls = await Promise.all(
        compressedFiles.map((file) => uploadToCloudinary(file))
      );

      const nextEntries = uploadedUrls.map((url, index) => ({
        id: `file-${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`,
        url,
        description: getDefaultImageDescription(index, form.name.trim() || "Car"),
        file: null,
        isObjectUrl: false,
      }));

      setSelectedImages((prev) => {
        const merged = [...prev, ...nextEntries];
        if (!mainImageId && merged.length > 0) {
          setMainImageId(merged[0].id);
        }
        return merged;
      });
      setImageUrlInput((prev) => prev.trim() || uploadedUrls[0] || "");
    } catch (error) {
      const message = error?.message || "Upload failed";
      setUploadError(message);
      addToast("error", message);
    } finally {
      setIsUploadingImages(false);
    }
  }, [addToast, form.name, mainImageId]);

  const handleImageChange = useCallback(async (event) => {
    await appendImageFiles(event.target.files);
    event.target.value = "";
  }, [appendImageFiles]);

  const handleImageDrop = useCallback(async (event) => {
    event.preventDefault();
    setIsImageDropActive(false);
    await appendImageFiles(event.dataTransfer?.files);
  }, [appendImageFiles]);

  const handleImageDragOver = useCallback((event) => {
    event.preventDefault();
    setIsImageDropActive(true);
  }, []);

  const handleImageDragLeave = useCallback((event) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    setIsImageDropActive(false);
  }, []);

  const handleRemoveDraftImage = useCallback((imageId) => {
    setSelectedImages((prev) => {
      const target = prev.find((entry) => entry.id === imageId);
      if (target?.isObjectUrl) {
        URL.revokeObjectURL(target.url);
      }

      const filtered = prev.filter((entry) => entry.id !== imageId);
      if (mainImageId === imageId) {
        setMainImageId(filtered[0]?.id || "");
      }
      return filtered;
    });
  }, [mainImageId]);

  const handleSelectMainImage = useCallback((imageId) => {
    setMainImageId(imageId);
  }, []);

  const handleImageUrlChange = (event) => {
    setImageUrlInput(event.target.value);
  };

  const handleImageDescriptionChange = useCallback((imageId, value) => {
    setSelectedImages((prev) => prev.map((entry) => (
      entry.id === imageId
        ? { ...entry, description: value }
        : entry
    )));
  }, []);

  const handleAddFeature = useCallback(() => {
    const nextFeature = featureInput.trim();
    if (!nextFeature) {
      return;
    }

    setForm((prev) => {
      const normalizedNext = nextFeature.toLowerCase();
      const exists = normalizeFeatures(prev.features).some((feature) => feature.toLowerCase() === normalizedNext);
      if (exists) {
        return prev;
      }

      return {
        ...prev,
        features: [...normalizeFeatures(prev.features), nextFeature],
      };
    });

    setFeatureInput("");
  }, [featureInput]);

  const handleRemoveFeature = useCallback((indexToRemove) => {
    setForm((prev) => ({
      ...prev,
      features: normalizeFeatures(prev.features).filter((_, index) => index !== indexToRemove),
    }));
  }, []);

  const handleSelectType = useCallback((type) => {
    const normalizedType = normalizeCarType(type);
    setSelectedType(normalizedType);
    setForm((prev) => ({ ...prev, brand: normalizedType ? formatCarTypeLabel(normalizedType) : DEFAULT_CAR_TYPE }));
  }, []);

  const handleAddCarType = useCallback(() => {
    const value = newType.trim().toLowerCase();
    if (!value) return;

    let wasAdded = false;
    setFormData((prev) => {
      if (prev.carTypes.some((type) => type.toLowerCase() === value)) {
        return prev;
      }

      wasAdded = true;
      return {
        ...prev,
        carTypes: [...prev.carTypes, value],
      };
    });

    if (!wasAdded) {
      addToast("warning", "This car type already exists");
      return;
    }

    handleSelectType(value);
    setNewType("");
  }, [newType, addToast, handleSelectType]);

  const handleDeleteCarType = useCallback((indexToRemove) => {
    const deletedType = formData.carTypes[indexToRemove];

    setFormData((prev) => {
      const nextCarTypes = prev.carTypes.filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        carTypes: nextCarTypes,
      };
    });

    if (normalizeCarType(selectedType) === normalizeCarType(deletedType)) {
      setSelectedType("");
      setForm((prev) => ({ ...prev, brand: DEFAULT_CAR_TYPE }));
    }
  }, [formData.carTypes, selectedType]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated || !user?.uid || !isAdminUid) {
      addToast("error", "Not authorized");
      return;
    }

    if (isUploadingImages) {
      addToast("warning", "Uploading...");
      return;
    }

    if (uploadError) {
      addToast("error", uploadError);
      return;
    }

    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Product name is required";
    if (!form.price.trim()) nextErrors.price = "Price is required";
    if (!form.description.trim()) nextErrors.description = "Description is required";

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      addToast("error", "Name, price, and description are required");
      return;
    }

    try {
      setIsSubmitting(true);
      const directImageUrl = imageUrlInput.trim();
      const preparedEntries = [];

      for (const imageEntry of selectedImages) {
        if (typeof imageEntry.url === "string" && imageEntry.url.trim()) {
          preparedEntries.push({
            id: imageEntry.id,
            url: imageEntry.url.trim(),
            description: String(imageEntry.description || getDefaultImageDescription(preparedEntries.length, form.name.trim() || "Car")),
          });
        }
      }

      if (directImageUrl) {
        const hasDirectUrl = preparedEntries.some((entry) => entry.url === directImageUrl);
        if (!hasDirectUrl) {
          preparedEntries.push({
            id: "direct-url",
            url: directImageUrl,
            description: String(imageUrlDescriptionInput.trim() || getDefaultImageDescription(preparedEntries.length, form.name.trim() || "Car")),
          });
        }
      }

      if (preparedEntries.length === 0) {
        addToast("error", "Please upload an image before saving");
        setIsSubmitting(false);
        return;
      }

      const selectedMain = preparedEntries.find((entry) => entry.id === mainImageId);
      const orderedEntries = selectedMain
        ? [
            selectedMain,
            ...preparedEntries.filter((entry) => entry.id !== mainImageId),
          ]
        : preparedEntries;

      const images = orderedEntries.map((entry, index) => ({
        url: entry.url,
        description: String(entry.description || getDefaultImageDescription(index, form.name.trim() || "Car")),
      }));
      const imageUrl = images[0]?.url || PLACEHOLDER_IMAGE;
      const features = normalizeFeatures(form.features);

      if (editingId) {
        const currentProduct = products.find((product) => product.id === editingId);
        await updateCar(editingId, {
          title: form.name.trim(),
          name: form.name.trim(),
          price: form.price.trim(),
          oldPrice: form.oldPrice.trim(),
          description: form.description.trim(),
          brand: form.brand || DEFAULT_CAR_TYPE,
          category: form.brand || DEFAULT_CAR_TYPE,
          image: imageUrl,
          imageUrl,
          images,
          features,
          stock: form.stock || "Available",
          featured: Boolean(form.featured),
          createdAt: currentProduct?.createdAt ? currentProduct.createdAt : serverTimestamp(),
        });
        addToast("success", "Product updated");
      } else {
        if (!canAddProduct) {
          addToast("error", `Reached ${planLimit} car limit. Upgrade your plan.`);
          setIsSubmitting(false);
          return;
        }

        await addCar({
          title: form.name.trim(),
          name: form.name.trim(),
          price: form.price.trim(),
          oldPrice: form.oldPrice.trim(),
          description: form.description.trim(),
          brand: form.brand || DEFAULT_CAR_TYPE,
          category: form.brand || DEFAULT_CAR_TYPE,
          image: imageUrl,
          imageUrl,
          images,
          features,
          stock: form.stock || "Available",
          featured: Boolean(form.featured),
          userId: user?.uid || "",
        });
        addToast("success", "Car added successfully");
      }

      closeModal();
    } catch (error) {
      addToast("error", error?.message || "Failed to save. Please try again");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    const shouldDelete = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!shouldDelete) return;

    try {
      setDeletingId(product.id);
      await deleteCar(product.id);
      addToast("success", "Product deleted");
    } catch (error) {
      console.error("Failed to delete product:", error);
      addToast("error", "Failed to delete product");
    } finally {
      setDeletingId("");
    }
  };

  const handleLogout = async () => {
    try {
      setLogoutLoading(true);
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      addToast("error", "Logout failed");
    } finally {
      setLogoutLoading(false);
    }
  };

  const sortedDraftImages = useMemo(() => {
    const currentMain = selectedImages.find((entry) => entry.id === mainImageId);
    if (!currentMain) {
      return selectedImages;
    }

    return [currentMain, ...selectedImages.filter((entry) => entry.id !== mainImageId)];
  }, [mainImageId, selectedImages]);

  const modalPreviewImage = sortedDraftImages[0]?.url || imageUrlInput.trim() || PLACEHOLDER_IMAGE;
  const productModal = isModalOpen
    ? createPortal(
        <div
          className="modal-overlay"
          onMouseDown={handleOverlayPointerDown}
          role="presentation"
        >
          <div
            className="modal-content admin-product-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="product-modal-title"
            aria-describedby="product-modal-description"
            onMouseDown={(event) => event.stopPropagation()}
            tabIndex={-1}
          >
            <div className="modal-content-shell">
              <div className="modal-content-header">
                <div className="modal-header">
                  <span className="modal-kicker">SaaS inventory</span>
                  <h2 id="product-modal-title">{editingId ? "Edit Car" : "Add New Car"}</h2>
                  <p id="product-modal-description">
                    Fill details to create a premium listing
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close-btn"
                  onClick={closeModal}
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <form className="product-form modal-product-form premium-car-form" onSubmit={handleSubmit}>
                <div className="form-section-intro">
                  <p>Section 1: Car basics</p>
                  <span>Fill required details to publish your listing.</span>
                </div>

                <InputField
                  id="name"
                  name="name"
                  label="Car name"
                  required
                  error={formErrors.name}
                  value={form.name}
                  onChange={handleInputChange}
                  placeholder="e.g., Mercedes S-Class"
                  autoComplete="off"
                  inputMode="text"
                >
                  <input
                    ref={nameInputRef}
                    id="name"
                    name="name"
                    type="text"
                    className={formErrors.name ? "input-invalid" : ""}
                    value={form.name}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(formErrors.name)}
                    aria-describedby={formErrors.name ? "name-error" : undefined}
                    placeholder="e.g., Mercedes S-Class"
                    required
                  />
                </InputField>

                <div className="form-row form-row-3">
                  <InputField
                    id="price"
                    name="price"
                    label="Price"
                    required
                    error={formErrors.price}
                    value={form.price}
                    onChange={handleInputChange}
                    placeholder="e.g., 250"
                  />
                  <InputField
                    id="oldPrice"
                    name="oldPrice"
                    label="Old price"
                    value={form.oldPrice}
                    onChange={handleInputChange}
                    placeholder="e.g., 320"
                  />
                  <InputField id="brand" label="Car type">
                    <select
                      id="brand"
                      name="brand"
                      value={selectedType}
                      onChange={(event) => handleSelectType(event.target.value)}
                    >
                      <option value="">Select car type</option>
                      {carTypeOptions.map((carType) => (
                        <option key={carType} value={carType}>{formatCarTypeLabel(carType)}</option>
                      ))}
                    </select>
                  </InputField>
                </div>

                <div className="car-type-add-row">
                  <input
                    type="text"
                    value={newType}
                    onChange={(event) => setNewType(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddCarType();
                      }
                    }}
                    placeholder="Add custom car type"
                    aria-label="Add car type"
                  />
                  <button
                    type="button"
                    className="add-car-type-btn"
                    onClick={handleAddCarType}
                    disabled={!newType.trim()}
                  >
                    + Add
                  </button>
                </div>

                {formData.carTypes.length > 0 ? (
                  <div className="car-type-tags" aria-label="Saved car types">
                    {formData.carTypes.map((type, index) => (
                      <div key={index} className={`car-type-tag ${selectedType === type ? "is-active" : ""}`}>
                        <button
                          type="button"
                          className="type-chip-label"
                          onClick={() => handleSelectType(type)}
                          aria-label={`Select ${type}`}
                        >
                          {formatCarTypeLabel(type)}
                        </button>
                        <button
                          type="button"
                          className="type-chip-remove"
                          aria-label={`Remove ${type}`}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDeleteCarType(index);
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="form-section-intro">
                  <p>Section 2: Description</p>
                </div>

                <InputField
                  id="description"
                  name="description"
                  label="Description"
                  required
                  error={formErrors.description}
                  multiline
                  rows={5}
                  value={form.description}
                  onChange={handleInputChange}
                  placeholder="Write a premium car summary, key comfort features, and rental highlights..."
                />

                <InputField id="features" label="Features">
                  <div className="feature-input-group">
                    <input
                      id="features"
                      name="features"
                      type="text"
                      value={featureInput}
                      onChange={(event) => setFeatureInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      placeholder="Add feature (e.g., GPS)"
                    />
                    <button
                      type="button"
                      className="add-car-type-btn"
                      onClick={handleAddFeature}
                      disabled={!featureInput.trim()}
                    >
                      Add
                    </button>
                  </div>

                  {normalizeFeatures(form.features).length > 0 ? (
                    <div className="feature-tags" aria-label="Selected features">
                      {normalizeFeatures(form.features).map((feature, index) => (
                        <span key={`${feature}-${index}`} className="feature-tag">
                          {feature}
                          <button
                            type="button"
                            aria-label={`Remove ${feature}`}
                            onClick={() => handleRemoveFeature(index)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </InputField>

                <div className="form-row">
                  <InputField id="stock" label="Availability">
                    <select id="stock" name="stock" value={form.stock} onChange={handleInputChange}>
                      <option value="Available">Available</option>
                      <option value="Low stock">Low stock</option>
                      <option value="Out of stock">Out of stock</option>
                    </select>
                  </InputField>

                  <div className="form-group checkbox-group">
                    <label htmlFor="featured">
                      <input
                        id="featured"
                        name="featured"
                        type="checkbox"
                        checked={Boolean(form.featured)}
                        onChange={handleInputChange}
                      />
                      <span>Mark as featured car</span>
                    </label>
                  </div>
                </div>

                <div className="form-section-intro">
                  <p>Section 3: Image upload</p>
                </div>

                <InputField
                  id="imageUrl"
                  name="imageUrl"
                  label="Image URL (optional)"
                  value={imageUrlInput}
                  onChange={handleImageUrlChange}
                  type="url"
                  placeholder="https://images.example.com/car.jpg"
                  hint="Paste a direct image URL or upload files below."
                />

                <InputField
                  id="imageUrlDescription"
                  name="imageUrlDescription"
                  label="URL image description"
                  value={imageUrlDescriptionInput}
                  onChange={(event) => setImageUrlDescriptionInput(event.target.value)}
                  placeholder="Main exterior angle"
                  className="image-description-field"
                />

                <ImageUpload
                  imageInputRef={imageInputRef}
                  isImageDropActive={isImageDropActive}
                  isUploadingImages={isUploadingImages}
                  uploadError={uploadError}
                  selectedImages={selectedImages}
                  sortedDraftImages={sortedDraftImages}
                  formName={form.name}
                  modalPreviewImage={modalPreviewImage}
                  onDrop={handleImageDrop}
                  onDragOver={handleImageDragOver}
                  onDragLeave={handleImageDragLeave}
                  onImageChange={handleImageChange}
                  onDescriptionChange={handleImageDescriptionChange}
                  onSetMain={handleSelectMainImage}
                  onRemove={handleRemoveDraftImage}
                />

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-btn submit-btn"
                    disabled={isSubmitting || isUploadingImages || Boolean(uploadError) || !isAdminUid}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner /> Saving...
                      </>
                    ) : isUploadingImages ? (
                      "Uploading image..."
                    ) : editingId ? (
                      "Update Car"
                    ) : (
                      "Add Car"
                    )}
                  </button>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={closeModal}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  if (authLoading) {
    return (
      <div className="session-loader-screen">
        <div className="session-loader-card panel">
          <LoadingSpinner />
          <p>Loading your admin workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="saas-admin-page">
      <aside className="saas-admin-sidebar panel">
        <div className="saas-sidebar-logo">
          <p className="saas-sidebar-logo-title">BIZZINE CARS</p>
          <p className="saas-sidebar-logo-sub">Admin Panel</p>
        </div>

        <nav className="saas-admin-nav" aria-label="Admin navigation">
          <div className="saas-admin-nav-primary">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`saas-nav-btn sidebar-item ${activeTab === item.label ? "active" : ""}`}
                onClick={() => {
                  if (item.label === "Settings") {
                    setIsSettingsDrawerOpen(true);
                    return;
                  }
                  setActiveTab(item.label);
                }}
                aria-current={activeTab === item.label ? "page" : undefined}
              >
                <span className="nav-icon"><item.icon size={18} /></span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="saas-admin-nav-utility">
            <Link to="/" className="saas-nav-btn sidebar-item">
              <span className="nav-icon"><LogOutIcon size={18} /></span>
              <span>Back to Store</span>
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <p className="user-email">{user?.email}</p>
            <p className="user-plan">{userPlan?.type} • {dashboardStats.totalProducts}/{planLimit} cars</p>
          </div>
          <button
            className="logout-btn ghost-btn"
            onClick={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <section className="saas-admin-content panel">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <p className="admin-topbar-breadcrumb">Admin · BIZZINE CARS</p>
            <h1 className="admin-topbar-title">{activeTab}</h1>
          </div>

          <div className="admin-account-chip">
            <p className="admin-account-email">{user?.email}</p>
            <button
              type="button"
              className="ghost-btn admin-topbar-logout"
              onClick={handleLogout}
              disabled={logoutLoading}
            >
              {logoutLoading ? "Logging out..." : "Logout"}
            </button>
          </div>
        </header>

        <div className="admin-main-scroll">
        {activeTab === "Dashboard" && (
          <div className="admin-dashboard">
            <p className="admin-tab-sub">Real-time overview of your fleet performance</p>

            <div className="admin-stats-grid">
              <article className="stat-card">
                <div className="stat-header">
                  <Car size={18} className="stat-card-icon" />
                  <span className="stat-card-label">Total Cars</span>
                </div>
                <h3 className="stat-card-value">{dashboardStats.totalProducts}</h3>
                <p className="stat-card-change">{planLimit - dashboardStats.totalProducts} slots remaining</p>
              </article>

              <article className="stat-card">
                <div className="stat-header">
                  <LayoutDashboard size={18} className="stat-card-icon" />
                  <span className="stat-card-label">Featured Cars</span>
                </div>
                <h3 className="stat-card-value">{dashboardStats.featuredCount}</h3>
                <p className="stat-card-change">Highlighted in storefront</p>
              </article>

              <article className="stat-card stat-card-warning">
                <div className="stat-header">
                  <AlertTriangle size={18} className="stat-card-icon stat-icon-warning" />
                  <span className="stat-card-label">Low Stock</span>
                </div>
                <h3 className="stat-card-value stat-val-warning">{dashboardStats.lowStockCount}</h3>
                <p className="stat-card-change">Restock soon</p>
              </article>

              <article className="stat-card stat-card-danger">
                <div className="stat-header">
                  <XCircle size={18} className="stat-card-icon stat-icon-danger" />
                  <span className="stat-card-label">Out of Stock</span>
                </div>
                <h3 className="stat-card-value stat-val-danger">{dashboardStats.outOfStockCount}</h3>
                <p className="stat-card-change">Needs attention</p>
              </article>
            </div>

            <section className="saas-activity panel">
              <header className="panel-header compact">
                <h3>Recent Activity</h3>
              </header>

              {recentActivity.length === 0 ? (
                <p className="empty-note">No activity yet. Add your first product!</p>
              ) : (
                <div className="saas-activity-list">
                  {recentActivity.map((product) => (
                    <article key={product.id} className="activity-item">
                      <div className="activity-left">
                        <Clock size={16} className="activity-icon" />
                        <div>
                          <h4>{product.name || "Untitled"}</h4>
                          <p className="activity-meta">
                            {mapLegacyBrandToCarType(product.brand)} - {product.price}
                          </p>
                        </div>
                      </div>
                      <span className="activity-type">{new Date(product.updatedAt || Date.now()).toLocaleDateString()}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "Cars" && (
          <div className="admin-products">
            <p className="admin-tab-sub">Manage your fleet — {dashboardStats.totalProducts}/{planLimit} cars</p>

            <div className="saas-products-toolbar">
              <div className="toolbar-search">
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search cars..."
                  aria-label="Search cars"
                  className="search-input"
                />
              </div>

              <select
                value={brandFilter}
                onChange={(event) => setBrandFilter(event.target.value)}
                className="toolbar-select"
                aria-label="Filter by car type"
              >
                <option value="All">All Car Types</option>
                {carTypeOptions.map((carType) => (
                  <option key={carType} value={carType}>{formatCarTypeLabel(carType)}</option>
                ))}
              </select>

              <button
                type="button"
                className="primary-btn"
                onClick={openAddModal}
                disabled={!canAddProduct || !isAdminUid}
              >
                {!isAdminUid ? "Admin Only" : canAddProduct ? "+ Add Car" : "Limit Reached"}
              </button>
            </div>

            <div className="saas-table-wrap">
              {loading ? (
                <div className="loading-container">
                  <LoadingSpinner />
                  <p>Loading cars...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="empty-state-table">
                  <p className="empty-icon">No items</p>
                  <p className="empty-title">No cars available yet</p>
                  <p className="empty-subtitle">
                    {searchTerm || brandFilter !== "All"
                      ? "Try adjusting your filters"
                      : "Create your first car to get started"}
                  </p>
                </div>
              ) : (
                <table className="saas-products-table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Price</th>
                      <th>Car Type</th>
                      <th>Stock</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="product-row">
                        <td className="table-image-cell">
                          <img
                            src={getPrimaryProductImage(product)}
                            alt={product.name || "Product"}
                            className="saas-table-image"
                            onError={(event) => {
                              event.target.src = "/placeholder.png";
                            }}
                          />
                        </td>
                        <td>
                          <strong>{product.name || "Untitled"}</strong>
                          {product.featured && <span className="saas-inline-badge">Featured</span>}
                        </td>
                        <td>
                          <strong>{formatPriceLabel(product.price)}</strong>
                          {product.oldPrice && (
                            <p className="old-price">was {formatPriceLabel(product.oldPrice)}</p>
                          )}
                        </td>
                        <td>{mapLegacyBrandToCarType(product.brand)}</td>
                        <td>
                          <span
                            className={`stock-badge stock-${product.stock.toLowerCase().replace(" ", "-")}`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td>
                          <div className="saas-table-actions">
                            <button
                              type="button"
                              className="action-btn edit-btn"
                              onClick={() => openEditModal(product)}
                              title="Edit car"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(product)}
                              disabled={deletingId === product.id}
                              title="Delete car"
                            >
                              {deletingId === product.id ? "Removing..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        </div>
      </section>

      {isSettingsDrawerOpen ? (
        <div className="admin-settings-drawer-backdrop" onClick={() => setIsSettingsDrawerOpen(false)}>
          <aside
            className="admin-settings-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Account settings"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-settings-drawer-head">
              <h3>Settings</h3>
              <button type="button" onClick={() => setIsSettingsDrawerOpen(false)} aria-label="Close settings">
                <X size={18} />
              </button>
            </div>

            <div className="admin-settings-drawer-body">
              <article className="admin-settings-item">
                <User size={18} />
                <div>
                  <p>Account</p>
                  <strong>{user?.displayName || "Admin"}</strong>
                </div>
              </article>
              <article className="admin-settings-item">
                <Mail size={18} />
                <div>
                  <p>Email</p>
                  <strong>{user?.email || "-"}</strong>
                </div>
              </article>
              <article className="admin-settings-item">
                <BadgeCheck size={18} />
                <div>
                  <p>Plan</p>
                  <strong>{userPlan?.type || "Free"}</strong>
                </div>
              </article>
            </div>

            <div className="admin-settings-drawer-foot">
              <button
                type="button"
                className="primary-btn"
                onClick={handleLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? "Logging out..." : "Logout"}
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      {productModal}

      <div className="saas-toast-wrap" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`saas-toast ${toast.type === "error" ? "is-error" : "is-success"}`}
          >
            {toast.type === "error" ? "Error:" : "Done:"} {toast.text}
          </div>
        ))}
      </div>
    </main>
  );
}

export default Admin;
