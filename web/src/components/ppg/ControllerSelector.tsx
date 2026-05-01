import { useState, useMemo } from "react";
import { usePpgControllers } from "../../hooks/usePpg";
import type { PpgControllerInfo } from "../../types/ppg";
import Spinner from "../ui/Spinner";

/** Manufacturer grouping for display order */
const MANUFACTURER_ORDER = [
  "Fanuc", "Siemens", "Haas", "Mazak", "Okuma",
  "Heidenhain", "Mitsubishi", "DMG Mori", "Makino",
  "Brother", "Doosan", "Hurco", "Fagor", "Other",
] as const;

interface ControllerSelectorProps {
  value?: string;
  onChange: (controller: PpgControllerInfo | null) => void;
}

export default function ControllerSelector({ value, onChange }: ControllerSelectorProps) {
  const { data, loading, error, refetch } = usePpgControllers();
  const [search, setSearch] = useState("");

  /** Group controllers by manufacturer, filtered by search */
  const grouped = useMemo(() => {
    if (!data?.length) return new Map<string, PpgControllerInfo[]>();

    const q = search.toLowerCase().trim();
    const filtered = q
      ? data.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.id.toLowerCase().includes(q) ||
            c.manufacturer.toLowerCase().includes(q),
        )
      : data;

    const groups = new Map<string, PpgControllerInfo[]>();
    for (const c of filtered) {
      const mfr = MANUFACTURER_ORDER.find(
        (m) => m.toLowerCase() === c.manufacturer.toLowerCase(),
      ) ?? "Other";
      const list = groups.get(mfr) ?? [];
      list.push(c);
      groups.set(mfr, list);
    }

    // Sort groups by MANUFACTURER_ORDER
    const sorted = new Map<string, PpgControllerInfo[]>();
    for (const mfr of MANUFACTURER_ORDER) {
      const list = groups.get(mfr);
      if (list?.length) sorted.set(mfr, list);
    }
    return sorted;
  }, [data, search]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Spinner size="sm" />
        <span className="ml-2 text-xs text-slate-500">Loading controllers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 text-center">
        <p className="text-xs text-red-500">{error}</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-1 text-xs text-primary-600 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search filter */}
      <div className="px-3 pt-2">
        <input
          type="search"
          placeholder="Search controllers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-xs shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          aria-label="Filter controllers"
        />
      </div>

      {/* Grouped controller list */}
      <div className="overflow-y-auto px-1 pb-2" role="listbox" aria-label="CNC Controllers">
        {grouped.size === 0 && (
          <p className="px-3 py-4 text-center text-xs text-slate-400">
            {search ? "No controllers match your search" : "No controllers available"}
          </p>
        )}
        {[...grouped.entries()].map(([manufacturer, controllers]) => (
          <div key={manufacturer} className="mb-1">
            <div className="sticky top-0 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:bg-slate-900/50">
              {manufacturer}
            </div>
            {controllers.map((c) => (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={value === c.id}
                onClick={() => onChange(value === c.id ? null : c)}
                className={`flex w-full items-center gap-2 rounded px-3 py-1.5 text-left text-xs transition-colors ${
                  value === c.id
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex-1 font-medium">{c.name}</span>
                {c.capabilities?.length > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {c.capabilities.length} cap{c.capabilities.length !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
