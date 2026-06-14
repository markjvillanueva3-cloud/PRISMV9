---
name: reference_precompact_memory_seed_2026_06_09
description: Precompact handoff now carries a MEMORY_SEED section (distilled error/memo/tribal signal) so auto-compact under pressure keeps it — HIGHVALUE-DISCOVERY
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.882Z
aliases: reference_precompact_memory_seed_2026_06_09
---


# Precompact handoff MEMORY_SEED enrichment (#11a, 826be35aa4)

**What it fixes.** The precompact hook (`.claude/helpers/precompact-handoff.mjs`)
fires on PreCompact (before `/compact`) and writes a handoff with **only a
RESUME** directive (`--state` is a throwaway placeholder). The Stop
seed-distiller (`scripts/handoff-memory-seed.mjs`, run by
`handoff-memory-seed-stop.mjs`) runs **only at end-of-turn** — so a handoff
written by the *precompact* path, which is exactly the one the post-compact
`session-start-auto-resume` reads, lacked a `## MEMORY_SEED` section. The
distilled error/memo/tribal signal was silently dropped across every auto-compact.

**Fix.** After a successful precompact write (`writeOk && writtenFile`), run the
SAME distiller `handoff-memory-seed.mjs --file <writtenFile>` (the one the Stop
hook uses) **before** the existing pad-to-4096 step. Padding tops up to 4096 when
no seed (unchanged); no-ops when the bounded seed (~1.2KB) pushes the file over.
Fail-soft: any distiller error leaves the RESUME-only handoff valid. Knob
`PRISM_PRECOMPACT_MEMORY_SEED_DISABLE=1`. Edit at `precompact-handoff.mjs:614`.

**Why it closes the loop.** Consumed by #2's `extractMemorySeed` in
`session-start-auto-resume.mjs` (commit `2c006fec7c`) which restores the seed on
resume. Together: distiller writes the seed at precompact → reader restores it at
the next boot. Validated end-to-end on 2026-06-09: distiller appends +1269B, a
`## MEMORY_SEED` section materializes, `extractMemorySeed` reads 1251B back.
Precompact regression tests 14/14 (auto-trigger) + 12/12 (release-slot, unrelated).

**Lineage.** #11a of `state/shared/specs/HIGHVALUE-DISCOVERY-2026-06-08.md`;
Clause-4 forward-plan item #3 of [[reference_obsidian_wiring_verified_2026_06_08]].
Pairs with the F5 staleness window ([[reference_autoresume_stale_window_f5_2026_06_08]])
and compact-resume slot-first (#6) — the four-part context-retention strategy:
don't drop valid handoffs (F5), don't discard distilled signal (#2 + #11a), don't
resume the wrong chat (#6), recall by meaning not name ([[reference_memo_semantic_recall_f3_2026_06_08]]).
