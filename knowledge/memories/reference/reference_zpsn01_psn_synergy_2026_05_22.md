---
name: reference_zpsn01_psn_synergy_2026_05_22
description: "U-ZPSN01 (2026-05-22..23 slot bravo) — closed the zulu↔PSN deep-reasoning synergy gap; awareness fingerprint now flows from zulu-awareness-pipeline → composeSendKeysText → SendKeys directive as `[psn:...]` metadata tag"
aliases: reference_zpsn01_psn_synergy_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.076Z
---


# U-ZPSN01 — zulu↔PSN synergy gap closed

2026-05-23 slot bravo (`/checkin-bravo /loop /goal "assess zulu's synergy with PSN"`). Shipped in commit `8c96ebb8b4` (peer-absorbed into NODE-MEM-POINTER — same shared-tree git-add race pattern as `[[reference_h8_misattribution_2026_05_20]]`; work is in history, attribution drifted).

## What was wrong

`zulu-awareness-pipeline.mjs` (ZULU-AWARENESS-MS1, 2026-05-20) already computed an 11-surface fingerprint per slot: domains, hermesRole, queue depth, tribal-domain scoring, viz neighborhood, success rate, refuse list. The zulu-orchestrator-sweep already read the fingerprint via `awarenessLookupSlot(pick.slot)` AND fed `slotQueueLength` into the decision flow.

But `composeSendKeysText(decision, slotPick.slot)` was called at `scripts/lib/zulu-orchestrator-lib.mjs:220` **without opts** — the fingerprint reached the JSONL log and the queueLength decision field, then DROPPED. The SendKeys directive that landed in every target chat was the static line:

```
/checkin-<slot> priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK*|backend-dev FIRST
```

— same line for every slot, no slot-soul awareness, no domain context, no tribal frame. The pipeline did the deep-reasoning, the actuator didn't use it.

## What U-ZPSN01 did

3 source files + 2 test files + wiki:

1. **`scripts/lib/zulu-bd-priority.mjs`** — added pure `buildAwarenessHint(fp)` synthesising `[psn:domain=<d>,role=<r>,queue=<n>,tribal=<top>]`. Sanitiser strips every char outside `[a-z0-9+\-_]`. R12 fail-soft: missing/empty/non-object fp → `""` → pre-MS3 directive verbatim.
2. **`scripts/lib/zulu-orchestrator-lib.mjs`** — `planSlotAction` accepts `slotAwareness`; synthesises `psnHint` once per slot; forwards via `composeSendKeysText(decision, slot, { extraHint: psnHint })`. Backward-compat: omitted = no hint.
3. **`scripts/zulu-orchestrator-sweep.mjs`** — passes `slotAwareness: fp` (the fingerprint already read for `slotQueueLength`) into `planSlotAction`.
4. **Tests** — 13 cases for `buildAwarenessHint` (null/empty/partial/full/sanitisation/composition) + 3 for `planSlotAction` integration (forward, omitted, null fail-soft). Full zulu regression: 268/268 pass.
5. **Wiki** — appended ZULU-ORCHESTRATOR-MS3 section to [[zulu-orchestrator]] with empirical proof + MS3 follow-ups.

## Empirical proof (smoke 2026-05-23T01:30:54Z, slot bravo)

```json
"planLines": [
  "/precompact",
  "/compact",
  "/checkin-bravo priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK*|backend-dev FIRST [psn:domain=mill,role=specialist-mill,queue=365,tribal=mill]"
]
```

A bravo chat woken on this line starts knowing it's `specialist-mill`, mill-domain, has 365 queued units, deepest tribal evidence is mill.

## Why the SendKeys text format

The directive is typed verbatim into the target PowerShell window and parsed as a Claude slash-command. Free text in the tail is accepted (verified by U-ZULU05's existing priority-filter suffix). Bracketed `[psn:...]` is parser-safe (no quotes, no slashes, no whitespace inside) and obviously distinct from the priority-filter glob text. Anything richer (engine recommendations, multi-line YAML) would either need a hook on the receiving side (out of scope) or break the slash parser.

## Follow-ups (in scope for MS3, recorded in wiki)

- **U-ZPSN02 — Populate awareness fingerprints for all 26 slots.** Today only 3 slots (bravo/golf/zulu) have fingerprints in `state/shared/zulu-awareness-index.json`. The composition logic exists in `zulu-awareness-pipeline.buildCapabilityFingerprint` — what's missing is the cron that derives one per slot from `knowledge/wiki/slot-souls/*.md` + recent commit scopes + tribal-embed-index. Until then 23/26 slots get the unchanged static directive.
- **U-ZPSN03 — Target-side parser for `[psn:...]`.** A pre-prompt hook on the chat side extracting the tag and surfacing a one-line slot capability brief before any other context injection.

## Cross-refs

- [[zulu-orchestrator]] — full architecture; MS0/MS1/MS2 sections precede this.
- [[reference_zulu_awareness_ms0_2026_05_20]] — original 11-surface pipeline.
- [[reference_zulu_hwnd_tabbed_fleet_2026_05_22]] — MS2 actuator architectural finding (unblocked the same /goal).
- [[reference_h8_misattribution_2026_05_20]] — recurring peer-absorption commit pattern this work also hit.
- [[feedback_prioritize_devtools_backend]] / [[feedback_high_roi_backend_first_slot_queue]] — standing doctrine encoded in U-ZULU05's static prefix list, preserved here.

## Synergy contract — proof of `/goal`

The /goal asked: "assess zulu's synergy with PSN — it needs full utilization, deep reasoning, deep logic and optimal usage of the full system to guide each chat properly." Status:

- ✅ Assessed: precise gap identified (line 220 of orchestrator-lib drops the fingerprint).
- ✅ Implemented: U-ZPSN01 pure helper + planSlotAction wiring + sweep forwarding.
- ✅ Tested: 268/268 zulu-suite green, 16 new tests.
- ✅ Proven end-to-end: bravo's actual SendKeys line carries `[psn:domain=mill,role=specialist-mill,queue=365,tribal=mill]`.
- ⚠ Fleet coverage: 1/26 slots benefit today (awareness-index incomplete — U-ZPSN02 follow-up).

The /goal's second arm ("prove autonomous orchestration of all current chats") is gated by the existing 24h opt-in grace + the indexed-fingerprint precondition. The mechanism is wired; the data is what's gating fleet-wide value.
