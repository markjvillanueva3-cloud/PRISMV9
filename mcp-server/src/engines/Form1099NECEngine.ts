/**
 * Form1099NECEngine — IRS Form 1099-NEC (nonemployee compensation) generation for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Prepare 1099s" / "1099 Wizard" function set. QB-PARITY-MS0 Phase-1 engine #3 —
 * the audit's A/P thin-spot (prior coverage had PO 3-way-match but no year-end contractor reporting).
 * Aggregates a tax year's payments per payee, applies the statutory box-1 threshold, the corporation
 * exemption (+ its attorney-fee exception), the payment-card exclusion, and backup-withholding override,
 * then emits per-payee 1099-NEC records + a filing summary.
 *
 * PRISM synergy (QUICKBOOKS-PARITY-PLAN.md thesis): a 1099 line is BORN from A/P — `BillPaymentCheckRunEngine`
 * (Phase 3) settles vendor bills → a payee payment ledger → year-end aggregation here. The payee master
 * (legal name / TIN / entity type) is the ingested DocuStrata vendor registry. The engine LOGIC is
 * source-independent and fully testable now; the LIVE production feed (raw paid-dollar amounts + TINs) is
 * the deferred cross-tree piece — it reconciles against juliett's canonical `jm-die-database` (do NOT
 * re-OCR the DocuStrata report — R8). My worktree `jm-die-vendor-registry` deliberately carries no $/TIN.
 *
 * Financial-invariant compliance (business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]):
 *  - thresholds / reportability rules / box numbers IMPORTED (form-1099-thresholds.ts), never inlined.
 *  - unknown tax year / entity type / payment method THROW (a wrong reportability guess = penalty exposure).
 *  - half-even (banker's) rounding to the cent; dollars reported to the cent.
 *  - non-finite amounts THROW (never silently coerce to 0 — a dropped payment under-reports).
 *  - a reportable payee with no TIN THROWS (cannot file a blank-TIN form; surface the B-notice gap loud).
 *
 * PII (business/CLAUDE.md §8.2 — HARD): TIN is masked to last-4 in EVERY emitted record and never logged
 * raw. The raw TIN is consumed only to validate + mask; it does not appear in any return value.
 */
// WIRE-EXEMPT: dispatcher wiring is BLOCKED by worktree-dispatcher divergence — the slot/hotel
// businessDispatcher.ts is a stale 441-action copy vs main's 879; wiring + golf-merging the worktree
// copy would CLOBBER ~438 main actions (regression). Wire form_1099nec_generate / form_1099nec_payee_check
// into MAIN businessDispatcher.ts (additive: ACTIONS enum + switch cases + lazy import) AFTER this engine
// reaches main. Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  getNecThreshold,
  NEC_REPORTABLE_ENTITY_TYPES,
  NEC_EXEMPT_ENTITY_TYPES,
  CORP_EXCEPTION_CATEGORIES,
  NEC_EXCLUDED_PAYMENT_METHODS,
  NEC_REPORTABLE_PAYMENT_METHODS,
  FORM_1099_NEC_BOXES,
  FORM_1099_THRESHOLDS_SCHEMA_VERSION,
} from "../data/form-1099-thresholds.js";

const PaymentSchema = z.object({
  payeeId: z.string().min(1),
  amount: z.number().finite(), // negative allowed = a refund/reversal nets down the annual total
  paymentMethod: z.string().min(1),
  date: z.string().optional(),
  reference: z.string().optional(),
});
export type PayeePayment = z.input<typeof PaymentSchema>;

const PayeeSchema = z.object({
  payeeId: z.string().min(1),
  legalName: z.string().min(1),
  tin: z.string().optional(), // EIN/SSN — PII; required only if the payee turns out reportable
  entityType: z.string().min(1),
  paymentCategory: z.string().optional(), // e.g. "attorney_legal_services" (corp-exemption override)
  federalTaxWithheld: z.number().finite().nonnegative().optional().default(0), // box 4 backup withholding
});
export type Payee = z.input<typeof PayeeSchema>;

export interface Form1099NECRecord {
  payeeId: string;
  payeeName: string;
  tinMasked: string;
  entityType: string;
  box: number;
  box1NonemployeeCompensation: number; // IRS form floor: never negative (see drivers/reportablePaymentTotal for the true net)
  box4FederalTaxWithheld: number;
  reportablePaymentTotal: number; // true net (may be < box1 if refunds netted the year below zero)
  excludedPaymentTotal: number;
  /** Primary driver (back-compat). A filing can have MORE than one cause — see `drivers` for the full set. */
  reason: "threshold_met" | "backup_withholding" | "attorney_corp_exception";
  /** All reasons this form is being filed — a filing is often multi-cause (e.g. threshold AND withholding). */
  drivers: { thresholdMet: boolean; backupWithholding: boolean; corpException: boolean };
}

