---
name: reference_openrouter_cloud_tier_2026_06_15
description: "CLOUD-OVERFLOW-MS0/U-OPENROUTER-WIRE (2026-06-15, slot:alpha): wired NVIDIA Nemotron-3 via OpenRouter as the cloud long-context/deep-research/free-overflow model tier (1M ctx, $0 free). scripts/lib/openrouter-client.mjs (key-gated, fail-loud, scrubbed) + scripts/ask-openrouter.mjs CLI (ask/research/summarize/longread/models, NC-egress-refused) + model-routing-policy routeCloudLongContext tier + model-tier-advisor cloud branch + FEATURE-ROUTING-GRAPH doctrine. NEEDS OPENROUTER_API_KEY in env to go live (inert+fail-loud without it)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.684Z
aliases: reference_openrouter_cloud_tier_2026_06_15
---


# OpenRouter Nemotron-3 cloud long-context tier (2026-06-15, slot:alpha)

Operator: "wire cloud version, network is 1gb/sec with upgrades coming soon" -- after the
gpt-oss:120b vs local-87GB-nemo vs OpenRouter assessment. Decision: route deep-research /
long-context / free-overflow work to NVIDIA Nemotron-3 on OpenRouter (1M ctx, **$0 free tier**)
rather than pull the 87GB local quant (barely fits 96GB VRAM, no KV headroom, slower than
gpt-oss:120b, cannot use its long-context edge locally).

## Verified OpenRouter slugs (live API 2026-06-15)
- **`nvidia/nemotron-3-super-120b-a12b:free`** -- 1M ctx, $0/$0 -- **the default** (`DEFAULT_MODEL_SLUG`).
- `nvidia/nemotron-3-ultra-550b-a55b:free` -- 1M ctx, $0/$0 -- stronger 550B, one-env-var upgrade.
- `nvidia/nemotron-3-super-120b-a12b` -- paid $0.09/$0.45 per 1M (fallback if free tier rate-limited).
- `nvidia/nemotron-3-ultra-550b-a55b` -- paid $0.50/$2.50 per 1M.
- Override per-session: `OPENROUTER_MODEL=nemotron-ultra-free` (registry key) or a raw slug.

## What shipped (commits U-OPENROUTER-WIRE + -P1)
- `scripts/lib/openrouter-client.mjs` (+test): pure shaping + thin fetch shell. NEVER throws,
  FAILS LOUD without `OPENROUTER_API_KEY` (no faked success, no network), redacts+`scrubSecret`s
  the key from EVERY error path (incl. raw-shaped key in a 200 provider-error body). `costFor`,
  `cloudFooter`, `resolveModelSlug` (registry key -> slug; raw slug passes through).
- `scripts/ask-openrouter.mjs` (+test): CLI mirroring ask-ollama. Modes ask / research / summarize /
  longread (2MB cap, 1M-ctx showcase) / models. Reuses `looksLikeNcProgram` (R8) to REFUSE sending
  G-code to an external cloud. Cloud failure -> exit 3 + explicit Claude-fallback directive.
- `scripts/lib/model-routing-policy.mjs` `routeCloudLongContext`: the tier fires ONLY on (a) an
  EXPLICIT directive-verb request (use/via/route to/run on/ask/switch to + nemotron/openrouter/cloud
  model) -- honored above Ollama; or (b) an UNAMBIGUOUS implicit signal (`deep research`,
  `research across/the entire/the whole`, `1M context`) -- honored AFTER Ollama. VETOED by build
  (Opus owns it) + deep-think/design (Fable owns it). Safety ALWAYS frontier Claude, never egresses.
  routePrompt order: safety -> explicit-cloud -> ollama -> implicit-cloud -> claude.
- `.claude/hooks/model-tier-advisor.mjs`: `engine==="openrouter"` branch emits the cloud-route
  directive. Flows through `feature-routing-graph.mjs routeTaskClass.live.modelEngine` (no orphan).
- `state/shared/specs/FEATURE-ROUTING-GRAPH.md`: model ladder + cloud-tier doctrine.

## Scrutiny (the lessons -- R12 quality-first)
91/91 tests. 3-of-3 caught the SAME over-broad-match class TWICE (per-file then final):
1. Implicit `(analyze|review|summarize) ... (entire|whole|all) <noun>` stole routine read work
   from sonnet/fable -> dropped entirely; only unambiguous deep-research signals trigger.
2. Explicit bare `cloud (model|llm|tier)` / `<name> ... model` matched TOPIC mentions ("fix the
   cloud tier handler") -> now requires a directive verb.
3. Provider-error path skipped the literal key-scrub -> a raw-shaped key in a 200 body could leak.
**Doctrine:** route to a lossier cloud model ONLY when the win is unambiguous; when in doubt,
Claude quality wins. Same principle as [[feedback_force_use_requires_lossless_substitute]].

## TO GO LIVE (the one gate)
`OPENROUTER_API_KEY` is NOT yet in env -> the route is built+tested but inert (fails loud, never
fake). Operator: `setx OPENROUTER_API_KEY "sk-or-..."` (key from https://openrouter.ai/keys), open
a NEW shell, then probe: `node H:/prism/scripts/ask-openrouter.mjs ask "reply PONG"`.

## U-OPENROUTER-TELEMETRY (same day) -- measure the cloud savings (R15 prove-with-numbers)
The cloud tier shipped recording NOTHING -- a $0/0-Claude-context offload was invisible to the token
economy. Added (mirrors ask-ollama's recordExecution, R8):
- `cloudTokensSaved` (pure): input-output, prefers OpenRouter's authoritative `usage`, char/4 fallback,
  never negative.
- `recordCloudExecution`: `recordOllamaEvent({hook:"ask-openrouter", decision:"offload",
  extras:{mode:"executed", lane:"cloud", model}})` -> lands in the SEPARATE executedOffloads/
  measuredTokensSaved adoption counters + `byHook["ask-openrouter"]`, NEVER the headline Ollama rate
  (no double-count -- bumpTotals returns early on mode:"executed"). Fail-soft, gated by
  PRISM_ASK_OPENROUTER_TELEMETRY=0. Called from main() on exit 0.
- ollama-offload-dashboard.mjs: additive cloud-lane segmentation (`executedCloud` /
  `executedCloudTokensSaved`) + an off-Claude-executed print line. Non-cloud rate math byte-identical.
46/46 tests, per-file 2-arm scrutiny PASS (0 findings; downstream JSON consumers verified unbroken).
Cloud offloads now show in `node scripts/ollama-offload-dashboard.mjs` once the key is set + the tier runs.

Related: [[reference_feature_routing_graph_ms0_2026_06_15]] (the base graph) ·
[[reference_model_routing_ms0_2026_06_11]] (the model-routing policy this extends) ·
[[feedback_force_use_requires_lossless_substitute]].
