---
name: hermes-zulu_synthesis
description: "[auto-synth · verify] Compounding synthesis of the hermes-zulu domain — recurring patterns, decisions, open threads distilled from 24 memories (LLM-generated; verify against source memories before trusting)"
metadata:
  type: patterns
  galaxy: hermes-zulu
  synthesizedFrom: 24
  model: gpt-oss:120b
  synthesizedAt: 2026-06-27T16:57:39.921Z
  sourceHash: 9e443eb401a7
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
- **Single‑read “context‑regain” ledgers** are created for each slot (BRAVO, DELTA, ZULU, GOLF, ECHO, INDIA) to provide a one‑stop view of all open/dormant work and ROI ranking.  
  - BRAVO: `U-BRAVO-OPEN-TASKS-LEDGER` [1] / `U-LEDGER-MILL-DRIFT-RESOLVED` [3] / `U-LEDGER-5H-DENOMINATOR-RESEARCH` [5]  
  - DELTA: `DELTA-CONTEXT‑LEDGER.md` [2] and triage/playbook modules [4][12][19]  
  - ZULU: master ledger & reconcilers [20][21][24] plus domain status map [7][22]  
  - GOLF, ECHO, INDIA provide analogous “one‑read” assets [9][8][13].

- **ROI‑ranked inventory** of open threads is generated automatically (e.g., ZULU domain status [7], Sierra cheap‑regain map [22]) and used to prioritize regeneration work.

- **Programmatic loop‑state exposure** via `readFleetLoops()` exported from `loop-state.mjs` [15][18] becomes the canonical API for fleet‑wide state queries.

- **Deterministic reconciliation scripts** (`reconcile-zulu-ledger.mjs`) are run repeatedly to validate ledger claims and flag stale routing [24].

- **Cross‑galaxy master‑brain recall** links ZULU ledger entries to the broader Hermes galaxy memory via `U-GALAXY-BRAIN-READ` [21] and the AGENTIC‑SUBSTRATE bridge [10][11][18].

- **Fail‑open read parity closure** is enforced by a dedicated injection step (`U-REORIENT-INJECT-READ-PARITY`) [11].

## Key decisions & rules
- **Enforce “single‑read” ledger per slot**: all open work must be reflected in the slot’s ledger before any new task is spawned. (e.g., BRAVO, DELTA, ZULU) – [1][2][8][13].
- **ROI ranking is mandatory for triage**; high‑value items are surfaced first in context‑regain sessions. – [7][22][14].
- **Loop‑state must be accessed only through the exported API** (`readFleetLoops()`) to guarantee safety and versioning. – [15][18].
- **Ledger reconciliation is run on every deployment**; any mismatch triggers a rebuild of the affected routing path. – [24].
- **Parity testing for full SFC combos is blocked until backend gaps are closed**; current status “NOT‑READY” prevents further rollout. – [16].
- **Context injection parity must be closed after each ledger update** to avoid stale fail‑open reads. – [11].
- **Cross‑galaxy recall requires the AGENTIC‑SUBSTRATE bridge** as the conduit between ZULU and the broader Hermes memory graph. – [10][21].

## Open threads
- **Stale routing in ZULU ledger**: 2 of the 7 “OPEN” ROI items remain mis‑routed despite reconciliation runs. – [24].
- **Full SFC parity backend gaps** still block complete testing; missing full‑combo path and tri‑vendor integration need resolution. – [16].
- **WEDM perception engines are wired but not fully integrated** into the dispatcher workflow for India/loop context. – [23].
- **Delta CAD ledger may have undiscovered unfinished work** beyond what is captured in `DELTA-CONTEXT‑LEDGER.md`; periodic full‑read verification required. – [2][4][12].
- **Papa/backend‑helper context‑regain supersedes prior gains**; ensure its updates propagate to the ZULU master ledger. – [17].