export interface NotReportablePayee {
  payeeId: string;
  reportablePaymentTotal: number;
  reason: "under_threshold" | "corporation_exempt" | "all_payments_card_excluded" | "no_payments";
}

export interface Form1099NECFiling {
  taxYear: number;
  threshold: number;
  forms: Form1099NECRecord[];
  notReportable: NotReportablePayee[];
  summary: {
    payeesConsidered: number;
    formCount: number;
    totalBox1: number;
    totalBox4: number;
  };
  ratesSchemaVersion: string;
  caveat: string;
}

interface PayeeAggregate {
  reportablePaymentTotal: number;
  excludedPaymentTotal: number;
  paymentCount: number;
}

export class Form1099NECEngine {
  /** Mask a TIN to last-4 (PII §8.2). Validates a 9-digit EIN/SSN; throws otherwise. Never returns raw. */
  static maskTin(tin: string | undefined, entityType: string): string {
    const digits = (tin ?? "").replace(/\D/g, "");
    if (digits.length !== 9) {
      throw new Error(`[1099-NEC] TIN must be 9 digits (EIN/SSN); got ${digits.length} digit(s). Cannot file with an invalid TIN.`);
    }
    const last4 = digits.slice(-4);
    const isSsn = entityType === "individual" || entityType === "sole_proprietor";
    return isSsn ? `***-**-${last4}` : `**-***${last4}`; // SSN XXX-XX-#### · EIN XX-XX#####→last4
  }

  /** Sum a payee's payments for the year, splitting reportable (cash/check/ACH) from card-excluded. */
  static aggregatePayments(payments: PayeePayment[]): Map<string, PayeeAggregate> {
    if (!Array.isArray(payments)) throw new Error("[1099-NEC] payments must be an array");
    const byPayee = new Map<string, PayeeAggregate>();
    for (const raw of payments) {
      const p = PaymentSchema.parse(raw); // throws on NaN/Infinity/missing payeeId
      const method = p.paymentMethod.trim().toLowerCase();
      const excluded = NEC_EXCLUDED_PAYMENT_METHODS.has(method);
      if (!excluded && !NEC_REPORTABLE_PAYMENT_METHODS.has(method)) {
        throw new Error(
          `[1099-NEC] unknown paymentMethod "${p.paymentMethod}" for payee ${p.payeeId}. ` +
            `Known reportable: ${[...NEC_REPORTABLE_PAYMENT_METHODS].join(", ")}; excluded: ${[...NEC_EXCLUDED_PAYMENT_METHODS].join(", ")}.`
        );
      }
      const agg = byPayee.get(p.payeeId) ?? { reportablePaymentTotal: 0, excludedPaymentTotal: 0, paymentCount: 0 };
      if (excluded) agg.excludedPaymentTotal = roundCentsHalfEven(agg.excludedPaymentTotal + p.amount);
      else agg.reportablePaymentTotal = roundCentsHalfEven(agg.reportablePaymentTotal + p.amount);
      agg.paymentCount += 1;
      byPayee.set(p.payeeId, agg);
    }
    return byPayee;
  }

  /** Is this entity type reportable on 1099-NEC (with the attorney-fee corp-exception)? Throws on unknown type. */
  static isEntityReportable(entityType: string, paymentCategory?: string): boolean {
    const t = entityType.trim().toLowerCase();
    if (NEC_REPORTABLE_ENTITY_TYPES.has(t)) return true;
    if (NEC_EXEMPT_ENTITY_TYPES.has(t)) {
      // corporations are exempt EXCEPT for the listed override categories (attorney legal services)
      return paymentCategory ? CORP_EXCEPTION_CATEGORIES.has(paymentCategory.trim().toLowerCase()) : false;
    }
    throw new Error(
      `[1099-NEC] unknown payee entityType "${entityType}". Reportable: ${[...NEC_REPORTABLE_ENTITY_TYPES].join(", ")}; ` +
        `exempt: ${[...NEC_EXEMPT_ENTITY_TYPES].join(", ")}. Classify the payee before reporting — do NOT guess.`
    );
  }

