---
name: reference_precompact_autotrigger_disabled_99m_2026_06_11
description: CRUX -- precompact auto-trigger is DISABLED fleet-wide by an OS-level env override PRECOMPACT_{SOFT,HARD}_TOKENS=99000000 (not in any settings/tracked file). This is why 90-95% auto-precompaction never fires. Stale workaround for the now-fixed false-compaction bugs.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.120Z
aliases: reference_precompact_autotrigger_disabled_99m_2026_06_11
---


# Precompact auto-trigger is env-DISABLED fleet-wide (2026-06-11, slot:alpha)

Operator wants: at 90-95% ctx, each slot auto-initiates a MODEL-authored optimal handoff. It does NOT
happen. **Root cause (verified, not guessed): the OS environment sets `PRECOMPACT_SOFT_TOKENS=99000000`
and `PRECOMPACT_HARD_TOKENS=99000000` (99 MILLION).** The hook reads `process.env.PRECOMPACT_HARD_TOKENS
|| 940_000`, so the threshold is 99M -- at 945K/950K tokens `tokens >= HARD(99M)` is never true -> the
SOFT nudge + HARD block NEVER fire -> no precompaction directive ever reaches the model -> chats sail to
native autocompact@95% with only the helper-stub handoff.

## How verified
Clean spawnSync probe (fixtures via fs.writeFileSync, not shell echo -- the iter-2 probes were quoting-
broken): sidecar 945K -> `{"continue":true,"suppressOutput":true}` (silent); assistant 950K -> same; AND
the probe printed `PRECOMPACT_HARD_TOKENS=99000000 SOFT=99000000` from process.env. The hook CODE is
correct (block-cond `tokens >= HARD && !precompactAlreadyArmed`, HARD=`env || 940_000`). It is the ENV
that defeats it. This also explains the 5 "failing" precompact-auto-trigger tests: they inherit
process.env (99M) and never reset it, so the hook never blocks and the block-expecting tests fail. NOT a
code regression -- an env override masking the whole mechanism.

## Where the override lives
NOT in C:/ or H:/ settings.json / settings.local.json (grep clean). NOT in any H:/.claude launcher
(grep for 99000000 hit only OLD archived transcripts). => it is a **machine-level env var** (Windows
System/User environment, or an external launcher/profile that exports it before `claude` starts). The
operator likely set it to silence the OLD false-compaction spam (the byte-phantom + lifecycle
false-MANDATORY bugs -- BOTH fixed now: 0a966b5696 + 6b5d3a85e4). The workaround is now stale AND is the
exact blocker of the operator's new request.

## Fix = ship AUTO-COMPACTION-MODEL-HANDOFF-MS0 (spec: state/shared/specs/AUTO-COMPACTION-MODEL-HANDOFF-MS0-SPEC-2026-06-11.md)
Logical order, all three together (do NOT do U2 alone):
- **U1** rewrite precompact-auto-trigger SOFT/HARD directive -> MODEL authors an optimal handoff (template
  in spec), explicitly NOT the stub-helper skill.
- **U2** restore real thresholds: remove the OS `PRECOMPACT_{SOFT,HARD}_TOKENS=99000000` at its source
  (System env / launcher), OR override in settings.json env (`PRECOMPACT_SOFT_TOKENS=880000`,
  `PRECOMPACT_HARD_TOKENS=940000`) IF the harness applies settings env over inherited OS env for hook
  spawns (VERIFY first -- spawn a hook with the settings present and confirm it reads 940000 not 99M).
- **U3** precompact-handoff.mjs defers to a fresh model handoff (no generateSmartResume stub / padFileToBytes).
WHY not U2 alone: re-enabling the trigger without U1 restores the banned stub-path AND starts blocking
live sessions at 94% mid-work. Pairs with [[reference_compaction_false_trigger_fix_2026_06_11]] (the
false-trigger fix that makes removing this workaround SAFE) + [[reference_injection_throttle_tuning_2026_06_11]].
