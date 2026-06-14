/**
 * HotelGateEngines (G14 + G15) — financial-invariant gate + PII-redaction.
 *
 * Two cross-cutting validators that Express middleware (and any other
 * boundary) calls before writing to the GL or exporting data.
 *
 * G14 FinancialInvariantGateEngine:
 *   - validateDoubleEntry: debits === credits per journal entry
 *   - validateTrialBalance: sum(debits) === sum(credits) across entries
 *   - validateNoPostedOverwrite: posted entry cannot be silently overwritten
 *     without an offsetting reversal journal-entry trail
 *
 * G15 PIIRedactionEngine:
 *   - redactSSN: full 9-digit → "***-**-1234" (last 4 only)
 *   - redactCreditCard: 16-digit → "************1234" (last 4 only)
 *   - scrub: recursive redaction over arbitrary JSON-shaped objects
 *
 * Hotel-soul invariants: R12 fail-loud on every violation. Both engines refuse
 * to soften (no temporary-allow-imbalance, no full-card logging).
 *
 * @module HotelGateEngines
 * @milestone HOTEL/U-FIN-INVARIANT-GATE + U-PII-REDACTION (2026-05-26, slot:hotel iter9 /goal Phase 3)
 */

// ─── G14 FinancialInvariantGateEngine ────────────────────────────────────

export interface JournalLine {
  account_code: string;
  /** Positive for debit; use credit field for credit. Exactly one must be set per line. */
  debit_cents?: bigint;
  credit_cents?: bigint;
}

export interface JournalEntry {
  entry_id: string;
  posted_at?: string;
  lines: ReadonlyArray<JournalLine>;
  /** When this entry reverses a prior entry, the prior entry_id. */
  reverses_entry_id?: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: ReadonlyArray<string>;
}

class FinancialInvariantGateEngine {
  validateDoubleEntry(entry: JournalEntry): ValidationResult {
    if (!entry || !entry.entry_id) {
      throw new Error("FinancialInvariantGateEngine.validateDoubleEntry: entry.entry_id required");
    }
    if (!Array.isArray(entry.lines) || entry.lines.length < 2) {
      throw new Error(
        `FinancialInvariantGateEngine.validateDoubleEntry: entry '${entry.entry_id}' must have at least 2 lines (got ${entry.lines?.length ?? 0})`,
      );
    }
    let debits = 0n;
    let credits = 0n;
    const violations: string[] = [];
    for (const line of entry.lines) {
      if (!line.account_code) {
        violations.push(`line missing account_code in entry '${entry.entry_id}'`);
        continue;
      }
      const hasDebit = line.debit_cents !== undefined;
      const hasCredit = line.credit_cents !== undefined;
      if (hasDebit === hasCredit) {
        violations.push(
          `line ${line.account_code} must have exactly one of debit_cents or credit_cents (entry '${entry.entry_id}')`,
        );
        continue;
      }
      if (hasDebit) {
        if (typeof line.debit_cents !== "bigint" || line.debit_cents <= 0n) {
          violations.push(`line ${line.account_code} debit_cents must be positive bigint`);
          continue;
        }
        debits += line.debit_cents;
      }
      if (hasCredit) {
        if (typeof line.credit_cents !== "bigint" || line.credit_cents <= 0n) {
          violations.push(`line ${line.account_code} credit_cents must be positive bigint`);
          continue;
        }
        credits += line.credit_cents;
      }
    }
    if (violations.length === 0 && debits !== credits) {
      violations.push(
        `entry '${entry.entry_id}' debits (${debits}) not equal credits (${credits}) — double-entry violation`,
      );
    }
    return Object.freeze({
      ok: violations.length === 0,
      violations: Object.freeze(violations),
    });
  }

  validateTrialBalance(entries: ReadonlyArray<JournalEntry>): ValidationResult {
    if (!Array.isArray(entries)) {
      throw new Error("FinancialInvariantGateEngine.validateTrialBalance: entries must be an array");
    }
    let debits = 0n;
    let credits = 0n;
    const violations: string[] = [];
    for (const e of entries) {
      const r = this.validateDoubleEntry(e);
      if (!r.ok) violations.push(...r.violations);
      for (const line of e.lines) {
        if (line.debit_cents !== undefined) debits += line.debit_cents;
        if (line.credit_cents !== undefined) credits += line.credit_cents;
      }
    }
    if (violations.length === 0 && debits !== credits) {
      violations.push(
        `trial balance: total debits (${debits}) not equal total credits (${credits}) across ${entries.length} entries`,
      );
    }
    return Object.freeze({
      ok: violations.length === 0,
      violations: Object.freeze(violations),
    });
  }

  /**
   * Refuse to overwrite a posted entry unless the proposed write is a proper
   * reversal (reverses_entry_id === posted entry's id + offsetting amounts).
   */
  validateNoPostedOverwrite(args: {
    posted: JournalEntry;
    proposed: JournalEntry;
  }): ValidationResult {
    if (!args.posted.posted_at) {
      throw new Error(
        `FinancialInvariantGateEngine.validateNoPostedOverwrite: posted entry '${args.posted.entry_id}' has no posted_at — not actually posted`,
      );
    }
    const violations: string[] = [];
    if (args.proposed.entry_id === args.posted.entry_id) {
      violations.push(
        `proposed entry '${args.proposed.entry_id}' SHARES the posted entry's id — silent overwrite refused`,
      );
    }
    if (args.proposed.reverses_entry_id !== args.posted.entry_id) {
      violations.push(
        `proposed entry must set reverses_entry_id='${args.posted.entry_id}' to reverse a posted entry (got '${args.proposed.reverses_entry_id ?? "none"}')`,
      );
    }
    // Verify offsetting amounts: proposed credits === posted debits + vice versa
    let postedDebits = 0n, postedCredits = 0n;
    for (const l of args.posted.lines) {
      if (l.debit_cents !== undefined) postedDebits += l.debit_cents;
      if (l.credit_cents !== undefined) postedCredits += l.credit_cents;
    }
    let propDebits = 0n, propCredits = 0n;
    for (const l of args.proposed.lines) {
      if (l.debit_cents !== undefined) propDebits += l.debit_cents;
      if (l.credit_cents !== undefined) propCredits += l.credit_cents;
    }
    if (propDebits !== postedCredits || propCredits !== postedDebits) {
      violations.push(
        `reversal amounts do not offset: posted D=${postedDebits} C=${postedCredits} vs proposed D=${propDebits} C=${propCredits}`,
      );
    }
    return Object.freeze({
      ok: violations.length === 0,
      violations: Object.freeze(violations),
    });
  }

