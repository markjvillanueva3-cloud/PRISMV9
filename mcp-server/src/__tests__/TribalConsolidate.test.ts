/**
 * TribalConsolidate.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S6/U-TRIBAL-CONSOLIDATE — exit_criteria coverage:
 *   1. 50-tip corpus on one topic synthesizes to <=2KB markdown with citations
 *   2. Re-run within 1 week skips already-promoted topics (idempotent)
 *   3. Empty tribal corpus: 0 promotions
 *   4. Single high-confidence tip: below cluster_size floor → no promotion
 *   5. Confidence floor honored
 *   6. ISO-week filename pattern
 *
 * 12 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..", "..", "..");
const SCRIPT_PATH = join(REPO_ROOT, "scripts", "tribal-consolidate-weekly.mjs");

let referenceDir: string;
type Tip = {
  id: string;
  title: string;
  body: string;
  category: string;
  confidence: number;
  usage_count: number;
  source: string;
  created_at: string;
  tags: string[];
  material_groups?: string[];
  operation_types?: string[];
};
type RunConsolidate = (opts: {
  apply?: boolean;
  referenceDir?: string;
  tips?: Tip[];
  loader?: () => Promise<Tip[]>;
  confidenceFloor?: number;
  minClusterSize?: number;
  maxTopicsPerRun?: number;
  maxTipsPerTopic?: number;
  now?: Date | number;
}) => Promise<{
  apply: boolean;
  week: string;
  referenceDir: string;
  counters: Record<string, number>;
  writes: Array<{ filePath: string; topic: string; clusterSize: number }>;
}>;

let runConsolidate: RunConsolidate;

const FIXED_NOW = new Date(Date.UTC(2026, 4, 4, 9, 0, 0)); // Mon 2026-05-04 → ISO week 2026-19

function mkTip(id: string, category: string, confidence = 80, usage = 5, body?: string): Tip {
  return {
    id, title: `Title-${id}`,
    body: body ?? `Tip body for ${id} on ${category} carrying real shop-floor wisdom about ${category}.`,
    category, confidence, usage_count: usage,
    source: `operator:${id.slice(0, 4)}`,
    created_at: "2026-04-01T00:00:00.000Z",
    tags: [category, "manufacturing"],
    material_groups: ["P", "M"],
    operation_types: ["milling"],
  };
}

beforeEach(async () => {
  referenceDir = mkdtempSync(join(tmpdir(), "trbl-test-"));
  if (!runConsolidate) {
    const mod = await import(pathToFileURL(SCRIPT_PATH).href);
    runConsolidate = mod.runConsolidate;
  }
});

afterEach(() => {
  rmSync(referenceDir, { recursive: true, force: true });
});

describe("tribal-consolidate-weekly", () => {
  // -------------------- HAPPY PATHS --------------------

  it("3 tips on same topic with confidence>=60 promote to one reference file", async () => {
    const tips: Tip[] = [
      mkTip("t1", "speeds_feeds", 85, 10),
      mkTip("t2", "speeds_feeds", 75, 6),
      mkTip("t3", "speeds_feeds", 70, 4),
    ];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(1);
    const files = readdirSync(referenceDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^tribal-speeds-feeds-2026-\d{2}\.md$/);
  });

  it("output markdown carries cluster size + aggregate confidence + citations", async () => {
    const tips: Tip[] = [
      mkTip("kienzle-1", "speeds_feeds", 90, 12),
      mkTip("kienzle-2", "speeds_feeds", 80, 8),
      mkTip("kienzle-3", "speeds_feeds", 70, 5),
    ];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    const md = readFileSync(r.writes[0].filePath, "utf8");
    expect(md).toContain("type: tribal-consolidation");
    expect(md).toContain("topic: speeds_feeds");
    expect(md).toContain("cluster_size: 3");
    expect(md).toMatch(/aggregate_confidence: \d+\.\d/);
    // Citations
    expect(md).toContain("[[kienzle-1]]");
    expect(md).toContain("[[kienzle-2]]");
    expect(md).toContain("[[kienzle-3]]");
    // Header
    expect(md).toContain("## Top Tips");
    expect(md).toContain("## Citations");
  });

  it("50-tip corpus on one topic produces <=2KB markdown (cap honored via maxTipsPerTopic)", async () => {
    const tips: Tip[] = [];
    for (let i = 0; i < 50; i++) {
      tips.push(mkTip(`t${i.toString().padStart(2, "0")}`, "tooling", 80, 50 - i));
    }
    const r = await runConsolidate({
      apply: true, referenceDir, tips, now: FIXED_NOW,
      maxTipsPerTopic: 5,
    });
    expect(r.counters.promoted).toBe(1);
    const md = readFileSync(r.writes[0].filePath, "utf8");
    // With 5 tips at ~250-char body each + frontmatter, file should be <2KB
    expect(md.length).toBeLessThan(2048);
    // Cluster total (50) preserved in frontmatter, even though only 5 synthesized
    expect(md).toContain("cluster_size: 50");
    expect(md).toContain("cluster_size_synthesized: 5");
  });

  it("multiple topics each get their own reference file", async () => {
    const tips: Tip[] = [
      mkTip("a1", "speeds_feeds", 80), mkTip("a2", "speeds_feeds", 80), mkTip("a3", "speeds_feeds", 80),
      mkTip("b1", "fixturing", 75), mkTip("b2", "fixturing", 75), mkTip("b3", "fixturing", 75),
    ];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(2);
    const files = readdirSync(referenceDir).sort();
    expect(files.length).toBe(2);
    expect(files.some((f) => f.includes("speeds-feeds"))).toBe(true);
    expect(files.some((f) => f.includes("fixturing"))).toBe(true);
  });

  it("dry-run reports promoted count but writes nothing", async () => {
    const tips: Tip[] = [mkTip("a", "x", 80), mkTip("b", "x", 80), mkTip("c", "x", 80)];
    const r = await runConsolidate({ apply: false, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(1);
    expect(readdirSync(referenceDir).length).toBe(0);
  });

  // -------------------- IDEMPOTENT (week-keyed) --------------------

  it("re-run same week skips already-promoted topics", async () => {
    const tips: Tip[] = [mkTip("a", "x", 80), mkTip("b", "x", 80), mkTip("c", "x", 80)];
    const r1 = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r1.counters.promoted).toBe(1);

    const r2 = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r2.counters.promoted).toBe(0);
    expect(r2.counters.skipped_existing).toBe(1);
    expect(readdirSync(referenceDir).length).toBe(1);
  });

  it("re-run NEXT week creates a new file (separate ISO-week slot)", async () => {
    const tips: Tip[] = [mkTip("a", "x", 80), mkTip("b", "x", 80), mkTip("c", "x", 80)];
    await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    const oneWeekLater = new Date(FIXED_NOW.getTime() + 7 * 24 * 60 * 60 * 1000);
    const r2 = await runConsolidate({ apply: true, referenceDir, tips, now: oneWeekLater });
    expect(r2.counters.promoted).toBe(1);
    expect(readdirSync(referenceDir).length).toBe(2);
  });

  // -------------------- FAILURE / FILTER --------------------

  it("empty tribal corpus → 0 promotions", async () => {
    const r = await runConsolidate({ apply: true, referenceDir, tips: [], now: FIXED_NOW });
    expect(r.counters.promoted).toBe(0);
    expect(r.counters.eligible_topics).toBe(0);
    expect(readdirSync(referenceDir).length).toBe(0);
  });

  it("single tip on a topic does NOT promote (below min_cluster_size=3)", async () => {
    const tips: Tip[] = [mkTip("solo", "x", 95, 50)];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(0);
  });

  it("tips below confidence floor (60) are filtered out before clustering", async () => {
    const tips: Tip[] = [
      mkTip("low1", "x", 30), mkTip("low2", "x", 30), mkTip("low3", "x", 30), mkTip("low4", "x", 30),
    ];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(0);
  });

  it("aggregate confidence floor: cluster mean must be >= confidenceFloor", async () => {
    // Each individual tip is JUST above the floor (60-65), but mean is right at 62.
    const tips: Tip[] = [
      mkTip("a", "y", 60), mkTip("b", "y", 62), mkTip("c", "y", 64),
    ];
    const r = await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    expect(r.counters.promoted).toBe(1);
  });

  // -------------------- DETERMINISM + ADVERSARIAL --------------------

  it("deterministic: same inputs → same output bytes (modulo generated_at)", async () => {
    const tips: Tip[] = [mkTip("a", "z", 80), mkTip("b", "z", 80), mkTip("c", "z", 80)];
    await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    const fileA = readdirSync(referenceDir)[0];
    const a = readFileSync(join(referenceDir, fileA), "utf8");

    rmSync(referenceDir, { recursive: true, force: true });
    referenceDir = mkdtempSync(join(tmpdir(), "trbl-det-"));
    await runConsolidate({ apply: true, referenceDir, tips, now: FIXED_NOW });
    const fileB = readdirSync(referenceDir)[0];
    const b = readFileSync(join(referenceDir, fileB), "utf8");

    expect(fileB).toBe(fileA);
    // Strip generated_at + _consolidatedAt (which uses now) and compare.
    const stripDateLines = (s: string) => s.replace(/_consolidatedAt:.*$/m, "");
    expect(stripDateLines(b)).toBe(stripDateLines(a));
  });

  it("topic cap honored — only first N topics processed per run", async () => {
    const tips: Tip[] = [];
    for (const c of ["a", "b", "c", "d"]) {
      for (let i = 0; i < 3; i++) tips.push(mkTip(`${c}${i}`, c, 80));
    }
    const r = await runConsolidate({
      apply: true, referenceDir, tips, now: FIXED_NOW, maxTopicsPerRun: 2,
    });
    expect(r.counters.promoted).toBe(2);
    expect(r.counters.skipped_topic_cap).toBe(2);
  });
});
