---
type: "chat-session"
source: "claude-code-cli"
session_id: "92ce96f7-8b16-4104-bca3-e476095177f9"
title: "You are the lead architect. Design the HIGH-ROI hook + stop-hook-combo proposal "
date: "2026-06-12"
first_ts: "2026-06-12T12:43:51.441Z"
last_ts: "2026-06-12T12:47:11.766Z"
cwd: "H:\\prism-slot-golf"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism-slot-golf/92ce96f7-8b16-4104-bca3-e476095177f9/subagents/workflows/wf_0a66e9c5-cd3/agent-aa201217dabf0d9cd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:51"
---

# You are the lead architect. Design the HIGH-ROI hook + stop-hook-combo proposal 

> **claude-code-cli** | 2026-06-12 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism-slot-golf
> Raw: `H:/.claude/projects/H--prism-slot-golf/92ce96f7-8b16-4104-bca3-e476095177f9/subagents/workflows/wf_0a66e9c5-cd3/agent-aa201217dabf0d9cd.jsonl`

## Transcript

### User | 2026-06-12T12:43:51.441Z

You are the lead architect. Design the HIGH-ROI hook + stop-hook-combo proposal for PRISM. PRISM already has 290 wired hooks (Stop 75, UserPromptSubmit 61, PreToolUse 56, SessionStart 57, PostToolUse 31). New hooks MUST be additive (cite why not duplicate) OR be a consolidation that nets out fewer/cheaper.

GROUNDING — actionable X-article patterns (loop-engineering, dynamic-workflows, overnight-workflows, obsidian-hermes self-learning):
{"patterns":[],"takeaways":[]}

WIRED-HOOK MAP (redundancy + gaps):
null

STILL-OPEN gaps from prior audits:
[]

