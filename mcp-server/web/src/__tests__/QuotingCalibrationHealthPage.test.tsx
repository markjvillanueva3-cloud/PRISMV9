// @vitest-environment jsdom
/**
 * QuotingCalibrationHealthPage.test.tsx -- front-to-back contract test for the
 * closed-loop training-status consumer (T5, U-QP-TRAINING-STATUS-ACTION).
 *
 * WHY this test exists (R9 -- tests verify intent, not behavior):
 * The page's TrainingStatusPanel parses a SPECIFIC backend snapshot shape emitted by
 * quoting-train-cycle.mjs -> buildTrainingStatusSnapshot (latest-training-status.json):
 * mape_pct / data_source_coverage / baseline_fallback / skip_reason / ts_iso. If a future
 * session renames any of those fields, the panel silently degrades every value to "--" with
 * NO failing test -- the exact silent-breakage class charlie guards against. These tests assert
 * the EXACT rendered values (not mere presence) AND assert the contrasting branch is absent,
 * so a field rename or a wrong-branch render FAILS here first.
 *
 * The page reaches the dispatcher via a LOCAL callQuoting() -> fetch('/api/mcp/quoting')
 * (NOT the ../api/client module), so we stub global fetch (the network boundary) and route by
 * the request's `action`, returning the real dispatcher envelope {content:[{type:'text', text}]}.
 *
 * Cases: happy (snapshot values render, empty branch absent) + 3 failure/edge (no-snapshot
 * honest message + snapshot values absent / stale warn / fallback-corpus poison-guard) +
 * 2 adversarial (training read failure must NOT blank the active-factor section -- the
 * documented Promise.all independence; dormant skip_reason surfaced, activated state absent).
 *
 * @author slot:charlie (CONTEXT-RETENTION re-mine ROI #1 / T5), 2026-06-11
 */
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QuotingCalibrationHealthPage } from '../pages/QuotingCalibrationHealthPage';

// ── A valid active-factor read so the page's first parallel call never errors ──
// (training-status assertions are independent of this; it just keeps the page healthy.)
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

// ── Default healthy training-status snapshot (the dispatcher's training_status result) ──
function trainingOk(overrides: Record<string, unknown> = {}, snapOverrides: Record<string, unknown> = {}) {
  return {
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
        ...snapOverrides,
      },
      schemaVersion: '1.0.0',
      generated_at: '2026-06-11T00:00:00Z',
      ageMinutes: 30,
      isStale: false,
      path: 'state/shared/quoting/latest-training-status.json',
      ...overrides,
    },
  };
}

const HTTP_ERROR = Symbol('http-error');

