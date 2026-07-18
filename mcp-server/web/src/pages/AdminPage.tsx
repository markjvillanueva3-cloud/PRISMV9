import { useEffect } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import EntitlementsPanel from "../components/admin/EntitlementsPanel";
import {
  useAdminStatus,
  useAdminUsers,
  useAdminCacheStats,
  useAdminConfig,
  useAdminUpdateConfig,
  useAdminPurgeCache,
} from "../hooks/useAdmin";

export default function AdminPage() {
  const status = useAdminStatus();
  const users = useAdminUsers();
  const cache = useAdminCacheStats();
  const config = useAdminConfig();
  const updateConfig = useAdminUpdateConfig();
  const purgeCache = useAdminPurgeCache();

  useEffect(() => {
    status.execute();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          System Administration
        </h1>
        <Button onClick={() => status.execute()}>Refresh</Button>
      </div>

      <Tabs defaultValue="status">
        <TabList>
          <Tab value="status">Status</Tab>
          <Tab value="users">Users</Tab>
          <Tab value="entitlements">Entitlements</Tab>
          <Tab value="cache">Cache</Tab>
          <Tab value="config">Config</Tab>
        </TabList>

        {/* Status Tab */}
        <TabPanel value="status">
          {status.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {status.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{status.error}</p>
          )}
          {status.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Version">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {status.data.version}
                </p>
                <Badge color={status.data.build_status === "pass" ? "green" : "red"}>
                  Build: {status.data.build_status}
                </Badge>
              </Card>
              <Card title="Uptime">
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                  {formatUptime(status.data.uptime_seconds)}
                </p>
              </Card>
              <Card title="Resources">
                <div className="space-y-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Memory: <span className="font-medium">{status.data.memory_usage_mb.toFixed(0)} MB</span>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    CPU: <span className="font-medium">{status.data.cpu_usage_pct.toFixed(1)}%</span>
                  </p>
                  <Badge color={status.data.cpu_usage_pct < 70 ? "green" : status.data.cpu_usage_pct < 90 ? "yellow" : "red"}>
                    {status.data.cpu_usage_pct < 70 ? "Normal" : status.data.cpu_usage_pct < 90 ? "Elevated" : "Critical"}
                  </Badge>
                </div>
              </Card>
              <Card title="System Counts">
                <div className="space-y-1">
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Engines: <span className="font-medium">{status.data.engine_count}</span>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Dispatchers: <span className="font-medium">{status.data.dispatcher_count}</span>
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    Actions: <span className="font-medium">{status.data.action_count.toLocaleString()}</span>
                  </p>
                </div>
              </Card>
            </div>
          )}
        </TabPanel>

        {/* Users Tab */}
        <TabPanel value="users">
          <div className="mb-4">
            <Button onClick={() => users.execute()}>Load Users</Button>
          </div>
          {users.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {users.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{users.error}</p>
          )}
          {users.data && (
            <Card title="User Management">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Username</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Email</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Role</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Created</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.data.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-300">{u.username}</td>
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">{u.email}</td>
                        <td className="px-3 py-2">
                          <Badge color={u.role === "admin" ? "blue" : "slate"}>{u.role}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{u.created_at}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{u.last_login}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Entitlements Tab (Q6 -- per-seat entitlement admin) */}
        <TabPanel value="entitlements">
          <EntitlementsPanel />
        </TabPanel>

        {/* Cache Tab */}
        <TabPanel value="cache">
          <div className="mb-4 flex gap-2">
            <Button onClick={() => cache.execute()}>Load Cache Stats</Button>
            <Button
              onClick={() => {
                purgeCache.execute({} as never);
                setTimeout(() => cache.execute(), 500);
              }}
              disabled={purgeCache.loading}
            >
              {purgeCache.loading ? <Spinner size="sm" /> : "Purge Cache"}
            </Button>
          </div>
          {cache.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {cache.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{cache.error}</p>
          )}
          {cache.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card title="Total Entries">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {cache.data.total_entries.toLocaleString()}
                </p>
              </Card>
              <Card title="Hit Rate">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {cache.data.hit_rate_pct.toFixed(1)}%
                </p>
                <Badge color={cache.data.hit_rate_pct > 80 ? "green" : cache.data.hit_rate_pct > 50 ? "yellow" : "red"}>
                  {cache.data.hit_rate_pct > 80 ? "Good" : cache.data.hit_rate_pct > 50 ? "Fair" : "Poor"}
                </Badge>
              </Card>
              <Card title="Memory Usage">
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {cache.data.memory_mb.toFixed(1)} MB
                </p>
              </Card>
              <Card title="Oldest Entry">
                <p className="text-sm text-slate-700 dark:text-slate-300">
                  {cache.data.oldest_entry}
                </p>
              </Card>
            </div>
          )}
        </TabPanel>

        {/* Config Tab */}
        <TabPanel value="config">
          <div className="mb-4">
            <Button onClick={() => config.execute()}>Load Config</Button>
          </div>
          {config.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {config.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{config.error}</p>
          )}
          {updateConfig.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{updateConfig.error}</p>
          )}
          {config.data && (
            <Card title="System Configuration">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Key</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Value</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Type</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {config.data.map((c) => (
                      <tr key={c.key} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{c.key}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">
                          {JSON.stringify(c.value)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge color="blue">{c.type}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{c.description}</td>
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
