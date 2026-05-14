// @vitest-environment jsdom
/**
 * WEDM-ERP-MS0 / U-WEDM-ERP08 — WedmQuoteSection component tests
 *
 * Exercises: default render, 300ms debounced estimate call, pass-count auto
 * inference, validation errors, API response rendering, Add-to-Quote callback,
 * error paths.
 *
 * Timing note: uses REAL timers. The component's debounce is 300ms, so tests
 * `await waitFor(...)` up to ~500ms to observe effects. Fake timers conflict
 * with React state flushes in jsdom, so real timers are the reliable choice.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { WedmQuoteSection, type WedmQuoteLineItem } from '../components/quote/WedmQuoteSection';
import { wedmErpApi } from '../api/wedmErp';

vi.mock('../api/wedmErp', () => ({
  wedmErpApi: {
    estimate: vi.fn(),
  },
}));

const mockEstimate = vi.mocked(wedmErpApi.estimate);

function makeResponse(overrides: Record<string, unknown> = {}) {
  return {
    ok: true,
    data: {
      cost_estimate: { ok: true },
      quote: {
        line_items: [
          { description: 'Machine time',     total: 100, category: 'machine_time', source: 'kienzle' },
          { description: 'Wire consumption', total: 20,  category: 'wire',         source: 'wire-constants' },
          { description: 'Consumables',      total: 5,   category: 'consumables',  source: 'default' },
        ],
        subtotal: 125,
        overhead: 18.75,
        margin: 28.75,
        total: 180,
        total_uncertainty_pct: 12.5,
        confidence_interval: { low: 160, high: 205, confidence: 0.95 },
        ...overrides,
      },
    },
  };
}

beforeEach(() => {
  mockEstimate.mockReset();
  mockEstimate.mockResolvedValue(makeResponse());
});

afterEach(() => {
  cleanup();
});

const WAIT_MS = 600;

// ─── Default render ─────────────────────────────────────────────────────────

describe('U-WEDM-ERP08: WedmQuoteSection default render', () => {
  it('renders the heading and section container', () => {
    render(<WedmQuoteSection />);
    expect(screen.getByTestId('wedm-quote-section')).toBeTruthy();
    expect(screen.getByText(/wire edm line item/i)).toBeTruthy();
  });

  it('renders all required input fields', () => {
    render(<WedmQuoteSection />);
    expect(screen.getByTestId('wedm-material')).toBeTruthy();
    expect(screen.getByTestId('wedm-perimeter')).toBeTruthy();
    expect(screen.getByTestId('wedm-thickness')).toBeTruthy();
    expect(screen.getByTestId('wedm-quantity')).toBeTruthy();
    expect(screen.getByTestId('wedm-wire-type')).toBeTruthy();
    expect(screen.getByTestId('wedm-wire-diameter')).toBeTruthy();
  });

  it('defaults to auto pass mode with inferred pass count visible', () => {
    render(<WedmQuoteSection />);
    expect(screen.getByTestId('wedm-inferred-passes')).toBeTruthy();
    expect(screen.queryByTestId('wedm-pass-count')).toBeNull();
  });
});

// ─── Debounced estimate ─────────────────────────────────────────────────────

describe('U-WEDM-ERP08: WedmQuoteSection debounced estimate', () => {
  it('calls /quote/estimate after 300ms debounce', async () => {
    render(<WedmQuoteSection />);
    await waitFor(() => expect(mockEstimate).toHaveBeenCalled(), { timeout: WAIT_MS });
  });

  it('renders the cost total from the API response', async () => {
    render(<WedmQuoteSection />);
    await waitFor(
      () => expect(screen.getByTestId('wedm-total').textContent).toMatch(/\$180/),
      { timeout: WAIT_MS },
    );
  });

  it('renders per-piece unit price (total / quantity)', async () => {
    render(<WedmQuoteSection />);
    await waitFor(
      () => expect(screen.getByTestId('wedm-unit-price').textContent).toMatch(/\$18/),
      { timeout: WAIT_MS },
    );
  });

  it('renders uncertainty value', async () => {
    render(<WedmQuoteSection />);
    await waitFor(
      () => expect(screen.getByTestId('wedm-uncertainty').textContent).toMatch(/12\.5/),
      { timeout: WAIT_MS },
    );
  });

  it('renders all line items from the response', async () => {
    render(<WedmQuoteSection />);
    await waitFor(() => expect(screen.getByTestId('wedm-line-items')).toBeTruthy(), {
      timeout: WAIT_MS,
    });
    expect(screen.getByTestId('wedm-line-item-machine_time')).toBeTruthy();
    expect(screen.getByTestId('wedm-line-item-wire')).toBeTruthy();
    expect(screen.getByTestId('wedm-line-item-consumables')).toBeTruthy();
  });
});

// ─── Pass count auto inference ──────────────────────────────────────────────

describe('U-WEDM-ERP08: pass count auto inference', () => {
  it('infers 1 pass for coarse Ra target (3.5µm)', async () => {
    render(<WedmQuoteSection defaultValues={{ target_ra_um: '3.5' }} />);
    expect(screen.getByTestId('wedm-inferred-passes').textContent).toMatch(/1\s*passes/);
  });

  it('infers 4 passes for 1.0µm Ra target', async () => {
    render(<WedmQuoteSection defaultValues={{ target_ra_um: '1.0' }} />);
    expect(screen.getByTestId('wedm-inferred-passes').textContent).toMatch(/4\s*passes/);
  });

  it('bumps pass count for thick sections (>50mm)', async () => {
    render(<WedmQuoteSection defaultValues={{ target_ra_um: '1.6', thickness_mm: '75' }} />);
    // 1.6µm → 3 passes base, +1 for >50mm = 4
    expect(screen.getByTestId('wedm-inferred-passes').textContent).toMatch(/4\s*passes/);
  });

  it('switches to manual mode and shows manual pass count input', async () => {
    render(<WedmQuoteSection />);
    fireEvent.click(screen.getByTestId('wedm-pass-mode-manual'));
    expect(screen.getByTestId('wedm-pass-count')).toBeTruthy();
    expect(screen.queryByTestId('wedm-inferred-passes')).toBeNull();
  });
});

// ─── Validation errors ──────────────────────────────────────────────────────

describe('U-WEDM-ERP08: WedmQuoteSection validation', () => {
  it('shows validation errors when perimeter is 0', async () => {
    render(<WedmQuoteSection />);
    fireEvent.change(screen.getByTestId('wedm-perimeter'), { target: { value: '0' } });
    await waitFor(
      () => expect(screen.getByTestId('wedm-validation-errors').textContent).toMatch(/perimeter/i),
      { timeout: WAIT_MS },
    );
  });

  it('shows validation errors when quantity is negative', async () => {
    render(<WedmQuoteSection />);
    fireEvent.change(screen.getByTestId('wedm-quantity'), { target: { value: '-3' } });
    await waitFor(
      () => expect(screen.getByTestId('wedm-validation-errors').textContent).toMatch(/quantity/i),
      { timeout: WAIT_MS },
    );
  });

  it('does NOT call estimate when inputs are invalid', async () => {
    mockEstimate.mockClear();
    render(<WedmQuoteSection defaultValues={{ thickness_mm: '-1' }} />);
    await new Promise((r) => setTimeout(r, WAIT_MS));
    expect(mockEstimate).not.toHaveBeenCalled();
  });
});

// ─── Add to Quote callback ──────────────────────────────────────────────────

describe('U-WEDM-ERP08: WedmQuoteSection onAddToQuote', () => {
  it('invokes callback with line items, total, and meta when clicked', async () => {
    const onAdd = vi.fn<
      (items: WedmQuoteLineItem[], total: number, meta: Record<string, unknown>) => void
    >();
    render(<WedmQuoteSection onAddToQuote={onAdd} />);
    await waitFor(() => expect(screen.getByTestId('wedm-add-to-quote')).toBeTruthy(), {
      timeout: WAIT_MS,
    });
    fireEvent.click(screen.getByTestId('wedm-add-to-quote'));
    expect(onAdd).toHaveBeenCalledTimes(1);
    const [items, total, meta] = onAdd.mock.calls[0];
    expect(items).toHaveLength(3);
    expect(total).toBe(180);
    expect(meta.material).toBe('D2');
    expect(meta.quantity).toBe(10);
    // unit_price derived: 100 / 10 = 10
    expect(items[0].unit_price).toBe(10);
  });

  it('hides Add-to-Quote button when hideAddButton is true', async () => {
    const onAdd = vi.fn();
    render(<WedmQuoteSection onAddToQuote={onAdd} hideAddButton />);
    await waitFor(() => expect(screen.getByTestId('wedm-total')).toBeTruthy(), {
      timeout: WAIT_MS,
    });
    expect(screen.queryByTestId('wedm-add-to-quote')).toBeNull();
  });
});

// ─── Error path ─────────────────────────────────────────────────────────────

describe('U-WEDM-ERP08: WedmQuoteSection error path', () => {
  it('shows ErrorState when the API rejects', async () => {
    mockEstimate.mockRejectedValueOnce(new Error('Network down'));
    render(<WedmQuoteSection />);
    await waitFor(
      () => expect(screen.getAllByText(/network down/i).length).toBeGreaterThan(0),
      { timeout: WAIT_MS },
    );
  });

  it('shows ErrorState when ok=false in response', async () => {
    mockEstimate.mockResolvedValueOnce({ ok: false, error: 'Material not in registry' });
    render(<WedmQuoteSection />);
    await waitFor(
      () => expect(screen.getAllByText(/material not in registry/i).length).toBeGreaterThan(0),
      { timeout: WAIT_MS },
    );
  });
});
