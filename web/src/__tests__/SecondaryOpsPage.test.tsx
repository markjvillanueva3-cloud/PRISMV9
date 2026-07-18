import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SecondaryOpsPage } from '../pages/SecondaryOpsPage';
import { secOpsList, secOpsQuote, secOpsRecommend, ApiError } from '../api/client';

vi.mock('../api/client', async () => {
  const actual = await vi.importActual<typeof import('../api/client')>('../api/client');
  return {
    ...actual,
    secOpsList: vi.fn(),
    secOpsQuote: vi.fn(),
    secOpsRecommend: vi.fn(),
  };
});

const mockSecOpsList = vi.mocked(secOpsList);
const mockSecOpsQuote = vi.mocked(secOpsQuote);
const mockSecOpsRecommend = vi.mocked(secOpsRecommend);

const SAMPLE_OPS = [
  {
    id: 'AO-001',
    name: 'Type II Anodize',
    category: 'anodize',
    description: 'Standard protective anodize for aluminum parts.',
    typical_cost_range: { min: 12.5, max: 24.5 },
    lead_time_days: 5,
  },
  {
    id: 'HT-101',
    name: 'Vacuum Heat Treat',
    category: 'heat_treat',
    description: 'Controlled heat-treat cycle for alloy and tool steel parts.',
    typical_cost_range: { min: 18, max: 42 },
    lead_time_days: 7,
  },
];

beforeEach(() => {
  mockSecOpsList.mockReset();
  mockSecOpsQuote.mockReset();
  mockSecOpsRecommend.mockReset();

  mockSecOpsList.mockResolvedValue({
    result: { operations: SAMPLE_OPS },
    safety: { score: 0.94, warnings: [] },
    meta: { formula_used: 'sec-ops-list', uncertainty: 0.05 },
  });
});

describe('SecondaryOpsPage', () => {
  it('renders the page and loads the operations catalog', async () => {
    render(<SecondaryOpsPage />);

    expect(screen.getByRole('heading', { name: 'Secondary Operations' })).toBeDefined();

    await waitFor(() => {
      expect(screen.getAllByText('Type II Anodize').length).toBeGreaterThan(0);
    });
  });

  it('runs recommendations for the selected material', async () => {
    mockSecOpsRecommend.mockResolvedValue({
      result: {
        recommendations: [
          { operation: 'Type II Anodize', reason: 'Fits aluminum corrosion and cosmetic requirements.' },
        ],
      },
      safety: { score: 0.89, warnings: [] },
      meta: { formula_used: 'sec-ops-recommend', uncertainty: 0.11 },
    });

    render(<SecondaryOpsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Type II Anodize').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Recommend' }));

    await waitFor(() => {
      expect(screen.getByText('Fits aluminum corrosion and cosmetic requirements.')).toBeDefined();
    });
  });

  it('quotes the selected operation', async () => {
    mockSecOpsQuote.mockResolvedValue({
      result: {
        operation: 'Type II Anodize',
        unit_cost: 16.25,
        total: 1625,
        lead_time_days: 5,
      },
      safety: { score: 0.9, warnings: [] },
      meta: { formula_used: 'sec-ops-quote', uncertainty: 0.07 },
    });

    render(<SecondaryOpsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Type II Anodize').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Get Quote' }));

    await waitFor(() => {
      expect(screen.getByText('$16.25')).toBeDefined();
      expect(screen.getByText('$1625.00')).toBeDefined();
    });
  });

  it('shows an actionable load error state', async () => {
    mockSecOpsList.mockRejectedValueOnce(new ApiError(500, 'Failed to load operations'));

    render(<SecondaryOpsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load operations')).toBeDefined();
    });
  });
});
