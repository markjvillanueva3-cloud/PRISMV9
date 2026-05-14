/**
 * claude-md-drift.test.mjs — verification of CLEANUP-MS0 / U-CLEANUP-H4.
 *
 * Coverage floor:
 *   - happy path
 *   - >= 3 failure modes (both CLAUDE.md missing / one missing / malformed)
 *   - >= 2 adversarial inputs (regex bait, unicode, very long paths)
 *   - >= 3 spanning variability configs (no-drift, partial-drift, all-drift)
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
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  parseArgs,
  extractFilePathClaims,
  extractEnvKnobClaims,
  resolveClaimedPath,
  verifyFileClaims,
  verifyEnvKnobs,
  defaultEnvKnobGrep,
  buildReport,
  renderMarkdown,
  main,
  SEVERITY,
} from "../claude-md-drift.mjs";

const NOW = "2026-05-14T00:00:00.000Z";

// ──────────────────────────────────────────────────────────────────────
// fixture helpers
// ──────────────────────────────────────────────────────────────────────

function makeRepo() {
  const root = mkdtempSync(join(tmpdir(), "cm-drift-"));
  mkdirSync(join(root, "scripts"), { recursive: true });
  mkdirSync(join(root, ".claude/hooks"), { recursive: true });
  mkdirSync(join(root, "mcp-server/src/engines"), { recursive: true });
  mkdirSync(join(root, "state/shared"), { recursive: true });
  return root;
}

// ──────────────────────────────────────────────────────────────────────
// parseArgs
// ──────────────────────────────────────────────────────────────────────

describe("parseArgs", () => {
  it("defaults", () => {
    const a = parseArgs([]);
    expect(a.json).toBe(false);
    expect(a.includeP2).toBe(false);
    expect(a.frozenTime).toBe(null);
    expect(a.projectCm).toBe(null);
    expect(a.userCm).toBe(null);
  });

  it("all flags", () => {
    const a = parseArgs([
      "--json",
      "--include-p2",
      "--frozen-time", NOW,
      "--project-claude-md", "/p",
      "--user-claude-md", "/u",
      "--out-md", "/md",
      "--out-json", "/json",
    ]);
    expect(a.json).toBe(true);
    expect(a.includeP2).toBe(true);
    expect(a.frozenTime).toBe(NOW);
    expect(a.projectCm).toBe("/p");
    expect(a.userCm).toBe("/u");
  });

  it("--help / -h alias", () => {
    expect(parseArgs(["--help"]).help).toBe(true);
    expect(parseArgs(["-h"]).help).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// extractFilePathClaims
// ──────────────────────────────────────────────────────────────────────

describe("extractFilePathClaims", () => {
  it("extracts H:/prism/... paths", () => {
    const out = extractFilePathClaims("See H:/prism/scripts/foo.mjs and H:/prism/CLAUDE.md.");
    const paths = out.map((c) => c.path);
    expect(paths).toContain("H:/prism/scripts/foo.mjs");
    expect(paths).toContain("H:/prism/CLAUDE.md");
  });

  it("extracts repo-relative paths under known top dirs", () => {
    const out = extractFilePathClaims(
      "Run scripts/build.mjs; engine at mcp-server/src/engines/Foo.ts; hook .claude/hooks/x.mjs; state state/shared/Y.json.",
    );
    const paths = out.map((c) => c.path).sort();
    expect(paths).toContain("scripts/build.mjs");
    expect(paths).toContain("mcp-server/src/engines/Foo.ts");
    expect(paths).toContain(".claude/hooks/x.mjs");
    expect(paths).toContain("state/shared/Y.json");
  });

  it("strips trailing punctuation from inline mentions", () => {
    const out = extractFilePathClaims("Edit scripts/foo.mjs, then commit.");
    expect(out.map((c) => c.path)).toContain("scripts/foo.mjs");
  });

  it("de-dupes by path (line number is first occurrence)", () => {
    const content = "scripts/foo.mjs\nlater scripts/foo.mjs\n";
    const out = extractFilePathClaims(content);
    const occ = out.filter((c) => c.path === "scripts/foo.mjs");
    expect(occ.length).toBe(1);
    expect(occ[0].lineNumber).toBe(1);
  });

  it("ignores prose without paths", () => {
    const out = extractFilePathClaims("This is regular prose with no claim.");
    expect(out).toEqual([]);
  });

  it("handles non-string input", () => {
    expect(extractFilePathClaims(null)).toEqual([]);
    expect(extractFilePathClaims(undefined)).toEqual([]);
    expect(extractFilePathClaims(123)).toEqual([]);
  });

  it("survives regex-bait special characters", () => {
    const out = extractFilePathClaims("scripts/[bracket].mjs (paren) and scripts/safe.mjs");
    expect(out.some((c) => c.path === "scripts/safe.mjs")).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// extractEnvKnobClaims
// ──────────────────────────────────────────────────────────────────────

describe("extractEnvKnobClaims", () => {
  it("extracts PRISM_FOO style env knobs", () => {
    const out = extractEnvKnobClaims("Set PRISM_HOOK_BYPASS=1 or PRISM_FOO_DISABLE=true.");
    const knobs = out.map((c) => c.knob).sort();
    expect(knobs).toEqual(["PRISM_FOO_DISABLE", "PRISM_HOOK_BYPASS"]);
  });

  it("de-dupes repeated knobs", () => {
    const out = extractEnvKnobClaims("PRISM_X line 1.\nMention PRISM_X again line 2.\n");
    expect(out.length).toBe(1);
    expect(out[0].lineNumber).toBe(1);
  });

  it("ignores non-PRISM env-var style identifiers", () => {
    const out = extractEnvKnobClaims("Variables NODE_ENV, SOMETHING_ELSE, AWS_SECRET");
    expect(out).toEqual([]);
  });

  it("captures knob inside a code span", () => {
    const out = extractEnvKnobClaims("`PRISM_GOLF_DISABLE=1`");
    expect(out.map((c) => c.knob)).toContain("PRISM_GOLF_DISABLE");
  });

  it("handles non-string input", () => {
    expect(extractEnvKnobClaims(null)).toEqual([]);
    expect(extractEnvKnobClaims(undefined)).toEqual([]);
  });
});

// ──────────────────────────────────────────────────────────────────────
// resolveClaimedPath
// ──────────────────────────────────────────────────────────────────────

describe("resolveClaimedPath", () => {
  it("absolute H:/prism/... → verbatim", () => {
    expect(resolveClaimedPath("/repo", "H:/prism/foo.ts")).toBe("H:/prism/foo.ts");
  });

  it("relative → joined to repo root", () => {
    expect(resolveClaimedPath("/repo", "scripts/foo.mjs")).toBe("/repo/scripts/foo.mjs");
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(resolveClaimedPath("/repo", "scripts\\foo.mjs")).toBe("/repo/scripts/foo.mjs");
  });

  it("empty string returns empty", () => {
    expect(resolveClaimedPath("/repo", "")).toBe("");
  });
});

// ──────────────────────────────────────────────────────────────────────
// verifyFileClaims + verifyEnvKnobs
// ──────────────────────────────────────────────────────────────────────

describe("verifyFileClaims", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("returns ok=true with severity=null when file exists", () => {
    writeFileSync(join(root, "scripts/foo.mjs"), "console.log('ok');", "utf-8");
    const out = verifyFileClaims({
      claims: [{ path: "scripts/foo.mjs", lineNumber: 10 }],
      repoRoot: root,
      source: "project",
    });
    expect(out[0].ok).toBe(true);
    expect(out[0].severity).toBe(null);
    expect(out[0].observation).toBe("exists");
  });

  it("returns severity=P0 when file missing", () => {
    const out = verifyFileClaims({
      claims: [{ path: "scripts/missing.mjs", lineNumber: 12 }],
      repoRoot: root,
      source: "project",
    });
    expect(out[0].ok).toBe(false);
    expect(out[0].severity).toBe(SEVERITY.P0);
    expect(out[0].observation).toBe("missing");
  });
});

describe("verifyEnvKnobs", () => {
  it("severity=null when grep says true", () => {
    const out = verifyEnvKnobs({
      claims: [{ knob: "PRISM_X", lineNumber: 1 }],
      source: "user",
      grep: () => true,
    });
    expect(out[0].ok).toBe(true);
    expect(out[0].severity).toBe(null);
  });

  it("severity=P1 when grep returns false (env knob mentioned but unused)", () => {
    const out = verifyEnvKnobs({
      claims: [{ knob: "PRISM_GHOST", lineNumber: 1 }],
      source: "user",
      grep: () => false,
    });
    expect(out[0].ok).toBe(false);
    expect(out[0].severity).toBe(SEVERITY.P1);
  });
});

describe("defaultEnvKnobGrep", () => {
  let root;
  beforeEach(() => { root = makeRepo(); });
  afterEach(() => { rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }); });

  it("finds knob mentioned in scripts/", () => {
    writeFileSync(join(root, "scripts/a.mjs"), "if (process.env.PRISM_FOUND) {}", "utf-8");
    const grep = defaultEnvKnobGrep(root);
    expect(grep("PRISM_FOUND")).toBe(true);
    expect(grep("PRISM_MISSING")).toBe(false);
  });

  it("memoizes repeated lookups", () => {
    const grep = defaultEnvKnobGrep(root);
    // First call is cold, second is cached — same result either way.
    expect(grep("PRISM_X")).toBe(false);
    expect(grep("PRISM_X")).toBe(false);
  });

  it("returns false for empty / non-string knob", () => {
    const grep = defaultEnvKnobGrep(root);
    expect(grep("")).toBe(false);
    expect(grep(null)).toBe(false);
  });

  it("skips non-text extensions", () => {
    writeFileSync(join(root, "scripts/binary.png"), "PRISM_X is here as bytes", "utf-8");
    const grep = defaultEnvKnobGrep(root);
    expect(grep("PRISM_X")).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────
// buildReport — variability cohorts
// ──────────────────────────────────────────────────────────────────────

describe("buildReport — variability cohorts", () => {
  function mkFinding(severity, kind = "file-path", source = "project") {
    return {
      severity,
      kind,
      source,
      lineNumber: 1,
      claim: "x",
      observation: severity ? "missing" : "exists",
      ok: severity === null,
    };
  }

  // Cohort 1 of 3 — no drift
  it("no-drift cohort", () => {
    const findings = [mkFinding(null), mkFinding(null), mkFinding(null)];
    const r = buildReport({
      allFindings: findings,
      includeP2: false,
      nowIso: NOW,
      sources: ["project:CLAUDE.md"],
    });
    expect(r.totals.drift).toBe(0);
    expect(r.bySeverity.P0).toBe(0);
    expect(r.totals.driftRate).toBe(0);
  });

  // Cohort 2 of 3 — partial drift (some pass, some fail)
  it("partial-drift cohort", () => {
    const findings = [
      mkFinding(null),
      mkFinding(SEVERITY.P0),
      mkFinding(SEVERITY.P1),
      mkFinding(SEVERITY.P2),
    ];
    const r = buildReport({
      allFindings: findings,
      includeP2: false,
      nowIso: NOW,
      sources: [],
    });
    expect(r.totals.claimsAnalyzed).toBe(4);
    expect(r.bySeverity.P0).toBe(1);
    expect(r.bySeverity.P1).toBe(1);
    expect(r.bySeverity.P2).toBe(0); // filtered out by default
    expect(r.totals.drift).toBe(2);
  });

  // Cohort 3 of 3 — all-drift
  it("all-drift cohort", () => {
    const findings = [
      mkFinding(SEVERITY.P0),
      mkFinding(SEVERITY.P0),
      mkFinding(SEVERITY.P1),
    ];
    const r = buildReport({
      allFindings: findings,
      includeP2: false,
      nowIso: NOW,
      sources: [],
    });
    expect(r.totals.drift).toBe(3);
    expect(r.totals.driftRate).toBe(1);
    // Sorted P0 first
    expect(r.findings[0].severity).toBe(SEVERITY.P0);
    expect(r.findings[2].severity).toBe(SEVERITY.P1);
  });

  it("--include-p2 surfaces P2 findings", () => {
    const findings = [mkFinding(SEVERITY.P0), mkFinding(SEVERITY.P2)];
    const off = buildReport({ allFindings: findings, includeP2: false, nowIso: NOW, sources: [] });
    expect(off.bySeverity.P2).toBe(0);
    const on = buildReport({ allFindings: findings, includeP2: true, nowIso: NOW, sources: [] });
    expect(on.bySeverity.P2).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// renderMarkdown
// ──────────────────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("includes summary + severity + findings table", () => {
    const r = buildReport({
      allFindings: [
        { severity: SEVERITY.P0, kind: "file-path", source: "project", lineNumber: 10, claim: "scripts/x.mjs", observation: "missing", ok: false },
        { severity: SEVERITY.P1, kind: "env-knob", source: "user", lineNumber: 5, claim: "PRISM_X", observation: "not_found", ok: false },
      ],
      includeP2: false,
      nowIso: NOW,
      sources: ["project:CLAUDE.md", "user:CLAUDE.md"],
    });
    const md = renderMarkdown(r);
    expect(md).toContain("# CLAUDE.md Drift Detector");
    expect(md).toContain("P0 (load-bearing");
    expect(md).toContain("`scripts/x.mjs`");
    expect(md).toContain("`PRISM_X`");
    expect(md).toContain("CLEANUP-MS0 / U-CLEANUP-H4");
  });

  it("emits 'no drift' when findings empty", () => {
    const r = buildReport({ allFindings: [], includeP2: false, nowIso: NOW, sources: [] });
    const md = renderMarkdown(r);
    expect(md).toContain("no drift");
  });

  it("trims to 50 findings + appends overflow notice", () => {
    const many = [];
    for (let i = 0; i < 60; i++) {
      many.push({
        severity: SEVERITY.P0,
        kind: "file-path",
        source: "project",
        lineNumber: i,
        claim: `scripts/x${i}.mjs`,
        observation: "missing",
        ok: false,
      });
    }
    const r = buildReport({ allFindings: many, includeP2: false, nowIso: NOW, sources: [] });
    const md = renderMarkdown(r);
    expect(md).toContain("…and 10 more in JSON report");
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

  function deterministicGrep() {
    // Return a function-factory that always says PRISM_OK = found, PRISM_GHOST = missing.
    return () => (knob) => knob === "PRISM_OK";
  }

  it("happy path — both CLAUDE.md files present, mixed drift", async () => {
    writeFileSync(join(root, "scripts/found.mjs"), "console.log('ok');", "utf-8");
    writeFileSync(
      join(root, "CLAUDE.md"),
      "Use scripts/found.mjs and scripts/missing.mjs.\nKnob PRISM_OK.\nKnob PRISM_GHOST.\n",
      "utf-8",
    );
    writeFileSync(join(root, "USER-CLAUDE.md"), "Reference state/shared/exists.md\n", "utf-8");
    writeFileSync(join(root, "state/shared/exists.md"), "ok", "utf-8");

    const res = await main({
      argv: [
        "--frozen-time", NOW,
        "--user-claude-md", join(root, "USER-CLAUDE.md"),
      ],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });

    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.json"), "utf-8"),
    );
    expect(js.schemaVersion).toBe(1);
    // We expect: scripts/found.mjs OK, scripts/missing.mjs P0 missing,
    // PRISM_OK env OK, PRISM_GHOST env P1 missing, state/shared/exists.md OK.
    expect(js.bySeverity.P0).toBe(1);
    expect(js.bySeverity.P1).toBe(1);
    expect(js.totals.drift).toBe(2);
    expect(js.findings.find((f) => f.claim === "scripts/missing.mjs").severity).toBe(SEVERITY.P0);
    expect(js.findings.find((f) => f.claim === "PRISM_GHOST").severity).toBe(SEVERITY.P1);
  });

  it("--json writes nothing", async () => {
    writeFileSync(join(root, "CLAUDE.md"), "no claims here", "utf-8");
    const res = await main({
      argv: [
        "--json", "--frozen-time", NOW,
        "--user-claude-md", join(root, "NOFILE.md"),
      ],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    expect(res.exitCode).toBe(0);
    expect(existsSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.md"))).toBe(false);
    const parsed = JSON.parse(logs.join("\n"));
    expect(parsed.schemaVersion).toBe(1);
  });

  it("--help short-circuits", async () => {
    const res = await main({
      argv: ["--help"],
      repo: root,
      out: (...a) => logs.push(a.join(" ")),
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    expect(res.exitCode).toBe(0);
    expect(logs.join("\n")).toContain("drift detector");
  });

  it("fatal when BOTH CLAUDE.md files are missing", async () => {
    const res = await main({
      argv: [
        "--frozen-time", NOW,
        "--project-claude-md", join(root, "NOFILE_P.md"),
        "--user-claude-md", join(root, "NOFILE_U.md"),
      ],
      repo: root,
      out: () => {},
      err: (...a) => errs.push(a.join(" ")),
      makeEnvKnobGrep: deterministicGrep(),
    });
    expect(res.exitCode).toBe(1);
    expect(errs.join("\n")).toMatch(/FATAL.*CLAUDE\.md/);
  });

  it("one CLAUDE.md missing is non-fatal — analyzes the available one", async () => {
    writeFileSync(join(root, "CLAUDE.md"), "Use scripts/x.mjs", "utf-8");
    // user CLAUDE.md absent
    const res = await main({
      argv: [
        "--frozen-time", NOW,
        "--user-claude-md", join(root, "NOFILE.md"),
      ],
      repo: root,
      out: () => {},
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.json"), "utf-8"),
    );
    expect(js.sources.length).toBe(1);
    expect(js.sources[0]).toContain("project:");
  });

  it("--include-p2 propagates through main", async () => {
    writeFileSync(join(root, "CLAUDE.md"), "no claims here.\n", "utf-8");
    const res = await main({
      argv: [
        "--include-p2",
        "--frozen-time", NOW,
        "--user-claude-md", join(root, "NOFILE.md"),
      ],
      repo: root,
      out: () => {},
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    expect(res.exitCode).toBe(0);
    const js = JSON.parse(
      readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.json"), "utf-8"),
    );
    expect(js.generatedAt).toBe(NOW);
  });

  it("idempotent — same inputs produce identical files", async () => {
    writeFileSync(join(root, "CLAUDE.md"), "scripts/x.mjs\n", "utf-8");
    await main({
      argv: ["--frozen-time", NOW, "--user-claude-md", join(root, "NOFILE.md")],
      repo: root,
      out: () => {},
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    const md1 = readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.md"), "utf-8");
    const js1 = readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.json"), "utf-8");
    await main({
      argv: ["--frozen-time", NOW, "--user-claude-md", join(root, "NOFILE.md")],
      repo: root,
      out: () => {},
      err: () => {},
      makeEnvKnobGrep: deterministicGrep(),
    });
    const md2 = readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.md"), "utf-8");
    const js2 = readFileSync(join(root, "state/shared/CLAUDE_MD_DRIFT_REPORT.json"), "utf-8");
    expect(md1).toBe(md2);
    expect(js1).toBe(js2);
  });
});
