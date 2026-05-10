---
title: Track K — Kimi K2.6:cloud Mid-Tier Integration
date: 2026-05-10
author: claude-85cedf09
parent_plan: state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md (§5)
doctrine: state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md
status: planned (awaiting user scheduling decision)
---

# Track K — Kimi K2.6:cloud Mid-Tier Integration

`/forge-audit-v2` (synergy thread) added this Track K on 2026-05-10 in response to the user's "hook it into our current plan" directive. K2.6 is Moonshot AI's 1T-parameter MoE model (32B active, 256K context, 87/100 coding benchmark — first non-Western model to reach Tier A) that became available on `ollama.com/library/kimi-k2.6` in May 2026.

## §1 — Why a mid-tier
PRISM today routes between **two tiers**: free-local `qwen2.5-coder:7b` (38% offload rate; handles explain/summarize/docstring/lint/diff-summary/error-triage well) and **paid Claude** (Opus/Sonnet/Haiku) for everything else. The 62% of "could-be-offloaded" work that stays on Claude is a cost+latency tax — many of those tasks are deep-context refactors or long agentic chains where qwen runs out of capacity but Claude is overkill (and slow with hooks). K2.6:cloud occupies a mid-band: more capable than qwen, cheaper than Opus, and covers a 256K context window that's wider than Sonnet's working window. Local K2.6 is **out of scope** — the smallest quant (Unsloth Q1.8) is 240GB on disk and needs ≥128GB unified RAM at ~5 tok/s, which exceeds the user's portable hardware footprint.

## §2 — Twelve atomic units (full enumeration per build-enforcement)

| # | Unit | Why | Depends on | Blocks |
|---|---|---|---|---|
| **K1** | `U-K2-CONFIG-INVENTORY` — read AISystemRouterEngine.ts (10KB) + OllamaHookBridgeEngine.ts (12KB), document the existing inline tier table, identify the exact insertion point for a new `kimi-k2.6:cloud` tier. Output: `state/shared/specs/K2-ROUTER-INVENTORY.md` (≤2 pages). | Single source of truth before edits; avoids duplicating tier logic | — | K2, K3, K4 |
| **K2** | `U-K2-TIER-REGISTER` — add `kimi-k2.6:cloud` to AISystemRouterEngine's tier union type + capability tags (`{ id: "kimi-k2.6:cloud", costPerKTok: 0.0X, latencyMsP50: ~Y, contextWindow: 262144, capability: ["code","reason","agent"], requiresAuth: true }`). Cost+latency probed in K3. | Type-safe routing | K1 | K3, K4, K6 |
| **K3** | `U-K2-CLOUD-ENGINE` — new engine `K2CloudOllamaEngine.ts` (or extend `OllamaHookBridgeEngine`) that wraps `ollama run kimi-k2.6:cloud`. Handles cloud auth header, request timeout, partial-stream cancellation, fallback to `qwen2.5-coder:7b` on auth failure. Singleton pattern matches existing OllamaHookBridgeEngine. | Concrete adapter | K2 | K5, K6, K8, K10, K11 |
| **K4** | `U-K2-ROUTER-DECISION` — extend `AISystemRouterEngine.route(task)` decision matrix: classify by `(complexityTier, contextSize, safetyCritical)`. Mid-tier band: complexity≥0.4 ∧ contextSize≤200KB ∧ ¬safetyCritical → K2.6:cloud. Existing safety-critical path stays on Claude. | Smart escalation; avoids "upgrade everything" cost spike | K1, K3 | K5, K6, K7 |
| **K5** | `U-K2-TIER-HOOK` — new `.claude/hooks/ollama-tier-router.mjs` UserPromptSubmit hook that calls `AISystemRouterEngine.suggestTier(prompt)` and injects a one-line tier hint into the prompt context. Honors `[no-cloud]` escape hatch. | Boris pattern: explicit decision visible to operator | K4 | — |
| **K6** | `U-K2-SKILL` — new skill `~/.claude/commands/k2-ask.md` (or extend `/local-ask` with `--tier=k2`). Routes user query directly through K2CloudOllamaEngine. Frontmatter: `effort: medium`, `policy.tier: 2`. | Interactive entry point | K3, K4 | — |
| **K7** | `U-K2-COST-GUARD` — new engine `K2CostGuardEngine.ts`: per-session token budget (default 100K tokens/session = ~$X), `prism_session:k2_budget_status` action, fail-closed gate when budget hits 90%. Persists to `mcp-server/data/state/k2-budget.json`. | Cloud is paid; runaway spend is the #1 risk | K2, K4 | K10, K12 |
| **K8** | `U-K2-TELEMETRY` — extend `mcp-server/data/state/ollama-offload-stats.json` schema 2.0.0 → 3.0.0 with per-model breakdown: `byModel: {"qwen2.5-coder:7b":{...}, "kimi-k2.6:cloud":{...}}`. Migration in `src/migrations/`. | Observability for the router decisions | K3 | K9 |
| **K9** | `U-K2-DASHBOARD` — extend `scripts/ollama-offload-dashboard.mjs` with `--by-model` flag + cost projection column (current-spend, projected-monthly). Default view shows tier-band summary. | Operator visibility | K8 | — |
| **K10** | `U-K2-FALLBACK-TESTS` — Vitest suite asserting: (a) qwen unreachable → K2.6:cloud answers; (b) K2.6:cloud unreachable → Claude (with budget check); (c) budget cap mid-stream → graceful degrade message; (d) auth 401 → fallback chain triggered (NOT silent fail-open to Claude); (e) NaN/Infinity/empty/oversize prompts handled. ≥2 spanning task classes per Variability Floor. | Per build-enforcement coverage floor | K3, K4, K7 | — |
| **K11** | `U-K2-AUTH-SETUP` — script `scripts/k2-cloud-signin.mjs` that runs `ollama signin` flow + verifies token, writes status to `state/shared/k2-cloud-auth-status.json`. Plus README at `docs/k2-cloud-setup.md` with the manual one-time setup. | Without this, K3 fails silently | K3 | K6 |
| **K12** | `U-K2-CLAUDE-MD-DOC` — append to `H:/prism/CLAUDE.md` AI SYSTEM ROUTING section: 3-tier ladder (qwen / k2.6:cloud / claude) with decision boundaries + escape hatches. Boris pattern: doc the routing so future chats route correctly. | Discoverability + future-Claude correctness | K1..K11 | — |

