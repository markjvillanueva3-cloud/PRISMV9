// @vitest-environment jsdom
/**
 * Tests for Quoting frontend pages:
 * QuoteBuilder, SecondaryOps, QuoteAnalytics, BlueprintQuote,
 * SheetMetalQuote, AdditiveQuote, InjectionMold, StockOptimizer, MaterialPricing
 */
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OperatingSystemProvider } from '../features/operating-system/OperatingSystemProvider';
import { fixtureOperatingSystemServices } from '../features/operating-system/fixtureProvider';

// Mock API client. Spread the REAL module first so the pure response-shape helpers
// (unwrapQuotingBody + adaptQuoteEstimate, used by QuoteBuilderPage to parse /quote/* responses)
// keep their real implementations -- only the network-call functions below are stubbed. Without the
// importActual spread those helpers would be undefined and the page would throw on the first call
// (estimate-flow fix, 2026-06-23).
vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
  ...actual,
  ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
  // estimate-flow fix (2026-06-23): /quote/estimate returns the MCP content envelope
  // { result: { type:"text", text } } wrapping the engine's NESTED QuoteEstimateResult (costs.*/
  // pricing.*). The page unwraps + adaptQuoteEstimate maps nested->flat. A flat { result } mock is
  // the WRONG contract (the dead-panel/estimate trap) -- mock the real shape so adapt re-derives
  // material_cost 120 / machining 380 / setup 95 / tooling 40 / overhead 70 / unit 8.15 / total 815 /
  // margin 110 (total-cost=705) / cycle 5.8 / confidence 0.87 (score 87) / 2 price breaks.
  quoteEstimate: vi.fn().mockResolvedValue({
    result: {
      type: 'text',
      text: JSON.stringify({
        quote_id: 'QE26-QP',
        quantity: 100,
        costs: {
          material: { total: 120 },
          machining: { total: 380, cycle_time_min: 5.8 },
          setup: { total: 95 },
          tooling: { total: 40 },
          overhead: { total: 70 },
          total_cost: 705,
        },
        pricing: { unit_price: 8.15, total_price: 815, margin_pct: 13.5, below_margin_floor: false, margin_floor_pct: 20 },
        confidence_score: 87,
        price_breaks: [
          { qty: 25, unit_price: 11.4, total: 285, lead_days: 7 },
          { qty: 100, unit_price: 8.15, total: 815, lead_days: 10 },
        ],
      }),
    },
  }),
  // /quote/compare-materials returns the same envelope wrapping the engine's bare array.
  quoteCompareMaterials: vi.fn().mockResolvedValue({
    result: {
      type: 'text',
      text: JSON.stringify([
        { material: '6061-T6', unit_price: 8.15, total: 815, cycle_time_min: 5.8, tool_life_factor: 1.1 },
        { material: '7075-T6', unit_price: 8.75, total: 875, cycle_time_min: 5.4, tool_life_factor: 0.96 },
        { material: '304 Stainless', unit_price: 9.8, total: 980, cycle_time_min: 6.9, tool_life_factor: 0.82 },
        { material: '4140 Steel', unit_price: 7.95, total: 795, cycle_time_min: 6.2, tool_life_factor: 1.08 },
      ]),
    },
  }),
  dfmQuick: vi.fn().mockResolvedValue({
    result: {
      warnings: [
        {
          severity: 'warning',
          message: 'Tight bore tolerance',
          recommendation: 'Add finish-pass allowance',
        },
      ],
      score: 81,
      pass: true,
    },
  }),
  dfmAnalyze: vi.fn().mockResolvedValue({
    result: {
      warnings: [
        {
          severity: 'critical',
          message: 'Thin wall near clamp face',
          recommendation: 'Increase wall thickness or revise the clamping datum.',
        },
      ],
      score: 72,
      pass: false,
    },
  }),
  dfmToleranceCheck: vi.fn().mockResolvedValue({
    result: {
      stack_method: 'rss',
      stack_result_mm: 0.014,
      pass: true,
    },
  }),
  dfmCostImpact: vi.fn().mockResolvedValue({
    result: {
      impacts: [{ driver: 'Extra setup', amount_usd: 120 }],
      total_cost_impact_usd: 120,
    },
  }),
  dfmRules: vi.fn().mockResolvedValue({
    result: [
      { id: 'thin-wall', severity: 'warning' },
      { id: 'deep-pocket', severity: 'warning' },
    ],
  }),
  quoteInstant: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      quote_id: 'Q-200',
      quantity: 100,
      unit_price: 8.4,
      total_price: 840,
      ci95_low: 7.9,
      ci95_high: 8.9,
      confidence: 91,
      recommended_process: 'milling',
      recommended_machine: 'VF-2',
      cycle_time_min: 6.1,
      warnings: ['Check clamp clearance before release'],
    },
  }),
  quoteQtyBreaks: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { quantity: 25, unit_price: 10.4, savings_pct: 0 },
      { quantity: 100, unit_price: 8.4, savings_pct: 19.2 },
    ],
  }),
  quoteLeadTime: vi.fn().mockResolvedValue({
    ok: true,
    data: [
      { tier: 'standard', days: 12, unit_price: 8.4 },
      { tier: 'expedited', days: 7, unit_price: 9.6 },
    ],
  }),
  quoteHistory: vi.fn().mockResolvedValue({
    ok: true,
    // Real InstantQuoteHistory contract (web/src/api/types.ts:840): a rich object,
    // NOT a flat array. The component reads .revisions / .status_history / .current_*
    // off this exact shape; feeding an array crashes the render at .revisions.length.
    data: {
      quote_id: 'Q-200',
      current_status: 'sent',
      current_revision: 2,
      revisions: [
        { id: 'Q-200-R1', quote_id: 'Q-200', revision_number: 1, unit_price_usd: 8.4, total_price_usd: 840, quantity: 100, cost_breakdown: {}, quantity_breaks: [], lead_time_options: [], dfm_issues: [], created_at: '2026-06-01T00:00:00Z' },
        { id: 'Q-200-R2', quote_id: 'Q-200', revision_number: 2, unit_price_usd: 8.2, total_price_usd: 820, quantity: 100, cost_breakdown: {}, quantity_breaks: [], lead_time_options: [], dfm_issues: [], created_at: '2026-06-02T00:00:00Z' },
      ],
      status_history: [
        { id: 'SH-1', quote_id: 'Q-200', from_status: 'draft', to_status: 'sent', created_at: '2026-06-02T00:00:00Z' },
      ],
    },
  }),
  quoteShareToken: vi.fn().mockResolvedValue({
    ok: true,
    data: { quote_id: 'Q-200', token: 'share-token', expires_in_days: 14 },
  }),
  quotingGenerate: vi.fn().mockResolvedValue({ result: { id: 'QUOTE-1', status: 'draft' } }),
  quoteWhatIf: vi.fn().mockResolvedValue({ result: {} }),
  secOpsList: vi.fn().mockResolvedValue({ result: [] }),
  secOpsQuote: vi.fn().mockResolvedValue({ result: {} }),
  analyticsAccuracy: vi.fn().mockResolvedValue({ result: { total_quotes: 50, avg_variance_pct: -3.2, over_estimated_pct: 35, under_estimated_pct: 15, categories: [] } }),
  analyticsConversion: vi.fn().mockResolvedValue({ result: { total_quotes: 50, won: 30, lost: 10, pending: 10, win_rate: 60, avg_won_value: 5000, avg_lost_value: 8000 } }),
  analyticsCalibration: vi.fn().mockResolvedValue({ result: [] }),
  blueprintToQuote: vi.fn().mockResolvedValue({ result: {} }),
  sheetMetalQuote: vi.fn().mockResolvedValue({ result: {} }),
  additiveQuote: vi.fn().mockResolvedValue({ result: {} }),
  additiveListMaterials: vi.fn().mockResolvedValue({ result: [] }),
  additiveCompareTech: vi.fn().mockResolvedValue({ result: [] }),
  injectionMoldQuote: vi.fn().mockResolvedValue({ result: {} }),
  injectionMoldMaterials: vi.fn().mockResolvedValue({ result: [] }),
  injectionMoldDfm: vi.fn().mockResolvedValue({ result: {} }),
  stockSizeOptimize: vi.fn().mockResolvedValue({ result: {} }),
  stockSizeCatalog: vi.fn().mockResolvedValue({ result: {} }),
  materialPriceLookup: vi.fn().mockResolvedValue({ result: {} }),
  materialPriceCompare: vi.fn().mockResolvedValue({ result: [] }),
  materialSurcharge: vi.fn().mockResolvedValue({ result: {} }),
  };
});

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(Component: React.FC, initialEntries = ['/']) {
  return render(
    <OperatingSystemProvider services={fixtureOperatingSystemServices}>
      <MemoryRouter initialEntries={initialEntries}>
        <Component />
      </MemoryRouter>
    </OperatingSystemProvider>
  );
}

