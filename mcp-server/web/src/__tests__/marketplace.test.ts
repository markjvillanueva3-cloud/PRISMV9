// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as dispatch from '../api/businessDispatch';
import {
  geoLandedCost,
  geoLogisticsScore,
  geoRouteCost,
  marketplaceLeadGet,
  marketplaceLeadList,
  marketplaceRankRfq,
  supplierReputation,
  supplierReputationRank,
  type FreightQuote,
  type LandedCost,
  type MarketplaceLead,
  type SupplierReputation,
} from '../api/marketplace';

// Bindings are a thin layer over callBusinessAction; verify each sends the EXACT action literal +
// param shape and unwraps the dispatcher's real return shape (bare vs {success,data}).
afterEach(() => vi.restoreAllMocks());

describe('supplier reputation bindings', () => {
  it('supplierReputation sends supplier_reputation with {supplierId, outcomes} and unwraps the reputation', async () => {
    const rep: SupplierReputation = {
      supplierId: 'S-1', jobsCompleted: 12, onTimeCount: 11, onTimeRate: 0.92, onTimeLowerCI95: 0.66,
      inspectedJobs: 8, qualityAcceptedCount: 8, qualityRate: 1, shrunkOnTimeRate: 0.88, shrunkQualityRate: 0.9,
      reputationScore: 0.89, tier: 'preferred', schemaVersion: '1.0.0',
    };
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(rep);
    const out = await supplierReputation({ supplierId: 'S-1' });
    expect(spy).toHaveBeenCalledWith('supplier_reputation', { supplierId: 'S-1', outcomes: [] });
    expect(out.reputationScore).toBe(0.89);
    expect(out.tier).toBe('preferred');
  });

  it('supplierReputationRank sends supplier_reputation_rank with the outcomes corpus and unwraps the list', async () => {
    const ranked: SupplierReputation[] = [{
      supplierId: 'S-2', jobsCompleted: 5, onTimeCount: 4, onTimeRate: 0.8, onTimeLowerCI95: 0.38,
      inspectedJobs: 3, qualityAcceptedCount: 3, qualityRate: 1, shrunkOnTimeRate: 0.72, shrunkQualityRate: 0.81,
      reputationScore: 0.7, tier: 'approved', schemaVersion: '1.0.0',
    }];
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(ranked);
    const out = await supplierReputationRank({ outcomes: [{ supplierId: 'S-2', onTime: true }] });
    expect(spy).toHaveBeenCalledWith('supplier_reputation_rank', { outcomes: [{ supplierId: 'S-2', onTime: true }] });
    expect(out[0].supplierId).toBe('S-2');
  });
});

describe('geo logistics bindings', () => {
  it('geoRouteCost forwards the input verbatim and unwraps the freight quote', async () => {
    const quote: FreightQuote = { zone: 'domestic', shippingUsd: 240, transitDays: 3, customsApplies: false, totalWeightKg: 50, expedite: false };
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(quote);
    const out = await geoRouteCost({ fromRegion: 'US-CT', toRegion: 'US-OH', weightKg: 50 });
    expect(spy).toHaveBeenCalledWith('geo_route_cost', { fromRegion: 'US-CT', toRegion: 'US-OH', weightKg: 50 });
    expect(out.shippingUsd).toBe(240);
    expect(out.transitDays).toBe(3);
  });

  it('geoLandedCost forwards partValueUsd and unwraps the total landed cost', async () => {
    const landed: LandedCost = {
      partValueUsd: 1000, shippingUsd: 240, customsDutyUsd: 0, totalLandedUsd: 1240,
      quote: { zone: 'domestic', shippingUsd: 240, transitDays: 3, customsApplies: false, totalWeightKg: 50, expedite: false },
    };
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(landed);
    const out = await geoLandedCost({ fromRegion: 'US-CT', toRegion: 'US-OH', weightKg: 50, partValueUsd: 1000 });
    expect(spy).toHaveBeenCalledWith('geo_landed_cost', { fromRegion: 'US-CT', toRegion: 'US-OH', weightKg: 50, partValueUsd: 1000 });
    expect(out.totalLandedUsd).toBe(1240);
  });

  it('geoLogisticsScore sends fromRegion/toRegion/sameMetro and unwraps the scalar score', async () => {
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(0.83);
    const out = await geoLogisticsScore({ fromRegion: 'US-CT', toRegion: 'US-CT', sameMetro: true });
    expect(spy).toHaveBeenCalledWith('geo_logistics_score', { fromRegion: 'US-CT', toRegion: 'US-CT', sameMetro: true });
    expect(out).toBe(0.83);
  });

  it('geoLogisticsScore defaults sameMetro to false when omitted', async () => {
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(0.5);
    await geoLogisticsScore({ fromRegion: 'US-CT', toRegion: 'DE' });
    expect(spy).toHaveBeenCalledWith('geo_logistics_score', { fromRegion: 'US-CT', toRegion: 'DE', sameMetro: false });
  });
});

