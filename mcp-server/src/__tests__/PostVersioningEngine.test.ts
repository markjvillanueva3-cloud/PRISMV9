/**
 * PostVersioningEngine -- companion contract tests (U-PP-MISSING-ENGINE-TESTS, slot:echo)
 *
 * Post-processor revision tracker: content-addressable-ish store with
 * store / history / diff / retrieve over an in-memory Map. Pure logic except
 * for the clock, so these tests drive a FAKE clock (vi.useFakeTimers) to make
 * the hash + generated_at deterministic and to characterize the timestamp-salt
 * behavior below.
 *
 * The singleton has NO reset() and its Map persists across tests (and across
 * test files in the same worker), so every test uses a GLOBALLY-UNIQUE
 * machine_id to stay isolated.
 *
 * Two characterized contract defects (locked here, flagged for an owner-gated
 * fix -- not silently asserted as "correct"):
 *   (D1) computeHash() salts the input with Date.now(), so the hash is NOT
 *        content-deterministic -- contradicting the engine's own JSDoc
 *        ("deterministic", "content-addressable", Git object model). Same config
 *        at two different clock times => two different hashes (test "D1").
 *   (D2) getHistory() reports `total` = the post-slice page length, not the true
 *        number of versions for the machine -- mislabeling the documented
 *        "Total count" when a limit truncates (test "D2").
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  postVersioningEngine as ver,
  type PostVersion,
  type VersionHistoryResult,
  type VersionDiff,
} from "../engines/PostVersioningEngine.js";

const HEX16 = /^[0-9a-f]{16}$/;

// Drive a fake clock so hash (Date.now-salted) + generated_at are deterministic.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
});
afterEach(() => {
  vi.useRealTimers();
});

function storeV(over: Partial<NonNullable<Parameters<typeof ver.process>[0]["version"]>> = {}) {
  return ver.process({
    action: "store",
    version: {
      machine_id: "M-DEFAULT",
      controller: "fanuc",
      features: [],
      aggressiveness: 1,
      gcode: "G0 X0\nM30",
      ...over,
    },
  }) as Promise<PostVersion>;
}

describe("PostVersioningEngine", () => {
  describe("process() routing", () => {
    it("routes store and returns a fingerprinted PostVersion", async () => {
      const r = (await ver.process({
        action: "store",
        version: { machine_id: "RT-store", controller: "haas", features: [], aggressiveness: 2, gcode: "M30" },
      })) as PostVersion;
      expect(r.machine_id).toBe("RT-store");
      expect(r.hash).toMatch(HEX16);
    });

    it("throws on an unknown action", async () => {
      await expect(ver.process({ action: "bogus" as never })).rejects.toThrow("Unknown action: bogus");
    });
  });

  describe("store", () => {
    it("emits a 16-hex hash + 8-char short_hash, SORTS features, and counts lines", async () => {
      const v = await storeV({
        machine_id: "ST-fields",
        features: ["zeta", "alpha", "mike"],
        gcode: "L1\nL2\nL3", // 3 lines
      });
      expect(v.hash).toMatch(HEX16);
      expect(v.short_hash).toBe(v.hash.slice(0, 8));
      expect(v.short_hash).toHaveLength(8);
      expect(v.features).toEqual(["alpha", "mike", "zeta"]); // sorted ascending
      expect(v.line_count).toBe(3);
      expect(v.prism_version).toBe("2.0.0");
      expect(v.generated_at).toBe(new Date(1_000_000).toISOString()); // fake clock
    });

    it("FAILURE MODE: store without version data throws", async () => {
      await expect(ver.process({ action: "store" })).rejects.toThrow("version data required for store action");
    });

    it("different configs produce different hashes (config bytes feed the hash)", async () => {
      const a = await storeV({ machine_id: "ST-distinct", controller: "fanuc" });
      const b = await storeV({ machine_id: "ST-distinct", controller: "haas" });
      expect(a.hash).not.toBe(b.hash);
    });

    it("D1 CHARACTERIZATION: hash is NOT content-deterministic -- Date.now() salts it (contradicts JSDoc)", async () => {
      // Identical config, two different clock times => two different hashes.
      vi.setSystemTime(1_000_000);
      const t1 = await storeV({ machine_id: "ST-D1", controller: "okuma", aggressiveness: 3, features: ["nurbs"] });
      vi.setSystemTime(2_000_000);
      const t2 = await storeV({ machine_id: "ST-D1", controller: "okuma", aggressiveness: 3, features: ["nurbs"] });
      expect(t1.hash).not.toBe(t2.hash); // <-- defeats content-addressable dedup the docstring promises

      // Same config AT THE SAME clock time => same hash (proves the salt is the clock, not randomness).
      vi.setSystemTime(1_000_000);
      const t1again = await storeV({ machine_id: "ST-D1", controller: "okuma", aggressiveness: 3, features: ["nurbs"] });
      expect(t1again.hash).toBe(t1.hash);
    });
  });

  describe("history", () => {
    it("returns this machine's versions newest-first, with gcode stripped", async () => {
      vi.setSystemTime(1_000_000);
      await storeV({ machine_id: "HIST-order", aggressiveness: 1 });
      vi.setSystemTime(2_000_000);
      await storeV({ machine_id: "HIST-order", aggressiveness: 2 });
      vi.setSystemTime(3_000_000);
      await storeV({ machine_id: "HIST-order", aggressiveness: 3 });

      const h = (await ver.process({ action: "history", machine_id: "HIST-order" })) as VersionHistoryResult;
      expect(h.total).toBe(3);
      expect(h.versions).toHaveLength(3);
      expect(h.versions.map((v) => v.aggressiveness)).toEqual([3, 2, 1]); // newest (t=3M) first
      expect("gcode" in h.versions[0]).toBe(false); // Omit<PostVersion,"gcode">
    });

    it("D2 CHARACTERIZATION: total reports the post-LIMIT page length, not the true count", async () => {
      vi.setSystemTime(1_000_000);
      await storeV({ machine_id: "HIST-D2", aggressiveness: 1 });
      vi.setSystemTime(2_000_000);
      await storeV({ machine_id: "HIST-D2", aggressiveness: 2 });
      vi.setSystemTime(3_000_000);
      await storeV({ machine_id: "HIST-D2", aggressiveness: 3 });

      const h = (await ver.process({ action: "history", machine_id: "HIST-D2", limit: 2 })) as VersionHistoryResult;
      expect(h.versions).toHaveLength(2);
      expect(h.versions.map((v) => v.aggressiveness)).toEqual([3, 2]); // 2 newest
      expect(h.total).toBe(2); // <-- BUG: should be 3 (true count); mislabels the documented "Total count"
    });

    it("returns an empty history for a machine with no stored versions", async () => {
      const h = (await ver.process({ action: "history", machine_id: "HIST-none-xyz" })) as VersionHistoryResult;
      expect(h.versions).toHaveLength(0);
      expect(h.total).toBe(0);
      expect(h.machine_id).toBe("HIST-none-xyz");
    });

    it("FAILURE MODE: history without machine_id throws", async () => {
      await expect(ver.process({ action: "history" })).rejects.toThrow("machine_id required for history action");
    });
  });

  describe("diff", () => {
    it("computes per-line added/removed/changed/unchanged + config_diffs", async () => {
      const a = await storeV({
        machine_id: "DIFF-pair",
        controller: "fanuc",
        aggressiveness: 1,
        features: ["coolant"],
        gcode: "G0 X0\nG1 Z-5\nG1 X10\nM30", // 4 lines
      });
      const b = await storeV({
        machine_id: "DIFF-pair",
        controller: "haas",
        aggressiveness: 3,
        features: ["coolant", "rigid_tap"],
        gcode: "G0 X0\nG1 Z-3\nG1 X10\nG1 Y5\nM30", // 5 lines
      });
      const d = (await ver.process({ action: "diff", hash_a: a.hash, hash_b: b.hash })) as VersionDiff;

      // line-by-line: L1 same; L2 changed; L3 same; L4 changed; L5 added
      expect(d.summary.lines_unchanged).toBe(2);
      expect(d.summary.lines_changed).toBe(2);
      expect(d.summary.lines_added).toBe(1);
      expect(d.summary.lines_removed).toBe(0);
      expect(d.added).toEqual([{ line: 5, text: "M30" }]);
      expect(d.changed).toEqual([
        { line: 2, old_text: "G1 Z-5", new_text: "G1 Z-3" },
        { line: 4, old_text: "M30", new_text: "G1 Y5" },
      ]);
      expect(d.removed).toEqual([]);

      // config diffs: controller + aggressiveness + the added feature (prism_version unchanged)
      expect(d.summary.config_diffs).toHaveLength(3);
      expect(d.summary.config_diffs.some((c) => /^Controller: fanuc/.test(c) && /haas/.test(c))).toBe(true);
      expect(d.summary.config_diffs.some((c) => /^Aggressiveness: 1/.test(c) && /3/.test(c))).toBe(true);
      expect(d.summary.config_diffs.some((c) => /Feature added: rigid_tap/.test(c))).toBe(true);
    });

    it("identical gcode + identical config diffs to all-unchanged, zero config_diffs", async () => {
      const a = await storeV({ machine_id: "DIFF-same-A", controller: "fanuc", gcode: "G0\nG1\nM30" });
      // Same config means same content; store under a different machine so it is a distinct entry.
      const b = await storeV({ machine_id: "DIFF-same-B", controller: "fanuc", gcode: "G0\nG1\nM30" });
      const d = (await ver.process({ action: "diff", hash_a: a.hash, hash_b: b.hash })) as VersionDiff;
      expect(d.summary.lines_unchanged).toBe(3);
      expect(d.summary.lines_added).toBe(0);
      expect(d.summary.lines_removed).toBe(0);
      expect(d.summary.lines_changed).toBe(0);
      // controller same, aggressiveness same (default 1), features same ([]), prism same -> machine_id is NOT a config-diff dimension
      expect(d.summary.config_diffs).toEqual([]);
    });

    it("FAILURE MODE: diff against an unknown hash throws Version not found", async () => {
      const a = await storeV({ machine_id: "DIFF-missing" });
      await expect(ver.process({ action: "diff", hash_a: a.hash, hash_b: "deadbeefdeadbeef" }))
        .rejects.toThrow("Version not found: deadbeefdeadbeef");
    });
  });

  describe("retrieve", () => {
    it("round-trips a stored version by hash, including gcode", async () => {
      const v = await storeV({ machine_id: "RET-ok", controller: "okuma", gcode: "G0\nM30" });
      const got = (await ver.process({ action: "retrieve", hash: v.hash })) as PostVersion;
      expect(got.hash).toBe(v.hash);
      expect(got.machine_id).toBe("RET-ok");
      expect(got.controller).toBe("okuma");
      expect(got.gcode).toBe("G0\nM30");
    });

    it("FAILURE MODE: retrieve of an unknown hash throws Version not found", async () => {
      await expect(ver.process({ action: "retrieve", hash: "0000000000000000" }))
        .rejects.toThrow("Version not found: 0000000000000000");
    });
  });
});
