#!/usr/bin/env node
// tier: T2
/**
 * slot-domain-awareness-inject.mjs — UserPromptSubmit hook.
 *
 * Reads `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical slot-domain
 * designations) + this chat's current slot binding from `state/shared/chat-slots.json`,
 * emits a compact slot-domain table as `additionalContext` so every chat in the
 * fleet knows what every other chat slot's domain is.
 *
 * Karpathy R8: every slot reads this BEFORE responding — no slot claims work
 * outside its domain without explicit operator override.
 *
 * Knobs:
 *   PRISM_SLOT_DOMAIN_AWARENESS_DISABLE=1 → no-op
 *   PRISM_SLOT_DOMAIN_AWARENESS_VERBOSE=1 → include the cross-slot coordination
 *                                            doctrine block (default: compact table only)
 *
 * Self-cap: returns silently on any file-read error (fail-soft). The hook is
 * advisory; the canonical doc is `state/shared/CHAT-SLOT-DOMAINS.md`.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { hashBlock, shouldEmit, recordEmit, formatDedupedMarker, pruneExpired } from "../../scripts/lib/injection-dedup.mjs";

const ROOT_CANDIDATES = [
  process.env.PRISM_ROOT,
  "H:/prism-slot-kilo",
  "H:/prism",
];

// Injection-dedup sidecar (shared across the fleet's dedup-adopting hooks) + TTL.
// The slot-domain table is stable across burst prompts within a /loop iter; 5min
// TTL bounds dedup so a re-bind / domains-file edit re-emits within one window even
// before its content hash changes.
const DEDUP_SIDECAR_REL = "state/shared/dashboards/injection-dedup-cache.json";
const DEDUP_TTL_MS = 5 * 60_000;

function resolveRoot() {
  for (const r of ROOT_CANDIDATES) {
    if (!r) continue;
    if (existsSync(join(r, "state/shared/CHAT-SLOT-DOMAINS.md"))) return r;
  }
  return null;
}

/**
 * Parse the markdown table from CHAT-SLOT-DOMAINS.md. Returns
 * Array<{slot, domain}>. Stops at the first `## Slots without explicit domain`
 * header or end-of-file.
 */
