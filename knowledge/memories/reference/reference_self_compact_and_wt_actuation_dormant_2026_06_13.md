---
name: reference_self_compact_and_wt_actuation_dormant_2026_06_13
description: "SELF-COMPACT-MS0 (slot:alpha 2026-06-13): model-invokable self-compaction shipped (scripts/self-compact.mjs + /self-compact). It REUSES zulu's proven tiered window resolver (focusWtTabBySlot UIA -> matchWindowsByTitle -> stable owning-window pid; NEVER the transient slot.pid). R12 self-correction: an earlier draft FALSELY claimed zulu resolves from dead entry.pid -- the real (verified) mechanism is UIA tab-focus by slot. Actuation requires WT tabs named 'PRISM <slot>'."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.151Z
aliases: reference_self_compact_and_wt_actuation_dormant_2026_06_13
---


2026-06-13 slot:alpha. Built `scripts/self-compact.mjs` (+ `self-compact.test.mjs` 24/24, `/self-compact` skill, [[feedback_model_self_triggers_compact]]) per the operator's "kick off /compact yourself if possible" directive.

## The send mechanism (verified by reading the live send site)
`/compact` has no programmatic trigger API; the only model-reachable actuation is SendKeys typing `/compact` into the chat's terminal window. That needs a Win32 HWND attributed to THIS chat. The PROVEN resolver is in `scripts/zulu-orchestrator-sweep.mjs:435-455` (NOT pid-based):
1. **Tier 1 -- `focusWtTabBySlot(slot)`** (`scripts/lib/wt-tab-focus.mjs`): UIA focuses the Windows-Terminal tab whose UIA Name matches the slot (bare or `PRISM <slot>`), verified single-pane. **This is WT-tab-AWARE -- it works on `tw-wt` tabs** (the modern fleet norm). Returns `{ok,hwnd,tabName,paneCount}` or a precise error (`no-wt-process`/`no-tab`/`ambiguous-tab`/`ok-bad-pane-count`).
2. **Tier 2 -- `matchWindowsByTitle(enumerateWindows(), "PRISM <slot>")`** (`scripts/lib/resolve-hwnd-by-title.mjs`): legacy separate-window terminals; only reached when WT is absent (`no-wt-process`).
3. **Tier 3 -- stable owning-window pid** (`terminalWindowId` tier `tw-ps`/`tw-pa`, alive-guarded): dedicated-window terminals without a "PRISM <slot>" title.

**Never `chat-slots.json[slot].pid`** -- that is the transient pid of the node subprocess that ran `claim` (chat-slots.mjs:504), dead seconds later; resolving an hwnd from it is wrong AND unsafe (a recycled pid -> SendKeys into a STRANGER's window).

## R12 SELF-CORRECTION (capture the lesson)
An earlier in-session draft of this memory + the CLAUDE.md regression entry claimed: *"zulu-orchestrator-sweep resolves its SendKeys hwnd from the same dead entry.pid (zulu-orchestrator-lib.mjs:71) -> silent no-op on a WT fleet."* **This was FALSE** -- asserted from a `grep` of `zulu-orchestrator-lib.mjs` (where `entry.pid` is opt-in GATING) WITHOUT reading the actual send site in `zulu-orchestrator-sweep.mjs` (which uses UIA `focusWtTabBySlot`). The 3-of-3 scrutiny arm A caught it. Corrected to the verified UIA mechanism above. **Lesson: read the LIVE send/call site before asserting a resolution mechanism; never cite a file:line you have not opened (HONESTY RULES).**

## self-compact design (final)
`resolveOwnWindow(slot, entry, deps)` is the SAME tiered resolver, every external call injected for tests:
- UIA ok -> send (works on properly-named WT tabs).
- UIA reports WT-present-but-not-uniquely-targetable (`ambiguous-tab`/multi-pane/`no-tab`) -> **REFUSE to guess** -> fallback (the safety property; lower tiers NOT consulted).
- UIA `no-wt-process` -> title-match -> owning-pid -> else fallback.
Always writes a quality live-chat handoff first; logs to `state/shared/dashboards/self-compact-log.jsonl`. Fail-soft everywhere; honest `action:"fallback" ok:false` on every non-send path (no fake success).

## LIVE validation on this session (R12 honest)
Dry-run on the alpha session: the UIA tier RAN and returned `UIA:no-tab` -- this chat's WT tab is **not named "PRISM alpha"**, so it correctly refused to guess and fell back. So **actuation requires the "PRISM <slot>" tab-naming convention** that zulu also depends on (a fleet-launcher config gap, NOT a self-compact bug). Tier-1 success is proven by injected-dep test (UIA ok -> hwnd 111, tier "uia"); the live run proves the UIA query executes end-to-end. On a fleet whose tabs ARE named "PRISM <slot>", self-compact sends for real.

## Follow-ups (not in this unit)
- Fleet-launcher should name WT tabs "PRISM <slot>" so both zulu pressure-compaction AND self-compact can actuate (owner: zulu/launcher).
- Side bug: `resolveHwndFromPid` default 4000ms timeout SIGTERMs ("spawn-signal") under nested-shell load; fine from a direct hook call. Latent nit in the shared pid resolver.

Related: [[feedback_model_self_triggers_compact]] · [[reference_harness_hang_prevention]] (the Cygwin fork-storm that SIGTERM'd a validation run here).
