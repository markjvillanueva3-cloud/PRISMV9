---
name: zebra-orchestrator
description: ZEBRA-ORCHESTRATOR-MS0 — chat-fleet orchestrator that auto-fires /compact and /checkin-<slot> directives into opt-in chat windows via UI-Automation SendKeys
type: architecture
status: shipped
---

# ZEBRA-ORCHESTRATOR-MS0 — chat-fleet orchestrator

The 26-slot NATO chat fleet exposed two structural gaps before zebra:

1. **Hook ceiling.** A UserPromptSubmit/Stop/SessionStart hook can INJECT context and BLOCK a tool call but cannot INVOKE a slash command (slash commands are user-input-only in Claude Code). So when a chat hits 95% context, the auto-compact env var (`CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`) is the only way `/compact` actually fires — and nothing auto-fires `/checkin-<slot>` afterward to restore the chat's working context.

2. **Drift-prevention gap.** A chat whose `/loop` stalled mid-iteration, or whose recent commit history wandered off its advertised topic, had no external observer that could re-anchor it.

Zebra closes both via an **external actuator**: a Windows scheduled task running every 5 min that walks the opt-in chat slots, classifies pressure + drift, resolves the target window's HWND, and synthesizes the right slash directive directly into the target PowerShell window via UI Automation SendInput.

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │  scheduled task: PRISM Zebra Orchestrator   │
                    │  install-zebra-orchestrator-task.ps1        │
                    │  (S4U / 5-min poll + AtStartup / +420s ph.) │
                    └────────────────────┬────────────────────────┘
                                         │ invokes
                                         ▼
                ┌─────────────────────────────────────────────────┐
                │      scripts/zebra-orchestrator-sweep.mjs       │
                │      (CLI shell — I/O + spawn)                  │
                └───┬───────┬────────┬─────────┬────────┬─────────┘
                    │       │        │         │        │
            reads   │  reads│  reads │ resolves│  spawns│
                    ▼       ▼        ▼         ▼        ▼
                chat-    CHO02   CHO01    U-ZEBRA01  send-keys-to-
                slots.  pressure decision HWND      window.ps1
                json             (clear/  resolver  (U-CHO04)
                                 compact/
                                 noop)
                                              │
                                              │ each line:
                                              ▼
                            ┌──────────────────────────────────┐
                            │ buildCheckinPayload (U-ZEBRA05)  │
                            │   "/checkin-<slot> priority      │
                            │    filter U-WIRE*|U-BRIDGE*|...  │
                            │    backend-dev FIRST"            │
                            └──────────────────────────────────┘
