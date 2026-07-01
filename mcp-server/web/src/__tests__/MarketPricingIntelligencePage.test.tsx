// @vitest-environment jsdom
/**
 * MarketPricingIntelligencePage.test.tsx -- render-contract test for the operator-internal market
 * pricing intelligence page (U-MKTPRICE01).
 *
 * WHY this test exists (R9 -- tests verify intent, not behavior):
 *  1. ADVISORY BANNER must ALWAYS render on the outbound prior (it is an OCR-noisy, advisory market
 *     prior by construction) -- a future refactor that drops it would let an operator read the
 *     distribution as a firm quote.
 *  2. FLOOR-SPIKE WARNING must appear IFF a distribution's minMassFrac > 0.25 (the OCR "$1" artifact
 *     signature) -- present when it should be, ABSENT when it should not (both branches asserted).
 *  3. UNITS-BLENDED CAVEAT must render on the cost-index panel ($/bar + $/foot + $/piece blend).
 *  4. LEAK BOUNDARY: the page must NOT import or call any packet / share-token / public-quote client
 *     fn -- cost basis never flows outward. Asserted structurally against the page source.
 *  5. AUTH-REQUIRED state when the admin-gated fns return null (non-admin session).
 *
 * The page calls outboundPricePrior() / costIndexPrior() from ../api/client; we mock that module so
 * each test drives the exact PricePriorResult / CostIndexPriorResult the page renders.
 *
 * @author slot:charlie, 2026-06-23
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MarketPricingIntelligencePage } from '../pages/MarketPricingIntelligencePage';
import * as client from '../api/client';

vi.mock('../api/client', () => ({
  outboundPricePrior: vi.fn(),
  costIndexPrior: vi.fn(),
}));

const mockOutbound = vi.mocked(client.outboundPricePrior);
const mockCostIndex = vi.mocked(client.costIndexPrior);

function dist(over: Partial<Record<string, number>> = {}) {
  return { n: 42, min: 1, minMassFrac: 0.05, p5: 2, p10: 3, p25: 5, median: 12, p75: 25, p90: 48, p95: 60, max: 120, mean: 18, ...over } as any;
}

function pricePrior(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    path: 'jm-sold-orders.json',
    minConfidence: 'high',
    ordersProcessed: 42,
    recordsAvailable: 60,
    includedOrders: 42,
    advisoryOnly: true,
    caveat: 'OCR-noisy market prior',
    byConfidence: { high: 42, medium: 10, low: 5, none: 3 },
    confirmedExtRevenue: 128000,
    unitPrice: dist(),
    extPrice: null,
    orderTotal: dist({ min: 100, median: 900 }),
    ...over,
  } as any;
}

function costIndex(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    totals: { records: 5120, grossSpend: 9870000, creditTotal: 120000, netSpend: 9750000, vendorCount: 87 },
    categories: {
      'bar stock': { category: 'bar stock', count: 1800, spend: 4200000, vendorCount: 22, unitCost: { min: 1.2, median: 4.5, max: 38, n: 1800 } },
    },
    path: 'jm-vendor-cost-index.json',
    ...over,
  } as any;
}

beforeEach(() => {
  vi.resetAllMocks();
  // Sensible defaults so each test overrides only what it asserts.
  mockOutbound.mockResolvedValue(pricePrior());
  mockCostIndex.mockResolvedValue(costIndex());
});

afterEach(() => cleanup());

describe('MarketPricingIntelligencePage (U-MKTPRICE01 render contract)', () => {
  it('HAPPY: renders both panels with the advisory banner ALWAYS present on the outbound prior', async () => {
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getByText('Outbound Sold-Price Prior')).toBeInTheDocument());
    expect(screen.getByText('AP Cost-Index Prior')).toBeInTheDocument();
    // The advisory banner is mandatory -- it must render whenever the outbound prior is shown.
    expect(screen.getByText(/Advisory only/i)).toBeInTheDocument();
    // A distribution median renders (the sell-side reference value).
    expect(screen.getAllByText('$12.00').length).toBeGreaterThan(0);
  });

  it('FLOOR-SPIKE present: a unitPrice with minMassFrac > 0.25 renders the OCR floor-spike warning', async () => {
    mockOutbound.mockResolvedValue(pricePrior({ unitPrice: dist({ minMassFrac: 0.4, min: 1 }) }));
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getByText(/likely OCR/i)).toBeInTheDocument());
    expect(screen.getByText(/40\.0% of unit price values sit at the/i)).toBeInTheDocument();
  });

  it('FLOOR-SPIKE absent: a low minMassFrac (<= 0.25) renders NO floor-spike warning (the contrasting branch)', async () => {
    mockOutbound.mockResolvedValue(pricePrior({ unitPrice: dist({ minMassFrac: 0.05 }), orderTotal: dist({ minMassFrac: 0.0 }), extPrice: null }));
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getByText('Outbound Sold-Price Prior')).toBeInTheDocument());
    expect(screen.queryByText(/likely OCR/i)).not.toBeInTheDocument();
  });

  it('UNITS-BLENDED caveat renders on the cost-index panel (never a clean per-unit cost)', async () => {
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getByText('AP Cost-Index Prior')).toBeInTheDocument());
    expect(screen.getByText(/blends \$\/bar \+ \$\/foot \+ \$\/piece/i)).toBeInTheDocument();
    // The top-categories table renders the real category + its blended median.
    expect(screen.getByText('bar stock')).toBeInTheDocument();
  });

  it('AUTH-REQUIRED: when the admin-gated fns return null, both panels show the sign-in state (no crash)', async () => {
    mockOutbound.mockResolvedValue(null);
    mockCostIndex.mockResolvedValue(null);
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getAllByText(/admin-only/i).length).toBeGreaterThanOrEqual(2));
    // No distribution values leak when not authorized.
    expect(screen.queryByText('$12.00')).not.toBeInTheDocument();
  });

  it('FAIL-SOFT: an ok:false outbound prior renders an honest empty message, not a blank panel', async () => {
    mockOutbound.mockResolvedValue(pricePrior({ ok: false, caveat: 'no qualifying orders', unitPrice: null, extPrice: null, orderTotal: null }));
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(screen.getByText(/No prior available/i)).toBeInTheDocument());
  });

  it('LEAK BOUNDARY: the page CODE (comments stripped) calls NO packet / share-token / public-quote fn (cost basis never flows outward)', () => {
    // Structural guard (R12): cost_index_prior is cost basis. The page must read+display only -- it must
    // never wire a cost-basis value into a customer-facing emission. We assert against the page CODE with
    // comments stripped, so the boundary DOCUMENTATION (the JSDoc + prose that legitimately NAMES these
    // surfaces to explain the rule) does not false-trip the guard -- only a real import/call would.
    // vitest runs from the web/ package root; resolve relative to cwd (jsdom has no file:// import.meta.url).
    const pagePath = resolve(process.cwd(), 'src/pages/MarketPricingIntelligencePage.tsx');
    const raw = readFileSync(pagePath, 'utf8');
    // Strip block comments, line comments, and JSX {/* ... */} comments so prose can't match.
    const code = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')   // /* ... */ and JSDoc
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // {/* ... */} JSX comments
      .replace(/(^|[^:])\/\/[^\n]*/g, '$1'); // // line comments (not URLs)
    const forbidden = [
      'quotePacket', 'quote_packet_generate',
      'shareToken', 'generateShareToken', 'generate_share_token',
      'publicQuote', 'quoting_public_quote', 'quoting_public_instant_quote',
    ];
    for (const token of forbidden) {
      expect(code.includes(token), `page CODE must not reference outward-flow surface "${token}"`).toBe(false);
    }
    // The CODE imports + calls EXACTLY the two read-only priors (proves the only data access is read-side).
    expect(code.includes('outboundPricePrior')).toBe(true);
    expect(code.includes('costIndexPrior')).toBe(true);
  });

  it('CONFIDENCE SELECTOR: the outbound prior is re-fetched when the min-confidence tier changes', async () => {
    render(<MarketPricingIntelligencePage />);
    await waitFor(() => expect(mockOutbound).toHaveBeenCalledWith({ minConfidence: 'high' }));
    const { getByRole } = within(screen.getByText('Outbound Sold-Price Prior').closest('section')!);
    fireEvent.click(getByRole('button', { name: 'medium' }));
    await waitFor(() => expect(mockOutbound).toHaveBeenCalledWith({ minConfidence: 'medium' }));
  });
});
