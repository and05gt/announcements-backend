import fs from "node:fs/promises";
import { v2 as cloudinary } from "cloudinary";
import multer from "multer";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = async (filePath: string): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "announcements",
    });
    return result.secure_url;
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
};

export const upload = multer({
  dest: "uploads/",
});
