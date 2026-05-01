import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ISO_GROUPS, searchMaterials as searchLocal, MATERIALS, type MaterialEntry } from "../../data/materials";
import { dataApi } from "../../api/data";
import { Card, Badge } from "../ui";

interface Props {
  value: MaterialEntry | null;
  onChange: (mat: MaterialEntry) => void;
  operationId?: string;
}

const FAVORITES_KEY = "prism-mat-favorites";
const RECENTS_KEY = "prism-mat-recents";

function loadIds(key: string): string[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); }
  catch { return []; }
}
function saveIds(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids.slice(0, 10)));
}

/** Materials recommended for specific operation categories */
const OP_RECOMMENDATIONS: Record<string, string[]> = {
  face_milling: ["1045", "4140", "6061", "GG25"],
  slot_milling: ["1045", "6061", "304", "C360"],
  pocket_milling: ["6061", "7075", "1045", "304"],
  profile_milling: ["4140", "6061", "Ti6Al4V", "304"],
  "semi-finishing": ["4140", "4340", "316", "IN718"],
  finishing: ["4140", "7075", "304", "Ti6Al4V"],
  rough_turning: ["1045", "4140", "GG25", "GGG50"],
  finish_turning: ["4140", "4340", "304", "4140HRC50"],
  boring: ["4140", "GG25", "304"],
  parting: ["1045", "1215", "6061", "C360"],
  drilling: ["1045", "6061", "304", "4140"],
  reaming: ["4140", "304", "6061"],
  tapping: ["1045", "1215", "6061", "C360"],
  surface_grinding: ["4140HRC50", "D2HRC60", "H13HRC48"],
  cylindrical_grinding: ["4140HRC50", "D2HRC60"],
  thread_milling: ["1045", "4140", "304", "6061"],
  single_point_thread: ["1045", "4140", "304"],
};

function machinabilityHint(rating: number): { label: string; color: "green" | "yellow" | "red" } {
  if (rating >= 70) return { label: "Easy", color: "green" };
  if (rating >= 40) return { label: "Moderate", color: "yellow" };
  return { label: "Difficult", color: "red" };
}

