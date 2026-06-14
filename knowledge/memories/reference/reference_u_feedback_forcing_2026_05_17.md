---
name: reference-u-feedback-forcing-2026-05-17
description: U-FEEDBACK-FORCING shipped 2026-05-17 lima — 4-tier resolveUnitKey fallback closes the bare-U-ID picked-events gap in pick-prefresh-inject
aliases: reference_u_feedback_forcing_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.000Z
---


**U-FEEDBACK-FORCING ([[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]])** — shipped 2026-05-17 from recovered lima slot, commit `b1e599d5fc`. Closes the feedback-loop blocker noted in [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]: previous `extractUnitKey(prompt)` only matched composite `MS::U-...` keys; bare `U-...` ids in `/pick-unit`/`/checkin`/`/loop` returned null → 0 picked events fleet-wide → re-rank algorithm starved of data forever.

**New `resolveUnitKey(prompt, stdin)` returns `{unitKey, resolutionSource}` via 4 tiers:**
1. `composite-typed` — `MS::U-...` in prompt (unchanged baseline)
2. `claim-by-bare-id` — bare `U-...` in prompt + exactly ONE fresh `slot-task-claims.json` entry tail-matches `::<U-ID>`. Ambiguous (2+ matches) falls through, never guesses.
3. `claim-by-slot` — chat's own active claim, derived via `stdin.session_id → claude-<first-8-hex> → chat-slots.json → slot-task-claims[slot]`. Used when prompt has no id at all.
4. `current-position` — `state/shared/CURRENT_POSITION.md` parsed in 3 shapes: bare `MS::U-...` token, frontmatter `milestone:`+`unit:` lines, commit-subject `[MS]/U-...` token.

**Freshness gate:** `isClaimFresh()` uses `expiresAt` (authoritative) then `lastHeartbeat` against `CLAIM_FRESH_MS=30*60*1000`. Stale claims excluded — using one corrupts the feedback loop.

**Telemetry:** `resolutionSource` is threaded into every `picked` AND `stale-on-pickup` JSONL event so `rgs-outcome-record-stop.mjs` re-rank can distinguish typed-composite (signal) from fallback-resolved (signal of operator intent + system state).

**Why this is load-bearing:** the entire RGS-TOOL-AUTOINVOKE feedback-loop architecture rests on picked events accumulating. Without bare-id resolution, the loop was dead code shipping zeros into the re-rank algorithm. Now bare `/pick-unit U-FOO` produces a picked event with `resolutionSource: claim-by-bare-id` when slot has an active claim, OR `current-position` when CURRENT_POSITION.md is populated.

**Lessons:**
- *Hermetic-test trap (echoed from [[reference_rgs_tool_autoinvoke_ms1_2026_05_16]]):* the original tests used FAKE shape `{plan:..., sourceHash:...}` for sidecar entries; U-INTEG-FIX-P0 fixed the producer to write flat but missed 3 test fixtures. They passed-by-luck on header-rendering assertions while body was always empty. Re-running tests after my hook edit surfaced this — fixed in same commit (one-line `{...SAMPLE_PLAN, stale:true}` per fixture).
- *Parent-env leakage in subprocess tests:* `runHook()`'s `env:{...process.env, ...overrides}` lets `PRISM_PICK_PREFRESH_DISABLE=1` or `PRISM_RGS_TOOL_PLAN_INJECT=0` from the operator shell silently neutralize the hook. Reviewer B P0. Fix: explicitly `""` those knobs in the test env. Add to standard test-harness checklist.
- *Worktree-route hook collateral staging:* `git add <paths>` followed by a worktree-route block then re-add captured an unrelated peer-untracked `dev-tool-leverage.md` into my commit. Cause not fully understood; suspect a recovery hook auto-runs `git add -u`. Notified peer via chat-bus. Mitigation idea: `git diff --cached --stat` before every commit, fail-loud on unexpected paths. Memory: [[feedback_pre_commit_stage_audit]] *(unwritten, pending dedicated incident)*.
- *Regex-suffix invariant test* (Reviewer B recommendation): prompt `U-FOO-BAR-EXTRA` MUST NOT match claim `MS-Z::U-FOO` via prefix-of-suffix. Test added: `pick-prefresh-resolve.test.mjs:140-160` — guards future weakening of the `endsWith("::"+bareId)` check.

**New env knobs:** `PRISM_SLOT_TASK_CLAIMS_PATH`, `PRISM_CHAT_SLOTS_PATH`, `PRISM_CURRENT_POSITION_PATH` (all test-only; production reads canonical `state/shared/*` paths). `CHAT_ID_HEX_LEN=8` constant ties to `.claude/helpers/stable-session-id.mjs` derivation — keep in sync.

**Tests:** 30/30 PASS (16 tool-plan + 14 resolve). 2-reviewer per-file scrutiny: arm A PASS, arm B FAIL→FIX→PASS with 2 P0s addressed.

**Recovery context:** old lima chat crashed leaving no in-flight handoff, no slot-task-claim, no chat-bus mentions. Lima's last documented work was [[reference_rgs_tool_autoinvoke_ms1_2026_05_16|RGS-TOOL-AUTOINVOKE-MS1]] P0 close-out (`b287c1614`/`f32c4678a`). "Where it left off" = next unit in the MS1 punch-list documented order. P1 backlog remaining after this: U-RIE-ADAPTER, U-CALIBRATION, U-TRANSFER.
