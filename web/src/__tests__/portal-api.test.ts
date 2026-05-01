// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createPortalToken, getPortalQuoteView } from '../api/portal';
import { fetchJson, getRequestHeaders } from '../api/client';

vi.mock('../api/client', () => {
  class MockApiError extends Error {
    status: number;
    kind?: string;
    hint?: string;

    constructor(status: number, message: string, options: { kind?: string; hint?: string } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.kind = options.kind;
      this.hint = options.hint;
    }
  }

  return {
    ApiError: MockApiError,
    fetchJson: vi.fn(),
    getRequestHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  };
});

const mockFetchJson = vi.mocked(fetchJson);
const mockGetRequestHeaders = vi.mocked(getRequestHeaders);

describe('portal api auth guards', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockGetRequestHeaders.mockReturnValue({ 'Content-Type': 'application/json' });
  });

  it('rejects internal portal token creation before making a network call when auth is missing', async () => {
    await expect(
      createPortalToken({
        token_type: 'quote',
        entity_id: 'QUO-1933',
      }),
    ).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'PRISM rejected this request because the current session is not authorized.',
    });

    expect(mockFetchJson).not.toHaveBeenCalled();
  });

  it('still allows public token-authenticated preview routes without bearer auth', async () => {
    mockFetchJson.mockResolvedValue({
      ok: true,
      data: {
        quote_id: 'QUO-1933',
        status: 'sent',
        revision_number: 2,
        unit_price_usd: 42,
        total_price_usd: 4200,
        quantity: 100,
        quantity_breaks: [],
        lead_time_options: [],
        dfm_issues: [],
      },
    } as any);

    const result = await getPortalQuoteView('tok-quote-1');

    expect(result.quote_id).toBe('QUO-1933');
    expect(mockFetchJson).toHaveBeenCalledTimes(1);
  });
});
