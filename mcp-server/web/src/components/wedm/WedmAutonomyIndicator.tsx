/**
 * WedmAutonomyIndicator — P2P-FULLSTACK-MS0/U-P2PFS43
 *
 * Compact, read-only indicator of WEDM autonomy level (L0 Manual → L5
 * Self-improving). Displays the current level with 6-tier tone mapping,
 * the human role at that level, permitted capabilities (5 discrete
 * capabilities from the autonomy engine), the escalation path (next-level
 * requirements + blockers), and any active degrade warnings.
 *
 * Backs GET /autonomy/status via the existing `autonomyApi.getStatus()`
 * client — this component is purely presentational and does not fetch.
 * Parent pages pass the snapshot in; tests pass fixtures.
 *
 * Design language: Calculator Studio dark-glow cards. Tone-per-level uses
 * the same 6-tier palette as AutonomyPanel.tsx in wedm-studio/ for
 * cross-UI consistency, but this component is significantly more compact
 * and is intended for embedding (dashboards, job cards, status rails).
 */

import type {
  AutonomyLevel,
  AutonomyStatusSnapshot,
  AutonomyCapability,
} from '../../api/wedmCoordination';

// ============================================================================
// TONE & METADATA
// ============================================================================

interface LevelTone {
  border: string;
  bg: string;
  text: string;
  badge: string;
  chip: string;
}

const LEVEL_TONES: Record<AutonomyLevel, LevelTone> = {
  0: {
    border: 'border-slate-500/40',
    bg: 'bg-slate-900/40',
    text: 'text-slate-200',
    badge: 'bg-slate-600',
    chip: 'bg-slate-800/60 text-slate-300',
  },
  1: {
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/25',
    text: 'text-cyan-300',
    badge: 'bg-cyan-500',
    chip: 'bg-cyan-950/40 text-cyan-200',
  },
  2: {
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/25',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500',
    chip: 'bg-emerald-950/40 text-emerald-200',
  },
  3: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/25',
    text: 'text-amber-300',
    badge: 'bg-amber-500',
    chip: 'bg-amber-950/40 text-amber-200',
  },
  4: {
    border: 'border-violet-500/40',
    bg: 'bg-violet-950/25',
    text: 'text-violet-300',
    badge: 'bg-violet-500',
    chip: 'bg-violet-950/40 text-violet-200',
  },
  5: {
    border: 'border-rose-500/50',
    bg: 'bg-rose-950/30',
    text: 'text-rose-300',
    badge: 'bg-rose-500',
    chip: 'bg-rose-950/40 text-rose-200',
  },
};

const CAPABILITY_LABELS: Record<AutonomyCapability, string> = {
  suggest_parameters: 'Suggest parameters',
  auto_adjust_parameters: 'Auto-adjust parameters',
  execute_job_supervised: 'Execute job (supervised)',
  execute_job_unattended: 'Execute job (unattended)',
  self_modify_policy: 'Self-modify policy',
};

const CAPABILITY_ORDER: AutonomyCapability[] = [
  'suggest_parameters',
  'auto_adjust_parameters',
  'execute_job_supervised',
  'execute_job_unattended',
  'self_modify_policy',
];

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmAutonomyIndicatorProps {
  snapshot: AutonomyStatusSnapshot | null | undefined;
  /** Display density. `compact` hides capability list; `full` shows everything. */
  variant?: 'compact' | 'full';
  /** Optional click handler — e.g. to open the full autonomy panel. */
  onOpenDetails?: () => void;
}

