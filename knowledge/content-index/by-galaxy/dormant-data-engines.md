---
name: dormant-data-engines
description: Strategic engine + script digest for the dormant-data galaxy (dormant/orphan-data ledger + reactivation candidate routing, slot victor). Doctrine-grounded, honest counts, false-positives pruned.
type: reference
galaxy: dormant-data
node_type: memory
---

# dormant-data galaxy -- engine digest

## Overview

The dormant-data galaxy (slot victor) owns **knowledge-recovery infrastructure**: finding data/assets
PRISM paid extraction cost for but never wired to a consumer, classifying each, and routing it to the
correct consumer galaxy. Its own `CLAUDE.md` (mcp-server/src/engines/dormant-data/CLAUDE.md:24-34) states
plainly: **no local `.ts` engines live under the galaxy subdir -- this galaxy is infrastructure/protocol
only.** The working substrate is therefore a THREE-part stack: (1) a small set of dormancy/orphan
*classification* engines that live flat in `mcp-server/src/engines/`; (2) a large fleet of orphan/census/
staleness *scripts* under `scripts/`; (3) an append-only ledger + the doctrine-cited guards
(DuplicationGuard, SourcePoisoningSanitizer, the Ledger* primitives).

The core loop (CLAUDE.md sec.7): EXCAVATE roots in strict order (`extracted/` -> `extracted_modules/` ->
rest of codebase) -> CLASSIFY each finding (engine | data | formula | tribal | wiki | other) -> CONSUMER
CHECK (grep across `src/` + skills + dispatchers + hooks -- all four) -> ROUTE (engine-no-consumer to
romeo/wiring; data to knowledge-conversion; formula to physics/constants; tribal to `prism_knowledge:
tribal_capture`) -> RECORD in `state/shared/dormant-data-ledger.jsonl` (create-on-first-use, append-only).
Every unconsumed extract is wasted Anthropic spend, so `mustNotReExtract()` (DuplicationGuardEngine)
THROWS to block re-derivation. Reactivation candidates surface via the dormant-engine-activation roadmap,
which domain-batches unwired engines into per-slot activation units.

**Honest count:** the PATHS.md 65-engine roster is a keyword-match baseline that heavily false-positives
(accounting GeneralLedger, ERP Inventory/EOQ, per-domain LoRA/reasoning-trace ledgers -- those belong to
business/quoting/ai-training/mill/lathe, NOT here). Refined against doctrine, the TRUE galaxy substrate is
**~9 relevant flat engines + 26 dormant/orphan/census scripts** (see Full index). Primary dispatchers:
`prism_dev` (resource_census + dedup checks) and `prism_knowledge` (tribal_capture).

## Strategic categories

1. **Dormancy / staleness detection** -- engines + scripts that decide what is unused, decaying, or stale
   (UnusedAssetSurfacerEngine, ConversationStaleDetectorEngine, node-staleness-rank, generate-staleness-overlay,
   regression-staleness-auditor, prune-stale-tribal-entries, ConversationStaleDetector).
2. **Orphan inventory / audit** -- the built-but-unwired punch-list generators and orphan classifiers
   (orphan-inventory.mjs is the MCP-down canonical entry, audit-orphan-doctrine, helper-orphan-rank,
   hook-orphan-scan, jsonl-orphan-scan, refresh-orphan-report, lint-wiki-orphans, system-viz-dead-pixel-sweep).
3. **Reactivation / roadmap routing** -- turns the raw unwired audit into a slot-split activation roadmap
   (generate-dormant-engine-roadmap.mjs -> DEA-MS0 milestone; kip-rotate-orphans-to-lora rotates dormant
   findings into the LoRA training corpus -- the india handoff edge).
4. **Excavation census** -- full-tree file accounting of the H: drive to find dormant corpora
   (h-drive-census, h-drive-skipped-census, probe-dormant-posts -- the extracted/ post-processor sweep).
5. **Ledger infrastructure** -- append-only ledger primitives that back the dormant-data ledger and
   the golf/peer audit trail (LedgerStoreEngine SQLite-WAL, LedgerProjectorEngine, LedgerRetentionEngine).
6. **Context inventory (token-recovery sibling)** -- ContextInventoryEngine tracks what is already loaded
   in a conversation to prevent re-reads; the in-session analogue of dormant-asset detection.
