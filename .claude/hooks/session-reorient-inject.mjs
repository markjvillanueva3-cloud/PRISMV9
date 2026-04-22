#!/usr/bin/env node
/**
 * session-reorient-inject.mjs — UserPromptSubmit hook
 *
 * MODEL-AWARE: only fires intensive reorientation when the user is on
 * Opus 4.7 1M (the model with the 200k+ degradation curve). For Sonnet
 * 4.6, Opus 4.5, Opus 4.6, Haiku 4.5 etc — exits silently because their
 * 200k native windows compact at the limit anyway, no in-context refresh
 * is needed.
 *
 * TOKEN-AWARE CADENCE (4.7 1M only):
 *   Fresh    (0–150k):    every 20 prompts, 400-token brief
 *   Warm     (150k–250k): every 15 prompts, 600-token brief
 *   Degrading (250k–400k): every 8 prompts, 1000-token brief, force objective re-anchor
 *   Critical (400k+):     every 4 prompts, 1500-token brief, recommend /handoff
 *
 * Token position read from state/context_pressure.json (PRISM already tracks).
 *
 * Non-blocking: never denies the prompt, only adds context.
 */

import * as fs from "fs";
import * as path from "path";

// ── Session ID resolution ───────────────────────────────────────────
function resolveSessionId() {
  const candidates = [
    process.env.CLAUDE_SESSION_ID,
    process.env.TERM_SESSION_ID,
    process.env.CLAUDE_TERMINAL_ID,
    process.env.SSH_TTY,
    process.env.WT_SESSION,
    process.ppid ? `ppid_${process.ppid}` : null,
  ];
  for (const c of candidates) {
    if (c && String(c).trim().length > 0) {
      return String(c).replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
    }
  }
  return "default";
}

const SESSION_ID = resolveSessionId();
const STATE_DIR = "H:/prism/state/session-reorientation";
const STATE_FILE = path.join(STATE_DIR, `reorientation-${SESSION_ID}.json`);
const PRESSURE_FILE = "H:/prism/state/context_pressure.json";

// ── Model detection (mirrors ModelAwareSelfAwarenessEngine) ────────
const TIER_PATTERNS = [
  { tier: "opus_4_7_1m", window: 1_000_000, re: /opus[-.]?4[-.]?7.*?1m/i },
  { tier: "opus_4_7_1m", window: 1_000_000, re: /(?:claude-)?opus[-.]?4[-.]?7\b/i },
  { tier: "opus_4_6", window: 200_000, re: /(?:claude-)?opus[-.]?4[-.]?6\b/i },
  { tier: "opus_4_5", window: 200_000, re: /(?:claude-)?opus[-.]?4[-.]?5\b/i },
  { tier: "sonnet_4_6", window: 200_000, re: /(?:claude-)?sonnet[-.]?4[-.]?6\b/i },
  { tier: "haiku_4_5", window: 200_000, re: /(?:claude-)?haiku[-.]?4[-.]?5\b/i },
];

function detectModel(payloadModel) {
  const raw =
    payloadModel ||
    process.env.CLAUDE_MODEL ||
    process.env.ANTHROPIC_MODEL ||
    readSettingsModel() ||
    "";
  for (const { tier, window, re } of TIER_PATTERNS) {
    if (re.test(raw)) {
      return { raw, tier, window, intensive: tier === "opus_4_7_1m" };
    }
  }
  return { raw, tier: "unknown", window: 0, intensive: false };
}

function readSettingsModel() {
  const paths = [
    "H:/prism/.claude/settings.json",
    "H:/.claude/settings.json",
    "C:/Users/Mark Villanueva/.claude/settings.json",
  ];
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const json = JSON.parse(fs.readFileSync(p, "utf8"));
      const m = json?.model || json?.Model || json?.defaultModel;
      if (typeof m === "string" && m.length > 0) return m;
    } catch {}
  }
  return null;
}

// ── Token-position cadence (degradation-curve calibrated) ──────────
function zoneForTokens(consumed, window = 1_000_000) {
  if (window <= 0) return "fresh";
  const pct = consumed / window;
  if (pct < 0.15) return "fresh";
  if (pct < 0.25) return "warm";
  if (pct < 0.40) return "degrading";
  return "critical";
}

