# database-expansion — slot:juliett

_Assessment date: 2026-06-13. Assessor: subagent (sonnet-4-6). All engine/path citations verified by Bash ls + Read._

---

## Current state

**Size:** ~100 lines / ~5.5 KB (CLAUDE.md only; MEMORY.md is a separate 137-line brain).
**Quality grade: GOOD**

The file is meaningfully domain-specific — it names real engines, real paths, real anti-patterns, and real consumer galaxies. The core doctrine (atomic writes, schema versioning, ledger rotation, DocuStrata no-re-OCR) is accurate and load-bearing. Verified correct: all engine names cited (`QdrantMemoryEngine`, `AgentMemoryFabricEngine`, `MigrationEngine`, `LedgerStoreEngine`, `CoordinationStoreEngine`, etc.) exist on disk.

**Issues found:**

1. **Bloat from cross-cutting methodology injection (lines 74–99):** The `## Cross-cutting methodology` block and `## Critic + keep-working contract` block are tagged "pointer -- global doctrine, do NOT duplicate" but still reproduce ~25 lines of prose. These ARE duplicated in the global CLAUDE.md (R6, R12, Karpathy, Ollama offload tiers, CAG/RAG/LoRA). They belong in the universal-core pointer, not here.
2. **AI-SYSTEMS-STATE block (lines 86–93):** Auto-generated comment block referencing `knowledge/memories/patterns/ai-systems-fleet-state.md` and `scripts/ai-systems-fleet-state.mjs`. This is fleet-wide infrastructure prose, not database-expansion doctrine. It belongs in a fleet pointer, not the galaxy CLAUDE.md.
3. **`## Wiki cross-refs` section is minimal and stale:** Only 3 entries; the MEMORY.md and PATHS.md both cite richer cross-refs. The galaxy CLAUDE.md wiki section adds no value over what MEMORY.md already carries.
4. **`## Related galaxies` is redundant with MEMORY.md `## Cross-galaxy bridges`:** MEMORY.md has the richer version (with corpus counts and consumption direction). The CLAUDE.md version is a shorter duplicate.
5. **No explicit dispatcher action table:** The file mentions `prism_memory` in MEMORY.md/TOOLBELT.md but the CLAUDE.md itself never names the specific `prism_memory` actions a juliett chat reaches for daily. A juliett chat should not have to open TOOLBELT.md to know its primary dispatcher surface.
6. **No migration debt inventory:** The file notes "migration debt" in passing but does not name the 3 existing migrations or the pattern for adding new ones — critical for a domain that lives and dies by schema discipline.
7. **No store health/smoke-test protocol:** Juliett's biggest operational risk is silent store corruption (see Known regression classes). The CLAUDE.md has no "before touching a store, run this" health check.
8. **No explicit size-guard table for large files:** TOOLBELT.md has the read-offset cheatsheet; CLAUDE.md should carry the 2-line "never full-read these" list so it fires on context injection, not only when the operator explicitly opens TOOLBELT.md.

---

## KEEP

These sections are accurate, domain-specific, and load-bearing — retain verbatim or with minor tightening:

- `## DocuStrata + JM-file database` (lines 8–15) — operator-canonical directive, correct corpus counts, no-re-OCR rule. Core juliett doctrine.
- `## What lives here` (lines 17–51) — verified engine names, correct store taxonomy (Qdrant / SQLite WAL / JSONL / atomic-write infra / master indexes). The ⚠ tmp-orphan note is real and critical.
- `## Anti-patterns (juliett refuses)` (lines 45–51) — the exact refusal list. Accurate and concise. Maps 1:1 to the SOUL.md `## Refuses` section — either deduplicate to a pointer to SOUL.md or keep here as the more prominent surface.
- `## Karpathy 5-step (especially R8 read-first + R12 fail-loud)` (lines 53–57) — the R8 + R12 domain application is database-expansion-specific ("migration not a parallel store"). Keep this 5-line block, drop any prose that restates the global rule.
- `## Related galaxies` (lines 58–64) — keep as a compact 6-row pointer table (drop the duplicated full descriptions; MEMORY.md carries the detail).
- The scaffolding attribution line (line 72) — useful audit trail, keep.

