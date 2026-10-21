
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "bouesti-chat-session";

export async function getCurrentStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  const session = await prisma.studentSession.findUnique({
    where: {
      tokenHash,
    },
    select: {
      expiresAt: true,
      student: {
        select: {
          id: true,
          fullName: true,
          email: true,
          matricNumber: true,
          department: true,
          level: true,
          isVerified: true,
        },
      },
    },
  });

  if (!session || session.expiresAt <= new Date()) {
    return null;
  }

  return session.student;
}

export { SESSION_COOKIE_NAME };
