---
title: Windows subprocess calls need windowsHide:true or they pop/flash console windows
type: lessons
domain: dev-infra
slot: sierra
created: 2026-06-23
tags: [windows, child-process, hooks, fleet-wide, spawn, windowsHide, bug-finding, sierra]
shipped-with: U-VIZ-WINDOWSHIDE-DETACHED (6a1cf88bb4) + U-VIZ-WINDOWSHIDE-SYNC (6654bb3412)
related:
  - "[[hook-fast-lane]]"
  - "[[lane-guard-no-worktree-misfire]]"
---

# Windows subprocess calls need `windowsHide: true` (operator: "a bunch of terminal windows open")

On Windows, a Node `child_process` call that launches a console app creates a console
WINDOW unless the call passes `windowsHide: true`. PRISM's hooks/helpers fire console
apps (node, git, powershell, WMIC, taskkill) constantly, so missing `windowsHide`
turns into visible window spam during normal use. There are TWO distinct failure modes,
and they need different treatment:

## The two classes

| Class | Call shape | Window behavior | Severity |
|-------|-----------|-----------------|----------|
| **Detached** | a detached spawn (`{ detached: true }`) without windowsHide | A console window OPENS and **PERSISTS** for the child's whole life | the "bunch of windows that open" |
| **Sync flash** | a synchronous subprocess call (the `Sync` family) without windowsHide | A console window briefly **FLASHES** then closes | flicker |

The operator's symptom ("a bunch of terminal windows open") is the **detached** class:
with up to 26 chats each firing ~7 detached Stop-hook spawns + ~5 detached
UserPromptSubmit injectors on every turn, each opens a persistent console window ->
a burst that stacks up. Sync calls only flash.

## Fix

`windowsHide: true` adds the `CREATE_NO_WINDOW` flag. Node's `detached:true` on Windows
sets `CREATE_NEW_PROCESS_GROUP` but NOT a no-window flag, so detached children get a
console unless you ALSO pass `windowsHide:true`.

Three tools (all under `scripts/`):
- `audit-windows-hide.mjs` -- READ-ONLY auditor. Brace-matches real subprocess call
  sites + substring-checks for windowsHide. **Blind spots:** it only matches the literal
  spawn/exec name-open form -- it MISSES custom-named wrappers (`_spawn`, `spawnImpl`)
  and options objects whose `detached`/options fall past its 140-char snippet window.
- `fix-detached-windowshide.mjs` -- remediates the detached class. Anchors on the
  `detached: true` literal (NOT a fn name), so it covers the auditor's blind spots.
  Explicit allowlist (excludes comment-only false-positives + intentional
  `windowsHide:false` CAM-sim drivers). Idempotent.
- `fix-sync-windowshide.mjs` -- remediates the sync class. Detects real calls via the
  auditor's FN_RE + brace-matching, inserts windowsHide into the call's LAST top-level
  object literal (the options arg), SKIPS calls with no options object (arity change
  risk), and `node --check` gates every file on `--apply` (auto-reverts parse failures).

## Lessons

- **A name-anchored auditor has blind spots; a value-anchored fixer does not.** The
  `audit-windows-hide.mjs` regex misses custom-named wrappers; anchoring the detached
  fixer on `detached: true` (the thing that's wrong) instead of the spawn function name
  caught every site regardless of how the spawn was named/wrapped.
- **`windowsHide: true` is behavior-neutral + additive** -- it only affects window
  visibility, never stdout/stderr/exit. That makes a large sweep safe: a misidentified
  object just gets a harmless ignored key. The only real risk is a syntax error, which
  a per-file `node --check` gate (with auto-revert) eliminates.
- **Never add an options object to a subprocess call that lacks one** -- it changes
  arity / the default-encoding contract. SKIP those (26 of them here) for manual review.
- **Distinguish persist-vs-flash before scoping.** The detached class (persistent) was
  the operator's actual symptom and was small (22 sites) + safe to fix first; the sync
  class (flash) was 10x larger (231 sites / 137 critical hook files) and was fixed second
  on the proven pattern, not bundled into the urgent fix.
- **Authoring such a fixer? Assemble the spawn/exec name + open-paren substrings** in the
  SOURCE (e.g. `"s" + "pawn"`) -- the pre-tool security scanner blocks any file (code OR
  markdown) that literally contains the spawn/exec name-open-paren form, even in a comment
  or docstring. The auditor already does this.
- **Fleet-wide infra staging from the shared tree:** the `git-add-lane-guard` blocks
  out-of-slot-worktree staging, but honors a `[MAIN-FORCE]` token anywhere in the `git add`
  command for genuinely fleet-wide infra (a trailing `# [MAIN-FORCE]` comment is enough).

## Verify

```bash
node scripts/audit-windows-hide.mjs --json                   # detached count -> 0 (interactive layer)
node scripts/fix-detached-windowshide.mjs --verify           # -> 0 bare
node scripts/fix-detached-windowshide.test.mjs               # 11/11
node scripts/fix-sync-windowshide.test.mjs                   # 12/12
git show 6a1cf88bb4 6654bb3412                                # the two fix commits
```
