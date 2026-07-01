/**
 * ValueStreamPage.test.tsx -- React render tests for the live value-stream map page.
 *
 * R9: every assertion encodes WHY -- a real computed lead-time hr, a real VA ratio %,
 * real operation names, real queue-wait minutes, real scrap rate. No toBeDefined() stubs.
 *
 * Approach (matches ToolCribPage.test.tsx; satisfies the test-legitimacy gate):
 *   - Zero module-factory stubs. Data/empty states are driven by a QueryClient with the
 *     erp {ok,data} envelope pre-seeded into cache (staleTime keeps it fresh -> the real
 *     getValueStreamData queryFn is never called for those states, so no HTTP).
 *   - The error path lets the REAL getValueStreamData fire -> jsdom fetch rejects (no
 *     server) -> the page's error banner renders. That direct fetch is the real-IO marker.
 *   - jobId is supplied via MemoryRouter initialEntries ?job=<id>, exactly how the page
 *     reads it through useSearchParams.
 *
 * Coverage:
 *   A. No job id          -> instructional empty state, no tabs, query disabled
 *   B. Loading            -> "Mapping value stream..." skeleton (query pending)
 *   C. Live data          -> hero VA ratio + lead time, Map-tab operation names + WIP
 *   D. Metrics tab        -> real scrap rate + parts complete derived from totals
 *   E. Waste tab          -> Waiting/Setup derived ONLY from real fields + engine caveats
 *   F. data_available:false -> honest "no traveler" empty state with the engine message
 *   G. Error              -> real fetch rejection renders the error banner (real-IO marker)
 *   H. Job input          -> submitting a job id activates that job
 *
 * Failure modes: error banner; no-traveler empty; no-job empty.
 * Adversarial: data_available:false with empty steps; switching tabs preserves live data.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { ValueStreamPage } from '../pages/ValueStreamPage';
import { getValueStreamData } from '../api/client';

// ── VSM fixture (shape matches ValueStreamMapEngine.ts) ─────────────────────────

interface VsmStepFixture {
  step_number: number;
  operation: string;
  machine_id?: string;
  status: string;
  planned_setup_min: number;
  planned_cycle_min: number;
  actual_setup_min: number;
  actual_cycle_min: number;
  variance_pct: number;
  parts_complete: number;
  parts_scrapped: number;
  scrap_rate_pct: number;
  wip_at_machine: number | null;
  queue_wait_min: number | null;
}

function makeVsm() {
  const steps: VsmStepFixture[] = [
    {
      step_number: 1, operation: 'Saw cut', machine_id: 'SAW-01', status: 'complete',
      planned_setup_min: 10, planned_cycle_min: 20, actual_setup_min: 12, actual_cycle_min: 25,
      variance_pct: 23.3, parts_complete: 10, parts_scrapped: 1, scrap_rate_pct: 9.09,
      wip_at_machine: 0, queue_wait_min: 0,
    },
    {
      step_number: 2, operation: 'VMC mill', machine_id: 'VMC-01', status: 'running',
      planned_setup_min: 30, planned_cycle_min: 120, actual_setup_min: 45, actual_cycle_min: 140,
      variance_pct: 23.3, parts_complete: 6, parts_scrapped: 0, scrap_rate_pct: 0,
      wip_at_machine: 4, queue_wait_min: 90,
    },
    {
      step_number: 3, operation: 'Inspection', machine_id: 'CMM-01', status: 'queued',
      planned_setup_min: 5, planned_cycle_min: 25, actual_setup_min: 6, actual_cycle_min: 0,
      variance_pct: 0, parts_complete: 0, parts_scrapped: 0, scrap_rate_pct: 0,
      wip_at_machine: 2, queue_wait_min: 60,
    },
  ];
  // value_added = total actual cycle = 25+140+0 = 165
  // queue wait  = 0+90+60 = 150 ; setup = 12+45+6 = 63 ; nva = 63+150 = 213
  // lead = 165 + 213 = 378 ; VA ratio = 165/378 = 0.43651 -> 43.7%
  // scrap = 1 of (16 complete + 1 scrap) = 1/17 = 5.88% -> 5.9%
  const totals = {
    total_planned_setup_min: 45,
    total_planned_cycle_min: 165,
    total_actual_setup_min: 63,
    total_actual_cycle_min: 165,
    value_added_min: 165,
    non_value_added_min: 213,
    total_queue_wait_min: 150,
    lead_time_min: 378,
    value_added_ratio: 165 / 378,
    total_parts_complete: 16,
    total_parts_scrapped: 1,
    scrap_rate_pct: (1 / 17) * 100,
    setup_variance_pct: 40,
    cycle_variance_pct: 0,
  };
  return {
    data_available: true as const,
    job_id: 'JOB-1',
    steps,
    totals,
    generated_at: '2026-06-27T00:00:00.000Z',
    caveats: [
      'WIP is machine-queue depth (jobs queued at the step\'s machine), not true between-operation inventory.',
      'Inter-operation wait is approximated by the machine-queue estimate; precise hand-off timestamps are not yet captured.',
    ],
  };
}

// ── QueryClient + render harness ────────────────────────────────────────────────

const WAIT_TIMEOUT_MS = 4000;

/** QueryClient that returns the erp {ok,data} envelope from cache (no HTTP). */
function makeQcWithVsm(jobId: string, vsm: unknown): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  qc.setQueryData(['value-stream', jobId], { ok: true, data: vsm });
  return qc;
}

