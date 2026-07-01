// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuoteBuilderPage } from '../pages/QuoteBuilderPage';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';
import {
  dfmAnalyze,
  dfmCostImpact,
  dfmQuick,
  dfmRules,
  dfmToleranceCheck,
  quoteHistory,
  quoteInstant,
  quoteLeadTime,
  quoteQtyBreaks,
  quoteShareToken,
  quoteEstimate,
  quoteCompareMaterials,
  quotingGenerate,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    dfmQuick: vi.fn(),
    dfmAnalyze: vi.fn(),
    dfmToleranceCheck: vi.fn(),
    dfmCostImpact: vi.fn(),
    dfmRules: vi.fn(),
    quoteInstant: vi.fn(),
    quoteQtyBreaks: vi.fn(),
    quoteLeadTime: vi.fn(),
    quoteHistory: vi.fn(),
    quoteShareToken: vi.fn(),
    quoteEstimate: vi.fn(),
    quoteCompareMaterials: vi.fn(),
    quotingGenerate: vi.fn(),
  };
});

const mockDfmQuick = vi.mocked(dfmQuick);
const mockDfmAnalyze = vi.mocked(dfmAnalyze);
const mockDfmToleranceCheck = vi.mocked(dfmToleranceCheck);
const mockDfmCostImpact = vi.mocked(dfmCostImpact);
const mockDfmRules = vi.mocked(dfmRules);
const mockQuoteInstant = vi.mocked(quoteInstant);
const mockQuoteQtyBreaks = vi.mocked(quoteQtyBreaks);
const mockQuoteLeadTime = vi.mocked(quoteLeadTime);
const mockQuoteHistory = vi.mocked(quoteHistory);
const mockQuoteShareToken = vi.mocked(quoteShareToken);
const mockQuoteEstimate = vi.mocked(quoteEstimate);
const mockQuoteCompareMaterials = vi.mocked(quoteCompareMaterials);
const mockQuotingGenerate = vi.mocked(quotingGenerate);

// estimate-flow fix (2026-06-23): /quote/estimate returns the MCP content envelope
// { result: { type:"text", text } } wrapping the engine's NESTED QuoteEstimateResult -- NOT a flat
// { result: {...} }. The page unwraps + adaptQuoteEstimate maps nested->flat. These helpers mock the
// REAL production shape: flat test values are inverted into the nested shape, then wrapped in the
// content envelope, so adaptQuoteEstimate re-derives exactly the flat values each test expects.
// (The prior mocks used a flat { result } -- the WRONG contract that hid the dead-panel/estimate bug.)
function nestedEstimateEnvelope(flat: {
  unit_price?: number;
  total?: number;
  cycle_time_min?: number;
  confidence?: number; // 0-1 as the page consumes it; engine emits confidence_score 0-100
  material_cost?: number;
  machining_cost?: number;
  setup_cost?: number;
  tooling_cost?: number;
  overhead?: number;
  margin?: number;
  price_breaks?: Array<{ quantity: number; unit_price: number; savings_pct?: number }>;
  pricing?: { margin_pct?: number; below_margin_floor?: boolean; margin_floor_pct?: number };
}) {
  const totalPrice = flat.total ?? 0;
  // adapter derives margin = total_price - total_cost, so total_cost = total_price - margin.
  const totalCost = totalPrice - (flat.margin ?? 0);
  const nested = {
    quote_id: 'QE26-TEST',
    quantity: 100,
    costs: {
      material: { total: flat.material_cost ?? 0 },
      machining: { total: flat.machining_cost ?? 0, cycle_time_min: flat.cycle_time_min ?? 0 },
      setup: { total: flat.setup_cost ?? 0 },
      tooling: { total: flat.tooling_cost ?? 0 },
      overhead: { total: flat.overhead ?? 0 },
      total_cost: totalCost,
    },
    pricing: {
      unit_price: flat.unit_price ?? 0,
      total_price: totalPrice,
      margin_pct: flat.pricing?.margin_pct ?? 0,
      below_margin_floor: flat.pricing?.below_margin_floor ?? false,
      margin_floor_pct: flat.pricing?.margin_floor_pct ?? 20,
    },
    // engine emits 0-100; the adapter divides by 100, so multiply the page-facing 0-1 value back up.
    confidence_score: Math.round((flat.confidence ?? 0) * 100),
    // engine price-break shape is { qty, unit_price, total, lead_days } -- the adapter re-keys to
    // { quantity, unit_price, savings_pct }. Invert quantity->qty so the round-trip is faithful.
    price_breaks: (flat.price_breaks ?? []).map((b) => ({ qty: b.quantity, unit_price: b.unit_price, total: b.unit_price * b.quantity, lead_days: 7 })),
  };
  return {
    ok: true,
    result: { type: 'text', text: JSON.stringify(nested) },
    safety: { score: 0.92, warnings: [] },
    meta: { formula_used: 'quote-estimate', uncertainty: 0.08 },
  };
}

