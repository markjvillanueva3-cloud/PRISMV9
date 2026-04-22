/**
 * ProgramPreview.tsx — G-code Viewer with Physics Overlay
 * MILL-MASTER/P0-U04-STUDIO-PANELS
 *
 * Displays generated G-code with per-block physics annotations.
 * Wires to PostProcessorPipelineEngine for dialect formatting.
 */

import { useState, useMemo } from "react";

interface PhysicsAnnotation {
  line: number;
  force_N?: number;
  power_kW?: number;
  mrr_cm3_min?: number;
  temp_C?: number;
  warning?: string;
}

interface ProgramPreviewProps {
  gcode: string;
  annotations?: PhysicsAnnotation[];
  machineId?: string;
  controllerId?: string;
}

export function ProgramPreview({ gcode, annotations = [], machineId, controllerId }: ProgramPreviewProps) {
  const [showPhysics, setShowPhysics] = useState(true);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const lines = useMemo(() => gcode.split("\n"), [gcode]);
  const annotationMap = useMemo(() => {
    const map = new Map<number, PhysicsAnnotation>();
    annotations.forEach(a => map.set(a.line, a));
    return map;
  }, [annotations]);

  const selectedAnnotation = selectedLine !== null ? annotationMap.get(selectedLine) : null;

  const getLineClass = (lineNum: number) => {
    const annotation = annotationMap.get(lineNum);
    if (!annotation) return "";
    if (annotation.warning) return "bg-amber-900/30 border-l-2 border-amber-500";
    if (annotation.force_N && annotation.force_N > 2000) return "bg-red-900/20 border-l-2 border-red-500";
    if (annotation.mrr_cm3_min && annotation.mrr_cm3_min > 20) return "bg-emerald-900/20 border-l-2 border-emerald-500";
    return "";
  };

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-cyan-400">G-Code Preview</h3>
          {machineId && <span className="text-xs text-slate-400">{machineId}</span>}
          {controllerId && <span className="text-xs bg-slate-600 px-2 py-0.5 rounded">{controllerId}</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={showPhysics}
              onChange={(e) => setShowPhysics(e.target.checked)}
              className="rounded"
            />
            Physics Overlay
          </label>
          <button className="px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded">
            Copy
          </button>
          <button className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded">
            Download
          </button>
        </div>
      </div>

      {/* Code view */}
      <div className="flex-1 overflow-auto font-mono text-sm">
        <table className="w-full">
          <tbody>
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const annotation = annotationMap.get(lineNum);
              return (
                <tr
                  key={idx}
                  onClick={() => setSelectedLine(lineNum)}
                  className={`hover:bg-slate-700/50 cursor-pointer ${getLineClass(lineNum)} ${
                    selectedLine === lineNum ? "bg-cyan-900/30" : ""
                  }`}
                >
                  <td className="w-12 text-right pr-3 text-slate-500 select-none border-r border-slate-700">
                    {lineNum}
                  </td>
                  <td className="pl-3 pr-4 py-0.5 text-slate-300 whitespace-pre">
                    {line}
                  </td>
                  {showPhysics && annotation && (
                    <td className="text-xs text-slate-500 pr-2">
                      {annotation.force_N && <span className="mr-2">F:{annotation.force_N}N</span>}
                      {annotation.power_kW && <span className="mr-2">P:{annotation.power_kW}kW</span>}
                      {annotation.mrr_cm3_min && <span className="text-emerald-400">MRR:{annotation.mrr_cm3_min}</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Physics detail panel */}
      {selectedAnnotation && showPhysics && (
        <div className="border-t border-slate-600 p-3 bg-slate-900/50">
          <div className="text-xs text-slate-400 mb-1">Line {selectedLine} Physics:</div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            {selectedAnnotation.force_N && (
              <div>
                <div className="text-slate-500 text-xs">Cutting Force</div>
                <div className="text-cyan-400 font-medium">{selectedAnnotation.force_N} N</div>
              </div>
            )}
            {selectedAnnotation.power_kW && (
              <div>
                <div className="text-slate-500 text-xs">Spindle Power</div>
                <div className="text-violet-400 font-medium">{selectedAnnotation.power_kW} kW</div>
              </div>
            )}
            {selectedAnnotation.mrr_cm3_min && (
              <div>
                <div className="text-slate-500 text-xs">MRR</div>
                <div className="text-emerald-400 font-medium">{selectedAnnotation.mrr_cm3_min} cm³/min</div>
              </div>
            )}
            {selectedAnnotation.temp_C && (
              <div>
                <div className="text-slate-500 text-xs">Temperature</div>
                <div className="text-amber-400 font-medium">{selectedAnnotation.temp_C}°C</div>
              </div>
            )}
          </div>
          {selectedAnnotation.warning && (
            <div className="mt-2 text-amber-400 text-xs flex items-center gap-1">
              ⚠ {selectedAnnotation.warning}
            </div>
          )}
        </div>
      )}

      {/* Footer stats */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/30 border-t border-slate-600 text-xs text-slate-400">
        <span>{lines.length} lines</span>
        <span>{annotations.filter(a => a.warning).length} warnings</span>
        <span>Click line for physics detail</span>
      </div>
    </div>
  );
}

export default ProgramPreview;
