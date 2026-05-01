import { useEffect } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import {
  useTelemetryDashboard,
  useTelemetryAnomalies,
  useTelemetryOptimization,
  useTelemetryAcknowledge,
} from "../hooks/useTelemetry";

export default function TelemetryPage() {
  const dashboard = useTelemetryDashboard();
  const anomalies = useTelemetryAnomalies();
  const optimization = useTelemetryOptimization();
  const acknowledge = useTelemetryAcknowledge();

  useEffect(() => {
    dashboard.execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const severityColor = (s: string) =>
    s === "high" ? "red" : s === "medium" ? "yellow" : "slate";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Telemetry Dashboard
        </h1>
        <Button onClick={() => dashboard.execute()}>Refresh</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="anomalies">Anomalies</Tab>
          <Tab value="optimizations">Optimizations</Tab>
        </TabList>

        {/* Overview Tab */}
        <TabPanel value="overview">
          {dashboard.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {dashboard.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{dashboard.error}</p>
          )}
          {dashboard.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card title="Total Requests">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {dashboard.data.total_requests.toLocaleString()}
                  </p>
                </Card>
                <Card title="Avg Latency">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {dashboard.data.avg_latency_ms.toFixed(1)} ms
                  </p>
                </Card>
                <Card title="Error Rate">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {dashboard.data.error_rate_pct.toFixed(2)}%
                  </p>
                  <Badge color={dashboard.data.error_rate_pct < 1 ? "green" : dashboard.data.error_rate_pct < 5 ? "yellow" : "red"}>
                    {dashboard.data.error_rate_pct < 1 ? "Healthy" : dashboard.data.error_rate_pct < 5 ? "Warning" : "Critical"}
                  </Badge>
                </Card>
                <Card title="Uptime">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {dashboard.data.uptime_hours.toFixed(1)} hrs
                  </p>
                </Card>
              </div>

              <Card title="Top Actions" className="mt-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Action</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Count</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Avg (ms)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.data.top_actions.map((a) => (
                        <tr key={a.action} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{a.action}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{a.count.toLocaleString()}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{a.avg_ms.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Hourly Traffic" className="mt-6">
                <div className="flex items-end gap-1" style={{ height: 120 }}>
                  {dashboard.data.hourly_traffic.map((h) => {
                    const max = Math.max(...dashboard.data!.hourly_traffic.map((t) => t.requests), 1);
                    const pct = (h.requests / max) * 100;
                    return (
                      <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-blue-500 dark:bg-blue-400"
                          style={{ height: `${pct}%`, minHeight: 2 }}
                          title={`${h.hour}: ${h.requests}`}
                        />
                        <span className="text-[9px] text-slate-500">{h.hour}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </TabPanel>

        {/* Anomalies Tab */}
        <TabPanel value="anomalies">
          <div className="mb-4">
            <Button onClick={() => anomalies.execute()}>Load Anomalies</Button>
          </div>
          {anomalies.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {anomalies.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{anomalies.error}</p>
          )}
          {anomalies.data && anomalies.data.length === 0 && (
            <p className="text-sm text-slate-500">No anomalies detected.</p>
          )}
          {anomalies.data && anomalies.data.length > 0 && (
            <div className="space-y-3">
              {anomalies.data.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{a.metric}</span>
                        <Badge color={severityColor(a.severity)}>{a.severity}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Expected: {a.expected} | Actual: {a.actual}
                      </p>
                      <p className="text-xs text-slate-400">{a.timestamp}</p>
                    </div>
                    <Button
                      onClick={() => acknowledge.execute({ anomaly_id: a.id })}
                      disabled={acknowledge.loading}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabPanel>

        {/* Optimizations Tab */}
        <TabPanel value="optimizations">
          <div className="mb-4">
            <Button onClick={() => optimization.execute()}>Load Suggestions</Button>
          </div>
          {optimization.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {optimization.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{optimization.error}</p>
          )}
          {optimization.data && optimization.data.length === 0 && (
            <p className="text-sm text-slate-500">No optimization suggestions available.</p>
          )}
          {optimization.data && optimization.data.length > 0 && (
            <Card title="Optimization Suggestions">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Action</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Current (ms)</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Suggestion</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Est. Improvement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {optimization.data.map((o) => (
                      <tr key={o.action} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{o.action}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{o.current_latency_ms.toFixed(1)}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{o.suggested_optimization}</td>
                        <td className="px-3 py-2">
                          <Badge color="green">{o.estimated_improvement_pct}%</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
