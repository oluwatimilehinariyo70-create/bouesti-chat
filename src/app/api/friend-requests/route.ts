
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";
import { z } from "zod";

const createSchema = z.object({
  receiverId: z.string().trim().min(1),
});

const updateSchema = z.object({
  requestId: z.string().trim().min(1),
  action: z.enum(["accept", "decline"]),
});

const studentFields = {
  id: true,
  fullName: true,
  department: true,
  level: true,
  matricNumber: true,
  profileImageUrl: true,
} as const;

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in first." },
        { status: 401 }
      );
    }

    const [incoming, outgoing, friendshipRecords] = await Promise.all([
      prisma.friendRequest.findMany({
        where: {
          receiverId: student.id,
          status: "PENDING",
        },
        include: {
          sender: { select: studentFields },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.friendRequest.findMany({
        where: {
          senderId: student.id,
          status: "PENDING",
        },
        include: {
          receiver: { select: studentFields },
        },
        orderBy: { createdAt: "desc" },
      }),

      prisma.friendRequest.findMany({
        where: {
          status: "ACCEPTED",
          OR: [
            { senderId: student.id },
            { receiverId: student.id },
          ],
        },
        include: {
          sender: { select: studentFields },
          receiver: { select: studentFields },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    const friends = friendshipRecords.map((record) =>
      record.senderId === student.id
        ? record.receiver
        : record.sender
    );

    const unreadCounts = await prisma.message.groupBy({
      by: ["senderId"],
      where: {
        receiverId: student.id,
        readAt: null,
        senderId: { in: friends.map((friend) => friend.id) },
      },
      _count: { _all: true },
    });

    const unreadCountByFriend = new Map(
      unreadCounts.map((item) => [
        item.senderId,
        item._count._all,
      ])
    );

    const friendsWithUnreadCounts = friends.map((friend) => ({
      ...friend,
      unreadCount: unreadCountByFriend.get(friend.id) ?? 0,
    }));

    return NextResponse.json({
      incoming,
      outgoing,
      friends: friendsWithUnreadCounts,
    });
  } catch (error) {
    console.error("Get friend requests error:", error);

    return NextResponse.json(
      { message: "Unable to load friend requests." },
      { status: 500 }
    );
  }
}

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
    const result = createSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "A valid student ID is required." },
        { status: 400 }
      );
    }

    const { receiverId } = result.data;

    if (receiverId === student.id) {
      return NextResponse.json(
        { message: "You cannot send a friend request to yourself." },
        { status: 400 }
      );
    }

    const receiver = await prisma.student.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      return NextResponse.json(
        { message: "Student not found." },
        { status: 404 }
      );
    }

    const existing = await prisma.friendRequest.findFirst({
      where: {
        OR: [
          { senderId: student.id, receiverId },
          { senderId: receiverId, receiverId: student.id },
        ],
      },
    });

    if (existing?.status === "ACCEPTED") {
      return NextResponse.json(
        { message: "You are already friends." },
        { status: 409 }
      );
    }

    if (existing?.status === "PENDING") {
      if (existing.senderId === student.id) {
        return NextResponse.json(
          { message: "You have already sent this friend request." },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          message:
            "This student has already sent you a request. Check your incoming requests.",
        },
        { status: 409 }
      );
    }

    if (existing) {
      await prisma.friendRequest.update({
        where: { id: existing.id },
        data: {
          senderId: student.id,
          receiverId,
          status: "PENDING",
        },
      });
    } else {
      await prisma.friendRequest.create({
        data: {
          senderId: student.id,
          receiverId,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(
      { message: "Friend request sent successfully." },
      { status: 201 }
    );
  } catch (error) {
    console.error("Send friend request error:", error);

    return NextResponse.json(
      { message: "Unable to send friend request. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in first." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "A valid request ID and action are required." },
        { status: 400 }
      );
    }

    const { requestId, action } = result.data;

    const friendRequest = await prisma.friendRequest.findFirst({
      where: {
        id: requestId,
        receiverId: student.id,
        status: "PENDING",
      },
    });

    if (!friendRequest) {
      return NextResponse.json(
        { message: "Pending friend request not found." },
        { status: 404 }
      );
    }

    await prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: {
        status: action === "accept" ? "ACCEPTED" : "DECLINED",
      },
    });

    return NextResponse.json({
      message:
        action === "accept"
          ? "Friend request accepted."
          : "Friend request declined.",
    });
  } catch (error) {
    console.error("Update friend request error:", error);

    return NextResponse.json(
      { message: "Unable to update friend request." },
      { status: 500 }
    );
  }
}
