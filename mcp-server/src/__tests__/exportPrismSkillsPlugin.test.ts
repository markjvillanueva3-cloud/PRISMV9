/**
 * exportPrismSkillsPlugin.test.ts — U-SKU08 (SKILLS-UTILIZATION-MS0) coverage for
 * `scripts/export-prism-skills-plugin.mjs` — the INTERNAL skills-plugin export.
 *
 * The script is a pure CLI (it runs `main()` at module load), so — like the
 * U-SKU03 linter test — everything here goes through `spawnSync('node', [...])`,
 * which also exercises the real exit-code contract. Layers:
 *  1. --help / --self-test exit 0 (the self-test internally exercises exportPlugin +
 *     validateBundle against synthetic fixtures: included/excluded counting, the
 *     internal-path-leak exclusion, the domain filter, an empty-but-valid bundle,
 *     a missing-audit throw, and structural validation).
 *  2. Against the *real* latest SKILL-LIBRARY-AUDIT-*.json (0 production-grade today):
 *     emits an empty-but-structurally-valid plugin (.claude-plugin/plugin.json with
 *     skills: [], README mentioning "empty", LICENSE mentioning "INTERNAL", MANIFEST
 *     with includedCount 0 and the "deferred public release" note) + a clear warning.
 *  3. Against a *synthetic* audit with 2 production-grade + 1 leaky + 1 needs_refinement
 *     skill: the 2 clean ones are copied (with their SKILL.md), the leaky one is excluded
 *     (internal-path-leak), the needs_refinement one never appears; --domain cad narrows.
 *  4. --audit <nonexistent> → exit 1 with a clear message.
 */

import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CLI_PATH = path.join(REPO_ROOT, "scripts", "export-prism-skills-plugin.mjs");
const STATE_SHARED_DIR = path.join(REPO_ROOT, "state", "shared");

const tmpDirs: string[] = [];
function mkTmp(): string { const d = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku08-")); tmpDirs.push(d); return d; }
afterAll(() => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* best effort */ } } });

const run = (args: string[]) => spawnSync(process.execPath, [CLI_PATH, ...args], { cwd: REPO_ROOT, encoding: "utf-8", timeout: 60_000 });

/** A synthetic audit JSON + the synthetic SKILL.md files it points at. */
function mkSyntheticAudit(): { auditPath: string; goodCncPath: string; goodCadPath: string; leakyPath: string } {
  const root = mkTmp();
  const cmds = path.join(root, "commands"); fs.mkdirSync(cmds, { recursive: true });
  const mk = (name: string, body: string) => { const p = path.join(cmds, `${name}.md`); fs.writeFileSync(p, body, "utf-8"); return p; };
  const goodCncPath = mk("good-cnc-skill", "---\nname: good-cnc-skill\ndescription: Compute CNC milling feeds and speeds for carbide tooling and tool life\n---\n# Good CNC skill\nA clean, shippable skill body with no machine-specific paths.");
  const goodCadPath = mk("good-cad-skill", "---\nname: good-cad-skill\ndescription: Validate CAD model tolerances and GD&T callouts\n---\n# Good CAD skill\nAlso clean.");
  const leakyPath = mk("leaky-skill", "---\nname: leaky-skill\ndescription: A skill whose body references an internal path\n---\n# Leaky\nReads config from H:/prism/secret.json — must be excluded from any bundle.");
  const auditPath = path.join(root, "SKILL-LIBRARY-AUDIT-2099-01-01.json");
  fs.writeFileSync(auditPath, JSON.stringify({ schemaVersion: "1.0.0", generatedAt: "2099-01-01T00:00:00.000Z", total: 4, skills: [
    { name: "good-cnc-skill", path: goodCncPath, grade: "production_grade", domain: "CAM", distance: "n/a", reasons: ["ok"] },
    { name: "good-cad-skill", path: goodCadPath, grade: "production_grade", domain: "CAD", distance: "n/a", reasons: ["ok"] },
    { name: "leaky-skill", path: leakyPath, grade: "production_grade", domain: "CAM", distance: "n/a", reasons: ["ok"] },
    { name: "needs-skill", path: goodCncPath, grade: "needs_refinement", domain: "CAM", distance: "mid", reasons: ["no fixtures"] },
  ] }), "utf-8");
  return { auditPath, goodCncPath, goodCadPath, leakyPath };
}

const latestRealAudit = () => { try { const fs2 = fs.readdirSync(STATE_SHARED_DIR).filter((f) => /^SKILL-LIBRARY-AUDIT-.*\.json$/.test(f)).sort(); return fs2.length ? path.join(STATE_SHARED_DIR, fs2[fs2.length - 1]) : null; } catch { return null; } };

// ── 1. --help / --self-test ────────────────────────────────────────────────

