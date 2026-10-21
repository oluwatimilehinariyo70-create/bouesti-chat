
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";

const sendMessageSchema = z.object({
  receiverId: z.string().trim().min(1),
  content: z.string().trim().min(1).max(2000),
});

const conversationSchema = z.object({
  friendId: z.string().trim().min(1),
});

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

// GET: Load a conversation and mark incoming messages as read.
export async function GET(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in first." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const result = conversationSchema.safeParse({
      friendId: searchParams.get("friendId"),
    });

    if (!result.success) {
      return NextResponse.json(
        { message: "A valid friend ID is required." },
        { status: 400 }
      );
    }

    const { friendId } = result.data;

    if (friendId === student.id) {
      return NextResponse.json(
        { message: "You cannot open a conversation with yourself." },
        { status: 400 }
      );
    }

    if (!(await areFriends(student.id, friendId))) {
      return NextResponse.json(
        { message: "You can only message accepted friends." },
        { status: 403 }
      );
    }

    // Mark unread messages from this friend as read.
    await prisma.message.updateMany({
      where: {
        senderId: friendId,
        receiverId: student.id,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
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
      include: {
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
      },
    });

    return NextResponse.json({
      messages: messages.reverse(),
    });
  } catch (error) {
    console.error("Load messages error:", error);

    return NextResponse.json(
      { message: "Unable to load messages right now." },
      { status: 500 }
    );
  }
}

// POST: Send a message to an accepted friend.
export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in first." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const result = sendMessageSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message:
            "Enter a recipient and a message of up to 2,000 characters.",
        },
        { status: 400 }
      );
    }

    const { receiverId, content } = result.data;

    if (receiverId === student.id) {
      return NextResponse.json(
        { message: "You cannot send a message to yourself." },
        { status: 400 }
      );
    }

    if (!(await areFriends(student.id, receiverId))) {
      return NextResponse.json(
        { message: "You can only message accepted friends." },
        { status: 403 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: student.id,
        receiverId,
      },
      include: {
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
      },
    });

    return NextResponse.json(
      {
        message: "Message sent successfully.",
        data: message,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send message error:", error);

    return NextResponse.json(
      { message: "Unable to send your message. Please try again." },
      { status: 500 }
    );
  }
}
