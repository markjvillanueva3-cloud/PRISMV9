import { Card, Badge } from "../ui";
import type { CalcSnapshot } from "./comparison-types";

interface Props {
  entries: CalcSnapshot[];
  onRemove: (id: string) => void;
  imperial: boolean;
}

const mmToIn = (mm: number) => mm / 25.4;
const mToFt = (m: number) => m * 3.28084;

interface Row {
  label: string;
  unit: string;
  values: number[];
  format: (v: number) => string;
  higherBetter: boolean;
}

export default function ComparisonView({ entries, onRemove, imperial }: Props) {
  if (entries.length === 0) {
    return (
      <Card title="Comparison">
        <p className="py-6 text-center text-sm text-slate-400">
          Add calculations to compare side by side (up to 4)
        </p>
      </Card>
    );
  }

  const fmt = (v: number, d: number) => v.toFixed(d);

  const rows: Row[] = [
    {
      label: "Spindle Speed",
      unit: "RPM",
      values: entries.map((e) => e.result.spindle_speed),
      format: (v) => fmt(v, 0),
      higherBetter: false,
    },
    {
      label: "Feed Rate",
      unit: imperial ? "in/min" : "mm/min",
      values: entries.map((e) => imperial ? mmToIn(e.result.feed_rate) : e.result.feed_rate),
      format: (v) => fmt(v, imperial ? 3 : 1),
      higherBetter: true,
    },
    {
      label: "Cutting Speed",
      unit: imperial ? "SFM" : "m/min",
      values: entries.map((e) => imperial ? mToFt(e.result.cutting_speed) : e.result.cutting_speed),
      format: (v) => fmt(v, 0),
      higherBetter: false,
    },
    {
      label: "Feed/Tooth",
      unit: imperial ? "in/tooth" : "mm/tooth",
      values: entries.map((e) => imperial ? mmToIn(e.result.feed_per_tooth) : e.result.feed_per_tooth),
      format: (v) => fmt(v, imperial ? 4 : 3),
      higherBetter: false,
    },
    {
      label: "Safety Score",
      unit: "",
      values: entries.map((e) => e.result.safety?.score ?? 0),
      format: (v) => fmt(v, 3),
      higherBetter: true,
    },
    {
      label: "Depth of Cut",
      unit: imperial ? "in" : "mm",
      values: entries.map((e) => imperial ? mmToIn(e.params.depth) : e.params.depth),
      format: (v) => fmt(v, imperial ? 3 : 2),
      higherBetter: false,
    },
  ];

  return (
    <Card title={`Comparison (${entries.length}/4)`}>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th className="py-1 pr-3 text-left text-slate-500">Parameter</th>
              {entries.map((e) => (
                <th key={e.id} className="px-2 py-1 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                      {e.materialName}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(e.id)}
                      className="ml-1 text-slate-300 hover:text-red-500"
                      aria-label={`Remove ${e.materialName} from comparison`}
                    >
                      &times;
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400">{e.operationLabel}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const min = row.values.length > 0 ? Math.min(...row.values) : 0;
              const max = row.values.length > 0 ? Math.max(...row.values) : 0;
              const allSame = max - min < (max * 0.0001);

              return (
                <tr key={row.label} className="border-t border-slate-100 dark:border-slate-700">
                  <td className="py-1.5 pr-3 text-slate-500">
                    {row.label}
                    {row.unit && <span className="ml-1 text-slate-400">({row.unit})</span>}
                  </td>
                  {row.values.map((val, i) => {
                    const isBest = !allSame && (row.higherBetter ? val === max : val === min);
                    const isWorst = !allSame && (row.higherBetter ? val === min : val === max);
                    return (
                      <td key={entries[i].id} className="px-2 py-1.5 text-center">
                        <span className={
                          isBest ? "font-bold text-green-600 dark:text-green-400" :
                          isWorst ? "font-bold text-red-500 dark:text-red-400" :
                          "text-slate-700 dark:text-slate-300"
                        }>
                          {row.format(val)}
                        </span>
                        {isBest && <span className="ml-1"><Badge color="green">Best</Badge></span>}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
