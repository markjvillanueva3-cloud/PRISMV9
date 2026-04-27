/**
 * WikiPatternHarvesterEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * Real-data tests against the harvester:
 *   - Fixtures use the actual miner output shapes so a regression in those
 *     interfaces fails this suite.
 *   - Skill-stub gate is exercised at all four corner cases of the
 *     (confidence, frequency) plane to lock the boundary.
 *   - Idempotency: a second harvest over identical input writes zero files.
 *   - The `.draft` suffix is verified against the live filesystem path.
 *
 * Tests use temp dirs so they never touch the real wiki/ or ~/.claude/commands/.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WikiPatternHarvesterEngine,
  SKILL_STUB_CONFIDENCE_FLOOR,
  SKILL_STUB_FREQUENCY_FLOOR,
  slugify,
  scorePatternConfidence,
  type HarvestedPattern,
} from "../engines/WikiPatternHarvesterEngine.js";
import { WikiIndexMaintainerEngine } from "../engines/WikiIndexMaintainerEngine.js";
import { WikiLogAppenderEngine } from "../engines/WikiLogAppenderEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

interface TestEnv {
  root: string;
  patternsDir: string;
  skillDir: string;
  indexPath: string;
  jsonlPath: string;
  logPath: string;
  engine: WikiPatternHarvesterEngine;
}

function makeEnv(tag: string): TestEnv {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `wiki-harvest-${tag}-`));
  const patternsDir = path.join(root, "knowledge", "wiki", "patterns");
  const skillDir = path.join(root, "commands");
  const indexPath = path.join(root, "knowledge", "wiki", "index.md");
  const jsonlPath = path.join(root, "knowledge", "wiki", "index.jsonl");
  const logPath = path.join(root, "knowledge", "wiki", "log.md");
  fs.mkdirSync(patternsDir, { recursive: true });
  fs.mkdirSync(skillDir, { recursive: true });
  fs.mkdirSync(path.dirname(indexPath), { recursive: true });
  fs.writeFileSync(indexPath, "# Wiki Index\n\n_Last updated: 2026-04-27_\n\n");
  fs.writeFileSync(logPath, "# Wiki Log\n\n");
  const engine = new WikiPatternHarvesterEngine({
    indexEngine: new WikiIndexMaintainerEngine(indexPath, jsonlPath),
    logEngine: new WikiLogAppenderEngine(logPath),
  });
  return { root, patternsDir, skillDir, indexPath, jsonlPath, logPath, engine };
}

function cleanup(env: TestEnv) {
  try {
    fs.rmSync(env.root, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

const REAL_MACRO_REPORT = {
  variables: [
    { name: "VC1", usage: "part_counter", frequency: 12 },
    { name: "VC100", usage: "tool_offset", frequency: 8 },
    { name: "VC50", usage: "loop_index", frequency: 3 },
  ],
  rpmFormulas: [
    { formula: "S=3.82*SFM/D", description: "imperial SFM->RPM", count: 42 },
    { formula: "S=318*VC/D", description: "metric VC->RPM", count: 6 },
  ],
};

const REAL_MILL_REPORT = {
  pockets: [
    { strategy: "trochoidal", frequency: 7, description: "Trochoidal milling for slot" },
    { strategy: "spiral", frequency: 3, description: "Spiral entry for pocket" },
  ],
  cannedCycles: [
    { code: "G83", frequency: 25 },
    { code: "G81", frequency: 4 },
  ],
};

const REAL_SAFETY_REPORT = {
  speedClamps: [
    { rpm: 6000, frequency: 18, description: "Hard cap @ 6000 RPM" },
    { rpm: 4000, frequency: 2, description: "Soft cap @ 4000 RPM" },
  ],
  stops: [
    { code: "M00", frequency: 11, description: "Programmed stop after roughing" },
  ],
};

const REAL_SELF_IMPROVEMENT_REPORT = {
  patterns: [
    {
      id: "rep-fail-cad-001",
      description: "CAD import failed 9x in 24h on STEP files",
      frequency: 9,
      priority: 0.92,
      severity: "high",
      suggested_fix: "engine",
      fix_description: "Add STEP fallback parser to CADImportEngine",
      domain: "cad",
    },
    {
      id: "qual-gap-rough-002",
      description: "Quality regression on RoughingEngine",
      frequency: 4,
      priority: 0.50,
      severity: "medium",
      suggested_fix: "test",
      fix_description: "Add chip-thickness regression test",
      domain: "milling",
    },
  ],
};

// ============================================================================
// TESTS
// ============================================================================

describe("slugify", () => {
  it("normalises punctuation and whitespace to single dashes", () => {
    expect(slugify("Macro RPM Formula!")).toStrictEqual("macro-rpm-formula");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--foo--bar--")).toStrictEqual("foo-bar");
  });

  it("caps slug length to 80 chars", () => {
    const long = "x".repeat(120);
    expect(slugify(long).length).toStrictEqual(80);
  });
});

describe("scorePatternConfidence", () => {
  it("returns the caller value when supplied", () => {
    const p: HarvestedPattern = {
      id: "p", source: "macro", name: "p", frequency: 1, confidence: 0.7, description: "x",
    };
    expect(scorePatternConfidence(p, 100)).toStrictEqual(0.7);
  });

  it("falls back to relative frequency when no confidence given", () => {
    const p: HarvestedPattern = { id: "p", source: "macro", name: "p", frequency: 50, description: "x" };
    expect(scorePatternConfidence(p, 100)).toStrictEqual(0.5);
  });

  it("clamps caller-supplied confidence above 1 down to 1", () => {
    const p: HarvestedPattern = {
      id: "p", source: "macro", name: "p", frequency: 0, confidence: 5, description: "x",
    };
    expect(scorePatternConfidence(p, 100)).toStrictEqual(1);
  });

  it("clamps negative confidence up to 0", () => {
    const p: HarvestedPattern = {
      id: "p", source: "macro", name: "p", frequency: 1, confidence: -0.5, description: "x",
    };
    expect(scorePatternConfidence(p, 100)).toStrictEqual(0);
  });
});

describe("WikiPatternHarvesterEngine constants", () => {
  it("matches the milestone-mandated confidence threshold of 0.85", () => {
    expect(SKILL_STUB_CONFIDENCE_FLOOR).toStrictEqual(0.85);
  });

  it("matches the milestone-mandated frequency threshold of 5 occurrences", () => {
    expect(SKILL_STUB_FREQUENCY_FLOOR).toStrictEqual(5);
  });
});

describe("WikiPatternHarvesterEngine.normaliseMacro", () => {
  it("preserves frequency, source, and metadata for variable patterns", () => {
    const env = makeEnv("nm-macro");
    const out = env.engine.normaliseMacro(REAL_MACRO_REPORT);
    cleanup(env);
    const counter = out.find((e) => e.id === "macro-var-VC1");
    expect(counter?.frequency).toStrictEqual(12);
    expect(counter?.source).toStrictEqual("macro");
    expect(counter?.metadata?.usage).toStrictEqual("part_counter");
  });

  it("emits one record per RPM formula with the correct count", () => {
    const env = makeEnv("nm-macro-rpm");
    const out = env.engine.normaliseMacro(REAL_MACRO_REPORT);
    cleanup(env);
    const rpmEntries = out.filter((e) => e.id.startsWith("macro-rpm-"));
    expect(rpmEntries.length).toStrictEqual(2);
    const sfm = rpmEntries.find((e) => e.frequency === 42);
    expect(sfm?.metadata?.formula).toStrictEqual("S=3.82*SFM/D");
  });
});

describe("WikiPatternHarvesterEngine.normaliseSelfImprovement", () => {
  it("uses priority as confidence", () => {
    const env = makeEnv("nm-self");
    const out = env.engine.normaliseSelfImprovement(REAL_SELF_IMPROVEMENT_REPORT);
    cleanup(env);
    const high = out.find((p) => p.id === "self-rep-fail-cad-001");
    expect(high?.confidence).toStrictEqual(0.92);
    expect(high?.frequency).toStrictEqual(9);
    expect(high?.metadata?.severity).toStrictEqual("high");
  });

  it("emits one record per source pattern (no synthesis)", () => {
    const env = makeEnv("nm-self-len");
    const out = env.engine.normaliseSelfImprovement(REAL_SELF_IMPROVEMENT_REPORT);
    cleanup(env);
    expect(out.length).toStrictEqual(2);
  });
});

describe("WikiPatternHarvesterEngine.harvest — file emission", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("emit"); });
  afterEach(() => cleanup(env));

  it("writes one markdown file per pattern", async () => {
    const patterns = env.engine.normaliseMacro(REAL_MACRO_REPORT);
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.totalPatterns).toStrictEqual(patterns.length);
    expect(report.filesWritten).toStrictEqual(patterns.length);
  });

  it("emits frontmatter with source_miner and frequency fields", async () => {
    const patterns = env.engine.normaliseMacro(REAL_MACRO_REPORT);
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    const counterFile = path.join(env.patternsDir, "miner-macro-macro-var-vc1.md");
    expect(fs.existsSync(counterFile)).toStrictEqual(true);
    const body = fs.readFileSync(counterFile, "utf8");
    expect(body.startsWith("---\n")).toStrictEqual(true);
    expect(body.includes("source_miner: macro")).toStrictEqual(true);
    expect(body.includes("frequency: 12")).toStrictEqual(true);
  });

  it("drops patterns missing required fields and records a warning", async () => {
    const partial: Partial<HarvestedPattern> = {
      id: "x", source: "macro", name: "x", description: "x",
    };
    const broken = [partial as HarvestedPattern, {
      id: "y", source: "macro", name: "y", frequency: NaN, description: "y",
    } as HarvestedPattern];
    const report = await env.engine.harvest(broken, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.filesWritten).toStrictEqual(0);
    expect(report.warnings.length).toStrictEqual(2);
  });

  it("drops patterns with unknown source and records a warning", async () => {
    const bogus = [{
      id: "z", source: "fake-source", name: "z", frequency: 5, description: "z",
    } as unknown as HarvestedPattern];
    const report = await env.engine.harvest(bogus, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.filesWritten).toStrictEqual(0);
    expect(report.warnings.length).toStrictEqual(1);
  });
});

describe("WikiPatternHarvesterEngine.harvest — skill-stub gate", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("gate"); });
  afterEach(() => cleanup(env));

  it("emits a .draft skill stub when BOTH thresholds are crossed", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "high-conf-high-freq", source: "macro", name: "Frequent macro variable",
      frequency: 12, confidence: 0.92, description: "Variable VC1 used as part counter",
    }];
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.skillDraftsWritten).toStrictEqual(1);
    const draftPath = path.join(env.skillDir, "auto-high-conf-high-freq.md.draft");
    expect(fs.existsSync(draftPath)).toStrictEqual(true);
  });

  it("never writes the live .md skill — only the .draft variant", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "live-md-blocked", source: "macro", name: "x",
      frequency: 30, confidence: 0.9, description: "x",
    }];
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    const livePath = path.join(env.skillDir, "auto-live-md-blocked.md");
    expect(fs.existsSync(livePath)).toStrictEqual(false);
    const draftPath = path.join(env.skillDir, "auto-live-md-blocked.md.draft");
    expect(fs.existsSync(draftPath)).toStrictEqual(true);
  });

  it("draft body declares status:draft and the human-approval requirement", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "status-check", source: "macro", name: "x",
      frequency: 12, confidence: 0.9, description: "x",
    }];
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    const draftPath = path.join(env.skillDir, "auto-status-check.md.draft");
    const body = fs.readFileSync(draftPath, "utf8");
    expect(body.includes("status: draft")).toStrictEqual(true);
    expect(body.includes("requires human approval")).toStrictEqual(true);
  });

  it("does NOT emit a draft when frequency is below floor (4 < 5)", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "high-conf-low-freq", source: "macro", name: "Rare high-confidence",
      frequency: 4, confidence: 0.95, description: "Rare but confident",
    }];
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.skillDraftsWritten).toStrictEqual(0);
    expect(
      fs.existsSync(path.join(env.skillDir, "auto-high-conf-low-freq.md.draft"))
    ).toStrictEqual(false);
  });

  it("does NOT emit a draft when confidence is below floor (0.84 < 0.85)", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "low-conf-high-freq", source: "safety", name: "Borderline",
      frequency: 30, confidence: 0.84, description: "Borderline below threshold",
    }];
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.skillDraftsWritten).toStrictEqual(0);
  });

  it("emits when confidence equals the floor exactly (0.85, 5)", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "exact-floor", source: "macro", name: "x",
      frequency: 5, confidence: 0.85, description: "Exact threshold",
    }];
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(report.skillDraftsWritten).toStrictEqual(1);
  });

  it("respects skipSkillDrafts option even when thresholds cross", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "would-cross", source: "macro", name: "x",
      frequency: 30, confidence: 0.9, description: "x",
    }];
    const report = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir,
      skipSkillDrafts: true, today: "2026-04-27",
    });
    expect(report.skillDraftsWritten).toStrictEqual(0);
  });
});

describe("WikiPatternHarvesterEngine.harvest — idempotency", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("idem"); });
  afterEach(() => cleanup(env));

  it("second harvest run rewrites zero pattern files", async () => {
    const patterns = env.engine.normaliseSafety(REAL_SAFETY_REPORT);
    const first = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(first.filesWritten).toStrictEqual(patterns.length);
    const second = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(second.filesWritten).toStrictEqual(0);
  });

  it("second harvest run rewrites zero skill drafts", async () => {
    const patterns: HarvestedPattern[] = [{
      id: "idem-stub", source: "self-improvement", name: "x",
      frequency: 20, confidence: 0.9, description: "x",
    }];
    const first = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(first.skillDraftsWritten).toStrictEqual(1);
    const second = await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    expect(second.skillDraftsWritten).toStrictEqual(0);
  });
});

describe("WikiPatternHarvesterEngine.harvest — index + log integration", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("integ"); });
  afterEach(() => cleanup(env));

  it("appends exactly one audit log line per harvest run", async () => {
    const patterns = env.engine.normaliseMill(REAL_MILL_REPORT);
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir,
      today: "2026-04-27", agent: "claude:test-agent",
    });
    const log = fs.readFileSync(env.logPath, "utf8");
    const entries = log.match(/^## \[2026-04-27\] harvest:patterns/gm) ?? [];
    expect(entries.length).toStrictEqual(1);
  });

  it("attributes the audit line to the calling agent", async () => {
    const patterns = env.engine.normaliseMill(REAL_MILL_REPORT);
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir,
      today: "2026-04-27", agent: "claude:test-agent",
    });
    const log = fs.readFileSync(env.logPath, "utf8");
    expect(log.includes("by:claude:test-agent")).toStrictEqual(true);
  });

  it("upserts every pattern slug into wiki/index.md", async () => {
    const patterns = env.engine.normaliseMill(REAL_MILL_REPORT);
    await env.engine.harvest(patterns, {
      patternsDir: env.patternsDir, skillDraftDir: env.skillDir, today: "2026-04-27",
    });
    const index = fs.readFileSync(env.indexPath, "utf8");
    const slugCount = (index.match(/\[\[miner-mill-/g) ?? []).length;
    expect(slugCount).toStrictEqual(patterns.length);
  });
});
