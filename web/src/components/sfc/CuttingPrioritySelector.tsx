import { Card } from "../ui";
import {
  CUTTING_PRIORITIES,
  type CuttingPriority,
} from "../../data/toolpathStrategies";

interface Props {
  value: CuttingPriority;
  onChange: (priority: CuttingPriority) => void;
}

export default function CuttingPrioritySelector({ value, onChange }: Props) {
  return (
    <Card title="Cutting Priority">
      <div className="grid grid-cols-4 gap-2">
        {CUTTING_PRIORITIES.map((p) => {
          const isActive = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-center transition-all ${
                isActive
                  ? "border-primary-500 bg-primary-600/15 text-white shadow-sm shadow-primary-500/20"
                  : "border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500 hover:text-slate-200"
              }`}
            >
              <span className="text-lg">{p.icon}</span>
              <span className="text-xs font-semibold">{p.label}</span>
              <span className={`text-[10px] leading-tight ${isActive ? "text-primary-300" : "text-slate-500"}`}>
                {p.description}
              </span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}
