/**
 * AuditMilestoneIntegrity — INTEL-OLLAMA-OBSIDIAN-MS0 / TIE-UP utility
 *
 * Pure-function tests for the milestone-integrity-auditor (.mjs). I/O layer
 * (auditMilestone) is exercised via injected gitLog so no live fs/git
 * access happens in unit tests.
 *
 * Pattern matches TokenEconomyBenchmark.test.ts: dynamic import via
 * pathToFileURL(SCRIPT).href with /* @vite-ignore *\/ hint so vitest's
 * loader resolves the cross-extension .mjs-from-.ts path cleanly.
 *
 * Asserts:
 *   1. extractMilestoneId pulls .id from the milestone JSON
 *   2. flattenUnits walks phases[].units[] tagging phaseId
 *   3. parseGitLogForUnits matches both bracketed + bracketless subjects
 *   4. expandUnitTokens handles single / sticky-+ / range / combined forms
 *   5. resolveDeliverablePath rejects pseudo / wildcard, accepts abs/rel
 *   6. classifyUnit emits correct VERDICTS for every (status, exists, commit) combo
 *   7. summarizeAudit aggregates counts + emits OK / DRIFT verdict
 *   8. formatMarkdownReport produces stable sorted markdown
 */

import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.resolve(HERE, "../../scripts/audit-milestone-integrity.mjs");

let extractMilestoneId: any;
let flattenUnits: any;
let parseGitLogForUnits: any;
let expandUnitTokens: any;
let resolveDeliverablePath: any;
let classifyUnit: any;
let summarizeAudit: any;
let formatMarkdownReport: any;
let VERDICTS: any;

beforeAll(async () => {
  const mod: any = await import(/* @vite-ignore */ pathToFileURL(SCRIPT).href);
  extractMilestoneId = mod.extractMilestoneId;
  flattenUnits = mod.flattenUnits;
  parseGitLogForUnits = mod.parseGitLogForUnits;
  expandUnitTokens = mod.expandUnitTokens;
  resolveDeliverablePath = mod.resolveDeliverablePath;
  classifyUnit = mod.classifyUnit;
  summarizeAudit = mod.summarizeAudit;
  formatMarkdownReport = mod.formatMarkdownReport;
  VERDICTS = mod.VERDICTS;
});

describe("P-TIE/audit-milestone extractMilestoneId", () => {
  it("returns the .id field for a well-formed milestone object", () => {
    expect(extractMilestoneId({ id: "FOO-MS0", phases: [] })).toBe("FOO-MS0");
  });
  it("returns empty string on missing / non-string id", () => {
    expect(extractMilestoneId({ phases: [] })).toBe("");
    expect(extractMilestoneId({ id: 42 })).toBe("");
    expect(extractMilestoneId(null)).toBe("");
    expect(extractMilestoneId(undefined)).toBe("");
  });
});

describe("P-TIE/audit-milestone flattenUnits", () => {
  it("walks phases[].units[] and tags phaseId on each unit", () => {
    const m = {
      id: "X",
      phases: [
        { id: "P1", units: [{ id: "P1-U01" }, { id: "P1-U02" }] },
        { id: "P2", units: [{ id: "P2-U01" }] },
      ],
    };
    expect(flattenUnits(m)).toEqual([
      { id: "P1-U01", phaseId: "P1" },
      { id: "P1-U02", phaseId: "P1" },
      { id: "P2-U01", phaseId: "P2" },
    ]);
  });
  it("returns [] for missing / non-array phases (3 failure modes)", () => {
    expect(flattenUnits({})).toEqual([]);
    expect(flattenUnits({ phases: null })).toEqual([]);
    expect(flattenUnits(null)).toEqual([]);
  });
  it("skips phases without units array and units without id", () => {
    const m = {
      phases: [
        { id: "P1" },
        { id: "P2", units: [{ id: "ok" }, {}, null] },
      ],
    };
    expect(flattenUnits(m)).toEqual([{ id: "ok", phaseId: "P2" }]);
  });
});

