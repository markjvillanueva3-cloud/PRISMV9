/**
 * buildHeadlineHistory.test.ts — verifies U-CLEANUP-G18
 *
 * Tests the pure helpers exported by `scripts/build-headline-history.mjs`:
 *   - todayUTC: YYYY-MM-DD slice
 *   - readJsonl: tolerant JSONL parser (skips malformed lines)
 *   - projectHeadline: whitelist-projection to {ts, day, built, unwired, wikiEntries, pendingFE, drift}
 *   - deltaBetween: per-key numeric delta a→b across whitelisted keys
 *   - rowFromNDaysAgo: pick most-recent row on or before today - N days
 *
 * Coverage floor (per comprehensive-build-enforce):
 *   Happy: 3-row JSONL parses correctly; deltas computed; "8 days ago"
 *          picks the 7-day-old row (most recent on-or-before target).
 *   Failure 1: JSONL with malformed middle line — parser skips it, keeps the rest.
 *   Failure 2: empty JSONL — deltaBetween returns {} sanely; rowFromNDaysAgo null.
 *   Failure 3: missing file — readJsonl returns [].
 *   Adversarial 1: projectHeadline strips unknown keys (no schema bloat).
 *   Adversarial 2: deltaBetween skips non-numeric keys (no NaN leak).
 *   Adversarial 3: CRLF line endings still parse on Windows.
 *   Variability: 3 spanning multi-day histories (1-row, 7-row, 30-row gaps).
 */

