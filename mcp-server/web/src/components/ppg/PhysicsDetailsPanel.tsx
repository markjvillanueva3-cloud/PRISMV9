import { useMemo } from 'react';
import { PanelCard, StatusPill } from '../workspace/WorkspacePrimitives';

// ─── Types ──────────────────────────────────────────────────────────

export interface KienzleData {
  kc1_1: number;
  mc: number;
  iso_group: 'P' | 'M' | 'K' | 'N' | 'S' | 'H';
  source: string;
}

export interface TaylorData {
  C: number;
  n: number;
  predicted_life_min: number;
  confidence95: [number, number];
  source: string;
}

export interface ChatterData {
  status: 'stable' | 'marginal' | 'unstable' | 'unknown';
  max_stable_ap_mm: number;
  optimal_rpm: number;
  lobes_count: number;
  source: string;
}

export interface ForceData {
  Fc_N: number;
  Fc_uncertainty_N: number;
  power_kW: number;
  torque_Nm: number;
  source: string;
}

export interface PhysicsDetailsPanelProps {
  kienzle: KienzleData | null;
  taylor: TaylorData | null;
  chatter: ChatterData | null;
  forces: ForceData | null;
  loading?: boolean;
  showSources?: boolean;
}

// ─── ISO Group Display Names ────────────────────────────────────────

const ISO_NAMES: Record<string, string> = {
  P: 'Steel (ISO P)',
  M: 'Stainless (ISO M)',
  K: 'Cast Iron (ISO K)',
  N: 'Non-ferrous (ISO N)',
  S: 'Superalloy (ISO S)',
  H: 'Hardened (ISO H)',
};

// ─── Chatter Status Colors ──────────────────────────────────────────

const CHATTER_COLORS: Record<string, 'success' | 'warning' | 'error' | 'neutral'> = {
  stable: 'success',
  marginal: 'warning',
  unstable: 'error',
  unknown: 'neutral',
};

// ─── Component ──────────────────────────────────────────────────────

export function PhysicsDetailsPanel({
  kienzle,
  taylor,
  chatter,
  forces,
  loading = false,
  showSources = true,
}: PhysicsDetailsPanelProps) {
  const hasAnyData = kienzle || taylor || chatter || forces;

  const confidenceInterval = useMemo(() => {
    if (!taylor) return null;
    const [low, high] = taylor.confidence95;
    return `${low.toFixed(1)}–${high.toFixed(1)} min`;
  }, [taylor]);

  if (loading) {
    return (
      <PanelCard title="Physics Analysis" collapsible>
        <div className="flex items-center justify-center py-8 text-neutral-400">
          <span className="animate-pulse">Calculating physics parameters...</span>
        </div>
      </PanelCard>
    );
  }

  if (!hasAnyData) {
    return (
      <PanelCard title="Physics Analysis" collapsible>
        <div className="text-sm text-neutral-500 py-4">
          No physics data available. Select a material and tool configuration to see Kienzle, Taylor, and stability analysis.
        </div>
      </PanelCard>
    );
  }

  return (
    <PanelCard title="Physics Analysis" collapsible>
      <div className="space-y-4">
        {/* Kienzle Force Model */}
        {kienzle && (
          <div className="border-b border-neutral-700 pb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-neutral-200">Kienzle Force Model</h4>
              <StatusPill variant="success" size="sm">
                {ISO_NAMES[kienzle.iso_group] || kienzle.iso_group}
              </StatusPill>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-400">kc1.1:</span>
                <span className="ml-2 font-mono text-neutral-100">{kienzle.kc1_1.toFixed(0)} N/mm²</span>
              </div>
              <div>
                <span className="text-neutral-400">mc:</span>
                <span className="ml-2 font-mono text-neutral-100">{kienzle.mc.toFixed(2)}</span>
              </div>
            </div>
            {showSources && (
              <div className="text-xs text-neutral-500 mt-1">
                Source: {kienzle.source}
              </div>
            )}
          </div>
        )}

        {/* Taylor Tool Life */}
        {taylor && (
          <div className="border-b border-neutral-700 pb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-neutral-200">Taylor Tool Life</h4>
              <span className="text-xs text-neutral-400">Bayesian Prediction</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-400">C:</span>
                <span className="ml-2 font-mono text-neutral-100">{taylor.C.toFixed(1)}</span>
              </div>
              <div>
                <span className="text-neutral-400">n:</span>
                <span className="ml-2 font-mono text-neutral-100">{taylor.n.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-neutral-400">Life:</span>
                <span className="ml-2 font-mono text-neutral-100">{taylor.predicted_life_min.toFixed(1)} min</span>
              </div>
              <div>
                <span className="text-neutral-400">95% CI:</span>
                <span className="ml-2 font-mono text-neutral-100">{confidenceInterval}</span>
              </div>
            </div>
            {showSources && (
              <div className="text-xs text-neutral-500 mt-1">
                Source: {taylor.source}
              </div>
            )}
          </div>
        )}

        {/* Chatter Stability */}
        {chatter && (
          <div className="border-b border-neutral-700 pb-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-neutral-200">Chatter Stability</h4>
              <StatusPill variant={CHATTER_COLORS[chatter.status]} size="sm">
                {chatter.status.charAt(0).toUpperCase() + chatter.status.slice(1)}
              </StatusPill>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-400">Max stable ap:</span>
                <span className="ml-2 font-mono text-neutral-100">{chatter.max_stable_ap_mm.toFixed(2)} mm</span>
              </div>
              <div>
                <span className="text-neutral-400">Optimal RPM:</span>
                <span className="ml-2 font-mono text-neutral-100">{chatter.optimal_rpm.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-neutral-400">Lobes:</span>
                <span className="ml-2 font-mono text-neutral-100">{chatter.lobes_count}</span>
              </div>
            </div>
            {showSources && (
              <div className="text-xs text-neutral-500 mt-1">
                Source: {chatter.source}
              </div>
            )}
          </div>
        )}

        {/* Cutting Forces */}
        {forces && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-neutral-200">Cutting Forces</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-neutral-400">Fc:</span>
                <span className="ml-2 font-mono text-neutral-100">
                  {forces.Fc_N.toFixed(0)} ± {forces.Fc_uncertainty_N.toFixed(0)} N
                </span>
              </div>
              <div>
                <span className="text-neutral-400">Power:</span>
                <span className="ml-2 font-mono text-neutral-100">{forces.power_kW.toFixed(2)} kW</span>
              </div>
              <div>
                <span className="text-neutral-400">Torque:</span>
                <span className="ml-2 font-mono text-neutral-100">{forces.torque_Nm.toFixed(2)} Nm</span>
              </div>
            </div>
            {showSources && (
              <div className="text-xs text-neutral-500 mt-1">
                Source: {forces.source}
              </div>
            )}
          </div>
        )}
      </div>
    </PanelCard>
  );
}

export default PhysicsDetailsPanel;
