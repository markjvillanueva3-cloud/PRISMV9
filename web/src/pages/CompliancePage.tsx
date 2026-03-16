import { useState } from "react";
import { Card, Button, Spinner, Badge } from "../components/ui";
import { Tabs, TabList, Tab, TabPanel } from "../components/ui/Tabs";
import {
  useComplianceTemplates,
  useComplianceApply,
  useComplianceAudit,
  useComplianceCheck,
  useComplianceGapAnalysis,
} from "../hooks/useCompliance";

const STANDARDS = ["ISO 9001", "ISO 14001", "ASME Y14.5", "DIN 8580", "ISO 13485"];

export default function CompliancePage() {
  const templates = useComplianceTemplates();
  const apply = useComplianceApply();
  const audit = useComplianceAudit();
  const check = useComplianceCheck();
  const gap = useComplianceGapAnalysis();
  const [selectedStandard, setSelectedStandard] = useState(STANDARDS[0]);

  const statusColor = (s: string) =>
    s === "met" ? "green" : s === "partial" ? "yellow" : "red";

  const priorityColor = (p: string) =>
    p === "high" ? "red" : p === "medium" ? "yellow" : "slate";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Compliance Management
        </h1>
        <div className="flex gap-2">
          <select
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm
              dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
            value={selectedStandard}
            onChange={(e) => setSelectedStandard(e.target.value)}
          >
            {STANDARDS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <Button onClick={() => templates.execute()}>Refresh</Button>
        </div>
      </div>

      <Tabs defaultValue="standards">
        <TabList>
          <Tab value="standards">Standards</Tab>
          <Tab value="gap">Gap Analysis</Tab>
          <Tab value="audit">Audit Trail</Tab>
        </TabList>

        {/* Standards Tab */}
        <TabPanel value="standards">
          {templates.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {templates.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{templates.error}</p>
          )}
          {!templates.data && !templates.loading && !templates.error && (
            <div className="flex flex-col items-center gap-3 py-12">
              <p className="text-sm text-slate-500">Click Refresh to load compliance templates.</p>
            </div>
          )}
          {templates.data && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.data.map((t) => {
                const met = t.requirements.filter((r) => r.status === "met").length;
                const total = t.requirements.length;
                const pct = total > 0 ? Math.round((met / total) * 100) : 0;
                return (
                  <Card key={t.id} title={t.standard}>
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">Version: {t.version}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-2 rounded-full ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {met}/{total} requirements met
                      </p>
                      <div className="flex gap-1">
                        <Badge color="green">{t.requirements.filter((r) => r.status === "met").length} met</Badge>
                        <Badge color="yellow">{t.requirements.filter((r) => r.status === "partial").length} partial</Badge>
                        <Badge color="red">{t.requirements.filter((r) => r.status === "unmet").length} unmet</Badge>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => check.execute({ standard: t.standard })}
                          disabled={check.loading}
                        >
                          {check.loading ? <Spinner size="sm" /> : "Check"}
                        </Button>
                        <Button
                          onClick={() => apply.execute({ standard: t.standard })}
                          disabled={apply.loading}
                        >
                          Apply
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {check.data && (
            <Card title={`Compliance Check Result (Score: ${check.data.score_pct}%)`} className="mt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Requirement</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Status</th>
                      <th className="px-3 py-2 font-medium text-slate-600 dark:text-slate-400">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {check.data.findings.map((f) => (
                      <tr key={f.requirement_id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700 dark:text-slate-300">{f.requirement_id}</td>
                        <td className="px-3 py-2">
                          <Badge color={statusColor(f.status)}>{f.status}</Badge>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-500">{f.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </TabPanel>

        {/* Gap Analysis Tab */}
        <TabPanel value="gap">
          <div className="mb-4 flex gap-2">
            <Button
              onClick={() => gap.execute({ standard: selectedStandard })}
              disabled={gap.loading}
            >
              {gap.loading ? <Spinner size="sm" /> : `Analyze: ${selectedStandard}`}
            </Button>
          </div>
          {gap.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{gap.error}</p>
          )}
          {gap.data && (
            <>
              <div className="grid gap-4 sm:grid-cols-4 mb-6">
                <Card title="Total Requirements">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {gap.data.total_requirements}
                  </p>
                </Card>
                <Card title="Met">
                  <p className="text-2xl font-bold text-green-600">{gap.data.met}</p>
                </Card>
                <Card title="Partial">
                  <p className="text-2xl font-bold text-yellow-600">{gap.data.partial}</p>
                </Card>
                <Card title="Unmet">
                  <p className="text-2xl font-bold text-red-600">{gap.data.unmet}</p>
                </Card>
              </div>

              <Card title="Identified Gaps">
                {gap.data.gaps.length === 0 ? (
                  <p className="text-sm text-slate-500">No gaps found. Full compliance achieved.</p>
                ) : (
                  <div className="space-y-3">
                    {gap.data.gaps.map((g, i) => (
                      <div
                        key={i}
                        className="rounded-md border border-slate-200 p-3 dark:border-slate-700"
                      >
                        <div className="flex items-center gap-2">
                          <Badge color={priorityColor(g.priority)}>{g.priority}</Badge>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {g.requirement}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          Remediation: {g.remediation}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </TabPanel>

        {/* Audit Trail Tab */}
        <TabPanel value="audit">
          <div className="mb-4">
            <Button onClick={() => audit.execute()}>Load Audit Trail</Button>
          </div>
          {audit.loading && (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}
          {audit.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{audit.error}</p>
          )}
          {audit.data && audit.data.length === 0 && (
            <p className="text-sm text-slate-500">No audit records found.</p>
          )}
          {audit.data && audit.data.length > 0 && (
            <div className="space-y-3">
              {audit.data.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                        Audit #{a.id}
                      </p>
                      <p className="text-xs text-slate-500">
                        Template: {a.template_id} | {a.timestamp}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={a.score_pct >= 80 ? "green" : a.score_pct >= 50 ? "yellow" : "red"}>
                        {a.score_pct}%
                      </Badge>
                    </div>
                  </div>
                  {a.findings.length > 0 && (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700">
                            <th className="px-2 py-1 font-medium text-slate-600 dark:text-slate-400">Req ID</th>
                            <th className="px-2 py-1 font-medium text-slate-600 dark:text-slate-400">Status</th>
                            <th className="px-2 py-1 font-medium text-slate-600 dark:text-slate-400">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.findings.map((f) => (
                            <tr key={f.requirement_id} className="border-b border-slate-100 dark:border-slate-800">
                              <td className="px-2 py-1 font-mono text-slate-700 dark:text-slate-300">{f.requirement_id}</td>
                              <td className="px-2 py-1">
                                <Badge color={statusColor(f.status)}>{f.status}</Badge>
                              </td>
                              <td className="px-2 py-1 text-slate-500">{f.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabPanel>
      </Tabs>
    </div>
  );
}
