/**
 * write-golf-engine-wiki.test.mjs — CLEANUP-MS0 / U-CLEANUP-D8 tests
 *
 * Covers:
 *   - happy path: 5 golf engine entries rendered + written
 *   - 3+ failure modes: bad flag, null engine metadata, missing kebab
 *   - 2+ adversarial inputs: engine with no sections, boost_keyword with colon
 *   - 3+ variability configs: engine-class vs capability (golf-heartbeat), with/without sourceRel, with/without links
 *   - boundary: idempotency (unchanged on re-run), --force rewrites, date-insensitive hash
 *   - integration: real fs write + read-back round-trip
 *   - CLI exit codes
 */

import { describe, it, expect, beforeEach } from "vitest";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseArgs,
  resolveRepoRoot,
  renderWikiEntry,
  contentHash,
  writeGolfEngineWiki,
  runCli,
  SCHEMA_VERSION,
  MILESTONE,
  GOLF_ENGINES,
} from "../write-golf-engine-wiki.mjs";

let TMP_ROOT;
beforeEach(() => {
  TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), "u-cleanup-d8-"));
});

const SAMPLE_ENGINE = {
  kebab: "sample-engine",
  engineName: "SampleEngine",
  unit: "U-TEST-S1",
  sourceRel: "mcp-server/src/engines/SampleEngine.ts",
  summary: "A sample engine for testing the wiki writer.",
  tags: ["golf", "test"],
  boostKeywords: ["sample engine", "test"],
  sections: [
    { heading: "What it does", body: "Nothing real — it's a fixture." },
    { heading: "Wiring", body: "Wired to prism_dev:sample for the test." },
  ],
  links: ["[[ledger-store]]"],
};

// ── parseArgs ────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("returns defaults for empty argv", () => {
    const o = parseArgs([]);
    expect(o.json).toBe(false);
    expect(o.dryRun).toBe(false);
    expect(o.force).toBe(false);
  });

  it("parses --json --dry-run --force --repo-root", () => {
    const o = parseArgs(["--json", "--dry-run", "--force", "--repo-root", "/x"]);
    expect(o.json).toBe(true);
    expect(o.dryRun).toBe(true);
    expect(o.force).toBe(true);
    expect(o.repoRoot).toBe("/x");
  });

  it("throws 'Unknown flag' on --bogus (failure mode)", () => {
    expect(() => parseArgs(["--bogus"])).toThrow(/Unknown flag/);
  });
});

// ── resolveRepoRoot ──────────────────────────────────────────────────────────

describe("resolveRepoRoot", () => {
  it("uses explicit --repo-root when supplied", () => {
    expect(resolveRepoRoot({ repoRoot: "/explicit/root" })).toBe(path.resolve("/explicit/root"));
  });

  it("derives from script location when --repo-root absent", () => {
    const root = resolveRepoRoot({});
    // The script lives at <repo>/scripts/write-golf-engine-wiki.mjs, so the
    // resolved root must end with "prism" (the actual repo dir).
    expect(typeof root).toBe("string");
    expect(root.length).toBeGreaterThan(0);
  });
});

// ── renderWikiEntry ──────────────────────────────────────────────────────────

describe("renderWikiEntry", () => {
  it("renders frontmatter with title/date/milestone/unit/tags (happy)", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("title: SampleEngine — A sample engine for testing the wiki writer.");
    expect(md).toContain(`milestone: ${MILESTONE}`);
    expect(md).toContain("unit: U-TEST-S1");
    expect(md).toContain("tags: [golf, test]");
  });

  it("renders all section headings + bodies in order", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(md).toContain("## What it does\n\nNothing real — it's a fixture.");
    expect(md).toContain("## Wiring\n\nWired to prism_dev:sample for the test.");
    // What it does precedes Wiring.
    expect(md.indexOf("## What it does")).toBeLessThan(md.indexOf("## Wiring"));
  });

  it("renders the engine source path when sourceRel present (variability: engine class)", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(md).toContain("**Source:** `mcp-server/src/engines/SampleEngine.ts`");
  });

  it("renders capability note when sourceRel is null (variability: capability)", () => {
    const capability = { ...SAMPLE_ENGINE, sourceRel: null };
    const md = renderWikiEntry(capability);
    expect(md).toContain("**Source:** _(capability — no engine class");
  });

  it("quotes boost_keywords that contain spaces or colons (adversarial)", () => {
    const withColon = { ...SAMPLE_ENGINE, boostKeywords: ["plain", "has space", "has:colon"] };
    const md = renderWikiEntry(withColon);
    expect(md).toContain('boost_keywords: [plain, "has space", "has:colon"]');
  });

  it("handles an engine with empty sections array (adversarial)", () => {
    const noSections = { ...SAMPLE_ENGINE, sections: [] };
    const md = renderWikiEntry(noSections);
    expect(md).toContain("## Provenance");   // footer still renders
    expect(md).toContain("title: SampleEngine");
  });

  it("renders links into the frontmatter (variability: with links)", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(md).toContain('  - "[[ledger-store]]"');
  });

  it("handles an engine with no links (variability: without links)", () => {
    const noLinks = { ...SAMPLE_ENGINE, links: [] };
    const md = renderWikiEntry(noLinks);
    expect(md).toContain("links:\n---");   // links: header present, no entries
  });

  it("throws on null engine metadata (failure mode)", () => {
    expect(() => renderWikiEntry(null)).toThrow(/engine metadata required/);
    expect(() => renderWikiEntry(undefined)).toThrow(/engine metadata required/);
  });

  it("always renders the Provenance footer", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(md).toContain("## Provenance");
    expect(md).toContain("write-golf-engine-wiki.mjs");
  });
});

