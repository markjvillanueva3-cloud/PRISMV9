// scripts/audit-hook-wiring.test.mjs

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  parseArgs,
  classifyOrphan,
  rankAll,
  collectDocRefs,
  buildReport,
  determineExitCode,
  renderMarkdown,
  main,
  ACTIONS,
} from "./audit-hook-wiring.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, "audit-hook-wiring.mjs");
const REPO_ROOT = resolve(__dirname, "..");
const FROZEN = "2026-05-17T03:00:00Z";

// ---------- parseArgs ----------------------------------------------------

describe("parseArgs", () => {
  test("defaults", () => {
    const o = parseArgs([]);
    assert.equal(o.json, false);
    assert.equal(o.top, 25);
    assert.equal(o.minScore, 10);
    assert.equal(o.includeKeep, false);
    assert.equal(o.help, false);
  });

  test("--json / --include-keep / --skip-write toggle", () => {
    const o = parseArgs(["--json", "--include-keep", "--skip-write"]);
    assert.equal(o.json, true);
    assert.equal(o.includeKeep, true);
    assert.equal(o.skipWrite, true);
  });

  test("--top clamps to [1,1000]", () => {
    assert.equal(parseArgs(["--top", "0"]).top, 1);
    assert.equal(parseArgs(["--top", "9999"]).top, 1000);
    assert.equal(parseArgs(["--top", "junk"]).top, 25);
  });

  test("--min-score clamps to [0,100]", () => {
    assert.equal(parseArgs(["--min-score", "-5"]).minScore, 0);
    assert.equal(parseArgs(["--min-score", "500"]).minScore, 100);
  });

  test("--frozen-time + --out-* pass through", () => {
    const o = parseArgs([
      "--frozen-time", "2026-05-17T00:00:00Z",
      "--out-md", "/tmp/x.md",
      "--out-json", "/tmp/x.json",
    ]);
    assert.equal(o.frozenTime, "2026-05-17T00:00:00Z");
    assert.equal(o.outMd, "/tmp/x.md");
    assert.equal(o.outJson, "/tmp/x.json");
  });

  test("unknown flag throws BAD_ARG", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown flag/);
  });
});

// ---------- classifyOrphan -----------------------------------------------

describe("classifyOrphan — name patterns force ARCHIVE", () => {
  test(".test.mjs → ARCHIVE regardless of tier/evidence", () => {
    const c = classifyOrphan({
      orphan: { id: "foo.test", file: ".claude/hooks/foo.test.mjs", tier: "T0", issues: [] },
      firings: 999, docRefs: ["CLAUDE.md", "MEMORY.md"],
    });
    assert.equal(c.action, "ARCHIVE");
    assert.equal(c.score, 1);
    assert.ok(c.reasons.includes("test-file-pattern"));
  });

  test("^_ helper-prefix → ARCHIVE", () => {
    const c = classifyOrphan({
      orphan: { id: "_envelope", file: ".claude/hooks/_envelope.mjs", tier: "T3", issues: [] },
      firings: 0, docRefs: [],
    });
    assert.equal(c.action, "ARCHIVE");
    assert.ok(c.reasons.includes("helper-prefix-_"));
  });

  test(".bak suffix → ARCHIVE", () => {
    const c = classifyOrphan({
      orphan: { id: "old", file: ".claude/hooks/old.bak-2026.mjs", tier: "T2", issues: [] },
      firings: 0, docRefs: [],
    });
    assert.equal(c.action, "ARCHIVE");
    assert.ok(c.reasons.includes("backup-or-disabled-suffix"));
  });

  test(".disabled suffix → ARCHIVE", () => {
    const c = classifyOrphan({
      orphan: { id: "x", file: ".claude/hooks/x.disabled.mjs", tier: "T1", issues: [] },
      firings: 0, docRefs: [],
    });
    assert.equal(c.action, "ARCHIVE");
  });
});

describe("classifyOrphan — WIRE precedence", () => {
  test("tier + doc evidence → WIRE", () => {
    const c = classifyOrphan({
      orphan: { id: "good-hook", file: ".claude/hooks/good-hook.mjs", tier: "T2", issues: [] },
      firings: 0, docRefs: ["CLAUDE.md", "knowledge/wiki/architecture/index.md"],
    });
    assert.equal(c.action, "WIRE");
    // tierScore(T2)=3 × 10 + docCount(2) + fires-bonus(0) = 32
    assert.equal(c.score, 32);
    assert.equal(c.evidence.tier, "T2");
    assert.equal(c.evidence.docRefs, 2);
  });

  test("tier + fires → WIRE with FIRES_BONUS=5", () => {
    const c = classifyOrphan({
      orphan: { id: "fires-via-bundle", file: ".claude/hooks/fires-via-bundle.mjs", tier: "T1", issues: [] },
      firings: 42, docRefs: [],
    });
    assert.equal(c.action, "WIRE");
    // tierScore(T1)=4 × 10 + docCount(0) + fires-bonus(5) = 45
    assert.equal(c.score, 45);
    assert.equal(c.evidence.firings, 42);
  });

  test("tier + both → WIRE highest score", () => {
    const c = classifyOrphan({
      orphan: { id: "h", file: ".claude/hooks/h.mjs", tier: "T0", issues: [] },
      firings: 7, docRefs: ["a", "b", "c"],
    });
    // tierScore(T0)=5 × 10 + 3 + 5 = 58
    assert.equal(c.score, 58);
  });
});

