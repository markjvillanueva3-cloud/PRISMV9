---
name: compliance-safety_synthesis
description: "[auto-synth · verify] Compounding synthesis of the compliance-safety domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: compliance-safety
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:47:19.481Z
  sourceHash: d8ac10c1fc13
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
- **Standing‑rule discipline** – Almost every excerpt defines a “standing rule” that must be obeyed automatically (e.g., ledger rotation, atomic writes, pipeline‑only NC emission).  
- **Never defer / always close out** – Tasks, bugs, and documentation are required to be completed before reporting success ([feedback_always_close_out], [feedback_always_update_wiki_on_bug_finding]).  
- **Full‑scope validation** – Builds must pass the complete WIRE → TEST → VALIDATE → APPLY‑TO‑ALL‑GALAXIES flow; single‑galaxy shortcuts are only scoped exceptions ([feedback_wire_test_validate_all_galaxies]).  
- **Safety‑first constants handling** – All operational constants (post‑processor, shop rates, G96 RPM caps) must be sourced from a canonical DB rather than inlined ([feedback_echo_no_inline_post_constants], [feedback_charlie_quoting_no_inline_rates], [feedback_oscar_css_g50_cap_mandatory]).  
- **Comprehensive coverage** – Searches, domain discovery, and roadmap execution are required to be exhaustive (recursive tree traversal, capture of every discovered asset, build every identified gap) ([feedback_full_recursive_parallel_search], [feedback_domain_discovery_memories], [feedback_always_build]).  

## Key decisions & rules
| Decision / Rule | Summary | Source |
|-----------------|---------|--------|
| **Ledger rotation, never delete** | Append‑only JSONL ledgers are rotated when oversized; original files remain for telemetry. Orphan temp files are treated separately. | [feedback_juliett_rotate_never_delete_ledgers] |
| **Atomic multi‑writer writes** | Any JSON/state file written by >1 process must use `atomicWriteJson` with a final unlink of the temporary file. | [feedback_juliett_atomic_write_discipline] |
| **Wire → Test → Validate → Apply‑to‑All‑Galaxies** | Every build must complete this pipeline before being considered “done”; partial delivery is only allowed as a scoped exception. | [feedback_wire_test_validate_all_galaxies] |
| **Never share H: drive contents publicly** | All files under `H:/prism` are prohibited from public distribution (GitHub, agentskills.io, etc.). | [feedback_no_public_h_drive] |
| **Close‑out all tasks before exit** | No follow‑ups may be left pending; documentation sync and tribal index updates must finish first. | [feedback_always_close_out] |
| **Create wiki entry for every bug found** | Every bug discovered in a session requires a companion article under `knowledge/wiki/lessons/` or `knowledge/wiki/code-tribal/`. | [feedback_always_update_wiki_on_bug_finding] |
| **NC emission must go through the PostProcessorPipelineEngine** | Direct string concatenation of G‑code is forbidden; all NC passes the 7‑phase pipeline (or MasterPostProcessorUnifiedAGIEngine). | [feedback_echo_masterpost_pipeline_route] |
| **Constants must be imported, never inlined** | Shop rates, material prices, post‑processor feed/speed/physics constants, and quoting parameters are to be read from a DB/canonical source. | [feedback_echo_no_inline_post_constants], [feedback_charlie_quoting_no_inline_rates] |
| **MCP auto‑reconnect each turn** | If the MCP daemon disconnects, the fleet attempts a single‑flight reconnection on every turn; no advisory‑only mode. | [feedback_mcp_autoreconnect_each_turn] |
| **Safety cap for G96 constant surface speed moves** | Every G96 move must include a G50/G92 max‑RPM limit to prevent runaway at small diameters (P0 safety class). | [feedback_oscar_css_g50_cap_mandatory] |
| **Capture every operator build request** | Append each explicit build/feature request from the operator to `state/shared/USER-BUILD-REQUESTS-LOG.md`. | [feedback_user_build_requests_log] |
| **Build for Blackwell hardware** | All AI‑system builds target RTX PRO 6000 Blackwell 96 GB, Ryzen 9 9950X3D, 136 GB RAM, NVMe; Torch stack is LIV. | [feedback_build_for_blackwell_hardware] |
| **Pick units only from master roadmaps** | Unit selection must use the two master roadmaps (`/pick-unit`), prioritizing devtools then revenue; arbitrary milestone greps are prohibited. | [feedback_pick_unit_routing] |
| **Close out milestones in all roadmap surfaces** | Completion of a task triggers closure across every roadmap view, enforced by hooks/orchestrator. | [feedback_roadmap_close_out] |
| **Build identified gap engines without skipping** | When a roadmap analysis reveals missing engines, each must be built; “too thin” or “narrow” gaps are not an excuse to skip. | [feedback_always_build] |
| **Logical dependency order for builds** | Build sequence follows dependency hierarchy: core → integration → inline components. | [feedback_build_in_logical_order] |
| **Full recursive parallel search** | Folder searches must traverse the entire tree recursively, never sample or stop at top‑level only. | [feedback_full_recursive_parallel_search] |
| **Domain discovery writes durable memories continuously** | During DISCOVER phases, domain assets and gaps are recorded immediately rather than waiting for close‑out. | [feedback_domain_discovery_memories] |
| **Optional high‑ROI work must be done** | Known optional or additional high‑ROI tasks should be executed proactively; not deferred. | [feedback_do_optional_high_roi_work] |

## Open threads
- **Retention & archival policy for rotated ledgers** – The rule mandates rotation, but does not specify how long old ledger files must be retained for compliance audits.  
- **Orphan temporary file handling** – Orphans are distinguished from regular temp files, yet no explicit disposal or audit procedure is defined.  
- **Verification of “canonical source” integrity** – Several rules require importing constants from a DB; the process for validating that the DB itself remains trustworthy and up‑to‑date is not detailed.  
- **Scope of “partial/one‑galaxy delivery” exceptions** – The criteria that qualify an exception to the full WIRE→TEST→VALIDATE pipeline remain unspecified.  
- **Enforcement mechanisms for the H: drive prohibition** – While sharing is banned, tooling or monitoring to detect accidental public exposure has not been described.  
- **Cross‑galaxy consistency of USER‑BUILD‑REQUESTS‑LOG** – No explicit review or reconciliation process ensures that logged requests are acted upon uniformly across galaxies.  
- **Safety cap applicability beyond G96** – The G50/G92 RPM limit is mandated for constant surface speed moves; it is unclear whether similar caps are required for other high‑risk CNC commands.  
- **Automatic closure of roadmap items in external tools** – The hook/orchestrator closes milestones internally, but integration with third‑party project trackers (e.g., JIRA) is not mentioned.  

These gaps represent areas where additional policy or tooling may be needed to fully realize the compliance‑safety standing doctrine.
