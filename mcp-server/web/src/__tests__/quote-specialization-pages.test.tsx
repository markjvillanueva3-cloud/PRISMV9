import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdditiveQuotePage } from '../pages/AdditiveQuotePage';
import { BlueprintQuotePage } from '../pages/BlueprintQuotePage';
import { InjectionMoldPage } from '../pages/InjectionMoldPage';
import { QuoteAnalyticsPage } from '../pages/QuoteAnalyticsPage';
import { SheetMetalQuotePage } from '../pages/SheetMetalQuotePage';
import {
  additiveCompareTech,
  additiveListMaterials,
  additiveQuote,
  analyticsAccuracy,
  analyticsCalibration,
  analyticsConversion,
  blueprintToQuote,
  injectionMoldDfm,
  injectionMoldMaterials,
  injectionMoldQuote,
  sheetMetalQuote,
} from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    additiveCompareTech: vi.fn(),
    additiveListMaterials: vi.fn(),
    additiveQuote: vi.fn(),
    analyticsAccuracy: vi.fn(),
    analyticsCalibration: vi.fn(),
    analyticsConversion: vi.fn(),
    blueprintToQuote: vi.fn(),
    injectionMoldDfm: vi.fn(),
    injectionMoldMaterials: vi.fn(),
    injectionMoldQuote: vi.fn(),
    sheetMetalQuote: vi.fn(),
  };
});

const mockAdditiveCompareTech = vi.mocked(additiveCompareTech);
const mockAdditiveListMaterials = vi.mocked(additiveListMaterials);
const mockAdditiveQuote = vi.mocked(additiveQuote);
const mockAnalyticsAccuracy = vi.mocked(analyticsAccuracy);
const mockAnalyticsCalibration = vi.mocked(analyticsCalibration);
const mockAnalyticsConversion = vi.mocked(analyticsConversion);
const mockBlueprintToQuote = vi.mocked(blueprintToQuote);
const mockInjectionMoldDfm = vi.mocked(injectionMoldDfm);
const mockInjectionMoldMaterials = vi.mocked(injectionMoldMaterials);
const mockInjectionMoldQuote = vi.mocked(injectionMoldQuote);
const mockSheetMetalQuote = vi.mocked(sheetMetalQuote);

function renderPage(node: React.ReactNode) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

beforeEach(() => {
  mockAdditiveCompareTech.mockReset();
  mockAdditiveListMaterials.mockReset();
  mockAdditiveQuote.mockReset();
  mockAnalyticsAccuracy.mockReset();
  mockAnalyticsCalibration.mockReset();
  mockAnalyticsConversion.mockReset();
  mockBlueprintToQuote.mockReset();
  mockInjectionMoldDfm.mockReset();
  mockInjectionMoldMaterials.mockReset();
  mockInjectionMoldQuote.mockReset();
  mockSheetMetalQuote.mockReset();

  mockAdditiveQuote.mockResolvedValue({
    result: {
      technology: 'SLS',
      material: 'PA12_Nylon',
      build_time_hours: 14.5,
      material_cost: 215,
      machine_cost: 330,
      post_processing_cost: 125,
      total: 670,
      unit_price: 67,
    },
  } as any);
  mockAdditiveListMaterials.mockResolvedValue({
    result: {
      materials: [
        { id: 'mat-1', name: 'PA12 Nylon', technology: 'SLS', price_per_kg: 82 },
      ],
    },
  } as any);
  mockAdditiveCompareTech.mockResolvedValue({
    result: [
      { technology: 'SLS', unit_price: 67 },
      { technology: 'MJF', unit_price: 71.5 },
    ],
  } as any);
  mockAnalyticsAccuracy.mockResolvedValue({
    result: {
      total_quotes: 64,
      avg_variance_pct: -2.8,
      over_estimated_pct: 31,
      under_estimated_pct: 18,
      categories: [
        { category: 'material', avg_variance: -4.2, count: 16 },
        { category: 'labor', avg_variance: 8.5, count: 23 },
      ],
    },
  } as any);
  mockAnalyticsConversion.mockResolvedValue({
    result: {
      total_quotes: 64,
      won: 40,
      lost: 12,
      pending: 12,
      win_rate: 62,
      avg_won_value: 8600,
      avg_lost_value: 10100,
    },
  } as any);
  mockAnalyticsCalibration.mockResolvedValue({
    result: {
      suggestions: [
        {
          category: 'labor',
          adjustment_pct: 6.5,
          reason: 'Setup-intensive jobs are still landing below modeled labor recovery.',
          confidence: 0.84,
        },
      ],
    },
  } as any);
  mockBlueprintToQuote.mockResolvedValue({
    result: {
      material: '6061-T6',
      unit_price: 128.5,
      total_cost: 3212.5,
      lead_time_days: 7,
      operations: [
        { type: 'rough milling', time_min: 42, cost: 810 },
        { type: 'finish milling', time_min: 24, cost: 440 },
      ],
    },
  } as any);
  mockSheetMetalQuote.mockResolvedValue({
    result: {
      material_cost: 420,
      cutting_cost: 180,
      bending_cost: 145,
      finishing_cost: 95,
      total: 840,
      unit_price: 16.8,
      lead_time_days: 5,
    },
  } as any);
  mockInjectionMoldQuote.mockResolvedValue({
    result: {
      mold_cost: 18500,
      per_part_cost: 1.84,
      cycle_time_s: 31.5,
      total_cost: 36840,
      unit_price: 2.46,
      amortized_mold_cost: 0.62,
      material_cost_per_part: 0.71,
    },
  } as any);
  mockInjectionMoldMaterials.mockResolvedValue({
    result: {
      materials: [
        { key: 'abs', name: 'ABS', price_per_kg: 3.2, shrinkage_pct: 0.6, min_wall_mm: 1.2, max_wall_mm: 4 },
      ],
    },
  } as any);
  mockInjectionMoldDfm.mockResolvedValue({
    result: {
      pass: false,
      score: 74,
      warnings: [
        {
          severity: 'warning',
          message: 'Wall thickness varies sharply near the gate region.',
          recommendation: 'Normalize wall transitions before final tooling review.',
        },
      ],
    },
  } as any);
});

