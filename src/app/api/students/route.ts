
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentStudent } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const currentStudent = await getCurrentStudent();

    if (!currentStudent) {
      return NextResponse.json(
        { message: "Please log in to search students." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length < 2) {
      return NextResponse.json({ students: [] });
    }

    const students = await prisma.student.findMany({
      where: {
        id: { not: currentStudent.id },
        OR: [
          { fullName: { contains: query, mode: "insensitive" } },
          { department: { contains: query, mode: "insensitive" } },
          { level: { contains: query, mode: "insensitive" } },
          { matricNumber: { contains: query, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        fullName: true,
        department: true,
        level: true,
        matricNumber: true,
        profileImageUrl: true,
      },
      take: 20,
      orderBy: { fullName: "asc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Student search error:", error);

    return NextResponse.json(
      { message: "Unable to search students right now." },
      { status: 500 }
    );
  }
}
