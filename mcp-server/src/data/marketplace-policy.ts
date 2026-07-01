/**
 * marketplace-policy.ts — commission / escrow policy constants + GL account designations for the
 * PRISM manufacturing networking marketplace's platform-as-intermediary money flow (galaxy:business,
 * slot:hotel). Single source of truth for the {@link MarketplaceLedgerEngine} so the engine NEVER
 * inlines a take-rate, a clamp bound, or an account number (business/CLAUDE.md §SAFETY financial-
 * invariant gate, [[feedback_hotel_financial_invariant_gate]]).
 *
 * WHY A SEPARATE CONSTANTS MODULE: the platform commission ("take rate"), its clamp bounds, and the
 * marketplace GL accounts are POLICY, not logic — the marketplace operator tunes the take rate as the
 * platform competes for supply, and the chart extensions must be reviewable in one place before they
 * land in MAIN's chart. Defining them here (frozen, cited, imported) keeps the engine a pure
 * deterministic money calculator and makes a rate change a one-line, test-covered edit.
 *
 * ── TAKE RATE (platform commission) ──────────────────────────────────────────────────────────────
 * Citation — manufacturing-marketplace commission benchmarks. The dominant on-demand manufacturing
 * marketplaces price their platform take in the high-single-digit to low-double-digit range of the
 * supplier-facing transaction value: Xometry's marketplace gross-margin disclosures and the
 * Fictiv / Protolabs Network (formerly Hubs) supplier-economics literature consistently land the
 * platform's intermediation cut around 7–15% of the job value, with 7% a defensible LOW-END default
 * that keeps supply-side liquidity (a shop nets 93% of gross) while still funding platform operations.
 * We default to 7% and CLAMP to [3%, 25%] — below 3% the platform cannot sustain trust+escrow+dispute
 * operations; above 25% supply flees to direct sourcing. A take rate outside the clamp is a configuration
 * error and THROWS (never silently clamped — an operator who fat-fingers 250% must SEE it).
 *   refs: Xometry 10-K marketplace gross-margin disclosures (2022–2023);
 *          Fictiv / Protolabs Network (Hubs) manufacturing-marketplace supplier economics.
 *
 * ── GL ACCOUNT DESIGNATIONS ──────────────────────────────────────────────────────────────────────
 * The platform is an INTERMEDIARY: buyer funds it holds in escrow are NOT its revenue — they are a
 * LIABILITY (funds held in trust) until released to the supplier net of commission. Only the commission
 * is the platform's revenue. This module pins the four accounts the ledger touches:
 *   - 1000 Cash                          — EXISTING chart member (buyer's deposit lands here).
 *   - 2000 Accounts Payable              — EXISTING chart member (the supplier payout the platform owes).
 *   - 2150 Customer Escrow / Funds Held in Trust — CHART EXTENSION (a 2xxx current liability).
 *   - 4200 Marketplace Commission Revenue        — CHART EXTENSION (a 4xxx operating revenue).
 * The two extensions are NOT yet in MAIN's chart (GeneralLedgerEngine.CHART_OF_ACCOUNTS), so this engine
 * RETURNS its balanced GL lines AS DATA — it does not post to the GL directly (keeps it pure + testable,
 * mirrors bank-accounts.ts / UNDEPOSITED_FUNDS_ACCOUNT). Adding the two extensions in MAIN is purely
 * additive: 2150 slots between 2100 Tax Payable and 2200 Accrued Payroll (no renumber); 4200 slots
 * after 4100 Service Revenue. See §MAIN-WIRING in MarketplaceLedgerEngine.ts.
 */

/** Schema version for the marketplace-policy snapshot. */
export const MARKETPLACE_POLICY_SCHEMA_VERSION = "1.0.0";

// ============================================================================
// TAKE RATE (platform commission) — POLICY, never inlined in the engine
// ============================================================================

/**
 * Default platform commission as a FRACTION of gross (0.07 = 7%). The low-end of the manufacturing-
 * marketplace 7–15% intermediation band (see module header). Applied to a payout's gross when the
 * caller does not override `takeRatePct`.
 */
export const DEFAULT_TAKE_RATE = 0.07;

/** Minimum allowed take rate (3%). Below this the platform cannot fund escrow + trust + dispute ops. */
export const MIN_TAKE_RATE = 0.03;

/** Maximum allowed take rate (25%). Above this supply flees to direct sourcing. */
export const MAX_TAKE_RATE = 0.25;

/**
 * Floating-point tolerance (one tenth of a cent) for money reconciliation invariants — matches
 * MONEY_RECONCILE_TOLERANCE in bank-accounts.ts so every business-galaxy money engine reconciles to
 * the same band. A residual under this after half-even rounding is float noise, not an imbalance.
 */
export const MONEY_RECONCILE_TOLERANCE = 0.001;

// ============================================================================
// RFQ BROADCAST POLICY — invitee cap, POLICY never inlined in the engine
// ============================================================================

