/**
 * MarketplaceLedgerEngine — the platform-as-intermediary FINANCIAL SPINE of the PRISM manufacturing
 * networking marketplace (galaxy:business, slot:hotel). THE money engine: it computes the
 * marketplace-specific accounting events — buyer escrow deposit, take-rate commission, supplier payout
 * net of commission, and multi-party invoice split — and RETURNS BALANCED double-entry GL lines AS
 * DATA. It is PURE: it does NOT post to the GeneralLedger directly (it returns lines the caller posts),
 * so it is deterministic + fully testable.
 *
 * WHAT IT IS / WHY IT'S NET-NEW: PRISM's existing {@link GeneralLedgerEngine} models a SINGLE-PARTY shop
 * (JM Die invoices a customer, pays payroll, accrues job cost). A marketplace is a THREE-party flow: a
 * BUYER funds an order, the PLATFORM holds those funds in escrow and takes a commission, and the
 * SUPPLIER is paid the remainder. None of the existing recorders model "funds held in trust" or a
 * commission split. This engine adds exactly that layer — and nothing more.
 *
 * REUSES (never re-derives):
 *  - {@link roundCentsHalfEven} from the shared money util (src/data/money.ts) — banker's (round-half-to-even) rounding to the
 *    cent. NOT reimplemented; the marketplace rounds money the same way as sales tax (and it throws on
 *    a non-finite amount, which IS part of this engine's fail-loud contract).
 *  - the {@link GeneralLedgerEngine} chart + double-entry balance INVARIANT (Σdebits === Σcredits) — this
 *    engine builds {@link MarketplaceGlLine}s in the same {account_id, debit, credit, description} shape
 *    as GeneralLedgerEngine.JournalLine, and asserts the SAME balance invariant before returning. It does
 *    NOT reimplement posting/persistence/trial-balance — those stay GeneralLedgerEngine's job in MAIN.
 *  - the account designations + take-rate policy from data/marketplace-policy.ts — no account number,
 *    take rate, or clamp bound is inlined here.
 *
 * INVARIANTS (fail loud — never silent-coerce, never a bogus default):
 *  - every amount must be finite & > 0 (deposit, gross, each party amount); NaN/Infinity/≤0 THROWS.
 *  - take rate is CLAMP-CHECKED to [MIN_TAKE_RATE, MAX_TAKE_RATE]: out of band THROWS (never silently
 *    clamped — an operator fat-fingering 2.5 must SEE it).
 *  - a payout RECONCILES BOTH WAYS: commission + payout === gross (within MONEY_RECONCILE_TOLERANCE),
 *    asserted before return; a residual beyond tolerance THROWS.
 *  - a split invoice's party amounts must sum to the stated `totalUsd` (reconcile) or THROW.
 *  - every returned `lines[]` is asserted balanced (Σdebit === Σcredit within tolerance) before return;
 *    an imbalance THROWS (a money engine never emits an unbalanced entry).
 *  - escrow can never go NEGATIVE: a payout whose gross exceeds the net escrow currently held for the
 *    order THROWS at recordPayout time (the platform cannot release funds it does not hold).
 *
 * DETERMINISM: timestamps that affect output (`date`) are CALLER-SUPPLIED ISO-date strings — the engine
 * NEVER reads the wall clock for any asserted value. Escrow state is a per-order in-memory ledger keyed
 * by `orderId` (static Map, like ItemMasterEngine); __resetForTests() clears it. No fs / network.
 *
 * §MAIN-WIRING (post golf-merge, in MAIN where the dispatcher is not stale):
 *  - add the two CHART EXTENSIONS to GeneralLedgerEngine.CHART_OF_ACCOUNTS: 2150 Customer Escrow /
 *    Funds Held in Trust (liability, credit-normal) and 4200 Marketplace Commission Revenue (revenue,
 *    credit-normal). Both are purely additive (no renumber) — see data/marketplace-policy.ts.
 *  - wire recordEscrowDeposit / recordPayout / recordSplitInvoice / escrowBalance into businessDispatcher
 *    (the marketplace money surface) AND have the dispatcher POST the returned balanced lines to
 *    GeneralLedgerEngine.createJournalEntry (this engine stays pure; the dispatcher is the post site).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.

import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  DEFAULT_TAKE_RATE,
  MONEY_RECONCILE_TOLERANCE,
  MARKETPLACE_POLICY_SCHEMA_VERSION,
  CASH_ACCOUNT,
  ACCOUNTS_PAYABLE_ACCOUNT,
  ESCROW_LIABILITY_ACCOUNT,
  COMMISSION_REVENUE_ACCOUNT,
  assertTakeRateInBand,
  isKnownMarketplaceAccount,
  marketplaceAccountName,
} from "../data/marketplace-policy.js";

// ============================================================================
// DOMAIN TYPES — GL line shape mirrors GeneralLedgerEngine.JournalLine (one canonical money shape)
// ============================================================================

/**
 * One balanced double-entry line. SAME shape as {@link GeneralLedgerEngine.JournalLine} so the caller
 * can post a returned `lines[]` straight through GeneralLedgerEngine.createJournalEntry in MAIN without
 * a translation layer. Exactly one of debit/credit is > 0 per line.
 */
