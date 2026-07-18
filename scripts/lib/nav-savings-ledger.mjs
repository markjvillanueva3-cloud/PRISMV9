// nav-savings-ledger.mjs — append-only ledger of node→path NAV resolutions that
// turned a "the graph knows X" hint into a direct `Read: <path>` (a saved
// Grep/Glob+Read search). SYSTEM-VIZ / U-SV-NAV-SAVINGS (sierra).
//
// Producer: the exact-path inject hooks (master-index-precheck-inject,
//   pre-bash-graph-inject) call recordNavHit() when they resolve a graph node's
//   label to a real source path and emit `Read: <path>`.
// Consumer: stop-psn-savings-aggregate.mjs registers this file in SOURCES["nav"];
//   its `summarizeJsonl` counts {kind:"hit", est_tokens} lines into totals.hits +
//   totals.savedTokens, which flow into the SessionStart "PSN savings" headline.
//   (line shape verified against scripts/lib/psn-savings-aggregate.mjs.)
//
// CONTRACT: telemetry MUST NEVER throw into a hook — every path is fail-soft and
// returns a boolean. A nav-savings write failing is invisible to the user; a hook
// crashing is not.
//
// Knobs:
//   PRISM_NAV_SAVINGS_LEDGER_PATH=<p>  — override the ledger location (tests).
//   PRISM_NAV_EST_TOKENS=<n>           — tokens-saved credited per hit (default 300).
//   PRISM_NAV_SAVINGS_DISABLE=1        — disable recording entirely.

import { appendFileSync, mkdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_LEDGER = join(__dirname, "..", "..", "state", "shared", "dashboards", "nav-savings-ledger.jsonl");

// Conservative tokens-saved per nav hit. A direct `Read: <path>` avoids a Grep/Glob
// (often a timed-out recursive scan on the ~200K-file tree) AND the wrong-file Reads
// that follow it. 300 is deliberately UNDER the route-savings 8000/takeup figure — we
// credit only the avoided search, not the avoided wrong-Reads (honest under-count).
const DEFAULT_EST_TOKENS = 300;
// Soft cap: stop appending past this size. The aggregator tail-reads only the last
// 500KB anyway, so an unbounded ledger wastes disk for zero added signal.
const MAX_LEDGER_BYTES = 5_000_000;

export function navLedgerPath() {
  return process.env.PRISM_NAV_SAVINGS_LEDGER_PATH || DEFAULT_LEDGER;
}

function estTokens() {
  const n = Number(process.env.PRISM_NAV_EST_TOKENS);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_EST_TOKENS;
}

/**
 * Append one nav-hit line. Fail-soft — returns true on write, false on any skip
 * or error. Never throws.
 * @param {{label?:string, path?:string, source?:string}} hit
 * @returns {boolean}
 */
export function recordNavHit({ label, path: codePath, source } = {}) {
  if (process.env.PRISM_NAV_SAVINGS_DISABLE === "1") return false;
  try {
    const p = navLedgerPath();
    if (existsSync(p)) {
      try { if (statSync(p).size > MAX_LEDGER_BYTES) return false; } catch { /* fall through to write attempt */ }
    }
    mkdirSync(dirname(p), { recursive: true });
    const line = JSON.stringify({
      ts: Date.now(),
      kind: "hit",
      est_tokens: estTokens(),
      label: typeof label === "string" ? label : null,
      path: typeof codePath === "string" ? codePath : null,
      source: typeof source === "string" ? source : "nav",
    }) + "\n";
    appendFileSync(p, line, "utf8"); // 'a' flag = O_APPEND — atomic for small line writes
    return true;
  } catch {
    return false;
  }
}

/**
 * Credit a resolved nav target to the ledger ONLY when the banner actually emitted
 * (not suppressed by dedup). Centralizes the credit-on-emit gate the three
 * graph-inject hooks (pre-bash/pre-grep/pre-write) share, so the invariant
 * "a deduped repeat re-shows nothing → no new credit" is unit-testable (it was
 * structurally-guaranteed-but-untested per scrutiny arm C on U-SV-NAV-INJECT).
 * Fail-soft. Returns true iff a hit was actually recorded.
 * @param {{navHit?:{label?:string,path?:string,source?:string}|null, emittedBanner?:boolean}} args
 * @returns {boolean}
 */
export function creditNavOnEmit({ navHit, emittedBanner } = {}) {
  if (!navHit || !emittedBanner) return false;
  try { return recordNavHit(navHit) === true; } catch { return false; }
}

/**
 * Read-back summary (for the /nav skill + tests). Fail-soft → zeros on any error.
 * @returns {{hits:number, savedTokens:number}}
 */
export function readNavSavings() {
  try {
    const p = navLedgerPath();
    if (!existsSync(p)) return { hits: 0, savedTokens: 0 };
    let hits = 0;
    let savedTokens = 0;
    for (const ln of readFileSync(p, "utf8").split("\n")) {
      if (!ln) continue;
      let e;
      try { e = JSON.parse(ln); } catch { continue; }
      if (e.kind === "hit") {
        hits += 1;
        if (Number.isFinite(e.est_tokens)) savedTokens += e.est_tokens;
      }
    }
    return { hits, savedTokens };
  } catch {
    return { hits: 0, savedTokens: 0 };
  }
}
