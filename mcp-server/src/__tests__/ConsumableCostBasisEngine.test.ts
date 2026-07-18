/**
 * ConsumableCostBasisEngine tests -- QUOTING-OPTIMAL/U-QP-CONSUMABLE-COST-BASIS.
 *
 * Real-value (R9): every assertion pins the exact spend/count math + the bounded
 * [0.8,1.2] fold-back, so a change to the advisory-prior or clamp logic FAILS.
 * Hermetic: both the tool-purchases corpus AND the multiplier ledger are written
 * to temp files -- no reliance on the live jm-tool-purchases.json.
 *
 * Coverage: happy + >=3 failure modes + >=2 adversarial + >=3 spanning types.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConsumableCostBasisEngine } from "../engines/ConsumableCostBasisEngine.js";

// -- Hermetic fixture: 3 spanning types (high-n / mid / n=1) mirroring the real
//    jm-tool-purchases.json byType shape. spend/count is the advisory $/line-item.
const PURCHASES_FIXTURE = {
  schemaVersion: "1.0.0",
  advisoryOnly: true,
  byType: {
    "carbide-blank": { count: 5372, spend: 4338880.38 }, // high-n; 807.6816... $/line
    insert: { count: 212, spend: 53090.16 }, //             mid-n;  250.4253... $/line
    "saw-slitting": { count: 1, spend: 205.95 }, //          n=1;    205.95 $/line
  },
};

// Expected advisory priors (spend/count), rounded to 4dp by the engine.
const EXPECT_CARBIDE = Number((4338880.38 / 5372).toFixed(4)); // 807.6816
const EXPECT_INSERT = Number((53090.16 / 212).toFixed(4)); //     250.4253
const EXPECT_SAW = Number((205.95 / 1).toFixed(4)); //            205.95

// Raw (unrounded) priors -- the engine rounds ONCE at the end (round4(raw * m)),
// so an adjusted-price expectation must multiply the UNROUNDED prior, not the 4dp one
// (double-rounding is a 1-ulp bug in the test, not the code).
const RAW_INSERT = 53090.16 / 212;
const adj = (mult: number) => Number((RAW_INSERT * mult).toFixed(4));

describe("ConsumableCostBasisEngine", () => {
  let dir: string;
  let basisPath: string;
  let ledgerPath: string;
  let eng: ConsumableCostBasisEngine;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ccb-"));
    basisPath = join(dir, "jm-tool-purchases.json");
    ledgerPath = join(dir, "consumable-feedback-multipliers.json");
    writeFileSync(basisPath, JSON.stringify(PURCHASES_FIXTURE));
    eng = new ConsumableCostBasisEngine(); // fresh instance => fresh caches
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // -- Happy path -----------------------------------------------------------
  describe("toolCostBasis -- advisory prior", () => {
    it("returns exact spend/count per type, all confidence:advisory", () => {
      const all = eng.toolCostBasis(undefined, { basisPath, ledgerPath }) as Record<string, any>;
      expect(all["carbide-blank"].usd_per_line_item).toBe(EXPECT_CARBIDE);
      expect(all["insert"].usd_per_line_item).toBe(EXPECT_INSERT);
      expect(all["saw-slitting"].usd_per_line_item).toBe(EXPECT_SAW);
      // Every real figure is advisory, NEVER customer-grade.
      for (const t of Object.keys(all)) expect(all[t].confidence).toBe("advisory");
      // line_item_count carries the n so a consumer can rank reliability.
      expect(all["carbide-blank"].line_item_count).toBe(5372);
      expect(all["saw-slitting"].line_item_count).toBe(1);
    });

    it("single-type query returns just that type", () => {
      const e = eng.toolCostBasis("insert", { basisPath, ledgerPath }) as any;
      expect(e.type).toBe("insert");
      expect(e.usd_per_line_item).toBe(EXPECT_INSERT);
      expect(e.confidence).toBe("advisory");
      // No ledger yet => no adjustment.
      expect(e.adjusted_usd_per_line_item).toBeUndefined();
      expect(e.multiplier_source).toBeUndefined();
    });
  });

  // -- The closed loop: recordMultipliers -> toolCostBasis fold-back ---------
  describe("recordMultipliers -> fold-back", () => {
    it("stores a bounded multiplier and folds adjusted price WITHOUT dropping the raw prior", async () => {
      const res = await eng.recordMultipliers({ insert: 1.1 }, { ledgerPath, updatedAt: "2026-07-01T00:00:00Z" });
      expect(res.written).toBe(true);
      expect(res.count).toBe(1);
      expect(existsSync(ledgerPath)).toBe(true);

      const e2 = new ConsumableCostBasisEngine(); // fresh read
      const e = e2.toolCostBasis("insert", { basisPath, ledgerPath }) as any;
      // RAW prior ALWAYS present (R12 -- never silently overwritten).
      expect(e.usd_per_line_item).toBe(EXPECT_INSERT);
      // Adjusted = round4(unrounded_raw * 1.1) -- engine rounds once at the end.
      expect(e.adjusted_usd_per_line_item).toBe(adj(1.1));
      expect(e.multiplier).toBe(1.1);
      expect(e.multiplier_source).toBe("reconciliation-ledger");
    });

    it("merges: a second reconcile for a different type keeps the first (no clobber)", async () => {
      await eng.recordMultipliers({ insert: 0.9 }, { ledgerPath });
      await eng.recordMultipliers({ "carbide-blank": 1.15 }, { ledgerPath });
      const e2 = new ConsumableCostBasisEngine();
      const all = e2.toolCostBasis(undefined, { basisPath, ledgerPath }) as Record<string, any>;
      expect(all["insert"].multiplier).toBe(0.9); //          survived
      expect(all["carbide-blank"].multiplier).toBe(1.15); //  added
      expect(all["saw-slitting"].multiplier).toBeUndefined(); // untouched
    });

    it("stamps updated_at + schemaVersion + recorded_from_reconcile in the ledger", async () => {
      await eng.recordMultipliers({ insert: 1.0 }, { ledgerPath, updatedAt: "2026-07-01T12:00:00Z" });
      const led = JSON.parse(readFileSync(ledgerPath, "utf8"));
      expect(led.schemaVersion).toBe("1.0.0");
      expect(led.updated_at).toBe("2026-07-01T12:00:00Z");
      expect(led.byType.insert.recorded_from_reconcile).toBe(true);
    });
  });

  // -- Failure modes (>=3) --------------------------------------------------
  describe("failure modes", () => {
    it("missing basis file => {} (fail-soft, never throws)", () => {
      const out = eng.toolCostBasis(undefined, { basisPath: join(dir, "nope.json"), ledgerPath });
      expect(out).toEqual({});
    });

    it("unknown type => confidence:none + reason, never a fabricated price", () => {
      const e = eng.toolCostBasis("unobtanium-bit", { basisPath, ledgerPath }) as any;
      expect(e.confidence).toBe("none");
      expect(e.reason).toBe("type-not-in-basis");
      expect(e.usd_per_line_item).toBe(0);
    });

    it("corrupt ledger => raw prior still returned, no adjustment", () => {
      writeFileSync(ledgerPath, "{ this is not json ");
      const e = eng.toolCostBasis("insert", { basisPath, ledgerPath }) as any;
      expect(e.usd_per_line_item).toBe(EXPECT_INSERT); // raw survives
      expect(e.adjusted_usd_per_line_item).toBeUndefined(); // corrupt ledger => no fold
    });

    it("corrupt basis file => {} (fail-soft)", () => {
      writeFileSync(basisPath, "}{ broken");
      const out = eng.toolCostBasis(undefined, { basisPath, ledgerPath });
      expect(out).toEqual({});
    });
  });

  // -- Adversarial (>=2) ----------------------------------------------------
  describe("adversarial", () => {
    it("ledger multiplier 5.0 is RE-CLAMPED to 1.2 on read (corrupt ledger cannot widen the bound)", () => {
      // Hand-write an out-of-bound multiplier straight to disk (bypasses the write clamp).
      writeFileSync(
        ledgerPath,
        JSON.stringify({ schemaVersion: "1.0.0", byType: { insert: { multiplier: 5.0 } } }),
      );
      const e = eng.toolCostBasis("insert", { basisPath, ledgerPath }) as any;
      expect(e.multiplier).toBe(1.2); // clamped, NOT 5.0
      expect(e.adjusted_usd_per_line_item).toBe(adj(1.2));
    });

    it("ledger multiplier 0.1 is RE-CLAMPED to 0.8 on read", () => {
      writeFileSync(
        ledgerPath,
        JSON.stringify({ schemaVersion: "1.0.0", byType: { insert: { multiplier: 0.1 } } }),
      );
      const e = eng.toolCostBasis("insert", { basisPath, ledgerPath }) as any;
      expect(e.multiplier).toBe(0.8);
    });

    it("recordMultipliers drops NaN / negative / zero, writes only the finite-positive", async () => {
      const res = await eng.recordMultipliers(
        { insert: NaN, drill: -1, tap: 0, "carbide-blank": 1.05 },
        { ledgerPath },
      );
      expect(res.count).toBe(1); // only carbide-blank survived
      const led = JSON.parse(readFileSync(ledgerPath, "utf8"));
      expect(Object.keys(led.byType)).toEqual(["carbide-blank"]);
      expect(led.byType["carbide-blank"].multiplier).toBe(1.05);
    });

    it("recordMultipliers clamps an out-of-bound WRITE and records clampedFrom", async () => {
      await eng.recordMultipliers({ insert: 3.0 }, { ledgerPath });
      const led = JSON.parse(readFileSync(ledgerPath, "utf8"));
      expect(led.byType.insert.multiplier).toBe(1.2); // clamped on write
      expect(led.byType.insert.clampedFrom).toBe(3.0); // provenance preserved
    });

    it("recordMultipliers with empty/undefined input is a no-op (no file written)", async () => {
      const a = await eng.recordMultipliers({}, { ledgerPath });
      const b = await eng.recordMultipliers(undefined, { ledgerPath });
      expect(a.written).toBe(false);
      expect(b.written).toBe(false);
      expect(existsSync(ledgerPath)).toBe(false);
    });
  });
});
