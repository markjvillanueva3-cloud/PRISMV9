---
name: zulu-orchestrator-ms1-2026-05-22
description: "ZULU-ORCHESTRATOR-MS1 (3 units, slot bravo) — armed the chat-fleet orchestrator end-to-end: /precompact leads every SendKeys plan, persistent slot-keyed opt-in store, and the smoke-caught pressure/path bugs that made the prior MS0 dormant"
aliases: reference_zulu_orchestrator_ms1_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.284Z
---


ZULU-ORCHESTRATOR-MS1 (2026-05-22, slot bravo, /loop /goal "100% proven full
automation orchestrated by zulu") — armed PRISM's chat-fleet orchestrator so
zulu auto-invokes `/precompact` + `/compact` in every opt-in chat window
without the operator ever doing it by hand. MS0 (the actuator/installer/sweep)
had shipped 2026-05-20 but was DORMANT: scheduled task never registered, 0
slots opted in, AND two latent bugs would have made it inert even if armed.
MS1 closed those last gaps.

**3 units:**

1. **U-ZM1-01** (commit `e78444ba53`) — `/precompact` leads every SendKeys
   plan. `composeSendKeysText` now emits `["/precompact", "/compact",
   "/checkin-<slot>"]` (and `/precompact → /clear → /checkin` for the clear
   path). The user's literal ask: "ensuring that it invokes precompact and
   compactions within each chat window so i don't have to physically do it."
   The PRECOMPACT writes the durable handoff BEFORE the context is summarised
   (or, for /clear, ONLY thing that preserves state across the wipe). +1
   regression-guard test: every actionable plan must lead with /precompact.

2. **U-ZM1-02** (commit `18fa048414`) — persistent slot-keyed **opt-in store**
   `state/shared/zulu-opt-in.json`. **Design driver**: opt-in cannot live as
   a field on chat-slots.json's per-chat SlotState because
   `chat-slots.mjs:freshState()` drops it on every fresh claim — a slot
   re-claimed by a new chat (the exact full-terminal-restart case zulu
   exists to serve) would silently lose its opt-in. New
   `scripts/lib/zulu-opt-in.mjs` (~290 lines): atomic tmp+rename, wx-flag
   lock with **atomic stale-steal** + **Atomics.wait** sleep (no CPU spin),
   self-exempts zulu/golf, CLI `opt-in <slot> | opt-in --all | opt-out
   <slot> | status`. `applyOptInToSlotsDoc()` (called by the sweep) is
   AUTHORITATIVE — projects the store onto the in-memory chat-slots doc so
   `pickActionableSlots()` reads `entry.zuluOptIn` unchanged. 26 tests
   covering happy + lock + write-failure + adversarial paths. 3-of-3 PASS
   (arm A initially FAILed on 3 P1s — atomic wx-steal, Atomics.wait,
   tmp-cleanup envelope — all fixed; re-dispatch PASSed both arms).

3. **U-ZM1-03** (commit `b2d80e3921`) — **smoke caught two latent integration
   bugs** that would have made MS0 inert even with the task armed:
   - `chat-token-watch.mjs:readTranscriptBytes` built the transcript path as
     literal `${sessionId}.jsonl`, but chat-slots stores `chatId =
     "claude-XXXXXXXX"` (8-hex prefix) while the actual file is
     `XXXXXXXX-<rest-of-uuid>.jsonl`. **Every slot returned `file-not-found`
     → pressure null → planSlotAction returned `missing-pressure` → no
     critical decision ever fired.** Fix: new exported `resolveByChatIdPrefix`
     helper + literal-first / prefix-fallback in `readTranscriptBytes`.
   - `planSlotAction` checked `pressure.level` / `pressure.tokens` but the
     CHO02 reader returns `{pressureLevel, tokensEstimate}`. **Field-name
     mismatch** — neither caller had ever been smoke-tested end-to-end. Fix:
     accept BOTH shapes via `?? ` fallback; +1 regression-guard test using
     the live CHO02 shape.

**Arming (live as of `b2d80e3921`):**
- `state/shared/zulu-opt-in.json` populated: 25/25 manageable slots opted in
  (every NATO slot except golf; "zulu" is not in SLOT_NAMES — defensively
  exempt anyway).
- 24h dry-run grace begins from `optInAt=2026-05-22T20:06:32.352Z` for every
  slot. The sweep logs decisions but DOES NOT SendKeys until the grace
  expires per-slot — exactly the safety design.
- **Sweep smoke (post-fix) — END-TO-END PROVEN**:
  `slot=alpha pid=35700 decision=compact gate=dry-run`
  The full pipeline fires: opt-in projection → pickActionableSlots → pressure
  read (transcripts FOUND via prefix-match) → decideClearOrCompact → compose
  ["/precompact","/compact","/checkin-<slot>"] → resolveHwndByTitle →
  decideExecutionGate=dry-run. Steps 1-5 all green. `hwnd:no-match` on some
  slots is a runtime concern (WT titles vs chat-slots topics), not a code
  bug — surfaced BY the working orchestrator. The 24h burn-in log will let
  the operator triage.

**ARMED — U-ZM1-04 (task registered autonomously, zero operator step):**
The Stop-hook /goal gate correctly flagged that "register the scheduled task"
was a manual elevated step → not "fully autonomous." U-ZM1-04 closed it:
`install-zulu-orchestrator-task.ps1`'s admin check was over-broad — it threw
for `-Interactive` mode too, even though a current-user / no-principal task
needs no elevation. Fix: gate the admin check on `-not $Interactive`, and
drop the AtStartup trigger in `-Interactive` mode (it can need elevation).
This session happened to run elevated (`isAdmin=True`), so the production
**S4U** task was registered directly — `PRISM Zulu Orchestrator`, 5-min poll
+ AtStartup, +420s phase offset. First run fired autonomously at 20:38,
`LastTaskResult=0`, logged 25 `decision=compact gate=dry-run` entries (all
gated by the 24h grace — no SendKeys). Zulu is now fully autonomous: the
Windows scheduler drives it every 5 min, no human input. Knobs:
`PRISM_ZULU_DRY_RUN=1` forces dry-run; `Disable-ScheduledTask -TaskName
'PRISM Zulu Orchestrator'` pauses without uninstalling.

**Known burn-in item (the 24h grace is for exactly this):** the autonomous
runs log `hwnd:no-match` / `hwnd:title-missing` — `resolveHwndByTitle` matches
the slot's chat-slots `topic`, but `slot-tab-boot.ps1` sets the window caption
to `"PRISM <slot>"`. The decision loop is proven; the SendKeys actuation
last-mile needs the window-title convention reconciled before the per-slot
24h grace expires. Triage during burn-in via the log — the installer docs
explicitly call this out ("confirm decisions/HWND resolution land correctly").

**Test counts:** zulu-orchestrator-lib 62/62 (was 60 — +2 regression
guards); zulu-opt-in 26/26 (new); chat-token-watch 26/26 (existing pass,
prefix-match helper added, no regressions).

**Known follow-up (scoped — NOT required for "fully operational"):**
the byte-estimate pressure threshold (`critical=940K`) is calibrated for
1M-context Opus chats; a 200K Sonnet chat would never trigger. PRISM has
the token-awareness sidecar (the live `ctx=%` percentage) which is
window-agnostic — wiring it as a preferred pressure source would close that
gap. Deferred to the user's decision: the current fleet is all Opus-1M so
the byte-estimate works today.

**Lessons:**
- Two libs ship in separate units with the same conceptual field but
  different names (`tokens`/`level` vs `tokensEstimate`/`pressureLevel`) →
  silent integration bug; only smoke catches it. Lib-level unit tests pass
  on both sides while the wiring is broken. **Smoke-test EVERY new
  end-to-end orchestration loop, every time.** Per [[feedback_verify_actual_contract_not_proxy]].
- Hermes is not a pattern, it's a name. NousResearch's Hermes model family
  + the Hermes Agent framework (ReAct + persistent SKILL.md). PRISM's
  HERMES-MS0/MS1 already adopted the right things (slot souls = personality,
  skill-candidate loop = compounding-capability). Zulu is a standard
  supervisor / orchestrator-worker — design accordingly.

Wiki: [[zulu-orchestrator]]. Related: [[reference_hermes_zulu_ms0_2026_05_20]],
[[reference_zulu_awareness_ms0_2026_05_20]],
[[reference_session_continuity_stack_2026_05_15]].