**Wave assignment** — proposed insertion into the audit's §6 execution order: **Wave 5.5** (between current Wave 5 cyrilXBT workflows and Wave 6 Company Brain). Rationale: K2 is infrastructure that multiplies the value of cyrilXBT workflows (B1–B6 do recurring scans that could now use K2 for the deeper analysis steps).

## §3 — Variability axes (per build-enforcement variability floor)

| Axis | Spans |
|---|---|
| Task class | code-explain · code-summarize · refactor · deep-reason · safety-critical · agentic-loop |
| Cost tier | free-local (qwen) · paid-cloud (K2.6) · premium (Claude) |
| Context size | <8K (qwen sweet spot) · 8K–200K (K2.6 sweet spot) · >200K (Claude or chunk) |
| Latency budget | sync-fast (<2s — qwen only) · sync-medium (<10s — qwen or K2.6) · async-batch (any tier) |
| Failure mode | model unreachable · auth expired · token budget exceeded · rate-limited · response timeout · hallucination on safety topic |
| Adversarial input | NaN / Infinity / empty prompt / oversize prompt (>256K) / prompt injection / non-UTF8 |

K10 must exercise ≥3 task classes × ≥3 failure modes = ≥9 test cases minimum.

## §4 — Risks + mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| K2:cloud auth token silently expires → router fails open to Claude → cost spike | High | High | K11 verifies token at startup + K7 cost guard catches the spike before $$$ |
| K2 hallucinates on safety-critical physics → bypasses safety validators | Med | **Critical** | K4 hard-routes safety-critical to Claude only; K10 includes a safety-critical adversarial test |
| Tasks currently on qwen get "upgraded" to K2 → new paid cost where there was none | High | Low | K4 decision matrix is conservative: only escalate qwen→K2 when qwen confidence is low (needs confidence signal — may need K1.5 sub-unit) |
| 256K context tempting → operator dumps entire codebase → token cost runaway | Med | High | K7 hard-caps per-request tokens; K6 skill defaults to small context unless `--full` flag |
| Latency higher than local qwen → bad UX for short prompts | Med | Med | K4 decision matrix includes latency-budget axis; routes short+fast to qwen unconditionally |
| Cloud K2 deprecated / unavailable → nothing falls back gracefully | Low | Med | K3 fallback chain tested in K10 (b) and (d) |

## §5 — Hard rules (no escape hatches)

These are FAILS, not warnings, per /forge-audit-v2 doctrine:

1. K2:cloud invoked without K7 budget check first → BLOCK
2. Safety-critical task routed to K2 (not Claude) → BLOCK at K4 decision
3. K3 silent fail-open to Claude on auth failure → BLOCK (must fallback through full chain with explicit log)
4. K10 test suite missing any of (a)–(e) → BLOCK
5. K12 CLAUDE.md update missing → BLOCK (Boris back-flow rule)

## §6 — User-locked decisions (answered 2026-05-10)