---

## DROP

Remove or replace with a pointer to universal-core:

1. **`## Cross-cutting methodology` block (lines 74–84):** Ollama tiers, loop rules, Obsidian vault, LoRA/CAG/RAG mechanics — all in global CLAUDE.md. Replace with: `> Cross-cutting methodology: see universal-core pointer (§OPERATIONAL CONTEXT, §AI SYSTEM ROUTING, §TOKEN ECONOMY).`
2. **`<!-- AI-SYSTEMS-STATE:BEGIN ... END -->` block (lines 86–93):** Auto-generated fleet-wide state pointer. Should live in MEMORY.md (where it already does) not CLAUDE.md. Drop from CLAUDE.md.
3. **`<!-- CRITIC-KEEPWORKING-STANZA -->` block (lines 95–100):** R6 + R12 + 3-of-3 gate are global doctrine. The block's own header says "pointer -- global doctrine, do NOT duplicate." Drop prose; keep one line: `> Critic + keep-working: global R6/R12 + scrutiny-3way gate (see universal-core).`
4. **`## Wiki cross-refs` section:** Redundant with MEMORY.md `## Wiki cross-refs`. Replace with a single pointer: `> Wiki: MEMORY.md §Wiki cross-refs`.

---

## ADD (domain-specific — the heart of this assessment)

### 1. Primary dispatcher surface (daily actions for juliett)

The CLAUDE.md should carry this table so a juliett chat never has to open TOOLBELT.md for its own dispatcher surface:

```
prism_memory:semantic_search          — master-brain PULL (topK=20 before any Grep)
prism_memory:vector_search_unified    — search all 14 MemoryKind collections
prism_memory:qdrant_vector_search     — raw Qdrant collection read
prism_memory:qdrant_vector_upsert     — write embeddings (always schema-probe first)
prism_memory:get_health               — store health (run before touching a Qdrant collection)
prism_memory:run_integrity            — full integrity check (run after any migration)
prism_data:database_list              — enumerate registered databases (SourceCatalogDB etc.)
prism_data:database_search            — search across registered databases
prism_context:memory_externalize      — disk round-trip for session memory
```

MCP fallback when server is DOWN: `Grep C:/Users/wompu/.claude/projects/H--prism/memory/*.md` + `node H:/prism/scripts/system-viz-query.mjs find <term>`.

### 2. Store health protocol (before touching any store)

```
Before ANY migration or schema bump:
  node -e "const j=require('<path>.json'); console.log(j.schemaVersion, Object.keys(j).slice(0,8))"
Before ANY Qdrant write:
  prism_memory:get_health
After ANY migration lands:
  prism_memory:run_integrity
After ANY regen of system-graph.json:
  du -sh state/shared/system-viz/system-graph.json  (abort if shrinks)
```

### 3. Migration discipline (currently absent from CLAUDE.md)

Three migrations on disk, all verified:
- `mcp-server/src/migrations/golf-ledger-v1.sql` — schema v1 (bug_attribution, peer_audit_ticks, chat_bus_signals, ledger_meta)
- `mcp-server/src/migrations/golf-ledger-v2.sql` — v2: cost attribution + compaction-survival
- `mcp-server/src/migrations/stateMigrations.ts` — state-file schemaVersion ladder

Protocol: **every `schemaVersion` bump MUST land with a paired migration in `mcp-server/src/migrations/` in the same commit.** N-1 back-compat for at least one minor. META tools always probe schema shape before deserializing (`if ('totals' in j)` guard — the schema-read-blindness class).

### 4. Large-file size guards (prevent context blowout)

```
system-graph.json   548.9 MB  — NEVER Read(); use scripts/system-viz-query.mjs
MILESTONE_PROGRESS  2.1 MB    — node -e probe, not Read
jm-file-inventory.jsonl  108 MB  — head -n 1 only
jm-die-scan-ledger.jsonl  87 MB  — head -n 1 only
h-drive-files.jsonl  187 MB   — head -n 1 only
```

