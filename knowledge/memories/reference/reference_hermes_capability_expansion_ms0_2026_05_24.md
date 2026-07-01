---
name: reference-hermes-capability-expansion-ms0-2026-05-24
description: HERMES-CAPABILITY-EXPANSION-MS0 envelope (16 units) + companion deep-research spec shipped 2026-05-24 slot bravo via peer commit 3cca69b796 (golf subject; bravo content; H8 misattribution class). Sister to HERMES-MEMORY-VAULT-MS0 — together 27 units close the Hermes-frontier capability audit.
aliases: reference_hermes_capability_expansion_ms0_2026_05_24
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.604Z
---


# HERMES-CAPABILITY-EXPANSION-MS0 — envelope + research spec (2026-05-24, slot bravo)

Closes the /goal directive: *"find more high leverage tools to improve zulu hermes capabilities and efficiency. do deep research on other functionalities of obsidian, qdrant, and most importantly hermes agents | plan for synergizing with PSN and Prism App"* + user follow-up *"can we start utilizing excel in any way within PSN?"*

Sister MS to [[reference_hermes_memory_vault_ms0_2026_05_23]] (memory layer, 11 units). Together: **27 units** queued that close the Hermes-frontier capability audit across memory + execution + evaluation + Office + Obsidian-plugin + Qdrant-advanced + multi-agent + distribution surfaces.

## What shipped (in HEAD via peer-absorption commit `3cca69b796`)

1. **`mcp-server/data/milestones/HERMES-CAPABILITY-EXPANSION-MS0.json`** — 16-unit milestone envelope (U-HCAP01..16, schemaVersion 1.0.0, `mustHumanVerify:true`). PSN legs 1, 2, 3, 4, 5, 6, 7, 11.
2. **`state/shared/specs/HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md`** — 354-line companion deep-research spec (14 sections).

## The 16 units by capability axis

**Execution/Runtime (P0/P1):**
- U-HCAP01 Tool-use trace replay (Hermes Atlas)
- U-HCAP02 Schema-aware structured output (Zod on every dispatcher return)
- U-HCAP03 Cost telemetry per turn ($/tokens/latency ledger)
- U-HCAP04 Self-correction / thought rewriter

**Evaluation/Learning (P1/P2):**
- U-HCAP05 Eval harness vs Hermes baselines (5 bench actions + weekly cron)
- U-HCAP06 Long-horizon plan tracker (prose → envelope skeleton)
- U-HCAP13 Active learning / slot-soul compiler (HRP05 drafts → diff)

**Excel/Office (P1/P2) — answers the Excel question:**
- U-HCAP07 Read shop tool-library `.xlsx` → tribal-corpus
- U-HCAP08 Write quote output `.xlsx` (QuoteToShip render)
- U-HCAP09 Read customer quote history `.xlsx` → QuoteEstimator priors
- U-HCAP14 Excel add-in (Office.js manifest shell)

**Obsidian Plugin (P1):**
- U-HCAP10 Native PRISM plugin (master-index cards inline + system-viz right-pane)

**Qdrant Advanced (P1):**
- U-HCAP11 Discovery API + SPLADE sparse vectors

**Multi-Agent (P2):**
- U-HCAP12 Council/debate protocol (N-round w/ rebuttal — extends octopus)

**Distribution (P2):**
- U-HCAP15 Federated tribal learning (differential-privacy k-anon)
- U-HCAP16 agentskills.io skill recipe import

## Excel in PSN — 5 leverage points (3 shipped to queue as P1, 1 as P2)

Every JM-Die-class shop runs Excel as their default UI. PSN had zero `.xlsx` read/write path. Now queued:

1. **Read shop tool-library `.xlsx`** — most shops keep tool libs in Excel, NOT in CAM. Doubles tribal corpus on first ingest.
2. **Write quote output `.xlsx`** — customer-facing deliverable; replaces manual retype from JSON.
3. **Read customer quote history `.xlsx`** — huge cold-start win for new PrismApp customers; years of priors instantly available.
4. **Excel add-in (Office.js)** — Excel becomes a PSN client; ribbon → master-index-query + prism_calc + QuoteToShip.
5. **Live BOM mtime-sync** — deferred to follow-up MS.

