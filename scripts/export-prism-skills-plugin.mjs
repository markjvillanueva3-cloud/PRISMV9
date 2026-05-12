#!/usr/bin/env node
/**
 * export-prism-skills-plugin.mjs — U-SKU08 (SKILLS-UTILIZATION-MS0).
 *
 * @eng_khairallah1 Phase-4: consolidate your best skills into one installable
 * bundle. PRISM's variant is **INTERNAL distribution only** — per the hard rule
 * (`feedback_no_public_h_drive.md`, 2026-05-11), nothing from the H: drive may be
 * published / distributed publicly. So this packages the **production-grade** skill
 * subset (as identified by U-SKU05's audit) into a `.claude-plugin/plugin.json` +
 * `skills/<name>/SKILL.md` bundle for the user's own multi-machine / multi-chat
 * reuse. The "share publicly" step from his Phase-4 is **deferred** behind explicit
 * per-artifact clearance — see `state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md`.
 *
 * Forcing function regardless of release scope: a skill you'd put in a curated
 * bundle has to actually BE production-grade. With 0 production-grade skills today
 * (the 3-scenario protocol just shipped), the bundle comes out empty — and the
 * script SAYS SO (a clear warning, an empty-but-structurally-valid plugin). It
 * does not ship vapor.
 *
 * Reads the newest `state/shared/SKILL-LIBRARY-AUDIT-<date>.json`, filters to
 * `grade == production_grade` (optional `--domain manufacturing|cad|cam|dev-tools|all`),
 * copies each skill's primary `.md` (from the audit's `path`) → `<out>/skills/<name>/SKILL.md`
 * and any sibling `<...>/.claude/skills/<name>/scenarios/` → `<out>/skills/<name>/scenarios/`,
 * scans bodies for internal-path leaks (`H:/prism…`, `C:\Users…`) and scenarios/ for
 * JM-Die markers (excludes a skill outright if it can't be shipped clean), then writes
 * `<out>/.claude-plugin/plugin.json`, `<out>/README.md`, `<out>/LICENSE` (an INTERNAL
 * notice — NOT an open-source license), and `<out>/MANIFEST.json` (included + excluded-and-why).
 *
 * Modes:
 *   node scripts/export-prism-skills-plugin.mjs                              → dist/prism-manufacturing-skills/ (domain=all)
 *   node scripts/export-prism-skills-plugin.mjs --out dist/foo --domain cad  → only CAD-domain production-grade skills
 *   node scripts/export-prism-skills-plugin.mjs --audit <path>               → use a specific audit JSON
 *   node scripts/export-prism-skills-plugin.mjs --no-write                   → compute the manifest, write nothing
 *   node scripts/export-prism-skills-plugin.mjs --self-test                  → synthetic-fixture self-check; exit 0/1
 *   node scripts/export-prism-skills-plugin.mjs --help
 *
 * loop_schedule: none — manual; rebuild on demand after each audit (the bundle's version is pinned to the git SHA).
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const STATE_SHARED_DIR = path.join(REPO_ROOT, "state", "shared");
const PLUGIN_NAME = "prism-manufacturing-skills";

/** Audit `domain` values → coarse `--domain` filters. */
const DOMAIN_FILTERS = {
  manufacturing: new Set(["CAD", "CAM", "Lathe/Turning", "WEDM/EDM", "CAM-vendor", "Milling", "Grinding", "Welding", "Shop-floor"]),
  cad: new Set(["CAD"]),
  cam: new Set(["CAM", "CAM-vendor"]),
  "dev-tools": new Set(["Dev-pipeline", "Skills-meta", "Hooks/Harness", "GitHub"]),
};
/** Substrings whose presence in a SKILL.md body means it can't be shipped (machine-specific / proprietary). */
const INTERNAL_PATH_MARKERS = [/\bH:[\\/]prism\b/i, /\bH:[\\/]PRISM\b/, /\bC:[\\/]Users[\\/]/i, /\bjm[\s_-]?die\b/i];
/** Customer markers (from the JM Die archive) whose presence in a scenarios/ fixture means scrub-or-exclude. */
const PROPRIETARY_MARKERS = [/\bJM\s*DIE\b/i, /\bALCOA\b/, /\bHolo-?Krome\b/i, /\bOptimas\b/i, /\bHolo Krome\b/i];

