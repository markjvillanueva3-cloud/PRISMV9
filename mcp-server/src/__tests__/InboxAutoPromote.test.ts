/**
 * InboxAutoPromote.test.ts
 *
 * OBSIDIAN-AUTOMATE-MS3/U-INBOX-AUTO-PROMOTE
 *
 * Validates the inbox-auto-promote cron entry: high-score sharpen-passed notes
 * with confident classification and ≥24h dwell get moved to the proper
 * subfolder; everything else stays in inbox/.
 *
 * 14 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, readdirSync, rmSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInboxAutoPromote, parseSharpenBlock } from "../../scripts/inbox-auto-promote.mjs";

let tmpRoot: string;
let inbox: string;
let memories: string;
let stateFile: string;

const NOW = Date.UTC(2026, 4, 8, 4, 30, 0);
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function buildSharpenBlock(score: number, verdict: "PASS" | "REVISE", classification: string): string {
  return [
    "<!-- capture-sharpen:begin v1 -->",
    "<!--",
    `score: ${score.toFixed(2)} (${verdict})`,
    `classification: ${classification}`,
    `target_subfolder: ${classification}`,
    `components: lengthFit=0.90 structure=0.90 specificity=0.90 independence=0.85`,
    `proposed_tags: #ai-content-strategy #observation #bookmarks-per-impression`,
    "flags:",
    "- (no flags raised)",
    "-->",
    "<!-- capture-sharpen:end -->",
  ].join("\n");
}

function writeNote(name: string, prose: string, sharpen: string | null, ageMs: number): string {
  const full = join(inbox, name);
  const body = sharpen ? `${prose}\n\n${sharpen}\n` : `${prose}\n`;
  writeFileSync(full, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(() => {
  tmpRoot = mkdtempSync(join(tmpdir(), "promote-"));
  memories = join(tmpRoot, "knowledge", "memories");
  inbox = join(memories, "inbox");
  mkdirSync(inbox, { recursive: true });
  stateFile = join(tmpRoot, "state.json");
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("inbox-auto-promote (cron entry)", () => {
  // -------------------- HAPPY PATHS --------------------

  it("promotes a >=24h, score 0.90 PASS observation to observations/", () => {
    writeNote("note-a.md", "BPI is intent-to-return, not reach.", buildSharpenBlock(0.90, "PASS", "observations"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(1);
    expect(existsSync(join(inbox, "note-a.md"))).toBe(false);
    expect(existsSync(join(memories, "observations", "note-a.md"))).toBe(true);
  });

  it("dry-run lists candidates without moving them", () => {
    writeNote("note-b.md", "claim", buildSharpenBlock(0.90, "PASS", "patterns"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: false }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(1);
    expect(r.promotedPaths[0].dryRun).toBe(true);
    expect(existsSync(join(inbox, "note-b.md"))).toBe(true);
    expect(existsSync(join(memories, "patterns", "note-b.md"))).toBe(false);
  });

  it("promotes to all five subfolders correctly", () => {
    const cases: Array<["observations" | "reactions" | "patterns" | "questions" | "numbers"]> = [
      ["observations"], ["reactions"], ["patterns"], ["questions"], ["numbers"],
    ];
    for (const [cls] of cases) {
      writeNote(`${cls}-note.md`, `${cls} body.`, buildSharpenBlock(0.90, "PASS", cls), 36 * HOUR_MS);
    }
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(5);
    for (const [cls] of cases) {
      expect(existsSync(join(memories, cls, `${cls}-note.md`))).toBe(true);
    }
  });

  it("preserves the original file body unchanged after move", () => {
    const prose = "Specific number, no anaphora, declarative.";
    const sharp = buildSharpenBlock(0.95, "PASS", "numbers");
    writeNote("preserved.md", prose, sharp, 36 * HOUR_MS);
    const before = readFileSync(join(inbox, "preserved.md"), "utf8");
    runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    const after = readFileSync(join(memories, "numbers", "preserved.md"), "utf8");
    expect(after).toBe(before);
  });

  // -------------------- DWELL DELAY --------------------

  it("does NOT promote a note with <24h dwell", () => {
    writeNote("fresh.md", "fresh insight", buildSharpenBlock(0.90, "PASS", "observations"), 6 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.skippedPaths[0].reason).toBe("dwell-too-short");
    expect(existsSync(join(inbox, "fresh.md"))).toBe(true);
  });

  it("dwell threshold is exactly 24h — 23h kept, 25h promoted", () => {
    writeNote("just-fresh.md", "fresh", buildSharpenBlock(0.90, "PASS", "observations"), 23 * HOUR_MS);
    writeNote("just-ripe.md", "ripe", buildSharpenBlock(0.90, "PASS", "observations"), 25 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(1);
    expect(existsSync(join(inbox, "just-fresh.md"))).toBe(true);
    expect(existsSync(join(memories, "observations", "just-ripe.md"))).toBe(true);
  });

  // -------------------- SCORE / VERDICT FILTERING --------------------

  it("does NOT promote notes scoring below 0.85 default threshold", () => {
    writeNote("low.md", "weak claim", buildSharpenBlock(0.70, "PASS", "observations"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(0);
    expect(r.skippedPaths[0].reason).toBe("score-below-threshold");
  });

  it("does NOT promote REVISE-verdict notes regardless of score", () => {
    writeNote("revise.md", "REVISE", buildSharpenBlock(0.95, "REVISE", "observations"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(0);
    expect(r.skippedPaths[0].reason).toBe("verdict-revise");
  });

  it("respects custom min-score", () => {
    writeNote("mid.md", "mid", buildSharpenBlock(0.78, "PASS", "observations"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true, minScore: 0.75 }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(1);
  });

  // -------------------- SKIP CONDITIONS --------------------

  it("notes without a capture-sharpen block are skipped", () => {
    writeNote("plain.md", "no block here", null, 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.skipped).toBe(1);
    expect(r.skippedPaths[0].reason).toBe("no-sharpen-block");
  });

  it("invalid classification (not one of the 5 cyrilXBT subfolders) is skipped", () => {
    writeNote("weird.md", "weird", buildSharpenBlock(0.90, "PASS", "weirdclass"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.skipped).toBe(1);
    expect(r.skippedPaths[0].reason).toBe("classification-invalid");
  });

  it("brief-/perf-report-/resources-/archive- files are exempt", () => {
    for (const name of ["brief-2026-05-08.md", "perf-report-2026-04.md", "resources-x-2026.md", "archive-y.md"]) {
      writeNote(name, "machine-generated", buildSharpenBlock(0.99, "PASS", "observations"), 48 * HOUR_MS);
    }
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.scanned).toBe(0); // exempt-filtered before scan list
  });

  // -------------------- COLLISIONS / IDEMPOTENCE --------------------

  it("collision (target file exists) → leaves source in inbox/, errored count goes up", () => {
    mkdirSync(join(memories, "observations"), { recursive: true });
    writeFileSync(join(memories, "observations", "dup.md"), "preexisting", "utf8");
    writeNote("dup.md", "new content", buildSharpenBlock(0.90, "PASS", "observations"), 36 * HOUR_MS);
    const r = runInboxAutoPromote({
      flags: { apply: true }, inbox, memories, now: NOW, stateFile,
    });
    expect(r.promoted).toBe(0);
    expect(r.errored).toBe(1);
    expect(r.erroredPaths[0].reason).toBe("collision-target-exists");
    expect(existsSync(join(inbox, "dup.md"))).toBe(true);
  });

  // -------------------- PARSER UNIT TESTS --------------------

  it("parseSharpenBlock extracts score, verdict, and classification", () => {
    const block = buildSharpenBlock(0.83, "REVISE", "questions");
    const parsed = parseSharpenBlock("body\n\n" + block);
    expect(parsed).not.toBeNull();
    expect(parsed!.score).toBeCloseTo(0.83, 5);
    expect(parsed!.verdict).toBe("REVISE");
    expect(parsed!.classification).toBe("questions");
  });
});