export interface MarketplaceGlLine {
  account_id: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

/** Result of {@link MarketplaceLedgerEngine.recordEscrowDeposit}. */
export interface EscrowDepositResult {
  orderId: string;
  buyerId: string;
  /** the deposited amount in USD (rounded to the cent). */
  amount: number;
  /** balanced GL lines: DR 1000 Cash / CR 2150 Escrow. */
  lines: MarketplaceGlLine[];
  schemaVersion: string;
}

/** Result of {@link MarketplaceLedgerEngine.recordPayout}. */
export interface PayoutResult {
  orderId: string;
  supplierId: string;
  /** the gross released from escrow (rounded to the cent). */
  gross: number;
  /** the platform's commission = roundCentsHalfEven(gross * takeRatePct). */
  commission: number;
  /** the supplier's net payout = roundCentsHalfEven(gross - commission). */
  payout: number;
  /** the effective take rate applied (fraction; defaulted/validated). */
  takeRatePct: number;
  /** balanced GL lines: DR 2150 Escrow / CR 4200 Commission Revenue / CR 2000 A/P-to-supplier. */
  lines: MarketplaceGlLine[];
  schemaVersion: string;
}

/** One party's share of a split invoice (a returned line, with PII-safe partyId only). */
export interface SplitPartyShare {
  partyId: string;
  amount: number;
}

/** Result of {@link MarketplaceLedgerEngine.recordSplitInvoice}. */
export interface SplitInvoiceResult {
  orderId: string;
  /** the stated total the party amounts reconcile to (rounded to the cent). */
  total: number;
  /** each party's rounded share (audit trail). */
  parties: SplitPartyShare[];
  /** balanced GL lines: DR 1200 A/R (total) / CR 4200 Commission Revenue per party. */
  lines: MarketplaceGlLine[];
  schemaVersion: string;
}

// ============================================================================
// SCHEMAS — z.input (NOT z.infer) so defaulted/optional fields stay optional for callers
// ============================================================================

/** YYYY-MM-DD ISO date — caller-supplied (the engine never reads the wall clock for asserted output). */
const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be an ISO YYYY-MM-DD string");

/** A positive, finite USD money amount (NaN/Infinity/≤0 rejected by zod before any math). */
const PositiveUsd = (label: string) =>
  z.number().finite(`${label} must be finite`).positive(`${label} must be > 0`);

const EscrowDepositSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  buyerId: z.string().min(1, "buyerId is required"),
  amountUsd: PositiveUsd("amountUsd"),
  date: IsoDate,
});
export type EscrowDepositInput = z.input<typeof EscrowDepositSchema>;

const PayoutSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  supplierId: z.string().min(1, "supplierId is required"),
  grossUsd: PositiveUsd("grossUsd"),
  /** fraction (0.07 = 7%); defaults to DEFAULT_TAKE_RATE; clamp-checked to [MIN,MAX] (out of band throws). */
  takeRatePct: z.number().finite("takeRatePct must be finite").optional(),
  date: IsoDate,
});
export type PayoutInput = z.input<typeof PayoutSchema>;

const SplitPartySchema = z.object({
  partyId: z.string().min(1, "party partyId is required"),
  amountUsd: PositiveUsd("party amountUsd"),
});

const SplitInvoiceSchema = z.object({
  orderId: z.string().min(1, "orderId is required"),
  parties: z.array(SplitPartySchema).min(2, "a split invoice needs at least two parties"),
  /** the stated total the party amounts must reconcile to (fail loud on mismatch). */
  totalUsd: PositiveUsd("totalUsd"),
  date: IsoDate,
});
export type SplitInvoiceInput = z.input<typeof SplitInvoiceSchema>;

// ============================================================================
// INTERNAL ESCROW STATE
// ============================================================================

/** Per-order escrow ledger row. net = Σdeposits − Σpayouts (never < 0 — enforced at recordPayout). */
interface EscrowRow {
  deposited: number;
  paidOut: number;
}

// The A/R account a split invoice debits — an existing chart member, resolved by number so it is never
// inlined as a magic string. (1200 Accounts Receivable lives in GeneralLedgerEngine's chart; the split
// path bills a buyer and apportions the receivable across the parties' revenue.)
const AR_ACCOUNT = { number: "1200", name: "Accounts Receivable" } as const;

// ============================================================================
// ENGINE
// ============================================================================

export class MarketplaceLedgerEngine {
  /** orderId → escrow row. Pure in-memory ledger (no fs/network); __resetForTests() clears it. */
  private static escrow = new Map<string, EscrowRow>();

  /**
   * Record a buyer's escrow deposit: the buyer funds an order; the platform holds the funds in trust.
   *   DR 1000 Cash             (amount)   — cash lands at the platform
   *   CR 2150 Customer Escrow  (amount)   — held as a LIABILITY (owed to the buyer until fulfilled)
   *
   * The deposit is NOT platform revenue — it is funds held in trust. The escrow row for `orderId`
   * accumulates the deposited total (multiple deposits per order are allowed).
   *
   * @param input orderId / buyerId / amountUsd (>0, finite) / date (caller-supplied ISO YYYY-MM-DD).
   * @returns {@link EscrowDepositResult} with balanced lines and the rounded amount.
   * @throws on a bad shape, a non-finite/≤0 amount (zod), or — defensively — an unbalanced entry.
   */
  static recordEscrowDeposit(input: EscrowDepositInput): EscrowDepositResult {
    const p = EscrowDepositSchema.parse(input); // throws on NaN/Infinity/≤0/missing
    const amount = roundCentsHalfEven(p.amountUsd);
    if (amount <= 0) {
      // round-half-even of a sub-half-cent positive could land on 0.00 — a zero deposit is meaningless.
      throw new Error(
        `MarketplaceLedgerEngine.recordEscrowDeposit: amount ${p.amountUsd} rounds to ${amount} ` +
          `(≤ 0 at cent precision) for order '${p.orderId}' — deposit must be at least one cent`,
      );
    }

    const lines: MarketplaceGlLine[] = [
      MarketplaceLedgerEngine.#line(CASH_ACCOUNT.number, amount, 0, `Escrow deposit order ${p.orderId} (buyer ${p.buyerId})`),
      MarketplaceLedgerEngine.#line(ESCROW_LIABILITY_ACCOUNT.number, 0, amount, `Escrow held order ${p.orderId}`),
    ];
    MarketplaceLedgerEngine.#assertBalanced(lines, "recordEscrowDeposit", p.orderId);

    const row = MarketplaceLedgerEngine.escrow.get(p.orderId) ?? { deposited: 0, paidOut: 0 };
    row.deposited = roundCentsHalfEven(row.deposited + amount);
    MarketplaceLedgerEngine.escrow.set(p.orderId, row);

    return { orderId: p.orderId, buyerId: p.buyerId, amount, lines, schemaVersion: MARKETPLACE_POLICY_SCHEMA_VERSION };
  }

