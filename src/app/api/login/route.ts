
import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

const loginSchema = z.object({
  identifier: z.string().trim().min(2).max(100),
  password: z.string().min(1).max(128),
});

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message: "Enter your email or matric number and password.",
        },
        { status: 400 }
      );
    }

    const { identifier, password } = result.data;

    const student = await prisma.student.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase() },
          { matricNumber: identifier.toUpperCase() },
        ],
      },
      select: {
        id: true,
        passwordHash: true,
        isVerified: true,
      },
    });

    if (
      !student ||
      !(await compare(password, student.passwordHash))
    ) {
      return NextResponse.json(
        {
          message: "Invalid email, matric number, or password.",
        },
        { status: 401 }
      );
    }

    // Create a cryptographically secure session token.
    const token = randomBytes(32).toString("hex");

    // Store only the token hash in the database.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_MS
    );

    await prisma.studentSession.create({
      data: {
        tokenHash,
        studentId: student.id,
        expiresAt,
      },
    });

    const response = NextResponse.json({
      message: student.isVerified
        ? "Login successful."
        : "Login successful. Your account is awaiting student verification.",
      verified: student.isVerified,
    });

    // Keep the session token inaccessible to JavaScript.
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);

    return NextResponse.json(
      {
        message: "Unable to log in right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}