// /quote/compare-materials returns the same content envelope wrapping the engine's bare array.
function compareEnvelope(comparisons: Array<Record<string, unknown>>) {
  return {
    ok: true,
    result: { type: 'text', text: JSON.stringify(comparisons) },
    safety: { score: 0.9, warnings: [] },
    meta: { formula_used: 'quote-compare', uncertainty: 0.05 },
  };
}

beforeEach(() => {
  mockDfmQuick.mockReset();
  mockDfmAnalyze.mockReset();
  mockDfmToleranceCheck.mockReset();
  mockDfmCostImpact.mockReset();
  mockDfmRules.mockReset();
  mockQuoteInstant.mockReset();
  mockQuoteQtyBreaks.mockReset();
  mockQuoteLeadTime.mockReset();
  mockQuoteHistory.mockReset();
  mockQuoteShareToken.mockReset();
  mockQuoteEstimate.mockReset();
  mockQuoteCompareMaterials.mockReset();
  mockQuotingGenerate.mockReset();

  mockDfmQuick.mockResolvedValue({
    result: { warnings: [], score: 84, pass: true },
    safety: { score: 0.9, warnings: [] },
    meta: { formula_used: 'dfm-quick', uncertainty: 0.05 },
  } as any);
  mockDfmAnalyze.mockResolvedValue({
    result: { warnings: [], score: 80, pass: true },
    safety: { score: 0.88, warnings: [] },
    meta: { formula_used: 'dfm-analyze', uncertainty: 0.06 },
  } as any);
  mockDfmToleranceCheck.mockResolvedValue({
    result: { stack_method: 'rss', stack_result_mm: 0.014, pass: true },
    safety: { score: 0.9, warnings: [] },
    meta: { formula_used: 'dfm-tolerance', uncertainty: 0.03 },
  } as any);
  mockDfmCostImpact.mockResolvedValue({
    result: { impacts: [{ driver: 'Extra setup', amount_usd: 120 }], total_cost_impact_usd: 120 },
    safety: { score: 0.86, warnings: [] },
    meta: { formula_used: 'dfm-cost-impact', uncertainty: 0.05 },
  } as any);
  mockDfmRules.mockResolvedValue({
    result: [{ id: 'thin-wall', severity: 'warning' }],
    safety: { score: 0.91, warnings: [] },
    meta: { formula_used: 'dfm-rules', uncertainty: 0.02 },
  } as any);
  mockQuoteInstant.mockResolvedValue({
    ok: true,
    data: {
      quote_id: 'Q-500',
      quantity: 100,
      unit_price: 12.5,
      total_price: 1250,
      ci95_low: 11.9,
      ci95_high: 13.1,
      confidence: 89,
      recommended_process: 'milling',
      recommended_machine: 'VF-2',
      cycle_time_min: 6.4,
      warnings: ['Check clamp clearance before release'],
    },
  } as any);
  mockQuoteQtyBreaks.mockResolvedValue({
    ok: true,
    data: [{ quantity: 100, unit_price: 12.5, savings_pct: 0 }],
  } as any);
  mockQuoteLeadTime.mockResolvedValue({
    ok: true,
    data: [{ tier: 'standard', days: 12, unit_price: 12.5 }],
  } as any);
  mockQuoteHistory.mockResolvedValue({
    ok: true,
    data: {
      quote_id: 'Q-500',
      current_status: 'draft',
      current_revision: 1,
      revisions: [
        {
          id: 'Q-500-R1',
          quote_id: 'Q-500',
          revision_number: 1,
          unit_price_usd: 12.5,
          total_price_usd: 1250,
          quantity: 100,
          cost_breakdown: {},
          quantity_breaks: [],
          lead_time_options: [],
          dfm_issues: [],
          created_at: '2026-04-10T12:00:00Z',
        },
      ],
      status_history: [
        {
          id: 'status-1',
          quote_id: 'Q-500',
          from_status: 'draft',
          to_status: 'draft',
          created_at: '2026-04-10T12:00:00Z',
        },
      ],
    },
  } as any);
  mockQuoteShareToken.mockResolvedValue({
    ok: true,
    data: { quote_id: 'Q-500', token: 'share-token', expires_in_days: 14 },
  } as any);
  mockQuoteCompareMaterials.mockResolvedValue(compareEnvelope([]) as any);
});

