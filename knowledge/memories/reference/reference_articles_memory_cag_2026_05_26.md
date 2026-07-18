---
name: reference-articles-memory-cag-2026-05-26
description: Synthesis of two X articles (dunik_7 4-layer agent memory + akshay_pachaar RAG-vs-CAG) ingested by slot india 2026-05-26. Both validate already-open P1 findings F1+F6 from AUDIT-TOKEN-CONTEXT-MEMORY-2026-05-16.
type: reference
slot: india
source: prism-memory
synced: 2026-06-27T20:30:46.472Z
aliases: reference_articles_memory_cag_2026_05_26
---


# Two X articles → PRISM already-identified P1 gaps

Slot `india` /loop iter1-4 (2026-05-26). User work order: *"read these articles to see how we can incorporate into system."* The substrate work after R8 (read before you write) is **closing existing F1+F6**, not new units.

## Articles

1. **dunik_7 (2026-05-25)** — *"Give Your Claude Agent a Memory: The 4 Layers, From Sticky Note to Self-Improving"* — Layer 1 sticky note · Layer 2 project (instructions, **not history**) · Layer 3 living memory file (lean+structured+filtered) · Layer 4 consolidator ("dreaming", **write to NEW file, review before swap**). Four mistakes: treating Projects as memory · dumping everything · storing without filter · auto-deploying unreviewed consolidations.
2. **akshay_pachaar (2026-05-19)** — *"RAG vs. CAG, clearly explained"* — every static-info vector-DB hit is wasted cost. **CAG** caches static knowledge in model KV. **Hybrid RAG+CAG** = static→cache, dynamic→retrieve. *Be selective.* OpenAI + Anthropic support prompt caching. Claude Code hits **92% cache hit-rate**.

## Direct mapping to PRISM open work

| Article concept | PRISM existing surface | Status |
|---|---|---|
| A2 — Cold vs Hot data split | AUDIT-2026-05-16 **F1 (P1, open)** — *"8 per-turn injectors re-emit static doctrine every turn, churning the message-level prompt cache. Move static→SessionStart."* | **External corroboration** for an open audit finding |
| A2 — cache hit-rate measurement | AUDIT-2026-05-16 **F6 (P1, open)** — *"no context-utilization telemetry (the gap that makes F1's number real)"* | F6 is the channel that lets F1 commit |
| A2 — Anthropic prompt-cache wrapper | `PromptCachingEngine` (AGENT-MS5 U-AGT19, 28 tests) | Engine ✓ built. Hook callsite wiring ✗ done |
| A1 — Layer 3 lean+filter rule | Memory vault (495 files, 24KB-ceiling MEMORY.md) | Filter discipline informal; bloat audit F7 shipped watchdog only |
| A1 — Layer 4 NEW-file + review-gate | `stop-obsidian-memory-feed.mjs` | **Needs verification** — does it write `<file>.new.md` first? |

## Why "no new units"

Karpathy R8 — read before writing. Both substrate axes are already-identified P1 gaps:

- AUDIT-2026-05-16 F1 + F6 exist with verified baselines (3,420 est tok/fire / 0.222 offload ratio / 23,826 B MEMORY.md)
- `PromptCachingEngine` already wraps Anthropic `cache_control` with stats + break-even analysis + 28 tests
- The [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] milestone (where india's last unit U-MCP-ROUTE-ALL5 lived) is the tool-level analog. F1+F6 are the prompt-level sibling

Inventing new milestones here would duplicate. The articles **validate the direction** of work already chosen by a peer audit.

## Action items for india pickup

1. **Close F1 (smallest scope)** — migrate 2-3 highest-fire static doctrine blocks (CLAUDE.md slice / RTK / dispatcher map) from per-turn UserPromptSubmit → SessionStart cached blocks via `PromptCachingEngine.buildCachedSystem()`. Measure via `scripts/audit-hook-stack-cost.mjs` baseline diff.
2. **Build F6 telemetry sidecar** — surface `PromptCachingEngine` stats as atomic-write sidecar (mirror [[reference_token_savings_pivot_2026_05_22|TOKEN-SAVINGS-PIVOT]] pattern). Target Claude Code's 92% hit-rate as ceiling.
3. **Verify Layer-4 review-gate** — read `stop-obsidian-memory-feed.mjs`; if it writes in place, add `<file>.new.md` stage + Stop-time advisory.
4. **Layer-3 write-time filter** — wrap auto-feed with model-side filter: *"would this change how the agent acts next time? If no, discard."*

## Cross-refs

- [[article-synthesis-memory-cag-2026-05-26]] — full wiki synthesis with audit cross-mapping
- [[audit-token-context-memory-2026-05-16]] — origin audit (F1+F6 open)
- [[token-savings-pivot]] — tool-level sibling milestone (iter14)
- [[promptcachingengine]] — engine wrapper waiting for hook wiring
- [[backend-dev-token-efficiency]] — standing playbook; §3 (cache) is where F1 closes
- [[feedback_psn_definition]] — 11-leg taxonomy this synthesis touches (Wiki + Memories + PRISM-AI legs)
