/**
 * PRISM Canonical Pricing & Entitlement Registry (frontend source of truth)
 *
 * Encodes state/shared/specs/PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
 * Anchored on the tested backend catalog:
 *   - plan IDs + TierLimits -> AuthEngineV7.ts:20,47
 *   - subscription prices    -> StripeBillingEngine.ts:47 (PLAN_PRICES)
 *   - one-time post prices    -> StripeBillingEngine.ts:55 (POST_PROCESSOR_PRICES)
 *
 * Operator directive 2026-06-20: everything subscription + a logical ONE-TIME price
 * for the SFC and a single post-processor.
 *
 * This module has NO runtime dependencies -- it is consumed by PricingPage,
 * the checkout/subscription UI (api/billing.ts), and the entitlement admin UI.
 * The backend (papa/hotel) mirrors the SAME numbers into a server pricing-registry
 * (U-COMM-01); a parity test asserts FE === BE.
 */

// ============================================================================
// Plan IDs -- canonical (KEEP, do not rename). Mirror AuthEngineV7.Plan.
// ============================================================================
export type PlanId = 'free' | 'starter' | 'pro' | 'shop' | 'enterprise';

export const PLAN_ORDER: readonly PlanId[] = ['free', 'starter', 'pro', 'shop', 'enterprise'] as const;

// ============================================================================
// Feature entitlement keys -- every gateable capability (spec section 3)
// ============================================================================
export type FeatureKey =
  | 'sfc.basic'
  | 'sfc.nine_axis'
  | 'sfc.sld'
  | 'sfc.vendor_parity'
  | 'sfc.calibration'
  | 'sfc.stochastic'
  | 'sfc.export'
  | 'post.generate'
  | 'post.safety'
  | 'post.library'
  | 'wizard.mill'
  | 'wizard.lathe'
  | 'wizard.wedm'
  | 'print_to_cnc'
  | 'cadcam'
  | 'quoting'
  | 'erp'
  | 'simulation'
  | 'api_access';

/** true=included, 'addon'=purchasable add-on, false=not available, number=numeric ceiling whose unit depends on the feature (per-day cap or controller count -- see NUMERIC_UNIT; -1 = unlimited). */
export type Entitlement = boolean | 'addon' | number;

export interface PlanTier {
  id: PlanId;
  name: string;
  /** marketing subtitle */
  tagline: string;
  monthlyUsd: number;
  /** annual = 10x monthly (2 months free); 0 for free */
  annualUsd: number;
  maxUsers: number; // -1 = unlimited
  /** highlighted on the pricing page */
  featured?: boolean;
  /** ordered marketing bullet list */
  highlights: string[];
}