function renderPage(initialEntries = ['/quote-builder']) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={initialEntries}>
        <QuoteBuilderPage />
      </MemoryRouter>
    </OperatingSystemProvider>,
  );
}

describe('QuoteBuilderPage', () => {
  it('renders the quote workspace', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Quote Builder' })).toBeDefined();
    expect(screen.getByRole('button', { name: /Generate Kienzle Price Strategy/i })).toBeDefined();
    expect(screen.getAllByRole('button', { name: /Compare Materials/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Generate Pricing Packet/i })).toBeDefined();
  });

  it('renders estimate output', async () => {
    mockQuoteEstimate.mockResolvedValue(nestedEstimateEnvelope({
      unit_price: 12.5,
      total: 1250,
      cycle_time_min: 6.4,
      confidence: 0.88,
      material_cost: 140,
      machining_cost: 620,
      setup_cost: 200,
      tooling_cost: 90,
      overhead: 100,
      margin: 100,
      price_breaks: [],
    }) as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Generate Kienzle Price Strategy/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Kienzle shop best price').length).toBeGreaterThan(0);
      expect(screen.getByText('Mounted DFM route')).toBeDefined();
      expect(screen.getByText('6.4 min')).toBeDefined();
    });

    expect(mockQuoteEstimate).toHaveBeenCalledTimes(1);
    expect(mockQuoteCompareMaterials).toHaveBeenCalledTimes(1);
    expect(mockDfmQuick).toHaveBeenCalledTimes(1);
    expect(mockDfmAnalyze).toHaveBeenCalledTimes(1);
    expect(mockDfmToleranceCheck).toHaveBeenCalledTimes(1);
    expect(mockDfmCostImpact).toHaveBeenCalledTimes(1);
    expect(mockDfmRules).toHaveBeenCalledTimes(1);
  });

  it('renders material comparison and quote document output', async () => {
    mockQuoteCompareMaterials.mockResolvedValue(compareEnvelope([
      {
        material: '6061-T6',
        unit_price: 10.2,
        total: 1020,
        cycle_time_min: 5.5,
        tool_life_factor: 1.2,
      },
    ]) as any);
    mockQuotingGenerate.mockResolvedValue({
      result: { quote_number: 'Q-1001', customer: 'Acme', total: 1020 },
      safety: { score: 0.91, warnings: [] },
      meta: { formula_used: 'quote-doc', uncertainty: 0.09 },
    } as any);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /^Compare Materials$/i }));

    await waitFor(() => {
      expect(screen.getAllByText('6061-T6').length).toBeGreaterThan(0);
      expect(screen.getByText('$10.20')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: /Generate Pricing Packet/i }));

    await waitFor(() => {
      expect(screen.getByText(/Q-1001/)).toBeDefined();
      expect(screen.getByText('Instant quote')).toBeDefined();
      expect(screen.getByText('Q-500')).toBeDefined();
      expect(screen.getByText('share-token')).toBeDefined();
      expect(screen.getByText(/1 revision\(s\) · 1 status change\(s\)/i)).toBeDefined();
    });

    expect(mockQuoteInstant).toHaveBeenCalledTimes(1);
    expect(mockQuoteQtyBreaks).toHaveBeenCalledTimes(1);
    expect(mockQuoteLeadTime).toHaveBeenCalledTimes(1);
    expect(mockQuoteHistory).toHaveBeenCalledTimes(1);
    expect(mockQuoteShareToken).toHaveBeenCalledTimes(1);
  });

  it('keeps upstream customer and packet continuity in downstream release links', async () => {
    mockQuoteEstimate.mockResolvedValue(nestedEstimateEnvelope({
      unit_price: 12.5,
      total: 1250,
      cycle_time_min: 6.4,
      confidence: 0.88,
      material_cost: 140,
      machining_cost: 620,
      setup_cost: 200,
      tooling_cost: 90,
      overhead: 100,
      margin: 100,
      price_breaks: [],
    }) as any);

    renderPage([
      '/quote-builder?source=customers&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&focusPacketId=PACK-200',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Generate Kienzle Price Strategy/i }));

    const releaseUrl = new URL(
      (await screen.findByRole('link', { name: 'Open matched Print to CNC packet' })).getAttribute('href') ?? '',
      'https://kienzle.local',
    );
    expect(releaseUrl.pathname).toBe('/print-to-cnc');
    expect(releaseUrl.searchParams.get('source')).toBe('customers');
    expect(releaseUrl.searchParams.get('originSource')).toBe('customers');
    expect(releaseUrl.searchParams.get('originType')).toBe('Customer');
    expect(releaseUrl.searchParams.get('originId')).toBe('CUST-001');
    expect(releaseUrl.searchParams.get('focusType')).toBe('quote');
    expect(releaseUrl.searchParams.get('focusQuoteId')).toBeTruthy();
    expect(releaseUrl.searchParams.get('focusPacketId')).toBeTruthy();
    expect(releaseUrl.searchParams.get('partClassId')).toBeTruthy();
    expect(releaseUrl.searchParams.get('machineFamilyId')).toBeTruthy();
    expect(releaseUrl.searchParams.get('machineManufacturer')).toBeTruthy();
    expect(releaseUrl.searchParams.get('focusPacketId')).not.toBe(releaseUrl.searchParams.get('partClassId'));
  });

  it('surfaces the margin-floor alert when the quote margin is below the floor', async () => {
    mockQuoteEstimate.mockResolvedValue(nestedEstimateEnvelope({
      unit_price: 12.5,
      total: 1250,
      cycle_time_min: 6.4,
      confidence: 0.88,
      material_cost: 140,
      machining_cost: 620,
      setup_cost: 200,
      tooling_cost: 90,
      overhead: 100,
      margin: 100,
      price_breaks: [],
      pricing: { margin_pct: 11.3, below_margin_floor: true, margin_floor_pct: 20 },
    }) as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Generate Kienzle Price Strategy/i }));

    const heading = await screen.findByText('Margin floor alert.');
    const alertText = heading.closest('[role="alert"]')?.textContent ?? '';
    // cites the real eroded margin AND the floor it breached, plus the action -- not a generic warning
    expect(alertText).toContain('11.3%');
    expect(alertText).toContain('20% floor');
    expect(alertText).toContain('Review before sending this quote');
  });

  it('hides the margin-floor alert when the quote margin clears the floor', async () => {
    mockQuoteEstimate.mockResolvedValue(nestedEstimateEnvelope({
      unit_price: 12.5,
      total: 1250,
      cycle_time_min: 6.4,
      confidence: 0.88,
      material_cost: 140,
      machining_cost: 620,
      setup_cost: 200,
      tooling_cost: 90,
      overhead: 100,
      margin: 400,
      price_breaks: [],
      pricing: { margin_pct: 38, below_margin_floor: false, margin_floor_pct: 20 },
    }) as any);

    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Generate Kienzle Price Strategy/i }));

    // cycle-time tile proves the estimate resolved + the cost panel rendered
    await screen.findByText('6.4 min');
    // an above-floor quote must NOT raise the alert
    expect(screen.queryByText('Margin floor alert.')).toBeNull();
  });
});
