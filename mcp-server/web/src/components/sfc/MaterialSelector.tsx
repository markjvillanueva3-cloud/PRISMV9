import { useState, useRef, useEffect, useCallback } from "react";
import { ISO_GROUPS, searchMaterials, type MaterialEntry } from "../../data/materials";
import { Card, Badge } from "../ui";

interface Props {
  value: MaterialEntry | null;
  onChange: (mat: MaterialEntry) => void;
}

export default function MaterialSelector({ value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = searchMaterials(query);
  const grouped = ISO_GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((m) => m.group === g.code),
  })).filter((g) => g.items.length > 0);

  const flatItems = grouped.flatMap((g) => g.items);

  const handleSelect = useCallback(
    (mat: MaterialEntry) => {
      onChange(mat);
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
    },
    [onChange],
  );

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

  // Scroll active item into view
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
          aria-controls="material-listbox"
          aria-activedescendant={activeIdx >= 0 ? `material-opt-${activeIdx}` : undefined}
          aria-label="Search materials"
          placeholder={value ? value.name : "Search materials..."}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          onKeyDown={handleKeyDown}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm
            placeholder:text-slate-400 focus:border-primary-500
            focus:outline-none focus:ring-2 focus:ring-primary-500
            dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />

        {open && flatItems.length > 0 && (
          <div
            ref={listRef}
            id="material-listbox"
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto
              rounded-md border border-slate-200 bg-white shadow-lg
              dark:border-slate-600 dark:bg-slate-800"
          >
            {grouped.map((g) => (
              <div key={g.code}>
                <div
                  className="sticky top-0 bg-slate-50 px-3 py-1 text-xs
                    font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                >
                  <span
                    className="mr-1.5 inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                  {g.code} — {g.label}
                </div>
                {g.items.map((m) => {
                  const idx = flatItems.indexOf(m);
                  return (
                    <div
                      key={m.id}
                      id={`material-opt-${idx}`}
                      role="option"
                      data-idx={idx}
                      aria-selected={idx === activeIdx}
                      onMouseDown={() => handleSelect(m)}
                      onMouseEnter={() => setActiveIdx(idx)}
                      className={`cursor-pointer px-3 py-1.5 text-sm ${
                        idx === activeIdx
                          ? "bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-200"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {m.name}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Property summary */}
      {value && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
          <Badge color="blue">{value.group} — {value.groupLabel}</Badge>
          <span>Hardness: <strong>{value.hardness} HB</strong></span>
          <span>UTS: <strong>{value.tensileStrength} MPa</strong></span>
          <span>Machinability: <strong>{value.machinability}%</strong></span>
        </div>
      )}
    </Card>
  );
}
