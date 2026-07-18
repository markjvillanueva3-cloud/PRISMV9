/**
 * AccountingClosePage tests -- U-ERP-ACCT-CLOSE-FE (slot:hotel, 2026-07-02)
 *
 * The close desk runs the 9 accounting-close routes. The api/client fns return the RAW
 * route body -- erp.ts emits {ok,data} with the prism_business envelope already unwrapped
 * server-side (rfqRoute), so the mocks here resolve the REAL {ok,data} body (R9: mock the
 * production wire, not a convenient bare shape -- the {result} dead-panel class hit this
 * galaxy from both directions before).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const acctBankReconcile = vi.fn();
const acctVarianceAnalysis = vi.fn();
const acctQuickbooksSync = vi.fn();
const acctWipValuation = vi.fn();
const acctCostToComplete = vi.fn();
const acctMultiPeriodCompare = vi.fn();
const salesUseTaxCalc = vi.fn();
const form1099NecGenerate = vi.fn();
const payrollGenerateW2 = vi.fn();

vi.mock('../api/client', () => ({
  ApiError: class extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
  acctBankReconcile: (...a: unknown[]) => acctBankReconcile(...a),
  acctVarianceAnalysis: (...a: unknown[]) => acctVarianceAnalysis(...a),
  acctQuickbooksSync: (...a: unknown[]) => acctQuickbooksSync(...a),
  acctWipValuation: (...a: unknown[]) => acctWipValuation(...a),
  acctCostToComplete: (...a: unknown[]) => acctCostToComplete(...a),
  acctMultiPeriodCompare: (...a: unknown[]) => acctMultiPeriodCompare(...a),
  salesUseTaxCalc: (...a: unknown[]) => salesUseTaxCalc(...a),
  form1099NecGenerate: (...a: unknown[]) => form1099NecGenerate(...a),
  payrollGenerateW2: (...a: unknown[]) => payrollGenerateW2(...a),
}));

import { AccountingClosePage } from '../pages/AccountingClosePage';

function renderPage() {
  return render(
    <MemoryRouter>
      <AccountingClosePage />
    </MemoryRouter>,
  );
}

describe('AccountingClosePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the close desk with all 8 tabs', () => {
    renderPage();
    expect(screen.getByText('Accounting Close')).toBeTruthy();
    for (const label of ['Bank Rec', 'WIP Valuation', 'Variance', 'Cost to Complete', 'Multi-Period', 'Sales Tax', 'W-2 / 1099', 'QuickBooks']) {
      expect(screen.getByRole('button', { name: label })).toBeTruthy();
    }
  });

  it('runs Bank Rec with the seeded contract JSON and renders the reconciled tiles from {ok,data}', async () => {
    acctBankReconcile.mockResolvedValue({
      ok: true,
      data: {
        reconciled: true,
        difference: 0,
        match_rate_pct: 100,
        outstanding_deposits: 0,
        outstanding_checks: 125.5,
        matched: [{ bank_txn_id: 'bt-1', gl_entry_id: 'gl-1', match_type: 'exact', confidence: 1 }],
      },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(acctBankReconcile).toHaveBeenCalledTimes(1));
    // The seed forwards verbatim as the parsed contract (caller-supplied data).
    const sent = acctBankReconcile.mock.calls[0][0] as Record<string, unknown>;
    expect(sent.statement_date).toBe('2026-06-30');
    expect(Array.isArray(sent.bank_transactions)).toBe(true);
    // Tiles read the INNER data (the {ok,data} body is unwrapped by the page).
    await waitFor(() => expect(screen.getByText('YES')).toBeTruthy());
    expect(screen.getByText('Match Rate')).toBeTruthy();
    expect(screen.getByText('$125.50')).toBeTruthy(); // dollars to the cent, never rounded away
  });

  it('renders Net Variance to the cent on the Variance tab', async () => {
    acctVarianceAnalysis.mockResolvedValue({
      ok: true,
      // Engine convention (AccountingHardeningEngine.ts:458,474): favorable variances sum
      // NEGATIVE -- mock the real sign so the tile's production rendering (-$50.00) is pinned.
      data: { variances: [], summary: { total_favorable: -50.0, total_unfavorable: 162.4, net_variance: 112.4, net_variance_pct: 8.99, largest_variance: { job_id: 'J-100', category: 'material', amount: 162.4 } } },
    });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Variance' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(acctVarianceAnalysis).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('$112.40')).toBeTruthy()); // net variance tile
    expect(screen.getByText('$162.40')).toBeTruthy(); // unfavorable tile, distinct to the cent
    expect(screen.getByText('-$50.00')).toBeTruthy(); // favorable tile, engine's negative-sum convention
    expect(screen.getByText('Net Variance')).toBeTruthy();
  });

  it('surfaces 403 as the role-tier message (hr-gated route)', async () => {
    const { ApiError } = await import('../api/client');
    acctBankReconcile.mockRejectedValue(new (ApiError as any)(403, 'Insufficient role'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(screen.getByText(/needs the hr_manager or admin role/)).toBeTruthy());
  });

  it('rejects invalid JSON input WITHOUT calling the route (fail-loud, no bad request sent)', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '{not json' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(screen.getByText(/Input is not valid JSON/)).toBeTruthy());
    expect(acctBankReconcile).not.toHaveBeenCalled();
  });

  it('switches tabs: seeds swap to the target contract and prior results clear', async () => {
    acctBankReconcile.mockResolvedValue({ ok: true, data: { reconciled: true, difference: 0, match_rate_pct: 100, outstanding_deposits: 0, outstanding_checks: 0 } });
    renderPage();
    // Run bankrec so a result is on screen, THEN switch: the result must clear
    // (deleting switchTab's clearing would fail this -- R9 teeth).
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(screen.getByText('YES')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: 'QuickBooks' }));
    // TEETH (3-of-3 arm-B P1): 'YES' alone is toothless -- the bankrec tile vanishes on
    // switch even without clearing (highlightsFor('quickbooks') is []). The stale RAW JSON
    // is what clearing prevents: 'No result yet.' renders ONLY when result === null, and
    // the bankrec payload must not linger in the <pre>.
    expect(screen.getByText('No result yet.')).toBeTruthy();
    expect(screen.queryByText(/"reconciled"/)).toBeNull(); // stale raw JSON gone
    const box = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(box.value).toContain('gl_accounts');
    expect(box.value).toContain('"direction"');
  });

  it('drops an in-flight result that resolves AFTER a tab switch (no number misattribution)', async () => {
    let resolveRun: (v: unknown) => void = () => undefined;
    acctBankReconcile.mockImplementation(() => new Promise((res) => { resolveRun = res; }));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' })); // bankrec, slow
    fireEvent.click(screen.getByRole('button', { name: 'Variance' }));         // switch mid-flight
    resolveRun({ ok: true, data: { reconciled: true, difference: 0, match_rate_pct: 100, outstanding_deposits: 0, outstanding_checks: 0 } });
    // The stale bankrec result must NOT render under the Variance tab.
    await waitFor(() => expect(acctBankReconcile).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('YES')).toBeNull();
    expect(screen.queryByText(/match_rate_pct/)).toBeNull();
    expect(screen.getByText('No result yet.')).toBeTruthy();
  });

  it('renders a generic (no-tile) result as raw JSON for engines without verified highlight contracts', async () => {
    acctQuickbooksSync.mockResolvedValue({ ok: true, data: { mappings: [{ code: '1000', qb_id: 'QB-1' }] } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'QuickBooks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(acctQuickbooksSync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText(/"qb_id": "QB-1"/)).toBeTruthy());
  });

  it('W-2 / 1099 tab dispatches by contract: employeeYtd seed -> W-2; taxYear input -> 1099-NEC', async () => {
    payrollGenerateW2.mockResolvedValue({ ok: true, data: [] });
    form1099NecGenerate.mockResolvedValue({ ok: true, data: { forms: [] } });
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'W-2 / 1099' }));
    // Seed carries employeeYtd+year -> W-2 lane.
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(payrollGenerateW2).toHaveBeenCalledTimes(1));
    expect(form1099NecGenerate).not.toHaveBeenCalled();
    // Switching the input to a taxYear contract -> 1099-NEC lane.
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: JSON.stringify({ taxYear: 2026, payees: [], payments: [] }) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run Close Action' }));
    await waitFor(() => expect(form1099NecGenerate).toHaveBeenCalledTimes(1));
  });
});
