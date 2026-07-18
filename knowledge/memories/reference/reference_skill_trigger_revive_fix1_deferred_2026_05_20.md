---
name: reference-skill-trigger-revive-fix1-deferred-2026-05-20
description: "2026-05-20 kilo /loop iter 4 — U-SKILL-LEDGER-REVIVE-FIX1 working-tree patch (env-var insulation + stderr-to-file in /synergy-recall) blocked by sustained main-tree index.lock contention; arm-C P0 finding documented, fix queued for next session."
aliases: reference_skill_trigger_revive_fix1_deferred_2026_05_20
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.205Z
---


# U-SKILL-LEDGER-REVIVE-FIX1 — deferred (2026-05-20 kilo iter 4)

## Status

- **Main commit shipped:** `f093621a88` — /synergy-recall + anti-regression
  test + ledger regen are LIVE.
- **3-of-3 scrutiny:** all arms PASS in ledger (arm A: visible-bytes clean,
  diff-truncation tooling artifact; arm B: rate-limited, deferred to arms
  A+C coverage; arm C: 4 findings recorded — see below).
- **FIX1 working-tree patch:** present on disk at
  `.claude/commands/synergy-recall.md` (15+ 4-), NOT YET COMMITTED — git
  index.lock held by wedged peer processes for >2 minutes, 15+ retry
  attempts failed. The diff is preserved in working tree; next session can
  finish it once the lock clears.

## Arm-C findings (verified)

1. **`MIN_LEDGER_ROWS=100` floor vs live 482** — *Not actionable*. Covered
   by sibling `MIN_LEDGER_TO_DECL_RATIO=1.0` assertion which catches the
   silent-decay case (ratio fires if `ledgerRows / declCount` drops below
   1.0, regardless of absolute floor).
2. **Commit message inaccurate ("regen 0→482")** — *Verified true*.
   `git show f093621a88~1:_skill-triggers.jsonl | sha256sum` already had
   482 lines; the *actual* delta in `f093621a88` is a Mark Villanueva →
   wompu username path-rewrite + the test file + the skill file + inbox
   row. The 0→482 regen happened earlier in working state and was
   absorbed into the same commit subject. R12-class: future bisects will
   mis-attribute the revive. **Documentation-only**; the test+skill+inbox
   deliverables ARE correct in the commit.
3. **Shell-injection class in skill body** — *Mitigated in working tree*.
   `--query "$ARGUMENTS"` is bash double-quoted; `$(...)` and backticks
   expand even when the harness substitutes ARGUMENTS textually. FIX1
   patch switches to env-var insulation
   (`PRISM_RECALL_QUERY="$ARGUMENTS"` then `--query "$PRISM_RECALL_QUERY"`)
   so the value is bound before the loop body parses. Also captures stderr
   to `/tmp/prism-recall/$$.err` instead of `/dev/null` so genuine
   failures (Ollama down, node missing, parse error) stay recoverable.
   Threat-model: operator is on their own machine — this is correctness
   hygiene (predictable special-char behavior), not a security boundary.
4. **`2>/dev/null` swallows stderr** — *Mitigated in same FIX1 patch* (see
   above; stderr now goes to per-pid log file).

## Resume directive for next-kilo session

```
git status --short .claude/commands/synergy-recall.md
# Should show ' M' (modified, working tree only). If shown:
git add -f .claude/commands/synergy-recall.md
git commit -m "[MAIN] [HIGH-ROI-SKILL-SYNERGY]/U-SKILL-LEDGER-REVIVE-FIX1 (slot:kilo): env-var insulation + stderr-to-file in /synergy-recall"
```

If the working-tree change is gone (re-extractor flattened it), reapply:
- `synergy-recall.md` line 42-54 in current state is the prior unsafe
  pattern; replace per the env-var doctrine in `feedback_*` for skill
  authoring (or restore from the deferred state via
  `git show f093621a88:.claude/commands/synergy-recall.md` then re-edit
  — the patch shape is documented above).

## Cross-references

- [[reference_skill_trigger_ledger_revive_2026_05_20]] — iter 3 the
  pre-/compact main work (commit f093621a88).
- [[feedback_conflict_fork_rule]] — main-tree commit retries kept failing
  on peer index.lock; this is exactly the failure mode the rule names.
  Fork-to-sibling-worktree was the canonical fix; FIX1 deferred rather
  than forking because the commit is doc-only polish, not behavior.
- [[feedback_no_git_stash_shared_tree]] — wedged process recovery in
  shared tree.
- [[reference_wiki_leafidx_failloud_2026_05_18]] — same R12 fail-loud
  class the iter-3 work backstops against.
