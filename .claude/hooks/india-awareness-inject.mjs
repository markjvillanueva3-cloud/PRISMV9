#!/usr/bin/env node
// tier: T2 — slot:india custom domain-awareness inject (U-PSGB-INDIA-AUDIT 2026-05-28).
//
// UserPromptSubmit hook. SLOT-GATED: a NO-OP for every slot except india
// (returns {continue:true} instantly for all others — zero blast radius).
// Surfaces LIVE ai-training domain state (NN-GRAPH deploy-gate verdict, checkpoint
// promotion state, retrain-lifecycle status, closed-loop health) so slot:india
// ALWAYS has domain context — the custom PRISM-awareness for the ai-training galaxy.
//
// Fail-soft contract (matches slot-context-bundle-inject.mjs):
//   - NEVER throws (every error path -> {continue:true}, exit 0)
//   - NEVER blocks the prompt (no exit 2, no decisionType:"block")
//   - Empty result when slot unbound / not india / renderer missing — silent skip
//
// Script is resolved RELATIVE to this hook's own tree (../../scripts/...) so the
// hook + generator travel together through the slot/india -> main merge.
//
// Knob: PRISM_INDIA_AWARENESS_DISABLE=1 — disable entirely.
import fs from "node:fs";

const PRISM = process.env.PRISM_ROOT || "H:/prism";
const SLOTS_FILE = `${PRISM}/state/shared/chat-slots.json`;

function safeJsonRead(p) { try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; } }

function resolveSlot(sessionId, doc) {
  if (!sessionId || !doc || !doc.slots) return null;
  for (const [name, data] of Object.entries(doc.slots)) {
    if (!data) continue;
    if (data.chatId === sessionId) return name;
    const short = data.chatId?.replace(/^claude-/, "");
    if (short && sessionId.startsWith(short)) return name;
  }
  return null;
}

async function main() {
  let stdin = "";
  for await (const c of process.stdin) stdin += c;
  let env; try { env = JSON.parse(stdin); } catch { env = {}; }
  const sessionId = env.session_id || env.sessionId || null;
  const out = (o) => process.stdout.write(JSON.stringify(o));

  if (process.env.PRISM_INDIA_AWARENESS_DISABLE === "1") return out({ continue: true });

  const slot = resolveSlot(sessionId, safeJsonRead(SLOTS_FILE));
  if (slot !== "india") return out({ continue: true }); // slot-gated no-op (25 of 26 slots)

  let block;
  try {
    // Resolve the generator relative to THIS hook (../../scripts/) so it works
    // in the slot worktree AND post-merge in the shared tree.
    const url = new URL("../../scripts/ai-training-awareness.mjs", import.meta.url).href;
    const mod = await import(url);
    block = mod.renderBlock();
  } catch {
    return out({ continue: true }); // renderer missing/broken — silent skip
  }
  if (!block) return out({ continue: true });
  return out({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: block } });
}

main().catch(() => process.stdout.write(JSON.stringify({ continue: true })));