```

## Units shipped (in commit order)

| Unit | Commit | What |
|------|--------|------|
| U-ZEBRA01 | `f11b586f99` | `scripts/lib/resolve-hwnd.mjs` — PID→HWND via PowerShell `MainWindowHandle`. 30/30 hermetic tests. |
| U-ZEBRA06 | (prior session) | `.claude/hooks/zebra-advisory-inject.mjs` — UserPromptSubmit hook surfaces CHO01 decision as advisory context for chats that haven't opted into SendKeys. 19/19 tests. |
| U-ZEBRA05 | `1a88d07f71` | `scripts/lib/zebra-bd-priority.mjs` — backend-dev priority filter payload (`U-WIRE*\|U-BRIDGE*\|U-HOOK*\|U-INFRA*\|U-DEVTOOL*\|U-CK*\|backend-dev FIRST`). 28/28 tests. |
| U-ZEBRA02 | `8ca37e8d82` | `scripts/lib/zebra-orchestrator-lib.mjs` + `scripts/zebra-orchestrator-sweep.mjs` — main loop wiring CHO01/02 + U-ZEBRA01 + U-ZEBRA05 + U-CHO04 with per-slot opt-in, 24h dry-run grace, 5s stagger, JSONL log. 33/33 tests + end-to-end smoke. |
| U-ZEBRA03 | (this session) | `.claude/helpers/install-zebra-orchestrator-task.ps1` — durable scheduled-task installer mirroring fleet-reaper pattern (S4U/AtStartup/Restart3×1m, +420s phase offset, `-DryRun`/`-RunNow`/`-Uninstall`/`-AsSystem`). |
| U-ZEBRA04 | (this session) | `scripts/lib/zebra-drift-detect.mjs` — pure detectors for `stale-loop-tick` + `topic-drift`, advisory output combined via `summarizeDrift`. 25/25 hermetic tests. |
| U-ZEBRA07 | (this session) | 4-surface doc reflection: this wiki entry + Obsidian memory + CLAUDE.md patch-sibling + `/checkin-zebra` slot wrapper. |

## Safety invariants (load-bearing)

1. **Per-slot opt-in default FALSE.** `slots[<name>].zebraOptIn` must be `=== true`. Untouched chats are never targeted.
2. **24h dry-run grace.** A slot whose `zebraOptInAt` is younger than 24h forces dry-run regardless of installer mode — first day is observation-only.
3. **Self-exempt slots.** `zebra` (the orchestrator itself) and `golf` (hygiene) are NEVER planned-against — frozen in `SELF_EXEMPT_SLOTS`.
4. **Cascade kill switches.** `PRISM_ZEBRA_DISABLE=1` > `PRISM_ZEBRA_DRY_RUN=1` > `PRISM_SENDKEYS_DISABLE=1` > opt-in-grace > live.
5. **≥5s stagger.** Between consecutive SendKeys lines and between slots — never type into two windows back-to-back.
6. **R12 fail-loud.** Every JSONL log entry carries a `reason` string; no silent skips.
7. **Single-host scope.** chat-slots.json is per-host; the orchestrator never crosses machines.

## Knobs

| Env | Effect |
|-----|--------|
| `PRISM_ZEBRA_DISABLE=1` | Sweep refuses to plan any action. |
| `PRISM_ZEBRA_DRY_RUN=1` | Every plan downgrades to dry-run regardless of opt-in maturity. |
| `PRISM_SENDKEYS_DISABLE=1` | The PS SendKeys script self-aborts; lib pre-downgrades to dry-run. |
| `PRISM_ZEBRA_STAGGER_MS=N` | Override default 5000ms stagger (floor 5000). |
| `PRISM_ZEBRA_LOG=<path>` | Override log file (default `state/shared/zebra-orchestrator-log.jsonl`). |
| `PRISM_ZEBRA_SLOTS_FILE=<p>` | Override chat-slots path (tests). |
| `PRISM_ZEBRA_SELF_SLOT=<n>` | Explicit self-slot exclusion (CLI fallback when chat-slots can't be inferred). |

## Operator workflow

1. **Install task (one-shot, elevated):**
   `! powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-zebra-orchestrator-task.ps1 -DryRun -RunNow`
   Burn-in for 24h with `-DryRun` to confirm decisions/HWND resolution land correctly. Re-install without `-DryRun` to go live.
2. **Opt a slot in:** edit `state/shared/chat-slots.json`, set `slots[<name>].zebraOptIn = true` and `zebraOptInAt = "<ISO timestamp>"`. The 24h grace window starts ticking from `zebraOptInAt`.
3. **Watch:** `Get-Content H:/PRISM/state/shared/zebra-orchestrator-log.jsonl -Tail 20 -Wait`.
4. **Pause without uninstalling:** `Disable-ScheduledTask -TaskName 'PRISM Zebra Orchestrator'`.
5. **Uninstall:** re-run the installer with `-Uninstall`.

## Related

- [[fleet-reaper-ms1]] — sister scheduled task, same installer pattern; reaper kills, zebra orchestrates.
- [[chat-orchestrator-design]] — CHO backbone (CHO01/02/04) that zebra wires together.
- [[session-continuity-stack-2026-05-15]] — the auto-resume + terminal-pin layer that makes the SendKeys'd `/checkin-<slot>` actually pick the right handoff post-/compact.
- [[feedback_prioritize_devtools_backend]] + [[feedback_high_roi_backend_first_slot_queue]] — standing doctrine encoded in U-ZEBRA05's priority filter.

---

## ZEBRA-ORCHESTRATOR-MS1 — arming the dormant MS0 (2026-05-22, slot bravo)

MS0 shipped the actuator + lib + installer + tests but was **never armed**:
the scheduled task was never registered, **0 slots had opted in**, and two
latent integration bugs would have made the orchestrator inert even if armed.
MS1 closes those gaps so zebra auto-invokes `/precompact` + `/compact` in
every opt-in chat without the operator ever doing it by hand.

| Unit | Commit | Change |
|------|--------|--------|
| U-ZM1-01 | `e78444ba53` | **`/precompact` leads every SendKeys plan.** `composeSendKeysText` emits `["/precompact", slashLine, "/checkin-<slot>"]` for BOTH compact and clear paths — the precompact writes the durable handoff before context is summarised (or, for /clear, the only thing that preserves state across the wipe). +1 regression-guard test enforces the lead. |
| U-ZM1-02 | `18fa048414` | **Persistent slot-keyed opt-in store** `state/shared/zebra-opt-in.json` + helper `scripts/lib/zebra-opt-in.mjs` (~290 lines) + 26 tests. Design driver: opt-in cannot live on the per-chat SlotState because `chat-slots.mjs:freshState()` drops it on every fresh claim — a slot re-claimed by a new chat (the full-terminal-restart case) would silently lose its opt-in. `applyOptInToSlotsDoc()` is AUTHORITATIVE: the sweep projects the store onto the in-memory chat-slots doc so `pickActionableSlots()` reads `entry.zebraOptIn` unchanged. Atomic tmp+rename, wx-flag lock with atomic stale-steal, `Atomics.wait` sleep (no CPU spin). 3-of-3 PASS (arm A initially FAILed on atomic stale-steal / Atomics.wait / tmp-cleanup envelope — all fixed). |
| U-ZM1-03 | `b2d80e3921` | **Smoke-prove the end-to-end loop.** Caught two latent integration bugs that would have made MS0 inert: (a) `readTranscriptBytes` built `${sessionId}.jsonl` literally, but chat-slots stores `claude-<8hex>` while the file is `<full-uuid>.jsonl` — every slot returned `file-not-found` → `missing-pressure`. Fix: new exported `resolveByChatIdPrefix` helper + prefix-fallback. (b) `planSlotAction` checked `pressure.level`/`pressure.tokens` but the CHO02 reader returns `{pressureLevel, tokensEstimate}` — field-name mismatch, neither smoke-tested end-to-end before. Fix: accept BOTH shapes via `??` fallback. +1 live-shape regression test. |

### Arming state (post-`b2d80e3921`)

- `state/shared/zebra-opt-in.json` populated: **25/25 manageable slots** opted in (every NATO slot except `golf`; `zebra` defensively self-exempt although it's not in `SLOT_NAMES`).
- 24h dry-run grace begins from `optInAt=2026-05-22T20:06:32.352Z` per-slot — the sweep LOGS decisions but never SendKeys until grace expires per slot. Exactly the safety design.
- **End-to-end smoke (post-fix)** — the full pipeline fires:
  ```
  slot=alpha pid=35700 decision=compact gate=dry-run
  ```
  i.e. opt-in projection → `pickActionableSlots` → `readChatPressure` (transcripts FOUND via prefix-match) → `decideClearOrCompact` → compose `["/precompact","/compact","/checkin-<slot>"]` → `resolveHwndByTitle` → gate=dry-run. Steps 1–5 all green. `hwnd:no-match` on some slots is a runtime concern (WT titles vs chat-slots topics), not a code bug — surfaced BY the working orchestrator. The 24h burn-in log lets the operator triage.

### U-ZM1-04 — armed autonomously (no operator step)

The /goal Stop-hook gate flagged that "register the scheduled task" was a
manual elevated step, so the orchestrator was not yet *autonomous*. U-ZM1-04
closed it. The installer's admin check was over-broad — it threw even for
`-Interactive` mode, although a current-user / no-principal task needs no
elevation. Fix: gate the admin check on `-not $Interactive`, and in
`-Interactive` mode drop the `AtStartup` trigger (a system-level trigger that
can itself require admin). The installer now has a fully non-elevated path:

```powershell
# Non-elevated (interactive task — runs while you are logged on):
powershell -NoProfile -ExecutionPolicy Bypass -File `
  H:/prism/.claude/helpers/install-zebra-orchestrator-task.ps1 -Interactive -RunNow
# Elevated (production S4U task — survives logoff, RunLevel Highest):
powershell -NoProfile -ExecutionPolicy Bypass -File `
  H:/prism/.claude/helpers/install-zebra-orchestrator-task.ps1 -RunNow
