---
title: FLEET-DOCTRINE-26 — 13 → 26 SLOT_NAMES expansion + drift sweep
type: architecture
milestone: FLEET-DOCTRINE-26
shipped: 2026-05-19
slot: golf
commit: 57f28a1ad6
status: shipped
supersedes: |
  - Documentation snapshots that described the fleet as 7-slot / 10-slot / 12-slot / 13-slot.
    Milestone names retained as canonical history (JULIETT-12CHAT-ALLOCATION-MS0,
    FLEET-MEMORY-MONITOR-MS0, etc.) — only forward-doctrine language was updated.
---

# FLEET-DOCTRINE-26

## Problem

The 2026-05-19 SLOT-RECLAIM milestone (commit `ed5c49044b`) expanded `SLOT_NAMES`
from 13 → 26 in `.claude/helpers/chat-slots.mjs`, adding `november..zulu`. The
expansion was correct at the source-of-truth but two downstream consumers
**still hard-coded the 13-name array**, AND most doctrine docs still described
the old topology. Net effect: any chat in `november..zulu` would have been
silently misclassified by those two modules — the exact recurrence of the
2026-05-16 10 → 12 drift the codebase's own DRIFT HISTORY comment warned
about.

## Root cause — duplicate source-of-truth

Two helpers ship their own copy of `SLOT_NAMES` (the documented workaround for
`chat-slots.mjs` being vitest-unloadable from `.claude/helpers/`):

| File | Why a copy exists | Drift impact |
|---|---|---|
| `.claude/hooks/slot-bind-enforce.mjs` | Test-loadable from worktrees that can't import chat-slots.mjs | post-/compact `/checkin-<nato>` for `november..zulu` would fail slot-bind |
| `.claude/helpers/process-slot-map.mjs` | fleet-reaper PID→slot classifier; chat-slots.mjs has Vitest-load issues | reaper would classify `november..zulu` chats' children as "unowned" → reapable |

Drift guard: `fleet-reaper.test.mjs` text-asserts these against `chat-slots.mjs`.
The guard is intact but the vitest harness is pre-existing blocked (per CLAUDE.md
§Recent regressions), so the drift slipped past CI. Manual `node --check` +
`SLOT_NAMES.length === 26` import verification confirmed the fix.

## Sweep contents — 21 files, commit `57f28a1ad6`

### Code correctness (P0 drift fixes — 2 files)

- `.claude/hooks/slot-bind-enforce.mjs` — SLOT_NAMES 13 → 26 (alpha..zulu),
  history note added (7 → 10 → 12 → 13 → 26).
- `.claude/helpers/process-slot-map.mjs` — SLOT_NAMES 13 → 26, DRIFT HISTORY
  comment block extended with the 2026-05-19 fix.

### Doctrine (manual edits, nuanced — H:/prism/CLAUDE.md, golf-slot-only guard cleared)

- §PER-CHAT HANDOFF — "7 concurrent / 6 work + 1 hygiene" → "up to 26 concurrent / 25 work + 1 hygiene golf"
- §PER-SLOT WRAPPERS — "39 wrappers × 13 NATO slots (alpha..mike)" → "78 × 26 (alpha..zulu)"; expansion history extended
- §SESSION CONTINUITY STACK — "up-to-10-chat fleet" → "up-to-26-chat fleet"
- §session-start-terminal-pin — "10 PowerShell windows → 10 bindings" → "up to 26 windows → 26 bindings"
- §Fleet-design directive — "up to 13 concurrent chats" → "up to 26"; history extended (10 → 12 → 13 → 26)
- §Autonomous loop — "12 NATO wrappers" → "all 26 NATO wrappers"
- §GOLF SLOT — "7th hygiene chat" → "dedicated hygiene chat (position 7 of 26 in NATO sequence)"; historical name annotated
- §multi-host coexistence — "alpha..foxtrot + golf" → "all 26 slots (alpha..zulu)"
- §FLEET-MEMORY-MONITOR — "all 13 chats are LIVE" → "all 26 chats are LIVE"
- §JULIETT-12CHAT-ALLOCATION — milestone name retained (history); "superseded 2026-05-19 by 13→26" postscript added
- §Per-slot RGS allocator — clarified that the implementation is `SLOT_NAMES.length`-driven and scaled to 26 without code change

### User-global doctrine (C:/Users/wompu/.claude/CLAUDE.md, auto-mirrored to H:/.claude/CLAUDE.md)

