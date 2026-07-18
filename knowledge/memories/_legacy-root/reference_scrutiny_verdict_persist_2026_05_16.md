---
name: reference-scrutiny-verdict-persist-2026-05-16
description: "Obsidian-2nd-brain Gap #2 SHIPPED 2026-05-16 slot echo. scrutiny-verdict-persist.mjs T3 Stop hook persists per-session SCRUTINY_LEDGER.json into knowledge/memories/scrutiny/ (Obsidian-synced). 38 node:test PASS. 2-round 2-arm per-file scrutiny. Absorbed into peer commit f1a100492 (7th shared-tree absorption this session — files correct+tracked, message understates scope). Wired Stop[0][13] after regression-auto-write."
source: prism-memory
synced: 2026-05-18T01:02:09.888Z
aliases: reference_scrutiny_verdict_persist_2026_05_16
---


# Gap #2 — scrutiny-verdict-persist.mjs (Obsidian 2nd-brain)

## What shipped

T3 Stop observer `.claude/hooks/scrutiny-verdict-persist.mjs` + 38-case `node:test` suite. On every Stop it copies the session's `SCRUTINY_LEDGER.json` entry into `knowledge/memories/scrutiny/scrutiny-<sid>-<date>.md` (Obsidian-synced — `obsidian-memory-sync.mjs` pushes `knowledge/memories/` recursively to OBSIDIAN_VAULT). The record carries: 3-of-3 arm verdict table, per-arm blockers + long-form notes, commit linkage, clearance roll-up. Closes the gap where reviewer findings (load-bearing P0/P1 detail — like THIS session's offloader Unicode-bypass safety find) lived only in truncated ledger `notes` and evaporated at session end.

Distinct from `stop-obsidian-memory-extract.mjs` (Ollama-summarized freeform learnings). Verified not-a-duplicate before building.

**Wiring:** Stop[0][13], immediately after `regression-auto-write` (same T3 advisory-observer family, per [[reference_stop_advisory_wiring_cluster_2026_05_15]]). Both C: and H: settings.json carry exactly 1 ref, byte-equal.

## The 7 scrutiny findings (2 rounds × 2 arms) — all resolved

