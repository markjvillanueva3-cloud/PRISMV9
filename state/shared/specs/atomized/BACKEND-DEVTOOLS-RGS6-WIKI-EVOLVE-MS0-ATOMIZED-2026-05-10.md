---
milestone: WIKI-EVOLVE-MS0
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-D-knowledge-vault
commit_prefix: "[lane-D-knowledge-vault][WIKI-EVOLVE-MS0]"
total_units: 6
critical_path_role: Karpathy compounding-wiki ritual — promotes fleeting/memory to wiki; Boris back-flow keeps CLAUDE.md current; TodoWrite ↔ handoff bridge keeps task surfaces unified
loop_registrations: 3 (fleeting-promote weekly, claude-md-backflow daily, wiki-rename-propagate on-event)
date: 2026-05-10
---

# WIKI-EVOLVE-MS0 — atomized (6 units)

> Compounding wiki ritual. The wiki should grow more useful every week, not rot. Promotion rituals (memory → wiki), back-flow rituals (regression → CLAUDE.md), rename-propagation, MOC discoverability, and TodoWrite↔handoff bridging are the maintenance backbone. Lane-D continues here after OBSIDIAN-COMPOUND-MS1.

---

## U-WIKI-FLEETING-PROMOTE — Memory→wiki promotion engine (Matuschak evergreen pattern)

- pillar: knowledge
- tier: T1
- ai_priority_score: 78
- leverage_score: 12
- why: PRISM memories tagged "permanent" should compound into the wiki as evergreen entries; otherwise insights stay siloed per-chat; this is the same idea as U-VAULT02 but operates on `memory/` not the obsidian vault
- depends_on: []
- blocks: [U-WIKI-MOC-BUILDER (for newly-promoted entries)]
- parallel_with: [U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-CLAUDE-MD-BACKFLOW, U-TODOWRITE-HANDOFF-BRIDGE]
- viz_node_id: `core.engine.memorywikipromotion` (TBD-create)
- closes_synergy_edge: memory × wiki
- loop_schedule: weekly (cron `0 8 * * 1`)

verifies_via:
  channel: e2e
  tool: `node scripts/memory-promote.mjs --dry-run`
  expected_signal: lists ≥1 promotion candidate; on real run, wiki entry materialized at expected path
  re_run_cost: 5s
  baseline: zero automated promotions today

micro_steps:
  - step-1:
      tool: Read
      path: `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md`
      action: confirm pointer-style index format
      verify: ≥3 entries in pointer style
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/MemoryWikiPromotionEngine.ts`
      action: implement `findCandidates()` (memories tagged `promote:wiki` or `type: reference` with `permanent:true`), `promote(candidate)` (materialize `knowledge/wiki/<area>/<slug>.md` with frontmatter, append to wiki index)
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/MemoryWikiPromotionEngine.test.ts`
      action: 5 cases (happy, already-promoted, slug collision, malformed frontmatter, ambiguous area)
      verify: 5/5 pass
  - step-4:
      tool: Write
      path: `scripts/memory-promote.mjs`
      action: CLI wrapper with `--dry-run`, `--limit N`
      verify: dry-run lists ≥1 candidate
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: register cron weekly
      verify: registry contains entry

adversarial_cases:
  - candidate slug collides with existing wiki entry → require user merge, log conflict
  - memory file references another not-yet-promoted memory → defer to next pass
  - 100 candidates in one run → cap at 10 promotions per run

variability_axis:
  - 0 / 5 / 100 candidates per pass
  - first-time vs recurring (most candidates already promoted)

failure_modes:
  - wiki index file locked by another chat → file-claim-guard handles
  - candidate has malformed frontmatter → log + skip + flag for manual review
  - cron registry write race → file-claim lock

---

## U-WIKI-WAYBACK-CRON — Archive.org snapshot of wiki external citations

- pillar: knowledge
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: wiki entries cite ~hundreds of external URLs; without archival, link-rot silently degrades provenance. This is the wiki-scoped counterpart to OBSIDIAN-COMPOUND-MS1::U-OB-6 (which archives research cards)
- depends_on: []
- blocks: []
- parallel_with: [U-WIKI-FLEETING-PROMOTE, U-WIKI-RENAME-PROPAGATE, U-WIKI-MOC-BUILDER, U-CLAUDE-MD-BACKFLOW, U-TODOWRITE-HANDOFF-BRIDGE]
- viz_node_id: `core.script.wikiwaybackcron` (TBD-create)
- closes_synergy_edge: wiki × archival
- loop_schedule: 24h (cron `15 2 * * *`)

