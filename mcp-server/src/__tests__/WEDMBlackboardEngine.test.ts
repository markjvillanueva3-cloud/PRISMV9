/**
 * WEDMBlackboardEngine tests — MS-P0.5-COORD U-P0.5-COORD-03
 */
import { describe, it, expect, beforeEach } from "vitest";
import { WEDMBlackboardEngine } from "../engines/WEDMBlackboardEngine.js";

describe("WEDMBlackboardEngine", () => {
  let bb: WEDMBlackboardEngine;

  beforeEach(() => {
    bb = new WEDMBlackboardEngine();
    bb.resetForTests();
  });

  describe("post + read", () => {
    it("writes and reads a single slot", () => {
      bb.post("wedm.material.D2", "vt_vertical", 3.2, "observation", "edm");
      const e = bb.read("wedm.material.D2", "vt_vertical");
      expect(e?.value).toBe(3.2);
      expect(e?.tag).toBe("observation");
      expect(e?.source).toBe("edm");
    });

    it("bumps version on each post to same slot", () => {
      const e1 = bb.post("ns", "k", 1, "observation", "s");
      const e2 = bb.post("ns", "k", 2, "observation", "s");
      const e3 = bb.post("ns", "k", 3, "observation", "s");
      expect(e1.version).toBe(1);
      expect(e2.version).toBe(2);
      expect(e3.version).toBe(3);
    });

    it("read returns latest version", () => {
      bb.post("ns", "k", 1, "observation", "s");
      bb.post("ns", "k", 2, "observation", "s");
      expect(bb.read("ns", "k")?.value).toBe(2);
    });

    it("returns null for missing slot", () => {
      expect(bb.read("missing", "k")).toBeNull();
    });

    it("produces unique ids", () => {
      const a = bb.post("ns", "a", 1, "observation", "s");
      const b = bb.post("ns", "b", 2, "observation", "s");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("queries", () => {
    beforeEach(() => {
      bb.post("wedm.job.A", "params", {}, "observation", "edm");
      bb.post("wedm.job.A", "warning", "slow", "warning", "edm");
      bb.post("wedm.job.B", "params", {}, "observation", "edm");
      bb.post("wedm.material.D2", "kh", 2.5, "decision", "cam");
    });

    it("readAllInNamespace returns all entries in that namespace", () => {
      expect(bb.readAllInNamespace("wedm.job.A").length).toBe(2);
      expect(bb.readAllInNamespace("wedm.job.B").length).toBe(1);
    });

    it("readAllInNamespace with tag filter", () => {
      expect(bb.readAllInNamespace("wedm.job.A", "warning").length).toBe(1);
      expect(bb.readAllInNamespace("wedm.job.A", "observation").length).toBe(1);
    });

    it("readByPrefix matches all child namespaces", () => {
      expect(bb.readByPrefix("wedm.job").length).toBe(3);
      expect(bb.readByPrefix("wedm.").length).toBe(4);
      expect(bb.readByPrefix("nonexistent").length).toBe(0);
    });

    it("readByPrefix with tag filter", () => {
      expect(bb.readByPrefix("wedm.", "observation").length).toBe(2);
      expect(bb.readByPrefix("wedm.", "decision").length).toBe(1);
    });

    it("readHistory returns versioned history", () => {
      bb.post("ns.h", "k", 10, "observation", "s");
      bb.post("ns.h", "k", 20, "observation", "s");
      bb.post("ns.h", "k", 30, "observation", "s");
      const h = bb.readHistory("ns.h", "k");
      expect(h.length).toBe(3);
      expect(h.map((e) => e.value)).toEqual([10, 20, 30]);
    });
  });

  describe("TTL", () => {
    it("honors custom ttlMs", () => {
      bb.post("ns", "k", 1, "observation", "s", { ttlMs: 50 });
      expect(bb.read("ns", "k")?.value).toBe(1);
    });

    it("expired entries are pruned on read", async () => {
      bb.post("ns", "k", 1, "observation", "s", { ttlMs: 5 });
      await new Promise((r) => setTimeout(r, 15));
      expect(bb.read("ns", "k")).toBeNull();
    });
  });

  describe("subscribe", () => {
    it("calls subscriber on matching namespace post", () => {
      const seen: unknown[] = [];
      bb.subscribe("wedm.", (e) => seen.push(e.value));
      bb.post("wedm.job.X", "k", "hello", "observation", "s");
      bb.post("other.job.X", "k", "ignored", "observation", "s");
      expect(seen).toEqual(["hello"]);
    });

    it("unsubscribe stops notifications", () => {
      const seen: unknown[] = [];
      const id = bb.subscribe("ns.", (e) => seen.push(e.value));
      bb.post("ns.a", "k", 1, "observation", "s");
      const ok = bb.unsubscribe(id);
      expect(ok).toBe(true);
      bb.post("ns.a", "k", 2, "observation", "s");
      expect(seen).toEqual([1]);
    });

    it("subscriber exception does not disrupt post", () => {
      bb.subscribe("ns.", () => {
        throw new Error("boom");
      });
      expect(() => bb.post("ns.x", "k", 1, "observation", "s")).not.toThrow();
    });
  });

  describe("invalidate", () => {
    it("removes all entries for a slot", () => {
      bb.post("ns", "k", 1, "observation", "s");
      bb.post("ns", "k", 2, "observation", "s");
      expect(bb.invalidate("ns", "k")).toBe(2);
      expect(bb.read("ns", "k")).toBeNull();
    });
  });

  describe("getStats", () => {
    it("reports zero stats initially", () => {
      const s = bb.getStats();
      expect(s.totalEntries).toBe(0);
      expect(s.lastPostAt).toBeNull();
    });

    it("tracks namespaces and post rate", () => {
      bb.post("a", "k", 1, "observation", "s");
      bb.post("b", "k", 1, "observation", "s");
      bb.post("a", "k2", 1, "observation", "s");
      const s = bb.getStats();
      expect(s.totalEntries).toBe(3);
      expect(s.namespaceCount).toBe(2);
      expect(s.largestNamespace?.namespace).toBe("a");
      expect(s.largestNamespace?.count).toBe(2);
    });
  });
});
