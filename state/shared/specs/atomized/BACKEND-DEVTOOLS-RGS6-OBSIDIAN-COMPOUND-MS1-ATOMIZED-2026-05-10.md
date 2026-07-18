---
milestone: OBSIDIAN-COMPOUND-MS1 (extended)
parent_roadmap: BACKEND-DEVTOOLS-RGS6-MEGA-ROADMAP-2026-05-10.md
inherits_protocol: BACKEND-DEVTOOLS-RGS6-AUTONOMOUS-EXECUTION-PROTOCOL.md (§7 implicit)
assigned_lane: lane-D-knowledge-vault
commit_prefix: "[lane-D-knowledge-vault][OBSIDIAN-COMPOUND-MS1]"
total_units: 6
critical_path_role: bidirectional sync layer between Obsidian vault and PRISM wiki/memory; foundation for KNOWLEDGE-VAULT-MS0 promotions
loop_registrations: 2 (fleeting-promote weekly, wayback-archive 24h)
date: 2026-05-10
---

# OBSIDIAN-COMPOUND-MS1 — atomized (extended, 6 units)

> Bidirectional vault sync. Obsidian becomes the human surface; PRISM wiki/memory remains the machine surface. Bridges keep both in lockstep. Lane-D owns this — depends on nothing, blocks KNOWLEDGE-VAULT-MS0 promotion engine.

---

## U-OB-1 — Build `WikiObsidianBridgeEngine` (bidirectional)

