---
name: reference-precompact-hookspecificoutput-contract-fix-2026-06-22
description: Two PreCompact hooks emitted an invalid hookSpecificOutput verdict (rejected by the harness on every /compact); class fixed by routing the message to top-level systemMessage. slot:alpha SESSION-STACK.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.121Z
aliases: reference_precompact_hookspecificoutput_contract_fix_2026_06_22
---


# PreCompact `hookSpecificOutput` contract bug (class) -- slot:alpha, 2026-06-22

**Symptom (live, surfaced in the /compact log):**
`PreCompact precompact-memo-emit.mjs failed: Hook JSON output validation failed -- (root): Invalid input`. The hook emitted `{ continue:true, hookSpecificOutput: { hookEventName:"PreCompact", additionalContext } }`.

**Root cause:** PreCompact has **no `hookSpecificOutput` contract**. The harness output schema only supports the `hookSpecificOutput` sub-object for `PreToolUse | UserPromptSubmit | PostToolUse | PostToolBatch | Stop`. For PreCompact the valid top-level fields are `continue, suppressOutput, stopReason, decision, reason, systemMessage, terminalSequence, permissionDecision`. So the verdict was **rejected on every /compact fleet-wide**, silently dropping the hook's informational message. (The memo file write itself still happened -- it runs before the emit -- so only the message + a clean contract were lost; but the validation error polluted every fleet /compact.)

**Fix (the class, R16):** route the message through the top-level `systemMessage` field, matching sibling PreCompact hooks (`claude-brief-precompact`, `precompact-handoff`, which were always correct). Extracted a pure exported verdict-builder in each hook so the contract is unit-testable (R9 regression lock: assert `"hookSpecificOutput" in verdict === false`).

**Two instances found + fixed (grep `hookEventName: "PreCompact"` in `.claude/hooks/`):**
- `precompact-memo-emit.mjs` -> `buildVerdict()` -- commit `16ceecbe8f` `U-PRECOMPACT-MEMO-CONTRACT`. Fired on EVERY /compact. 21/21 tests (16 prior + 5 new), live-validated.
- `precompact-release-slot.mjs` -> `buildVerboseVerdict()` -- commit `36ba91cbf1` `U-PRECOMPACT-RELEASE-SLOT-CONTRACT`. **Latent** (only the `PRISM_PRECOMPACT_RELEASE_SLOT_VERBOSE=1` branch), but it dropped the "slot remains claimed" failure warning exactly when release failed. New 8-test file (contract + `stableIdFromSession` happy/3-failure/2-adversarial), live-validated on the failure branch.

**NOT a bug (verified, do not "fix"):** `precompact-auto-trigger.mjs:532` emits `hookSpecificOutput: { hookEventName: event }` -- a DYNAMIC event name, and it is a PreToolUse/UserPromptSubmit hook, so the shape is valid.

**Lesson:** a hook's `hookSpecificOutput` is only valid for the 5 events that define that sub-contract; PreCompact (and other lifecycle events) must use `systemMessage` for informational text. When you find one hook with a hardcoded wrong `hookEventName`, grep the whole hooks dir for the literal -- it is almost always a copy-paste class, not an instance (R16). Related: [[reference_compact_boundary_format_fix_2026_06_10]].