describe("classifyOrphan — REVIEW + KEEP-AS-IS", () => {
  test("missing tier → REVIEW", () => {
    const c = classifyOrphan({
      orphan: { id: "tierless", file: ".claude/hooks/tierless.mjs", tier: null, issues: [] },
      firings: 0, docRefs: [],
    });
    assert.equal(c.action, "REVIEW");
    assert.ok(c.reasons.includes("missing-tier-frontmatter"));
    // REVIEW_BASE_SCORE(5) + tierScore(0) = 5
    assert.equal(c.score, 5);
  });

  test("tier but zero evidence → REVIEW", () => {
    const c = classifyOrphan({
      orphan: { id: "isolated", file: ".claude/hooks/isolated.mjs", tier: "T2", issues: [] },
      firings: 0, docRefs: [],
    });
    assert.equal(c.action, "REVIEW");
    // REVIEW_BASE_SCORE(5) + tierScore(T2,3) = 8
    assert.equal(c.score, 8);
    assert.ok(c.reasons.includes("tiered-but-no-doc-or-fire-evidence"));
  });

  test("wired AND firing → KEEP-AS-IS (defensive)", () => {
    const c = classifyOrphan({
      orphan: { id: "wired-firing", file: ".claude/hooks/wired-firing.mjs", tier: "T2", wired: true, issues: [] },
      firings: 100, docRefs: ["CLAUDE.md"],
    });
    assert.equal(c.action, "KEEP-AS-IS");
    assert.equal(c.score, 0);
  });
});

// ---------- rankAll ------------------------------------------------------

describe("rankAll", () => {
  test("action precedence WIRE > REVIEW > ARCHIVE > KEEP", () => {
    const items = [
      { id: "k", action: "KEEP-AS-IS", score: 100 },
      { id: "a", action: "ARCHIVE", score: 100 },
      { id: "r", action: "REVIEW", score: 5 },
      { id: "w", action: "WIRE", score: 10 },
    ];
    const r = rankAll(items);
    assert.deepEqual(r.map((x) => x.id), ["w", "r", "a", "k"]);
  });

  test("score DESC within same action", () => {
    const items = [
      { id: "low", action: "WIRE", score: 10 },
      { id: "high", action: "WIRE", score: 50 },
      { id: "mid", action: "WIRE", score: 30 },
    ];
    assert.deepEqual(rankAll(items).map((x) => x.id), ["high", "mid", "low"]);
  });

  test("id ASC tiebreak on equal action+score", () => {
    const items = [
      { id: "zebra", action: "WIRE", score: 10 },
      { id: "alpha", action: "WIRE", score: 10 },
      { id: "mike", action: "WIRE", score: 10 },
    ];
    assert.deepEqual(rankAll(items).map((x) => x.id), ["alpha", "mike", "zebra"]);
  });

  test("does not mutate input", () => {
    const items = [{ id: "b", action: "WIRE", score: 1 }, { id: "a", action: "WIRE", score: 2 }];
    const before = items.map((x) => x.id);
    rankAll(items);
    assert.deepEqual(items.map((x) => x.id), before);
  });
});

// ---------- collectDocRefs -----------------------------------------------

describe("collectDocRefs", () => {
  test("substring match across multiple docs", () => {
    const docs = {
      "CLAUDE.md": "wiki-precheck-inject is auto-fired on UserPromptSubmit",
      "MEMORY.md": "error-pattern-promote and wiki-precheck-inject are top firers",
    };
    const m = collectDocRefs(["wiki-precheck-inject", "error-pattern-promote", "ghost-hook"], docs);
    assert.equal(m.get("wiki-precheck-inject").length, 2);
    assert.equal(m.get("error-pattern-promote").length, 1);
    assert.equal(m.get("ghost-hook").length, 0);
  });

  test("MIN_HOOK_ID_LEN gate filters short ids", () => {
    const docs = { "CLAUDE.md": "a abc xyz mention" };
    // ids of length < 4 should be skipped — "abc" (3) should NOT match
    const m = collectDocRefs(["abc", "longer-hook"], docs);
    assert.equal(m.get("abc").length, 0);
    assert.equal(m.get("longer-hook").length, 0); // not present in doc
  });

  test("empty docs / empty ids → empty maps", () => {
    assert.equal(collectDocRefs([], {}).size, 0);
    const m = collectDocRefs(["a-hook"], {});
    assert.equal(m.get("a-hook").length, 0);
  });

  test("missing-text doc tolerated", () => {
    const m = collectDocRefs(["my-hook"], {
      "real.md": "my-hook mention",
      "absent.md": "",
      "null.md": null,
    });
    assert.equal(m.get("my-hook").length, 1);
  });
});

