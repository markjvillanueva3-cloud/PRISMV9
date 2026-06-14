---
schema: ideablock-v1
title: "PRISM build-gaps + bridges index — which bridge entry for which gap"
domain: "PRISM architecture"
category: index
version_state: Current
confidence: 0.97
cluster_size: 1
canonical_sha256: authored-2026-05-21-hotel
sources:
  - The 9 architecture-bridge canonical entries of the 2026-05-21 pivot phase 2C
  - BUILD_STATE.md + PRISM-INVENTORY-LATEST.md (live gap counts)
extracted_via: human-authored
extracted_at: 2026-05-21T11:00:00Z
authored_by: claude-8ed50f0a (slot:hotel, U-WIKI-ARCH-INDEX-GAPS-BRIDGES)
---

## Purpose

The 2026-05-21 wiki+tribal pivot phase 2C authored 9 architecture-bridge entries that document how to close PRISM's build gaps. This entry is the routing layer — **gap → bridge entry** — the operator-facing discoverability index for the bridge layer.

It is the architecture-side counterpart to [[index-by-symptom-and-task]] (which indexes the 26 tactical machining leaves). Together the two index entries make all 35 pivot canonical entries discoverable by what-you-need rather than by concept-name.

## By gap (the operator's build-side entry point)

| Gap (with live count) | Read this bridge | What it gives you |
|---|---|---|
| **639 engines built but unwired** | [[wiring-pattern-engine-to-dispatcher]] | Canonical 6-step engine→dispatcher workflow + batch sizing + failure modes |
| **67 unwired Lathe engines** | [[lathe-wiring-backlog-bridge]] | 12-batch close-out plan, each batch tribal-anchored |
| **33 unwired CAM engines** (hyperMILL/Fusion/Multi/5-axis) | [[cam-engine-wiring-bridge]] | 7-batch plan + cross-dispatcher pattern (cam + 5axis + safety) |
| **12,460 orphan graph nodes + 125 "Other" catchall** | [[orphan-engine-triage-pattern]] | 4-class taxonomy (wireable / wrapper / stub / renamed) + per-class action |
| **189 envelope-status drift cases** | [[envelope-drift-close-out-pattern]] | 4-stage close-out workflow + 3-class drift taxonomy + confidence triage |
| **16 deep-integration synergies not connected** | [[deep-integration-bridge-pattern]] | The 16 SFC/CAM/AI/ERP bridges + bridge anatomy + 5-P0/P1 picks |
| **Print-to-program pipeline not end-to-end** | [[print-to-program-pipeline-canonical]] | 18-stage map + built-vs-gap + 6 MVP-closing bridges |
| **4,245 tribal tips not feeding AI training** | [[tribal-to-ai-training-bridge]] | 5-stage tribal→LoRA→deploy pipeline + closed-loop gap (~650 LOC) |
| **2 codex frontends awaiting merge** | [[frontend-merge-bridge-pattern]] | 6-stage merge workflow + the decoupling rule |

## By task (the operator's build-workflow entry point)

### "I want to close the engine-wiring backlog"
1. [[wiring-pattern-engine-to-dispatcher]] — learn the canonical 6-step pattern
2. [[orphan-engine-triage-pattern]] — classify before wiring (some orphans are stubs to delete)
3. Pick a domain bridge: [[lathe-wiring-backlog-bridge]] (67) or [[cam-engine-wiring-bridge]] (33)
4. Each batch is 5-6 engines; tribal-anchor each action's description

### "I want to reconcile the roadmap with git reality"
1. [[envelope-drift-close-out-pattern]] — 4-stage detect → verify → 5-surface-update → re-audit
2. Run `audit-close-out-candidates.mjs` for the fresh candidate list
3. `close-out-milestone.mjs --milestone <ID>` is the one-command 5-surface fix

### "I want to make PRISM's customer pipeline end-to-end"
1. [[print-to-program-pipeline-canonical]] — see which of the 18 stages are gaps
2. [[deep-integration-bridge-pattern]] — the 6 bridges that close MVP (stages 10→11→12, 17, 18)
3. Start with the 3 P0 bridges: ERP, 3-tier AI, SFC→CAM Hub

