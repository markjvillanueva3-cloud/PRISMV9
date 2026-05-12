/**
 * settings-dedup-audit.test.mjs — tests for HOOK-SYNERGY-MS0 / U-HOOK-AUDIT (H1)
 *
 * Run with the .claude/hooks/__tests__/vitest.config.mjs pattern — they share the same
 * "*.test.mjs in root dir" convention. A sibling config lives in scripts/__tests__/
 * to keep test discovery scoped to this directory.
 *
 * Covers the audit's six dimensions:
 *   1. duplicate_commands within a single (event, matcher)
 *   2. matcher_overlap across matchers (Bash + ^Bash$ → double-fire)
 *   3. dead_refs (script file missing)
 *   4. cross_file_dup (same script in two settings files)
 *   5. bloated_chain (event with > BLOATED_THRESHOLD hooks)
 *   6. coverage_gap (known event with zero hooks)
 *
 * Plus: matcher normalization unit tests, the markdown renderer, and the
 * malformed-input/no-file failure paths.
 */

import { describe, it, expect } from "vitest";
import {
  audit,
  renderMarkdown,
  normalizeMatcher,
  parseCmd,
  analyzeFile,
  BLOATED_THRESHOLD,
} from "../settings-dedup-audit.mjs";

// ── Fixture filesystem ──────────────────────────────────────────────────────

function makeFs({ files = {}, missing = new Set() }) {
  return {
    existsSync: (p) => {
      const k = String(p).replace(/\\/g, "/");
      if (missing.has(k)) return false;
      return k in files;
    },
    readFileSync: (p) => {
      const k = String(p).replace(/\\/g, "/");
      if (!(k in files)) throw new Error(`ENOENT: ${k}`);
      return files[k];
    },
    writeFileSync: () => {},
    renameSync: () => {},
    mkdirSync: () => {},
  };
}

// ── normalizeMatcher unit tests ─────────────────────────────────────────────

describe("normalizeMatcher", () => {
  it("empty matcher / '*' / '.*' → ['*']", () => {
    expect(normalizeMatcher("")).toEqual(["*"]);
    expect(normalizeMatcher("*")).toEqual(["*"]);
    expect(normalizeMatcher(".*")).toEqual(["*"]);
    expect(normalizeMatcher(null)).toEqual(["*"]);
  });

  it("single tool name passes through", () => {
    expect(normalizeMatcher("Bash")).toEqual(["Bash"]);
    expect(normalizeMatcher("Edit")).toEqual(["Edit"]);
  });

  it("anchored single-tool matcher normalizes to the bare tool", () => {
    expect(normalizeMatcher("^Bash$")).toEqual(["Bash"]);
    expect(normalizeMatcher("^Edit$")).toEqual(["Edit"]);
  });

  it("alternation matcher returns sorted tool array", () => {
    expect(normalizeMatcher("Bash|Read|Edit")).toEqual(["Bash", "Edit", "Read"]);
    expect(normalizeMatcher("^(Edit|Write|MultiEdit)$")).toEqual(["Edit", "MultiEdit", "Write"]);
  });

  it("prefix matchers (^mcp__prism.* and ^mcp__prism) both reduce to the prefix token", () => {
    expect(normalizeMatcher("^mcp__prism.*")).toEqual(["mcp__prism"]);
    expect(normalizeMatcher("^mcp__prism")).toEqual(["mcp__prism"]);
  });
});

// ── parseCmd unit tests ─────────────────────────────────────────────────────

describe("parseCmd", () => {
  it("extracts a Windows-style script path", () => {
    expect(parseCmd('"H:/.claude/bin/node" H:/prism/.claude/hooks/foo.mjs')).toBe("H:/prism/.claude/hooks/foo.mjs");
  });

  it("extracts a quoted script path with args", () => {
    expect(parseCmd('"H:/.claude/bin/node" "H:/prism/.claude/hooks/bar.mjs" --pre')).toBe("H:/prism/.claude/hooks/bar.mjs");
  });

  it("returns null for a pure shell command (no script token)", () => {
    expect(parseCmd("echo hi")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(parseCmd(123)).toBeNull();
    expect(parseCmd(null)).toBeNull();
  });
});

// ── Per-file analysis (analyzeFile) ─────────────────────────────────────────

describe("analyzeFile: duplicate_commands", () => {
  it("flags two identical (event, matcher, command) entries as a duplicate", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          {
            matcher: "^Bash$",
            hooks: [
              { type: "command", command: "node /a.mjs" },
              { type: "command", command: "node /a.mjs" }, // duplicate
            ],
          },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.duplicates).toHaveLength(1);
    expect(r.duplicates[0].event).toBe("PreToolUse");
    expect(r.duplicates[0].matcher).toBe("^Bash$");
    expect(r.duplicates[0].count).toBe(2);
  });

  it("does NOT flag identical scripts wired under different matchers as duplicate_commands", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "node /a.mjs" }] },
          { matcher: "^Bash$", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.duplicates).toHaveLength(0);
    // — but matcher_overlap MUST catch it
    expect(r.matcherOverlap).toHaveLength(1);
  });
});