// ── contentHash ──────────────────────────────────────────────────────────────

describe("contentHash", () => {
  it("is stable for identical content", () => {
    const md = renderWikiEntry(SAMPLE_ENGINE);
    expect(contentHash(md)).toBe(contentHash(md));
  });

  it("ignores the date line (date-insensitive — re-runs don't churn)", () => {
    const md1 = renderWikiEntry(SAMPLE_ENGINE).replace(/^date: .*$/m, "date: 2026-01-01");
    const md2 = renderWikiEntry(SAMPLE_ENGINE).replace(/^date: .*$/m, "date: 2026-12-31");
    expect(contentHash(md1)).toBe(contentHash(md2));
  });

  it("changes when the body content changes", () => {
    const md1 = renderWikiEntry(SAMPLE_ENGINE);
    const md2 = renderWikiEntry({ ...SAMPLE_ENGINE, summary: "Different summary entirely." });
    expect(contentHash(md1)).not.toBe(contentHash(md2));
  });

  it("returns a 16-char hex string", () => {
    const h = contentHash(renderWikiEntry(SAMPLE_ENGINE));
    expect(h).toMatch(/^[0-9a-f]{16}$/);
  });
});

// ── writeGolfEngineWiki ──────────────────────────────────────────────────────

describe("writeGolfEngineWiki", () => {
  it("writes all 5 golf engine entries on a fresh repo (happy path)", () => {
    const repoRoot = path.join(TMP_ROOT, "fresh");
    mkdirSync(repoRoot, { recursive: true });
    const stats = writeGolfEngineWiki({ repoRoot });
    expect(stats.engineCount).toBe(5);
    expect(stats.writtenCount).toBe(5);
    expect(stats.unchangedCount).toBe(0);
    // Each kebab file exists on disk.
    for (const w of stats.written) {
      expect(existsSync(w.path)).toBe(true);
      expect(w.reason).toBe("new");
    }
  });

  it("is idempotent: re-running leaves all entries unchanged", () => {
    const repoRoot = path.join(TMP_ROOT, "idempotent");
    mkdirSync(repoRoot, { recursive: true });
    const first = writeGolfEngineWiki({ repoRoot });
    expect(first.writtenCount).toBe(5);
    const second = writeGolfEngineWiki({ repoRoot });
    expect(second.writtenCount).toBe(0);
    expect(second.unchangedCount).toBe(5);
  });

  it("--force rewrites all entries even when unchanged (boundary)", () => {
    const repoRoot = path.join(TMP_ROOT, "force");
    mkdirSync(repoRoot, { recursive: true });
    writeGolfEngineWiki({ repoRoot });
    const forced = writeGolfEngineWiki({ repoRoot, force: true });
    expect(forced.writtenCount).toBe(5);
    expect(forced.unchangedCount).toBe(0);
  });

  it("detects a changed entry and rewrites just that one", () => {
    const repoRoot = path.join(TMP_ROOT, "changed");
    mkdirSync(repoRoot, { recursive: true });
    writeGolfEngineWiki({ repoRoot });
    // Corrupt one entry on disk.
    const target = path.join(repoRoot, "knowledge/wiki/architecture/ledger-store.md");
    writeFileSync(target, "corrupted content", "utf-8");
    const stats = writeGolfEngineWiki({ repoRoot });
    expect(stats.writtenCount).toBe(1);
    expect(stats.written[0].kebab).toBe("ledger-store");
    expect(stats.written[0].reason).toBe("changed");
    expect(stats.unchangedCount).toBe(4);
  });

  it("dry-run reports wouldWrite without touching disk", () => {
    const repoRoot = path.join(TMP_ROOT, "dry");
    mkdirSync(repoRoot, { recursive: true });
    const stats = writeGolfEngineWiki({ repoRoot, dryRun: true });
    expect(stats.dryRun).toBe(true);
    expect(stats.wouldWriteCount).toBe(5);
    expect(stats.writtenCount).toBe(0);
    // No files written.
    expect(existsSync(path.join(repoRoot, "knowledge/wiki/architecture/ledger-store.md"))).toBe(false);
  });

  it("integration: written entry round-trips parse with correct frontmatter", () => {
    const repoRoot = path.join(TMP_ROOT, "roundtrip");
    mkdirSync(repoRoot, { recursive: true });
    writeGolfEngineWiki({ repoRoot });
    const body = readFileSync(path.join(repoRoot, "knowledge/wiki/architecture/peer-commit-auditor.md"), "utf-8");
    expect(body.startsWith("---\n")).toBe(true);
    expect(body).toContain("title: PeerCommitAuditorEngine");
    expect(body).toContain("milestone: CLEANUP-MS0");
    expect(body).toContain("unit: U-CLEANUP-B1");
    expect(body).toContain("## Provenance");
  });

  it("uses an injected engines list when provided (variability: custom set)", () => {
    const repoRoot = path.join(TMP_ROOT, "custom");
    mkdirSync(repoRoot, { recursive: true });
    const stats = writeGolfEngineWiki({ repoRoot, engines: [SAMPLE_ENGINE] });
    expect(stats.engineCount).toBe(1);
    expect(stats.writtenCount).toBe(1);
    expect(existsSync(path.join(repoRoot, "knowledge/wiki/architecture/sample-engine.md"))).toBe(true);
  });

  it("uses an injected writeFile seam (hermetic — no real disk)", () => {
    const writes = new Map();
    const stats = writeGolfEngineWiki({
      repoRoot: "/fake",
      engines: [SAMPLE_ENGINE],
      writeFile: (file, body) => { writes.set(file, body); },
    });
    expect(stats.writtenCount).toBe(1);
    expect(writes.size).toBe(1);
    const [, body] = [...writes.entries()][0];
    expect(body).toContain("title: SampleEngine");
  });

  it("GOLF_ENGINES family has all 5 expected entries with required fields", () => {
    expect(GOLF_ENGINES.length).toBe(5);
    const kebabs = GOLF_ENGINES.map((e) => e.kebab).sort();
    expect(kebabs).toEqual([
      "golf-heartbeat", "ledger-projector", "ledger-store", "peer-commit-auditor", "wiring-potential",
    ]);
    for (const e of GOLF_ENGINES) {
      expect(typeof e.kebab).toBe("string");
      expect(typeof e.engineName).toBe("string");
      expect(typeof e.unit).toBe("string");
      expect(typeof e.summary).toBe("string");
      expect(Array.isArray(e.sections)).toBe(true);
      expect(e.sections.length).toBeGreaterThan(0);
    }
  });
});

