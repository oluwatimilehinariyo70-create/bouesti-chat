
import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ messageId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in first." },
        { status: 401 }
      );
    }

    const { messageId } = await context.params;

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        type: true,
        mediaUrl: true,
        mediaMimeType: true,
      },
    });

    if (!message || !message.mediaUrl) {
      return NextResponse.json(
        { message: "Media not found." },
        { status: 404 }
      );
    }

    // Only the two participants can access this message's media.
    if (
      message.senderId !== student.id &&
      message.receiverId !== student.id
    ) {
      return NextResponse.json(
        { message: "You are not allowed to access this media." },
        { status: 403 }
      );
    }

    if (message.type !== "IMAGE" && message.type !== "VOICE") {
      return NextResponse.json(
        { message: "This message does not contain media." },
        { status: 400 }
      );
    }

    // Do not allow arbitrary URLs or path traversal.
    const expectedPrefix = `chat/${message.senderId}/`;

    if (
      !message.mediaUrl.startsWith(expectedPrefix) ||
      message.mediaUrl.startsWith("/") ||
      message.mediaUrl.includes("..")
    ) {
      return NextResponse.json(
        { message: "Invalid media reference." },
        { status: 400 }
      );
    }

    const result = await get(message.mediaUrl, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return NextResponse.json(
        { message: "Media not found in storage." },
        { status: 404 }
      );
    }

    if (result.statusCode === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new Response(result.stream, {
      status: 200,
      headers: {
        "Content-Type":
          message.mediaMimeType ||
          result.blob.contentType ||
          "application/octet-stream",
        "Content-Length": String(result.blob.size),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-cache",
        ETag: result.blob.etag,
        "Content-Disposition": "inline",
      },
    });
  } catch (error) {
    console.error("Private media route error:", error);

    return NextResponse.json(
      { message: "Unable to load this media right now." },
      { status: 500 }
    );
  }
}
