import { useMemo } from "react";
import { getCompatibleTools, COATINGS, type CuttingToolEntry } from "../../data/tools";
import { Card, Badge } from "../ui";

interface Props {
  materialGroup: string | null;
  operationId: string | null;
  value: CuttingToolEntry | null;
  onChange: (tool: CuttingToolEntry) => void;
}

function coatingColor(coating: string): "green" | "yellow" | "blue" | "slate" {
  const c = COATINGS[coating];
  if (!c) return "slate";
  if (c.maxTemp >= 900) return "green";
  if (c.maxTemp >= 600) return "yellow";
  return "blue";
}

export default function SmartToolSelector({ materialGroup, operationId, value, onChange }: Props) {
  const { compatible, incompatible } = useMemo(() => {
    if (!materialGroup || !operationId) return { compatible: [], incompatible: [] };
    return getCompatibleTools(materialGroup, operationId);
  }, [materialGroup, operationId]);

  if (!materialGroup || !operationId) {
    return (
      <Card title="Tool">
        <p className="text-sm text-slate-400">Select material and operation first</p>
      </Card>
    );
  }

  return (
    <Card title="Tool">
      {compatible.length === 0 && (
        <p className="text-sm text-slate-400">No compatible tools found</p>
      )}

      {/* Compatible tools */}
      <div className="space-y-1">
        {compatible.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => onChange(tool)}
            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left
              text-sm transition-colors ${
                value?.id === tool.id
                  ? "bg-primary-600 text-white"
                  : "text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
              }`}
          >
            <ToolIcon type={tool.type} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{tool.name}</div>
              <div className="flex gap-2 text-xs opacity-75">
                <span>{tool.diameter}mm</span>
                <span>{tool.fluteCount}F</span>
                <span>{tool.helixAngle > 0 ? `${tool.helixAngle}\u00b0` : ""}</span>
              </div>
            </div>
            <Badge color={coatingColor(tool.coating)}>{tool.coating}</Badge>
          </button>
        ))}
      </div>

      {/* Incompatible tools (collapsed) */}
      {incompatible.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
            {incompatible.length} incompatible tool{incompatible.length > 1 ? "s" : ""}
          </summary>
          <div className="mt-1 space-y-1">
            {incompatible.map(({ tool, reason }) => (
              <div
                key={tool.id}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 opacity-50"
                title={reason}
              >
                <ToolIcon type={tool.type} />
                <span className="flex-1 truncate text-sm text-slate-400">
                  {tool.name}
                </span>
                <span className="max-w-[200px] truncate text-xs text-red-400">
                  {reason}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Selected tool details */}
      {value && (
        <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-700/50">
          <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
            <span>Substrate: <strong>{value.substrate}</strong></span>
            <span>Coating: <strong>{value.coating}</strong></span>
            <span>Diameter: <strong>{value.diameter} mm</strong></span>
            <span>Flutes: <strong>{value.fluteCount}</strong></span>
            <span>Helix: <strong>{value.helixAngle}\u00b0</strong></span>
            <span>Max DoC: <strong>{value.maxDoc} mm</strong></span>
            <span>Manufacturer: <strong>{value.manufacturer}</strong></span>
            <span>Max RPM: <strong>{value.maxRpm.toLocaleString()}</strong></span>
          </div>
        </div>
      )}
    </Card>
  );
}

function ToolIcon({ type }: { type: string }) {
  const labels: Record<string, string> = {
    endmill: "EM",
    face_mill: "FM",
    drill: "DR",
    insert: "IN",
    thread_mill: "TM",
  };
  return (
    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded
      bg-slate-200 text-[10px] font-bold text-slate-600
      dark:bg-slate-600 dark:text-slate-300">
      {labels[type] ?? "?"}
    </span>
  );
}
