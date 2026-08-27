export function LeadScoreBadge({ score }: { score: number }) {
  const style =
    score >= 80
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : score >= 60
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`grid h-12 w-12 place-items-center rounded border text-lg font-bold ${style}`} title={`AI score ${score}`}>
      {score}
    </div>
  );
}