  systemVizRoost() {
    return Object.freeze({
      engine_name: "FinancialInvariantGateEngine",
      layer: 7,
      node_type: "hub" as const,
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze(["LedgerStoreEngine", "AccountingHardeningEngine"]),
      edges_in: Object.freeze([
        "ApprovalChainEngine",
        "PayrollEngine",
        "PurchaseOrderEngine",
        "RFQToOrderOrchestratorEngine",
      ]),
    });
  }
}

export const financialInvariantGateEngine = new FinancialInvariantGateEngine();

// ─── G15 PIIRedactionEngine ──────────────────────────────────────────────

const SSN_RE = /^(\d{3})[- ]?(\d{2})[- ]?(\d{4})$/;
const CC_RE = /^(\d{13,19})$/;
const SSN_KEYS = new Set(["ssn", "social_security_number", "tax_id_full"]);
const CC_KEYS = new Set(["credit_card_number", "cc_number", "card_number", "pan"]);
const NAME_KEYS = new Set(["full_name", "first_name", "last_name", "legal_name"]);
const REDACTED_NAME = "[role-only]";

class PIIRedactionEngine {
  redactSSN(raw: string): string {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new Error("PIIRedactionEngine.redactSSN: non-empty string required");
    }
    const m = raw.match(SSN_RE);
    if (!m) {
      // Unrecognized format — refuse to fail-soft (Hotel-soul: better to break
      // a non-SSN string than silently leak one we couldn't recognize)
      throw new Error("PIIRedactionEngine.redactSSN: input does not match SSN pattern");
    }
    return `***-**-${m[3]}`;
  }

  redactCreditCard(raw: string): string {
    if (typeof raw !== "string" || raw.length === 0) {
      throw new Error("PIIRedactionEngine.redactCreditCard: non-empty string required");
    }
    const cleaned = raw.replace(/[ -]/g, "");
    if (!CC_RE.test(cleaned)) {
      throw new Error(
        `PIIRedactionEngine.redactCreditCard: input '${raw}' does not look like 13-19 digit PAN`,
      );
    }
    const last4 = cleaned.slice(-4);
    return "*".repeat(cleaned.length - 4) + last4;
  }

  /**
   * Recursive scrubber for arbitrary JSON-shaped objects. Returns a new object
   * with PII fields redacted in-place. Original object is not mutated.
   */
  scrub<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value !== "object") return value;
    if (Array.isArray(value)) {
      return value.map((item) => this.scrub(item)) as unknown as T;
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lowerK = k.toLowerCase();
      if (SSN_KEYS.has(lowerK) && typeof v === "string" && v.length > 0) {
        try {
          out[k] = this.redactSSN(v);
        } catch {
          out[k] = "[REDACTED-INVALID-SSN]";
        }
      } else if (CC_KEYS.has(lowerK) && typeof v === "string" && v.length > 0) {
        try {
          out[k] = this.redactCreditCard(v);
        } catch {
          out[k] = "[REDACTED-INVALID-CARD]";
        }
      } else if (NAME_KEYS.has(lowerK) && typeof v === "string" && v.length > 0) {
        out[k] = REDACTED_NAME;
      } else if (typeof v === "object" && v !== null) {
        out[k] = this.scrub(v);
      } else {
        out[k] = v;
      }
    }
    return out as unknown as T;
  }

  /** Quick assertion: returns violations if obvious unredacted PII is present in a payload. */
  detectViolations(payload: unknown): ReadonlyArray<string> {
    const violations: string[] = [];
    this.walkForViolations(payload, "", violations);
    return Object.freeze(violations);
  }

  systemVizRoost() {
    return Object.freeze({
      engine_name: "PIIRedactionEngine",
      layer: 7,
      node_type: "hub" as const,
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze([]),
      edges_in: Object.freeze([
        "ApprovalChainEngine",
        "AISummaryWriterEngine",
        "AuditFindingToCAPABridgeEngine",
        "ExecutiveSummaryEngine",
        "CustomerPortalEngine",
      ]),
    });
  }

  private walkForViolations(v: unknown, path: string, out: string[]): void {
    if (v === null || v === undefined) return;
    if (typeof v === "string") {
      // raw 9-digit SSN-shaped string anywhere
      if (/^\d{3}-\d{2}-\d{4}$/.test(v) || /^\d{9}$/.test(v)) {
        out.push(`possible raw SSN at '${path}': ${v.slice(0, 3)}*****${v.slice(-4)}`);
      }
      // raw 16-digit credit card
      if (/^\d{16}$/.test(v)) {
        out.push(`possible raw credit card at '${path}'`);
      }
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => this.walkForViolations(item, `${path}[${i}]`, out));
      return;
    }
    if (typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        this.walkForViolations(val, path ? `${path}.${k}` : k, out);
      }
    }
  }
}

export const piiRedactionEngine = new PIIRedactionEngine();
