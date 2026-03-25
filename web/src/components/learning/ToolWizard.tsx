import { useState } from "react";
import { useToolSelect } from "../../hooks/useLearning";
import type { ToolRecommendation } from "../../types/learning";

const OPERATIONS = [
  "face_milling", "end_milling", "slot_milling", "drilling",
  "boring", "reaming", "tapping", "turning", "grooving", "threading",
];

export default function ToolWizard() {
  const select = useToolSelect();
  const [step, setStep] = useState<"input" | "results">("input");
  const [form, setForm] = useState({
    operation: "",
    material: "",
    material_hardness: "",
    depth_of_cut: "",
    surface_finish_required: "",
    machine_spindle_max_rpm: "",
  });

  const handleSubmit = async () => {
    const result = await select.execute({
      operation: form.operation,
      material: form.material || undefined,
      material_hardness: form.material_hardness
        ? Number(form.material_hardness) : undefined,
      depth_of_cut: form.depth_of_cut
        ? Number(form.depth_of_cut) : undefined,
      surface_finish_required: form.surface_finish_required
        ? Number(form.surface_finish_required) : undefined,
      machine_spindle_max_rpm: form.machine_spindle_max_rpm
        ? Number(form.machine_spindle_max_rpm) : undefined,
    });
    if (result) setStep("results");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1">Tool Selection</h1>
      <p className="text-slate-400 text-sm mb-6">
        Find the right cutting tool for your operation
      </p>

      {step === "input" && (
        <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Operation *
            </label>
            <select
              value={form.operation}
              onChange={(e) => setForm({ ...form, operation: e.target.value })}
              className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
            >
              <option value="">Select operation...</option>
              {OPERATIONS.map((op) => (
                <option key={op} value={op}>
                  {op.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Material
              </label>
              <input
                type="text"
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                placeholder="e.g., 4140 Steel, 6061 Aluminum"
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Material Hardness (HRC)
              </label>
              <input
                type="number"
                value={form.material_hardness}
                onChange={(e) => setForm({ ...form, material_hardness: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Depth of Cut (mm)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.depth_of_cut}
                onChange={(e) => setForm({ ...form, depth_of_cut: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Surface Finish (Ra um)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.surface_finish_required}
                onChange={(e) => setForm({ ...form, surface_finish_required: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Max Spindle RPM
              </label>
              <input
                type="number"
                value={form.machine_spindle_max_rpm}
                onChange={(e) => setForm({ ...form, machine_spindle_max_rpm: e.target.value })}
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.operation || select.loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {select.loading ? "Searching..." : "Find Tools"}
          </button>
        </div>
      )}

      {step === "results" && select.data && (
        <div>
          <button
            onClick={() => setStep("input")}
            className="mb-4 text-sm text-blue-400 hover:text-blue-300"
          >
            &larr; Change Parameters
          </button>

          <div className="text-sm text-slate-400 mb-4">
            {select.data.recommendations.length} tools for{" "}
            <span className="font-medium text-slate-300">
              {select.data.operation.replace(/_/g, " ")}
            </span>
            {select.data.material && (
              <> on <span className="font-medium text-slate-300">{select.data.material}</span></>
            )}
          </div>

          <div className="space-y-3">
            {select.data.recommendations.map((rec: ToolRecommendation) => (
              <div
                key={rec.tool_id}
                className="p-4 bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60 hover:shadow-lg hover:shadow-black/20 transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-100">{rec.name}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rec.type} &middot; {rec.diameter_mm}mm &middot;{" "}
                      {rec.flute_count} flutes &middot; {rec.helix_angle_deg} helix &middot;{" "}
                      {rec.coating}
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium
                      ${rec.match_score >= 80
                        ? "bg-green-500/20 text-green-400"
                        : rec.match_score >= 60
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                  >
                    {rec.match_score}%
                  </span>
                </div>

                {/* Recommended params */}
                <div className="mt-3 grid grid-cols-4 gap-2 p-2 bg-slate-900/50 rounded text-xs">
                  <div>
                    <div className="text-slate-400">RPM</div>
                    <div className="font-medium text-slate-300">
                      {rec.recommended_params.rpm.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Feed/tooth</div>
                    <div className="font-medium text-slate-300">
                      {rec.recommended_params.feed_per_tooth} mm
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">DOC</div>
                    <div className="font-medium text-slate-300">
                      {rec.recommended_params.depth_of_cut} mm
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">WOC</div>
                    <div className="font-medium text-slate-300">
                      {rec.recommended_params.width_of_cut} mm
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 mt-2 text-xs">
                  {rec.pros.length > 0 && (
                    <div className="text-green-400">
                      {rec.pros.map((p) => `+ ${p}`).join(" ")}
                    </div>
                  )}
                  {rec.cons.length > 0 && (
                    <div className="text-red-400">
                      {rec.cons.map((c) => `- ${c}`).join(" ")}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {select.data.recommendations.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                No tools found. Try adjusting parameters.
              </div>
            )}
          </div>
        </div>
      )}

      {select.error && (
        <div className="mt-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">
          {select.error}
        </div>
      )}
    </div>
  );
}
