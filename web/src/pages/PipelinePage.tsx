import { useState } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { pipelineApi } from "../api/pipeline";
import type {
  PipelineInput,
  PipelineResult,
  PipelineFeature,
  OperationResult,
  ToolAssignment,
  MissingTool,
  ROISuggestion,
} from "../types/pipeline";

const MACHINES = [
  "Haas VF-2", "Haas VF-4", "Haas UMC-750",
  "DMG Mori DMU 50", "DMG Mori DMU 80", "DMG Mori NLX 2500",
  "Mazak Variaxis i-300", "Mazak Quick Turn 250",
  "Okuma MB-5000H", "Okuma GENOS M560-V",
  "Fanuc Robodrill", "Brother Speedio",
  "Doosan DNM 5700", "Hurco VMX42i",
  "Makino a51nx", "Matsuura MX-520",
];

const MATERIALS = [
  "aluminum_6061", "aluminum_7075", "steel_1018", "steel_4140", "steel_4340",
  "stainless_304", "stainless_316", "titanium_6al4v", "inconel_718",
  "cast_iron_gray", "brass_360", "copper_110", "delrin", "nylon_6",
];

const OPTIMIZE_OPTIONS: { value: PipelineInput["optimize_for"]; label: string }[] = [
  { value: "balanced", label: "Balanced" },
  { value: "productivity", label: "Productivity" },
  { value: "tool_life", label: "Tool Life" },
  { value: "cost", label: "Lowest Cost" },
  { value: "quality", label: "Best Quality" },
];

const STEP_LABELS = [
  "Upload / Describe",
  "Review Features",
  "Tool Assignments",
  "Operation Sequence",
  "G-Code Preview",
  "Setup Sheet + Quote",
  "ROI Suggestions",
];

function confidenceColor(c: number): "green" | "yellow" | "red" {
  if (c >= 0.8) return "green";
  if (c >= 0.5) return "yellow";
  return "red";
}

function priorityColor(p: string): "green" | "yellow" | "red" | "blue" {
  if (p === "high" || p === "critical") return "red";
  if (p === "medium") return "yellow";
  return "green";
}

function statusColor(s: string): "green" | "yellow" | "red" | "slate" {
  if (s === "success") return "green";
  if (s === "partial") return "yellow";
  if (s === "failed") return "red";
  return "slate";
}