describe('RFQ match binding', () => {
  it('marketplaceRankRfq forwards the RFQ input and unwraps the ranked result', async () => {
    const result = {
      rfqId: 'RFQ-1',
      ranked: [{ supplierId: 'S-1', signals: { supplierId: 'S-1', matchScore: 0.9, reputationScore: 0.8, reputationProvenance: 'evidence', reputationJobs: 12, logisticsScore: 0.7, logisticsProvenance: 'evidence', logisticsZone: 'domestic', capacityScore: 0.5, capacityProvenance: 'neutral-default' } }],
      excluded: [], weights: { match: 0.4, reputation: 0.3, logistics: 0.2, capacity: 0.1 }, noMatch: null,
      candidatesEvaluated: 3, survivors: 1, schemaVersion: '1.0.0',
    };
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(result);
    const out = await marketplaceRankRfq({ rfqId: 'RFQ-1', processes: ['milling'] });
    expect(spy).toHaveBeenCalledWith('marketplace_rank_rfq', { rfqId: 'RFQ-1', processes: ['milling'] });
    expect(out.rfqId).toBe('RFQ-1');
    expect(out.ranked[0].supplierId).toBe('S-1');
    expect(out.ranked[0].signals.reputationProvenance).toBe('evidence');
  });
});

describe('supplier-lead directory reads', () => {
  it('marketplaceLeadList nests the filter under params.filter and unwraps the lead array', async () => {
    const leads: MarketplaceLead[] = [{
      supplierId: 'S-1', name: 'Acme Machining', website: null, processes: ['milling'], certifications: ['ISO9001'],
      region: 'US-OH', sourceTag: 'R20', status: 'invited', applicationId: null, declineReason: null,
      seededAt: '2026-05-31T00:00:00.000Z', updatedAt: '2026-05-31T00:00:00.000Z', schemaVersion: '1.0.0',
    }];
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(leads);
    const out = await marketplaceLeadList({ status: 'invited' });
    expect(spy).toHaveBeenCalledWith('marketplace_lead_list', { filter: { status: 'invited' } });
    expect(out[0].name).toBe('Acme Machining');
    expect(out[0].status).toBe('invited');
  });

  it('marketplaceLeadGet unwraps a found lead (bare object) for a known supplier', async () => {
    const lead: MarketplaceLead = {
      supplierId: 'S-1', name: 'Acme Machining', website: 'https://acme.test', processes: ['milling', 'turning'],
      certifications: ['ISO9001', 'AS9100'], region: 'US-OH', sourceTag: 'R20', status: 'contacted',
      applicationId: null, declineReason: null, seededAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T01:00:00.000Z', schemaVersion: '1.0.0',
    };
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(lead);
    const out = await marketplaceLeadGet('S-1');
    expect(spy).toHaveBeenCalledWith('marketplace_lead_get', { supplierId: 'S-1' });
    expect(out?.name).toBe('Acme Machining');
    expect(out?.status).toBe('contacted');
  });

  it('marketplaceLeadGet unwraps null for an unknown supplier (no throw)', async () => {
    const spy = vi.spyOn(dispatch, 'callBusinessAction').mockResolvedValue(null);
    const out = await marketplaceLeadGet('S-UNKNOWN');
    expect(spy).toHaveBeenCalledWith('marketplace_lead_get', { supplierId: 'S-UNKNOWN' });
    expect(out).toBe(null);
  });
});
