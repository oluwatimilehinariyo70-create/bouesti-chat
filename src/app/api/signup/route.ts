
import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .transform((value) => value.toLowerCase()),
  matricNumber: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .transform((value) => value.toUpperCase()),
  department: z.string().trim().min(2).max(100),
  level: z.string().trim().min(1).max(30),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const result = signupSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          message:
            "Check your details. Your password must contain at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const {
      fullName,
      email,
      matricNumber,
      department,
      level,
      password,
    } = result.data;

    const passwordHash = await hash(password, 12);

    await prisma.student.create({
      data: {
        fullName,
        email,
        matricNumber,
        department,
        level,
        passwordHash,
        isVerified: true,
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful! You can now log in.",
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          message:
            "That email address or matric number is already registered.",
        },
        { status: 409 }
      );
    }

    console.error("Signup error:", error);

    return NextResponse.json(
      { message: "Registration failed. Please try again later." },
      { status: 500 }
    );
  }
}
