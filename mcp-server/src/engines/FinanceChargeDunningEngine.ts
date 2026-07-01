/**
 * FinanceChargeDunningEngine — QuickBooks "Finance Charge" + dunning parity for the PRISM ERP
 * (galaxy:business, slot:hotel). QB-PARITY-MS0 Phase-2 engine #6 (the A/R revenue-cycle close-out:
 * Estimate → SalesOrder → ... → ReceivePayment → Statement → **Finance Charge / Dunning**).
 *
 * Mirrors QuickBooks' "Assess Finance Charges" + statement-dunning flow:
 *  - computeFinanceCharge: periodic interest on a past-due balance (rate × months, min-charge floor,
 *    grace-period exemption, usury cap) — parity with QB's Finance Charge preference.
 *  - dunningLevel / generateDunning: tiered collection notices keyed off days-overdue — parity with
 *    QB statement reminders escalating to collections.
 *
 * PRISM synergy (business/PRISM-NETWORKING-PLATFORM-PLAN.md + QUICKBOOKS-PARITY-PLAN.md thesis):
 *   PRODUCER of overdue balances is the A/R aging stream — a finance charge is BORN when an invoice
 *   (`BillingEngine`) goes unpaid past terms and `ReceivePaymentEngine` has NOT cleared it. The aging
 *   bucket feeds days-overdue here. This engine serves BOTH cycles:
 *     • QB A/R cycle — finance charge rides a new invoice line (DR 1200 AR / CR 4000 Sales Revenue),
 *       dunning notices print on customer statements.
 *     • Networking-platform order/payment flow — the same overdue-balance signal drives platform
 *       credit-hold + automated buyer dunning so a late shop-buyer can't keep ordering on credit.
 *   The engine is PURE: it RETURNS the GL lines it would post (balanced data), it does not call the
 *   GL directly — keeping it testable and side-effect-free for both consumers.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - rate / minCharge / graceDays / usury cap / dunning tiers are IMPORTED from
 *    ar-finance-charge-policy.ts, never inlined.
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *  - non-finite / NaN / negative balance THROWS (a silent 0 or coercion hides a real receivable).
 *  - negative / non-integer / non-finite days-overdue THROWS.
 *  - charge = 0 within graceDays (no interest accrues in the grace window).
 *  - usury guard: the effective annualized rate is capped at annualRateCapPct (charge is reduced to
 *    the cap, never silently exceeded).
 *  - any GL posting balances: Σdebits === Σcredits (asserted before return).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire finance_charge_compute / dunning_level / dunning_generate in main post golf-merge. Wiring +
// golf-merging the stale worktree businessDispatcher.ts copy would CLOBBER ~438 main actions
// (regression). Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  AR_FINANCE_CHARGE_POLICY,
  AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION,
  DUNNING_TIERS,
  FINANCE_CHARGE_AR_ACCOUNT,
  FINANCE_CHARGE_INCOME_ACCOUNT,
  type ArFinanceChargePolicy,
  type DunningTier,
} from "../data/ar-finance-charge-policy.js";

const DAYS_PER_MONTH = 30; // billing-cycle month for periodic-interest conversion (QB uses 30-day cycle)
const DAYS_PER_YEAR = 365; // for the usury annualized-rate guard

/** A single balanced GL line the engine WOULD post (data, not a side effect). */
export interface GLLine {
  account_id: string;
  debit: number;
  credit: number;
  description: string;
}

const ComputeFinanceChargeSchema = z.object({
  invoiceId: z.string().min(1),
  /** principal overdue balance (USD). Must be ≥ 0 and finite — a credit balance is not chargeable.
   *  `.finite()` rejects NaN/±Infinity at the schema boundary (matches SalesUseTaxEngine convention);
   *  the engine's explicit Number.isFinite guard is defense-in-depth for non-schema callers. */
  overdueBalance: z.number().finite(),
  /** whole days the balance is past due (0 = due today) */
  daysOverdue: z.number().finite(),
  /** optional policy override (e.g. a customer's contractual rate); defaults to shop policy */
  policy: z
    .object({
      monthlyRatePct: z.number(),
      minCharge: z.number(),
      graceDays: z.number(),
      annualRateCapPct: z.number(),
      compoundOnPriorCharges: z.boolean(),
    })
    .partial()
    .optional(),
});
export type ComputeFinanceChargeInput = z.input<typeof ComputeFinanceChargeSchema>;

