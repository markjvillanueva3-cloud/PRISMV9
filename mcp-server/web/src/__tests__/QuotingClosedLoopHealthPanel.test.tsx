// @vitest-environment jsdom
/**
 * QuotingClosedLoopHealthPanel.test.tsx -- front-to-back contract test for the
 * closed-loop outcome-digest consumer (U-QP-CLOSED-LOOP-HEALTH-PANEL).
 *
 * WHY this test exists (R9 -- tests verify intent, not behavior):
 * The page's ClosedLoopHealthPanel parses the EXACT digest shape emitted by
 * QuotingOutcomeLedgerDigestEngine.digest() (closed_loop_outcome_digest action):
 * total_cycles / by_verdict / health.{healthy,insufficient_cycles,provenance_problem,
 * drift_uncorrectable,reasons} / drift_detected_count / mean_applied_mape_delta / window.
 * A field rename upstream would silently degrade every value -- these tests assert the
 * EXACT rendered values AND the contrasting branch's absence, so a rename FAILS here first.
 *
 * Cases: happy (healthy digest renders verdict + full by_verdict distribution) +
 * 3 failure/edge (zero-ledger insufficient-cycles / provenance-problem verdict /
 * transport failure keeps sibling panels alive -- Promise.all independence) +
 * 2 adversarial (malformed digest shape degrades honestly, never half-renders /
 * null mean-delta + unknown future verdict tolerated).
 *
 * @author slot:charlie (closed-loop DISPLAY leg step 2), 2026-06-12
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QuotingCalibrationHealthPage } from '../pages/QuotingCalibrationHealthPage';

// -- A valid active-factor read so the page's parallel sibling call never errors --
const OK_FACTORS = {
  ok: true,
  metadata: {
    ok: true,
    hasFactors: true,
    ageMinutes: 30,
    isStale: false,
    signature: 'sig-1',
    generated_at: '2026-06-11T00:00:00Z',
    path: 'state/shared/calibration/quoting-calibration-active.json',
  },
  factors: {
    ok: true,
    generated_at: '2026-06-11T00:00:00Z',
    source_report_signature: 'sig-1',
    global: {
      customer: '__global__',
      record_count: 42,
      signed_pct_error_observed: -3.1,
      factor: 1.0234,
      factor_clamped: false,
      rationale: 'global derive',
    },
    per_customer: [],
    notes: [],
  },
};

// -- A valid training-status read so the sibling training panel stays healthy --
const OK_TRAINING = {
  ok: true,
  training_status: {
    ok: true,
    snapshot: {
      schemaVersion: '1.0.0',
      ts_iso: '2026-06-11T00:00:00Z',
      ok: true,
      baseline_source: 'outbound-sold-orders',
      baseline_fallback: null,
      total_predicted: 1234,
      mape_pct: 12.5,
      safe_to_activate: true,
      active_factor_written: true,
      skip_reason: null,
      data_source_coverage: {
        consumed_count: 2,
        available_count: 3,
        coverage_pct: 67,
        unconsumed_available: ['vendor_cost_index'],
      },
      baseline_warnings: [],
    },
    schemaVersion: '1.0.0',
    generated_at: '2026-06-11T00:00:00Z',
    ageMinutes: 30,
    isStale: false,
    path: 'state/shared/quoting/latest-training-status.json',
  },
};

/** Healthy digest -- counts chosen so every "count (rate%)" cell is DISTINCT
 *  (16+8+4+2+1+0 = 31), making exact-match assertions unambiguous. */
function digestHealthy(overrides: Record<string, unknown> = {}) {
  return {
    total_cycles: 31,
    by_verdict: {
      PROMOTED: { count: 16, rate: 16 / 31 },
      NO_DRIFT_NO_OP: { count: 8, rate: 8 / 31 },
      ROLLED_BACK: { count: 4, rate: 4 / 31 },
      WITHHELD_SYNTHETIC: { count: 2, rate: 2 / 31 },
      INSUFFICIENT_DATA: { count: 1, rate: 1 / 31 },
      STAGE_FAILED: { count: 0, rate: 0 },
    },
    applied_rate: 16 / 31,
    withhold_rate: 2 / 31,
    rollback_rate: 4 / 31,
    no_drift_rate: 8 / 31,
    insufficient_rate: 1 / 31,
    drift_detected_count: 20,
    mean_applied_mape_delta: -1.37,
    health: {
      healthy: true,
      insufficient_cycles: false,
      provenance_problem: false,
      drift_uncorrectable: false,
      reasons: ['healthy: no provenance or uncorrectable-drift signal'],
    },
    window: { first_iso: '2026-06-01T00:00:00Z', last_iso: '2026-06-11T00:00:00Z' },
    ...overrides,
  };
}