const args = process.argv.slice(2);
const flag = (...n) => n.some((x) => args.includes(x));
const valueOf = (n) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : undefined; };
const OPTS = {
  help: flag("--help", "-h"),
  noWrite: flag("--no-write"),
  selfTest: flag("--self-test", "--selftest"),
  quiet: flag("--quiet", "-q"),
  out: valueOf("--out"),
  audit: valueOf("--audit"),
  domain: (valueOf("--domain") || "all").toLowerCase(),
};

const HELP = `export-prism-skills-plugin.mjs — bundle the PRODUCTION-GRADE skills into an INTERNAL .claude-plugin (never public)

  node scripts/export-prism-skills-plugin.mjs                             → dist/${PLUGIN_NAME}/ (domain=all)
  node scripts/export-prism-skills-plugin.mjs --out <dir> --domain cad    → only CAD production-grade skills
  node scripts/export-prism-skills-plugin.mjs --audit <path>              → use a specific SKILL-LIBRARY-AUDIT-*.json
  node scripts/export-prism-skills-plugin.mjs --no-write                  → compute the manifest only
  node scripts/export-prism-skills-plugin.mjs --self-test                 → synthetic-fixture self-check; exit 0/1

domain ∈ { manufacturing, cad, cam, dev-tools, all }. INTERNAL DISTRIBUTION ONLY — public release is deferred
(see state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md). Exit 0 always; an empty bundle (0 production-grade skills)
is a valid outcome and prints a clear warning — it never ships vapor.`;

// ── helpers ────────────────────────────────────────────────────────────────