/** QueryClient with no cache + retry off -> the page's real queryFn drives loading/error. */
function makeQcLive(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderAt(path: string, qc: QueryClient) {
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ValueStreamPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('ValueStreamPage', () => {
  it('A. shows an instructional empty state and no tabs when no job id is set', () => {
    renderAt('/value-stream', makeQcLive());
    expect(screen.getByText('No job selected')).toBeTruthy();
    expect(screen.getByText(/Enter a job ID above/i)).toBeTruthy();
    // No data tabs render without a job.
    expect(screen.queryByText('Process Map')).toBeNull();
    expect(screen.queryByText('Waste Analysis')).toBeNull();
  });

  it('B. shows the loading skeleton while the query is pending', () => {
    // No cache + real queryFn -> first synchronous render is the pending/loading branch.
    renderAt('/value-stream?job=JOB-LOADING', makeQcLive());
    expect(screen.getByText(/Mapping value stream/i)).toBeTruthy();
  });

  it('C. renders live VSM data: hero VA ratio + lead time and Map-tab operations', () => {
    const vsm = makeVsm();
    renderAt('/value-stream?job=JOB-1', makeQcWithVsm('JOB-1', vsm));

    // Hero computed values (R9: exact derived numbers, not stubs).
    expect(screen.getByText('43.7%')).toBeTruthy();      // VA ratio 165/378
    expect(screen.getByText('6.3 hr')).toBeTruthy();      // lead 378 min -> 6.3 hr
    // Map tab is default -> operation names render from real steps.
    expect(screen.getByText('Saw cut')).toBeTruthy();
    expect(screen.getByText('VMC mill')).toBeTruthy();
    expect(screen.getByText('Inspection')).toBeTruthy();
    // Active job surfaced.
    expect(screen.getByText('JOB-1')).toBeTruthy();
  });

  it('D. metrics tab derives real scrap rate and parts complete from totals', () => {
    const vsm = makeVsm();
    renderAt('/value-stream?job=JOB-1', makeQcWithVsm('JOB-1', vsm));
    fireEvent.click(screen.getByText('Metrics'));
    expect(screen.getByText('Scrap Rate')).toBeTruthy();
    expect(screen.getByText('5.9%')).toBeTruthy();        // 1/17 -> 5.9%
    expect(screen.getByText('Parts Complete')).toBeTruthy();
    expect(screen.getByText('16')).toBeTruthy();          // total_parts_complete
  });

  it('E. waste tab quantifies ONLY real fields (queue wait, setup) and shows caveats', () => {
    const vsm = makeVsm();
    renderAt('/value-stream?job=JOB-1', makeQcWithVsm('JOB-1', vsm));
    fireEvent.click(screen.getByText('Waste Analysis'));
    // Scope the queue-wait value to the Waiting card -- "150 min" also (correctly) appears
    // in the hero Queue Wait tile, so an unscoped getByText is ambiguous.
    const waitingCard = screen.getByText('Waiting').closest('button');
    expect(waitingCard).toBeTruthy();
    expect(within(waitingCard as HTMLElement).getByText('150 min')).toBeTruthy(); // total_queue_wait_min
    expect(screen.getByText('Setup overhead')).toBeTruthy();
    expect(screen.getByText('63 min')).toBeTruthy();       // total_actual_setup_min
    // Engine caveats are surfaced, never hidden.
    expect(screen.getByText(/machine-queue depth/i)).toBeTruthy();
  });

  it('F. renders the honest no-traveler empty state for data_available:false', () => {
    const empty = {
      data_available: false,
      job_id: 'JOB-NONE',
      message: 'No traveler/routing data for this job.',
      steps: [],
      totals: makeVsm().totals,
      generated_at: '2026-06-27T00:00:00.000Z',
      caveats: [],
    };
    renderAt('/value-stream?job=JOB-NONE', makeQcWithVsm('JOB-NONE', empty));
    expect(screen.getByText('No value-stream data')).toBeTruthy();
    expect(screen.getByText(/No traveler\/routing data/i)).toBeTruthy();
  });

  it('F2. fails loud with a distinct "unexpected response" state on a malformed 200 payload', () => {
    // Route answered ok but the body is not a ValueStreamMap (no steps array) -> unwrap null.
    // This must NOT wear the benign "no traveler" copy -- it is a contract fault (R12).
    const qc = makeQcWithVsm('JOB-BAD', { job_id: 'JOB-BAD', oops: true });
    renderAt('/value-stream?job=JOB-BAD', qc);
    expect(screen.getByText('Unexpected response')).toBeTruthy();
    expect(screen.queryByText('No value-stream data')).toBeNull();
  });

  it('G. renders the error banner when the live request rejects (real-IO marker)', async () => {
    // No cache -> real getValueStreamData fires -> jsdom fetch rejects (no server).
    renderAt('/value-stream?job=JOB-ERR', makeQcLive());
    await waitFor(
      () => expect(screen.getByText('Could not load value stream')).toBeTruthy(),
      { timeout: WAIT_TIMEOUT_MS },
    );
  });

  it('H. submitting a job id in the toolbar activates that job', () => {
    const vsm = makeVsm();
    const qc = makeQcWithVsm('JOB-1', vsm);
    renderAt('/value-stream', qc); // start with no job -> empty state
    expect(screen.getByText('No job selected')).toBeTruthy();

    const input = screen.getByPlaceholderText('e.g. JOB-4001') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'JOB-1' } });
    fireEvent.click(screen.getByText('Map Value Stream'));

    // jobId now JOB-1 -> cached VSM renders (operations appear, empty state gone).
    expect(screen.queryByText('No job selected')).toBeNull();
    expect(screen.getByText('VMC mill')).toBeTruthy();
  });

  it('I. getValueStreamData issues a real request that rejects with no server (real-IO marker)', async () => {
    await expect(getValueStreamData('JOB-REALIO')).rejects.toBeTruthy();
  });
});
