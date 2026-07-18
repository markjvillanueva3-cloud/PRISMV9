/**
 * BankFeedImportEngine.test.ts — QuickBooks "Bank Feeds" import parity (galaxy:business, slot:hotel).
 *
 * Real hand-computed reference values (NOT toBeDefined stubs). Coverage:
 *   - happy: 3-txn OFX fixture, CSV parse, generic array, debit/credit sign split, GL clearing lines.
 *   - dedup: re-imported overlapping statement drops the repeat into duplicates[], totals over uniques.
 *   - failure: unparseable amount THROWS, missing FITID THROWS, non-finite generic amount THROWS,
 *     CSV without an amount column THROWS, wrong payload type THROWS.
 *   - adversarial: empty feed -> 0 txns, malformed/empty <STMTTRN> block, NaN/Infinity, negative,
 *     accounting-paren negative, banker's-rounding tie.
 */
import { describe, it, expect } from "vitest";
import {
  BankFeedImportEngine,
  bankFeedImportEngine,
} from "../engines/BankFeedImportEngine.js";

// A real, minimal-but-valid OFX <STMTTRN> fixture: 2 debits + 1 credit.
//   T-1001  -45.00  DEBIT  (Acme Tooling)
//   T-1002 1250.00  CREDIT (Customer ITW deposit)
//   T-1003  -12.34  DEBIT  (bank fee)
// totalDebit  = -45.00 + -12.34 = -57.34
// totalCredit = 1250.00
const OFX_3TXN = `
<OFX>
 <BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
  <STMTTRN>
   <TRNTYPE>DEBIT
   <DTPOSTED>20260501120000
   <TRNAMT>-45.00
   <FITID>T-1001
   <NAME>ACME TOOLING
   <MEMO>Carbide endmills PO-88
  </STMTTRN>
  <STMTTRN>
   <TRNTYPE>CREDIT
   <DTPOSTED>20260502
   <TRNAMT>1250.00
   <FITID>T-1002
   <MEMO>ITW deposit inv 5567
  </STMTTRN>
  <STMTTRN>
   <TRNTYPE>FEE
   <DTPOSTED>20260503
   <TRNAMT>-12.34
   <FITID>T-1003
   <MEMO>Monthly service charge
  </STMTTRN>
 </BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>
`;

describe("BankFeedImportEngine — OFX parse", () => {
  it("parses a 3-txn OFX statement with exact fields, signs, and signed totals", () => {
    const r = BankFeedImportEngine.importFeed(OFX_3TXN, { format: "ofx" });

    expect(r.count).toBe(3);
    expect(r.transactions).toHaveLength(3);
    expect(r.duplicates).toHaveLength(0);

    const [t1, t2, t3] = r.transactions;
    // Source order preserved.
    expect(t1.fitid).toBe("T-1001");
    expect(t1.amount).toBeCloseTo(-45.0, 2);
    expect(t1.type).toBe("debit");
    expect(t1.date).toBe("2026-05-01"); // DTPOSTED YYYYMMDD prefix normalized
    expect(t1.memo).toBe("Carbide endmills PO-88");

    expect(t2.fitid).toBe("T-1002");
    expect(t2.amount).toBeCloseTo(1250.0, 2);
    expect(t2.type).toBe("credit");
    expect(t2.date).toBe("2026-05-02");

    expect(t3.fitid).toBe("T-1003");
    expect(t3.amount).toBeCloseTo(-12.34, 2);
    expect(t3.type).toBe("debit");

    // Signed totals — hand-computed.
    expect(r.totalDebit).toBeCloseTo(-57.34, 2);
    expect(r.totalCredit).toBeCloseTo(1250.0, 2);
    // Reconcile both ways: debit + credit === net signed.
    expect(r.totalDebit + r.totalCredit).toBeCloseTo(1192.66, 2);
  });

  it("falls back to <NAME> for memo when <MEMO> is absent", () => {
    const ofx = `<STMTTRN><FITID>X1<TRNAMT>10.00<NAME>VENDOR FOO</STMTTRN>`;
    const r = BankFeedImportEngine.importFeed(ofx, { format: "ofx" });
    expect(r.transactions[0].memo).toBe("VENDOR FOO");
  });

  it("qbo format uses the same OFX parser (QBO is OFX 1.0.2)", () => {
    const r = BankFeedImportEngine.importFeed(OFX_3TXN, { format: "qbo" });
    expect(r.format).toBe("qbo");
    expect(r.count).toBe(3);
    expect(r.totalDebit).toBeCloseTo(-57.34, 2);
  });
});