function parseSlotDomains(md) {
  const out = [];
  const lines = md.split("\n");
  let inTable = false;
  for (const raw of lines) {
    const line = raw.trim();
    if (/^## Slots without explicit domain/i.test(line)) break;
    if (line.startsWith("| Slot ")) { inTable = true; continue; }
    if (line.startsWith("|---")) continue;
    if (inTable && line.startsWith("|")) {
      const cells = line.split("|").map(c => c.trim()).filter(Boolean);
      if (cells.length >= 2) {
        const slot = cells[0].replace(/\*\*/g, "").trim();
        const domain = cells[1].trim();
        if (slot && domain && !/^slot$/i.test(slot)) out.push({ slot, domain });
      }
    } else if (inTable && line === "") {
      // blank line ends the table
      inTable = false;
    }
  }
  return out;
}

function readActiveSlot(root, stdinSessionId) {
  const slotsFile = join(root, "state/shared/chat-slots.json");
  if (!existsSync(slotsFile)) return null;
  try {
    const data = JSON.parse(readFileSync(slotsFile, "utf8"));
    if (!data || !data.slots) return null;
    const expectedChatId = stdinSessionId
      ? `claude-${String(stdinSessionId).slice(0, 8).toLowerCase()}`
      : null;
    for (const [slot, state] of Object.entries(data.slots)) {
      if (state && state.chatId && expectedChatId && state.chatId === expectedChatId) {
        return slot;
      }
    }
  } catch { /* fail-soft */ }
  return null;
}

function formatTable(entries, mySlot) {
  const longestSlot = entries.reduce((m, e) => Math.max(m, e.slot.length), 0);
  const lines = [];
  lines.push("## 🗺️ Chat-slot domains (every slot knows every other slot's territory)");
  lines.push("");
  for (const { slot, domain } of entries) {
    const isMe = mySlot && slot.toLowerCase() === mySlot.toLowerCase();
    const marker = isMe ? " ← YOU" : "";
    const slotCol = slot.padEnd(longestSlot);
    // Truncate long domain blurbs to keep injection compact
    const compactDomain = domain.length > 110 ? domain.slice(0, 107) + "..." : domain;
    lines.push(`- **${slotCol}** — ${compactDomain}${marker}`);
  }
  lines.push("");
  lines.push("_Source: `state/shared/CHAT-SLOT-DOMAINS.md` (operator-canonical). Disable: `PRISM_SLOT_DOMAIN_AWARENESS_DISABLE=1`._");
  return lines.join("\n");
}

async function main() {
  if (process.env.PRISM_SLOT_DOMAIN_AWARENESS_DISABLE === "1") {
    process.exit(0);
  }

  // Read stdin (JSON harness payload) for session_id (slot binding key)
  let payload = {};
  try {
    const stdinChunks = [];
    for await (const chunk of process.stdin) stdinChunks.push(chunk);
    const stdinStr = Buffer.concat(stdinChunks).toString("utf8").trim();
    if (stdinStr) payload = JSON.parse(stdinStr);
  } catch { /* fail-soft */ }

  const root = resolveRoot();
  if (!root) process.exit(0);

  const domainsFile = join(root, "state/shared/CHAT-SLOT-DOMAINS.md");
  let entries;
  try {
    const md = readFileSync(domainsFile, "utf8");
    entries = parseSlotDomains(md);
  } catch {
    process.exit(0);
  }
  if (!entries || entries.length === 0) process.exit(0);

  const mySlot = readActiveSlot(root, payload.session_id);
  const block = formatTable(entries, mySlot);

  // Injection-dedup adopter (TOKEN-SAVINGS-EXPAND/U-PSN-INJECTION-DEDUP-LIB) — the
  // slot-domain table is byte-identical across prompts within a session (it changes
  // only when CHAT-SLOT-DOMAINS.md changes or this chat's slot re-binds, both of which
  // alter the block hash). Emit the full table on first-emit / TTL-expiry, otherwise a
  // 1-line dedup marker. Without this, every UserPromptSubmit across all 26 slots
  // re-injects the full ~26-row table byte-for-byte. Fail-soft: any sidecar read/write
  // error, dedup-disabled, or missing session_id falls back to emitting the full block
  // (exactly the pre-dedup behavior — zero regression).
  const dedupDisabled = process.env.PRISM_INJECTION_DEDUP_DISABLE === "1";
  const sid8 = String(payload.session_id || "").slice(0, 8);
  let additionalContext = block;
  if (!dedupDisabled && sid8) {
    const sidecar = join(root, DEDUP_SIDECAR_REL);
    const hookTag = `slot-domain-awareness:${sid8}`;
    const contentHash = hashBlock(block);
    const now = Date.now();
    let cache;
    try { cache = JSON.parse(readFileSync(sidecar, "utf8")); } catch { cache = {}; }
    cache = pruneExpired(cache, now, DEDUP_TTL_MS);
    const decision = shouldEmit(cache, hookTag, contentHash, now, DEDUP_TTL_MS);
    if (decision.emit) {
      additionalContext = block;
      if (contentHash) {
        try {
          const newCache = recordEmit(cache, hookTag, contentHash, now);
          mkdirSync(dirname(sidecar), { recursive: true });
          writeFileSync(sidecar, JSON.stringify(newCache), "utf8");
        } catch { /* sidecar write fail-soft — emit still proceeds */ }
      }
    } else {
      additionalContext = formatDedupedMarker(hookTag);
    }
  }

  const output = { hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext } };
  process.stdout.write(JSON.stringify(output));
}

main().catch(() => process.exit(0));
