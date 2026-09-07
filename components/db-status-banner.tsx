export function DbStatusBanner({ schemaDrift, dbError }: { schemaDrift?: boolean; dbError?: string | null }) {
  if (!schemaDrift && !dbError) return null;

  return (
    <div className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="font-semibold">{dbError ? "Database error" : "Database schema is behind this deploy"}</div>
      <p className="mt-1">
        {dbError ??
          "Lead pages are running in compatibility mode (pre-pipeline columns only). Underwriting fields will stay empty until you push the schema."}
      </p>
      <pre className="mt-2 overflow-x-auto rounded bg-white/80 px-3 py-2 text-xs">
        DATABASE_URL=&quot;postgresql://…?sslmode=require&quot; pnpm db:push:postgres
      </pre>
    </div>
  );
}
