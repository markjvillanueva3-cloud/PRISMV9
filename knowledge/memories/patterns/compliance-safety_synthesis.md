---
name: compliance-safety_synthesis
description: "[auto-synth · verify] Compounding synthesis of the compliance-safety domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: compliance-safety
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:26.626Z
  sourceHash: 19712b046eb9
  advisoryOnly: true
  mustHumanVerify: true
---

# compliance-safety — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Iterative knowledge accretion** – each “iteration” (1‑18, 27) adds a layer of vetted research from courses, standards, government reports, and seminars, building a cumulative compliance‑safety ontology rather than isolated facts.  \[[reference_compliance-safety_iter1_deepsource_2026_06_14] … [reference_compliance-safety_iter27_deepsource_2026_06_14]\]
- **Append‑only telemetry logs** – JSONL ledgers are treated as immutable append streams; when they grow too large they are *rotated* (archived) but never deleted, preserving a full audit trail.  \[[feedback/feedback_juliett_rotate_never_delete_ledgers]\]
- **“Never idle” slot discipline** – every chat‑slot continuously pulls the next highest‑priority item from a defined ladder (queue → fixes → wirings → ghost builds/wirings) to keep the system busy and reduce latency.  \[[feedback/feedback_slots_never_idle_always_hunt]\]
- **Comprehensive build philosophy** – at any decision point the chosen path must be the most complete, avoiding shortcuts, stubs, or “good‑enough” compromises.  \[[feedback/feedback_build_comprehensive_route]\]
- **Full‑coverage SFC testing** – the System‑Functional‑Check (SFC) sweep is mandated to exercise *every* machine‑specific variation (spindles, controllers, materials, holders, etc.) in a closed‑loop training regime.  \[[feedback/feedback_sfc_test_every_variation_per_machine]\]

## Key decisions & rules
| Decision / Rule | Description | Source |
|-----------------|-------------|--------|
| **Rotate, never delete JSONL ledgers** | Append‑only logs are archived when oversized; deletion is prohibited to retain immutable audit evidence. | \[[feedback/feedback_juliett_rotate_never_delete_ledgers]\] |
| **Chat slots must never idle** | Slots automatically hunt down the next task in a predefined ladder once current work finishes. | \[[feedback/feedback_slots_never_idle_always_hunt]\] |
| **Choose the most comprehensive build route** | At any cross‑road, select the full‑coverage implementation; shortcuts are disallowed. | \[[feedback/feedback_build_comprehensive_route]\] |
| **SFC sweep must cover every variation per machine** | Closed‑loop testing includes all combinations of hardware and material parameters for each machine. | \[[feedback/feedback_sfc_test_every_variation_per_machine]\] |
| **Iterative, source‑validated knowledge layers** | Each iteration adds vetted research (courses, standards, gov reports) to the compliance‑safety galaxy, forming a formal proof base by iteration 27. | \[[reference_compliance-safety_iter1_deepsource_2026_06_14] … [reference_compliance-safety_iter27_deepsource_2026_06_14]\] |

## Open threads
- **Formal verification integration** – Iteration 27 mentions “equip experts to formally prove” compliance‑safety claims, but the concrete methodology and tooling for proof generation remain undefined.  \[[reference_compliance-safety_iter27_deepsource_2026_06_14]\]
- **Handling of temporary orphan ledgers** – The rule distinguishes rotated ledgers from “tmp orphan” files; guidance on lifecycle, retention, and eventual archival of these orphans is absent.  \[[feedback/feedback_juliett_rotate_never_delete_ledgers]\]
- **Scalability of full‑coverage SFC testing** – Exhaustively testing every variation per machine may become combinatorially expensive; strategies for prioritization or sampling are not yet articulated.  \[[feedback/feedback_sfc_test_every_variation_per_machine]\]
- **Ghost builds/wirings governance** – The “hunt” ladder includes ghost constructs, but policies for their validation, promotion to production, or cleanup are unspecified.  \[[feedback/feedback_slots_never_idle_always_hunt]\]
