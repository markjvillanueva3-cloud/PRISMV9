#!/usr/bin/env node
// ZULU-ACCOUNT-CYCLE-MS0 / U-5H-SIDECAR-POPULATE (slot:bravo, 2026-06-11) -- keystone #2.
//
// Writes the REAL rolling-5h token figures (from five-hour-token-sum.mjs, #1) into
// state/shared/token-budget-<slot>.json under quota.fiveHour, so the already-built
// account-switch-restart-coordinator.mjs (which reads quota.fiveHour.pct and fails
// loud on null) finally has a real value to gate on -- closing the C5 chokepoint
// where Claude Code never emits rate_limits.five_hour on this host.
//
// HONESTY (R12): the figure is REAL but the pct needs a budget the operator must
// supply. So:
//   - usedTokens / weightedTokens are ALWAYS written (real, no denominator).
//   - pct = weightedTokens / PRISM_5H_WEIGHTED_BUDGET (preferred) OR
//           usedTokens   / PRISM_5H_TOKEN_BUDGET, ELSE null.
//     null is correct -- the coordinator fails loud on null, which is the right
//     behavior until a budget is configured. We NEVER fabricate a denominator.
// Keystone #3 (coordinator absolute-threshold gate) consumes weightedTokens so the
// switch can fire on an absolute trigger WITHOUT the dynamic denominator at all.
//
// The 5h window is PER-ACCOUNT (all of this host's chats share one account's 5h
// window), and fiveHourTokenSum is host-wide, so the value is the same regardless
// of which slot's file we write -- the coordinator MAXes across slots so writing
// the host-wide figure to the running slot's file is correct.
//
// ARCHITECTURE: pure core (budgetFromEnv, computePct, mergeQuotaFiveHour, buildFiveHour)
// + injected sum/clock/fs. Atomic tmp+rename write.

import fsDefault from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { fiveHourTokenSum, FIVE_HOURS_MS } from "./lib/five-hour-token-sum.mjs";

const ROOT = process.env.PRISM_ROOT || "H:/prism";
export const DEFAULT_SIDECAR_DIR = path.join(ROOT, "state", "shared");

// Parse the two budget envs -> { weightedBudget, rawBudget } (each a finite >0 or null).
export function budgetFromEnv(env = process.env) {
  const w = Number(env?.PRISM_5H_WEIGHTED_BUDGET);
  const r = Number(env?.PRISM_5H_TOKEN_BUDGET);
  return {
    weightedBudget: Number.isFinite(w) && w > 0 ? w : null,
    rawBudget: Number.isFinite(r) && r > 0 ? r : null,
  };
}

// Compute pct + which budget was used. Weighted preferred (the honest scarce
// signal). Returns { pct, budgetSource } where pct is null when no usable budget.
// pct is clamped at the LOWER bound 0 only -- a value > 1 (over budget) is
// meaningful and must reach the coordinator's >= threshold gate intact.
export function computePct({ usedTokens, weightedTokens }, { weightedBudget, rawBudget }) {
  if (weightedBudget != null) {
    return { pct: Math.max(0, weightedTokens / weightedBudget), budgetSource: "weighted" };
  }
  if (rawBudget != null) {
    return { pct: Math.max(0, usedTokens / rawBudget), budgetSource: "raw" };
  }
  return { pct: null, budgetSource: null };
}

// Build the quota.fiveHour object from a sum result + pct. `computedAtIso` is
// injected (derived from nowMs by the caller) so the core stays clock-free.
export function buildFiveHour(sum, pctInfo, computedAtIso) {
  return {
    pct: pctInfo.pct,                  // the field the coordinator reads (null until budget set)
    budgetSource: pctInfo.budgetSource,
    usedTokens: sum.usedTokens,        // raw total (cacheRead-dominated)
    weightedTokens: sum.weightedTokens, // scarce-resource signal (#3 gates on this)
    input: sum.input,
    output: sum.output,
    cacheCreation: sum.cacheCreation,
    cacheRead: sum.cacheRead,
    source: "transcript-sum",          // distinguishes from rate_limits-based (absent here)
    computedAt: computedAtIso,
    windowStartMs: sum.windowStartMs,
    windowMs: sum.windowMs,
    transcriptsInWindow: sum.transcriptsInWindow,
    inWindowRecords: sum.inWindowRecords,
    cappedTranscripts: sum.cappedTranscripts,
    excludedNoTs: sum.excludedNoTs,
  };
}

// Merge a fiveHour object into an existing sidecar doc WITHOUT clobbering other
// fields (the sidecar carries ctx/zone/quota.sevenDay/etc. written by the
// token-awareness hook). Pure -- returns a NEW doc.
export function mergeQuotaFiveHour(existingDoc, fiveHour) {
  const doc = existingDoc && typeof existingDoc === "object" ? existingDoc : {};
  const quota = doc.quota && typeof doc.quota === "object" ? doc.quota : {};
  return { ...doc, quota: { ...quota, fiveHour } };
}

