// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QuoteAnalyticsPage } from '../pages/QuoteAnalyticsPage';
import { analyticsAccuracy, analyticsCalibration, analyticsConversion, ApiError } from '../api/client';

vi.mock('../api/client', () => ({
  analyticsAccuracy: vi.fn(),
  analyticsConversion: vi.fn(),
  analyticsCalibration: vi.fn(),
  ApiError: class ApiError extends Error {},
}));

const mockAnalyticsAccuracy = vi.mocked(analyticsAccuracy);
const mockAnalyticsConversion = vi.mocked(analyticsConversion);
const mockAnalyticsCalibration = vi.mocked(analyticsCalibration);

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/quote-analytics']}>
      <QuoteAnalyticsPage />
    </MemoryRouter>,
  );
}

describe('QuoteAnalyticsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mockAnalyticsAccuracy.mockResolvedValue({
      result: {
        type: 'text',
        text: JSON.stringify({
          total_quotes: 0,
          quotes_with_actuals: 0,
          cost_accuracy: {
            avg_variance_pct: 0,
            median_variance_pct: 0,
            within_5pct: 0,
            within_10pct: 0,
            over_estimated_count: 0,
            under_estimated_count: 0,
          },
          by_category: {},
        }),
      },
    } as any);

    mockAnalyticsConversion.mockResolvedValue({
      result: {
        type: 'text',
        text: JSON.stringify({
          total_quotes: 0,
          won: 0,
          lost: 0,
          pending: 0,
          win_rate_pct: 0,
        }),
      },
    } as any);

    mockAnalyticsCalibration.mockResolvedValue({
      result: {
        type: 'text',
        text: JSON.stringify([]),
      },
    } as any);
  });

  it('renders the accuracy lane from nested backend analytics payloads without crashing', async () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Quote Analytics' })).toBeDefined();
    expect(await screen.findByText('Accuracy posture')).toBeDefined();
    expect(screen.getByText('Load the current accuracy lane to inspect category-level drift.')).toBeDefined();
  });

  it('renders the win-loss lane when the backend returns route-compat conversion data', async () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Win/Loss' }));

    await waitFor(() => {
      expect(screen.getByText('Pipeline posture')).toBeDefined();
    });

    expect(screen.getByText('Win rate')).toBeDefined();
    expect(screen.getByText('$0')).toBeDefined();
  });
});