describe("P-TIE/audit-milestone expandUnitTokens", () => {
  it("expands a single full unit reference verbatim", () => {
    expect(expandUnitTokens("P5-U01")).toEqual(["P5-U01"]);
  });
  it("expands a sticky-phase '+' chain (P5-U01+U02+U03)", () => {
    expect(expandUnitTokens("P5-U01+U02+U03")).toEqual(["P5-U01", "P5-U02", "P5-U03"]);
  });
  it("expands a range form (P5-U01..U05)", () => {
    expect(expandUnitTokens("P5-U01..U05")).toEqual([
      "P5-U01", "P5-U02", "P5-U03", "P5-U04", "P5-U05",
    ]);
  });
  it("combines range + cross-phase multi-unit", () => {
    expect(expandUnitTokens("P5-U01..U05+P6-U03")).toEqual([
      "P5-U01", "P5-U02", "P5-U03", "P5-U04", "P5-U05", "P6-U03",
    ]);
  });
  it("returns [] for empty / non-string / nonsense", () => {
    expect(expandUnitTokens("")).toEqual([]);
    expect(expandUnitTokens(null)).toEqual([]);
    expect(expandUnitTokens("garbage")).toEqual([]);
  });
  it("caps absurd ranges (delta >= 50) to prevent runaway", () => {
    expect(expandUnitTokens("P5-U01..U99")).toEqual([]);
  });
  it("expands cross-phase multi-unit (P9-U02+P9-U03+P22-U01+P23-U01)", () => {
    expect(expandUnitTokens("P9-U02+P9-U03+P22-U01+P23-U01")).toEqual([
      "P9-U02", "P9-U03", "P22-U01", "P23-U01",
    ]);
  });
});

describe("P-TIE/audit-milestone parseGitLogForUnits", () => {
  const log = [
    "abc1234 [INTEL-OLLAMA-OBSIDIAN-MS0]/P21-U02: refactor batch-pdf",
    "def5678 [INTEL-OLLAMA-OBSIDIAN-MS0]/P21-U02-test-tighten: assertions",
    "9876543 [INTEL-OLLAMA-OBSIDIAN-MS0]/P4-U02-close: retroactive close",
    "1111111 [DIFFERENT-MS0]/P1-U01: should not match",
    "2222222 unrelated commit subject",
    "aaaaaa1 INTEL-OLLAMA-OBSIDIAN-MS0/P2-U01: bracketless old-format",
    "bbbbbb2 [INTEL-OLLAMA-OBSIDIAN-MS0]/P5-U01..U05: range form",
    "cccccc3 [INTEL-OLLAMA-OBSIDIAN-MS0]/P9-U02+P22-U01: multi-unit",
  ].join("\n");

  it("matches commits and dedups same unit (first-seen wins)", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.get("P21-U02")).toBe("abc1234");
    expect(map.get("P4-U02")).toBe("9876543");
  });
  it("strips -test-tighten / -close / -fix suffixes (no spurious entries)", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.has("P21-U02-test-tighten")).toBe(false);
  });
  it("ignores commits from other milestones", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.has("P1-U01")).toBe(false);
  });
  it("returns empty map for invalid args (3 failure modes)", () => {
    expect(parseGitLogForUnits("", "X").size).toBe(0);
    expect(parseGitLogForUnits(log, "").size).toBe(0);
    expect(parseGitLogForUnits(null, "X").size).toBe(0);
  });
  it("matches bracketless old-format subjects", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.get("P2-U01")).toBe("aaaaaa1");
  });
  it("expands range form into all 5 units (P5-U01..U05)", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.get("P5-U01")).toBe("bbbbbb2");
    expect(map.get("P5-U05")).toBe("bbbbbb2");
  });
  it("splits multi-unit cross-phase tokens (P9-U02+P22-U01)", () => {
    const map = parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.get("P9-U02")).toBe("cccccc3");
    expect(map.get("P22-U01")).toBe("cccccc3");
  });
});

describe("P-TIE/audit-milestone resolveDeliverablePath", () => {
  it("returns null for non-string / empty / wildcard / pseudo-path (4 failure modes)", () => {
    expect(resolveDeliverablePath("/r", { path: "" })).toBeNull();
    expect(resolveDeliverablePath("/r", { path: "src/foo*.ts" })).toBeNull();
    expect(resolveDeliverablePath("/r", { path: ".claude/hooks/x-*.mjs (4 files)" })).toBeNull();
    expect(resolveDeliverablePath("/r", null)).toBeNull();
  });
  it("returns absolute paths as-is", () => {
    expect(resolveDeliverablePath("/r", { path: "/abs/x.ts" })).toBe("/abs/x.ts");
  });
  it("recognizes Windows drive-letter absolute paths", () => {
    const r = resolveDeliverablePath("/r", { path: "H:/foo/bar.ts" });
    expect(r === "H:/foo/bar.ts" || r === "H:\\foo\\bar.ts").toBe(true);
  });
  it("joins relative paths with repoRoot", () => {
    const r = resolveDeliverablePath("/r", { path: "src/x.ts" });
    expect(r === "/r/src/x.ts" || r === "\\r\\src\\x.ts").toBe(true);
  });
});

