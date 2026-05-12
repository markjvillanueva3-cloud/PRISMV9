/**
 * SkillMarketplaceScannerEngine.test.ts — U-SKU07 (SKILLS-UTILIZATION-MS0) coverage
 * for the community-skill-marketplace scanner: the {@link SkillMarketplaceScannerEngine}
 * (+ its `parseMarketplaceListing` extractor), the CLI `scripts/skill-marketplace-scan.mjs`,
 * and the `prism_knowledge:skill_marketplace_scan` dispatcher action.
 *
 * Layers
 *  1. parseMarketplaceListing — table rows / heading+desc / bullet links / bare bullets
 *     extracted; a SPA's shell HTML yields 0 (the source then reads `source_parse_failed`);
 *     per-source cap honoured; markdown decorations stripped; dedup-within-source.
 *  2. scoreRelevance / dedupAgainstLibrary — vocab-hit scoring saturates at 3 hits;
 *     exact / substring name match → already-covered; token-overlap → partial-overlap; novel → novel.
 *  3. scan() — the six spec cases: relevant-new → install/study · relevant-dup → already-covered
 *     (with the covering skill named) · irrelevant → skip · one source unreachable + another OK →
 *     OK one scanned, bad one in sourcesSkipped, no false "everything failed" claim · malformed/SPA
 *     listing → that source skipped, not crashed · plus: byRecommendation totals == candidates.length,
 *     sort order, per-source cap flag, all-sources-fail → "hard miss" advisory, skillsmp → Playwright advisory.
 *  4. renderMarkdown — header, recommendation table, "recommends only" caveat, "how to act", pipe-escaping, 0-candidate safe.
 *  5. CLI via spawnSync — --help / --self-test exit 0; --json --no-write --from-content <tmp> emits
 *     internally-consistent JSON without writing; --sources skillsmp (the JS-gated one only) → exit 1 (nothing scanned).
 *  6. prism_knowledge:skill_marketplace_scan — handler captured via a mock McpServer (not just the
 *     engine singleton): action is in the enum; injected-content path works; markdown=true attaches the report.
 */

import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  skillMarketplaceScannerEngine,
  SkillMarketplaceScannerEngine,
  parseMarketplaceListing,
  PRISM_DOMAIN_VOCAB,
  SKILL_MARKETPLACE_SCAN_SCHEMA_VERSION,
  DEFAULT_MARKETPLACE_SOURCES,
  type Recommendation,
} from "../engines/SkillMarketplaceScannerEngine.js";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI_PATH = path.join(REPO_ROOT, "scripts", "skill-marketplace-scan.mjs");

// ── fixtures ───────────────────────────────────────────────────────────────

/** A realistic-ish community-collection README: a table, two heading+desc blocks, and bullets — covering every parser branch. */
const SAMPLE_README = [
  "# Awesome Community Skills",
  "",
  "A curated list of Skills.",
  "",
  "| Skill | Description |",
  "|---|---|",
  "| [cnc-feed-optimizer](skills/cnc-feed-optimizer) | Optimize CNC milling feeds and speeds for carbide tooling, tool life, and surface finish |",
  "| [pdf-table-extract](skills/pdf-table-extract) | Extract tables from PDF documents with OCR fallback for scanned engineering drawings |",
  "| [react-state-helper](skills/react-state-helper) | Manage React component state with hooks and context |",
  "| [git-pr-summarizer](skills/git-pr) | Summarize a GitHub pull request diff for code review |",
  "",
  "### lathe-thread-wizard",
  "Generate single-point threading G-code for CNC lathes — handy for production turning of threaded parts.",
  "",
  "### todo-tracker",
  "Track personal todos in markdown.",
  "",
  "More skills:",
  "- [gd-and-t-checker](skills/gdt) — Validate GD&T callouts and tolerance stacks on engineering drawings",
  "- [cad-feature-recognizer](skills/cad-fr): Recognize machining features (pockets, holes, bosses) in CAD models",
  "- coffee-timer — A timer for brewing coffee",
].join("\n");

const SAMPLE_README_NAMES = [
  "cnc-feed-optimizer", "pdf-table-extract", "react-state-helper", "git-pr-summarizer",
  "lathe-thread-wizard", "todo-tracker", "gd-and-t-checker", "cad-feature-recognizer", "coffee-timer",
];