### 5. Atomic-write discipline quick-ref (expanded)

Current CLAUDE.md mentions `atomicWriteJson` but does not name the tmp-orphan risk or janitor. Add:

- All multi-writer JSON paths use `atomicWriteJson` from `scripts/lib/atomic-json.mjs` (write-tmp + rename + lockfile).
- Tmp-orphan hazard: crashed writers leave `<path>.<pid>.tmp` files; do NOT bulk-delete. Sweep by age + dead-PID via `scripts/tmp-orphan-janitor.mjs --apply` (dry-run default; 19.24 GB reclaimed 2026-05-29).
- Writers with a shared path MUST hold a `.cron-locks/*.lock` advisory lock (zero-byte; golf/reaper sweeps aged >3s).
- `roadmap-index.json` is the canonical 5-writer / 3-non-atomic race study — every new writer on a shared path must audit atomicity first.

### 6. Top tribal gotchas (not in current CLAUDE.md)

Based on MEMORY.md known regression classes + tribal corpus:

- **N-writer race:** Designate one canonical writer per path; every other accessor is read-only. Do not add a second writer to `system-graph.json`, `roadmap-index.json`, or any JSONL ledger without a distributed-lock + atomic-write wrapper.
- **Schema-read blindness:** Never deserialize a state JSON without probing `schemaVersion` first. A META tool that reads the wrong schema silently returns 0/0/0 (the `ollama-offload-stats.json` v2 case).
- **JSONL truncation under SIGKILL:** If a subprocess is killed mid-write to a JSONL (e.g. `regen-viz.mjs` merge), the ledger may be partially written. Always snapshot pre/post record count; abort pipeline on shrink.
- **Stale cron-lock blocking writes:** A zero-byte `.cron-locks/*.lock` from a crashed peer holds the path indefinitely. Do NOT delete blindly; let golf's reaper sweep by age.
- **MCP multi-instance port bind:** `node dist/index.js` instances leak and cause `:3100` bind contention. `prism_memory:*` will silently fail. Check `netstat -ano | findstr 3100` before assuming Qdrant is down.
- **`PRISM_ROOT`/`import.meta.url` resolution:** Do not rely on `cwd` conventions for PRISM_ROOT inside hooks/scripts — resolve from `import.meta.url` (the `mcp-cwd-convention-conflict` regression class, unresolved as of 2026-06-08).

### 7. What NOT to do in this domain

(Complement to Anti-patterns — explicit "you will be blocked" list)

- Do NOT create a parallel store when a migration of the existing one answers the need (R8).
- Do NOT bump `schemaVersion` in a JSON file without shipping `mcp-server/src/migrations/<scope>-v<N>.sql` or `stateMigrations.ts` entry in the same commit.
- Do NOT delete or truncate a JSONL ledger because it is large — rotate or archive; ledgers are telemetry.
- Do NOT full-Read `system-graph.json` (548.9 MB), `MILESTONE_PROGRESS.json` (2.1 MB), or any of the 3 large JSONL inventories (87–187 MB) — always use the query layer or `head -n 1`.
- Do NOT re-OCR the Docustrata corpus (257,992 files already extracted by `docustrata-pipeline.py` into `.index/*.jsonl` + `jm-die-database/`). Search `manifest.json` + `.index/` only.
- Do NOT write to any peer-claimed path without first acquiring the advisory lock AND using `atomicWriteJson`.
- Do NOT report "Qdrant is down" without first checking `prism_memory:get_health` AND verifying no zombie `node dist/index.js` is eating the port.

### 8. Key corpora / resources for this domain

