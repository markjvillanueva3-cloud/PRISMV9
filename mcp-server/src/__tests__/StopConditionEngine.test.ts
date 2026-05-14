/**
 * StopConditionEngine tests
 *
 * Pure decision engine — no I/O, no state files. Every test exercises real
 * rule logic against the 6 internal RULES (budget-critical, redundant-read,
 * redundant-grep, large-unbounded-read, high-frequency-calls, wasteful-tools)
 * and asserts concrete reasons / savings / decisions — never bare existence.
 */

import { describe, it, expect } from "vitest";
import {
  StopConditionEngine,
  stopConditionEngine,
  type ContextState,
} from "../engines/StopConditionEngine.js";

/** A context that triggers NO rule — every test starts from this and perturbs one axis. */
function quietCtx(overrides: Partial<ContextState> = {}): ContextState {
  return {
    totalTokensUsed: 1_000,
    maxBudget: 200_000, // 0.5% used → well under the 85% warn floor
    recentFiles: [],
    recentGreps: [],
    toolCallCount: 10,
    sessionAgeMinutes: 30, // old enough that high-frequency never fires
    ...overrides,
  };
}

describe("StopConditionEngine", () => {
  const engine = new StopConditionEngine();

  describe("evaluate — aggregate behavior", () => {
    it("returns 'allow' with the canonical reason when nothing triggers", () => {
      const r = engine.evaluate("Read", { file_path: "/src/new.ts" }, quietCtx());
      expect(r.decision).toBe("allow");
      expect(r.reason).toBe("No stop conditions triggered");
      expect(r.saving).toBe(0);
    });

    it("returns the highest-severity match when multiple rules fire (block beats warn)", () => {
      // budget-critical → block, AND wasteful-tools → warn (short Agent prompt)
      const ctx = quietCtx({ totalTokensUsed: 196_000 }); // 98%
      const r = engine.evaluate("Agent", { prompt: "do it" }, ctx);
      expect(r.decision).toBe("block");
      expect(r.reason).toContain("98%");
    });

    it("returns a warn when only warn-level rules fire", () => {
      const r = engine.evaluate("Read", { file_path: "/src/index.ts" }, quietCtx());
      expect(r.decision).toBe("warn");
      expect(r.saving).toBe(3000); // large-unbounded-read
    });

    it("first-encountered rule wins on a severity tie (budget warn over later warns)", () => {
      // budget-critical warn (85%) + large-unbounded-read warn — budget is earlier in RULES
      const ctx = quietCtx({ totalTokensUsed: 170_000 }); // 85%
      const r = engine.evaluate("Read", { file_path: "/src/index.ts" }, ctx);
      expect(r.decision).toBe("warn");
      expect(r.reason).toContain("85%"); // budget rule's reason, not the read rule's
    });
  });

  describe("rule: budget-critical", () => {
    it("blocks at exactly 95%", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 190_000 }));
      expect(r.decision).toBe("block");
      expect(r.saving).toBe(2000);
    });

    it("blocks above 95% and rounds the percentage in the reason", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 196_000 }));
      expect(r.decision).toBe("block");
      expect(r.reason).toContain("98%");
      expect(r.alternative).toContain("/compact");
    });

    it("warns at exactly 85%", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 170_000 }));
      expect(r.decision).toBe("warn");
      expect(r.saving).toBe(0);
      expect(r.alternative).toContain("compact outputs");
    });

    it("warns in the 85–95% band", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 180_000 })); // 90%
      expect(r.decision).toBe("warn");
      expect(r.reason).toContain("90%");
    });

    it("allows just below the 85% warn floor", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 168_000 })); // 84%
      expect(r.decision).toBe("allow");
    });

    it("does not crash and does not fire when maxBudget is 0 (NaN percentage)", () => {
      // 0/0 → NaN; NaN >= 95 and NaN >= 85 are both false → rule returns null
      const r = engine.evaluate("Bash", {}, quietCtx({ totalTokensUsed: 0, maxBudget: 0 }));
      expect(r.decision).toBe("allow");
    });
  });

  describe("rule: redundant-read", () => {
    it("blocks a Read of a file already in recentFiles", () => {
      const ctx = quietCtx({ recentFiles: ["/src/engines/Foo.ts"] });
      const r = engine.evaluate("Read", { file_path: "/src/engines/Foo.ts" }, ctx);
      expect(r.decision).toBe("block");
      expect(r.saving).toBe(2000);
      expect(r.reason).toContain("Foo.ts");
    });

    it("allows a Read of a file NOT in recentFiles", () => {
      const ctx = quietCtx({ recentFiles: ["/src/engines/Other.ts"] });
      const r = engine.evaluate("Read", { file_path: "/src/engines/Foo.ts" }, ctx);
      expect(r.decision).toBe("allow");
    });

    it("does not trigger for a non-Read tool even when the path is in recentFiles", () => {
      const ctx = quietCtx({ recentFiles: ["/src/engines/Foo.ts"] });
      const r = engine.evaluate("Edit", { file_path: "/src/engines/Foo.ts" }, ctx);
      expect(r.decision).toBe("allow");
    });

    it("allows a Read with an empty file_path even if recentFiles is non-empty", () => {
      const ctx = quietCtx({ recentFiles: ["/src/engines/Foo.ts"] });
      const r = engine.evaluate("Read", {}, ctx);
      expect(r.decision).toBe("allow");
    });
  });

  describe("rule: redundant-grep", () => {
    it("blocks a Grep whose 'pattern|path' key is in recentGreps", () => {
      const ctx = quietCtx({ recentGreps: ["kienzle|src/physics"] });
      const r = engine.evaluate("Grep", { pattern: "kienzle", path: "src/physics" }, ctx);
      expect(r.decision).toBe("block");
      expect(r.saving).toBe(500);
      expect(r.reason).toContain("kienzle");
    });

    it("allows a Grep whose pattern was not run recently", () => {
      const ctx = quietCtx({ recentGreps: ["taylor|src/physics"] });
      const r = engine.evaluate("Grep", { pattern: "kienzle", path: "src/physics" }, ctx);
      expect(r.decision).toBe("allow");
    });

    it("matches the 'pattern|' key shape when path is omitted", () => {
      const ctx = quietCtx({ recentGreps: ["kienzle|"] });
      const r = engine.evaluate("Grep", { pattern: "kienzle" }, ctx);
      expect(r.decision).toBe("block");
    });

    it("does not trigger for a non-Grep tool", () => {
      const ctx = quietCtx({ recentGreps: ["kienzle|src"] });
      const r = engine.evaluate("Read", { pattern: "kienzle", path: "src" }, ctx);
      expect(r.decision).toBe("allow");
    });

    it("allows a Grep with an empty pattern", () => {
      const ctx = quietCtx({ recentGreps: ["|src"] });
      const r = engine.evaluate("Grep", { path: "src" }, ctx);
      expect(r.decision).toBe("allow");
    });
  });

  describe("rule: large-unbounded-read", () => {
    it("warns on an unbounded Read of index.ts", () => {
      const r = engine.evaluate("Read", { file_path: "/src/index.ts" }, quietCtx());
      expect(r.decision).toBe("warn");
      expect(r.saving).toBe(3000);
      expect(r.alternative).toContain("offset/limit");
    });

    it("warns on an unbounded Read of package-lock.json", () => {
      const r = engine.evaluate("Read", { file_path: "/package-lock.json" }, quietCtx());
      expect(r.decision).toBe("warn");
    });

    it("warns on an unbounded Read of a .min.js bundle", () => {
      const r = engine.evaluate("Read", { file_path: "/dist/app.min.js" }, quietCtx());
      expect(r.decision).toBe("warn");
    });

    it("does NOT warn when a limit param is present", () => {
      const r = engine.evaluate("Read", { file_path: "/src/index.ts", limit: 100 }, quietCtx());
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn when an offset param is present", () => {
      const r = engine.evaluate("Read", { file_path: "/src/index.ts", offset: 50 }, quietCtx());
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn for a normal source file not on the known-large list", () => {
      const r = engine.evaluate("Read", { file_path: "/src/engines/SmallEngine.ts" }, quietCtx());
      expect(r.decision).toBe("allow");
    });
  });

  describe("rule: high-frequency-calls", () => {
    it("warns when >100 calls happen in under 10 minutes", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ toolCallCount: 150, sessionAgeMinutes: 5 }));
      expect(r.decision).toBe("warn");
      expect(r.reason).toContain("150 tool calls");
    });

    it("does NOT warn when call count is high but the session is >= 10 min old", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ toolCallCount: 150, sessionAgeMinutes: 10 }));
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn at exactly 100 calls (strict greater-than)", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ toolCallCount: 100, sessionAgeMinutes: 5 }));
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn when call count is modest", () => {
      const r = engine.evaluate("Bash", {}, quietCtx({ toolCallCount: 20, sessionAgeMinutes: 2 }));
      expect(r.decision).toBe("allow");
    });
  });

  describe("rule: wasteful-tools", () => {
    it("warns on a short Agent prompt (under 50 chars AND under 8 words)", () => {
      const r = engine.evaluate("Agent", { prompt: "find the file" }, quietCtx());
      expect(r.decision).toBe("warn");
      expect(r.saving).toBe(1000);
      expect(r.alternative).toContain("Read/Grep/Glob");
    });

    it("does NOT warn on a long Agent prompt (>= 50 chars)", () => {
      const longPrompt = "Please trace every caller of the deflection formula across the engines directory";
      const r = engine.evaluate("Agent", { prompt: longPrompt }, quietCtx());
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn on a short-char but >=8-word Agent prompt (both conditions required)", () => {
      // 8 words, but < 50 chars — word count fails the < 8 test
      const r = engine.evaluate("Agent", { prompt: "a b c d e f g h" }, quietCtx());
      expect(r.decision).toBe("allow");
    });

    it("reads the Agent prompt from params.query as a fallback", () => {
      const r = engine.evaluate("Agent", { query: "where is it" }, quietCtx());
      expect(r.decision).toBe("warn");
    });

    it("reads the Agent prompt from params.task as a fallback", () => {
      const r = engine.evaluate("Agent", { task: "list them" }, quietCtx());
      expect(r.decision).toBe("warn");
    });

    it("warns on a WebFetch of a GitHub blob URL", () => {
      const r = engine.evaluate(
        "WebFetch",
        { url: "https://github.com/anthropics/x/blob/main/README.md" },
        quietCtx(),
      );
      expect(r.decision).toBe("warn");
      expect(r.saving).toBe(1500);
      expect(r.alternative).toContain("locally");
    });

    it("does NOT warn on a WebFetch of a non-GitHub URL", () => {
      const r = engine.evaluate("WebFetch", { url: "https://example.com/docs" }, quietCtx());
      expect(r.decision).toBe("allow");
    });

    it("does NOT warn on a WebFetch of a GitHub URL that is not a /blob/ path", () => {
      const r = engine.evaluate("WebFetch", { url: "https://github.com/anthropics/x" }, quietCtx());
      expect(r.decision).toBe("allow");
    });
  });

  describe("shouldBlock", () => {
    it("returns true when a block-level rule fires", () => {
      expect(engine.shouldBlock("Bash", {}, quietCtx({ totalTokensUsed: 196_000 }))).toBe(true);
    });

    it("returns false when only a warn-level rule fires", () => {
      expect(engine.shouldBlock("Read", { file_path: "/src/index.ts" }, quietCtx())).toBe(false);
    });

    it("returns false when nothing triggers", () => {
      expect(engine.shouldBlock("Read", { file_path: "/src/fresh.ts" }, quietCtx())).toBe(false);
    });
  });

  describe("evaluateAll", () => {
    it("returns an empty array when no rule triggers", () => {
      const all = engine.evaluateAll("Read", { file_path: "/src/fresh.ts" }, quietCtx());
      expect(all).toEqual([]);
    });

    it("returns one entry per triggered rule", () => {
      // budget warn (90%) + large-unbounded-read warn → exactly 2 entries
      const ctx = quietCtx({ totalTokensUsed: 180_000 });
      const all = engine.evaluateAll("Read", { file_path: "/src/index.ts" }, ctx);
      expect(all).toHaveLength(2);
      expect(all.map((e) => e.decision)).toEqual(["warn", "warn"]);
    });

    it("returns a single-element array when exactly one rule triggers", () => {
      const all = engine.evaluateAll("Read", { file_path: "/src/index.ts" }, quietCtx());
      expect(all).toHaveLength(1);
      expect(all[0].saving).toBe(3000);
    });

    it("captures a block and a warn together when both fire", () => {
      const ctx = quietCtx({ totalTokensUsed: 196_000 }); // budget block
      const all = engine.evaluateAll("Agent", { prompt: "do it" }, ctx); // wasteful warn
      expect(all).toHaveLength(2);
      const decisions = all.map((e) => e.decision).sort();
      expect(decisions).toEqual(["block", "warn"]);
    });
  });

  describe("getRuleNames", () => {
    it("returns exactly the 6 known rule names", () => {
      const names = engine.getRuleNames();
      expect(names).toHaveLength(6);
      expect(names).toEqual([
        "budget-critical",
        "redundant-read",
        "redundant-grep",
        "large-unbounded-read",
        "high-frequency-calls",
        "wasteful-tools",
      ]);
    });
  });

  describe("totalSavings", () => {
    it("sums the saving field across evaluations", () => {
      const ctx = quietCtx({ totalTokensUsed: 196_000 }); // budget block: 2000
      const all = engine.evaluateAll("Agent", { prompt: "do it" }, ctx); // wasteful warn: 1000
      expect(engine.totalSavings(all)).toBe(3000);
    });

    it("returns 0 for an empty evaluation list", () => {
      expect(engine.totalSavings([])).toBe(0);
    });

    it("returns 0 when all evaluations are zero-saving warns", () => {
      const ctx = quietCtx({ totalTokensUsed: 180_000 }); // budget warn: saving 0
      const all = engine.evaluateAll("Bash", {}, ctx);
      expect(engine.totalSavings(all)).toBe(0);
    });
  });

  describe("singleton export", () => {
    it("exposes a ready-to-use stopConditionEngine instance", () => {
      expect(stopConditionEngine).toBeInstanceOf(StopConditionEngine);
      expect(stopConditionEngine.getRuleNames()).toHaveLength(6);
    });

    it("the singleton evaluates identically to a fresh instance", () => {
      const ctx = quietCtx({ totalTokensUsed: 196_000 });
      const fromSingleton = stopConditionEngine.evaluate("Bash", {}, ctx);
      const fromFresh = engine.evaluate("Bash", {}, ctx);
      expect(fromSingleton).toEqual(fromFresh);
    });
  });
});
