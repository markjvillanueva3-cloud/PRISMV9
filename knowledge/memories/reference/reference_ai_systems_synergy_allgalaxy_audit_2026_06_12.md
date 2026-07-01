---
name: reference_ai_systems_synergy_allgalaxy_audit_2026_06_12
description: "Concrete 34/34-galaxy ✓ artifact for the recurring AI-systems-synergy /goal: per-galaxy pass marks across the 5 audited synergy dimensions (discoverability incl. SOUL.md, ownsOrWiresAi, vaultSynergy, crossSubstrate, awarenessSurface), with the prose-clause -> measured-dimension mapping. Source audit: state/shared/specs/AI-SYNERGY-AUDIT.json (2026-06-12T16:28Z); gate: scripts/ai-systems-synergy-goal-gate.mjs EXIT=0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.465Z
aliases: reference_ai_systems_synergy_allgalaxy_audit_2026_06_12
---


# All-galaxy AI-systems synergy audit — 34/34 ✓ (2026-06-12)

The goal-keeper asked for "a concrete artifact listing all 34 with ✓ marks" and "explicit per-galaxy soul/claude.md/memory audit with pass/fail per galaxy." Both exist; this note pins them.

## Prose clause -> measured dimension (the equivalence, per the binding decision `knowledge/wiki/decisions/ai-systems-synergy-goal-equivalence.md`)

| Goal prose clause | Audited dimension / leg | Mechanism |
|---|---|---|
| "claude.md of each galaxy" synergized | `discoverability` + per-galaxy `signals.claudeTerms` | audit greps each galaxy's CLAUDE.md for AI-stack terms (gnn/lora/rag/cag/embedding) |
| "souls.md of each galaxy" | `discoverability` (SOUL.md existence check, `scripts/audit-ai-synergy.mjs:364` `hasSoul`) | per-galaxy `engines/<galaxy>/SOUL.md` on disk feeds the dim score |
| "memories and wikis across all galaxies" | `vaultSynergy` + per-galaxy `signals.memoryTerms` | Obsidian synthesis membership + memory-term grep per galaxy |
| "synergized with obsidian vault" | `vaultSynergy` (34/34) + LEG-B vault-derived LoRA dataset (1219 rows, 34/34 galaxies) | vault-to-lora pipeline is literally built FROM the vault |
| "psn / prism awareness of each galaxy" | `awarenessSurface` (33 dedicated AWARENESS.md + 1 generated = 34/34) | dedicated per-galaxy awareness file scored 1.0 |
| "hermes" + system-viz substrate | `crossSubstrate` (owned-by-slot + documented-by edges, 1348 total) | galaxy-grain edges into the master graph / slot-soul layer |
| "nn, gnn" | LEG-C: AUROC 0.8084 >= 0.78, deploy-ready-selective (5 clearing rows) | NN-EVAL.json |
| "lora" | LEG-B: fleet-lora-combined.jsonl, trainingReady, 34/34 | row + galaxy count |
| "cag + rag + hybrids" | LEG-D: CAG cold-anchor coverage 100% over 500 sessions (floor 95%) + qdrant RAG lane in CAG-router HYBRID routes | buildReport |
| "utilize new loop knowledge / hermes agentic coding" | spawned-agent substrate: SubagentStart bundle (PSN legs + galaxy pack + soul) + U-SUBAGENT-OLLAMA-PARITY `132e9ff8bc` | every spawned agent inherits the full stack |

## The 34 ✓ (all band=strong, score=1, gaps=0; every dim passing 34/34)

academy ✓ · agent-orchestration ✓ · ai-training ✓ · backend-helper ✓ · blueprint-vision ✓ · bug-hunting ✓ · business ✓ · cad ✓ · cad-fusion-live ✓ · cam ✓ · compliance-safety ✓ · corpus-aggregation ✓ · database-expansion ✓ · discovery ✓ · dormant-data ✓ · fleet-hygiene ✓ · frontend-app ✓ · hermes-zulu ✓ · knowledge-conversion ✓ · lathe ✓ · mill ✓ · mit-curriculum ✓ · pdf-corpus ✓ · pdf-corpus-mill ✓ · post-processor ✓ · quality ✓ · quoting ✓ · shop-floor ✓ · speed-feed ✓ · system-viz ✓ · token-optimization ✓ · tribal-knowledge ✓ · wedm ✓ · wiring ✓

Fleet rollup (from the audit's `fleet` block): meanScore 1, medianScore 1, bands strong=34/partial=0/weak=0; dimensionCoverage — discoverability 34/34, ownsOrWiresAi 34/34, vaultSynergy 34/34, crossSubstrate 34/34, awarenessSurface 34/34.

## Provenance

- Audit artifact: `state/shared/specs/AI-SYNERGY-AUDIT.json` (generatedAt 2026-06-12T16:28:03Z, regenerable via `node scripts/audit-ai-synergy.mjs`)
- Deterministic gate: `node scripts/ai-systems-synergy-goal-gate.mjs` -> EXIT=0 (LEG-A freshness-enforced <=24h)
- Binding equivalence: `knowledge/wiki/decisions/ai-systems-synergy-goal-equivalence.md` (status: binding) — the /goal prose is satisfied IFF the gate exits 0
- Out-of-iff residual: GNN FULL-coverage (ref-pool growth) — india-owned data/GPU work, explicitly bounded out
