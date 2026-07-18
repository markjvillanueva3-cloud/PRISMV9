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

const money = (n: number) => `$${n.toFixed(2)}`;

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

  // The cost basis (per_part_cost) is present ONLY for an authenticated caller; an anonymous caller
  // gets the non-sensitive process metrics with pricing redacted (see api/cost.ts CostEstimate).
  const hasPricing = result != null && typeof result.per_part_cost === "number";

  const handleEstimate = async () => {
    setLoading(true);
    try {
      const res = await costApi.estimate(form);
      setResult(res);
      if (typeof res.per_part_cost === "number") {
        toast(`Estimated: ${money(res.per_part_cost)}/part`, "success");
      } else {
        toast("Process metrics estimated — sign in to view pricing", "info");
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Estimate failed", "error");
    } finally { setLoading(false); }
  };

  const update = (field: keyof CostEstimateRequest, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Kienzle Cost Estimator
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Physics-based machining cost &amp; cycle-time estimate
          </p>
        </div>
        {hasPricing && (
          <Badge color="green">
            {money(result!.per_part_cost as number)}/part
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
          {result && (
            <>
              {/* Cost summary -- authenticated only. */}
              {hasPricing ? (
                <Card title="Cost Summary">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg bg-primary-50 p-4 text-center
                      dark:bg-primary-900/20">
                      <p className="text-xs text-slate-500">Total Cost</p>
                      <p className="text-2xl font-bold text-primary-700
                        dark:text-primary-300">
                        {money(result.total_cost ?? (result.per_part_cost as number) * (result.batch_size ?? 1))}
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-4 text-center
                      dark:bg-green-900/20">
                      <p className="text-xs text-slate-500">Per Part</p>
                      <p className="text-2xl font-bold text-green-700
                        dark:text-green-300">
                        {money(result.per_part_cost as number)}
                      </p>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card title="Pricing">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Pricing is available to signed-in users. The process metrics below are
                    computed from the cutting physics and are shown to everyone.
                  </p>
                </Card>
              )}

              {/* Process metrics -- present for EVERY caller (anon + authed). */}
              <Card title="Process Metrics">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Metric label="Cycle Time" value={result.cycle_time_min} unit="min" />
                  <Metric label="Tool Life" value={result.tool_life_min} unit="min" />
                  <Metric label="Parts / Edge" value={result.parts_per_edge} />
                  <Metric label="Batch Size" value={result.batch_size} unit="pcs" />
                </div>
              </Card>

              {/* Cost breakdown -- authenticated only (engine cost components). */}
              {hasPricing && result.breakdown && Object.keys(result.breakdown).length > 0 && (
                <Card title="Cost Breakdown">
                  <div className="space-y-2">
                    {(() => {
                      const entries = Object.entries(result.breakdown);
                      const total = entries.reduce((s, [, v]) => s + v, 0);
                      return entries.map(([key, value]) => {
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
                              {money(value)}
                            </span>
                            <span className="w-10 text-right text-xs text-slate-400">
                              {pct.toFixed(0)}%
                            </span>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </Card>
              )}
            </>
          )}
          {!result && (
            <Card>
              <p className="text-sm text-slate-500">
                Enter job parameters to estimate manufacturing cost and cycle time with a
                physics-based material, labor, tooling, and machine breakdown.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/** A single labelled metric tile. Renders an em-dash when the engine did not return the value. */
function Metric({ label, value, unit }: { label: string; value?: number; unit?: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/50">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-700 dark:text-slate-200">
        {typeof value === "number"
          ? `${value % 1 === 0 ? value : value.toFixed(1)}${unit ? ` ${unit}` : ""}`
          : "\u2014"}
      </p>
    </div>
  );
}