```

The 2026-05-22 arming session ran elevated, so the **production S4U task** was
registered directly — `PRISM Zebra Orchestrator`, 5-min poll + AtStartup,
+420s phase offset (clear of the fleet-reaper / memory-monitor cron slots).
First run fired **autonomously** at 20:38 (`LastTaskResult=0`) and logged 25
`decision=compact gate=dry-run` entries — every opted-in slot, all gated by
the 24h grace, no SendKeys. **Zebra is now fully autonomous**: the Windows
scheduler drives the sweep every 5 min with zero human input.

Verify: `schtasks /Query /TN 'PRISM Zebra Orchestrator'`. Watch:
`Get-Content H:/PRISM/state/shared/zebra-orchestrator-log.jsonl -Tail 20 -Wait`.
Pause: `Disable-ScheduledTask -TaskName 'PRISM Zebra Orchestrator'`.

After 24h per slot, the dry-run grace expires and zebra goes LIVE — SendKeys
the `/precompact + /compact + /checkin-<slot>` sequence into each opt-in
window when CHO01 decides one is warranted.

### Burn-in item — HWND resolution

The autonomous runs log `hwnd:no-match` / `hwnd:title-missing`:
`resolveHwndByTitle` matches the slot's chat-slots `topic`, but
`slot-tab-boot.ps1` sets the window caption to `"PRISM <slot>"`. The decision
loop is proven; the SendKeys actuation last-mile needs the window-title
convention reconciled before the per-slot 24h grace expires. This is exactly
what the burn-in window is for — the installer docs call out "confirm
decisions/HWND resolution land correctly" during the dry-run period. Triage
via the JSONL log; fix is a follow-up unit (`resolveHwndByTitle` should match
the `"PRISM <slot>"` caption, or `slot-tab-boot.ps1` should set the caption
to the `topic`).

### Test counts

| Suite | Tests |
|-------|-------|
| `zebra-orchestrator-lib.test.mjs` | 62 (was 60 — +2 regression guards) |
| `zebra-opt-in.test.mjs` | 26 (new) |
| `chat-token-watch.test.mjs` | 26 (existing pass; prefix-match helper added, no regressions) |

### Known follow-up (NOT required for "fully operational")

The byte-estimate pressure threshold (`critical=940K`) is calibrated for the
1M-context Opus chats that fill the current fleet. A 200K Sonnet chat would
never reach the threshold. PRISM has the token-awareness sidecar exposing
`ctx=%` (window-agnostic) — wiring it as the preferred pressure source would
close that gap if the fleet ever mixes models. Deferred to operator
decision; the current fleet works on the byte-estimate.

### Lessons reinforced

- **Smoke-test every new end-to-end orchestration loop.** Two libs (CHO02
  reader + orchestrator lib) shipped in separate units with the same
  conceptual field but different names (`tokens`/`level` vs
  `tokensEstimate`/`pressureLevel`); both lib-level test suites passed
  while the wiring was broken. Only a live smoke caught it. Per
  `feedback_verify_actual_contract_not_proxy`.
- **Hermes is a name, not a pattern.** NousResearch's Hermes model family
  + the Hermes Agent framework (ReAct + persistent `SKILL.md`). PRISM's
  HERMES-MS0/MS1 already adopted the right things (slot souls =
  personality, skill-candidate loop = compounding-capability). Zebra is a
  standard supervisor / orchestrator-worker — designed accordingly.

## U-ZM1-05 — HWND resolution + the tabbed-fleet wall (2026-05-22)

The MS1 burn-in logged `hwnd:no-match` on every autonomous run. Triage found
this is **not** a title-convention mismatch but an architectural wall.

**Empirical finding.** `enumerateWindows()` on the live fleet returned exactly
ONE window matching terminal/PRISM — caption literally `"Windows Terminal"`,
`visible=false` — while 13 chats were claimed. **The whole PRISM fleet runs as
TABS of one Windows Terminal window.** `EnumWindows` (Win32 top-level windows)
only ever sees that single WT HWND, and only the *focused* tab's caption is
reflected on it. Per-chat title→HWND resolution is physically impossible for
this topology — exactly the degenerate case `resolve-hwnd-by-title.mjs`'s
header CAVEAT (lines 25-31) warned about. SendKeys-to-HWND needs one HWND per
chat; a tabbed fleet has one HWND total.

**Three log symptoms, one root cause.** `hwnd:no-match` (caption ≠ searched
topic), `hwnd:title-missing` (`pick.entry?.topic` absent — 7 of 13 live slots
had an empty `topic`), `hwnd:spawn-signal` (the sweep spawned PowerShell 13×
per sweep — one `resolveHwndByTitle` per slot, each Add-Type-compiling C# — and
an 8 s timeout killed some under load).

**What U-ZM1-05 shipped (3 code files):**
- `rename-window-intercept.mjs` — new pure exported `composeSlotTitle(slot,
  topic)`; the window caption now ALWAYS leads with `PRISM <slot>` (the stable,
  always-present slot identity), topic appended when present. The always-match
  re-assert guard changed `cur.topic` → `cur.slot` so a topicless chat still
  gets a resolvable caption — that absence was the `hwnd:title-missing` root
  cause. +6 tests (24/24).
- `zebra-orchestrator-sweep.mjs` — `enumerateWindows()` is called ONCE per
  sweep (was 13×) → kills `hwnd:spawn-signal`; per-slot resolution is now
  `matchWindowsByTitle(windowList, \`PRISM <slot>\`)` on the stable slot
  caption; a `tabbedFleet` flag (>1 chat, ≤1 `PRISM `-captioned window)
  relabels a `no-match` as the honest `hwnd:tabbed-fleet-occluded`.
- (`resolve-hwnd-by-title.mjs` unchanged — U-ZM1-05 uses its existing
  `enumerateWindows` + `matchWindowsByTitle` exports as the author intended.)

**What U-ZM1-05 does NOT do (R12, loud).** It does NOT make SendKeys actuation
land. With one WT HWND, every slot still resolves to
`hwnd:tabbed-fleet-occluded` (smoke-confirmed: all 11 actionable slots, 1 PS
spawn). U-ZM1-05 is the correct *convention* + *efficiency* + *honest
diagnostic* — the strict prerequisite for actuation, not actuation itself.

### ZEBRA-ORCHESTRATOR-MS2 (scoped, not built — multi-unit)

**Empirical fleet topology (probed 2026-05-22 via `[AutomationElement]::FromHandle($wtHwnd)`):**

- **One** `WindowsTerminal.exe` process (pid 15820, hwnd 525214).
- **5** UIA TabItems: `KILO`, `LIMA`, `MIKE`, `SIERRA`, `NOVEMBER` —
  **UPPERCASE slot names** (the launcher's `wt new-tab --title <SLOT>` wins;
  `slot-tab-boot.ps1`'s `"PRISM $Slot"` console-title-set never reaches the
  tab caption — WT respects `--title` and doesn't honor the application title
  unless `suppressApplicationTitle:false` is set).
- **17** `OpenConsole.exe` child processes (ConPTYs).
- **15** `claude.exe` processes.

`tabs × claude > tabs` ⇒ **WT split panes** within tabs. Multiple ConPTYs per
tab, only one focused at a time. SendKeys to a tab lands in its *focused*
pane — so tab-select alone is NOT enough; the right *pane* must also be
focused.

**MS2 = 3 units:**

1. **U-ZM2-01 — UIA tab resolver.** Resolve the WT window by class
   `CASCADIA_HOSTING_WINDOW_CLASS`. Find the target tab via
   `AutomationElement.FindFirst(TreeScope.Descendants, ControlType.TabItem ∧
   Name == <slot>)` (case-insensitive). Invoke `SelectionItemPattern.Select()`.
   Tab `Name` convention needs reconciliation: launcher should pass
   `--title "PRISM <slot>"` so the resolver matches the same `composeSlotTitle`
   convention U-ZM1-05 ships, OR the resolver matches the bare UPPERCASE slot
   name. The launcher lives in `H:/Tools/prism-fleet/` (outside repo) —
   reconciliation is an operator-side change.
2. **U-ZM2-02 — UIA pane focus.** After tab selection, navigate the tab's
   UIA subtree to find the target pane (each pane has a `Terminal` /
   `Pane` control). Invoke `SetFocus()` on the target pane. The mapping
   chat-pid ⇒ pane requires walking from the pane's UIA `RuntimeId` back to
   its hosting ConPTY's claude.exe pid — UIA exposes the process-id property.
3. **U-ZM2-03 — restore + foreground + SendKeys.** WT window may be
   minimized (`vis=false`); `ShowWindowAsync(SW_RESTORE)` then
   `SetForegroundWindow`. Then existing SendKeys path. UX cost: zebra
   foregrounds WT every 5 min — disruptive if the operator is typing
   elsewhere; consider gating on operator-idle.

**Why index-based `wt focus-tab --target N` is rejected:** WT tabs shift
indices on close/reorder; a stale index types `/compact` into the WRONG
chat (silent context loss — the load-bearing safety property). Name-based
UIA + per-pane focus is the only safe mechanism.

**No urgency.** The 24 h per-slot dry-run grace forces dry-run regardless
until ~2026-05-23 20:06. After that, eligible slots without a working
actuator emit `hwnd:tabbed-fleet-occluded` (or future `pane:unresolved`) —
honest, not silently broken.

### U-ZM2-01 — UIA tab-focus actuator (shipped + empirically proven)

`scripts/lib/wt-tab-focus.mjs` ships the UIA primitive: walk every WT window
(via UIA's `RootElement` walker filtered by ProcessId — handles the
multi-WT-window case `Get-Process.MainWindowHandle` misses), find a unique
TabItem matching the slot (case-insensitive, bare `<slot>` or `PRISM <slot>`),
verify exactly 1 `TermControl` pane after select (refuses multi-pane —
U-ZM2-02 territory), then `ShowWindowAsync(SW_RESTORE)` +
`SetForegroundWindow`. Dry-run mode probes without Select/foreground —
`PRISM_WT_DRY_RUN=1` env, side-effect-free during the 24 h grace. 28/28
hermetic unit tests pass.

Sweep integration: two-tier resolution in `zebra-orchestrator-sweep.mjs`.
Tier 1 = UIA tab-focus. Tier 2 = legacy `matchWindowsByTitle` fallback for
separate-window deployments (entered only on `no-wt-process`). The sweep's
once-per-sweep `enumerateWindows` from U-ZM1-05 still runs as fallback
input. SAFETY invariant preserved: only `ok:true` reaches `sendLines`;
`tabbed-fleet-occluded`, `no-tab`, `ambiguous-tab`, `pane-count:N` all skip.

**Latent bug surfaced + fixed (`send-keys-to-window.ps1`).** Passing
`-Confirm:$false` / `-Confirm:0` / `-Confirm:1` as discrete argv tokens
through PowerShell's `-File` mode fails param coercion (PS receives literal
strings, refuses to convert to `[bool]`). The script was effectively never
executable from any spawn-based caller. Fix: env-var override — `if
(-not $Confirm -and $env:PRISM_SENDKEYS_CONFIRM -eq "1") { $Confirm = $true }`.
The sweep sets `PRISM_SENDKEYS_CONFIRM=1` for execute, omits for dry-run.