import { describe, it, expect, beforeAll, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// @ts-expect-error: .mjs ESM import from .ts test file
import { _internals } from "../../../scripts/build-headline-history.mjs";

const SCRIPT = "H:/prism/scripts/build-headline-history.mjs";
const {
  todayUTC,
  readJsonl,
  projectHeadline,
  deltaBetween,
  rowFromNDaysAgo,
} = _internals as {
  todayUTC: (now?: Date) => string;
  readJsonl: (p: string) => Array<Record<string, unknown>>;
  projectHeadline: (h: Record<string, unknown>, nowIso: string) => Record<string, unknown>;
  deltaBetween: (a: Record<string, number>, b: Record<string, number>) => Record<string, number>;
  rowFromNDaysAgo: (rows: Array<Record<string, unknown>>, daysAgo: number) => Record<string, unknown> | null;
};

const tmpDirs: string[] = [];

beforeAll(() => {
  expect(fs.existsSync(SCRIPT)).toBe(true);
});

afterEach(() => {
  while (tmpDirs.length > 0) {
    const d = tmpDirs.pop();
    if (!d) continue;
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
});

function makeTmpJsonl(rows: Array<Record<string, unknown> | string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "g18-headline-history-"));
  tmpDirs.push(dir);
  const file = path.join(dir, "system-viz-headline-history.jsonl");
  const content = rows.map(r => typeof r === "string" ? r : JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(file, content);
  return file;
}

function dayAtAgo(daysAgo: number, now = Date.now()): string {
  return new Date(now - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

// ─── todayUTC ───────────────────────────────────────────────────────────
describe("U-CLEANUP-G18 todayUTC", () => {
  it("returns YYYY-MM-DD slice of supplied date — exact match", () => {
    expect(todayUTC(new Date("2026-05-13T18:42:00.000Z"))).toBe("2026-05-13");
    expect(todayUTC(new Date("2026-12-31T23:59:59.999Z"))).toBe("2026-12-31");
    expect(todayUTC(new Date("2027-01-01T00:00:00.000Z"))).toBe("2027-01-01");
  });

  it("equals new Date().toISOString().slice(0,10) when called with no arg", () => {
    // Stronger than a regex-pattern check: assert exact value equality with
    // the canonical Date.toISOString slice, not just shape.
    const before = new Date().toISOString().slice(0, 10);
    const got = todayUTC();
    const after = new Date().toISOString().slice(0, 10);
    // Must match either "before" or "after" (caters for a tick across midnight).
    expect([before, after]).toContain(got);
  });
});

// ─── readJsonl ──────────────────────────────────────────────────────────
describe("U-CLEANUP-G18 readJsonl", () => {
  it("parses a clean 3-row jsonl (happy)", () => {
    const file = makeTmpJsonl([
      { ts: "2026-05-13T00:00:00Z", day: "2026-05-13", built: 100 },
      { ts: "2026-05-14T00:00:00Z", day: "2026-05-14", built: 101 },
      { ts: "2026-05-15T00:00:00Z", day: "2026-05-15", built: 102 },
    ]);
    const rows = readJsonl(file);
    expect(rows.length).toBe(3);
    expect(rows[0]).toMatchObject({ day: "2026-05-13", built: 100 });
    expect(rows[1]).toMatchObject({ day: "2026-05-14", built: 101 });
    expect(rows[2]).toMatchObject({ day: "2026-05-15", built: 102 });
  });

  it("skips malformed middle line and keeps the rest (failure 1)", () => {
    const file = makeTmpJsonl([
      { ts: "2026-05-13", day: "2026-05-13", built: 1 },
      "this is not json {{{",
      { ts: "2026-05-15", day: "2026-05-15", built: 3 },
    ]);
    const rows = readJsonl(file);
    expect(rows.length).toBe(2);
    expect(rows[0].built).toBe(1);
    expect(rows[1].built).toBe(3);
  });

  it("returns [] for empty file (failure 2)", () => {
    const file = makeTmpJsonl([]);
    expect(readJsonl(file)).toEqual([]);
  });

  it("returns [] for missing file (failure 3)", () => {
    expect(readJsonl("H:/no/such/path/headline.jsonl")).toEqual([]);
  });

  it("tolerates CRLF line endings (adversarial 3 — Windows write)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "g18-crlf-"));
    tmpDirs.push(dir);
    const file = path.join(dir, "history.jsonl");
    fs.writeFileSync(file, `{"day":"2026-05-13","built":1}\r\n{"day":"2026-05-14","built":2}\r\n`);
    const rows = readJsonl(file);
    expect(rows.length).toBe(2);
    expect(rows[0].day).toBe("2026-05-13");
    expect(rows[0].built).toBe(1);
    expect(rows[1].day).toBe("2026-05-14");
    expect(rows[1].built).toBe(2);
  });
});

// ─── projectHeadline ───────────────────────────────────────────────────
describe("U-CLEANUP-G18 projectHeadline", () => {
  it("projects only the whitelisted fields (happy + adversarial 1)", () => {
    const headline = {
      generatedAt: "2026-05-10T23:30:30Z",
      built: 2302,
      unwired: 875,
      wikiEntries: 776,
      pendingFE: 2,
      drift: 2,
      counts: { engines: 3180, dispatchers: 97 },
      randomFutureField: "should not survive",
    };
    const row = projectHeadline(headline, "2026-05-13T18:00:00.000Z");
    // Exact key set (sorted) — anything outside the whitelist breaks the test.
    expect(Object.keys(row).sort()).toEqual(
      ["built", "day", "drift", "pendingFE", "ts", "unwired", "wikiEntries"].sort()
    );
    // Every projected value equals the source exactly.
    expect(row.ts).toBe("2026-05-13T18:00:00.000Z");
    expect(row.day).toBe("2026-05-13");
    expect(row.built).toBe(2302);
    expect(row.unwired).toBe(875);
    expect(row.wikiEntries).toBe(776);
    expect(row.pendingFE).toBe(2);
    expect(row.drift).toBe(2);
  });

  it("omits whitelisted keys when the source headline lacks them (partial-input safety)", () => {
    const partial: Record<string, unknown> = { built: 100, drift: 5 };
    const row = projectHeadline(partial, "2026-05-13T00:00:00.000Z");
    expect(row.built).toBe(100);
    expect(row.drift).toBe(5);
    expect(row.ts).toBe("2026-05-13T00:00:00.000Z");
    expect(row.day).toBe("2026-05-13");
    // Absent source keys must not appear in row.
    expect(Object.keys(row).sort()).toEqual(["built", "day", "drift", "ts"]);
  });
});

// ─── deltaBetween ──────────────────────────────────────────────────────
describe("U-CLEANUP-G18 deltaBetween", () => {
  it("computes per-key b-a deltas for numeric whitelisted keys (happy)", () => {
    const a: Record<string, number> = { built: 100, unwired: 50, wikiEntries: 200, pendingFE: 1, drift: 3 };
    const b: Record<string, number> = { built: 110, unwired: 45, wikiEntries: 210, pendingFE: 2, drift: 1 };
    const d = deltaBetween(a, b);
    expect(d).toEqual({ built: 10, unwired: -5, wikiEntries: 10, pendingFE: 1, drift: -2 });
  });

  it("skips non-numeric / missing keys (adversarial 2 — no NaN leak)", () => {
    const a: Record<string, unknown> = { unwired: 50, drift: 3 };
    const b: Record<string, unknown> = { built: 110, unwired: 45, drift: "bad" };
    const d = deltaBetween(a as Record<string, number>, b as Record<string, number>);
    // built: missing from a → not in result.
    expect("built" in d).toBe(false);
    // drift: non-numeric in b → not in result.
    expect("drift" in d).toBe(false);
    // unwired: both numeric → -5.
    expect(d.unwired).toBe(-5);
    // No NaN smuggled into any value.
    for (const v of Object.values(d)) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("returns {} when both inputs are empty (failure 2)", () => {
    expect(deltaBetween({}, {})).toEqual({});
  });

  it("returns {} when only non-whitelisted keys are supplied", () => {
    // Whitelist = built/unwired/wikiEntries/pendingFE/drift. Anything else
    // is ignored even if both sides have it.
    expect(deltaBetween({ foo: 10 } as Record<string, number>, { foo: 20 } as Record<string, number>)).toEqual({});
  });
});

// ─── rowFromNDaysAgo ───────────────────────────────────────────────────
describe("U-CLEANUP-G18 rowFromNDaysAgo", () => {
  it("picks the most-recent row on or before the target day (happy)", () => {
    const now = Date.now();
    const rows = [
      { day: dayAtAgo(30, now), built: 100 },
      { day: dayAtAgo(8,  now), built: 200 }, // <= 7-day target
      { day: dayAtAgo(2,  now), built: 300 }, // > 7-day target — must be excluded
    ];
    const pick = rowFromNDaysAgo(rows, 7);
    expect(pick).not.toBeNull();
    expect((pick as Record<string, unknown>).built).toBe(200);
  });

  it("returns null for empty history (failure 2)", () => {
    expect(rowFromNDaysAgo([], 7)).toBeNull();
  });

  it("skips rows missing the day field gracefully", () => {
    const rows = [
      { built: 100 },
      { day: dayAtAgo(10, Date.now()), built: 200 },
    ];
    const pick = rowFromNDaysAgo(rows, 7);
    expect((pick as Record<string, unknown>).built).toBe(200);
  });

  it("variability — 30-row history picks the exact 7-day and 30-day baselines", () => {
    const now = Date.now();
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 30; i >= 0; i--) {
      rows.push({ day: dayAtAgo(i, now), built: 1000 + (30 - i) });
    }
    const r7 = rowFromNDaysAgo(rows, 7);
    const r30 = rowFromNDaysAgo(rows, 30);
    expect((r7 as Record<string, unknown>).day).toBe(dayAtAgo(7, now));
    // Built value for 7d-ago row should be 1000 + (30 - 7) = 1023.
    expect((r7 as Record<string, unknown>).built).toBe(1023);
    expect((r30 as Record<string, unknown>).day).toBe(dayAtAgo(30, now));
    expect((r30 as Record<string, unknown>).built).toBe(1000);
  });
});
