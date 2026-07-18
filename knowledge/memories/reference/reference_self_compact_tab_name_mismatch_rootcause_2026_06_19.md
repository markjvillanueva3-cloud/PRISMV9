---
name: reference_self_compact_tab_name_mismatch_rootcause_2026_06_19
description: "SHIPPED (cb690f9bda) ROOT CAUSE of fleet self-compaction + self-startup not actuating: the live WT tabs are named by the slot's SINGLE FIRST LETTER (a,b,...,z -- operators pin 1-char tab titles; a manual WT rename overrides the app-set 'PRISM <slot>' title), but focusWtTabBySlot (wt-tab-focus.mjs) matched only <slot> / PRISM <slot> / <slot> | <tag> -> no-tab -> SendKeys never fired. FIX: add a 4th anchored single-first-letter match tier (NATO first letters are unique). Retroactive (no relaunch). CORRECTS the earlier WRONG assumption in this same memory that the tabs were named `alpha | token-opt`."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.152Z
aliases: reference_self_compact_tab_name_mismatch_rootcause_2026_06_19
---


# Self-compaction + self-startup blocked by a tab-name convention mismatch -- SHIPPED (2026-06-19, slot:alpha)

Operator: "fix the self compaction, auto startup feature so the fleet can make self compactions and self startup after compaction."

## Verified facts (LIVE, not assumed)
1. **Both actuators are BUILT.** `scripts/self-compact.mjs` (SendKeys /compact into own window) + `scripts/self-startup.mjs` (SELF-STARTUP-MS0; SendKeys `/startup-<slot> /loop /goal` after a confirmed /compact, stall+loop-active gated; self-compact spawns the watcher). Neither was missing. [[reference_self_startup_ms0_2026_06_17]]
2. **The SOLE blocker was tab resolution.** Both call the SAFE tiered resolver whose Tier-1 is `focusWtTabBySlot(slot)` (`scripts/lib/wt-tab-focus.mjs`). It returned `no-tab`, so the actuator refused to SendKeys (correct fail-safe -- a wrong tab = context loss).
3. **The REAL root cause (live-enumerated, CORRECTS an earlier wrong guess):** the live WT tabs are named by the slot's **SINGLE FIRST LETTER** -- enumerating the UIA TabItem names on this box returned `a b g i o p r s x z` (= alpha bravo golf india oscar papa romeo sierra xray zulu, the 10 live slots). Operators pin 1-char tab titles so all 26 NATO tabs fit the tab bar; a manual WT tab rename OVERRIDES the app-set `PRISM <slot>` title (slot-tab-boot.ps1:451 sets `PRISM $Slot`, rename-window-intercept sets `PRISM <slot>` -- both overridden). The resolver matched only `<slot>` / `PRISM <slot>` / `<slot> | <tag>` (regenerate-launch-fleet's convention), NONE of which is `a` -> `no-tab`. **My first pass in THIS memory WRONGLY assumed the tabs were `alpha | token-opt` (regenerate-launch-fleet.mjs:107 tabTitleFor) -- that launcher is NOT what produced the live tabs. Always ENUMERATE the live UIA names; never assume the launcher convention is what's on screen.**
4. **Retroactive-rename-from-a-process is IMPOSSIBLE (tested live):** a tool subprocess set its OWN console title yet `focusWtTabBySlot` still saw the operator-pinned tab name -- harness subprocesses run in an isolated ConPTY, NOT the visible WT tab. So no hook/tool can rename the live tab; the fix MUST live in the resolver.

