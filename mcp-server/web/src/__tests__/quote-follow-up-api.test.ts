// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteHistory, quoteStatusChange } from '../api/client';
import { fetchJson } from '../api/requestCore';

vi.mock('../api/requestCore', () => ({
  ApiError: class extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
  fetchJson: vi.fn(),
}));

const mockFetchJson = vi.mocked(fetchJson);

describe('quote follow-up api contracts', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('loads mounted quote history from the quotes route', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      data: {
        quote_id: 'QUO-1933',
        current_status: 'viewed',
        current_revision: 2,
        revisions: [],
        status_history: [],
      },
    } as any);

    const result = await quoteHistory('QUO-1933');

    expect(result.data.quote_id).toBe('QUO-1933');
    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quotes/QUO-1933/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: undefined,
      fallbackMessage: 'PRISM data request failed',
    });
  });

  it('posts status changes through the mounted quote status route with the route-owned quote id', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      result: {
        id: 'status-2',
        quote_id: 'QUO-1933',
        to_status: 'rejected',
      },
    } as any);

    await quoteStatusChange({
      quote_id: 'QUO-1933',
      to_status: 'rejected',
      reason: 'Competitor won',
      metadata: {
        source: 'quote-follow-up',
        competitor_name: 'Rival Tool',
      },
    });

    expect(mockFetchJson).toHaveBeenCalledWith('/api/v1/quotes/QUO-1933/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_status: 'rejected',
        reason: 'Competitor won',
        metadata: {
          source: 'quote-follow-up',
          competitor_name: 'Rival Tool',
        },
      }),
      fallbackMessage: 'PRISM request failed',
    });
  });
});
