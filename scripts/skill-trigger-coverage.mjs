#!/usr/bin/env node
/**
 * skill-trigger-coverage.mjs — U-LIMA-A5 of BACKEND-DEV-LOOP.
 *
 * Surfaces the F2 gap from HIGH-ROI-SKILL-ROUTING-AUDIT-2026-05-17: how many
 * PRISM skills are actually reachable via the auto-trigger ledger
 * (`knowledge/wiki/architecture/_skill-triggers.jsonl`, written by
 * `extract-skill-triggers.mjs`, consumed by the `skill-auto-trigger.mjs`
 * UserPromptSubmit hook).
 *
 * A skill with no ledger entry can only be invoked if the user types its name
 * explicitly — the auto-trigger hook will never suggest it. Coverage is the
 * fraction of skills that ARE in the ledger.
 *
 * Three buckets per skill name:
 *   covered             — ≥1 ledger entry (auto-trigger can suggest it)
 *   declared-not-captured — has a `triggers:` frontmatter block but 0 ledger
 *                           entries (parse failure / all-below-floor /
 *                           non-UserPromptSubmit event) — the ACTIONABLE gap
 *   no-triggers         — no `triggers:` block at all (needs authoring)
 *
 * CLI:
 *   node scripts/skill-trigger-coverage.mjs            human report
 *   node scripts/skill-trigger-coverage.mjs --json     machine-readable
 *   node scripts/skill-trigger-coverage.mjs --list-uncovered   names only
 *   node scripts/skill-trigger-coverage.mjs --top=N    top-N uncovered (default 20)
 *
 * Env (shared with extract-skill-triggers.mjs):
 *   PRISM_SKILL_DIRS / PRISM_SKILL_ARCHIVE_DIRS  override skill dirs
 *   PRISM_SKILL_TRIGGERS_LEDGER  override ledger path
 *
 * Exit code: 0 always (advisory tool — never blocks).
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { listSkillSources } from "./extract-skill-triggers.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRISM_ROOT = join(__dirname, "..");

function fromEnvDirs(envVal, defaults) {
  if (!envVal) return defaults;
  const sep = process.platform === "win32" ? ";" : ":";
  return envVal.split(sep).map(s => s.trim()).filter(Boolean);
}

const SKILL_DIRS = fromEnvDirs(process.env.PRISM_SKILL_DIRS, [
  join(PRISM_ROOT, ".claude/commands"),
  "C:/Users/wompu/.claude/commands",
  "C:/Users/Mark Villanueva/.claude/commands",
]);

const LEDGER_PATH = process.env.PRISM_SKILL_TRIGGERS_LEDGER ||
  join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");

/**
 * Derive the skill's ledger identity from frontmatter `name:`, falling back to
 * the filename. MUST mirror extract-skill-triggers.mjs:extractName — the ledger
 * is keyed by this value, so coverage classification (covered / stale) is only
 * correct if both consumers agree on skill identity. A skill whose `name:`
 * field ≠ filename would otherwise be double-false-positived (stale + uncovered).
 */
export function skillNameFromText(text, fallback) {
  if (!text || !text.startsWith("---")) return fallback;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return fallback;
  const nm = m[1].match(/^name:\s*(.+)$/m);
  if (!nm) return fallback;
  let v = nm[1].trim();
  const hash = v.indexOf(" #");
  if (hash >= 0) v = v.slice(0, hash).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v || fallback;
}

/** True if the .md text has a `triggers:` key inside its YAML frontmatter. */
export function hasTriggersBlock(text) {
  if (!text || !text.startsWith("---")) return false;
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) return false;
  return /^triggers:\s*$/m.test(m[1]) || /^triggers:\s*\[/m.test(m[1]);
}

/** Parse the ledger JSONL into a Set of covered skill names. Tolerant of
 *  blank lines and malformed rows (fail-soft — a bad row is skipped, not fatal). */
export function readLedgerNames(ledgerText) {
  const names = new Set();
  if (!ledgerText) return names;
  for (const line of ledgerText.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("//")) continue;
    try {
      const o = JSON.parse(t);
      if (o && typeof o.name === "string" && o.name) names.add(o.name);
    } catch { /* skip malformed ledger row */ }
  }
  return names;
}

/**
 * Pure core. Caller passes dirs + ledger text so tests run hermetically.
 * Returns { total, covered, declaredNotCaptured, noTriggers, coveragePct,
 *           uncovered[], staleLedgerNames[] }.
 */
