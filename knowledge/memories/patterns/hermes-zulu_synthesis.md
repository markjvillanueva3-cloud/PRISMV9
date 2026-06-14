---
name: hermes-zulu_synthesis
description: "[auto-synth · verify] Compounding synthesis of the hermes-zulu domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: hermes-zulu
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T04:47:54.443Z
  sourceHash: 1db7e9b420ba
  advisoryOnly: true
  mustHumanVerify: true
---

# hermes-zulu — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 24 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Single‑read “context‑regain” ledgers** per slot (Bravo, Delta, Echo, Golf, Sierra, Papa) that consolidate all open/dormant work into one ROI‑ranked file for fast re‑entry [1][2][3][6][7][12][18].  
- **Bootstrap‑slot enforcement**: every shipped ledger is wrapped by the `BOOTSTRAP-SLOT-ENFORCE` guard to guarantee slot‑specific invariants before any read/write [1][3][8][11].  
- **ROI‑ranking of open tasks** – each ledger lists threads ordered by expected return on investment, enabling operators to pick the highest‑value item first [1][5][7][12].  
- **Schema probing rule** for all JSON state reads: tools must check `schemaVersion` (or equivalent shape) before parsing [19].  
- **Token‑budget sidecar precedence** – token‑awareness files are consulted first; fallback to byte‑estimate only when the sidecar is missing or corrupted [22].  
- **Verified offload pattern**: model proposals are automatically verified by a companion script before being promoted to live use (e.g., Ollama offload) [15].  
- **Closed‑loop replication methodology** for CAD artifacts, defined as a six‑stage ingest → parameterize → generate pipeline [23].  
- **Cross‑surface high‑value discovery workflow** that runs multi‑agent ultracode jobs and produces a ranked build queue (used by India, Alpha, etc.) [9][14][21].

## Key decisions & rules
| Decision / Rule | Rationale / Reference |
|-----------------|-----------------------|
| Adopt **single‑read ledger** as the canonical source of truth for each galaxy/slot. | Enables rapid context regain and ROI‑driven triage [1][2][6][7]. |
| Enforce **BOOTSTRAP‑SLOT‑ENFORCE** on all ledger commits to prevent cross‑slot contamination. | Guarantees slot isolation; present in every shipped ledger [1][3][8][11]. |
| Require **schemaVersion probing** before any JSON state consumption. | Prevents silent schema drift; standing rule [19]. |
| Prioritize **token‑budget sidecar** when estimating token usage for LLM calls. | Improves budgeting accuracy; implemented in `readChatPressure` [22]. |
| Use **verified offload** pipeline for any external model integration. | Guarantees correctness before live deployment; demonstrated with Ollama [15]. |
| Promote candidate NN‑graph checkpoints only after passing the **provenance gate** (charlie) or equivalent verification step. | Avoids regression from synthetic calibration factors [21][24]. |
| Follow the **six‑stage closed‑loop replication** for any H‑drive artifact (CAD, CNC program, blueprint). | Standardizes reproducibility across delta slot [23]. |
| Rank discovery outputs by **token‑savings / context‑retention** impact before adding to the master roadmap. | Aligns engineering effort with maximum LLM utilization [9][14][16]. |

## Open threads
- **Full SFC parity testing backend** remains incomplete; missing full‑combo PRISM batch run and tri‑vendor integration block progress [10].  
- **Delta ledger triage verification**: while the `U‑DELTA‑LEDGER‑TRIAGE` was shipped, ongoing validation of all dormant CAD items is implied but not confirmed [3].  
- **Pending promotion of candidate NN‑graph checkpoint** (`graphsage-checkpoint.candidate.json`) pending provenance gate pass [24].  
- **Delta P7 merge unlock finding** still requires final integration into the main pipeline [8].  
- **ZULU domain status** lists numerous open/unfinished threads across Hermes, Obsidian, and HMEMV; specific items need prioritization based on ROI rankings [5].  
- **High‑value discovery backlog** (India slot) contains ranked improvements that have not yet been scheduled into the fleet‑wide roadmap [14][16].  
- **Token‑budget sidecar health monitoring**: ensure sidecars stay in sync across all slots; any divergence could revert to byte‑estimate fallback, affecting budgeting accuracy [22].