/**
 * Stub global fetch to route by the POSTed { action } and return the dispatcher's
 * {content:[{type:'text', text}]} envelope. A route value of HTTP_ERROR returns a non-2xx
 * Response so callQuoting's `!res.ok` branch fires (the transport-failure path).
 */
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

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuotingCalibrationHealthPage -- training-status consumer (T5)', () => {
  it('renders the EXACT snapshot values (MAPE / coverage / records) from training_status', async () => {
    mockQuoting({ quoting_active_factor_get: OK_FACTORS, training_status: trainingOk() });
    render(<QuotingCalibrationHealthPage />);

    // findBy* waits for the on-mount Promise.all to resolve and re-render the panel.
    const panelTitle = await screen.findByText('Closed-Loop Training Status');
    expect(panelTitle.textContent).toBe('Closed-Loop Training Status');

    // Exact derived values -- a wrong-field read or wrong formatter would change these.
    expect(screen.getByText('12.5%').textContent).toBe('12.5%'); // mape_pct.toFixed(1)
    expect(screen.getByText('67%').textContent).toBe('67%'); // data_source_coverage.coverage_pct
    expect(screen.getByText('2/3 sources consumed').textContent).toBe('2/3 sources consumed');
    expect(screen.getByText('1,234').textContent).toBe('1,234'); // total_predicted.toLocaleString()
    expect(screen.getByText('vendor_cost_index').textContent).toBe('vendor_cost_index'); // unconsumed gap

    // CONTRAST: the snapshot branch rendered, so the empty/honest-fallback branch must be absent.
    expect(screen.queryByText(/No training status/)).toBeNull();
  });

  it('shows an honest "no training status" message AND no snapshot values when the loop never ran', async () => {
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: {
        ok: false,
        training_status: { ok: false, reason: 'training-status-file-missing', path: 'state/shared/quoting/latest-training-status.json' },
      },
    });
    render(<QuotingCalibrationHealthPage />);

    // R12 honest empty: surfaces the reason + how to run the loop, never a blank/fake panel.
    const empty = await screen.findByText(/No training status/);
    expect(empty.textContent).toContain('training-status-file-missing');
    // CONTRAST: with no snapshot, NO numeric value cards may render.
    expect(screen.queryByText('12.5%')).toBeNull();
    expect(screen.queryByText('67%')).toBeNull();
  });

  it('warns the loop may have stopped when the snapshot is stale', async () => {
    mockQuoting({ quoting_active_factor_get: OK_FACTORS, training_status: trainingOk({ isStale: true }) });
    render(<QuotingCalibrationHealthPage />);

    // ASCII-only assertion (the source hint carries an em-dash before this phrase).
    const stale = await screen.findByText(/the loop may have stopped running/);
    expect(stale.textContent).toContain('the loop may have stopped running');
    // The snapshot still renders its value alongside the stale warning.
    expect(screen.getByText('12.5%').textContent).toBe('12.5%');
  });

  it('surfaces the poison-guard fallback-corpus provenance (configured refused -> used)', async () => {
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: trainingOk(
        {},
        {
          baseline_fallback: {
            configured: 'synthetic-baseline',
            used: 'outbound-sold',
            configured_refused: true,
            configured_reasons: ['stale-distribution'],
          },
        },
      ),
    });
    render(<QuotingCalibrationHealthPage />);

    // The configured + used baselines render as isolated <code> nodes; the reason is listed.
    const configured = await screen.findByText('synthetic-baseline');
    expect(configured.textContent).toBe('synthetic-baseline');
    expect(screen.getByText('outbound-sold').textContent).toBe('outbound-sold');
    expect(screen.getByText(/stale-distribution/).textContent).toContain('stale-distribution');
  });

  it('keeps the active-factor section alive when the training read fails (Promise.all independence)', async () => {
    // training_status transport-fails; active_factor_get succeeds. One failing read must NOT
    // blank the other (the page documents this independence in refresh()).
    mockQuoting({ quoting_active_factor_get: OK_FACTORS, training_status: HTTP_ERROR });
    render(<QuotingCalibrationHealthPage />);

    // Active factors still render their real value...
    const loaded = await screen.findByText('LOADED');
    expect(loaded.textContent).toBe('LOADED');
    // ...and the training panel degrades to the honest no-status message, not a crash/blank.
    const noStatus = screen.getByText(/closed-loop training cycle has not run yet/);
    expect(noStatus.textContent).toContain('closed-loop training cycle has not run yet');
    // CONTRAST: training values must NOT appear when the training read failed.
    expect(screen.queryByText('12.5%')).toBeNull();
  });

  it('explains WHY a factor is dormant via skip_reason when not activated', async () => {
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: trainingOk({}, { active_factor_written: false, safe_to_activate: false, skip_reason: 'mape-above-gate' }),
    });
    render(<QuotingCalibrationHealthPage />);

    expect((await screen.findByText('mape-above-gate')).textContent).toBe('mape-above-gate'); // Why Dormant
    expect(screen.getByText('NO (dry-run)').textContent).toBe('NO (dry-run)'); // Factor Activated
    // CONTRAST: the activated-state label must NOT render when the factor is dormant.
    expect(screen.queryByText('YES')).toBeNull();
  });

  it('renders the real Orders-Closed docustrata actuals advisory (U-QP-TRAINCYCLE-FEED) when present', async () => {
    // The $355M / 6,718 Orders-Closed settled-price ADVISORY signal flows train-cycle ->
    // latest-training-status.json -> training_status action -> this panel. Assert the EXACT
    // derived values so a field rename (verdict / actual_total_usd / actuals_priced) FAILS here.
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: trainingOk(
        {},
        {
          docustrata_actuals_match: {
            verdict: 'under-quoting',
            median_ratio: 0.4,
            within_band_pct: 0,
            actual_total_usd: 297030689.93775,
            actuals_priced: 5436,
            advisory: true,
          },
        },
      ),
    });
    render(<QuotingCalibrationHealthPage />);

    const label = await screen.findByText(/Real Orders-Closed actuals/);
    expect(label.textContent).toContain('ADVISORY'); // never-alters-the-factor caveat present
    expect(screen.getByText('under-quoting').textContent).toBe('under-quoting'); // verdict
    expect(screen.getByText('0.40').textContent).toBe('0.40'); // median_ratio.toFixed(2)
    expect(screen.getByText('$297,030,690').textContent).toBe('$297,030,690'); // Math.round + toLocaleString
    expect(screen.getByText('5,436').textContent).toBe('5,436'); // actuals_priced.toLocaleString()
  });

  it('omits the docustrata actuals advisory when the match did not run (no false signal)', async () => {
    // R12: the default snapshot carries no docustrata_actuals_match -> the real-world block must
    // be entirely absent, never a fabricated/empty advisory.
    mockQuoting({ quoting_active_factor_get: OK_FACTORS, training_status: trainingOk() });
    render(<QuotingCalibrationHealthPage />);
    await screen.findByText('Closed-Loop Training Status');
    expect(screen.queryByText(/Real Orders-Closed actuals/)).toBeNull();
    expect(screen.queryByText('under-quoting')).toBeNull();
  });

  // ── ClosedLoopHealthPanel (U-QP-OUTCOME-LEDGER-DIGEST display leg) ──
  it('renders the closed-loop outcome health distribution when the digest is present', async () => {
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: {
        ...trainingOk(),
        outcome_digest: {
          total_cycles: 12, // unique vs every verdict count below (6/4/2/0) -> getByText('12') is the Cycles KV
          by_verdict: {
            PROMOTED: { count: 6, rate: 0.5 },
            NO_DRIFT_NO_OP: { count: 4, rate: 0.3333 },
            ROLLED_BACK: { count: 2, rate: 0.1667 },
            WITHHELD_SYNTHETIC: { count: 0, rate: 0 },
            INSUFFICIENT_DATA: { count: 0, rate: 0 },
            STAGE_FAILED: { count: 0, rate: 0 },
          },
          applied_rate: 0.5,
          withhold_rate: 0,
          rollback_rate: 0.1667,
          health: { healthy: true, insufficient_cycles: false, provenance_problem: false, drift_uncorrectable: false, reasons: [] },
          window: { first_iso: '2026-06-01T00:00:00Z', last_iso: '2026-06-13T00:00:00Z' },
        },
      },
    });
    render(<QuotingCalibrationHealthPage />);

    expect((await screen.findByText('Closed-Loop Outcome Health')).textContent).toBe('Closed-Loop Outcome Health');
    expect(screen.getByText('HEALTHY').textContent).toBe('HEALTHY');
    expect(screen.getByText('12').textContent).toBe('12'); // total_cycles.toLocaleString()
    expect(screen.getByText('PROMOTED').textContent).toBe('PROMOTED'); // verdict row label (0-count verdicts still show)
    expect(screen.getByText('WITHHELD_SYNTHETIC').textContent).toBe('WITHHELD_SYNTHETIC'); // zero-count verdict IS shown
  });

  it('flags NEEDS ATTENTION + the advisory reason when outcome health is unhealthy', async () => {
    mockQuoting({
      quoting_active_factor_get: OK_FACTORS,
      training_status: {
        ...trainingOk(),
        outcome_digest: {
          total_cycles: 10,
          by_verdict: {
            PROMOTED: { count: 0, rate: 0 },
            NO_DRIFT_NO_OP: { count: 3, rate: 0.3 },
            ROLLED_BACK: { count: 0, rate: 0 },
            WITHHELD_SYNTHETIC: { count: 7, rate: 0.7 },
            INSUFFICIENT_DATA: { count: 0, rate: 0 },
            STAGE_FAILED: { count: 0, rate: 0 },
          },
          applied_rate: 0,
          withhold_rate: 0.7,
          health: {
            healthy: false,
            insufficient_cycles: false,
            provenance_problem: true,
            drift_uncorrectable: false,
            reasons: ['withhold rate 70% indicates synthetic-starved training data'],
          },
          window: { first_iso: null, last_iso: null },
        },
      },
    });
    render(<QuotingCalibrationHealthPage />);

    expect((await screen.findByText('NEEDS ATTENTION')).textContent).toBe('NEEDS ATTENTION');
    expect(screen.getByText(/synthetic-starved/).textContent).toContain('synthetic-starved');
    // CONTRAST: the healthy label must NOT render when unhealthy.
    expect(screen.queryByText('HEALTHY')).toBeNull();
  });

  it('omits the outcome-health panel entirely when no digest is returned', async () => {
    mockQuoting({ quoting_active_factor_get: OK_FACTORS, training_status: trainingOk() });
    render(<QuotingCalibrationHealthPage />);
    await screen.findByText('Closed-Loop Training Status');
    expect(screen.queryByText('Closed-Loop Outcome Health')).toBeNull();
  });
});