describe('QuoteBuilderPage', () => {
  it('renders title and form', async () => {
    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage);
    expect(screen.getByText('Quote Builder')).toBeDefined();
    expect(screen.getByText('Generate Kienzle Price Strategy')).toBeDefined();
  });

  it('surfaces a primary shop-best strategy with internal scenarios', async () => {
    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage);

    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    await waitFor(() => {
      expect(screen.getAllByText('Kienzle shop best price').length).toBeGreaterThan(0);
    });

    expect(screen.getByText('Pricing scenario set')).toBeDefined();
    expect(screen.getByText('Margin-protect floor')).toBeDefined();
    expect(screen.getByText('Axhera network target')).toBeDefined();
    expect(screen.getByText('Quality safeguard')).toBeDefined();
    expect(screen.getByText('Mounted DFM route')).toBeDefined();
    expect(screen.getByText('Tight bore tolerance')).toBeDefined();
    expect(screen.getByText('Add finish-pass allowance')).toBeDefined();
    expect(screen.getByText('Thin wall near clamp face')).toBeDefined();
    expect(screen.getByText('Increase wall thickness or revise the clamping datum.')).toBeDefined();
    expect(screen.getByText('Tolerance stack')).toBeDefined();
    expect(screen.getByText('Cost delta')).toBeDefined();
    expect(screen.getByText('Rule pack')).toBeDefined();
    expect(screen.getByText('Extra setup: $120.00')).toBeDefined();
    expect(screen.getByText('thin-wall')).toBeDefined();
    expect(screen.getByText('deep-pocket')).toBeDefined();
    expect(screen.getByText('Requirements review')).toBeDefined();
    expect(screen.getByText('Production handoff posture')).toBeDefined();
    expect(screen.getByText('Axhera delta')).toBeDefined();
    expect(await screen.findByText('Machining decision pipeline')).toBeDefined();
    expect(screen.getByText('Calibration feedback loop')).toBeDefined();
    const inventoryIntakeHref = (await screen.findByRole('link', { name: 'Open inventory intake' })).getAttribute('href') ?? '';
    expect(inventoryIntakeHref).toContain('/inventory?');
    expect(inventoryIntakeHref).toContain('source=quote-builder');
    expect(inventoryIntakeHref).toContain('originSource=quote-builder');
    expect(inventoryIntakeHref).toContain('originType=Quote');
    expect(inventoryIntakeHref).toContain('focusType=quote');
    expect(inventoryIntakeHref).toContain('focusQuoteId=');
    const toolEconomicsHref = (await screen.findByRole('link', { name: 'Open tool economics' })).getAttribute('href') ?? '';
    expect(toolEconomicsHref).toContain('tab=toolopt');
    expect(toolEconomicsHref).toContain('focusPacketId=');
    const sourcingHref = (await screen.findByRole('link', { name: 'Open sourcing posture' })).getAttribute('href') ?? '';
    expect(sourcingHref).toContain('/purchasing?');
    expect(sourcingHref).toContain('source=quote-builder');
    expect(sourcingHref).toContain('tab=recommend');
    expect(sourcingHref).toContain('material=6061-T6');
    const qualityHref = (await screen.findByRole('link', { name: 'Open quality handoff' })).getAttribute('href') ?? '';
    expect(qualityHref).toContain('/quality?');
    expect(qualityHref).toContain('source=quote-builder');
    expect(qualityHref).toContain('tab=matcert');
    expect((await screen.findByRole('link', { name: 'Open shop-floor actuals' })).getAttribute('href')).toContain('/shop-clock?');
    expect((await screen.findByRole('link', { name: 'Open shop-floor actuals' })).getAttribute('href')).toContain('source=quote-builder');
    expect((await screen.findByRole('link', { name: 'Open shop-floor actuals' })).getAttribute('href')).toContain('department=Job+setup');
    expect((await screen.findByRole('link', { name: 'Open Capture Ops' })).getAttribute('href')).toContain('/capture?');
    expect((await screen.findByRole('link', { name: 'Open matched Print to CNC packet' })).getAttribute('href')).toContain('/print-to-cnc?');
  });

  it('renders the mounted instant-quote business lane inside the pricing packet view', async () => {
    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage);

    fireEvent.click(screen.getByText('Generate Pricing Packet'));

    await waitFor(() => {
      expect(screen.getByText('Generated pricing packet')).toBeDefined();
    });

    expect(screen.getByText('Instant quote')).toBeDefined();
    expect(screen.getByText('Q-200')).toBeDefined();
    expect(screen.getByText('Portal and revision readiness')).toBeDefined();
    expect(screen.getByText('share-token')).toBeDefined();
    // Verifies the component read the rich InstantQuoteHistory shape correctly:
    // 2 revisions + 1 status-history entry must render their real counts.
    const historyLine = screen.getByText(/revision\(s\)/);
    expect(historyLine.textContent).toMatch(/2 revision\(s\).*1 status change\(s\)/);
    expect(screen.getByText('Mounted qty breaks')).toBeDefined();
    expect(screen.getByText('Lead-time options')).toBeDefined();
    expect(screen.getByText('standard')).toBeDefined();
    expect(screen.getByText('expedited')).toBeDefined();
    expect(screen.getByText('Check clamp clearance before release')).toBeDefined();
  });

  it('degrades gracefully when the history surface returns a partial object (no white-screen)', async () => {
    const client = await import('../api/client');
    // Backend returned history truthy but WITHOUT the revisions/status_history arrays
    // (degraded/partial response). Compile-time types say those arrays are always present,
    // but a real backend hiccup can violate that -- the packet view must degrade gracefully,
    // not crash the entire quote with "Cannot read properties of undefined (reading 'length')".
    vi.mocked(client.quoteHistory).mockResolvedValueOnce({
      ok: true,
      data: { quote_id: 'Q-200', current_status: 'draft', current_revision: 1 },
    } as unknown as Awaited<ReturnType<typeof client.quoteHistory>>);

    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage);

    fireEvent.click(screen.getByText('Generate Pricing Packet'));

    // findByText throws if the panel never mounts -- proving the render did NOT crash on
    // the degraded history shape (the bug would white-screen before this text appears).
    const packetHeader = await screen.findByText('Generated pricing packet');
    expect(packetHeader.textContent).toBe('Generated pricing packet');

    // The guard renders zero counts rather than throwing on the missing arrays.
    const historyLine = screen.getByText(/revision\(s\)/);
    expect(historyLine.textContent).toMatch(/0 revision\(s\).*0 status change\(s\)/);
  });

  it('shows upstream customer context when launched from customers', async () => {
    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage, [
      '/quote-builder?source=customers&recordType=Customer&recordId=CUST-001&customer=Acme%20Aerospace&note=Carry%20credit%20review%20context%20into%20pricing',
    ]);

    expect(screen.getByText(/Customers & CRM opened Quote Builder with context/i)).toBeDefined();
    expect(screen.getByText(/Customer CUST-001 \(Acme Aerospace\)/i)).toBeDefined();
    expect(screen.getByText(/Carry credit review context into pricing/i)).toBeDefined();

    fireEvent.click(screen.getByText('Generate Kienzle Price Strategy'));

    await waitFor(() => {
      expect(screen.getAllByText('Kienzle shop best price').length).toBeGreaterThan(0);
    });

    const releaseLink = await screen.findByText('Open matched Print to CNC packet');
    const releaseHref = releaseLink.closest('a')?.getAttribute('href');
    expect(releaseHref).toContain('/print-to-cnc?');
    expect(releaseHref).toContain('originSource=customers');
    expect(releaseHref).toContain('originType=Customer');
    expect(releaseHref).toContain('originId=CUST-001');
    expect(releaseHref).toContain('focusType=quote');
    expect(releaseHref).toContain('focusQuoteId=');
    expect(releaseHref).toContain('focusPacketId=');

    const releaseParams = new URLSearchParams(releaseHref?.split('?')[1] ?? '');
    expect(releaseParams.get('focusPacketId')).toBeTruthy();
    expect(releaseParams.get('partClassId')).toBeTruthy();
    expect(releaseParams.get('machineFamilyId')).toBeTruthy();
    expect(releaseParams.get('machineManufacturer')).toBeTruthy();
    expect(releaseParams.get('focusPacketId')).not.toBe(releaseParams.get('partClassId'));

    const inventoryLink = await screen.findByRole('link', { name: 'Open inventory intake' });
    const inventoryHref = inventoryLink.getAttribute('href') ?? '';
    expect(inventoryHref).toContain('/inventory?');
    expect(inventoryHref).toContain('source=quote-builder');
    expect(inventoryHref).toContain('originSource=customers');
    expect(inventoryHref).toContain('originType=Customer');
    expect(inventoryHref).toContain('originId=CUST-001');
    expect(inventoryHref).toContain('originCustomer=Acme+Aerospace');
    expect(inventoryHref).toContain('focusType=quote');
    expect(inventoryHref).toContain('focusQuoteId=');

    const purchasingHref = (await screen.findByRole('link', { name: 'Open sourcing posture' })).getAttribute('href') ?? '';
    expect(purchasingHref).toContain('/purchasing?');
    expect(purchasingHref).toContain('source=quote-builder');
    expect(purchasingHref).toContain('originSource=customers');
    expect(purchasingHref).toContain('originType=Customer');
    expect(purchasingHref).toContain('originId=CUST-001');

    const qualityHref = (await screen.findByRole('link', { name: 'Open quality handoff' })).getAttribute('href') ?? '';
    expect(qualityHref).toContain('/quality?');
    expect(qualityHref).toContain('source=quote-builder');
    expect(qualityHref).toContain('originSource=customers');
    expect(qualityHref).toContain('focusType=quote');
  });
});