describe("BankFeedImportEngine — FITID dedup", () => {
  it("drops a re-imported duplicate (FITID re-occurrence) into duplicates[], totals over uniques", () => {
    // Append a verbatim re-import of T-1002 (an overlapping statement). It must NOT double-count.
    const reImported =
      OFX_3TXN +
      `<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260502<TRNAMT>1250.00<FITID>T-1002<MEMO>ITW deposit inv 5567 (re-import)</STMTTRN>`;
    const r = BankFeedImportEngine.importFeed(reImported, { format: "ofx" });

    expect(r.count).toBe(3); // still 3 uniques, NOT 4
    expect(r.transactions).toHaveLength(3);
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0].fitid).toBe("T-1002");
    // First occurrence wins — the original memo is retained in transactions[].
    expect(r.transactions.find((t) => t.fitid === "T-1002")!.memo).toBe("ITW deposit inv 5567");
    // Credit total is NOT doubled.
    expect(r.totalCredit).toBeCloseTo(1250.0, 2);
    expect(r.totalDebit).toBeCloseTo(-57.34, 2);
  });

  it("dedups across the generic format too (same FITID twice)", () => {
    const r = BankFeedImportEngine.importFeed(
      [
        { fitid: "G1", amount: 100 },
        { fitid: "G1", amount: 100 }, // exact repeat
        { fitid: "G2", amount: -25 },
      ],
      { format: "generic" },
    );
    expect(r.count).toBe(2);
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0].fitid).toBe("G1");
    expect(r.totalCredit).toBeCloseTo(100, 2);
    expect(r.totalDebit).toBeCloseTo(-25, 2);
  });
});

describe("BankFeedImportEngine — debit/credit sign split", () => {
  it("classifies by sign exactly (negative=debit, positive=credit), never flipping the source TRNTYPE", () => {
    // TRNTYPE says CREDIT but the amount is negative -> the SIGN wins (debit). Banks mislabel; sign is truth.
    const ofx = `
      <STMTTRN><TRNTYPE>CREDIT<TRNAMT>-30.00<FITID>S1<MEMO>mislabeled</STMTTRN>
      <STMTTRN><TRNTYPE>DEBIT<TRNAMT>30.00<FITID>S2<MEMO>mislabeled too</STMTTRN>`;
    const r = BankFeedImportEngine.importFeed(ofx, { format: "ofx" });
    expect(r.transactions[0].type).toBe("debit"); // negative -> debit despite "CREDIT" tag
    expect(r.transactions[1].type).toBe("credit"); // positive -> credit despite "DEBIT" tag
    expect(r.totalDebit).toBeCloseTo(-30.0, 2);
    expect(r.totalCredit).toBeCloseTo(30.0, 2);
  });
});

describe("BankFeedImportEngine — CSV parse", () => {
  it("parses header-mapped CSV columns (case/alias-insensitive) with quoted commas", () => {
    const csv = [
      "Date,Amount,Transaction ID,Type,Description",
      '05/01/2026,-45.00,C-1,DEBIT,"Acme Tooling, PO-88"',
      "05/02/2026,1250.00,C-2,CREDIT,ITW deposit",
    ].join("\n");
    const r = BankFeedImportEngine.importFeed(csv, { format: "csv" });

    expect(r.count).toBe(2);
    expect(r.transactions[0].fitid).toBe("C-1");
    expect(r.transactions[0].amount).toBeCloseTo(-45.0, 2);
    expect(r.transactions[0].type).toBe("debit");
    expect(r.transactions[0].date).toBe("2026-05-01"); // MM/DD/YYYY normalized
    // The quoted field with an embedded comma is kept whole.
    expect(r.transactions[0].memo).toBe("Acme Tooling, PO-88");
    expect(r.transactions[1].amount).toBeCloseTo(1250.0, 2);
    expect(r.totalDebit).toBeCloseTo(-45.0, 2);
    expect(r.totalCredit).toBeCloseTo(1250.0, 2);
  });

  it("honors per-bank csvColumns overrides", () => {
    const csv = ["RefNo|Value|Notes", "Z9|77.50|payout"].join("\n");
    const r = BankFeedImportEngine.importFeed(csv, {
      format: "csv",
      csvDelimiter: "|",
      csvColumns: { fitid: ["refno"], amount: ["value"], memo: ["notes"] },
    });
    expect(r.count).toBe(1);
    expect(r.transactions[0].fitid).toBe("Z9");
    expect(r.transactions[0].amount).toBeCloseTo(77.5, 2);
    expect(r.transactions[0].memo).toBe("payout");
  });
});

