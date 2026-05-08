/**
 * PersonalBriefGenerator.test.ts
 *
 * OBSIDIAN-COMPOUND-MS1/S2/U-DAILY-PERSONAL-BRIEF — exit_criteria coverage:
 *   1. Brief contains 4 distinct markdown sections in spec order.
 *   2. Brief includes ≥3 source-file paths the script actually consulted.
 *   3. Empty-vault baseline produces a "useful day-3" brief naming a smallest path.
 *
 * SUT: the .mjs script. Ollama (external network service) is the only mock.
 *
 * 11 it() cases.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, readFileSync, existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, basename, sep } from "node:path";
import { pathToFileURL } from "node:url";

const SCRIPT = "H:/prism/mcp-server/scripts/generate-personal-brief.mjs";
interface BriefResult { ok: boolean; outputPath: string | null; content: string; sources: string[] }
interface BriefModule {
  generateBrief: (opts: Record<string, unknown>) => Promise<BriefResult>;
  buildBriefPrompt: (memories: Array<{ path: string; body: string }>, wikiTail: string[], today: string) => string;
  buildEmptyVaultBrief: (today: string) => string;
  finalizeBrief: (synth: string | null, sources: string[], today: string) => string;
}

let mod: BriefModule;
let tmpRoot: string;
const NOW = Date.UTC(2026, 4, 7, 12, 0, 0);
const TODAY = new Date(NOW).toISOString().slice(0, 10);
const SECTIONS = ["## Connections", "## Pattern", "## Question", "## Sources"] as const;

function writeNote(rel: string, body: string, ageMs = 0): string {
  const full = join(tmpRoot, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, body, "utf8");
  const mt = new Date(NOW - ageMs);
  utimesSync(full, mt, mt);
  return full;
}

function vaultDir(): string { return join(tmpRoot, "knowledge"); }

function sectionIndices(content: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const h of SECTIONS) out[h] = content.indexOf(h);
  return out;
}

function getSection(content: string, header: typeof SECTIONS[number]): string {
  const idx = content.indexOf(header);
  if (idx < 0) return "";
  const next = content.indexOf("\n## ", idx + header.length);
  return next < 0 ? content.slice(idx) : content.slice(idx, next);
}

const STUB_RESPONSE = [
  "## Connections",
  "1. The kienzle calibration in note A and the feedrate ramp in note B both rely on coefficient stability under thin-wall conditions.",
  "2. The wiki log entry on 2026-05-07 about adaptive control echoes note C's complaint about static feedrates.",
  "3. Note D's mention of operator overrides closes the loop with note A's ground-truth measurement.",
  "## Pattern",
  "Across all four sources the recurring pattern is that physics constants need closed-loop validation against shop-floor measurements before they are trusted in production.",
  "## Question",
  "Which single calibration run, if performed today on JM Die's flagship, would unblock the most downstream decisions?",
  "## Sources",
  "- placeholder.md (will be replaced by finalizeBrief)",
].join("\n\n");

const stubOllama = (response: string | null) => async (_prompt: string) => response;

beforeEach(async () => {
  if (!mod) {
    mod = (await import(pathToFileURL(SCRIPT).href)) as unknown as BriefModule;
  }
  tmpRoot = mkdtempSync(join(tmpdir(), "pbg-test-"));
  mkdirSync(join(vaultDir(), "memories", "inbox"), { recursive: true });
});

afterEach(() => {
  rmSync(tmpRoot, { recursive: true, force: true });
});

describe("PersonalBriefGenerator", () => {
  it("renders the 4 sections in the spec order with no duplicates", async () => {
    writeNote("knowledge/memories/feedback/a.md", "# A\nKienzle calibration.");
    writeNote("knowledge/memories/feedback/b.md", "# B\nFeedrate ramp.");
    writeNote("knowledge/memories/feedback/c.md", "# C\nAdaptive control.");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(STUB_RESPONSE), dryRun: true,
    });
    const idx = sectionIndices(result.content);
    expect(idx["## Connections"]).toBeGreaterThanOrEqual(0);
    expect(idx["## Pattern"]).toBeGreaterThan(idx["## Connections"]);
    expect(idx["## Question"]).toBeGreaterThan(idx["## Pattern"]);
    expect(idx["## Sources"]).toBeGreaterThan(idx["## Question"]);
    const srcCount = (result.content.match(/^## Sources\s*$/gm) ?? []).length;
    expect(srcCount).toBe(1);
  });

  it("Sources section cites the exact filenames passed in (no hallucination)", async () => {
    const a = writeNote("knowledge/memories/feedback/alpha.md", "# alpha\nAdaptive feedrate one.");
    const b = writeNote("knowledge/memories/feedback/beta.md", "# beta\nAdaptive feedrate two.");
    const c = writeNote("knowledge/memories/feedback/gamma.md", "# gamma\nAdaptive feedrate three.");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(STUB_RESPONSE), dryRun: true,
    });
    const sourcesText = getSection(result.content, "## Sources");
    const expectedNames = [a, b, c].map((p) => basename(p)).sort();
    const cited = expectedNames.filter((n) => sourcesText.includes(n));
    expect(cited.length).toBe(3);
    expect(result.sources.map((p) => basename(p)).sort()).toEqual(expectedNames);
  });

  it("Connections section is replaced when input changes (proves real synthesis path)", async () => {
    writeNote("knowledge/memories/feedback/only.md", "# Only\nKienzle.");
    const r1 = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW,
      ollamaCall: stubOllama(STUB_RESPONSE.replace("kienzle calibration", "first-variant-token")),
      dryRun: true,
    });
    const r2 = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW,
      ollamaCall: stubOllama(STUB_RESPONSE.replace("kienzle calibration", "second-variant-token")),
      dryRun: true,
    });
    const c1 = getSection(r1.content, "## Connections");
    const c2 = getSection(r2.content, "## Connections");
    expect(c1.includes("first-variant-token")).toBe(true);
    expect(c2.includes("second-variant-token")).toBe(true);
    expect(c1).not.toEqual(c2);
  });

  it("empty vault returns a brief whose Connections name a concrete path forward", async () => {
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama("UNUSED"), dryRun: true,
    });
    const conn = getSection(result.content, "## Connections");
    expect(/inbox|drop|note|capture|observation/i.test(conn)).toBe(true);
    for (const h of SECTIONS) expect(result.content.includes(h)).toBe(true);
    const src = getSection(result.content, "## Sources");
    expect(/none|empty/i.test(src)).toBe(true);
    expect(result.sources).toEqual([]);
  });

  it("7-day window includes a 5-day-old note and excludes a 10-day-old note", async () => {
    writeNote("knowledge/memories/feedback/recent.md", "# r\nRecent.");
    writeNote("knowledge/memories/feedback/five.md", "# 5\nFive days old.", 5 * 24 * 3600 * 1000);
    writeNote("knowledge/memories/feedback/old.md", "# o\nTen days.", 10 * 24 * 3600 * 1000);
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(STUB_RESPONSE), dryRun: true,
    });
    const cited = result.sources.map((p) => basename(p)).sort();
    expect(cited).toEqual(["five.md", "recent.md"]);
  });

  it("excludes prior daily-brief files from input (prevents recursive feedback)", async () => {
    writeNote("knowledge/memories/inbox/brief-2026-05-06.md", "# Yesterday\nDo not re-synth.");
    writeNote("knowledge/memories/inbox/real.md", "# Real\nGenuine note.");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(STUB_RESPONSE), dryRun: true,
    });
    const sourceBaseNames = result.sources.map((p) => basename(p));
    expect(sourceBaseNames.includes("real.md")).toBe(true);
    expect(sourceBaseNames.some((n) => n.startsWith("brief-"))).toBe(false);
  });

  it("writes a real file at inbox/brief-YYYY-MM-DD.md and on-disk content equals returned content", async () => {
    writeNote("knowledge/memories/feedback/x.md", "# X\nA real note.");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(STUB_RESPONSE), dryRun: false,
    });
    expect(typeof result.outputPath).toBe("string");
    const expectedSuffix = `${sep}inbox${sep}brief-${TODAY}.md`;
    expect((result.outputPath ?? "").endsWith(expectedSuffix)).toBe(true);
    expect(existsSync(result.outputPath ?? "")).toBe(true);
    const onDisk = readFileSync(result.outputPath ?? "", "utf8");
    expect(onDisk).toBe(result.content);
    for (const h of SECTIONS) expect(onDisk.includes(h)).toBe(true);
  });

  it("backfills ## Sources when the model omits it, preserving model output above", async () => {
    writeNote("knowledge/memories/feedback/a.md", "# A\nN1.");
    writeNote("knowledge/memories/feedback/b.md", "# B\nN2.");
    writeNote("knowledge/memories/feedback/c.md", "# C\nN3.");
    const noSources = [
      "## Connections", "1. cn-A 2. cn-B 3. cn-C",
      "## Pattern", "pat-X",
      "## Question", "q-Y",
    ].join("\n\n");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(noSources), dryRun: true,
    });
    expect(getSection(result.content, "## Connections").includes("cn-A")).toBe(true);
    expect(getSection(result.content, "## Pattern").includes("pat-X")).toBe(true);
    expect(getSection(result.content, "## Question").includes("q-Y")).toBe(true);
    const src = getSection(result.content, "## Sources");
    expect(src.includes("a.md")).toBe(true);
    expect(src.includes("b.md")).toBe(true);
    expect(src.includes("c.md")).toBe(true);
  });

  it("falls back to a deterministic safe-synth when the model returns null", async () => {
    writeNote("knowledge/memories/feedback/a.md", "# A\nA real note.");
    writeNote("knowledge/memories/feedback/b.md", "# B\nA second note.");
    const result = await mod.generateBrief({
      vaultRoot: vaultDir(), now: NOW, ollamaCall: stubOllama(null), dryRun: true,
    });
    expect(/Ollama unreachable|not synthesized/.test(result.content)).toBe(true);
    expect(/source|note|read|review/i.test(getSection(result.content, "## Question"))).toBe(true);
    const src = getSection(result.content, "## Sources");
    expect(src.includes("a.md")).toBe(true);
    expect(src.includes("b.md")).toBe(true);
  });

  it("buildBriefPrompt asks for exactly the 4 spec sections and embeds the today date", () => {
    const memories = [
      { path: "/x/feedback_a.md", body: "Body A about Kienzle." },
      { path: "/x/feedback_b.md", body: "Body B about feedrate." },
    ];
    const prompt = mod.buildBriefPrompt(memories, ["## [2026-05-07T11:00:00Z] entry"], TODAY);
    for (const h of SECTIONS) expect(prompt.includes(h)).toBe(true);
    expect(prompt.includes("feedback_a.md")).toBe(true);
    expect(prompt.includes("feedback_b.md")).toBe(true);
    expect(prompt.includes(TODAY)).toBe(true);
    expect(/3 sentences/.test(prompt)).toBe(true);
    expect(/1 sentence/.test(prompt)).toBe(true);
  });

  it("finalizeBrief is idempotent — header counts unchanged on a second pass", () => {
    const sources = ["/x/a.md", "/x/b.md", "/x/c.md"];
    const synth = "## Connections\n1. x 2. y 3. z\n## Pattern\np\n## Question\nq\n## Sources\n- a.md\n- b.md\n- c.md";
    const once = mod.finalizeBrief(synth, sources, TODAY);
    const twice = mod.finalizeBrief(once, sources, TODAY);
    for (const h of SECTIONS) {
      const re = new RegExp(`^${h.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`, "gm");
      const c1 = (once.match(re) ?? []).length;
      const c2 = (twice.match(re) ?? []).length;
      expect(c2).toBe(c1);
      expect(c1 >= 1).toBe(true);
    }
  });
});