/** A JS-rendered SPA: the raw HTML has no listings. */
const SPA_SHELL = `<!DOCTYPE html><html><head><title>SkillsMP</title></head><body><div id="root"></div><script src="/static/bundle.abc123.js"></script></body></html>`;

/** PRISM library stand-in for dedup. `lathe-thread` covers the community `lathe-thread-wizard`. */
const LIBRARY: Array<{ name: string; description: string }> = [
  { name: "lathe-thread", description: "Generate single-point threading G-code for CNC lathes" },
  { name: "wedm-program", description: "Wire EDM program generation with pass schedule and wire selection" },
  { name: "blueprint-read", description: "Engineering drawing OCR and title-block analysis" },
];

function mkRegistryFile(skills: Array<{ name: string; description: string }>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku07-"));
  const p = path.join(dir, "SKILL_QUALITY_REGISTRY.json");
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), total: skills.length, byTier: {}, parseFailures: 0, skills: skills.map((s) => ({ name: s.name, path: null, tier: "user", description: s.description, quality: {} })) }), "utf-8");
  return p;
}
function tmpJson(name: string, obj: unknown): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku07-"));
  const p = path.join(dir, name);
  fs.writeFileSync(p, JSON.stringify(obj), "utf-8");
  return p;
}
function scanReadme(content: string, id = "anthropics-skills", extra: Partial<Parameters<typeof skillMarketplaceScannerEngine.scan>[0]> = {}) {
  return skillMarketplaceScannerEngine.scan({ sources: [{ id, url: `(test:${id})`, content }], registrySkillsOverride: LIBRARY, ...extra });
}
const candByName = (r: ReturnType<typeof skillMarketplaceScannerEngine.scan>, name: string) => r.candidates.find((c) => c.name === name)!;

// ── 1. parseMarketplaceListing ─────────────────────────────────────────────

describe("parseMarketplaceListing", () => {
  it("extracts table rows, heading+description blocks, bullet links, and bare bullets", () => {
    const ls = parseMarketplaceListing(SAMPLE_README, "src");
    const names = ls.map((l) => l.name);
    expect(names).toEqual(expect.arrayContaining(SAMPLE_README_NAMES));
    expect(names).not.toContain("Skill");   // the table header cell is rejected
    expect(names).not.toContain("---");     // the separator row is rejected
    const cnc = ls.find((l) => l.name === "cnc-feed-optimizer")!;
    expect(cnc.description).toMatch(/feeds and speeds/i);
    expect(cnc.url).toBe("skills/cnc-feed-optimizer");
    const gdt = ls.find((l) => l.name === "gd-and-t-checker")!;
    expect(gdt.description).toMatch(/GD&T/i);
    expect(gdt.url).toBe("skills/gdt");
    const coffee = ls.find((l) => l.name === "coffee-timer")!;
    expect(coffee.description).toMatch(/brewing coffee/i);
    expect(coffee.url).toBe(null);
    const wiz = ls.find((l) => l.name === "lathe-thread-wizard")!;
    expect(wiz.description).toMatch(/threading G-code/i);
  });

  it("a JS-rendered SPA shell, an empty string, and unstructured prose all yield zero listings", () => {
    expect(parseMarketplaceListing(SPA_SHELL, "skillsmp")).toEqual([]);
    expect(parseMarketplaceListing("", "x")).toEqual([]);
    expect(parseMarketplaceListing("just some prose with no structure at all, nothing list-like here.", "x")).toEqual([]);
  });

  it("honours the per-source cap and dedups identical names within a source", () => {
    const many = ["| Skill | Description |", "|---|---|", ...Array.from({ length: 50 }, (_, i) => `| [skill-${i}](s/${i}) | desc ${i} |`)].join("\n");
    expect(parseMarketplaceListing(many, "src", 10)).toHaveLength(10);
    const dupd = ["| Skill | Description |", "|---|---|", "| [dup-skill](a) | first |", "| [dup-skill](b) | second |"].join("\n");
    const got = parseMarketplaceListing(dupd, "src");
    expect(got).toHaveLength(1);
    expect(got[0].name).toBe("dup-skill");
    expect(got[0].url).toBe("a"); // first occurrence wins
  });

  it("strips markdown decorations from extracted names and descriptions", () => {
    const ls = parseMarketplaceListing("### `my-skill`\nDoes a thing with **bold** and `code`.", "src");
    expect(ls).toHaveLength(1);
    expect(ls[0].name).toBe("my-skill");
    expect(ls[0].description).toBe("Does a thing with bold and code.");
  });
});

