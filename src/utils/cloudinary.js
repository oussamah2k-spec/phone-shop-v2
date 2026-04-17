export const uploadToCloudinary = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "cars_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dfoui3tre/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  console.log("Cloudinary response:", data);

  if (!data.secure_url) {
    throw new Error(data.error?.message || "Upload failed");
  }

  return data.secure_url;
};
