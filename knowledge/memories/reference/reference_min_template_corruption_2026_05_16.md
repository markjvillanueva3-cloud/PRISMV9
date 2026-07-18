---
name: min-template-corruption-2026-05-16
description: Resources/MACRO PROGRAMS/*.MIN files are corrupted in working tree (git-blob header + foreign markdown prepended to .MIN content, transition mid-file). Same 2026-05-12 history-strip artifact class. Check BEFORE consuming as MS-PRINT-PROGRAM-LOOP Track A seed data.
aliases: reference_min_template_corruption_2026_05_16
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.660Z
---

# .MIN template corruption — Resources/MACRO PROGRAMS/

2026-05-16 slot foxtrot (claude-32a39c0c) discovered while attempting U-PPL-A1 (MIN-FINGERPRINT). `Read` of `H:/prism/Resources/MACRO PROGRAMS/BASIC-CASING.MIN` returned binary garbage in lines 1-74 (x-blob compressed header + "PRISM Lathe AGI Roadmap" markdown fragment), then transitioned to actual G-code at line 75 (`V26 * 3.82] / V25 (DRILL RPM)`).

## Why this matters

The 7 hand-built .MIN templates are the **named cluster centroid anchors** for the MS-PRINT-PROGRAM-LOOP/U-PPL-A1 unit. **CORRECTED MAP (slot foxtrot post-/compact 2026-05-16):** smoke-tested all 7 — 5 are corrupt in 3 distinct patterns, 2 are clean.

| File (size) | Status | Hex(0-30) | Notes |
|---|---|---|---|
| BASE WAFER INSERT MACRO.min (4215) | ❌ NULL-BYTE | `00 00 00 00 ...` | Pure zeros — file body is null-padded to size |
| BASIC CASING WITH SINGLE COUNTERBORE.min (8393) | ❌ NULL-BYTE | `00 00 00 00 ...` | Pure zeros |
| BASIC SINGLE HOLE CASING CANNED CYCLE.MIN (6851) | ❌ NULL-BYTE | `00 00 00 00 ...` | Pure zeros |
| BASIC TOP HAT CASING WITH SINGLE COUNTERBORE.min (9188) | ❌ JSON-RESTORE | `7b 0d 0a "last_sync": "2026-04-15..."` | Contains a Python restore-tool sync state, not G-code |
| BASIC-CASING.MIN (7918) | ❌ GIT-BLOB | `78 01 01 b3 ... blob 2729 # PRISM Lathe AGI Roadmap` | Compressed git-blob header + Lathe AGI markdown |
| CASING_MACRO.MIN (13658) | ✅ CLEAN | `O1001\n(T010101 - FACE/OD ROUGH` | Full Okuma OSP program |
| CBORE_CASING_MACRO.MIN (13321) | ✅ CLEAN | `O1001\n(T010101 - FACE/OD ROUGH` | Full Okuma OSP program |

File sizes are plausible at `ls` level — corruption is invisible to size-based checks. **`git status` reports CLEAN** — these corrupted bytes are what's COMMITTED in the working tree. `git log --all -- "<file>"` returns ZERO history for the 5 corrupted templates, confirming the 2026-05-12 history-strip removed their predecessors. **No in-repo git recovery path exists** — restoration requires external backup, USB, or a different machine.

The 16,558-file JM DIE/ turning corpus is **UNAFFECTED** (sample of 3 ALCOA files shows normal Okuma tape-mode `$<filename>%` headers — no NULL bytes, no foreign markdown). The 7 templates are *anchors*; the JM DIE corpus is the *data*. 2 clean anchors (CASING_MACRO + CBORE_CASING_MACRO, both ~13KB full programs) + 16,558-file corpus is a viable starting set if the operator chooses to proceed without restoring the 5.

## Same class as

- `## Recent regressions` 2026-05-15: `c-to-h-mirror` hook was documented but never wired
- `## Recent regressions` 2026-05-16: settings.json hook wiring silently reverted
- 2026-05-12 history-strip artifact (referenced in MS-DOCU-FINISH closeout_note: "DELIVERABLE POLICY: the pipeline SCRIPTS are git-tracked, the ~130 MB JSONL OUTPUTS are intentionally local-only per the 2026-05-12 history-strip policy")
- Loose blob `4c12573312...` / commit `48b796fc...` corruption that already broke `audit-roadmap-drift.mjs` earlier in this same session
- Echo's chat blob `4036819b...` — TWO fetch+delete attempts both made repo worse, restored from .bak both times

## How to detect

Before consuming any `.MIN` file in `Resources/MACRO PROGRAMS/` as input data:
1. Read first 5 lines via Read tool
2. Look for `x[unprintable]L[unprintable]blob` pattern OR foreign markdown headers (`# PRISM Lathe AGI Roadmap` etc.)
3. If found → file is corrupted; do NOT use as test fixture or fingerprint seed

## How to fix (operator-only)

Per echo's failed-fork lesson, DO NOT attempt these from inside a chat:
- ❌ `git fetch origin --refetch` from within a chat (echo's attempts made the repo WORSE)
- ❌ `git rm --cached` + re-add (loses the blob hash trail)
- ❌ `git cat-file -p <hash> >file.MIN` blind recovery (don't know which hash maps to which template)

Recommended (operator runs offline, no concurrent chat activity):
- Clean clone to a temp dir
- Diff the .MIN files vs working tree
- `git checkout <clean-sha> -- "Resources/MACRO PROGRAMS/"` from the clean clone

## How to apply going forward

For any chat that picks up MS-PRINT-PROGRAM-LOOP U-PPL-A1, U-PPL-C1 (Okuma OSP .MIN dialect post), or U-PPL-C5 (LatheNLPartParserEngine + NC mining calibrate): **READ ONE .MIN FILE FIRST** as a smoke test before designing fingerprints, dialect grammars, or training corpora. If corrupted, surface to operator and stop — don't synthesize replacement seed data, don't attempt git surgery.

Also worth verifying after operator runs the repair: the 16,558 turning .MIN files under `JM DIE/` may be similarly affected — those are the actual fingerprint *corpus* (not just the 7 anchors). The 7 anchors being corrupt is necessary-evidence the JM DIE corpus may also be hit, but not sufficient — needs sampling.

## Cross-references

- [[reference_e1_ideablock_extractor_2026_05_15]] — same "verify input data before building against it" discipline
- [[feedback_settings_wiring_drift_2026_05_16]] — sibling silent-drift pattern (documented but reverted)
- CLAUDE.md `## Recent regressions` — chronological corruption log
- Envelope: `H:/prism/mcp-server/data/milestones/MS-PRINT-PROGRAM-LOOP.json` — U-PPL-A1 brief names the 7 templates as seed data