(Verified paths from PATHS.md — juliett's authoritative corpus inventory)

| Corpus | Path | Size | Access |
|--------|------|------|--------|
| DocuStrata (pre-extracted) | `H:/PRISM/Docustrata/.index/*.jsonl` | 257,992 files | `manifest.json` + `.index/` |
| JM-die-database | `mcp-server/data/jm-die-database/` | schemaVersion 1.0.0 | `manifest.json` |
| JM file inventory | `state/shared/databases/jm-file-inventory.jsonl` | 554,999 rows / 108 MB | `head -n 1` then filtered read |
| JM scan ledger | `state/shared/scan-tracking/jm-die-scan-ledger.jsonl` | 301,948 rows / 87 MB | head only |
| H: file census | `state/shared/system-viz/h-drive-files.jsonl` | 1,275,776 rows / 187 MB | head only |
| JM part library | `state/shared/databases/jm-part-library.jsonl` | 30,890 rows | `prism_data:jm_die_part_lookup` |
| Vendor catalog DB | `mcp-server/data/vendor-catalog-db/manifest.json` | 425 vendors | `prism_data:database_list` |
| Wiki embeddings | `knowledge/wiki/architecture/_embeddings.jsonl` | 103.5 MB | Qdrant collection |
| Atomic-write lib | `scripts/lib/atomic-json.mjs` | 5.4 KB | import directly |

---

## IDEAL SECTION OUTLINE

Ordered by session-start utility (what a juliett chat reads top-to-bottom on a new task):

```
1. ## Identity (3 lines: slot=juliett, domain=database-expansion-specialist, scope sentence)
2. ## Dispatcher surface (prism_memory + prism_data actions table — daily tools)
3. ## Store inventory (6-row table: store | engine | path | schemaVersion | maintainer)
4. ## DocuStrata + JM-file database (operator directive — no-re-OCR, manifest paths, build script)
5. ## Atomic-write discipline (atomicWriteJson, tmp-orphan hazard, lock protocol, janitor)
6. ## Schema + migration discipline (protocol + 3 existing migrations named + N-1 back-compat)
7. ## Store health protocol (3 shell commands: probe / get_health / run_integrity)
8. ## Large-file size guards (5-row table: file | size | never-do | do-instead)
9. ## Anti-patterns / what NOT to do (merged REFUSES list)
10. ## Top tribal gotchas (6 bullet regression classes)
11. ## Cross-galaxy bridges (compact 7-row consumer/producer table)
12. ## DB-relevant skills (one-liner list: /memory-seed /forge-schema /dedup /envelope-sync /build-state)
13. ## MCP fallbacks when server is DOWN (3 bullets)
14. ## Universal-core pointer (one block — pointer to main CLAUDE.md, not prose)
```

Total target: ~120 lines. No milestone prose. No fleet-wide state. No Ollama tier tables (those live in the universal-core pointer).

---

## UNIVERSAL-CORE POINTER

The galaxy CLAUDE.md must carry exactly this block (not the prose itself) so the global rules remain available without duplication:

```markdown
## Universal core (pointer — do NOT duplicate)
> All rules below live in `H:/PRISM/CLAUDE.md` and are enforced by the hook stack.
> Read the section once at session start; do not re-derive here.
- **R1–R15** (Karpathy + agent-era rules) — §KARPATHY DISCIPLINE + §CLAUDE.md RULES 5–13
- **3-of-3 scrutiny gate** — §SCRUTINY GATE (node .claude/scripts/scrutiny-3way.mjs)
- **Per-chat handoff** — §PER-CHAT HANDOFF (per-agent-handoff.mjs write/read)
- **Commit format** — `[SCOPE]/U-ID: title`; commit to slot/juliett, not trunk
- **Slot-worktree discipline** — §Lane discipline (worktree-commit-route hook)
- **No-stub / no-inline-constants / no-placeholder-tests** — §SAFETY RAILS
- **Duplication guard** — duplicationGuardEngine.mustCheckBeforeCreating() THROWS on dup
- **Token economy** — RTK prefix on bash; Ollama for code explain/lint/classify; §TOKEN ECONOMY
- **AI routing** — Ollama fallback ladder: Ollama→Sonnet→Opus; §AI SYSTEM ROUTING
- **PRISM wiki** — query `knowledge/wiki/` before re-deriving; §WIKI PROTOCOL
```
