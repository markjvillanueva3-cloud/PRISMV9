---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Review the NEW Stop hook `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` en"
date: "2026-06-08"
first_ts: "2026-06-08T20:20:15.448Z"
last_ts: "2026-06-08T20:23:17.363Z"
cwd: "H:\\prism"
messages: 30
user_msgs: 11
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a3ad723a11c6e8268.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Review the NEW Stop hook `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` en

> **claude-code-cli** | 2026-06-08 | 30 msgs (11 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/agent-a3ad723a11c6e8268.jsonl`

## Transcript

### User | 2026-06-08T20:20:15.448Z

Review the NEW Stop hook `H:/prism/.claude/hooks/stop-goal-clear-advance.mjs` end-to-end. It implements "on goal-clear (iter>=target), auto-fall-back to the next remaining queued unit (own-domain-first then fleet) instead of idling." It is the inverse-sibling of `H:/prism/.claude/hooks/stop-force-loop-continue.mjs` (which handles iter<target) — read that sibling too for the conventions it must match.

Context it composes (read as needed):
- `H:/prism/.claude/helpers/loop-state.mjs` — `next` / `next --resolve-only` (returns {ok,nextTask,source,exhausted,rolled}); source can be resume-flag/handoff-resume/pick-unit/pick-unit-fleet.
- `H:/prism/.claude/helpers/slot-task-claim.mjs` — `claim --slot --chatId --unit` (exit 0 claimed, 1 conflict).
- `state/shared/chat-slots.json` — slots[].chatId → slot name (chatId = "claude-"+session_id.slice(0,8)).

Acceptance criteria — judge each, flag P0/P1:
1. NEVER blocks Stop — every path must exit 0 with {continue:true} (advisory). Confirm the try/catch wrapper + approveAndExit cover all paths.
2. Fail-soft — every child-process / fs call is guarded; no unguarded throw can escape.
3. Trigger correctness — fires ONLY when iter>=target (goal-cleared), NOT iter<target (that's the sibling's job). Check `isTargetMet`.
4. No infinite loop — bounded by MAX_ADVANCE stamp; verify the stamp is bumped only on a real advance, and the cap check precedes the bump.
5. Honest exhaustion (R12) — when the queue is genuinely empty (exhausted/no nextTask) it must NO-OP, never fabricate a unit or inject a directive.
6. State-mutation ordering — it dry-run-resolves (resolveNext --resolve-only) BEFORE deciding to mutate, then claims + rolls + injects. Verify no mutation happens on the no-op paths (exhausted, no-handoff, cap-hit, disabled).
7. parseUnitKey regex — does it correctly extract MILESTONE::U-ID from a pick-unit "MILESTONE / U-ID" line AND a "MILESTONE::U-ID" line? Are there inputs where it wrongly returns a partial/garbage key that would then b
... [+608 chars truncated]

### Assistant | 2026-06-08T20:20:23.865Z

I'll review this Stop hook end-to-end. Let me start by reading the target file and its sibling for convention comparison.

### Assistant | 2026-06-08T20:20:24.835Z

[tool_use: Read]

### Assistant | 2026-06-08T20:20:24.839Z

[tool_use: Read]

### User | 2026-06-08T20:20:26.353Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-goal-clear-advance.mjs — AUTONOMOUS-FLEET-MS0/U-GOAL-CLEAR-ADVANCE
5	 *
6	 * Stop hook that fires when a chat slot's /loop or /goal has CLEARED
7	 * (iter >= target, or loop-state ended target-met) and AUTO-FALLS-BACK to the
8	 * next remaining unit in the slot's task queue — own-domain-first, then
9	 * fleet-wide — instead of letting the slot go
... [+12761 chars truncated]

### User | 2026-06-08T20:20:26.405Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-force-loop-continue.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-LOOP-CONTINUE
5	 *
6	 * Stop hook that detects an ACTIVE /loop falling off the rails mid-target,
7	 * and injects a RESUME_LOOP directive into the per-agent handoff so the next
8	 * SessionStart / /startup auto-continuation picks it up.
9	 *
10	 * Problem: when a chat is running /loop
... [+8548 chars truncated]

### Assistant | 2026-06-08T20:20:38.762Z

Now let me verify the key dependencies — the `loop-state.mjs` helper to confirm the contract (`next --resolve-only` output shape, what `source` values it emits, and what a pick-unit task line looks like), and `slot-task-claim.mjs` claim exit codes.

### Assistant | 2026-06-08T20:20:39.400Z

[tool_use: Read]

### User | 2026-06-08T20:20:40.626Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-state.mjs — Per-session /loop iteration state helper.
4	 *
5	 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
6	 * chat has no idea the loop was running. This helper persists iteration metadata
7	 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
8	 *
9	 * Layout: state/shared/loop-state/loo
... [+14585 chars truncated]

### Assistant | 2026-06-08T20:20:50.594Z

Now I have the dependency contract confirmed. Two critical findings emerge from `loop-state.mjs`:

1. **`next --resolve-only` mutates state** — when `exhausted` is true AND the loop is `status:"running"`, `cmdNext` writes the loop to `status:"ended"` (lines 242-245). This contradicts the hook's claim that `--resolve-only` is a pure dry-run.
2. **`pick-unit` task line format** — line 191 shows it strips the `1. [lane/tier]` prefix, so `probe.nextTask` is `"MILESTONE / U-ID"` followed by title text on later lines, but pick-unit's `m[1]` is only the *first line* content: `"MILESTONE / U-ID"`.

Let me verify the pick-unit output format precisely and check what a real handoff RESUME line looks like (to stress-test parseUnitKey against handoff-resume sourced tasks).

### Assistant | 2026-06-08T20:20:51.952Z

[tool_use: Read]

### User | 2026-06-08T20:20:53.108Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * pick-unit.mjs — Deterministic "next unit" picker from the two master roadmaps.
4	 *
5	 * User directive (2026-05-13): "when I say pick a unit, units are picked
6	 * from those 2 road maps with development tools taking first priority."
7	 *
8	 * The two master roadmaps are encoded in state/shared/atomic-roadmap.json via
9	 *   roadmap_priority === 0  →  BACKEND-DEVT
... [+2885 chars truncated]

### Assistant | 2026-06-08T20:20:54.079Z

[tool_use: Grep]

### User | 2026-06-08T20:20:55.467Z

[tool_result] 16: *   3. Subtracts already-shipped units (cross-ref MILESTONE_PROGRESS.json).
38:const PROGRESS_PATH = path.join(ROOT, "state/shared/MILESTONE_PROGRESS.json");
39:const MILESTONES_DIR = path.join(ROOT, "mcp-server/data/milestones");
70:  // MILESTONE_PROGRESS.json shape: { milestones: [{ id, units: [{ id, shipped }] }] }
89:  const p = path.join(MILESTONES_DIR, `${milestoneId}.json`);
276:      
... [+210 chars truncated]

### Assistant | 2026-06-08T20:21:05.341Z

Confirmed the pick-unit output format. Line 276: `${i + 1}. [${p.priority}/t${p.tier ?? "?"}] ${p.milestone} / ${p.unit_id ?? "?"}`. So the line is e.g. `1. [devtools/t0] AUTONOMOUS-FLEET-MS0 / U-GOAL-CLEAR-ADVANCE`. The loop-state `pickUnitOnce` regex strips the leading `1. [..]` → `probe.nextTask = "AUTONOMOUS-FLEET-MS0 / U-GOAL-CLEAR-ADVANCE"`.

Now let me test `parseUnitKey` against the real formats and stress it with handoff-resume freeform inputs, plus verify the `--resolve-only` mutation concern empirically.

### Assistant | 2026-06-08T20:21:13.791Z

[tool_use: Bash]

### User | 2026-06-08T20:21:18.100Z

[tool_result] "AUTONOMOUS-FLEET-MS0::U-GOAL-CLEAR-ADVANCE"  <- pick-unit own lane: "AUTONOMOUS-FLEET-MS0 / U-GOAL-CLEAR-ADVANCE"
"CATALOG-APP-WIRING-MS0::U-CAM-CORPUS-FEED"   <- double-colon form: "CATALOG-APP-WIRING-MS0::U-CAM-CORPUS-FEED"
"OBSIDIAN-VAULT-OPS::U-VAULT-MAINT-CRON"      <- with trailing title: "OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON some title tex
""                                            <
... [+971 chars truncated]

### Assistant | 2026-06-08T20:21:27.718Z

This confirms the parseUnitKey false-positive hazard (#7). Two adversarial inputs produce garbage keys:
- `"Finish QUOTING-SYNERGY-MS0 / U-QP-ORCH and verify"` → `QUOTING-SYNERGY-MS0::U-QP-ORCH` (extracted from prose mid-sentence)
- `"I AM / U-TURN ahead"` → `AM::U-TURN` (garbage milestone `AM` from a prose sentence)

Now let me verify the actual severity. The critical question: can a *handoff-resume* sourced freeform task reach `parseUnitKey`+`tryClaim`? And does the `--resolve-only` mutation actually fire. Let me confirm the source-gating and the mutation empirically.

### Assistant | 2026-06-08T20:21:31.890Z

[tool_use: Bash]

### User | 2026-06-08T20:21:35.485Z

[tool_result] [rtk: batch file arguments are invalid]

### Assistant | 2026-06-08T20:21:43.787Z

rtk choked on the module flags. Let me run it as a temp file instead.

### Assistant | 2026-06-08T20:21:45.689Z

[tool_use: Bash]

### User | 2026-06-08T20:21:49.794Z

[tool_result] resolve-only json: {"ok":true,"nextTask":"XPROC-NEURAL-OPTIMIZE-MS0 / U-NN-TIER05","source":"pick-unit","exhausted":false,"rolled":false}
status before: running after: running mutated: false

### Assistant | 2026-06-08T20:22:07.503Z

Confirmed: `--resolve-only` does NOT mutate when not exhausted (the common path). The mutation only fires when genuinely exhausted (pick-unit returns nothing from all sources), in which case the hook would no-op anyway. Let me verify the exhausted-resolve-only mutation path directly to fully judge acceptance criterion #6, since that's the only edge where resolve-only writes.

### Assistant | 2026-06-08T20:22:09.178Z

[tool_use: Bash]

### User | 2026-06-08T20:22:12.913Z

[tool_result] === loop-state cmdNext resolve-only/exhausted block ===

### Assistant | 2026-06-08T20:22:26.463Z

The indexOf used a smart-quote mismatch; no matter — I already have the source from the earlier Read (lines 239-247). The exhausted+resolve-only branch sets `status:"ended"` only when `st.status === "running"`. This is benign for the hook: when the hook's probe is exhausted, the hook no-ops (line 251) and never mutates further. The state-ending in loop-state is a *correct, honest* termination, not a hook-driven side effect on a no-op path. So criterion #6 holds in practice.

I have everything needed. Let me do final analysis of the idempotency regex (#8) and verify the settings.json wiring claim isn't load-bearing for this review (the hook file itself is what I'm judging).

Let me verify one more thing — whether the hook is wired (affects whether `execPath` vs `node` matters in practice) and double-check the idempotency regex behavior on a multi-section handoff.

### Assistant | 2026-06-08T20:22:27.981Z

[tool_use: Bash]

### User | 2026-06-08T20:22:31.946Z

[tool_result] === CASE 1: RESUME_LOOP mid-file, ## section after ===
"# Handoff\n\n## State\nstuff## RESUME_LOOP\n\nNEW BLOCK CONTENT\n\n\nOLD BLOCK\n\n## Next Steps\nimportant tail\n"

=== CASE 2: RESUME_LOOP at END of file ===
"# Handoff\n\n## State\nstuff## RESUME_LOOP\n\nNEW BLOCK CONTENT\n\n\nOLD BLOCK at end\n"

=== CASE 3: no existing block (append) ===
"# Handoff\n\n## State\nstuff\n\n\n## RESUME_LOOP\n
... [+22 chars truncated]

### Assistant | 2026-06-08T20:23:17.363Z

The idempotency regex is **broken** — this is a real P1. Look at CASE 1 and CASE 2:

The replace regex `\n*## RESUME_LOOP[\s\S]*?(?=\n##\s|$)` is **non-greedy** with a lookahead for `\n##\s` OR `$` (with `m` flag, `$` matches end-of-line). The `[\s\S]*?` lazily matches as little as possible, so it stops at the FIRST `$` (end of the `## RESUME_LOOP` line itself), leaving the OLD block body behind.

Result in CASE 1: `## State\nstuff` + `## RESUME_LOOP\n\nNEW BLOCK CONTENT\n` (the new block, but **with leading `\n*` consumed** so it concatenates directly onto `stuff` → `stuff## RESUME_LOOP`) + `\n\nOLD BLOCK\n\n## Next Steps...` — **the old block body is NOT removed and the preceding `\n\n` separator is eaten, corrupting `## State` content**.

Two distinct corruptions:
1. **Old block body duplicated/orphaned** — `\n\nOLD BLOCK` survives, so each advance leaves stale `OLD BLOCK` text accumulating.
2. **Preceding section mangled** — `\n*` at the start of the regex greedily eats the blank-line separator before `## RESUME_LOOP`, gluing the new marker onto the prior section's last line (`stuff## RESUME_LOOP`).

Note: this exact regex is **copied verbatim from the sibling** `stop-force-loop-continue.mjs` (lines 149-155). So it's a pre-existing shared defect, not new to this hook — but it IS present and active in the file under review, and the prompt explicitly asks me to judge #8 on THIS file. The `m` flag making `$` match end-of-*line* (not end-of-string) is the root cause; it needs the `s`/dotall semantics or `$` without `m`.

I have enough to render the verdict.

VERDICT: FAIL

BLOCKER (P1, #8 — idempotency regex corrupts the handoff): The RESUME_LOOP replace regex `new RegExp(\`\\n*${RESUME_LOOP_MARKER}[\\s\\S]*?(?=\\n##\\s|$)\`, "m")` (line 222) is broken on replace. With the `m` flag, `$` in the lookahead matches end-of-*line*, so the lazy `[\s\S]*?` stops immediately after the `## RESUME_LOOP` marker line — it does NOT consume the old block body. Empirically (CASE 1/
... [+4625 chars truncated]