// ---------- buildReport (pure given inputs) ------------------------------

describe("buildReport", () => {
  function mkInputs() {
    return {
      orphanScan: {
        orphans: [
          { id: "wire-me", file: ".claude/hooks/wire-me.mjs", tier: "T2", issues: ["orphan_file"] },
          { id: "_helper", file: ".claude/hooks/_helper.mjs", tier: "T3", issues: ["orphan_file"] },
          { id: "review-me", file: ".claude/hooks/review-me.mjs", tier: "T4", issues: ["orphan_file"] },
          { id: "tierless", file: ".claude/hooks/tierless.mjs", tier: null, issues: ["missing_tier"] },
        ],
      },
      fireRank: {
        ranked: [{ hook: "wire-me", count: 5 }],
      },
      docTexts: { "CLAUDE.md": "wire-me is great" },
    };
  }

  test("classifies + counts + ranks", () => {
    const r = buildReport(mkInputs(), { minScore: 10, includeKeep: false, generatedAt: FROZEN });
    assert.equal(r.schemaVersion, 1);
    assert.equal(r.generatedAt, FROZEN);
    assert.equal(r.totals.orphans_in, 4);
    assert.equal(r.totals.classified_out, 4); // KEEP-AS-IS filtered (none here)
    assert.equal(r.counts.WIRE, 1);
    assert.equal(r.counts.ARCHIVE, 1);
    assert.equal(r.counts.REVIEW, 2);
    assert.equal(r.totals.wire_high_confidence, 1);
    assert.equal(r.items[0].id, "wire-me");
    assert.equal(r.upstreamEmpty, false);
  });

  test("upstreamEmpty flag set when both inputs empty", () => {
    const r = buildReport(
      { orphanScan: { orphans: [] }, fireRank: { ranked: [] }, docTexts: {} },
      { minScore: 10, includeKeep: false, generatedAt: FROZEN },
    );
    assert.equal(r.upstreamEmpty, true);
  });

  test("upstreamEmpty false when only one side empty", () => {
    const r = buildReport(
      { orphanScan: { orphans: [{ id: "a", file: "a.mjs", tier: "T0", issues: [] }] }, fireRank: { ranked: [] }, docTexts: {} },
      { minScore: 10, generatedAt: FROZEN },
    );
    assert.equal(r.upstreamEmpty, false);
  });

  test("schema-drift defense: missing arrays → empty report (not throw)", () => {
    const r = buildReport(
      { orphanScan: { sections: [] }, fireRank: { topHooks: [] }, docTexts: {} },
      { minScore: 10, generatedAt: FROZEN },
    );
    // both arrays missing → upstreamEmpty true
    assert.equal(r.upstreamEmpty, true);
    assert.equal(r.totals.orphans_in, 0);
  });

  test("--include-keep retains KEEP-AS-IS rows", () => {
    const inputs = {
      orphanScan: {
        orphans: [
          { id: "wired-firing", file: ".claude/hooks/wired-firing.mjs", tier: "T2", wired: true, issues: [] },
        ],
      },
      fireRank: { ranked: [{ hook: "wired-firing", count: 99 }] },
      docTexts: {},
    };
    const without = buildReport(inputs, { minScore: 10, includeKeep: false, generatedAt: FROZEN });
    const withKeep = buildReport(inputs, { minScore: 10, includeKeep: true, generatedAt: FROZEN });
    assert.equal(without.totals.classified_out, 0);
    assert.equal(withKeep.totals.classified_out, 1);
    assert.equal(withKeep.counts["KEEP-AS-IS"], 1);
  });
});

// ---------- determineExitCode --------------------------------------------

describe("determineExitCode", () => {
  test("null/undefined → 2", () => {
    assert.equal(determineExitCode(null), 2);
    assert.equal(determineExitCode(undefined), 2);
  });
  test("wire_high_confidence > 0 → 1", () => {
    assert.equal(determineExitCode({ totals: { wire_high_confidence: 3 } }), 1);
  });
  test("no wire candidates → 0", () => {
    assert.equal(determineExitCode({ totals: { wire_high_confidence: 0 } }), 0);
    assert.equal(determineExitCode({ totals: {} }), 0);
  });
});