- pillar: knowledge
- tier: T1
- ai_priority_score: 75
- leverage_score: 12
- why: vault edits should propagate to wiki; wiki updates should mirror to vault — single source of truth eliminated, dual-write reality acknowledged
- depends_on: []
- blocks: [U-OB-3, U-OB-4]
- parallel_with: [U-OB-2, U-OB-5, U-OB-6]
- viz_node_id: `core.engine.wikiobsidianbridge` (TBD-create)
- closes_synergy_edge: wiki × obsidian
- loop_schedule: 5min (file-watch debounce)

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/WikiObsidianBridgeEngine.test.ts`
  expected_signal: round-trip test passes (note → obsidian → wiki → obsidian, byte-equal frontmatter + body hash)
  re_run_cost: 8s
  baseline: engine does not exist; current sync is manual copy-paste

micro_steps:
  - step-1:
      tool: Read
      path: `knowledge/wiki/index.md`
      action: confirm frontmatter shape (`---\nname: ...\ndescription: ...\ntype: ...\n---`)
      verify: frontmatter delimiter pairs balanced; ≥3 expected fields per entry
  - step-2:
      tool: Read
      path: any one of `H:/PRISM Obsidian Vault/*.md` (or whichever vault root is configured)
      action: confirm Obsidian frontmatter convention used in this vault
      verify: file readable; frontmatter detected
  - step-3:
      tool: Write
      path: `mcp-server/src/engines/WikiObsidianBridgeEngine.ts`
      action: implement `syncWikiToObsidian(wikiEntryPath) → { written: boolean, path: string }` and `syncObsidianToWiki(obsidianNotePath) → { wikiPath, conflicts: Conflict[] }`; frontmatter mapper translates `type` ↔ Obsidian tags
      verify: tsc clean
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/WikiObsidianBridgeEngine.test.ts`
      action: 5 cases — happy-path round-trip, frontmatter conflict, body conflict, missing source, malformed frontmatter
      verify: `npx vitest run` for this file passes 5/5
  - step-5:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/contextDispatcher.ts`
      action: register `bridge_wiki_obsidian` action that dispatches into engine
      verify: round-trip MCP call returns { written: true }

adversarial_cases:
  - vault file deleted while sync queued
  - frontmatter type unknown to wiki (e.g. `type: scratch`)
  - file with no frontmatter at all
  - both sides edited simultaneously (last-write-wins must be deterministic)
  - vault path contains spaces / non-ASCII

variability_axis:
  - 0 / 10 / 5000 vault notes
  - same-content / minor-frontmatter-diff / divergent-body

failure_modes:
  - obsidian vault path env-var unresolved → engine refuses to construct, logs `VAULT_PATH_MISSING`
  - simultaneous edits → take the file with the newer mtime + log a conflict to `state/shared/vault-sync-conflicts.jsonl`
  - filesystem race → use `fs.promises.rename()` atomic moves where possible

---

## U-OB-2 — Build `MemoryObsidianBridgeEngine`

- pillar: knowledge
- tier: T1
- ai_priority_score: 70
- leverage_score: 11
- why: PRISM memory entries should appear in the human-facing vault for browsing; vault notes flagged as memory should write back to the memory store
- depends_on: []
- blocks: [U-OB-4]
- parallel_with: [U-OB-1, U-OB-5, U-OB-6]
- viz_node_id: `core.engine.memoryobsidianbridge` (TBD-create)
- closes_synergy_edge: memory × obsidian
- loop_schedule: 5min

verifies_via:
  channel: test
  tool: `npx vitest run src/__tests__/MemoryObsidianBridgeEngine.test.ts`
  expected_signal: memory entry appears in obsidian vault within 5s of write
  re_run_cost: 6s
  baseline: engine does not exist

micro_steps:
  - step-1:
      tool: Read
      path: `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` (and one indexed memory file like `reference_milestone_progress_surface.md`)
      action: confirm memory frontmatter (`name`, `description`, `type` in {user, feedback, project, reference})
      verify: pointer-style entries one per line in MEMORY.md
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/MemoryObsidianBridgeEngine.ts`
      action: implement `pushMemoryToVault(memoryFilePath)` (copies to `<vault>/PRISM-Memory/<type>/<name>.md` preserving frontmatter) + `pullVaultToMemory(notePath)` (writes new memory file + appends to MEMORY.md index)
      verify: tsc clean
  - step-3:
      tool: Write
      path: `mcp-server/src/__tests__/MemoryObsidianBridgeEngine.test.ts`
      action: 5 cases (happy push, happy pull, MEMORY.md duplicate-index rejection, malformed memory file, vault folder missing)
      verify: 5/5 pass
  - step-4:
      tool: Edit
      path: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`
      action: register `bridge_to_obsidian` + `bridge_from_obsidian` actions
      verify: round-trip both
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: smoke: create test memory file, dispatch `bridge_to_obsidian`, ls vault
      verify: file present in vault within 5s

adversarial_cases:
  - vault `PRISM-Memory/` subfolder doesn't exist on first push
  - memory with frontmatter `type` outside the 4-type enum
  - vault note has no `type` tag at all → must default to `user` not crash
  - MEMORY.md index race (two pulls touching index simultaneously)

variability_axis:
  - 0 / 50 / 500 memory entries
  - all-permanent / all-fleeting / mixed

failure_modes:
  - vault subfolder missing → `fs.mkdirSync(..., { recursive: true })` before push
  - MEMORY.md race → file-claim lock on `MEMORY.md` for the entire pull cycle
  - non-enum `type` → reject with `INVALID_MEMORY_TYPE` and log to `state/shared/vault-sync-conflicts.jsonl`

---

## U-OB-3 — Fleeting → permanent promotion ritual

- pillar: knowledge
- tier: T1
- ai_priority_score: 65
- leverage_score: 10
- why: Matuschak evergreen-notes pattern — fleeting notes (daily, scratch) get reviewed weekly and either promoted to permanent (with stable name, atomic concept) or deleted; without the ritual the vault drowns in cruft
- depends_on: [U-OB-1]
- blocks: []
- parallel_with: [U-OB-4, U-OB-5, U-OB-6]
- viz_node_id: `core.script.fleetingpromote` (TBD-create)
- closes_synergy_edge: vault × wiki promotion
- loop_schedule: weekly (cron `0 9 * * 0`)

verifies_via:
  channel: e2e
  tool: `node scripts/fleeting-promote.mjs --dry-run`
  expected_signal: lists ≥3 fleeting candidates and emits 3 proposed permanent paths
  re_run_cost: 4s
  baseline: ritual does not exist; vault has no fleeting/permanent distinction yet

micro_steps:
  - step-1:
      tool: Write
      path: `H:/PRISM Obsidian Vault/_templates/fleeting.md`
      action: create vault template with `type: fleeting` frontmatter + a `promote_to:` slot
      verify: file exists and parses as MD
  - step-2:
      tool: Write
      path: `scripts/fleeting-promote.mjs`
      action: scan vault for `type: fleeting` files with `promote_to: <stable-name>` slot filled → call `WikiObsidianBridgeEngine.syncObsidianToWiki` with destination override; emit summary JSON
      verify: `--dry-run` lists candidates
  - step-3:
      tool: Bash
      path: `H:/prism/`
      action: register cron `0 9 * * 0`
      verify: `cat .claude/cron-registry.json` shows entry
  - step-4:
      tool: Write
      path: `state/shared/vault-fleeting-log.jsonl`
      action: initialize empty append-only log
      verify: file present, size 0

adversarial_cases:
  - `promote_to:` slot empty (skip, don't error)
  - duplicate `promote_to:` across two fleeting notes (refuse both, log conflict)
  - target permanent name already exists in wiki (require user merge)

variability_axis:
  - 0 / 10 / 100 fleeting notes pending
  - 0 / 5 / 50 promotions per week

failure_modes:
  - vault folder unreadable → exit 2, log to `state/shared/vault-sync-conflicts.jsonl`
  - cron registry write race → file-claim lock the registry
  - destination collision → refuse with `PROMOTE_TARGET_EXISTS`

---

## U-OB-4 — MOC (Map of Content) auto-generator (Nick Milo pattern)

- pillar: knowledge
- tier: T1
- ai_priority_score: 60
- leverage_score: 10
- why: MOCs are the navigational backbone of large vaults; auto-generating from existing engine/wiki clusters gives navigability without manual upkeep
- depends_on: [U-OB-1, U-OB-2]
- blocks: []
- parallel_with: [U-OB-3, U-OB-5, U-OB-6]
- viz_node_id: `core.engine.mocgenerator` (TBD-create)
- closes_synergy_edge: domain-cluster × vault navigation
- loop_schedule: daily (cron `0 5 * * *`)

verifies_via:
  channel: e2e
  tool: `node scripts/generate-moc.mjs --domain Manufacturing`
  expected_signal: writes `<vault>/MOC-Manufacturing.md` listing ≥10 entries grouped by sub-area
  re_run_cost: 6s
  baseline: no MOCs exist yet

micro_steps:
  - step-1:
      tool: Read
      path: `knowledge/wiki/index.md`
      action: confirm wiki entries are tagged with domain hints (e.g. `WEDM`, `Lathe`, `CAD`)
      verify: ≥5 distinct domains present
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/MOCGeneratorEngine.ts`
      action: implement `generate(domainSlug) → { mocPath, entryCount, subAreas }` — group wiki entries by sub-area heuristic (kebab-segment of name + dispatcher hints)
      verify: tsc clean
  - step-3:
      tool: Write
      path: `scripts/generate-moc.mjs`
      action: CLI wrapper accepting `--domain X` (defaults: iterates the 8 top domains)
      verify: `--domain Manufacturing` writes a non-empty MOC file
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/MOCGeneratorEngine.test.ts`
      action: 5 cases (happy 10+ entries, domain with 0 entries, single-entry domain, unicode domain, special chars)
      verify: 5/5 pass
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: cron register `0 5 * * *`
      verify: registry contains entry

adversarial_cases:
  - domain with 0 wiki entries → emit empty MOC stub with explanation, do not crash
  - 10k entries in one domain → must paginate or split (cap 200 entries per MOC, link continuation)
  - non-ASCII domain (e.g. `日本語`) → file path safe-escape

variability_axis:
  - 0 / 10 / 1000 entries per domain
  - 1 / 8 / 50 distinct domains

failure_modes:
  - vault path missing → defer to `WikiObsidianBridgeEngine.vaultRoot()` resolver and fail with the same message
  - generator OOM on 10k entries → stream-write file, never accumulate full list in memory
  - sub-area heuristic mis-grouping → log warning, do not block emit

---

## U-OB-5 — Smart-Connections-equivalent in-PRISM (embedding search over vault)

- pillar: knowledge
- tier: T1
- ai_priority_score: 55
- leverage_score: 9
- why: Obsidian's Smart-Connections plugin gives semantic neighbors per note; replicating this in-PRISM (using existing Qdrant memory) gives the same UX without external plugin lock-in
- depends_on: [U-OB-1]
- blocks: []
- parallel_with: [U-OB-3, U-OB-4, U-OB-6]
- viz_node_id: `core.engine.vaultsemanticsearch` (TBD-create)
- closes_synergy_edge: qdrant × vault navigation
- loop_schedule: 1h (re-embed delta)

verifies_via:
  channel: e2e
  tool: `node scripts/vault-semantic.mjs --query "kienzle" --top-k 5`
  expected_signal: returns 5 vault notes ranked by cosine, top hit semantically related to Kienzle/cutting-force
  re_run_cost: 3s
  baseline: vault search is keyword-only (Obsidian default)

micro_steps:
  - step-1:
      tool: Read
      path: `mcp-server/src/engines/QdrantMemoryEngine.ts`
      action: confirm collection-creation + upsert + search APIs available
      verify: methods `upsert`, `search`, `createCollection` exist
  - step-2:
      tool: Write
      path: `mcp-server/src/engines/VaultSemanticSearchEngine.ts`
      action: implement `indexNote(notePath)`, `removeNote(notePath)`, `search(query, k)`; create dedicated qdrant collection `vault-obsidian`
      verify: tsc clean
  - step-3:
      tool: Write
      path: `scripts/vault-semantic.mjs`
      action: CLI wrapper accepting `--query`, `--top-k`, `--rebuild`
      verify: smoke run returns JSON with `top: [{path, score}]`
  - step-4:
      tool: Write
      path: `mcp-server/src/__tests__/VaultSemanticSearchEngine.test.ts`
      action: 5 cases (happy search, empty query, query >2k tokens, deleted-note cleanup, batch index 100 notes)
      verify: 5/5 pass
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: cron register hourly delta re-index
      verify: registry contains entry

adversarial_cases:
  - Qdrant offline → fall back to keyword search, log `QDRANT_OFFLINE_FALLBACK`
  - 50k vault notes → batch index by 200, no single upsert request > 1MB
  - same note edited mid-index → re-queue, dedup by mtime

variability_axis:
  - 100 / 5000 / 50000 vault notes
  - english / multilingual / code-heavy

failure_modes:
  - embedding model unreachable → fall back to BM25-style keyword, surface `EMBEDDING_DEGRADED` in result
  - qdrant returns 5xx → retry x3 exponential, then fall back
  - collection schema drift → re-create collection (one-shot), preserve old as `vault-obsidian-archive`

---

## U-OB-6 — Wayback-archive cron for external sources

- pillar: knowledge
- tier: T1
- ai_priority_score: 50
- leverage_score: 9
- why: pass-2 research cites 116 sources; URL-rot is the silent killer of research provenance. Archive.org snapshots make sources permanently citable
- depends_on: []
- blocks: []
- parallel_with: [U-OB-1, U-OB-2, U-OB-3, U-OB-4, U-OB-5]
- viz_node_id: `core.script.waybackcron` (TBD-create)
- closes_synergy_edge: research-cards × archival
- loop_schedule: 24h (cron `0 2 * * *`)

verifies_via:
  channel: e2e
  tool: `node scripts/wayback-archive.mjs --source state/shared/research/`
  expected_signal: for each unique URL in research cards, an archive URL is recorded in `state/shared/wayback-index.json`
  re_run_cost: 30s per source card (rate-limited)
  baseline: zero archival; if a cited URL 404s today we lose provenance

micro_steps:
  - step-1:
      tool: Grep
      path: `state/shared/research/`
      action: extract all `https?://` URLs from research markdown
      verify: ≥50 URLs extracted (we have 116 sources across 5 pass-2 cards)
  - step-2:
      tool: Write
      path: `scripts/wayback-archive.mjs`
      action: for each URL, call `https://web.archive.org/save/<url>`; on success record `{ url, archiveUrl, archivedAt, sourceCard }` to `state/shared/wayback-index.json`; respect rate limit (1 req / 10s default)
      verify: dry-run prints planned requests without executing
  - step-3:
      tool: Write
      path: `state/shared/wayback-index.json`
      action: initialize `{ schemaVersion: "1.0", entries: [] }`
      verify: valid JSON
  - step-4:
      tool: Bash
      path: `H:/prism/`
      action: cron register `0 2 * * *`
      verify: registry contains entry
  - step-5:
      tool: Bash
      path: `H:/prism/`
      action: live smoke — archive 3 known-stable URLs (arxiv.org, github.com, web.archive.org itself)
      verify: 3 archive URLs returned within 60s

adversarial_cases:
  - wayback API rate-limit (HTTP 429) → exponential backoff, skip after 5 retries
  - URL behind auth (returns 401/403) → record `unarchivable: true` with reason, do not retry forever
  - URL is internal LAN (file://, localhost) → skip with `LOCAL_URL_SKIPPED`
  - same URL cited 20 times → archive once, link all citations to same archive entry

variability_axis:
  - 0 / 50 / 5000 unique URLs
  - all-public / mixed-auth / all-internal

failure_modes:
  - wayback unreachable → defer batch to next cron fire (do not crash)
  - JSON file corrupted by interrupted write → use atomic write (`tmp → rename`)
  - duplicate URL race → de-dup by URL hash before insert

---

## Milestone-level autonomous-execution hooks (inherited from AUTONOMOUS-EXECUTION-PROTOCOL.md §7)

- pre-unit: `prism_session:claim_milestone OBSIDIAN-COMPOUND-MS1`
- per-unit-pre: `file-claim-guard` + `duplication-hard-block` + `inventory-check-guard`
- per-unit-post: `comprehensive-build-enforce` + `stop_on_unwired_assets` + `stop-auto-wire` audit
- per-3-units: auto-compact threshold check
- per-milestone-end: `/handoff` writes `HANDOFF-<id>-OBSIDIAN-COMPOUND-MS1.md`

## Variability-axis summary

Across the 6 units we cover: zero-state vs 5k+ scale, well-formed vs malformed input, single-actor vs simultaneous-edit, public-only vs auth-gated external resources, ASCII vs unicode. No unit declares a happy-path-only verify channel.

## Failure-mode summary

Every unit declares: (a) primary infrastructure unavailability, (b) input corruption, (c) concurrency race. No silent-failure paths — every degraded state writes a marker file under `state/shared/vault-sync-conflicts.jsonl` or `state/shared/vault-fleeting-log.jsonl`.

## Lane ownership + commit format

- Lane: lane-D-knowledge-vault
- Commit format: `[lane-D-knowledge-vault][OBSIDIAN-COMPOUND-MS1]/U-OB-<n>: <title>`
- Worktree (if forked): `H:/prism-obsidian-compound-ms1/` (branch `work/obsidian-compound-ms1`)

## Next milestone in lane

KNOWLEDGE-VAULT-MS0 (depends on OBSIDIAN-COMPOUND-MS1 + bidirectional bridges shipping).
