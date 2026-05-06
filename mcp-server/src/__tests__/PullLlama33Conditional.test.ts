/**
 * PullLlama33Conditional — INTEL-OLLAMA-OBSIDIAN-MS0/P20-U02.
 *
 * Pure-function tests for scripts/pull-llama33-conditional.mjs. Asserts:
 *   1. LARGE_MODEL_SPEC names llama3.3:70b at tier 5, ~40 GB.
 *   2. decideConditionalPull respects: already-installed short-circuit,
 *      missing free-space probe (null), insufficient disk (<100 GB),
 *      sufficient disk (≥100 GB).
 *   3. renderStatusLine emits a stable marker + verb + reason format.
 *   4. readMarkdownStatus locates an existing marker line for in-place
 *      updates and degrades gracefully on empty/missing input.
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../../scripts/pull-llama33-conditional.mjs");

let LARGE_MODEL_SPEC: any, decideConditionalPull: any, renderStatusLine: any, readMarkdownStatus: any;
beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  LARGE_MODEL_SPEC = mod.LARGE_MODEL_SPEC;
  decideConditionalPull = mod.decideConditionalPull;
  renderStatusLine = mod.renderStatusLine;
  readMarkdownStatus = mod.readMarkdownStatus;
});

describe("P20-U02 LARGE_MODEL_SPEC", () => {
  it("identifies llama3.3:70b as the high-complexity tier-5 model", () => {
    expect(LARGE_MODEL_SPEC.name).toBe("llama3.3:70b");
    expect(LARGE_MODEL_SPEC.tier).toBe(5);
    expect(LARGE_MODEL_SPEC.kind).toBe("chat");
  });

  it("approxSizeGB is in the 35-50 GB band (real ~40 GB)", () => {
    expect(LARGE_MODEL_SPEC.approxSizeGB).toBeGreaterThan(35);
    expect(LARGE_MODEL_SPEC.approxSizeGB).toBeLessThan(50);
  });

  it("includes a non-empty rationale string", () => {
    expect(typeof LARGE_MODEL_SPEC.rationale).toBe("string");
    expect(LARGE_MODEL_SPEC.rationale.length).toBeGreaterThan(0);
  });
});

describe("P20-U02 decideConditionalPull", () => {
  it("short-circuits to SKIP when alreadyInstalled is true", () => {
    const r = decideConditionalPull(500, { alreadyInstalled: true });
    expect(r.shouldPull).toBe(false);
    expect(r.reason).toContain("already installed");
  });

  it("refuses to pull when free-space probe returns null", () => {
    const r = decideConditionalPull(null);
    expect(r.shouldPull).toBe(false);
    expect(r.reason).toContain("probe unavailable");
  });

  it("refuses to pull when free-space probe returns undefined", () => {
    const r = decideConditionalPull(undefined as any);
    expect(r.shouldPull).toBe(false);
    expect(r.reason).toContain("probe unavailable");
  });

  it("refuses to pull when free-space probe returns NaN", () => {
    const r = decideConditionalPull(NaN);
    expect(r.shouldPull).toBe(false);
  });

  it("refuses to pull when free space is below 100 GB threshold", () => {
    const r = decideConditionalPull(50);
    expect(r.shouldPull).toBe(false);
    expect(r.reason).toContain("insufficient disk");
    expect(r.reason).toContain("50.0 GB");
    expect(r.reason).toContain("100 GB");
  });

  it("approves pull when free space is exactly 100 GB", () => {
    const r = decideConditionalPull(100);
    expect(r.shouldPull).toBe(true);
  });

  it("approves pull when free space exceeds threshold (e.g. 250 GB)", () => {
    const r = decideConditionalPull(250);
    expect(r.shouldPull).toBe(true);
    expect(r.reason).toContain("250.0 GB");
  });

  it("respects custom requiredFreeGB option", () => {
    const tight = decideConditionalPull(60, { requiredFreeGB: 80 });
    expect(tight.shouldPull).toBe(false);
    const ok = decideConditionalPull(60, { requiredFreeGB: 50 });
    expect(ok.shouldPull).toBe(true);
  });

  it("alreadyInstalled wins over otherwise-ample disk", () => {
    const r = decideConditionalPull(1000, { alreadyInstalled: true });
    expect(r.shouldPull).toBe(false);
    expect(r.reason).toBe("already installed");
  });
});

describe("P20-U02 renderStatusLine", () => {
  it("renders PULLED verb when decision.shouldPull is true", () => {
    const line = renderStatusLine({ shouldPull: true, reason: "ample disk" }, "2026-05-06T16:00:00.000Z");
    expect(line).toContain("PULLED");
    expect(line).toContain("2026-05-06T16:00:00.000Z");
    expect(line).toContain("ample disk");
  });

  it("renders SKIPPED verb when decision.shouldPull is false", () => {
    const line = renderStatusLine({ shouldPull: false, reason: "insufficient disk" }, "2026-05-06T16:00:00.000Z");
    expect(line).toContain("SKIPPED");
    expect(line).toContain("insufficient disk");
  });

  it("includes the canonical marker so future runs find this line", () => {
    const line = renderStatusLine({ shouldPull: true, reason: "ok" }, "2026-05-06T16:00:00.000Z");
    expect(line).toContain("<!-- P20-U02 STATUS -->");
  });

  it("falls back to current ISO timestamp when caller omits one", () => {
    const line = renderStatusLine({ shouldPull: false, reason: "skip" });
    expect(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(line)).toBe(true);
  });
});

describe("P20-U02 readMarkdownStatus", () => {
  it("returns hasMarker=false on empty input", () => {
    expect(readMarkdownStatus("")).toEqual({ hasMarker: false, currentLine: null });
  });

  it("returns hasMarker=false on input lacking the marker", () => {
    const md = "# MODEL-STACK\n\nCanonical models for PRISM.\n";
    expect(readMarkdownStatus(md).hasMarker).toBe(false);
  });

  it("locates marker line by index when present", () => {
    const md = `# MODEL-STACK\n\nfoo\n<!-- P20-U02 STATUS --> SKIPPED (2026-05-06T00:00:00Z) — insufficient disk\nbar\n`;
    const r = readMarkdownStatus(md);
    expect(r.hasMarker).toBe(true);
    expect(r.lineIndex).toBe(3);
    expect(r.currentLine).toContain("SKIPPED");
  });

  it("non-string input returns hasMarker=false safely", () => {
    expect(readMarkdownStatus(null as any).hasMarker).toBe(false);
    expect(readMarkdownStatus(undefined as any).hasMarker).toBe(false);
  });

  it("handles CRLF line endings", () => {
    const md = `line1\r\n<!-- P20-U02 STATUS --> PULLED\r\nline3\r\n`;
    const r = readMarkdownStatus(md);
    expect(r.hasMarker).toBe(true);
    expect(r.currentLine).toContain("PULLED");
  });
});
