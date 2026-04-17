import { useState } from "react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../firebase/firebase";
import { uploadToCloudinary } from "../utils/cloudinary";

function SimpleAdminDashboard() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [file, setFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!file) {
      alert("Select image");
      return;
    }

    try {
      setIsSubmitting(true);

      const uploadedImageUrl = await uploadToCloudinary(file);
      setImageUrl(uploadedImageUrl);

      await addDoc(collection(db, "cars"), {
        title,
        price,
        image: uploadedImageUrl,
        imageUrl: uploadedImageUrl,
        createdAt: new Date(),
      });

      alert("Car added successfully");
      setTitle("");
      setPrice("");
      setFile(null);
    } catch (error) {
      console.error(error);
      alert("Error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h2>Add Car</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          style={{ width: "100%", marginBottom: 10, padding: 10 }}
        />

        <input
          type="number"
          placeholder="Price"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
          style={{ width: "100%", marginBottom: 10, padding: 10 }}
        />

        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
          required
          style={{ width: "100%", marginBottom: 10 }}
        />

        <button type="submit" disabled={isSubmitting} style={{ width: "100%", padding: 10 }}>
          {isSubmitting ? "Saving..." : "Add Car"}
        </button>
      </form>

      {imageUrl ? <img src={imageUrl} alt="Uploaded car" style={{ width: "100%", marginTop: 16 }} /> : null}
    </div>
  );
}

export default SimpleAdminDashboard;
