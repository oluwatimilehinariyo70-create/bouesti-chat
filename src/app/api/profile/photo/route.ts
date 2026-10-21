
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { getCurrentStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_FILE_SIZE = 3 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Please log in to upload a profile picture." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select an image." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, and WebP images are allowed." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Your image must be smaller than 3 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const isJpeg =
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff;

    const isPng =
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(
          Buffer.from([
            0x89, 0x50, 0x4e, 0x47,
            0x0d, 0x0a, 0x1a, 0x0a,
          ])
        );

    const isWebp =
      buffer.length >= 12 &&
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP";

    if (
      (file.type === "image/jpeg" && !isJpeg) ||
      (file.type === "image/png" && !isPng) ||
      (file.type === "image/webp" && !isWebp)
    ) {
      return NextResponse.json(
        { error: "The selected file is not a valid image." },
        { status: 400 }
      );
    }

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary environment variables are missing.");

      return NextResponse.json(
        { error: "Photo upload is not configured correctly." },
        { status: 500 }
      );
    }

    const uploadedImage = await new Promise<{ secure_url: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "bouesti-chat/profile-photos",
              public_id: student.id,
              overwrite: true,
              resource_type: "image",
              transformation: [
                {
                  width: 500,
                  height: 500,
                  crop: "fill",
                  gravity: "face",
                },
              ],
            },
            (error, result) => {
              if (error) {
                reject(error);
                return;
              }

              if (!result?.secure_url) {
                reject(
                  new Error("Cloudinary returned no image URL.")
                );
                return;
              }

              resolve({ secure_url: result.secure_url });
            }
          )
          .end(buffer);
      }
    );

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        profileImageUrl: uploadedImage.secure_url,
      },
      select: {
        id: true,
        profileImageUrl: true,
      },
    });

    return NextResponse.json({
      message: "Profile picture uploaded successfully.",
      profileImageUrl: updatedStudent.profileImageUrl,
    });
  } catch (error) {
    console.error("Profile picture upload failed:", error);

    return NextResponse.json(
      { error: "Unable to upload your picture. Please try again." },
      { status: 500 }
    );
  }
}
