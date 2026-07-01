#!/usr/bin/env node
/**
 * soul-escalation-gate.mjs — PreToolUse hook that consults the current slot's
 * soul.md escalation_path before allowing a domain-matched edit.
 *
 * Wires HSE03 (SoulEscalationCheckerEngine) into the editing path.  When a
 * slot bound to a soul attempts to Edit/Write a file matching the soul's
 * domain_filter AND no `preferred_subagent_type` has been spawned in the
 * session, this hook surfaces an advisory (warn-only by default).
 *
 * Default: ADVISORY (PRISM_SOUL_ESCALATION_BLOCK=1 to upgrade to hard block).
 * Disable: PRISM_SOUL_ESCALATION_DISABLE=1.
 *
 * Wired in PreToolUse on Edit/Write/MultiEdit matchers via:
 *   `.claude/settings.json` (operator opt-in) — file added on disk; wiring is
 *   a separate operator-controlled step so the hook can be sanity-tested
 *   standalone first.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const REPO_ROOT = process.env.PRISM_ROOT || "H:/prism";
const SOULS_DIR = join(REPO_ROOT, "state/shared/slot-souls");
const CHAT_SLOTS = join(REPO_ROOT, "state/shared/chat-slots.json");
const SLOT_ENV = process.env.PRISM_SLOT;

if (process.env.PRISM_SOUL_ESCALATION_DISABLE === "1") {
  console.log(JSON.stringify({ continue: true }));
  process.exit(0);
}

let stdinBuf = "";
process.stdin.on("data", (c) => { stdinBuf += c.toString(); });
process.stdin.on("end", () => {
  try { main(JSON.parse(stdinBuf || "{}")); }
  catch (err) {
    console.log(JSON.stringify({ continue: true, systemMessage: `soul-escalation-gate: ${err?.message || err}` }));
    process.exit(0);
  }
});

function parseFm(source, slot) {
  const re = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const m = source.match(re);
  if (!m) return null;
  const fields = { slot, refuse_list: [] };
  let curList = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, "");
    if (!line.length) continue;
    if (curList && /^\s{2,}-\s+/.test(line)) {
      const item = line.replace(/^\s*-\s+/, "").trim();
      if (item) curList.push(item);
      continue;
    }
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (v === "") { curList = []; fields[kv[1]] = curList; } else { fields[kv[1]] = v; curList = null; }
  }
  return fields;
}

function resolveSlot(input) {
  if (SLOT_ENV) return SLOT_ENV;
  if (input.slot) return String(input.slot);
  // Fallback: read chat-slots.json + take the slot belonging to this session_id if provided.
  try {
    if (!existsSync(CHAT_SLOTS)) return null;
    const slotsDoc = JSON.parse(readFileSync(CHAT_SLOTS, "utf8"));
    const sessionId = input.session_id || input.sessionId;
    if (sessionId && slotsDoc && typeof slotsDoc === "object") {
      const slots = slotsDoc.slots || slotsDoc;
      for (const [name, s] of Object.entries(slots)) {
        if (s && (s.chatId === sessionId || s.sessionId === sessionId)) return name;
      }
    }
  } catch {}
  return null;
}

function loadSoul(slot) {
  if (!slot) return null;
  const path = join(SOULS_DIR, `${slot}.md`);
  if (!existsSync(path)) return null;
  try { return parseFm(readFileSync(path, "utf8"), slot); }
  catch { return null; }
}

function domainMatches(soul, filepath, intentKeywords) {
  if (!soul.domain_filter) return false;
  try {
    const re = new RegExp(soul.domain_filter, "i");
    if (re.test(filepath)) return true;
    return intentKeywords.some((k) => re.test(k));
  } catch { return false; }
}

function inferIntentKeywords(input) {
  const out = new Set();
  const fp = input?.tool_input?.file_path || input?.tool_input?.filePath || "";
  for (const tok of String(fp).split(/[\/\\._-]/)) {
    if (tok && tok.length >= 4) out.add(tok.toLowerCase());
  }
  const content = input?.tool_input?.content || input?.tool_input?.new_string || "";
  // Cheap keyword pull: first 2 KB only.
  const head = String(content).slice(0, 2000).toLowerCase();
  for (const m of head.matchAll(/\b([a-z][a-z0-9-]{3,})\b/g)) out.add(m[1]);
  return Array.from(out).slice(0, 60);
}

function spawnedSubagentsThisSession(input) {
  // Operator-supplied via env or input; absent here → empty list.
  const env = process.env.PRISM_SPAWNED_SUBAGENTS || "";
  if (env) return env.split(",").map((s) => s.trim()).filter(Boolean);
  if (Array.isArray(input?.spawned_subagent_types)) return input.spawned_subagent_types;
  return [];
}

function main(input) {
  const tool = String(input?.tool_name || input?.toolName || "");
  if (tool && !/^(Edit|Write|MultiEdit|NotebookEdit)$/.test(tool)) {
    return emit({ continue: true });
  }
  const slot = resolveSlot(input);
  const soul = loadSoul(slot);
  if (!soul) return emit({ continue: true });

  const filepath = input?.tool_input?.file_path || input?.tool_input?.filePath || "";
  if (!filepath) return emit({ continue: true });

  const intent = inferIntentKeywords(input);
  if (!domainMatches(soul, filepath, intent)) return emit({ continue: true });

  const required = new Set();
  const reasons = [];
  if (soul.preferred_subagent_type) {
    required.add(soul.preferred_subagent_type);
    reasons.push(`domain_filter matched → ${soul.preferred_subagent_type}`);
  }
  // Parse "defer-X-to-Y" lexemes.
  for (const m of String(soul.escalation_path || "").toLowerCase().matchAll(/defer-([a-z]+(?:-[a-z]+)*)-to-([a-z]+(?:-[a-z]+)*)/g)) {
    required.add(m[2]);
    reasons.push(`escalation rule '${m[0]}' → ${m[2]}`);
  }
  if (required.size === 0) return emit({ continue: true });

  const spawned = new Set(spawnedSubagentsThisSession(input));
  const missing = Array.from(required).filter((r) => !spawned.has(r));
  if (missing.length === 0) return emit({ continue: true });

  const blockMode = process.env.PRISM_SOUL_ESCALATION_BLOCK === "1";
  const msg = `🛡 SOUL-ESCALATION (${slot}) — domain-matched edit on ${filepath} requires subagent(s) [${missing.join(", ")}] not yet spawned this session. Reasons: ${reasons.join("; ")}.`;
  if (blockMode) {
    emit({ continue: false, decision: "block", reason: msg });
  } else {
    emit({ continue: true, systemMessage: msg });
  }
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.exit(0);
}
