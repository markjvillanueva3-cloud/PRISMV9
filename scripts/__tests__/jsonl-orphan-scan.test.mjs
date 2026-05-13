/**
 * jsonl-orphan-scan.test.mjs — verification of CLEANUP-MS0/U-CLEANUP-G3.
 *
 * Coverage floor (per envelope verification_floor):
 *   - happy path
 *   - >= 3 failure modes
 *   - >= 2 adversarial inputs
 *   - >= 3 spanning variability configs
 *   - round-trip through CLI entry (not just engine singleton)
 *
 * All assertions use real reference values — no toBeDefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  parseArgs,
  countLines,
  findConsumers,
  scanJsonlOrphans,
  renderMarkdown,
  runCli,
  writeAtomic,
} from "../jsonl-orphan-scan.mjs";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "jsonl-orphan-scan-"));
  mkdirSync(join(root, "state", "shared"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, "mcp-server", "src"), { recursive: true });
  mkdirSync(join(root, ".claude", "hooks"), { recursive: true });
  return root;
}

function writeJsonl(root, name, lineCount) {
  const lines = [];
  for (let i = 0; i < lineCount; i++) {
    lines.push(JSON.stringify({ i, ts: `2026-05-13T00:${String(i % 60).padStart(2, "0")}:00Z` }));
  }
  const path = join(root, "state", "shared", name);
  writeFileSync(path, lines.length > 0 ? lines.join("\n") + "\n" : "", "utf8");
  return path;
}

function writeJsonlNoTrailingNewline(root, name, lineCount) {
  const lines = [];
  for (let i = 0; i < lineCount; i++) lines.push(`{"i":${i}}`);
  writeFileSync(join(root, "state", "shared", name), lines.join("\n"), "utf8");
}

function writeConsumer(root, relPath, content) {
  const abs = join(root, relPath);
  mkdirSync(join(abs, ".."), { recursive: true });
  writeFileSync(abs, content, "utf8");
  return abs;
}

const ROOTS_OPT = (root) => ({
  repo: root,
  searchRoots: ["mcp-server/src", "scripts", ".claude/hooks"],
  extraAbsRoots: [],
});

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults: not-json, min-lines=1, no target, no frozen", () => {
    const a = parseArgs(["node", "scan.mjs"]);
    expect(a.json).toBe(false);
    expect(a.minLines).toBe(1);
    expect(a.frozenTime).toBe(null);
    expect(a.targetDir).toBe(null);
  });

  it("--json sets json=true", () => {
    const a = parseArgs(["node", "scan.mjs", "--json"]);
    expect(a.json).toBe(true);
  });

  it("--min-lines accepts positive ints", () => {
    const a = parseArgs(["node", "scan.mjs", "--min-lines", "10"]);
    expect(a.minLines).toBe(10);
  });

  it("--min-lines ignores non-numeric (defaults stay)", () => {
    const a = parseArgs(["node", "scan.mjs", "--min-lines", "abc"]);
    expect(a.minLines).toBe(1);
  });

  it("--min-lines rejects negative (defaults stay)", () => {
    const a = parseArgs(["node", "scan.mjs", "--min-lines", "-5"]);
    expect(a.minLines).toBe(1);
  });

  it("--frozen-time captures iso string", () => {
    const a = parseArgs(["node", "scan.mjs", "--frozen-time", "2026-05-13T22:00:00Z"]);
    expect(a.frozenTime).toBe("2026-05-13T22:00:00Z");
  });

  it("--target captures custom dir", () => {
    const a = parseArgs(["node", "scan.mjs", "--target", "tmp/shared"]);
    expect(a.targetDir).toBe("tmp/shared");
  });
});

// ──────────────────────────────────────────────────────────────────────
// countLines
// ──────────────────────────────────────────────────────────────────────

describe("countLines", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("counts 0 lines for empty file", async () => {
    writeJsonl(root, "empty.jsonl", 0);
    const out = await countLines(join(root, "state", "shared", "empty.jsonl"));
    expect(out.lines).toBe(0);
    expect(out.bytes).toBe(0);
  });

  it("counts 1 line for single-row jsonl with trailing newline", async () => {
    writeJsonl(root, "one.jsonl", 1);
    const out = await countLines(join(root, "state", "shared", "one.jsonl"));
    expect(out.lines).toBe(1);
  });

  it("counts 5 lines for 5-row jsonl with trailing newline", async () => {
    writeJsonl(root, "five.jsonl", 5);
    const out = await countLines(join(root, "state", "shared", "five.jsonl"));
    expect(out.lines).toBe(5);
  });

  it("counts last partial line when no trailing newline", async () => {
    writeJsonlNoTrailingNewline(root, "nonewline.jsonl", 3);
    const out = await countLines(join(root, "state", "shared", "nonewline.jsonl"));
    expect(out.lines).toBe(3);
  });

  it("returns lines=0 for missing file (no throw)", async () => {
    const out = await countLines(join(root, "state", "shared", "does-not-exist.jsonl"));
    expect(out.lines).toBe(0);
    expect(out.error).toBe(true);
  });

  it("scales to a 1000-line file", async () => {
    writeJsonl(root, "big.jsonl", 1000);
    const out = await countLines(join(root, "state", "shared", "big.jsonl"));
    expect(out.lines).toBe(1000);
  });
});

// ──────────────────────────────────────────────────────────────────────
// findConsumers — pure function
// ──────────────────────────────────────────────────────────────────────

describe("findConsumers", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("returns empty hits when no consumer files reference the basename", () => {
    writeConsumer(root, "scripts/foo.mjs", "// nothing references the target");
    const { hits } = findConsumers(["MYSTERY.jsonl"], [join(root, "scripts/foo.mjs")]);
    expect(hits.get("MYSTERY.jsonl")).toEqual([]);
  });

  it("returns the consumer path when basename appears verbatim", () => {
    writeConsumer(root, "scripts/foo.mjs", `// reads ERROR_LEDGER.jsonl\n`);
    const consumerPath = join(root, "scripts/foo.mjs");
    const { hits } = findConsumers(["ERROR_LEDGER.jsonl"], [consumerPath]);
    expect(hits.get("ERROR_LEDGER.jsonl").length).toBe(1);
    expect(hits.get("ERROR_LEDGER.jsonl")[0]).toContain("foo.mjs");
  });

  it("matches multiple consumers for the same basename", () => {
    writeConsumer(root, "scripts/a.mjs", "// uses ERROR_LEDGER.jsonl here");
    writeConsumer(root, "mcp-server/src/b.ts", "// also reads ERROR_LEDGER.jsonl");
    writeConsumer(root, ".claude/hooks/c.mjs", "// no mention");
    const consumers = [
      join(root, "scripts/a.mjs"),
      join(root, "mcp-server/src/b.ts"),
      join(root, ".claude/hooks/c.mjs"),
    ];
    const { hits } = findConsumers(["ERROR_LEDGER.jsonl"], consumers);
    expect(hits.get("ERROR_LEDGER.jsonl").length).toBe(2);
  });

  it("handles many basenames against many files in one pass", () => {
    writeConsumer(root, "scripts/multi.mjs", "uses A.jsonl, B.jsonl, but never C.jsonl-extra");
    const { hits } = findConsumers(["A.jsonl", "B.jsonl", "Z.jsonl"], [join(root, "scripts/multi.mjs")]);
    expect(hits.get("A.jsonl").length).toBe(1);
    expect(hits.get("B.jsonl").length).toBe(1);
    expect(hits.get("Z.jsonl").length).toBe(0);
  });

  it("skips non-file paths gracefully (and records the skip)", () => {
    const { hits, meta } = findConsumers(["X.jsonl"], [join(root, "no-such-file.mjs")]);
    expect(hits.get("X.jsonl")).toEqual([]);
    expect(meta.skippedReadError).toBeGreaterThanOrEqual(1);
  });

  it("adversarial: filename appears inside larger token still counts as a hit", () => {
    // We do not require word-boundary matching — substring is the contract.
    writeConsumer(root, "scripts/sub.mjs", "// references PREFIX-A.jsonl-EXTRA");
    const { hits } = findConsumers(["A.jsonl"], [join(root, "scripts/sub.mjs")]);
    // Accepted false-positive: we'd rather under-report orphans than falsely
    // flag a live file. Document so refactors don't accidentally tighten it.
    expect(hits.get("A.jsonl").length).toBe(1);
  });

  it("empty basenames array short-circuits and never opens consumer files", () => {
    writeConsumer(root, "scripts/never-opened.mjs", "irrelevant");
    const { hits, meta } = findConsumers([], [join(root, "scripts/never-opened.mjs")]);
    expect(hits.size).toBe(0);
    expect(meta.skippedReadError).toBe(0);
    expect(meta.skippedTooLarge).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// scanJsonlOrphans — happy + failure + adversarial + spanning configs
// ──────────────────────────────────────────────────────────────────────

describe("scanJsonlOrphans", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true }); });

  it("happy path: one orphan + one consumed", async () => {
    writeJsonl(root, "ERROR_LEDGER.jsonl", 5);
    writeJsonl(root, "AGENT_CHAT.jsonl", 3);
    writeConsumer(
      root,
      "mcp-server/src/foo.ts",
      `// publisher of AGENT_CHAT.jsonl\nexport const TOPIC = "agent-chat";\n`,
    );
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.ok).toBe(true);
    expect(report.stats.totalJsonl).toBe(2);
    expect(report.stats.orphans).toBe(1);
    expect(report.stats.consumed).toBe(1);
    expect(report.orphans[0].basename).toBe("ERROR_LEDGER.jsonl");
    expect(report.consumed[0].basename).toBe("AGENT_CHAT.jsonl");
  });

  it("failure mode 1: missing target dir returns ok:false with reason", async () => {
    const report = await scanJsonlOrphans({
      repo: root,
      targetDir: "state/does-not-exist",
    });
    expect(report.ok).toBe(false);
    expect(report.reason).toMatch(/not found/);
  });

  it("failure mode 2: empty jsonl is not flagged (lines<minLines)", async () => {
    writeJsonl(root, "empty.jsonl", 0);
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.ok).toBe(true);
    expect(report.stats.totalJsonl).toBe(1);
    expect(report.stats.withLines).toBe(0);
    expect(report.stats.orphans).toBe(0);
  });

  it("failure mode 3: target dir with zero jsonls returns ok:true, zero stats", async () => {
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.ok).toBe(true);
    expect(report.stats.totalJsonl).toBe(0);
    expect(report.stats.orphans).toBe(0);
    expect(report.orphans).toEqual([]);
  });

  it("adversarial 1: jsonl basename contains dots and hyphens — still matches", async () => {
    writeJsonl(root, "weird-name.with.dots.jsonl", 2);
    writeConsumer(root, "scripts/r.mjs", "// reads weird-name.with.dots.jsonl");
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.stats.orphans).toBe(0);
    expect(report.stats.consumed).toBe(1);
  });

  it("adversarial 2: report files themselves are NOT counted as consumers", async () => {
    // Prior report mentions every jsonl by name — must not auto-resurrect them.
    writeJsonl(root, "ORPHAN_X.jsonl", 4);
    // Plant a self-reference: would-be consumer is the report file
    writeFileSync(
      join(root, "state", "shared", "JSONL_ORPHAN_REPORT.md"),
      `# Last run\n- ORPHAN_X.jsonl was flagged\n`,
      "utf8",
    );
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.orphans.map((o) => o.basename)).toContain("ORPHAN_X.jsonl");
  });

  it("spanning 1: minLines=10 promotes a 5-line jsonl back to 'below-threshold'", async () => {
    writeJsonl(root, "small.jsonl", 5);
    writeJsonl(root, "big.jsonl", 12);
    const report = await scanJsonlOrphans({ ...ROOTS_OPT(root), minLines: 10 });
    expect(report.stats.totalJsonl).toBe(2);
    expect(report.stats.withLines).toBe(1);
    expect(report.orphans.map((o) => o.basename)).toEqual(["big.jsonl"]);
  });

  it("spanning 2: search roots restricted to one directory honour the filter", async () => {
    writeJsonl(root, "ONLY_IN_HOOKS.jsonl", 2);
    writeConsumer(root, ".claude/hooks/h1.mjs", "// reads ONLY_IN_HOOKS.jsonl");
    // Restrict roots to scripts only — hook reference should be invisible.
    const reportRestricted = await scanJsonlOrphans({
      repo: root,
      searchRoots: ["scripts"],
      extraAbsRoots: [],
    });
    expect(reportRestricted.stats.orphans).toBe(1);
    // Now include hooks — flips to consumed.
    const reportFull = await scanJsonlOrphans({
      repo: root,
      searchRoots: ["scripts", ".claude/hooks"],
      extraAbsRoots: [],
    });
    expect(reportFull.stats.orphans).toBe(0);
  });

  it("spanning 3: frozen-time pins generated_at deterministically", async () => {
    writeJsonl(root, "anything.jsonl", 1);
    const stamp = "2026-05-13T22:00:00.000Z";
    const report = await scanJsonlOrphans({ ...ROOTS_OPT(root), frozenTime: stamp });
    expect(report.generated_at).toBe(stamp);
  });

  it("spanning 4: orphans are sorted by line count desc, then alpha", async () => {
    writeJsonl(root, "z.jsonl", 5);
    writeJsonl(root, "a.jsonl", 5);
    writeJsonl(root, "big.jsonl", 100);
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.orphans.map((o) => o.basename)).toEqual(["big.jsonl", "a.jsonl", "z.jsonl"]);
  });

  it("multiple consumers are de-duped per consumer-file, not basename", async () => {
    writeJsonl(root, "TWO.jsonl", 1);
    writeConsumer(root, "scripts/a.mjs", "TWO.jsonl appears here\nand here TWO.jsonl");
    writeConsumer(root, "scripts/b.mjs", "TWO.jsonl");
    const report = await scanJsonlOrphans(ROOTS_OPT(root));
    expect(report.consumed[0].consumerCount).toBe(2);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown — formatting contract
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("renders an error banner when ok=false", () => {
    const md = renderMarkdown({
      ok: false,
      reason: "target directory not found: /tmp/nope",
      generated_at: "2026-05-13T22:00:00Z",
    });
    expect(md).toContain("**ERROR:**");
    expect(md).toContain("/tmp/nope");
  });

  it("renders 'no orphans' message when stats.orphans=0", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "2026-05-13T22:00:00Z",
      target_dir: "/repo/state/shared",
      min_lines: 1,
      consumer_files_scanned: 42,
      stats: { totalJsonl: 3, withLines: 3, orphans: 0, consumed: 3, errors: 0 },
      orphans: [],
      consumed: [
        { basename: "A.jsonl", lines: 1, consumerCount: 1, sampleConsumers: ["x/a.mjs"] },
      ],
      errors: [],
    });
    expect(md).toContain("_None — every jsonl with content has at least one codebase consumer._");
    expect(md).toContain("Consumed JSONLs");
  });

  it("renders orphan table when stats.orphans>0", () => {
    const md = renderMarkdown({
      ok: true,
      generated_at: "2026-05-13T22:00:00Z",
      target_dir: "/repo/state/shared",
      min_lines: 1,
      consumer_files_scanned: 10,
      stats: { totalJsonl: 1, withLines: 1, orphans: 1, consumed: 0, errors: 0 },
      orphans: [
        { basename: "DRIFT.jsonl", lines: 42, bytes: 999, abs: "/repo/state/shared/DRIFT.jsonl" },
      ],
      consumed: [],
      errors: [],
    });
    expect(md).toContain("| DRIFT.jsonl | 42 | 999 |");
    expect(md).toContain("## Orphans");
  });
});

// ──────────────────────────────────────────────────────────────────────
// runCli — end-to-end through CLI entry (round-trip)
// ──────────────────────────────────────────────────────────────────────

describe("runCli (round-trip)", () => {
  let root;
  let stdoutBuf;
  let stderrBuf;
  let origStdout;
  let origStderr;

  beforeEach(() => {
    root = makeRepo();
    stdoutBuf = [];
    stderrBuf = [];
    origStdout = process.stdout.write.bind(process.stdout);
    origStderr = process.stderr.write.bind(process.stderr);
    process.stdout.write = (s) => { stdoutBuf.push(String(s)); return true; };
    process.stderr.write = (s) => { stderrBuf.push(String(s)); return true; };
  });

  afterEach(() => {
    process.stdout.write = origStdout;
    process.stderr.write = origStderr;
    rmSync(root, { recursive: true, force: true });
  });

  it("--json mode emits JSON to stdout and does not write report files", async () => {
    writeJsonl(root, "thing.jsonl", 1);
    const report = await runCli(["node", "scan.mjs", "--json"], { repo: root, searchRoots: ["scripts"], extraAbsRoots: [] });
    expect(report.ok).toBe(true);
    const joined = stdoutBuf.join("").trim();
    const parsed = JSON.parse(joined);
    expect(parsed.ok).toBe(true);
    expect(parsed.stats.totalJsonl).toBe(1);
    expect(existsSync(join(root, "state/shared/JSONL_ORPHAN_REPORT.json"))).toBe(false);
    expect(existsSync(join(root, "state/shared/JSONL_ORPHAN_REPORT.md"))).toBe(false);
  });

  it("default mode writes both report files and prints a one-line summary", async () => {
    writeJsonl(root, "drift.jsonl", 7);
    const report = await runCli(["node", "scan.mjs"], { repo: root, searchRoots: ["scripts"], extraAbsRoots: [] });
    expect(report.ok).toBe(true);
    const jsonPath = join(root, "state/shared/JSONL_ORPHAN_REPORT.json");
    const mdPath = join(root, "state/shared/JSONL_ORPHAN_REPORT.md");
    expect(existsSync(jsonPath)).toBe(true);
    expect(existsSync(mdPath)).toBe(true);
    const onDisk = JSON.parse(readFileSync(jsonPath, "utf8"));
    expect(onDisk.stats.orphans).toBe(1);
    expect(onDisk.orphans[0].basename).toBe("drift.jsonl");
    const summary = stdoutBuf.join("");
    expect(summary).toMatch(/jsonl-orphan-scan:.*orphan/);
  });

  it("--min-lines round-trips end-to-end", async () => {
    writeJsonl(root, "small.jsonl", 2);
    writeJsonl(root, "big.jsonl", 50);
    const report = await runCli(
      ["node", "scan.mjs", "--json", "--min-lines", "10"],
      { repo: root, searchRoots: ["scripts"], extraAbsRoots: [] },
    );
    expect(report.stats.withLines).toBe(1);
    expect(report.orphans.map((o) => o.basename)).toEqual(["big.jsonl"]);
  });
});
