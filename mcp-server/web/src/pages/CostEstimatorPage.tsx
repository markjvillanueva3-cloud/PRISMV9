import { useState } from "react";
import { Card, Button, Input, Select, Badge, Spinner } from "../components/ui";
import { useToast } from "../components/ui/Toast";
import { costApi, type CostEstimateRequest, type CostEstimate } from "../api/cost";

const MATERIALS = [
  "aluminum_6061", "aluminum_7075", "steel_1018", "steel_4140",
  "stainless_304", "stainless_316", "titanium_6al4v", "inconel_718",
  "cast_iron_gray", "brass_360",
];

const OPERATIONS = [
  "milling", "turning", "drilling", "grinding", "edm", "multi_operation",
];

export default function CostEstimatorPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CostEstimate | null>(null);
  const [form, setForm] = useState<CostEstimateRequest>({
    material: "aluminum_6061",
    operation: "milling",
    quantity: 100,
    setup_time_min: 30,
    cycle_time_min: 5,
    tool_cost: 45,
    machine_rate_per_hour: 85,
  });

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const res = await costApi.estimate(form);
      setResult(res);
      // The cost basis is the shop's internal figure; the route redacts it for unauthenticated callers, so
      // per_part_cost is absent unless signed in. Guard the deref (it was an unconditional .toFixed() crash)
      // and surface the sign-in state instead of a false "Estimate failed" error toast.
      if (typeof res.per_part_cost === "number") {
        toast(`Estimated: $${res.per_part_cost.toFixed(2)}/part`, "success");
      } else {
        toast("Sign in to view shop cost", "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Estimate failed", "error");
    } finally { setLoading(false); }
  };

  // True only when the route returned the real cost basis (authenticated). When false (anon/redacted), the
  // cost cards are hidden behind a sign-in prompt rather than crashing on an undefined .toFixed().
  const hasCost = typeof result?.per_part_cost === "number";

  const update = (field: keyof CostEstimateRequest, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 [font-family:var(--font-display)]">
          Cost Estimator
        </h1>
        {result && hasCost && (
          <Badge color="green">
            ${result.per_part_cost.toFixed(2)}/part
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input */}
        <Card title="Job Parameters" className="lg:col-span-1">
          <div className="space-y-3">
            <Select label="Material" value={form.material}
              onChange={(e) => update("material", e.target.value)}
              options={MATERIALS.map((m) => ({ value: m, label: m.replace(/_/g, " ") }))}
            />
            <Select label="Operation" value={form.operation}
              onChange={(e) => update("operation", e.target.value)}
              options={OPERATIONS.map((o) => ({ value: o, label: o.replace(/_/g, " ") }))}
            />
            <Input label="Quantity" type="number" unit="pcs"
              value={form.quantity}
              onChange={(e) => update("quantity", +e.target.value)} />
            <Input label="Setup Time" type="number" unit="min"
              value={form.setup_time_min ?? ""}
              onChange={(e) => update("setup_time_min", +e.target.value)} />
            <Input label="Cycle Time" type="number" unit="min"
              value={form.cycle_time_min ?? ""}
              onChange={(e) => update("cycle_time_min", +e.target.value)} />
            <Input label="Tool Cost" type="number" unit="$"
              value={form.tool_cost ?? ""}
              onChange={(e) => update("tool_cost", +e.target.value)} />
            <Input label="Machine Rate" type="number" unit="$/hr"
              value={form.machine_rate_per_hour ?? ""}
              onChange={(e) => update("machine_rate_per_hour", +e.target.value)} />
            <Button onClick={handleEstimate} disabled={loading} className="w-full">
              {loading ? <Spinner size="sm" /> : "Estimate Cost"}
            </Button>
          </div>
        </Card>

        {/* Results */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {result && hasCost && (
            <>
              <Card title="Cost Summary">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-primary-50 p-4 text-center
                    dark:bg-primary-900/20">
                    <p className="text-xs text-slate-500">Total Cost</p>
                    <p className="text-2xl font-bold text-primary-700
                      dark:text-primary-300">
                      ${result.total_cost.toFixed(2)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-green-50 p-4 text-center
                    dark:bg-green-900/20">
                    <p className="text-xs text-slate-500">Per Part</p>
                    <p className="text-2xl font-bold text-green-700
                      dark:text-green-300">
                      ${result.per_part_cost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </Card>
              <Card title="Cost Breakdown">
                <div className="space-y-2">
                  {Object.entries(result.breakdown).map(([key, value]) => {
                    const total = Object.values(result.breakdown).reduce(
                      (s, v) => s + v, 0
                    );
                    const pct = total > 0 ? (value / total) * 100 : 0;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="w-20 text-xs font-medium capitalize
                          text-slate-600 dark:text-slate-400">
                          {key}
                        </span>
                        <div className="flex-1 rounded-full bg-slate-100
                          dark:bg-slate-700 h-2.5">
                          <div
                            className="h-2.5 rounded-full bg-primary-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-16 text-right text-xs text-slate-600
                          dark:text-slate-400">
                          ${value.toFixed(2)}
                        </span>
                        <span className="w-10 text-right text-xs text-slate-400">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
          {result && !hasCost && (
            <Card title="Cost Hidden">
              <p className="text-sm text-slate-500">
                The shop cost basis is available to signed-in users only.
                Sign in to view the per-part cost, total, and breakdown for
                this job.
              </p>
            </Card>
          )}
          {!result && (
            <Card>
              <p className="text-sm text-slate-500">
                Enter job parameters to estimate manufacturing cost with
                material, labor, tooling, and overhead breakdown.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