function gitShaShort() { try { return execFileSync("git", ["-C", REPO_ROOT, "rev-parse", "--short", "HEAD"], { encoding: "utf-8", timeout: 10_000 }).trim(); } catch { return "0000000"; } }
function findLatestAuditPath() {
  try { const fs2 = fs.readdirSync(STATE_SHARED_DIR).filter((f) => /^SKILL-LIBRARY-AUDIT-.*\.json$/.test(f)).sort(); return fs2.length ? path.join(STATE_SHARED_DIR, fs2[fs2.length - 1]) : null; } catch { return null; }
}
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf-8")); }
function frontmatterDescription(skillBody) { const m = skillBody.match(/^---[\s\S]*?\bdescription:\s*(.+?)\s*$/m); return m ? m[1].replace(/^["']|["']$/g, "").trim() : ""; }
function frontmatterTriggers(skillBody) { const m = skillBody.match(/^---[\s\S]*?\bdescription:\s*(.+?)\s*$/m); if (!m) return []; return Array.from(new Set((m[1].match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*|"[^"]+"/g) || []).map((s) => s.replace(/"/g, "")).filter((s) => s.length >= 4))).slice(0, 10); }
function copyDirRecursive(src, dst) { fs.mkdirSync(dst, { recursive: true }); for (const e of fs.readdirSync(src, { withFileTypes: true })) { const s = path.join(src, e.name), d = path.join(dst, e.name); if (e.isDirectory()) copyDirRecursive(s, d); else if (e.isFile()) fs.copyFileSync(s, d); } }
/** Candidate sibling `scenarios/` dirs for a skill (mirrors the U-SKU02 convention). */
function findScenariosDir(skillName) {
  const safe = skillName.replace(/[^\w.-]+/g, "-"); const home = os.homedir();
  for (const dir of [
    path.join(REPO_ROOT, ".claude", "skills", safe, "scenarios"),
    path.join(REPO_ROOT, ".claude", "commands", safe, "scenarios"),
    path.join(home, ".claude", "skills", safe, "scenarios"),
    path.join(home, ".claude", "commands", safe, "scenarios"),
  ]) { try { if (fs.statSync(dir).isDirectory()) return dir; } catch { /* not here */ } }
  return null;
}

const LICENSE_TEXT = `PRISM Manufacturing Skills — INTERNAL USE ONLY

This bundle is generated from the PRISM repository on the H: drive and is for the
maintainer's own multi-machine / multi-chat reuse. It is NOT licensed for public
distribution, redistribution, or publication (no public GitHub repo, no marketplace
submission). Any future public release requires the explicit per-artifact clearance
and the security/IP review described in state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md
(§DEFERRED — DO NOT EXECUTE), which has NOT been granted.

(c) PRISM — internal. All rights reserved.
`;

// ── the export ─────────────────────────────────────────────────────────────

/** Compute (and, unless noWrite, write) the bundle. Returns the manifest. */
export function exportPlugin(opts = {}) {
  const auditPath = opts.auditPath ?? OPTS.audit ?? findLatestAuditPath();
  const domain = (opts.domain ?? OPTS.domain ?? "all").toLowerCase();
  const outDir = path.resolve(REPO_ROOT, opts.outDir ?? OPTS.out ?? path.join("dist", PLUGIN_NAME));
  const noWrite = opts.noWrite ?? OPTS.noWrite ?? false;
  const warnings = [];

  if (!auditPath) throw new Error("export-prism-skills-plugin: no SKILL-LIBRARY-AUDIT-*.json found in state/shared/ (and none given via --audit). Run scripts/skill-library-audit.mjs first.");
  let audit;
  try { audit = opts.auditObject ?? readJson(auditPath); }
  catch (e) { throw new Error(`export-prism-skills-plugin: cannot read the audit JSON at ${auditPath} (${e?.message ?? e}).`); }
  const allSkills = Array.isArray(audit?.skills) ? audit.skills : [];
  const domainSet = domain === "all" ? null : (DOMAIN_FILTERS[domain] ?? null);
  if (domain !== "all" && !domainSet) warnings.push(`Unknown --domain "${domain}" — falling back to all production-grade skills. Valid: ${["all", ...Object.keys(DOMAIN_FILTERS)].join(", ")}.`);

  const productionGrade = allSkills.filter((s) => s && typeof s === "object" && s.grade === "production_grade");
  const inScope = productionGrade.filter((s) => !domainSet || domainSet.has(String(s.domain ?? "")));

  const included = [];
  const excluded = [];
  for (const s of inScope) {
    const name = typeof s.name === "string" ? s.name : "(unnamed)";
    const srcPath = typeof s.path === "string" ? s.path : null;
    if (!srcPath || !fs.existsSync(srcPath)) { excluded.push({ name, reason: srcPath ? `source file missing: ${srcPath}` : "no source path in the audit record" }); continue; }
    let body;
    try { body = fs.readFileSync(srcPath, "utf-8"); } catch (e) { excluded.push({ name, reason: `unreadable source: ${e?.message ?? e}` }); continue; }
    if (INTERNAL_PATH_MARKERS.some((re) => re.test(body))) { excluded.push({ name, reason: "internal-path-leak (body references an H:/PRISM, C:\\Users, or JM-Die path) — not shipped" }); continue; }
    const scenariosDir = findScenariosDir(name);
    let scenarioFiles = 0, scenarioLeak = false;
    if (scenariosDir) {
      for (const f of fs.readdirSync(scenariosDir).filter((f) => f.endsWith(".md"))) {
        scenarioFiles++;
        const sb = fs.readFileSync(path.join(scenariosDir, f), "utf-8");
        if (PROPRIETARY_MARKERS.some((re) => re.test(sb)) || INTERNAL_PATH_MARKERS.some((re) => re.test(sb))) scenarioLeak = true;
      }
    }
    if (scenarioLeak) { excluded.push({ name, reason: "scenarios/ fixtures contain proprietary (JM-Die) or internal-path markers and couldn't be safely scrubbed — not shipped" }); continue; }
    // include it
    const skillOutDir = path.join(outDir, "skills", name);
    if (!noWrite) {
      fs.mkdirSync(skillOutDir, { recursive: true });
      fs.writeFileSync(path.join(skillOutDir, "SKILL.md"), body, "utf-8");
      if (scenariosDir && scenarioFiles > 0) copyDirRecursive(scenariosDir, path.join(skillOutDir, "scenarios"));
    }
    included.push({ name, source: srcPath, domain: String(s.domain ?? "?"), description: frontmatterDescription(body), triggers: frontmatterTriggers(body), scenarioFiles });
  }

  if (included.length === 0) warnings.push(`0 production-grade skills${domain === "all" ? "" : ` in domain "${domain}"`} — the bundle is EMPTY. This is the expected state right after U-SKU02 (the 3-scenario protocol shipped; no skill has been run through prism_dev:skill_test yet). Work the gap list in ${path.relative(REPO_ROOT, auditPath)} to populate it. The script emits an empty-but-valid plugin — it does not ship vapor.`);
  if (excluded.length) warnings.push(`${excluded.length} production-grade skill(s) were EXCLUDED from the bundle for safety (internal-path / proprietary-data leaks, or missing/unreadable sources) — see MANIFEST.json.`);

  const gitSha = gitShaShort();
  const pluginJson = {
    name: PLUGIN_NAME,
    description: `PRISM production-grade ${domain === "all" ? "" : domain + " "}skills — INTERNAL bundle (not for public distribution). Generated from the PRISM repo at git ${gitSha}.`,
    version: `0.1.0+${gitSha}`,
    author: { name: "PRISM (internal)" },
    skills: included.map((i) => `skills/${i.name}/SKILL.md`),
  };
  const manifest = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    gitSha,
    domainFilter: domain,
    distribution: "INTERNAL ONLY — public release deferred (see state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md)",
    auditPath: path.relative(REPO_ROOT, auditPath),
    auditGeneratedAt: typeof audit?.generatedAt === "string" ? audit.generatedAt : null,
    totalProductionGrade: productionGrade.length,
    inScopeForDomain: inScope.length,
    includedCount: included.length,
    excludedCount: excluded.length,
    included,
    excluded,
    warnings,
    outDir: path.relative(REPO_ROOT, outDir),
  };

  if (!noWrite) {
    fs.mkdirSync(path.join(outDir, ".claude-plugin"), { recursive: true });
    fs.writeFileSync(path.join(outDir, ".claude-plugin", "plugin.json"), JSON.stringify(pluginJson, null, 2) + "\n", "utf-8");
    fs.writeFileSync(path.join(outDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2) + "\n", "utf-8");
    fs.writeFileSync(path.join(outDir, "LICENSE"), LICENSE_TEXT, "utf-8");
    fs.writeFileSync(path.join(outDir, "README.md"), renderReadme(manifest, included), "utf-8");
  }
  return manifest;
}

