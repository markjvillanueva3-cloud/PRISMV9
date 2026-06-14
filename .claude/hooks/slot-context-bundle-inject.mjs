#!/usr/bin/env node
// tier: T2
// ZULU-OMNISCIENT-MS0/U-ZO-MS0-FLEET-PRECHECK — per-slot context-bundle precheck.
//
// UserPromptSubmit hook. For the slot bound to this chat, calls loadSlotContext
// from scripts/lib/zulu-context-bundle.mjs and injects a COMPACT summary of
// the slot's MS0 read-side state (soul refuse_list / loop running / token zone
// / bridge units available / decision recommendation) into the prompt context.
//
// Generalizes the Zulu orchestrator's bundle read to EVERY chat (per
// 2026-05-25 bravo design discussion). The LIBRARY is slot-agnostic — this
// hook makes each chat self-aware without spawning N sweep processes
// (O(1) per chat, not O(N²) cross-slot).
//
// Wired in settings.json UserPromptSubmit chain — adjacent to slot-soul-inject.
//
// PSN-leg aggregation: composes 5 of 11 PSN legs into the injected block:
//   #7 BUILD-VISION/CLAUDE-BRIEF · #9 ROADMAP-CONSOLIDATED · #19 slot souls
//   · #29 loop-state · #21 TOKEN-AWARENESS
//
// Fail-soft contract:
//   - NEVER throws (every error path → {continue: true}, exit 0)
//   - NEVER blocks the prompt (no exit 2, no decisionType:"block")
//   - Empty result when slot unbound or context disabled — silent skip
//
// Knobs:
//   PRISM_SLOT_CONTEXT_INJECT_DISABLE=1 — disable entirely
//   PRISM_SLOT_CONTEXT_INJECT_VERBOSE=1 — include full surface envelope, not just summary
//
// LIVE-BRAIN add-on (U-FLEET-P2-LIVEBRAIN-SLOTCTX, PSN-OCTOPUS-FLEET-SYNERGY-MS0
// Wave 2): when PRISM_OBSIDIAN_LIVE=1 AND the :3100 MCP bridge answers within a
// hard ~1.5s timeout, a small relevant snippet of the operator LIVE Obsidian
// vault (via prism_session:obsidian_search) is appended to the bundle. Default
// OFF, short-TTL cached, fail-soft to nothing — when the gate is off or :3100
// is down, ZERO behavior change. See scripts/lib/octopus-live-brain.mjs.
//   PRISM_OBSIDIAN_LIVE=1          — enable the live-brain read (default OFF)
//   PRISM_LIVE_BRAIN_TIMEOUT_MS=N  — bridge call hard timeout (default 1500)
//   PRISM_LIVE_BRAIN_TTL_MS=N      — cache TTL (default 30000)

import fs from "node:fs";
import { pathToFileURL } from "node:url";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;