export interface FinanceChargeResult {
  invoiceId: string;
  charge: number;
  applied: boolean;
  reason: string;
  /** the overdue balance the charge was computed on (rounded to the cent) */
  overdueBalance: number;
  /** number of 30-day periods used (fractional) */
  months: number;
  /** effective monthly rate actually applied (post-usury-cap) */
  appliedMonthlyRate: number;
  /** true if the usury cap reduced the charge */
  usuryCapped: boolean;
  /** balanced GL lines this charge would post (empty when not applied) */
  glLines: GLLine[];
  policyVersion: string;
}

const OverdueInvoiceSchema = z.object({
  invoiceId: z.string().min(1),
  balance: z.number(),
  daysOverdue: z.number(),
});

const GenerateDunningSchema = z.object({
  customerId: z.string().min(1),
  customerName: z.string().min(1).optional(),
  overdueInvoices: z.array(OverdueInvoiceSchema).min(1),
});
export type GenerateDunningInput = z.input<typeof GenerateDunningSchema>;

export interface DunningNotice {
  invoiceId: string;
  level: DunningTier["level"];
  daysOverdue: number;
  balance: number;
  message: string;
}

export interface DunningResult {
  customerId: string;
  /** the single highest-severity level across all the customer's overdue invoices */
  accountLevel: DunningTier["level"] | "current";
  totalOverdue: number;
  notices: DunningNotice[];
  policyVersion: string;
}

/** Resolve effective policy: shop defaults overlaid with any provided partial override, then validate. */
function resolvePolicy(override?: Partial<ArFinanceChargePolicy>): ArFinanceChargePolicy {
  const p: ArFinanceChargePolicy = { ...AR_FINANCE_CHARGE_POLICY, ...(override ?? {}) };
  for (const [k, v] of Object.entries(p)) {
    if (k === "compoundOnPriorCharges") {
      if (typeof v !== "boolean") throw new Error(`[finance-charge] policy.${k} must be boolean`);
      continue;
    }
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`[finance-charge] policy.${k} must be a finite number, got: ${String(v)}`);
    }
    if (v < 0) throw new Error(`[finance-charge] policy.${k} must be ≥ 0, got: ${v}`);
  }
  if (p.monthlyRatePct > p.annualRateCapPct) {
    // a monthly rate above the ANNUAL cap is nonsensical / a policy typo — fail loud
    throw new Error(
      `[finance-charge] policy.monthlyRatePct (${p.monthlyRatePct}) exceeds annualRateCapPct (${p.annualRateCapPct}) — policy error`,
    );
  }
  if (!Number.isInteger(p.graceDays)) {
    throw new Error(`[finance-charge] policy.graceDays must be an integer, got: ${p.graceDays}`);
  }
  return p;
}