export default function PipelinePage() {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PipelineResult | null>(null);

  const [form, setForm] = useState<PipelineInput>({
    print_description: "",
    material: "aluminum_6061",
    machine_name: "Haas VF-2",
    quantity: 1,
    optimize_for: "balanced",
  });

  // Editable features (seeded from result, user can add/remove)
  const [editedFeatures, setEditedFeatures] = useState<PipelineFeature[]>([]);
  const [newFeatureType, setNewFeatureType] = useState("hole");
  const [newFeatureDim, setNewFeatureDim] = useState("");

  const handleRunPipeline = async () => {
    if (!form.print_description?.trim()) {
      toast("Please enter a part description", "error");
      return;
    }
    setLoading(true);
    try {
      const input: PipelineInput = { ...form, features: editedFeatures.length > 0 ? editedFeatures : undefined };
      const res = await pipelineApi.fullPipeline(input) as unknown as { result: PipelineResult };
      const data = res.result ?? (res as unknown as PipelineResult);
      setResult(data);
      if (data.operations) {
        setEditedFeatures(data.stage_results ? [] : []);
      }
      toast("Pipeline analysis complete", "success");
      setStep(1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Pipeline failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeature = () => {
    if (!newFeatureDim.trim()) return;
    const dims: Record<string, number> = {};
    newFeatureDim.split(",").forEach((pair) => {
      const [k, v] = pair.split("=");
      if (k && v) dims[k.trim()] = parseFloat(v.trim());
    });
    const feat: PipelineFeature = {
      id: `user-${Date.now()}`,
      type: newFeatureType,
      dimensions: dims,
      count: 1,
    };
    setEditedFeatures((prev) => [...prev, feat]);
    setNewFeatureDim("");
  };

  const handleRemoveFeature = (id: string) => {
    setEditedFeatures((prev) => prev.filter((f) => f.id !== id));
  };

  const canGoNext = step < 6;
  const canGoBack = step > 0;
  const needsResult = step > 0 && !result;

  // --- Step renderers ---

  const renderStepIndicator = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Step {step + 1} of 7
        </span>
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {STEP_LABELS[step]}
        </span>
      </div>
      <div className="flex gap-1">
        {STEP_LABELS.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors ${
              i <= step
                ? "bg-blue-500"
                : "bg-slate-200 dark:bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );

  const renderStep0 = () => (
    <div className="space-y-6">
      <Card title="Part Description">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Describe Your Part (natural language)
            </label>
            <textarea
              className="w-full rounded-md border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              rows={4}
              placeholder="e.g. 100x80x10mm aluminum plate with 4x 6.35mm through holes in corners and a 50x30x5mm pocket in center"
              value={form.print_description ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, print_description: e.target.value }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Material</label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={form.material}
                onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
              >
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>{m.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Machine</label>
              <select
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={form.machine_name}
                onChange={(e) => setForm((f) => ({ ...f, machine_name: e.target.value }))}
              >
                {MACHINES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={form.quantity ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Math.max(1, +e.target.value || 1) }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Optimize For</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {OPTIMIZE_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
                    <input
                      type="radio"
                      name="optimize_for"
                      value={opt.value}
                      checked={form.optimize_for === opt.value}
                      onChange={() => setForm((f) => ({ ...f, optimize_for: opt.value }))}
                      className="accent-blue-500"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleRunPipeline} disabled={loading} className="w-full">
            {loading ? <><Spinner size="sm" /> Analyzing...</> : "Analyze & Generate Program"}
          </Button>
        </div>
      </Card>
    </div>
  );

  const renderStep1 = () => {
    if (!result) return null;
    const features: PipelineFeature[] = editedFeatures.length > 0
      ? editedFeatures
      : (result as unknown as { features?: PipelineFeature[] }).features ?? [];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            Features Extracted: {result.features_extracted}
          </h2>
          <Badge color={confidenceColor(result.pipeline_confidence)}>
            {Math.round(result.pipeline_confidence * 100)}% confidence
          </Badge>
        </div>

        {result.stage_results?.map((sr) => (
          <div key={sr.stage} className="flex items-center gap-2 text-xs text-slate-500">
            <Badge color={statusColor(sr.status)}>{sr.status}</Badge>
            <span>{sr.stage}</span>
            {sr.details && <span className="text-slate-400">- {sr.details}</span>}
          </div>
        ))}

        <div className="grid gap-3 sm:grid-cols-2">
          {features.map((f) => (
            <Card key={f.id} title={f.type.replace(/_/g, " ")}>
              <div className="space-y-1">
                <Badge color="blue">{f.type}</Badge>
                {f.count && f.count > 1 && <Badge color="slate">x{f.count}</Badge>}
                <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {Object.entries(f.dimensions).map(([k, v]) => (
                    <span key={k} className="mr-2">{k}: {v}mm</span>
                  ))}
                </div>
                {f.tolerance_mm != null && (
                  <div className="text-xs text-slate-500">Tolerance: {"\u00B1"}{f.tolerance_mm}mm</div>
                )}
                <button
                  className="mt-1 text-xs text-red-500 hover:text-red-700"
                  onClick={() => handleRemoveFeature(f.id)}
                >
                  Remove
                </button>
              </div>
            </Card>
          ))}
        </div>

        <Card title="Add Feature Manually">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Type</label>
              <select
                className="rounded-md border border-slate-300 bg-white p-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={newFeatureType}
                onChange={(e) => setNewFeatureType(e.target.value)}
              >
                {["hole", "pocket", "slot", "chamfer", "fillet", "thread", "bore", "counterbore", "countersink", "face"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                Dimensions (e.g. diameter=6.35, depth=10)
              </label>
              <input
                className="w-full rounded-md border border-slate-300 bg-white p-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                value={newFeatureDim}
                onChange={(e) => setNewFeatureDim(e.target.value)}
                placeholder="diameter=6.35, depth=10"
              />
            </div>
            <Button variant="secondary" onClick={handleAddFeature}>Add</Button>
          </div>
        </Card>
      </div>
    );
  };

  const renderStep2 = () => {
    if (!result) return null;
    const assignments: ToolAssignment[] = result.tool_assignments ?? [];
    const missing: MissingTool[] = result.missing_tools ?? [];
    const coverage = result.inventory_coverage_pct ?? 0;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Tool Assignments</h2>
          <Badge color={coverage >= 80 ? "green" : coverage >= 50 ? "yellow" : "red"}>
            {coverage}% coverage
          </Badge>
        </div>

        {/* Coverage bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all"
            style={{ width: `${Math.min(100, coverage)}%` }}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-slate-500 dark:text-slate-400 border-b dark:border-slate-700">
              <tr>
                <th className="py-2 pr-3">Feature</th>
                <th className="py-2 pr-3">Tool</th>
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Condition</th>
                <th className="py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a, i) => (
                <tr key={i} className="border-b dark:border-slate-700">
                  <td className="py-2 pr-3 font-medium text-slate-800 dark:text-slate-200">{a.feature_id}</td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">{a.tool_description}</td>
                  <td className="py-2 pr-3">
                    <Badge color={a.from_inventory ? "green" : "red"}>
                      {a.from_inventory ? "IN STOCK" : "NEED TO BUY"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                    {Math.round(a.condition_factor * 100)}%
                  </td>
                  <td className="py-2 text-slate-500">{a.tool_id ?? "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {missing.length > 0 && (
          <Card title={`${missing.length} Missing Tools`}>
            <div className="space-y-2">
              {missing.map((m, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{m.type}</span>
                    <span className="text-slate-500 ml-2">{m.diameter_mm}mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge color={priorityColor(m.priority)}>{m.priority}</Badge>
                    <span className="text-slate-600 dark:text-slate-400">${m.estimated_cost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!result) return null;
    const ops: OperationResult[] = result.operations ?? [];
    const cycleTime = result.cycle_time_min ?? 0;
    const toolChanges = result.total_tool_changes ?? 0;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Operation Sequence</h2>
          <div className="flex gap-2">
            <Badge color="blue">{ops.length} operations</Badge>
            <Badge color="slate">{toolChanges} tool changes</Badge>
          </div>
        </div>

        <div className="space-y-2">
          {ops.map((op) => (
            <Card key={op.sequence}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-bold">
                    {op.sequence}
                  </span>
                  <div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">
                      {op.type.replace(/_/g, " ")}
                    </div>
                    <div className="text-xs text-slate-500">{op.tool}</div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-slate-700 dark:text-slate-300">
                    {op.rpm} RPM | {op.feed_mmmin} mm/min
                  </div>
                  <div className="text-xs text-slate-500">
                    Depth: {op.depth_mm}mm | {op.estimated_time_min.toFixed(1)} min
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-end">
          <Card>
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {cycleTime.toFixed(1)} min
              </div>
              <div className="text-xs text-slate-500">Total Cycle Time</div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderStep4 = () => {
    if (!result) return null;
    const gcode = result.gcode_program ?? "";
    const lineCount = gcode.split("\n").length;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">G-Code Preview</h2>
          <div className="flex gap-2">
            <Badge color="blue">{lineCount} lines</Badge>
            <Badge color="green">{result.playbook_rules_applied} playbook rules</Badge>
            <Badge color="green">{result.tribal_tips_applied} tribal tips</Badge>
          </div>
        </div>

        <div className="rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden">
          <pre className="max-h-[400px] overflow-auto bg-slate-50 dark:bg-slate-900 p-4 text-xs font-mono text-slate-700 dark:text-slate-300 leading-relaxed">
            {gcode || "(No G-code generated)"}
          </pre>
        </div>

        {result.warnings.length > 0 && (
          <div className="space-y-2">
            {result.warnings.map((w, i) => (
              <div key={i} className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-700 p-3 text-sm text-yellow-800 dark:text-yellow-300">
                {w}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderStep5 = () => {
    if (!result) return null;
    const ss = result.setup_sheet;
    const ce = result.cost_estimate;
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card title="Setup Sheet">
            <div className="space-y-2 text-sm">
              {ss && (
                <>
                  <Row label="Part Name" value={ss.part_name} />
                  <Row label="Material" value={ss.material} />
                  <Row label="Machine" value={ss.machine} />
                  <Row label="Workholding" value={ss.workholding} />
                  <Row label="Tools Required" value={String(ss.tools_required)} />
                  <Row label="Operations" value={String(ss.operations)} />
                  <Row label="Est. Cycle Time" value={`${ss.estimated_cycle_time_min.toFixed(1)} min`} />
                </>
              )}
            </div>
          </Card>

          <Card title="Cost Breakdown">
            {ce && (
              <div className="space-y-3">
                <div className="space-y-2 text-sm">
                  <Row label="Material" value={`${ce.currency} ${ce.material_cost.toFixed(2)}`} />
                  <Row label="Machining" value={`${ce.currency} ${ce.machining_cost.toFixed(2)}`} />
                  <Row label="Tooling / Part" value={`${ce.currency} ${ce.tool_cost_per_part.toFixed(2)}`} />
                  <Row label="Setup" value={`${ce.currency} ${ce.setup_cost.toFixed(2)}`} />
                </div>
                <div className="border-t dark:border-slate-700 pt-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {ce.currency} {ce.total_per_part.toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">Total Per Part</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    );
  };

  const renderStep6 = () => {
    if (!result) return null;
    const suggestions: ROISuggestion[] = result.roi_suggestions ?? [];
    const quickWins = suggestions.filter((s) => s.payback_parts < 500);
    const totalInvestment = suggestions.reduce((sum, s) => sum + s.cost_usd, 0);
    const totalSavingsPerPart = suggestions.reduce((sum, s) => sum + s.savings_per_part, 0);
    const annualParts = (form.quantity ?? 1) * 250; // assume 250 working days
    const totalAnnualSavings = totalSavingsPerPart * annualParts;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">ROI Suggestions</h2>
          <Badge color="blue">{suggestions.length} suggestions</Badge>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                ${totalInvestment.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500">Total Investment</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${totalAnnualSavings.toFixed(0)}
              </div>
              <div className="text-xs text-slate-500">Est. Annual Savings</div>
            </div>
          </Card>
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {totalAnnualSavings > 0 ? (totalInvestment / totalAnnualSavings * 12).toFixed(1) : "N/A"} mo
              </div>
              <div className="text-xs text-slate-500">Payback Period</div>
            </div>
          </Card>
        </div>

        {quickWins.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-400 mt-4">
              Quick Wins (payback {"<"} 500 parts)
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickWins.map((s, i) => (
                <ROICard key={i} suggestion={s} />
              ))}
            </div>
          </>
        )}

        {suggestions.filter((s) => s.payback_parts >= 500).length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-4">
              Longer-Term Improvements
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.filter((s) => s.payback_parts >= 500).map((s, i) => (
                <ROICard key={i} suggestion={s} />
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Print-to-Program Pipeline
        </h1>
        <Badge color="blue">Crown Jewel</Badge>
      </div>

      {renderStepIndicator()}

      {needsResult ? (
        <Card>
          <p className="text-sm text-slate-500">
            Run the pipeline from Step 1 first to see results here.
          </p>
          <Button variant="secondary" className="mt-3" onClick={() => setStep(0)}>
            Back to Step 1
          </Button>
        </Card>
      ) : (
        steps[step]()
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2 border-t dark:border-slate-700">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => s - 1)}
          disabled={!canGoBack}
        >
          Back
        </Button>
        <span className="text-xs text-slate-400">
          {step + 1} / {STEP_LABELS.length}
        </span>
        <Button
          onClick={() => setStep((s) => s + 1)}
          disabled={!canGoNext || needsResult}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/** Helper row component for key-value display */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

/** ROI suggestion card */
function ROICard({ suggestion: s }: { suggestion: ROISuggestion }) {
  return (
    <Card>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{s.item}</span>
          <Badge color={priorityColor(s.priority)}>{s.priority}</Badge>
        </div>
        <div className="text-xs text-slate-500">{s.category}</div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs mt-2">
          <div>
            <div className="font-semibold text-slate-700 dark:text-slate-300">${s.cost_usd.toFixed(0)}</div>
            <div className="text-slate-400">Cost</div>
          </div>
          <div>
            <div className="font-semibold text-green-600 dark:text-green-400">${s.savings_per_part.toFixed(2)}</div>
            <div className="text-slate-400">Save/Part</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">{s.payback_parts}</div>
            <div className="text-slate-400">Payback Parts</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