function renderReadme(manifest, included) {
  const L = [];
  L.push(`# ${PLUGIN_NAME}`);
  L.push("");
  L.push(`> **INTERNAL bundle — not for public distribution.** PRISM's production-grade${manifest.domainFilter === "all" ? "" : ` ${manifest.domainFilter}`} skills, packaged for the maintainer's own multi-machine / multi-chat reuse. Public release is DEFERRED (see \`state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md\`). Generated ${manifest.generatedAt} from PRISM @ git ${manifest.gitSha} · audit ${manifest.auditPath} (${manifest.auditGeneratedAt ?? "?"}).`);
  L.push("");
  L.push(`## Contents — ${manifest.includedCount} skill(s)`);
  L.push("");
  if (included.length === 0) {
    L.push(`*(empty — 0 production-grade skills${manifest.domainFilter === "all" ? "" : ` in domain "${manifest.domainFilter}"`} at this audit. A skill reaches "production-grade" only after passing the linter + the 3-Question gate + all three scenario tests (\`prism_dev:skill_test\`). Work the gap list in \`${manifest.auditPath}\` to populate this bundle, then re-run \`scripts/export-prism-skills-plugin.mjs\`.)*`);
  } else {
    L.push(`| Skill | Domain | Description | Scenario fixtures |`);
    L.push(`|---|---|---|---|`);
    for (const i of included) L.push(`| \`${i.name}\` | ${i.domain} | ${(i.description || "—").replace(/\|/g, "\\|").slice(0, 160)} | ${i.scenarioFiles} |`);
  }
  L.push("");
  if (manifest.excludedCount > 0) {
    L.push(`## Excluded (${manifest.excludedCount}) — production-grade but not shipped (safety)`);
    L.push("");
    L.push(`| Skill | Reason |`);
    L.push(`|---|---|`);
    for (const e of manifest.excluded) L.push(`| \`${e.name}\` | ${e.reason.replace(/\|/g, "\\|")} |`);
    L.push("");
  }
  L.push(`## Install (internal)`);
  L.push("");
  L.push(`Copy this directory under a \`.claude-plugin\`-aware location (e.g. \`~/.claude/plugins/${PLUGIN_NAME}/\`) on the target machine. Each \`skills/<name>/SKILL.md\` is the skill; \`scenarios/\` carries the U-SKU02 fixtures. Before reusing, walk \`state/shared/PRISM-SKILLS-BUNDLE-CHECKLIST.md\` (no broken sibling links, no machine-specific absolute paths, README accurate).`);
  L.push("");
  L.push(`*Rebuild: \`node scripts/export-prism-skills-plugin.mjs --domain ${manifest.domainFilter}\` after each \`scripts/skill-library-audit.mjs\` run. Version is pinned to the git SHA.*`);
  L.push("");
  return L.join("\n");
}

