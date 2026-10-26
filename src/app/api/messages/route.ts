
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";

export const runtime = "nodejs";

const sendMessageSchema = z.object({
  receiverId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(2000),
});

const conversationSchema = z.object({
  friendId: z.string().trim().min(1),
});

const messageInclude = {
  sender: {
    select: {
      id: true,
      fullName: true,
      profileImageUrl: true,
    },
  },
  receiver: {
    select: {
      id: true,
      fullName: true,
      profileImageUrl: true,
    },
  },
} as const;

async function areFriends(studentId: string, friendId: string) {
  const friendship = await prisma.friendRequest.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { senderId: studentId, receiverId: friendId },
        { senderId: friendId, receiverId: studentId },
      ],
    },
    select: { id: true },
  });

  return Boolean(friendship);
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

// GET: Load a conversation and mark incoming messages as read.
export async function GET(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return errorResponse("Please log in first.", 401);
    }

    const { searchParams } = new URL(request.url);
    const result = conversationSchema.safeParse({
      friendId: searchParams.get("friendId"),
    });

    if (!result.success) {
      return errorResponse("A valid friend ID is required.", 400);
    }

    const { friendId } = result.data;

    if (friendId === student.id) {
      return errorResponse(
        "You cannot open a conversation with yourself.",
        400
      );
    }

    if (!(await areFriends(student.id, friendId))) {
      return errorResponse("You can only message accepted friends.", 403);
    }

    await prisma.message.updateMany({
      where: {
        senderId: friendId,
        receiverId: student.id,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: student.id, receiverId: friendId },
          { senderId: friendId, receiverId: student.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: messageInclude,
    });

    return NextResponse.json({
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error("Load messages error:", error);
    return errorResponse("Unable to load messages right now.", 500);
  }
}

// POST: Send text messages, images, and voice notes.
export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return errorResponse("Please log in first.", 401);
    }

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const receiverId = formData.get("receiverId");
      const type = formData.get("type");
      const file = formData.get("file");

      if (
        typeof receiverId !== "string" ||
        !receiverId.trim() ||
        (type !== "IMAGE" && type !== "VOICE") ||
        !(file instanceof File)
      ) {
        return errorResponse(
          "Choose a valid image or voice recording to send.",
          400
        );
      }

      if (receiverId === student.id) {
        return errorResponse("You cannot send a message to yourself.", 400);
      }

      if (!(await areFriends(student.id, receiverId))) {
        return errorResponse("You can only message accepted friends.", 403);
      }

      const allowedImageTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];

      const allowedAudioTypes = [
        "audio/webm",
        "audio/ogg",
        "audio/mp4",
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
      ];

      const maxImageSize = 5 * 1024 * 1024;
      const maxAudioSize = 10 * 1024 * 1024;

      if (type === "IMAGE") {
        if (!allowedImageTypes.includes(file.type)) {
          return errorResponse(
            "Choose a JPEG, PNG, WebP, or GIF image.",
            400
          );
        }

        if (file.size > maxImageSize) {
          return errorResponse("Images must be 5 MB or smaller.", 400);
        }
      }

      if (type === "VOICE") {
        const baseMimeType = file.type.split(";")[0];

        if (
          !allowedAudioTypes.includes(baseMimeType) ||
          !file.type.startsWith("audio/")
        ) {
          return errorResponse("Choose a valid audio recording.", 400);
        }

        if (file.size > maxAudioSize) {
          return errorResponse(
            "Voice notes must be 10 MB or smaller.",
            400
          );
        }
      }

      if (file.size === 0) {
        return errorResponse("The selected file is empty.", 400);
      }

      const extensionByMimeType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "audio/webm": "webm",
        "audio/ogg": "ogg",
        "audio/mp4": "m4a",
        "audio/mpeg": "mp3",
        "audio/wav": "wav",
        "audio/x-wav": "wav",
      };

      const baseMimeType = file.type.split(";")[0];
      const extension =
        extensionByMimeType[baseMimeType] ??
        (type === "IMAGE" ? "jpg" : "webm");

      const blob = await put(
        `chat/${student.id}/${randomUUID()}.${extension}`,
        file,
        {
          access: "private",
          contentType: file.type || "application/octet-stream",
          addRandomSuffix: false,
        }
      );

      const message = await prisma.message.create({
        data: {
          senderId: student.id,
          receiverId,
          content: type === "IMAGE" ? "Shared an image" : "Sent a voice note",
          type,
          // Save the private Blob pathname, not its direct URL.
          mediaUrl: blob.pathname,
          mediaMimeType: file.type,
        },
        include: messageInclude,
      });

      return NextResponse.json(
        { message: "Media sent successfully.", data: message },
        { status: 201 }
      );
    }

    const body: unknown = await request.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(
        "Enter a recipient and a message of up to 2,000 characters.",
        400
      );
    }

    const { receiverId, content } = result.data;

    if (receiverId === student.id) {
      return errorResponse("You cannot send a message to yourself.", 400);
    }

    if (!(await areFriends(student.id, receiverId))) {
      return errorResponse("You can only message accepted friends.", 403);
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: student.id,
        receiverId,
      },
      include: messageInclude,
    });

    return NextResponse.json(
      { message: "Message sent successfully.", data: message },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);
    return errorResponse(
      "Unable to send your message. Check your upload configuration and try again.",
      500
    );
  }
}
