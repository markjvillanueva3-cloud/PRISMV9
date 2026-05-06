/**
 * CAM AI Health Dashboard (U-CAM123).
 *
 * Operator-facing surface for the CAMModelServingEngine (U-CAM122).
 * Renders inference latency, error rate, drift, and resource utilization
 * for every registered CAM AI model, plus active routing policies and
 * pending operator confirmations from canary promotion / rollback paths.
 *
 * Tabs:
 *   - Overview      — fleet summary cards (active models, p95, error rate)
 *   - Models        — registry table with status FSM badges
 *   - Routing       — per (cam_system, task) policy
 *   - Confirmations — pending operator approvals (lifecycle FSM)
 *   - Alerts        — threshold definitions + live alert classifications
 *
 * Lifecycle-mutating actions (promote / rollback / retire) are
 * intentionally excluded; the dashboard reads + observes only.
 * Promotion runs through the operator runbook in k8s/model-serving/README.md.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Button, Badge, Spinner } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import {
  camServeApi,
  type CamServeHealth,
  type CamServeModel,
  type CamServeRoutingPolicy,
  type CamServePendingConfirmation,
  type ModelStatus,
} from "../api/camServe";
import {
  CAM_AI_ALERT_THRESHOLDS,
  classifyFleet,
  type AlertInstance,
  type AlertSeverity,
} from "../data/camAiAlerts";

const STATUS_BADGE: Record<ModelStatus, "green" | "blue" | "yellow" | "slate" | "red"> = {
  pending: "slate",
  shadow: "blue",
  canary: "yellow",
  active: "green",
  retired: "slate",
  rollback_pending: "red",
};

const SEVERITY_BADGE: Record<AlertSeverity, "red" | "yellow" | "slate"> = {
  critical: "red",
  warning: "yellow",
  info: "slate",
};

interface FleetSummary {
  total: number;
  active: number;
  canary: number;
  shadow: number;
  retired: number;
  avg_p95_ms: number;
  worst_p95_ms: number;
  avg_error_rate: number;
  worst_error_rate: number;
  total_requests: number;
  alert_count_critical: number;
  alert_count_warning: number;
}

function summarize(models: CamServeModel[], health: CamServeHealth[], alerts: AlertInstance[]): FleetSummary {
  const byStatus: Record<string, number> = {};
  for (const m of models) byStatus[m.status] = (byStatus[m.status] ?? 0) + 1;

  const p95s = health.map((h) => Number(h.p95_latency_ms)).filter(Number.isFinite);
  const errs = health.map((h) => Number(h.error_rate)).filter(Number.isFinite);
  const reqs = health.map((h) => Number(h.request_count) || 0);

  return {
    total: models.length,
    active: byStatus.active ?? 0,
    canary: byStatus.canary ?? 0,
    shadow: byStatus.shadow ?? 0,
    retired: byStatus.retired ?? 0,
    avg_p95_ms: p95s.length ? p95s.reduce((a, b) => a + b, 0) / p95s.length : 0,
    worst_p95_ms: p95s.length ? Math.max(...p95s) : 0,
    avg_error_rate: errs.length ? errs.reduce((a, b) => a + b, 0) / errs.length : 0,
    worst_error_rate: errs.length ? Math.max(...errs) : 0,
    total_requests: reqs.reduce((a, b) => a + b, 0),
    alert_count_critical: alerts.filter((a) => a.severity === "critical").length,
    alert_count_warning: alerts.filter((a) => a.severity === "warning").length,
  };
}

export function CamAiDashboardPage() {
  const [models, setModels] = useState<CamServeModel[] | null>(null);
  const [health, setHealth] = useState<CamServeHealth[] | null>(null);
  const [policies, setPolicies] = useState<CamServeRoutingPolicy[] | null>(null);
  const [confirmations, setConfirmations] = useState<CamServePendingConfirmation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, h, p, c] = await Promise.all([
        camServeApi.listModels(),
        camServeApi.listHealth(),
        camServeApi.listRoutingPolicies(),
        camServeApi.listPendingConfirmations(),
      ]);
      setModels(m.models);
      setHealth(h.health);
      setPolicies(p.policies);
      setConfirmations(c.confirmations);
      setLastRefreshAt(new Date().toISOString());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load CAM AI health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const alerts = useMemo<AlertInstance[]>(
    () => (health ? classifyFleet(health) : []),
    [health],
  );
  const summary = useMemo<FleetSummary | null>(
    () => (models && health ? summarize(models, health, alerts) : null),
    [models, health, alerts],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">CAM AI Health Dashboard</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Production model serving · CAMModelServingEngine · U-CAM122
            {lastRefreshAt && ` · refreshed ${new Date(lastRefreshAt).toLocaleTimeString()}`}
          </p>
        </div>
        <Button onClick={() => { void refresh(); }} disabled={loading}>
          {loading ? <Spinner size="sm" /> : "Refresh"}
        </Button>
      </div>

      {error && (
        <Card>
          <p className="text-sm text-red-600 dark:text-red-400" data-testid="dashboard-error">
            {error}
          </p>
        </Card>
      )}

      {loading && !models && (
        <div className="flex justify-center py-12" data-testid="dashboard-loading">
          <Spinner size="lg" />
        </div>
      )}

      {summary && (
        <Tabs defaultValue="overview">
          <TabList>
            <Tab value="overview">Overview</Tab>
            <Tab value="models">Models</Tab>
            <Tab value="routing">Routing</Tab>
            <Tab value="confirmations">Confirmations ({confirmations?.length ?? 0})</Tab>
            <Tab value="alerts">Alerts ({summary.alert_count_critical + summary.alert_count_warning})</Tab>
          </TabList>

          <TabPanel value="overview">
            <OverviewPanel summary={summary} alerts={alerts} />
          </TabPanel>

          <TabPanel value="models">
            <ModelsPanel models={models ?? []} health={health ?? []} />
          </TabPanel>

          <TabPanel value="routing">
            <RoutingPanel policies={policies ?? []} />
          </TabPanel>

          <TabPanel value="confirmations">
            <ConfirmationsPanel confirmations={confirmations ?? []} />
          </TabPanel>

          <TabPanel value="alerts">
            <AlertsPanel alerts={alerts} />
          </TabPanel>
        </Tabs>
      )}
    </div>
  );
}

// Default export for App.tsx lazy import compatibility.
export default CamAiDashboardPage;

// ─── Sub-panels ──────────────────────────────────────────────────

function OverviewPanel({ summary, alerts }: { summary: FleetSummary; alerts: AlertInstance[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Models">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.total}</p>
          <p className="text-xs text-slate-500">
            {summary.active} active · {summary.canary} canary · {summary.shadow} shadow · {summary.retired} retired
          </p>
        </Card>
        <Card title="p95 Latency">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {summary.avg_p95_ms.toFixed(1)} ms
          </p>
          <p className="text-xs text-slate-500">worst {summary.worst_p95_ms.toFixed(1)} ms</p>
        </Card>
        <Card title="Error Rate">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {(summary.avg_error_rate * 100).toFixed(2)}%
          </p>
          <Badge color={summary.worst_error_rate < 0.05 ? "green" : summary.worst_error_rate < 0.10 ? "yellow" : "red"}>
            worst {(summary.worst_error_rate * 100).toFixed(2)}%
          </Badge>
        </Card>
        <Card title="Total Requests">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {summary.total_requests.toLocaleString()}
          </p>
          <p className="text-xs text-slate-500">since last clear</p>
        </Card>
      </div>

      <Card title="Active Alerts">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">All thresholds nominal.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.slice(0, 8).map((a) => (
              <li key={`${a.threshold_id}::${a.model_id}`} className="flex items-start gap-2">
                <Badge color={SEVERITY_BADGE[a.severity]}>{a.severity}</Badge>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{a.model_id}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{a.message}</span>
              </li>
            ))}
            {alerts.length > 8 && (
              <li className="text-xs text-slate-500">…and {alerts.length - 8} more — see Alerts tab</li>
            )}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ModelsPanel({ models, health }: { models: CamServeModel[]; health: CamServeHealth[] }) {
  const healthById = useMemo(() => {
    const m = new Map<string, CamServeHealth>();
    for (const h of health) m.set(h.model_id, h);
    return m;
  }, [health]);

  if (models.length === 0) {
    return <Card><p className="text-sm text-slate-500">No models registered.</p></Card>;
  }

  return (
    <Card title="Model Registry">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Model</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Status</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Task</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">CAM</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">p95 (ms)</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Error %</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Requests</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => {
              const h = healthById.get(m.id);
              return (
                <tr key={m.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{m.id}</td>
                  <td className="px-3 py-2"><Badge color={STATUS_BADGE[m.status]}>{m.status}</Badge></td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{m.task ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{m.cam_system ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {h && Number.isFinite(h.p95_latency_ms) ? h.p95_latency_ms.toFixed(1) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {h && Number.isFinite(h.error_rate) ? (h.error_rate * 100).toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                    {h ? h.request_count.toLocaleString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RoutingPanel({ policies }: { policies: CamServeRoutingPolicy[] }) {
  if (policies.length === 0) {
    return <Card><p className="text-sm text-slate-500">No routing policies configured.</p></Card>;
  }
  return (
    <Card title="Routing Policies">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">CAM System</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Task</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Kind</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Buckets</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">ε</th>
              <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Min Samples</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((p, idx) => (
              <tr key={`${p.cam_system}::${p.task}::${idx}`} className="border-b border-slate-100 dark:border-slate-800">
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.cam_system}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.task}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{p.kind}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.bucket_count ?? "—"}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.epsilon ?? "—"}</td>
                <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{p.min_samples_for_promotion ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ConfirmationsPanel({ confirmations }: { confirmations: CamServePendingConfirmation[] }) {
  if (confirmations.length === 0) {
    return <Card><p className="text-sm text-slate-500">No pending confirmations.</p></Card>;
  }
  return (
    <Card title="Pending Operator Confirmations">
      <ul className="space-y-3">
        {confirmations.map((c) => (
          <li key={c.id} className="flex items-start justify-between gap-3 border-b border-slate-100 pb-2 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge color={c.requires_human_approval ? "yellow" : "slate"}>
                  {c.requires_human_approval ? "needs approval" : "queued"}
                </Badge>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{c.action}</span>
                <span className="font-mono text-xs text-slate-500">{c.model_id}</span>
              </div>
              {c.reason && (
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{c.reason}</p>
              )}
            </div>
            <div className="text-right">
              <Badge color={c.applied ? "green" : "slate"}>{c.applied ? "applied" : "pending"}</Badge>
              {c.created_at && <p className="mt-1 text-[10px] text-slate-500">{c.created_at}</p>}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AlertsPanel({ alerts }: { alerts: AlertInstance[] }) {
  return (
    <div className="flex flex-col gap-6">
      <Card title="Threshold Definitions">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Metric</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Direction</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Warn</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Critical</th>
                <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Description</th>
              </tr>
            </thead>
            <tbody>
              {CAM_AI_ALERT_THRESHOLDS.map((t) => (
                <tr key={t.id} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.metric}{t.unit ? ` (${t.unit})` : ""}</td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{t.direction}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.warn}</td>
                  <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{t.crit}</td>
                  <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Live Alerts">
        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">All thresholds nominal.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li
                key={`${a.threshold_id}::${a.model_id}`}
                className="flex items-start gap-2 border-b border-slate-100 pb-2 dark:border-slate-800"
                data-testid={`alert-${a.threshold_id}-${a.model_id}`}
              >
                <Badge color={SEVERITY_BADGE[a.severity]}>{a.severity}</Badge>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{a.model_id}</span>
                <span className="text-xs text-slate-600 dark:text-slate-400">{a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
