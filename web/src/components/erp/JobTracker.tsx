import { useState, useEffect } from "react";
import { useErpJobTrack } from "../../hooks/useErp";
import type { ErpJobInfo, ErpJobStatus } from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_FILTERS: { value: ErpJobStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_progress", label: "In Progress" },
  { value: "queued", label: "Queued" },
  { value: "complete", label: "Complete" },
  { value: "on_hold", label: "On Hold" },
];

const STATUS_BADGE: Record<ErpJobStatus, string> = {
  queued: "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400",
  in_progress: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  on_hold: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function JobTracker() {
  const [filter, setFilter] = useState<ErpJobStatus | "all">("all");
  const [selectedJob, setSelectedJob] = useState<ErpJobInfo | null>(null);

  const jobTrack = useErpJobTrack();

  // Fetch on mount and when filter changes
  useEffect(() => {
    jobTrack.execute({
      status_filter: filter === "all" ? undefined : filter,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const jobs = jobTrack.data?.jobs ?? [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header with stats */}
      {jobTrack.data && (
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {jobTrack.data.total} jobs
          </span>
          <span className="text-primary-600 dark:text-primary-400">
            {jobTrack.data.active} active
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-1" role="tablist" aria-label="Job status filter">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => { setFilter(f.value); setSelectedJob(null); }}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              filter === f.value
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {jobTrack.error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {jobTrack.error}
        </div>
      )}

      {jobTrack.loading && (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="sm" />
          <span className="text-xs text-slate-500">Loading jobs...</span>
        </div>
      )}

      {/* Job list */}
      {!jobTrack.loading && jobs.length === 0 && (
        <p className="py-6 text-center text-xs text-slate-400">No jobs found</p>
      )}

      {!jobTrack.loading && jobs.length > 0 && (
        <div className="space-y-1">
          {jobs.map((job) => (
            <button
              key={job.job_id}
              type="button"
              onClick={() => setSelectedJob(selectedJob?.job_id === job.job_id ? null : job)}
              className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5
                text-left text-xs transition-colors ${
                selectedJob?.job_id === job.job_id
                  ? "border-primary-400 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20"
                  : "border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/50"
              }`}
            >
              {/* Job ID + Part */}
              <div className="flex-1">
                <div className="font-medium text-slate-700 dark:text-slate-300">
                  {job.part_name}
                </div>
                <div className="text-[10px] text-slate-400">{job.job_id}</div>
              </div>

              {/* Progress bar */}
              <div className="flex w-20 items-center gap-1.5">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-primary-500 transition-all"
                    style={{ width: `${job.progress_pct}%` }}
                  />
                </div>
                <span className="w-7 text-right text-[10px] text-slate-500">
                  {job.progress_pct}%
                </span>
              </div>

              {/* Status badge */}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>
                {job.status.replace("_", " ")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Job detail panel */}
      {selectedJob && (
        <JobDetailPanel job={selectedJob} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Job Detail Panel
// ---------------------------------------------------------------------------

function JobDetailPanel({ job }: { job: ErpJobInfo }) {
  const oeeColor =
    job.oee >= 85
      ? "text-green-600 dark:text-green-400"
      : job.oee >= 60
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {job.part_name}
        </h3>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_BADGE[job.status]}`}>
          {job.status.replace("_", " ")}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
        <div>
          <dt className="text-[10px] text-slate-500">Job ID</dt>
          <dd className="font-mono text-slate-700 dark:text-slate-300">{job.job_id}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">Current Operation</dt>
          <dd className="font-medium text-slate-700 dark:text-slate-300">{job.current_operation}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">Machine</dt>
          <dd className="text-slate-700 dark:text-slate-300">{job.machine}</dd>
        </div>
        <div>
          <dt className="text-[10px] text-slate-500">ETA</dt>
          <dd className="text-slate-700 dark:text-slate-300">{job.eta}</dd>
        </div>
      </div>

      {/* Progress + OEE */}
      <div className="mt-3 flex items-center gap-4 border-t border-slate-100 pt-3 dark:border-slate-700">
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-[10px] text-slate-500">
            <span>Progress</span>
            <span>{job.progress_pct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${job.progress_pct}%` }}
            />
          </div>
        </div>
        <div className="text-center">
          <dt className="text-[10px] text-slate-500">OEE</dt>
          <dd className={`text-lg font-bold ${oeeColor}`}>
            {job.oee.toFixed(0)}%
          </dd>
        </div>
      </div>
    </div>
  );
}
