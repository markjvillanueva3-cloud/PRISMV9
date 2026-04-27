/**
 * WikiCodingTribalEngine.test.ts — KNOWLEDGE-WIKI-MS0 / U-WIKI04B
 *
 * Tests the curator against a temp vault that mirrors the real
 * `knowledge/memories/` layout. Every memory page is a small but realistic
 * fixture (frontmatter + body) so the parser is exercised against actual
 * shapes, not mocked structs.
 *
 * Coverage:
 *   - All four sections populate (code-tribal, architecture,
 *     software-engineering, ux-design)
 *   - Each section meets the `MIN_ENTRIES_PER_SECTION` exit-condition floor
 *   - Required entries from milestone-spec are present in their target section
 *   - Frontmatter parser pulls name/description/type from real shapes
 *   - Missing source paths produce structured warnings (no silent skip)
 *   - Idempotency: second run rewrites zero index files
 *   - `web-audit:` pseudo-source emits the correct stub
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import {
  WikiCodingTribalEngine,
  DEFAULT_CURATOR_CONFIG,
  TRIBAL_SECTIONS,
  MIN_ENTRIES_PER_SECTION,
  parseFrontmatter,
  slugify,
  type TribalSection,
} from "../engines/WikiCodingTribalEngine.js";

// ============================================================================
// FIXTURES
// ============================================================================

interface TestEnv {
  vaultRoot: string;
  engine: WikiCodingTribalEngine;
}

function makeEnv(tag: string): TestEnv {
  const vaultRoot = fs.mkdtempSync(path.join(os.tmpdir(), `wiki-tribal-${tag}-`));
  fs.mkdirSync(path.join(vaultRoot, "memories", "feedback"), { recursive: true });
  fs.mkdirSync(path.join(vaultRoot, "memories", "project"), { recursive: true });
  fs.mkdirSync(path.join(vaultRoot, "memories", "reference"), { recursive: true });
  fs.mkdirSync(path.join(vaultRoot, "memories", "user"), { recursive: true });
  fs.mkdirSync(path.join(vaultRoot, "wiki"), { recursive: true });
  return { vaultRoot, engine: new WikiCodingTribalEngine() };
}

function cleanup(env: TestEnv) {
  try { fs.rmSync(env.vaultRoot, { recursive: true, force: true }); } catch { /* best-effort */ }
}

/** Write every page referenced by the default curator config so the section
 *  lists are complete. Bodies are realistic excerpts of the actual memories. */
