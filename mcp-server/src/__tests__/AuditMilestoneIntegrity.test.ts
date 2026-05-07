/**
 * AuditMilestoneIntegrity — INTEL-OLLAMA-OBSIDIAN-MS0 / TIE-UP utility test
 *
 * Pure-function tests for the milestone integrity auditor. The I/O layer
 * (auditMilestone) is exercised via injected gitLog so no fs/git access
 * happens in unit tests.
 *
 * Asserts:
 *   1. extractMilestoneId pulls .id from the milestone JSON.
 *   2. flattenUnits walks phases[].units[] tagging phaseId.
 *   3. parseGitLogForUnits matches `[<MS>]/U-id:` subjects, dedups
 *      stripping `-fix`/`-test-tighten`/`-close` suffixes.
 *   4. resolveDeliverablePath rejects pseudo-paths ("(4 files)") and
 *      wildcard "*"; accepts absolute, drive-letter, and relative.
 *   5. classifyUnit emits the correct VERDICTS for each combo of
 *      (status, deliverablesExist, hasCommit).
 *   6. summarizeAudit aggregates counts and emits OK / DRIFT verdict.
 *   7. formatMarkdownReport produces stable, sorted markdown.
 */

import { describe, it, expect } from "vitest";
import { pathToFileURL } from "node:url";
import { fileURLToPath } from "node:url";
import { dirname, resolve as resolvePath } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolvePath(__dirname, "../../scripts/audit-milestone-integrity.mjs");

let mod: any;

// Load the .mjs script as a module via dynamic import (vitest can resolve
// .mjs alongside .ts via Node's normal ESM resolver).
beforeAll(async () => {
  mod = await import(pathToFileURL(SCRIPT).href);
});

import { beforeAll } from "vitest";

describe("P-TIE/audit-milestone extractMilestoneId", () => {
  it("returns the .id field for a well-formed milestone object", () => {
    expect(mod.extractMilestoneId({ id: "FOO-MS0", phases: [] })).toBe("FOO-MS0");
  });
  it("returns empty string on missing / non-string id", () => {
    expect(mod.extractMilestoneId({ phases: [] })).toBe("");
    expect(mod.extractMilestoneId({ id: 42 })).toBe("");
    expect(mod.extractMilestoneId(null)).toBe("");
    expect(mod.extractMilestoneId(undefined)).toBe("");
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
    const out = mod.flattenUnits(m);
    expect(out).toEqual([
      { id: "P1-U01", phaseId: "P1" },
      { id: "P1-U02", phaseId: "P1" },
      { id: "P2-U01", phaseId: "P2" },
    ]);
  });
  it("returns [] for missing / non-array phases", () => {
    expect(mod.flattenUnits({})).toEqual([]);
    expect(mod.flattenUnits({ phases: null })).toEqual([]);
    expect(mod.flattenUnits(null)).toEqual([]);
  });
  it("skips phases without units array and units without id", () => {
    const m = {
      phases: [
        { id: "P1" },
        { id: "P2", units: [{ id: "ok" }, { /* no id */ }, null] },
      ],
    };
    expect(mod.flattenUnits(m)).toEqual([{ id: "ok", phaseId: "P2" }]);
  });
});

describe("P-TIE/audit-milestone parseGitLogForUnits", () => {
  const log = [
    "abc1234 [INTEL-OLLAMA-OBSIDIAN-MS0]/P21-U02: refactor batch-pdf",
    "def5678 [INTEL-OLLAMA-OBSIDIAN-MS0]/P21-U02-test-tighten: assertions",
    "9876543 [INTEL-OLLAMA-OBSIDIAN-MS0]/P4-U02-close: retroactive close",
    "1111111 [DIFFERENT-MS0]/P1-U01: should not match",
    "2222222 unrelated commit subject",
  ].join("\n");

  it("matches commits for the milestone and dedups same unit (most-recent wins via first-seen)", () => {
    const map = mod.parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.get("P21-U02")).toBe("abc1234");
    expect(map.get("P4-U02")).toBe("9876543");
  });
  it("strips -fix / -test-tighten<N> / -close / -amend suffixes", () => {
    const map = mod.parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    // Despite the second commit being P21-U02-test-tighten, it dedups to P21-U02
    expect(map.has("P21-U02-test-tighten")).toBe(false);
    expect(map.size).toBe(2);
  });
  it("ignores commits from other milestones", () => {
    const map = mod.parseGitLogForUnits(log, "INTEL-OLLAMA-OBSIDIAN-MS0");
    expect(map.has("P1-U01")).toBe(false);
  });
  it("returns empty map for invalid args", () => {
    expect(mod.parseGitLogForUnits("", "X").size).toBe(0);
    expect(mod.parseGitLogForUnits(log, "").size).toBe(0);
    expect(mod.parseGitLogForUnits(null, "X").size).toBe(0);
  });
});

