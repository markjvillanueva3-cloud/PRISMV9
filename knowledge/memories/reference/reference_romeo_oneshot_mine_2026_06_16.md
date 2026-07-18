---
name: reference_romeo_oneshot_mine_2026_06_16
description: "ROMEO one-shot campaign (slot:romeo 2026-06-16): Ollama-mined ALL 201 romeo sessions + 137 memories + 12 handoffs (qwen2.5-coder:32b, zero Claude tokens) into a merged 20-item remaining-work punch list mapped to hermes-agents/crons/harnessed-loops. KEY LESSON: mined memories are point-in-time SNAPSHOTS -- verify every surfaced item vs live git/source before treating it as remaining work; 3 of the headline items were already shipped/fixed. Deliverable: state/shared/specs/ROMEO-ONESHOT-CAMPAIGN-2026-06-16.{md,json,html} (commits ab07a1666d + 111a33bae2 on slot/romeo)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.148Z
aliases: reference_romeo_oneshot_mine_2026_06_16
---


**ROMEO one-shot campaign** (slot:romeo, 2026-06-16). Operator: *"use ultracode, ollama offloading to find and read ALL romeo sessions and chats to track down all remaining work you never completed so we can one shot them with hermes agents, crons, harnessed loops."*

## What was done
- **All-local Ollama mine** (`scripts/mine-romeo-ollama.mjs`, model `qwen2.5-coder:32b` on the Blackwell box, **zero Claude tokens**): 12 consolidated handoffs + **137 Obsidian memories** + **7,331 prefiltered transcript-candidate lines** from **201 romeo session transcripts**. Raw: `H:/prism-slot-romeo/.romeo-sources/mined/ROMEO-MINED-RAW.txt` (339 raw ITEM lines).
- **Merged** with the 14 repo-grounded items (`ROMEO-REMAINING-WORK-2026-06-15.json`) -> **`state/shared/specs/ROMEO-ONESHOT-CAMPAIGN-2026-06-16.{md,json,html}`** (20 items, 5 waves A-E, executor-mapped HL/CR/HA/MV). Commits `ab07a1666d` (+miner+spec) + `111a33bae2` (HTML twin) on `slot/romeo`.

## KEY LESSON (the reusable one) -- verify before you headline a mined item
The Ollama-Workflow mine of OLD sessions surfaces **stale** work. Mined memories/handoffs are point-in-time SNAPSHOTS; the work often shipped since. **Before treating a mined item as remaining, grep live source / `git log --grep`.** Three of the surfaced headline items were ALREADY resolved:
1. "Mastercam export query-cap bug" -> **already fixed** (`MastercamToolExportEngine.ts:518` = `?? 100_000`, explicit anti-"5000-tool slice" comment).
2. "hyperMILL 5000-cap bug" -> no `5000` cap found in source (sibling fixed to 100K) -> verify-first, not confirmed.
3. **"U-ROMEO-TRIAGE-HARNESS" (the very harness/cron the operator asked to build) was ALREADY SHIPPED** 2026-06-14 (`86ebbf15f5` + FAILCLOSED `6dce57a237`). `scripts/romeo-wiring-triage.mjs` + live `state/shared/ROMEO-WIRING-QUEUE.md` (19 wireable / 5 cross-domain / 22 WIRE-EXEMPT) -- which `/checkin-romeo /loop` already consumes, ~6 already wired. So the "one-shot" is to **RUN the existing loop**, not build a harness.

The `[[reference_romeo_wiring_triage_harness_2026_06_14]]` memory-recall on PreToolUse:Write is what caught #3 -- the recall surface is load-bearing for the verify-before-headline discipline.

## Mine-noise characterization (R12)
- **`mem-aa` (Obsidian memories) is the real romeo deferred-work record** -- concrete tool-DB/wiring items (GAP B4 SFC cutting data, holder type->brand, measure_summary collision, 4 engine wires).
- **`mem-ad` mined the "Recent work" memory INDEX** and mis-read shipped-work titles as todos (~95% already shipped).
- **`tc-*` transcript batches** were dominated by skill-text ("TodoWrite todo per item", "Follow-up units registered") + cross-slot units (Blackwell routing=alpha, U-WIRE-TURNING=xray, U-DEA-*=delta/echo, U-QP-*=charlie). Transcripts added almost no romeo signal beyond the memories.

## Path-resolution gotcha (the bug that nearly lost the mine)
The 137 memory paths were git-bash `/c/Users/...` form, which Node `fs` **cannot resolve on Windows** -> all 137 silently read as empty + skipped. Fix in `mine-romeo-ollama.mjs`: `toNative = p.replace(/^\/([a-zA-Z])\//, (_,d)=>d.toUpperCase()+":/")` before every `readFileSync`. Sibling of [[feedback_verify_actual_contract_not_proxy]].

## Next action (for the next romeo session)
Wave A is DONE (harness shipped). The genuine NEW highest-leverage item is **1S-03: ts-morph 4-shape audit upgrade** to `scripts/audit-unwired-engines.mjs` (recognize switch/lookup/object/ARRAY-membership dispatch shapes) -> regenerate an accurate `ROMEO-WIRING-QUEUE.md` -> then `/checkin-romeo /loop` the ~13 remaining queue engines. Linked: [[reference_romeo_wiring_triage_harness_2026_06_14]], [[feedback_romeo_commit_to_slot_branch]], [[feedback_ultimate_destination_check]].