function seedDefaultPages(vaultRoot: string) {
  const pages: Record<string, { name: string; description: string; type: string }> = {
    // code-tribal
    "memories/feedback/feedback_safety_critical_tests.md": {
      name: "Safety-critical tests must hit physics constants",
      description: "Never let physics constants drift from constants.ts via inline literals",
      type: "feedback",
    },
    "memories/feedback/feedback_dont_soften_completeness_gates.md": {
      name: "Don't soften completeness gates",
      description: "continueOnError:false on code-completeness-gate stays — they are correctness enforcers",
      type: "feedback",
    },
    "memories/feedback/feedback_no_delete_assets.md": {
      name: "Never delete assets",
      description: "Never delete or disable settings, hooks, skills, scripts, tools without explicit permission",
      type: "feedback",
    },
    "memories/feedback/feedback_always_build.md": {
      name: "Always build",
      description: "For roadmap engine work, always build every identified gap engine — never skip",
      type: "feedback",
    },
    "memories/feedback/feedback_ai_first_development.md": {
      name: "AI-first development",
      description: "User wants development to leverage PRISM AI reasoning by default",
      type: "feedback",
    },
    "memories/feedback/feedback_exhaustive_variability.md": {
      name: "Exhaustive variability",
      description: "Push capability coverage and test variability to maximum",
      type: "feedback",
    },
    "memories/feedback/feedback_hook_process_hygiene.md": {
      name: "Hook process hygiene",
      description: "Hooks must clean up subprocesses; no orphaned promises",
      type: "feedback",
    },
    "memories/feedback/feedback_post_development.md": {
      name: "Post-development",
      description: "Always run inventory refresh and tests after milestone units",
      type: "feedback",
    },
    "memories/feedback/feedback_verbose_ok.md": {
      name: "Verbose OK",
      description: "Verbose output preferred when debugging hooks/tests",
      type: "feedback",
    },
    "memories/feedback/feedback_cross_session_duplication.md": {
      name: "Cross-session duplication",
      description: "DuplicationGuardEngine must persist to cross-session registry",
      type: "feedback",
    },
    "memories/feedback/feedback_box_programs_amateur.md": {
      name: "Box programs amateur",
      description: "Box drive CNC programs were amateur — only mine structural patterns, not S/F",
      type: "feedback",
    },
    "memories/feedback/feedback_shop_programs_amateur.md": {
      name: "Shop programs amateur",
      description: "Shop archive programs are amateur — same caveat as box programs",
      type: "feedback",
    },
    // architecture
    "memories/reference/plugin_architecture.md": {
      name: "Plugin architecture",
      description: "BaseEngine + dispatcher pattern; CRA-shaped plugin contract",
      type: "reference",
    },
    "memories/reference/distributed_locking.md": {
      name: "Distributed locking",
      description: "DistributedLockManager.withLock for cross-agent file locks",
      type: "reference",
    },
    "memories/reference/devops_improvements.md": {
      name: "DevOps improvements",
      description: "CI/CD pipeline + nightly workflow conventions",
      type: "reference",
    },
    "memories/reference/prism_commands.md": {
      name: "PRISM commands",
      description: "Slash command manifest pointer",
      type: "reference",
    },
    "memories/reference/reference_prism_inventory.md": {
      name: "PRISM inventory",
      description: "Where to read live engine/dispatcher counts",
      type: "reference",
    },
    "memories/project/jm-die-shop.md": {
      name: "JM Die shop",
      description: "Test shop topology: 21 machines, 100+ customers",
      type: "project",
    },
    "memories/project/project_pp_agi_s0.md": {
      name: "PP AGI S0",
      description: "Stage-0 AGI project state",
      type: "project",
    },
    "memories/project/token_saving_infrastructure.md": {
      name: "Token saving infra",
      description: "RTK + Ollama routing for token economy",
      type: "project",
    },
    "memories/project/project_psau_foresight.md": {
      name: "PSAU Foresight",
      description: "Foresight stack pre-build planning",
      type: "project",
    },
    "memories/project/project_archive_outdated.md": {
      name: "Archive outdated",
      description: "Plans-archive paths to ignore",
      type: "project",
    },
    // software-engineering
    "memories/feedback/feedback_backend_before_frontend.md": {
      name: "Backend before frontend",
      description: "Perfect backend EDM physics before any frontend",
      type: "feedback",
    },
    "memories/feedback/feedback_esbuild_externals.md": {
      name: "esbuild externals",
      description: "ws, node-opcua, occt-import-js must be externalized",
      type: "feedback",
    },
    "memories/feedback/feedback_esm_toplevel_return.md": {
      name: "ESM top-level return",
      description: "Hooks are .mjs ES modules; top-level return is a parse error",
      type: "feedback",
    },
    "memories/feedback/feedback_roadmap_track.md": {
      name: "Roadmap track",
      description: "Single roadmap source of truth",
      type: "feedback",
    },
    "memories/feedback/feedback_h_drive_master.md": {
      name: "H drive master",
      description: "H: drive is master across multiple PCs",
      type: "feedback",
    },
    "memories/feedback/feedback_h_drive_portable.md": {
      name: "H drive portable",
      description: "Portable SSD workflow conventions",
      type: "feedback",
    },
    "memories/feedback/feedback_docker_wsl_recovery.md": {
      name: "Docker WSL recovery",
      description: "Check com.docker.service first when Docker won't launch",
      type: "feedback",
    },
    "memories/project/project_portable_ssd_current_pc.md": {
      name: "Portable SSD current PC",
      description: "Which PC is currently running off the portable SSD",
      type: "project",
    },
    // ux-design
    "memories/feedback/feedback_frontend_codex.md": {
      name: "Frontend codex",
      description: "Never build over Codex frontend pages",
      type: "feedback",
    },
    "memories/feedback/feedback_ppg_frontend.md": {
      name: "PPG frontend",
      description: "PPG frontend rules — borders, density, contrast",
      type: "feedback",
    },
    "memories/feedback/feedback_lightsaber_borders.md": {
      name: "Lightsaber borders",
      description: "Lightsaber-style border treatment for active panels",
      type: "feedback",
    },
    "memories/feedback/feedback_ppg_quality.md": {
      name: "PPG quality",
      description: "PPG quality bar — animations, sound, motion",
      type: "feedback",
    },
  };

  for (const [rel, fm] of Object.entries(pages)) {
    const abs = path.join(vaultRoot, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const body = `---\nname: ${fm.name}\ndescription: ${fm.description}\ntype: ${fm.type}\n---\n\nBody for ${fm.name}.\n`;
    fs.writeFileSync(abs, body);
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe("slugify", () => {
  it("normalises punctuation and whitespace to single dashes", () => {
    expect(slugify("Plugin Architecture!")).toStrictEqual("plugin-architecture");
  });

  it("strips leading and trailing dashes", () => {
    expect(slugify("--ux--design--")).toStrictEqual("ux-design");
  });
});

describe("parseFrontmatter", () => {
  it("extracts name, description, and type from a real memory shape", () => {
    const raw =
      "---\nname: Always build\ndescription: For roadmap engine work, always build every identified gap engine\ntype: feedback\n---\n\nBody text.\n";
    const fm = parseFrontmatter(raw, "fallback");
    expect(fm.name).toStrictEqual("Always build");
    expect(fm.description).toStrictEqual(
      "For roadmap engine work, always build every identified gap engine"
    );
    expect(fm.type).toStrictEqual("feedback");
  });

  it("falls back to filename for name when frontmatter has no name field", () => {
    const raw = "---\ndescription: x\n---\n\nBody.\n";
    const fm = parseFrontmatter(raw, "fallback-stem");
    expect(fm.name).toStrictEqual("fallback-stem");
  });

  it("falls back to first non-heading body line when description missing", () => {
    const raw = "---\nname: x\ntype: feedback\n---\n\n# Heading\n\nBody first line is here.\n";
    const fm = parseFrontmatter(raw, "x");
    expect(fm.description).toStrictEqual("Body first line is here.");
  });

  it("strips surrounding quotes from frontmatter values", () => {
    const raw = '---\nname: "Quoted name"\ndescription: \'singled\'\ntype: feedback\n---\n';
    const fm = parseFrontmatter(raw, "x");
    expect(fm.name).toStrictEqual("Quoted name");
    expect(fm.description).toStrictEqual("singled");
  });
});

describe("WikiCodingTribalEngine constants", () => {
  it("requires at least 10 entries per section per milestone exit condition", () => {
    expect(MIN_ENTRIES_PER_SECTION).toStrictEqual(10);
  });

  it("declares all four required tribal sections", () => {
    expect(TRIBAL_SECTIONS).toStrictEqual([
      "code-tribal",
      "architecture",
      "software-engineering",
      "ux-design",
    ]);
  });

  it("default curator config covers every section", () => {
    for (const s of TRIBAL_SECTIONS) {
      expect(Array.isArray(DEFAULT_CURATOR_CONFIG[s])).toStrictEqual(true);
      expect(DEFAULT_CURATOR_CONFIG[s].length >= MIN_ENTRIES_PER_SECTION).toStrictEqual(true);
    }
  });
});

describe("WikiCodingTribalEngine.curate — populates every section", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeEnv("populate");
    seedDefaultPages(env.vaultRoot);
  });
  afterEach(() => cleanup(env));

  it("writes one index.md per section", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    expect(report.sections.length).toStrictEqual(4);
    for (const s of report.sections) {
      expect(fs.existsSync(s.indexPath)).toStrictEqual(true);
      expect(s.written).toStrictEqual(true);
    }
  });

  it("each section meets the >= 10 entries floor", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    for (const s of report.sections) {
      expect(s.meetsMinimum).toStrictEqual(true);
      expect(s.entries.length >= MIN_ENTRIES_PER_SECTION).toStrictEqual(true);
    }
  });

  it("includes the milestone-mandated entries in code-tribal", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const codeTribal = report.sections.find((s) => s.section === "code-tribal");
    const sources = codeTribal?.entries.map((e) => e.source) ?? [];
    expect(sources.includes("memories/feedback/feedback_safety_critical_tests.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_dont_soften_completeness_gates.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_no_delete_assets.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_always_build.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_ai_first_development.md")).toStrictEqual(true);
  });

  it("includes the milestone-mandated entries in architecture", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const arch = report.sections.find((s) => s.section === "architecture");
    const sources = arch?.entries.map((e) => e.source) ?? [];
    expect(sources.includes("memories/reference/plugin_architecture.md")).toStrictEqual(true);
    expect(sources.includes("memories/reference/distributed_locking.md")).toStrictEqual(true);
    expect(sources.includes("memories/reference/devops_improvements.md")).toStrictEqual(true);
  });

  it("includes the milestone-mandated entries in ux-design", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const ux = report.sections.find((s) => s.section === "ux-design");
    const sources = ux?.entries.map((e) => e.source) ?? [];
    expect(sources.includes("memories/feedback/feedback_frontend_codex.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_ppg_frontend.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_lightsaber_borders.md")).toStrictEqual(true);
    expect(sources.includes("memories/feedback/feedback_ppg_quality.md")).toStrictEqual(true);
  });

  it("emits web-audit pseudo-entries in ux-design", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const ux = report.sections.find((s) => s.section === "ux-design");
    const auditCount = ux?.entries.filter((e) => e.type === "audit").length ?? 0;
    expect(auditCount).toStrictEqual(6);
  });

  it("renders frontmatter into each section index", async () => {
    await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27", agent: "claude:tribal-test" });
    const codeTribalIndex = fs.readFileSync(
      path.join(env.vaultRoot, "wiki", "code-tribal", "index.md"),
      "utf8"
    );
    expect(codeTribalIndex.startsWith("---\n")).toStrictEqual(true);
    expect(codeTribalIndex.includes("section: code-tribal")).toStrictEqual(true);
    expect(codeTribalIndex.includes("verified_by: claude:tribal-test")).toStrictEqual(true);
  });
});