export default function SmartMaterialSelector({ value, onChange, operationId }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [favorites, setFavorites] = useState<string[]>(() => loadIds(FAVORITES_KEY));
  const [recents, setRecents] = useState<string[]>(() => loadIds(RECENTS_KEY));
  const [backendResults, setBackendResults] = useState<MaterialEntry[]>([]);
  const [backendLoading, setBackendLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Instant local results (28 entries) + async backend results (6,346+)
  const localFiltered = useMemo(() => searchLocal(query), [query]);

  // Debounced backend search — fires 300ms after typing stops
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setBackendResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setBackendLoading(true);
      try {
        const res = await dataApi.searchMaterials({ query, limit: 50 }) as { results?: MaterialEntry[] };
        const items = (res.results ?? (Array.isArray(res) ? res : [])) as MaterialEntry[];
        // Map backend results to MaterialEntry shape
        const mapped: MaterialEntry[] = items.map((m: Record<string, unknown>) => ({
          id: String(m.id ?? m.name ?? ""),
          name: String(m.name ?? m.id ?? ""),
          group: String(m.group ?? m.iso_group ?? "P"),
          groupLabel: ISO_GROUPS.find(g => g.code === String(m.group ?? m.iso_group ?? "P"))?.label ?? "Steel",
          hardness: Number(m.hardness ?? m.hardness_hb ?? 200),
          tensileStrength: Number(m.tensileStrength ?? m.tensile_strength ?? m.uts_mpa ?? 600),
          machinability: Number(m.machinability ?? m.machinability_index ?? 50),
        }));
        setBackendResults(mapped);
      } catch {
        // Backend unavailable — local-only mode
        setBackendResults([]);
      } finally {
        setBackendLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Merge: local results first (instant), then backend results (deduplicated)
  const filtered = useMemo(() => {
    const localIds = new Set(localFiltered.map(m => m.id));
    const uniqueBackend = backendResults.filter(m => !localIds.has(m.id));
    return [...localFiltered, ...uniqueBackend];
  }, [localFiltered, backendResults]);

  // Recommendations for current operation
  const recommendedIds = useMemo(
    () => operationId ? (OP_RECOMMENDATIONS[operationId] ?? []) : [],
    [operationId],
  );

  // Sort: recommended first, then favorites, then by group
  const ranked = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aRec = recommendedIds.includes(a.id) ? -2 : 0;
      const bRec = recommendedIds.includes(b.id) ? -2 : 0;
      const aFav = favorites.includes(a.id) ? -1 : 0;
      const bFav = favorites.includes(b.id) ? -1 : 0;
      return (aRec + aFav) - (bRec + bFav);
    });
  }, [filtered, recommendedIds, favorites]);

  const grouped = useMemo(() =>
    ISO_GROUPS.map((g) => ({
      ...g,
      items: ranked.filter((m) => m.group === g.code),
    })).filter((g) => g.items.length > 0),
  [ranked]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  const handleSelect = useCallback((mat: MaterialEntry) => {
    onChange(mat);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    // Update recents
    const updated = [mat.id, ...recents.filter((id) => id !== mat.id)].slice(0, 10);
    setRecents(updated);
    saveIds(RECENTS_KEY, updated);
  }, [onChange, recents]);

  const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const updated = favorites.includes(id)
      ? favorites.filter((f) => f !== id)
      : [id, ...favorites];
    setFavorites(updated);
    saveIds(FAVORITES_KEY, updated);
  }, [favorites]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && e.key === "ArrowDown") {
      setOpen(true);
      setActiveIdx(0);
      return;
    }
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && flatItems[activeIdx]) handleSelect(flatItems[activeIdx]);
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
    }
  };

  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  return (
    <Card title="Material">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls="smart-material-listbox"
          aria-activedescendant={activeIdx >= 0 ? `smat-opt-${activeIdx}` : undefined}
          aria-label="Search materials"
          placeholder={value ? value.name : "Search materials..."}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
            placeholder:text-slate-400 focus:border-primary-500
            focus:outline-none focus:ring-2 focus:ring-primary-500
            dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {open && flatItems.length === 0 && query.trim() && !backendLoading && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white p-3 text-center text-xs text-slate-400 shadow-lg dark:border-slate-600 dark:bg-slate-800">
            No materials match &ldquo;{query}&rdquo;
          </div>
        )}
        {open && backendLoading && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-center text-xs text-primary-500 shadow-lg dark:border-slate-600 dark:bg-slate-800">
            Searching 6,346+ materials...
          </div>
        )}
        {open && flatItems.length > 0 && (
          <div
            ref={listRef}
            id="smart-material-listbox"
            role="listbox"
            className="absolute z-20 mt-1 max-h-72 w-full overflow-y-auto
              rounded-md border border-slate-200 bg-white shadow-lg
              dark:border-slate-600 dark:bg-slate-800"
          >
            {grouped.map((g) => (
              <div key={g.code}>
                <div className="sticky top-0 bg-slate-50 px-3 py-1 text-xs
                  font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: g.color }} />
                  {g.code} — {g.label}
                </div>
                {g.items.map((m) => {
                  const idx = flatItems.indexOf(m);
                  const isRec = recommendedIds.includes(m.id);
                  const isFav = favorites.includes(m.id);
                  const mHint = machinabilityHint(m.machinability);
                  return (
                    <div
                      key={m.id}
                      id={`smat-opt-${idx}`}
                      role="option"
                      data-idx={idx}
                      aria-selected={idx === activeIdx}
                      onMouseDown={() => handleSelect(m)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                        idx === activeIdx
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span className="flex-1 truncate">
                        {m.name}
                        {isRec && <span className="ml-1 text-xs text-primary-500">*</span>}
                      </span>
                      <Badge color={mHint.color}>{mHint.label}</Badge>
                      <button
                        type="button"
                        tabIndex={-1}
                        onMouseDown={(e) => toggleFavorite(m.id, e)}
                        className="text-slate-300 hover:text-yellow-500"
                        aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                      >
                        {isFav ? "\u2605" : "\u2606"}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property summary */}
      {value && (() => {
        const hint = machinabilityHint(value.machinability);
        return (
          <div className="mt-3 space-y-1">
            <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
              <Badge color="blue">{value.group} — {value.groupLabel}</Badge>
              <Badge color={hint.color}>Machinability: {hint.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Hardness: <strong>{value.hardness} HB</strong></span>
              <span>UTS: <strong>{value.tensileStrength} MPa</strong></span>
              <span>Rating: <strong>{value.machinability}%</strong></span>
            </div>
          </div>
        );
      })()}
    </Card>
  );
}