verifies_via:
  channel: e2e
  tool: `node scripts/wiki-wayback.mjs --source knowledge/wiki/`
  expected_signal: archives all newly-cited URLs; existing URLs skipped
  re_run_cost: 30s per new URL (rate-limited)
  baseline: no archival of wiki citations

micro_steps:
  - step-1:
      tool: Grep
      path: `knowledge/wiki/`
      action: extract all `https?://` URLs
      verify: ≥100 URLs (we have 722 wiki entries with regular external refs)
  - step-2:
      tool: Write
      path: `scripts/wiki-wayback.mjs`
      action: reuse U-OB-6's archive engine if shipped, else port the same logic; write to `state/shared/wiki-wayback-index.json`
      verify: dry-run prints plan
  - step-3:
      tool: Write
      path: `state/shared/wiki-wayback-index.json`
      action: initialize schema
      verify: valid JSON
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: cron register `15 2 * * *` (offset 15min from OBSIDIAN-COMPOUND's wayback to avoid rate-limit collision)
      verify: registry contains entry

adversarial_cases:
  - wayback 429 → backoff, defer
  - URL behind paywall (403) → record `unarchivable`
  - rapid wiki growth (1000 new URLs in a week) → batch over multiple nights

variability_axis:
  - 0 / 100 / 10000 unique URLs

failure_modes:
  - wayback unreachable → defer batch to next night
  - JSON write race → atomic rename
  - duplicate URL → dedup by hash

---

## U-WIKI-RENAME-PROPAGATE — Wiki rename propagation engine

- pillar: knowledge
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: when a wiki entry is renamed (e.g. `kienzle.md` → `kienzle-mechanistic-model.md`) all references in other wiki entries, CLAUDE.md, code comments, and MOC files must update — manual upkeep fails within 3 renames
- depends_on: []
- blocks: []
- parallel_with: [U-WIKI-FLEETING-PROMOTE, U-WIKI-WAYBACK-CRON, U-WIKI-MOC-BUILDER, U-CLAUDE-MD-BACKFLOW, U-TODOWRITE-HANDOFF-BRIDGE]
- viz_node_id: `core.engine.wikirenamepropagate` (TBD-create)
- closes_synergy_edge: wiki × cross-ref integrity
- loop_schedule: on-event (git pre-commit hook + manual invocation)

verifies_via:
  channel: e2e
  tool: rename a test wiki entry then `node scripts/wiki-rename-propagate.mjs --from old --to new --dry-run`
  expected_signal: lists every file referencing the old name with planned updates
  re_run_cost: 8s scan
  baseline: renames break refs silently today

micro_steps:
  - step-1:
      tool: Write
      path: `mcp-server/src/engines/WikiRenamePropagateEngine.ts`
      action: implement `findReferences(oldName)` (grep over `knowledge/wiki/`, `H:/prism/CLAUDE.md`, `mcp-server/src/`, `state/shared/`), `applyRename(oldName, newName)` (perform safe edits respecting markdown link syntax + heading anchors)
      verify: tsc clean
  - step-2:
      tool: Write
      path: `mcp-server/src/__tests__/WikiRenamePropagateEngine.test.ts`
      action: 5 cases (happy markdown links, code-comment refs, frontmatter cross-refs, no-references-found, ambiguous partial-name match)
      verify: 5/5 pass
  - step-3:
      tool: Write
      path: `scripts/wiki-rename-propagate.mjs`
      action: CLI `--from`, `--to`, `--dry-run`, `--apply`
      verify: dry-run on fixture rename lists changes
  - step-4:
      tool: Write
      path: `.claude/hooks/wiki-rename-pre-commit.mjs`
      action: hook — when commit message includes `[WIKI-RENAME]`, refuse if propagation log empty (must run script first)
      verify: hook fires on synthetic commit message
  - step-5:
      tool: Edit
      path: `.claude/settings.json`
      action: register the new hook (PreCommit-equivalent or Stop)
      verify: `verify-hook-refs --self-test` passes

adversarial_cases:
  - old name is a common word (e.g. `force`) → require `--exact` flag
  - rename target collides with existing entry → refuse
  - circular rename (A→B, B→A in same run) → process serially, log warning

variability_axis:
  - 0 / 10 / 1000 references
  - ASCII / unicode / regex-special chars in names

failure_modes:
  - grep across codebase OOM → cap files-per-grep, stream
  - safe-edit fails (file unwritable) → roll back partial edits
  - hook bypass attempt → hook is HARD-BLOCK

---

## U-WIKI-MOC-BUILDER — MOC auto-builder for wiki areas (Nick Milo pattern)

- pillar: knowledge
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: 722 wiki entries are unwieldy without area-MOCs; auto-build keeps navigation maintained without manual upkeep. Counterpart to OBSIDIAN-COMPOUND-MS1::U-OB-4 (which targets the obsidian vault); this one operates on `knowledge/wiki/`
- depends_on: [U-WIKI-FLEETING-PROMOTE]
- blocks: []
- parallel_with: [U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-CLAUDE-MD-BACKFLOW, U-TODOWRITE-HANDOFF-BRIDGE]
- viz_node_id: `core.engine.wikimocbuilder` (TBD-create)
- closes_synergy_edge: wiki × navigation
- loop_schedule: daily (cron `30 5 * * *`)

verifies_via:
  channel: e2e
  tool: `node scripts/wiki-moc-builder.mjs --area Manufacturing`
  expected_signal: writes `knowledge/wiki/_moc/manufacturing.md` listing entries grouped by sub-domain
  re_run_cost: 6s
  baseline: no MOCs in wiki

micro_steps:
  - step-1:
      tool: Read
      path: `knowledge/wiki/index.md`
      action: confirm entry frontmatter has `area:` or domain tag
      verify: ≥5 distinct areas inferred
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/WikiMOCBuilderEngine.ts`
      action: implement `buildMOC(area)` → `knowledge/wiki/_moc/<area>.md` with frontmatter `type: moc, area: <area>` and grouped link list
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/WikiMOCBuilderEngine.test.ts`
      action: 5 cases (happy area, empty area, area with 500 entries, unicode area name, area with sub-domain hint)
      verify: 5/5 pass
  - step-4:
      tool: Write
      path: `scripts/wiki-moc-builder.mjs`
      action: CLI wrapper; default iterates all known areas
      verify: smoke run on `Manufacturing` produces non-empty MOC
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: cron register daily
      verify: registry contains entry

adversarial_cases:
  - 500 entries in one area → cap 200 per MOC, link continuation
  - unicode area names → safe filename escape
  - area-tag missing on entries → infer from path segment

variability_axis:
  - 0 / 10 / 1000 entries per area
  - 1 / 10 / 50 distinct areas

failure_modes:
  - filesystem write race → file-claim
  - OOM on 5000 entries → stream-write
  - heuristic mis-grouping → log warning, do not block

---

## U-CLAUDE-MD-BACKFLOW — Boris back-flow hook (regression → CLAUDE.md §Recent regressions)

- pillar: knowledge
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: Boris Cherny doctrine — when a regression is detected the durable learning belongs in CLAUDE.md so future sessions see it on every load; PRISM has a regression-hunter agent but no auto-append back-flow
- depends_on: []
- blocks: []
- parallel_with: [U-WIKI-FLEETING-PROMOTE, U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-WIKI-MOC-BUILDER, U-TODOWRITE-HANDOFF-BRIDGE]
- viz_node_id: `core.hook.claudemdbackflow` (TBD-create)
- closes_synergy_edge: regression-hunter × CLAUDE.md
- loop_schedule: on-event (regression-hunter agent post-run)

verifies_via:
  channel: e2e
  tool: synthetic regression-hunter output → `node .claude/hooks/claude-md-backflow.mjs --post` → verify `CLAUDE.md` updated
  expected_signal: §Recent regressions section gains one entry; commit message of the change cites the source incident
  re_run_cost: 1s
  baseline: regressions are discussed in chat then forgotten

micro_steps:
  - step-1:
      tool: Read
      path: `H:/prism/CLAUDE.md`
      action: confirm or add `## Recent regressions (auto-managed)` section anchor
      verify: anchor present, cap explicit (e.g. last 10 entries)
  - step-2:
      tool: Write
      path: `.claude/hooks/claude-md-backflow.mjs`
      action: hook that consumes regression-hunter JSON output and appends a 2-line entry under the section (header `### YYYY-MM-DD <slug>`, body `**Cause:** ... **Guard:** ...`); evict oldest beyond cap
      verify: hook self-test passes
  - step-3:
      tool: Edit
      path: `.claude/settings.json`
      action: register the hook on appropriate event (SubagentStop for regression-hunter)
      verify: `verify-hook-refs --self-test` passes
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: synthetic regression-hunter JSON via fixture; hook fires; verify CLAUDE.md change
      verify: diff shows expected append

adversarial_cases:
  - regression-hunter output malformed → hook validates schema, refuses partial append
  - duplicate regression already in CLAUDE.md → dedup by cause-hash
  - section grows unbounded → cap at last 10 entries; evict to `state/shared/regression-archive.md`
  - CLAUDE.md edited concurrently → file-claim guard handles

variability_axis:
  - 0 / 5 / 50 regressions per month
  - similar / divergent cause patterns

failure_modes:
  - hook write race → file-claim
  - schema drift in regression-hunter output → schema-validate, fall back to no-op
  - cap-eviction archive write fails → log, keep CLAUDE.md untouched (better than corruption)

---

## U-TODOWRITE-HANDOFF-BRIDGE — TodoWrite ↔ handoff state bridge

- pillar: knowledge
- tier: T1
- ai_priority_score: 65
- leverage_score: 11
- why: TodoWrite tasks are session-local; per-agent handoff is cross-session; without a bridge, in-progress tasks at compact time are lost from continuity. This bridge serializes in_progress tasks into handoff `--state` automatically
- depends_on: []
- blocks: []
- parallel_with: [U-WIKI-FLEETING-PROMOTE, U-WIKI-WAYBACK-CRON, U-WIKI-RENAME-PROPAGATE, U-WIKI-MOC-BUILDER, U-CLAUDE-MD-BACKFLOW]
- viz_node_id: `core.helper.todohandoffbridge` (TBD-create)
- closes_synergy_edge: TodoWrite × handoff

verifies_via:
  channel: e2e
  tool: create 3 todos (1 in_progress, 1 pending, 1 completed) → `/precompact` → verify resulting `HANDOFF-*.md` `--state` body lists in_progress + pending
  expected_signal: handoff `--state` includes the 2 unfinished tasks (in_progress + pending)
  re_run_cost: 4s
  baseline: handoff `--state` is written by hand each time; tasks drop silently

micro_steps:
  - step-1:
      tool: Read
      path: `.claude/helpers/per-agent-handoff.mjs`
      action: confirm `write --state <body>` accepts arbitrary markdown
      verify: confirmed
  - step-2:
      tool: Write
      path: `.claude/helpers/todowrite-handoff-bridge.mjs`
      action: helper that reads current session's TodoList, filters non-completed, formats as markdown bullets, returns string
      verify: smoke run returns formatted block
  - step-3:
      tool: Edit
      path: `.claude/helpers/precompact-handoff.mjs`
      action: invoke bridge to compose `--state` body if not provided explicitly
      verify: synthetic precompact run produces handoff with task block
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/todowrite-handoff-bridge.test.ts`
      action: 5 cases (all-pending, all-completed, mixed, empty, unicode subject)
      verify: 5/5 pass

adversarial_cases:
  - TodoList endpoint unavailable → bridge returns empty block + warning
  - 500 tasks in list → cap render at 50 with `... +N more` footer
  - in_progress task with stale activeForm → render activeForm raw
  - precompact concurrent fires → file-claim on handoff path

variability_axis:
  - 0 / 10 / 500 tasks
  - all-completed vs all-pending

failure_modes:
  - TodoList API change → bridge schema-validates, falls back to empty block
  - handoff path concurrent write → file-claim
  - bridge throws → precompact-handoff catches and continues with manual `--state` if provided

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone WIKI-EVOLVE-MS0`
- per-unit-pre: `file-claim-guard` (wiki index frequent contention) + `duplication-hard-block`
- per-unit-post: `comprehensive-build-enforce` + `stop_on_unwired_assets`
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-WIKI-EVOLVE-MS0.md`

## Variability-axis summary

zero-state, mid-scale, heavy-volume covered. Failure-mode in each unit specifies graceful degradation (skip/warn/log) rather than crash. Race-on-shared-files (wiki index, CLAUDE.md, handoff state) addressed via file-claim-guard across all six.

## Failure-mode summary

Common patterns across the six units:
- File contention → file-claim-guard
- Schema drift → schema-validate, graceful skip
- Resource limit (OOM, rate-limit) → batch + backoff
- Concurrent fires → file-claim or atomic-rename
- Adversarial input (collision, ambiguous match, malformed) → reject with clear code, log to dedicated channel

## Lane ownership + commit format

- Lane: lane-D-knowledge-vault
- Commit format: `[lane-D-knowledge-vault][WIKI-EVOLVE-MS0]/<U-id>: <title>`
- Worktree (if forked): `H:/prism-wiki-evolve/` (branch `work/wiki-evolve-ms0`)

## Next milestone in lane

KNOWLEDGE-VAULT-MS0 (lane-D's terminal milestone).
