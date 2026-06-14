/**
 * BankFeedImportEngine — QuickBooks "Bank Feeds" statement import for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Bank Feeds" / "Import bank transactions" function (QB-PARITY Phase-3
 * banking engine #4 of the A/P + banking cycle: VendorBill -> VendorCredit -> BillPayment ->
 * **BankFeedImport** -> BankReconciliation). It is the RAW-FEED LANDING stage: parse a bank's
 * exported statement (OFX/QBO/CSV) into a clean, de-duplicated transaction list that the downstream
 * matcher (acct_bank_reconcile / integration-reconcile-bank) reconciles against the books.
 *
 * Producer / PRISM synergy:
 *   - Shop-ops A/P + banking cycle: a bank exports a statement file; THIS engine parses + dedups it
 *     so a re-imported overlapping statement never double-counts a transaction (the #1 bank-feed
 *     data hazard). The unique transactions feed the bank-reconciliation matcher, which pairs each
 *     credit with an A/R receipt (ReceivePaymentEngine) and each debit with an A/P disbursement
 *     (BillPaymentEngine). The clearing GL effect (DR 1000 Cash / CR 1050 Undeposited Funds, and the
 *     mirror for debits) is RETURNED as data.
 *   - Networking-platform vendor/payout flow (business/PRISM-NETWORKING-PLATFORM-PLAN.md): the same
 *     OFX/CSV parse+dedup ingests a payout-processor settlement file (Stripe/ACH export) so platform
 *     payouts to shop vendors reconcile against the marketplace ledger -- the processor is just a
 *     second producer of the raw-statement string this engine consumes.
 *
 * Financial-invariant compliance (business/GSD.md section 2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - account numbers / column maps / OFX tags IMPORTED from data/bank-feed-accounts.ts, never inlined.
 *  - half-even (banker's) rounding to the cent -- REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts (DRY).
 *  - TRNAMT must parse to a FINITE number -- an unparseable/NaN/Infinity amount THROWS (no silent 0).
 *  - a missing FITID THROWS -- without a stable id the transaction cannot be de-duplicated, and a
 *    silent skip would drop money from the statement (fail loud, never coerce).
 *  - SIGN IS AUTHORITATIVE + PRESERVED EXACTLY: negative TRNAMT = debit (money out), positive =
 *    credit (money in). The engine never flips a sign or takes an absolute value.
 *  - DEDUP BY FITID: transactions[] holds uniques, duplicates[] collects the dropped repeats; a
 *    re-imported statement reconciles -- count === transactions.length and the dropped repeats are
 *    auditable, not silently merged.
 *  - money reconciles BOTH ways: totalDebit (sum of negative amounts) + totalCredit (sum of positive
 *    amounts) === sum(all unique signed amounts), checked from both sides; mismatch THROWS.
 *  - the RETURNED clearing GL lines balance: sum(debits) === sum(credits) (assert before return).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire bank_feed_import / bank_feed_gl_lines in main post golf-merge. Wiring + golf-merging the stale
// worktree businessDispatcher.ts would CLOBBER ~438 main actions (regression). Tracked in
// business/QUICKBOOKS-PARITY-PLAN.md section Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import {
  CASH_ACCOUNT,
  UNDEPOSITED_FUNDS_ACCOUNT,
  MONEY_RECONCILE_TOLERANCE,
  OFX_STMTTRN_TAGS,
  CSV_DEFAULT_COLUMNS,
  BANK_FEED_SCHEMA_VERSION,
} from "../data/bank-feed-accounts.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * A pre-tokenized transaction for the "generic" format -- the caller has already extracted the
 * fields from a proprietary feed. fitid + amount are required (dedup key + money); the engine still
 * validates finiteness + missing-id loudly, exactly as the OFX/CSV paths do.
 */