/**
 * Default number of top-ranked suppliers invited to bid on a broadcast RFQ when the caller does not
 * override `maxInvitees`. Five keeps a competitive-but-curated bid window: enough quotes for genuine
 * price discovery without diluting the matcher's ranking signal or spamming low-fit suppliers (the
 * marketplace shortlist is already RFQMatchScoringEngine-ranked, so the top 5 are the strongest fits).
 * Lives here — not in RFQBroadcastEngine — so marketplace invitee policy sits beside take-rate / GL
 * policy and stays a single tunable. Imported by RFQBroadcastEngine.
 */
export const DEFAULT_MAX_INVITEES = 5;

// ============================================================================
// GL ACCOUNT DESIGNATIONS (mirror bank-accounts.ts: { number, name } as const)
// ============================================================================

/** GL asset account a buyer escrow deposit debits — cash landing at the platform. Existing chart member. */
export const CASH_ACCOUNT = { number: "1000", name: "Cash" } as const;

/** GL liability account the supplier payout credits — the platform owes the supplier. Existing chart member. */
export const ACCOUNTS_PAYABLE_ACCOUNT = { number: "2000", name: "Accounts Payable" } as const;

/**
 * GL liability account holding buyer funds the platform has received but NOT yet released to a supplier
 * (the marketplace "escrow"). A deposit CREDITS it (DR 1000 Cash / CR 2150 Escrow); a payout DEBITS it
 * (releases the held funds, split into commission revenue + supplier A/P).
 *
 * CHART EXTENSION — NOT in MAIN's chart yet. Number 2150 slots between 2100 Tax Payable and 2200 Accrued
 * Payroll, so adding it in MAIN is purely additive (no renumbering). It is a current liability with a
 * credit normal balance (funds held in trust, owed back to the buyer until the job is fulfilled).
 */
export const ESCROW_LIABILITY_ACCOUNT = { number: "2150", name: "Customer Escrow / Funds Held in Trust" } as const;

/**
 * GL revenue account the platform's commission credits — the ONLY portion of a transaction that is the
 * platform's revenue (escrow held is a liability, the supplier payout is A/P; only the take is income).
 *
 * CHART EXTENSION — NOT in MAIN's chart yet. Number 4200 slots after 4100 Service Revenue, so adding it
 * in MAIN is purely additive. It is operating revenue with a credit normal balance.
 */
export const COMMISSION_REVENUE_ACCOUNT = { number: "4200", name: "Marketplace Commission Revenue" } as const;

/**
 * The set of GL account numbers this marketplace money flow is allowed to reference (number → display
 * name). Mirrors the bank-accounts.ts KNOWN_ACCOUNTS pattern. Frozen so the engine can both validate
 * membership and resolve a human-readable name for a returned GL line without a second source.
 */
export const KNOWN_MARKETPLACE_ACCOUNTS: Readonly<Record<string, string>> = Object.freeze({
  [CASH_ACCOUNT.number]: CASH_ACCOUNT.name,
  [ACCOUNTS_PAYABLE_ACCOUNT.number]: ACCOUNTS_PAYABLE_ACCOUNT.name,
  [ESCROW_LIABILITY_ACCOUNT.number]: ESCROW_LIABILITY_ACCOUNT.name, // chart extension (see above)
  [COMMISSION_REVENUE_ACCOUNT.number]: COMMISSION_REVENUE_ACCOUNT.name, // chart extension (see above)
});

/** True iff `account` is a known marketplace chart or chart-extension account number. */
export function isKnownMarketplaceAccount(account: string): boolean {
  return Object.prototype.hasOwnProperty.call(KNOWN_MARKETPLACE_ACCOUNTS, account);
}

/** Resolve the display name for a known marketplace account number; THROWS if the number is unknown. */
export function marketplaceAccountName(account: string): string {
  const name = KNOWN_MARKETPLACE_ACCOUNTS[account];
  if (name === undefined) {
    throw new Error(
      `[marketplace-policy] unknown GL account number '${account}' — not in the marketplace chart or extension`,
    );
  }
  return name;
}

/**
 * Validate + return a take rate, clamping POLICY: a rate OUTSIDE [MIN_TAKE_RATE, MAX_TAKE_RATE] THROWS
 * (fail loud — never silently clamp an out-of-band operator value). A non-finite rate THROWS. Returns
 * the rate unchanged when in band.
 */
export function assertTakeRateInBand(takeRatePct: number): number {
  if (!Number.isFinite(takeRatePct)) {
    throw new Error(`[marketplace-policy] take rate must be finite, got ${takeRatePct}`);
  }
  if (takeRatePct < MIN_TAKE_RATE || takeRatePct > MAX_TAKE_RATE) {
    throw new Error(
      `[marketplace-policy] take rate ${takeRatePct} out of allowed band ` +
        `[${MIN_TAKE_RATE}, ${MAX_TAKE_RATE}] — a rate outside this is a configuration error, not silently clamped`,
    );
  }
  return takeRatePct;
}