export class FinanceChargeDunningEngine {
  /**
   * Compute the QuickBooks-style finance charge on a single past-due invoice balance.
   *
   * Algorithm (parity with QB "Assess Finance Charges"):
   *  1. THROW on bad input (NaN/Infinity/negative balance, negative/non-integer days).
   *  2. Within graceDays → charge = 0, applied = false (no interest accrues in the grace window).
   *  3. Else months = daysOverdue / 30; raw = balance × monthlyRate × months.
   *  4. Usury guard: cap raw so the effective annualized rate ≤ annualRateCapPct.
   *  5. Round half-even to the cent.
   *  6. Min-charge floor: if a non-zero charge rounds below minCharge, raise it to minCharge.
   *  7. Emit balanced GL lines (DR 1200 AR / CR 4000 Sales Revenue) when applied.
   *
   * @param input invoiceId + overdueBalance + daysOverdue (+ optional policy override)
   * @returns the charge, whether it applied, the reason, and the balanced GL lines it would post
   * @throws on non-finite/negative balance or invalid days-overdue (fail loud, never coerce)
   */
  static computeFinanceCharge(input: ComputeFinanceChargeInput): FinanceChargeResult {
    const parsed = ComputeFinanceChargeSchema.parse(input);
    const policy = resolvePolicy(parsed.policy as Partial<ArFinanceChargePolicy> | undefined);

    if (!Number.isFinite(parsed.overdueBalance)) {
      throw new Error(`[finance-charge] overdueBalance must be finite, got: ${parsed.overdueBalance}`);
    }
    if (parsed.overdueBalance < 0) {
      throw new Error(
        `[finance-charge] overdueBalance must be ≥ 0 (a credit balance is not chargeable), got: ${parsed.overdueBalance}`,
      );
    }
    if (!Number.isFinite(parsed.daysOverdue) || !Number.isInteger(parsed.daysOverdue)) {
      throw new Error(`[finance-charge] daysOverdue must be a finite integer, got: ${parsed.daysOverdue}`);
    }
    if (parsed.daysOverdue < 0) {
      throw new Error(`[finance-charge] daysOverdue must be ≥ 0, got: ${parsed.daysOverdue}`);
    }

    const overdueBalance = roundCentsHalfEven(parsed.overdueBalance);
    const base: Omit<FinanceChargeResult, "charge" | "applied" | "reason" | "glLines"> = {
      invoiceId: parsed.invoiceId,
      overdueBalance,
      months: parsed.daysOverdue / DAYS_PER_MONTH,
      appliedMonthlyRate: policy.monthlyRatePct,
      usuryCapped: false,
      policyVersion: AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION,
    };

    // Within grace → no charge.
    if (parsed.daysOverdue <= policy.graceDays) {
      return {
        ...base,
        charge: 0,
        applied: false,
        reason: `within ${policy.graceDays}-day grace period (${parsed.daysOverdue}d overdue)`,
        glLines: [],
      };
    }

    // A zero balance can never produce a charge (even past grace) — no min-charge on nothing owed.
    if (overdueBalance === 0) {
      return {
        ...base,
        charge: 0,
        applied: false,
        reason: "no overdue balance",
        glLines: [],
      };
    }

    const months = parsed.daysOverdue / DAYS_PER_MONTH;
    let rawCharge = overdueBalance * policy.monthlyRatePct * months;

    // Usury guard: the effective ANNUALIZED rate = (charge / balance) / (daysOverdue / 365).
    // Cap the charge so this never exceeds annualRateCapPct.
    const maxCharge = overdueBalance * policy.annualRateCapPct * (parsed.daysOverdue / DAYS_PER_YEAR);
    let usuryCapped = false;
    if (rawCharge > maxCharge) {
      rawCharge = maxCharge;
      usuryCapped = true;
    }

    let charge = roundCentsHalfEven(rawCharge);
    let reason = `${(policy.monthlyRatePct * 100).toFixed(3)}%/mo × ${months.toFixed(4)}mo on ${overdueBalance.toFixed(2)}`;

    if (usuryCapped) {
      reason += ` (usury-capped at ${(policy.annualRateCapPct * 100).toFixed(2)}%/yr)`;
    }

    // Min-charge floor — only when a positive charge computed below the floor.
    if (charge > 0 && charge < policy.minCharge) {
      charge = roundCentsHalfEven(policy.minCharge);
      reason += `; raised to ${policy.minCharge.toFixed(2)} minimum`;
    }

    // Defensive: a positive balance past grace with a positive rate must yield a positive charge.
    if (charge <= 0) {
      return {
        ...base,
        appliedMonthlyRate: usuryCapped
          ? (parsed.daysOverdue > 0 ? (charge / overdueBalance) / (months) : 0)
          : policy.monthlyRatePct,
        usuryCapped,
        charge: 0,
        applied: false,
        reason: `computed charge ≤ 0 (${reason})`,
        glLines: [],
      };
    }

    // Balanced GL: a finance charge INCREASES the receivable and is recognized as income.
    const glLines: GLLine[] = [
      {
        account_id: FINANCE_CHARGE_AR_ACCOUNT,
        debit: charge,
        credit: 0,
        description: `Finance charge — invoice ${parsed.invoiceId}`,
      },
      {
        account_id: FINANCE_CHARGE_INCOME_ACCOUNT,
        debit: 0,
        credit: charge,
        description: `Finance charge income — invoice ${parsed.invoiceId}`,
      },
    ];
    assertBalanced(glLines);

    return {
      ...base,
      appliedMonthlyRate: usuryCapped ? (charge / overdueBalance) / months : policy.monthlyRatePct,
      usuryCapped,
      charge,
      applied: true,
      reason,
      glLines,
    };
  }

