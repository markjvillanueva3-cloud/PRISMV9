import { useEffect, useRef } from "react";
import { MACHINE_MODES, MODE_GROUPS, type MachineMode, type MachineModeConfig } from "../../data/machineModes";

interface Props {
  value: MachineMode;
  onChange: (mode: MachineMode) => void;
  subOperation: string | null;
  onSubOperationChange: (subOp: string | null) => void;
}

/** Group the flat modes list by their `group` field, preserving order. */
function groupedModes(): { groupId: string; label: string; modes: MachineModeConfig[] }[] {
  return MODE_GROUPS.map((g) => ({
    groupId: g.id,
    label: g.label,
    modes: MACHINE_MODES.filter((m) => m.group === g.id),
  }));
}

export default function MachineModeTabs({
  value,
  onChange,
  subOperation,
  onSubOperationChange,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeMode = MACHINE_MODES.find((m) => m.id === value);
  const groups = groupedModes();

  // Auto-scroll active tab into view when mode changes
  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active="true"]');
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [value]);

  return (
    <div className="space-y-2">
      {/* Row 1: Scrollable mode tabs grouped by category */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto rounded-lg bg-slate-800/60 p-1.5 scrollbar-thin scrollbar-thumb-slate-600"
      >
        {groups.map((group, gi) => (
          <div key={group.groupId} className="flex items-center gap-1">
            {/* Group separator (after first group) */}
            {gi > 0 && (
              <div className="mx-0.5 h-8 w-px flex-shrink-0 bg-slate-600/50" />
            )}
            {/* Group label */}
            <span className="flex-shrink-0 px-1 text-[9px] font-medium uppercase tracking-wider text-slate-500">
              {group.label}
            </span>
            {/* Mode buttons in this group */}
            {group.modes.map((mode) => {
              const isActive = value === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  data-active={isActive}
                  onClick={() => onChange(mode.id)}
                  title={mode.description}
                  className={`flex flex-shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-center transition-all ${
                    isActive
                      ? "bg-primary-600 text-white shadow-sm"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200"
                  }`}
                >
                  <span className="text-sm leading-none">{mode.icon}</span>
                  <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Row 2: Sub-operation pills for the selected mode */}
      {activeMode && activeMode.subOperations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-1">
          {activeMode.subOperations.map((sub) => {
            const isActive = subOperation === sub.id;
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => onSubOperationChange(sub.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/60 hover:text-white"
                }`}
              >
                {sub.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
