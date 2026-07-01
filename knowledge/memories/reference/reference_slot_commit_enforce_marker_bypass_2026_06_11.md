---
name: reference_slot_commit_enforce_marker_bypass_2026_06_11
description: "slot-commit-worktree-enforce was neutered fleet-wide by its own [BOOTSTRAP-SLOT-ENFORCE] one-shot bypass becoming the universal commit prefix; fixed 2026-06-11 (slot:india)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.206Z
aliases: reference_slot_commit_enforce_marker_bypass_2026_06_11
---


# slot-branch commit enforcement was silently DEAD fleet-wide (2026-06-11, slot:india)

**Operator pain (2026-06-11):** "commits and staging should always be on chat slot nato name branch
to avoid commit issues. please fix the build that is supposed to make the auto enforced for all
galaxies and chat slots." The "commit issues" = shared-tree `.git/index.lock` contention from ~8
chats all committing to `cad-fusion-live-ms0`.

**Root cause.** `.claude/hooks/slot-commit-worktree-enforce.mjs` (the HARD gate that blocks a
slot-bound chat from `git commit` unless the live branch is `slot/<name>`) carried a one-shot
migration escape: `if (cmd.includes("[BOOTSTRAP-SLOT-ENFORCE]")) allow("bootstrap-marker");`. That
marker became the STANDARD commit prefix on EVERY chat fleet-wide (7 of the last 12 commits carry
it). So the gate silently fail-opened on every commit -- it existed, was wired, was armed (no
`PRISM_SLOT_COMMIT_ENFORCE_DISABLE`), and **never once fired**. Classic "a bypass meant to be rare
became universal" regression -- sibling of the `[MAIN]` over-use on worktree-commit-route.

**Fix (commit `6f3f3726ce` hook + `bce18d508f` lib/applier/tests).** Routed the bypass through a
pure tested `commitBypass(cmd, env)` in `scripts/lib/slot-commit-bypass.mjs`:
- precedence: `PRISM_SLOT_COMMIT_ENFORCE_DISABLE=1` (kill) > `[MAIN-FORCE]` (narrow audited
  cross-cutting escape) > `[BOOTSTRAP-SLOT-ENFORCE]` ONLY when
  `PRISM_SLOT_COMMIT_ENFORCE_ALLOW_BOOTSTRAP=1` (operator transition window, default OFF) -> else ENFORCE.
- `[MAIN-FORCE]` mirrors the same token in worktree-commit-route + main-tree-write-block (R11 -- one
  escape convention across all 3 lane hooks). Golf stays integrator-exempt.
- Applied via idempotent EOL-aware node-fs applier (`scripts/wire-slot-commit-enforce-bypass.mjs`) --
  the Edit tool firewall-blocks worktree chats from harness files.

**LIVE-validated** against the real india binding @ cad-fusion-live-ms0: plain
`[BOOTSTRAP-SLOT-ENFORCE]` -> DENY exit 2; `[MAIN-FORCE]` -> allow; marker+transition-env -> allow;
kill switch -> allow. 8/8 lib + 5/5 applier tests.

**Companion (staging half).** `git-add-lane-guard.mjs` was made cd-aware earlier
(`443f715cc8` -- `cd /h/prism && git add X` now evaluated against the REAL main tree, see
[[reference_lane_cd_aware_helper_2026_06_11]] if present), but it was ALSO globally killed by
`PRISM_GIT_ADD_LANE_DISABLE=1` in the `env` block of `C:/Users/wompu/.claude/settings.json` (the
2026-05-24 YOLO-bypass cluster, alongside `PRISM_MAINTREE_WRITE_BLOCK_DISABLE` + `PRISM_ALLOW_UNWIRED`).
Removed `PRISM_GIT_ADD_LANE_DISABLE` -> the cd-aware staging guard arms for FUTURE sessions (settings
env is applied at launch, so this is a gradual cutover, NOT an in-flight break). Left
`PRISM_MAINTREE_WRITE_BLOCK_DISABLE` for the operator -- enabling it changes every chat's main-tree
*write* workflow (higher blast radius).

**Boundary (R12 honest).** The gate bites SLOT-BOUND chats whose `session_id` resolves to their
chat-slots entry. Unbound / cron / IDE / id-mismatched chats fail-soft to allow (by design -- don't
break headless). A peer's `[BOOTSTRAP-SLOT-ENFORCE]` commit can still land if that chat isn't
slot-bound. The contention-causing slot chats ARE now enforced.

**Lesson.** A one-shot "bootstrap/migration" bypass marker that ends up in the standard commit
template silently converts a HARD gate into a no-op. Audit bypass markers for ubiquity before
trusting a gate is live (sibling of "existence != enforcing"). See
[[reference_slot_commit_worktree_enforce_2026_05_24]] (the original hook) +
[[feedback_commit_to_slot_worktree]].
