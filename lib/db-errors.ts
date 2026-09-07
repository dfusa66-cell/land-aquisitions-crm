function errorDigest(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return "";
  return String((error as { digest?: unknown }).digest ?? "");
}

export function isNextRedirectError(error: unknown) {
  return errorDigest(error).startsWith("NEXT_REDIRECT");
}

export function isNextInternalError(error: unknown) {
  const digest = errorDigest(error);
  return (
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest === "DYNAMIC_SERVER_USAGE"
  );
}

export function prismaCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

export function isMissingColumnError(error: unknown) {
  const code = prismaCode(error);
  if (code === "P2022" || code === "P2021") return true;
  const message = error instanceof Error ? error.message : "";
  return /does not exist in the current database|column .* does not exist/i.test(message);
}

export function sanitizeDbMessage(message: string) {
  return message
    .replace(/postgresql:\/\/\S+/gi, "postgresql://***")
    .replace(/postgres:\/\/\S+/gi, "postgres://***")
    .replace(/file:\S+/gi, "file:***")
    .replace(/prisma\+postgres:\/\/\S+/gi, "prisma+postgres://***");
}

export function formatDbError(error: unknown): string {
  const code = prismaCode(error);
  if (code === "P2022") {
    return "The production database is missing land-pipeline columns. From a machine that can reach the hosted DB, run: pnpm db:push:postgres";
  }
  if (code === "P2021") {
    return "A required database table is missing (Lead or BusinessMetrics). From a machine that can reach the hosted DB, run: pnpm db:push:postgres";
  }
  if (code === "P1001" || code === "P1002" || code === "P1017" || code === "P1000") {
    return "Cannot reach the database. Check DATABASE_URL in Vercel (host, password, and ?sslmode=require).";
  }

  const raw = error instanceof Error ? error.message : "Unknown database error";
  const message = sanitizeDbMessage(raw);

  if (/Environment variable not found: DATABASE_URL|DATABASE_URL/i.test(message) && /not found|invalid|undefined/i.test(message)) {
    return "DATABASE_URL is missing or invalid in the environment.";
  }
  if (/query engine|library for current platform|binaryTargets|engine type/i.test(message)) {
    return "Prisma query engine failed to load on the server. Redeploy so @prisma/client is not bundled by Next.js.";
  }
  if (/must start with the protocol|the URL must start with/i.test(message)) {
    return "Prisma client/provider mismatch. Vercel must build with `pnpm build:vercel` (Postgres schema), not the local SQLite schema.";
  }
  if (/authentication failed|password|ECONNREFUSED|ENOTFOUND|timeout|SSL/i.test(message)) {
    return "Database connection failed. Check DATABASE_URL in Vercel (Supabase/Postgres host, password, and ?sslmode=require).";
  }

  return `Database error: ${message}`;
}
