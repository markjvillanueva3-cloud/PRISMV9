#!/usr/bin/env node
// tier: T2 — slot:sierra custom system-viz graph-health inject (U-PSGB-SIERRA 2026-05-29).
// UserPromptSubmit hook. SLOT-GATED no-op for every slot except sierra (zero blast radius
// for 25/26 slots). Surfaces LIVE system-viz graph-regen health (last-success vs last-failure,
// graph size, pendingCount, the exit-134 merge-OOM class) so slot:sierra knows whether the
// canonical graph is safe to touch BEFORE acting. The graph is the fleet search substrate
// ([[feedback_sierra_graph_correctness_is_fleet_search]]) so a stale/failed graph is fleet-wide.
// Fail-soft (never throws / never blocks; every error path -> {continue:true}, exit 0).
// Knob: PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1.
import fs from "node:fs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;
const VIZ = `${PRISM}/state/shared/system-viz`;

function safeJsonRead(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function resolveSlot(sessionId, doc) {
  if (!sessionId || !doc || !doc.slots) return null;
  for (const [name, data] of Object.entries(doc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    const short = data.chatId && data.chatId.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return name;
  }
  return null;
}

function renderBlock() {
  const ok = safeJsonRead(`${VIZ}/.last-successful-regen.json`);
  const fail = safeJsonRead(`${VIZ}/.last-regen-failure.json`);
  if (!ok && !fail) return null;
  const okT = ok && ok.ts ? Date.parse(ok.ts) : 0;
  const failT = fail && fail.ts ? Date.parse(fail.ts) : 0;
  const healthy = okT >= failT;
  const mb = ok && ok.graphBytes ? Math.round(ok.graphBytes / 1e6) : "?";
  const ageH = okT ? ((Date.now() - okT) / 3.6e6).toFixed(1) : "?";
  const verdict = healthy ? (Number(ageH) > 24 ? "🟡 STALE" : "🟢 GREEN") : "🔴 FAILED-LAST";
  let line = `## 🛰️ system-viz graph health (sierra)\n- ${verdict} — last good regen ${ageH}h ago · ${mb}MB · pending=${ok && ok.pendingCount != null ? ok.pendingCount : "?"} · sidecar=${ok && ok.sidecarOk != null ? ok.sidecarOk : "?"}`;
  if (!healthy && fail) {
    line += `\n- ⚠ most recent run FAILED: stage="${fail.stage}" exit=${fail.exitCode}${fail.exitCode === 134 ? " (merge-augmentations OOM class — [[reference_sierra_graph_oom_classes]])" : ""}. Re-run \`node scripts/regen-viz.mjs\` before trusting downstream.`;
  }
  // cross-substrate edge-spine DRIFT (U-XSUB-DRIFT-DETECT): surface a RECENT silent
  // edge-type collapse (the documented-by 320->0 class) so a sierra session SEES it
  // -- the detector logs to this sidecar; a 24h window bounds the noise (alert for a
  // day, then quiet). This is the surface the headless regen-log drift warning lacked.
  try {
    const drift = safeJsonRead(`${VIZ}/cross-substrate-drift.json`);
    const last = drift && Array.isArray(drift.events) && drift.events.length ? drift.events[drift.events.length - 1] : null;
    const lastT = last && last.at ? Date.parse(last.at) : 0;
    if (last && lastT && Date.now() - lastT < 24 * 3.6e6 && Array.isArray(last.events) && last.events.length) {
      const ev = last.events.map((e) => `${e.type} ${e.baseline}->${e.current} (${e.severity})`).join(", ");
      line += `\n- ⚠ cross-substrate edge DRIFT (last 24h): ${ev}. A typed edge collapsed -- check its source/confirmation ([[cross-substrate-embeds-and-docby-oracle]]); regen \`node scripts/generate-cross-substrate-edges.mjs\`.`;
    }
  } catch { /* drift surfacing is best-effort */ }
  line += `\n_Custom sierra awareness. Disable: PRISM_SIERRA_GRAPH_HEALTH_DISABLE=1._`;
  return line;
}

async function main() {
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let env; try { env = JSON.parse(stdin); } catch { env = {}; }
  const sessionId = env.session_id || env.sessionId || null;
  const out = (o) => process.stdout.write(JSON.stringify(o));

  if (process.env.PRISM_SIERRA_GRAPH_HEALTH_DISABLE === "1") return out({ continue: true });

  const slot = resolveSlot(sessionId, safeJsonRead(SLOTS_FILE));
  if (slot !== "sierra") return out({ continue: true });

  let block;
  try { block = renderBlock(); } catch { return out({ continue: true }); }
  if (!block) return out({ continue: true });
  return out({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: block } });
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
