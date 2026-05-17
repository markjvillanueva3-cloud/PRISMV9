# U-CK10 — `/pick-task` Caller Audit + Deprecation Report

**Milestone:** COMMAND-KERNEL-MS0 Phase 1
**Unit:** U-CK10
**Date:** 2026-05-17
**Author:** claude-41db1b82 (slot india)
**Status:** caller-audit complete; alias deferred
**Advisory:** `advisoryOnly: true`

## Scope

Per U-CK10 spec: "Merge /pick-task → /pick-unit alias; deprecate the
conflicting roadmap-index path." Deliverables: this caller-audit report +
optional alias file under the user-`claude-commands` dir.

## Premise correction

Spec's deliverable path lists
`C:/Users/Mark Villanueva/.claude/commands/pick-task.md` as a hardcoded
literal. Per U-CK02's "no hardcoded `wompu` / `Mark Villanueva` literals"
rule, the correct path is the **runtime-detected** user-claude-commands
dir (`C:/Users/wompu/.claude/commands/` on the current system,
auto-mirrored to `H:/.claude/commands/`). This report deliberately does
NOT pin a hardcoded literal — the alias file (if created) goes to whichever
user-claude-commands dir `psk whoami` resolves.

Verified pre-audit: **`pick-task.md` does NOT exist anywhere**
(absent at any current path; not tracked in git). The "merge" is therefore
a **caller-cleanup + alias-add** exercise, not a file-removal.

## Callers (9 files; 0 critical-path invocations)

| File | Kind | Reference type | Action needed |
|------|------|----------------|---------------|
| `.claude/commands/frontend-merge-plan.md` | skill doc | mention | retarget mention → `/pick-unit` |
| `.claude/commands/pick-dev.md` | skill doc | mention | retarget mention → `/pick-unit` |
| `.claude/commands/startup.md` | skill doc | mention | retarget mention → `/pick-unit` |
| `.claude/hooks/__tests__/pick-prefresh-resolve.test.mjs` | test fixture | string-literal in test data | leave (test verifies the OLD trigger-keyword set) — retire when CK10 alias lands |
| `.claude/hooks/pick-prefresh-inject.mjs` | UserPromptSubmit hook | trigger keyword | leave (hook surfaces stale-pickup data on either keyword; alias-safe) |
| `.claude/hooks/ollama-context-aggregator.mjs` | hook | mention | leave (descriptive context) |
| `.claude/helpers/publish-mill-master-cert.mjs` | helper | mention | leave (descriptive doc-string) |
| `scripts/expand-skill-triggers.mjs` | skill-trigger ledger generator | trigger source | retarget if it builds an authoritative trigger map → `/pick-unit` |
| `mcp-server/src/engines/AutomationChainEngine.ts` | engine | mention | leave (descriptive comment) |

## Risk classification

**None of the 9 references invoke `/pick-task` as an executable command** —
they are either:
1. **Skill-doc mentions** (3 .md files) — narrative references that should
   be updated to `/pick-unit` for accuracy but cause no runtime failure.
2. **Hook trigger keywords** (2 hook files + 1 test) — surface stale-pickup
   warnings on either `/pick-task` OR `/pick-unit`; alias-safe by design.
3. **Descriptive comments / mentions** (4 files) — zero invocation impact.

There is **no `/pick-task` keyword wired into Anthropic's slash-command
registry** (no .claude/commands/pick-task.md, no `<command-name>/pick-task`
in the project), so typing `/pick-task` already 404s at the harness level.
The unit's "merge" framing is a defensive measure against a path that
isn't currently active.

## Recommended close-out path

| Phase | Action | Rationale |
|-------|--------|-----------|
| A (now) | This audit report | Establishes the caller-set + risk profile; satisfies U-CK10's primary deliverable `state/shared/U-CK10-pick-task-callers.md`. |
| B (operator) | Add 4-line alias at `<user-claude-commands>/pick-task.md` (resolve path at write time): "⚠ DEPRECATED — use `/pick-unit`. This stub is the U-CK10 alias surface." | Future-proofs against an operator who imports a stale roadmap-index doc citing /pick-task. Adds harness-level skill so `/pick-task` doesn't 404 silently. |
| C (operator) | Retarget the 3 skill-doc mentions (`frontend-merge-plan.md`, `pick-dev.md`, `startup.md`) | Doc accuracy. Non-blocking. |
| D (deferred) | Retire `pick-prefresh-resolve.test.mjs` fixture entries when alias lands | Test-data cleanup. Non-blocking. |

Phases B-D are operator-gated because:
- B touches `<user-claude-commands>/` which is auto-mirrored C:↔H: by the
  `mirror-c-to-h` hook — should be a deliberate operator step, not a
  background /loop iter, to avoid surprise mirror-state changes.
- C-D are doc-accuracy cleanups; bundling them into a single PR with
  human review beats individual /loop commits.

## Recommendation

**Envelope flip recommended for U-CK10's audit-report deliverable
(this file).** Alias-add (phase B) + caller retargeting (phase C) remain
operator-gated follow-ups and should NOT auto-trigger an envelope flip
beyond "audit complete".

## Re-verification

Use the Grep tool with `-l --files-with-matches` against each scope:

| Scope | Pattern |
|-------|---------|
| `.claude/commands` | `pick-task` |
| `.claude/hooks` | `/pick-task\b` |
| `.claude/helpers` | `pick-task` |
| `scripts` | `pick-task` |
| `mcp-server/src` | `pick-task` |

Then verify the alias file presence at the runtime-resolved path:
`ls "<user-claude-commands>/pick-task.md"` (expect ABSENT pre-phase-B,
PRESENT post-phase-B).

## See also

- [[knowledge-vault-schema]] — U-VAULT01 (commands namespace doctrine)
- `.claude/commands/pick-unit.md` — canonical replacement
- `.claude/commands/pick-dev.md` — deterministic backend-devtools picker