/** Structural validation of an exported bundle dir. Returns `{valid, errors}`. */
export function validateBundle(outDir) {
  const errors = [];
  const pj = path.join(outDir, ".claude-plugin", "plugin.json");
  if (!fs.existsSync(pj)) errors.push(`missing ${path.join(".claude-plugin", "plugin.json")}`);
  else {
    try {
      const p = JSON.parse(fs.readFileSync(pj, "utf-8"));
      if (typeof p.name !== "string" || !p.name) errors.push("plugin.json: missing/invalid `name`");
      if (typeof p.description !== "string" || !p.description) errors.push("plugin.json: missing/invalid `description`");
      if (!Array.isArray(p.skills)) errors.push("plugin.json: `skills` is not an array");
      else for (const rel of p.skills) { if (typeof rel !== "string" || !fs.existsSync(path.join(outDir, rel))) errors.push(`plugin.json: skill entry "${rel}" does not exist on disk`); }
    } catch (e) { errors.push(`plugin.json: not valid JSON (${e?.message ?? e})`); }
  }
  for (const f of ["README.md", "LICENSE", "MANIFEST.json"]) if (!fs.existsSync(path.join(outDir, f))) errors.push(`missing ${f}`);
  return { valid: errors.length === 0, errors };
}

// ── self-test ──────────────────────────────────────────────────────────────