function cadenceFor(zone) {
  const map = {
    fresh:     { promptInterval: 20, briefMaxTokens: 400,  forceObjective: false, recommendHandoff: false },
    warm:      { promptInterval: 15, briefMaxTokens: 600,  forceObjective: false, recommendHandoff: false },
    degrading: { promptInterval: 8,  briefMaxTokens: 1000, forceObjective: true,  recommendHandoff: false },
    critical:  { promptInterval: 4,  briefMaxTokens: 1500, forceObjective: true,  recommendHandoff: true },
  };
  return { zone, ...map[zone] };
}

function readConsumedTokens() {
  try {
    if (!fs.existsSync(PRESSURE_FILE)) return 0;
    const data = JSON.parse(fs.readFileSync(PRESSURE_FILE, "utf8"));
    return Number(
      data.totalTokens ?? data.tokens ?? data.consumed ?? data.currentTokens ?? data.used ?? 0
    ) || 0;
  } catch {
    return 0;
  }
}

// ── State I/O (atomic) ─────────────────────────────────────────────
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    }
  } catch {
    // try last-good backup
    try {
      const backup = `${STATE_FILE}.last-good`;
      if (fs.existsSync(backup)) {
        return JSON.parse(fs.readFileSync(backup, "utf8"));
      }
    } catch {}
  }
  return null;
}

function saveState(state) {
  try {
    if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
    const tmp = `${STATE_FILE}.tmp.${process.pid}.${Date.now().toString(36)}`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, STATE_FILE);
  } catch {
    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch {}
  }
}

// ── Drift detection ────────────────────────────────────────────────
function detectDrift(state) {
  const window = state.config?.driftWindowSize ?? 10;
  const threshold = state.config?.driftThreshold ?? 0.7;
  const active = (state.anchors || []).filter((a) => a.active);
  if (active.length < window * 2) return { drifted: false, from: [], to: [] };
  const olderSlice = active.slice(-window * 2, -window);
  const recentSlice = active.slice(-window);
  const collect = (xs) => {
    const s = new Set();
    for (const a of xs) for (const t of a.tags || []) s.add(t);
    return s;
  };
  const fromTags = collect(olderSlice);
  const toTags = collect(recentSlice);
  const intersect = [...fromTags].filter((t) => toTags.has(t));
  const overlap = fromTags.size > 0 ? intersect.length / fromTags.size : 1;
  return {
    drifted: overlap < 1 - threshold,
    from: [...fromTags].filter((t) => !toTags.has(t)).slice(0, 5),
    to: [...toTags].filter((t) => !fromTags.has(t)).slice(0, 5),
  };
}

// ── Brief construction (degradation-aware content priority) ────────
// Priority order under degradation (per research on what Opus loses first):
//   1. ABSOLUTE FILE PATHS (Opus hallucinates by 300k)
//   2. ORIGINAL USER REQUEST verbatim
//   3. "Already tried and failed" list
//   4. Active type signatures / function names
//   5. Open todos
function buildBrief(state, trigger, cadence, modelInfo, consumedTokens) {
  const active = (state.anchors || []).filter((a) => a.active);
  const objective = [...active].reverse().find(
    (a) => a.type === "task_anchor" || a.type === "user_directive"
  );

  const filesMap = new Map();
  for (let i = active.length - 1; i >= 0; i--) {
    for (const f of active[i].files || []) {
      if (!filesMap.has(f)) filesMap.set(f, i);
    }
  }
  const activeFiles = [...filesMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([f]) => f);

  const decisions = active.filter((a) => a.type === "decision").slice(-5);
  const milestones = active.filter((a) => a.type === "milestone").slice(-7);
  const errors = (state.anchors || [])
    .filter((a) => a.type === "error_resolved")
    .slice(-5);

  const drift = detectDrift(state);

  const lines = [];
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`🧭 SESSION REORIENTATION — zone=${cadence.zone} (${(consumedTokens / 1000).toFixed(0)}k/${(modelInfo.window / 1000).toFixed(0)}k tokens)`);
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push(`Trigger: ${trigger} | Model: ${modelInfo.tier}`);
  lines.push("");

  // OBJECTIVE FIRST — re-anchor verbatim under degradation
  if (objective) {
    if (cadence.forceObjective) {
      lines.push("📌 OBJECTIVE (re-anchored verbatim — DO NOT drift from this):");
      lines.push(`   ${objective.summary}`);
      if (objective.rationale) lines.push(`   WHY: ${objective.rationale}`);
    } else {
      lines.push(`OBJECTIVE: ${objective.summary}`);
      if (objective.rationale) lines.push(`WHY: ${objective.rationale}`);
    }
    lines.push("");
  }

  // FILE PATHS — verbatim, with full paths (Opus hallucinates these)
  if (activeFiles.length > 0) {
    lines.push("📁 ACTIVE FILES (use these EXACT paths — do not paraphrase):");
    for (const f of activeFiles) lines.push(`   ${f}`);
    lines.push("");
  }

  // ALREADY TRIED & FAILED — combats circular reasoning failure mode
  if (errors.length > 0) {
    lines.push("⛔ ALREADY-RESOLVED ERRORS — do NOT re-attempt these failures:");
    for (const e of errors) lines.push(`   - ${e.summary}`);
    lines.push("");
  }

  if (decisions.length > 0) {
    lines.push("✅ DECISIONS MADE (still binding):");
    for (const d of decisions) {
      const why = d.rationale ? ` — ${d.rationale}` : "";
      lines.push(`   - ${d.summary}${why}`);
    }
    lines.push("");
  }

  if (milestones.length > 0) {
    lines.push("📋 OPEN TODOS:");
    for (const m of milestones) lines.push(`   - ${m.summary}`);
    lines.push("");
  }

  if (drift.drifted) {
    lines.push("⚠️  TOPIC DRIFT DETECTED");
    lines.push(`   Was: ${drift.from.join(", ")}`);
    lines.push(`   Now: ${drift.to.join(", ")}`);
    lines.push("   Return to OBJECTIVE above unless drift is intentional.");
    lines.push("");
  }

  if (cadence.recommendHandoff) {
    lines.push("🚨 CRITICAL ZONE — Opus 4.7 degrades severely past 400k tokens.");
    lines.push("   Recommend: complete current unit, run /handoff, restart session.");
    lines.push("   Symptoms to watch: hallucinated paths, contradicting prior decisions,");
    lines.push("   re-attempting fixed errors, paraphrased file names.");
    lines.push("");
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  return lines.join("\n");
}

