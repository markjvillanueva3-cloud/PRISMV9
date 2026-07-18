import { Card, Badge, Spinner } from "../ui";
import type { SfcCalculateResult } from "../../types/sfc";

interface Props {
  result: SfcCalculateResult | null;
  loading: boolean;
  error: string | null;
  imperial?: boolean;
}

function safetyColor(score: number): "green" | "yellow" | "red" {
  if (score >= 0.9) return "green";
  if (score >= 0.7) return "yellow";
  return "red";
}

function fmt(n: number | undefined, decimals = 1): string {
  if (n == null) return "\u2014";
  return n.toFixed(decimals);
}

const mmToIn = (mm: number) => mm / 25.4;
const mToFt = (m: number) => m * 3.28084;
const cm3ToIn3 = (cm3: number) => cm3 / 16.387064; // 1 in^3 = 16.387064 cm^3

/** Coerce an untyped meta value to a finite number, else undefined (so fmt renders "—"). */
function metaNum(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export default function ResultsDisplay({ result, loading, error, imperial = false }: Props) {
  if (loading) {
    return (
      <Card title="Results">
        <div className="flex items-center justify-center py-12" role="status" aria-label="Calculating">
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

  // Unit conversion for display
  const feedRate = imperial ? mmToIn(result.feed_rate) : result.feed_rate;
  const feedUnit = imperial ? "in/min" : "mm/min";
  const cuttingSpeed = imperial ? mToFt(result.cutting_speed) : result.cutting_speed;
  const speedUnit = imperial ? "SFM" : "m/min";
  const fpt = imperial ? mmToIn(result.feed_per_tooth) : result.feed_per_tooth;
  const fptUnit = imperial ? "in/tooth" : "mm/tooth";

  // U-SFC-RESULTS-COMPLETE: surface the secondary process metrics the backend already
  // publishes but the page never showed -- MRR, spindle power, tool life. The route
  // (src/routes/sfc.ts normalizeSfcCalculateResponse) maps the engine outputs into
  // result.meta.{mrr_cm3_min, power_kw, tool_life_min}; meta is typed Record<string,unknown>
  // so coerce defensively (metaNum -> undefined -> fmt renders "—", never a crash / NaN).
  const meta = (result.meta ?? {}) as Record<string, unknown>;
  const mrrCm3 = metaNum(meta.mrr_cm3_min);
  const mrrDisplay = mrrCm3 == null ? undefined : imperial ? cm3ToIn3(mrrCm3) : mrrCm3;
  const mrrUnit = imperial ? "in³/min" : "cm³/min";
  const powerKw = metaNum(meta.power_kw); // kW on both unit systems (machining-spec convention)
  const toolLifeMin = metaNum(meta.tool_life_min); // minutes (unit-system-invariant)

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
          value={fmt(feedRate, imperial ? 3 : 1)}
          unit={feedUnit}
        />
        <ResultCard
          label="Cutting Speed"
          value={fmt(cuttingSpeed, 0)}
          unit={speedUnit}
        />
        <ResultCard
          label="Feed per Tooth"
          value={fmt(fpt, imperial ? 4 : 3)}
          unit={fptUnit}
        />
      </div>

      {/* Secondary process metrics (U-SFC-RESULTS-COMPLETE): MRR / spindle power / tool life,
          published by the engine into result.meta. Rendered alongside the primaries; fmt shows
          "—" for any the current calc did not produce (e.g. tool life on some operations). */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <ResultCard
          label="Material Removal"
          value={fmt(mrrDisplay, imperial ? 4 : 2)}
          unit={mrrUnit}
        />
        <ResultCard
          label="Spindle Power"
          value={fmt(powerKw, 2)}
          unit="kW"
        />
        <ResultCard
          label="Tool Life"
          value={fmt(toolLifeMin, 0)}
          unit="min"
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