**Empirical close-out (2026-05-23 ~00:44 UTC).** Live sweep with U-ZM2-01
wired produced these log entries — `dry-run` gated, `resultOk:true`, valid
HWND + chars from the sendLines dry-run path:

| slot | hwnd | chars | result |
|------|------|-------|--------|
| alpha   | 393352 | 119 | ok |
| bravo   | 393352 | 119 | ok |
| charlie | 393352 | 121 | ok |
| echo    | 393352 | 118 | ok |
| foxtrot | 132620 | 121 | ok |
| hotel   | 132620 | 119 | ok |

**Two WT windows enumerated** (393352 hosts ALPHA-ECHO, 132620 hosts
FOXTROT-JULIETT) — both fully traversed by the UIA-walker primitive that
`Get-Process.MainWindowHandle` cannot see. india/juliett/november entries
returned `no-action-needed:noop` (correct — their pressure was below
critical at that tick, decision-engine working as designed).

**Stale-slot lesson (chat-slots `pid` is not a liveness check).** Initial
smoke flagged 5 slots `uia:no-tab` because chat-slots still held DEAD pids
(lima/mike/november/sierra; foxtrot/hotel/india/juliett pre-restart). The
fleet-reaper's `window_pid_alive` heuristic kept them because it checks the
*window* pid, not the slot's recorded chat-process pid. After
`chat-slots.mjs release --chatId <stale>` on the 4 zombies, the next sweep
resolved 6+ slots cleanly. Long-form fix: `pickActionableSlots` should
liveness-check `pid` before claiming a slot actionable — tracked as
follow-up.