// ── Main ───────────────────────────────────────────────────────────
async function main() {
  let input;
  try {
    input = JSON.parse(await fs.promises.readFile("/dev/stdin", "utf8"));
  } catch {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Model gate: only fire on Opus 4.7 1M
  const modelInfo = detectModel(input?.model);
  if (!modelInfo.intensive) {
    // Non-1M model — exit silently. Compaction handles native limits.
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const state = loadState();
  if (!state || !state.anchors || state.anchors.length === 0) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  // Increment prompt counter
  state.stats = state.stats || {
    promptsSeen: 0,
    toolCallsSeen: 0,
    anchorsRecorded: 0,
    briefsGenerated: 0,
    lastBriefAt: null,
    promptsSinceLastBrief: 0,
    toolCallsSinceLastBrief: 0,
  };
  state.stats.promptsSeen += 1;
  state.stats.promptsSinceLastBrief += 1;

  // Token-aware cadence
  const consumedTokens = readConsumedTokens();
  const cadence = cadenceFor(zoneForTokens(consumedTokens, modelInfo.window));

  let trigger = null;
  if (state.stats.promptsSinceLastBrief >= cadence.promptInterval) {
    trigger = `prompt_interval (${state.stats.promptsSinceLastBrief}/${cadence.promptInterval}, zone=${cadence.zone})`;
  } else {
    const drift = detectDrift(state);
    if (drift.drifted) trigger = `topic_drift (zone=${cadence.zone})`;
  }

  if (!trigger) {
    saveState(state);
    console.log(JSON.stringify({ continue: true }));
    return;
  }

  const brief = buildBrief(state, trigger, cadence, modelInfo, consumedTokens);
  const maxChars = cadence.briefMaxTokens * 4;
  const capped = brief.length > maxChars ? brief.slice(0, maxChars) + "\n[... brief truncated]" : brief;

  // Reset counters
  state.stats.briefsGenerated = (state.stats.briefsGenerated || 0) + 1;
  state.stats.lastBriefAt = new Date().toISOString();
  state.stats.promptsSinceLastBrief = 0;
  state.stats.toolCallsSinceLastBrief = 0;
  state.briefHistory = state.briefHistory || [];
  state.briefHistory.push({
    at: state.stats.lastBriefAt,
    tokens: Math.ceil(capped.length / 4),
    trigger,
    zone: cadence.zone,
    consumedTokens,
  });
  if (state.briefHistory.length > 50) {
    state.briefHistory = state.briefHistory.slice(-50);
  }
  saveState(state);

  console.log(JSON.stringify({ continue: true, message: capped }));
}

main().catch(() => {
  console.log(JSON.stringify({ continue: true }));
});
