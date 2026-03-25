import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMaterialSelect } from "../../hooks/useLearning";
import type { MaterialRecommendation } from "../../types/learning";

type WizStep = "requirements" | "results";

export default function MaterialWizard() {
  const navigate = useNavigate();
  const select = useMaterialSelect();
  const [step, setStep] = useState<WizStep>("requirements");
  const [form, setForm] = useState({
    application: "",
    material_family: "",
    budget: "" as "" | "low" | "medium" | "high",
    hardness_min: "",
    hardness_max: "",
    corrosion_resistance: false,
    heat_resistance: false,
    machinability_min: "",
  });

  const handleSubmit = async () => {
    const result = await select.execute({
      application: form.application || undefined,
      material_family: form.material_family || undefined,
      budget: form.budget || undefined,
      properties: {
        hardness_min: form.hardness_min ? Number(form.hardness_min) : undefined,
        hardness_max: form.hardness_max ? Number(form.hardness_max) : undefined,
        corrosion_resistance: form.corrosion_resistance || undefined,
        heat_resistance: form.heat_resistance || undefined,
        machinability_min: form.machinability_min
          ? Number(form.machinability_min)
          : undefined,
      },
    });
    if (result) setStep("results");
  };

  const goToSfc = (mat: MaterialRecommendation) => {
    navigate(`/sfc?material=${encodeURIComponent(mat.name)}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-1">
        Material Selection
      </h1>
      <p className="text-slate-400 text-sm mb-6">
        Find the right material for your machining job
      </p>

      {step === "requirements" && (
        <div className="bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Application
            </label>
            <input
              type="text"
              value={form.application}
              onChange={(e) => setForm({ ...form, application: e.target.value })}
              placeholder="e.g., Aerospace bracket, Medical implant"
              className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Material Family
              </label>
              <select
                value={form.material_family}
                onChange={(e) =>
                  setForm({ ...form, material_family: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              >
                <option value="">Any</option>
                <option value="steel">Steel</option>
                <option value="aluminum">Aluminum</option>
                <option value="titanium">Titanium</option>
                <option value="stainless">Stainless Steel</option>
                <option value="copper">Copper Alloy</option>
                <option value="nickel">Nickel Alloy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Budget
              </label>
              <select
                value={form.budget}
                onChange={(e) =>
                  setForm({
                    ...form,
                    budget: e.target.value as "" | "low" | "medium" | "high",
                  })
                }
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              >
                <option value="">Any</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Min Hardness (HRC)
              </label>
              <input
                type="number"
                value={form.hardness_min}
                onChange={(e) =>
                  setForm({ ...form, hardness_min: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Max Hardness (HRC)
              </label>
              <input
                type="number"
                value={form.hardness_max}
                onChange={(e) =>
                  setForm({ ...form, hardness_max: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Min Machinability (%)
              </label>
              <input
                type="number"
                value={form.machinability_min}
                onChange={(e) =>
                  setForm({ ...form, machinability_min: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-700/60 rounded-lg text-sm bg-slate-900/50 text-slate-200"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.corrosion_resistance}
                onChange={(e) =>
                  setForm({ ...form, corrosion_resistance: e.target.checked })
                }
                className="rounded border-slate-600"
              />
              Corrosion Resistance
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.heat_resistance}
                onChange={(e) =>
                  setForm({ ...form, heat_resistance: e.target.checked })
                }
                className="rounded border-slate-600"
              />
              Heat Resistance
            </label>
          </div>

          <button
            onClick={handleSubmit}
            disabled={select.loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg
              hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {select.loading ? "Searching..." : "Find Materials"}
          </button>
        </div>
      )}

      {step === "results" && select.data && (
        <div>
          <button
            onClick={() => setStep("requirements")}
            className="mb-4 text-sm text-blue-400 hover:text-blue-300"
          >
            &larr; Modify Requirements
          </button>

          {/* Comparison table */}
          {select.data.recommendations.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-slate-700/60 rounded-xl overflow-hidden">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-300">
                      Material
                    </th>
                    <th className="text-left p-3 font-medium text-slate-300">
                      Family
                    </th>
                    <th className="text-center p-3 font-medium text-slate-300">
                      Match
                    </th>
                    {select.data.comparison_properties.slice(0, 4).map((p) => (
                      <th
                        key={p}
                        className="text-center p-3 font-medium text-slate-300"
                      >
                        {p}
                      </th>
                    ))}
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {select.data.recommendations.map(
                    (rec: MaterialRecommendation) => (
                      <tr
                        key={rec.material_id}
                        className="border-t border-slate-700/40 hover:bg-slate-800"
                      >
                        <td className="p-3">
                          <div className="font-medium text-slate-100">
                            {rec.name}
                          </div>
                          <div className="text-xs text-slate-400">
                            {rec.grade}
                          </div>
                        </td>
                        <td className="p-3 text-slate-300 capitalize">
                          {rec.family}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium
                            ${rec.match_score >= 80
                                ? "bg-green-500/20 text-green-400"
                                : rec.match_score >= 60
                                  ? "bg-amber-500/20 text-amber-400"
                                  : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {rec.match_score}%
                          </span>
                        </td>
                        {select.data!.comparison_properties
                          .slice(0, 4)
                          .map((p) => (
                            <td
                              key={p}
                              className="p-3 text-center text-slate-300"
                            >
                              {rec.properties[p] ?? "-"}
                            </td>
                          ))}
                        <td className="p-3">
                          <button
                            onClick={() => goToSfc(rec)}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                          >
                            Calculate
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Detail cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {select.data.recommendations.map((rec: MaterialRecommendation) => (
              <div
                key={rec.material_id}
                className="p-4 bg-slate-800/70 backdrop-blur-sm rounded-xl border border-slate-700/60"
              >
                <h3 className="font-medium text-slate-100">
                  {rec.name} ({rec.grade})
                </h3>
                {rec.pros.length > 0 && (
                  <div className="mt-2">
                    {rec.pros.map((p) => (
                      <div key={p} className="text-xs text-green-400">
                        + {p}
                      </div>
                    ))}
                  </div>
                )}
                {rec.cons.length > 0 && (
                  <div className="mt-1">
                    {rec.cons.map((c) => (
                      <div key={c} className="text-xs text-red-400">
                        - {c}
                      </div>
                    ))}
                  </div>
                )}
                {rec.typical_applications.length > 0 && (
                  <div className="text-xs text-slate-400 mt-2">
                    Uses: {rec.typical_applications.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          {select.data.recommendations.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No materials match your criteria. Try relaxing requirements.
            </div>
          )}
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
