---
name: reference_obsidian_memdir_homedir_fix_2026_06_09
description: "Fixed a LIVE 24-day split-brain: the post-ship retention pipeline (distill-session-learnings.mjs writes, handoff-memory-seed.mjs reads) hardcoded a DEAD foreign-machine path C:/Users/Mark Villanueva/... so 1602 reference_post_ship_* memos were quarantined from the C:->H: feed + semantic recall. Single-sourced resolveObsidianMemDir() (homedir-derived) + recovered the 1602. Discovered via ultracode Workflow."
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.231Z
aliases: reference_obsidian_memdir_homedir_fix_2026_06_09
---


# Dead-foreign-path split-brain in the post-ship retention pipeline (2026-06-09, slot:alpha)

Commit `792beb75e8` ([OBSIDIAN-VAULT-SYNERGY]/U-OBS-MEMDIR-HOMEDIR). Discovered
by an ultracode discovery Workflow (`wf_15ae29dc-123`), then implemented + live-
validated this session (the goal-gate's "discovered → implemented" demand).

## The bug (LIVE, not latent)
`scripts/handoff-memory-seed.mjs:28` and `scripts/distill-session-learnings.mjs:29`
both hardcoded a default of
`"C:/Users/Mark Villanueva/.claude/projects/H--PRISM/memory"` — a DEAD
foreign-machine path (this box is DESKTOP-N7MI1VB, home=`wompu`; the dir is also
wrong-cased — real is `H--prism` lowercase). `PRISM_OBSIDIAN_MEM_DIR` was **unset
everywhere**, so the dead default was LIVE. The post-ship distiller had been
WRITING `reference_post_ship_*.md` memos into a phantom `Mark Villanueva` tree
that the C:->H: Obsidian feed (`stop-obsidian-memory-feed.mjs`, reads
C:/wompu), semantic recall (`memo-embed-lib.mjs`, homedir-derived), and every
other recall hook **never see** — only the seed reader (same dead path) read
them back. A 24-day (2026-05-16..06-09) split-brain quarantine of the freshest
context-retention signal.

## The fix (R15 wire→test→validate→all-consumers)
- NEW `scripts/lib/obsidian-mem-dir.mjs` — single-source `resolveObsidianMemDir(env)`,
  homedir-derived default mirroring `memo-embed-lib.mjs:19-21`. Precedence
  `PRISM_OBSIDIAN_MEM_DIR > PRISM_MEMORY_DIR > homedir` (keeps the legacy override
  per R7 back-compat). Pure, env injectable. 8 real-assertion tests (R9 — anti-
  `Mark Villanueva` negative assert, precedence, empty/whitespace/trim guards).
- Wired BOTH consumers to the resolver (dropped the hardcoded username).
- NEW `scripts/migrate-stranded-obsidian-memos.mjs` — dry-run-default, ADDITIVE-only
  recovery (never clobbers canon; fail-loud if canon missing; reports dead-newer
  conflicts instead of overwriting). LIVE: recovered **1602** stranded
  `reference_post_ship_*.md` (mtimes 2026-05-16..09, all substantive, disjoint
  from canon) → now propagate C:->H: + get embedded.
- 3-of-3 scrutiny PASS (no P0/P1).

## HONEST follow-up (R12 — the commit msg's "unifies all recall consumers" is true only by default coincidence)
The unification holds TODAY only because the resolver default == the path other
consumers hardcode. Reviewers C+B flagged the real gap: the **C:->H: feed**
`scripts/obsidian-memory-sync.mjs:19` hardcodes `C:/Users/wompu/...` with NO env
override, and ~25 other recall-pipeline scripts (`octopus-corpus-loader.mjs:57`,
`memory-compact.mjs:61`, `cag-router.mjs:60`, …) hardcode the wompu path too.
They are CORRECT on this box (not broken like the dead path), just non-portable +
not truly single-sourced. **Next unit:** route them through `resolveObsidianMemDir()`
(the helper now exists for exactly this) → makes "unify all consumers" literally
true + portable. Lower-pri sibling: `ollama-hook-fire-audit.mjs:48` (settings.json,
not memory — orthogonal). Pairs with [[reference_handoff_memory_seed]] +
[[reference_precompact_memory_seed_2026_06_09]].
