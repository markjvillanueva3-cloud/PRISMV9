# Discovery Galaxy — slot:tango
> Universal rails (R1–R15 · scrutiny 3-of-3 · per-chat handoff · commit `[SCOPE]/U-ID` · units-first ·
> no-stub · no-inline-constants · duplication guard · RTK · Ollama→Sonnet→Opus ladder · wiki protocol):
> → `H:/prism/CLAUDE.md`. THIS file = discovery-domain doctrine ONLY; never re-inline universal prose.

---

## 1. Domain scope + slot identity

Tango is the **anti-duplication infrastructure** — the guard layer every other galaxy consumes before
creating any asset. Owns: duplication prevention, pipeline-coverage scanning, orphan detection, engine/dispatcher
discovery indexes, master-index query surface, pre-extracted vendor registry.

**EXCLUDES:** wiring orphans → romeo; AI/GNN training signals → india; system-viz graph generation → sierra
(tango is sierra's primary CONSUMER, not writer); fleet hygiene → golf.

Slot: **tango** · Worktree: `H:/prism-slot-tango` · Branch: `slot/tango`

**Commit discipline:** `slot/tango` branch is ~1900 commits behind integration. All tango commits currently
land on `cad-fusion-live-ms0` with `[MAIN]` prefix — do NOT auto-commit to `slot/tango` without checking
branch freshness first (`rtk git log slot/tango..HEAD --oneline | wc -l`).

---

## 2. Verified engines

Engines reside in the shared `mcp-server/src/engines/` tree (no local `engines/discovery/*.ts` files —
tango's engines are at top-level or in named subdirs). Confirmed via system-viz graph nodes:

| Role | Engine |
|------|--------|
| Duplication prevention (THROWS on dup) | `engines/DuplicationGuardEngine.ts` |
| Master-index search surface | `engines/MasterIndexEngine.ts` (eng.session.masterindexengine) |
| Self-awareness + AI-feature rec | `engines/PRISMSelfAwarenessEngine.ts` (eng.dev.prismselfawarenessengine) |
| Algorithm orchestration | `engines/AlgorithmOrchestratorEngine.ts` // UNVERIFIED — confirm before use |
| Auto-research orchestration | `engines/AutoResearchOrchestratorEngine.ts` // UNVERIFIED — confirm before use |

Discovery indexes (data, not `.ts` engines):
- `mcp-server/data/docs/ENGINE_DIGEST.md` — 1-line per engine
- `mcp-server/data/docs/DISPATCHER_DIGEST.md` — dispatcher + action counts
- `mcp-server/data/docs/DIRECTORY_DIGEST.md` — 215 dirs with purposes
- `mcp-server/data/docs/CODE_SYSTEM_INDEX.json` — DSL shortcode→path

---

## 3. Dispatcher quick-ref

| Action | Dispatcher | Purpose |
|--------|-----------|---------|
| `master_index_query` | `prism_session` | find X / what handles Y — use BEFORE Grep/Glob |
| `master_index_node_status` | `prism_session` | is-it built / wired / utilized |
| `dispatcher_map_compact` | `prism_session` | full dispatcher→action map |
| `dup_guard_check` | `prism_guard` | THROWS on dup before create |
| `wiring_potential` (mode:batch_unwired) | `prism_dev` | orphan-engine batch + suggested dispatcher |
| `dedup_might_contain` | `prism_dev` | Bloom negative-dedup probe (fast NO) |
| `dedup_is_definitely_new` | `prism_dev` | confirm novelty before create |
| `capability_census` | `prism_dev` | coverage enumeration |
| `impact_find_orphans` | `prism_dev` | orphan discovery |
| `tribal_capture` (slot:'tango') | `prism_knowledge` | canonical tribal write — NEVER direct markdown |

**MCP-down fallbacks:**
- `node scripts/system-viz-query.mjs find <term>` — graph search bypasses master-index cap
- `node scripts/audit-unwired-engines.mjs` — engines on disk with no dispatcher ref
- `node scripts/audit-close-out-candidates.mjs` — shipped-but-pending coverage gaps
- `node scripts/audit-roadmap-drift.mjs` — envelope vs git reality

---

## 4. Canonical constants + data paths

No physics constants apply to this domain (discovery is meta-infrastructure, not manufacturing physics).
Domain-equivalent NEVER-inline rules:

- **NEVER hardcode engine counts** — read `PRISM-INVENTORY-LATEST.md` or call `prism_dev:capability_census`
- **NEVER trust stale `BUILD_STATE.md`** — refresh with `node scripts/build-state-snapshot.mjs` before any coverage claim
- **NEVER full-read `state/shared/system-viz/system-graph.json`** (~370–548MB — OOM). Always use `scripts/system-viz-query.mjs find <term>` or `prism_session:master_index_query`
- **Pre-extracted vendor registry:** `mcp-server/data/state/extraction-log.json` — already extracted: Mastercam (45), hyperMILL (25), Okuma (63), Fanuc (35), Haas (28), Titans (42). `mustNotReExtract()` THROWS.
- **Cross-session asset registry:** `mcp-server/data/state/cross-session-asset-registry.json` — fleet-wide creation log; read before any new asset create.

---

## 5. Domain gotchas / safety rails

1. **Master-index 200MB cap vs 331MB+ graph — silent zero hits.** If `master_index_query` returns zero results suspiciously, check `MasterIndexEngine.ts MAX_INDEX_SIZE_MB` vs current graph byte-size. Use `scripts/system-viz-query.mjs find <term>` to bypass.
2. **Schema-read-blindness in META tools.** An audit tool assuming v1 schema against a v2 file reports false zeros. Before trusting any audit output with a surprising zero count, check `schemaVersion` in `mcp-server/data/state/*.json`. This is tango's own regression class — cite `[[lessons/discovery-meta-tool-schema-blindness]]`.
3. **Stale BUILD_STATE produces false "everything is wired" verdicts.** Always run `node scripts/build-state-snapshot.mjs` before any coverage claim.
4. **Concurrent system-graph.json writers.** Never write `state/shared/system-viz/system-graph.json` from tango — sierra owns the writer; tango is read-only consumer. Use atomic-read discipline (`scripts/system-viz-query.mjs`, not raw `Read`).
5. **Multi-audit-tool drift.** Before writing any new `scripts/audit-*.mjs`, verify no existing script already measures the same metric. Two scripts measuring the same thing is itself an orphan tango must dedup — not add a third variant.
6. **AWARENESS.md AI-count artifact.** This galaxy's `AWARENESS.md` reports "AI engines: 0 / AI dispatcher actions: 0" — generator name-heuristic artifact, not a real audit. Tango does fire AI-adjacent actions (`dup_guard_check`, `master_index_query`, `dedup_*`). Do not trust `AWARENESS.md` AI counts without re-running `scripts/generate-galaxy-awareness.mjs`.

---

## 6. What NOT to do (tango refuses)

- **DO NOT create any engine/hook/skill without calling `duplicationGuardEngine.mustCheckBeforeCreating()` first** — it THROWS; a warn-only path is a violation of tango's own domain.
- **DO NOT full-read `state/shared/system-viz/system-graph.json`** — OOM. Use `system-viz-query.mjs`.
- **DO NOT write tribal knowledge directly to `knowledge/tribal/discovery-*.md`** — auto-overwritten on regen. Use `prism_knowledge:tribal_capture {slot:'tango'}` exclusively.
- **DO NOT run `scripts/regen-viz.mjs` from tango** — sierra-owned; file a request to sierra via AGENT_CHAT.md.
- **DO NOT re-extract already-extracted vendor sources** — check `extraction-log.json`; `mustNotReExtract()` THROWS.
- **DO NOT make a coverage claim from stale BUILD_STATE** — regenerate first.
- **DO NOT add a new audit script without running `node scripts/dev-tool-conflict-detector.mjs` first** — if two scripts already measure the same metric, dedup them instead.
- **DO NOT use `audit-viz-first.mjs`** — does not exist on disk (verified absent).
- **DO NOT use `scripts/audit-orphan-inventory.mjs`** — does not exist (use `impact_find_orphans` action or `audit-unwired-engines.mjs`).
- **DO NOT tolerate L8 stubs unclassified at session end** — every orphan needs a build/wire/archive decision (R12).

---

## 7. Orphan triage protocol

Every discovery session that surfaces orphans must close with a decision on each (R12 — silence is not a decision):

1. `prism_dev:wiring_potential {mode:'batch_unwired'}` — enumerate all unlinked engines
2. For each orphan, classify:
   - **(a) build-ready** → hand to romeo via AGENT_CHAT.md referencing `/wire-unwired`
   - **(b) needs-design** → file to `state/shared/CLOSE-OUT-DEFERRED.md` with reason
   - **(c) archive** → mark in `cross-session-asset-registry.json` with reason + date
3. Emit `prism_knowledge:tribal_capture {slot:'tango'}` with the classification summary
4. Never exit a session with unclassified orphans

---

## 8. Tribal + corpus pointers

**Wiki entries (tango-authored — read before re-deriving):**
- `knowledge/wiki/architecture/master-index-surface.md` — master-index BM25 query surface + cap docs
- `knowledge/wiki/architecture/duplication-guard-discipline.md` — guard discipline + THROWS contract
- `knowledge/wiki/lessons/orphan-rescue-class.md` — orphan classification playbook
- `knowledge/wiki/lessons/discovery-meta-tool-schema-blindness.md` — schema-read-blindness regression class

**JM Die corpus:** tango has no direct JM Die corpus dependency (meta-infrastructure layer).
Use `prismSelfAwarenessEngine.getJMDieCustomerPath()` if discovery work touches JM assets; never Glob the 24K-file tree.

**Tribal write rule:** `prism_knowledge:tribal_capture {slot:'tango'}` — never write `knowledge/tribal/*.md` directly.

---

## 9. Cross-galaxy edges (PSN)

| Direction | Galaxy (slot) | Bridge |
|-----------|--------------|--------|
| tango → romeo | wiring | tango finds orphans → `prism_dev:wiring_potential`; romeo wires them |
| tango → india | ai-training | duplicate-finds + orphan classifications → `xproc_kg_project_features` as GNN signal |
| tango ← sierra | system-viz | tango CONSUMES sierra's graph (`master_index_query`); never writes the graph |
| tango ↔ alpha | token-optimization | alpha reads tango coverage for token-waste hotspots; tango uses alpha's search-first discipline |
| tango ↔ victor | dormant-data | orphan inventory overlap — dedupe with victor before filing dormant entries |
| tango → ALL | fleet-wide | tango audits every domain for orphans / duplicates / close-out debt |

---

## 10. Closed-loop integration (india)

Outcome publishing: `xproc_outcome_publish {slot:'tango', domain:'discovery'}` // UNVERIFIED action name — grep knowledgeDispatcher before calling.
Feature emission: `xproc_kg_project_features` for india's GNN tier-5 classifier // UNVERIFIED.
Tribal capture: `prism_knowledge:tribal_capture {slot:'tango'}` (verified — knowledgeDispatcher.ts:173).
Full spec: `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`.

---

## 11. Test commands

```bash
cd mcp-server && rtk npx vitest run -t "discovery|dedup|duplication|master.?index|awareness|orphan"
# Audit scripts (no port required):
node scripts/audit-unwired-engines.mjs
node scripts/audit-close-out-candidates.mjs
node scripts/build-state-snapshot.mjs
node scripts/system-viz-query.mjs find <term>
```

---

## 12. Known bugs / open threads

- **master-index 200MB cap** — was silent fleet-wide zero; cap was bumped but verify `MAX_INDEX_SIZE_MB` matches current graph size before each audit run.
- **schema-read-blindness regression class** — any surprise zero from a META audit tool → check `schemaVersion` before trusting. Cite `[[lessons/discovery-meta-tool-schema-blindness]]`.
- **`slot/tango` worktree ~1900 commits behind** — do not commit to slot/tango without operator direction; use `[MAIN]` on `cad-fusion-live-ms0`.
- Open-thread ledger: `state/shared/CLOSE-OUT-DEFERRED.md`

---

## 13. AI / reasoning surface

```bash
node scripts/lib/galaxy-reasoning-bridge.mjs discovery "<question>"
```

Ollama routing for tango work:
- Classify dedup-candidate set by domain → `gpt-oss:20b`
- Summarize orphan inventory report → `gpt-oss:20b`
- DuplicationGuardEngine itself stays **deterministic** (THROWS) — NEVER route its decision to Ollama

---

## Custom hook decision (preserved — intentionally declined)

No tango-specific hook was created. The discovery domain is already saturated with wired fleet hooks:
`duplication-hard-block`, `dedup-auto-invoke`, `master-index-precheck-inject`, `inventory-check-guard`,
`build-create-detector`, `grep-index-first`, `pre-grep-graph-inject`, `stop_on_unwired_assets`.
Adding another would violate tango's own anti-duplication discipline. The `/discover-tango` skill composes
existing surfaces instead. Re-open only if a genuinely additive, non-overlapping trigger emerges.

**UNWIRED on disk (do NOT assume active):** `ai-duplication-guard.mjs`, `audit-awareness-inject.mjs` — preserved but have 0 refs in `settings.json`; verify wiring before relying on either.

## AI Synergy (PSN leg #10)

This galaxy is an AI-substrate **consumer** (no dedicated AI engines of its own; `aiEngineCount` 0).
It participates in PRISM's AI systems through the shared, fleet-wide substrate:

- **Reasoning bridge** (`scripts/lib/galaxy-reasoning-bridge.mjs`, PSN leg #10): **CAG** + **RAG** hybrid
  reasoning over this galaxy's own doctrine corpus (CLAUDE.md / SOUL.md / MEMORY.md / synthesis) via the
  local Ollama stack -- `node scripts/lib/galaxy-reasoning-bridge.mjs discovery "<question>"`.
- **Vault -> LoRA**: this galaxy's Obsidian **synthesis** brain (`knowledge/memories/patterns/discovery_synthesis.md`)
  feeds the fleet **LoRA** training dataset (`scripts/vault-to-lora-dataset.mjs`).
- **GNN** (GraphSAGE) tier-5: this galaxy's ghost-wiring candidates are classified by the **neural** wiring-inference
  cascade; **embedding**-based semantic recall surfaces its memories.
- **Cross-substrate edges**: typed `owned-by-slot` + `documented-by` + `embeds` edges connect it into the
  system-viz graph (`scripts/generate-cross-substrate-edges.mjs`).

_Measured by the AI-synergy audit (`scripts/audit-ai-synergy.mjs`, dimension `discoverability`). This section
documents verified-true substrate participation (signals pulled from the audit) -- it is doctrine, not duplication._