  /**
   * Release escrow to a supplier net of the platform commission ("take"):
   *   commission = roundCentsHalfEven(gross * takeRate)   — clamp-checked take rate
   *   payout     = roundCentsHalfEven(gross − commission)
   *   DR 2150 Customer Escrow      (gross)       — release the held funds
   *   CR 4200 Commission Revenue   (commission)  — the platform's ONLY revenue here
   *   CR 2000 Accounts Payable     (payout)      — the net the platform owes the supplier
   *
   * RECONCILES BOTH WAYS: asserts roundCentsHalfEven(payout + commission) === gross (and gross − payout
   * === commission) within MONEY_RECONCILE_TOLERANCE; a residual beyond tolerance THROWS (no penny is
   * created or lost in the split). Asserts the escrow row holds ≥ gross BEFORE releasing — a payout
   * exceeding held escrow THROWS (escrow can never go negative).
   *
   * @param input orderId / supplierId / grossUsd (>0, finite) / optional takeRatePct (default
   *              DEFAULT_TAKE_RATE; out of [MIN,MAX] throws) / date (caller-supplied ISO).
   * @returns {@link PayoutResult} with balanced lines, gross/commission/payout, and the effective rate.
   * @throws on a bad shape, an out-of-band take rate, a payout exceeding held escrow, a both-ways
   *         reconciliation failure, or an unbalanced entry.
   */
  static recordPayout(input: PayoutInput): PayoutResult {
    const p = PayoutSchema.parse(input); // throws on NaN/Infinity/≤0/missing
    const takeRate = assertTakeRateInBand(p.takeRatePct ?? DEFAULT_TAKE_RATE); // throws if out of band
    const gross = roundCentsHalfEven(p.grossUsd);
    if (gross <= 0) {
      throw new Error(
        `MarketplaceLedgerEngine.recordPayout: gross ${p.grossUsd} rounds to ${gross} (≤ 0 at cent ` +
          `precision) for order '${p.orderId}' — payout gross must be at least one cent`,
      );
    }

    // Escrow guard FIRST — the platform cannot release funds it does not hold (escrow never goes negative).
    const held = MarketplaceLedgerEngine.#heldEscrow(p.orderId);
    if (gross - held > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `MarketplaceLedgerEngine.recordPayout: payout gross ${gross} exceeds escrow held ${held} for ` +
          `order '${p.orderId}' — cannot release more than is held in trust (escrow cannot go negative)`,
      );
    }

    const commission = roundCentsHalfEven(gross * takeRate);
    const payout = roundCentsHalfEven(gross - commission);

