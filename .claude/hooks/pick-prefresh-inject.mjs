#!/usr/bin/env node
// tier: T2
/**
 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
 *
 * Surfaces freshness state BEFORE the chat picks a unit:
 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
 *   - CLOSE-OUT-CANDIDATES mtime + count (so picker doesn't claim units already closeoutable)
 *   - active claims in roadmap/claims/* (so picker doesn't double-claim)
 *   - fleet status one-liner (alive slots, your slot, peers' tasks)
 *
 * The user's existing /checkin already does all of this manually. This hook
 * surfaces the SAME info BEFORE the skill runs so the chat is primed.
 *
 * Non-blocking. Pure info injection.
 *
 * Env knobs:
 *   PRISM_PICK_PREFRESH_DISABLE=1  → skip
 *   PRISM_PICK_PREFRESH_STALE_MIN=30  → staleness threshold for warnings
 */

import * as fs from "node:fs";
import * as path from "node:path";

const TRIGGER_RX = /(^|\s)\/(pick-unit|pick-task|checkin|pick-build-close)(\s|$)/i;
const STATE_DIR = path.join("H:", "prism", "state", "shared");
const ROADMAP_INDEX = path.join("H:", "prism", "mcp-server", "data", "roadmap-index.json");
const CLAIMS_DIR = path.join("H:", "prism", "mcp-server", "data", "claims");

function readStdin() {
  try {
    if (process.stdin.isTTY) return null;
    const raw = fs.readFileSync(0, "utf-8");
    if (!raw || !raw.trim().startsWith("{")) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function ageMin(p) {
  try { return Math.round((Date.now() - fs.statSync(p).mtimeMs) / 60000); } catch { return null; }
}

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf-8")); } catch { return null; }
}

// Claims live at claims/<milestone>/claim.json (ONE per milestone, not per-unit).
// Schema: { milestone, chatId, slot, lastHeartbeat, claimedAt, units_planned[] }
const CLAIM_STALE_MS = 5 * 60 * 1000; // >5min since lastHeartbeat = reclaimable
function activeClaims() {
  try {
    if (!fs.existsSync(CLAIMS_DIR)) return [];
    const milestones = fs.readdirSync(CLAIMS_DIR).filter((d) => {
      try { return fs.statSync(path.join(CLAIMS_DIR, d)).isDirectory(); } catch { return false; }
    });
    const out = [];
    const now = Date.now();
    for (const ms of milestones) {
      const c = readJson(path.join(CLAIMS_DIR, ms, "claim.json"));
      if (!c) continue;
      const hb = c.lastHeartbeat ? new Date(c.lastHeartbeat).getTime() : 0;
      const stale = !hb || (now - hb) > CLAIM_STALE_MS;
      const units = Array.isArray(c.units_planned) ? c.units_planned.length : 0;
      out.push({
        milestone: c.milestone || ms,
        owner: c.chatId || c.slot || "?",
        units,
        stale,
      });
    }
    return out;
  } catch { return []; }
}

function buildContext(_stdin) {
  const staleMin = Number(process.env.PRISM_PICK_PREFRESH_STALE_MIN) || 30;
  const lines = [`─── pick/checkin prefresh ───────────────────────`];

  // MILESTONE_PROGRESS
  const mpAge = ageMin(path.join(STATE_DIR, "MILESTONE_PROGRESS.json"));
  if (mpAge == null) lines.push(`⚠ MILESTONE_PROGRESS.json MISSING — run: node H:/prism/scripts/build-milestone-progress.mjs`);
  else if (mpAge > staleMin) lines.push(`⚠ MILESTONE_PROGRESS ${mpAge}m stale (>${staleMin}m) — regen: node H:/prism/scripts/build-milestone-progress.mjs`);
  else lines.push(`✓ MILESTONE_PROGRESS ${mpAge}m fresh`);

  // BUILD_STATE (schema: built_engines, needs_wiring, drift_milestones, needs_frontend_merge_count)
  const bsAge = ageMin(path.join(STATE_DIR, "BUILD_STATE.json"));
  const bs = readJson(path.join(STATE_DIR, "BUILD_STATE.json"));
  if (bs?.headline) {
    const h = bs.headline;
    const built = h.built_engines ?? h.enginesWired ?? 0;
    const nw = h.needs_wiring ?? h.enginesUnwired ?? 0;
    const drift = h.drift_milestones ?? h.envelopeDrift ?? 0;
    const fp = h.needs_frontend_merge_count ?? h.frontendsPending ?? 0;
    lines.push(`✓ BUILD_STATE ${bsAge}m: ${built} built · ${nw} need-wiring · ${drift} drifted · ${fp} frontend-pending`);
  } else if (bsAge == null) {
    lines.push(`⚠ BUILD_STATE.json MISSING — run: node H:/prism/scripts/build-state-snapshot.mjs`);
  }

  // CLOSE-OUT candidates — schema: { results: [ { milestone, candidates: [...] } ] }
  const coPath = path.join(STATE_DIR, "CLOSE-OUT-CANDIDATES.json");
  const co = readJson(coPath);
  const coAge = ageMin(coPath);
  if (co && Array.isArray(co.results)) {
    const count = co.results.reduce((n, r) => n + (Array.isArray(r.candidates) ? r.candidates.length : 0), 0);
    const fresh = coAge != null && coAge < 120; // <2h
    lines.push(`${fresh ? "✓" : "⚠"} CLOSE-OUT candidates: ${count}${fresh ? "" : ` (${coAge}m stale — refresh: /close-out-audit)`}`);
  } else {
    lines.push(`· CLOSE-OUT-CANDIDATES not present (run /close-out-audit before /goal)`);
  }

  // Roadmap index
  const ri = readJson(ROADMAP_INDEX);
  if (ri && Array.isArray(ri.milestones)) {
    const inc = ri.milestones.filter((m) => m.status !== "complete").length;
    const cmp = ri.milestones.length - inc;
    lines.push(`· roadmap-index: ${ri.milestones.length} milestones · ${cmp} complete · ${inc} incomplete`);
  }

  // Active claims
  const claims = activeClaims();
  if (claims.length > 0) {
    const stale = claims.filter((c) => c.stale);
    const alive = claims.filter((c) => !c.stale);
    if (alive.length > 0) {
      lines.push(`⚠ ${alive.length} active claim(s) — don't double-claim:`);
      for (const c of alive.slice(0, 5)) lines.push(`   ${c.milestone} — ${c.owner} (${c.units} unit(s) planned)`);
    }
    if (stale.length > 0) lines.push(`· ${stale.length} stale claim(s) reclaimable (lastHeartbeat >5min old)`);
  }

  // Reminder: research order
  lines.push(`💡 Order: /system-viz → master_index → awareness-snapshot → orphan-inventory → /dedup → code`);
  lines.push(`────────────────────────────────────────────────`);
  return lines.join("\n");
}

function main() {
  if (String(process.env.PRISM_PICK_PREFRESH_DISABLE ?? "") === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const stdin = readStdin();
  const prompt = stdin?.prompt ?? stdin?.user_prompt ?? "";
  if (!TRIGGER_RX.test(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }
  const ctx = buildContext(stdin);
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
