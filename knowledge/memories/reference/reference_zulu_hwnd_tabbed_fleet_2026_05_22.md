---
name: zulu-hwnd-tabbed-fleet-2026-05-22
description: "U-ZM1-05 (slot bravo) — zulu's title-based HWND actuation is architecturally incompatible with the single-WT-window tabbed fleet (EnumWindows sees ONE WT HWND). U-ZM1-05 fixed the title convention + enumerate-once efficiency + an honest diagnostic; SendKeys actuation still needs MS2 (UIA tab-select)."
aliases: reference_zulu_hwnd_tabbed_fleet_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.283Z
---


U-ZM1-05 (2026-05-22, slot bravo, /loop /goal "100% proven full automation
orchestrated by zulu") — investigated and partly closed the zulu burn-in
`hwnd:no-match` item, and found it is a deeper architectural wall than a
title-convention mismatch.

**The decisive empirical finding.** `enumerateWindows()` on the live fleet
returned exactly ONE window matching terminal/PRISM — `pid=15820`,
caption literally `"Windows Terminal"`, `visible=false` — while 13 chats were
claimed. **The whole PRISM fleet runs as TABS of a single Windows Terminal
window.** Win32 `EnumWindows` only ever sees that one WT top-level HWND; only
the *focused* tab's caption is reflected on it. Per-chat title -> HWND
resolution is therefore *physically impossible* for the fleet's actual
topology — this is exactly the degenerate case `resolve-hwnd-by-title.mjs`'s
own header CAVEAT (lines 25-31) warned about. SendKeys-to-HWND needs one HWND
per chat; a tabbed fleet has one HWND total.

**Three failure modes in the zulu log, ONE root cause.** `hwnd:no-match`
(caption not the searched topic), `hwnd:title-missing` (`pick.entry?.topic`
absent — 7 of 13 live slots had an empty `topic`), `hwnd:spawn-signal` (the
sweep spawned PowerShell 13x per sweep — one `resolveHwndByTitle` per slot,
each compiling C# via Add-Type — and an 8s timeout killed some under load).

**U-ZM1-05 — what shipped (3 code files):**
1. `.claude/hooks/rename-window-intercept.mjs` — new pure exported
   `composeSlotTitle(slot, topic)`; the window caption now ALWAYS leads with
   `PRISM <slot>` (the stable, always-present slot identity), topic appended
   when present. The always-match re-assert guard changed `cur.topic` ->
   `cur.slot` so a topicless chat still gets a resolvable caption — that
   absence was the `hwnd:title-missing` root cause. +6 tests (24/24).
2. `scripts/zulu-orchestrator-sweep.mjs` — `enumerateWindows()` is called
   ONCE per sweep (was 13x) -> kills `hwnd:spawn-signal`; per-slot resolution
   is now `matchWindowsByTitle(windowList, \`PRISM ${pick.slot}\`)` on the
   stable slot caption (was `resolveHwndByTitle(pick.entry?.topic)`); a
   `tabbedFleet` flag (>1 chat, <=1 `PRISM `-captioned window) relabels a
   `no-match` as the honest `hwnd:tabbed-fleet-occluded` — so the burn-in log
   tells the operator "architectural, build MS2" not "transient".
3. (resolver lib unchanged — U-ZM1-05 uses its existing `enumerateWindows` +
   `matchWindowsByTitle` exports exactly as the author intended, line 31.)

**What U-ZM1-05 does NOT do — said loud (R12).** It does NOT make SendKeys
actuation land. With one WT HWND, every slot still resolves to
`hwnd:tabbed-fleet-occluded` (smoke-confirmed: all 11 actionable slots). The
fix is the correct *convention* + *efficiency* + *honest diagnostic* — the
strict prerequisite for actuation, not actuation itself.

**ZULU-ORCHESTRATOR-MS2 (scoped, not built — multi-unit, after empirical
UIA probe 2026-05-22).** The fleet topology is:

- ONE `WindowsTerminal.exe` (pid 15820, hwnd 525214).
- 5 UIA TabItems: KILO, LIMA, MIKE, SIERRA, NOVEMBER (UPPERCASE — the
  launcher's `wt new-tab --title <SLOT>` wins; `slot-tab-boot.ps1`'s
  `"PRISM $Slot"` console-title-set does NOT propagate to the tab caption
  unless WT's `suppressApplicationTitle:false` is set).
- 17 `OpenConsole.exe` (ConPTYs) and 15 `claude.exe` — so WT uses SPLIT
  PANES within tabs (multiple ConPTYs per tab). SendKeys to a tab lands in
  its FOCUSED pane only — tab-select alone is insufficient.

MS2 is genuinely THREE units, not one: U-ZM2-01 UIA tab resolver
(case-insensitive Name match, `SelectionItemPattern.Select`); U-ZM2-02 UIA
pane focus (walk UIA subtree, map chat-pid -> pane via UIA `ProcessId`
property, `SetFocus`); U-ZM2-03 ShowWindowAsync+SetForegroundWindow+SendKeys
(WT window is currently `vis=false`, must restore first; foregrounding every
5 min is a UX cost — consider operator-idle gating).

Title convention needs reconciliation: either (a) launcher passes
`--title "PRISM <slot>"` so UIA matches `composeSlotTitle` output, or (b)
resolver matches the bare uppercase slot name. The launcher lives in
`H:/Tools/prism-fleet/` (outside repo) — option (a) is an operator-side fix.

Index-based `wt focus-tab --target N` REJECTED — closed/reordered tab shifts
indices and a wrong tab types /compact into the WRONG chat (silent context
loss, load-bearing safety property).

**No urgency.** The 24h per-slot dry-run grace (from
`optInAt=2026-05-22T20:06:32Z`) forces dry-run until ~2026-05-23 20:06 — no
SendKeys fires regardless. The grace window exists for exactly this triage.

**/goal status.** Zulu's autonomous DECISION loop is 100% proven and live
(scheduled task fires every 5 min, `LastTaskResult=0`). Zulu's autonomous
ACTUATION is blocked by the tabbed-fleet topology -> MS2. "Fully autonomous"
(the task runs with zero operator input) is met; "100% proven full
automation" of the SendKeys last-mile is honestly NOT met until MS2.

**Lesson.** A header CAVEAT that names a degenerate case is a prediction —
verify which case you are actually in *empirically* (`enumerateWindows()` on
the live fleet) before assuming the happy path. The resolver author wrote the
single-WT warning months ago; the fleet drifted into exactly that topology
and nobody re-checked until the burn-in log forced it.

Per-file scrutiny: 2 rounds x 2 reviewers = 4 PASS (P2/P3 only). Smoke:
all 11 slots -> `hwnd:tabbed-fleet-occluded`, 1 PS spawn. rename test 24/24.

Wiki: [[zulu-orchestrator]]. Related: [[reference_zulu_orchestrator_ms1_2026_05_22]],
[[reference_session_continuity_ms0_2026_05_22]], [[reference_zulu_awareness_ms0_2026_05_20]].
