/**
 * AutoPostmortemEngine.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S6/U-MEMORIES-MISTAKES-WIRE — exit_criteria coverage:
 *   1. >=3 stops in 5min with uncommitted state -> 1 postmortem written
 *   2. 1 stop with uncommitted state -> 0 postmortems
 *   3. >=3 stops with NO uncommitted state -> 0 postmortems
 *   4. Postmortem markdown carries: signature hash, files-touched, last-3-commits
 *   5. Idempotent: same trigger run twice -> 'already-exists' on second
 *   6. Day-cap honored
 *
 * 14 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AutoPostmortemEngine,
  autoPostmortemEngine,
  type StopEvent,
} from "../engines/AutoPostmortemEngine.js";

let mistakesDir: string;
const FIXED_NOW_MS = Date.UTC(2026, 4, 8, 12, 0, 0);

function evtAt(offsetMs: number, uncommitted = true, errorSig?: string, filesTouched?: string[]): StopEvent {
  return {
    ts: new Date(FIXED_NOW_MS + offsetMs).toISOString(),
    uncommitted,
    errorSig,
    filesTouched,
  };
}

beforeEach(() => {
  mistakesDir = mkdtempSync(join(tmpdir(), "apm-test-"));
});

afterEach(() => {
  rmSync(mistakesDir, { recursive: true, force: true });
});

describe("AutoPostmortemEngine — trigger behavior", () => {
  // -------------------- HAPPY PATHS --------------------

  it("3 stops in ~3min with uncommitted state writes exactly 1 postmortem", () => {
    const trigger = {
      events: [evtAt(0, true, "scrutiny-fail"), evtAt(60_000, true, "scrutiny-fail"), evtAt(180_000, true, "scrutiny-fail")],
      recentCommits: ["fix: address codex blocker", "feat: ship engine"],
    };
    const r = autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: true });
    expect(r.action).toBe("wrote");
    const files = readdirSync(mistakesDir).filter((n) => n.endsWith(".md"));
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/2026-05-08-[0-9a-f]{12}\.md/);
  });

  it("postmortem markdown contains all required sections", () => {
    const trigger = {
      events: [
        evtAt(0, true, "tsc-error", ["src/engines/foo.ts"]),
        evtAt(120_000, true, "tsc-error", ["src/engines/foo.ts"]),
        evtAt(240_000, true, "tsc-error", ["src/engines/foo.ts"]),
      ],
      recentCommits: ["c1: x", "c2: y", "c3: z"],
      errorDescription: "Repeated TS2322 type-mismatch on src/engines/foo.ts",
      scrutinyVerdict: "FAIL" as const,
    };
    const r = autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: true });
    expect(r.action).toBe("wrote");
    const md = readFileSync(r.path, "utf8");
    expect(md).toContain("## Context");
    expect(md).toContain("## Failure");
    expect(md).toContain("## Root Cause");
    expect(md).toContain("## Detection");
    expect(md).toContain("## Files Touched");
    expect(md).toContain("## Fix");
    expect(md).toContain("## Prevention");
    expect(md).toContain(`signature: ${r.signature}`);
    expect(md).toContain("scrutiny_verdict: FAIL");
    expect(md).toContain("Repeated TS2322");
    expect(md).toContain("src/engines/foo.ts");
    // last-3-commits present
    expect(md).toContain("c1: x");
    expect(md).toContain("c2: y");
    expect(md).toContain("c3: z");
  });

  it("dry-run returns markdown but writes no file", () => {
    const trigger = {
      events: [evtAt(0, true), evtAt(60_000, true), evtAt(180_000, true)],
      recentCommits: [],
    };
    const r = autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: false });
    expect(r.action).toBe("would-write");
    expect(r.markdown.length).toBeGreaterThan(100);
    const files = readdirSync(mistakesDir).filter((n) => n.endsWith(".md"));
    expect(files.length).toBe(0);
  });

  it("signature is deterministic — same events produce same signature across calls", () => {
    const events = [evtAt(0, true, "e1", ["a.ts"]), evtAt(60_000, true, "e1", ["a.ts"]), evtAt(180_000, true, "e1", ["a.ts"])];
    const r1 = autoPostmortemEngine.evaluate({ events, recentCommits: [] }, { mistakesDir });
    const r2 = autoPostmortemEngine.evaluate({ events, recentCommits: [] }, { mistakesDir });
    expect(r2.signature).toBe(r1.signature);
  });

  // -------------------- NO-OP CASES --------------------

  it("noop-too-few-stops: 1 stop returns no-op without writing", () => {
    const r = autoPostmortemEngine.evaluate(
      { events: [evtAt(0, true)], recentCommits: [] },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("noop-too-few-stops");
    expect(readdirSync(mistakesDir).length).toBe(0);
  });

  it("noop-too-few-stops: 2 stops still below threshold", () => {
    const r = autoPostmortemEngine.evaluate(
      { events: [evtAt(0, true), evtAt(60_000, true)], recentCommits: [] },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("noop-too-few-stops");
  });

  it("noop-clean-stops: 3 stops with NO uncommitted state -> no postmortem", () => {
    const r = autoPostmortemEngine.evaluate(
      { events: [evtAt(0, false), evtAt(60_000, false), evtAt(180_000, false)], recentCommits: [] },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("noop-clean-stops");
    expect(readdirSync(mistakesDir).length).toBe(0);
  });

  it("noop-burst-too-tight: 3 stops within 1.5s suppressed (click-storm guard)", () => {
    const r = autoPostmortemEngine.evaluate(
      { events: [evtAt(0, true), evtAt(500, true), evtAt(1500, true)], recentCommits: [] },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("noop-burst-too-tight");
  });

  it("noop-day-cap-reached: 11th postmortem on the same day is suppressed", () => {
    // Pre-populate 10 fake postmortems for today.
    for (let i = 0; i < 10; i++) {
      writeFileSync(join(mistakesDir, `2026-05-08-fake${String(i).padStart(2, "0")}xx.md`), "stub", "utf8");
    }
    // Now trigger an 11th with a unique signature.
    const r = autoPostmortemEngine.evaluate(
      {
        events: [evtAt(0, true, "uniq-A"), evtAt(60_000, true, "uniq-A"), evtAt(180_000, true, "uniq-A")],
        recentCommits: [],
      },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("noop-day-cap-reached");
  });

  // -------------------- IDEMPOTENCY --------------------

  it("idempotent: same trigger run twice — second run reports 'already-exists'", () => {
    const trigger = {
      events: [evtAt(0, true, "sig"), evtAt(60_000, true, "sig"), evtAt(180_000, true, "sig")],
      recentCommits: [],
    };
    const r1 = autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: true });
    expect(r1.action).toBe("wrote");
    const r2 = autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: true });
    expect(r2.action).toBe("already-exists");
    expect(r2.path).toBe(r1.path);
    expect(readdirSync(mistakesDir).filter((n) => n.endsWith(".md")).length).toBe(1);
  });

  it("update mode rewrites the existing postmortem with new content", () => {
    const trigger = {
      events: [evtAt(0, true, "x"), evtAt(60_000, true, "x"), evtAt(180_000, true, "x")],
      recentCommits: ["original"],
    };
    autoPostmortemEngine.evaluate(trigger, { mistakesDir, apply: true });
    const updateTrigger = { ...trigger, recentCommits: ["updated commit subject"] };
    const r = autoPostmortemEngine.evaluate(updateTrigger, { mistakesDir, apply: true, mode: "update" });
    expect(r.action).toBe("wrote");
    const md = readFileSync(r.path, "utf8");
    expect(md).toContain("updated commit subject");
    expect(md).not.toContain("- `original`");
  });

  // -------------------- ADVERSARIAL --------------------

  it("tolerates events without errorSig or filesTouched", () => {
    const r = autoPostmortemEngine.evaluate(
      {
        events: [evtAt(0, true), evtAt(60_000, true), evtAt(180_000, true)],
        recentCommits: [],
      },
      { mistakesDir, apply: true },
    );
    expect(r.action).toBe("wrote");
    const md = readFileSync(r.path, "utf8");
    expect(md).toContain("(Stop reason was not captured");
  });

  it("event order does not affect signature (sort by ts internally)", () => {
    const a = autoPostmortemEngine.evaluate(
      {
        events: [evtAt(0, true, "x"), evtAt(60_000, true, "x"), evtAt(180_000, true, "x")],
        recentCommits: [],
      },
      { mistakesDir },
    );
    const b = autoPostmortemEngine.evaluate(
      {
        events: [evtAt(180_000, true, "x"), evtAt(0, true, "x"), evtAt(60_000, true, "x")],
        recentCommits: [],
      },
      { mistakesDir },
    );
    expect(b.signature).toBe(a.signature);
  });

  it("singleton == fresh class instance — equivalent results", () => {
    const fresh = new AutoPostmortemEngine();
    const trigger = {
      events: [evtAt(0, true, "y"), evtAt(60_000, true, "y"), evtAt(180_000, true, "y")],
      recentCommits: ["x"],
    };
    const r1 = autoPostmortemEngine.evaluate(trigger, { mistakesDir });
    const r2 = fresh.evaluate(trigger, { mistakesDir });
    expect(r2.signature).toBe(r1.signature);
    expect(r2.markdown).toBe(r1.markdown);
  });
});