describe("P-TIE/audit-milestone classifyUnit", () => {
  let gitMap: Map<string, string>;
  beforeAll(() => { gitMap = new Map([["P1-U01", "abc1234"]]); });
  it("OK when completed + deliverables exist + commit found", () => {
    expect(classifyUnit({ id: "P1-U01", status: "completed" }, true, gitMap)).toBe("ok");
  });
  it("DELIVERABLE_GAP when completed but files missing (and commit found)", () => {
    expect(classifyUnit({ id: "P1-U01", status: "completed" }, false, gitMap)).toBe("deliverable-gap");
  });
  it("GHOST_SHIPPED when no status but commit exists", () => {
    expect(classifyUnit({ id: "P1-U01" }, true, gitMap)).toBe("ghost-shipped");
  });
  it("OPEN when no status and no commit", () => {
    expect(classifyUnit({ id: "P9-U99" }, true, gitMap)).toBe("open");
  });
  it("ANACHRONISM when completed in JSON but no commit found (stronger than OK)", () => {
    expect(classifyUnit({ id: "P9-U99", status: "completed" }, true, gitMap)).toBe("anachronism");
  });
  it("OPEN sentinel for malformed unit objects (3 adversarial inputs)", () => {
    expect(classifyUnit(null, true, gitMap)).toBe("open");
    expect(classifyUnit({ id: 42 }, true, gitMap)).toBe("open");
    expect(classifyUnit({}, true, gitMap)).toBe("open");
  });
});

describe("P-TIE/audit-milestone summarizeAudit", () => {
  it("counts each verdict bucket exactly once and computes drift correctly", () => {
    const rows = [
      { verdict: "ok" }, { verdict: "ok" },
      { verdict: "deliverable-gap" },
      { verdict: "ghost-shipped" }, { verdict: "ghost-shipped" },
      { verdict: "open" },
      { verdict: "anachronism" },
    ];
    const s = summarizeAudit(rows);
    expect(s.total).toBe(7);
    expect(s.ok).toBe(2);
    expect(s.deliverableGap).toBe(1);
    expect(s.ghostShipped).toBe(2);
    expect(s.open).toBe(1);
    expect(s.anachronism).toBe(1);
    expect(s.drift).toBe(4);
    expect(s.verdict).toBe("DRIFT");
  });
  it("returns OK verdict and zero drift on all-ok input", () => {
    const s = summarizeAudit([{ verdict: "ok" }, { verdict: "open" }]);
    expect(s.drift).toBe(0);
    expect(s.verdict).toBe("OK");
  });
  it("returns zero counts and OK verdict for empty / non-array input (3 failure modes)", () => {
    expect(summarizeAudit([])).toEqual({
      total: 0, ok: 0, deliverableGap: 0, ghostShipped: 0, open: 0, anachronism: 0,
      drift: 0, verdict: "OK",
    });
    expect(summarizeAudit(null).verdict).toBe("OK");
    expect(summarizeAudit(undefined).verdict).toBe("OK");
  });
});

describe("P-TIE/audit-milestone formatMarkdownReport", () => {
  it("renders header + verdict badge + summary table for DRIFT case", () => {
    const audit = {
      rows: [
        { phaseId: "P2", unitId: "P2-U01", verdict: "ok", commitSha: "abc1234", note: "" },
        { phaseId: "P1", unitId: "P1-U01", verdict: "ghost-shipped", commitSha: "def567890", note: "commit exists but status not set" },
      ],
      summary: summarizeAudit([
        { verdict: "ok" }, { verdict: "ghost-shipped" },
      ]),
    };
    const md = formatMarkdownReport(audit, "FOO-MS0", "2026-05-07T01:00:00Z");
    expect(md.includes("# Milestone Integrity Audit — FOO-MS0")).toBe(true);
    expect(md.includes("**Generated:** 2026-05-07T01:00:00Z")).toBe(true);
    expect(md.includes("**Verdict:** ⚠ DRIFT")).toBe(true);
    expect(md.includes("| Total units | 2 |")).toBe(true);
    expect(md.includes("| Ghost-shipped (commit found, JSON not closed) | 1 |")).toBe(true);
  });
  it("sorts the per-unit table by phaseId then unit id (stable)", () => {
    const audit = {
      rows: [
        { phaseId: "P2", unitId: "P2-U01", verdict: "ok", commitSha: "abc1234", note: "" },
        { phaseId: "P1", unitId: "P1-U01", verdict: "ghost-shipped", commitSha: "def567890", note: "" },
      ],
      summary: summarizeAudit([{ verdict: "ok" }, { verdict: "ghost-shipped" }]),
    };
    const md = formatMarkdownReport(audit, "FOO-MS0", "2026-05-07T01:00:00Z");
    const i1 = md.indexOf("P1-U01");
    const i2 = md.indexOf("P2-U01");
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
  });
  it("handles empty rows gracefully — header only, no per-unit section, OK badge", () => {
    const empty = { rows: [], summary: summarizeAudit([]) };
    const md = formatMarkdownReport(empty, "EMPTY-MS0", "2026-05-07T01:00:00Z");
    expect(md.includes("**Verdict:** ✅ OK")).toBe(true);
    expect(md.includes("Per-unit detail")).toBe(false);
  });
});
