import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  InstantQuoteHistory,
  InstantQuoteRevisionEntry,
  InstantQuoteStatus,
  InstantQuoteStatusHistoryEntry,
} from '../api/types';

const mountedQuoteHistory = {
  quote_id: 'QUO-1933',
  current_status: 'viewed',
  current_revision: 2,
  revisions: [
    {
      id: 'rev-2',
      quote_id: 'QUO-1933',
      revision_number: 2,
      unit_price_usd: 42,
      total_price_usd: 4200,
      quantity: 100,
      cost_breakdown: {},
      quantity_breaks: [
        { quantity: 25, unit_price: 46, total_price: 1150 },
        { quantity: 100, unit_price: 42, total_price: 4200 },
      ],
      lead_time_options: [
        { tier: 'standard', days: 10, unit_price: 42 },
      ],
      dfm_issues: [
        { severity: 'warning', message: 'Tight shoulder blend radius' },
      ],
      change_summary: 'Updated finish pricing and lead-time posture',
      created_at: '2026-04-11T08:30:00Z',
    },
  ],
  status_history: [
    {
      id: 'status-1',
      quote_id: 'QUO-1933',
      from_status: 'sent',
      to_status: 'viewed',
      reason: 'Customer opened the quote link',
      metadata: { source: 'portal' },
      created_at: '2026-04-11T09:00:00Z',
    },
  ],
} satisfies InstantQuoteHistory;

describe('types quote history contracts', () => {
  it('models mounted quote history with revision and status trails', () => {
    expect(mountedQuoteHistory.current_status).toBe('viewed');
    expect(mountedQuoteHistory.revisions).toHaveLength(1);
    expect(mountedQuoteHistory.revisions[0].revision_number).toBe(2);
    expect(mountedQuoteHistory.status_history[0].to_status).toBe('viewed');
    expect(mountedQuoteHistory.status_history[0].metadata?.source).toBe('portal');
  });

  it('keeps the mounted quote lifecycle and nested collections strongly typed', () => {
    expectTypeOf<InstantQuoteStatus>().toEqualTypeOf<
      'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'revised'
    >();
    expectTypeOf<InstantQuoteHistory['revisions'][number]>().toEqualTypeOf<InstantQuoteRevisionEntry>();
    expectTypeOf<InstantQuoteHistory['status_history'][number]>().toEqualTypeOf<InstantQuoteStatusHistoryEntry>();
    expectTypeOf(mountedQuoteHistory.revisions[0].quantity_breaks[0]).toMatchTypeOf<{
      quantity: number;
      unit_price: number;
      total_price: number;
    }>();
    expectTypeOf(mountedQuoteHistory.status_history[0].metadata).toEqualTypeOf<Record<string, unknown> | undefined>();
  });
});
