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
 *   - RGS tool-plan sidecar for the picked unit (pipelines, skills, agents, etc.)
 *
 * The user's existing /checkin already does all of this manually. This hook
 * surfaces the SAME info BEFORE the skill runs so the chat is primed.
 *
 * Non-blocking. Pure info injection.
 *
 * Env knobs:
 *   PRISM_PICK_PREFRESH_DISABLE=1       → skip entire hook
 *   PRISM_PICK_PREFRESH_STALE_MIN=30    → staleness threshold for warnings
 *   PRISM_RGS_TOOL_PLAN_INJECT=0        → skip tool-plan section (existing behavior preserved)
 *   PRISM_RGS_SIDECAR_PATH=<path>       → override sidecar location (default: state/shared/roadmap-tool-plans.json)
 *   PRISM_RGS_PICKED_PATH=<path>        → override picked-events JSONL path
 *   PRISM_SLOT_TASK_CLAIMS_PATH=<path>  → override slot-task-claims store (U-FEEDBACK-FORCING fallback source #1)
 *   PRISM_CHAT_SLOTS_PATH=<path>        → override chat-slots store (used to map sid→slot for claim-by-slot)
 *   PRISM_CURRENT_POSITION_PATH=<path>  → override CURRENT_POSITION.md (U-FEEDBACK-FORCING fallback source #2)
 */

import * as fs from "node:fs";
import * as path from "node:path";

// TRIGGER_RX matches /pick-unit /pick-task /checkin /pick-build-close /rgs continue /continue-roadmap.
// /loop is NOT a blanket trigger — it only participates in tool-plan injection when a unit-id
// is present in the prompt (checked separately in extractUnitKey).
const TRIGGER_RX = /(^|\s)\/(pick-unit|pick-task|checkin|pick-build-close|rgs\s+continue|continue-roadmap)(\s|$)/i;

// /loop trigger: only for tool-plan injection, not for the full prefresh block.
const LOOP_RX = /(^|\s)\/loop(\s|$)/i;

const STATE_DIR = path.join("H:", "prism", "state", "shared");
const ROADMAP_INDEX = path.join("H:", "prism", "mcp-server", "data", "roadmap-index.json");
const CLAIMS_DIR = path.join("H:", "prism", "mcp-server", "data", "claims");

// ─── Tool-plan sidecar constants ────────────────────────────────────────────
const SIDECAR_DEFAULT = path.join(STATE_DIR, "roadmap-tool-plans.json");
const PICKED_JSONL_DEFAULT = path.join(STATE_DIR, "roadmap-tool-plan-picked.jsonl");
const SIDECAR_STALE_DAYS = 7;
const SIDECAR_STALE_MS = SIDECAR_STALE_DAYS * 24 * 60 * 60 * 1000;

// ─── Fallback-resolver constants (U-FEEDBACK-FORCING, RGS-TOOL-AUTOINVOKE-MS1) ─
// The composite-key gate at line 92 returned null for 100% of bare `U-...` prompts,
// so the feedback loop never recorded events. Resolver chain below enriches via
// active slot-task-claim (preferred) and CURRENT_POSITION.md (last-resort) so
// operators can type bare unit IDs (or no ID at all) and still feed telemetry.
const SLOT_TASK_CLAIMS_PATH = path.join(STATE_DIR, "slot-task-claims.json");
const CHAT_SLOTS_PATH = path.join(STATE_DIR, "chat-slots.json");
const CURRENT_POSITION_PATH = path.join(STATE_DIR, "CURRENT_POSITION.md");
// Bare unit-id token. Anchored with `\b` on both sides to avoid prefix-collision
// inside composites (those are already handled by extractUnitKey first).
const BARE_UNIT_ID_RX = /\bU-[A-Z][A-Z0-9-]{0,80}\b/;
// Same shape as extractUnitKey's matcher, used by CURRENT_POSITION parsing.
const COMPOSITE_RX = /\b([A-Z][A-Z0-9-]*)::(U-[A-Z0-9][A-Z0-9-]*)\b/;
// A slot-task-claim with an unrefreshed heartbeat older than this is considered
// stale (the slot likely crashed) and should not be used for resolution.
const CLAIM_FRESH_MS = 30 * 60 * 1000;
// Safety cap on file reads — both fallback sources are tiny, but a runaway file
// (e.g., mistakenly tee'd log) should not OOM the hook process.
const FALLBACK_READ_BYTES_CAP = 64 * 1024;

// Module-level mtime cache to avoid re-parsing on repeated calls within one process.
const _sidecarCache = { mtimeMs: -1, data: null };

/** Load plans from sidecar, using mtime cache. Returns parsed object or null. */
function loadSidecar() {
  const sidecarPath = process.env.PRISM_RGS_SIDECAR_PATH || SIDECAR_DEFAULT;
  try {
    const stat = fs.statSync(sidecarPath);
    if (stat.mtimeMs !== _sidecarCache.mtimeMs) {
      _sidecarCache.data = JSON.parse(fs.readFileSync(sidecarPath, "utf-8"));
      _sidecarCache.mtimeMs = stat.mtimeMs;
    }
    return _sidecarCache.data;
  } catch { return null; }
}

/** Return the plan entry for unitKey, or null. */
function loadToolPlan(unitKey) {
  try {
    const sidecar = loadSidecar();
    if (!sidecar || !sidecar.plans) return null;
    return sidecar.plans[unitKey] ?? null;
  } catch { return null; }
}

/** Return { isStale, sidecarGeneratedAt } for the loaded sidecar. */
function sidecarStaleness() {
  try {
    const sidecar = loadSidecar();
    if (!sidecar) return { isStale: false, sidecarGeneratedAt: null };
    const generatedAt = sidecar.generatedAt ? new Date(sidecar.generatedAt) : null;
    const isStale = generatedAt
      ? (Date.now() - generatedAt.getTime()) > SIDECAR_STALE_MS
      : false;
    return { isStale, sidecarGeneratedAt: generatedAt?.toISOString() ?? null };
  } catch { return { isStale: false, sidecarGeneratedAt: null }; }
}

/**
 * Extract the composite unit key (MS::UNIT) from a prompt string.
 * Looks for: <UPPERCASE-MS>::<UNIT> pattern.
 * Returns null if not found.
 *
 * Bare `U-...` ids in the prompt do not return a key here; they are picked up
 * by resolveUnitKey() via the fallback chain (active slot-task-claim →
 * chat-slots match → CURRENT_POSITION.md).
 */
function extractUnitKey(prompt) {
  // Match MS-A::P0-U02 style: uppercase letters/digits/hyphens on both sides of ::
  const m = prompt.match(/\b([A-Z][A-Z0-9-]*)::([A-Z0-9][A-Z0-9-]*)\b/);
  if (m) return `${m[1]}::${m[2]}`;
  return null;
}

/** Read up to FALLBACK_READ_BYTES_CAP bytes of a text file; return null on miss. */
function readTextCapped(p) {
  try {
    const stat = fs.statSync(p);
    if (!stat.isFile()) return null;
    const fd = fs.openSync(p, "r");
    try {
      const len = Math.min(stat.size, FALLBACK_READ_BYTES_CAP);
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, 0);
      return buf.toString("utf-8");
    } finally { fs.closeSync(fd); }
  } catch { return null; }
}

/** Load slot-task-claims.json claims map, or null on any failure. */
function loadSlotTaskClaims() {
  try {
    const overridePath = process.env.PRISM_SLOT_TASK_CLAIMS_PATH;
    const txt = readTextCapped(overridePath || SLOT_TASK_CLAIMS_PATH);
    if (!txt) return null;
    const j = JSON.parse(txt);
    if (!j || typeof j.claims !== "object" || j.claims === null) return null;
    return j.claims;
  } catch { return null; }
}

/** Treat a claim as usable when its heartbeat or expiresAt is still in-window. */
function isClaimFresh(claim) {
  if (!claim || typeof claim !== "object") return false;
  // expiresAt is authoritative when present (claim writer set its own TTL).
  if (typeof claim.expiresAt === "string") {
    const exp = Date.parse(claim.expiresAt);
    if (Number.isFinite(exp)) return Date.now() < exp;
  }
  if (typeof claim.lastHeartbeat === "string") {
    const hb = Date.parse(claim.lastHeartbeat);
    if (Number.isFinite(hb)) return Date.now() - hb < CLAIM_FRESH_MS;
  }
  return false;
}

/**
 * Parse CURRENT_POSITION.md for a milestone + unit pair. Tolerant of three shapes:
 *   1. Any bare composite token MS::U-ID anywhere in the file.
 *   2. Frontmatter or body lines `milestone: <ID>` + `unit: <U-...>`.
 *   3. A commit-subject-style `[<MS>]/<U-...>` token.
 * Returns { milestone, unit } or null.
 */
function readCurrentPosition() {
  const overridePath = process.env.PRISM_CURRENT_POSITION_PATH;
  const txt = readTextCapped(overridePath || CURRENT_POSITION_PATH);
  if (!txt) return null;
  const composite = txt.match(COMPOSITE_RX);
  if (composite) return { milestone: composite[1], unit: composite[2] };
  const bracket = txt.match(/\[([A-Z][A-Z0-9-]*)\]\/(U-[A-Z0-9][A-Z0-9-]*)/);
  if (bracket) return { milestone: bracket[1], unit: bracket[2] };
  const ms = txt.match(/^[ \t]*milestone[ \t]*:[ \t]*([A-Z][A-Z0-9-]*)\b/im);
  const u  = txt.match(/^[ \t]*unit[ \t]*:[ \t]*(U-[A-Z][A-Z0-9-]*)\b/im);
  if (ms && u) return { milestone: ms[1], unit: u[1] };
  return null;
}

/**
 * Look up this chat's own slot-task-claim by deriving chatId from the harness
 * session_id (convention: `claude-<first-8-hex-of-uuid>`), then matching
 * chat-slots.json entries. Best-effort — any miss returns null.
 */
// chatId convention: stable-session-id is `claude-<first-N-hex-of-sid>`.
// N=8 is set by .claude/helpers/stable-session-id.mjs and matches the
// chat-slots.json writer, so we mirror it here exactly.
const CHAT_ID_HEX_LEN = 8;
function lookupOwnSlotClaim(sid, claims) {
  if (typeof sid !== "string" || sid.length < CHAT_ID_HEX_LEN) return null;
  const derivedChatId = "claude-" + sid.slice(0, CHAT_ID_HEX_LEN).toLowerCase();
  let slotsRoot;
  try {
    const overridePath = process.env.PRISM_CHAT_SLOTS_PATH;
    const txt = readTextCapped(overridePath || CHAT_SLOTS_PATH);
    if (!txt) return null;
    slotsRoot = JSON.parse(txt);
  } catch { return null; }
  const slots = slotsRoot?.slots;
  if (!slots || typeof slots !== "object") return null;
  for (const [slotName, slotState] of Object.entries(slots)) {
    if (slotState && typeof slotState === "object" && slotState.chatId === derivedChatId) {
      const claim = claims?.[slotName];
      if (claim && isClaimFresh(claim) && typeof claim.unitId === "string"
          && claim.unitId.includes("::")) {
        return claim;
      }
      return null;
    }
  }
  return null;
}

/**
 * Resolve a composite unit key from the prompt with fallback signals.
 * Returns { unitKey, resolutionSource } or null. Sources, in priority order:
 *   • composite-typed — prompt already contains MS::UNIT
 *   • claim-by-bare-id — prompt has bare U-... + exactly one fresh claim matches
 *   • claim-by-slot — chat's own fresh slot-task-claim (no ID in prompt needed)
 *   • current-position — state/shared/CURRENT_POSITION.md
 * Ambiguous matches (multiple claims tail-match the same bare ID) return null
 * to avoid silently picking the wrong owner's milestone.
 */
function resolveUnitKey(prompt, stdin) {
  if (typeof prompt !== "string" || prompt.length === 0) return null;

  const composite = extractUnitKey(prompt);
  if (composite) return { unitKey: composite, resolutionSource: "composite-typed" };

  const claims = loadSlotTaskClaims();

  const bareMatch = prompt.match(BARE_UNIT_ID_RX);
  if (bareMatch && claims) {
    const bareId = bareMatch[0];
    const suffix = "::" + bareId;
    const matches = [];
    for (const claim of Object.values(claims)) {
      if (!claim || typeof claim.unitId !== "string") continue;
      if (!isClaimFresh(claim)) continue;
      if (claim.unitId.endsWith(suffix)) matches.push(claim);
    }
    if (matches.length === 1) {
      return { unitKey: matches[0].unitId, resolutionSource: "claim-by-bare-id" };
    }
    // Multiple matches → ambiguous; fall through rather than guess.
  }

  if (claims) {
    const own = lookupOwnSlotClaim(stdin?.session_id, claims);
    if (own) return { unitKey: own.unitId, resolutionSource: "claim-by-slot" };
  }

  const cp = readCurrentPosition();
  if (cp) {
    return { unitKey: `${cp.milestone}::${cp.unit}`, resolutionSource: "current-position" };
  }

  return null;
}

/** Append a line to the picked-events JSONL. Silently swallows write errors. */
function appendPickedEvent(event) {
  try {
    const pickedPath = process.env.PRISM_RGS_PICKED_PATH || PICKED_JSONL_DEFAULT;
    fs.appendFileSync(pickedPath, JSON.stringify(event) + "\n");
  } catch { /* write failure must never break the hook */ }
}

/**
 * Build the tool-plan section string to append to additionalContext.
 * Returns null if no plan found or injection is disabled.
 * Side-effect: appends to picked-events JSONL.
 *
 * @param {{unitKey: string, resolutionSource: string}|null} resolved - output of
 *   resolveUnitKey(); main() resolves once and passes the result through so both
 *   the loop-trigger gate and the section builder see the same answer.
 */
function buildToolPlanSection(resolved, sid) {
  if (String(process.env.PRISM_RGS_TOOL_PLAN_INJECT ?? "") === "0") return null;
  if (!resolved) return null;
  const { unitKey, resolutionSource } = resolved;
  if (!unitKey) return null;

  // Sidecar stores the ToolPlan FLAT: plans[unitKey] IS the plan (no .plan
  // nesting). loadToolPlan returns that plan object directly.
  const plan = loadToolPlan(unitKey);
  if (!plan) return null;

  const { isStale: sidecarAged } = sidecarStaleness();
  const planStale = plan.stale === true || sidecarAged;

  const lines = [];

  if (planStale) {
    lines.push(`⚠ STALE PLAN (sidecar aged / source may have changed) — re-derive critical steps`);
    // Append stale-on-pickup event
    appendPickedEvent({
      v: 1,
      ts: new Date().toISOString(),
      unitKey,
      sid: sid || "unknown",
      resolutionSource,
      event: "stale-on-pickup",
    });
  }

  lines.push(`─── RGS tool-plan: ${unitKey} ───────────────────`);

  // Pipelines
  if (Array.isArray(plan.pipelines) && plan.pipelines.length > 0) {
    lines.push(`  pipelines:`);
    for (const p of plan.pipelines) {
      const conf = p.confidence != null ? ` (${Math.round(p.confidence * 100)}%)` : "";
      lines.push(`    • ${p.skill}${conf}`);
    }
  }

  // Skills
  if (Array.isArray(plan.skills) && plan.skills.length > 0) {
    lines.push(`  skills: ${plan.skills.join(", ")}`);
  }

  // Tribal tips — handle both string and object shape {id,tip,score,domain}
  if (Array.isArray(plan.tribal) && plan.tribal.length > 0) {
    lines.push(`  tribal:`);
    for (const t of plan.tribal) {
      const text = typeof t === "string" ? t : (t && t.tip ? t.tip : String(t));
      lines.push(`    • ${text}`);
    }
  }

  // Agents
  if (Array.isArray(plan.agents) && plan.agents.length > 0) {
    lines.push(`  agents: ${plan.agents.join(", ")}`);
  }

  // MCP tools
  if (Array.isArray(plan.mcpTools) && plan.mcpTools.length > 0) {
    lines.push(`  mcpTools: ${plan.mcpTools.join(", ")}`);
  }

  // Build vs integrate, complexity, rationale, source
  if (plan.buildVsIntegrate) lines.push(`  buildVsIntegrate: ${plan.buildVsIntegrate}`);
  if (plan.complexityTier)   lines.push(`  complexityTier: ${plan.complexityTier}`);
  if (plan.rationale)        lines.push(`  rationale: ${plan.rationale}`);
  if (plan.source)           lines.push(`  source: ${plan.source}`);

  lines.push(`────────────────────────────────────────────────`);

  // Append picked event (always, even if stale)
  appendPickedEvent({
    v: 1,
    ts: new Date().toISOString(),
    unitKey,
    sid: sid || "unknown",
    resolutionSource,
    predictedPipelines: Array.isArray(plan.pipelines)
      ? plan.pipelines.map(p => p.skill)
      : [],
    // tier + verdict feed the outcome-record schema so the feedback loop can
    // re-rank per (pipeline, tier, verdict). Flat ToolPlan fields.
    tier: typeof plan.complexityTier === "string" ? plan.complexityTier : "",
    verdict: typeof plan.buildVsIntegrate === "string" ? plan.buildVsIntegrate : "",
    event: "picked",
  });

  return lines.join("\n");
}

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
  const sid = stdin?.session_id ?? "unknown";

  const fullPrefreshTrigger = TRIGGER_RX.test(prompt);

  // Resolve the unit key once with the full fallback chain. Used for both the
  // /loop trigger gate AND the tool-plan section so they agree on the answer.
  // resolveUnitKey is a no-op on empty/null prompts and short-circuits cheaply.
  const resolved = resolveUnitKey(prompt, stdin);

  // /loop alone is NOT a prefresh trigger — only participates in tool-plan injection
  // when the resolver returns a unit (typed composite OR fallback-resolved).
  const loopWithUnitId = LOOP_RX.test(prompt) && resolved !== null;

  if (!fullPrefreshTrigger && !loopWithUnitId) {
    // Fast path: emit minimal continue:true, no hookSpecificOutput
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Build the prefresh context block (only for full trigger, not bare /loop)
  let ctx = fullPrefreshTrigger ? buildContext(stdin) : null;

  // Build tool-plan section and append to ctx (single combined block)
  const toolPlanSection = buildToolPlanSection(resolved, sid);
  if (toolPlanSection) {
    ctx = ctx ? ctx + "\n" + toolPlanSection : toolPlanSection;
  }

  if (!ctx) {
    // loopWithUnitId but no plan found — nothing to inject
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
}

try { main(); }
catch { process.stdout.write(JSON.stringify({ continue: true })); }