export function computeCoverage({ dirs, ledgerText, readFileImpl = readFileSync }) {
  const sources = listSkillSources(dirs);
  // Key by frontmatter `name:` (filename fallback) — the SAME identity the
  // extractor uses for the ledger. A skill in 2 trees, or with name: ≠
  // filename, collapses to one entry, exactly as the ledger does.
  const nameToText = new Map();
  for (const { name: fileName, path } of sources) {
    let text = "";
    try { text = readFileImpl(path, "utf8"); } catch { text = ""; }
    const skillName = skillNameFromText(text, fileName);
    if (nameToText.has(skillName)) continue; // first source wins for the text probe
    nameToText.set(skillName, text);
  }
  const ledgerNames = readLedgerNames(ledgerText);

  let covered = 0, declaredNotCaptured = 0, noTriggers = 0;
  const uncovered = []; // { name, declared } — declared = has triggers: block
  for (const [name, text] of nameToText) {
    if (ledgerNames.has(name)) { covered++; continue; }
    const declared = hasTriggersBlock(text);
    if (declared) declaredNotCaptured++;
    else noTriggers++;
    uncovered.push({ name, declared });
  }
  // declared-not-captured first (the actionable gap), then alpha.
  uncovered.sort((a, b) => (b.declared - a.declared) || a.name.localeCompare(b.name));

  // Ledger names with no matching skill file = stale ledger rows.
  const staleLedgerNames = [...ledgerNames].filter(n => !nameToText.has(n)).sort();

  const total = nameToText.size;
  const coveragePct = total > 0 ? Math.round((covered / total) * 1000) / 10 : 0;
  return { total, covered, declaredNotCaptured, noTriggers, coveragePct, uncovered, staleLedgerNames };
}

function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes("--json");
  const listUncovered = args.includes("--list-uncovered");
  let topN = 20;
  for (const a of args) {
    if (a.startsWith("--top=")) {
      const n = parseInt(a.slice("--top=".length), 10);
      if (Number.isFinite(n) && n > 0) topN = n;
    }
  }

  const ledgerText = existsSync(LEDGER_PATH) ? readFileSync(LEDGER_PATH, "utf8") : "";
  const r = computeCoverage({ dirs: SKILL_DIRS, ledgerText });

  if (asJson) {
    process.stdout.write(JSON.stringify({
      total: r.total, covered: r.covered, declaredNotCaptured: r.declaredNotCaptured,
      noTriggers: r.noTriggers, coveragePct: r.coveragePct,
      staleLedgerCount: r.staleLedgerNames.length,
      uncovered: r.uncovered.slice(0, topN),
      ledgerExists: ledgerText.length > 0,
    }, null, 2) + "\n");
    return 0;
  }
  if (listUncovered) {
    for (const u of r.uncovered) process.stdout.write(u.name + "\n");
    return 0;
  }

  // Human report
  const L = [];
  L.push("── Skill-Trigger Coverage ──");
  if (!ledgerText) L.push("⚠ ledger not found at " + LEDGER_PATH + " — run extract-skill-triggers.mjs first");
  L.push(`  total skills        : ${r.total}`);
  L.push(`  covered (in ledger) : ${r.covered}  (${r.coveragePct}%)`);
  L.push(`  declared-not-captured: ${r.declaredNotCaptured}  ← actionable: has triggers: block but emits 0`);
  L.push(`  no-triggers block   : ${r.noTriggers}  ← needs trigger authoring`);
  if (r.staleLedgerNames.length) {
    L.push(`  ⚠ stale ledger rows : ${r.staleLedgerNames.length} (skill name in ledger, no .md on disk)`);
  }
  if (r.declaredNotCaptured > 0) {
    L.push("");
    L.push(`  declared-not-captured skills (top ${Math.min(topN, r.declaredNotCaptured)}) — these have a`);
    L.push("  triggers: block that the extractor dropped (parse error / score<floor / wrong event):");
    for (const u of r.uncovered.filter(x => x.declared).slice(0, topN)) {
      L.push(`    · ${u.name}`);
    }
  }
  process.stdout.write(L.join("\n") + "\n");
  return 0;
}

// CLI entry — only when run directly, not when imported by tests.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try { process.exit(main()); }
  catch (e) {
    process.stderr.write(`skill-trigger-coverage fatal: ${e.message}\n${e.stack}\n`);
    process.exit(1);
  }
}
