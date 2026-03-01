import { useState, useMemo, useCallback } from "react";
import { useErpJobSchedule } from "../../hooks/useErp";
import type { ErpScheduleSlot } from "../../types/erp";
import Spinner from "../ui/Spinner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ZoomLevel = "hour" | "day" | "week";

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  hour: "Hour",
  day: "Day",
  week: "Week",
};

const PRIORITY_COLORS = [
  "bg-primary-400", "bg-blue-400", "bg-emerald-400",
  "bg-amber-400", "bg-purple-400", "bg-rose-400",
  "bg-cyan-400", "bg-orange-400",
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduleView() {
  const [zoom, setZoom] = useState<ZoomLevel>("hour");
  const schedule = useErpJobSchedule();

  // Fetch schedule on mount
  const handleLoad = useCallback(() => {
    schedule.execute({});
  }, [schedule]);

  if (!schedule.data && !schedule.loading && !schedule.error) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-xs text-slate-500">Load the current production schedule</p>
        <button
          type="button"
          onClick={handleLoad}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium
            text-white shadow-sm hover:bg-primary-700"
        >
          Load Schedule
        </button>
      </div>
    );
  }

  if (schedule.loading) {
    return (
      <div className="flex items-center gap-2 py-6">
        <Spinner size="sm" />
        <span className="text-xs text-slate-500">Loading schedule...</span>
      </div>
    );
  }

  if (schedule.error) {
    return (
      <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
        {schedule.error}
        <button
          type="button"
          onClick={handleLoad}
          className="ml-2 text-primary-600 hover:underline dark:text-primary-400"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!schedule.data) return null;

  const { schedule: slots, makespan_min, utilization_pct, conflicts } = schedule.data;

  return (
    <div className="flex flex-col gap-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            Makespan: {formatDuration(makespan_min)}
          </span>
          <span className="text-slate-500">
            Utilization: {utilization_pct.toFixed(1)}%
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1" role="tablist" aria-label="Timeline zoom">
          {(Object.keys(ZOOM_LABELS) as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              role="tab"
              aria-selected={zoom === z}
              onClick={() => setZoom(z)}
              className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                zoom === z
                  ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
            >
              {ZOOM_LABELS[z]}
            </button>
          ))}
        </div>
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="space-y-0.5">
          {conflicts.map((c, i) => (
            <p key={i} className="text-[10px] text-amber-600 dark:text-amber-400">{c}</p>
          ))}
        </div>
      )}

      {/* Gantt chart */}
      <GanttChart slots={slots} zoom={zoom} />

      {/* Reload */}
      <button
        type="button"
        onClick={handleLoad}
        className="self-start rounded-md border border-slate-300 px-3 py-1.5
          text-xs text-slate-600 hover:bg-slate-50
          dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        Refresh
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gantt Chart
// ---------------------------------------------------------------------------

function GanttChart({ slots, zoom }: { slots: ErpScheduleSlot[]; zoom: ZoomLevel }) {
  // Group slots by machine (Y-axis)
  const { machines, timeRange, pxPerMin } = useMemo(() => {
    const machineMap = new Map<string, ErpScheduleSlot[]>();
    let minTime = Infinity;
    let maxTime = -Infinity;

    for (const s of slots) {
      const start = new Date(s.start).getTime();
      const end = new Date(s.end).getTime();
      if (start < minTime) minTime = start;
      if (end > maxTime) maxTime = end;

      const list = machineMap.get(s.machine) ?? [];
      list.push(s);
      machineMap.set(s.machine, list);
    }

    // If no slots, use a default 8-hour window
    if (minTime === Infinity) {
      const now = Date.now();
      minTime = now;
      maxTime = now + 8 * 60 * 60_000;
    }

    const totalMin = (maxTime - minTime) / 60_000;
    const px = zoom === "hour" ? 4 : zoom === "day" ? 0.5 : 0.1;

    return {
      machines: machineMap,
      timeRange: { start: minTime, end: maxTime, totalMin },
      pxPerMin: px,
    };
  }, [slots, zoom]);

  const chartWidth = Math.max(timeRange.totalMin * pxPerMin, 200);

  if (machines.size === 0) {
    return <p className="py-4 text-center text-xs text-slate-400">No scheduled operations</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      {/* Time header */}
      <TimeHeader start={timeRange.start} end={timeRange.end} pxPerMin={pxPerMin} zoom={zoom} chartWidth={chartWidth} />

      {/* Machine rows */}
      <div>
        {[...machines.entries()].map(([machine, machineSlots], machineIdx) => (
          <div
            key={machine}
            className="flex items-stretch border-b border-slate-100 last:border-b-0 dark:border-slate-700/50"
          >
            {/* Machine label */}
            <div className="flex w-28 shrink-0 items-center border-r border-slate-200 px-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:text-slate-300">
              {machine}
            </div>

            {/* Timeline */}
            <div className="relative h-10" style={{ width: chartWidth }}>
              {machineSlots.map((slot, i) => {
                const left = ((new Date(slot.start).getTime() - timeRange.start) / 60_000) * pxPerMin;
                const width = Math.max(slot.duration_min * pxPerMin, 2);
                const colorClass = PRIORITY_COLORS[machineIdx % PRIORITY_COLORS.length];

                return (
                  <div
                    key={`${slot.operation}-${i}`}
                    title={`${slot.operation}\n${slot.start} → ${slot.end}\n${slot.duration_min}min`}
                    className={`absolute top-1 h-8 rounded ${colorClass} flex items-center
                      overflow-hidden px-1 text-[9px] font-medium text-white shadow-sm`}
                    style={{ left, width }}
                  >
                    {width > 30 && <span className="truncate">{slot.operation}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Time Header
// ---------------------------------------------------------------------------

function TimeHeader({
  start,
  end,
  pxPerMin,
  zoom,
  chartWidth,
}: {
  start: number;
  end: number;
  pxPerMin: number;
  zoom: ZoomLevel;
  chartWidth: number;
}) {
  const ticks = useMemo(() => {
    const intervalMin = zoom === "hour" ? 60 : zoom === "day" ? 1440 : 10080;
    const result: { pos: number; label: string }[] = [];

    // Align to interval boundary
    const startDate = new Date(start);
    const alignedStart = new Date(startDate);
    alignedStart.setMinutes(0, 0, 0);

    let t = alignedStart.getTime();
    while (t <= end) {
      if (t >= start) {
        const pos = ((t - start) / 60_000) * pxPerMin;
        const d = new Date(t);
        const label =
          zoom === "hour"
            ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
            : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
        result.push({ pos, label });
      }
      t += intervalMin * 60_000;
    }
    return result;
  }, [start, end, pxPerMin, zoom]);

  return (
    <div className="flex border-b border-slate-200 dark:border-slate-700">
      <div className="w-28 shrink-0 border-r border-slate-200 px-2 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-700">
        Machine
      </div>
      <div className="relative h-6" style={{ width: chartWidth }}>
        {ticks.map((tick) => (
          <span
            key={tick.pos}
            className="absolute top-1 text-[9px] text-slate-400"
            style={{ left: tick.pos }}
          >
            {tick.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(min: number): string {
  if (min < 60) return `${min.toFixed(0)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}
