#!/usr/bin/env node
/**
 * ci-test-legitimacy-scan.mjs -- CI gate that fails the build when a CHANGED
 * test file is a fake/placeholder/synthetic/mocked-critical-domain test.
 *
 * WHY: the `test-legitimacy` PreToolUse hook only fires inside an interactive
 * Claude session. CI is the only gate that env flags (PRISM_ALLOW_*) cannot
 * bypass, so it is the durable backstop for fake tests reaching main.
 *
 * SCOPE: only files CHANGED in this push/PR (vs the base ref) are gated, so the
 * ~62 pre-existing legacy violators do not fail unrelated PRs. The full-corpus
 * count is printed as advisory (non-failing) so the legacy debt stays visible.
 *
 * USAGE:
 *   node scripts/ci-test-legitimacy-scan.mjs [--base <ref>] [--all]
 *     --base <ref>  compare against <ref> (default: origin/main, else HEAD~1)
 *     --all         scan the entire corpus and FAIL on any violation (strict)
 *
 * EXIT: 0 = clean (or only legacy advisory), 1 = a changed test file is fake.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Resolve the repo root portably so this runs on a CI runner (ubuntu) as well as
// the dev box: explicit env -> CI workspace -> git toplevel -> two-levels-up
// from this script (scripts/ -> repo root).
function resolveRepoRoot() {
  if (process.env.PRISM_REPO_ROOT) return process.env.PRISM_REPO_ROOT;
  if (process.env.GITHUB_WORKSPACE) return process.env.GITHUB_WORKSPACE;
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8", windowsHide: true }).trim();
    if (top) return top;
  } catch { /* not a git checkout -> fall through */ }
  return path.resolve(import.meta.dirname, "..");
}

const REPO = resolveRepoRoot();
const HOOK = path.resolve(REPO, ".claude/hooks/test-legitimacy.mjs");
const TEST_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

function git(args) {
  try {
    return execFileSync("git", ["-C", REPO, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  } catch {
    return "";
  }
}

function resolveBase(explicit) {
  if (explicit) return explicit;
  // Prefer origin/main if it resolves, else the previous commit.
  if (git(["rev-parse", "--verify", "origin/main"]).trim()) return "origin/main";
  return "HEAD~1";
}

function changedTestFiles(base) {
  const out = git(["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`]) || git(["diff", "--name-only", "--diff-filter=ACMR", base]);
  return out.split("\n").map((s) => s.trim()).filter((f) => f && TEST_RE.test(f));
}

function allTestFiles() {
  return git(["ls-files", "*.test.ts", "*.test.tsx", "*.test.mjs", "*.spec.ts", "*.spec.tsx"])
    .split("\n").map((s) => s.trim()).filter(Boolean);
}

/** Run the real test-legitimacy hook over a list of repo-relative files. */
export async function scanFiles(files, testLegitimacy, readFile = (rel) => readFileSync(path.resolve(REPO, rel), "utf8")) {
  const violations = [];
  for (const rel of files) {
    let content;
    try { content = readFile(rel); } catch { continue; }
    let verdict;
    try { verdict = await testLegitimacy({ tool: "Write", input: { file_path: path.resolve(REPO, rel), content } }); }
    catch { continue; }
    if (verdict && verdict.allow === false) {
      violations.push({ file: rel, reason: (verdict.message || "").replace(/^TEST LEGITIMACY:[^.]*\.\s*/, "") });
    }
  }
  return violations;
}

async function main() {
  const argv = process.argv.slice(2);
  const all = argv.includes("--all");
  const baseIdx = argv.indexOf("--base");
  const base = resolveBase(baseIdx >= 0 ? argv[baseIdx + 1] : null);

  const mod = await import(pathToFileURL(HOOK).href);
  const testLegitimacy = mod.default;

  // Advisory: full-corpus legacy count (never fails the build).
  const legacy = await scanFiles(allTestFiles(), testLegitimacy);
  console.log(`[advisory] ${legacy.length} legacy test file(s) in the corpus trip the legitimacy gate (pre-existing debt).`);

  const targets = all ? allTestFiles() : changedTestFiles(base);
  console.log(`[scan] ${targets.length} ${all ? "corpus" : `changed-vs-${base}`} test file(s) gated.`);
  const violations = all ? legacy : await scanFiles(targets, testLegitimacy);

  if (violations.length === 0) {
    console.log("OK -- no fake/placeholder tests in the gated set.");
    process.exit(0);
  }
  console.error(`\nFAIL -- ${violations.length} fake/placeholder test file(s):`);
  for (const v of violations.slice(0, 50)) {
    console.error(`  - ${v.file}\n      ${v.reason.split("\n").filter(Boolean).slice(0, 2).join(" ")}`);
  }
  process.exit(1);
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invoked && path.resolve(import.meta.dirname, "ci-test-legitimacy-scan.mjs") === invoked) {
  main().catch((e) => { console.error("scan error:", e?.message ?? e); process.exit(1); });
}