function safeJsonRead(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function resolveSlot(sessionId, slotsDoc) {
  if (!sessionId || !slotsDoc || !slotsDoc.slots) return null;
  for (const [name, data] of Object.entries(slotsDoc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return { name, data };
    // Also tolerate stable-id form: "claude-abc12345" matches sessionId starts-with "abc12345"
    const short = data.chatId?.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return { name, data };
  }
  return null;
}

// U-GALAXY-MS1-F3 (2026-05-27, slot:alpha): slot → galaxy-affinity map per
// Domain-Galaxy Doctrine. Only the 7 galaxies with shipped CLAUDE.md sentinels
// at mcp-server/src/engines/<galaxy>/CLAUDE.md are mapped — silent skip for
// unmapped slots (de-facto echo/lima/bravo affinities surface as comments,
// not hard claims, per R7 surface-don't-average + JULIETT-12CHAT-ALLOCATION).
// Source of truth: H:/CHAT-SLOT-DOMAINS.md (operator-canonical 2026-05-28).
// Mapping a slot here means 'when that chat boots, ALSO surface this
// galaxy's CLAUDE.md + MEMORY.md as load-bearing context'. Only slots
// whose canonical assignment maps 1:1 to engines/<galaxy>/ appear here.
// Non-engine slots (alpha=token-opt, bravo=hermes/zulu, golf=fleet-reaper,
// india=AI-training, juliett=database-expansion, etc.) are intentionally
// omitted — surfacing a misleading galaxy.md leads chats to load the wrong
// doctrine (silent drift class). Each needs its own engines/<galaxy>/ dir
// built before being added here (U-PER-SLOT-GALAXY-BUILDOUT follow-up).
import { SLOT_GALAXY_MAP } from "../../scripts/lib/slot-galaxy-map.mjs";
// U-OBS-SLOTBUNDLE-DEDUP (2026-06-09, slot:alpha): session-keyed dedup so this
// ~1078-token bundle is NOT re-injected byte-identically on every prompt (it
// was the largest per-prompt token sink with zero dedup, vs 8 sibling injectors
// that already use this lib). Content-hashed: a changed prompt (different
// cross-galaxy card) re-emits; an identical re-fire (a /loop iter) suppresses to
// a 1-line marker. Fail-open (no sid / lib error / disabled → full emit).
import { dedupedContext } from "../../scripts/lib/injection-dedup-emit.mjs";

function fmtSummary(ctx, verbose, liveBrain) {
  const lines = ["## 🧭 Slot context bundle (ZULU-OMNISCIENT-MS0 PSN aggregator)"];
  lines.push("");
  lines.push(`- slot: **${ctx.slot ?? "unknown"}** · session: \`${ctx.sessionId ?? "(none)"}\``);
  // U-GALAXY-MS1-F3: surface galaxy affinity so per-galaxy CLAUDE.md + MEMORY.md
  // expectations are visible from the slot context bundle (Octopus / agent
  // orchestrator synergy per SCOPE-EXPANSION §Q1).
  const galaxy = ctx.slot ? SLOT_GALAXY_MAP[ctx.slot] : null;
  if (galaxy) {
    lines.push(`- galaxy: **${galaxy}** (per Domain-Galaxy Doctrine — \`mcp-server/src/engines/${galaxy}/CLAUDE.md\` + \`./MEMORY.md\` apply)`);
    // PER-SLOT-GALAXY-BUILDOUT (2026-05-28) — surface the 2 newer artifacts
    // (PATHS.md / TOOLBELT.md) + the per-slot dispatch brief so chats see
    // their galaxy substrate exists (or doesn't) at every UserPromptSubmit.
    // Existence-check is best-effort (sync stat); errors → silent skip.
    // Uses already-imported `fs` (line 30) + string-concat paths (forward
    // slashes work on Windows fs APIs); no new imports needed.
    try {
      const root = process.env.PRISM_ROOT || "H:/prism";
      const galaxyDir = `${root}/mcp-server/src/engines/${galaxy}`;
      const present = [];
      for (const f of ["PATHS.md", "TOOLBELT.md", "GSD.md"]) {
        try {
          if (fs.statSync(`${galaxyDir}/${f}`).size > 200) present.push(f);
        } catch { /* missing — skip */ }
      }
      if (present.length > 0) {
        lines.push(`- galaxy artifacts present: ${present.map(p => `\`${p}\``).join(", ")}`);
      }
      try {
        if (fs.statSync(`${root}/state/shared/per-slot-galaxy-buildout/${ctx.slot}.md`).size > 200) {
          lines.push(`- buildout brief: \`state/shared/per-slot-galaxy-buildout/${ctx.slot}.md\` (run /galaxy-buildout-${ctx.slot} if galaxy incomplete)`);
        }
      } catch { /* no brief — slot in SLOT_GALAXY_MAP but no dispatch yet */ }
      // AMP-CONSUME (2026-05-30, slot:alpha): surface the slot's OWN compounded
      // domain synthesis (B1 -> patterns/<galaxy>_synthesis.md) so every slot is
      // DETERMINISTICALLY aware its distilled domain knowledge exists, even when
      // the recall injector ranks it below top-K. Path-pointer only (recall
      // surfaces the CONTENT on domain-relevant prompts -- no per-prompt content
      // duplication here). Existence-gated; advisory (doc is mustHumanVerify);
      // thin galaxies (no synthesis) silently skip.
      try {
        if (fs.statSync(`${root}/knowledge/memories/patterns/${galaxy}_synthesis.md`).size > 200) {
          lines.push(`- domain synthesis: \`knowledge/memories/patterns/${galaxy}_synthesis.md\` -- your galaxy's compounded patterns/decisions/open-threads (advisory; refresh: \`galaxy-synthesis-refresh.mjs\`)`);
        }
      } catch { /* no synthesis yet (thin galaxy) -- skip */ }
    } catch { /* outer guard — every stat-call already wrapped; should be unreachable */ }
  }
  // Soul (refuse_list — hard constraint)
  if (ctx.soul?.ok && (ctx.soul.refuseList || []).length > 0) {
    lines.push(`- soul refuses: ${ctx.soul.refuseList.map(r => `\`${r}\``).join(", ")} (${ctx.soul.hermesRole ?? "no-role"})`);
  } else if (ctx.soul?.ok === false) {
    lines.push(`- soul: \`${ctx.soul.reason ?? "unknown"}\``);
  }
  // Loop (running? mid-loop /compact bug fix signal)
  if (ctx.loop?.ok && ctx.loop.running) {
    lines.push(`- loop **RUNNING** iter ${ctx.loop.iter}/${ctx.loop.target ?? "?"} — \`${ctx.loop.task ?? ""}\``);
  }
  // Token zone (only flag when not GREEN)
  if (ctx.tokenZone?.ok && ctx.tokenZone.zone && ctx.tokenZone.zone !== "GREEN") {
    const staleFlag = ctx.tokenZone.stale ? " (stale)" : "";
    lines.push(`- token zone: **${ctx.tokenZone.zone}**${staleFlag} · worstPct ${ctx.tokenZone.worstPct?.toFixed(2) ?? "?"}`);
  }
  // Bridge units available (work-source hint)
  if (ctx.bridgeUnits?.ok && (ctx.bridgeUnits.bridgeUnits || []).length > 0) {
    lines.push(`- bridge units available: ${ctx.bridgeUnits.totalAvailable} (${ctx.bridgeUnits.wiringCount} wiring + ${ctx.bridgeUnits.deepIntegrationCount} deep-integration)`);
  }
  // Decision
  if (ctx.decision) {
    const d = ctx.decision;
    const flag = d.suppressCompact ? " [/compact suppressed]" : "";
    lines.push(`- decision: **${d.recommend}**${flag} — \`${d.rationale}\``);
  }
  if (verbose && ctx.surfaces) {
    lines.push("");
    lines.push("**Surfaces:**");
    for (const [k, v] of Object.entries(ctx.surfaces)) {
      lines.push(`  - ${k}: ok=${v.ok} stale=${v.stale} reason=${v.reason ?? "-"}`);
    }
  }
  // LIVE-BRAIN (U-FLEET-P2): only present when PRISM_OBSIDIAN_LIVE=1 AND :3100
  // answered with a usable vault hit list. null/absent => nothing rendered
  // (zero behavior change for the default-OFF path).
  if (liveBrain && Array.isArray(liveBrain.hits) && liveBrain.hits.length > 0) {
    const cachedFlag = liveBrain.cached ? " (cached)" : "";
    lines.push("");
    const files = liveBrain.hits.map((h) => "`" + h.filename + "`").join(", ");
    lines.push(`- live brain${cachedFlag}: ${files} (open Obsidian vault, \`PRISM_OBSIDIAN_LIVE=1\`)`);
  }
  lines.push("");
  lines.push("_Auto-injected by `slot-context-bundle-inject.mjs` (ZULU-OMNISCIENT-MS0 fleet precheck). Disable: `PRISM_SLOT_CONTEXT_INJECT_DISABLE=1`._");
  return lines.join("\n");
}

