interface UsageBarProps {
  used: number;
  limit: number;
  label: string;
}

export default function UsageBar({ used, limit, label }: UsageBarProps) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color =
    pct > 90
      ? "bg-red-500"
      : pct > 70
        ? "bg-yellow-400"
        : "bg-green-500";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500 dark:text-slate-400">
          {used}/{limit}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={used}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-label={label}
        />
      </div>
    </div>
  );
}
