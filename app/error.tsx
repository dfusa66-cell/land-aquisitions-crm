"use client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-field px-4">
      <div className="w-full max-w-md rounded border border-black/10 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          If this started after the vacant-land pipeline merge, the hosted Postgres schema may be missing new columns.
          Run <code className="rounded bg-field px-1">pnpm db:push:postgres</code> with production DATABASE_URL.
        </p>
        {error.digest && <p className="mt-3 text-xs text-slate-400">Digest: {error.digest}</p>}
        <div className="mt-4 flex gap-3">
          <button onClick={reset} className="rounded bg-moss px-4 py-2 text-sm font-semibold text-white">
            Try again
          </button>
          <a href="/login" className="rounded border px-4 py-2 text-sm font-semibold">
            Back to login
          </a>
        </div>
      </div>
    </main>
  );
}
