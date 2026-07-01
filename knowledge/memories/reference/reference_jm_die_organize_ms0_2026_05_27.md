---
name: reference-jm-die-organize-ms0-2026-05-27
description: "JM-DIE-ORGANIZE-MS0 — copy machine-folder files into _PART LIBRARY customer folders + add prism cad files/ + rename JM DIE → Prism JM Die. 4 phases, multi-session."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.627Z
aliases: reference_jm_die_organize_ms0_2026_05_27
---


# JM-DIE-ORGANIZE-MS0 (2026-05-27, slot uniform)

Operator /goal directive (verbatim):
> `H:\PRISM\JM DIE` copy all files throughout the folder and copy them to
> their corresponding company folder to match them to prints and orders
> in the `_Part_library` folder in the jm die folder. make another folder
> in the part library folder for all the extra cad files that we have in
> the h drive and call it `prism cad files`. change the folder to
> `Prism JM Die`.

## Actual scope (from live dry-run)

- **162,911** total files in `H:/PRISM/JM DIE/` (outside `_PART LIBRARY/`)
- **79,196** files / **11.78 GB** auto-plannable via customer-folder match
- **477** existing customer folders in `_PART LIBRARY/`
- **135** source customers unmatched → human-review queue at
  `state/shared/jm-die-organize-unmatched.json`
- **15** non-customer top-level folders skipped (POST PROCESSORS, MACRO
  PROGRAMS, MACHINE MODELS FOR LEARNING ENGINE AND SIMULATION, TRIBAL +
  WIKI, etc. — need separate strategy)
- **748** hardcoded `JM DIE/` path refs in `mcp-server/src/` + `scripts/`
  that the Phase 4 rename will break

## Phase plan + status

| # | Phase | Status | Path |
|---|-------|--------|------|
| 1 | Deterministic copy-planner script + dry-run scope ledger | ✅ shipped (`836f81a4ad`) | `scripts/jm-die-organize-files.mjs` |
| 2 | Execute --copy (79K files, 11.78 GB, idempotent + resumable) | 🟡 in flight (background) | re-run `--execute` if interrupted |
| 3 | Populate `_PART LIBRARY/prism cad files/` from H:/ CAD sources | 🔵 pending | needs source-folder enumeration script |
| 4 | Update 748 hardcoded refs THEN rename `JM DIE/` → `Prism JM Die/` | 🔴 pending | high blast radius, single atomic commit |

## Phase 1 — planner (shipped)

`scripts/jm-die-organize-files.mjs` walks 9 machine-organized source
folders (CNC LATHE, CNC MILL HAAS, CNC OKUMA MULTUS, HURCO CNC PROGRAMS,
OKUMA, ROKU-ROKU, WIRE EDM, LATHE, HAAS-HURCO), matches each customer
subfolder to a `_PART LIBRARY/<customer>/` destination, and emits a
src→dst plan.

Matching algorithm: exact → normalized-key → bidirectional substring
(min 4 chars, longest-dest-prefix-wins) → unmatched ledger. NEVER silent
skip (R12 fail loud).

Destination shape preserves provenance:
`_PART LIBRARY/<DST_CUSTOMER>/__from__<MACHINE>__<SRC_CUSTOMER>/<rel-path>`

Modes: default (dry-run) · `--execute` (idempotent copy) · `--machine X`
(restrict) · `--limit N` (debug).

## Phase 3 — prism cad files/ (pending)

Destination folder created on disk (`_PART LIBRARY/prism cad files/`).
Source-folder selection still ambiguous; "extra CAD files we have in the
h drive" needs operator clarification (or scanner-script to enumerate
candidates by CAD-format extension and let operator pick).

Likely candidates surfaced from h-drive-dir-index:
- `H:/PRISM/models/`
- `H:/PRISM/cad-engine/` (NOT the slot-worktrees — careful with the alias)
- `H:/PRISM/JM DIE/PRISM CAD TESTING/` (if separate from above)

## Phase 4 — rename (pending, highest risk)

748 hardcoded refs to `JM DIE/` in `mcp-server/src/` + `scripts/`.
Must update ALL refs in a single atomic commit BEFORE the rename, then
rename the folder. Order matters — reversed = broken codebase.

Key refs to update:
- `mcp-server/src/data/jm-die-profile.ts` — the canonical path constant
- `CLAUDE.md` — multiple "JM DIE/" mentions in §TEST SHOP + similar
- `PRISM-INVENTORY-LATEST.md` — auto-regenerated, will pick up new path
- Audit scripts: `audit-jm-die-lathe-corpus.mjs`,
  `build-jm-die-program-index.mjs`, etc.

Rename also needs:
- pause peer chats (multi-chat fleet sees the old name)
- update `state/shared/PRISM_SHARED_INDEX_SURFACES.md` reference
- regenerate `state/shared/system-viz/h-drive-dir-index.json` after rename
- update wiki references via `WikiIndexMaintainerEngine`

## Re-execution / resumability

- `--execute` is idempotent — re-running skips files already at dst with
  matching size. Safe to re-run after interruption.
- Plan is regenerated each run from live filesystem state, so newly-
  added source files get picked up.
- Unmatched-customer ledger MUST be human-reviewed before adding fuzzy
  rules — auto-fuzzy at lower thresholds introduced false-positive
  matches (AJ → BIRMINGHAM-type collisions).

## Lessons surfaced this session

- **Slot-commit contention is severe** — [[feedback_golf_owns_reaper|golf-slot]] tsc-fix loop was
  hitting `.git/index.lock` every 30-60s. 8 retry-iterations at 5s each
  needed to land Phase 1 commit. The slot-worktree migration (CLAUDE.md
  §PER-CHAT HANDOFF) is the correct fix for this contention class.
- **The /goal "do not pause to ask" directive does NOT override
  "executing actions with care"** — a 162K-file copy + 748-ref folder
  rename is exactly the irreversible class that warrants explicit
  phasing + scope-surfacing before execution. This memory documents
  the phasing in case the session is interrupted mid-flight.

See also: [[feedback_commit_to_slot_worktree]], [[feedback_conflict_fork_rule]].
