/**
 * SurfaceIntegrityCard — Shared surface integrity display for wire EDM and lathe.
 *
 * Wire EDM: shows recast layer depth, HAZ, residual stress, crack probability.
 * Lathe: shows white layer, HAZ from hard turning, residual stress.
 * Accepts a unified props interface that covers both modes.
 */

export interface SurfaceLayer {
  name: string;
  depth_um: number;
  color: string;
  severity: 'ok' | 'caution' | 'critical';
}

export interface SurfaceIntegrityData {
  mode: 'wire_edm' | 'lathe';
  layers: SurfaceLayer[];
  residual_stress_MPa: number;
  stress_type: 'tensile' | 'compressive';
  fatigue_reduction_pct: number;
  hardness_change_pct?: number;
  spec_pass?: boolean;
  spec_standard?: string;
  recommendations: string[];
}

export interface SurfaceIntegrityCardProps {
  data: SurfaceIntegrityData;
}

const SEVERITY_STYLES = {
  ok: { border: 'border-emerald-700/40', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
  caution: { border: 'border-amber-700/40', bg: 'bg-amber-950/20', text: 'text-amber-400' },
  critical: { border: 'border-red-700/40', bg: 'bg-red-950/20', text: 'text-red-400' },
};

export function SurfaceIntegrityCard({ data }: SurfaceIntegrityCardProps) {
  const maxDepth = Math.max(...data.layers.map(l => l.depth_um), 1);
  const overallSeverity = data.layers.some(l => l.severity === 'critical') ? 'critical'
    : data.layers.some(l => l.severity === 'caution') ? 'caution' : 'ok';
  const styles = SEVERITY_STYLES[overallSeverity];

  const accentColor = data.mode === 'wire_edm' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <div className={`rounded-xl border ${styles.border} ${styles.bg} px-4 py-4`} role="region" aria-label="Surface integrity assessment">
      <div className="mb-3 flex items-center justify-between">
        <div className={`text-xs font-semibold uppercase tracking-wide ${accentColor}`}>
          Surface Integrity
        </div>
        {data.spec_pass != null && (
          <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
            data.spec_pass ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {data.spec_pass ? 'SPEC PASS' : 'SPEC FAIL'}
          </div>
        )}
      </div>

      {/* Cross-section diagram */}
      <div className="relative h-16 bg-zinc-800 rounded overflow-hidden mb-3">
        {data.layers.map((layer, idx) => {
          const widthPct = Math.min(80, (layer.depth_um / maxDepth) * 60 + 10);
          return (
            <div
              key={idx}
              className="absolute left-0 top-0 h-full"
              style={{
                width: `${widthPct}%`,
                backgroundColor: layer.color,
                opacity: 0.3 + (data.layers.length - idx) * 0.15,
                zIndex: data.layers.length - idx,
              }}
            >
              <span className="absolute inset-0 flex items-center px-2 text-[9px] font-mono text-white/70">
                {layer.name}: {layer.depth_um.toFixed(1)}µm
              </span>
            </div>
          );
        })}
        <div className="absolute right-2 bottom-1 text-[9px] text-zinc-500 font-mono z-10">Base material</div>
      </div>

      {/* Layer details */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {data.layers.map((layer, idx) => {
          const sev = SEVERITY_STYLES[layer.severity];
          return (
            <div key={idx} className={`rounded border ${sev.border} px-2 py-1.5`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-400">{layer.name}</span>
                <span className={`text-xs font-mono font-bold ${sev.text}`}>{layer.depth_um.toFixed(1)} µm</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase">Residual stress</div>
          <div className={`text-xs font-mono ${data.residual_stress_MPa > 400 ? 'text-amber-400' : 'text-zinc-200'}`}>
            {data.residual_stress_MPa.toFixed(0)} MPa ({data.stress_type})
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-500 uppercase">Fatigue impact</div>
          <div className="text-xs font-mono text-zinc-200">-{data.fatigue_reduction_pct.toFixed(1)}%</div>
        </div>
        {data.hardness_change_pct != null && (
          <div>
            <div className="text-[10px] text-zinc-500 uppercase">Hardness change</div>
            <div className="text-xs font-mono text-zinc-200">{data.hardness_change_pct > 0 ? '+' : ''}{data.hardness_change_pct.toFixed(1)}%</div>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="border-t border-zinc-700/40 pt-2">
          {data.recommendations.map((r, i) => (
            <div key={i} className="text-[10px] text-zinc-400 py-0.5 flex gap-1.5">
              <span className={accentColor}>&#x2192;</span> {r}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