| # | Question | Decision | Implication |
|---|---|---|---|
| 1 | Budget cap | **100K tokens/session (~$10)** | K7 fail-closed at 90% (90K tokens) |
| 2 | Default routing posture | **AGGRESSIVE** — any task with context >8K escalates qwen→K2.6:cloud | K4 decision matrix: `contextSize > 8KB ∧ ¬sync-fast → K2.6` (no confidence-signal gating needed). Higher monthly bill is accepted; budget cap is the safety valve. |
| 3 | Safety-critical handling | **TWO-PASS PATTERN** — K2 generates the initial answer, then Claude scrutinizes the output | NEW sub-unit **K4.5** required. This is a cost-effective generator+critic pattern: K2 does the heavy lifting cheaply, Claude validates against safety constraints. Latency = K2 latency + Claude scrutiny. Cost = K2 tokens + Claude scrutiny tokens (Claude is on a smaller scrutiny prompt, not full re-generation). |
| 4 | Wave timing | **Wave 5.5** (between cyrilXBT B1-B6 and Company Brain D1-D5) | B1-B6 will consume K2 from day 1; matches §6 execution order |
| 5 | Auth setup | (deferred — assumed: K11 ships a one-shot wrapper; user runs it once when ready) | K11 stays as planned |

## §6.5 — NEW unit K4.5: U-K2-CLAUDE-SCRUTINIZE-CHAIN

Per user decision §6 #3 above, safety-critical tasks (`prism_calc`, `prism_safety`, anything with `safetyCritical: true` flag) follow this two-pass pattern:

```
1. AISystemRouterEngine classifies prompt → safetyCritical = true
2. K4 routing matrix: dispatch K2.6:cloud with full prompt → response_K2
3. K4.5 scrutiny chain: dispatch Claude with prompt:
     "Below is a K2.6 generated answer for a safety-critical PRISM task.
      Verify against PRISM SAFETY RAILS (Kienzle/Taylor constants from
      src/physics/constants.ts, dimensional consistency, no inline magic
      numbers, no stub returns). Return PASS|FAIL|REVISE with specifics.
      [task] / [response_K2]"
   → response_Claude_verdict
4. If PASS: return response_K2 to caller (cheap, K2 was correct).
   If REVISE: return response_K2 with Claude's revisions inlined.
   If FAIL: discard K2 output, dispatch full task to Claude (full re-gen).
5. K8 telemetry records: { task_id, k2_tokens, claude_scrutiny_tokens, verdict, total_cost }
```

Cost model:
- Best case (K2 PASS): K2 tokens only (~10× cheaper than Claude full)
- Mid case (REVISE): K2 + Claude scrutiny (~3× cheaper than Claude full)
- Worst case (FAIL): K2 + Claude scrutiny + Claude full (~1.2× more expensive than Claude alone)

K10 test additions for K4.5:
- (f) safety-critical prompt → K2 returns valid answer → Claude PASS → return K2 output
- (g) safety-critical prompt → K2 returns wrong physics constant → Claude FAIL → fallback to Claude full
- (h) safety-critical prompt → K2 returns mostly-right + small error → Claude REVISE → return revised
- Plus assertions on telemetry: total_cost recorded for each path

K4.5 dependency: must build AFTER K3 (engine), K4 (router decision), K7 (cost guard). Blocks K10 (tests) and K12 (CLAUDE.md doc — must describe the two-pass pattern).

Updated unit count: **13 atomic units** (K1-K12 + K4.5). Estimated total: **9-13 hours** across 2-3 sessions.

## §7 — Estimated effort

- Aggregate: **9–13 hours** across 2–3 sessions (includes K4.5 two-pass scrutiny chain)
- K1 (inventory) + K2 (config) + K3 (engine) = ~3–4 hours (single session, single chat lane)
- K4 (router) + K5 (hook) + K6 (skill) = ~2–3 hours (can parallel K7+K8)
- K7 (cost guard) + K8 (telemetry) + K9 (dashboard) = ~2 hours
- K10 (tests) + K11 (auth) + K12 (doc) = ~1–2 hours

## §8 — Provenance

- WebSearch evidence (2026-05-10): `ollama.com/library/kimi-k2.6` + `unsloth/Kimi-K2.6-GGUF` + Ollama announcement tweet
- Audit context: `state/shared/specs/SYSTEM-SYNERGY-AUDIT-2026-05-09.md` (parent plan)
- Doctrine: `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md` (verification feedback loop required for every K* unit)
- Existing tier surfaces: `mcp-server/src/engines/AISystemRouterEngine.ts` (10KB) + `OllamaHookBridgeEngine.ts` (12KB) + `mcp-server/data/state/ollama-offload-stats.json` (81KB)
