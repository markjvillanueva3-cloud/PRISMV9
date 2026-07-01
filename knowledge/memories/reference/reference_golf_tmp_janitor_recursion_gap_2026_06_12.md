---
name: reference_golf_tmp_janitor_recursion_gap_2026_06_12
description: tmp-orphan-janitor is NON-RECURSIVE (flat readdir) so it misses every subdir orphan; golf reclaimed 178 + has the verified recursion fix for juliett
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.599Z
aliases: reference_golf_tmp_janitor_recursion_gap_2026_06_12
---


**tmp-orphan-janitor recursion gap (golf, 2026-06-12, while diagnosing operator "system feels sluggish").**

## Finding (R12, measured)
`scripts/tmp-orphan-janitor.mjs` (juliett, DB-HYGIENE) scans its DEFAULT_DIRS (`state/shared`, `mcp-server/data/state`) with a **FLAT `fs.readdirSync(dir)`** -- it never descends into subdirs. So every atomic-write orphan ONE level down is invisible to the sweep:
- `state/shared/dashboards/feature-util-counts.json.tmp-<pid>` -- **100 orphans** (a util-counts dashboard writer leaking on failed rename).
- `state/shared/{chat-bus,checkpoints,handoffs,system-viz,chat-slot-history,...}/*.tmp-<pid>` -- `.current-session-ids.json.tmp-<pid>` (27), `MERGED_POSITION.json.tmp-<pid>` (6), session/anon JSON temps.
This is a SECOND, distinct gap beyond the prior `[[reference_post_ship_db-hygiene-u-tmpjan01-fix]]` (which closed the `.tmp-<pid>` *pattern* gap in `isTmpName`). Pattern was fixed; the *recursion* gap remained.

## Golf actions taken (immediate, safe)
- **Reclaimed 178 orphan temp files** (~0.3 MB): 105 via sibling-verified manual sweep + 73 via `tmp-orphan-janitor.mjs --apply --dir <each leaking subdir>` (dead-pid-or-age gate intact; 1 alive kept; 0 errors). Audit ledger `state/shared/.tmp-janitor-actions.jsonl` updated.

## The fix (VERIFIED working -- golf's main-tree edit was reverted by lane protection; hand to juliett to land in their lane)
3 surgical edits to `scripts/tmp-orphan-janitor.mjs` (golf tested transiently: scanned 111 recursively vs ~few flat, 21/21 existing tests still pass):
1. Add a bounded recursive generator before `notLocked`:
   ```js
   const WALK_EXCLUDE = new Set(["node_modules",".git","knowledge","dist","build",".cache","cache","__pycache__","shell-snapshots"]);
   const DEFAULT_MAX_DEPTH = 5;
   export function* walkTmpFiles(root, maxDepth = DEFAULT_MAX_DEPTH, depth = 0, fsImpl = fs) {
     let entries; try { entries = fsImpl.readdirSync(root, { withFileTypes: true }); } catch { return; }
     for (const ent of entries) {
       if (ent.isDirectory()) { if (depth >= maxDepth || WALK_EXCLUDE.has(ent.name)) continue; yield* walkTmpFiles(path.join(root, ent.name), maxDepth, depth+1, fsImpl); }
       else if (ent.isFile() && isTmpName(ent.name)) yield { dir: root, name: ent.name };
     }
   }
   ```
2. In `main()` replace `for (const dir of args.dirs) { let names; readdirSync(dir)... }` with `for (const root of args.dirs) for (const { dir, name } of walkTmpFiles(root, args.maxDepth)) { ... }` (keep the per-file lstat/classify/TOCTOU body unchanged).
3. `parseArgs`: add `maxDepth: Number(process.env.PRISM_TMP_JANITOR_MAX_DEPTH) || DEFAULT_MAX_DEPTH` + `--max-depth` arg. Exclude `knowledge/` (25k real .md, off-target) -- recursion there is costly + its writers self-clean.
Add a test: nested-subdir tmp is found by `walkTmpFiles` + reclaimed by classify.

## Also for juliett (owner)
- **Scheduling check unconfirmed**: the 254h-old accumulation suggests the janitor is NOT on a regular cron (or runs flat-only). Wire it to a durable scheduled task / the fleet-reaper sweep so subdir orphans don't re-accumulate.
- Root-cause alt: the `feature-util-counts.json` writer (constructs its path -- no literal in code) leaks `.tmp-<pid>` on failed rename / reaped writer. The recursion fix is the general catch; a try/finally unlink in the writer is the belt-and-suspenders.

## Lesson
A flat-readdir "sweep the dir" tool that ANY caller can point at a parent dir gives a false sense of coverage -- the orphans hide one level down. Sweepers must recurse (bounded + excluded), or they silently miss the bulk. Sibling-class of "shallow search != absent" ([[feedback_never_claim_absence_without_deep_search]]). Cross-link: [[reference_tmp_orphan_leak_janitor_2026_05_30]], [[reference_juliett_tmp_janitor_2026_05_29]].
