---
name: reference_zpsn02_souls_filled_2026_05_23
description: "U-ZPSN02 (2026-05-23 slot bravo iter1) — 24 missing slot-souls authored; zulu-awareness-index slotCount 3→27; composeSendKeysText emits [psn:...] for all 27 slots end-to-end; closed-loop value still gated on U-ZPSN03 target-side parser"
aliases: reference_zpsn02_souls_filled_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.077Z
---


# U-ZPSN02 — slot-soul population (24 → 27 souls)

2026-05-23 slot bravo iter 1 of `/goal [ complete remaining zulu units | assess zulu↔CC-CLI+PSN ] /loop`. Closes the immediate U-ZPSN01 follow-up named at [[reference_zpsn01_psn_synergy_2026_05_22]].

## What was wrong

`zulu-awareness-pipeline.buildCapabilityFingerprint` was correct + tested. `zulu-orchestrator-lib.composeSendKeysText` + `buildAwarenessHint` were correct + tested (U-ZPSN01 shipped 2026-05-23). But the **input** was missing: `state/shared/slot-souls/` carried only 3 `.md` files (`bravo.md`, `golf.md`, `zulu.md`) so the pipeline's `for (const slot of SLOT_NAMES) { const soul = readSoul(slot); if (!soul) continue; }` loop skipped 24 of 27 slots silently. Net effect: `zulu-awareness-index.json` `slotCount=3`, 24/27 slots got the unchanged static SendKeys directive, U-ZPSN01's PSN tag only ever fired for `bravo`.

## Path-doc fix

The wiki entry's "What's left for MS3" §U-ZPSN02 named the souls dir as `knowledge/wiki/slot-souls/*.md`. Wrong. `SOULS_DIR` in `scripts/zulu-awareness-run.mjs:31` is `state/shared/slot-souls/`. The `knowledge/wiki/` path does not exist. U-ZPSN02 closeout corrected the wiki sticky-note inline.

## What U-ZPSN02 did

24 new YAML+markdown files matching the shape of the 3 existing souls. Frontmatter `slot/role/voice/tone/escalation_path/[refuse_list]/preferred_subagent_type/domain_filter/hermes_role` + body `## Voice` + `## Behavior` + optional `## Refuses` + `## When in doubt`. Two conventions:

