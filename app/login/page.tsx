import { LoginForm } from "./login-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-field px-4">
      <LoginForm />
    </main>
  );
}
