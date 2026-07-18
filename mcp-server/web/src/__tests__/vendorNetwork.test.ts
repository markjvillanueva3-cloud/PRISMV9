// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as dispatch from '../api/businessDispatch';
import {
  vendorCatalogQuery,
  vendorComputeScorecard,
  vendorListAll,
  vendorRank,
  type RankedVendor,
  type VendorRecord,
  type VendorScorecard,
} from '../api/vendorNetwork';

// The bindings are a thin layer over callBusinessAction; the value under test is that each
// method sends the EXACT action literal + param shape the dispatcher expects, and unwraps the
// result. We spy on callBusinessAction and assert both halves (the unwrap path is exercised by
// returning each of the dispatcher's two real shapes — bare array vs { success, data }).
afterEach(() => vi.restoreAllMocks());

describe('vendorCatalogQuery', () => {
  it('sends vendor_catalog_query with the filter nested under params.filter and returns the bare array', async () => {
    const corpus: VendorRecord[] = [
      { name: 'Niagara Cutter', vendor_type: 'tool-maker', categories: ['end-mills'], regions: ['US'] },
      { name: 'Guhring', vendor_type: 'tool-maker', categories: ['drills'], regions: ['US', 'DE'] },
    ];
    // vendor_catalog_query emits a BARE array (no envelope) — unwrapBusiness must pass it through.
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(corpus);

    const out = await vendorCatalogQuery({ category: 'drills', verifiedOnly: true });

    expect(spy).toHaveBeenCalledWith('vendor_catalog_query', {
      filter: { category: 'drills', verifiedOnly: true },
    });
    expect(out).toEqual(corpus);
    expect(out[1].name).toBe('Guhring');
  });

  it('defaults to an empty filter when called with no args', async () => {
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue([]);
    const out = await vendorCatalogQuery();
    expect(spy).toHaveBeenCalledWith('vendor_catalog_query', { filter: {} });
    expect(out).toEqual([]);
  });
});

describe('vendorRank', () => {
  it('sends vendor_rank and unwraps the { success, data } envelope', async () => {
    const ranked: RankedVendor[] = [
      { vendor_id: 'V-001', composite_score: 0.91, tier: 'preferred' },
      { vendor_id: 'V-002', composite_score: 0.64, tier: 'approved' },
    ];
    const spy = vi
      .spyOn(dispatch, 'callBusinessAction')
      .mockResolvedValue({ success: true, data: ranked });

    const out = await vendorRank({ window_days: 90 });

    expect(spy).toHaveBeenCalledWith('vendor_rank', { window_days: 90 });
    expect(out).toEqual(ranked);
    expect(out[0].tier).toBe('preferred');
  });
});

describe('vendorComputeScorecard', () => {
  it('sends vendor_compute_scorecard with the vendor_id and unwraps the scorecard', async () => {
    const card: VendorScorecard = {
      vendor_id: 'V-001',
      evaluation_window_days: 180,
      po_count: 7,
      on_time_delivery: 0.86,
      quality_acceptance: 0.99,
      responsiveness: 0.75,
      price_competitiveness: 0.61,
      composite_score: 0.82,
      tier: 'preferred',
      rationale: ['7 POs over 180d', 'on-time 86%'],
      computed_at: '2026-05-31T00:00:00.000Z',
    };
    const spy = vi
      .spyOn(dispatch, 'callBusinessAction')
      .mockResolvedValue({ success: true, data: card });

    const out = await vendorComputeScorecard({ vendor_id: 'V-001', window_days: 180 });

    expect(spy).toHaveBeenCalledWith('vendor_compute_scorecard', {
      vendor_id: 'V-001',
      window_days: 180,
    });
    expect(out.composite_score).toBe(0.82);
    expect(out.po_count).toBe(7);
  });
});

describe('vendorListAll', () => {
  it('sends vendor_list_all with no params and unwraps the id list', async () => {
    const spy = vi
      .spyOn(dispatch, 'callBusinessAction')
      .mockResolvedValue({ success: true, data: ['V-001', 'V-002', 'V-003'] });

    const out = await vendorListAll();

    expect(spy).toHaveBeenCalledWith('vendor_list_all');
    expect(out).toEqual(['V-001', 'V-002', 'V-003']);
    expect(out).toHaveLength(3);
  });
});
