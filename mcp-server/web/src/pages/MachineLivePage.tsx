import { useEffect, useState } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import {
  useMachineLiveList,
  useMachineLiveStatus,
  useMachineLiveAdaptive,
  useMachineLiveMaintenance,
  useMachineLiveDigitalTwin,
  useMachineLiveAcknowledge,
} from "../hooks/useMachineLive";

export default function MachineLivePage() {
  const machines = useMachineLiveList();
  const status = useMachineLiveStatus();
  const adaptive = useMachineLiveAdaptive();
  const maintenance = useMachineLiveMaintenance();
  const twin = useMachineLiveDigitalTwin();
  const acknowledge = useMachineLiveAcknowledge();

  const [selectedMachine, setSelectedMachine] = useState<string | null>(null);

  useEffect(() => {
    machines.execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const statusColor = (s: string) =>
    s === "running" ? "blue" : s === "idle" ? "green" : s === "alarm" ? "red" : "slate";

  const severityColor = (s: string) =>
    s === "critical" ? "red" : s === "high" ? "red" : s === "medium" ? "yellow" : "slate";

  const overrideColor = (t: string) =>
    t === "chatter" ? "red" : t === "wear" ? "yellow" : t === "thermal" ? "red" : "blue";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Machine Live Dashboard
        </h1>
        <Button onClick={() => machines.execute()}>Refresh</Button>
      </div>

      <Tabs defaultValue="overview">
        <TabList>
          <Tab value="overview">Overview</Tab>
          <Tab value="adaptive">Adaptive Control</Tab>
          <Tab value="maintenance">Predictive Maintenance</Tab>
          <Tab value="twin">Digital Twin</Tab>
        </TabList>

        {/* Overview Tab */}
        <TabPanel value="overview">
          {machines.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {machines.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{machines.error}</p>
          )}
          {machines.data && machines.data.length === 0 && (
            <p className="text-sm text-slate-500">No machines connected.</p>
          )}
          {machines.data && machines.data.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {machines.data.map((m) => (
                <Card key={m.id} title={m.name}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge color={statusColor(m.status)}>{m.status.toUpperCase()}</Badge>
                      <Badge color={m.connected ? "green" : "slate"}>
                        {m.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    {m.current_program && (
                      <p className="text-xs text-slate-500">Program: {m.current_program}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-slate-400">Spindle</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {m.spindle_rpm?.toLocaleString() ?? "---"} RPM
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Feed</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {m.feed_rate?.toLocaleString() ?? "---"} mm/min
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Load</span>
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {m.spindle_load_pct != null ? `${m.spindle_load_pct}%` : "---"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">Uptime: {m.uptime_hours.toFixed(1)} hrs</p>
                    <Button
                      onClick={() => {
                        setSelectedMachine(m.id);
                        status.execute({ machine_id: m.id });
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {status.loading && (
            <div className="flex justify-center py-6">
              <Spinner size="lg" />
            </div>
          )}
          {status.data && (
            <Card title={`Details: ${status.data.name}`} className="mt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <span className="text-xs text-slate-400">Status</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    <Badge color={statusColor(status.data.status)}>{status.data.status.toUpperCase()}</Badge>
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Spindle RPM</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {status.data.spindle_rpm?.toLocaleString() ?? "---"}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Feed Rate</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {status.data.feed_rate?.toLocaleString() ?? "---"} mm/min
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-400">Spindle Load</span>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                    {status.data.spindle_load_pct != null ? `${status.data.spindle_load_pct}%` : "---"}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Adaptive Control Tab */}
        <TabPanel value="adaptive">
          <div className="mb-4 flex items-center gap-3">
            <select
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              value={selectedMachine ?? ""}
              onChange={(e) => setSelectedMachine(e.target.value || null)}
            >
              <option value="">Select Machine</option>
              {machines.data?.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Button
              onClick={() => selectedMachine && adaptive.execute({ machine_id: selectedMachine })}
              disabled={!selectedMachine || adaptive.loading}
            >
              Load Overrides
            </Button>
          </div>
          {adaptive.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {adaptive.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{adaptive.error}</p>
          )}
          {adaptive.data && adaptive.data.length === 0 && (
            <p className="text-sm text-slate-500">No active adaptive overrides.</p>
          )}
          {adaptive.data && adaptive.data.length > 0 && (
            <Card title="Active Overrides">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Type</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Original</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Adjusted</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Reason</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adaptive.data.map((o, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2">
                          <Badge color={overrideColor(o.type)}>{o.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{o.original_value}</td>
                        <td className="px-3 py-2 font-medium text-slate-800 dark:text-slate-100">{o.adjusted_value}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{o.reason}</td>
                        <td className="px-3 py-2 text-xs text-slate-400">{o.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Predictive Maintenance Tab */}
        <TabPanel value="maintenance">
          <div className="mb-4">
            <Button onClick={() => maintenance.execute()}>Load Alerts</Button>
          </div>
          {maintenance.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {maintenance.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{maintenance.error}</p>
          )}
          {maintenance.data && maintenance.data.length === 0 && (
            <p className="text-sm text-slate-500">No maintenance alerts.</p>
          )}
          {maintenance.data && maintenance.data.length > 0 && (
            <div className="space-y-3">
              {maintenance.data.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {a.component}
                        </span>
                        <Badge color={severityColor(a.severity)}>{a.severity}</Badge>
                        {a.acknowledged && <Badge color="slate">Acknowledged</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        Machine: {a.machine_id}
                      </p>
                      {a.predicted_failure_date && (
                        <p className="text-xs text-slate-500">
                          Predicted failure: {a.predicted_failure_date}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                        {a.recommendation}
                      </p>
                    </div>
                    {!a.acknowledged && (
                      <Button
                        onClick={() => acknowledge.execute({ alert_id: a.id })}
                        disabled={acknowledge.loading}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabPanel>

        {/* Digital Twin Tab */}
        <TabPanel value="twin">
          <div className="mb-4 flex items-center gap-3">
            <select
              className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              value={selectedMachine ?? ""}
              onChange={(e) => setSelectedMachine(e.target.value || null)}
            >
              <option value="">Select Machine</option>
              {machines.data?.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Button
              onClick={() => selectedMachine && twin.execute({ machine_id: selectedMachine })}
              disabled={!selectedMachine || twin.loading}
            >
              Load Twin
            </Button>
          </div>
          {twin.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {twin.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{twin.error}</p>
          )}
          {twin.data && (
            <div className="space-y-4">
              <Card title="Spindle">
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <span className="text-xs text-slate-400">RPM</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.spindle.rpm.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Load</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.spindle.load_pct}%
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Temperature</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.spindle.temp_c.toFixed(1)} C
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Vibration</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.spindle.vibration_g.toFixed(3)} g
                    </p>
                  </div>
                </div>
              </Card>

              <Card title="Axes">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Axis</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Position (mm)</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Load (%)</th>
                        <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Temp (C)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(twin.data.axes).map(([axis, val]) => (
                        <tr key={axis} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 font-mono font-medium text-slate-800 dark:text-slate-100">{axis}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{val.position_mm.toFixed(3)}</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{val.load_pct}%</td>
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{val.temp_c.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Coolant System">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <span className="text-xs text-slate-400">Pressure</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.coolant.pressure_bar.toFixed(1)} bar
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Flow</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.coolant.flow_lpm.toFixed(1)} L/min
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Temperature</span>
                    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                      {twin.data.coolant.temp_c.toFixed(1)} C
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
