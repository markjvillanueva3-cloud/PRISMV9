/**
 * WireEdmPassChart — Multi-pass visualization for wire EDM skim progression.
 *
 * Shows horizontal bar chart with pass progression (rough -> semi -> skim -> super-finish),
 * color-coded bars, offset reduction, and Ra convergence. Pure CSS -- no chart library.
 *
 * U-WH20: Added sr-only text summary describing chart data for screen readers.
 * U-WH21: Guarded .toFixed() calls with fallback values.
 */
import type { WireEdmPassDetail } from '../../api/wireEdm';

const PASS_COLORS: Record<string, { bar: string; bg: string; text: string }> = {
  rough: { bar: 'bg-orange-500', bg: 'bg-orange-950/30', text: 'text-orange-300' },
  semi: { bar: 'bg-yellow-500', bg: 'bg-yellow-950/30', text: 'text-yellow-300' },
  skim: { bar: 'bg-emerald-500', bg: 'bg-emerald-950/30', text: 'text-emerald-300' },
  'super-finish': { bar: 'bg-sky-500', bg: 'bg-sky-950/30', text: 'text-sky-300' },
  finish: { bar: 'bg-sky-500', bg: 'bg-sky-950/30', text: 'text-sky-300' },
};

function passColor(type: string) {
  return PASS_COLORS[type] ?? PASS_COLORS.skim;
}

export function WireEdmPassChart({ passes }: { passes: WireEdmPassDetail[] }) {
  if (!passes || passes.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-6 text-center text-sm text-slate-500">
        No pass data available
      </div>
    );
  }

  const maxEnergy = Math.max(...passes.map((p) => p.energy_pct ?? 0), 1);
  const maxOffset = Math.max(...passes.map((p) => p.offset_mm ?? 0), 0.001);
  const maxRa = Math.max(...passes.map((p) => p.predicted_Ra_um ?? 0), 0.01);

  return (
    <div className="rounded-2xl border border-slate-700/40 bg-[#0c1522] px-5 py-4" role="region" aria-label="Multi-pass progression chart">
      <span className="sr-only">
        Multi-pass progression chart with {passes.length} passes. Energy ranges from {(passes[passes.length - 1]?.energy_pct ?? 0).toFixed(0)}% to {(passes[0]?.energy_pct ?? 0).toFixed(0)}%. Final surface finish: {(passes[passes.length - 1]?.predicted_Ra_um ?? 0).toFixed(2)} micrometers Ra.
      </span>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Multi-pass progression
        </div>
        <div className="flex gap-3">
          {Object.entries(PASS_COLORS).filter(([k]) => k !== 'finish').map(([type, c]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div className={`h-2.5 w-2.5 rounded-full ${c.bar}`} />
              <span className="text-[10px] capitalize text-slate-500">{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bar chart — energy per pass */}
      <div className="space-y-2">
        {passes.map((pass, idx) => {
          const colors = passColor(pass.type);
          const energyWidth = Math.max(((pass.energy_pct ?? 0) / maxEnergy) * 100, 4);
          return (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-8 text-right font-mono text-[11px] font-bold text-slate-400">
                {idx + 1}
              </div>
              <div className={`w-16 text-[10px] font-semibold capitalize ${colors.text}`}>
                {pass.type}
              </div>
              <div className="relative flex-1">
                <div className="h-6 overflow-hidden rounded-md bg-slate-800/60">
                  <div
                    className={`h-full rounded-md ${colors.bar} transition-all duration-500`}
                    style={{ width: `${energyWidth}%` }}
                  />
                </div>
                <div className="absolute inset-y-0 right-2 flex items-center text-[10px] font-bold text-white/80">
                  {(pass.energy_pct ?? 0).toFixed(0)}%
                </div>
              </div>
              <div className="w-20 text-right font-mono text-[11px] text-slate-400">
                {(pass.speed_mm_min ?? 0).toFixed(1)} mm/min
              </div>
            </div>
          );
        })}
      </div>

      {/* Offset + Ra convergence */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {/* Offset reduction */}
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Offset reduction
          </div>
          <div className="space-y-1.5">
            {passes.map((pass, idx) => {
              const offsetWidth = Math.max(((pass.offset_mm ?? 0) / maxOffset) * 100, 2);
              const colors = passColor(pass.type);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-4 text-right text-[10px] text-slate-500">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded bg-slate-800/40">
                      <div
                        className={`h-full rounded ${colors.bar} opacity-70`}
                        style={{ width: `${offsetWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-mono text-[10px] text-slate-400">
                    {(pass.offset_mm ?? 0).toFixed(3)} mm
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ra convergence */}
        <div className="rounded-xl border border-slate-700/50 bg-[#0f1f36] px-4 py-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Surface finish convergence
          </div>
          <div className="space-y-1.5">
            {passes.map((pass, idx) => {
              const raWidth = Math.max(((pass.predicted_Ra_um ?? 0) / maxRa) * 100, 2);
              const colors = passColor(pass.type);
              return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-4 text-right text-[10px] text-slate-500">{idx + 1}</div>
                  <div className="flex-1">
                    <div className="h-3 overflow-hidden rounded bg-slate-800/40">
                      <div
                        className={`h-full rounded ${colors.bar} opacity-70`}
                        style={{ width: `${raWidth}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right font-mono text-[10px] text-slate-400">
                    {(pass.predicted_Ra_um ?? 0).toFixed(2)} µm
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-600">
            <span>Rough &rarr; Finish</span>
            <span>{(passes[passes.length - 1]?.predicted_Ra_um ?? 0).toFixed(2)} &micro;m final</span>
          </div>
        </div>
      </div>
    </div>
  );
}
