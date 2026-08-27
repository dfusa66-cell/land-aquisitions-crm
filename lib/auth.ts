import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const cookieName = "landcrm_user";

export async function getCurrentUser() {
  const id = cookies().get(cookieName)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function setSession(userId: string) {
  cookies().set(cookieName, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSession() {
  cookies().delete(cookieName);
}
