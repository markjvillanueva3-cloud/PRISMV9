---
name: quick-archive
title: Quick Archive — One-Command Skill/File Bucket Archive
description: Sweep matching skills/files to commands-archive/ in one operation. Companion to HS-06 Phase 3 archive sweeps and the archived-skill-suggest recall hook. Reversible by mv back.
type: skill
model: sonnet
effort: medium
context: development
allowed-tools:
  - Bash
  - Read

# ── PRISM auto-trigger frontmatter ──
# FORWARD-COMPAT: read by Phase D's skill-auto-trigger.mjs once shipped.
triggers:
  - event: UserPromptSubmit
    matcher:
      type: keyword
      value: "archive skills|phase 3 archive|bulk archive|skill cleanup|HS-06 phase 3"
    score: 0.90
    action: suggest

# ── Pipeline integrations ──
pipeline_integrations:
  - pipeline: hs-06-phase-3   # CLAUDE.md doctrine — bulk archive of buckets F+G+H
    phase: bulk-sweep
    trigger: "operator explicit phase-3 invocation"
    action: invoke
  - pipeline: dedup           # /dedup standalone — uses /quick-archive as the action arm
    phase: post-dedup-action
    trigger: "after dedup identifies redundant skill copies"
    action: invoke

# ── Loop contract ──
# /quick-archive is fundamentally one-shot (a single mv operation per pattern).
# Loop mode is supported for incremental archive (e.g. archive matching wedm-*,
# then matching lathe-*, etc.) but each iteration is a fresh invocation; no
# state-carry between iterations beyond the filesystem state itself.
loop_contract:
  max_iterations: 5
  initial_delay: 0
  inter_iteration_delay: 0
  break_when: converged       # converged = no more files match the pattern
  state_signal: filesystem    # commands/ vs commands-archive/ presence
  rollback_on_runaway: false  # mv is reversible per-file; no auto-rollback
  done_signals:
    - '{"done": true, "verdict": "ARCHIVED", "count": <N>}'
    - '{"done": true, "verdict": "NO_MATCH", "count": 0}'