// ── 2. scoreRelevance / dedupAgainstLibrary ────────────────────────────────

describe("SkillMarketplaceScannerEngine.scoreRelevance / dedupAgainstLibrary", () => {
  const eng = new SkillMarketplaceScannerEngine();

  it("scores by distinct domain-vocab hits and saturates at 3 hits", () => {
    expect(eng.scoreRelevance("cnc-feed-optimizer", "Optimize CNC milling feeds and speeds for carbide tool life").score).toBe(1);
    const two = eng.scoreRelevance("git-pr", "Summarize a GitHub pull request for code review");
    expect(two.hits.length).toBeGreaterThanOrEqual(2);
    expect(two.score).toBeCloseTo(Math.min(1, two.hits.length / 3), 5);
    expect(eng.scoreRelevance("react-state-helper", "Manage React component state with hooks").score).toBe(0);
    const distinct = eng.scoreRelevance("x", "cnc cnc cnc machining machining");
    expect(distinct.hits).toEqual([...new Set(distinct.hits)]); // no double-count
  });

  it("dedups against the library: exact/substring name → already-covered; token overlap → partial-overlap; else novel", () => {
    expect(eng.dedupAgainstLibrary("lathe-thread", "anything", LIBRARY)).toEqual({ verdict: "already-covered", coveredBy: "lathe-thread" });
    expect(eng.dedupAgainstLibrary("lathe-thread-wizard", "Generate single-point threading G-code for CNC lathes", LIBRARY).verdict).toBe("already-covered");
    const partial = eng.dedupAgainstLibrary("turning-helper", "Wire EDM program generation pass schedule wire selection", LIBRARY);
    expect(partial).toEqual({ verdict: "partial-overlap", coveredBy: "wedm-program" });
    expect(eng.dedupAgainstLibrary("totally-novel-thing", "brews coffee and sets timers", LIBRARY)).toEqual({ verdict: "novel", coveredBy: null });
    expect(eng.dedupAgainstLibrary("anything", "anything", [])).toEqual({ verdict: "novel", coveredBy: null });
  });
});

// ── 3. scan() — the six spec cases + invariants ────────────────────────────

