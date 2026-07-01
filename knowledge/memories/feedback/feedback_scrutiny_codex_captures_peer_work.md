---
name: feedback-scrutiny-codex-captures-peer-work
description: "scrutiny-3way.mjs codex arm captures cumulative session-base→HEAD diff which in shared-tree multi-chat mode includes peer commits. Codex then BLOCKERs peer's code, not yours. Workaround = fork to dedicated worktree BEFORE work starts, so the scrutiny diff stays clean."
aliases: feedback_scrutiny_codex_captures_peer_work
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.443Z
---


# Scrutiny codex arm captures peer-commit diffs in shared-tree mode

**Observed:** 2026-05-13 (charlie slot, claude-8912d4c2, COORD-MS0/U-COORD01 close-out).

**What happens:** `H:/prism/.claude/scripts/scrutiny-3way.mjs` runs `captureDiff` over the range `<session-base>..<target>` (120s git timeout, default `--target HEAD` or explicit `--target <sha>`). The session-base anchor walks back to whenever the chat session started. In a 6-chat shared-tree environment where peers commit during your session, that diff includes 5+ peer commits.

Codex then dutifully reviews everything in the diff, including peer code, and surfaces BLOCKERs against THEIR work. Two independent Claude reviewer agents (arm A, arm B) reviewing only YOUR change return PASS, but the 3-of-3 gate strictly requires codex PASS too — so it blocks.

**Why:** Per CLAUDE.md the gate is "strict 3-of-3 consensus — Codex CLI + Claude reviewer A (holistic) + Claude reviewer B (independent second pass) — is required". There is NO `--mark-codex pass` flag — codex is the "objective" arm and cannot be manually overridden. The script ignores manual codex marks and re-runs codex from scratch.

**Why:** Multi-chat shared-tree edits race on `H:/prism` HEAD; absorption-collisions (5 in 48h per [[reference_coord_ms0_u1_collision]] / [[reference_coord_ms0_u4_collision]] / [[reference_training_learning_ms0_u1_collision]] / [[reference_blueprint_ocr_training_ms1_collision]] / [[reference_intel_ollama_p22_u03_collision]]) leave your session diff containing peer commits whose code is not your responsibility.

**How to apply:**

1. **PROACTIVE — fork at /checkin time.** If `fleet-status.mjs` shows ≥1 active peer in a work slot, FORK to a sibling worktree BEFORE picking a unit. This keeps the scrutiny diff scoped to your changes only:
   ```bash
   git worktree add ../prism-devtools-charlie -b work/devtools-charlie
   cd ../prism-devtools-charlie
   # do all code work here
   # come back to H:/prism only for envelope/state-surface commits
   ```

2. **REACTIVE — if codex already failed on peer code, document and proceed.** Mark reviewer A + reviewer B based on substance of YOUR work; let codex stay at fail. The Stop hook blocks once, twice, three times — then auto-passes per CLAUDE.md's "After 3 block attempts the gate auto-passes with a warning (escape hatch)". Acceptable end-state when codex genuinely reviewed peer work.

3. **DO NOT** try to fight the gate — there's no `PRISM_SCRUTINY_FORCE_CODEX_PASS=1` knob, no `--mark-codex` flag. The CLAUDE.md gate is in `MINIMAL_ALLOWLIST` so even `PRISM_HOOK_PROFILE` can't disable it.

4. **DO NOT** ship more units after a codex fail in shared tree — each additional unit's commit widens the diff window and makes codex BLOCKER even more peer-code-laden. End the /loop iteration and let next session fork properly.

**Open improvement:** the script could accept `--diff-range <base>..<head>` so callers can scope to their own commits explicitly. Track as a separate devtools unit.

Companion to [[feedback_conflict_fork_rule]] (the parent rule that forking solves both absorption AND scrutiny scope).
