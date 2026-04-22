/**
 * SimPanel.tsx — Milling Simulation Panel
 * MILL-MASTER/P0-U04-STUDIO-PANELS
 *
 * Collision/force/thermal simulation visualization.
 * Wires to: MillKinematicsCollisionEngine, CuttingForceEngine, ThermalWearCouplingEngine.
 */

import { useState } from "react";

interface SimResult {
  collisionFree: boolean;
  collisionPoints?: { x: number; y: number; z: number; type: string }[];
  maxForce_N: number;
  avgForce_N: number;
  maxPower_kW: number;
  maxTemp_C: number;
  toolDeflection_mm: number;
  safetyMargin: number;
  warnings: string[];
}

interface SimPanelProps {
  isRunning?: boolean;
  progress?: number;
  result?: SimResult;
  onStartSim?: () => void;
  onStopSim?: () => void;
}

export function SimPanel({ isRunning, progress = 0, result, onStartSim, onStopSim }: SimPanelProps) {
  const [activeTab, setActiveTab] = useState<"collision" | "force" | "thermal">("collision");

  const safetyColor = (margin: number) => {
    if (margin >= 0.8) return "text-emerald-400";
    if (margin >= 0.5) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header with tabs */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
        <div className="flex gap-1">
          {(["collision", "force", "thermal"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-xs rounded ${
                activeTab === tab ? "bg-cyan-600 text-white" : "bg-slate-600 text-slate-300 hover:bg-slate-500"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div>
          {isRunning ? (
            <button
              onClick={onStopSim}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 rounded"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={onStartSim}
              className="px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 rounded"
            >
              Run Simulation
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="h-1 bg-slate-700">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Simulation visualization area */}
      <div className="flex-1 p-4">
        {!result ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="text-4xl mb-2">🔧</div>
              <div>Run simulation to see results</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Collision tab */}
            {activeTab === "collision" && (
              <div>
                <div className={`text-2xl font-bold mb-4 ${result.collisionFree ? "text-emerald-400" : "text-red-400"}`}>
                  {result.collisionFree ? "✓ Collision Free" : "⚠ Collision Detected"}
                </div>
                {result.collisionPoints && result.collisionPoints.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Collision Points:</div>
                    {result.collisionPoints.map((pt, idx) => (
                      <div key={idx} className="text-xs bg-red-900/20 rounded p-2 flex items-center gap-4">
                        <span className="text-red-400">{pt.type}</span>
                        <span>X: {pt.x.toFixed(2)}</span>
                        <span>Y: {pt.y.toFixed(2)}</span>
                        <span>Z: {pt.z.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Force tab */}
            {activeTab === "force" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded p-4">
                  <div className="text-xs text-slate-500">Max Cutting Force</div>
                  <div className="text-2xl font-bold text-cyan-400">{result.maxForce_N} N</div>
                </div>
                <div className="bg-slate-700/50 rounded p-4">
                  <div className="text-xs text-slate-500">Average Force</div>
                  <div className="text-2xl font-bold text-slate-300">{result.avgForce_N} N</div>
                </div>
                <div className="bg-slate-700/50 rounded p-4">
                  <div className="text-xs text-slate-500">Max Spindle Power</div>
                  <div className="text-2xl font-bold text-violet-400">{result.maxPower_kW} kW</div>
                </div>
                <div className="bg-slate-700/50 rounded p-4">
                  <div className="text-xs text-slate-500">Tool Deflection</div>
                  <div className="text-2xl font-bold text-amber-400">{result.toolDeflection_mm} mm</div>
                </div>
              </div>
            )}

            {/* Thermal tab */}
            {activeTab === "thermal" && (
              <div>
                <div className="bg-slate-700/50 rounded p-4 mb-4">
                  <div className="text-xs text-slate-500">Max Tool Temperature</div>
                  <div className={`text-3xl font-bold ${result.maxTemp_C > 600 ? "text-red-400" : "text-amber-400"}`}>
                    {result.maxTemp_C}°C
                  </div>
                  {result.maxTemp_C > 600 && (
                    <div className="text-xs text-red-400 mt-1">⚠ Exceeds coating limit</div>
                  )}
                </div>
                <div className="h-4 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-amber-500 to-red-500"
                    style={{ width: `${Math.min((result.maxTemp_C / 800) * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>0°C</span>
                  <span>400°C</span>
                  <span>800°C</span>
                </div>
              </div>
            )}

            {/* Safety summary */}
            <div className="border-t border-slate-600 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Safety Margin:</span>
                <span className={`text-lg font-bold ${safetyColor(result.safetyMargin)}`}>
                  {(result.safetyMargin * 100).toFixed(0)}%
                </span>
              </div>
              {result.warnings.length > 0 && (
                <div className="mt-2 space-y-1">
                  {result.warnings.map((w, idx) => (
                    <div key={idx} className="text-xs text-amber-400 flex items-center gap-1">
                      ⚠ {w}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SimPanel;
