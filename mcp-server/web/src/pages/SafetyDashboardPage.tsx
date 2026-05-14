import { useState } from "react";
import { Card, Button, Input, Select, Badge, Spinner } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { safetyApi, type SafetyValidateRequest, type SafetyResult } from "../api/safety";

const COOLANT_OPTIONS = ["flood", "mist", "mql", "dry", "through_spindle"];

export default function SafetyDashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SafetyResult | null>(null);
  const [knowledgeQuery, setKnowledgeQuery] = useState("");
  const [knowledgeResults, setKnowledgeResults] = useState<unknown[] | null>(null);
  const [form, setForm] = useState<SafetyValidateRequest>({
    material: "titanium_6al4v",
    operation: "face_milling",
    speed_rpm: 3000,
    feed_mmrev: 0.1,
    depth_mm: 2,
    coolant: "flood",
  });

  const handleValidate = async () => {
    setLoading(true);
    try {
      const res = await safetyApi.validate(form);
      setResult(res);
      if (res.status === "APPROVED") {
        toast("Parameters APPROVED", "success");
      } else {
        toast("Parameters BLOCKED — review warnings", "error");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Validation failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleKnowledgeSearch = async () => {
    if (!knowledgeQuery.trim()) return;
    try {
      const res = await safetyApi.searchKnowledge({ query: knowledgeQuery.trim() });
      setKnowledgeResults(Array.isArray(res) ? res : [res]);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Search failed", "error");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Safety Dashboard</h1>
        {result && (
          <Badge color={result.status === "APPROVED" ? "green" : "red"}>
            {result.status}
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Validation Panel */}
        <Card title="Parameter Validation">
          <div className="space-y-3">
            <Input
              label="Material"
              value={form.material}
              onChange={(e) => setForm((f) => ({ ...f, material: e.target.value }))}
            />
            <Input
              label="Operation"
              value={form.operation}
              onChange={(e) => setForm((f) => ({ ...f, operation: e.target.value }))}
            />
            <Input
              label="Spindle Speed"
              type="number"
              unit="RPM"
              value={form.speed_rpm ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, speed_rpm: +e.target.value || undefined }))}
            />
            <Input
              label="Feed Rate"
              type="number"
              unit="mm/rev"
              value={form.feed_mmrev ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, feed_mmrev: +e.target.value || undefined }))}
            />
            <Input
              label="Depth of Cut"
              type="number"
              unit="mm"
              value={form.depth_mm ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, depth_mm: +e.target.value || undefined }))}
            />
            <Select
              label="Coolant"
              value={form.coolant ?? "flood"}
              onChange={(e) => setForm((f) => ({ ...f, coolant: e.target.value }))}
              options={COOLANT_OPTIONS.map((c) => ({ value: c, label: c.replace(/_/g, " ") }))}
            />
            <Button onClick={handleValidate} disabled={loading} className="w-full">
              {loading ? <Spinner size="sm" /> : "Validate Safety"}
            </Button>
          </div>
        </Card>

        {/* Results Panel */}
        <div className="flex flex-col gap-4">
          {result && (
            <Card title="Validation Result">
              <div className={`mb-3 rounded-md p-3 text-sm font-medium ${
                result.status === "APPROVED"
                  ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                  : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300"
              }`}>
                Status: {result.status}
              </div>

              {result.warnings.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-slate-500">Warnings</h4>
                  {result.warnings.map((w, i) => (
                    <div key={i} className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs dark:border-yellow-700 dark:bg-yellow-900/20">
                      <span className="font-mono text-yellow-700 dark:text-yellow-400">[{w.code}]</span>{" "}
                      <span className="text-yellow-800 dark:text-yellow-300">{w.message}</span>
                      <Badge color={w.severity === "CRITICAL" ? "red" : "yellow"} >{w.severity}</Badge>
                    </div>
                  ))}
                </div>
              )}

              {result.limits && (
                <pre className="mt-3 max-h-[200px] overflow-auto rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-900">
                  {JSON.stringify(result.limits, null, 2)}
                </pre>
              )}
            </Card>
          )}

          {/* Knowledge Search */}
          <Card title="Safety Knowledge Base">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Search safety tips, warnings, limits..."
                  value={knowledgeQuery}
                  onChange={(e) => setKnowledgeQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleKnowledgeSearch(); }}
                />
              </div>
              <Button variant="secondary" onClick={handleKnowledgeSearch}>Search</Button>
            </div>
            {knowledgeResults && (
              <pre className="mt-3 max-h-[300px] overflow-auto rounded-md bg-slate-50 p-3 text-xs dark:bg-slate-900 dark:text-slate-300">
                {JSON.stringify(knowledgeResults, null, 2)}
              </pre>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
