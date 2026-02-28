import { Card, Badge, Spinner } from "../ui";
import type { SfcCalculateResult } from "../../types/sfc";

interface Props {
  result: SfcCalculateResult | null;
  loading: boolean;
  error: string | null;
}

function safetyColor(score: number): "green" | "yellow" | "red" {
  if (score >= 0.9) return "green";
  if (score >= 0.7) return "yellow";
  return "red";
}

function fmt(n: number | undefined, decimals = 1): string {
  if (n == null) return "—";
  return n.toFixed(decimals);
}

export default function ResultsDisplay({ result, loading, error }: Props) {
  if (loading) {
    return (
      <Card title="Results">
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
          <span className="ml-3 text-sm text-slate-500">Calculating...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Results">
        <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            Calculation Error
          </p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-300">
            {error}
          </p>
        </div>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card title="Results">
        <p className="py-8 text-center text-sm text-slate-400">
          Configure material, operation, and parameters, then click Calculate
        </p>
      </Card>
    );
  }

  const safety = result.safety;

  return (
    <Card title="Results">
      {/* Safety badge */}
      {safety && (
        <div className="mb-4 flex items-center gap-2">
          <Badge color={safetyColor(safety.score)}>
            S(x) = {fmt(safety.score, 3)}
          </Badge>
          <span className="text-xs text-slate-500">
            {safety.status}
          </span>
        </div>
      )}

      {/* Primary results */}
      <div className="grid grid-cols-2 gap-4">
        <ResultCard
          label="Spindle Speed"
          value={fmt(result.spindle_speed, 0)}
          unit="RPM"
        />
        <ResultCard
          label="Feed Rate"
          value={fmt(result.feed_rate, 1)}
          unit="mm/min"
        />
        <ResultCard
          label="Cutting Speed"
          value={fmt(result.cutting_speed, 0)}
          unit="m/min"
        />
        <ResultCard
          label="Feed per Tooth"
          value={fmt(result.feed_per_tooth, 3)}
          unit="mm/tooth"
        />
      </div>

      {/* Safety factors breakdown */}
      {safety?.factors && Object.keys(safety.factors).length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            Safety Factor Breakdown
          </summary>
          <div className="mt-2 space-y-1">
            {Object.entries(safety.factors).map(([key, val]) => (
              <div
                key={key}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  {key.replace(/_/g, " ")}
                </span>
                <Badge color={safetyColor(val as number)}>
                  {fmt(val as number, 3)}
                </Badge>
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}

function ResultCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-700/50">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-800 dark:text-slate-100">
        {value}
        <span className="ml-1 text-xs font-normal text-slate-400">
          {unit}
        </span>
      </p>
    </div>
  );
}