afterEach(() => {
  cleanup();
});

describe('quote specialization pages', () => {
  it('renders the rebuilt quote analytics workspace and calibration lane', async () => {
    renderPage(<QuoteAnalyticsPage />);

    expect(await screen.findByRole('heading', { name: 'Quote Analytics' })).toBeDefined();
    expect(screen.getAllByText('64').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Win/Loss' }));

    await waitFor(() => {
      expect(screen.getByText('62%')).toBeDefined();
      expect(screen.getByText('$8,600')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Calibration' }));

    await waitFor(() => {
      expect(screen.getByText(/Setup-intensive jobs/i)).toBeDefined();
      expect(screen.getByText('+6.5%')).toBeDefined();
    });
  });

  it('renders the rebuilt blueprint quote desk and stages the operation ladder', async () => {
    renderPage(<BlueprintQuotePage />);

    expect(screen.getByRole('heading', { name: 'Blueprint to Quote' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Quote' })[1]);

    await waitFor(() => {
      expect(screen.getByText('$128.50')).toBeDefined();
      expect(screen.getByText('$3212.50')).toBeDefined();
      expect(screen.getByText(/rough milling/i)).toBeDefined();
    });
  });

  it('renders the rebuilt sheet metal quote desk and cost breakdown', async () => {
    renderPage(<SheetMetalQuotePage />);

    expect(screen.getByRole('heading', { name: 'Sheet Metal Quote' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Quote' })[1]);

    await waitFor(() => {
      expect(screen.getByText('$16.80')).toBeDefined();
      expect(screen.getAllByText('$840.00').length).toBeGreaterThan(0);
      expect(screen.getByText('$145.00')).toBeDefined();
    });
  });

  it('renders the rebuilt additive quote desk and technology comparison', async () => {
    renderPage(<AdditiveQuotePage />);

    expect(screen.getByRole('heading', { name: 'Additive Manufacturing Quote' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Quote' })[1]);

    await waitFor(() => {
      expect(screen.getByText('$67.00')).toBeDefined();
      expect(screen.getByText('14.5h')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Compare Tech' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Compare technologies' })[1]);

    await waitFor(() => {
      expect(screen.getByText('MJF')).toBeDefined();
      expect(screen.getByText('$71.50')).toBeDefined();
    });
  });

  it('renders the rebuilt injection mold desk and DFM posture', async () => {
    renderPage(<InjectionMoldPage />);

    expect(screen.getByRole('heading', { name: 'Injection Mold Quote' })).toBeDefined();
    fireEvent.click(screen.getAllByRole('button', { name: 'Generate Quote' })[1]);

    await waitFor(() => {
      expect(screen.getByText('$18,500')).toBeDefined();
      expect(screen.getByText('$2.460')).toBeDefined();
    });

    fireEvent.click(screen.getByRole('button', { name: 'DFM Check' }));

    await waitFor(() => {
      expect(screen.getByText('74/100')).toBeDefined();
      expect(screen.getByText(/Wall thickness varies sharply/i)).toBeDefined();
    });
  });
});