describe("BankFeedImportEngine — generic format", () => {
  it("parses a pre-tokenized array and a JSON-string array identically", () => {
    const arr = [
      { fitid: "J1", amount: 200.0, memo: "deposit" },
      { fitid: "J2", amount: "-50.25", memo: "fee", type: "DEBIT" },
    ];
    const fromArr = BankFeedImportEngine.importFeed(arr, { format: "generic" });
    const fromStr = BankFeedImportEngine.importFeed(JSON.stringify(arr), { format: "generic" });

    expect(fromArr.count).toBe(2);
    expect(fromArr.transactions[1].amount).toBeCloseTo(-50.25, 2); // string amount parsed
    expect(fromArr.transactions[1].type).toBe("debit");
    expect(fromArr.totalCredit).toBeCloseTo(200.0, 2);
    expect(fromArr.totalDebit).toBeCloseTo(-50.25, 2);
    // String-payload path yields the same result.
    expect(fromStr.totalCredit).toBeCloseTo(200.0, 2);
    expect(fromStr.totalDebit).toBeCloseTo(-50.25, 2);
  });
});

describe("BankFeedImportEngine — GL clearing lines (balanced, returned as data)", () => {
  it("builds a balanced clearing entry for mixed debit/credit feed", () => {
    const r = BankFeedImportEngine.importFeed(OFX_3TXN, { format: "ofx" });
    const { lines, totalDebit, totalCredit } = BankFeedImportEngine.glClearingLines(r);

    // credit 1250.00 -> DR 1000 Cash / CR 1050 Undeposited; debit 57.34 -> DR 1050 / CR 1000.
    expect(lines).toHaveLength(4);
    // sum(debits) === sum(credits): 1250.00 + 57.34 on each side.
    expect(totalDebit).toBeCloseTo(1307.34, 2);
    expect(totalCredit).toBeCloseTo(1307.34, 2);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);

    // Cash is debited the deposits and credited the withdrawals.
    const cashDebit = lines.find((l) => l.account === "1000" && l.debit > 0)!;
    expect(cashDebit.debit).toBeCloseTo(1250.0, 2);
    const cashCredit = lines.find((l) => l.account === "1000" && l.credit > 0)!;
    expect(cashCredit.credit).toBeCloseTo(57.34, 2);
  });

  it("credit-only feed emits exactly the deposit clearing pair (balanced)", () => {
    const r = BankFeedImportEngine.importFeed([{ fitid: "K1", amount: 500 }], { format: "generic" });
    const { lines, totalDebit, totalCredit } = BankFeedImportEngine.glClearingLines(r);
    expect(lines).toHaveLength(2);
    expect(totalDebit).toBeCloseTo(500, 2);
    expect(totalCredit).toBeCloseTo(500, 2);
  });
});

