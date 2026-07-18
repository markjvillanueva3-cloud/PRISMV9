---
title: Self-compact actuates when the WT tab has no slot-name (single-tab owning-pid fallthrough + live-pid re-resolution)
kind: learning
domain: dev-infra
unit: SELF-COMPACT-MS0/U-SELFCOMPACT-SINGLETAB
slot: charlie
date: 2026-06-24
commit: 832eccf5db
tags: [self-compact, wt-tab-focus, uia, owning-pid, R7, R9, R12, safety]
---

# Self-compact actuates when the WT tab has no slot-name

Operator: "fix whatever is causing you to not auto-compact either by self invocation or hitting the 1m limit."

## The three-layer root cause (all verified LIVE, R12)

Self-compact (`scripts/self-compact.mjs`) SendKeys `/compact` into THIS chat's terminal.
It kept falling back to "ask the operator to type /compact" for three stacked reasons:

1. **`no-tab` hard-stop.** `resolveOwnWindow` Tier-1 (`focusWtTabBySlot`) returns `no-tab`
   when the live WT tab is not named after the slot. The guard
   `if (!UIA_FALLTHROUGH_ERRORS.has(uia.error)) return null` treats `no-tab`/`ambiguous-tab`
   as a HARD STOP -> the owning-pid tier (Tier-3) is NEVER reached. The 2026-06-19
   single-letter tier ([[self-compact-tab-name-mismatch-rootcause]]) only helps when the
   tab IS named `<first-letter>`; a tab with NO slot-matching name still dead-ends.
2. **Stale owning-pid.** The recorded `chat-slots.terminalWindowId` (`tw-pa-<pid>`) pid
   RECYCLES after a `/clear` or host respawn. Verified live: the recorded `tw-pa-62940`
   was DEAD; the live chat pid (34908) was also a prior generation. So even reaching
   Tier-3 would resolve a dead pid.
3. **Some chats have NO terminal at all.** The chat that surfaced this is launched
   directly from `explorer.exe` (`claude.exe` under explorer, no PowerShell/WT ancestor
   in 8 hops) -- a Claude Desktop window, not a WT tab. NO tier can actuate it; the
   correct behavior is the fallback, with native autocompact (~95%) as the backstop.

## The fix (two safe additions; R7 -- pick the safe path, never blend)

The danger the old hard-stop guarded against is real: the owning-window pid resolves the
WHOLE WT window, and a WT window hosts many tabs -> SendKeys to the window hwnd lands in
whatever tab is CURRENTLY FOCUSED, not necessarily this chat's. Blindly falling through
`no-tab` -> owning-pid would re-introduce the wrong-chat context-loss hazard.

**(A) Single-tab-verified fallthrough (Tier-1.5).** On `no-tab`/`ambiguous-tab` WITH a
live owning-pid, use it IFF `countWtWindowTabs(pid)` proves the WT window hosts EXACTLY
ONE tab -- then the focused tab IS this chat's tab, unambiguously. Multi-tab -> refuse.
`pane-count`/`ok-bad-pane-count:*` (a name-MATCHED tab that is multi-PANE -- a different
hazard) is EXCLUDED and keeps the hard-stop. `countWtWindowTabs` (new, in
`wt-tab-focus.mjs`) reuses the existing UIA TabItem machinery: resolve the pid's
`MainWindowHandle` (= the WT window under Windows Terminal), count `TabItem` descendants.

**(B) Live-pid re-resolution.** `resolveLiveOwningPid(entry)` walks the chat's LIVE
process ancestry from `entry.pid` via the proven `findPsAncestorPid` to the current shell
host pid, instead of trusting the recycling-prone recorded `terminalWindowId`.
`resolveOwningPidForChat` prefers the live pid, falls back to the recorded one, both gated
on `isAlive` -- never returns a dead pid. Returns null for non-terminal (explorer-launched)
chats -- the correct outcome (they fall back; native autocompact is their backstop).

## The decisive scrutiny catch (arm A P3 -- R9 contract-mock hazard)

The PS layer emits `FAIL ambiguous-tab <count>`, so `parseFocusOutput` yields
`uia.error === "ambiguous-tab 2"` (WITH the count), NOT the bare token. The first cut
gated on `new Set(["no-tab","ambiguous-tab"]).has(uia.error)` -> would NEVER match the
real `"ambiguous-tab 2"` envelope -> the ambiguous-tab rescue was DEAD. And the test
mocked the bare `"ambiguous-tab"` string -> a false-green against a shape production never
emits (the EXACT `{type,text}`-envelope-class lesson from
[[quote-compat-anon-margin-redaction]] -- mock the PRODUCTION wire, not the convenient
bare shape). FIX: `isSingleTabFallthroughError(uiaError)` matches `no-tab` exactly +
`ambiguous-tab` by PREFIX; the test uses the real `"ambiguous-tab 2"` envelope.

## Validation
- `scripts/self-compact.test.mjs` 49/49 (14 new: Tier-1.5 singletab/multitab-refuse/
  ambiguous-real-envelope/pane-count-hardstop/no-owning-pid + resolveOwningPidForChat
  live-preferred/dead-fallback/both-dead + resolveLiveOwningPid + isSingleTabFallthroughError).
- `scripts/lib/wt-tab-focus.test.mjs` 47/47 (12 new: parseCountTabsOutput happy/multi/
  zero-tabs/bad-shapes + countWtWindowTabs platform/pid/spawn-failsoft/disabled).
- All 4 files pure ASCII; existing safety tests (ambiguous/pane-count refusal) preserved.
- 2-arm per-file scrutiny PASS (code-analyzer + reviewer), P3 fixed; 3-of-3 PASS.

## Lessons
1. **A symptom that recurs after a fix has a DIFFERENT mechanism.** The 2026-06-19
   single-letter tier fixed named tabs; this fixes UNnamed-tab + stale-pid + no-terminal.
   Enumerate ALL re-trigger paths (sibling of [[reference_papa_rebind_resolver_cron_fix_2026_06_18]]).
2. **A multi-tab owning window must NEVER be trusted for SendKeys.** Gate the owning-pid
   fallthrough on a VERIFIED single-tab window count; refuse otherwise.
3. **Match the REAL PS envelope, not the bare token.** `FAIL ambiguous-tab <count>` ->
   the parsed error carries the count; a `Set.has(bare)` silently never fires. Mock the
   production wire (R9), or the test is a false-green.
4. **For a genuinely-unresolvable chat (no shell ancestor), the fallback is CORRECT** --
   native autocompact at ~95% is the backstop; do not force-actuate a desktop window.

## See also
- [[self-compact-tab-name-mismatch-rootcause]] -- the 2026-06-19 single-letter tier (named tabs)
- [[reference_self_compact_loop_race_2026_06_19]] -- action:sent != context reset (a separate race)
- [[quote-compat-anon-margin-redaction]] -- the same mock-the-production-wire (R9) lesson
- [[reference_charlie_self_compact_singletab_2026_06_24]] (memory)
