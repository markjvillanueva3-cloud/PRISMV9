import { useState } from "react";
import { useMachineSelect } from "../../hooks/useLearning";
import type { MachineRecommendation } from "../../types/learning";

const OPERATION_TYPES = [
  "milling", "turning", "drilling", "boring", "grinding",
  "edm", "5_axis", "multi_task",
];

const VOLUME_OPTIONS = [
  { value: "prototype", label: "Prototype (1-10)" },
  { value: "low", label: "Low (10-100)" },
  { value: "medium", label: "Medium (100-1000)" },
  { value: "high", label: "High (1000+)" },
] as const;

export default function MachineWizard() {
  const select = useMachineSelect();
  const [step, setStep] = useState<"input" | "results">("input");
  const [form, setForm] = useState({
    part_x: "",
    part_y: "",
    part_z: "",
    operations: [] as string[],
    material: "",
    accuracy: "",
    volume: "" as "" | "prototype" | "low" | "medium" | "high",
  });

  const toggleOp = (op: string) => {
    setForm((prev) => ({
      ...prev,
      operations: prev.operations.includes(op)
        ? prev.operations.filter((o) => o !== op)
        : [...prev.operations, op],
    }));
  };

  const handleSubmit = async () => {
    const result = await select.execute({
      part_size: form.part_x && form.part_y && form.part_z
        ? { x: Number(form.part_x), y: Number(form.part_y), z: Number(form.part_z) }
        : undefined,
      operations: form.operations.length > 0 ? form.operations : undefined,
      material: form.material || undefined,
      accuracy_required_mm: form.accuracy ? Number(form.accuracy) : undefined,
      production_volume: form.volume || undefined,
    });
    if (result) setStep("results");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1">Machine Selection</h1>
      <p className="text-slate-400 text-sm mb-6">
        Find the right CNC machine for your application
      </p>

      {step === "input" && (
        <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Part Envelope (mm)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(["part_x", "part_y", "part_z"] as const).map((dim, i) => (
                <div key={dim}>
                  <label className="text-xs text-slate-400 mb-0.5 block">
                    {["X (length)", "Y (width)", "Z (height)"][i]}
                  </label>
                  <input
                    type="number"
                    value={form[dim]}
                    onChange={(e) => setForm({ ...form, [dim]: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Required Operations
            </label>
            <div className="flex flex-wrap gap-2">
              {OPERATION_TYPES.map((op) => (
                <button
                  key={op}
                  onClick={() => toggleOp(op)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all
                    ${form.operations.includes(op)
                      ? "border-blue-500 bg-blue-500/10 text-blue-300 font-medium"
                      : "border-slate-700/60 text-slate-300 hover:border-slate-600"
                    }`}
                >
                  {op.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              ))}
            </div>
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
                placeholder="e.g., Titanium, Inconel"
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Accuracy Required (mm)
              </label>
              <input
                type="number"
                step="0.001"
                value={form.accuracy}
                onChange={(e) => setForm({ ...form, accuracy: e.target.value })}
                placeholder="e.g., 0.01"
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Production Volume
            </label>
            <div className="grid grid-cols-4 gap-2">
              {VOLUME_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  onClick={() => setForm({ ...form, volume: v.value })}
                  className={`p-2 rounded-lg border text-sm text-center transition-all
                    ${form.volume === v.value
                      ? "border-blue-500 bg-blue-500/10 font-medium text-blue-300"
                      : "border-slate-700/60 text-slate-300 hover:border-slate-600"
                    }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={select.loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {select.loading ? "Searching..." : "Find Machines"}
          </button>
        </div>
      )}

      {step === "results" && select.data && (
        <div>
          <button
            onClick={() => setStep("input")}
            className="mb-4 text-sm text-blue-400 hover:text-blue-300"
          >
            &larr; Change Requirements
          </button>

          {!select.data.requirements_met && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400">
              No machines fully meet all requirements. Showing closest matches.
            </div>
          )}

          <div className="space-y-3">
            {select.data.recommendations.map((rec: MachineRecommendation) => (
              <div
                key={rec.machine_id}
                className="p-4 bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-100">{rec.name}</h3>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {rec.manufacturer} &middot; {rec.type} &middot; {rec.axes}-axis
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

                <div className="mt-3 grid grid-cols-5 gap-2 p-2 bg-slate-900/50 rounded text-xs">
                  <div>
                    <div className="text-slate-400">Table</div>
                    <div className="font-medium text-slate-300">
                      {rec.table_size.x}x{rec.table_size.y}mm
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Spindle</div>
                    <div className="font-medium text-slate-300">
                      {rec.spindle_max_rpm.toLocaleString()} RPM
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Power</div>
                    <div className="font-medium text-slate-300">
                      {rec.power_kw} kW
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Accuracy</div>
                    <div className="font-medium text-slate-300">
                      {rec.accuracy_mm} mm
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400">Axes</div>
                    <div className="font-medium text-slate-300">{rec.axes}</div>
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
                No machines found. Try adjusting requirements.
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