// ---------- renderMarkdown -----------------------------------------------

describe("renderMarkdown", () => {
  test("contains all action sections that have items", () => {
    const md = renderMarkdown({
      generatedAt: FROZEN,
      totals: { orphans_in: 2, classified_out: 2, wire_high_confidence: 1 },
      counts: { WIRE: 1, ARCHIVE: 1 },
      items: [
        { id: "wire-me", file: "x", tier: "T2", action: "WIRE", score: 32, reasons: ["tier-T2"], evidence: { tier: "T2", docRefs: 2, firings: 0 } },
        { id: "_helper", file: "y", tier: "T3", action: "ARCHIVE", score: 1, reasons: ["helper-prefix-_"], evidence: { tier: "T3", docRefs: 0, firings: 0 } },
      ],
    }, { top: 25 });
    assert.match(md, /HOOK-ORPHAN-CLASSIFICATION/);
    assert.match(md, /## WIRE/);
    assert.match(md, /## ARCHIVE/);
    assert.match(md, /`wire-me`/);
    assert.match(md, /never deletes/);
  });

  test("action distribution always lists all 4 actions", () => {
    const md = renderMarkdown({
      generatedAt: FROZEN,
      totals: { orphans_in: 0, classified_out: 0, wire_high_confidence: 0 },
      counts: {},
      items: [],
    }, { top: 25 });
    for (const a of ACTIONS) assert.match(md, new RegExp(`\\*\\*${a}\\*\\*`));
  });
});

// ---------- main() with injected readers ---------------------------------

describe("main() with injected readers", () => {
  test("happy path → exit 1 with WIRE candidate", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "ahw-"));
    const code = await main(
      ["--json", "--skip-write", "--frozen-time", FROZEN, "--repo-root", tmp],
      {
        orphanScan: {
          orphans: [{ id: "real-hook-name", file: ".claude/hooks/real-hook-name.mjs", tier: "T2", issues: [] }],
        },
        fireRank: { ranked: [{ hook: "real-hook-name", count: 10 }] },
        docTexts: { "CLAUDE.md": "real-hook-name is documented" },
      },
    );
    assert.equal(code, 1);
  });

  test("upstreamEmpty → exit 2 + stderr warning", async () => {
    const code = await main(
      ["--json", "--skip-write", "--frozen-time", FROZEN],
      {
        orphanScan: { orphans: [] },
        fireRank: { ranked: [] },
        docTexts: {},
      },
    );
    assert.equal(code, 2);
  });
});

// ---------- CLI smoke + real-data E2E -----------------------------------

describe("CLI smoke", () => {
  function runCli(args, opts = {}) {
    return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
      encoding: "utf8", timeout: 90_000, cwd: opts.cwd || REPO_ROOT,
    });
  }

  test("--help → exit 0 + usage banner", () => {
    const r = runCli(["--help"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /audit-hook-wiring.mjs/);
  });

  test("unknown flag → exit 2", () => {
    const r = runCli(["--bogus"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown flag/);
  });

  test("REAL-DATA E2E — composes live upstream + produces valid JSON", () => {
    const tmpOutMd = join(mkdtempSync(join(tmpdir(), "ahw-real-")), "out.md");
    const tmpOutJson = join(mkdtempSync(join(tmpdir(), "ahw-real-")), "out.json");
    const r = runCli([
      "--json",
      "--frozen-time", FROZEN,
      "--out-md", tmpOutMd,
      "--out-json", tmpOutJson,
    ]);
    // expect exit 0 or 1 (success/has-wire-candidates) — NOT 2 (input fail)
    assert.ok(
      r.status === 0 || r.status === 1,
      `unexpected exit ${r.status}: stderr=${r.stderr}`,
    );
    const out = JSON.parse(r.stdout);
    assert.equal(out.schemaVersion, 1);
    assert.equal(out.generatedAt, FROZEN);
    assert.ok(out.totals.orphans_in >= 0, "totals.orphans_in present");
    assert.ok(typeof out.upstreamEmpty === "boolean", "upstreamEmpty flag emitted");
    // If upstreams produced any data at all, items[] must be present
    if (!out.upstreamEmpty) {
      assert.ok(Array.isArray(out.items), "items array present");
      assert.ok(out.totals.orphans_in > 0 || out.totals.classified_out >= 0);
    }
    // Artifacts must be written
    assert.ok(existsSync(tmpOutMd), "MD artifact written");
    assert.ok(existsSync(tmpOutJson), "JSON artifact written");
    const sidecar = JSON.parse(readFileSync(tmpOutJson, "utf8"));
    assert.equal(sidecar.schemaVersion, 1);
  });
});
