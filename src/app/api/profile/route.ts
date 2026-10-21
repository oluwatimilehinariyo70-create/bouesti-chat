
import { NextResponse } from "next/server";
import { getCurrentStudent } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const student = await getCurrentStudent();

    if (!student) {
      return NextResponse.json(
        { error: "Please log in first." },
        { status: 401 }
      );
    }

    const profile = await prisma.student.findUnique({
      where: { id: student.id },
      select: {
        id: true,
        fullName: true,
        email: true,
        matricNumber: true,
        department: true,
        level: true,
        profileImageUrl: true,
      },
    });

    if (!profile) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ student: profile });
  } catch (error) {
    console.error("Unable to load profile:", error);

    return NextResponse.json(
      { error: "Unable to load your profile." },
      { status: 500 }
    );
  }
}
