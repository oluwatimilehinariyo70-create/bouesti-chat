
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["post", "comment", "react", "vote"]),
  postId: z.string().optional(),
  content: z.string().optional(),
  reaction: z.enum(["LAUGH", "LOVE", "FIRE", "CRY", "EYES"]).optional(),
  options: z.array(z.string().trim().min(1).max(200)).optional(),
  optionId: z.string().optional(),
});

const postInclude = {
  author: {
    select: {
      id: true,
      fullName: true,
      department: true,
      level: true,
      profileImageUrl: true,
    },
  },
  comments: {
    orderBy: { createdAt: "asc" as const },
    take: 30,
    include: {
      author: {
        select: {
          id: true,
          fullName: true,
          profileImageUrl: true,
        },
      },
    },
  },
  reactions: true,
  options: {
    include: { votes: true },
  },
  votes: true,
} as const;

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in to view Campus Wahala." },
        { status: 401 }
      );
    }

    const posts = await prisma.campusPost.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: postInclude,
    });

    return NextResponse.json({
      currentStudentId: student.id,
      posts,
    });
  } catch (error) {
    console.error("Campus Wahala feed error:", error);

    return NextResponse.json(
      { message: "Unable to load Campus Wahala." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { message: "Please log in to continue." },
        { status: 401 }
      );
    }

    const body: unknown = await request.json();
    const parsed = actionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid request. Check the details and try again." },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // CREATE A POST OR POLL
    if (data.action === "post") {
      const content = data.content?.trim() ?? "";
      const options =
        data.options?.map((option) => option.trim()).filter(Boolean) ?? [];
      const isPoll = options.length > 0;

      if (!content || content.length > 2000) {
        return NextResponse.json(
          { message: "Write a post of 1–2000 characters." },
          { status: 400 }
        );
      }

      if (isPoll && (options.length < 2 || options.length > 6)) {
        return NextResponse.json(
          { message: "A poll must have between 2 and 6 options." },
          { status: 400 }
        );
      }

      if (
        new Set(options.map((option) => option.toLowerCase())).size !==
        options.length
      ) {
        return NextResponse.json(
          { message: "Poll options must be different." },
          { status: 400 }
        );
      }

      const post = await prisma.campusPost.create({
        data: {
          content,
          type: isPoll ? "POLL" : "POST",
          authorId: student.id,
          ...(isPoll
            ? {
                options: {
                  create: options.map((text) => ({ text })),
                },
              }
            : {}),
        },
        include: postInclude,
      });

      return NextResponse.json({ post }, { status: 201 });
    }

    // OTHER ACTIONS REQUIRE A POST ID
    if (!data.postId) {
      return NextResponse.json(
        { message: "Post ID is required." },
        { status: 400 }
      );
    }

    const postExists = await prisma.campusPost.findUnique({
      where: { id: data.postId },
      select: { id: true, type: true },
    });

    if (!postExists) {
      return NextResponse.json(
        { message: "This post no longer exists." },
        { status: 404 }
      );
    }

    // ADD A COMMENT
    if (data.action === "comment") {
      const content = data.content?.trim() ?? "";

      if (!content || content.length > 1000) {
        return NextResponse.json(
          { message: "Comments must be between 1 and 1000 characters." },
          { status: 400 }
        );
      }

      const comment = await prisma.campusComment.create({
        data: {
          content,
          postId: data.postId,
          authorId: student.id,
        },
        include: {
          author: {
            select: {
              id: true,
              fullName: true,
              profileImageUrl: true,
            },
          },
        },
      });

      return NextResponse.json({ comment }, { status: 201 });
    }

    // ADD OR CHANGE A REACTION
    if (data.action === "react") {
      if (!data.reaction) {
        return NextResponse.json(
          { message: "Choose a reaction." },
          { status: 400 }
        );
      }

      const existing = await prisma.campusReaction.findUnique({
        where: {
          postId_studentId: {
            postId: data.postId,
            studentId: student.id,
          },
        },
      });

      if (existing?.type === data.reaction) {
        await prisma.campusReaction.delete({
          where: { id: existing.id },
        });

        return NextResponse.json({ removed: true });
      }

      const reaction = await prisma.campusReaction.upsert({
        where: {
          postId_studentId: {
            postId: data.postId,
            studentId: student.id,
          },
        },
        create: {
          postId: data.postId,
          studentId: student.id,
          type: data.reaction,
        },
        update: {
          type: data.reaction,
        },
      });

      return NextResponse.json({ reaction });
    }

    // VOTE IN A POLL
    if (data.action === "vote") {
      if (postExists.type !== "POLL" || !data.optionId) {
        return NextResponse.json(
          { message: "Choose a valid poll option." },
          { status: 400 }
        );
      }

      // Ensure the selected option belongs to the requested poll.
      const option = await prisma.campusPollOption.findFirst({
        where: {
          id: data.optionId,
          postId: data.postId,
        },
        select: {
          id: true,
        },
      });

      if (!option) {
        return NextResponse.json(
          { message: "That option does not belong to this poll." },
          { status: 400 }
        );
      }

      // Find the student's existing vote on any option in this poll.
      const existingVote = await prisma.campusPollVote.findFirst({
        where: {
          studentId: student.id,
          option: {
            postId: data.postId,
          },
        },
        select: {
          id: true,
          optionId: true,
        },
      });

      // The student has already selected this option.
      if (existingVote?.optionId === option.id) {
        return NextResponse.json({
          vote: existingVote,
          unchanged: true,
        });
      }

      // Change the existing vote to the new option, or create one.
      const vote = existingVote
        ? await prisma.campusPollVote.update({
            where: { id: existingVote.id },
            data: { optionId: option.id },
          })
        : await prisma.campusPollVote.create({
            data: {
              optionId: option.id,
              studentId: student.id,
            },
          });

      return NextResponse.json({ vote });
    }

    return NextResponse.json(
      { message: "Unsupported action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Campus Wahala action error:", error);

    return NextResponse.json(
      { message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
