export function normalizePhone(value?: string | null) {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : null;
}

export function splitZapierField(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item ?? "").trim());
  if (typeof value === "string") return value.split(",").map((item) => item.trim());
  if (value == null) return [];
  return [String(value).trim()];
}

export function normalizeDirection(value: string) {
  const clean = value.trim().toLowerCase();
  return clean === "received" || clean === "inbound" || clean === "seller" ? "RECEIVED" : "SENT";
}

export function parseMoney(value: unknown): number | null {
  if (value == null || value === "") return null;
  const parsed = Number(String(value).replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toTitleStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatMoney(value: number | null | undefined, fallback = "—") {
  if (value == null || Number.isNaN(value)) return fallback;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

export function sellerDisplayName(lead: { firstName?: string | null; lastName?: string | null }) {
  return `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() || "Unknown seller";
}
