// @vitest-environment jsdom
/**
 * Tests for the Kienzle Cost Estimator page (CostEstimatorPage).
 *
 * Covers the two real response shapes the /api/v1/cost/estimate route returns (after the route's
 * redact->adapt chain), plus the error path:
 *   1. AUTHENTICATED: cost basis present -> Cost Summary (per-part + total) + breakdown bars + metrics.
 *   2. ANONYMOUS: pricing redacted -> NO cost crash; a "sign in for pricing" panel + process metrics.
 *   3. ERROR: api rejects -> no result panel, page stays interactive.
 * The anon case is the regression guard for the pre-fix bug where the page null-threw on
 * `result.per_part_cost.toFixed()` when the cost fields were redacted away.
 */
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock the cost API client. estimate() already unwraps the route's { result } envelope, so these
// mock return values are the CostEstimate shape the page consumes directly.
const estimate = vi.fn();
vi.mock('../api/cost', () => ({
  costApi: {
    estimate: (req: unknown) => estimate(req),
  },
}));

import CostEstimatorPage from '../pages/CostEstimatorPage';

const AUTHED_RESULT = {
  per_part_cost: 12.34,
  total_cost: 1234,
  breakdown: { machine: 8.0, tooling: 2.34, setup: 2.0 },
  cycle_time_min: 5.2,
  tool_life_min: 48,
  parts_per_edge: 23,
  batch_size: 100,
};

const ANON_RESULT = {
  // Cost fields redacted by the route for an anonymous caller -> absent here.
  cycle_time_min: 5.2,
  tool_life_min: 48,
  parts_per_edge: 23,
  batch_size: 100,
};

function clickEstimate() {
  fireEvent.click(screen.getByRole('button', { name: /estimate cost/i }));
}

describe('CostEstimatorPage (Kienzle Cost Estimator)', () => {
  beforeEach(() => {
    estimate.mockReset();
  });
  afterEach(() => cleanup());

  it('renders the Kienzle-branded title and the job-parameter form', () => {
    render(<CostEstimatorPage />);
    expect(screen.getByText(/Kienzle Cost Estimator/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /estimate cost/i })).toBeTruthy();
    // Initial prompt panel (no result yet).
    expect(screen.getByText(/Enter job parameters/i)).toBeTruthy();
  });

  it('AUTHENTICATED: shows per-part + total cost, breakdown bars, and process metrics', async () => {
    estimate.mockResolvedValue(AUTHED_RESULT);
    render(<CostEstimatorPage />);
    clickEstimate();
    await waitFor(() => expect(screen.getByText('Cost Summary')).toBeTruthy());
    // Per-part badge + card (appears in the header badge and the card).
    expect(screen.getAllByText('$12.34').length).toBeGreaterThan(0);
    expect(screen.getByText('$1234.00')).toBeTruthy();
    // Breakdown components the engine actually computes.
    expect(screen.getByText('machine')).toBeTruthy();
    expect(screen.getByText('tooling')).toBeTruthy();
    expect(screen.getByText('setup')).toBeTruthy();
    // Process metrics present for everyone.
    expect(screen.getByText('Process Metrics')).toBeTruthy();
    expect(screen.getByText('Parts / Edge')).toBeTruthy();
  });

  it('ANONYMOUS: does NOT crash on redacted pricing — shows sign-in panel + metrics (regression guard)', async () => {
    estimate.mockResolvedValue(ANON_RESULT);
    render(<CostEstimatorPage />);
    clickEstimate();
    await waitFor(() => expect(screen.getByText('Process Metrics')).toBeTruthy());
    // The "Pricing" gated panel, NOT a Cost Summary, and NO thrown error.
    expect(screen.getByText(/Pricing is available to signed-in users/i)).toBeTruthy();
    expect(screen.queryByText('Cost Summary')).toBeNull();
    // Metrics still render -- "Cycle Time" appears as both a form label and a metric tile, so assert >0.
    expect(screen.getAllByText('Cycle Time').length).toBeGreaterThan(0);
    expect(screen.getByText('Parts / Edge')).toBeTruthy();
  });

  it('ERROR: a rejected estimate leaves the page interactive with no result panel', async () => {
    estimate.mockRejectedValue(new Error('boom'));
    render(<CostEstimatorPage />);
    clickEstimate();
    // Button returns to enabled (loading resolved) and the prompt panel is still shown.
    await waitFor(() =>
      expect((screen.getByRole('button', { name: /estimate cost/i }) as HTMLButtonElement).disabled).toBe(false),
    );
    expect(screen.queryByText('Cost Summary')).toBeNull();
    expect(screen.queryByText('Process Metrics')).toBeNull();
  });

  it('sends the flat page payload (material/operation/quantity) to the estimate API', async () => {
    estimate.mockResolvedValue(AUTHED_RESULT);
    render(<CostEstimatorPage />);
    clickEstimate();
    await waitFor(() => expect(estimate).toHaveBeenCalledTimes(1));
    const payload = estimate.mock.calls[0][0];
    expect(payload).toMatchObject({ material: expect.any(String), operation: expect.any(String), quantity: expect.any(Number) });
  });
});
