---
title: Hermes no-model default must be lane-aware — never emit an unserved id
type: lesson
created: 2026-07-01
slot: bravo
galaxy: hermes-zulu
tags: [hermes, model-routing, nvidia-lane, grok, 404, resolver, R15, R8]
related:
  - "[[reference_hermes_no_model_404_fixed_2026_07_01]]"
  - "[[reference_hermes_nvidia_lane_model_trap_2026_07_01]]"
  - "[[grok-highest-capability]]"
commits: ["0390facfa8", "d83eaf2410", "670b32885e"]
---

# Hermes no-model default must be lane-aware — never emit an unserved id

## The bug class
A Hermes call with **no explicit model** must resolve a default. Both PRISM default-resolvers
(`scripts/hermes-mcp-server.mjs:resolveModel` behind the `mcp__hermes__hermes_ask` tool, and
`scripts/lib/grok-capability-rank.mjs:resolveHighestCapabilityModel` behind `ask-hermes.mjs:pickModel`)
resolved the default by fetching `/v1/models` and calling `pickHighestCapabilityGrok(ids)`.

That ranker is **grok-specific**: it scores grok ids and gives every non-grok id a flat
`NON_GROK_SCORE`. On the **NVIDIA cloud lane** (`PRISM_HERMES_PROXY_URL=integrate.api.nvidia.com/v1`,
~120 served models, **zero grok**) every id ties, and the picker's strict-`>` keeps the **first-listed**
id — a coin-flip that (a) ignores the operator-configured served `PRISM_HERMES_MODEL` and (b) **404s the
moment `/v1/models` leads with a non-chat model** (embedding / reward / safety-guard / vision / parse).
This was the invisible fleet-wide "Hermes down" blocker that wasted 4+ "utilize Hermes" /goal reruns.

## The lesson (general)
**A model-default resolver must never emit an id the lane does not serve, and must be lane-aware.**
- Use a provider-specific ranker (grok-highest-capability) **only when the served list actually contains
  that provider's models.** A grok ranker on a grok-less lane is the wrong tool.
- On any other lane, prefer the **configured served model**, else the **first served *chat-capable* id**
  (filter out embedding/reward/guard/vision/parse families) — never a blind first-listed id.
- Provenance stays honest: `source:"listed"` for a from-list pick, `source:"fallback"` only for the
  empty / all-non-chat last resort (so a "proxy listed nothing" warning never false-fires).

## The fix (shipped)
Lane-aware resolver + shared pure primitives `isGrokId` / `isNonChatModel` / `pickServedChatModel`
consolidated into `scripts/lib/grok-capability-rank.mjs` (single home; `hermes-mcp-server.mjs` imports +
re-exports). Grok-lane behavior (operator 2026-06-26 grok-highest-capability) is byte-preserved.
- `0390facfa8` — hermes-mcp-server resolveModel (3-of-3 scrutiny)
- `d83eaf2410` — ask-hermes / shared-lib resolver, R15 apply-to-all + DRY (2-arm scrutiny)
- `670b32885e` — `NON_CHAT_RE` whole-token right boundary `(?=[-/]|$)` so a chat id merely STARTING
  with a marker (`guardrails-chat`) is not wrongly excluded (R16 gap-close)

## Two meta-lessons worth keeping
1. **A reproduced symptom via a *running* server may be STALE code.** The live 404 I reproduced through
   the `mcp__hermes__` tool came from a stale running MCP server emitting a hardcoded grok function-id
   UUID — the current on-disk code cannot produce it. Verify a symptom against the **on-disk** code
   before claiming a code bug; the acute fix there was an operator MCP-server restart, separate from the
   on-disk latent bug. (R12 — don't conflate the two.)
2. **Don't pattern-match a "grok fallback" as a bug without checking the paired default (R8).** The
   fleet-wide audit initially flagged `generate-pdf-tribal-tips-hermes.mjs`'s `?? "grok-4"` default — but
   its URL default is the **local grok proxy `:8645`**, so grok-4 is a *matched* pair. "Fixing" it would
   have sent llama to the grok proxy = a new 404. Read the paired config before changing a default.

## Coverage (R15, proven not assumed)
The acute bug existed in exactly the two fixed paths (both via the shared resolver). Every other Hermes
call site (`hermes-escalation`, `verified-offload-tiered`, `cad-part-decipher`, `scrutiny-hermes-souls`,
`MultiModelConsensusEngine`, `hermes-domain-enrichment-loop`, `GrokClientEngine`) uses a pinned/static
served default and never grok-ranks a list — verified individually.