### What's left for MS2

- **U-ZM2-02 — UIA pane focus.** When a WT tab has multiple panes (split
  view), tab-select alone focuses an arbitrary pane. SendKeys would land
  there, not necessarily the target chat. U-ZM2-01 currently refuses
  (`pane-count:N`); MS2 needs `SetFocus()` on the right pane keyed off chat
  process-id via UIA's `ProcessId` property.
- **U-ZM2-03 — execute-mode end-to-end smoke.** The env-var override is
  wired and dry-run is proven. Execute mode (`PRISM_SENDKEYS_CONFIRM=1`)
  will actually SendKeys when the 24 h grace expires per-slot; first live
  fire is ~2026-05-23 20:06. Burn-in observation is part of that path.
- **U-ZM2-04 — pid-liveness gate in `pickActionableSlots`.** Stop offering
  dead pids to the actuator so `uia:no-tab` doesn't fire on zombie slots.

---

## ZEBRA-ORCHESTRATOR-MS3 — PSN-synergy enrichment of the SendKeys directive (2026-05-23, slot bravo)

MS0/MS1/MS2 closed the **actuation** loop (when/where/how to fire). MS3 closes
the **intelligence** loop: until U-ZPSN01, the SendKeys directive payload was
a STATIC string —

```
/checkin-<slot> priority filter U-WIRE*|U-BRIDGE*|...|backend-dev FIRST
```