describe("WikiCodingTribalEngine.curate — missing source handling", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeEnv("missing");
    seedDefaultPages(env.vaultRoot);
    // Delete one source to simulate a vault with a stale curator path.
    fs.unlinkSync(path.join(env.vaultRoot, "memories/feedback/feedback_always_build.md"));
  });
  afterEach(() => cleanup(env));

  it("records missing sources without aborting the section", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const codeTribal = report.sections.find((s) => s.section === "code-tribal");
    expect(codeTribal?.missing.includes("memories/feedback/feedback_always_build.md")).toStrictEqual(true);
    // Section still meets minimum because we seeded 12 sources.
    expect(codeTribal?.entries.length >= MIN_ENTRIES_PER_SECTION).toStrictEqual(true);
  });

  it("emits a warning per missing source", async () => {
    const report = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    const matching = report.warnings.filter((w) => w.includes("feedback_always_build"));
    expect(matching.length).toStrictEqual(1);
  });
});

describe("WikiCodingTribalEngine.curate — idempotency", () => {
  let env: TestEnv;
  beforeEach(() => {
    env = makeEnv("idem");
    seedDefaultPages(env.vaultRoot);
  });
  afterEach(() => cleanup(env));

  it("second curate run rewrites zero index files", async () => {
    const first = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    expect(first.totalWritten).toStrictEqual(4);
    const second = await env.engine.curate({ vaultRoot: env.vaultRoot, today: "2026-04-27" });
    expect(second.totalWritten).toStrictEqual(0);
  });
});

describe("WikiCodingTribalEngine.loadEntry — web-audit pseudo-source", () => {
  let env: TestEnv;
  beforeEach(() => { env = makeEnv("audit"); });
  afterEach(() => cleanup(env));

  it("emits a structured audit record without touching disk", () => {
    const sec: TribalSection = "ux-design";
    const entry = env.engine.loadEntry(sec, "web-audit:mcp-server/web/dashboard.html", env.vaultRoot);
    expect(entry?.type).toStrictEqual("audit");
    expect(entry?.slug).toStrictEqual("audit-dashboard");
    expect(entry?.source).toStrictEqual("web-audit:mcp-server/web/dashboard.html");
  });
});
