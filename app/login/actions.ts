"use server";

import { compare, hash } from "bcryptjs";
import { redirect } from "next/navigation";
import { setSession } from "@/lib/auth";
import { formatDbError, isNextRedirectError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";

export type LoginState = { error: string | null };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  try {
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user && email === "diego@example.com") {
      user = await prisma.user.create({
        data: { email, name: "Diego", passwordHash: await hash("demo1234", 10) }
      });
    }
    if (!user || !(await compare(password, user.passwordHash))) {
      return { error: "Invalid login." };
    }
    setSession(user.id);
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("[login]", error);
    return { error: formatDbError(error) };
  }

  redirect("/");
}
