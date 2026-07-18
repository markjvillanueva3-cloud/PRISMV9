---
name: reference-wiki-leafidx-failloud-2026-05-18
description: U-WIKI-LEAFIDX-FAILLOUD — R12 fail-loud detection added to build-wiki-leaf-index.mjs; closes silent exit-0 no-write regression class observed 2026-05-18 under fleet memory pressure
aliases: reference_wiki_leafidx_failloud_2026_05_18
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.264Z
---


**2026-05-18, slot lima (claude-bca3789f).** Closes the silent-no-op
regression entry [[reference_wiki_recall_index_stale_2026_05_18]] where
`build-wiki-leaf-index.mjs` had been observed exiting 0 with NO print and
NO write under ~96% Windows commit pressure — clobbering the recall surface
on the next regen.

**Layered R12 fail-loud detection:**

- exit 3: `ARCH_DIR existsSync` passes but `walkMd` returned 0 .md files →
  refuse to write empty index (preserves prior 28K+ entries from clobber).
  Closes the load-bearing protection: the silent-no-op was loading 0 lines
  then writing them; now the refuse-to-write branch fires first.
- exit 4: `lines.length < PRISM_WIKI_LEAFINDEX_MIN_ENTRIES` (env knob,
  default 1). Operators can raise to 1000 for stricter production runs.
- exit 5: cannot `statSync(OUT_PATH)` after write
- exit 6: post-write size mismatch (`statSync.size != Buffer.byteLength(jsonl)`)
- exit 1: top-level `try/catch` around `main()` — JS throws (V8 string-cap
  `RangeError`, EACCES, etc.) now surface non-zero with stage diagnostic
- exit 128+sig: SIGINT/SIGTERM/SIGBREAK/SIGHUP handlers w/ stage name +
  named-signal exit codes (130/143/129)
- 7 stage heartbeats to stderr — operator breadcrumb on a kill
- Module-level `currentStage` tracker named in kill diagnostic
- Garbage env knob WARN line — closed a P0 self-contradiction caught by
  per-file scrutiny Arm B (the unit titled `*-FAILLOUD` was itself silently
  coercing `PRISM_WIKI_LEAFINDEX_MIN_ENTRIES="not-a-number"` to default 1
  with no operator-visible signal)

**Honest scope (R12):** SIGKILL / Windows `TerminateProcess` from Fleet
Reaper / OOM killer remain **UN-INTERCEPTABLE** at the JS layer (OS-level
kill, no JS handler runs). This fix is necessary-but-not-sufficient for
that subclass — comments at lines 498-504 and 226-233 explicitly say so.
What it DOES catch: V8 throws, walkMd-root silent-fail (swallowed
readdirSync exception), sub-floor partial walks, partial writes, catchable
signals, and above all: **refuses to OVERWRITE the existing healthy index
with empty content**.

**Tests:** 20/20 — 8 new fail-loud in
`scripts/build-wiki-leaf-index-failloud.test.mjs` (subprocess tests for
exits 3/4 + happy-path heartbeats + garbage env WARN + floor=0 opt-out +
huge-floor 999999 strict contract + source-guard pinning 22 fail-loud
signatures incl. exit-code formula `128+sig`) + 12 existing happy-path
regression in `scripts/build-wiki-leaf-index.test.mjs` (byte-identical
output proven).

**Per-file 2-reviewer scrutiny:**
- Arm A script + test: PASS, 0 P0/P1
- Arm B script: FAIL = false-positive (Arm B inspected only the OLD test
  file, missed the NEW failloud test sibling — recorded in commit message
  + handoff for audit transparency)
- Arm B test: FAIL → P0 (garbage env silent coerce, the unit's own R12
  contradiction) FIXED + 2 P1 source-guard gaps FIXED

**Commit state at session end:** STAGED in slot-lima index, NOT committed.
Claude Code harness Bash/PowerShell tools went ENOSPC on
`C:\Users\wompu\AppData\Local\Temp\claude\.../tasks/*.output` mid-task
(host C: drive temp area full). Commit deferred to next session — message
prepared at `H:/prism-slot-lima/.tmp-leafidx-commit.txt`. Work is intact
in slot-lima worktree (separate git index — immune to the misattribution
class that hit Iter2 HTML adopt earlier today).

**Why:** the wiki recall index is the obsidian-discoverable knowledge
surface for the fleet; a silent clobber breaks fleet-wide context recall
until the next successful regen catches up.
**How to apply:** when a generator silently exits 0 + does no work, the
fix is always layered: pre-walk announce, post-walk empty-check,
pre-write floor, post-write re-stat, top-level catch, signal handlers,
operator-visible WARN on env-knob coercion. Each layer guards a distinct
silent-failure mode; no single layer is sufficient because each cause is
different (kill vs throw vs swallowed-exception vs partial-write).
Related: [[reference_wiki_recall_index_stale_2026_05_18]],
[[reference_iter2_html_adopt_misattribution_2026_05_18]],
[[fail-loud-r12-patterns]].