const GenericTxnSchema = z.object({
  fitid: z.string(),
  date: z.string().optional(),
  // Accept any number-typed value (incl. NaN/Infinity) or a string. z.number() rejects non-finite,
  // which would surface a generic "malformed" zod error and HIDE the precise money invariant; instead
  // we admit the shape here and let parseAmount() be the single, auditable source of the finiteness
  // guard (THROWS "non-finite TRNAMT"). A non-number / non-string is still rejected by the refine.
  amount: z
    .custom<number | string>((v) => typeof v === "number" || typeof v === "string", {
      message: "amount must be a number or a numeric string",
    }),
  type: z.string().optional(),
  memo: z.string().optional(),
});
export type GenericTxnInput = z.infer<typeof GenericTxnSchema>;

const ImportOptsSchema = z.object({
  format: z.enum(["ofx", "qbo", "csv", "generic"]),
  /** per-bank CSV header overrides -- merged over CSV_DEFAULT_COLUMNS (field -> accepted headers). */
  csvColumns: z.record(z.string(), z.array(z.string())).optional(),
  /** CSV delimiter (default ","). */
  csvDelimiter: z.string().min(1).optional(),
});
export type ImportOptsInput = z.input<typeof ImportOptsSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export type TxnType = "debit" | "credit";

export interface BankFeedTransaction {
  /** stable financial-institution transaction id (dedup key). */
  fitid: string;
  /** posting date, normalized to YYYY-MM-DD when parseable, else the raw token (null if absent). */
  date: string | null;
  /** signed amount, half-even rounded to the cent -- negative = debit, positive = credit. */
  amount: number;
  /** derived from the SIGN of amount (authoritative), not the source <TRNTYPE>. */
  type: TxnType;
  /** free-text memo/payee (empty string if absent). */
  memo: string;
}

/** One side of a balanced GL clearing posting (debit XOR credit is positive). */
export interface GlLine {
  account: string;
  accountName: string;
  debit: number;  // >= 0
  credit: number; // >= 0
  description: string;
}