describe("P-TIE/audit-milestone resolveDeliverablePath", () => {
  it("returns null for non-string / empty / wildcard / pseudo-path", () => {
    expect(mod.resolveDeliverablePath("/r", { path: "" })).toBeNull();
    expect(mod.resolveDeliverablePath("/r", { path: "src/foo*.ts" })).toBeNull();
    expect(mod.resolveDeliverablePath("/r", { path: ".claude/hooks/ollama-*.mjs (4 files)" })).toBeNull();
    expect(mod.resolveDeliverablePath("/r", null)).toBeNull();
  });
  it("returns absolute paths as-is", () => {
    expect(mod.resolveDeliverablePath("/r", { path: "/abs/x.ts" })).toBe("/abs/x.ts");
  });
  it("recognizes Windows drive-letter absolute paths", () => {
    const r = mod.resolveDeliverablePath("/r", { path: "H:/foo/bar.ts" });
    // join may normalize separators; just verify it equals input on POSIX or the same drive prefix on Windows
    expect(r === "H:/foo/bar.ts" || r === "H:\\foo\\bar.ts").toBe(true);
  });
  it("joins relative paths with repoRoot", () => {
    const r = mod.resolveDeliverablePath("/r", { path: "src/x.ts" });
    expect(r === "/r/src/x.ts" || r === "\\r\\src\\x.ts").toBe(true);
  });
});

describe("P-TIE/audit-milestone classifyUnit", () => {
  const gitMap = new Map([["P1-U01", "abc1234"]]);
  it("OK when completed + deliverables exist", () => {
    expect(mod.classifyUnit({ id: "P1-U01", status: "completed" }, true, gitMap)).toBe("ok");
  });
  it("DELIVERABLE_GAP when completed but files missing", () => {
    expect(mod.classifyUnit({ id: "P1-U01", status: "completed" }, false, gitMap)).toBe("deliverable-gap");
  });
  it("GHOST_SHIPPED when no status but commit exists", () => {
    expect(mod.classifyUnit({ id: "P1-U01" }, true, gitMap)).toBe("ghost-shipped");
  });
  it("OPEN when no status and no commit", () => {
    expect(mod.classifyUnit({ id: "P9-U99" }, true, gitMap)).toBe("open");
  });
  it("ANACHRONISM when completed in JSON but no commit", () => {
    expect(mod.classifyUnit({ id: "P9-U99", status: "completed" }, true, gitMap)).toBe("anachronism");
  });
  it("OPEN sentinel for malformed unit objects", () => {
    expect(mod.classifyUnit(null, true, gitMap)).toBe("open");
    expect(mod.classifyUnit({ id: 42 } as any, true, gitMap)).toBe("open");
  });
});

describe("P-TIE/audit-milestone summarizeAudit", () => {
  it("counts each verdict bucket exactly once and computes drift", () => {
    const rows = [
      { verdict: "ok" },
      { verdict: "ok" },
      { verdict: "deliverable-gap" },
      { verdict: "ghost-shipped" },
      { verdict: "ghost-shipped" },
      { verdict: "open" },
      { verdict: "anachronism" },
    ];
    const s = mod.summarizeAudit(rows);
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
    const s = mod.summarizeAudit([{ verdict: "ok" }, { verdict: "open" }]);
    expect(s.drift).toBe(0);
    expect(s.verdict).toBe("OK");
  });
  it("returns zero counts and OK verdict for empty / non-array input", () => {
    expect(mod.summarizeAudit([])).toEqual({
      total: 0, ok: 0, deliverableGap: 0, ghostShipped: 0, open: 0, anachronism: 0,
      drift: 0, verdict: "OK",
    });
    expect(mod.summarizeAudit(undefined as any).verdict).toBe("OK");
  });
});

describe("P-TIE/audit-milestone formatMarkdownReport", () => {
  const audit = {
    rows: [
      { phaseId: "P2", unitId: "P2-U01", verdict: "ok", commitSha: "abc1234", note: "" },
      { phaseId: "P1", unitId: "P1-U01", verdict: "ghost-shipped", commitSha: "def567890", note: "commit def567890 exists but status not set" },
    ],
    summary: mod ? null : null, // populated below
  };
  it("renders header with milestone id, verdict badge, and summary table", () => {
    audit.summary = mod.summarizeAudit(audit.rows);
    const md = mod.formatMarkdownReport(audit, "FOO-MS0", "2026-05-07T01:00:00Z");
    expect(md.includes("# Milestone Integrity Audit — FOO-MS0")).toBe(true);
    expect(md.includes("**Generated:** 2026-05-07T01:00:00Z")).toBe(true);
    expect(md.includes("**Verdict:** ⚠ DRIFT")).toBe(true);
    expect(md.includes("| Total units | 2 |")).toBe(true);
    expect(md.includes("| Ghost-shipped (commit found, JSON not closed) | 1 |")).toBe(true);
  });
  it("sorts the per-unit table by phaseId then unit id", () => {
    audit.summary = mod.summarizeAudit(audit.rows);
    const md = mod.formatMarkdownReport(audit, "FOO-MS0", "2026-05-07T01:00:00Z");
    const i1 = md.indexOf("P1-U01");
    const i2 = md.indexOf("P2-U01");
    // Both present and P1 before P2
    expect(i1).toBeGreaterThan(0);
    expect(i2).toBeGreaterThan(i1);
  });
  it("handles empty rows gracefully (header only, no per-unit section)", () => {
    const empty = { rows: [], summary: mod.summarizeAudit([]) };
    const md = mod.formatMarkdownReport(empty, "EMPTY-MS0", "2026-05-07T01:00:00Z");
    expect(md.includes("**Verdict:** ✅ OK")).toBe(true);
    expect(md.includes("Per-unit detail")).toBe(false);
  });
});
