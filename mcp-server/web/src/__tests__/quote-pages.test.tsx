/**
 * Tests for Quoting frontend pages:
 * QuoteBuilder, SecondaryOps, QuoteAnalytics, BlueprintQuote,
 * SheetMetalQuote, AdditiveQuote, InjectionMold, StockOptimizer, MaterialPricing
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock API client
vi.mock('../api/client', () => ({
  ApiError: class extends Error { status: number; constructor(s: number, m: string) { super(m); this.status = s; } },
  quoteEstimate: vi.fn().mockResolvedValue({ result: {} }),
  quoteCompareMaterials: vi.fn().mockResolvedValue({ result: [] }),
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
}));

function renderPage(Component: React.FC) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
}

describe('QuoteBuilderPage', () => {
  it('renders title and form', async () => {
    const { QuoteBuilderPage } = await import('../pages/QuoteBuilderPage');
    renderPage(QuoteBuilderPage);
    expect(screen.getByText('Quote Builder')).toBeDefined();
    expect(screen.getByText('Generate Estimate')).toBeDefined();
  });
});

describe('SecondaryOpsPage', () => {
  it('renders title and tabs', async () => {
    const { SecondaryOpsPage } = await import('../pages/SecondaryOpsPage');
    renderPage(SecondaryOpsPage);
    expect(screen.getByText('Secondary Operations')).toBeDefined();
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('Operation')).toBeDefined();
  });
});

describe('QuoteAnalyticsPage', () => {
  it('renders title and tabs', async () => {
    const { QuoteAnalyticsPage } = await import('../pages/QuoteAnalyticsPage');
    renderPage(QuoteAnalyticsPage);
    expect(screen.getByText('Quote Analytics')).toBeDefined();
    expect(screen.getByText('Accuracy')).toBeDefined();
    expect(screen.getByText('Win/Loss')).toBeDefined();
    expect(screen.getByText('Calibration')).toBeDefined();
  });
});

describe('BlueprintQuotePage', () => {
  it('renders title and form', async () => {
    const { BlueprintQuotePage } = await import('../pages/BlueprintQuotePage');
    renderPage(BlueprintQuotePage);
    expect(screen.getByText('Blueprint to Quote')).toBeDefined();
    expect(screen.getByText('Generate Quote')).toBeDefined();
  });
});

describe('SheetMetalQuotePage', () => {
  it('renders title and form', async () => {
    const { SheetMetalQuotePage } = await import('../pages/SheetMetalQuotePage');
    renderPage(SheetMetalQuotePage);
    expect(screen.getByText('Sheet Metal Quote')).toBeDefined();
    expect(screen.getByText('Generate Quote')).toBeDefined();
  });
});

describe('AdditiveQuotePage', () => {
  it('renders title and tabs', async () => {
    const { AdditiveQuotePage } = await import('../pages/AdditiveQuotePage');
    renderPage(AdditiveQuotePage);
    expect(screen.getByText('Additive Manufacturing Quote')).toBeDefined();
    expect(screen.getByText('Quote')).toBeDefined();
    expect(screen.getByText('Materials')).toBeDefined();
  });
});

describe('InjectionMoldPage', () => {
  it('renders title and tabs', async () => {
    const { InjectionMoldPage } = await import('../pages/InjectionMoldPage');
    renderPage(InjectionMoldPage);
    expect(screen.getByText('Injection Mold Quote')).toBeDefined();
    expect(screen.getByText('Mold Quote')).toBeDefined();
    expect(screen.getByText('DFM Check')).toBeDefined();
  });
});

describe('StockOptimizerPage', () => {
  it('renders title and tabs', async () => {
    const { StockOptimizerPage } = await import('../pages/StockOptimizerPage');
    renderPage(StockOptimizerPage);
    expect(screen.getByText('Stock Size Optimizer')).toBeDefined();
    expect(screen.getByText('Optimizer')).toBeDefined();
    expect(screen.getByText('Stock Catalog')).toBeDefined();
  });
});

describe('MaterialPricingPage', () => {
  it('renders title and tabs', async () => {
    const { MaterialPricingPage } = await import('../pages/MaterialPricingPage');
    renderPage(MaterialPricingPage);
    expect(screen.getByText('Material Pricing')).toBeDefined();
    expect(screen.getByText('Price Lookup')).toBeDefined();
    expect(screen.getByText('Compare Materials')).toBeDefined();
  });
});
