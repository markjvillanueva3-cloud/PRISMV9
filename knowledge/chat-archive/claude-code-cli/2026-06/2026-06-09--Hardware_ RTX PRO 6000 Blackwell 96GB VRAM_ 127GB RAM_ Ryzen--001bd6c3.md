---
type: "chat-session"
source: "claude-code-cli"
session_id: "001bd6c3-283f-428a-ab3f-66fd01309443"
title: "Hardware: RTX PRO 6000 Blackwell 96GB VRAM, 127GB RAM, Ryzen 9 9950X3D 32T. Olla"
date: "2026-06-09"
first_ts: "2026-06-09T17:26:05.046Z"
last_ts: "2026-06-09T17:26:34.299Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_97e535ab-e6c/agent-ac13761ee8f1db004.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:03"
---

# Hardware: RTX PRO 6000 Blackwell 96GB VRAM, 127GB RAM, Ryzen 9 9950X3D 32T. Olla

> **claude-code-cli** | 2026-06-09 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/001bd6c3-283f-428a-ab3f-66fd01309443/subagents/workflows/wf_97e535ab-e6c/agent-ac13761ee8f1db004.jsonl`

## Transcript

### User | 2026-06-09T17:26:05.046Z

Hardware: RTX PRO 6000 Blackwell 96GB VRAM, 127GB RAM, Ryzen 9 9950X3D 32T. Ollama (OLLAMA_HOST=http://127.0.0.1:11434) models present include: gpt-oss:120b (~65GB), gpt-oss:20b, qwen2.5-coder:32b, qwen2.5-coder:7b, vision models (qwen2.5vl:7b + llava family, ~4), nomic-embed-text.

VERIFIED LIVE (slot:bravo, 2026-06-09): (1) gpt-oss:120b + gpt-oss:20b emit STRUCTURED Ollama tool_calls; qwen2.5-coder:32b does NOT (it text-emits) -> any tool-loop MUST use the gpt-oss family. (2) qwen2.5-coder:32b ~37GB resident @16K ctx (KV ~17GB, qwen2 64-layer geometry); gpt-oss:120b + qwen2.5-coder:32b CANNOT co-reside on 96GB. (3) gpt-oss:20b LOOPS on broad/common-token searches (correctly falls back to Claude); converges in ~5 iters on TARGETED symbol lookups. (4) ALREADY BUILT + committed on slot/bravo: read-offload (ollama-tool-agent.mjs, gpt-oss tool-loop), search-offload (ollama-offload-enforce.mjs PreToolUse hook), code-offload (ollama-codegen.mjs via qwen2.5-coder:32b), Opus-tail review gate (ollama-build-loop.mjs, default-closed).

route-auto is already ON (ollama-route-config.json mode:auto). gpt-oss:120b is currently stranded out of FLOOR-tier routing. The REMAINING optimization = a task->best-fit-model SELECTION layer + a DETERMINISTIC proof that each model actually loads, responds, and is auto-selected per task class. Safety invariant: local qualityTier<85 -> safety-critical (G-code/physics/feed-speed) ALWAYS routes to cloud Claude, never local.

Lens: ADVERSARIAL / SAFETY. Where will a task->model auto-router pick a WORSE model or silently fail? (e.g. broad search -> gpt-oss:20b loops; safety-critical G-code/physics reasoning -> weak local model; a model evicted/absent mid-task; a low-confidence local answer silently replacing a correct tool result.) Enumerate the failure modes + the GUARDRAILS: the NEVER-auto-route-to-local list (stays on Claude/Opus), the fail-loud fallback when a model is absent/evicted/low-confidence, and how the router must degrade safe.

Be con
... [+156 chars truncated]

### Assistant | 2026-06-09T17:26:34.299Z

Here is the adversarial/safety failure-mode map and guardrail spec for the task→model auto-router.

## Failure modes (where the router picks worse or silently fails)

1. **Broad-search loop → silent timeout-fill.** gpt-oss:20b LOOPS on broad/common-token searches (verified). Risk: it burns iterations, then a watchdog returns a partial/empty result that masquerades as "no matches" — a false negative the caller trusts.
2. **Safety-critical reasoning routed local.** G-code/physics/feed-speed sent to qwen2.5-coder:32b or gpt-oss:20b. A wrong Kienzle/Taylor feed or a missed G50/CSS limit is a scrap-part or crash — local qualityTier<85 is unacceptable here.
3. **Co-residency eviction mid-task.** gpt-oss:120b (~65GB) + qwen2.5-coder:32b (~37GB) CANNOT co-reside on 96GB (verified). A second task triggers an eviction/reload; the in-flight model returns truncated or the reload silently swaps quality tier.
4. **Tool-call assumption on wrong family.** Routing a tool-loop to qwen2.5-coder:32b — which text-emits, does NOT emit structured tool_calls (verified) — yields parsed-as-prose garbage, no loud error.
5. **Low-confidence local answer replaces correct tool result.** A local summary/classification silently overwrites a deterministic dispatcher answer.
6. **Model absent/not pulled** → router falls through to a degraded default instead of failing.

## Guardrails

- **NEVER-auto-route-to-local (hard allowlist → Claude/Opus):** anything tagged safety-critical (G-code emit, physics/feed-speed reasoning, S(x) safety gates, units resolution), final commit/review tails, and any task where a wrong answer is irreversible. This is a deny-by-default classifier, not a heuristic.
- **Tool-loops → gpt-oss family ONLY** (120b/20b); qwen2.5-coder is codegen/non-tool only.
- **Fail-loud, never fail-quiet:** model absent (`/api/tags` miss) / evicted / loops past iter cap / confidence below floor → THROW and route to Claude with the reason logged; never substitute a degraded local result.
- **Si
... [+339 chars truncated]