Design for the capability axes the operator named: TOKEN SAVINGS, CONTEXT RETENTION, LEARNING/system-intelligence, and SLASH-COMMAND/DEV-PIPELINE quality+accuracy. Favor: (1) a PreToolUse cost-gate before expensive Workflow/Agent fan-outs; (2) UserPromptSubmit injection-budget consolidator (the ~20-block per-turn injection is the #1 token leak); (3) a Stop-hook COMBO that compounds learning (error-capture -> memory -> wiki) + commit-hygiene in one deterministic chain; (4) PostToolUse auto-Ollama-route on large Reads; (5) a self-learning loop hook per the hermes/obsidian articles. For EACH proposed hook give: event, trigger, mechanism, roi_class, additive_justification (vs the 290 existing), wiring_point (which settings.json event + position), effort S/M/L, risk, est_roi. Then 1-3 stop-hook COMBOS. Then a ranked top-5 to build now. Be rigorous and concrete — this becomes a build spec.

### Assistant | 2026-06-12T12:43:54.382Z

I'll ground this proposal in the actual wired-hook reality before designing. Let me inspect the real settings.json hook chains and the hook directory to make additive claims defensible.

### Assistant | 2026-06-12T12:43:59.021Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:44:00.908Z

[tool_use: Bash]

### User | 2026-06-12T12:44:03.840Z

[tool_result] === SessionStart (57) ===
0:stress-harness-emit.mjs
1:session-id-pin.mjs
2:session-start-terminal-pin.mjs
3:slot-session-sidecar-sessionstart.mjs
4:settings-mirror-guard.mjs
5:portable-node-guard.mjs
6:verify-hook-refs.mjs
7:portable-python-guard.mjs
8:route-savings-session-start-inject.mjs
9:session-start-savings-headline.mjs
10:multi-computer-awareness.mjs
11:ollama-autostart.mjs
12:nim-autostar
... [+8628 chars truncated]

### User | 2026-06-12T12:44:08.777Z

[tool_result] C:/Users/wompu/.claude/settings.json
H:/.claude/settings.json
---HOOKDIR---
814
---C HOOKDIR---
37

### Assistant | 2026-06-12T12:44:13.800Z

I now have the real wired-hook map. The 290-hook count matches (Stop 75, UserPromptSubmit 61, PreToolUse 56, SessionStart 57, PostToolUse 31, SubagentStart 1 = 281 visible here; PreCompact 9 not counted in the operator's 290). Critically, I can see the existing injection-budget machinery so my "additive vs duplicate" claims are grounded. Let me inspect the key consolidation/cost surfaces before finalizing.

### Assistant | 2026-06-12T12:44:18.261Z

[tool_use: Bash]

### Assistant | 2026-06-12T12:44:20.920Z

[tool_use: Bash]

### User | 2026-06-12T12:44:26.960Z

[tool_result] =====injection-budget-cap-enforce.mjs=====
// tier: T0
 * injection-budget-cap-enforce.mjs -- PreToolUse(Write) per-prompt injection
 * budget CEILING gate (awareness ENFORCEMENT unit #3).
 * TOKEN-EFFICIENCY-INJECT/U-INJECTION-BUDGET-CAP (2026-06-11, slot:bravo).
 *   - knob-enforce blocks a KNOBLESS recurring injector (un-silenceable).
 *   - THIS gate blocks the recurring injection budget from 
... [+4557 chars truncated]

### User | 2026-06-12T12:44:30.997Z

[tool_result] ===agent-vs-direct (cost gate?)===
4: * agent-vs-direct.mjs - PreToolUse Agent
5: * Checks if a direct tool would be faster than spawning an agent.
6: * Token savings: 50-70% (agent overhead avoided)
14:if (tool_name !== 'Agent') {
21:const subagentType = tool_input?.subagent_type || '';
73:        `🎯 Consider using ${tool} directly instead of Agent:`,
75:        `  Agent overhead: context setup, 
... [+2095 chars truncated]

### Assistant | 2026-06-12T12:44:35.704Z

This is the crucial finding. The existing injection-budget machinery is a **build-time CEILING gate** (blocks Write of a NEW injector when fleet budget exceeds cap), NOT a **runtime per-turn consolidator**. The 20+ UserPromptSubmit injectors still each fire and emit their own block every turn. That's the gap. Let me confirm three more things: the runtime injection footprint, whether a runtime aggregator/consolidator exists, and the error-learn->wiki chain wiring.

### Assistant | 2026-06-12T12:44:39.002Z

[tool_use: Bash]

### User | 2026-06-12T12:44:42.999Z

[tool_result] ===runtime UPS injectors emitting additionalContext (the per-turn leak)===
77
files:
agent-rules-inject.mjs
ai-reasoning-inject.mjs
ai-synergy-awareness-inject.mjs
alpha-token-domain-awareness-inject.mjs
audit-awareness-inject.mjs
audit-viz-first-inject.mjs
auto-fix-blackwell-doctrine-inject.mjs
awareness-snapshot-inject.mjs
build-state-inject.mjs
cad-pipeline-knowledge-inject.mjs
cag-router-injec
... [+1224 chars truncated]

### Assistant | 2026-06-12T12:44:43.239Z

[tool_use: Bash]

### User | 2026-06-12T12:44:51.658Z

[tool_result] ===PostToolUse Read -> is large-read auto-route a BLOCK or advisory?===
3:// large-read-digest-advisory.mjs -- PreToolUse:Read advisory hook
6:// advisory pointing at scripts/ollama-file-digest.mjs -- the verified line-anchored
11:// Honest scope (R12): this hook does NOT block the Read. It advises that a large
14:// `byHook.large-read-digest-advisory.suggested`, and (U-LARGE-READ-DECAY-WIRE,
15:/
... [+1772 chars truncated]

### Assistant | 2026-06-12T12:44:55.758Z

Key discovery: `ollama-context-aggregator.mjs` exists — let me verify whether it's WIRED (it wasn't in the settings.json enumeration) and what it does, plus confirm `cognitive-budget-allocator` is SessionStart-only (not per-turn). This determines whether my #2 proposal is genuinely additive or a wiring fix.

### Assistant | 2026-06-12T12:44:59.996Z

[tool_use: Bash]

### User | 2026-06-12T12:45:03.764Z

[tool_result] ===ollama-context-aggregator: what + wired?===
// tier: T4
/**
 * ollama-context-aggregator.mjs — Single UserPromptSubmit injection point
 *
 * Designed for up to 8 concurrent chats — replaces 3 redundant routers
 * (ollama-route-recommender, ollama-unified-semantic-router,
 *  ollama-prism-intelligence) with one consolidated pattern matcher.
 *
 * Output blocks (only those that match are emitted)
... [+1365 chars truncated]

### Assistant | 2026-06-12T12:45:04.991Z

[tool_use: Bash]

### User | 2026-06-12T12:45:13.695Z

[tool_result] ===stop-hook-aggregator: does it CHAIN learning hooks or just log?===
29:import { spawnSync } from "node:child_process";
86:  const r = spawnSync("git", args, {

===PreToolUse:Agent / Workflow cost gate -- does a TOKEN-COST estimate gate exist before fan-out?===
agent-pid-tracker.mjs
agent-vs-direct.mjs
ai-system-router-inject.mjs
discipline-expert-inject.mjs
iterate-retrieve-suggest.mjs
memory-mi
... [+295 chars truncated]

### Assistant | 2026-06-12T12:45:25.335Z

I now have everything needed. Confirmed findings that make my proposal defensible:

1. **`agent-vs-direct.mjs` (PreToolUse Agent) emits 0 deny/block/estimate** — it's pure advisory ("Consider using X directly"). There is NO cost-estimating gate that blocks an expensive Agent/Workflow fan-out. Genuine gap for proposal #1.
2. **`ollama-context-aggregator.mjs` EXISTS but is wired 0 times** — it's a consolidation pattern matcher for UserPromptSubmit, but it only consolidates 3 Ollama routers, not the 20+ domain/awareness injectors. The injection-budget machinery (`injection-budget-cap-enforce`, `injection-knob-enforce`) is BUILD-TIME (blocks Write of new injectors), not RUNTIME. Genuine gap for proposal #2.
3. **No PostToolUse hook auto-routes a COMPLETED large Read to Ollama** — `large-read-digest-advisory` is PreToolUse advisory only (already-decayed). The completed-Read content still sits full in context. Gap for proposal #4.
4. **Learning hooks at Stop are 8+ separate sequential hooks** (error-pattern-capture/promote, memory-to-wiki-suggest, obsidian-feed, soul-evolution, dream-queue) — each re-reads transcript/ledger independently. No single deterministic chain. `stop-hook-aggregator` only logs git state. Combo opportunity.
5. **`error-pattern-promote` → wiki is advisory**, capture→promote→wiki→prevention is NOT a closed deterministic chain.

Let me update the task and deliver the structured spec.

### Assistant | 2026-06-12T12:45:25.613Z

[tool_use: TaskUpdate]

### User | 2026-06-12T12:45:30.040Z

[tool_result] Updated task #2 status

### Assistant | 2026-06-12T12:47:00.753Z

[tool_use: StructuredOutput]

### User | 2026-06-12T12:47:01.287Z

[tool_result] Structured output provided successfully

### Assistant | 2026-06-12T12:47:11.766Z

Delivered the structured hook + stop-hook-combo build spec, grounded in the actual wired-hook map.

Key verification results that make the proposals defensible (all checked against `H:/.claude/settings.json` and `H:/prism/.claude/hooks/`):

- **agent-vs-direct.mjs** (PreToolUse index 15) is pure advisory — 0 deny/block/estimate tokens in its body. No cost-estimating gate blocks an expensive opus Agent/Workflow fan-out. → proposal #1 is the missing enforcing arm.
- **ollama-context-aggregator.mjs** exists but is wired **0 times** and only consolidates 3 Ollama routers. The `injection-budget-cap-enforce` / `injection-knob-enforce` pair are **build-time** Write gates (dormant at runtime, ~244B floor). The ~20-block per-turn injection has no runtime consolidator. → proposal #2.
- **large-read-digest-advisory** / **wiki-read-offload-advisory** are PreToolUse:Read advisory-only (and partially decay-muted); no PostToolUse hook acts on a completed large Read. → proposal #4.
- 5 learning hooks (error-pattern-capture/promote, memory-to-wiki-suggest, soul-evolution, bug-finding-wiki-gate) run as separate sequential entries each re-reading the transcript; stop-hook-aggregator only logs git state. → proposal #3 / COMBO-A consolidates to O(1) reads and nets fewer Stop entries.

Ranked build-now order: (1) injection-consolidator, (2) agent-fanout cost gate, (3) self-learning-loop-closer + COMBO-A, (4) posttool large-read autodigest, (5) obsidian-hermes nightly self-improve.

Relevant files: `H:/.claude/settings.json`, `H:/prism/.claude/hooks/agent-vs-direct.mjs`, `H:/prism/.claude/hooks/ollama-context-aggregator.mjs`, `H:/prism/.claude/hooks/injection-budget-cap-enforce.mjs`, `H:/prism/.claude/hooks/large-read-digest-advisory.mjs`, `H:/prism/.claude/hooks/stop-hook-aggregator.mjs`, `H:/prism/scripts/lib/advisory-decay.mjs`, `H:/prism/scripts/ollama-file-digest.mjs`.
