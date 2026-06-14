/**
 * WasteDetectorEngineWiring.test.ts
 *
 * WIRE-UNWIRED-MS0/U-WIRE-WASTE-DETECTOR wiring-gate test.
 *
 * Asserts WasteDetectorEngine is reachable via prism_dev:waste_detector
 * (op-discriminator pattern) and that every one of the 7 engine methods
 * round-trips through the dispatcher case block.
 *
 * Pattern mirror: U-WIRE-SESSION-EVENT-LOG (3d6aba4525) — op discriminator over
 * a singleton-instance engine, schema 'type' field is z.enum (NOT z.string) so
 * the Parameters<> cast at the case site is runtime-sound.
 *
 * Anti-regression: if the case block is deleted from devDispatcher.ts OR the
 * schema entry vanishes from devActionSchemas.ts OR the action drops from the
 * ACTIONS z.enum, these tests fail loud (R12 — never silently return PASS).
 */
import { describe, it, expect, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { wasteDetectorEngine } from "../engines/WasteDetectorEngine.js";
import { ACTION_DEV_SCHEMAS } from "../schemas/devActionSchemas.js";

const DISPATCHER_PATH = path.resolve(__dirname, "..", "tools", "dispatchers", "devDispatcher.ts");
const SCHEMAS_PATH = path.resolve(__dirname, "..", "schemas", "devActionSchemas.ts");

// Hoist the source files ONCE for the suite — they're 9.5k + 3.9k lines.
// Re-reading per test would waste IO + risk a TOCTOU race against a peer commit.
const DISPATCHER_SRC: string = fs.readFileSync(DISPATCHER_PATH, "utf8");
const SCHEMAS_SRC: string = fs.readFileSync(SCHEMAS_PATH, "utf8");

// Scope the dispatcher source-grep to JUST the waste_detector case block — a
// bare `grep("checkRead")` over the 9.5k-line file would false-WIRED match any
// unrelated occurrence (sibling Tool* engines reference similar method names).
// Same lesson as U-ECHO-AUDIT-ACTIONMAP (Reviewer round-1 FAIL → fixed).
const WD_CASE_BLOCK: string = (() => {
  const start = DISPATCHER_SRC.indexOf('case "waste_detector":');
  if (start === -1) return "";
  // End-anchor: the next outer-level `case "` or the Skill Inlining divider.
  // Inner switch cases (case "record":, etc.) are PART of this block, so the
  // scan must skip past the inner switch's closing brace before looking for
  // the next outer case. We use the unique Skill Inlining divider as the safe
  // upper bound — it directly follows the waste_detector case per the edit.
  const dividerIdx = DISPATCHER_SRC.indexOf("// ── Skill Inlining", start);
  return dividerIdx === -1 ? DISPATCHER_SRC.slice(start) : DISPATCHER_SRC.slice(start, dividerIdx);
})();

describe("WasteDetectorEngine — dispatcher wiring gate", () => {
  beforeEach(() => {
    // Engine is a module-singleton — bleed-over between tests is real.
    wasteDetectorEngine.reset();
  });

  // ── ACTIONS-enum membership ──────────────────────────────────────────
  it("ACTIONS enum contains 'waste_detector'", () => {
    // Source-grep on the top-of-file ACTIONS const-array literal. The literal
    // ends with `] as const;` at L495+ — grep for the string with surrounding
    // quote anchors to avoid matching the JSDoc comment lines that mention it.
    expect(DISPATCHER_SRC).toContain('"waste_detector"] as const;');
  });

  // ── Schema registration ──────────────────────────────────────────────
  it("ACTION_DEV_SCHEMAS exports a 'waste_detector' Zod schema", () => {
    expect(ACTION_DEV_SCHEMAS).toHaveProperty("waste_detector");
    expect(typeof ACTION_DEV_SCHEMAS.waste_detector.parse).toBe("function");
  });

  it("schema enforces the 7-value 'op' z.enum (not z.string)", () => {
    const sch = ACTION_DEV_SCHEMAS.waste_detector;
    // Valid ops
    expect(() => sch.parse({ op: "record", type: "unused-read", tool: "Read", tokens_wasted: 100 })).not.toThrow();
    expect(() => sch.parse({ op: "report" })).not.toThrow();
    expect(() => sch.parse({ op: "reset" })).not.toThrow();
    // Invalid op → z.enum rejects (proves it's NOT z.string)
    expect(() => sch.parse({ op: "nonexistent_op" })).toThrow();
  });

  it("schema 'type' field is z.enum over the 8 WasteType values", () => {
    const sch = ACTION_DEV_SCHEMAS.waste_detector;
    const validTypes = [
      "unused-read", "empty-search", "reverted-edit", "duplicate-fetch",
      "oversized-output", "abandoned-chain", "wrong-tool", "stale-recheck",
    ];
    for (const t of validTypes) {
      expect(() => sch.parse({ op: "record", type: t, tool: "Read", tokens_wasted: 1 })).not.toThrow();
    }
    // z.enum (not z.string) — must reject unknown type
    expect(() => sch.parse({ op: "record", type: "fake-waste", tool: "Read", tokens_wasted: 1 })).toThrow();
  });

  // ── Case-block presence + per-op routing (scoped source-grep) ────────
  it("dispatcher case 'waste_detector' exists with all 7 inner ops", () => {
    expect(WD_CASE_BLOCK).not.toBe("");
    // 7 method names — inner switch arms. Grep is scoped to the case block ONLY
    // so we don't false-WIRED-match the same identifier in a sibling engine case.
    expect(WD_CASE_BLOCK).toContain('case "record":');
    expect(WD_CASE_BLOCK).toContain('case "check_read":');
    expect(WD_CASE_BLOCK).toContain('case "check_search":');
    expect(WD_CASE_BLOCK).toContain('case "check_output_size":');
    expect(WD_CASE_BLOCK).toContain('case "report":');
    expect(WD_CASE_BLOCK).toContain('case "oneliner":');
    expect(WD_CASE_BLOCK).toContain('case "reset":');
  });

  it("dispatcher case lazy-imports the singleton (not the class)", () => {
    // Per CLAUDE.md dispatcher convention — lazy `await import(...)`. AND the
    // engine is a singleton-export pattern, so we import {wasteDetectorEngine}
    // (lowercase instance) NOT {WasteDetectorEngine} (class). A future regression
    // that switches to `new WasteDetectorEngine()` would silently start a fresh
    // event log per call — defeating the "accumulate across MCP lifetime" purpose.
    expect(WD_CASE_BLOCK).toContain('await import("../../engines/WasteDetectorEngine.js")');
    expect(WD_CASE_BLOCK).toContain("{ wasteDetectorEngine }");
    expect(WD_CASE_BLOCK).not.toContain("new WasteDetectorEngine(");
  });

  it("dispatcher case fails loud on missing per-op params", () => {
    // Source-level R12 invariant: every method that has required args must
    // have a fail-loud `result = { error: ... }` arm. Anti-regression: if a
    // future refactor silently passes `undefined` through, the engine throws
    // OR returns a bogus result — surface it at the dispatcher boundary.
    expect(WD_CASE_BLOCK).toContain('error: "record requires {type, tool, detail?, tokens_wasted}"');
    expect(WD_CASE_BLOCK).toContain('error: "check_read requires {file, tokens_returned}"');
    expect(WD_CASE_BLOCK).toContain('error: "check_search requires {pattern, match_count, tokens_used}"');
    expect(WD_CASE_BLOCK).toContain('error: "check_output_size requires {tool, tokens_returned, expected_max?}"');
  });

  // ── Fresh-instance round-trip — every engine method actually fires ───
  it("record() accumulates an event", () => {
    expect(wasteDetectorEngine.report().events.length).toBe(0);
    wasteDetectorEngine.record("unused-read", "Read", "test.ts", 500);
    const r = wasteDetectorEngine.report();
    expect(r.events.length).toBe(1);
    expect(r.events[0].type).toBe("unused-read");
    expect(r.events[0].tokensWasted).toBe(500);
  });

  it("checkRead() flags a duplicate-fetch on re-read within 60s", () => {
    // First read — no waste (records mtime).
    expect(wasteDetectorEngine.checkRead("a.ts", 1000)).toBeNull();
    // Second read of same file within 60s — duplicate-fetch event.
    const evt = wasteDetectorEngine.checkRead("a.ts", 800);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe("duplicate-fetch");
    expect(evt!.tool).toBe("Read");
  });

  it("checkSearch() flags empty-search on 0 matches", () => {
    const evt = wasteDetectorEngine.checkSearch("nonexistent", 0, 200);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe("empty-search");
    expect(evt!.tokensWasted).toBe(200);
  });

  it("checkSearch() flags duplicate-fetch on repeated pattern within 120s", () => {
    expect(wasteDetectorEngine.checkSearch("foo", 5, 100)).toBeNull();
    const evt = wasteDetectorEngine.checkSearch("foo", 5, 100);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe("duplicate-fetch");
  });

  it("checkOutputSize() flags oversized-output above 3× expectedMax", () => {
    // Default expectedMax = 500; threshold = 3× = 1500.
    expect(wasteDetectorEngine.checkOutputSize("Bash", 1499)).toBeNull(); // under
    const evt = wasteDetectorEngine.checkOutputSize("Bash", 1501);          // over (1501 > 1500)
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe("oversized-output");
  });

  it("checkOutputSize() honors a custom expectedMax argument", () => {
    // expectedMax=100 → threshold=300; tokens=301 must fire.
    const evt = wasteDetectorEngine.checkOutputSize("Read", 301, 100);
    expect(evt).not.toBeNull();
    expect(evt!.type).toBe("oversized-output");
    // Below 3× threshold must NOT fire.
    expect(wasteDetectorEngine.checkOutputSize("Read", 299, 100)).toBeNull();
  });

  it("report() returns the WasteReport shape with recommendations", () => {
    wasteDetectorEngine.checkSearch("p", 0, 100);
    wasteDetectorEngine.checkRead("a.ts", 100);
    wasteDetectorEngine.checkRead("a.ts", 100); // duplicate
    const r = wasteDetectorEngine.report();
    expect(r.events.length).toBeGreaterThanOrEqual(2);
    expect(r.totalWaste).toBeGreaterThan(0);
    expect(r.topWasteType).not.toBeNull();
    expect(Array.isArray(r.recommendations)).toBe(true);
    expect(r.recommendations.length).toBeGreaterThan(0);
  });

  it("oneLiner() reflects engine state", () => {
    expect(wasteDetectorEngine.oneLiner()).toBe("No waste detected");
    wasteDetectorEngine.record("wrong-tool", "Agent", "should-have-used-Read", 5000);
    const line = wasteDetectorEngine.oneLiner();
    expect(line).toMatch(/1 waste events/);
    expect(line).toMatch(/wrong-tool/);
  });

  it("reset() clears events, readFiles, and searchPatterns", () => {
    wasteDetectorEngine.checkRead("a.ts", 100);
    wasteDetectorEngine.checkSearch("p", 5, 100);
    wasteDetectorEngine.record("stale-recheck", "Read", "x.ts", 100);
    expect(wasteDetectorEngine.report().events.length).toBeGreaterThanOrEqual(1);

    wasteDetectorEngine.reset();
    expect(wasteDetectorEngine.report().events.length).toBe(0);
    // After reset, checkRead on the SAME file must NOT fire duplicate-fetch
    // (proves the readFiles map was actually cleared, not just events).
    expect(wasteDetectorEngine.checkRead("a.ts", 100)).toBeNull();
    expect(wasteDetectorEngine.checkSearch("p", 5, 100)).toBeNull();
  });
});