// ============================================================================
// Subscription tiers (spec section 1) -- prices from StripeBillingEngine.PLAN_PRICES
// ============================================================================
export const PLAN_TIERS: Record<PlanId, PlanTier> = {
  free: {
    id: 'free',
    name: 'Free',
    tagline: 'Try the Speed/Feed Calculator',
    monthlyUsd: 0,
    annualUsd: 0,
    maxUsers: 1,
    highlights: ['10 speed/feed calcs per day', '1 saved configuration', 'No export'],
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'SFC Pro -- for a single operator',
    monthlyUsd: 29,
    annualUsd: 290,
    maxUsers: 1,
    highlights: [
      'Unlimited speed/feed calcs',
      '9-axis orchestrator, SLD/chatter, vendor tri-compare',
      'PDF / CSV export',
      '1 seat',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    tagline: 'Power operator + one machine',
    monthlyUsd: 79,
    annualUsd: 790,
    maxUsers: 3,
    featured: true,
    highlights: [
      'Everything in Starter',
      'SFC calibration + stochastic + closed-loop',
      '1 post-processor controller + safety gate',
      'The 3 wizards (mill / lathe / wire-EDM) + print to CNC',
      'Simulation, 3 seats',
    ],
  },
  shop: {
    id: 'shop',
    name: 'Shop',
    tagline: 'Small shop, multiple operators',
    monthlyUsd: 199,
    annualUsd: 1990,
    maxUsers: 10,
    highlights: [
      'Everything in Pro',
      'Up to 5 post-processor controllers',
      'CAD/CAM AI',
      'Per-seat feature entitlement control',
      'Quoting + ERP available as add-ons',
      '10 seats',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Multi-site, everything included',
    monthlyUsd: 499,
    annualUsd: 4990,
    maxUsers: -1,
    highlights: [
      'Everything in Shop',
      'Quoting + full ERP suite (on release)',
      'Unlimited post-processor controllers',
      'API access, SSO, on-prem option',
      'Unlimited seats',
    ],
  },
};

// ============================================================================
// One-time / perpetual products (spec section 2)
// ============================================================================
export interface OneTimeProduct {
  id: string;
  name: string;
  priceUsd: number;
  unit?: string; // e.g. "per controller"
  /** annual updates price after year 1 */
  updatesUsd?: number;
  /** account credit toward subscription if they upgrade */
  creditOnUpgrade: boolean;
  notes: string;
  /** which feature keys this perpetual buy unlocks */
  grants: FeatureKey[];
}

export const ONE_TIME_PRODUCTS: Record<string, OneTimeProduct> = {
  sfc_perpetual: {
    id: 'sfc_perpetual',
    name: 'Speed/Feed Calculator -- Perpetual',
    priceUsd: 299, // NEW (no backend code yet -- needs U-COMM-08 license keys)
    updatesUsd: 49,
    creditOnUpgrade: true,
    notes: '1 seat, perpetual license, first year of updates included. Beats HSMAdvisor ($200) on features.',
    grants: ['sfc.basic', 'sfc.nine_axis', 'sfc.sld', 'sfc.vendor_parity', 'sfc.export'],
  },
  post_perpetual: {
    id: 'post_perpetual',
    name: 'Single Post-Processor -- Perpetual',
    priceUsd: 199, // StripeBillingEngine.ts:58 permanent: 19900
    unit: 'per controller',
    updatesUsd: 49,
    creditOnUpgrade: true,
    notes: '1 machine/controller, perpetual license + safety gate. vs $1,500-3,000 custom posts.',
    grants: ['post.generate', 'post.safety'],
  },
  post_bundle_5: {
    id: 'post_bundle_5',
    name: 'Post-Processor 5-Pack -- Perpetual',
    priceUsd: 799, // StripeBillingEngine.ts:59 bundle_5
    unit: 'up to 5 controllers',
    creditOnUpgrade: true,
    notes: 'Five controllers, perpetual.',
    grants: ['post.generate', 'post.safety', 'post.library'],
  },
  post_bundle_all: {
    id: 'post_bundle_all',
    name: 'Post-Processor All-Controllers -- Perpetual',
    priceUsd: 2499, // StripeBillingEngine.ts:60 bundle_all
    unit: 'all controllers',
    creditOnUpgrade: true,
    notes: 'Every supported controller, perpetual.',
    grants: ['post.generate', 'post.safety', 'post.library'],
  },
};

/**
 * Post-processor per-controller SUBSCRIPTION prices (USD).
 * StripeBillingEngine.POST_PROCESSOR_PRICES monthly:900 / annual:7900 (cents).
 * The perpetual + bundle one-time prices live in ONE_TIME_PRODUCTS above.
 */
export const POST_SUBSCRIPTION_USD = { monthly: 9, annual: 79 } as const;

// ============================================================================
// Per-feature entitlement matrix (spec section 3)
//   value = the plan's ceiling for that feature.
// ============================================================================
export const FEATURE_LABELS: Record<FeatureKey, string> = {
  'sfc.basic': 'Speed/Feed -- basic calc',
  'sfc.nine_axis': 'Speed/Feed -- 9-axis orchestrator',
  'sfc.sld': 'Speed/Feed -- SLD / chatter',
  'sfc.vendor_parity': 'Speed/Feed -- vendor tri-compare',
  'sfc.calibration': 'Speed/Feed -- calibration / closed-loop',
  'sfc.stochastic': 'Speed/Feed -- stochastic',
  'sfc.export': 'Speed/Feed -- export (PDF/CSV)',
  'post.generate': 'Post-processor -- generate + lint',
  'post.safety': 'Post-processor -- safety gate (AlarmDB)',
  'post.library': 'Post-processor -- library / store',
  'wizard.mill': 'Milling Wizard',
  'wizard.lathe': 'Kienzle',
  'wizard.wedm': 'Wire-EDM Wizard',
  print_to_cnc: 'Print to CNC program',
  cadcam: 'CAD/CAM AI',
  quoting: 'Quoting (Wave 2)',
  erp: 'ERP suite (Wave 3)',
  simulation: 'Simulation',
  api_access: 'API access',
};

/** Features sold but whose tier inclusion ACTIVATES only on their launch wave (R12). */
export const FEATURE_NOT_YET_LIVE: Partial<Record<FeatureKey, string>> = {
  quoting: 'Included when Quoting launches (Wave 2)',
  erp: 'Included when the ERP suite launches (Wave 3)',
};

export const ENTITLEMENT_MATRIX: Record<FeatureKey, Record<PlanId, Entitlement>> = {
  'sfc.basic': { free: 10, starter: true, pro: true, shop: true, enterprise: true },
  'sfc.nine_axis': { free: false, starter: true, pro: true, shop: true, enterprise: true },
  'sfc.sld': { free: false, starter: true, pro: true, shop: true, enterprise: true },
  'sfc.vendor_parity': { free: false, starter: true, pro: true, shop: true, enterprise: true },
  'sfc.calibration': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  'sfc.stochastic': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  'sfc.export': { free: false, starter: true, pro: true, shop: true, enterprise: true },
  'post.generate': { free: false, starter: 'addon', pro: 1, shop: 5, enterprise: -1 },
  'post.safety': { free: false, starter: true, pro: true, shop: true, enterprise: true },
  'post.library': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  'wizard.mill': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  'wizard.lathe': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  'wizard.wedm': { free: false, starter: false, pro: true, shop: true, enterprise: true },
  print_to_cnc: { free: false, starter: false, pro: true, shop: true, enterprise: true },
  cadcam: { free: false, starter: false, pro: false, shop: true, enterprise: true },
  quoting: { free: false, starter: false, pro: false, shop: 'addon', enterprise: true },
  erp: { free: false, starter: false, pro: false, shop: 'addon', enterprise: true },
  simulation: { free: false, starter: false, pro: true, shop: true, enterprise: true },
  api_access: { free: false, starter: false, pro: false, shop: false, enterprise: true },
};

// ============================================================================
// Helpers (pure)
// ============================================================================
export function getPlan(id: PlanId): PlanTier {
  return PLAN_TIERS[id];
}

/** A feature's ceiling for a plan. */
export function entitlementFor(feature: FeatureKey, plan: PlanId): Entitlement {
  return ENTITLEMENT_MATRIX[feature]?.[plan] ?? false;
}

/** True if a plan includes a feature at all (numeric > 0, true, or addon). */
export function planIncludes(feature: FeatureKey, plan: PlanId): boolean {
  const e = entitlementFor(feature, plan);
  if (typeof e === 'number') return e !== 0;
  return e === true || e === 'addon';
}

export function formatPrice(usd: number): string {
  return usd === 0 ? 'Free' : `$${usd.toLocaleString('en-US')}`;
}

/**
 * Numeric-entitlement semantics per feature: a positive number means different
 * things for different features. `post.generate` counts controllers; the SFC
 * daily caps count calculations per day. Default = per-day.
 */
const NUMERIC_UNIT: Partial<Record<FeatureKey, 'perDay' | 'controllers'>> = {
  'sfc.basic': 'perDay',
  'post.generate': 'controllers',
};

/**
 * ASCII display token for the comparison grid (component maps to icons).
 * Pass the feature key so a numeric value is labelled with the right unit
 * (controllers vs per-day) -- without it a controller count renders as "/day".
 */
export function entitlementLabel(e: Entitlement, feature?: FeatureKey): string {
  if (e === true) return 'Included';
  if (e === false) return '-';
  if (e === 'addon') return 'Add-on';
  if (e === -1) return 'Unlimited';
  // numeric: disambiguate unit by feature
  const unit = feature ? NUMERIC_UNIT[feature] : undefined;
  if (unit === 'controllers') return `${e} controller${e === 1 ? '' : 's'}`;
  return `${e}/day`;
}

/**
 * Display token for a feature x plan cell in the public comparison matrix.
 * A not-yet-live feature must never read as live: where a plan WOULD include it
 * (the tier ceiling grants it), show 'Soon' instead of 'Included'/'Add-on'/a numeric
 * grant, so the cell does not contradict the "coming soon" badge on the feature label.
 * Cells that exclude the feature stay as-is ('-'); live features render normally.
 */
export function matrixCellToken(feature: FeatureKey, plan: PlanId): string {
  if (feature in FEATURE_NOT_YET_LIVE && planIncludes(feature, plan)) return 'Soon';
  return entitlementLabel(ENTITLEMENT_MATRIX[feature][plan], feature);
}

export const PRICING_META = {
  specVersion: '2026-06-21',
  annualMonthsFree: 2,
  source: 'state/shared/specs/Kienzle-PRICING-AND-ENTITLEMENT-2026-06-21.md',
} as const;