- §GOLF SLOT — same 7th → "position 7 of 26" rename
- §Multi-host coexistence — alpha..foxtrot + golf → all 26 alpha..zulu

### Bulk wiki + code-comment sweep (19 files via new dev-velocity artifact)

`scripts/fleet-doctrine-sweep.mjs` — reusable literal-phrase bulk replacement
tool. Dry-run by default, `--apply` writes, `--json` machine-readable. Rule
table covers every fleet-topology phrase encountered ("13-chat fleet", "all 13
chats", "alpha..mike work slots + golf hygiene", "7 chats (alpha..foxtrot work
+ golf hygiene)", "8 work slots (alpha..foxtrot + hotel + india)", etc.).
Skips milestone JSON, commit logs, `.pre-junction` backups, and historical
milestone-named docs.

First-run output: **19 / 36 targets changed**, 17 skipped (no fleet-doctrine
matches), 0 missing, idempotent (re-run reports 0 residual).

Files updated by the script:
- Code/hooks (8): `chat-slots.mjs`, `meta-task-suppressor.mjs`,
  `command-telemetry-record.mjs`, `fleet-reaper-stop.mjs`, `git-add-lane-guard.mjs`,
  `golf-slot-reaper-guardian.mjs`, `session-start-auto-resume.mjs`,
  `stop-obsidian-memory-feed.mjs`
- Wiki (7): `git-shared-index-hazards.md`, `slot-worktree-playbook.md`,
  `chat-bus-coordination-patterns.md`, `concurrency-and-locking-patterns.md`,
  `bug-findings-wiki-gate.md`, `unit-knowledge-pack.md`, `slot-lifecycle.md`,
  `stable-session-id.md`
- Docker README (1): `docker/ollama-gpu/README.md`

## Acceptance state at ship

- `node -e "import(...slot-bind-enforce.mjs)"` → `SLOT_NAMES.length === 26`, tail `xray,yankee,zulu`
- `node --check` both critical files: PASS
- `node --test .claude/hooks/__tests__/slot-reclaim.test.mjs` → **47/47 pass** (test was already written for the 13→26 transition)
- `node scripts/fleet-doctrine-sweep.mjs` (re-run after apply) → **0 residual changes** (idempotent)
- Forward-grep `13[- ](chat|slot|NATO|concurrent|work)` over the swept tree → only historical-narrative or `alpha..zulu` references remain

## Doctrine — preserved vs updated

| Surface | Treatment |
|---|---|
| **Milestone names** (JULIETT-12CHAT-ALLOCATION-MS0, FLEET-MEMORY-MONITOR-MS0…) | **Preserved** — these are canonical history. Postscripts added where appropriate ("superseded 2026-05-19 by 13→26 expansion"). |
| **Historical narrative sentences** ("12-chat ROI allocation across alpha..mike (12 work slots; golf hygiene)") | **Preserved** — describes what shipped, with a "→ now 26" postscript. |
| **Forward-doctrine sentences** ("every slot-aware design must accommodate up to N concurrent chats") | **Updated** to 26. |
| **Code-comment topology assertions** ("// 13 concurrent PowerShell windows") | **Updated** to "up to 26" / `SLOT_NAMES.length`-driven phrasing. |
| **Hardcoded SLOT_NAMES arrays** | **Expanded** to all 26 names. Drift guard intent preserved. |

## Reversal

- Script-driven changes: `git revert 57f28a1ad6` reverts every literal-phrase update.
- Per-file revert: any individual file in the commit can be restored from `git show HEAD~1:<path>`.
- Source-of-truth contraction: if `chat-slots.mjs` ever shrinks back, re-run
  `scripts/fleet-doctrine-sweep.mjs` with a flipped rule table — the tool is
  intentionally symmetric.

## See also

- Memory: [[reference_fleet_doctrine_26_2026_05_19]]
- Source-of-truth: `.claude/helpers/chat-slots.mjs` `SLOT_NAMES` (26 names)
- Predecessor: [[reference_slot_reclaim_2026_05_19]] (SLOT-RECLAIM, the milestone that expanded the source-of-truth)
- Drift class: [[reference_fleet_reaper_ms1]] (2026-05-16 10 → 12 drift, the documented prior recurrence)
- Tooling: `scripts/fleet-doctrine-sweep.mjs` (reusable bulk-update tool)
