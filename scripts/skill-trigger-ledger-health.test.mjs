#!/usr/bin/env node
/**
 * skill-trigger-ledger-health.test.mjs — anti-regression gate.
 *
 * Backstop for the 2026-05-20 silent-empty-ledger regression:
 *   knowledge/wiki/architecture/_skill-triggers.jsonl was locked at 0 lines
 *   from 2026-05-19 12:09 (stale empty-file fingerprint), making
 *   skill-auto-trigger.mjs 100% blind on every UserPromptSubmit across the
 *   fleet. Live source trees had 132 skills declaring `triggers:`; the
 *   extractor itself was healthy — the silent failure was that the
 *   fingerprint short-circuit (extract-skill-triggers.mjs §319-322) treated
 *   the empty file as "no changes" and refused to rewrite.
 *
 *   R12 (fail-loud): a healthy-looking extractor run reporting "wrote 481
 *   lines" while the previous run had written 0 is fail-loud-by-this-test,
 *   not silent-by-fingerprint.
 *
 * Distinct from `extract-skill-triggers.test.mjs` which covers cross-tree
 * UNION semantics (U-LIMA-A4, 2026-05-19) with hermetic tmpdirs. This file
 * asserts the LIVE ledger on disk reflects the LIVE skill trees — the
 * production wiring oracle, not the parser unit test.
 *
 * Run: node scripts/skill-trigger-ledger-health.test.mjs
 *      exit 0 = pass · exit 1 = fail (any assertion).
 *
 * Wire into pre-commit / nightly cron — runs in <1s.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PRISM_ROOT = "H:/prism";
const LEDGER_PATH = join(PRISM_ROOT, "knowledge/wiki/architecture/_skill-triggers.jsonl");
const SKILL_DIRS = [
  join(PRISM_ROOT, ".claude/commands"),
  "C:/Users/wompu/.claude/commands",
  "C:/Users/Mark Villanueva/.claude/commands",
];

// Floor: 2026-05-17 audit baselined 36; 2026-05-20 regen produced 481.
// 100 = regression cliff — below it, skill-auto-trigger's top-K=3 surface
// can't span the long tail. Raise after next /forge-audit-v2 if steady
// state climbs. Lowering this without operator sign-off is a regression.
const MIN_LEDGER_ROWS = 100;

// Ratio sanity: extractor expands one `triggers:` block into 1..N rows
// (depending on alternation count). Ratio < 0.5 means the parser dropped
// ≥half the declarations — would have caught the 2026-05-20 zero state.
const MIN_LEDGER_TO_DECL_RATIO = 1.0;

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }
function assert(cond, msg) { if (!cond) throw new Error(msg); }

test("ledger file exists on disk", () => {
  assert(existsSync(LEDGER_PATH), `missing: ${LEDGER_PATH}`);
});

test("ledger file is not zero-byte", () => {
  const sz = statSync(LEDGER_PATH).size;
  assert(sz > 0, `ledger is 0 bytes — empty-fingerprint regression: ${LEDGER_PATH}`);
});

test(`ledger has >= ${MIN_LEDGER_ROWS} trigger rows`, () => {
  const text = readFileSync(LEDGER_PATH, "utf8");
  const rows = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  assert(
    rows.length >= MIN_LEDGER_ROWS,
    `expected >= ${MIN_LEDGER_ROWS} rows, got ${rows.length} — skill-auto-trigger.mjs would be ~blind`,
  );
});

test("every row is a JSON object with name + matcher.value + score + action", () => {
  const text = readFileSync(LEDGER_PATH, "utf8");
  const rows = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  for (let i = 0; i < rows.length; i++) {
    let obj;
    try { obj = JSON.parse(rows[i]); }
    catch (e) { throw new Error(`row ${i + 1} not JSON: ${e.message} — first 80c: ${rows[i].slice(0, 80)}`); }
    assert(typeof obj.name === "string" && obj.name.length > 0, `row ${i + 1} missing name`);
    assert(obj.matcher && typeof obj.matcher.value === "string" && obj.matcher.value.length > 0,
      `row ${i + 1} (${obj.name}) missing matcher.value`);
    assert(typeof obj.score === "number" && obj.score >= 0 && obj.score <= 1,
      `row ${i + 1} (${obj.name}) score out of [0,1]: ${obj.score}`);
    assert(typeof obj.action === "string" && obj.action.length > 0, `row ${i + 1} (${obj.name}) missing action`);
  }
});

test("ledger covers BOTH project tree AND user-globals tree", () => {
  const text = readFileSync(LEDGER_PATH, "utf8");
  const rows = text.split(/\r?\n/).filter(l => l.trim().length > 0).map(l => JSON.parse(l));
  const projectHits = rows.filter(r => r.manifest && r.manifest.startsWith("H:/prism/")).length;
  const userHits    = rows.filter(r => r.manifest && /^C:\/Users\//i.test(r.manifest)).length;
  assert(projectHits > 0, "no project-tree triggers — extract-skill-triggers.mjs SKILL_DIRS regression");
  assert(userHits > 0, "no user-globals triggers — closes audit F3 silently regressed");
});

test(`ledger rows >= ${MIN_LEDGER_TO_DECL_RATIO}x live triggers: declarations`, () => {
  let declCount = 0;
  for (const dir of SKILL_DIRS) {
    if (!existsSync(dir)) continue;
    let files;
    try { files = readdirSync(dir).filter(f => f.endsWith(".md")); } catch { continue; }
    for (const f of files) {
      let text = "";
      try { text = readFileSync(join(dir, f), "utf8"); } catch { continue; }
      if (/^triggers:\s*$/m.test(text)) declCount++;
    }
  }
  const ledgerText = readFileSync(LEDGER_PATH, "utf8");
  const ledgerRows = ledgerText.split(/\r?\n/).filter(l => l.trim().length > 0).length;
  assert(declCount > 0, "no skills with triggers: frontmatter found in any SKILL_DIRS — survey bug");
  const ratio = ledgerRows / declCount;
  assert(ratio >= MIN_LEDGER_TO_DECL_RATIO,
    `ledger ${ledgerRows} rows from ${declCount} declarations = ratio ${ratio.toFixed(2)} ` +
    `(< ${MIN_LEDGER_TO_DECL_RATIO}). Re-run: node scripts/extract-skill-triggers.mjs`);
});

test("fingerprint file is in lock-step with ledger (catches the 2026-05-20 silent regression)", () => {
  // The 2026-05-20 regression: ledger empty + fingerprint locked → re-runs
  // skip the rewrite. Defensive: if the live ledger is fresh + healthy, the
  // fingerprint should exist; if the fingerprint is missing the next
  // extractor run won't short-circuit. Both states are valid — but NEVER
  // (empty ledger + locked fingerprint) at the same time.
  const fp = join(PRISM_ROOT, "knowledge/wiki/architecture/.skill-triggers-fingerprint");
  const ledgerSize = statSync(LEDGER_PATH).size;
  if (existsSync(fp)) {
    assert(ledgerSize > 0,
      "fingerprint locked but ledger empty — the exact 2026-05-20 regression state. " +
      "Delete .skill-triggers-fingerprint and re-run scripts/extract-skill-triggers.mjs");
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let failed = 0;
  for (const { name, fn } of TESTS) {
    try { fn(); process.stdout.write(`  pass — ${name}\n`); }
    catch (e) { failed++; process.stdout.write(`  FAIL — ${name}\n    ${e.message}\n`); }
  }
  const total = TESTS.length;
  const passed = total - failed;
  process.stdout.write(`\nskill-trigger-ledger-health: ${passed}/${total} passed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
