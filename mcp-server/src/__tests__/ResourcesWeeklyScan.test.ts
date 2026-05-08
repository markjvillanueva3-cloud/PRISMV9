/**
 * ResourcesWeeklyScan.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S5/U-RESOURCES-INGEST-CRON — exit_criteria coverage:
 *   1. 100-file synthetic Resources fixture produces correct inbox markers
 *   2. Repeat run within 1 day skips already-scanned (mtime-based idempotency)
 *   3. Missing root → counters=0, errored=0 (graceful no-op)
 *   4. Batch cap respected (deferredOverBatch counter populated)
 *   5. Marker frontmatter parses + carries kind / sha / source path
 *
 * 11 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync, utimesSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "resources-weekly-scan.mjs");

let tmpResources: string;
let tmpInbox: string;
let tmpStatePath: string;

type RunResourcesScan = (opts: {
  apply?: boolean;
  root?: string;
  inbox?: string;
  state?: string;
  batch?: number;
  maxDepth?: number;
  nowIso?: string;
}) => {
  apply: boolean;
  root: string;
  counters: { scanned: number; queued: number; alreadySeen: number; errored: number; deferredOverBatch: number };
  writes: Array<{ inboxPath: string; sourcePath: string }>;
  scanIso: string;
  reason?: string;
};

let runResourcesScan: RunResourcesScan;

const FIXED_NOW_MS = Date.UTC(2026, 4, 8, 12, 0, 0);
const FIXED_NOW_ISO = new Date(FIXED_NOW_MS).toISOString();

function touch(rel: string, content = "x", ageMs = 0): string {
  const full = join(tmpResources, rel);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, "utf8");
  const mt = new Date(FIXED_NOW_MS - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

beforeEach(async () => {
  tmpResources = mkdtempSync(join(tmpdir(), "rsrc-test-"));
  tmpInbox = mkdtempSync(join(tmpdir(), "rsrc-inbox-"));
  tmpStatePath = join(mkdtempSync(join(tmpdir(), "rsrc-state-")), "state.json");
  if (!runResourcesScan) {
    const mod = await import(pathToFileURL(SCRIPT_PATH).href);
    runResourcesScan = mod.runResourcesScan;
  }
});

afterEach(() => {
  rmSync(tmpResources, { recursive: true, force: true });
  rmSync(tmpInbox, { recursive: true, force: true });
  try { rmSync(dirname(tmpStatePath), { recursive: true, force: true }); } catch { /* ignore */ }
});