7. **Ingestion guards (doctrine-cited, cross-galaxy dependencies)** -- DuplicationGuardEngine
   (`mustNotReExtract()` THROWS) + SourcePoisoningSanitizerEngine (sanitize before ingesting any extract).
8. **Orphan hygiene / janitor** -- tmp-orphan-janitor, _temp-orphan-scan, validate-hook-orphan-signal --
   reap/verify orphaned temp + hook artifacts (overlaps fleet-hygiene golf; deduplicate before parallel work).

## Key engines + scripts (detailed)

### UnusedAssetSurfacerEngine
Flags underutilized assets from invocation telemetry into three buckets: zero-invocation (never used in
window), decaying (was active, gone quiet), capacity-constrained (high rate -> shard/load-balance). Each
candidate carries a numeric severity (0..1) + rationale so hooks can rank/throttle. The engine-side heart
of "what is dormant." File: `mcp-server/src/engines/UnusedAssetSurfacerEngine.ts`.

### ConversationStaleDetectorEngine
Identifies conversation segments safe to DROP before compaction (resolved_error, completed_task,
abandoned_plan, failed_exploration, duplicate_attempt, stale_status_check) with keep-overrides
(referenced_recently, linked_to_active_task, canonical_reference). The in-session dormancy detector --
complements CompactionSurvivalEngine (which scores what to KEEP). File:
`mcp-server/src/engines/ConversationStaleDetectorEngine.ts`.

### LedgerStoreEngine
SQLite-WAL domain ledger backing the golf watchdog + peer chats (bug_attribution, peer_audit_ticks,
chat_bus_signals, golf_envelope_mutations, ledger_meta). Read-only `query()` rejects non-SELECT; `migrate()`
idempotent. The persistence primitive the append-only dormant-data ledger discipline builds on. File:
`mcp-server/src/engines/LedgerStoreEngine.ts`.

### ContextInventoryEngine
Inventories what has been loaded into the conversation (files read, searches, decisions, facts) to prevent
duplicate loading -- claims 500-5000 tokens saved per session. A dormant-data pattern applied to live
context rather than disk assets. File: `mcp-server/src/engines/ContextInventoryEngine.ts`.

### orphan-inventory.mjs  (script -- CANONICAL entry)
The built-but-unwired audit punch list. Reads system-graph.json, applies the MasterIndexEngine orphan
classifier (low in/out-degree + has wiki/memory docs), groups by layer + heuristic dispatcher hint, and
(F1 extension) ranks candidates via WiringPotentialEngine. Writes ORPHAN-INVENTORY.md + a <5KB summary.
This is the doctrine's MCP-down fallback (CLAUDE.md:52). File: `scripts/orphan-inventory.mjs`.

### generate-dormant-engine-roadmap.mjs  (script)
Turns the raw unwired-engine audit into a "true roadmap": domain-batched activation units split across the
25 work slots, each unit carrying a domain + keyword set so wiki/tribal injectors light up at pickup. Reads
the FRESHEST dated unwired audit (not a hardcoded stale date). Emits DEA-MS0 milestone envelope. The
reactivation-routing heart of the galaxy. File: `scripts/generate-dormant-engine-roadmap.mjs`.

### h-drive-census.mjs  (script)
Full file accounting of the whole H:/prism tree (noise-dirs skipped) -> per-file manifest + 10 equal
buckets for parallel coverage agents. The excavation-census tool that finds dormant corpora at drive scale.
Companion: `h-drive-skipped-census.mjs` (accounts for what was intentionally skipped). File:
`scripts/h-drive-census.mjs`.

### probe-dormant-posts.mjs  (script)
Probes high-value dormant post-processor `.js` files under `extracted{,_modules}/` for class/function
signatures to cross-check whether the surface already exists in mcp-server under a different name -- a
concrete instance of the CONSUMER CHECK step. File: `scripts/probe-dormant-posts.mjs`.

### kip-rotate-orphans-to-lora.mjs  (script)
Rotates dormant/orphan findings into the LoRA training corpus -- the concrete india (ai-training) handoff
edge from CLAUDE.md sec.9: "high-value tribal/data findings feed RAG/LoRA corpora." Has a companion test.
File: `scripts/kip-rotate-orphans-to-lora.mjs`.

## Full index

