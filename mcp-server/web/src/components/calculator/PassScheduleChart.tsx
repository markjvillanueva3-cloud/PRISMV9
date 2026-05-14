/**
 * PassScheduleChart — Shared multi-pass visualization for wire EDM and lathe.
 *
 * Wire EDM: shows rough → skim pass progression with offset/Ra convergence.
 * Lathe: shows threading pass schedule with depth progression.
 * Pure CSS bar chart — no charting library needed.
 */

export interface PassData {
  pass: number;
  type: string;
  energy_or_depth_pct: number;
  speed_or_feed: number;
  speed_unit: string;
  offset_or_doc: number;
  offset_unit: string;
  predicted_finish?: number;
  finish_unit?: string;
}

export interface PassScheduleChartProps {
  mode: 'wire_edm' | 'lathe';
  passes: PassData[];
  title?: string;
}

const WIRE_COLORS: Record<string, { bar: string; text: string }> = {
  rough: { bar: 'bg-orange-500', text: 'text-orange-300' },
  semi: { bar: 'bg-yellow-500', text: 'text-yellow-300' },
  skim: { bar: 'bg-emerald-500', text: 'text-emerald-300' },
  'super-finish': { bar: 'bg-sky-500', text: 'text-sky-300' },
  finish: { bar: 'bg-sky-500', text: 'text-sky-300' },
};

const LATHE_COLORS: Record<string, { bar: string; text: string }> = {
  rough: { bar: 'bg-cyan-500', text: 'text-cyan-300' },
  semi: { bar: 'bg-teal-500', text: 'text-teal-300' },
  finish: { bar: 'bg-emerald-500', text: 'text-emerald-300' },
  spring: { bar: 'bg-sky-500', text: 'text-sky-300' },
};

function passColor(mode: string, type: string) {
  const map = mode === 'wire_edm' ? WIRE_COLORS : LATHE_COLORS;
  return map[type] ?? { bar: 'bg-zinc-500', text: 'text-zinc-300' };
}

export function PassScheduleChart({ mode, passes, title }: PassScheduleChartProps) {
  if (!passes || passes.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-700/40 bg-zinc-900 px-4 py-4 text-center text-sm text-zinc-500">
        No pass data available
      </div>
    );
  }

  const maxEnergy = Math.max(...passes.map(p => p.energy_or_depth_pct), 1);
  const maxOffset = Math.max(...passes.map(p => p.offset_or_doc), 0.001);
  const hasFinish = passes.some(p => p.predicted_finish != null);

  const accentColor = mode === 'wire_edm' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <div className="rounded-xl border border-zinc-700/40 bg-zinc-900 px-4 py-4" role="region" aria-label="Pass schedule chart">
      <div className="mb-3 flex items-center justify-between">
        <div className={`text-xs font-semibold uppercase tracking-wide ${accentColor}`}>
          {title ?? (mode === 'wire_edm' ? 'Wire EDM Pass Schedule' : 'Threading Pass Schedule')}
        </div>
        <div className="flex gap-2">
          {Object.entries(mode === 'wire_edm' ? WIRE_COLORS : LATHE_COLORS)
            .filter(([k]) => k !== 'finish' || mode === 'lathe')
            .map(([type, c]) => (
              <div key={type} className="flex items-center gap-1">
                <div className={`h-2 w-2 rounded-full ${c.bar}`} />
                <span className="text-[10px] capitalize text-zinc-500">{type}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-1.5">
        {passes.map((pass, idx) => {
          const colors = passColor(mode, pass.type);
          const barWidth = Math.max((pass.energy_or_depth_pct / maxEnergy) * 100, 4);
          return (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 text-right font-mono text-[10px] text-zinc-500">{pass.pass}</div>
              <div className={`w-14 text-[10px] font-semibold capitalize ${colors.text}`}>{pass.type}</div>
              <div className="relative flex-1">
                <div className="h-5 overflow-hidden rounded bg-zinc-800/60">
                  <div className={`h-full rounded ${colors.bar} transition-all`} style={{ width: `${barWidth}%` }} />
                </div>
                <div className="absolute inset-y-0 right-1 flex items-center text-[9px] font-bold text-white/70">
                  {pass.energy_or_depth_pct.toFixed(0)}%
                </div>
              </div>
              <div className="w-20 text-right font-mono text-[10px] text-zinc-400">
                {pass.speed_or_feed.toFixed(1)} {pass.speed_unit}
              </div>
            </div>
          );
        })}
      </div>

      {/* Offset/DOC + Finish convergence */}
      <div className={`mt-4 grid gap-3 ${hasFinish ? 'md:grid-cols-2' : ''}`}>
        <div className="rounded-lg border border-zinc-700/40 bg-zinc-800/30 px-3 py-2">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            {mode === 'wire_edm' ? 'Offset reduction' : 'Depth per pass'}
          </div>
          <div className="space-y-1">
            {passes.map((pass, idx) => {
              const w = Math.max((pass.offset_or_doc / maxOffset) * 100, 2);
              const colors = passColor(mode, pass.type);
              return (
                <div key={idx} className="flex items-center gap-1.5">
                  <div className="w-3 text-right text-[9px] text-zinc-600">{pass.pass}</div>
                  <div className="flex-1"><div className="h-2.5 rounded bg-zinc-800/50 overflow-hidden">
                    <div className={`h-full rounded ${colors.bar} opacity-60`} style={{ width: `${w}%` }} />
                  </div></div>
                  <div className="w-16 text-right font-mono text-[9px] text-zinc-500">
                    {pass.offset_or_doc.toFixed(3)} {pass.offset_unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {hasFinish && (
          <div className="rounded-lg border border-zinc-700/40 bg-zinc-800/30 px-3 py-2">
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Surface finish convergence
            </div>
            <div className="space-y-1">
              {passes.filter(p => p.predicted_finish != null).map((pass, idx) => {
                const maxF = Math.max(...passes.filter(p => p.predicted_finish != null).map(p => p.predicted_finish!), 0.01);
                const w = Math.max(((pass.predicted_finish ?? 0) / maxF) * 100, 2);
                const colors = passColor(mode, pass.type);
                return (
                  <div key={idx} className="flex items-center gap-1.5">
                    <div className="w-3 text-right text-[9px] text-zinc-600">{pass.pass}</div>
                    <div className="flex-1"><div className="h-2.5 rounded bg-zinc-800/50 overflow-hidden">
                      <div className={`h-full rounded ${colors.bar} opacity-60`} style={{ width: `${w}%` }} />
                    </div></div>
                    <div className="w-16 text-right font-mono text-[9px] text-zinc-500">
                      {(pass.predicted_finish ?? 0).toFixed(2)} {pass.finish_unit ?? 'µm'}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 text-right text-[9px] text-zinc-600">
              Final: {(passes[passes.length - 1]?.predicted_finish ?? 0).toFixed(2)} {passes[0]?.finish_unit ?? 'µm'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