describe("analyzeFile: matcher_overlap", () => {
  it("flags Bash + ^Bash$ for the same script as an overlap on tool: Bash", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "node /a.mjs" }] },
          { matcher: "^Bash$", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.matcherOverlap).toHaveLength(1);
    const ov = r.matcherOverlap[0];
    expect(ov.event).toBe("PreToolUse");
    expect(ov.script).toBe("/a.mjs");
    expect(ov.matchers).toEqual(expect.arrayContaining(["Bash", "^Bash$"]));
    expect(ov.overlapPairs[0].on).toBe("Bash");
  });

  it("flags ^mcp__prism.* + ^mcp__prism as overlap (the exact bug we created)", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "^mcp__prism.*", hooks: [{ type: "command", command: "node /a.mjs" }] },
          { matcher: "^mcp__prism", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.matcherOverlap).toHaveLength(1);
    expect(r.matcherOverlap[0].overlapPairs[0].on).toBe("mcp__prism");
  });

  it("does NOT flag two semantically-different matchers for the same script", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "^Bash$", hooks: [{ type: "command", command: "node /a.mjs" }] },
          { matcher: "^Read$", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.matcherOverlap).toHaveLength(0);
  });
});

describe("analyzeFile: dead_refs", () => {
  it("flags a script referenced in settings but missing on disk", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "node /missing.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings },
      missing: new Set(["/missing.mjs"]),
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.deadRefs).toHaveLength(1);
    expect(r.deadRefs[0].script).toBe("/missing.mjs");
  });

  it("does not flag a dead-ref when the script actually exists", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({
      files: { "/p/settings.json": settings, "/a.mjs": "ok" },
    });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.deadRefs).toHaveLength(0);
  });
});

describe("analyzeFile: bloated_chain", () => {
  it("flags an event with more than BLOATED_THRESHOLD entries", () => {
    const tooMany = Array.from({ length: BLOATED_THRESHOLD + 5 }, (_, i) => ({
      matcher: `^M${i}$`,
      hooks: [{ type: "command", command: `node /h${i}.mjs` }],
    }));
    const settings = JSON.stringify({ hooks: { PreToolUse: tooMany } });
    const files = { "/p/settings.json": settings };
    for (let i = 0; i < tooMany.length; i++) files[`/h${i}.mjs`] = "ok";
    const fsImpl = makeFs({ files });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.bloatedChains).toHaveLength(1);
    expect(r.bloatedChains[0].event).toBe("PreToolUse");
    expect(r.bloatedChains[0].entryCount).toBe(BLOATED_THRESHOLD + 5);
  });

  it("event at exactly BLOATED_THRESHOLD is NOT flagged (strict >)", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: Array.from({ length: BLOATED_THRESHOLD }, (_, i) => ({
          matcher: `^M${i}$`,
          hooks: [{ type: "command", command: `node /h${i}.mjs` }],
        })),
      },
    });
    const files = { "/p/settings.json": settings };
    for (let i = 0; i < BLOATED_THRESHOLD; i++) files[`/h${i}.mjs`] = "ok";
    const fsImpl = makeFs({ files });
    const r = analyzeFile("/p/settings.json", fsImpl);
    expect(r.bloatedChains).toHaveLength(0);
  });
});

// ── Top-level audit (cross-file + coverage) ─────────────────────────────────

