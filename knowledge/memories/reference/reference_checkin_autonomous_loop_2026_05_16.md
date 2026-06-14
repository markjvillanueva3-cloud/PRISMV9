---
name: reference-checkin-autonomous-loop-2026-05-16
description: "/checkin gained a keyword-gated autonomous continuous-work loop — /autopilot-full + /yolo-mode doctrine rolled into the slot system. Step 12 reworked, new Step 2b loop-resume detection survives /compact. Single checkin.md edit; 12 NATO wrappers inherit it. Commit 9c459d1b2."
aliases: reference_checkin_autonomous_loop_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.060Z
---


# /checkin autonomous loop — autopilot+yolo rolled into the slot system (2026-05-16, slot alpha claude-339c8ff7)

**Shipped: commit `9c459d1b2`** (`[MAIN] [CHECKIN-AUTOLOOP]/U-CAL01`, 3 files / 125 ins). 3-of-3 scrutiny PASS; per-file gate on checkin.md PASS (2 reviewers + 1 re-verify).

**User directive:** "instead of updating them [autopilot-full + yolo-mode], roll them into the checkin chat slot system so you work as long as possible." Engagement model chosen by the user via AskUserQuestion: **keyword-gated** (not always-on).

**What shipped — single-file edit to `H:/prism/.claude/commands/checkin.md`.** NO new code/hooks/scripts — pure orchestration edit reusing existing autonomous machinery. The 12 `checkin-<slot>` NATO wrappers inherit it automatically (they delegate to the canonical body — no wrapper edits).

- **Step 12** reworked from a lean "/loop pipeline" → "Autonomous Loop (rolled-in /autopilot-full + /yolo-mode)": condensed yolo doctrine (zero questions, auto-select highest-priority unit, no implicit unit caps, auto-fix 3×), per-iteration pick→build→**mandatory per-file scrutiny**→commit→`loop-state` tick→`chat-slots pipeline-step`, stop conditions, compaction survival.
- **New Step 2b — Loop-resume detection**: post-`/compact`, `session-start-auto-resume` re-fires `/checkin --topic <slot>-<topic>` with NO loop keyword — so loop *continuation* comes from Step 2b reading `loop-state.mjs`, not the keyword gate. **Core rule: the keyword gate engages a FRESH loop; an active `running` loop-state RESUMES regardless of args.**
- Args bullets (loop keywords + `--no-loop` off-switch); §Report `loop:` line; dev-pipeline trigger heuristic extended; Step 14 keeps loop-state `running` across /compact. Also fixed stale fleet-count drift (7/10 → 12 slots) in 6 spots.

**Reused infra (no rebuild):** `loop-state.mjs` (start/tick/read/end/reap; 4h stale; 2×target abandon), `chat-slots.mjs pipeline-step`, `session-start-auto-resume.mjs`, the per-file + 3-of-3 scrutiny gates, `autonomous-loop-watchdog`/`-defer` runaway guards.

**Scrutiny lessons (P0/P1 caught by the per-file gate, all fixed pre-commit):**
1. **P0 — `loop-state read` never returns `status:"stale"`.** `read` returns the raw state object; `"stale"` is written ONLY by `reap`. The first Step 2b draft had a `status:"stale"` branch unreachable on a plain `read`, and a 4h-dead loop would read `running` → false resume. **Fix: Step 2b runs `loop-state reap` BEFORE `read`** so the branch is reachable; key the no-state case on `{ok:false}` (read emits `{ok:false,error:"no state"}`).
2. **P1 — overclaim.** "spans /compact indefinitely" softened — the loop survives /compact only if the precompact handoff wrote a valid `<slot>-<topic>` + RESUME (else orphaned until the 4h reap).
3. **P1 — keyword false-positive.** `continuous` matches `continuous-integration`/`ContinuousImprovementEngine` as a substring → doc now says match loop keywords as whole-word / explicit-intent.

**Bug discovered, NOT fixed (logged as a CLAUDE.md regression):** `stop-force-loop-continue.mjs:174` gates `if (loop.status !== "active")` but `loop-state.mjs` only ever writes `status:"running"` (enum: running/ended/abandoned/stale) — that Stop hook is **dead code fleet-wide**, never injects `## RESUME_LOOP`. 1-line fix pending (`"active"`→`"running"`). The checkin autonomous loop does NOT depend on it — Step 2b reading loop-state is the primary continuation mechanism.

**Deferred P2/P3 (3-of-3 reviewers, non-blocking):** the wiki entry's auto-generated AUTO-block still says "~7 chats" (self-heals on next `generate-skill-wiki.mjs` regen); checkin.md Step-2 "Slot roles" sentence still says "6 work slots" (missed 7th spot of the fleet-count fix).

**Doctrine:** "roll skill A into skill B" = an orchestration edit to B reusing B's existing machinery + the minimum new wiring, NOT a copy-paste of A's body. autopilot-full.md + yolo-mode.md left untouched (per "instead of updating them") — they remain standalone for their full forms. Sister: [[reference_checkin_autoinvoke_2026_05_16]], [[reference_autocompact_autonomous_ms0_2026_05_15]], [[reference_session_continuity_stack_2026_05_15]].