  /**
   * Generate the year's 1099-NEC filing: per-payee records for those meeting the threshold (or with
   * backup withholding), plus an explained not-reportable list and a filing summary.
   */
  static generate1099NEC(input: { taxYear: number; payees: Payee[]; payments: PayeePayment[] }): Form1099NECFiling {
    const taxYear = input?.taxYear;
    const threshold = getNecThreshold(taxYear); // throws on unknown/non-integer year
    if (!Array.isArray(input?.payees)) throw new Error("[1099-NEC] payees must be an array");
    const aggregates = this.aggregatePayments(input?.payments ?? []);

    const forms: Form1099NECRecord[] = [];
    const notReportable: NotReportablePayee[] = [];
    let totalBox1 = 0;
    let totalBox4 = 0;

    for (const rawPayee of input.payees) {
      const payee = PayeeSchema.parse(rawPayee);
      const agg = aggregates.get(payee.payeeId) ?? { reportablePaymentTotal: 0, excludedPaymentTotal: 0, paymentCount: 0 };
      const reportableAmount = roundCentsHalfEven(agg.reportablePaymentTotal);
      const withheld = roundCentsHalfEven(payee.federalTaxWithheld ?? 0);
      const entityReportable = this.isEntityReportable(payee.entityType, payee.paymentCategory); // throws on unknown type

      if (!entityReportable) {
        notReportable.push({ payeeId: payee.payeeId, reportablePaymentTotal: reportableAmount, reason: "corporation_exempt" });
        continue;
      }
      if (agg.paymentCount === 0) {
        notReportable.push({ payeeId: payee.payeeId, reportablePaymentTotal: 0, reason: "no_payments" });
        continue;
      }
      if (reportableAmount <= 0 && agg.excludedPaymentTotal > 0 && withheld <= 0) {
        notReportable.push({ payeeId: payee.payeeId, reportablePaymentTotal: reportableAmount, reason: "all_payments_card_excluded" });
        continue;
      }

      const meetsThreshold = reportableAmount >= threshold;
      const mustReportForWithholding = withheld > 0; // file regardless of amount if any tax was withheld
      if (!meetsThreshold && !mustReportForWithholding) {
        notReportable.push({ payeeId: payee.payeeId, reportablePaymentTotal: reportableAmount, reason: "under_threshold" });
        continue;
      }

      const isCorpException = NEC_EXEMPT_ENTITY_TYPES.has(payee.entityType.trim().toLowerCase());
      const drivers = { thresholdMet: meetsThreshold, backupWithholding: mustReportForWithholding, corpException: isCorpException };
      const reason: Form1099NECRecord["reason"] = isCorpException
        ? "attorney_corp_exception"
        : !meetsThreshold && mustReportForWithholding
        ? "backup_withholding"
        : "threshold_met";

      // IRS box-1 floor: a 1099-NEC never reports negative compensation. A year whose refunds/reversals
      // net below zero reports $0 comp but STILL files when tax was withheld (box 4). The true (possibly
      // negative) net is preserved in reportablePaymentTotal for reconciliation.
      const box1 = Math.max(0, reportableAmount);

      forms.push({
        payeeId: payee.payeeId,
        payeeName: payee.legalName,
        tinMasked: this.maskTin(payee.tin, payee.entityType), // throws if a reportable payee lacks a valid TIN
        entityType: payee.entityType,
        box: FORM_1099_NEC_BOXES.NONEMPLOYEE_COMPENSATION,
        box1NonemployeeCompensation: box1,
        box4FederalTaxWithheld: withheld,
        reportablePaymentTotal: reportableAmount,
        excludedPaymentTotal: roundCentsHalfEven(agg.excludedPaymentTotal),
        reason,
        drivers,
      });
      totalBox1 = roundCentsHalfEven(totalBox1 + box1);
      totalBox4 = roundCentsHalfEven(totalBox4 + withheld);
    }

    return {
      taxYear,
      threshold,
      forms,
      notReportable,
      summary: { payeesConsidered: input.payees.length, formCount: forms.length, totalBox1, totalBox4 },
      ratesSchemaVersion: FORM_1099_THRESHOLDS_SCHEMA_VERSION,
      caveat:
        `box-1 threshold is $${threshold} for TY${taxYear} — TY2026+ figures are subject to the 2025 law's ` +
        `indexing; reconcile against final IRS instructions before e-filing. Card/3rd-party-network payments ` +
        `are excluded here (reported on 1099-K by the settlement entity).`,
    };
  }
}

export const form1099NECEngine = Form1099NECEngine;