export function WedmAutonomyIndicator({
  snapshot,
  variant = 'full',
  onOpenDetails,
}: WedmAutonomyIndicatorProps) {
  if (!snapshot) return null;

  const level = snapshot.currentLevel;
  const tone = LEVEL_TONES[level] ?? LEVEL_TONES[0];
  const levelName = snapshot.levelName ?? '';
  const humanRole = snapshot.humanRole ?? '';
  const blockers = Array.isArray(snapshot.promotionBlockers) ? snapshot.promotionBlockers : [];
  const warnings = Array.isArray(snapshot.degradeWarnings) ? snapshot.degradeWarnings : [];
  const capabilities = snapshot.capabilities ?? ({} as Record<AutonomyCapability, boolean>);
  const nextReq = snapshot.nextLevelRequirements ?? null;

  const grantedCount = CAPABILITY_ORDER.filter((c) => capabilities[c]).length;
  const hasDegradeWarnings = warnings.length > 0;

  const content = (
    <>
      {/* Header: L-badge + name + human role */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex min-w-[46px] items-center justify-center rounded-lg ${tone.badge} px-2.5 py-1 font-mono text-sm font-black text-white`}
            data-testid="autonomy-level-badge"
          >
            L{level}
          </div>
          <div className="flex-1">
            <div className={`text-sm font-bold ${tone.text}`}>{levelName || `Level ${level}`}</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">
              Operator: <span className="text-slate-400">{humanRole || 'unknown'}</span>
            </div>
          </div>
        </div>
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
            data-testid="autonomy-open-details"
          >
            Details &rarr;
          </button>
        )}
      </div>

      {/* Degrade warnings banner */}
      {hasDegradeWarnings && (
        <div
          className="mt-3 rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2"
          data-testid="autonomy-degrade-banner"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-rose-300">
            Degrade signal active
          </div>
          <ul className="mt-1 space-y-0.5">
            {warnings.map((w) => (
              <li key={w} className="text-[11px] text-rose-200">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Capability list — only in full variant */}
      {variant === 'full' && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Permitted capabilities</span>
            <span className="font-mono text-slate-400">
              {grantedCount}/{CAPABILITY_ORDER.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5" data-testid="autonomy-capability-list">
            {CAPABILITY_ORDER.map((cap) => {
              const granted = Boolean(capabilities[cap]);
              return (
                <span
                  key={cap}
                  className={`rounded-md border px-2 py-0.5 text-[10px] ${
                    granted
                      ? `${tone.chip} border-transparent`
                      : 'border-slate-700/60 bg-slate-900/30 text-slate-600 line-through'
                  }`}
                  data-testid="autonomy-capability-chip"
                  data-capability={cap}
                  data-granted={granted ? 'true' : 'false'}
                >
                  {CAPABILITY_LABELS[cap] ?? cap}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Escalation path to next level (only if one exists) */}
      {variant === 'full' && nextReq && (
        <div className="mt-3" data-testid="autonomy-escalation-path">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest text-slate-500">
            <span>Path to L{Math.min(level + 1, 5)}</span>
            <span
              className={`font-mono ${
                snapshot.eligibleForPromotion ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {snapshot.eligibleForPromotion ? 'eligible' : 'blocked'}
            </span>
          </div>
          <ul className="space-y-0.5 text-[11px] text-slate-400">
            <li>
              <span className="text-slate-500">Max error rate:</span>{' '}
              <span className="font-mono">{formatPct(nextReq.maxErrorRate)}</span>
            </li>
            <li>
              <span className="text-slate-500">Min awareness adoption:</span>{' '}
              <span className="font-mono">{formatPct(nextReq.minAwarenessAdoption)}</span>
            </li>
            <li>
              <span className="text-slate-500">Max silent minutes:</span>{' '}
              <span className="font-mono">{nextReq.maxSilentMinutes}</span>
            </li>
            {nextReq.minCoordinations != null && (
              <li>
                <span className="text-slate-500">Min coordinations:</span>{' '}
                <span className="font-mono">{nextReq.minCoordinations}</span>
              </li>
            )}
            {nextReq.sustainedHours != null && (
              <li>
                <span className="text-slate-500">Sustained hours:</span>{' '}
                <span className="font-mono">{nextReq.sustainedHours}</span>
              </li>
            )}
            {nextReq.requiresCounterSign && (
              <li className="text-amber-300">Second operator counter-sign required.</li>
            )}
          </ul>
          {blockers.length > 0 && (
            <div className="mt-2" data-testid="autonomy-blockers">
              <div className="text-[10px] uppercase tracking-widest text-amber-400">Blockers</div>
              <ul className="mt-0.5 space-y-0.5">
                {blockers.map((b) => (
                  <li key={b} className="text-[11px] text-amber-200">
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {variant === 'full' && !nextReq && level === 5 && (
        <div className="mt-3 text-[10px] uppercase tracking-widest text-slate-500">
          Top-level autonomy — no further promotion path.
        </div>
      )}
    </>
  );

  return (
    <div
      className={`rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3`}
      role="region"
      aria-label={`WEDM autonomy: Level ${level} ${levelName}${
        hasDegradeWarnings ? ', degrade signal active' : ''
      }`}
      data-testid="wedm-autonomy-indicator"
      data-level={level}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Autonomy
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">WEDM</div>
      </div>
      {content}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatPct(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction)) return '\u2014';
  // Snapshot metrics use fractions (0–1). Display as percent with 1 decimal.
  return `${(fraction * 100).toFixed(1)}%`;
}
