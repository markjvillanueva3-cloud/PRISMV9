import { useMemo } from "react";
import { COATINGS, type CuttingToolEntry } from "../../data/tools";
import type { MachineEntry } from "../../data/machines";
import type { MaterialEntry } from "../../data/materials";
import { Badge } from "../ui";

interface Props {
  material: MaterialEntry | null;
  tool: CuttingToolEntry | null;
  machine: MachineEntry | null;
  operationId: string | null;
  requiredRpm: number;
  requiredPowerKw: number;
  onSuggest?: (suggestion: Suggestion) => void;
}

export interface Suggestion {
  type: "coating" | "tool" | "machine" | "params";
  message: string;
  action?: string;
}

interface ValidationResult {
  status: "green" | "yellow" | "red";
  messages: string[];
  suggestions: Suggestion[];
}

function validate(
  material: MaterialEntry | null,
  tool: CuttingToolEntry | null,
  machine: MachineEntry | null,
  operationId: string | null,
  requiredRpm: number,
  requiredPowerKw: number,
): ValidationResult {
  const messages: string[] = [];
  const suggestions: Suggestion[] = [];
  let hasError = false; // track red-level issues directly

  if (!material || !tool || !operationId) {
    return { status: "green", messages: [], suggestions: [] };
  }

  // NaN guards
  if (!Number.isFinite(requiredRpm)) requiredRpm = 0;
  if (!Number.isFinite(requiredPowerKw)) requiredPowerKw = 0;

  // Coating vs material check
  const coating = COATINGS[tool.coating];
  if (coating?.avoidFor.includes(material.group)) {
    hasError = true;
    messages.push(
      `${tool.coating} coating is not recommended for ${material.groupLabel} (ISO ${material.group})`,
    );
    const betterCoatings = Object.entries(COATINGS)
      .filter(([, c]) => c.suitedFor.includes(material.group) && !c.avoidFor.includes(material.group))
      .map(([name]) => name);
    if (betterCoatings.length > 0) {
      suggestions.push({
        type: "coating",
        message: `Consider switching to ${betterCoatings[0]} coating`,
        action: betterCoatings[0],
      });
    }
  }

  // Tool material suitability
  if (tool.avoidMaterials.includes(material.group)) {
    hasError = true;
    messages.push(
      `${tool.substrate} substrate tools are not recommended for ISO ${material.group}`,
    );
  }

  // Operation compatibility
  if (!tool.suitedOperations.includes(operationId)) {
    messages.push(
      `Tool not designed for ${operationId.replace(/_/g, " ")} operations`,
    );
  }

  // Machine RPM check
  if (machine && requiredRpm > 0) {
    if (machine.spindleMaxRpm < requiredRpm) {
      hasError = true;
      messages.push(
        `Machine max RPM (${machine.spindleMaxRpm.toLocaleString()}) is below required ${Math.round(requiredRpm).toLocaleString()} RPM`,
      );
      suggestions.push({
        type: "params",
        message: "Reduce cutting speed or increase tool diameter to lower RPM",
      });
    }
  }

  // Machine power check
  if (machine && requiredPowerKw > 0) {
    if (machine.spindlePowerKw < requiredPowerKw) {
      hasError = true;
      messages.push(
        `Machine power (${machine.spindlePowerKw} kW) insufficient for required ${requiredPowerKw.toFixed(1)} kW`,
      );
      suggestions.push({
        type: "params",
        message: "Reduce depth of cut or feed rate to lower power demand",
      });
    }
  }

  // Tool max RPM
  if (tool.maxRpm > 0 && requiredRpm > tool.maxRpm) {
    hasError = true;
    messages.push(
      `Required RPM (${Math.round(requiredRpm).toLocaleString()}) exceeds tool max RPM (${tool.maxRpm.toLocaleString()})`,
    );
  }

  // Hardened material + wrong tool
  if (material.group === "H" && tool.substrate === "HSS") {
    hasError = true;
    messages.push("HSS tools are not suitable for hardened steel — use CBN or ceramic");
    suggestions.push({
      type: "tool",
      message: "Switch to CBN insert for hardened steel machining",
    });
  }

  const status = messages.length === 0 ? "green" : hasError ? "red" : "yellow";

  return { status, messages, suggestions };
}

export default function CompatibilityValidator({
  material, tool, machine, operationId,
  requiredRpm, requiredPowerKw, onSuggest,
}: Props) {
  const result = useMemo(
    () => validate(material, tool, machine, operationId, requiredRpm, requiredPowerKw),
    [material, tool, machine, operationId, requiredRpm, requiredPowerKw],
  );

  if (result.messages.length === 0 && material && tool) {
    return (
      <div className="flex items-center gap-2 rounded-md bg-green-50 px-4 py-2 dark:bg-green-900/20">
        <Badge color="green">Compatible</Badge>
        <span className="text-xs text-green-700 dark:text-green-300">
          Material, tool{machine ? ", and machine" : ""} combination is valid
        </span>
      </div>
    );
  }

  if (result.messages.length === 0) return null;

  const bgColor = result.status === "red"
    ? "bg-red-50 dark:bg-red-900/20"
    : "bg-yellow-50 dark:bg-yellow-900/20";

  return (
    <div className={`rounded-md px-4 py-3 ${bgColor}`} role="alert">
      <div className="flex items-center gap-2 mb-2">
        <Badge color={result.status === "red" ? "red" : "yellow"}>
          {result.status === "red" ? "Incompatible" : "Warning"}
        </Badge>
      </div>
      <ul className="space-y-1">
        {result.messages.map((msg, i) => (
          <li key={i} className="text-xs text-slate-700 dark:text-slate-300">
            {msg}
          </li>
        ))}
      </ul>
      {result.suggestions.length > 0 && onSuggest && (
        <div className="mt-2 flex flex-wrap gap-2">
          {result.suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSuggest(s)}
              className="rounded bg-white px-2 py-1 text-xs font-medium
                text-primary-600 shadow-sm hover:bg-primary-50
                dark:bg-slate-700 dark:text-primary-400 dark:hover:bg-slate-600"
            >
              {s.message}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
