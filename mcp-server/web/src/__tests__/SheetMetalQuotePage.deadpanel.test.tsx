// @vitest-environment jsdom
/**
 * U-SHEETMETAL-FLAT-ADAPT page-render regression (3-of-3 arm A/B/C P1).
 *
 * The route adapter (adaptSheetMetalFlat) returns the FLAT object as `result`, but for an ANON
 * caller the cost-breakdown fields are redacted (absent) while price/total/lead survive. The page
 * MUST render that anon shape without crashing on `undefined.toFixed()` (the dead-panel class).
 * These tests RENDER the real page against both wire shapes and assert no throw + correct content.
 * (A pure-adapter test can't catch this — it must exercise the page consumer. R9.)
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

// The route flattens nested->flat and returns it as `result`. Authed = full cost stack; anon =
// cost bars omitted (redacted), price/total/lead present. Mock both via mockResolvedValueOnce.
const sheetMetalQuoteMock = vi.fn();

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
    sheetMetalQuote: (...args: unknown[]) => sheetMetalQuoteMock(...args),
  };
});

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(Component: React.FC) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={['/']}>
        <Component />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

// The authed flat shape adaptSheetMetalFlat produces for a full result.
const AUTHED_FLAT = {
  result: {
    quote_id: 'SM26-1', quantity: 20,
    unit_price: 65, total: 1300, lead_time_days: 6,
    material_cost: 60, cutting_cost: 27, bending_cost: 18, finishing_cost: 0,
  },
};

// The ANON flat shape: cost bars OMITTED (redacted), customer-facing fields survive.
const ANON_FLAT = {
  result: {
    quote_id: 'SM26-1', quantity: 20,
    unit_price: 65, total: 1300, lead_time_days: 6,
    // material_cost / cutting_cost / bending_cost / finishing_cost intentionally ABSENT
  },
};

async function submitAndWait() {
  const { SheetMetalQuotePage } = await import('../pages/SheetMetalQuotePage');
  renderPage(SheetMetalQuotePage);
  // the submit button -> handleQuote -> sheetMetalQuote ("Generate Quote", 2 instances in the layout)
  const btns = screen.getAllByText('Generate Quote');
  fireEvent.click(btns[0]);
  await waitFor(() => expect(sheetMetalQuoteMock).toHaveBeenCalled());
}

describe('SheetMetalQuotePage — anon dead-panel guard (U-SHEETMETAL-FLAT-ADAPT)', () => {
  it('ANON shape (cost bars redacted) renders the commercial summary WITHOUT crashing', async () => {
    sheetMetalQuoteMock.mockResolvedValueOnce(ANON_FLAT);
    // The key assertion: this must NOT throw an `undefined.toFixed` render error.
    await submitAndWait();
    // commercial summary survives for anon
    await waitFor(() => expect(screen.getByText('Unit price')).toBeDefined());
    expect(screen.getByText('$65.00')).toBeDefined();      // unit_price rendered
    expect(screen.getByText('$1300.00')).toBeDefined();    // total rendered
    expect(screen.getByText('6 days')).toBeDefined();      // lead_time_days rendered
    // cost-breakdown panel is gated off (no priced bars) -> the "Cost breakdown" panel is absent
    expect(screen.queryByText('Cost breakdown')).toBeNull();
  });

  it('AUTHED shape (full cost stack) renders all four cost-breakdown bars', async () => {
    sheetMetalQuoteMock.mockResolvedValueOnce(AUTHED_FLAT);
    await submitAndWait();
    // the cost-breakdown panel renders for authed (the whole point: no crash, panel present)
    await waitFor(() => expect(screen.getByText('Cost breakdown')).toBeDefined());
    // the breakdown bar values render (proves the bars built without crash); "Material"/"Cutting"
    // labels also appear in the form, so assert on the unique bar VALUES instead of the labels.
    expect(screen.getByText('$60.00')).toBeDefined(); // material_cost bar
    expect(screen.getByText('$27.00')).toBeDefined(); // cutting_cost bar
    expect(screen.getByText('$18.00')).toBeDefined(); // bending_cost bar
    // "Bending"/"Finishing" labels are unique to the breakdown panel (not in the form)
    expect(screen.getByText('Bending')).toBeDefined();
    expect(screen.getByText('Finishing')).toBeDefined();
  });

  it('null price (degraded/unpriced result) renders a dash, not a crash', async () => {
    sheetMetalQuoteMock.mockResolvedValueOnce({
      result: { quote_id: 'SM26-2', quantity: 1, unit_price: null, total: null, lead_time_days: null },
    });
    await submitAndWait();
    // must not throw on null.toFixed; the tile shows the dash fallback
    await waitFor(() => expect(screen.getByText('Unit price')).toBeDefined());
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });
});