| Asset | Kind (engine/script) | Category | One-line |
|-------|----------------------|----------|----------|
| UnusedAssetSurfacerEngine | engine | Dormancy detection | Buckets assets: zero-invocation / decaying / capacity-constrained (severity 0..1). |
| ConversationStaleDetectorEngine | engine | Dormancy detection | Flags conversation segments safe to drop pre-compaction; keep-overrides. |
| ContextInventoryEngine | engine | Context inventory | Tracks what is loaded in context to prevent re-reads (token recovery). |
| LedgerStoreEngine | engine | Ledger infra | SQLite-WAL domain ledger (bug attribution, audit ticks, chat-bus signals). |
| LedgerProjectorEngine | engine | Ledger infra (name-derived) | Projects/replays ledger events into read-model state. |
| LedgerRetentionEngine | engine | Ledger infra (name-derived) | Retention/pruning policy for append-only ledger growth. |
| DuplicationGuardEngine | engine | Ingestion guard | `mustNotReExtract()`/`checkBeforeCreating()` THROW on re-derivation (doctrine-cited). |
| SourcePoisoningSanitizerEngine | engine | Ingestion guard | Sanitize any extracted content before ingest (doctrine-cited, mandatory). |
| UnifiedErrorLedgerEngine | engine | Ledger infra (name-derived) | Unified error/mistake ledger; cross-cutting, feeds mistake-learning loop. |
| orphan-inventory.mjs | script | Orphan inventory | CANONICAL built-but-unwired punch list; MCP-down fallback entry. |
| generate-dormant-engine-roadmap.mjs | script | Reactivation routing | Unwired audit -> slot-split activation roadmap (DEA-MS0). |
| audit-orphan-doctrine.mjs | script | Orphan inventory | Audits orphan-handling against the doctrine rules. |
| helper-orphan-rank.mjs | script | Orphan inventory | Ranks orphan candidates by wiring potential (+ .test.mjs). |
| hook-orphan-scan.mjs | script | Orphan inventory | Scans for orphaned/unwired hook artifacts. |
| jsonl-orphan-scan.mjs | script | Orphan inventory | Scans jsonl stores for orphaned/dangling records. |
| refresh-orphan-report.mjs | script | Orphan inventory | Regenerates the orphan report from freshest inputs. |
| lint-wiki-orphans.mjs | script | Orphan inventory | Lints wiki entries with no inbound link (orphan wiki class). |
| system-viz-dead-pixel-sweep.mjs | script | Orphan inventory | Sweeps system-viz graph for dead/unrendered ("dead-pixel") nodes. |
| validate-hook-orphan-signal.mjs | script | Orphan hygiene | Validates the hook-orphan-scan signal (false-positive guard). |
| _temp-orphan-scan.mjs | script | Orphan hygiene | Scratch/temp orphan scan (underscore = ad-hoc). |
| node-staleness-rank.mjs | script | Staleness detection | Ranks graph nodes by staleness (age vs activity). |
| generate-staleness-overlay.mjs | script | Staleness detection | Emits a staleness overlay for the system-viz graph. |
| regression-staleness-auditor.mjs | script | Staleness detection | Audits the ## Recent regressions log for stale entries. |
| stale-milestone-rank.mjs | script | Staleness detection | Ranks milestones by staleness (+ .test.mjs). |
| prune-stale-tribal-entries.mjs | script | Staleness detection | Prunes stale tribal-tip entries (+ .test.mjs). |
| h-drive-census.mjs | script | Excavation census | Full H:/prism file accounting -> manifest + 10 agent slices. |
| h-drive-skipped-census.mjs | script | Excavation census | Accounts for intentionally-skipped subtrees in the census. |
| probe-dormant-posts.mjs | script | Excavation census | Probes dormant post-processor .js for signatures (consumer check). |
| kip-rotate-orphans-to-lora.mjs | script | Reactivation routing | Rotates dormant findings into the LoRA corpus (india edge) (+ .test.mjs). |
| tmp-orphan-janitor.mjs | script | Orphan hygiene | Reaps orphaned tmp artifacts (fleet-hygiene overlap) (+ .test.mjs). |

_Ledger primitives (LedgerProjector/Retention/UnifiedError) are name-derived as galaxy-relevant -- they back
the append-only ledger discipline; their PRIMARY ownership may sit in other galaxies (dedup before wiring)._
