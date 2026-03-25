import { useCallback } from "react";
import { Card, Select } from "../ui";
import { CAM_SOFTWARE, type CamSelection } from "../../data/camSoftware";

interface Props {
  value: CamSelection | null;
  onChange: (selection: CamSelection | null) => void;
}

export default function CamSoftwareSelector({ value, onChange }: Props) {
  const handleSoftwareToggle = useCallback(
    (softwareId: string) => {
      if (value?.softwareId === softwareId) {
        onChange(null);
      } else {
        const sw = CAM_SOFTWARE.find((s) => s.id === softwareId);
        if (sw) {
          onChange({ softwareId, levelId: sw.levels[0].id });
        }
      }
    },
    [value, onChange],
  );

  const handleLevelChange = useCallback(
    (levelId: string) => {
      if (value) {
        onChange({ ...value, levelId });
      }
    },
    [value, onChange],
  );

  return (
    <Card title="CAM Software">
      <p className="mb-3 text-xs text-slate-400">
        Select your CAM package — toolpath strategies and speed/feed adjustments adapt to your software
      </p>
      <div className="space-y-2">
        {CAM_SOFTWARE.map((sw) => {
          const isSelected = value?.softwareId === sw.id;
          return (
            <div key={sw.id} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSoftwareToggle(sw.id)}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all flex-1 text-left ${
                  isSelected
                    ? "border-primary-500 bg-primary-600/10 text-primary-400"
                    : "border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:text-white"
                }`}
              >
                <span className={`inline-flex h-6 w-8 items-center justify-center rounded text-[10px] font-bold ${
                  isSelected ? "bg-primary-600 text-white" : "bg-slate-700 text-slate-400"
                }`}>
                  {sw.icon}
                </span>
                {sw.name}
              </button>
              {isSelected && sw.levels.length > 1 && (
                <div className="w-48">
                  <Select
                    value={value.levelId}
                    onChange={(e) => handleLevelChange(e.target.value)}
                    options={sw.levels.map((l) => ({ value: l.id, label: l.label }))}
                  />
                </div>
              )}
              {isSelected && sw.levels.length === 1 && (
                <span className="text-xs text-slate-500">{sw.levels[0].label}</span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
