import { useState } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import {
  useDiagnosisForensic,
  useDiagnosisInverse,
  useDiagnosisGeneratePlan,
  useDiagnosisSustainability,
} from "../hooks/useDiagnosis";

export default function DiagnosisPage() {
  const forensic = useDiagnosisForensic();
  const inverse = useDiagnosisInverse();
  const genplan = useDiagnosisGeneratePlan();
  const sustainability = useDiagnosisSustainability();

  // Forensics form state
  const [forensicType, setForensicType] = useState("tool_autopsy");
  const [forensicDesc, setForensicDesc] = useState("");
  const [forensicMaterial, setForensicMaterial] = useState("");
  const [forensicOperation, setForensicOperation] = useState("");

  // Inverse solver form state
  const [inverseTarget, setInverseTarget] = useState("surface_roughness");
  const [inverseValue, setInverseValue] = useState("");
  const [inverseParams, setInverseParams] = useState<Array<{ key: string; value: string }>>([
    { key: "", value: "" },
  ]);

  // Process generator form state
  const [genFeatures, setGenFeatures] = useState("");
  const [genMaterial, setGenMaterial] = useState("");
  const [genQuantity, setGenQuantity] = useState("");

  // Sustainability form state
  const [susMatl, setSusMatl] = useState("");
  const [susOp, setSusOp] = useState("");
  const [susQty, setSusQty] = useState("");

  const severityColor = (s: string) =>
    s === "critical" || s === "high" ? "red" : s === "medium" ? "yellow" : "slate";

  const ecoColor = (score: number) =>
    score >= 80 ? "green" : score >= 50 ? "yellow" : "red";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Diagnosis & Troubleshooting
        </h1>
      </div>

      <Tabs defaultValue="forensics">
        <TabList>
          <Tab value="forensics">Tool Forensics</Tab>
          <Tab value="inverse">Inverse Solver</Tab>
          <Tab value="genplan">Process Generator</Tab>
          <Tab value="sustainability">Sustainability</Tab>
        </TabList>

        {/* Tool Forensics Tab */}
        <TabPanel value="forensics">
          <Card title="Forensic Analysis">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Analysis Type
                </label>
                <select
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  value={forensicType}
                  onChange={(e) => setForensicType(e.target.value)}
                >
                  <option value="tool_autopsy">Tool Autopsy</option>
                  <option value="chip_analysis">Chip Analysis</option>
                  <option value="surface_defect">Surface Defect</option>
                  <option value="crash">Crash Investigation</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Problem Description
                </label>
                <textarea
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  value={forensicDesc}
                  onChange={(e) => setForensicDesc(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Material (optional)
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="e.g. Ti-6Al-4V"
                    value={forensicMaterial}
                    onChange={(e) => setForensicMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Operation (optional)
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="e.g. roughing"
                    value={forensicOperation}
                    onChange={(e) => setForensicOperation(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  forensic.execute({
                    type: forensicType,
                    description: forensicDesc,
                    material: forensicMaterial || undefined,
                    operation: forensicOperation || undefined,
                  })
                }
                disabled={!forensicDesc || forensic.loading}
              >
                Analyze
              </Button>
            </div>
          </Card>

          {forensic.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {forensic.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{forensic.error}</p>
          )}
          {forensic.data && (
            <div className="mt-4 space-y-4">
              <Card title="Root Cause">
                <p className="text-sm text-slate-700 dark:text-slate-300">{forensic.data.root_cause}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Confidence: {(forensic.data.confidence * 100).toFixed(1)}%
                </p>
              </Card>

              <Card title="Findings">
                <div className="space-y-3">
                  {forensic.data.findings.map((f, i) => (
                    <div key={i} className="rounded border border-slate-200 p-3 dark:border-slate-700">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{f.category}</span>
                        <Badge color={severityColor(f.severity)}>{f.severity}</Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{f.description}</p>
                      <p className="mt-1 text-xs text-slate-500">Evidence: {f.evidence}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Recommendations">
                <ul className="list-inside list-disc space-y-1">
                  {forensic.data.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{r}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </TabPanel>

        {/* Inverse Solver Tab */}
        <TabPanel value="inverse">
          <Card title="Inverse Parameter Solver">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Target Parameter
                  </label>
                  <select
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    value={inverseTarget}
                    onChange={(e) => setInverseTarget(e.target.value)}
                  >
                    <option value="surface_roughness">Surface Roughness (Ra)</option>
                    <option value="tool_life">Tool Life (min)</option>
                    <option value="mrr">Material Removal Rate</option>
                    <option value="cutting_force">Cutting Force (N)</option>
                    <option value="power">Spindle Power (kW)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Target Value
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    type="number"
                    placeholder="e.g. 0.8"
                    value={inverseValue}
                    onChange={(e) => setInverseValue(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Known Parameters
                </label>
                {inverseParams.map((p, i) => (
                  <div key={i} className="mb-2 flex items-center gap-2">
                    <input
                      className="flex-1 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      placeholder="Parameter name"
                      value={p.key}
                      onChange={(e) => {
                        const next = [...inverseParams];
                        next[i] = { ...next[i], key: e.target.value };
                        setInverseParams(next);
                      }}
                    />
                    <input
                      className="w-32 rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                      type="number"
                      placeholder="Value"
                      value={p.value}
                      onChange={(e) => {
                        const next = [...inverseParams];
                        next[i] = { ...next[i], value: e.target.value };
                        setInverseParams(next);
                      }}
                    />
                    <Button
                      onClick={() => setInverseParams(inverseParams.filter((_, j) => j !== i))}
                      disabled={inverseParams.length <= 1}
                    >
                      X
                    </Button>
                  </div>
                ))}
                <Button onClick={() => setInverseParams([...inverseParams, { key: "", value: "" }])}>
                  + Add Parameter
                </Button>
              </div>
              <Button
                onClick={() => {
                  const known: Record<string, number> = {};
                  for (const p of inverseParams) {
                    if (p.key && p.value) known[p.key] = Number(p.value);
                  }
                  inverse.execute({
                    target: inverseTarget,
                    target_value: Number(inverseValue),
                    known_params: known,
                  });
                }}
                disabled={!inverseValue || inverse.loading}
              >
                Solve
              </Button>
            </div>
          </Card>

          {inverse.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {inverse.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{inverse.error}</p>
          )}
          {inverse.data && (
            <Card title="Solution" className="mt-4">
              <div className="mb-3 grid grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-slate-400">Method</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{inverse.data.method}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Residual</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{inverse.data.residual.toExponential(3)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Iterations</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{inverse.data.iterations}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Parameter</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Solved Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(inverse.data.solved_inputs).map(([k, v]) => (
                      <tr key={k} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{k}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Process Generator Tab */}
        <TabPanel value="genplan">
          <Card title="Generative Process Plan">
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                  Features (comma-separated)
                </label>
                <input
                  className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  placeholder="e.g. pocket, bore, face, slot"
                  value={genFeatures}
                  onChange={(e) => setGenFeatures(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Material
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="e.g. 6061-T6 Aluminum"
                    value={genMaterial}
                    onChange={(e) => setGenMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Quantity (optional)
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    type="number"
                    placeholder="e.g. 100"
                    value={genQuantity}
                    onChange={(e) => setGenQuantity(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  genplan.execute({
                    features: genFeatures.split(",").map((f) => f.trim()).filter(Boolean),
                    material: genMaterial,
                    quantity: genQuantity ? Number(genQuantity) : undefined,
                  })
                }
                disabled={!genFeatures || !genMaterial || genplan.loading}
              >
                Generate Plan
              </Button>
            </div>
          </Card>

          {genplan.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {genplan.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{genplan.error}</p>
          )}
          {genplan.data && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card title="Summary">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {genplan.data.total_time_min.toFixed(1)} min
                  </p>
                  <p className="text-xs text-slate-500">
                    {genplan.data.tool_count} tools | {genplan.data.operation_sequence.length} operations
                  </p>
                </Card>
                <Card title="Features">
                  <div className="flex flex-wrap gap-2">
                    {genplan.data.features.map((f) => (
                      <Badge key={f.id} color="blue">{f.type}</Badge>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="Operation Sequence">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">#</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Operation</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Tool</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Strategy</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Time (min)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {genplan.data.operation_sequence.map((op, i) => (
                        <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 text-slate-500">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{op.op}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{op.tool}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{op.strategy}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{op.estimated_time_min.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabPanel>

        {/* Sustainability Tab */}
        <TabPanel value="sustainability">
          <Card title="Sustainability Analysis">
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Material
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="e.g. Steel 4140"
                    value={susMatl}
                    onChange={(e) => setSusMatl(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Operation
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    placeholder="e.g. milling"
                    value={susOp}
                    onChange={(e) => setSusOp(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
                    Quantity
                  </label>
                  <input
                    className="w-full rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                    type="number"
                    placeholder="e.g. 500"
                    value={susQty}
                    onChange={(e) => setSusQty(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={() =>
                  sustainability.execute({
                    material: susMatl,
                    operation: susOp,
                    quantity: Number(susQty),
                  })
                }
                disabled={!susMatl || !susOp || !susQty || sustainability.loading}
              >
                Analyze
              </Button>
            </div>
          </Card>

          {sustainability.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {sustainability.error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{sustainability.error}</p>
          )}
          {sustainability.data && (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card title="Energy">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {sustainability.data.energy_kwh.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500">kWh</p>
                </Card>
                <Card title="Carbon">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {sustainability.data.carbon_kg.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">kg CO2</p>
                </Card>
                <Card title="Coolant">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {sustainability.data.coolant_liters.toFixed(1)}
                  </p>
                  <p className="text-xs text-slate-500">liters</p>
                </Card>
                <Card title="Waste">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {sustainability.data.waste_kg.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-500">kg</p>
                </Card>
                <Card title="Eco Score">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {sustainability.data.eco_score}
                  </p>
                  <Badge color={ecoColor(sustainability.data.eco_score)}>
                    {sustainability.data.eco_score >= 80 ? "Good" : sustainability.data.eco_score >= 50 ? "Fair" : "Poor"}
                  </Badge>
                </Card>
              </div>

              <Card title="Recommendations">
                <ul className="list-inside list-disc space-y-1">
                  {sustainability.data.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300">{r}</li>
                  ))}
                </ul>
              </Card>
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
