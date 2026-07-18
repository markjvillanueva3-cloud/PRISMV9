#!/usr/bin/env node
// tier: T4
/**
 * prism-awareness-v2.mjs — SessionStart hook
 * ==================================================
 *
 * Unified baseline-awareness injector for every prompt. Replaces the
 * scattered SessionStart dashboards (22KB of overlapping briefings)
 * with ONE focused ≤350-token injection that answers:
 *
 *   1. Where are we on the roadmap?  (position + nearest in-progress)
 *   2. What are other chats doing?    (last 2 lanes from AGENT_WORKBOARD)
 *   3. What are the load-bearing protocols? (dedup guard, canonical
 *      constants, /forge-triple for new capabilities)
 *
 * It complements `self-awareness-auto-inject.mjs` which fires KEYWORD-
 * triggered context (customer names → JM Die path, material → tribal
 * tips, etc.). This hook is the persistent baseline, that fires the
 * static signal. Together they give: what is built, what is being
 * built, how we build — on every prompt, <500 tokens combined.
 *
 * Fast path: all sources cached to .claude/cache/awareness-v2.json
 * (5-min TTL). Cache miss re-reads, cache hit takes ~5ms.
 *
 * Output shape (current Claude Code schema):
 *   {
 *     continue: true,
 *     hookSpecificOutput: {
 *       hookEventName: "SessionStart",  // matches event type from input
 *       additionalContext: "## ..."
 *     }
 *   }
 */

import { shouldSkipHook as _hp_shouldSkip } from "../helpers/hook-profile.mjs";
import { promises as fs } from "node:fs";
import path from "node:path";

const REPO_ROOT = "H:/prism";
const CACHE_FILE = path.join(REPO_ROOT, ".claude/cache/awareness-v2.json");
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const SOURCES = {
  position: path.join(REPO_ROOT, "state/CURRENT_POSITION.md"),
  chat: path.join(REPO_ROOT, "state/shared/AGENT_CHAT.md"),
  inventory: path.join(REPO_ROOT, "PRISM-INVENTORY-LATEST.md"),
  roadmapIdx: path.join(REPO_ROOT, "mcp-server/data/roadmap-index.json"),
};

// -----------------------------------------------------------------------
// Read helpers (always fail-open — baseline awareness never breaks flow)
// -----------------------------------------------------------------------
async function readStdin() {
  return new Promise((resolve) => {
    let buf = "";
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      try { resolve(JSON.parse(buf || "{}")); } catch { resolve({}); }
    };
    process.stdin.on("data", (c) => (buf += c));
    process.stdin.on("end", finish);
    setTimeout(finish, 300);
  });
}

async function safeRead(p, max = 64 * 1024) {
  try {
    const stat = await fs.stat(p);
    if (stat.size > max) {
      const fh = await fs.open(p, "r");
      try {
        const buf = Buffer.alloc(max);
        await fh.read(buf, 0, max, 0);
        return buf.toString("utf8");
      } finally { await fh.close(); }
    }
    return await fs.readFile(p, "utf8");
  } catch { return null; }
}

async function readJson(p) {
  try { return JSON.parse(await fs.readFile(p, "utf8")); } catch { return null; }
}

async function readCache() {
  try {
    const c = JSON.parse(await fs.readFile(CACHE_FILE, "utf8"));
    if (Date.now() - (c.generated_at || 0) < CACHE_TTL_MS) return c;
  } catch { /* cache miss */ }
  return null;
}

async function writeCache(data) {
  try {
    await fs.mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(data));
  } catch { /* non-fatal */ }
}

// -----------------------------------------------------------------------
// Extractors — pull the smallest useful signal from each source
// -----------------------------------------------------------------------
function extractPhase(positionMd) {
  if (!positionMd) return "unknown";
  const m = positionMd.match(/\*\*Phase:\*\*\s*([^\n]+?)(?:\s*—|\n|$)/);
  return m ? m[1].trim().slice(0, 90) : "unknown";
}

function extractCounts(positionMd) {
  if (!positionMd) return null;
  const rm = positionMd.match(/Roadmap Index:\*\*\s*v[\d.]+\s*\((\d+)\s*milestones?,\s*(\d+)\s*complete\)/i);
  return rm ? { total: Number(rm[1]), done: Number(rm[2]) } : null;
}