describe("BankFeedImportEngine — failure modes (THROW, never silent)", () => {
  it("THROWS on an unparseable TRNAMT", () => {
    const ofx = `<STMTTRN><FITID>E1<TRNAMT>not-a-number<MEMO>bad</STMTTRN>`;
    expect(() => BankFeedImportEngine.importFeed(ofx, { format: "ofx" })).toThrow(/unparseable TRNAMT/);
  });

  it("THROWS on a missing FITID (cannot dedup without a stable id)", () => {
    const ofx = `<STMTTRN><TRNAMT>10.00<MEMO>no id here</STMTTRN>`;
    expect(() => BankFeedImportEngine.importFeed(ofx, { format: "ofx" })).toThrow(/missing a FITID/);
  });

  it("THROWS on a CSV header with no amount column", () => {
    const csv = ["id,description", "A1,just a memo"].join("\n");
    expect(() => BankFeedImportEngine.importFeed(csv, { format: "csv" })).toThrow(/no amount column/);
  });

  it("THROWS when a string-only format receives a non-string payload", () => {
    // An array is a type-valid `raw` (accepted for the generic format); passing it with format:"ofx"
    // exercises the runtime requireString guard, which throws. No @ts-expect-error — the call type-checks.
    expect(() => BankFeedImportEngine.importFeed([{ fitid: "A", amount: 1 }], { format: "ofx" })).toThrow(
      /requires a string payload/,
    );
  });

  it("THROWS on an invalid format enum", () => {
    // @ts-expect-error — invalid format value.
    expect(() => BankFeedImportEngine.importFeed("", { format: "pdf" })).toThrow();
  });
});

describe("BankFeedImportEngine — adversarial inputs", () => {
  it("empty OFX feed -> 0 transactions, $0 totals (no throw)", () => {
    const r = BankFeedImportEngine.importFeed("", { format: "ofx" });
    expect(r.count).toBe(0);
    expect(r.transactions).toHaveLength(0);
    expect(r.totalDebit).toBeCloseTo(0, 2);
    expect(r.totalCredit).toBeCloseTo(0, 2);
  });

  it("empty generic array -> 0 transactions; empty generic string -> 0 transactions", () => {
    expect(BankFeedImportEngine.importFeed([], { format: "generic" }).count).toBe(0);
    expect(BankFeedImportEngine.importFeed("   ", { format: "generic" }).count).toBe(0);
  });

  it("a malformed/empty <STMTTRN> block with no FITID THROWS rather than dropping money", () => {
    // The block parses (it is a valid STMTTRN container) but has no FITID -> must fail loud.
    const ofx = `<STMTTRN><TRNAMT>99.99</STMTTRN>`;
    expect(() => BankFeedImportEngine.importFeed(ofx, { format: "ofx" })).toThrow(/missing a FITID/);
  });

  it("THROWS on a non-finite (NaN / Infinity) generic amount", () => {
    expect(() => BankFeedImportEngine.importFeed([{ fitid: "N1", amount: NaN }], { format: "generic" })).toThrow(
      /non-finite TRNAMT/,
    );
    expect(() =>
      BankFeedImportEngine.importFeed([{ fitid: "I1", amount: Infinity }], { format: "generic" }),
    ).toThrow(/non-finite TRNAMT/);
  });

  it("accepts an accounting-style parenthesized negative as a debit", () => {
    const csv = ["id,amount", "P1,(123.45)"].join("\n");
    const r = BankFeedImportEngine.importFeed(csv, { format: "csv" });
    expect(r.transactions[0].amount).toBeCloseTo(-123.45, 2);
    expect(r.transactions[0].type).toBe("debit");
  });

  it("preserves the sign of a large negative and strips currency/thousands formatting", () => {
    const r = BankFeedImportEngine.importFeed([{ fitid: "B1", amount: "-$1,234.56" }], {
      format: "generic",
    });
    expect(r.transactions[0].amount).toBeCloseTo(-1234.56, 2);
    expect(r.totalDebit).toBeCloseTo(-1234.56, 2);
  });

  it("applies banker's (half-even) rounding at the sub-cent tie", () => {
    // 0.125 -> ties to even -> 0.12; 0.135 -> ties to even -> 0.14. (half-even, not half-up.)
    const r = BankFeedImportEngine.importFeed(
      [
        { fitid: "R1", amount: 0.125 },
        { fitid: "R2", amount: 0.135 },
      ],
      { format: "generic" },
    );
    expect(r.transactions[0].amount).toBeCloseTo(0.12, 2);
    expect(r.transactions[1].amount).toBeCloseTo(0.14, 2);
  });

  it("exposes the same engine via the camelCase alias", () => {
    expect(bankFeedImportEngine).toBe(BankFeedImportEngine);
  });
});
