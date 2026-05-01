/**
 * SummaryCards — Hero metrics for the optimization report.
 * Shows cycle time saved, blocks optimized, max cutting force, tools analyzed.
 */

interface SummaryCardsProps {
  cycleTimeSavedPct: number;
  cycleTimeSavedSec: number;
  blocksOptimized: number;
  totalBlocks: number;
  maxForceN: number;
  maxPowerKW: number;
  toolCount: number;
  stagesExecuted: number;
  pipelineDurationMs: number;
}

function colorForSaving(pct: number): string {
  if (pct > 10) return 'text-emerald-400';
  if (pct > 0) return 'text-amber-400';
  return 'text-slate-400';
}

export function SummaryCards({
  cycleTimeSavedPct,
  cycleTimeSavedSec,
  blocksOptimized,
  totalBlocks,
  maxForceN,
  maxPowerKW,
  toolCount,
  stagesExecuted,
  pipelineDurationMs,
}: SummaryCardsProps) {
  const cards = [
    {
      label: 'Cycle Time Saved',
      value: `${cycleTimeSavedPct.toFixed(1)}%`,
      hint: `${cycleTimeSavedSec.toFixed(1)}s per part`,
      colorClass: colorForSaving(cycleTimeSavedPct),
    },
    {
      label: 'Blocks Optimized',
      value: `${blocksOptimized}/${totalBlocks}`,
      hint: totalBlocks > 0 ? `${Math.round((blocksOptimized / totalBlocks) * 100)}% of program` : '—',
      colorClass: 'text-cyan-400',
    },
    {
      label: 'Max Cutting Force',
      value: `${maxForceN} N`,
      hint: `${maxPowerKW.toFixed(1)} kW peak power`,
      colorClass: maxForceN > 5000 ? 'text-rose-400' : 'text-slate-50',
    },
    {
      label: 'Tools Analyzed',
      value: String(toolCount),
      hint: `${stagesExecuted} stages in ${pipelineDurationMs}ms`,
      colorClass: 'text-violet-400',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/[0.03] px-5 py-5"
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            {c.label}
          </div>
          <div className={`mt-2 text-3xl font-bold ${c.colorClass}`}>{c.value}</div>
          <div className="mt-1 text-sm text-slate-400">{c.hint}</div>
        </div>
      ))}
    </div>
  );
}
