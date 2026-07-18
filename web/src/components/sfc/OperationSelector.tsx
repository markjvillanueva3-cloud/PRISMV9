import { useState } from "react";
import {
  OPERATION_CATEGORIES,
  type OperationType,
  type OperationCategory,
} from "../../data/operations";
import { Card } from "../ui";

interface Props {
  value: OperationType | null;
  onChange: (op: OperationType) => void;
}

export default function OperationSelector({ value, onChange }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(
    value?.category ?? null,
  );

  const toggleCategory = (cat: OperationCategory) => {
    setExpandedCat((prev) => (prev === cat.id ? null : cat.id));
  };

  return (
    <Card title="Operation">
      <div className="space-y-1">
        {OPERATION_CATEGORIES.map((cat) => (
          <div key={cat.id}>
            {/* Category tile */}
            <button
              type="button"
              aria-expanded={expandedCat === cat.id}
              onClick={() => toggleCategory(cat)}
              className={`flex w-full items-center gap-2 rounded-md px-3 py-2
                text-left text-sm font-medium transition-colors ${
                  expandedCat === cat.id
                    ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
            >
              <CategoryIcon id={cat.id} />
              {cat.label}
              <span className="ml-auto text-xs text-slate-400">
                {cat.operations.length}
              </span>
              <ChevronIcon open={expandedCat === cat.id} />
            </button>

            {/* Sub-operations */}
            {expandedCat === cat.id && (
              <div className="ml-6 mt-1 space-y-0.5">
                {cat.operations.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => onChange(op)}
                    className={`w-full rounded px-3 py-1.5 text-left text-sm
                      transition-colors ${
                        value?.id === op.id
                          ? "bg-primary-600 text-white"
                          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                      }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

function CategoryIcon({ id }: { id: string }) {
  const labels: Record<string, string> = {
    milling: "M",
    turning: "T",
    drilling: "D",
    grinding: "G",
    threading: "Th",
  };
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded bg-slate-200 text-xs font-bold text-slate-600 dark:bg-slate-600 dark:text-slate-300">
      {labels[id] ?? "?"}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}