# ── Upstream / downstream impact ──
impact:
  upstream:
    - HS-06 Phase 3 doctrine (CLAUDE.md, archive remaining buckets F+G+H)
    - operator manual invocation
    - /dedup post-dedup-action
  downstream:
    - .claude/commands/ filesystem state (mv'd files no longer in active manifest)
    - .claude/commands-archive/ filesystem state (target directory)
    - archived-skill-suggest.mjs cache invalidation (cacheKeyFromSkills detects new names)
    - wiki regen (skill entries get rebuilt if regen-wiki-from-viz runs post-archive)
    - CLAUDE.md AUTO-REGISTRY (once Phase D ships, regen reflects archived skills)
    - git index (force-add new commands-archive/ entries to track)
  bounded: true
  reversible: true   # mv back from commands-archive/ → commands/ restores any skill
composes_with:
  - "/dedup"
  - "/scrutiny-batch"
---
# /quick-archive — One-Command Skill/File Bucket Archive

> **Goal:** turn the HS-06 Phase 3 multi-step manual archive (find + mv + git add + regen + commit) into a single skill invocation. Reversible per-file via `mv` back.
>
> **Built for:** HS-06 Phase 3 closure (target: get commands/ from 141 → ~50-75 active skills). Also usable for ad-hoc category sweeps once the archived-skill-suggest recall hook (commit `e27f4e212`) is in place.

## When to use

- After approving an HS-06 Phase 3 bucket (e.g. archive all `forge2..6` legacy versions; archive all per-vendor CAM guides except mastercam)
- When `/dedup` flags a category of duplicates and wants a one-shot sweep
- For ad-hoc cleanup of namespaced subdirs (`.claude/commands/<ns>/`) where every file matches the archive criterion

## When NOT to use

- For SINGLE files → just `mv` directly, don't add this skill's overhead
- For files outside `.claude/commands/` — this skill is scoped to the skill manifest archive only; for engine archives, knowledge dirs, etc., use `mv` + `git mv` directly
- For DESTRUCTIVE deletion → this skill never deletes; it only moves to `commands-archive/`. If you want deletion, do it manually + commit explicitly

## Usage

```
/quick-archive <glob-pattern>                          # e.g. /quick-archive "forge[2-6].md"
/quick-archive --bucket=<name>                          # named bucket from HS-06-SMART-RECALL-PLAN.md (E, F, G, H, etc.)
/quick-archive --subdir=<ns>                            # archive an entire namespace subdir (e.g. --subdir=sparc)
/quick-archive --pattern <glob> --dry-run               # show what would move, don't execute
/quick-archive --pattern <glob> --no-commit             # mv + git add, no auto-commit
/quick-archive --restore <name>                         # reverse: mv from archive back to active
```

## Protocol — what Claude does when invoked

### Step 0 — Resolve target file list
- If `<glob-pattern>` given → expand against `.claude/commands/**/*.md` (do NOT cross into `.claude/commands-archive/`)
- If `--bucket=<name>` → look up the bucket's pattern from `state/shared/HS-06-SMART-RECALL-PLAN.md` **§P2.5 Bucket Pattern Reference Table** (defines E/F/G/H/etc.). If §P2.5 isn't present yet, the operator must pass an explicit `--pattern` instead (skill should warn + suggest the equivalent --pattern shape).
- If `--subdir=<ns>` → `.claude/commands/<ns>/*.md` (entire subdir)
- Filter: skip any file already in `commands-archive/`
- If file list empty → emit `{"done": true, "verdict": "NO_MATCH", "count": 0}` and exit
- **Hard cap:** if file list > 100, prompt operator before proceeding (token-cost guardrail)

### Step 1 — Compute archive target paths
For each source file `commands/<rest>/<name>.md`:
- Target: `commands-archive/<rest>/<name>.md` (preserve subdir structure)
- For top-level files (no subdir): target is `commands-archive/_flat-variants/<name>.md` (matches HS-06 Phase 2 convention from commit `e27f4e212`)
- Create target directories with `mkdir -p` if missing

### Step 2 — Dry-run preview (always show before execute)
Print a table:
```
┌─ /quick-archive (DRY-RUN PREVIEW) ─────────────────────
│ Pattern:    <glob>
│ Match:      <N> files
│ Targets:
│   commands/<a>.md      → commands-archive/<a>.md
│   commands/<b>.md      → commands-archive/<b>.md
│   ...
└──────────────────────────────────────────────────────
```
If `--dry-run` flag → exit here.

### Step 3 — Execute moves
- For each pair, wrap in per-file try/catch (Windows NTFS `mv`/`Move-Item` throws on source-missing rather than skipping gracefully — the second of two concurrent chats racing the same pattern will see ENOENT for already-moved files):
  - try: `mv <source> <target>`
  - catch source-missing (ENOENT): log "skipped — peer chat already archived" and continue to next file
  - catch target-already-exists: log "skipped — already archived (older version)" and continue
  - catch other (permission, IO, etc.): log error + halt batch (do NOT silently swallow)
- Track success count + any failures separately
- Total moved count: `M`; skipped count: `S`

### Step 4 — Git stage + auto-commit (unless --no-commit)
- **commands/ side (source):** if a moved-from skill was previously force-tracked (rare — only ~4 skills are tracked despite gitignore), `git rm --cached commands/<file>` to remove from index. For the typical case where the source was NOT tracked, skip (no index entry to remove).
- **commands-archive/ side (target):** `git add -f commands-archive/<file>` (the `-f` is needed because the rule `.claude/commands-archive/` may also be ignored on some setups; check with `git check-ignore`). Verify with `git diff --cached --name-only` before committing.
- Commit with auto-generated message:
  ```
  [MAIN] [DEV-VELOCITY-AUTOTRIGGER-MS0]/U-A2-QUICK-ARCHIVE-<timestamp>: archive <M> skills via /quick-archive
  ```
- Append rationale block (which pattern, why this bucket, link to plan doc)

### Step 5 — Invalidate caches + trigger wiki regen
- The `archived-skill-suggest.mjs` corpus cache (`tmp/prism-archived-skill-cache/`) auto-invalidates on next fire because `cacheKeyFromSkills()` hashes the sorted skill names — moving files changes the hash.
- **HOWEVER:** the recall hook does a SET INTERSECTION of (filesystem archive walk) ∩ (`_leaf-index.jsonl`). Newly-archived skills are in the filesystem walk but NOT in the leaf-index until wiki regen runs. Until then, the recall hook is BLIND to the newly-archived skills (corpus excludes them).
- **Default behavior (operator omits --regen):** queue regen for the next hourly cron. Surface a warning: "RECALL BLIND WINDOW: archived-skill-suggest will not surface these skills until wiki regen completes (next hourly cron, ~XX:00). Pass --regen to run regen now (~8min)."
- **With --regen:** trigger `scripts/regen-wiki-from-viz.mjs` synchronously (~8min). Block until complete. Then the recall hook is live for newly-archived skills.
- Restoration via `--restore <name>` produces the inverse blind window. Same warning applies.

### Step 6 — Surface results
Print:
```
┌─ /quick-archive (DONE) ──────────────────────────────
│ Pattern:     <glob>
│ Moved:       <M>/<N> files
│ Skipped:     <failed/already-archived>
│ Commit:      <sha> (or "skipped — --no-commit")
│ Manifest:    commands/ <was> → <now> skills
│ Recall:      archived-skill-suggest cache will refresh on next prompt
└──────────────────────────────────────────────────────
```
Emit terminal verdict JSON per `loop_contract.done_signals`.

## Implementation notes

- **Reversibility + `--restore <name>` resolution:** `<name>` accepts THREE forms (in order of preference):
  1. **wikiName** (canonical) — e.g. `sparc-coder` (lowercase, hyphen-flattened, matches `_leaf-index.jsonl`'s `name` field)
  2. **invokeName** (harness slash form) — e.g. `sparc:coder` (raw case, colon-namespace; this is what `/sparc:coder` resolves to in the harness)
  3. **basename** (fallback, only if unambiguous) — e.g. `coder` (matches the .md filename without namespace)
  If `<name>` is ambiguous (matches multiple archived files via basename), the skill MUST reject with a multi-hit error listing the candidates rather than silently picking one. Caller responsible for any cleanup of the now-empty namespace subdir in commands-archive/ after restore. **`mkdir -p $(dirname <target>)` before mv** in case the target subdir was previously cleaned up.
- **Conflict handling:** if a target path already exists in `commands-archive/`, the operation skips that file (does NOT overwrite). This is intentional — prevents accidental loss of an existing archived version.
- **Multi-chat safety:** `mv` is atomic per-file on the same volume. Two chats running `/quick-archive` simultaneously on disjoint patterns are safe. Same-pattern collision: whichever runs first wins; the second sees "skipped — already archived". Acceptable.
- **Empty subdirs:** after `mv`, source subdir may be empty. Leave it (git tracks files not dirs; empty dirs are harmless).
- **Recall hook coverage:** archived skills become recall-discoverable on the NEXT prompt that matches their wiki description. Cache refresh is automatic.
- **Plan reference:** target buckets are defined in `state/shared/HS-06-SMART-RECALL-PLAN.md` §P2 (table mapping bucket letters to skill categories). Use that as the source of truth for which patterns to sweep.

## What this skill does NOT do

- Does NOT delete files; only moves them. To delete, follow with manual `rm` + explicit commit.
- Does NOT modify wiki entries directly. Wiki regen is triggered as a downstream effect.
- Does NOT bypass the per-file scrutiny gate for files in the batch — but archives are advisory state changes (no logic mutation), so scrutiny is light-touch (a single `reviewer` agent over the commit diff is sufficient).
- Does NOT touch `.claude/commands/` files that aren't matched by the pattern.
- Does NOT auto-restore archived files; restoration is operator-initiated via `--restore`.

## Examples

### Example 1 — HS-06 Phase 3 bucket F (versioned legacy)

```
/quick-archive --pattern "forge[2-6].md" --pattern "rgs[2-5].md" --pattern "autopilot-*.md"
```

Sweeps the legacy versioned files (forge2..6, rgs2..5, autopilot variants), keeping only the latest (forge7, rgs6 or rgs, autopilot itself).

### Example 2 — Per-vendor CAM cleanup

```
/quick-archive --pattern "{nx,powermill,catia,solidcam}-{setup,strategy-guide}.md"
```

Archives all per-vendor CAM setup/guide skills except mastercam (JM Die's primary CAM).

### Example 3 — Dry-run before commit

```
/quick-archive --pattern "lathe-*.md" --dry-run
```

Shows what would move; nothing happens until you re-invoke without `--dry-run`.

### Example 4 — Restore a single skill

```
/quick-archive --restore sparc-coder
```

mv's `commands-archive/sparc/coder.md` back to `commands/sparc/coder.md` (or top-level if it was a flat-variant). Commits as `[MAIN] [HARNESS-STAB]/U-QUICK-ARCHIVE-RESTORE: restore /sparc:coder from archive`.

## See also

- `state/shared/HS-06-SMART-RECALL-PLAN.md` — the master plan + bucket definitions
- `.claude/hooks/archived-skill-suggest.mjs` — the recall companion (auto-suggests archived skills when keywords match)
- HS-06 Phase 1 commit `d81fc8009` — first 85 bucket-E archives (pattern reference)
- HS-06 Phase 2 commit `e27f4e212` — 29 bucket-C/D archives + recall hook wired
- `state/shared/SKILL-AUTO-TRIGGER-PLAN.md` — the milestone this skill is part of (Phase A.2)
- `/scrutiny-batch` (sibling, Phase A.1) — for batch-scrutinizing the commit diff
- `/dedup` — upstream consumer; flags redundant skill copies and can pipe to this
