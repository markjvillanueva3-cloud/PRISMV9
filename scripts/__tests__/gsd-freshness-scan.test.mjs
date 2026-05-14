/**
 * gsd-freshness-scan.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-H5.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes (no GSD dir / no inventory / no GSD_QUICK)
 *   - >= 2 adversarial inputs (malformed counts, oversize ages)
 *   - >= 3 spanning variability configs (no-drift / stale-only / count-only / both)
 *   - round-trip CLI invocation via main() with real I/O
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  walkMarkdown,
  parseQuickCounts,
  parseInventoryCounts,
  buildReport,
  renderMarkdown,
  main,
  SEVERITY,
  _internals,
} from "../gsd-freshness-scan.mjs";

const NOW = "2026-05-14T00:00:00.000Z";
const NOW_MS = Date.parse(NOW);
const ONE_DAY = 24 * 60 * 60 * 1000;

// ──────────────────────────────────────────────────────────────────────
// fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "gsd-fresh-"));
  mkdirSync(join(root, "mcp-server/data/docs/gsd/sections"), { recursive: true });
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

function writeGsdFile(root, relPath, content, mtimeMs = null) {
  const p = join(root, "mcp-server/data/docs/gsd", relPath);
  mkdirSync(join(p, "..").replace(/\/\.\.\/?$/, ""), { recursive: true });
  writeFileSync(p, content, "utf-8");
  if (mtimeMs !== null) {
    const sec = Math.floor(mtimeMs / 1000);
    utimesSync(p, sec, sec);
  }
  return p;
}

function writeInventory(root, content) {
  writeFileSync(join(root, "PRISM-INVENTORY-LATEST.md"), content, "utf-8");
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.staleDays).toBe(_internals.DEFAULT_STALE_DAYS);
    expect(a.frozenTime).toBe(null);
    expect(a.gsdDir).toBe(null);
  });

  it("all flags", () => {
    const a = parseArgs([
      "--json",
      "--stale-days", "30",
      "--frozen-time", NOW,
      "--gsd-dir", "/g",
      "--inventory", "/inv",
      "--out-md", "/md",
      "--out-json", "/json",
    ]);
    expect(a.json).toBe(true);
    expect(a.staleDays).toBe(30);
    expect(a.gsdDir).toBe("/g");
    expect(a.inventory).toBe("/inv");
    expect(a.outMd).toBe("/md");
    expect(a.outJson).toBe("/json");
  });

  it("--stale-days rejects garbage", () => {
    expect(parseArgs(["--stale-days", "abc"]).staleDays).toBe(_internals.DEFAULT_STALE_DAYS);
    expect(parseArgs(["--stale-days", "-5"]).staleDays).toBe(_internals.DEFAULT_STALE_DAYS);
    expect(parseArgs(["--stale-days", "0"]).staleDays).toBe(_internals.DEFAULT_STALE_DAYS);
    expect(parseArgs(["--stale-days", "60"]).staleDays).toBe(60);
  });
});

// ──────────────────────────────────────────────────────────────────────
// walkMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("walkMarkdown", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns sorted-by-relPath .md files with mtimeMs + sizeBytes", () => {
    writeGsdFile(root, "GSD_QUICK.md", "quick");
    writeGsdFile(root, "GSD_MICRO.md", "micro");
    writeGsdFile(root, "DEV_PROTOCOL.md", "dev");
    writeGsdFile(root, "sections/d1.md", "d1");
    writeGsdFile(root, "sections/ignored.txt", "skip");
    const list = walkMarkdown(join(root, "mcp-server/data/docs/gsd"));
    const names = list.map((f) => f.relPath);
    expect(names).toContain("GSD_QUICK.md");
    expect(names).toContain("GSD_MICRO.md");
    expect(names).toContain("DEV_PROTOCOL.md");
    expect(names).toContain("sections/d1.md");
    expect(names).not.toContain("sections/ignored.txt");
    expect(list[0].sizeBytes).toBeGreaterThan(0);
    expect(list[0].mtimeMs).toBeGreaterThan(0);
  });

  it("returns [] for missing dir", () => {
    const list = walkMarkdown(join(root, "nope"));
    expect(list).toEqual([]);
  });

  it("respects maxDepth bound", () => {
    writeGsdFile(root, "a.md", "a");
    mkdirSync(join(root, "mcp-server/data/docs/gsd/x/y/z"), { recursive: true });
    writeFileSync(join(root, "mcp-server/data/docs/gsd/x/y/z/deep.md"), "deep", "utf-8");
    // Default maxDepth=4 should find the deep file.
    const def = walkMarkdown(join(root, "mcp-server/data/docs/gsd"));
    expect(def.map((f) => f.relPath)).toContain("x/y/z/deep.md");
    // maxDepth=0 returns only root-level files
    const shallow = walkMarkdown(join(root, "mcp-server/data/docs/gsd"), 0);
    expect(shallow.map((f) => f.relPath)).toContain("a.md");
    expect(shallow.map((f) => f.relPath)).not.toContain("x/y/z/deep.md");
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseQuickCounts
// ──────────────────────────────────────────────────────────────────────

describe("parseQuickCounts", () => {
  it("parses the canonical count header", () => {
    const c = parseQuickCounts(
      "# PRISM Quick\n## 95 dispatchers | 6346 actions | 3018 engines | 357 hooks | 503 skills | 244 scripts\n",
    );
    expect(c).toEqual({
      dispatchers: 95,
      actions: 6346,
      engines: 3018,
      hooks: 357,
      skills: 503,
      scripts: 244,
    });
  });

  it("returns null when no dispatcher claim found", () => {
    expect(parseQuickCounts("# No counts here\nbody")).toBe(null);
  });

  it("returns null for non-string input", () => {
    expect(parseQuickCounts(null)).toBe(null);
    expect(parseQuickCounts(undefined)).toBe(null);
  });

  it("captures partial sets", () => {
    const c = parseQuickCounts("## 50 dispatchers | 2000 actions");
    expect(c).toEqual({ dispatchers: 50, actions: 2000 });
  });
});

// ──────────────────────────────────────────────────────────────────────
// parseInventoryCounts
// ──────────────────────────────────────────────────────────────────────

describe("parseInventoryCounts", () => {
  it("parses common bulleted form", () => {
    const inv = `# Inventory
- Engines (files): 3163
- Dispatchers: 97
- Actions: 7244
- Hooks: 470
- Skills: 503
- Scripts: 244
`;
    const out = parseInventoryCounts(inv);
    expect(out.engines).toBe(3163);
    expect(out.dispatchers).toBe(97);
    expect(out.actions).toBe(7244);
    expect(out.hooks).toBe(470);
    expect(out.skills).toBe(503);
    expect(out.scripts).toBe(244);
  });

  it("returns null when no counts found", () => {
    expect(parseInventoryCounts("# Empty file")).toBe(null);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildReport — variability
// ──────────────────────────────────────────────────────────────────────

describe("buildReport — variability cohorts", () => {
  function f(relPath, ageDays) {
    return {
      relPath,
      abs: `/x/${relPath}`,
      mtimeMs: NOW_MS - ageDays * ONE_DAY,
      sizeBytes: 100,
    };
  }

  it("no-drift cohort (fresh files, matching counts)", () => {
    const r = buildReport({
      files: [f("a.md", 5), f("b.md", 10)],
      quickCounts: { dispatchers: 95 },
      inventoryCounts: { dispatchers: 95 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.totals.drift).toBe(0);
    expect(r.findings).toEqual([]);
  });

  it("stale-only cohort (mtime-stale, no count drift)", () => {
    const r = buildReport({
      files: [f("a.md", 5), f("ancient.md", 200)],
      quickCounts: { dispatchers: 95 },
      inventoryCounts: { dispatchers: 95 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.totals.drift).toBe(1);
    expect(r.findings[0].kind).toBe("stale_mtime");
    expect(r.findings[0].severity).toBe(SEVERITY.P1);
    expect(r.findings[0].file).toBe("ancient.md");
  });

  it("count-drift cohort (fresh files, mismatched counts)", () => {
    const r = buildReport({
      files: [f("a.md", 5)],
      quickCounts: { dispatchers: 95, engines: 1000 },
      inventoryCounts: { dispatchers: 100, engines: 3000 }, // big deltas
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.countDrift.length).toBe(2);
    // engines: claimed=1000, observed=3000, delta=2000 → 200% pct → P0
    const engineFinding = r.findings.find((x) => x.category === "engines");
    expect(engineFinding.severity).toBe(SEVERITY.P0);
    expect(engineFinding.delta).toBe(2000);
  });

  it("mixed cohort (stale + count drift)", () => {
    const r = buildReport({
      files: [f("a.md", 5), f("old.md", 100)],
      quickCounts: { dispatchers: 95 },
      inventoryCounts: { dispatchers: 200 }, // 100/95 = ~105% delta → P0
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.totals.drift).toBe(2);
    expect(r.bySeverity.P0).toBe(1); // count drift
    expect(r.bySeverity.P1).toBe(1); // stale mtime
  });

  it("severity threshold: small delta → P1, large delta → P0", () => {
    // delta=5/95 = 5% < 25%, abs<=50 → P1
    const small = buildReport({
      files: [],
      quickCounts: { dispatchers: 95 },
      inventoryCounts: { dispatchers: 100 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(small.bySeverity.P1).toBe(1);
    expect(small.bySeverity.P0).toBe(0);

    // delta=51, abs>50 → P0
    const big = buildReport({
      files: [],
      quickCounts: { dispatchers: 100 },
      inventoryCounts: { dispatchers: 151 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(big.bySeverity.P0).toBe(1);
  });
});

describe("buildReport — adversarial", () => {
  it("oversize file age coerces without crashing", () => {
    const r = buildReport({
      files: [
        {
          relPath: "ancient.md",
          abs: "/x/ancient.md",
          mtimeMs: 0, // epoch
          sizeBytes: 1,
        },
      ],
      quickCounts: null,
      inventoryCounts: null,
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.findings[0].kind).toBe("stale_mtime");
    expect(r.findings[0].ageDays).toBeGreaterThan(_internals.DEFAULT_STALE_DAYS * 100);
  });

  it("missing quickCounts / inventoryCounts → no count_drift findings", () => {
    const r = buildReport({
      files: [],
      quickCounts: null,
      inventoryCounts: { dispatchers: 100 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.countDrift).toEqual([]);

    const r2 = buildReport({
      files: [],
      quickCounts: { dispatchers: 100 },
      inventoryCounts: null,
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r2.countDrift).toEqual([]);
  });

  it("inventoryCounts missing a category quickCounts has → skip cross-check", () => {
    const r = buildReport({
      files: [],
      quickCounts: { dispatchers: 95, ghost: 999 },
      inventoryCounts: { dispatchers: 95 },
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.countDrift).toEqual([]);
  });

  it("returns oldest/newest extremes from file set", () => {
    const r = buildReport({
      files: [
        { relPath: "young.md", abs: "/y", mtimeMs: NOW_MS - ONE_DAY, sizeBytes: 1 },
        { relPath: "old.md",   abs: "/o", mtimeMs: NOW_MS - 100 * ONE_DAY, sizeBytes: 1 },
        { relPath: "mid.md",   abs: "/m", mtimeMs: NOW_MS - 30 * ONE_DAY, sizeBytes: 1 },
      ],
      quickCounts: null,
      inventoryCounts: null,
      staleDays: 90,
      nowIso: NOW,
    });
    expect(r.oldestFile.relPath).toBe("old.md");
    expect(r.newestFile.relPath).toBe("young.md");
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes summary + severity + cross-check + findings", () => {
    const r = buildReport({
      files: [{ relPath: "a.md", abs: "/x", mtimeMs: NOW_MS - 5 * ONE_DAY, sizeBytes: 100 }],
      quickCounts: { dispatchers: 95 },
      inventoryCounts: { dispatchers: 100 },
      staleDays: 90,
      nowIso: NOW,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# GSD Freshness Audit");
    expect(md).toContain("Count cross-check");
    expect(md).toContain("dispatchers");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-H5");
  });

  it("emits 'no drift' on empty findings", () => {
    const r = buildReport({
      files: [],
      quickCounts: null,
      inventoryCounts: null,
      staleDays: 90,
      nowIso: NOW,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("no drift");
  });
});

// ──────────────────────────────────────────────────────────────────────
// main — round-trip CLI
// ──────────────────────────────────────────────────────────────────────

describe("main (round-trip)", () => {
  let root;
  let logs;
  let errs;

  beforeEach(() => {
    root = makeRepo();
    logs = [];
    errs = [];
  });
  afterEach(() => {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  it("happy path: counts match + no stale files → no drift", async () => {
    writeGsdFile(root, "GSD_QUICK.md", "# Title\n## 95 dispatchers | 200 actions | 1000 engines\n");
    writeGsdFile(root, "GSD_MICRO.md", "micro");
    writeInventory(root, "- Engines: 1000\n- Dispatchers: 95\n- Actions: 200\n");
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8"),
    );
    expect(js.totals.drift).toBe(0);
  });

  it("count-drift detected when GSD_QUICK and inventory disagree", async () => {
    writeGsdFile(root, "GSD_QUICK.md", "# T\n## 95 dispatchers | 200 actions\n");
    writeGsdFile(root, "x.md", "body");
    writeInventory(root, "- Dispatchers: 200\n- Actions: 250\n");
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8"),
    );
    expect(js.countDrift.length).toBe(2);
    // dispatchers: 95 vs 200 → big delta → P0
    expect(js.bySeverity.P0).toBeGreaterThan(0);
  });

  it("stale-mtime detection when file age > staleDays", async () => {
    // Mtime 100 days ago.
    const old = NOW_MS - 100 * ONE_DAY;
    writeGsdFile(root, "ancient.md", "# old", old);
    writeGsdFile(root, "fresh.md", "# new");
    const res = await main({
      argv: ["--frozen-time", NOW, "--stale-days", "90"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8"),
    );
    const stale = js.findings.filter((f) => f.kind === "stale_mtime");
    expect(stale.length).toBe(1);
    expect(stale[0].file).toBe("ancient.md");
  });

  it("--json emits to stdout, no file writes", async () => {
    writeGsdFile(root, "x.md", "body");
    const res = await main({
      argv: ["--json", "--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.md"))).toBe(false);
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.totals.files).toBe(1);
  });

  it("--help short-circuits", async () => {
    writeGsdFile(root, "x.md", "body");
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("GSD doctrine docs freshness");
  });

  it("fatal when GSD dir missing", async () => {
    // Empty repo (no GSD dir created beyond setUp baseline)
    rmSync(join(root, "mcp-server"), { recursive: true, force: true });
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL.*GSD dir not found/);
  });

  it("missing inventory is non-fatal — no count cross-check", async () => {
    writeGsdFile(root, "GSD_QUICK.md", "# T\n## 95 dispatchers");
    // no inventory file
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8"),
    );
    expect(js.countDrift).toEqual([]);
    expect(js.quickCounts).toEqual({ dispatchers: 95 });
    expect(js.inventoryCounts).toBe(null);
  });

  it("missing GSD_QUICK is non-fatal — only mtime-staleness signal", async () => {
    writeGsdFile(root, "other.md", "no quick file present");
    writeInventory(root, "- Dispatchers: 100");
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8"),
    );
    expect(js.quickCounts).toBe(null);
    expect(js.totals.files).toBe(1);
  });

  it("idempotent: same inputs produce identical files", async () => {
    writeGsdFile(root, "GSD_QUICK.md", "# T\n## 95 dispatchers");
    writeInventory(root, "- Dispatchers: 95");
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md1 = readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.md"), "utf-8");
    const js1 = readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8");
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md2 = readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.md"), "utf-8");
    const js2 = readFileSync(join(root, "state/shared/GSD_FRESHNESS_REPORT.json"), "utf-8");
    expect(md1).toBe(md2);
    expect(js1).toBe(js2);
  });
});
