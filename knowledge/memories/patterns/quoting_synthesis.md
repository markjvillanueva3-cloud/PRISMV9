---
name: quoting_synthesis
description: "[auto-synth · verify] Compounding synthesis of the quoting domain — recurring patterns, decisions, open threads distilled from 20 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: quoting
  synthesizedFrom: 20
  model: gpt-oss:120b
  synthesizedAt: 2026-06-11T01:49:57.629Z
  sourceHash: ca5b0522a2e5
  advisoryOnly: true
  mustHumanVerify: true
---

# quoting — domain synthesis (compounding)

> ⚠ ADVISORY — LLM-generated (gpt-oss:120b), `mustHumanVerify`. Auto-distilled by
> `galaxy-reflection-synthesis.mjs` (B1) from 20 domain-relevant memories via the
> A6/A3 hybrid recall. Verify any rule here against its cited source memory before trusting
> it as fact (esp. safety-relevant thresholds). Regenerated on each run — edit the source
> memories, not this file. The compounding arm of the Obsidian brain.

## Recurring patterns
- **Auto‑distilled post‑ship learnings** are repeatedly generated for each quoting module (e.g., DOMAIN‑GALAXY‑DOCTRINE, QUOTING‑PIPELINE, QUOTING‑COMPLETENESS, QUOTING‑SYNERGY) and stored under the `BOOTSTRAP-SLOT-ENFORCE` tag.  
  *[1], [2], [5], [6], [8], [9], [14], [15], [16], [17], [18], [19]*  

- **Closed‑loop OODA engine** drives calibration factor promotion and bias correction, with a CoV gate that rolls back unsafe factors.  
  *[3], [14], [15], [16]*  

- **Calibration activation & gating** is a core recurring step: synthetic/placeholder factors are only promoted after the closed‑loop validates them; over‑reporting gaps trigger rollback.  
  *[8], [15], [16]*  

- **Gap auditing** consistently reveals systematic over‑reporting of incompleteness, leading to a 13‑axis audit routine that distinguishes “already done” vs. truly pending work.  
  *[15], [17]*  

- **Memory brain template enforcement**: every galaxy must maintain a `MEMORY.md` with the four canonical axes (UP, STATE, SHARED, SPEC). Missing axes are flagged and corrected across galaxies.  
  *[7], [11], [13]*  

- **No high‑ROI Ollama offload** for quoting; scripts remain mechanical and are kept in‑place per operator directive.  
  *[4]*  

- **Cross‑galaxy synthesis via LoRA** feeds a shared training signal into each galaxy’s brain, enabling compounding knowledge across the 34 galaxies.  
  *[10], [12]*  

- **Scheduled real‑corpus runs** (cron jobs) keep the quoting system aligned with live data streams.  
  *[18], [19]*  

## Key decisions & rules
1. **Promotion rule:** Synthetic calibration factors may be promoted to live only after `QuotingClosedLoopEngine.runCycle` validates them and the CoV gate deems them safe. *(see [3], [14])*  
2. **Offload prohibition:** The quoting galaxy will not receive Ollama offload code units; mechanical scripts remain the production path. *([4])*  
3. **Brain completeness rule:** A galaxy’s `MEMORY.md` is considered a connected brain only when all four axes (UP, STATE, SHARED, SPEC) are present and correctly linked to the master‑brain template. *([13], reinforced by [7])*  
4. **Calibration activation protocol:** Calibration modules (`U-COV-QUOTING`, `U-QP-CALIBRATION-WIRE`) must be activated through the closed‑loop engine; any detected bias (e.g., –36% under‑quote) triggers immediate rollback of unsafe factors. *([8], [15], [16])*  
5. **Gap audit mandate:** Perform a 13‑axis gap audit on each iteration to detect over‑reporting; adjust completeness metrics accordingly. *([17] → informs [15])*  
6. **Cron scheduling rule:** Real‑corpus ingestion jobs (`U-QP-CRON-REAL-CORPUS`) must run on the defined schedule to keep the quoting model up‑to‑date. *([18])*  
7. **LoRA integration guideline:** Generate per‑galaxy LoRA datasets (512 advisory‑tagged Alpaca pairs) and feed them into the compounding stack after recall has populated the semantic cache. *([10], [12])*  

## Open threads
- **Refining synthetic factor promotion criteria:** How can the validation thresholds in `QuotingClosedLoopEngine` be tightened without stalling useful updates? *(related: [3], [14])*  
- **Future offload assessment:** Although current audit rejects Ollama offload, are there emerging workloads that might justify revisiting this decision? *([4])*  
- **LoRA ↔ closed‑loop integration:** What is the optimal pathway to inject LoRA‑derived signals into the calibration gating process? *(bridge between [10] and [14])*  
- **Gap audit evolution:** Beyond the 13‑axis framework, what additional signals could improve detection of stale over‑reporting? *([15])*  
- **Galaxy memory compliance:** Which galaxies still lack full `MEMORY.md` axis coverage after the latest fill, and what remediation plan is needed? *(status from [7] & ongoing checks)*