  /**
   * Map days-overdue to the highest-severity dunning tier whose threshold it meets.
   *
   * @param daysOverdue whole days past due (≥ 0)
   * @param tiers optional tier override; defaults to shop DUNNING_TIERS
   * @returns the matching tier, or null when the account is current / below the floor tier
   * @throws on negative / non-finite / non-integer daysOverdue (fail loud)
   */
  static dunningLevel(
    daysOverdue: number,
    tiers: ReadonlyArray<DunningTier> = DUNNING_TIERS,
  ): DunningTier | null {
    if (!Number.isFinite(daysOverdue) || !Number.isInteger(daysOverdue)) {
      throw new Error(`[dunning] daysOverdue must be a finite integer, got: ${daysOverdue}`);
    }
    if (daysOverdue < 0) throw new Error(`[dunning] daysOverdue must be ≥ 0, got: ${daysOverdue}`);
    if (tiers.length === 0) throw new Error("[dunning] no dunning tiers configured");

    // Highest minDaysOverdue threshold that daysOverdue satisfies. Iterate explicitly (don't assume
    // the array is pre-sorted — pick the max matching threshold).
    let matched: DunningTier | null = null;
    for (const t of tiers) {
      if (daysOverdue >= t.minDaysOverdue) {
        if (matched === null || t.minDaysOverdue > matched.minDaysOverdue) matched = t;
      }
    }
    return matched;
  }

  /**
   * Generate tiered dunning notices for a customer with one or more overdue invoices.
   *
   * Each invoice gets its own notice at its own tier; the account-level severity is the MAX tier
   * across all invoices (so a single 90-day invoice flips the whole account to "collections").
   * Invoices that are current / below the floor tier produce no notice.
   *
   * @param input customerId (+ optional name) + non-empty overdueInvoices[]
   * @returns per-invoice notices + the account-level severity + total overdue
   * @throws on bad invoice balances/days (delegated to dunningLevel + validation)
   */
  static generateDunning(input: GenerateDunningInput): DunningResult {
    const parsed = GenerateDunningSchema.parse(input);
    const name = parsed.customerName ?? parsed.customerId;

    const severityRank: Record<DunningTier["level"], number> = {
      reminder: 1,
      past_due: 2,
      final_notice: 3,
      collections: 4,
    };

    let totalOverdue = 0;
    let topLevel: DunningTier["level"] | "current" = "current";
    let topRank = 0;
    const notices: DunningNotice[] = [];

    for (const inv of parsed.overdueInvoices) {
      if (!Number.isFinite(inv.balance)) {
        throw new Error(`[dunning] invoice ${inv.invoiceId}: balance must be finite, got: ${inv.balance}`);
      }
      if (inv.balance < 0) {
        throw new Error(`[dunning] invoice ${inv.invoiceId}: balance must be ≥ 0, got: ${inv.balance}`);
      }
      const balance = roundCentsHalfEven(inv.balance);
      totalOverdue = roundCentsHalfEven(totalOverdue + balance);

      const tier = FinanceChargeDunningEngine.dunningLevel(inv.daysOverdue); // throws on bad days
      if (tier === null || balance === 0) continue; // current / nothing owed → no notice

      const message = tier.template
        .replaceAll("{customer}", name)
        .replaceAll("{balance}", formatUsd(balance))
        .replaceAll("{days}", String(inv.daysOverdue));

      notices.push({
        invoiceId: inv.invoiceId,
        level: tier.level,
        daysOverdue: inv.daysOverdue,
        balance,
        message,
      });

      const rank = severityRank[tier.level];
      if (rank > topRank) {
        topRank = rank;
        topLevel = tier.level;
      }
    }

    return {
      customerId: parsed.customerId,
      accountLevel: topLevel,
      totalOverdue,
      notices,
      policyVersion: AR_FINANCE_CHARGE_POLICY_SCHEMA_VERSION,
    };
  }
}

/** Format a cent-rounded number as USD for notice templates. */
function formatUsd(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Assert a GL posting balances (Σdebits === Σcredits) to the cent. Throws if it does not. */
function assertBalanced(lines: GLLine[]): void {
  const debits = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
  const credits = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
  if (debits !== credits) {
    throw new Error(`[finance-charge] GL posting does not balance: Σdebits ${debits} !== Σcredits ${credits}`);
  }
}

export const financeChargeDunningEngine = FinanceChargeDunningEngine;
