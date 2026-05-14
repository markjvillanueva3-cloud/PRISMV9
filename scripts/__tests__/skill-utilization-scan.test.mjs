/**
 * skill-utilization-scan.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-H2.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes (missing registry / malformed registry / non-array skills)
 *   - >= 2 adversarial inputs (NaN window, negative invocation, future last_refined)
 *   - >= 3 spanning variability configs (all-active / all-archive / mixed tiers)
 *   - round-trip CLI invocation via main() — real file I/O
 *
 * Real reference values — no toBeDefined() / toBeUndefined() stubs.
 *
 * Spec: mcp-server/data/milestones/CLEANUP-MS0.json U-CLEANUP-H2.
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
  classifySkill,
  buildReport,
  renderMarkdown,
  main,
  STATUS,
  _internals,
} from "../skill-utilization-scan.mjs";

const NOW = "2026-05-14T00:00:00.000Z";
const ONE_DAY_AGO = "2026-05-13T00:00:00.000Z";
const FORTY_DAYS_AGO = "2026-04-04T00:00:00.000Z";

// ──────────────────────────────────────────────────────────────────────
// Fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "skill-util-"));
  mkdirSync(join(root, "state/shared/registries"), { recursive: true });
  mkdirSync(join(root, "skills"), { recursive: true });
  return root;
}

function writeRegistry(root, body) {
  writeFileSync(
    join(root, "state/shared/registries/SKILL_QUALITY_REGISTRY.json"),
    JSON.stringify(body),
    "utf-8",
  );
}

function writeLint(root, body) {
  writeFileSync(
    join(root, "state/shared/skill-lint-report.json"),
    JSON.stringify(body),
    "utf-8",
  );
}

function writeSkillFile(root, name, body = `# ${name}\n`) {
  const path = join(root, "skills", `${name}.md`);
  writeFileSync(path, body, "utf-8");
  return path;
}

function makeSkill(name, opts = {}) {
  return {
    name,
    path: opts.path ?? `H:/skills/${name}.md`,
    tier: opts.tier ?? "user",
    description: opts.description ?? `${name} skill`,
    quality: {
      last_refined: opts.last_refined ?? null,
      invocation_count_30d: opts.invocation_count_30d ?? null,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.help).toBe(false);
    expect(a.windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(a.frozenTime).toBe(null);
    expect(a.registryPath).toBe(null);
  });

  it("all flags", () => {
    const a = parseArgs([
      "--json",
      "--frozen-time", NOW,
      "--window-days", "60",
      "--registry", "/r",
      "--lint", "/l",
      "--out-md", "/md",
      "--out-json", "/json",
    ]);
    expect(a.json).toBe(true);
    expect(a.frozenTime).toBe(NOW);
    expect(a.windowDays).toBe(60);
    expect(a.registryPath).toBe("/r");
    expect(a.lintPath).toBe("/l");
    expect(a.outMd).toBe("/md");
    expect(a.outJson).toBe("/json");
  });

  it("--help / -h alias", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });

  it("--window-days rejects non-positive / non-finite", () => {
    expect(parseArgs(["--window-days", "abc"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "0"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "-5"]).windowDays).toBe(_internals.DEFAULT_WINDOW_DAYS);
    expect(parseArgs(["--window-days", "7"]).windowDays).toBe(7);
  });
});

// ──────────────────────────────────────────────────────────────────────
// classifySkill — pure
// ──────────────────────────────────────────────────────────────────────

describe("classifySkill — telemetry-driven", () => {
  it("invocation_count_30d == 0 → stale_30d", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: 0, last_refined: ONE_DAY_AGO }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.STALE_30D);
    expect(c.invocationCount30d).toBe(0);
  });

  it("invocation_count_30d >= 1 → active (even if mtime is old)", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: 12, last_refined: FORTY_DAYS_AGO }),
      mtimeIso: FORTY_DAYS_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.ACTIVE);
    expect(c.invocationCount30d).toBe(12);
  });
});

describe("classifySkill — mtime/last_refined fallback (no telemetry)", () => {
  it("activity within window + null telemetry → unknown_recent", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: ONE_DAY_AGO }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.UNKNOWN_RECENT);
    expect(c.activityAgeDays).toBe(1);
  });

  it("activity > window + null telemetry → unknown_stale", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: FORTY_DAYS_AGO }),
      mtimeIso: FORTY_DAYS_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.UNKNOWN_STALE);
    expect(c.activityAgeDays).toBe(40);
  });

  it("picks freshest of mtime vs last_refined", () => {
    // mtime fresher than last_refined → activitySource = mtime
    const c1 = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: FORTY_DAYS_AGO }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c1.activitySource).toBe("mtime");
    expect(c1.activityAgeDays).toBe(1);
    expect(c1.status).toBe(STATUS.UNKNOWN_RECENT);

    // last_refined fresher than mtime → activitySource = last_refined
    const c2 = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: ONE_DAY_AGO }),
      mtimeIso: FORTY_DAYS_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c2.activitySource).toBe("last_refined");
    expect(c2.activityAgeDays).toBe(1);
    expect(c2.status).toBe(STATUS.UNKNOWN_RECENT);
  });

  it("only mtime present → mtime source", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: null }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.activitySource).toBe("mtime");
    expect(c.status).toBe(STATUS.UNKNOWN_RECENT);
  });

  it("only last_refined present → last_refined source", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: ONE_DAY_AGO }),
      mtimeIso: null,
      nowIso: NOW,
      windowDays: 30,
    });
    // mtimeIso=null → no_path branch triggers
    expect(c.status).toBe(STATUS.NO_PATH);
  });
});

describe("classifySkill — disk presence", () => {
  it("no mtime + path empty → no_path", () => {
    const c = classifySkill({
      skill: { name: "x", path: "", quality: {} },
      mtimeIso: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.NO_PATH);
    expect(c.onDisk).toBe(false);
  });

  it("registry path present but file missing → no_path", () => {
    const c = classifySkill({
      skill: makeSkill("x"),
      mtimeIso: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.status).toBe(STATUS.NO_PATH);
    expect(c.onDisk).toBe(false);
  });
});

describe("classifySkill — adversarial inputs", () => {
  it("NaN windowDays leaves classification non-crashing (treats as unknown)", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: ONE_DAY_AGO }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: Number.NaN,
    });
    // NaN > any number is false → stays unknown_recent
    expect(c.status).toBe(STATUS.UNKNOWN_RECENT);
  });

  it("non-finite invocation_count_30d treated as null", () => {
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: Number.NaN, last_refined: ONE_DAY_AGO }),
      mtimeIso: ONE_DAY_AGO,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.invocationCount30d).toBe(null);
    expect(c.status).toBe(STATUS.UNKNOWN_RECENT);
  });

  it("future last_refined gracefully clamps age to 0", () => {
    const future = "2030-01-01T00:00:00.000Z";
    const c = classifySkill({
      skill: makeSkill("x", { invocation_count_30d: null, last_refined: future }),
      mtimeIso: future,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(c.activityAgeDays).toBe(0);
    expect(c.status).toBe(STATUS.UNKNOWN_RECENT);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildReport — variability axes
// ──────────────────────────────────────────────────────────────────────

describe("buildReport — variability cohorts", () => {
  // Cohort 1 of 3 — all active (telemetry populated everywhere)
  it("all-active cohort", () => {
    const classifiedSkills = [
      classifySkill({
        skill: makeSkill("a", { invocation_count_30d: 5, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
      classifySkill({
        skill: makeSkill("b", { invocation_count_30d: 12, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
    ];
    const r = buildReport({
      classifiedSkills,
      registry: { skills: [], parseFailures: 0 },
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.counts.active).toBe(2);
    expect(r.proposedArchive.length).toBe(0);
    expect(r.totals.telemetryAvailable).toBe(2);
    expect(r.active[0].name).toBe("b"); // sorted desc by invocation count
  });

  // Cohort 2 of 3 — all-archive (telemetry zero / mtime old)
  it("all-archive cohort", () => {
    const classifiedSkills = [
      classifySkill({
        skill: makeSkill("a", { invocation_count_30d: 0, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
      classifySkill({
        skill: makeSkill("b", { invocation_count_30d: null, last_refined: FORTY_DAYS_AGO }),
        mtimeIso: FORTY_DAYS_AGO, nowIso: NOW, windowDays: 30,
      }),
    ];
    const r = buildReport({
      classifiedSkills,
      registry: { skills: [] },
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.proposedArchive.length).toBe(2);
    expect(r.counts.stale_30d).toBe(1);
    expect(r.counts.unknown_stale).toBe(1);
    // Sorted by age desc: b (40d) before a (1d)
    expect(r.proposedArchive[0].name).toBe("b");
  });

  // Cohort 3 of 3 — mixed tiers
  it("mixed-tier cohort tracks per-tier totals + archive counts", () => {
    const classifiedSkills = [
      classifySkill({
        skill: makeSkill("user-a", { tier: "user", invocation_count_30d: 0, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
      classifySkill({
        skill: makeSkill("user-b", { tier: "user", invocation_count_30d: 7, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
      classifySkill({
        skill: makeSkill("proj-c", { tier: "project", invocation_count_30d: null, last_refined: FORTY_DAYS_AGO }),
        mtimeIso: FORTY_DAYS_AGO, nowIso: NOW, windowDays: 30,
      }),
    ];
    const r = buildReport({
      classifiedSkills,
      registry: { skills: [] },
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.byTier.user.total).toBe(2);
    expect(r.byTier.user.proposed_archive).toBe(1);
    expect(r.byTier.user.active).toBe(1);
    expect(r.byTier.project.total).toBe(1);
    expect(r.byTier.project.proposed_archive).toBe(1);
    expect(r.byTier.project.active).toBe(0);
  });
});

describe("buildReport — surfaces", () => {
  it("emits telemetry-null note when no skill has invocation_count_30d set", () => {
    const cs = [
      classifySkill({
        skill: makeSkill("x", { invocation_count_30d: null, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
    ];
    const r = buildReport({
      classifiedSkills: cs,
      registry: {},
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.notes.some((n) => n.includes("invocation_count_30d is null"))).toBe(true);
    expect(r.totals.telemetryAvailable).toBe(0);
  });

  it("forwards registry parseFailures to notes", () => {
    const r = buildReport({
      classifiedSkills: [],
      registry: { parseFailures: 4 },
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.notes.some((n) => n.includes("4 parseFailures"))).toBe(true);
  });

  it("lintHook.available reflects presence + counts issues[]", () => {
    const r = buildReport({
      classifiedSkills: [],
      registry: {},
      lintReport: { issues: [{ s: "x" }, { s: "y" }, { s: "z" }] },
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.lintHook.available).toBe(true);
    expect(r.lintHook.problems).toBe(3);
  });

  it("lintHook.problems uses totalIssues fallback when issues[] missing", () => {
    const r = buildReport({
      classifiedSkills: [],
      registry: {},
      lintReport: { totalIssues: 17 },
      nowIso: NOW,
      windowDays: 30,
    });
    expect(r.lintHook.problems).toBe(17);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes summary, status counts, proposed archive table", () => {
    const cs = [
      classifySkill({
        skill: makeSkill("zztop", { invocation_count_30d: null, last_refined: FORTY_DAYS_AGO }),
        mtimeIso: FORTY_DAYS_AGO, nowIso: NOW, windowDays: 30,
      }),
      classifySkill({
        skill: makeSkill("aapl", { invocation_count_30d: 50, last_refined: ONE_DAY_AGO }),
        mtimeIso: ONE_DAY_AGO, nowIso: NOW, windowDays: 30,
      }),
    ];
    const r = buildReport({
      classifiedSkills: cs,
      registry: {},
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# Skill Utilization Audit");
    expect(md).toContain("Window: 30 days");
    expect(md).toContain("Proposed archive candidates");
    expect(md).toContain("zztop");
    expect(md).toContain("Top 10 active skills");
    expect(md).toContain("aapl");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-H2");
  });

  it("no-archive path emits 'no proposed archive candidates'", () => {
    const r = buildReport({
      classifiedSkills: [],
      registry: {},
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("no proposed archive candidates");
  });

  it("no-lint path emits 'skill-lint-report.json not present' note", () => {
    const r = buildReport({
      classifiedSkills: [],
      registry: {},
      lintReport: null,
      nowIso: NOW,
      windowDays: 30,
    });
    const md = renderMarkdown(r);
    expect(md).toContain("skill-lint-report.json not present");
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

  it("writes report from registry of mixed-state skills", async () => {
    // Put real files on disk + corresponding registry entries.
    const pActive = writeSkillFile(root, "skill-active");
    const pArchive = writeSkillFile(root, "skill-archive");
    writeRegistry(root, {
      schemaVersion: "1.0.0",
      total: 2,
      skills: [
        {
          name: "skill-active",
          path: pActive,
          tier: "project",
          quality: { invocation_count_30d: 10, last_refined: ONE_DAY_AGO },
        },
        {
          name: "skill-archive",
          path: pArchive,
          tier: "user",
          quality: { invocation_count_30d: 0, last_refined: FORTY_DAYS_AGO },
        },
      ],
    });
    writeLint(root, { issues: [{ skill: "skill-active", code: "X" }] });

    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(0);

    const js = JSON.parse(
      readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.schemaVersion).toBe(1);
    expect(js.generatedAt).toBe(NOW);
    expect(js.totals.skills).toBe(2);
    expect(js.counts.active).toBe(1);
    expect(js.counts.stale_30d).toBe(1);
    expect(js.proposedArchive.length).toBe(1);
    expect(js.proposedArchive[0].name).toBe("skill-archive");
    expect(js.lintHook.available).toBe(true);
    expect(js.lintHook.problems).toBe(1);

    const md = readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.md"), "utf-8");
    expect(md).toContain("skill-archive");
    expect(md).toContain("skill-active");
  });

  it("--json writes nothing + emits JSON to stdout", async () => {
    writeRegistry(root, { skills: [] });
    const res = await main({
      argv: ["--json", "--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.md"))).toBe(false);
    expect(existsSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"))).toBe(false);
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.totals.skills).toBe(0);
  });

  it("--help short-circuits", async () => {
    writeRegistry(root, { skills: [] });
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("Skill utilization audit");
  });

  it("fatal when registry missing", async () => {
    // no registry written
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL.*SKILL_QUALITY_REGISTRY/);
  });

  it("malformed registry JSON → exit 1", async () => {
    writeFileSync(
      join(root, "state/shared/registries/SKILL_QUALITY_REGISTRY.json"),
      "{not-json",
      "utf-8",
    );
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
    });
    expect(res.exitCode).toBe(1);
  });

  it("skills not an array → empty classification, exit 0", async () => {
    writeRegistry(root, { skills: "not-an-array" });
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.totals.skills).toBe(0);
  });

  it("--window-days override propagates to JSON report", async () => {
    const pStale = writeSkillFile(root, "stale-7d");
    // Age the file's mtime to 2026-05-05 (9 days before NOW=2026-05-14)
    // so both mtime + last_refined are stale. Otherwise classifier picks the
    // just-written file's mtime (≈now) and the skill looks fresh.
    const staleEpoch = Date.parse("2026-05-05T00:00:00.000Z") / 1000;
    utimesSync(pStale, staleEpoch, staleEpoch);
    writeRegistry(root, {
      skills: [
        {
          name: "stale-7d",
          path: pStale,
          tier: "user",
          quality: { invocation_count_30d: null, last_refined: "2026-05-05T00:00:00.000Z" },
        },
      ],
    });
    // 9 days ago — under 30-day default (unknown_recent),
    // but over 7-day window (unknown_stale)
    const res = await main({
      argv: ["--frozen-time", NOW, "--window-days", "7"],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.windowDays).toBe(7);
    expect(js.proposedArchive.length).toBe(1);
    expect(js.proposedArchive[0].status).toBe(STATUS.UNKNOWN_STALE);
  });

  it("idempotent: re-running with same inputs produces identical files", async () => {
    const p = writeSkillFile(root, "x");
    writeRegistry(root, {
      skills: [
        {
          name: "x",
          path: p,
          tier: "user",
          quality: { invocation_count_30d: null, last_refined: ONE_DAY_AGO },
        },
      ],
    });
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md1 = readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.md"), "utf-8");
    const js1 = readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8");
    await main({ argv: ["--frozen-time", NOW], repo: root, out: () => {}, err: () => {} });
    const md2 = readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.md"), "utf-8");
    const js2 = readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8");
    expect(md1).toBe(md2);
    expect(js1).toBe(js2);
  });

  it("missing lint-report is non-fatal — lintHook.available=false", async () => {
    writeRegistry(root, { skills: [] });
    // no lint file
    const res = await main({
      argv: ["--frozen-time", NOW],
      repo: root,
      out: () => {},
      err: () => {},
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/SKILL_UTILIZATION_REPORT.json"), "utf-8"),
    );
    expect(js.lintHook.available).toBe(false);
    expect(js.lintHook.problems).toBe(null);
  });
});
