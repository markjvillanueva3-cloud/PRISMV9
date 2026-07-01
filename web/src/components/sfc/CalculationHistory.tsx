import { useState, useMemo } from "react";
import { Card, Badge, Button } from "../ui";
import type { CalcSnapshot } from "./comparison-types";

interface Props {
  entries: CalcSnapshot[];
  onReload: (entry: CalcSnapshot) => void;
  onAddToComparison: (entry: CalcSnapshot) => void;
  onClear: () => void;
}

type SortField = "ts" | "rpm" | "feedRate" | "safety";

export default function CalculationHistory({ entries, onReload, onAddToComparison, onClear }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("ts");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return entries;
    return entries.filter((e) =>
      e.materialName.toLowerCase().includes(q) ||
      e.operationLabel.toLowerCase().includes(q)
    );
  }, [entries, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "ts": cmp = a.ts - b.ts; break;
        case "rpm": cmp = a.result.spindle_speed - b.result.spindle_speed; break;
        case "feedRate": cmp = a.result.feed_rate - b.result.feed_rate; break;
        case "safety": cmp = (a.result.safety?.score ?? 0) - (b.result.safety?.score ?? 0); break;
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) setSortAsc((v) => !v);
    else { setSortBy(field); setSortAsc(false); }
  };

  const sortArrow = (field: SortField) =>
    sortBy === field ? (sortAsc ? " \u25b2" : " \u25bc") : "";

  if (entries.length === 0) {
    return (
      <Card title="History">
        <p className="py-4 text-center text-sm text-slate-400">No calculation history yet</p>
      </Card>
    );
  }

  return (
    <Card title={`History (${entries.length})`}>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by material or operation..."
          className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-xs
            dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear All
        </Button>
      </div>

      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white dark:bg-slate-800">
            <tr className="text-left text-slate-500">
              <th className="py-1 pr-2">Material</th>
              <th className="py-1 pr-2">Operation</th>
              <th
                className="py-1 pr-2 cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort("rpm")}
              >
                RPM{sortArrow("rpm")}
              </th>
              <th
                className="py-1 pr-2 cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort("feedRate")}
              >
                Feed{sortArrow("feedRate")}
              </th>
              <th
                className="py-1 pr-2 cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort("safety")}
              >
                S(x){sortArrow("safety")}
              </th>
              <th
                className="py-1 pr-2 cursor-pointer hover:text-slate-700"
                onClick={() => toggleSort("ts")}
              >
                Time{sortArrow("ts")}
              </th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr
                key={e.id}
                className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <td className="py-1.5 pr-2 truncate max-w-[100px] text-slate-700 dark:text-slate-300">
                  {e.materialName}
                </td>
                <td className="py-1.5 pr-2 text-slate-500">{e.operationLabel}</td>
                <td className="py-1.5 pr-2 font-mono">{e.result.spindle_speed.toFixed(0)}</td>
                <td className="py-1.5 pr-2 font-mono">{e.result.feed_rate.toFixed(1)}</td>
                <td className="py-1.5 pr-2">
                  {e.result.safety ? (
                    <Badge color={e.result.safety.score >= 0.7 ? "green" : "red"}>
                      {e.result.safety.score.toFixed(2)}
                    </Badge>
                  ) : (
                    <span className="text-slate-400">&mdash;</span>
                  )}
                </td>
                <td className="py-1.5 pr-2 text-slate-400">
                  {new Date(e.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="py-1.5 flex gap-1">
                  <button
                    type="button"
                    onClick={() => onReload(e)}
                    className="text-primary-600 hover:underline"
                    title="Reload this calculation"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddToComparison(e)}
                    className="text-slate-400 hover:text-primary-600"
                    title="Add to comparison"
                  >
                    +Cmp
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
