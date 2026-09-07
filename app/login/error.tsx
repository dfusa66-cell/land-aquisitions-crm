"use client";

export default function LoginError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field px-4">
      <div className="w-full max-w-sm rounded border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Login is unavailable</h1>
        <p className="mt-2 text-sm text-slate-600">
          The sign-in form should still load even when the database is behind. Refresh, or check DATABASE_URL and run{" "}
          <code className="rounded bg-field px-1">pnpm db:push:postgres</code>.
        </p>
        <button onClick={reset} className="mt-4 w-full rounded bg-moss px-4 py-2 font-semibold text-white">
          Try again
        </button>
      </div>
    </main>
  );
}