describe("export-prism-skills-plugin.mjs — basics", () => {
  it("--help exits 0 and states it's INTERNAL-only", () => {
    const r = run(["--help"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/export-prism-skills-plugin\.mjs/);
    expect(r.stdout).toMatch(/INTERNAL/i);
    expect(r.stdout).toMatch(/never ships? vapor/i);
  });

  it("--self-test exits 0 with every internal check passing (covers exportPlugin + validateBundle)", () => {
    const r = run(["--self-test"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/checks passed/);
  });
});

// ── 2. against the real latest audit (0 production-grade today) ────────────

describe("export-prism-skills-plugin.mjs — against the real latest audit (empty bundle today)", () => {
  it("--no-write reports 0 production-grade and a clear empty-bundle warning", () => {
    if (!latestRealAudit()) return; // skip if no audit has been generated in this checkout
    const r = run(["--no-write"]);
    expect(r.status).toBe(0);
    expect(r.stdout + r.stderr).toMatch(/included:\s*0|0 production-grade/i);
    expect(r.stdout + r.stderr).toMatch(/empty|vapor|gap list/i);
  });

  it("writes an empty-but-structurally-valid plugin to --out", () => {
    if (!latestRealAudit()) return;
    const out = path.join(mkTmp(), "bundle");
    const r = run(["--out", out, "--domain", "manufacturing"]);
    expect(r.status).toBe(0);
    const pj = JSON.parse(fs.readFileSync(path.join(out, ".claude-plugin", "plugin.json"), "utf-8"));
    expect(pj.name).toBe("prism-manufacturing-skills");
    expect(Array.isArray(pj.skills)).toBe(true);
    expect(pj.skills.length).toBe(0);
    expect(typeof pj.description).toBe("string");
    expect(pj.version).toMatch(/\+/); // version pinned to a git SHA
    const readme = fs.readFileSync(path.join(out, "README.md"), "utf-8");
    expect(readme).toMatch(/empty/i);
    expect(readme).toMatch(/INTERNAL/i);
    expect(fs.readFileSync(path.join(out, "LICENSE"), "utf-8")).toMatch(/INTERNAL USE ONLY/);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, "MANIFEST.json"), "utf-8"));
    expect(manifest.includedCount).toBe(0);
    expect(manifest.domainFilter).toBe("manufacturing");
    expect(manifest.distribution).toMatch(/INTERNAL ONLY|deferred/i);
    expect(Array.isArray(manifest.warnings) && manifest.warnings.some((w: string) => /empty/i.test(w))).toBe(true);
  });
});

// ── 3. against a synthetic audit (2 prod + 1 leaky + 1 needs) ─────────────

describe("export-prism-skills-plugin.mjs — against a synthetic audit", () => {
  it("copies only the clean production-grade skills; excludes the internal-path-leak one; never includes needs_refinement", () => {
    const { auditPath } = mkSyntheticAudit();
    const out = path.join(mkTmp(), "synthetic-bundle");
    const r = run(["--audit", auditPath, "--out", out, "--domain", "all"]);
    expect(r.status).toBe(0);
    const pj = JSON.parse(fs.readFileSync(path.join(out, ".claude-plugin", "plugin.json"), "utf-8"));
    expect(pj.skills.sort()).toEqual(["skills/good-cad-skill/SKILL.md", "skills/good-cnc-skill/SKILL.md"]);
    expect(fs.existsSync(path.join(out, "skills", "good-cnc-skill", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(out, "skills", "good-cad-skill", "SKILL.md"))).toBe(true);
    expect(fs.existsSync(path.join(out, "skills", "leaky-skill"))).toBe(false);
    expect(fs.existsSync(path.join(out, "skills", "needs-skill"))).toBe(false);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, "MANIFEST.json"), "utf-8"));
    expect(manifest.includedCount).toBe(2);
    expect(manifest.totalProductionGrade).toBe(3);
    expect(manifest.excluded.map((e: { name: string }) => e.name)).toEqual(["leaky-skill"]);
    expect(manifest.excluded[0].reason).toMatch(/internal-path-leak/i);
    expect(manifest.included.some((i: { name: string }) => i.name === "needs-skill")).toBe(false);
    const readme = fs.readFileSync(path.join(out, "README.md"), "utf-8");
    expect(readme).toMatch(/good-cnc-skill/);
    expect(readme).toMatch(/Compute CNC milling feeds/);
    expect(readme).toMatch(/leaky-skill/); // the excluded section names it
  });

  it("--domain cad narrows to just the CAD-domain production-grade skill", () => {
    const { auditPath } = mkSyntheticAudit();
    const out = path.join(mkTmp(), "cad-bundle");
    const r = run(["--audit", auditPath, "--out", out, "--domain", "cad"]);
    expect(r.status).toBe(0);
    const pj = JSON.parse(fs.readFileSync(path.join(out, ".claude-plugin", "plugin.json"), "utf-8"));
    expect(pj.skills).toEqual(["skills/good-cad-skill/SKILL.md"]);
    const manifest = JSON.parse(fs.readFileSync(path.join(out, "MANIFEST.json"), "utf-8"));
    expect(manifest.includedCount).toBe(1);
    expect(manifest.included[0].name).toBe("good-cad-skill");
    expect(manifest.domainFilter).toBe("cad");
  });
});

// ── 4. error path ──────────────────────────────────────────────────────────

describe("export-prism-skills-plugin.mjs — error path", () => {
  it("--audit <nonexistent> exits 1 with a clear message", () => {
    const r = run(["--audit", path.join(os.tmpdir(), "definitely-no-such-audit.json"), "--no-write"]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/cannot read the audit JSON|no SKILL-LIBRARY-AUDIT/i);
  });
});
