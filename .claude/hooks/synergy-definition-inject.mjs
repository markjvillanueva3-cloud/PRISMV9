#!/usr/bin/env node
// tier: T2
/**
 * synergy-definition-inject.mjs -- UserPromptSubmit injector.
 *
 * Operator directive (2026-06-14): when the operator says "synergy" / "synergize"
 * / "synergized", it is a TOTALITY directive meaning EVERY PRISM substrate must
 * work together in unison, optimally and strategically. This hook detects that
 * keyword in the prompt and injects the canonical definition so every chat in the
 * fleet interprets the word the same bounded way (apply the all-substrates loop TO
 * the named scope -- not one subsystem, not an unbounded rewrite).
 *
 * Canonical source: memory feedback_synergy_definition.md (sibling of the PSN
 * definition). Cheap-when-irrelevant: a single regex; injects nothing unless a
 * synergy-token is present.
 *
 * Knob: PRISM_SYNERGY_DEFINITION_INJECT_DISABLE=1 -> no-op.
 */

import { readFileSync } from "node:fs";

const DISABLED = process.env.PRISM_SYNERGY_DEFINITION_INJECT_DISABLE === "1";
const SYNERGY_RE = /\bsynerg(?:y|ize|ized|izing|ies|istic)\b/i;

function readStdin() {
  try {
    const raw = readFileSync(0, "utf-8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function emit(context) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: context },
  }) + "\n");
}

// Pure: decide whether to inject + build the block. Exported for tests.
export function buildSynergyContext(prompt) {
  if (typeof prompt !== "string" || !SYNERGY_RE.test(prompt)) return null;
  return [
    '## SYNERGY = the all-substrates directive (operator-canonical, [[feedback_synergy_definition]])',
    'You said "synergy/synergize" -- it means EVERY PRISM substrate works together in unison, optimally and',
    'strategically (none idle/siloed/advisory). The complete set:',
    '1. AI/learning/reasoning: PRISM AI+learning+reasoning systems, LoRA, NN, GNN, CAG, RAG(+hybrids), deep learning/reasoning, PRISMCreativeReasoningEngine.',
    '2. Knowledge: the 11-leg PSN ([[feedback_psn_definition]]), Obsidian vault, memories, wikis, tribal injections, /system-viz (110K-node graph).',
    '3. Orchestration: Hermes (free-local Ollama), Claude Code 26-slot fleet, agent orchestration, /ask-hermes bridge.',
    '4. Code: engines, pipelines, algorithms, formulas, databases, mcp-server + ALL dispatcher tools, skills, scripts, hooks, container skills.',
    '5. Doctrine/context: per-galaxy CLAUDE.md + souls.md, galaxy/slot/domain maps, PRISM awareness + injection, 1M-context injection.',
    '6. Lifecycle: token-savings, precompaction, compaction (self-/compact BEFORE the 1M auto-compaction when warranted), handoff, auto-startup, check-in, every Stop hook + auto-invoke, git-tree commit/organize.',
    '7. Model routing: auto-utilize Ollama + the right local model to offload + save tokens WITHOUT quality loss; auto model-switch per task (Ollama->Sonnet->Opus ladder).',
    '8. Domain data/product: resource folder, JM Die shop fleet, documents (Docustrata), PRISM app features.',
    'APPLY (bounded, R12): (1) identify the SCOPE the operator named (no scope -> ask, or default to this slot\'s galaxy); (2) make every relevant substrate actively participate -- read-before (PSN/master-graph/vault) -> route mechanical work to Ollama -> wire to every consumer -> persist outcome after (memory->Obsidian->master-index) -> eval-gate with numbers; (3) STATE the deterministic done-signal. Never treat it as one subsystem, never as an unbounded fleet rewrite.',
  ].join("\n");
}

function main() {
  if (DISABLED) { process.exit(0); }
  const input = readStdin();
  const prompt = input?.prompt ?? input?.user_prompt ?? "";
  const ctx = buildSynergyContext(prompt);
  if (ctx) emit(ctx);
  process.exit(0);
}

const _invokedDirectly = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("synergy-definition-inject.mjs");
if (_invokedDirectly) {
  try { main(); } catch { process.exit(0); }
}