// ---------------------------- I/O (injectable) ----------------------------

// Read + parse a sidecar; missing/corrupt -> { doc:{}, hadFile, corrupt }.
// R12: a corrupt existing sidecar is surfaced (corrupt:true) rather than silently
// treated as fresh -- the caller logs it. We still proceed from {} so a single
// corrupt file never blocks the populate (the fiveHour data is authoritative).
export function readSidecar(file, _fs = fsDefault) {
  try {
    if (!_fs.existsSync(file)) return { doc: {}, hadFile: false, corrupt: false };
    return { doc: JSON.parse(_fs.readFileSync(file, "utf-8")), hadFile: true, corrupt: false };
  } catch {
    return { doc: {}, hadFile: true, corrupt: true };
  }
}

// Atomic write: tmp + rename. Creates the dir if missing. Throws on failure
// (fail-loud: the populator is a scheduled job whose whole purpose is to write).
export function writeSidecarAtomic(file, doc, _fs = fsDefault) {
  const dir = path.dirname(file);
  if (!_fs.existsSync(dir)) _fs.mkdirSync(dir, { recursive: true });
  const tmp = `${file}.tmp-${process.pid}`;
  _fs.writeFileSync(tmp, JSON.stringify(doc, null, 2));
  _fs.renameSync(tmp, file);
}

// ----------------------------- orchestrator -----------------------------

// Compute the 5h sum, derive pct from env budget, merge into the slot sidecar,
// write (unless dryRun). Returns a structured report.
//
// @param {number} opts.nowMs       REQUIRED clock (injected)
// @param {string} [opts.slot]      sidecar slot (default PRISM_SLOT or 'bravo')
// @param {boolean}[opts.dryRun]    compute only, no write
// @param {function}[opts._sum]     injected fiveHourTokenSum (tests)
// @param {object} [opts._fs]       injected fs (tests)
export function populateFiveHourSidecar({
  nowMs,
  slot,
  sidecarDir = DEFAULT_SIDECAR_DIR,
  windowMs = FIVE_HOURS_MS,
  projectsRoot,
  dryRun = false,
  env = process.env,
  _sum = fiveHourTokenSum,
  _fs = fsDefault,
} = {}) {
  if (!Number.isFinite(nowMs)) throw new Error("populateFiveHourSidecar: nowMs (finite epoch ms) required");
  const slotName = slot || env?.PRISM_SLOT || "bravo";
  const sum = _sum({ nowMs, windowMs, ...(projectsRoot ? { projectsRoot } : {}), _fs });
  const budgets = budgetFromEnv(env);
  const pctInfo = computePct(sum, budgets);
  const fiveHour = buildFiveHour(sum, pctInfo, new Date(nowMs).toISOString());

  const file = path.join(sidecarDir, `token-budget-${slotName}.json`);
  const { doc, hadFile, corrupt } = readSidecar(file, _fs);
  const merged = mergeQuotaFiveHour(doc, fiveHour);

  if (!dryRun) writeSidecarAtomic(file, merged, _fs);

  return {
    ok: true,
    slot: slotName,
    file,
    dryRun,
    wrotePct: pctInfo.pct,
    budgetSource: pctInfo.budgetSource,
    usedTokens: sum.usedTokens,
    weightedTokens: sum.weightedTokens,
    transcriptsInWindow: sum.transcriptsInWindow,
    hadExistingSidecar: hadFile,
    existingCorrupt: corrupt,
    budgetConfigured: budgets.weightedBudget != null || budgets.rawBudget != null,
  };
}

// --------------------------------- CLI ---------------------------------

function parseArgs(argv) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--dry-run") a.dryRun = true;
    else if (t === "--json") a.json = true;
    else if (t === "--slot") a.slot = argv[++i];
    else a._.push(t);
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let out;
  try {
    out = populateFiveHourSidecar({ nowMs: Date.now(), slot: args.slot, dryRun: args.dryRun === true });
  } catch (e) {
    process.stdout.write(JSON.stringify({ ok: false, error: String(e?.message || e) }, null, args.json ? 0 : 2) + "\n");
    process.exit(2);
  }
  if (!out.budgetConfigured) {
    process.stderr.write(
      "[5h-sidecar] pct=null -- no budget configured. Set PRISM_5H_WEIGHTED_BUDGET (preferred) or " +
      "PRISM_5H_TOKEN_BUDGET to enable the pct path, OR rely on keystone #3 absolute-token trigger. " +
      `Real usage this window: weighted=${out.weightedTokens} raw=${out.usedTokens}.\n`,
    );
  }
  process.stdout.write(JSON.stringify(out, null, args.json ? 0 : 2) + "\n");
}

const __direct = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; } catch { return false; }
})();
if (__direct) {
  try { main(); } catch (e) { process.stderr.write(`[5h-sidecar] fatal: ${e?.stack || e}\n`); process.exit(1); }
}
