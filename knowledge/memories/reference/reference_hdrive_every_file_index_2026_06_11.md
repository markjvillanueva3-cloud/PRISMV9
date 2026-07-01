---
name: reference_hdrive_every_file_index_2026_06_11
description: "U-HDRIVE-EVERY-FILE — denylist full-drive walk indexes EVERY H: knowledge root (625,478 files / 37 roots) into the Obsidian vault + substrate, replacing the 7-root allowlist."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.603Z
aliases: reference_hdrive_every_file_index_2026_06_11
---


# H: full-drive corpus index — U-HDRIVE-EVERY-FILE (slot:sierra, commit `f9c8e27efb`, 2026-06-11)

Operator FINAL GOAL: get **EVERY file/folder of H:** into the Obsidian vault (JM-deep) so Obsidian + Hermes can learn the PRISM system + the JM shop for full app testing. The prior `U-HDRIVE-FULL-INDEX` used a curated **7-root allowlist** which structurally could never be "every file" (H: has ~125 top-level dirs). This unit switches the generator to a **DENYLIST** walk.

## What / where
- Generator: `scripts/build-corpus-vault-index.mjs` (default = full-drive; `PRISM_CORPUS_NO_DRIVE_WALK=1` falls back to the curated 7-root allowlist).
- New exported pure fns (17 node:test in `scripts/build-corpus-vault-index.test.mjs`):
  - `classifyDriveEntry(name)` — include/exclude policy + a reason. Excludes caches/venvs/OS dirs/`$RECYCLE.BIN`/Docker/Tools/the raw `PRISM` repo (indexed by /system-viz) and **any `/^prism[-_]/`** (worktree clones, `prism-backups`, `prism-unslotted`, `prism-zulu-obsidian` — all verified to carry their own `mcp-server/.git/knowledge` = dupe content).
  - `discoverHdriveRoots(driveRoot,{_fs})` — partitions H:/ into `{included, excluded, looseFiles, error}`; fail-soft on unreadable root.
  - `isPruneDir(name)` — `node_modules/.git/.svn/.hg/__pycache__/.venv/.next/.turbo/*cache` etc., **pruned at ANY depth** inside an included root (so an included root can't drag in 100K+ nested noise).
- Outputs: `knowledge/h-drive-atlas/{hdrive-full-index,jm-die-corpus-index,docustrata-corpus-index}.md` (vault notes) + `state/shared/corpus-index/corpus-index.json` (40K substrate, committed) + `hdrive-files.jsonl` (the 1.6M-row per-file index, **gitignored**, regenerable).

## Live-validated numbers (R15 VALIDATE)
**625,478 files / 37 content roots / 112 excluded-by-design / 953 deep-pruned / statErrors 0 / discoverError null.** Docustrata 111,745 docs + JM DIE 317,136 files. Top kept roots: resources/PRISM CAD (160K), `.claude` (97K), USER_PROFILE (36K), OBSIDIAN, JMD AltracsTaptite, Docustrata Test, hermes-install, cad-engine, uploads. First run before the clone-pattern fix counted 1.89M (incl. ~1.26M `prism-*` dupe-clone files) — live validation caught + fixed the over-count.

## R12 hardening (2-reviewer round-1 FAIL → round-2 PASS)
top-level `readdirSync` fail-soft (no cascade crash); `discoverError` → loud warn + `[!warning] PARTIAL INDEX` banner + `-- PARTIAL` title (never a silent "full" claim); `statErrors`/`readdirErrors`/`prunedDirs`/`excludedRoots`/`discoverError` all surfaced in the substrate + coverage note; output self-walk guard (`selfPaths`); dedupe backslash-normalize.

## Consume it
- Query contract: `scripts/lib/corpus-index-query.mjs` (`findJmFolder`/`jmByExtension`/`docustrataByType`/`corpusSummary`/`corpusPointers`).
- MCP: `prism_session:corpus_query` (U-CORPUS-DISPATCHER `32517c8394`) — actions `summary|jm_folder|jm_ext|doc_type|doc_folder|pointers`.

Related: [[reference_corpus_app_wire_spec_2026_06_10]] · [[reference_sierra_open_threads_context_map_2026_06_10]] · [[feedback_sierra_commit_to_slot_branch]] · [[feedback_obsidian_low_token_2nd_brain_protocol]] · [[feedback_never_claim_absence_without_deep_search]]
