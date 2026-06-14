#!/usr/bin/env node
/**
 * measure-injection-budget.mjs (U-ALPHA-INJECT-BUDGET, operator directive 2026-06-11:
 * "look for inefficiencies that is causing us to waste tokens every turn, fix for the entire fleet")
 *
 * Runs every wired UserPromptSubmit injector hook against a fixed test prompt TWICE and reports
 * per-hook emit bytes on the 1st (full-freight) and 2nd (does it self-dedup?) emission, plus the
 * total per-turn injection budget. This is the deterministic measurement behind any dedup work --
 * shows which hooks are the heavy emitters and which re-emit unchanged content every turn (waste).
 *
 * USAGE: node scripts/measure-injection-budget.mjs [--prompt "<text>"] [--event <Event>] [--json]
 *   --event defaults to UserPromptSubmit; pass SessionStart / Stop / PreToolUse to audit the OTHER
 *   recurring injection surfaces (U-INDIA-INJECT-BUDGET-EVENT 2026-06-12, fills alpha's lever #5:
 *   "SessionStart hooks (~55) -- the other recurring surface ... audit for re-readers").
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const PROMPT = arg("--prompt", "build a cutting force engine for mill with nn gnn lora");
const EVENT = arg("--event", "UserPromptSubmit");
const JSON_OUT = process.argv.includes("--json");
const SETTINGS = "H:/.claude/settings.json";
const NODE = process.execPath;  // current node -- resolves cleanly via execFileSync on win32

export function injectorNames(settings, event = "UserPromptSubmit") {
  const grps = settings.hooks?.[event] || [];
  const names = [];
  for (const grp of grps) for (const h of grp.hooks || []) {
    const m = (h.command || "").match(/hooks\/([\w-]+)\.mjs/);
    if (m) names.push(m[1]);
  }
  return names;
}

const HOOK_TIMEOUT_MS = 8000;
function emitBytes(hookFile, input) {
  // Hooks may exit non-zero (e.g. exit 2 to block) while still printing their JSON to stdout;
  // execFileSync throws on non-zero exit but carries stdout on the error object -- read it either way.
  try {
    const out = execFileSync(NODE, [hookFile], { input, timeout: HOOK_TIMEOUT_MS, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
    return Buffer.byteLength(out || "");
  } catch (err) {
    if (err && typeof err.stdout === "string") return Buffer.byteLength(err.stdout);
    return -1;
  }
}

function main() {
  const settings = JSON.parse(readFileSync(SETTINGS, "utf8"));
  const names = injectorNames(settings, EVENT);
  const input = JSON.stringify({ prompt: PROMPT, session_id: "99297b90-8120-47fa-87d8-d5473fe6cf0f", cwd: "H:/prism", hook_event_name: EVENT });
  const rows = [];
  let total1 = 0, total2 = 0;
  for (const n of names) {
    const f = `H:/prism/.claude/hooks/${n}.mjs`;
    if (!existsSync(f)) { rows.push({ hook: n, r1: -1, r2: -1, note: "missing" }); continue; }
    const r1 = emitBytes(f, input);
    const r2 = emitBytes(f, input);
    if (r1 > 0) total1 += r1;
    if (r2 > 0) total2 += r2;
    let note = "-";
    if (r1 > 400) note = r2 >= r1 ? "NO-DEDUP" : (r2 < r1 * 0.5 ? "self-dedups" : "partial");
    else if (r1 >= 0 && r1 <= 20) note = "gated/empty";
    rows.push({ hook: n, r1, r2, note });
  }
  rows.sort((a, b) => b.r1 - a.r1);
  const report = {
    hookCount: names.length,
    totalFirstEmitBytes: total1,
    totalSecondEmitBytes: total2,
    estTokensPerTurnFirst: Math.round(total1 / 3.5),
    estTokensPerTurnSteady: Math.round(total2 / 3.5),
    noDedupHeavy: rows.filter((r) => r.note === "NO-DEDUP").map((r) => ({ hook: r.hook, bytes: r.r1 })),
    top: rows.slice(0, 20),
  };
  report.event = EVENT;
  if (JSON_OUT) { console.log(JSON.stringify(report, null, 2)); return; }
  console.log(`[${EVENT}] Injectors: ${report.hookCount} | per-turn FIRST emit: ${total1} B (~${report.estTokensPerTurnFirst} tok) | STEADY (2nd): ${total2} B (~${report.estTokensPerTurnSteady} tok)`);
  console.log(`\nNO-DEDUP heavy emitters (re-emit full every turn -- the waste set):`);
  for (const r of report.noDedupHeavy) console.log(`  ${String(r.bytes).padStart(6)} B  ${r.hook}`);
  console.log(`\nTop 20 by first-emit:`);
  for (const r of report.top) console.log(`  r1=${String(r.r1).padStart(6)} r2=${String(r.r2).padStart(6)}  ${r.hook}  [${r.note}]`);
  const outName = EVENT === "UserPromptSubmit" ? "INJECTION-BUDGET-REPORT.json" : `INJECTION-BUDGET-REPORT-${EVENT}.json`;
  writeFileSync(`H:/prism/state/shared/${outName}`, JSON.stringify(report, null, 2));
}

const isMain = process.argv[1] && process.argv[1].endsWith("measure-injection-budget.mjs");
if (isMain) main();