- 11 domain-assigned slots from CLAUDE.md §[[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0: alpha=mill, charlie=wire-EDM, delta=cad, echo=cam, foxtrot=tribal+machining-knowhow, hotel=erp+hr, india=post-processor+master-post, juliett=speed-feed, kilo=print-to-program, lima=prism-academy, mike=misc.
- 13 post-[[reference_slot_reclaim_2026_05_19|SLOT-RECLAIM]] (2026-05-19) expansion slots — november, oscar, papa, quebec, romeo, sierra, tango, uniform, victor, whiskey, xray, yankee, zulu — generic `domain_filter: any` work souls, available for future domain assignment.

## R7 conflict surfaced (alpha↔bravo mill-domain)

CLAUDE.md §JULIETT names `alpha=mill`. Pre-existing `bravo.md` already claimed `mill-specialist` (used by 365 in-flight items + 295 tribal-mill hits). Per R7 (surface conflicts, don't average), `alpha.md` body carries explicit `## Shared-domain note` with routing precedence: alpha when both idle (canonical), bravo when already owns related in-flight work (cluster locality). The CLAUDE.md JULIETT mapping says bravo=lathe but the existing soul + queue state contradicts; preserving in-flight reality > silent demotion.

## Empirical proof

After `node scripts/zulu-awareness-run.mjs --json` (2026-05-23T04:08:29Z):

- `slotCount`: 3 → **27**
- `composeSendKeysText({action:'compact'}, slot, {extraHint: buildAwarenessHint(fp)})` emits `[psn:...]` for **27/27** slots (6 spot-checked end-to-end with `process.exit(fail)` = 0):
  - echo: `[psn:domain=cam,role=specialist-cam,queue=196,tribal=cam]`
  - oscar: `[psn:domain=any,role=work,queue=0]` (generic, no tribal field — fail-soft as designed)
  - charlie: `[psn:domain=wedm,role=specialist-wire-edm,queue=123,tribal=wedm]`
  - juliett: `[psn:domain=speed-feed,role=specialist-speed-feed,queue=87]` (no `tribal=` — domain not in tribal-embed-index)
  - alpha: `[psn:domain=mill,role=specialist-mill,queue=80,tribal=mill]`
  - foxtrot: `[psn:domain=tribal,role=specialist-tribal,queue=27]`

## Arm-2 assessment — zulu ↔ Claude Code CLI + PSN

**Zulu → CC-CLI bridge:** composeSendKeysText emits 3-line payload `/precompact` + `/compact|/clear` + `/checkin-<slot> ...` typed verbatim into the target PowerShell window. HWND resolved by terminal-window-id ([[reference_twid_resolver_cache_2026_05_15]]). Trailing free-text slot in `/checkin-<slot>` carries the priority filter + PSN tag.

**Zulu → PSN bridge:** `buildCapabilityFingerprint` reads 11 PSN substrates (CLAUDE-BRIEF, PRISM-BUILD-CONTEXT, PRISM-BUILD-VISION, system-graph, tribal-embed-index, prismSelfAwarenessEngine, memories, wiki, slot-souls, verdict ledger, slot-task-claims). U-ZPSN01 packed 4 of them (domain / role / queueLength / top-tribal) into the SendKeys `[psn:...]` tag; remaining 7 stay in the JSONL + index for downstream consumers.

**Gap (the SECOND arm of the /goal — "assess synchronization"):** The `[psn:...]` tag is SENT but **no target-side consumer parses it yet**. A chat resuming on the directive sees the tag as inline prompt text, not structured data. Closed-loop value (chat reads its own PSN frame before injecting any hook context → biases agent selection / pickup order) is gated on **U-ZPSN03** — a pre-prompt parser hook. Wiring on zulu side is correct + tested + fleet-wide; intelligence loop closes when U-ZPSN03 ships.

## Doc reflection

- Wiki: `knowledge/wiki/architecture/zulu-orchestrator.md` — appended `## U-ZPSN02 — Slot-soul population` section (lines 451+), corrected the stale `knowledge/wiki/slot-souls/` path reference in the prior MS3 "What's left" sticky-note.
- CLAUDE.md: bravo cannot edit ([[feedback_golf_owns_reaper|golf-slot]]-edit-only). The `state/shared/RECENT-SHIPMENTS-2026-05-23.md` inbox is the proper drop for golf to drain next weekly batch.

## Cross-refs

- [[reference_zpsn01_psn_synergy_2026_05_22]] — U-ZPSN01 ship that this builds on.
- [[reference_zulu_awareness_ms0_2026_05_20]] — original 11-surface awareness pipeline.
- [[reference_hermes_zulu_ms0_2026_05_20]] — slot-soul concept introduction.
- [[feedback_conflict_fork_rule]] — R7 doctrine the alpha↔bravo overlap surfacing follows.
- [[feedback_psn_definition]] — PSN's 11 legs that the fingerprint aggregates.

## Synergy contract — /goal proof

`/goal [ complete remaining zulu units | assess zulu↔CC-CLI+PSN ]`:

- ✅ Arm 1 (complete remaining zulu units): U-ZPSN02 shipped; awareness slotCount 3→27; fleet-wide PSN-tag actuation proven for 6 spot-checked slots.
- ✅ Arm 2 (assess synchronization): both bridges named, gap identified (U-ZPSN03 target-side parser), assessment lives in wiki §Arm-2 + this memory.
- ⚠ Closed-loop intelligence value gated on U-ZPSN03 — wiring complete, consumer pending.

## R10 checkpoint at iter 1 boundary

State: 24 souls written + index regenerated + 6-slot smoke green + wiki appended + memory written. Pending in /loop: commit the diff, then iter 2 picks U-ZPSN03 (target-side parser hook) or U-ZM2-04 (pid-liveness gate in pickActionableSlots — independent, parallelisable).