describe("SkillMarketplaceScannerEngine.scan()", () => {
  it("relevant new skill → install/study; relevant dup → already-covered (named); irrelevant → skip", () => {
    const r = scanReadme(SAMPLE_README);
    expect(["install", "study"]).toContain(candByName(r, "cnc-feed-optimizer").recommendation);
    expect(["install", "study"]).toContain(candByName(r, "pdf-table-extract").recommendation);
    expect(["install", "study"]).toContain(candByName(r, "gd-and-t-checker").recommendation);
    expect(["install", "study"]).toContain(candByName(r, "git-pr-summarizer").recommendation); // github + pull request + code review ⇒ relevant
    expect(candByName(r, "lathe-thread-wizard").recommendation).toBe("already-covered");
    expect(candByName(r, "lathe-thread-wizard").alreadyCoveredBy).toBe("lathe-thread");
    expect(candByName(r, "react-state-helper").recommendation).toBe("skip");
    expect(candByName(r, "todo-tracker").recommendation).toBe("skip");
    expect(candByName(r, "coffee-timer").recommendation).toBe("skip");
    expect(r.relevantCount).toBe(r.candidates.filter((c) => c.recommendation !== "skip").length);
  });

  it("one source unreachable + another OK → the OK one is scanned, the bad one is recorded skipped, no false 'everything failed'", () => {
    const r = skillMarketplaceScannerEngine.scan({
      sources: [{ id: "anthropics-skills", url: "u1", content: SAMPLE_README }, { id: "wshobson-agents", url: "u2", fetchError: "ETIMEDOUT" }],
      registrySkillsOverride: LIBRARY,
    });
    expect(r.sourcesScanned).toEqual(["anthropics-skills"]);
    expect(r.sourcesSkipped.map((s) => s.id)).toEqual(["wshobson-agents"]);
    expect(r.sourcesSkipped[0].reason).toMatch(/ETIMEDOUT/);
    expect(r.advisories.join(" ")).not.toMatch(/hard miss|every requested source failed/i);
    expect(r.candidates).toHaveLength(SAMPLE_README_NAMES.length);
  });

  it("a malformed/SPA listing → that source is skipped (source_parse_failed), not crashed", () => {
    const r = skillMarketplaceScannerEngine.scan({
      sources: [{ id: "anthropics-skills", url: "u", content: SAMPLE_README }, { id: "skillsmp", url: "u2", content: SPA_SHELL }],
      registrySkillsOverride: LIBRARY,
    });
    expect(r.sourcesScanned).toEqual(["anthropics-skills"]);
    expect(r.sourcesSkipped.find((s) => s.id === "skillsmp")!.reason).toMatch(/source_parse_failed/);
    expect(r.advisories.join(" ")).toMatch(/skillsmp|Playwright/i);
  });

  it("byRecommendation totals sum to candidates.length, and the candidate list is sorted install→study→already-covered→skip", () => {
    const r = scanReadme(SAMPLE_README);
    expect((Object.values(r.byRecommendation) as number[]).reduce((a, b) => a + b, 0)).toBe(r.candidates.length);
    expect(r.candidates).toHaveLength(SAMPLE_README_NAMES.length);
    const rank: Record<Recommendation, number> = { install: 0, study: 1, "already-covered": 2, skip: 3 };
    for (let i = 1; i < r.candidates.length; i++) expect(rank[r.candidates[i - 1].recommendation]).toBeLessThanOrEqual(rank[r.candidates[i].recommendation]);
    expect(r.schemaVersion).toBe(SKILL_MARKETPLACE_SCAN_SCHEMA_VERSION);
  });

  it("per-source cap is enforced and flagged", () => {
    const big = ["| Skill | Description |", "|---|---|", ...Array.from({ length: 30 }, (_, i) => `| [cnc-skill-${i}](s/${i}) | CNC machining feeds and speeds helper ${i} |`)].join("\n");
    const r = skillMarketplaceScannerEngine.scan({ sources: [{ id: "anthropics-skills", url: "u", content: big }], perSourceCap: 5, registrySkillsOverride: LIBRARY });
    expect(r.totalListings).toBe(5);
    expect(r.cappedSources).toEqual(["anthropics-skills"]);
    expect(r.advisories.join(" ")).toMatch(/cap.*5/i);
  });

  it("all sources fail → 0 scanned, an empty candidates list, a 'hard miss' advisory", () => {
    const r = skillMarketplaceScannerEngine.scan({ sources: [{ id: "a", url: "u", fetchError: "boom" }, { id: "b", url: "u", content: SPA_SHELL }], registrySkillsOverride: LIBRARY });
    expect(r.sourcesScanned).toEqual([]);
    expect(r.candidates).toEqual([]);
    expect(r.byRecommendation).toEqual({ install: 0, study: 0, "already-covered": 0, skip: 0 });
    expect(r.advisories.join(" ")).toMatch(/hard miss|every requested source failed/i);
  });

  it("registry unreadable → 'novel'-only view with an advisory (the dedup leg degrades, the scan still runs)", () => {
    const r = skillMarketplaceScannerEngine.scan({ sources: [{ id: "a", url: "u", content: SAMPLE_README }], registryPath: path.join(os.tmpdir(), "no-such-registry-sku07.json") });
    expect(r.sources.registrySkillCount).toBe(0);
    expect(r.advisories.join(" ")).toMatch(/could not read SKILL_QUALITY_REGISTRY/i);
    expect(candByName(r, "lathe-thread-wizard").dedupVerdict).toBe("novel"); // no library ⇒ can't be "already-covered"
  });

  it("uses the real SKILL_QUALITY_REGISTRY for dedup via registryPath", () => {
    const regFile = mkRegistryFile([{ name: "cnc-feed-optimizer", description: "an existing PRISM speeds and feeds skill" }]);
    const r = skillMarketplaceScannerEngine.scan({ sources: [{ id: "a", url: "u", content: SAMPLE_README }], registryPath: regFile });
    expect(r.sources.registrySkillCount).toBe(1);
    expect(candByName(r, "cnc-feed-optimizer").recommendation).toBe("already-covered");
    expect(candByName(r, "cnc-feed-optimizer").alreadyCoveredBy).toBe("cnc-feed-optimizer");
  });

  it("variability — one README with high / medium / off-domain listings buckets each correctly", () => {
    const readme = [
      "### wedm-cost-estimator", "Estimate wire EDM job cost including wire, machine time, and consumables for CNC machining shops.",
      "", "### json-schema-validator", "Validate JSON against a schema for TypeScript monorepos.",
      "", "### sudoku-solver", "Solve sudoku puzzles for fun.",
    ].join("\n");
    const r = scanReadme(readme);
    expect(["install", "study"]).toContain(candByName(r, "wedm-cost-estimator").recommendation); // wedm + edm + machining + cnc ⇒ ≥3 hits
    expect(["install", "study"]).toContain(candByName(r, "json-schema-validator").recommendation); // json schema + schema + typescript + monorepo
    expect(candByName(r, "sudoku-solver").recommendation).toBe("skip");
    expect(r.candidates).toHaveLength(3);
  });
});