— the same line for every slot. The PRISM Self-Awareness layer (PSN +
`zebra-awareness-pipeline`'s 11-surface fingerprint: domains, hermesRole,
queue depth, tribal-domain scoring, viz neighborhood, success rate, refuse
list) was being **computed every sweep, written to the JSONL log, and then
dropped** — `composeSendKeysText(decision, slotPick.slot)` was called
without opts, so the fingerprint never reached `buildCheckinPayload`'s
`opts.extraHint`. The chat that woke up on `/checkin-<slot>` did so blind
to its own slot soul.

| Unit | Commit | Change |
|------|--------|--------|
| U-ZPSN01 | (this session) | **PSN-aware SendKeys directive.** Adds pure `buildAwarenessHint(fingerprint)` to `zebra-bd-priority.mjs` — synthesises a compact bracketed metadata tag `[psn:domain=<d>,role=<r>,queue=<n>,tribal=<top>]` from the awareness fingerprint. Wires `planSlotAction(slotPick, pressure, opts)` to accept `slotAwareness` and forward it as `composeSendKeysText`'s `extraHint`. Sweep passes `slotAwareness: fp` (the fingerprint already read for `slotQueueLength`). 16 new tests + 268/268 zebra regression green. R12 fail-soft: missing/null fingerprint = empty hint = pre-MS3 directive verbatim. Sanitiser strips every char outside `[a-z0-9+\-_]` so a hostile fingerprint cannot inject shell/slash chars into the SendKeys line. |

### Empirical proof (smoke run, 2026-05-23T01:30:54Z)

JSONL log entry for slot `bravo` (the only slot with a fingerprint in
`state/shared/zebra-awareness-index.json` today):

