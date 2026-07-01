---
name: reference_hotel_transcript_mining_3wk_2026_06_09
description: "Ollama-mined 3-week hotel transcript synthesis (19 sessions, May19-Jun9) + the reusable miner. KEY FINDING - hotel slot has heavy off-domain drift; deep ERP built; shared-tree absorption is the chronic tax."
type: reference
slot: hotel
galaxy: business
source: prism-memory
synced: 2026-06-27T20:30:46.613Z
aliases: reference_hotel_transcript_mining_3wk_2026_06_09
---


# Hotel 3-week transcript synthesis + reusable miner (2026-06-09)

## The tool (reusable, validated)
`scripts/mine-hotel-transcripts.mjs` -- stream-extracts the conversational spine from session .jsonl
transcripts (drops ~90% tool-noise/system-reminders), map-reduce summarizes via LOCAL Ollama
(gpt-oss:20b default), resumable per-session output to `state/shared/hotel-transcript-mining/`.
Proven: 365MB raw across 19 hotel transcripts -> 64KB digest, ~6-80s/session, **$0 Claude tokens**.
Generalizes to any slot via `--since YYYY-MM-DD --model <name>`. R5/OLLAMA-EXPAND pattern: mechanical
summarization -> local model, Claude only synthesizes. A Claude-agent Workflow is the WRONG tool here
(agents cost Claude tokens). Pairs with [[feedback_workflow_concurrency_and_local_routing_2026_06_08]].

## KEY FINDING: hotel slot has heavy off-domain drift
~11 of 19 "hotel" sessions did NON-ERP work (AI cost-cascade, model routing, GPU vision profiles,
post-processor consolidation = echo's domain, MCP-server watchdogs, consensus wiring; one was a full
CHARLIE session). Cause: `/goal ... /loop 5m` autonomous loops pull from a SHARED RGS task queue that
is NOT domain-filtered, so the hotel slot grabs whatever high-ROI infra unit is next. Not wrong work,
but ERP continuity is diluted and "hotel context" = "hotel-slot context", not "ERP context".

## Genuine ERP built (3 weeks) -- the business galaxy is deep
Employee portal (phone SPA + web, 23da5f50/2bc3054c), Payroll + AR-aging + amortization, PO-lifecycle
FSM, OSHA-300, time-clock FSM, NCR/8D, vendor scorecard, BurdenRate, customer analytics (HHI/Pareto),
BusinessIntelligenceEngine (break-even/make-vs-buy/ROI), quoting calibration+training loop (42 iters),
ERP bridges (WorkOrderSchedule/QuoteToOrder/QueueingLeadTime), Quote-to-Ship on JM Docustrata 111K-doc
manifest, and (today) the payroll-filing wire (W-2/940/941-reconcile/1099/remit). The 2026-05-29
"88% complete, tax pillar missing" audit is STALE (tax is built -- see
[[reference_hotel_payroll_filing_wire_2026_06_09]]).

## Chronic pain points (every session) -- the real velocity tax
1. **Shared-tree commit contention / peer absorption / H8 misattribution** -- THE most recurring issue.
   The `H:/prism-slot-hotel` worktree migration was NEVER adopted; everyone uses [BOOTSTRAP-SLOT-ENFORCE]
   pathspec commits and still gets absorbed. This is the highest-ROI fleet hygiene fix.
2. git index.lock contention -> exit 255 (recurring).
3. Anthropic rate-limiting -> workflow failures -> forced pivot to inline.
4. Vitest worker OOM (known, unfixed).

## Live open ERP threads (worth picking up)
- `POST /api/v1/business/dispatch` Express route -- 404, BLOCKS the employee-hub frontend (09808061). Highest leverage.
- Quote-to-Ship: bridge `geometry.blueprint_analysis -> feature_candidates` for PDF-only JM jobs; DFM_CHECK "features is not iterable" contract bug (d6291f80).
- Employee portal: no persistence (in-memory) + no WebSocket/SSE live-push (2bc3054c).
- Unwired mobile engines (MobileVoice/Lookup/Interface); real vendor API keys (McMaster).

## Ollama efficiency (operator's question, answered)
YES -- proven above. The fleet ALSO already built the Ollama efficiency stack itself: COST-CASCADE-MS0
(FrugalGPT cheap->strong two-pass), ModelRoutingEngine + OllamaCapabilityProbeEngine (runtime
hardware-aware routing), offload rate-limit hints, Blackwell GPU profiles. Built-but-UNDERUTILIZED
(offload rate ~6% vs 30% target). Related: [[reference_ollama_expand_ms0]] · [[feedback_psn_definition]].
