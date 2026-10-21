
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const tokenHash = createHash("sha256")
        .update(token)
        .digest("hex");

      await prisma.studentSession.deleteMany({
        where: { tokenHash },
      });
    }

    const response = NextResponse.json({
      message: "Logged out successfully.",
    });

    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    return NextResponse.json(
      { message: "Unable to log out. Please try again." },
      { status: 500 }
    );
  }
}