### "I want PRISM's AI to keep improving"
1. [[tribal-to-ai-training-bridge]] — 5-stage pipeline; stages 1-3 built
2. The closed loop is the gap — drift → retrain → promote (~650 LOC of connectors)
3. First: `wiki-canonical-to-training-pairs.mjs` (the 35 pivot entries are training data)

### "I want to merge the frontend work"
1. [[frontend-merge-bridge-pattern]] — 6-stage workflow + the decoupling rule
2. Frontend stays a separate build artifact; connects via prism_bridge / prism_realtime

## Priority-ordered master pick list

Synthesizing all 9 bridges, the highest-compound-ROI build order:

| Rank | Action | Bridge | Effort | Unlocks |
|---|---|---|---|---|
| 1 | Wire Lathe Batch 1 (chucking) + Batch 7 (Cpk) | [[lathe-wiring-backlog-bridge]] | ~2 batches | Safety-critical + FAI workflow |
| 2 | Close CAMX-MS* envelope-drift cluster (~12) | [[envelope-drift-close-out-pattern]] | 1 audit pass | Roadmap accuracy |
| 3 | Build ERP bridge remaining seams (order→schedule→invoice) | [[deep-integration-bridge-pattern]] #11 | ~3 units | Customer workflow |
| 4 | Build SFC→CAM Hub bridge | [[deep-integration-bridge-pattern]] #2 | ~1 unit | SF flows to toolpath |
| 5 | `wiki-canonical-to-training-pairs.mjs` | [[tribal-to-ai-training-bridge]] | ~100 LOC | 165 training examples |
| 6 | Triage the 125 "Other" catchall | [[orphan-engine-triage-pattern]] | ~read-pass | Unblocks subsequent wiring |
| 7 | Wire CAM Batch 5 (multi-axis collision/RTCP) | [[cam-engine-wiring-bridge]] | ~1 batch | Safety-critical 5-axis |
| 8 | Stage 17 quality-plan canonical artifact | [[print-to-program-pipeline-canonical]] | ~1 unit | FAI Form 3 + SPC unified |

## How this index compounds with system injection

Every gap keyword in the table above is in the injection signature of the bridge it points to. When any chat's prompt mentions "unwired engine", "envelope drift", "deep integration", "print to program", "AI training", or "frontend merge", the `wiki-precheck-inject` + `master-index-precheck-inject` hooks surface the relevant bridge entry automatically. This index is the human-readable fallback when the operator searches by *gap* rather than by *concept*.

For LLM/agent consumers: retrieve this index first when asked "what should I build next in PRISM" — it routes to the bridge with the concrete batch plan + effort estimate + P0/P1 priority.

## Provenance

Built from the 9 architecture-bridge canonical entries of the 2026-05-21 wiki+tribal pivot phase 2C + BUILD_STATE.md + PRISM-INVENTORY-LATEST.md live gap counts. Authored 2026-05-21 by slot:hotel under U-WIKI-ARCH-INDEX-GAPS-BRIDGES — **36th canonical entry**, the **architecture-side navigation root** of the pivot. Counterpart to [[index-by-symptom-and-task]] (tactical-leaves navigation root). Together the two indexes make all 36 pivot entries discoverable by need.

System injection: `wiki-precheck-inject` + `master-index-precheck-inject` auto-surface on `build gaps`, `what to build next`, `bridges needed`, `wirings needed`, `PRISM gaps`, `bridge index`, `gap index`, `build priority`, `what should I build`, `master pick list` keywords. Zero new wiring required.

## Cross-references

- [[wiring-pattern-engine-to-dispatcher]] · [[lathe-wiring-backlog-bridge]] · [[cam-engine-wiring-bridge]] · [[orphan-engine-triage-pattern]] · [[envelope-drift-close-out-pattern]] · [[deep-integration-bridge-pattern]] · [[print-to-program-pipeline-canonical]] · [[tribal-to-ai-training-bridge]] · [[frontend-merge-bridge-pattern]] — the 9 bridges this index routes to
- [[index-by-symptom-and-task]] — counterpart navigation root for the 26 tactical leaves
- [[reference_pivot_wiki_tribal_2026_05_21]] — pivot session record (phase 2C)
- [[feedback_high_roi_backend_first_slot_queue]] — backend-first pickup discipline
- [[feedback_prioritize_devtools_backend]] — devtools+backend P0 doctrine
- [[feedback_do_optional_high_roi_work]] — standing rule