function extractEngineCount(inventoryMd) {
  if (!inventoryMd) return null;
  const m = inventoryMd.match(/engines?[\s\S]{0,40}?(\d[\d,]{2,})/i);
  return m ? m[1].replace(/,/g, "") : null;
}

function extractInProgressMilestones(roadmapIndex) {
  if (!roadmapIndex || !Array.isArray(roadmapIndex.milestones)) return [];
  return roadmapIndex.milestones
    .filter((m) => m && m.status === "in_progress")
    .slice(0, 3)
    .map((m) => m.id || m.name)
    .filter(Boolean);
}

function extractRecentLanes(chatMd) {
  if (!chatMd) return [];
  // AGENT_CHAT.md entries: `- 2026-04-21T04:14:28Z — Agent: <message> [status=... | instance=<family>@<machine>/<pid>]`
  // Latest entries are at the bottom. Take last 60 lines, keep most recent
  // distinct {family, pid} so we don't repeat the same chat.
  const now = Date.now();
  const lines = chatMd.split("\n");
  const entryRe = /^-\s*(\S+)\s*—\s*(\S+):\s*(.*?)(?:\s*\[(.*?)\])?\s*$/;
  const out = [];
  const seen = new Set();
  for (let i = lines.length - 1; i >= 0 && out.length < 2; i--) {
    const m = entryRe.exec(lines[i]);
    if (!m) continue;
    const ts = m[1];
    const family = m[2];
    const msg = m[3];
    const meta = m[4] || "";
    // Age filter: skip if > 15 min old (stale)
    const when = Date.parse(ts);
    if (!Number.isFinite(when) || now - when > 15 * 60 * 1000) continue;
    const instMatch = /instance=([^\s|]+)/.exec(meta);
    const inst = instMatch ? instMatch[1] : family;
    if (seen.has(inst)) continue;
    seen.add(inst);
    // Short handle: family + last 4 of pid
    const pidMatch = /pid-(\d+)/.exec(inst);
    const handle = pidMatch ? `${family}(${pidMatch[1].slice(-4)})` : family;
    out.push({ agent: handle, msg: msg.slice(0, 55) });
  }
  return out;
}