// ── 4. renderMarkdown ──────────────────────────────────────────────────────

describe("SkillMarketplaceScannerEngine.renderMarkdown()", () => {
  it("produces the expected report sections including the 'recommends only' caveat", () => {
    const md = skillMarketplaceScannerEngine.renderMarkdown(scanReadme(SAMPLE_README), { dateLabel: "2026-05-12" });
    expect(md).toContain("# PRISM Skill-Marketplace Scan — 2026-05-12");
    expect(md).toContain("## Sources");
    expect(md).toContain("## Candidates by recommendation");
    expect(md).toMatch(/recommends only|RECOMMEND|never installs?|harness-security-audit/i);
    expect(md).toContain("## How to act on this");
    expect(md).toMatch(/prism_knowledge:skill_marketplace_scan/);
    expect(md).toMatch(/cnc-feed-optimizer|pdf-table-extract|gd-and-t-checker/); // a known shortlist entry shows
    expect(md).toMatch(/lathe-thread-wizard.*lathe-thread/); // the already-covered table names the PRISM skill
  });

  it("renders the 0-candidate case with the explicit empty-shortlist note", () => {
    const r0 = skillMarketplaceScannerEngine.scan({ sources: [{ id: "a", url: "u", fetchError: "x" }], registrySkillsOverride: LIBRARY });
    expect(skillMarketplaceScannerEngine.renderMarkdown(r0)).toMatch(/no install\/study candidates/i);
  });

  it("escapes pipe characters in shortlist rows so the table stays a 9-pipe (8-cell) row", () => {
    const piped = "| Skill | Description |\n|---|---|\n| [cnc-x](s) | CNC speeds | feeds | machining |\n";
    const md = skillMarketplaceScannerEngine.renderMarkdown(scanReadme(piped));
    const row = md.split("\n").find((l) => l.startsWith("| `cnc-x`")) ?? "";
    expect(row).toMatch(/^\| `cnc-x` \|/);
    expect((row.match(/(?<!\\)\|/g) || []).length).toBe(9); // leading | + 8 cells (Skill|Source|Rec|Relevance|Domain hits|Dedup|Covered by|Description) + trailing |
  });
});

// ── 5. CLI — scripts/skill-marketplace-scan.mjs ────────────────────────────

describe("CLI — scripts/skill-marketplace-scan.mjs", () => {
  const run = (args: string[]) => spawnSync(process.execPath, [CLI_PATH, ...args], { cwd: REPO_ROOT, encoding: "utf-8", timeout: 60_000 });

  it("--help exits 0 and prints usage", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/skill-marketplace-scan\.mjs/);
    expect(r.stdout).toMatch(/skillsmp\.com/i);
  });

  it("--self-test exits 0 with every internal check passing", () => {
    const r = run(["--self-test"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/checks passed/);
  });

  it("--json --no-write --from-content <fixture> --sources anthropics-skills emits internally-consistent JSON without writing or fetching", () => {
    const cf = tmpJson("content.json", { "anthropics-skills": SAMPLE_README });
    const r = run(["--json", "--no-write", "--from-content", cf, "--sources", "anthropics-skills"]);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.sourcesScanned).toEqual(["anthropics-skills"]);
    expect(out.totalListings).toBe(SAMPLE_README_NAMES.length);
    expect(out.byRecommendation.install + out.byRecommendation.study + out.byRecommendation["already-covered"] + out.byRecommendation.skip).toBe(out.totalListings);
    expect(out.shortlist.map((c: { name: string }) => c.name)).toEqual(expect.arrayContaining(["cnc-feed-optimizer"]));
    expect(out.written).toBe(null);
    expect(out.schemaVersion).toBe(SKILL_MARKETPLACE_SCAN_SCHEMA_VERSION);
  });

  it("--sources skillsmp (the JS-gated one only) → exit 1, nothing scanned, no network", () => {
    const r = run(["--sources", "skillsmp", "--no-write"]);
    expect(r.status).toBe(1);
    expect(r.stdout + r.stderr).toMatch(/skillsmp|SPA|Playwright/i);
  });
});