    // RECONCILE BOTH WAYS — no penny created or lost when splitting gross into commission + payout.
    if (Math.abs(roundCentsHalfEven(payout + commission) - gross) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `MarketplaceLedgerEngine.recordPayout: split does not reconcile — commission ${commission} + ` +
          `payout ${payout} !== gross ${gross} for order '${p.orderId}'`,
      );
    }
    if (Math.abs(roundCentsHalfEven(gross - payout) - commission) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `MarketplaceLedgerEngine.recordPayout: reverse reconciliation failed — gross ${gross} − payout ` +
          `${payout} !== commission ${commission} for order '${p.orderId}'`,
      );
    }

    const lines: MarketplaceGlLine[] = [
      MarketplaceLedgerEngine.#line(ESCROW_LIABILITY_ACCOUNT.number, gross, 0, `Escrow release order ${p.orderId}`),
    ];
    // A zero commission (only possible if a future MIN_TAKE_RATE were 0) or zero payout would be a
    // degenerate line — emit only the non-zero credit legs so the entry never carries a 0/0 line, while
    // still balancing (the escrow debit equals the sum of the emitted credits by reconciliation above).
    if (commission > 0) {
      lines.push(
        MarketplaceLedgerEngine.#line(
          COMMISSION_REVENUE_ACCOUNT.number,
          0,
          commission,
          `Marketplace commission order ${p.orderId} (${(takeRate * 100).toFixed(2)}%)`,
        ),
      );
    }
    if (payout > 0) {
      lines.push(
        MarketplaceLedgerEngine.#line(
          ACCOUNTS_PAYABLE_ACCOUNT.number,
          0,
          payout,
          `Supplier payout order ${p.orderId} (supplier ${p.supplierId})`,
        ),
      );
    }
    MarketplaceLedgerEngine.#assertBalanced(lines, "recordPayout", p.orderId);

    const row = MarketplaceLedgerEngine.escrow.get(p.orderId) ?? { deposited: 0, paidOut: 0 };
    row.paidOut = roundCentsHalfEven(row.paidOut + gross);
    MarketplaceLedgerEngine.escrow.set(p.orderId, row);

    return {
      orderId: p.orderId,
      supplierId: p.supplierId,
      gross,
      commission,
      payout,
      takeRatePct: takeRate,
      lines,
      schemaVersion: MARKETPLACE_POLICY_SCHEMA_VERSION,
    };
  }

  /**
   * Record a multi-party split invoice — apportion a stated total across N parties (e.g. a job split
   * across two suppliers, or a buyer billed for a bundle that several parties fulfilled):
   *   DR 1200 Accounts Receivable  (total)             — the buyer owes the whole total
   *   CR 4200 Commission Revenue   (party.amount)      — one credit per party share
   *
   * RECONCILES: the sum of the (rounded) party amounts must equal the (rounded) stated `totalUsd`
   * within MONEY_RECONCILE_TOLERANCE, or THROWS (a split that does not add up is a caller error, never
   * silently absorbed). The polarity is documented: the receivable is the debit, each party's apportioned
   * revenue is a credit; Σcredits === the total debit by reconciliation, so the entry balances.
   *
   * @param input orderId / parties [{partyId, amountUsd>0}] (≥2) / totalUsd (>0) / date (caller ISO).
   * @returns {@link SplitInvoiceResult} with balanced lines and each party's rounded share.
   * @throws on a bad shape, a non-finite/≤0 amount, party amounts not summing to total, or an imbalance.
   */
  static recordSplitInvoice(input: SplitInvoiceInput): SplitInvoiceResult {
    const p = SplitInvoiceSchema.parse(input); // throws on NaN/Infinity/≤0/<2 parties/missing
    const total = roundCentsHalfEven(p.totalUsd);

    const parties: SplitPartyShare[] = p.parties.map((party) => ({
      partyId: party.partyId,
      amount: roundCentsHalfEven(party.amountUsd),
    }));

    // RECONCILE — party shares must sum to the stated total (no rounding residual absorbed silently).
    const partySum = roundCentsHalfEven(parties.reduce((s, party) => s + party.amount, 0));
    if (Math.abs(partySum - total) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `MarketplaceLedgerEngine.recordSplitInvoice: party amounts sum to ${partySum} but stated total ` +
          `is ${total} for order '${p.orderId}' — a split invoice must reconcile to its total`,
      );
    }

    const lines: MarketplaceGlLine[] = [
      MarketplaceLedgerEngine.#line(AR_ACCOUNT.number, total, 0, `Split invoice A/R order ${p.orderId}`),
    ];
    for (const party of parties) {
      lines.push(
        MarketplaceLedgerEngine.#line(
          COMMISSION_REVENUE_ACCOUNT.number,
          0,
          party.amount,
          `Split share order ${p.orderId} (party ${party.partyId})`,
        ),
      );
    }
    MarketplaceLedgerEngine.#assertBalanced(lines, "recordSplitInvoice", p.orderId);

    return { orderId: p.orderId, total, parties, lines, schemaVersion: MARKETPLACE_POLICY_SCHEMA_VERSION };
  }

  /**
   * Net escrow currently held for an order = Σdeposits − Σpayouts (released gross), from the recorded
   * entries. NEVER negative by construction (recordPayout rejects an over-release). Returns 0 for an
   * order with no recorded escrow activity.
   *
   * @param orderId the order to query.
   * @returns the net escrow held in USD (≥ 0, rounded to the cent).
   * @throws on a missing/empty orderId (a blank query is a caller bug, not a 0).
   */
  static escrowBalance(orderId: string): number {
    if (typeof orderId !== "string" || orderId.length === 0) {
      throw new Error("MarketplaceLedgerEngine.escrowBalance: orderId must be a non-empty string");
    }
    return MarketplaceLedgerEngine.#heldEscrow(orderId);
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** Net escrow held for an order (deposited − paidOut), clamped at 0 (a defensive floor; never negative). */
  static #heldEscrow(orderId: string): number {
    const row = MarketplaceLedgerEngine.escrow.get(orderId);
    if (!row) return 0;
    const net = roundCentsHalfEven(row.deposited - row.paidOut);
    return net < 0 ? 0 : net;
  }

  /** Build one validated GL line. Resolves the account display name (THROWS on an unknown account). */
  static #line(accountId: string, debit: number, credit: number, description: string): MarketplaceGlLine {
    if (!isKnownMarketplaceAccount(accountId) && accountId !== AR_ACCOUNT.number) {
      throw new Error(`MarketplaceLedgerEngine: unknown GL account '${accountId}' for line '${description}'`);
    }
    const account_name = accountId === AR_ACCOUNT.number ? AR_ACCOUNT.name : marketplaceAccountName(accountId);
    return { account_id: accountId, account_name, debit, credit, description };
  }

  /**
   * Assert a line set is a balanced double entry: Σdebit === Σcredit (within MONEY_RECONCILE_TOLERANCE)
   * and no line carries both a debit AND a credit. THROWS on any violation (a money engine never emits
   * an unbalanced entry — this is the last gate before return).
   */
  static #assertBalanced(lines: MarketplaceGlLine[], method: string, orderId: string): void {
    if (lines.length < 2) {
      throw new Error(`MarketplaceLedgerEngine.${method}: entry for order '${orderId}' has < 2 lines`);
    }
    let debitTotal = 0;
    let creditTotal = 0;
    for (const l of lines) {
      if (l.debit > 0 && l.credit > 0) {
        throw new Error(
          `MarketplaceLedgerEngine.${method}: line for account '${l.account_id}' (order '${orderId}') has ` +
            `both a debit and a credit — split into two lines`,
        );
      }
      if (l.debit === 0 && l.credit === 0) {
        throw new Error(
          `MarketplaceLedgerEngine.${method}: line for account '${l.account_id}' (order '${orderId}') has a ` +
            `zero debit AND credit (degenerate line)`,
        );
      }
      debitTotal += l.debit;
      creditTotal += l.credit;
    }
    if (Math.abs(debitTotal - creditTotal) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `MarketplaceLedgerEngine.${method}: UNBALANCED entry for order '${orderId}' ` +
          `(Σdebit=${roundCentsHalfEven(debitTotal)} Σcredit=${roundCentsHalfEven(creditTotal)})`,
      );
    }
  }

  /** TEST-ONLY: clear the per-order escrow ledger. */
  static __resetForTests(): void {
    MarketplaceLedgerEngine.escrow.clear();
  }
}

export const marketplaceLedgerEngine = MarketplaceLedgerEngine;
