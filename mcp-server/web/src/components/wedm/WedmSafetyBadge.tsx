/**
 * WedmSafetyBadge — P2P-FULLSTACK-MS0/U-P2PFS44
 *
 * Real-time safety envelope badge for the 6 WEDM physical constraints
 * tracked by WEDMSafetyEnvelopeEngine (U-P4-05). Renders each constraint
 * as a row with:
 *   - Name + unit
 *   - Current reading
 *   - Limit range (min–max)
 *   - Status tone (ok / warning / critical)
 *
 * The overall badge takes the **worst-case** status across all 6
 * constraints and colors its border + top-right pill accordingly, so the
 * component reads like a single "is the machine inside envelope?" indicator
 * at a glance but drills into per-constraint state when needed.
 *
 * The 6 constraints (per WEDMSafetyEnvelopeEngine):
 *   1. Wire tension         [gf]
 *   2. Spark-gap voltage    [V]
 *   3. Water resistivity    [MΩ·cm]
 *   4. Tank level           [%]
 *   5. Axis travel          [mm]  (worst-case across X/Y/U/V/Z_upper/Z_lower)
 *   6. Wire break count     [count-in-window]
 *
 * Zero backend dependency — pure presentational, consumes a snapshot.
 */

// ============================================================================
// TYPES (mirror WEDMSafetyEnvelopeEngine's EnvelopeReport/Violation shape)
// ============================================================================

export type EnvelopeSeverity = 'ok' | 'warning' | 'critical';

export interface WedmSafetyConstraintState {
  /** Canonical identifier (matches one of the 6 groups). */
  id:
    | 'wire_tension'
    | 'gap_voltage'
    | 'resistivity'
    | 'tank_level'
    | 'axis_travel'
    | 'wire_breaks';
  /** Display label. */
  label: string;
  /** Current reading value; null = unknown/not sampled. */
  value: number | null;
  /** Display unit (e.g. "gf", "V", "MΩ·cm", "%", "mm", "count"). */
  unit: string;
  /** Soft/hard range for context (either can be null). */
  min: number | null;
  max: number | null;
  /** Effective severity for this constraint given the current reading. */
  status: EnvelopeSeverity;
  /** Human reason when non-ok (e.g. "approaching low tension limit"). */
  reason?: string;
}

export interface WedmSafetyEnvelopeSnapshot {
  /** Envelope ID (e.g. "JM_DIE_MV2400S"). */
  envelopeId: string;
  /** 6 constraint rows, stable order. */
  constraints: WedmSafetyConstraintState[];
  /** Latest sample time, ISO string. */
  sampledAt?: string | null;
}

// ============================================================================
// TONE TABLE
// ============================================================================

interface SeverityTone {
  border: string;
  bg: string;
  text: string;
  badge: string;
  rowBg: string;
}

const SEVERITY_TONES: Record<EnvelopeSeverity, SeverityTone> = {
  ok: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-950/20',
    text: 'text-emerald-300',
    badge: 'bg-emerald-500',
    rowBg: 'bg-emerald-950/10',
  },
  warning: {
    border: 'border-amber-500/50',
    bg: 'bg-amber-950/25',
    text: 'text-amber-300',
    badge: 'bg-amber-500',
    rowBg: 'bg-amber-950/15',
  },
  critical: {
    border: 'border-rose-500/60',
    bg: 'bg-rose-950/40',
    text: 'text-rose-300',
    badge: 'bg-rose-600',
    rowBg: 'bg-rose-950/25',
  },
};

const SEVERITY_LABEL: Record<EnvelopeSeverity, string> = {
  ok: 'WITHIN ENVELOPE',
  warning: 'APPROACHING LIMIT',
  critical: 'OUT OF SPEC',
};

const SEVERITY_RANK: Record<EnvelopeSeverity, number> = { ok: 0, warning: 1, critical: 2 };

// ============================================================================
// COMPONENT
// ============================================================================

export interface WedmSafetyBadgeProps {
  snapshot: WedmSafetyEnvelopeSnapshot | null | undefined;
  /** If true, render only the top-level badge (no per-constraint rows). */
  compact?: boolean;
  /** Optional click handler for drilling into details. */
  onOpenDetails?: () => void;
}