function runSelfTest() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sku08-"));
  // synthetic skill files
  const skillsRoot = path.join(tmp, "commands"); fs.mkdirSync(skillsRoot, { recursive: true });
  const mkSkillFile = (name, body) => { const p = path.join(skillsRoot, `${name}.md`); fs.writeFileSync(p, body, "utf-8"); return p; };
  const goodPath = mkSkillFile("good-cnc-skill", "---\nname: good-cnc-skill\ndescription: Compute CNC milling feeds and speeds for carbide tooling\n---\n# Good CNC skill\nDoes a clean thing.");
  const cadPath = mkSkillFile("good-cad-skill", "---\nname: good-cad-skill\ndescription: Validate CAD model tolerances\n---\n# Good CAD skill\nClean.");
  const leakPath = mkSkillFile("leaky-skill", "---\nname: leaky-skill\ndescription: A skill that leaks a path\n---\n# Leaky\nReads from H:/prism/secret.json — should be excluded.");
  const auditObject = { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), total: 4, skills: [
    { name: "good-cnc-skill", path: goodPath, grade: "production_grade", domain: "CAM", distance: "n/a", reasons: ["ok"] },
    { name: "good-cad-skill", path: cadPath, grade: "production_grade", domain: "CAD", distance: "n/a", reasons: ["ok"] },
    { name: "leaky-skill", path: leakPath, grade: "production_grade", domain: "CAM", distance: "n/a", reasons: ["ok"] },
    { name: "needs-skill", path: goodPath, grade: "needs_refinement", domain: "CAM", distance: "mid", reasons: ["no fixtures"] },
  ] };

  let pass = 0, fail = 0; const check = (c, m) => { if (c) pass++; else { fail++; console.error(`  ✗ ${m}`); } };
  // all-domains export
  const outAll = path.join(tmp, "out-all");
  const mAll = exportPlugin({ auditObject, auditPath: "(synthetic)", domain: "all", outDir: outAll });
  check(mAll.includedCount === 2, `domain=all → 2 included (good-cnc + good-cad), got ${mAll.includedCount}`);
  check(mAll.excludedCount === 1 && mAll.excluded[0].name === "leaky-skill", `leaky-skill excluded for internal-path-leak (got ${JSON.stringify(mAll.excluded)})`);
  check(!mAll.included.some((i) => i.name === "needs-skill"), "needs_refinement skill is NOT in the bundle");
  check(validateBundle(outAll).valid, `the all-domains bundle is structurally valid (${JSON.stringify(validateBundle(outAll).errors)})`);
  check(fs.existsSync(path.join(outAll, "skills", "good-cnc-skill", "SKILL.md")), "good-cnc-skill/SKILL.md was copied");
  check(fs.existsSync(path.join(outAll, "README.md")) && fs.readFileSync(path.join(outAll, "README.md"), "utf-8").includes("good-cnc-skill"), "README lists the included skills");
  // domain filter
  const outCad = path.join(tmp, "out-cad");
  const mCad = exportPlugin({ auditObject, auditPath: "(synthetic)", domain: "cad", outDir: outCad });
  check(mCad.includedCount === 1 && mCad.included[0].name === "good-cad-skill", `domain=cad → only good-cad-skill (got ${JSON.stringify(mCad.included.map((i) => i.name))})`);
  // empty set
  const outEmpty = path.join(tmp, "out-empty");
  const mEmpty = exportPlugin({ auditObject: { schemaVersion: "1.0.0", generatedAt: new Date().toISOString(), skills: [{ name: "x", path: goodPath, grade: "needs_refinement", domain: "CAM" }] }, auditPath: "(synthetic)", domain: "all", outDir: outEmpty });
  check(mEmpty.includedCount === 0 && mEmpty.warnings.some((w) => /empty/i.test(w)), "empty production-grade set → empty bundle + a warning (not vapor)");
  check(validateBundle(outEmpty).valid, "an empty bundle is still structurally valid");
  // missing audit
  check((() => { try { exportPlugin({ auditPath: path.join(tmp, "no-such-audit.json"), outDir: path.join(tmp, "o") }); return false; } catch (e) { return /cannot read the audit JSON/.test(String(e?.message ?? e)); } })(), "missing audit JSON throws a helpful error");

  if (!OPTS.quiet) console.log(`[export-prism-skills-plugin --self-test] ${pass}/${pass + fail} checks passed`);
  return fail === 0 ? 0 : 1;
}

// ── main ───────────────────────────────────────────────────────────────────

function main() {
  if (OPTS.help) { console.log(HELP); return 0; }
  if (OPTS.selfTest) return runSelfTest();
  let manifest;
  try { manifest = exportPlugin(); }
  catch (e) { console.error(`[export-prism-skills-plugin] ${e?.message ?? e}`); return 1; }
  if (!OPTS.quiet) {
    console.log(`\nPRISM skills plugin export — domain=${manifest.domainFilter}`);
    console.log(`  audit: ${manifest.auditPath} (${manifest.auditGeneratedAt ?? "?"}) · ${manifest.totalProductionGrade} production-grade total · ${manifest.inScopeForDomain} in scope`);
    console.log(`  included: ${manifest.includedCount}  excluded: ${manifest.excludedCount}`);
    for (const w of manifest.warnings) console.log(`  ⚠ ${w}`);
    if (!OPTS.noWrite) {
      const v = validateBundle(path.resolve(REPO_ROOT, manifest.outDir));
      console.log(`  written: ${manifest.outDir}/  (structural validation: ${v.valid ? "OK" : "FAILED — " + v.errors.join("; ")})`);
    }
    console.log("");
  } else if (!OPTS.noWrite) { process.stdout.write(JSON.stringify(manifest, null, 2) + "\n"); }
  return 0;
}

const code = main();
process.exit(typeof code === "number" ? code : 0);