// ── 6. prism_knowledge:skill_marketplace_scan — dispatcher round-trip ──────

interface CapturedTool { schema: unknown; handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>; }
class MockMCP { tools: CapturedTool[] = []; tool(_n: string, _d: string, schema: unknown, handler: CapturedTool["handler"]) { this.tools.push({ schema, handler }); } }
function enumActions(schema: unknown): string[] {
  const action = (schema as { action?: unknown })?.action;
  const z = action as { options?: string[]; _def?: { values?: string[]; entries?: Record<string, unknown> } };
  if (Array.isArray(z?.options)) return z.options;
  if (Array.isArray(z?._def?.values)) return z._def!.values!;
  if (z?._def?.entries && typeof z._def.entries === "object") return Object.keys(z._def.entries);
  return [];
}
async function callKnowledge(server: MockMCP, action: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const raw = await server.tools[0]!.handler({ action, params });
  const env = raw as { content?: { text: string }[] };
  return Array.isArray(env.content) ? JSON.parse(env.content[0]!.text) : (raw as Record<string, unknown>);
}

describe("prism_knowledge:skill_marketplace_scan — dispatcher round-trip", () => {
  let server: MockMCP;
  beforeEach(() => { server = new MockMCP(); registerKnowledgeDispatcher(server as unknown as Parameters<typeof registerKnowledgeDispatcher>[0]); });

  it("the action is registered in the prism_knowledge enum", () => {
    expect(enumActions(server.tools[0]!.schema)).toContain("skill_marketplace_scan");
  });

  it("injected-content path: scans without touching the network and returns a consistent scan result", async () => {
    const regFile = mkRegistryFile(LIBRARY);
    const r = await callKnowledge(server, "skill_marketplace_scan", { sources: ["anthropics-skills"], sources_content: { "anthropics-skills": SAMPLE_README }, registry_path: regFile, min_relevance: 0.5 });
    expect(r.sourcesScanned).toEqual(["anthropics-skills"]);
    expect((Object.values(r.byRecommendation as Record<string, number>)).reduce((a, b) => a + b, 0)).toBe(r.totalListings);
    const cands = r.candidates as Array<{ name: string; recommendation: string; alreadyCoveredBy: string | null }>;
    expect(["install", "study"]).toContain(cands.find((c) => c.name === "cnc-feed-optimizer")!.recommendation);
    expect(cands.find((c) => c.name === "lathe-thread-wizard")!.recommendation).toBe("already-covered");
    expect(cands.find((c) => c.name === "lathe-thread-wizard")!.alreadyCoveredBy).toBe("lathe-thread");
  });

  it("markdown=true attaches the rendered report", async () => {
    const r = await callKnowledge(server, "skill_marketplace_scan", { sources: ["anthropics-skills"], sources_content: { "anthropics-skills": SAMPLE_README }, markdown: true });
    expect(r.markdown as string).toContain("# PRISM Skill-Marketplace Scan");
  });

  it("DEFAULT_MARKETPLACE_SOURCES lists the four spec sources with skillsmp flagged JS-gated; the domain vocab is non-trivial", () => {
    expect(DEFAULT_MARKETPLACE_SOURCES.map((s) => s.id)).toEqual(expect.arrayContaining(["anthropics-skills", "wshobson-agents", "obra-superpowers", "skillsmp"]));
    expect(DEFAULT_MARKETPLACE_SOURCES.find((s) => s.id === "skillsmp")!.jsGated).toBe(true);
    expect(PRISM_DOMAIN_VOCAB).toEqual(expect.arrayContaining(["cnc", "cad", "cam", "wedm", "g-code"]));
  });
});
