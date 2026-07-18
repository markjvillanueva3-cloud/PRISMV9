import { useEffect } from "react";
import { useErpJobTrack, useErpCapacity, useErpOee } from "../hooks/useErp";
import Spinner from "../components/ui/Spinner";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ErpDashboard() {
  const jobTrack = useErpJobTrack();
  const capacity = useErpCapacity();
  const oee = useErpOee();

  useEffect(() => {
    jobTrack.execute({});
    capacity.execute({ time_range: "day" });
    oee.execute({ time_range: "day" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = jobTrack.loading || capacity.loading || oee.loading;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
        ERP Dashboard
      </h1>

      {loading && (
        <div className="flex items-center gap-2">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Loading dashboard...</span>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Active Jobs"
          value={jobTrack.data?.active ?? "—"}
          sub={`${jobTrack.data?.total ?? 0} total`}
          color="text-primary-600 dark:text-primary-400"
        />
        <KpiCard
          label="Overall Utilization"
          value={capacity.data ? `${capacity.data.overall_utilization_pct.toFixed(0)}%` : "—"}
          sub={`${capacity.data?.total_available_hours.toFixed(0) ?? 0}h available`}
          color="text-blue-600 dark:text-blue-400"
        />
        <KpiCard
          label="Plant OEE"
          value={oee.data ? `${oee.data.plant_oee.toFixed(0)}%` : "—"}
          sub={`${oee.data?.metrics.length ?? 0} machines`}
          color={
            (oee.data?.plant_oee ?? 0) >= 85
              ? "text-green-600 dark:text-green-400"
              : "text-amber-600 dark:text-amber-400"
          }
        />
        <KpiCard
          label="Machines"
          value={capacity.data?.machines.length ?? "—"}
          sub="monitored"
          color="text-slate-600 dark:text-slate-400"
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickLink label="New Quote" href="/erp/quote" icon="$" />
        <QuickLink label="Plan Job" href="/erp/jobs" icon="P" />
        <QuickLink label="Schedule" href="/erp/schedule" icon="S" />
        <QuickLink label="Job Tracker" href="/erp/tracker" icon="T" />
        <QuickLink label="Analytics" href="/erp/analytics" icon="A" />
        <QuickLink label="Maintenance" href="/erp/maintenance" icon="M" />
      </div>

      {/* Recent jobs list */}
      {jobTrack.data && jobTrack.data.jobs.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
            Recent Jobs
          </h3>
          <div className="space-y-1.5">
            {jobTrack.data.jobs.slice(0, 5).map((job) => (
              <div
                key={job.job_id}
                className="flex items-center gap-3 rounded bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/50"
              >
                <span className="flex-1 font-medium text-slate-700 dark:text-slate-300">
                  {job.part_name}
                </span>
                <span className="text-[10px] text-slate-400">{job.current_operation}</span>
                <div className="flex w-16 items-center gap-1">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-primary-500"
                      style={{ width: `${job.progress_pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500">{job.progress_pct}%</span>
                </div>
                <StatusBadge status={job.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function KpiCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-2xl font-bold ${color}`}>{value}</dd>
      <dd className="mt-0.5 text-[10px] text-slate-400">{sub}</dd>
    </div>
  );
}

function QuickLink({ label, href, icon }: { label: string; href: string; icon: string }) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white
        px-3 py-2.5 text-xs font-medium text-slate-700 shadow-sm transition-colors
        hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800
        dark:text-slate-300 dark:hover:bg-slate-700/50"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded bg-primary-100
        text-[10px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
        {icon}
      </span>
      {label}
    </a>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    queued: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
    in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[status] ?? colors.queued}`}>
      {status.replace("_", " ")}
    </span>
  );
}