// -----------------------------------------------------------------------
// Intent detection (lightweight — heavy keyword work lives in
// self-awareness-auto-inject.mjs to avoid double-firing)
// -----------------------------------------------------------------------
function detectIntent(prompt) {
  const p = (prompt || "").toLowerCase();
  if (!p) return null;
  // Creation triggers: verb + (optional adjectives) + asset noun within 40 chars
  if (/\b(?:create|build|make|add|generate|write|implement)\b[^.!?\n]{0,40}?\b(?:engine|hook|skill|algorithm|formula|dispatcher|action|command)s?\b/.test(p)) {
    return "create";
  }
  if (/\bnew\s+[a-z ]{0,30}?\b(?:engine|hook|skill|algorithm|formula|dispatcher|action|command)s?\b/.test(p)) {
    return "create";
  }
  // Investigation: show what exists
  if (/\b(?:what|which|list|show|find|explore|search)\b[^.!?\n]{0,40}?\b(?:engine|hook|skill|dispatcher|action|capability|feature)s?\b/.test(p)) {
    return "query";
  }
  // Fix/debug: show current position
  if (/\b(?:fix|debug|broken|error|bug|failing|doesn'?t work)\b/.test(p)) {
    return "fix";
  }
  return null;
}

// -----------------------------------------------------------------------
// Assemble the injection — ≤350 tokens, markdown
// -----------------------------------------------------------------------
function buildInjection(data, intent) {
  const lines = [];
  lines.push("## PRISM baseline awareness");

  // Line 1: roadmap position
  if (data.phase && data.phase !== "unknown") {
    const progress = data.counts
      ? ` · ${data.counts.done}/${data.counts.total} milestones`
      : "";
    lines.push(`**Phase:** ${data.phase}${progress}`);
  }

  // Line 2: in-progress milestones (what's being built right now)
  if (data.inProgress && data.inProgress.length > 0) {
    lines.push(`**In progress:** ${data.inProgress.join(", ")}`);
  }

  // Line 3: what's built (inventory one-liner)
  if (data.engineCount) {
    lines.push(`**Built:** ${data.engineCount} engines · 90 dispatchers · full inventory in \`PRISM-INVENTORY-LATEST.md\``);
  }

  // Line 4: other chats — don't step on their work
  if (data.recentLanes && data.recentLanes.length > 0) {
    const lanes = data.recentLanes
      .map((l) => `${l.agent} ${l.msg}`)
      .join(" · ");
    lines.push(`**Other chats (recent):** ${lanes}`);
  }

  // Intent-driven protocol reminder
  if (intent === "create") {
    const n = data.engineCount ? `${data.engineCount}+` : "thousands of";
    lines.push(
      "**Before creating:** run `duplicationGuardEngine.checkBeforeCreating()` or the `/dedup` skill. " +
      `Check \`ENGINE_DIGEST.md\` first — the system has ${n} engines. ` +
      "Use `/forge-triple` to ship engine + skill + hook together.",
    );
  } else if (intent === "query") {
    lines.push(
      "**For capability queries:** use `prism_knowledge:search_features` or read the three digests: " +
      "`ENGINE_DIGEST.md`, `DISPATCHER_DIGEST.md`, `DIRECTORY_DIGEST.md` in `mcp-server/data/docs/`.",
    );
  } else if (intent === "fix") {
    lines.push(
      "**Before fixing:** check `state/HANDOFF.md` for context, run the affected test, then fix. " +
      "Never weaken assertions or `.skip` tests to pass.",
    );
  }

  // Always-on protocol reminder (1 line)
  lines.push(
    "**How we build:** physics constants from `src/physics/constants.ts` (never inline); " +
    "every new engine ships with real tests + dispatcher wiring; " +
    "commit subject `[SCOPE]/U-ID: title` (use `[MAIN]` prefix when outside scope worktree).",
  );

  // Terse hook-audit notice so other chats don't re-run the same cuts
  // or chase "missing" advisory output. Dynamic presence check keeps it
  // accurate if the audit is ever reverted.
  if (data.hookAuditActive) {
    lines.push(
      "**Hook audit active:** 23 advisory hooks short-circuited for token economy — " +
      "see `.claude/helpers/apply-hook-fixes.mjs` to audit or revert (marker: `DISABLED_TOKEN_REDUX_2026_04_23`).",
    );
  }

  return lines.join("\n");
}

// -----------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------
async function main() {
  if (_hp_shouldSkip("prism-awareness-v2")) { console.log(JSON.stringify({ continue: true })); return; }
  const input = await readStdin();
  // Detect event type from input or default to SessionStart (how it's wired)
  const eventType = input.event || input.eventType || input.hookType || "SessionStart";
  const prompt = input.prompt || input.message || "";

  let data = await readCache();
  if (!data) {
    const [position, chat, inventory, roadmapIdx] = await Promise.all([
      safeRead(SOURCES.position, 16 * 1024),
      safeRead(SOURCES.chat, 64 * 1024),
      safeRead(SOURCES.inventory, 8 * 1024),
      readJson(SOURCES.roadmapIdx),
    ]);
    let hookAuditActive = false;
    try {
      const helper = await safeRead(path.join(REPO_ROOT, ".claude/helpers/apply-hook-fixes.mjs"), 8 * 1024);
      hookAuditActive = !!helper && helper.includes("DISABLED_TOKEN_REDUX_2026_04_23");
    } catch { /* non-fatal */ }

    data = {
      generated_at: Date.now(),
      phase: extractPhase(position),
      counts: extractCounts(position),
      engineCount: extractEngineCount(inventory),
      inProgress: extractInProgressMilestones(roadmapIdx),
      recentLanes: extractRecentLanes(chat),
      hookAuditActive,
    };
    await writeCache(data);
  }

  const intent = detectIntent(prompt);
  const ctx = buildInjection(data, intent);

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: eventType,
      additionalContext: ctx,
    },
  }));
}

main().catch(() => {
  // Fail-open — never break a prompt on baseline-awareness errors
  process.stdout.write(JSON.stringify({ continue: true }));
});
