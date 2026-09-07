import { redirect } from "next/navigation";
import { compare, hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user && email === "diego@example.com") {
    user = await prisma.user.create({ data: { email, name: "Diego", passwordHash: await hash("demo1234", 10) } });
  }
  if (!user || !(await compare(password, user.passwordHash))) redirect("/login?error=1");
  setSession(user.id);
  redirect("/");
}

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field px-4">
      <form action={login} className="w-full max-w-sm rounded border border-black/10 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-moss">Sell Your Land to Diego</p>
        <h1 className="text-2xl font-semibold">Land flipping CRM</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in with diego@example.com / demo1234</p>
        {searchParams.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">Invalid login.</p>}
        <label className="mt-5 block text-sm font-medium">Email</label>
        <input name="email" type="email" defaultValue="diego@example.com" className="mt-1 w-full rounded border px-3 py-2" />
        <label className="mt-4 block text-sm font-medium">Password</label>
        <input name="password" type="password" defaultValue="demo1234" className="mt-1 w-full rounded border px-3 py-2" />
        <button className="mt-6 w-full rounded bg-moss px-4 py-2 font-semibold text-white">Sign in</button>
      </form>
    </main>
  );
}