```json
{
  "ts": "2026-05-23T01:30:54.005Z",
  "slot": "bravo",
  "decision": "compact",
  "planLines": [
    "/precompact",
    "/compact",
    "/checkin-bravo priority filter U-WIRE*|U-BRIDGE*|U-HOOK*|U-INFRA*|U-DEVTOOL*|U-CK*|backend-dev FIRST [psn:domain=mill,role=specialist-mill,queue=365,tribal=mill]"
  ],
  "awareness": {
    "hermesRole": "specialist-mill",
    "primaryDomain": "mill",
    "queueLength": 365
  }
}
```

The `[psn:domain=mill,role=specialist-mill,queue=365,tribal=mill]` suffix is
the synergy — the directive now carries the slot's actual capability frame.
A `bravo` chat resuming on this directive starts knowing it's the
`specialist-mill` role, owns mill-domain work, has 365 queued units, and
the deepest tribal evidence is mill (Kienzle/Taylor/chatter). Previously
that frame lived only in the slot-soul auto-inject — now it lands
explicitly in the entry directive too, before any hook injection runs.

### Why a hint string, not a richer payload

The SendKeys directive is typed verbatim into the target PowerShell window
and parsed as a Claude slash-command. The slash CLI accepts free text in
the tail (verified by U-ZEBRA05's existing priority-filter suffix). A
bracketed `[psn:...]` tag is parser-safe (no quotes, no slashes, no
whitespace inside) and obviously distinct from the priority-filter glob
text. Anything richer (e.g. injecting full engine recommendations) would
either need a hook on the target side (out of scope for MS3) or break the
slash command parser.

### What's left for MS3

- **U-ZPSN03 — Target-side parser for `[psn:...]`.** A pre-prompt hook
  on the chat side that extracts the tag and surfaces a one-line slot
  capability brief before any other context injection. Today the tag is
  emitted but the receiving chat has no special parser — it sees the
  hint inline in the prompt but doesn't yet treat it as structured data.

## U-ZPSN02 — Slot-soul population (2026-05-23, slot bravo /loop iter 1)

Closes the U-ZPSN01 follow-up. Before this unit `zebra-awareness-index.json`
carried only 3 fingerprints (`bravo`, `golf`, `zebra`) because the actual
souls dir at `state/shared/slot-souls/` contained only 3 `.md` files —
when `zebra-awareness-run.mjs` iterates `SLOT_NAMES` (27 entries: full NATO
alpha..zulu + appended `zebra`) it skipped 24 with `(no soul for <slot>;
skipping)`. The static SendKeys directive landed on 24/27 slots; U-ZPSN01's
PSN-tag only ever fired for the 3 souled slots.

### Path-doc fix (load-bearing)

The MS3 "What's left" section above named the souls dir as
`knowledge/wiki/slot-souls/*.md`. That path is **wrong** — the actual
`SOULS_DIR` constant in `scripts/zebra-awareness-run.mjs:31` resolves to
`state/shared/slot-souls/`. The dir under `knowledge/wiki/` does not
exist. U-ZPSN02 wrote souls to the correct path; this section is the
sticky-note that the older path reference is stale (do not re-introduce
the `knowledge/wiki/` path in any follow-up).

### What U-ZPSN02 did

Wrote 24 new slot-soul YAML+markdown files matching the shape of the 3
existing souls (`bravo.md`, `golf.md`, `zebra.md`). Each soul carries
frontmatter `slot/role/voice/tone/escalation_path/[refuse_list]/preferred_subagent_type/domain_filter/hermes_role`
and a markdown body with `## Voice` + `## Behavior` + optional `## Refuses`
+ `## When in doubt`. Domain assignments follow two conventions:

| Slot(s) | Domain | Source |
|---------|--------|--------|
| alpha | mill | CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 (canonical) — overlap-flagged with bravo, R7 surfacing |
| charlie | wire-EDM | JULIETT (charlie=wire) |
| delta | CAD | JULIETT (delta=cad) |
| echo | CAM | JULIETT (echo=cam) |
| foxtrot | tribal + machining-knowhow | JULIETT (foxtrot=machining-knowhow+tribal) |
| hotel | ERP + HR | JULIETT (hotel=erp+hr) |
| india | post-processor + master-post | JULIETT (india=post-processor+master-post) |
| juliett | speed-feed | JULIETT (juliett=speed-feed) |
| kilo | print-to-program | JULIETT (kilo=print-to-program) |
| lima | PRISM Academy | JULIETT (lima=prism-academy) |
| mike | misc | JULIETT (mike=misc) |
| november, oscar, papa, quebec, romeo, sierra, tango, uniform, victor, whiskey, xray, yankee, zulu | any (work) | post-SLOT-RECLAIM (2026-05-19) expansion slots, unallocated at expansion time, available for future domain assignment |

### R7 conflict surfaced (alpha↔bravo mill-domain overlap)

CLAUDE.md §JULIETT names `alpha=mill`. The pre-existing `bravo.md` already
claimed `mill-specialist` (hermes_role + domain_filter mill|milling|...).
Per R7 (surface conflicts, don't average), both souls now declare mill
domain explicitly. The `alpha.md` body carries an explicit `## Shared-domain note`
naming the overlap, the routing precedence (alpha when idle, bravo when
already holds related in-flight work), and the cleanup-follow-up pointer.
Doing nothing would have meant silent slot-selection ambiguity; averaging
(taking JULIETT verbatim and demoting bravo to lathe) would have orphaned
365 in-flight mill items and 295 tribal-mill hits actually attributed to
bravo. Conservative path = preserve in-flight state, document conflict.

### Empirical proof (smoke run, 2026-05-23T04:08:29Z)

After `node scripts/zebra-awareness-run.mjs --json`:

| Metric | Before U-ZPSN02 | After U-ZPSN02 |
|--------|-----------------|----------------|
| `zebra-awareness-index.json` `slotCount` | 3 | **27** |
| Slots emitting `[psn:...]` from `composeSendKeysText` | 1 (bravo) | **27 / 27** |

Spot-check of `composeSendKeysText({action:'compact'}, slot, {extraHint:
buildAwarenessHint(fp)})` for 6 newly-souled slots:

| Slot | psnHint |
|------|---------|
| echo | `[psn:domain=cam,role=specialist-cam,queue=196,tribal=cam]` |
| oscar | `[psn:domain=any,role=work,queue=0]` |
| charlie | `[psn:domain=wedm,role=specialist-wire-edm,queue=123,tribal=wedm]` |
| juliett | `[psn:domain=speed-feed,role=specialist-speed-feed,queue=87]` |
| alpha | `[psn:domain=mill,role=specialist-mill,queue=80,tribal=mill]` |
| foxtrot | `[psn:domain=tribal,role=specialist-tribal,queue=27]` |

All 6 emit a non-empty PSN tag end-to-end. The juliett tag has no `tribal=`
field because its `tribalDomainScores` is empty — `speed-feed` is not a
top-level tribal-embed-index domain key. R12 fail-soft on missing fields
behaves as designed (omit the field, never inject empty `tribal=`).

### Arm-2 assessment — zebra ↔ Claude Code CLI + PSN synchronization

The /goal asked: "assess zebra's synchronization with claude code cli + PSN."

**Zebra ↔ Claude Code CLI bridge:** The actuator is `composeSendKeysText`
emitting a 3-line payload (`/precompact` + `/compact|/clear` + `/checkin-<slot> …`)
that the zebra-orchestrator-sweep types verbatim into the target slot's
PowerShell window. The window is resolved by HWND lookup via terminal-window-id
(see [[reference_twid_resolver_cache_2026_05_15]]). MS1+MS2 closed the
window-discovery + tabbed-fleet wall (UIA-based pane focus is the open MS2
follow-up). The CLI sees the typed line and parses it as a slash command —
the directive body (priority filter + PSN tag) lives in the trailing free-text
slot that `/checkin-<slot>` allows verbatim.

**Zebra ↔ PSN bridge:** The PSN substrates (CLAUDE-BRIEF, PRISM-BUILD-CONTEXT,
PRISM-BUILD-VISION, system-graph, tribal-embed-index, prismSelfAwarenessEngine,
memories, wiki, slot-souls, verdict ledger, slot-task-claims) are read by
`zebra-awareness-pipeline.buildCapabilityFingerprint` into an 11-field
fingerprint per slot, persisted to `state/shared/zebra-awareness-index.json`.
U-ZPSN01 took 4 of those 11 fields (domain / role / queueLength / top-tribal)
and packed them into the SendKeys directive as a `[psn:...]` tag. The
remaining 7 fields stay in the JSONL log + index for downstream consumers.

**Synchronization gap surfaced (not closed by U-ZPSN02):** The `[psn:...]`
tag is **sent** but **no target-side consumer parses it yet** — a Claude
chat resuming on the directive sees the tag as inline prompt text but
treats it like any other priority-filter suffix, not as structured data.
The closed-loop value (chat reads its own PSN frame before injecting any
hook context → biases agent selection / pickup order) is gated on U-ZPSN03
(target-side pre-prompt parser hook). Today the tag is informational only.
The wiring on the zebra side is correct + tested + fleet-wide; the
intelligence loop closes when U-ZPSN03 ships.

### Cross-refs

- U-ZPSN01 (above) — wired the SendKeys directive to carry the PSN tag.
- [[reference_zpsn01_psn_synergy_2026_05_22]] — narrative of the U-ZPSN01 ship.
- [[reference_zebra_awareness_ms0_2026_05_20]] — the 11-surface awareness pipeline.
- [[feedback_conflict_fork_rule]] — the R7 doctrine alpha↔bravo overlap surfacing follows.
- CLAUDE.md §JULIETT-12CHAT-ALLOCATION-MS0 — the canonical domain partition this implements.
