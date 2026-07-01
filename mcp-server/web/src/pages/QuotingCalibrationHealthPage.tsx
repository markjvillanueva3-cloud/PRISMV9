/**
 * QuotingCalibrationHealthPage — operator view of the live quoting calibration.
 *
 * Shows: currently-active global + per-customer factors, age + staleness flag,
 * MAPE/bias projection (pre vs post), CoV verification result + escalation
 * reason, "Apply to a test quote" tool that runs predicted_usd through the
 * active-factor loader runtime bridge.
 *
 * Calls the live MCP dispatcher actions:
 *   - quoting_active_factor_get        — load factors + metadata
 *   - quoting_active_factor_apply      — apply to a test predicted_usd
 *   - quoting_calibration_derive_with_cov — re-derive + CoV verify (manual operator)
 *
 * Design per web/CLAUDE.md:
 *   - Calculator Studio dark-HUD aesthetic (no purple-on-white SaaS)
 *   - Monospace numerics, system-ui chrome
 *   - 5-color status palette (cyan/violet/emerald/amber/red)
 *   - Mobile-first: ≥44pt tap targets, responsive at 5 viewports
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-QUOTING-HEALTH-UI
 * @author slot:charlie /goal-19 (continuing), 2026-05-25
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

// ────────────────────────────────────────────────────────────────────────
// API helper — calls prism_quoting dispatcher via Express route
// ────────────────────────────────────────────────────────────────────────

interface DispatchResult<T = unknown> { ok: boolean; data?: T; error?: string }

async function callQuoting<T = unknown>(action: string, params: Record<string, unknown> = {}): Promise<DispatchResult<T>> {
  try {
    const res = await fetch('/api/mcp/quoting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, params }),
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const payload = await res.json();
    // Dispatcher returns {content: [{type:'text', text:'<json>'}]} — unwrap
    const text = payload?.content?.[0]?.text;
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object' && 'error' in parsed) {
          return { ok: false, error: String(parsed.error) };
        }
        return { ok: true, data: parsed as T };
      } catch {
        return { ok: false, error: 'json-parse-failed' };
      }
    }
    return { ok: true, data: payload as T };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────

interface CalibrationFactor {
  customer: string;
  record_count: number;
  signed_pct_error_observed: number;
  factor: number;
  factor_clamped: boolean;
  rationale: string;
}

interface ActiveFactorReadResult {
  ok: boolean;
  reason?: string;
  factors?: {
    ok: boolean;
    generated_at: string;
    source_report_signature: string;
    global: CalibrationFactor;
    per_customer: CalibrationFactor[];
    notes: string[];
  };
  metadata: {
    ok: boolean;
    reason?: string;
    generated_at?: string;
    ageMinutes?: number;
    isStale?: boolean;
    signature?: string;
    hasFactors: boolean;
    path?: string;
    cacheAgeMs?: number;
  };
}

interface ApplyResult {
  ok: boolean;
  predicted_usd: number;
  corrected_usd: number;
  factor_used: number;
  factor_source: 'per-customer' | 'global' | 'balanced-pass-through';
  fallback_used: boolean;
  fallback_reason?: string;
}

// Closed-loop training-status snapshot (latest-training-status.json), surfaced via the
// prism_quoting `training_status` action (T5 / U-QP-TRAINING-STATUS-ACTION). docustrata_actuals_match
// is the $355M / 6,718 real Orders-Closed settled-price ADVISORY signal (U-QP-TRAINCYCLE-FEED).
interface TrainingSnapshot {
  schemaVersion?: string;
  ts_iso?: string;
  ok?: boolean;
  baseline_source?: string | null;
  baseline_fallback?: {
    configured?: string;
    used?: string;
    configured_refused?: boolean;
    configured_reasons?: string[];
  } | null;
  total_predicted?: number;
  mape_pct?: number | null;
  safe_to_activate?: boolean;
  active_factor_written?: boolean;
  skip_reason?: string | null;
  data_source_coverage?: {
    consumed_count?: number;
    available_count?: number;
    coverage_pct?: number;
    unconsumed_available?: string[];
  } | null;
  real_distribution_match?: {
    verdict?: string;
    median_ratio?: number | null;
    reference_reliable?: boolean | null;
    reliability_verdict?: string | null;
    advisory?: boolean;
  } | null;
  docustrata_actuals_match?: {
    verdict?: string;
    median_ratio?: number | null;
    within_band_pct?: number | null;
    actual_total_usd?: number | null;
    actuals_priced?: number | null;
    advisory?: boolean;
  } | null;
}

// Closed-loop OODA self-observation digest (closed_loop_outcome_digest action / the
// includeOutcomeDigest branch of training_status). The behavior distribution + an ADVISORY
// health verdict (high withhold => synthetic-starved; high rollback-among-drift => uncorrectable).
interface VerdictBreakdown {
  count: number;
  rate: number;
}
interface OutcomeDigest {
  total_cycles?: number;
  by_verdict?: Record<string, VerdictBreakdown>;
  applied_rate?: number;
  withhold_rate?: number;
  rollback_rate?: number;
  no_drift_rate?: number;
  insufficient_rate?: number;
  drift_detected_count?: number;
  mean_applied_mape_delta?: number | null;
  health?: {
    healthy?: boolean;
    insufficient_cycles?: boolean;
    provenance_problem?: boolean;
    drift_uncorrectable?: boolean;
    reasons?: string[];
  };
  window?: { first_iso?: string | null; last_iso?: string | null };
}

interface TrainingStatusResult {
  ok: boolean;
  reason?: string;
  training_status?: {
    ok: boolean;
    reason?: string;
    snapshot?: TrainingSnapshot;
    isStale?: boolean;
    ageMinutes?: number;
    generated_at?: string;
    path?: string;
  };
  outcome_digest?: OutcomeDigest | null;
}

// ────────────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────────────

export function QuotingCalibrationHealthPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveFactorReadResult | null>(null);
  // T5 (U-QP-TRAINING-STATUS-ACTION): the closed-loop training-status snapshot, fetched in
  // PARALLEL with (and INDEPENDENT of) the active-factor read -- a training read failure must
  // NOT blank the factor section, and vice-versa.
  const [training, setTraining] = useState<TrainingStatusResult | null>(null);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  // Test-apply panel state
  const [testUsd, setTestUsd] = useState('100');
  const [testCustomer, setTestCustomer] = useState('');
  const [testResult, setTestResult] = useState<ApplyResult | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTrainingError(null);
    // Two independent dispatcher reads in parallel; one failing never blanks the other.
    const [factorsRes, trainRes] = await Promise.all([
      callQuoting<ActiveFactorReadResult>('quoting_active_factor_get'),
      callQuoting<TrainingStatusResult>('training_status', { includeActiveFactor: false, includeOutcomeDigest: true }),
    ]);
    setLoading(false);
    // Active-factor section (independent).
    if (!factorsRes.ok || !factorsRes.data) {
      setError(factorsRes.error ?? 'unknown error');
      setActive(null);
    } else {
      setActive(factorsRes.data);
    }
    // Training-status section (independent).
    if (!trainRes.ok || !trainRes.data) {
      setTrainingError(trainRes.error ?? 'unknown error');
      setTraining(null);
    } else {
      setTraining(trainRes.data);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleTestApply = useCallback(async () => {
    setTesting(true);
    const params: Record<string, unknown> = { predicted_usd: Number(testUsd) };
    if (testCustomer.trim()) params.customer = testCustomer.trim();
    const r = await callQuoting<ApplyResult>('quoting_active_factor_apply', params);
    setTesting(false);
    if (r.ok && r.data) setTestResult(r.data);
    else setTestResult({
      ok: false, predicted_usd: Number(testUsd), corrected_usd: Number(testUsd),
      factor_used: 1, factor_source: 'balanced-pass-through',
      fallback_used: true, fallback_reason: r.error,
    });
  }, [testUsd, testCustomer]);

  const headlineTone = useMemo(() => {
    if (!active) return 'amber';
    if (!active.ok) return 'red';
    if (active.metadata.isStale) return 'amber';
    return 'emerald';
  }, [active]);

  return (
    <div className="min-h-screen bg-[#0f1014] text-slate-100 p-4 md:p-8" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto' }}>
      <header className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400">Quoting Operations</div>
            <h1 className="text-2xl md:text-3xl font-semibold text-slate-50 mt-1 [font-family:var(--font-display)]">
              Calibration Health
            </h1>
          </div>
          <button
            onClick={() => void refresh()}
            disabled={loading}
            className="h-11 md:h-9 px-4 rounded-md border border-cyan-400/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 transition-colors disabled:opacity-50 font-medium"
            style={{ transition: '0.18s ease' }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-2 max-w-3xl">
          Live calibration factors applied to every FMV prediction emitted from <code className="text-cyan-300">prism_quoting</code>.
          Source: <code className="text-slate-300">state/shared/calibration/quoting-calibration-active.json</code>.
        </p>
      </header>

      {/* Headline status strip */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatusCard
          tone={headlineTone}
          label="Active Factors"
          value={active?.metadata.hasFactors ? 'LOADED' : 'NONE'}
          hint={active?.metadata.reason ?? (active?.metadata.hasFactors ? 'Applied to every quote' : 'No active calibration')}
        />
        <StatusCard
          tone={active?.metadata.isStale ? 'amber' : 'cyan'}
          label="Age"
          value={active?.metadata.ageMinutes !== undefined ? formatAge(active.metadata.ageMinutes) : '—'}
          hint={active?.metadata.isStale ? 'Stale (>24h) — re-derive recommended' : 'Fresh'}
        />
        <StatusCard
          tone="violet"
          label="Global Factor"
          value={active?.factors?.global.factor.toFixed(4) ?? '—'}
          hint={active?.factors?.global.rationale ?? ''}
          mono
        />
        <StatusCard
          tone="emerald"
          label="Records"
          value={String(active?.factors?.global.record_count ?? '—')}
          hint={`signed bias ${active?.factors?.global.signed_pct_error_observed?.toFixed(2) ?? '—'}%`}
        />
      </section>

      {error ? (
        <div className="mb-6 rounded-md border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          ⚠ {error}
        </div>
      ) : null}

      {/* Closed-loop training status (T5) + real-world price validation (U-QP-TRAINCYCLE-FEED) */}
      <TrainingStatusPanel training={training} trainingError={trainingError} />

      {/* Closed-loop OODA outcome health (U-QP-OUTCOME-LEDGER-DIGEST display leg) */}
      <ClosedLoopHealthPanel digest={training?.outcome_digest ?? null} />

      {/* Per-customer factors */}
      <Panel title="Per-Customer Factors" subtitle="Falls back to global when customer not listed">
        {active?.factors && active.factors.per_customer.length > 0 ? (
          <PerCustomerTable rows={active.factors.per_customer} />
        ) : (
          <div className="text-sm text-slate-400 italic py-4">
            {active?.factors
              ? 'No per-customer factors derived — all customers use the global factor (insufficient records per customer for individual derivation).'
              : 'No factors loaded.'}
          </div>
        )}
      </Panel>

      {/* Test-apply tool */}
      <Panel title="Test Apply" subtitle="Run a predicted_usd through the live calibration bridge">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-slate-400">Predicted USD</span>
            <input
              type="number"
              inputMode="decimal"
              value={testUsd}
              onChange={(e) => setTestUsd(e.target.value)}
              className="h-11 md:h-9 px-3 rounded-md border border-slate-600/40 bg-[#1a1c23] text-slate-100 font-mono"
              style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-slate-400">Customer (optional)</span>
            <input
              type="text"
              value={testCustomer}
              onChange={(e) => setTestCustomer(e.target.value)}
              placeholder="ALPHA-MFG"
              className="h-11 md:h-9 px-3 rounded-md border border-slate-600/40 bg-[#1a1c23] text-slate-100"
            />
          </label>
          <div className="flex items-end">
            <button
              onClick={() => void handleTestApply()}
              disabled={testing || !testUsd}
              className="h-11 md:h-9 w-full px-4 rounded-md border border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 font-medium"
              style={{ transition: '0.18s ease' }}
            >
              {testing ? 'Applying...' : 'Apply Calibration'}
            </button>
          </div>
        </div>

        {testResult ? <TestResultPanel result={testResult} /> : null}
      </Panel>

      {/* Metadata footer */}
      <footer className="mt-8 text-xs text-slate-500" style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}>
        <div>signature: {active?.metadata.signature ?? '—'}</div>
        <div>path: {active?.metadata.path ?? '—'}</div>
        <div>cache age: {active?.metadata.cacheAgeMs !== undefined ? `${Math.round(active.metadata.cacheAgeMs / 1000)}s` : '—'}</div>
      </footer>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Subcomponents