All ingesters R12 fail-soft on unrecognized layouts; operator-gated promote NEVER silently corrupts tribal/quote priors. Uses `xlsx` npm pkg (zero-native, pure-js, survives portable-node toolchain).

## Sequencing
- P0 (must ship): U-HCAP01, U-HCAP02, U-HCAP03
- P1 (compounds): U-HCAP04, 05, 06, 07, 08, 09, 10, 11
- P2 (extensions): U-HCAP12, 13, 14, 15, 16
- Build order: 01 → 02 → 03 → 07 → 08 → 09 → 05 → 04 → 06 → 11 → 10 → 14 → 12 → 13 → 15 → 16
- Total LOC: ~3.5K across 16 units

## PSN+PrismApp synergy plan (from spec sec 8)

PrismApp surface critical synergies:
- U-HCAP02 (schema-aware output) → UI never has to defensive-render malformed responses
- U-HCAP03 (cost telemetry) → per-customer $/turn billing layer
- U-HCAP05 (eval harness) → hard numbers vs Hermes baselines for marketing
- U-HCAP07/08/09/14 (Excel) → JM-Die-class customers ship .xlsx day 1
- U-HCAP10 (Obsidian plugin) → operator knowledge-base view
- U-HCAP15 (federated tribal) → network effect across customer base

Forward-looking (next MS, not in scope here): PSN-AS-A-SKILL-MARKETPLACE — external Hermes-native agents use PSN as L2, PRISM skills published as recipes, tribal signals aggregate across customers.

## Peer-absorption — [[reference_h8_misattribution_2026_05_20|H8 misattribution]] class (third occurrence this session)

`git commit` from this session ended attached to peer slot `golf`'s commit `3cca69b796` `[HIGH-ROI-AI-PSN-SCOPE]/U-RAG-RERANK-LLM (slot:golf, A7): Stage-3 LLM cross-encoder rerank lib`. The 562-line diff (208 envelope + 354 spec) is 100% mine; the subject is 100% golf's RAG-rerank work.

**Per-session count of [[reference_h8_misattribution_2026_05_20|H8 misattribution]] this slot bravo session:**
1. Commit `def45306e9` (earlier this session, peer charlie subject)
2. Commit `340385c95d` (HERMES-MEMORY-VAULT, peer charlie subject)
3. Commit `3cca69b796` (THIS — peer golf subject)

The pattern is reliable in the shared `H:/prism` main tree during multi-chat fleet operation. Recovery posture remains: content preserved in HEAD, attribution drift accepted, log via memory; never revert (would lose the peer's actual work).

**Mitigation forward:** the slot-worktree migration ([[reference_slot_worktree_activation_2026_05_16]]) was the canonical fix — slot bravo should run from `H:/prism-slot-bravo` on branch `slot/bravo`, not from `H:/prism` on `cad-fusion-live-ms0`. Migrating this slot would prevent further [[reference_h8_misattribution_2026_05_20|H8 misattribution]]. Tracked as a routine /checkin-bravo §2c cutover.

## Cross-refs

- Envelope: `mcp-server/data/milestones/HERMES-CAPABILITY-EXPANSION-MS0.json`
- Spec: `state/shared/specs/HERMES-CAPABILITY-EXPANSION-RESEARCH-2026-05-23.md`
- Sister MS: [[reference_hermes_memory_vault_ms0_2026_05_23]] (memory layer, 11 units)
- Sibling specs (this session): HERMES-PSN-RAG-SYNERGY-RESEARCH-2026-05-23.md (HRP set) + HERMES-OCTOPUS-COORDINATION-RESEARCH-2026-05-23.md (HOC set)
- Peer foxtrot specs: HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17, HERMES-OBSIDIAN-OS-RESEARCH-2026-05-20, HERMES-ADOPTION-PATTERN-MATRIX-2026-05-20
- Peer commit: `3cca69b796` (golf RAG-RERANK-LLM A7)
- Doctrine: [[feedback_psn_definition]] · [[feedback_obsidian_brain]] · [[reference_hermes_zulu_ms0_2026_05_20]] · [[reference_hermes_memory_vault_ms0_2026_05_23]]
- [[reference_h8_misattribution_2026_05_20|H8 misattribution]]: [[reference_h8_misattribution_2026_05_20]] · [[reference_mike_closeout_phases_envelope_fix_2026_05_22]]
