/**
 * marketplace.ts — frontend bindings for the PRISM manufacturing-networking marketplace (feature #2).
 *
 * Surfaces the RFQ-matching, supplier-reputation, lead-directory, and landed-cost-logistics actions to
 * the ERP/marketplace UI (e.g. RFQInboxPage). Same transport as vendorNetwork.ts: POST
 * /api/v1/business/dispatch (src/routes/business.ts), deny-by-default allowlisted.
 *
 * SCOPE — READ surface only. Lead WRITE transitions (marketplace_seed_from_hints, _lead_contact,
 * _lead_convert, _lead_decline) are deliberately NOT bound here / NOT allowlisted yet — they mutate
 * marketplace state and need a per-action role gate before the browser may invoke them (same caution
 * applied to the hotel handoff write in U-VNET-ROUTE). Add them in a follow-up with role gating.
 *
 * Types mirror the engine return shapes exactly (SupplierReputationEngine, GeoLogisticsRoutingEngine,
 * MarketplaceMatchOrchestratorEngine, MarketplaceSeedingEngine). Inputs are typed to the essential
 * fields; the server validates (R5 — let the dispatcher's deterministic validation answer).
 */
import { callBusinessAction, unwrapBusiness } from './businessDispatch';

// ─── supplier reputation (SupplierReputationEngine) ──────────────────────────
export interface ReputationOutcome {
  supplierId: string;
  onTime?: boolean;
  inspected?: boolean;
  qualityAccepted?: boolean;
  [k: string]: unknown;
}

export interface SupplierReputation {
  supplierId: string;
  jobsCompleted: number;
  onTimeCount: number;
  onTimeRate: number;
  onTimeLowerCI95: number;
  inspectedJobs: number;
  qualityAcceptedCount: number;
  qualityRate: number;
  shrunkOnTimeRate: number;
  shrunkQualityRate: number;
  reputationScore: number; // [0,1]
  tier: string;
  schemaVersion: string;
}

export const supplierReputation = async (args: {
  supplierId: string;
  outcomes?: ReputationOutcome[];
}): Promise<SupplierReputation> =>
  unwrapBusiness<SupplierReputation>(
    await callBusinessAction('supplier_reputation', { supplierId: args.supplierId, outcomes: args.outcomes ?? [] }),
  );

export const supplierReputationRank = async (
  args: { outcomes?: ReputationOutcome[] } = {},
): Promise<SupplierReputation[]> =>
  unwrapBusiness<SupplierReputation[]>(
    await callBusinessAction('supplier_reputation_rank', { outcomes: args.outcomes ?? [] }),
  );

// ─── landed-cost logistics (GeoLogisticsRoutingEngine) ───────────────────────
export interface FreightQuote {
  zone: string;
  shippingUsd: number;
  transitDays: number;
  customsApplies: boolean;
  totalWeightKg: number;
  expedite: boolean;
}

export interface LandedCost {
  partValueUsd: number;
  shippingUsd: number;
  customsDutyUsd: number;
  totalLandedUsd: number;
  quote: FreightQuote;
}

/** Freight + customs route quote. `input` carries fromRegion/toRegion/weightKg/expedite (server-validated). */
export const geoRouteCost = async (input: Record<string, unknown>): Promise<FreightQuote> =>
  unwrapBusiness<FreightQuote>(await callBusinessAction('geo_route_cost', input));

/** Total landed cost = part value + freight + customs duty. Requires `partValueUsd` in `input`. */
export const geoLandedCost = async (
  input: Record<string, unknown> & { partValueUsd: number },
): Promise<LandedCost> => unwrapBusiness<LandedCost>(await callBusinessAction('geo_landed_cost', input));

/** Logistics desirability in [0,1] (1 = same metro / cheapest+fastest). */
export const geoLogisticsScore = async (args: {
  fromRegion: string;
  toRegion: string;
  sameMetro?: boolean;
}): Promise<number> =>
  unwrapBusiness<number>(
    await callBusinessAction('geo_logistics_score', {
      fromRegion: args.fromRegion,
      toRegion: args.toRegion,
      sameMetro: args.sameMetro ?? false,
    }),
  );

// ─── RFQ matching (MarketplaceMatchOrchestratorEngine) ───────────────────────
export type SignalProvenance = 'evidence' | 'neutral-default';

export interface SupplierSignalDetail {
  supplierId: string;
  matchScore: number;
  reputationScore: number;
  reputationProvenance: SignalProvenance;
  reputationJobs: number;
  logisticsScore: number;
  logisticsProvenance: SignalProvenance;
  logisticsZone: string | null;
  capacityScore: number;
  capacityProvenance: SignalProvenance;
}

/** One blended-ranked supplier (capstone breakdown fields + the signal provenance that produced it). */
export interface RankedRfqSupplier {
  supplierId: string;
  signals: SupplierSignalDetail;
  [k: string]: unknown; // RankedSupplier capstone fields (score/closeness/etc.) passed through
}

export interface RankRfqResult {
  rfqId: string;
  ranked: RankedRfqSupplier[];
  /** the Phase-0 capability-match (TOPSIS) order, for audit/comparison against the blended order. */
  capabilityShortlist: Array<Record<string, unknown>>;
  excluded: Array<Record<string, unknown>>;
  weights: Record<string, number>;
  noMatch: string | null;
  candidatesEvaluated: number;
  survivors: number;
  schemaVersion: string;
}

/** Match + rank an RFQ end-to-end (capability filter + reputation/logistics/capacity blend). */
export const marketplaceRankRfq = async (input: Record<string, unknown>): Promise<RankRfqResult> =>
  unwrapBusiness<RankRfqResult>(await callBusinessAction('marketplace_rank_rfq', input));

// ─── supplier-lead directory READS (MarketplaceSeedingEngine) ────────────────
export type LeadStatus = 'invited' | 'contacted' | 'applied' | 'declined';

export interface MarketplaceLead {
  supplierId: string;
  name: string;
  website: string | null;
  processes: string[];
  certifications: string[];
  region: string;
  sourceTag: string;
  status: LeadStatus;
  applicationId: string | null;
  declineReason: string | null;
  seededAt: string;
  updatedAt: string;
  schemaVersion: string;
}

export interface LeadListFilter {
  status?: LeadStatus;
  region?: string;
  process?: string;
}

export const marketplaceLeadList = async (filter: LeadListFilter = {}): Promise<MarketplaceLead[]> =>
  unwrapBusiness<MarketplaceLead[]>(await callBusinessAction('marketplace_lead_list', { filter }));

export const marketplaceLeadGet = async (supplierId: string): Promise<MarketplaceLead | null> =>
  unwrapBusiness<MarketplaceLead | null>(await callBusinessAction('marketplace_lead_get', { supplierId }));