describe("resources-weekly-scan", () => {
  // -------------------- HAPPY PATHS --------------------

  it("100 fresh files produce 100 inbox markers (one per file)", () => {
    for (let i = 0; i < 100; i++) {
      touch(`subdir-${i % 5}/file-${i}.pdf`, `content ${i}`);
    }
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath,
      nowIso: FIXED_NOW_ISO, batch: 5000,
    });
    expect(r.counters.scanned).toBe(100);
    expect(r.counters.queued).toBe(100);
    expect(r.counters.errored).toBe(0);
    const markers = readdirSync(tmpInbox).filter((n) => n.startsWith("resources-"));
    expect(markers.length).toBe(100);
  });

  it("dry-run reports queued count but writes no inbox files", () => {
    for (let i = 0; i < 10; i++) touch(`f-${i}.pdf`);
    const r = runResourcesScan({
      apply: false, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.queued).toBe(10);
    if (existsSync(tmpInbox)) {
      const dirEntries = readdirSync(tmpInbox);
      expect(dirEntries.length).toBe(0);
    }
  });

  it("idempotent: re-run within 1 day skips all files (mtime-based)", () => {
    for (let i = 0; i < 5; i++) touch(`old-${i}.pdf`);
    const r1 = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r1.counters.queued).toBe(5);

    // Re-run with same mtimes
    const r2 = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath,
      nowIso: new Date(FIXED_NOW_MS + 60_000).toISOString(),
    });
    expect(r2.counters.queued).toBe(0);
    expect(r2.counters.alreadySeen).toBe(5);
  });

  it("touched-since-last-scan files are picked up on next run", () => {
    touch("a.pdf", "v1");
    runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });

    // Simulate file modification: rewrite + bump mtime
    const path = touch("a.pdf", "v2", -60_000); // mtime = NOW + 60s (newer than seen)

    const r2 = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath,
      nowIso: new Date(FIXED_NOW_MS + 120_000).toISOString(),
    });
    expect(r2.counters.queued).toBe(1);
  });

  // -------------------- FAILURE MODES --------------------

  it("missing root directory → counters=0, errored=0, no-op success", () => {
    const ghostRoot = join(tmpdir(), "definitely-not-there-" + Date.now());
    const r = runResourcesScan({
      apply: true, root: ghostRoot, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.scanned).toBe(0);
    expect(r.counters.queued).toBe(0);
    expect(r.counters.errored).toBe(0);
    expect(r.reason).toBe("root-not-found");
  });

  it("empty Resources dir → 0 markers, 0 errors", () => {
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.scanned).toBe(0);
    expect(r.counters.queued).toBe(0);
    expect(r.counters.errored).toBe(0);
  });

  it("batch cap of 50 with 75 files → 50 queued, 25 deferred", () => {
    for (let i = 0; i < 75; i++) touch(`b-${i.toString().padStart(3, "0")}.pdf`);
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath,
      nowIso: FIXED_NOW_ISO, batch: 50,
    });
    expect(r.counters.queued).toBe(50);
    expect(r.counters.deferredOverBatch).toBe(25);
  });

  it("skip-dirs (.git, node_modules, dist, build) are NOT recursed", () => {
    touch("good.pdf");
    touch("node_modules/bad.pdf");
    touch(".git/objects/bad.pdf");
    touch("dist/bad.pdf");
    touch("build/bad.pdf");
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.queued).toBe(1);
    const markers = readdirSync(tmpInbox).filter((n) => n.startsWith("resources-"));
    const matchedSource = markers.map((m) => readFileSync(join(tmpInbox, m), "utf8")).join("\n");
    expect(matchedSource).toContain("good.pdf");
    expect(matchedSource).not.toContain("node_modules");
  });

  // -------------------- ADVERSARIAL --------------------

  it("marker frontmatter contains kind, sha prefix, source path, mtime", () => {
    touch("manual.pdf", "PDF stub", 5000);
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.queued).toBe(1);
    const markerName = readdirSync(tmpInbox).find((n) => n.startsWith("resources-"));
    expect(typeof markerName).toBe("string");
    const content = readFileSync(join(tmpInbox, markerName!), "utf8");
    expect(content.startsWith("---\n")).toBe(true);
    expect(content).toContain("kind: pdf");
    expect(content).toContain("source_filename:");
    expect(content).toContain("source_extension: pdf");
    expect(content).toContain("source_sha_prefix:");
    expect(content).toContain("source_mtime_iso:");
    expect(content).toContain("scanned_at:");
    expect(content).toContain("epistemic_only: true");
    expect(content).toContain("consumed_by_machining: false");
  });

  it("classifies files by extension (pdf/video/cad/code/data/gcode)", () => {
    touch("a.pdf");
    touch("b.mp4");
    touch("c.step");
    touch("d.py");
    touch("e.csv");
    touch("f.nc");
    touch("g.unknown");
    const r = runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    expect(r.counters.queued).toBe(7);
    const markers = readdirSync(tmpInbox).filter((n) => n.startsWith("resources-"));
    const kinds = markers.map((m) => {
      const c = readFileSync(join(tmpInbox, m), "utf8");
      return c.match(/^kind:\s*(\w+)/m)?.[1];
    });
    expect(kinds).toContain("pdf");
    expect(kinds).toContain("video");
    expect(kinds).toContain("cad");
    expect(kinds).toContain("code");
    expect(kinds).toContain("data");
    expect(kinds).toContain("gcode");
    expect(kinds).toContain("other");
  });

  it("state file persists lastScanIso + seenPaths across runs (atomic)", () => {
    touch("a.pdf");
    runResourcesScan({
      apply: true, root: tmpResources, inbox: tmpInbox, state: tmpStatePath, nowIso: FIXED_NOW_ISO,
    });
    const state = JSON.parse(readFileSync(tmpStatePath, "utf8"));
    expect(state.schemaVersion).toBe("1.0.0");
    expect(state.lastScanIso).toBe(FIXED_NOW_ISO);
    expect(typeof state.totalQueuedAllTime).toBe("number");
    expect(state.totalQueuedAllTime).toBeGreaterThanOrEqual(1);
    expect(state.batches.length).toBeGreaterThanOrEqual(1);
    expect(state.batches[state.batches.length - 1].queued).toBe(1);
    // seenPaths should have one entry mapping to mtime ms
    const seenKeys = Object.keys(state.seenPaths);
    expect(seenKeys.length).toBe(1);
  });
});