## THE FIX (SHIPPED cb690f9bda) -- resolver-side single-letter tier, retroactive
Added a 4th ANCHORED match tier to `wt-tab-focus.mjs`: the slot's single first letter, in BOTH the live PowerShell `FOCUS_PS` match AND a new pure exported JS mirror `tabNameMatchesSlot` (hermetically testable; KEEP-IN-SYNC comment on both):
```
PS:  $slotInit = $slotLow.Substring(0,1)
     if ($nl -eq $slotLow -or $nl -eq $prismName -or $firstTok -eq $slotLow -or $nl -eq $slotInit) { ... }
JS:  const slotInit = slotLow[0];
     return nl === slotLow || nl === prismName || firstTok === slotLow || nl === slotInit;
```
- **Retroactive:** the already-running fleet's tabs are ALL single-letter -> resolvable with NO relaunch.
- **Safe:** anchored EXACT equality (NOT substring) -- `betalpha`/`xalpha`/`ab`/`al` never match; NATO first letters are UNIQUE (alpha->a ... zulu->z, 26/26), so `a`<->alpha is unambiguous; the `ambiguous-tab` uniqueness refusal backstops any collision. Purely additive OR-clause; the 3 pre-existing tiers (bare, `PRISM <slot>`, `<slot> | <tag>` first-token -- the last also added this session) are preserved.
- Also matched the `<slot> | <tag>` first-token (regenerate-launch-fleet convention) for multi-launcher robustness.

## PROOF (live, this box)
- `focusWtTabBySlot('alpha')` -> `{ok:true, tabName:'a', hwnd:657790, paneCount:1}` (was `no-tab`).
- `self-compact.mjs --session-id claude-5915c20a --dry-run` -> `action:dry-run`, slot alpha, `wouldSend:/compact` to hwnd 657790 / tab 'a' (was `action:fallback`).
- `self-startup.mjs --session-id <uuid> --dry-run --loop-active` -> resolves slot alpha; stall-gate `action:skip` ("chat is accumulating tokens -- never interrupt") = correct while working.
- Tests `wt-tab-focus.test.mjs` 36/36 (+8 new `tabNameMatchesSlot`: bare/PRISM/pipe/single-letter accepts + adversarial rejects incl `tabNameMatchesSlot("zebra | alpha","alpha")===false`). Scrutiny 3-of-3 PASS (reviewer A + reviewer B + code-analyzer C), 0 findings.

## Follow-up SHIPPED (939f98a2f2, U-SELF-RESOLVE-ENV-FALLBACK, same session)
self-compact + self-startup `main()` resolved the slot from the `--session-id` CLI arg only; a bare/cron/`--dry-run` invocation without the arg hit "could not resolve this chat's slot". FIXED: new pure exported `resolveSessionId(argVal, envVal, {canonical})` (in `self-compact.mjs`) falls back to the harness `CLAUDE_CODE_SESSION_ID` env. **The two actuators need DIFFERENT forms** (the crux scrutiny verified): self-compact uses `{canonical:true}` -> SHORT `claude-<8hex>` (slot-resolution + handoff terminal key want the stored chatId form; `ledgerSessionId` stays the FULL UUID, read separately for U-SELFCOMPACT-CONFIRM transcript correlation); self-startup uses NO canonical -> FULL UUID verbatim, because `statSlotTranscript` (fleet-wake-sequencer.mjs:280-292) shared-tree fallback needs the `<id>.jsonl` filename (a short form would silently mis-stat -> mis-classify stall). Arg-present path returns verbatim -> skill (short) + watcher (full) byte-identical. PROVEN live: bare `self-compact --dry-run` + `self-startup --dry-run` (no arg) now resolve slot alpha (were fallback). Tests self-compact 36/0 (+8) + self-startup 29/0; per-file 2-arm PASS (reviewer + code-analyzer, 0 findings). Pre-existing degenerate case (NOT introduced): if this chat's slot is entirely absent from chat-slots.json the lenient substring tier could match a peer -- identical to the prior full-UUID arg path, unchanged by this fix.

Related: [[reference_self_compact_and_wt_actuation_dormant_2026_06_13]] (predicted "a fleet-launcher config gap, not a code bug" -- now pinned to the EXACT cause: operator-pinned single-letter tabs) · [[reference_self_startup_ms0_2026_06_17]] · [[feedback_never_assume_data_file_contents]] (the enumerate-don't-assume lesson this re-proved).