export function WedmSafetyBadge({
  snapshot,
  compact = false,
  onOpenDetails,
}: WedmSafetyBadgeProps) {
  if (!snapshot) return null;

  const constraints = Array.isArray(snapshot.constraints) ? snapshot.constraints : [];
  const overall = worstSeverity(constraints);
  const tone = SEVERITY_TONES[overall];

  const criticalCount = constraints.filter((c) => c.status === 'critical').length;
  const warningCount = constraints.filter((c) => c.status === 'warning').length;

  const needsAttention = overall !== 'ok';

  return (
    <div
      className={`${needsAttention ? 'calculator-warning-attention ' : ''}rounded-2xl border ${tone.border} ${tone.bg} px-4 py-3`}
      role="region"
      aria-label={`Safety envelope: ${SEVERITY_LABEL[overall]}, ${criticalCount} critical, ${warningCount} warning`}
      data-testid="wedm-safety-badge"
      data-overall-severity={overall}
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Safety envelope
          {snapshot.envelopeId && (
            <span className="ml-2 text-[10px] normal-case text-slate-500">
              &middot; {snapshot.envelopeId}
            </span>
          )}
        </div>
        <div
          className={`min-h-[24px] flex items-center gap-2 rounded-full ${tone.badge} px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white`}
          data-testid="safety-badge-pill"
        >
          {SEVERITY_LABEL[overall]}
        </div>
      </div>

      {/* Summary counters */}
      <div className="mb-2 flex items-center gap-3 text-[11px]">
        <span className="text-slate-500">
          {constraints.length}{' '}
          {constraints.length === 1 ? 'constraint' : 'constraints'}
        </span>
        {criticalCount > 0 && (
          <span
            className="font-mono text-rose-300"
            data-testid="safety-critical-count"
          >
            {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span
            className="font-mono text-amber-300"
            data-testid="safety-warning-count"
          >
            {warningCount} warning
          </span>
        )}
        {criticalCount === 0 && warningCount === 0 && (
          <span className="font-mono text-emerald-300" data-testid="safety-all-ok">
            all within envelope
          </span>
        )}
        {onOpenDetails && (
          <button
            type="button"
            onClick={onOpenDetails}
            className="ml-auto text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-200"
            data-testid="safety-open-details"
          >
            Details &rarr;
          </button>
        )}
      </div>

      {/* Per-constraint rows (only in non-compact mode) */}
      {!compact && constraints.length > 0 && (
        <div className="space-y-1" data-testid="safety-constraint-list">
          {constraints.map((c) => (
            <ConstraintRow key={c.id} constraint={c} />
          ))}
        </div>
      )}

      {snapshot.sampledAt && (
        <div className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
          Sampled {snapshot.sampledAt}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CONSTRAINT ROW
// ============================================================================

function ConstraintRow({ constraint }: { constraint: WedmSafetyConstraintState }) {
  const tone = SEVERITY_TONES[constraint.status];
  return (
    <div
      className={`rounded-lg border border-slate-700/40 ${tone.rowBg} px-2.5 py-1.5`}
      data-testid="safety-constraint-row"
      data-constraint-id={constraint.id}
      data-severity={constraint.status}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 text-[11px] text-slate-300">{constraint.label}</div>
        <div className="text-right font-mono text-[11px] text-slate-200">
          {formatValue(constraint.value)}
          <span className="ml-1 text-[10px] font-normal text-slate-500">{constraint.unit}</span>
        </div>
        <div
          className={`min-w-[50px] rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white ${tone.badge}`}
        >
          {constraint.status}
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[10px] text-slate-500">
        <span>
          limit: {formatLimit(constraint.min, constraint.max)}{' '}
          <span className="text-slate-600">{constraint.unit}</span>
        </span>
        {constraint.reason && constraint.status !== 'ok' && (
          <span className={`${tone.text} truncate`} data-testid="safety-constraint-reason">
            {constraint.reason}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function worstSeverity(constraints: WedmSafetyConstraintState[]): EnvelopeSeverity {
  let worst: EnvelopeSeverity = 'ok';
  for (const c of constraints) {
    if ((SEVERITY_RANK[c.status] ?? 0) > SEVERITY_RANK[worst]) {
      worst = c.status;
    }
  }
  return worst;
}

function formatValue(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return '\u2014';
  // Scale decimals to reading magnitude.
  const abs = Math.abs(v);
  if (abs >= 100) return v.toFixed(0);
  if (abs >= 10) return v.toFixed(1);
  return v.toFixed(2);
}

function formatLimit(min: number | null, max: number | null): string {
  const lo = min == null || !Number.isFinite(min) ? '\u2014' : formatValue(min);
  const hi = max == null || !Number.isFinite(max) ? '\u2014' : formatValue(max);
  if (min == null && max == null) return '\u2014';
  if (min == null) return `≤ ${hi}`;
  if (max == null) return `≥ ${lo}`;
  return `${lo}–${hi}`;
}
