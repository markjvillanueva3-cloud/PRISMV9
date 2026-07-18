#!/usr/bin/env node
// tier: T4
/**
 * userprompt-skill-and-subagent-nudges.mjs — UserPromptSubmit hook
 * Gap C2: detect if prompt obviously matches an existing skill description → suggest /skill invocation.
 * Gap A7: detect if prompt is a known subagent task pattern → suggest existing-result reuse.
 * Knob: PRISM_SKILL_SUBAGENT_NUDGE_DISABLE=1
 */
import { readFileSync } from "node:fs";

// Curated map: prompt-keyword regex → skill suggestion. (Lightweight; can be
// expanded; the auto-injected skill-auto-trigger hook covers the heavier
// keyword-to-skill matching. This is a fallback for explicit phrasings.)
export const SKILL_PHRASE_MAP = [
  { re: /\b(close[ -]?out|envelope.{0,15}drift|shipped[ -]?but[ -]?pending)\b/i, skill: "/close-out-audit" },
  { re: /\b(audit.{0,20}fake.{0,20}action|r12.{0,5}fake|prism_intelligence.{0,15}ollama)\b/i, skill: "/r12-audit" },
  { re: /\b(deep[ -]?search|search.{0,10}across.{0,15}wiki.{0,5}memory.{0,5}graph)\b/i, skill: "/deep-search" },
  { re: /\b(master[ -]?index|find.{0,10}where.{0,5}defined)\b/i, skill: "/master-index" },
  { re: /\b(pick[ -]?(unit|next|dev))\b/i, skill: "/pick-unit (or /pick-dev for backend-only)" },
];

export function suggestSkill(prompt) {
  if (typeof prompt !== "string" || !prompt) return null;
  for (const m of SKILL_PHRASE_MAP) {
    if (m.re.test(prompt)) return m.skill;
  }
  return null;
}

// Gap A7: simple subagent-task dedup. Detects "research X" or "audit Y across repo"
// patterns and suggests checking AGENT_CHAT or recent task results first.
export const SUBAGENT_REUSE_PATTERNS = [
  { re: /\b(research|investigate|audit)\s+\w+\s+across\s+(the\s+)?(repo|codebase|fleet)\b/i },
  { re: /\b(find\s+all|enumerate)\s+\w+\s+(engines|dispatchers|hooks|files)\b/i },
];

export function shouldHintSubagentReuse(prompt) {
  if (typeof prompt !== "string" || !prompt) return false;
  return SUBAGENT_REUSE_PATTERNS.some(p => p.re.test(prompt));
}

export function formatNudge(prompt) {
  const skill = suggestSkill(prompt);
  const reuse = shouldHintSubagentReuse(prompt);
  if (!skill && !reuse) return null;
  const lines = ["## 🧰 Skill / subagent-reuse nudge"];
  if (skill) lines.push("", `→ This phrasing matches **${skill}** — invoke that skill instead of a custom multi-step approach.`);
  if (reuse) lines.push("", "→ This looks like a broad-scope subagent task. Check `state/shared/AGENT_CHAT.md` and recent claims first — a peer chat may have already produced the answer (saves a full Agent run).");
  lines.push("", "_Disable: `PRISM_SKILL_SUBAGENT_NUDGE_DISABLE=1`._");
  return lines.join("\n");
}

async function readStdin() { try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; } }
function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
async function main() {
  if (process.env.PRISM_SKILL_SUBAGENT_NUDGE_DISABLE === "1") { pass(); return; }
  const input = await readStdin();
  const prompt = String(input.prompt || input.user_prompt || "");
  const nudge = formatNudge(prompt);
  if (!nudge) { pass(); return; }
  process.stdout.write(JSON.stringify({ continue: true, hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: nudge } }));
}
if (process.argv[1] && process.argv[1].endsWith("userprompt-skill-and-subagent-nudges.mjs")) main().catch(() => pass());