// ────────────────────────────────────────────────────────────────────────

function StatusCard({ tone, label, value, hint, mono }: { tone: string; label: string; value: string; hint: string; mono?: boolean }) {
  const toneClasses: Record<string, string> = {
    emerald: 'border-emerald-400/30 from-emerald-500/15',
    cyan: 'border-cyan-400/30 from-cyan-500/15',
    violet: 'border-violet-400/30 from-violet-500/15',
    amber: 'border-amber-400/30 from-amber-500/15',
    red: 'border-red-400/30 from-red-500/15',
  };
  return (
    <div className={`rounded-md border bg-gradient-to-br to-transparent ${toneClasses[tone] ?? toneClasses.cyan} p-4`}>
      <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
      <div
        className={`text-2xl font-semibold text-slate-50 mt-1 ${mono ? 'font-mono' : ''}`}
        style={mono ? { fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' } : undefined}
      >
        {value}
      </div>
      <div className="text-xs text-slate-400 mt-1 truncate" title={hint}>{hint}</div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="mb-6 rounded-md border border-slate-600/30 bg-[#1a1c23] p-4 md:p-6">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle ? <p className="text-sm text-slate-400 mt-1">{subtitle}</p> : null}
      </header>
      {children}
    </section>
  );
}

function TrainingStatusPanel({ training, trainingError }: { training: TrainingStatusResult | null; trainingError: string | null }) {
  const payload = training?.training_status;
  const snap = payload?.ok ? payload.snapshot : undefined;

  // R12 honest-empty: never a blank/fake panel -- surface the reason + how to run the loop.
  if (!snap) {
    const reason = payload?.reason ?? trainingError ?? 'unknown';
    return (
      <Panel title="Closed-Loop Training Status" subtitle="MAPE + data-source coverage from the last training cycle">
        <div className="text-sm text-amber-300/90 py-2">
          No training status -- the closed-loop training cycle has not run yet (reason: {reason}). Run{' '}
          <code className="text-cyan-300">node scripts/quoting-train-cycle.mjs</code> to populate it.
        </div>
      </Panel>
    );
  }

  const cov = snap.data_source_coverage;
  const unconsumed = cov?.unconsumed_available ?? [];
  const fb = snap.baseline_fallback;
  const dm = snap.docustrata_actuals_match;
  const rm = snap.real_distribution_match;

  return (
    <Panel title="Closed-Loop Training Status" subtitle="MAPE + data-source coverage from the last training cycle">
      {payload?.isStale ? (
        <div className="mb-3 text-xs text-amber-300">
          Snapshot stale (age {payload.ageMinutes ?? '?'}m) -- the loop may have stopped running.
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label="MAPE" value={typeof snap.mape_pct === 'number' ? `${snap.mape_pct.toFixed(1)}%` : 'n/a'} />
        <KV label="Coverage" value={typeof cov?.coverage_pct === 'number' ? `${cov.coverage_pct}%` : 'n/a'} />
        <KV label="Records" value={typeof snap.total_predicted === 'number' ? snap.total_predicted.toLocaleString() : 'n/a'} />
        <KV
          label="Factor Activated"
          value={snap.active_factor_written ? 'YES' : 'NO (dry-run)'}
          tone={snap.active_factor_written ? 'emerald' : 'amber'}
        />
      </div>

      <div className="mt-3 text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>{cov?.consumed_count ?? 0}/{cov?.available_count ?? 0} sources consumed</span>
        {unconsumed.length > 0 ? (
          <span>
            unconsumed:{' '}
            {unconsumed.map((u) => (
              <code key={u} className="text-amber-300 mx-0.5">{u}</code>
            ))}
          </span>
        ) : null}
      </div>

      {snap.skip_reason ? (
        <div className="mt-2 text-xs">
          <span className="text-slate-400">Why Dormant: </span>
          <code className="text-amber-300">{snap.skip_reason}</code>
        </div>
      ) : null}

      {fb ? (
        <div className="mt-2 text-xs text-slate-400">
          baseline fallback: configured <code className="text-amber-300">{fb.configured}</code>{' '}
          {fb.configured_refused ? 'refused -> used' : 'used'} <code className="text-cyan-300">{fb.used}</code>
          {fb.configured_reasons && fb.configured_reasons.length > 0 ? (
            <span> (reasons: {fb.configured_reasons.join(', ')})</span>
          ) : null}
        </div>
      ) : null}

      {/* U-QP-TRAINCYCLE-FEED: real-world price validation -- Kienzle predicted FMV vs the REAL
          settled prices. ADVISORY (never alters the factor); only renders when the match ran. */}
      {dm && dm.advisory ? (
        <RealWorldMatch label="Real Orders-Closed actuals (JM settled-price corpus)" m={dm} showDollars />
      ) : null}
      {rm && rm.verdict ? <RealWorldMatch label="Outbound sold-orders distribution" m={rm} /> : null}
    </Panel>
  );
}

function RealWorldMatch({
  label,
  m,
  showDollars,
}: {
  label: string;
  m: {
    verdict?: string;
    median_ratio?: number | null;
    within_band_pct?: number | null;
    actual_total_usd?: number | null;
    actuals_priced?: number | null;
  };
  showDollars?: boolean;
}) {
  const verdictTone =
    m.verdict === 'calibrated' ? 'emerald' : m.verdict === 'over-quoting' || m.verdict === 'under-quoting' ? 'amber' : 'slate';
  return (
    <div className="mt-3 rounded-md border border-violet-400/20 bg-violet-500/5 p-3">
      <div className="text-xs text-slate-300 font-medium">
        {label} <span className="text-slate-500">(ADVISORY -- never alters the factor)</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
        <KV label="Verdict" value={m.verdict ?? 'n/a'} tone={verdictTone} />
        <KV label="Median ratio" value={typeof m.median_ratio === 'number' ? m.median_ratio.toFixed(2) : 'n/a'} />
        {showDollars && typeof m.actual_total_usd === 'number' ? (
          <KV label="Real $ total" value={`$${Math.round(m.actual_total_usd).toLocaleString()}`} />
        ) : null}
        {showDollars && typeof m.actuals_priced === 'number' ? (
          <KV label="Actuals priced" value={m.actuals_priced.toLocaleString()} />
        ) : null}
      </div>
    </div>
  );
}

function ClosedLoopHealthPanel({ digest }: { digest: OutcomeDigest | null }) {
  // Renders only when the digest was requested + present. Absent -> nothing (the TrainingStatusPanel
  // already covers the "loop never ran" empty case; a null digest here is just "not requested").
  if (!digest || typeof digest.total_cycles !== 'number') return null;

  const h = digest.health ?? {};
  const healthLabel = h.insufficient_cycles ? 'INSUFFICIENT' : h.healthy ? 'HEALTHY' : 'NEEDS ATTENTION';
  const healthTone = h.insufficient_cycles ? 'amber' : h.healthy ? 'emerald' : 'red';
  const byVerdict = digest.by_verdict ?? {};
  // Canonical verdict order (mirrors the engine's ALL_CYCLE_VERDICTS) so a 0-count verdict still
  // shows -- "never promoted" / "never rolled back" is itself a signal.
  const verdictOrder = ['PROMOTED', 'NO_DRIFT_NO_OP', 'ROLLED_BACK', 'WITHHELD_SYNTHETIC', 'INSUFFICIENT_DATA', 'STAGE_FAILED'];
  const pct = (r?: number) => `${Math.round((typeof r === 'number' ? r : 0) * 100)}%`;

  return (
    <Panel
      title="Closed-Loop Outcome Health"
      subtitle="OODA self-observation: terminal-verdict distribution + advisory health from the cycle ledger"
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KV label="Cycles" value={digest.total_cycles.toLocaleString()} />
        <KV label="Health" value={healthLabel} tone={healthTone} />
        <KV label="Applied" value={pct(digest.applied_rate)} tone="emerald" />
        <KV label="Withheld" value={pct(digest.withhold_rate)} tone={h.provenance_problem ? 'amber' : 'slate'} />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm" style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}>
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-slate-600/30">
              <th className="py-2 pr-4">Verdict</th>
              <th className="py-2 pr-4 text-right">Cycles</th>
              <th className="py-2 text-right">Rate</th>
            </tr>
          </thead>
          <tbody>
            {verdictOrder.map((v) => {
              const b = byVerdict[v] ?? { count: 0, rate: 0 };
              return (
                <tr key={v} className="border-b border-slate-600/15 hover:bg-cyan-500/5">
                  <td className="py-2 pr-4 text-slate-200">{v}</td>
                  <td className="py-2 pr-4 text-right text-slate-300">{b.count}</td>
                  <td className="py-2 text-right text-cyan-300">{pct(b.rate)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {h.reasons && h.reasons.length > 0 ? (
        <div className="mt-3 text-xs text-amber-300/90">
          {h.reasons.map((r, i) => (
            <div key={i}>- {r}</div>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

function PerCustomerTable({ rows }: { rows: CalibrationFactor[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}>
        <thead>
          <tr className="text-left text-xs uppercase tracking-widest text-slate-400 border-b border-slate-600/30">
            <th className="py-2 pr-4">Customer</th>
            <th className="py-2 pr-4 text-right">Records</th>
            <th className="py-2 pr-4 text-right">Bias %</th>
            <th className="py-2 pr-4 text-right">Factor</th>
            <th className="py-2">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.customer} className="border-b border-slate-600/15 hover:bg-cyan-500/5">
              <td className="py-2 pr-4 text-slate-100">{r.customer}</td>
              <td className="py-2 pr-4 text-right text-slate-300">{r.record_count}</td>
              <td className="py-2 pr-4 text-right text-slate-300">{r.signed_pct_error_observed.toFixed(2)}</td>
              <td className="py-2 pr-4 text-right text-cyan-300">{r.factor.toFixed(4)}</td>
              <td className="py-2 text-xs text-slate-400">{r.factor_clamped ? '⚠ clamped' : r.rationale}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TestResultPanel({ result }: { result: ApplyResult }) {
  const tone = result.fallback_used ? 'amber' : 'emerald';
  const toneClasses: Record<string, string> = {
    emerald: 'border-emerald-400/30 bg-emerald-500/8',
    amber: 'border-amber-400/30 bg-amber-500/8',
  };
  return (
    <div className={`rounded-md border ${toneClasses[tone]} p-4`} style={{ fontFamily: 'ui-monospace, "JetBrains Mono", "SF Mono", Consolas, monospace' }}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <KV label="Predicted" value={`$${result.predicted_usd.toFixed(2)}`} />
        <KV label="Corrected" value={`$${result.corrected_usd.toFixed(2)}`} tone={result.fallback_used ? 'slate' : 'emerald'} />
        <KV label="Factor" value={result.factor_used.toFixed(4)} />
        <KV label="Source" value={result.factor_source} tone={result.fallback_used ? 'amber' : 'cyan'} />
      </div>
      {result.fallback_used ? (
        <div className="mt-3 text-xs text-amber-300">⚠ Fallback used: {result.fallback_reason ?? 'unknown'}</div>
      ) : null}
    </div>
  );
}

function KV({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-300',
    cyan: 'text-cyan-300',
    amber: 'text-amber-300',
    slate: 'text-slate-300',
  };
  const color = colorMap[tone ?? ''] ?? 'text-slate-100';
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-slate-400">{label}</div>
      <div className={`mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = minutes / 60;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default QuotingCalibrationHealthPage;
