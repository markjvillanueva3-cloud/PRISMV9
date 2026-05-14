// @vitest-environment jsdom
/**
 * WEDM-ERP-MS0 / U-WEDM-ERP10 — WedmCompletionModal tests
 *
 * Timing: REAL timers (fake timers deadlock with React waitFor under jsdom,
 * same lesson as U08). Only waitFor is used when awaiting async submit.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WedmCompletionModal, type WedmCompletionEstimates } from '../components/jobs/WedmCompletionModal';
import { wedmErpApi } from '../api/wedmErp';

vi.mock('../api/wedmErp', () => ({
  wedmErpApi: {
    jobComplete: vi.fn(),
  },
}));

const mockJobComplete = vi.mocked(wedmErpApi.jobComplete);

function estimates(over: Partial<WedmCompletionEstimates> = {}): WedmCompletionEstimates {
  return {
    estimated_cutting_time_min: 480,
    estimated_wire_m: 1800,
    estimated_passes: 4,
    estimated_cost_usd: 900,
    machine_rate_usd_per_hr: 85,
    wire_cost_usd_per_m: 0.15,
    ...over,
  };
}

function invoiceResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      invoice: {
        invoice_number: 'INV-2026-0042',
        job_id: 'WEDM-0042',
        total_usd: 945.0,
        subtotal_usd: 800.0,
        cost_variance_pct: 5.0,
        requires_overage_approval: false,
        lines: [
          { description: 'Machine time', amount_usd: 680.0, category: 'machine_time' },
          { description: 'Wire',         amount_usd: 120.0, category: 'wire' },
        ],
        notes: [],
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  mockJobComplete.mockReset();
  mockJobComplete.mockResolvedValue(invoiceResponse());
});

afterEach(() => {
  cleanup();
});

const WAIT = 1000;

// ─── Open/closed render ─────────────────────────────────────────────────────

describe('U-WEDM-ERP10: modal open/closed state', () => {
  it('renders nothing when open=false', () => {
    render(
      <WedmCompletionModal
        jobId="WEDM-0042"
        estimates={estimates()}
        open={false}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByTestId('wedm-completion-modal')).toBeNull();
  });

  it('renders modal when open=true', () => {
    render(
      <WedmCompletionModal
        jobId="WEDM-0042"
        estimates={estimates()}
        open
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('wedm-completion-modal')).toBeTruthy();
  });

  it('uses jobLabel when provided', () => {
    render(
      <WedmCompletionModal
        jobId="WEDM-0042"
        jobLabel="WEDM-0042 · Die cavity insert"
        estimates={estimates()}
        open
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('wedm-completion-label').textContent).toMatch(/Die cavity insert/);
  });

  it('falls back to jobId when jobLabel absent', () => {
    render(
      <WedmCompletionModal
        jobId="WEDM-0042"
        estimates={estimates()}
        open
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('wedm-completion-label').textContent).toMatch(/WEDM-0042/);
  });
});

// ─── Input fields ───────────────────────────────────────────────────────────

describe('U-WEDM-ERP10: input fields', () => {
  it('renders all four numeric inputs + notes + invoice toggle', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    expect(screen.getByTestId('wedm-completion-time')).toBeTruthy();
    expect(screen.getByTestId('wedm-completion-wire')).toBeTruthy();
    expect(screen.getByTestId('wedm-completion-passes')).toBeTruthy();
    expect(screen.getByTestId('wedm-completion-rate')).toBeTruthy();
    expect(screen.getByTestId('wedm-completion-notes')).toBeTruthy();
    expect(screen.getByTestId('wedm-completion-invoice-toggle')).toBeTruthy();
  });

  it('pre-fills passes field with estimated passes', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates({ estimated_passes: 4 })} open onClose={() => {}} />,
    );
    const input = screen.getByTestId('wedm-completion-passes') as HTMLInputElement;
    expect(input.value).toBe('4');
  });

  it('invoice toggle defaults to checked', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    const toggle = screen.getByTestId('wedm-completion-invoice-toggle') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
  });
});

// ─── Variance preview ───────────────────────────────────────────────────────

describe('U-WEDM-ERP10: live variance preview', () => {
  it('shows dash variance until actuals typed', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    expect(screen.getByTestId('wedm-variance-time').textContent).toMatch(/—/);
    expect(screen.getByTestId('wedm-variance-wire').textContent).toMatch(/—/);
  });

  it('calculates +10% time variance live', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '528' } });
    // 528 / 480 = +10%
    expect(screen.getByTestId('wedm-variance-time').textContent).toMatch(/\+10\.0%/);
  });

  it('emerald tone for within 5% variance', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '504' } });
    const row = screen.getByTestId('wedm-variance-time');
    expect(row.innerHTML).toMatch(/text-emerald-300/);
  });

  it('red tone for >15% variance', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '600' } });
    const row = screen.getByTestId('wedm-variance-time');
    expect(row.innerHTML).toMatch(/text-red-300/);
  });

  it('derives actual cost from time + wire + machine rate + wire cost', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    // 480/60 * 85 + 1800 * 0.15 = 680 + 270 = 950
    expect(screen.getByTestId('wedm-completion-actual-cost').textContent).toMatch(/\$950\.00/);
  });

  it('rate override changes derived cost', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.change(screen.getByTestId('wedm-completion-rate'), { target: { value: '120' } });
    // 480/60 * 120 + 1800 * 0.15 = 960 + 270 = 1230
    expect(screen.getByTestId('wedm-completion-actual-cost').textContent).toMatch(/\$1230\.00/);
  });
});

// ─── Validation ─────────────────────────────────────────────────────────────

describe('U-WEDM-ERP10: validation', () => {
  it('rejects negative cutting time', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '-5' } });
    expect(screen.getByTestId('wedm-completion-errors').textContent).toMatch(/Cutting time must be positive/i);
  });

  it('rejects zero wire', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '0' } });
    expect(screen.getByTestId('wedm-completion-errors').textContent).toMatch(/Wire consumption must be positive/i);
  });

  it('submit button disabled when inputs incomplete', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    const btn = screen.getByTestId('wedm-completion-submit') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit button enabled when all required inputs valid', () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    const btn = screen.getByTestId('wedm-completion-submit') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });
});

// ─── Submit happy path ──────────────────────────────────────────────────────

describe('U-WEDM-ERP10: submit happy path', () => {
  it('calls jobComplete with correct payload', async () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.change(screen.getByTestId('wedm-completion-notes'), { target: { value: 'No issues' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(mockJobComplete).toHaveBeenCalled(), { timeout: WAIT });
    const [jobId, payload] = mockJobComplete.mock.calls[0];
    expect(jobId).toBe('WEDM-0042');
    expect(payload.actual_cutting_time_min).toBe(480);
    expect(payload.actual_wire_m).toBe(1800);
    expect(payload.actual_passes).toBe(4);
    expect(payload.actual_cost_usd).toBeCloseTo(950, 1);
    expect(payload.completion_notes).toBe('No issues');
  });

  it('shows success state with invoice number when toggle on', async () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(screen.getByTestId('wedm-completion-success')).toBeTruthy(), {
      timeout: WAIT,
    });
    expect(screen.getByTestId('wedm-completion-success').textContent).toMatch(/INV-2026-0042/);
  });

  it('renders line items in success state', async () => {
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(screen.getByTestId('wedm-success-lines')).toBeTruthy(), { timeout: WAIT });
    const lines = screen.getByTestId('wedm-success-lines');
    expect(lines.textContent).toMatch(/Machine time/);
    expect(lines.textContent).toMatch(/\$680\.00/);
  });

  it('invokes onCompleted callback with invoice', async () => {
    const onCompleted = vi.fn();
    render(
      <WedmCompletionModal
        jobId="WEDM-0042"
        estimates={estimates()}
        open
        onClose={() => {}}
        onCompleted={onCompleted}
      />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(onCompleted).toHaveBeenCalled(), { timeout: WAIT });
    expect(onCompleted.mock.calls[0][0].invoice_number).toBe('INV-2026-0042');
  });

  it('closes modal immediately when invoice toggle disabled', async () => {
    const onClose = vi.fn();
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={onClose} />,
    );
    fireEvent.click(screen.getByTestId('wedm-completion-invoice-toggle'));
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(onClose).toHaveBeenCalled(), { timeout: WAIT });
  });

  it('shows overage warning when required', async () => {
    mockJobComplete.mockResolvedValueOnce(
      invoiceResponse({
        requires_overage_approval: true,
        overage_approval: { request_id: 'OVR-123', status: 'pending' },
        cost_variance_pct: 22.5,
      }),
    );
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(screen.getByTestId('wedm-success-overage')).toBeTruthy(), {
      timeout: WAIT,
    });
    expect(screen.getByTestId('wedm-success-overage').textContent).toMatch(/OVR-123/);
  });

  it('variance tone in success state matches magnitude', async () => {
    mockJobComplete.mockResolvedValueOnce(invoiceResponse({ cost_variance_pct: 22.5 }));
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(() => expect(screen.getByTestId('wedm-success-variance')).toBeTruthy(), {
      timeout: WAIT,
    });
    const variance = screen.getByTestId('wedm-success-variance');
    expect(variance.className).toMatch(/text-red-300/);
  });
});

// ─── Error path ─────────────────────────────────────────────────────────────

describe('U-WEDM-ERP10: error path', () => {
  it('shows submit error when jobComplete rejects', async () => {
    mockJobComplete.mockRejectedValueOnce(new Error('Network down'));
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(
      () => expect(screen.getByTestId('wedm-completion-submit-error').textContent).toMatch(/network down/i),
      { timeout: WAIT },
    );
  });

  it('shows submit error when API returns ok=false', async () => {
    mockJobComplete.mockResolvedValueOnce({ ok: false, error: 'Unknown job' });
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={() => {}} />,
    );
    fireEvent.change(screen.getByTestId('wedm-completion-time'), { target: { value: '480' } });
    fireEvent.change(screen.getByTestId('wedm-completion-wire'), { target: { value: '1800' } });
    fireEvent.click(screen.getByTestId('wedm-completion-submit'));

    await waitFor(
      () => expect(screen.getByTestId('wedm-completion-submit-error').textContent).toMatch(/unknown job/i),
      { timeout: WAIT },
    );
  });
});

// ─── Cancel / close ─────────────────────────────────────────────────────────

describe('U-WEDM-ERP10: cancel + close interactions', () => {
  it('cancel button invokes onClose', () => {
    const onClose = vi.fn();
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={onClose} />,
    );
    fireEvent.click(screen.getByTestId('wedm-completion-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close (X) button invokes onClose', () => {
    const onClose = vi.fn();
    render(
      <WedmCompletionModal jobId="WEDM-0042" estimates={estimates()} open onClose={onClose} />,
    );
    fireEvent.click(screen.getByTestId('wedm-completion-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
