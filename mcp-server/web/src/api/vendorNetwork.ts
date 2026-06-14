/**
 * vendorNetwork.ts — frontend bindings for charlie's vendor-catalog corpus + vendor lifecycle.
 *
 * Surfaces VENDOR-NETWORK-MS0 (charlie's ingested 30+ tool-maker catalogs) and the vendor
 * performance / ranking actions to the ERP UI. Until now these actions were LIVE in
 * businessDispatcher but had NO frontend binding (charlie's corpus was invisible to the app).
 *
 * Reachability is two-legged and BOTH legs are verified:
 *   1. the businessDispatcher CASE exists (scripts/erp-action-contract-check.mjs — proves the MCP
 *      action handler is live), and
 *   2. the HTTP route is mounted + allowlisted (src/routes/business.ts → POST /api/v1/business/dispatch,
 *      covered by businessDispatchRoute.test.ts — proves the browser can actually reach it).
 * (Leg 2 was the gap the HOTEL-NETPLAT-UI scrutiny caught: the action was live but unreachable.)
 * Pure binding layer — no business logic; the types mirror the engine return shapes exactly:
 *   - VendorRecord / VendorCatalogFilter  ← VendorCatalogImportEngine (vendor_catalog_query)
 *   - VendorScorecard / RankedVendor       ← VendorPerformanceTrackerEngine (vendor_compute_scorecard / vendor_rank)
 */
import { callBusinessAction, unwrapBusiness } from './businessDispatch';

/** ERP role a vendor maps to (mirror of ErpVendorRole in src/data/vendor-catalog-policy.ts). */
export type ErpVendorRole = 'purchasing-vendor' | 'marketplace-supplier' | 'equipment-vendor';

/** Vendor performance tier (mirror of VendorTier in VendorPerformanceTrackerEngine). */
export type VendorTier = 'preferred' | 'approved' | 'probation' | 'disqualified';

/**
 * A normalized vendor record from charlie's catalog corpus
 * (mirror of VendorCatalogImportEngine.VendorRecord; categories/regions always present).
 */
export interface VendorRecord {
  name: string;
  website?: string;
  vendor_type: string;
  categories: string[];
  reach?: string;
  regions: string[];
  pricing_access?: string;
  has_api?: boolean;
  verified?: boolean;
  source_tag?: string;
  notes?: string;
}

/** Filter for the catalog corpus (mirror of VendorCatalogImportEngine.VendorQuery). */
export interface VendorCatalogFilter {
  role?: ErpVendorRole;
  vendorType?: string;
  region?: string;
  category?: string;
  verifiedOnly?: boolean;
  hasApi?: boolean;
}

/** A vendor performance scorecard (mirror of VendorPerformanceTrackerEngine.VendorScorecard). */
export interface VendorScorecard {
  vendor_id: string;
  evaluation_window_days: number;
  po_count: number;
  on_time_delivery: number; // 0..1
  quality_acceptance: number; // 0..1
  responsiveness: number; // 0..1
  price_competitiveness: number; // 0..1
  composite_score: number; // 0..1
  tier: VendorTier;
  rationale: ReadonlyArray<string>;
  computed_at: string;
}

/** One row of the ranked-vendor leaderboard (mirror of VendorPerformanceTrackerEngine.rankVendors). */
export interface RankedVendor {
  vendor_id: string;
  composite_score: number;
  tier: VendorTier;
}

/**
 * Query charlie's ingested vendor catalog corpus, optionally filtered.
 * Binds `vendor_catalog_query`, which emits a BARE VendorRecord[] (unwrapBusiness handles both
 * the bare-array and { success, data } shapes). Omitting sources/repoRoot lets the server load
 * the committed corpus from disk.
 */
export const vendorCatalogQuery = async (
  filter: VendorCatalogFilter = {},
): Promise<VendorRecord[]> =>
  unwrapBusiness<VendorRecord[]>(await callBusinessAction('vendor_catalog_query', { filter }));

/**
 * Rank all tracked vendors by composite performance score over a rolling window.
 * Binds `vendor_rank` ({ success, data: RankedVendor[] }).
 */
export const vendorRank = async (
  args: { window_days?: number; as_of?: string } = {},
): Promise<RankedVendor[]> =>
  unwrapBusiness<RankedVendor[]>(await callBusinessAction('vendor_rank', args));

/**
 * Compute one vendor's performance scorecard over a rolling window.
 * Binds `vendor_compute_scorecard` ({ success, data: VendorScorecard }).
 */
export const vendorComputeScorecard = async (args: {
  vendor_id: string;
  window_days?: number;
  as_of?: string;
}): Promise<VendorScorecard> =>
  unwrapBusiness<VendorScorecard>(await callBusinessAction('vendor_compute_scorecard', args));

/**
 * List every vendor id that has tracked purchase-order history.
 * Binds `vendor_list_all` ({ success, data: string[] }).
 */
export const vendorListAll = async (): Promise<string[]> =>
  unwrapBusiness<string[]>(await callBusinessAction('vendor_list_all'));
