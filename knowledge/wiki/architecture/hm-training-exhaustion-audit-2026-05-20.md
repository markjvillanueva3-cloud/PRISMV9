---
title: HM Training Exhaustion Audit (2026-05-20)
type: architecture
created: 2026-05-20
slot: foxtrot
session: claude-3db3fb3d
---

# HM Training Exhaustion Audit — 2026-05-20

`/forge-audit-v2` run assessing whether the hyperMILL / hyperCAD-S training corpus on disk has been exhausted into PRISM's tribal/wiki/AI/NN systems.

## Sources

- Audit doc: [`state/shared/specs/HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.md`](../../../state/shared/specs/HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.md)
- HTML companion: `state/shared/specs/HM-TRAINING-EXHAUSTION-AUDIT-2026-05-20.html`
- /forge7 plan: [`state/shared/specs/HM-TRAINING-WIRING-PLAN-2026-05-20.md`](../../../state/shared/specs/HM-TRAINING-WIRING-PLAN-2026-05-20.md)
- META artifact: `scripts/hm-extraction-coverage.mjs` (re-runnable, JSON output)

## Baseline (2026-05-20T16:09Z)

| Surface | Now | Target |
|---|---:|---:|
| HM PDFs on disk | 48 | — |
| Extractions | 15 | 51 |
| Unprocessed PDFs | 36 | 0 |
| HM tribal tips | 3 544 | ≥6 000 |
| Embed-index HM entries | **0** | ≥5 000 |
| Consumer engines wired | 8/8 grep / 0 measured | ≥3 measurement-verified |
| GraphSAGE pool | 0 (deferred) | ≥500 (deferred:false) |

## Headline findings

1. **F1 — hyperCAD-S CAD_Manual extracted but zero-tip** (CRITICAL — CAD AI training source produces nothing)
2. **F2 — 4 additional zero-tip extractions** (fusion-cad, sql-tool-db, sql-macro, hypermill-sql)
3. **F3 — v31.0 manuals never separately extracted**
4. **F4 — tribal-embed-index has ZERO HM entries** (CRITICAL — vector recall blind to all 3 544 tips)
5. **F5 — hyperCAD-S wiki coverage unverified** (separate sub-corpus from CAM-side)
6. **F6 — 9 consumer engines grep-confirmed, 0 measurement-confirmed**
7. **F7 — GraphSAGE GNN dormant-by-data; HM tips are highest-leverage seed feedstock**
8. **(Newly surfaced)** 30+ unprocessed `hmAutoColor` Automation-Center workflow PDFs (operator idiom-dense)

## Verdict

**Not exhausted.** The audit verdict is reproducible via the META artifact. Closing F4 (embed-index) alone unlocks the existing 3 544 tips for fleet-wide tribal recall in every chat. Closing F1 (re-extract hyperCAD-S) + the headline-gap (hmAutoColor) is the next-highest leverage. /forge7 plan ships 7 build units to close the gaps; each maps to a META baseline number that must move.

## Verification

```bash
node scripts/hm-extraction-coverage.mjs --json | jq '.baselines_for_audit'
# F1_hypercad_zero_tip: 0          (CRITICAL until non-zero)
# F4_embed_index_blind: true       (CRITICAL until false)
# F7_graphsage_dormant: true       (until ≥500 pool from HM seed)
```

## Schedule

Re-runs every 5 minutes (operator-directed hot-loop while wiring units land), then returns to standard `/forge-audit-v2 /loop 7d` cadence.

## See also

- [[ollama-pipeline-ms0]] — Ollama routing for batch re-extraction
- [[nn-graph-ms2-u1]] — ghost-seeding infrastructure HM tips will feed
- [[knowledge-conversion-ms0]] — Lane A direct-wire pattern reusable for embed-index population
- [[per-slot-rgs-allocation]] — slot-domain tribal injection that F4 closure unblocks
