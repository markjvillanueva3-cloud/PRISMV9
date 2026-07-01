---
name: reference_efficiency_utilization_audit_2026_06_11
description: "Ultracode 6-agent audit of PRISM dev-process efficiency -> 12-item U-EFF queue. Headline leak: ollama offload 9.2% (route-pretooluse fires 6501x, offloads 4 / suggest-mode). Top lever U-EFF-01 PRISM_OLLAMA_ROUTE_AUTO=1 (golf). Sierra caught U-EFF-11 false premise (R12)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.565Z
aliases: reference_efficiency_utilization_audit_2026_06_11
---


# Efficiency + tool-utilization audit (2026-06-11, slot:sierra)

Operator /goal "improve system efficiency + feature/tool utilization" → ran a focused **ultracode** Workflow (`wf_87c89af2-845`, 6 Sonnet dimension agents + 1 synthesis, 823K tokens, 15m) across ollama-offload / model-switching / build-pipeline / injection-layer / memory-tribal-cadence / parallel-agents. Cross-ref'd the 2026-06-09 vault-synergy queue (additive build-process angle, no dup). Full queue: `state/shared/specs/EFFICIENCY-UTILIZATION-QUEUE-2026-06-11.md`.

## Hard numbers (current efficiency state)
- **Ollama offload 9.2%** (80/872) vs ≥30% floor. Root cause: `ollama-route-pretooluse` fires **6,501×**, offloads **4** (0.06% take-rate — suggest-mode default, not auto). **Fix = `PRISM_OLLAMA_ROUTE_AUTO=1` (golf, U-EFF-01) → ~48% offload.** Single highest-ROI lever in the system.
- **Tribal embed index 0% built** (0/3,920; OOM at 965MB) → keyword-only recall. india U-EFF-02: `tribal-embed-index.mjs --bootstrap` w/ 8GB heap → ≥80%.
- **`resolveExecutor`** (anti-Opus-leak invariant) has **0 production call-sites** → mechanical work promotes to Opus when Ollama down (golf U-EFF-04).
- 3-arm scrutiny incomplete on 43.8% sessions; 29 escape-hatch silent auto-passes (golf U-EFF-03). grep-result-cache 1216h stale (golf U-EFF-06).

## R12 catch (why verify agent claims before building)
The synthesis's TOP sierra item (U-EFF-11) claimed the nav-savings ledger is `mcp-server/data/state/nav-savings-ledger.json` (ENOENT) → "writer-without-reader, unmeasurable." **FALSE — wrong path.** Real `DEFAULT_LEDGER` = `state/shared/dashboards/nav-savings-ledger.jsonl` (`scripts/lib/nav-savings-ledger.mjs:27`), EXISTS (79 hits / 23,700 saved tok via `readNavSavings()`), consumed by `stop-psn-savings-aggregate.mjs`, surfaced in the SessionStart PSN headline `nav(79h=23.7k)`. The whole nav-savings loop works. Only residual gap: `readNavSavings()` has no on-demand MCP action → sierra ships `prism_session:nav_savings_report` (U-EFF-NAV-REPORT). **Lesson: a Sonnet aggregation agent's file:line claims need spot-verification (R12); one wrong path inverted the entire top finding.** Also: the synthesis agent's FINAL message was a verifier-defense, not the queue — recover the real artifact from the agent transcript, never accept the meta-response as the deliverable.

## Owner routing
golf: U-EFF-01 (+ S-cluster 03/04/06/07/08/09/10 hook-hygiene). india: U-EFF-02. alpha: U-EFF-05/12. sierra: U-EFF-NAV-REPORT.

Related: [[reference_obsidian_vault_synergy_queue_2026_06_09]] · [[tribal---obsidian---system-viz-utilization-protocol]] · [[reference_alpha_explore_agent_schema_incompat]] · [[feedback_ollama_fallback_sonnet_agents]] · [[feedback_ollama_token_routing]]