async function main() {
  // Read stdin envelope (Claude Code hook protocol).
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let envelope;
  try { envelope = JSON.parse(stdin); } catch { envelope = {}; }
  const sessionId = envelope.session_id || envelope.sessionId || null;

  // Disable knob — silent skip.
  if (process.env.PRISM_SLOT_CONTEXT_INJECT_DISABLE === "1") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Resolve slot from chat-slots.json.
  const slotsDoc = safeJsonRead(SLOTS_FILE);
  const resolved = resolveSlot(sessionId, slotsDoc);
  if (!resolved) {
    // Chat not bound to a slot — silent skip (NOT an error).
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Dynamic import so a malformed lib never crashes the hook.
  // Windows ESM requires file:// URL scheme (raw H:/... drive paths throw
  // ERR_UNSUPPORTED_ESM_URL_SCHEME). pathToFileURL handles cross-platform.
  let loadSlotContext;
  try {
    const libUrl = pathToFileURL(`${PRISM}/scripts/lib/zulu-context-bundle.mjs`).href;
    const mod = await import(libUrl);
    loadSlotContext = mod.loadSlotContext;
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let ctx;
  try {
    ctx = loadSlotContext(resolved.name, { sessionId });
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  // Don't inject if every surface is missing — adds noise without signal.
  const surfacesOk = Object.values(ctx.surfaces || {}).filter(s => s?.ok === true).length;
  if (surfacesOk === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const verbose = process.env.PRISM_SLOT_CONTEXT_INJECT_VERBOSE === "1";

  // LIVE-BRAIN (U-FLEET-P2-LIVEBRAIN-SLOTCTX): optional live Obsidian-vault read
  // via the :3100 MCP bridge. Default OFF (PRISM_OBSIDIAN_LIVE!=1 => null => no
  // injection). Hard-timeout + short-TTL cache + fail-soft live in the lib; this
  // call is wrapped so even an import failure degrades to "no live brain".
  let liveBrain = null;
  try {
    if (process.env.PRISM_OBSIDIAN_LIVE === "1" && typeof envelope.prompt === "string" && envelope.prompt.trim() !== "") {
      const lbUrl = pathToFileURL(`${PRISM}/scripts/lib/octopus-live-brain.mjs`).href;
      const lb = await import(lbUrl);
      const timeoutMs = Number(process.env.PRISM_LIVE_BRAIN_TIMEOUT_MS) || undefined;
      const ttlMs = Number(process.env.PRISM_LIVE_BRAIN_TTL_MS) || undefined;
      liveBrain = await lb.fetchLiveBrain(envelope.prompt, { timeoutMs, ttlMs });
    }
  } catch {
    liveBrain = null; // fail-soft — never let the live read break the bundle
  }

  let summary = fmtSummary(ctx, verbose, liveBrain);

  // U-GCF-XGALAXY-INJECT (GALAXY-CONTEXT-FEDERATION-MS0): selective cross-galaxy card inject — top-K
  // OTHER-galaxy ≤1KB cards most relevant to THIS prompt, similarity-gated, NEVER broadcast (the full
  // 34-card ALL-CARDS.md is the cold-anchored breadth surface). DEVIATION from the patch's static-import
  // suggestion: DYNAMIC import inside try/catch so a malformed/missing lib degrades to no-inject instead
  // of crashing the bundle hook fleet-wide (matches this hook's fail-soft pattern for the other libs).
  // Gate on injected && text (NOT .ok — ok:true also returns for empty-query/no-match with injected:false).
  try {
    const xgUrl = pathToFileURL(`${PRISM}/scripts/lib/xgalaxy-inject.mjs`).href;
    const xgMod = await import(xgUrl);
    const xg = xgMod.maybeInjectCrossGalaxy({ slot: ctx.slot, query: String(envelope.prompt || "") });
    if (xg && xg.injected && xg.text) summary += "\n\n" + xg.text;
  } catch { /* never break the bundle */ }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: dedupedContext("slot-context-bundle", summary, sessionId),
    },
  }));
}

main().catch(() => {
  // Last-resort guarantee: never block.
  process.stdout.write(JSON.stringify({ continue: true }));
});
