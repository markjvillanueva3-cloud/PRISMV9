/**
 * AutoSpeedFeedEngine — U-CAMX22-FIX-SILENT-SKIP sync-path suite
 * =============================================================
 *
 * CAMX-MS0.3 / U-CAMX22-FIX-SILENT-SKIP (slot juliett, 2026-05-18)
 *
 * U-CAMX22-VISIBLE-SKIP made the async-optimize()-in-a-sync-pipeline skip
 * *auditable* (a warn + base G-code emitted unoptimized). This unit actually
 * FIXES it: a synchronous `optimizeSync()` backed by an extracted
 * `_optimizeImpl(input, usfe, ppfo)` core, with the orchestrated engines
 * statically imported (no async lazy-load).
 *
 * The load-bearing test is the **parity invariant**: optimizeSync() and the
 * async optimize() MUST produce byte-identical results — that is the only
 * thing that makes the sync extraction *correct* rather than merely *present*
 * (R9: a test must fail if the business logic diverges). Every case asserts a
 * concrete expected value against real engine behavior (no mocks — pure
 * G-code string transform, no network/ffmpeg/API).
 *
 * @milestone CAMX-MS0.3
 * @unit U-CAMX22-FIX-SILENT-SKIP
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  autoSpeedFeedEngine,
  type AutoSpeedFeedInput,
} from "../engines/AutoSpeedFeedEngine.js";

// A small but real milling program: tool change, plunge, two cutting moves,
// retract. Enough for the engine to resolve a tool section and inject S/F.
const GCODE_LINES = [
  "G21 G90 G94",
  "T1 M6",
  "S0 M3",
  "G0 X0 Y0",
  "G43 Z5 H1",
  "G1 Z-2.0 F100",
  "G1 X50.0 F300",
  "G1 Y50.0",
  "G1 X0.0",
  "G0 Z25.0",
  "M5",
  "M30",
];
const GCODE = GCODE_LINES.join("\n");

const baseInput: AutoSpeedFeedInput = {
  gcode: GCODE,
  material: "steel",
  iso_group: "P",
  tools: [
    {
      tool_number: 1,
      diameter_mm: 6,
      flutes: 4,
      type: "endmill",
      material: "carbide",
      flute_length_mm: 18,
    },
  ],
  annotate: true,
  preserve_rapids: true,
};

const ENGINE_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "engines",
  "AutoSpeedFeedEngine.ts",
);
const engineSrc = readFileSync(ENGINE_PATH, "utf8");

describe("U-CAMX22-FIX-SILENT-SKIP / optimizeSync() is synchronous", () => {
  it("returns a resolved result object (gcode string), NOT a Promise", () => {
    const r: any = autoSpeedFeedEngine.optimizeSync(baseInput);
    expect(r instanceof Promise).toBe(false);
    expect(typeof r.then).toBe("undefined");
    expect(typeof r.gcode).toBe("string");
  });

  it("stats.total_lines exactly equals the input G-code line count", () => {
    const r = autoSpeedFeedEngine.optimizeSync(baseInput);
    // Engine S-stage sets stats.total_lines = lines.length of input gcode.
    expect(r.stats.total_lines).toBe(GCODE_LINES.length);
  });

  it("returns a structurally complete AutoSpeedFeedResult (the full core ran, not a skip stub)", () => {
    const r = autoSpeedFeedEngine.optimizeSync(baseInput);
    // The OLD pipeline skip-path returned engine-untouched base text. A real
    // _optimizeImpl run populates the full result contract: array members and
    // every documented numeric stat key. (Whether a *synthetic* tool yields
    // cutting-line edits depends on UltimateSpeedFeedEngine resolving real
    // speed/feed data — the sync↔async parity suite proves the core executed.)
    expect(Array.isArray(r.tool_sections)).toBe(true);
    expect(Array.isArray(r.lines)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
    expect(r.gcode.split("\n").length).toBe(GCODE_LINES.length);
    for (const k of [
      "total_lines",
      "cutting_lines",
      "lines_modified",
      "tools_processed",
      "average_feed_change_pct",
    ] as const) {
      expect(typeof r.stats[k]).toBe("number");
    }
  });
});

describe("U-CAMX22-FIX-SILENT-SKIP / sync↔async parity invariant", () => {
  it("optimizeSync() G-code is byte-identical to await optimize()", async () => {
    const sync = autoSpeedFeedEngine.optimizeSync(baseInput);
    const asyncR = await autoSpeedFeedEngine.optimize(baseInput);
    expect(sync.gcode).toBe(asyncR.gcode);
  });

  it("optimizeSync() stats deep-equal await optimize() stats", async () => {
    const sync = autoSpeedFeedEngine.optimizeSync(baseInput);
    const asyncR = await autoSpeedFeedEngine.optimize(baseInput);
    expect(sync.stats).toEqual(asyncR.stats);
  });

  it("parity holds under productivity weighting + high aggressiveness", async () => {
    const input: AutoSpeedFeedInput = {
      ...baseInput,
      optimize_for: "productivity",
      aggressiveness: 0.9,
    };
    const sync = autoSpeedFeedEngine.optimizeSync(input);
    const asyncR = await autoSpeedFeedEngine.optimize(input);
    expect(sync.gcode).toBe(asyncR.gcode);
    expect(sync.stats).toEqual(asyncR.stats);
  });
});

describe("U-CAMX22-FIX-SILENT-SKIP / prewarm()", () => {
  it("returns undefined (void contract)", () => {
    expect(autoSpeedFeedEngine.prewarm()).toBe(undefined);
  });

  it("is deterministic — output after double-prewarm equals output with no prewarm", () => {
    const noPrewarm = autoSpeedFeedEngine.optimizeSync(baseInput).gcode;
    autoSpeedFeedEngine.prewarm();
    autoSpeedFeedEngine.prewarm();
    const afterPrewarm = autoSpeedFeedEngine.optimizeSync(baseInput).gcode;
    expect(afterPrewarm).toBe(noPrewarm);
  });
});

describe("U-CAMX22-FIX-SILENT-SKIP / edge cases", () => {
  it("empty G-code returns an empty program with zero cutting lines", () => {
    const r = autoSpeedFeedEngine.optimizeSync({ ...baseInput, gcode: "" });
    expect(r.stats.cutting_lines).toBe(0);
    expect(r.stats.total_lines).toBe(1); // "".split("\n") === [""]
  });

  it("no tools supplied still returns the full program (degrades, never silent-skips)", () => {
    const r = autoSpeedFeedEngine.optimizeSync({ ...baseInput, tools: [] });
    expect(r.stats.total_lines).toBe(GCODE_LINES.length);
    expect(r.gcode.split("\n").length).toBeGreaterThanOrEqual(GCODE_LINES.length);
  });

  it("comments-only G-code yields exactly zero cutting lines", () => {
    const r = autoSpeedFeedEngine.optimizeSync({
      ...baseInput,
      gcode: "(setup)\n(no cutting here)\n",
    });
    expect(r.stats.cutting_lines).toBe(0);
    expect(r.stats.total_lines).toBe(3);
  });
});

describe("U-CAMX22-FIX-SILENT-SKIP / source anti-regression (fail-on-revert)", () => {
  it("AutoSpeedFeedEngine exposes optimizeSync() + the extracted _optimizeImpl core", () => {
    expect(engineSrc).toMatch(/\boptimizeSync\s*\(/);
    expect(engineSrc).toMatch(/\b_optimizeImpl\s*\(/);
  });

  it("static imports replaced the async dynamic-import lazy-load (root-cause lock)", () => {
    // The visible-skip root cause was `await import("./UltimateSpeedFeedEngine.js")`.
    // A revert that reintroduces it would re-break the sync pipeline.
    expect(engineSrc).not.toMatch(/await\s+import\(\s*["'`]\.\/UltimateSpeedFeedEngine/);
    expect(engineSrc).not.toMatch(/await\s+import\(\s*["'`]\.\/PostProcessorFeedOptimizerEngine/);
    expect(engineSrc).toMatch(
      /import\s*\{\s*ultimateSpeedFeedEngine\s*\}\s*from\s*["'`]\.\/UltimateSpeedFeedEngine\.js["'`]/,
    );
    expect(engineSrc).toMatch(
      /import\s*\{\s*postProcessorFeedOptimizer\s*\}\s*from\s*["'`]\.\/PostProcessorFeedOptimizerEngine\.js["'`]/,
    );
  });

  it("the async optimize() public API is preserved (backward compat for await callers)", () => {
    expect(engineSrc).toMatch(/async\s+optimize\s*\(/);
  });
});

describe("U-CAMX22-FIX-SILENT-SKIP / pipeline call-site safety (scrutiny P1 lock)", () => {
  // Reviewer-B P1: activating real optimizeSync() makes the emitted G-code
  // diverge from the pre-optimization `blocks` runSafetyChecks() validates.
  // The fix passes this machine's RPM/power envelope so AutoSpeedFeedEngine's
  // own clamps bound the optimized S/F BEFORE emission. This grep is the
  // fail-on-revert lock for that fix (concrete source assertion, not synthetic).
  const PIPE_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "engines",
    "PrintToProgramPipelineEngine.ts",
  );
  const pipeSrc = readFileSync(PIPE_PATH, "utf8");

  it("the pipeline call site uses optimizeSync() (not the awaited optimize() that skipped)", () => {
    expect(pipeSrc).toMatch(/asfe\.optimizeSync\s*\(\s*asfInput\s*\)/);
  });

  it("asfInput passes the machine RPM + power envelope so engine clamps bound optimized S/F", () => {
    expect(pipeSrc).toMatch(/machine_max_rpm:\s*maxRPM/);
    expect(pipeSrc).toMatch(/machine_power_kw:\s*maxPower/);
  });

  it("the surrounding fall-back-to-base-G-code try/catch (R12) is still present", () => {
    expect(pipeSrc).toMatch(/falling back to base G-code/);
  });
});
