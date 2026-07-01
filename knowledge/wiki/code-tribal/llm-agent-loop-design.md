---
name: llm-agent-loop-design
category: code-tribal
domain: backend-dev
tags: [llm-agent, ollama, claude-code, agent-loop, tool-use, prompt-engineering, ai-development]
last_updated: 2026-05-18
---

# LLM Agent Loop Design — Patterns from PRISM

PRISM runs multiple LLM agent loops simultaneously: Claude in interactive mode, Ollama in subprocess mode, and Claude-as-subagent via the Agent tool. Each has a distinct loop shape; mixing them up is a common bug class.

## The four loop shapes

**1. Interactive Claude (the primary loop).** User → prompt → tool-call cycle → text response. Stop only when user accepts or Stop hook gates. Context is the moving window; `/compact` summarizes the prior turn.

**2. Subagent Claude (Agent tool).** Parent dispatches a fresh chat with a self-contained prompt. Subagent runs its own loop, returns a single result message. No back-and-forth with the parent during execution.

**3. Ollama subprocess.** `tribal-rerank.mjs --query …` → POST `/api/embeddings` or `/api/generate` → response → exit. Single-shot, no loop. **NOT an agent loop unless wrapped in a harness.**

**4. Ollama agent harness** (PRISM's `ollama-prism-bridge`). A local model autonomously chains 3 read-only tools (`viz_search`/`wiki_lookup`/`read_excerpt`) via Ollama's `/api/chat` `tools` API. Multi-step investigation costs ~0 Claude tokens. Read-only by construction (`confinePath` lexical+`realpathSync`, frozen tool allowlist, hard loop cap, fail-loud).

## When to pick which

- **Interactive Claude** — judgment calls, ambiguous requirements, multi-file builds, anything requiring R5 ("use LLM for judgment").
- **Subagent Claude** — independent investigations (scrutiny reviewers, dedicated research, parallel feature builds). Use the Agent tool with `subagent_type` matching the work.
- **Ollama subprocess** — deterministic transforms (embed, classify, summarize a known file). R5 says "do NOT use LLM for routing"; an Ollama embed call is the *implementation* of routing.
- **Ollama agent harness** — multi-step knowledge investigations that don't need Claude's judgment. The `/ollama-bridge` skill is the entry point.

## Subagent prompt construction — the 6-section template

A subagent has no context from the parent. Its prompt MUST be self-contained:

```
## Unit goal
<one paragraph — why this matters, what's the deliverable>

## Files to review / modify (absolute paths)
<list of files with one-line description each>

## Critical invariants
<bullet list — what MUST hold after your work>

## Run-this-test / verify-this-command
<exact command path>

## Output format
- Grade PASS/FAIL
- Findings: `file:line — issue` format
- Word cap: <N words>

## Doctrine references
<wiki entries, CLAUDE.md sections>
```

Subagents that miss the **invariants** section drift. Subagents that miss the **word cap** generate paragraphs of restatement. Subagents that miss **doctrine references** re-derive what's already documented.

## Tool-use loop budget

Every tool call in any loop costs latency + tokens. R6 says budgets aren't advisory. Per-loop budgets PRISM has measured:

| Loop | Soft budget | Hard ceiling |
|------|-------------|--------------|
| Interactive Claude turn | ~30 tool calls | 60 (compact triggers) |
| Subagent run | ~12 tool calls | 25 (timeout) |
| Ollama agent harness | 5 tool calls | 10 (hard loop cap) |

A subagent that hits 25 calls without delivering is stuck in a search-loop — usually a sign the prompt didn't give it the right starting paths.

## Parallel agent dispatch (single message, multiple Agent tool calls)

```js
// Per-file 2-reviewer gate — single message, both agents fire in parallel
Agent({ subagent_type: "code-analyzer", description: "wiring review",  prompt: <A-prompt> })
Agent({ subagent_type: "reviewer",      description: "independent",     prompt: <B-prompt> })
```

Two agents in one message run concurrently — wall-time = max(agent_A_duration, agent_B_duration). Two messages with one agent each = sum of durations. **For per-file scrutiny + 3-of-3 Stop gate, ALWAYS dispatch in parallel.**

## The "fresh context for each subagent" guarantee

A subagent doesn't see the parent's conversation. Even if the parent already knows that "the bug is in line 42", the subagent must be told this explicitly. **Never delegate understanding** — write prompts that prove you understood the problem: include file paths, line numbers, what to change. Saying "based on your findings, fix the bug" pushes synthesis onto the subagent and usually produces wrong output.

## R10 checkpoints in long loops

`/loop` mode in /checkin-<nato> runs iterations indefinitely. Each iteration MUST `loop-state tick --status <ok|blocked|done>` so the next iteration can resume coherently:

```bash
node .claude/helpers/loop-state.mjs start --session <sid> --task "<task>" --target 20
# Per iteration:
node .claude/helpers/loop-state.mjs tick --session <sid> --status ok --note "<one-line>"
# Final:
node .claude/helpers/loop-state.mjs end --session <sid> --reason done
```

Without ticks, a `/compact` boundary mid-loop strands the iteration count and the post-compact prompt can't resume coherently.

## Ollama integration — the 8% offload reality

PRISM's measured offload rate (lifetime) is 10.9% raw / 42.1% adjusted-last-24h. The gap between "Ollama hooks exist" (21) and "Ollama actually offloads work" (10.9%) is a chronic problem: hooks SUGGEST offloads, they don't FORCE them. The `ask-ollama` callable is the active layer that turns a suggestion into a real offload. **The wiring matters; without the active callable, the hook is advisory only.**

## Related

- [[tribal-precontext-architecture]] — domain-biased RAG layer that feeds prompts
- [[karpathy-12-rule-discipline]] — R5 (model only for judgment), R6 (token budgets)
- [[per-file-scrutiny-gate]] — multi-agent parallel dispatch
- `.claude/skills/ask-local.md` — `/ask-local` skill for direct Ollama offload
- `.claude/skills/ollama-bridge.md` — `/ollama-bridge` skill for the L2 agent harness
- CLAUDE.md §"OLLAMA-EXPAND-MS0" 2026-05-18 — agent-loop infrastructure shipped