describe("audit: cross_file_dup + coverage gaps", () => {
  it("flags the same (event, script) wired in TWO settings files", () => {
    const a = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node /shared.mjs" }] }] },
    });
    const b = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node /shared.mjs" }] }] },
    });
    const fsImpl = makeFs({
      files: { "/A/settings.json": a, "/B/settings.json": b, "/shared.mjs": "ok" },
    });
    const r = audit(["/A/settings.json", "/B/settings.json"], fsImpl);
    expect(r.crossFileDup).toHaveLength(1);
    expect(r.crossFileDup[0].event).toBe("PreToolUse");
    expect(r.crossFileDup[0].script).toBe("/shared.mjs");
    expect(r.crossFileDup[0].files).toEqual(["/A/settings.json", "/B/settings.json"]);
  });

  it("does NOT flag a script that's only in one file", () => {
    const a = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node /onlyA.mjs" }] }] },
    });
    const fsImpl = makeFs({
      files: { "/A/settings.json": a, "/onlyA.mjs": "ok" },
    });
    const r = audit(["/A/settings.json", "/B/settings.json"], fsImpl);
    expect(r.crossFileDup).toHaveLength(0);
  });

  it("coverage_gaps lists known events with zero wired hooks across all files", () => {
    const a = JSON.stringify({
      hooks: { PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node /a.mjs" }] }] },
    });
    const fsImpl = makeFs({ files: { "/A/settings.json": a, "/a.mjs": "ok" } });
    const r = audit(["/A/settings.json"], fsImpl);
    // Only PreToolUse has a hook; every other known event is a gap.
    const gapEvents = r.coverageGaps.map((g) => g.event);
    expect(gapEvents).toContain("Stop");
    expect(gapEvents).toContain("SessionStart");
    expect(gapEvents.includes("PreToolUse")).toBe(false);
  });

  it("de-duplicates the candidates list (same path passed twice → counted once)", () => {
    const settings = JSON.stringify({ hooks: {} });
    const fsImpl = makeFs({ files: { "/A/settings.json": settings } });
    const r = audit(["/A/settings.json", "/A/settings.json"], fsImpl);
    expect(r.totals.filesScanned).toBe(1);
  });
});

// ── Adversarial / failure-path ──────────────────────────────────────────────

describe("audit: adversarial inputs", () => {
  it("missing settings file is skipped (no crash)", () => {
    const fsImpl = makeFs({ files: {} });
    const r = audit(["/does/not/exist.json"], fsImpl);
    expect(r.totals.filesScanned).toBe(0);
  });

  it("malformed JSON settings file is skipped (no crash)", () => {
    const fsImpl = makeFs({ files: { "/bad.json": "not-json{{" } });
    const r = audit(["/bad.json"], fsImpl);
    expect(r.totals.filesScanned).toBe(0);
  });

  it("no hooks block in JSON returns empty findings", () => {
    const fsImpl = makeFs({ files: { "/empty.json": JSON.stringify({ permissions: {} }) } });
    const r = audit(["/empty.json"], fsImpl);
    expect(r.totals.filesScanned).toBe(1);
    expect(r.totals.totalEntries).toBe(0);
  });

  it("hook entry without parseable script command is silently skipped", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "echo just-a-shell-command" }] },
        ],
      },
    });
    const fsImpl = makeFs({ files: { "/p/settings.json": settings } });
    const r = audit(["/p/settings.json"], fsImpl);
    expect(r.totals.totalEntries).toBe(0);
    expect(r.perFile[0].duplicates).toEqual([]);
  });
});

// ── Markdown rendering ──────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("produces a header + summary table + 'Clean' badge when there are no findings", () => {
    const fsImpl = makeFs({ files: { "/empty.json": JSON.stringify({ hooks: {} }) } });
    const r = audit(["/empty.json"], fsImpl);
    const md = renderMarkdown(r);
    expect(md).toMatch(/^# Settings Dedup Report/);
    expect(md).toMatch(/## Summary/);
    expect(md).toMatch(/## ✅ Clean/);
  });

  it("renders matcher_overlap entries with the overlap-on tool name", () => {
    const settings = JSON.stringify({
      hooks: {
        PreToolUse: [
          { matcher: "Bash", hooks: [{ type: "command", command: "node /a.mjs" }] },
          { matcher: "^Bash$", hooks: [{ type: "command", command: "node /a.mjs" }] },
        ],
      },
    });
    const fsImpl = makeFs({ files: { "/p/settings.json": settings, "/a.mjs": "ok" } });
    const r = audit(["/p/settings.json"], fsImpl);
    const md = renderMarkdown(r);
    expect(md).toMatch(/Matcher overlap/);
    expect(md).toMatch(/on tools: Bash/);
  });
});