| Round | Arm | Finding |
|-------|-----|---------|
| 1 | A | P1 `headCommit` `%h%s` no-separator + `split("")` → sha = 1 char; P1 backtick-fence escape; P2 structured-boolean clearance mislabel; P3 name-slug `(unknown)` leak |
| 1 | B | **P0 raw sessionId injects arbitrary YAML frontmatter**; P1 `stableSlice` global-replace false-skips a real verdict update if notes contain a regenerated-at marker; P1 frontmatter schema didn't match native vault convention |
| 2 | A+B | BOTH PASS — all 7 resolved (Arm B re-verified against the repo's real `yaml` parser + a native vault file), no new P0/P1, only prod-unreachable P3 deferrables |

## Key engineering decisions (reusable patterns)

- **`yamlScalar(v) = JSON.stringify(String(v))`** — a JSON string is a valid YAML double-quoted flow scalar; newlines escape to `\n`. This is the canonical fix for "untrusted text into YAML frontmatter" injection. Arm B verified U+2028/U+2029 (which `JSON.stringify` does NOT escape) are non-significant inside the `yaml` package's double-quoted scalars, so the defense holds.
- **Content-hash idempotency over stableSlice** — `contentHash()` sha256 over the SEMANTIC entry fields (sessionId, recordedAt, notes, blockCount, review booleans, reviews object, commit sha) embedded as a line-anchored `<!-- content-hash: HEX -->`. `extractContentHash()` uses `/^...$/m`. This replaced a fragile global-regex `stableSlice` that could false-skip if notes contained marker-looking text. Defense-in-depth: `clip()` collapses all whitespace BEFORE `fencedBlock()`, so a hostile marker in notes can never reach line-start.
- **`fencedBlock()` dynamic fence** — computes `max(3, maxBacktickRun+1)` backticks so pasted ``` in reviewer notes cannot escape the wrapper (CommonMark: closing fence must be ≥ opening length).
- **3-tier clearance roll-up** mirrors the gate's own `isCleared()`: per-arm `reviews` all-PASS → structured booleans (`opusReviewed&&claudeReviewed&&codexReviewed`) → legacy `selfReviewed&&agentReviewed`. The middle tier was the round-1 P2 (the `--mark-opus/--mark-claude/--mark-analyst` flag path sets booleans with NO `reviews` object).
- **`headCommit` field separator** — `git log --format=%h%x1f%s` + `indexOf("\x1f")` split. Never glue multi-field git output without a separator.

## Shared-tree absorption (7th this session)

Files were absorbed into peer commit **`f1a100492`** `[MAIN] [AUTOCOMPACT-AUTONOMOUS-MS0]/U-AAM03-SLOT-SIGNATURE` — same pattern as [[reference_blueprint_ocr_training_ms1_collision]] / [[reference_viz_first_redirect_glob]] / [[reference_u_ppl_d5_bridge_shipped]]. `git cat-file -e HEAD:...` succeeds, `git diff HEAD` empty → the final post-fix content (yamlScalar/contentHash/%h%x1f%s/fencedBlock, 38 tests) is in HEAD. The commit message understates scope; the deliverable is correct + tracked + tested. settings.json is outside the git tree so wiring was unaffected by the absorption.

**Why the direct commit kept failing:** `[SYSTEM-VIZ-BRAIN-MS0]` scope → `worktree-commit-route` hook demanded `[MAIN]` prefix (matching worktree owned by peer claude-41db1b82 — correctly did NOT cd there). After `[MAIN]` prefix, the commit STILL reported "no changes added" because the files were ALREADY in HEAD via the peer absorption that happened between staging attempts. Not the lint-staged-noop bug ([[reference_lintstaged_noop_config_eats_commits]]) as first suspected — diagnosis: `git ls-files --error-unmatch` exit 0 + `git diff HEAD` empty = already-committed-by-peer. Lesson: when "no changes to commit" persists after re-staging in a multi-chat tree, check `git cat-file -e HEAD:<path>` BEFORE assuming the lint-staged stash bug.

## Verify wiring (the standing grep)

```bash
grep -c scrutiny-verdict-persist H:/.claude/settings.json C:/Users/wompu/.claude/settings.json
# both → 1
node --test H:/prism/.claude/hooks/__tests__/scrutiny-verdict-persist.test.mjs
# 38 pass 0 fail
```

## Deferred (P3, prod-unreachable — logged not shipped)

- Reuse `dateSlug()` for the output FILENAME (currently raw `entry.recordedAt`; cosmetic, only odd for an impossible non-ISO recordedAt).
- Try-wrap `formatRecord` in `main()` for symmetry (circular `reviews` unreachable from a JSON-parsed ledger).
- P3: enlarge homoglyph coverage / programmatic HOMOGLYPH_RX — that's the SISTER unit [[reference_offloader_cat_fix_2026_05_16]], not this one.

## Audit-ladder status after this unit

Obsidian-2nd-brain ladder: **3 of 4** done (Gap #1 regression-auto-write ✓, Gap #2 this ✓, Gap #3 Qdrant-down alert ✓). Remaining: **Gap #4 error-fix-learner.mjs** PostToolUse hook (detect test-fail → edit → test-pass cycles, auto-write the learning) — largest scope of the four.


## Related
[[skills/hooks|/hooks]] • [[skills/scrutiny-verdict-persist|/scrutiny-verdict-persist]] • [[skills/memories|/memories]] • [[skills/scrutiny|/scrutiny]] • [[skills/scrutiny-|/scrutiny-]] • [[skills/m|/m]] • [[skills/--mark-claude|/--mark-claude]] • [[skills/--mark-analyst|/--mark-analyst]] • [[skills/content|/content]] • [[skills/fenced|/fenced]]