export interface BankFeedImportResult {
  format: "ofx" | "qbo" | "csv" | "generic";
  /** the unique transactions, in source order (first occurrence of each FITID wins). */
  transactions: BankFeedTransaction[];
  /** the dropped repeats -- every later transaction whose FITID was already seen. */
  duplicates: BankFeedTransaction[];
  /** sum of the negative (debit) amounts -- a non-positive number (money out). */
  totalDebit: number;
  /** sum of the positive (credit) amounts -- a non-negative number (money in). */
  totalCredit: number;
  /** count of UNIQUE transactions (=== transactions.length). */
  count: number;
  schemaVersion: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class BankFeedImportEngine {
  /**
   * Import + de-duplicate a bank statement feed (QuickBooks "Bank Feeds").
   *
   * Parsing (MINIMAL but real subset -- extensible, see data/bank-feed-accounts.ts):
   *   - ofx/qbo: extract every <STMTTRN>...</STMTTRN> block, read <FITID> <DTPOSTED> <TRNAMT>
   *     <TRNTYPE> and <MEMO> (falling back to <NAME>) via robust tag parsing (tolerant of the
   *     newline-or-not SGML style OFX uses, where closing tags are optional).
   *   - csv: header-mapped columns (case-insensitive, alias list per field, override via opts).
   *   - generic: a pre-tokenized array passed as `raw` (or JSON-encoded string of that array).
   *
   * Invariants (all THROW on violation -- fail loud, never silently coerce):
   *   - every TRNAMT parses to a finite number (unparseable / NaN / Infinity THROWS).
   *   - every transaction has a non-empty FITID (missing THROWS -- cannot dedup without it).
   *   - sign preserved exactly: negative = debit, positive = credit; half-even rounded to the cent.
   *   - dedup by FITID: transactions[] = uniques (first wins), duplicates[] = later repeats.
   *   - totalDebit + totalCredit === sum(unique signed amounts), reconciled from both sides.
   *
   * @param raw  the statement payload: an OFX/QBO/CSV string, OR (format "generic") an array of
   *             pre-tokenized {fitid, amount, ...} objects, OR a JSON string of that array.
   * @param opts {format, csvColumns?, csvDelimiter?}.
   * @returns {@link BankFeedImportResult} -- uniques, duplicates, signed totals, count, GL clearing data.
   */
  static importFeed(
    raw: string | GenericTxnInput[],
    opts: ImportOptsInput,
  ): BankFeedImportResult {
    const o = ImportOptsSchema.parse(opts);

    // ----- 1. Parse to raw {fitid, date, amount, type, memo} records ----------
    let parsed: ParsedRecord[];
    switch (o.format) {
      case "ofx":
      case "qbo":
        parsed = BankFeedImportEngine.parseOfx(BankFeedImportEngine.requireString(raw, o.format));
        break;
      case "csv":
        parsed = BankFeedImportEngine.parseCsv(
          BankFeedImportEngine.requireString(raw, o.format),
          o.csvColumns,
          o.csvDelimiter ?? ",",
        );
        break;
      case "generic":
        parsed = BankFeedImportEngine.parseGeneric(raw);
        break;
      default:
        // Exhaustiveness guard -- the zod enum makes this unreachable, but fail loud if it ever isn't.
        throw new Error(`[bank-feed] unsupported format "${(o as { format: string }).format}"`);
    }

    // ----- 2. Normalize each record into a signed, validated transaction ------
    const normalized: BankFeedTransaction[] = parsed.map((r, idx) =>
      BankFeedImportEngine.normalize(r, idx),
    );

    // ----- 3. De-duplicate by FITID (first occurrence wins) -------------------
    const seen = new Set<string>();
    const transactions: BankFeedTransaction[] = [];
    const duplicates: BankFeedTransaction[] = [];
    for (const txn of normalized) {
      if (seen.has(txn.fitid)) {
        duplicates.push(txn);
      } else {
        seen.add(txn.fitid);
        transactions.push(txn);
      }
    }

    // ----- 4. Signed totals over the UNIQUES ----------------------------------
    let totalDebit = 0;  // sum of negative amounts (money out) -- stays <= 0
    let totalCredit = 0; // sum of positive amounts (money in) -- stays >= 0
    for (const txn of transactions) {
      if (txn.amount < 0) totalDebit = roundCentsHalfEven(totalDebit + txn.amount);
      else totalCredit = roundCentsHalfEven(totalCredit + txn.amount);
    }

    // ----- 5. Reconcile BOTH ways: debit + credit === sum(all signed) ---------
    const netSigned = roundCentsHalfEven(transactions.reduce((s, t) => s + t.amount, 0));
    const reconstructed = roundCentsHalfEven(totalDebit + totalCredit);
    if (Math.abs(reconstructed - netSigned) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bank-feed] reconciliation failed: totalDebit ${totalDebit.toFixed(2)} + totalCredit ` +
          `${totalCredit.toFixed(2)} = ${reconstructed.toFixed(2)} != netSigned ${netSigned.toFixed(2)} ` +
          `(format ${o.format}, ${transactions.length} unique txns)`,
      );
    }

    return {
      format: o.format,
      transactions,
      duplicates,
      totalDebit,
      totalCredit,
      count: transactions.length,
      schemaVersion: BANK_FEED_SCHEMA_VERSION,
    };
  }

  /**
   * The GL clearing effect for a set of imported feed transactions (RETURNED as data -- the engine
   * stays pure; the caller hands these lines to GeneralLedgerEngine once the feed is matched).
   *
   * A bank-feed transaction is the bank's view of cash movement before it is matched to A/R or A/P,
   * so it clears through Undeposited Funds (a suspense asset):
   *   - credit (money in,  totalCredit):   DR 1000 Cash              / CR 1050 Undeposited Funds
   *   - debit  (money out, |totalDebit|):  DR 1050 Undeposited Funds / CR 1000 Cash
   * The surviving lines are built from the magnitudes so each side is >= 0 and the posting balances.
   * sum(debits) === sum(credits) is asserted before return.
   *
   * @param result a {@link BankFeedImportResult} from {@link importFeed} (or any object with the
   *               totalDebit/totalCredit fields).
   * @returns balanced clearing GL lines + the verified debit/credit totals.
   * @throws if the lines fail to balance (defensive -- unreachable for a reconciled result).
   */
  static glClearingLines(
    result: Pick<BankFeedImportResult, "totalDebit" | "totalCredit">,
  ): { lines: GlLine[]; totalDebit: number; totalCredit: number } {
    if (!result || !Number.isFinite(result.totalDebit) || !Number.isFinite(result.totalCredit)) {
      throw new Error("[bank-feed] glClearingLines: result with finite totalDebit/totalCredit required");
    }
    const creditIn = roundCentsHalfEven(result.totalCredit);          // money in, >= 0
    const debitOut = roundCentsHalfEven(Math.abs(result.totalDebit)); // money out magnitude, >= 0

    const lines: GlLine[] = [];
    if (creditIn > 0) {
      // Deposits land in cash, cleared from Undeposited Funds.
      lines.push({
        account: CASH_ACCOUNT.number,
        accountName: CASH_ACCOUNT.name,
        debit: creditIn,
        credit: 0,
        description: "Bank feed deposits cleared to Cash",
      });
      lines.push({
        account: UNDEPOSITED_FUNDS_ACCOUNT.number,
        accountName: UNDEPOSITED_FUNDS_ACCOUNT.name,
        debit: 0,
        credit: creditIn,
        description: "Bank feed deposits (pending match)",
      });
    }
    if (debitOut > 0) {
      // Withdrawals leave cash, parked in Undeposited Funds pending A/P match.
      lines.push({
        account: UNDEPOSITED_FUNDS_ACCOUNT.number,
        accountName: UNDEPOSITED_FUNDS_ACCOUNT.name,
        debit: debitOut,
        credit: 0,
        description: "Bank feed withdrawals (pending match)",
      });
      lines.push({
        account: CASH_ACCOUNT.number,
        accountName: CASH_ACCOUNT.name,
        debit: 0,
        credit: debitOut,
        description: "Bank feed withdrawals cleared from Cash",
      });
    }

    const totalDebit = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > MONEY_RECONCILE_TOLERANCE) {
      throw new Error(
        `[bank-feed] GL clearing entry unbalanced: sum(debits) ${totalDebit.toFixed(2)} != sum(credits) ` +
          `${totalCredit.toFixed(2)}`,
      );
    }
    return { lines, totalDebit, totalCredit };
  }

  // --------------------------------------------------------------------------
  // NORMALIZATION
  // --------------------------------------------------------------------------

  /**
   * Turn one parsed record into a validated, signed transaction. THROWS loud on a missing FITID
   * (cannot dedup) or an unparseable/non-finite amount (would drop money) -- never coerces to 0.
   */
  private static normalize(r: ParsedRecord, idx: number): BankFeedTransaction {
    const fitid = (r.fitid ?? "").trim();
    if (fitid.length === 0) {
      throw new Error(
        `[bank-feed] transaction #${idx} is missing a FITID -- cannot de-duplicate without a stable id ` +
          `(would silently drop or double-count money)`,
      );
    }