describe('SecondaryOpsPage', () => {
  it('renders title and tabs', async () => {
    const { SecondaryOpsPage } = await import('../pages/SecondaryOpsPage');
    renderPage(SecondaryOpsPage);
    expect(screen.getByText('Secondary Operations')).toBeDefined();
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operation').length).toBeGreaterThan(0);
  });
});

describe('QuoteAnalyticsPage', () => {
  it('renders title and tabs', async () => {
    const { QuoteAnalyticsPage } = await import('../pages/QuoteAnalyticsPage');
    renderPage(QuoteAnalyticsPage);
    expect(screen.getByText('Quote Analytics')).toBeDefined();
    expect(screen.getAllByText('Accuracy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Win/Loss').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Calibration').length).toBeGreaterThan(0);
  });
});

describe('BlueprintQuotePage', () => {
  it('renders title and form', async () => {
    const { BlueprintQuotePage } = await import('../pages/BlueprintQuotePage');
    renderPage(BlueprintQuotePage);
    expect(screen.getByText('Blueprint to Quote')).toBeDefined();
    expect(screen.getAllByText('Generate Quote').length).toBeGreaterThan(0);
  });
});

describe('SheetMetalQuotePage', () => {
  it('renders title and form', async () => {
    const { SheetMetalQuotePage } = await import('../pages/SheetMetalQuotePage');
    renderPage(SheetMetalQuotePage);
    expect(screen.getByText('Sheet Metal Quote')).toBeDefined();
    expect(screen.getAllByText('Generate Quote').length).toBeGreaterThan(0);
  });
});

describe('AdditiveQuotePage', () => {
  it('renders title and tabs', async () => {
    const { AdditiveQuotePage } = await import('../pages/AdditiveQuotePage');
    renderPage(AdditiveQuotePage);
    expect(screen.getByText('Additive Manufacturing Quote')).toBeDefined();
    expect(screen.getAllByText('Quote').length).toBeGreaterThan(0);
    expect(screen.getByText('Materials')).toBeDefined();
  });
});

describe('InjectionMoldPage', () => {
  it('renders title and tabs', async () => {
    const { InjectionMoldPage } = await import('../pages/InjectionMoldPage');
    renderPage(InjectionMoldPage);
    expect(screen.getByText('Injection Mold Quote')).toBeDefined();
    expect(screen.getAllByText('Mold Quote').length).toBeGreaterThan(0);
    expect(screen.getByText('DFM Check')).toBeDefined();
  });
});

describe('StockOptimizerPage', () => {
  it('renders title and tabs', async () => {
    const { StockOptimizerPage } = await import('../pages/StockOptimizerPage');
    renderPage(StockOptimizerPage);
    expect(screen.getByText('Stock Size Optimizer')).toBeDefined();
    expect(screen.getAllByText('Optimizer').length).toBeGreaterThan(0);
    expect(screen.getByText('Stock Catalog')).toBeDefined();
  });
});

describe('MaterialPricingPage', () => {
  it('renders title and tabs', async () => {
    const { MaterialPricingPage } = await import('../pages/MaterialPricingPage');
    renderPage(MaterialPricingPage);
    expect(screen.getByText('Material Pricing')).toBeDefined();
    expect(screen.getAllByText('Price Lookup').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Compare Materials').length).toBeGreaterThan(0);
  });
});