const HTTP_ERROR = Symbol('http-error');

/** Stub global fetch routed by POSTed { action }, returning the dispatcher's
 *  {content:[{type:'text', text}]} envelope. HTTP_ERROR -> non-2xx Response. */
function mockQuoting(routes: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: unknown, init?: { body?: string }) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const entry = routes[body.action as string];
      if (entry === HTTP_ERROR) {
        return { ok: false, status: 503, json: async () => ({}) } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ content: [{ type: 'text', text: JSON.stringify(entry) }] }),
      } as unknown as Response;
    }),
  );
}

const BASE_ROUTES = {
  quoting_active_factor_get: OK_FACTORS,
  training_status: OK_TRAINING,
};

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuotingCalibrationHealthPage -- closed-loop outcome-digest consumer', () => {
  it('renders the health verdict + EXACT by_verdict distribution from a healthy digest', async () => {
    mockQuoting({ ...BASE_ROUTES, closed_loop_outcome_digest: digestHealthy() });
    render(<QuotingCalibrationHealthPage />);

    const title = await screen.findByText('Closed-Loop Outcome Health');
    expect(title.textContent).toBe('Closed-Loop Outcome Health');

    // Verdict + headline numbers (exact -- a wrong-field read changes these).
    expect(screen.getByText('HEALTHY').textContent).toBe('HEALTHY');
    expect(screen.getByText('31').textContent).toBe('31'); // total_cycles.toLocaleString()
    expect(screen.getByText('20').textContent).toBe('20'); // drift_detected_count
    expect(screen.getByText('-1.37').textContent).toBe('-1.37'); // mean_applied_mape_delta.toFixed(2)

    // Full distribution -- every verdict row with its exact "count (rate%)" cell.
    expect(screen.getByText('PROMOTED').textContent).toBe('PROMOTED');
    expect(screen.getByText('16 (51.6%)').textContent).toBe('16 (51.6%)');
    expect(screen.getByText('8 (25.8%)').textContent).toBe('8 (25.8%)');
    expect(screen.getByText('4 (12.9%)').textContent).toBe('4 (12.9%)');
    expect(screen.getByText('2 (6.5%)').textContent).toBe('2 (6.5%)');
    expect(screen.getByText('1 (3.2%)').textContent).toBe('1 (3.2%)');
    expect(screen.getByText('0 (0.0%)').textContent).toBe('0 (0.0%)'); // STAGE_FAILED zero-fill IS a signal
    expect(screen.getByText(/healthy: no provenance/).textContent).toContain('no provenance');

    // CONTRAST: the digest branch rendered, so the empty branch must be absent.
    expect(screen.queryByText(/No closed-loop outcome digest/)).toBeNull();
  });

  it('shows INSUFFICIENT CYCLES (not HEALTHY, not PROBLEM) on a zero-cycle ledger', async () => {
    const zero = { count: 0, rate: 0 };
    mockQuoting({
      ...BASE_ROUTES,
      closed_loop_outcome_digest: digestHealthy({
        total_cycles: 0,
        by_verdict: {
          PROMOTED: zero,
          NO_DRIFT_NO_OP: zero,
          ROLLED_BACK: zero,
          WITHHELD_SYNTHETIC: zero,
          INSUFFICIENT_DATA: zero,
          STAGE_FAILED: zero,
        },
        drift_detected_count: 0,
        mean_applied_mape_delta: null,
        health: {
          healthy: false,
          insufficient_cycles: true,
          provenance_problem: false,
          drift_uncorrectable: false,
          reasons: ['insufficient cycles for health assessment (0 < 5)'],
        },
        window: { first_iso: null, last_iso: null },
      }),
    });
    render(<QuotingCalibrationHealthPage />);

    const verdict = await screen.findByText('INSUFFICIENT CYCLES');
    expect(verdict.textContent).toBe('INSUFFICIENT CYCLES');
    expect(screen.getByText(/insufficient cycles for health assessment \(0 < 5\)/).textContent).toContain('0 < 5');
    // All six verdicts zero-fill -- the distribution still renders every row.
    expect(screen.getAllByText('0 (0.0%)')).toHaveLength(6);
    // CONTRAST: neither of the other verdict labels may render.
    expect(screen.queryByText('HEALTHY')).toBeNull();
    expect(screen.queryByText('PROBLEM')).toBeNull();
  });

  it('surfaces a provenance PROBLEM verdict with the starved-of-actuals reason', async () => {
    mockQuoting({
      ...BASE_ROUTES,
      closed_loop_outcome_digest: digestHealthy({
        health: {
          healthy: false,
          insufficient_cycles: false,
          provenance_problem: true,
          drift_uncorrectable: false,
          reasons: ['provenance problem: 60% of cycles withheld-synthetic (>= 50%) -- loop is starved of real actuals'],
        },
      }),
    });
    render(<QuotingCalibrationHealthPage />);

    const verdict = await screen.findByText('PROBLEM');
    expect(verdict.textContent).toBe('PROBLEM');
    expect(screen.getByText(/starved of real actuals/).textContent).toContain('starved of real actuals');
    expect(screen.queryByText('HEALTHY')).toBeNull();
  });

  it('keeps the sibling panels alive when the digest read transport-fails (Promise.all independence)', async () => {
    mockQuoting({ ...BASE_ROUTES, closed_loop_outcome_digest: HTTP_ERROR });
    render(<QuotingCalibrationHealthPage />);

    // Active factors + training status still render their real values...
    const loaded = await screen.findByText('LOADED');
    expect(loaded.textContent).toBe('LOADED');
    expect((await screen.findByText('12.5%')).textContent).toBe('12.5%');
    // ...and the digest panel degrades to the honest empty message naming the transport error.
    const empty = screen.getByText(/No closed-loop outcome digest/);
    expect(empty.textContent).toContain('HTTP 503');
    // CONTRAST: no digest values may render when the read failed.
    expect(screen.queryByText('HEALTHY')).toBeNull();
    expect(screen.queryByText('16 (51.6%)')).toBeNull();
  });

  it('ADVERSARIAL: a malformed digest (missing by_verdict) degrades honestly, never half-renders', async () => {
    mockQuoting({
      ...BASE_ROUTES,
      closed_loop_outcome_digest: { total_cycles: 5, health: { healthy: true, reasons: [] } },
    });
    render(<QuotingCalibrationHealthPage />);

    const empty = await screen.findByText(/No closed-loop outcome digest/);
    expect(empty.textContent).toContain('digest-shape-invalid');
    // CONTRAST: no partial render of the half-present fields.
    expect(screen.queryByText('HEALTHY')).toBeNull();
    expect(screen.queryByText('5')).toBeNull();
  });

  it('ADVERSARIAL: null mean-delta renders -- and an unknown future verdict is tolerated', async () => {
    mockQuoting({
      ...BASE_ROUTES,
      closed_loop_outcome_digest: digestHealthy({
        mean_applied_mape_delta: null,
        by_verdict: {
          PROMOTED: { count: 16, rate: 16 / 31 },
          SOME_FUTURE_VERDICT: { count: 15, rate: 15 / 31 },
        },
      }),
    });
    render(<QuotingCalibrationHealthPage />);

    await screen.findByText('HEALTHY');
    // null mean-delta -> the honest '--' placeholder (exact, unique on this page state).
    expect(screen.getByText('--').textContent).toBe('--');
    // Forward-compat: an unrecognized verdict still renders as a distribution row.
    expect(screen.getByText('SOME_FUTURE_VERDICT').textContent).toBe('SOME_FUTURE_VERDICT');
    expect(screen.getByText('15 (48.4%)').textContent).toBe('15 (48.4%)');
  });
});