    const amount = BankFeedImportEngine.parseAmount(r.amount, fitid);
    const rounded = roundCentsHalfEven(amount);
    // Sign is authoritative. A zero amount is a benign $0 memo line -- treat as a credit (money-in
    // side) so totals stay well-defined; it contributes 0 to both totals regardless.
    const type: TxnType = rounded < 0 ? "debit" : "credit";

    return {
      fitid,
      date: BankFeedImportEngine.normalizeDate(r.date),
      amount: rounded,
      type,
      memo: (r.memo ?? "").trim(),
    };
  }

  /**
   * Parse a TRNAMT-style value to a finite number. Accepts a JS number or a string with optional
   * surrounding whitespace, currency symbol, thousands separators, and an accounting "(123.45)"
   * negative. THROWS on anything that does not yield a finite number (no silent NaN -> 0).
   */
  private static parseAmount(value: number | string | undefined, fitid: string): number {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new Error(`[bank-feed] FITID ${fitid}: non-finite TRNAMT (${value})`);
      }
      return value;
    }
    if (typeof value !== "string") {
      throw new Error(`[bank-feed] FITID ${fitid}: missing/invalid TRNAMT (${String(value)})`);
    }
    let s = value.trim();
    if (s.length === 0) {
      throw new Error(`[bank-feed] FITID ${fitid}: empty TRNAMT`);
    }
    // Accounting-style parentheses denote a negative.
    let sign = 1;
    if (/^\(.*\)$/.test(s)) {
      sign = -1;
      s = s.slice(1, -1).trim();
    }
    // Strip currency symbols and thousands separators; keep digits, one dot, leading sign.
    const cleaned = s.replace(/[$£€,\s]/g, "");
    // Reject anything that is not a clean signed decimal (e.g. "abc", "1.2.3", "12-34").
    if (!/^[+-]?\d+(\.\d+)?$/.test(cleaned)) {
      throw new Error(`[bank-feed] FITID ${fitid}: unparseable TRNAMT "${value}"`);
    }
    const n = sign * Number(cleaned);
    if (!Number.isFinite(n)) {
      throw new Error(`[bank-feed] FITID ${fitid}: TRNAMT "${value}" did not parse to a finite number`);
    }
    return n;
  }

  /**
   * Normalize an OFX DTPOSTED (YYYYMMDD[HHMMSS][.XXX][gmt]) or a CSV date to YYYY-MM-DD. Returns the
   * raw token unchanged when it does not match a recognized shape (the date is advisory, never a
   * money invariant -- we never throw on it), or null when absent.
   */
  private static normalizeDate(raw: string | undefined): string | null {
    if (raw == null) return null;
    const s = raw.trim();
    if (s.length === 0) return null;
    // OFX compact: leading YYYYMMDD (possibly followed by time/zone).
    const ofx = /^(\d{4})(\d{2})(\d{2})/.exec(s);
    if (ofx) return `${ofx[1]}-${ofx[2]}-${ofx[3]}`;
    // Already ISO-ish YYYY-MM-DD.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // US MM/DD/YYYY.
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (us) {
      const mm = us[1].padStart(2, "0");
      const dd = us[2].padStart(2, "0");
      return `${us[3]}-${mm}-${dd}`;
    }
    return s; // unknown shape -- preserve verbatim
  }

  // --------------------------------------------------------------------------
  // FORMAT PARSERS
  // --------------------------------------------------------------------------

  /** Guard that a string-format path actually received a string payload. */
  private static requireString(raw: unknown, format: string): string {
    if (typeof raw !== "string") {
      throw new Error(`[bank-feed] format "${format}" requires a string payload (got ${typeof raw})`);
    }
    return raw;
  }

  /**
   * Extract every <STMTTRN> block from an OFX/QBO document and read the configured tags from each.
   * Robust to OFX's optional-closing-tag SGML style: a tag's value runs from after '>' up to the
   * next '<' (or end of line). Blocks with no recognizable tags still emit a record; the
   * per-transaction FITID/amount invariants are enforced later in normalize().
   */
  private static parseOfx(raw: string): ParsedRecord[] {
    const records: ParsedRecord[] = [];
    // Case-insensitive, dot-matches-newline; non-greedy block capture.
    const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(raw)) !== null) {
      const block = m[1];
      const fitid = BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.fitid);
      const date = BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.datePosted);
      const amount = BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.amount);
      const type = BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.type);
      const memo =
        BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.memo) ??
        BankFeedImportEngine.readOfxTag(block, OFX_STMTTRN_TAGS.name) ??
        undefined;
      records.push({
        fitid: fitid ?? undefined,
        date: date ?? undefined,
        amount: amount ?? undefined,
        type: type ?? undefined,
        memo,
      });
    }
    return records;
  }

  /**
   * Read a single OFX tag value. Handles BOTH the closing-tag form (<TAG>val</TAG>) and the
   * SGML open-only form (<TAG>val\n<NEXT>...) by taking everything from after '>' up to the next
   * '<' or newline. Returns undefined when the tag is absent or empty.
   */
  private static readOfxTag(block: string, tag: string): string | undefined {
    const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
    const m = re.exec(block);
    if (!m) return undefined;
    const v = m[1].trim();
    return v.length === 0 ? undefined : v;
  }

  /**
   * Parse a CSV: first non-empty line is the header (matched case-insensitively against the field
   * alias map), each subsequent line is a transaction. Minimal RFC-4180-ish field splitting with
   * double-quote support (escaped "" -> "). THROWS if a required column (fitid, amount) cannot be
   * located in the header.
   */
  private static parseCsv(
    raw: string,
    overrides: Record<string, string[]> | undefined,
    delimiter: string,
  ): ParsedRecord[] {
    const lines = raw.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return [];

    const header = BankFeedImportEngine.splitCsvLine(lines[0], delimiter).map((h) =>
      h.trim().toLowerCase(),
    );

    // Resolve each field to a column index via its alias list (first matching alias wins).
    const colMap = { ...CSV_DEFAULT_COLUMNS } as Record<string, readonly string[]>;
    if (overrides) for (const [field, aliases] of Object.entries(overrides)) colMap[field] = aliases;

    const indexOf = (field: keyof typeof CSV_DEFAULT_COLUMNS): number => {
      for (const alias of colMap[field]) {
        const i = header.indexOf(alias.toLowerCase());
        if (i >= 0) return i;
      }
      return -1;
    };

    const iFitid = indexOf("fitid");
    const iAmount = indexOf("amount");
    if (iFitid < 0) {
      throw new Error(
        `[bank-feed] CSV header has no FITID column (looked for: ${colMap.fitid.join(", ")}). Header: ${header.join(", ")}`,
      );
    }
    if (iAmount < 0) {
      throw new Error(
        `[bank-feed] CSV header has no amount column (looked for: ${colMap.amount.join(", ")}). Header: ${header.join(", ")}`,
      );
    }
    const iDate = indexOf("date");
    const iType = indexOf("type");
    const iMemo = indexOf("memo");

    const at = (cols: string[], i: number): string | undefined =>
      i >= 0 && i < cols.length ? cols[i] : undefined;

    const records: ParsedRecord[] = [];
    for (let r = 1; r < lines.length; r++) {
      const cols = BankFeedImportEngine.splitCsvLine(lines[r], delimiter);
      records.push({
        fitid: at(cols, iFitid),
        date: at(cols, iDate),
        amount: at(cols, iAmount),
        type: at(cols, iType),
        memo: at(cols, iMemo),
      });
    }
    return records;
  }

  /** Split one CSV line on `delimiter`, honoring double-quoted fields with "" escapes. */
  private static splitCsvLine(line: string, delimiter: string): string[] {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++; // consume the escaped quote
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  /**
   * Normalize the "generic" pre-tokenized input: an array of {fitid, amount, ...} objects, or a JSON
   * string of that array. Each entry is zod-validated for shape; amount/FITID money invariants are
   * enforced downstream in normalize().
   */
  private static parseGeneric(raw: string | GenericTxnInput[]): ParsedRecord[] {
    let arr: unknown;
    if (typeof raw === "string") {
      const s = raw.trim();
      if (s.length === 0) return [];
      try {
        arr = JSON.parse(s);
      } catch {
        throw new Error('[bank-feed] format "generic" string payload must be a JSON array of transactions');
      }
    } else {
      arr = raw;
    }
    if (!Array.isArray(arr)) {
      throw new Error('[bank-feed] format "generic" requires an array of pre-tokenized transactions');
    }
    return arr.map((t, idx) => {
      const g = GenericTxnSchema.safeParse(t);
      if (!g.success) {
        throw new Error(`[bank-feed] generic transaction #${idx} is malformed: ${g.error.issues.map((i) => i.message).join("; ")}`);
      }
      return {
        fitid: g.data.fitid,
        date: g.data.date,
        amount: g.data.amount,
        type: g.data.type,
        memo: g.data.memo,
      };
    });
  }
}

/** Internal pre-normalization shape shared by all format parsers. */
interface ParsedRecord {
  fitid?: string;
  date?: string;
  amount?: number | string;
  type?: string;
  memo?: string;
}

export const bankFeedImportEngine = BankFeedImportEngine;
export { BankFeedImportEngine };