// ── runCli ───────────────────────────────────────────────────────────────────

describe("runCli", () => {
  it("exit 2 on --help with usage text", () => {
    const out = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--help"], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(2);
    expect(out.written.includes("U-CLEANUP-D8")).toBe(true);
  });

  it("exit 2 on bad flag", () => {
    const err = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--bogus"], { stdout: { write() {} }, stderr: err });
    expect(code).toBe(2);
    expect(err.written.includes("Unknown flag")).toBe(true);
  });

  it("exit 0 + JSON on dry-run success", () => {
    const repoRoot = path.join(TMP_ROOT, "cli");
    mkdirSync(repoRoot, { recursive: true });
    const out = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--json", "--dry-run", "--repo-root", repoRoot], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(0);
    const parsed = JSON.parse(out.written);
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.wouldWriteCount).toBe(5);
  });

  it("exit 0 + writes 5 entries on a real repo via runCli", () => {
    const repoRoot = path.join(TMP_ROOT, "cli-write");
    mkdirSync(repoRoot, { recursive: true });
    const out = { written: "", write(s) { this.written += s; } };
    const code = runCli(["--repo-root", repoRoot], { stdout: out, stderr: { write() {} } });
    expect(code).toBe(0);
    expect(out.written.includes("written=5")).toBe(true);
    expect(existsSync(path.join(repoRoot, "knowledge/wiki/architecture/wiring-potential.md"))).toBe(true);
  });
});
