# discovery — slot:tango

## Current state

- **File:** `H:/prism/mcp-server/src/engines/discovery/CLAUDE.md`
- **Size:** ~5.8 KB / 119 lines
- **Quality grade:** GOOD

The current file is substantive and accurate. All engine names, hook names, script paths, and dispatcher actions cited were verified to exist on disk. Key strengths: clean anti-patterns list, Karpathy 5-step customized to discovery edge cases, accurate cross-galaxy bridge map, closed-loop india integration section, and the cross-cutting methodology block (PC specs, Ollama model tiers, loop/vault/LoRA/CAG/RAG pointers). The AI-SYSTEMS-STATE and CRITIC-KEEPWORKING-STANZA blocks are cross-galaxy boilerplate injected fleet-wide.

**Stale / inaccurate content found:**
- The `AWARENESS.md` reports "AI engines attributed: 0 / AI dispatcher actions: 0 / reasoning/neural bridges: 0" — this is a generator artifact; tango's engines (DuplicationGuardEngine, MasterIndexEngine, PRISMSelfAwarenessEngine) do wire AI-adjacent dispatcher actions (`prism_guard:dup_guard_check`, `prism_dev:dedup_*`, `prism_session:master_index_query`). The AWARENESS.md content is auto-generated and advisory-only, so this does not corrupt CLAUDE.md itself.
- The `PATHS.md` reference notes `H:/prism-slot-tango = stale slot worktree` (confirmed in MEMORY.md: ~1900 commits behind). The CLAUDE.md itself does not mention this explicitly, which is a minor gap — a discovery chat could try to commit to slot/tango and silently lag behind.
- The `<!-- AI-SYSTEMS-STATE:BEGIN -->` block and `<!-- CRITIC-KEEPWORKING-STANZA -->` are fleet-injected boilerplate identical across all 34 galaxy CLAUDE.md files. They do not waste many tokens (12 lines each) but add no discovery-specific value.
- The cross-cutting methodology block (lines 93–103) duplicates content already in the universal core (PC specs, Ollama tiers, loop discipline, vault routing) — this was injected by the GALAXY-ENRICHMENT-PROGRAM pipeline. It is accurate but partially redundant with the universal-core pointer.
- No fabricated content found. All 4 verified engine files exist, all 4 verified hooks exist, all 4 verified audit scripts exist.

---

## KEEP

The following sections are accurate, load-bearing, and discovery-specific — keep verbatim:

1. **`## What lives here`** — the concise map of anti-duplication engines + discovery indexes + pipeline-coverage scanners + auto-discovery engines. This is the single best orientation for a tango chat. Keep all four sub-bullets.
2. **`## Anti-patterns (tango refuses)`** — the 5 concrete refusals are domain-native and not duplicated anywhere in the universal core. This is the highest-leverage section for preventing drift.
3. **`## Karpathy 5-step for discovery work`** — the EDGE CASES + FAILURE MODES bullets are tango-specific (stale engine digest, 200MB master-index cap on 331MB graph, schema-read-blindness, atomic-read discipline for concurrent graph writers). Keep exactly.
4. **`## Related galaxies`** (first instance, lines 51–57) — the sierra/romeo/india/alpha/agent-orchestration/ALL-galaxies bridge map is load-bearing for routing. Keep.
5. **`## Wiki cross-refs`** — four tango-authored wiki entries, all verified paths. Keep.
6. **`## Custom hook decision (STEP 8b — intentionally declined)`** — the rationale for NOT adding a hook is a principled anti-duplication decision. A future tango chat must not re-litigate this without reading it. Keep.
7. **`## Closed-loop integration with india`** — the xproc outcome publishing + feature emission + tribal capture + calibration contract is specific to tango↔india. Keep.
8. **`## Related galaxies (PSN edges — symmetric)`** — the dormant-data (victor) orphan-inventory dedupe edge is tango-specific. Keep.
9. **`## Cross-cutting methodology`** (lines 93–103) — the Ollama model tiers and loop discipline pointer are marginally redundant but the DISCOVERY-SPECIFIC application context (offload dedup-candidate classification to gpt-oss:20b; keep DuplicationGuardEngine deterministic) is worth retaining as a two-line extract.

---

## DROP

The following are generic/duplicated/stale and waste tokens in every tango turn:

1. **`<!-- AI-SYSTEMS-STATE:BEGIN/END -->`** (lines 105–112) — fleet-injected boilerplate identical in all 34 galaxy files. The pointer to `knowledge/memories/patterns/ai-systems-fleet-state.md` is useful, but the full 8-line block with all three `[[...]]` links can collapse to a single pointer line.
2. **`<!-- CRITIC-KEEPWORKING-STANZA -->`** (lines 114–119) — exact copy in all 34 galaxy CLAUDE.md files. Belongs in the UNIVERSAL-CORE POINTER, not duplicated here.
3. **The second `## Related galaxies (PSN edges OUT)` block** in MEMORY.md is already in CLAUDE.md; but within CLAUDE.md itself the second `## Related galaxies` (PSN edges — symmetric, line 91) is a single line and OK to keep — not a duplication concern.
4. **PC hardware specs prose** in the cross-cutting methodology block (lines 96–97) — the exact same text appears in `state/shared/specs/CANONICAL-HOST-FACTS-2026-06-09.md` and in the TOOLBELT.md OPERATIONAL-CONTEXT block. In the galaxy CLAUDE.md it is redundant; collapse to a cite.
5. **Full Ollama tier table** in the cross-cutting methodology (lines 97–98) — already in the universal core and TOOLBELT.md. Replace with one line: "Offload dedup-candidate classification to `gpt-oss:20b`; keep DuplicationGuardEngine THROWS-deterministic (never routed to Ollama)."
6. **CAG/RAG/LoRA prose paragraph** (lines 103–103 of CLAUDE.md) — the generic harness doctrine is universal. The only discovery-specific clause is: "dedup-candidate set → Ollama classify; DuplicationGuardEngine stays deterministic." Extract that one line, drop the rest.

---

## ADD (domain-specific — the heart of this assessment)

The following critical discovery-domain content is missing from the current CLAUDE.md and should be added:

### 1. Dispatcher action quick-ref table (daily-use surface)
The TOOLBELT.md has this but the galaxy CLAUDE.md does not. A tango chat needs the 9 most-used dispatcher actions inline:

| Action | Dispatcher | Purpose |
|--------|-----------|---------|
| `master_index_query` | `prism_session` | "where is X / what handles Y" — use BEFORE Grep |
| `master_index_node_status` | `prism_session` | is-it built/wired/utilized |
| `dispatcher_map_compact` | `prism_session` | full dispatcher→action map |
| `dup_guard_check` | `prism_guard` | THROWS on dup before create |
| `wiring_potential` (mode:batch_unwired) | `prism_dev` | orphan-engine batch + suggested dispatcher |
| `dedup_might_contain` / `dedup_is_definitely_new` | `prism_dev` | Bloom negative-dedup probe |
| `capability_census` | `prism_dev` | coverage enumeration |
| `impact_find_orphans` | `prism_dev` | orphan discovery |
| `tribal_capture` (slot:'tango') | `prism_knowledge` | canonical tribal write — NEVER direct markdown |

MCP-down fallback for each: `node scripts/system-viz-query.mjs find <term>` / `node .claude/helpers/duplication-guard.mjs` / `node scripts/audit-unwired-engines.mjs`.

### 2. Stale slot-worktree warning (commit discipline)
MEMORY.md documents this but CLAUDE.md is silent: `slot/tango` branch is ~1900 commits behind integration. All galaxy commits land on `cad-fusion-live-ms0` with `[MAIN]` prefix. A tango chat that auto-commits to `slot/tango` silently lags. Add a one-line commit-discipline note.

### 3. "What NOT to do" list (tango-specific, beyond anti-patterns)
The current anti-patterns list covers creation-time guards. Missing the runtime/audit-time anti-patterns:
- Do NOT full-read `state/shared/system-viz/system-graph.json` (~370MB — OOM). Always use `scripts/system-viz-query.mjs find <term>`.
- Do NOT trust a `master_index_query` response when the graph sidecar is stale (check `AWARENESS-SNAPSHOT.md` freshness first — regenerate with `node scripts/build-state-snapshot.mjs` if >2h old).
- Do NOT write new tribal knowledge directly to `knowledge/tribal/discovery-*.md` — auto-overwritten on regen. Use `prism_knowledge:tribal_capture {slot:'tango'}` exclusively.
- Do NOT run `scripts/regen-viz.mjs` casually — it takes the ~548MB graph and is sierra-owned. File a request to sierra; never write `state/shared/system-viz/system-graph.json` from tango.
- Do NOT skip BUILD_STATE refresh (`node scripts/build-state-snapshot.mjs`) before making any coverage claim — stale state produces false "everything is wired" verdicts.

### 4. Orphan triage decision protocol
Every discovered orphan requires a build/wire/archive decision before this session ends (R12 — silence is not a decision). The protocol is implicit in MEMORY.md but missing from CLAUDE.md:
1. `prism_dev:wiring_potential {mode:batch_unwired}` to enumerate.
2. For each: classify as (a) build-ready → hand to romeo via `/wire-unwired`; (b) needs-design → file to `state/shared/CLOSE-OUT-DEFERRED.md`; (c) archive → mark in `cross-session-asset-registry.json` with reason.
3. Emit `prism_knowledge:tribal_capture` with the decision + reasoning.
Never exit a discovery session with L8 stubs unclassified.

### 5. Master-index cap check (known failure mode)
The 200MB cap on the 331MB graph caused a silent fleet-wide search failure. Before running `prism_session:master_index_query`, verify the cap is set correctly: check `MasterIndexEngine.ts` `MAX_INDEX_SIZE_MB` constant is ≥ current `system-graph.json` byte-size. If stale, the query silently returns zero hits — not an error. Script: `node scripts/system-viz-query.mjs find <term>` bypasses the cap.

### 6. Pre-extracted vendor registry (do NOT re-extract)
`mcp-server/data/state/extraction-log.json` is the registry of already-extracted vendor sources. `mustNotReExtract()` THROWS on any re-extraction attempt. Already extracted: Mastercam (45), hyperMILL (25), Okuma (63), Fanuc (35), Haas (28), Titans (42). Any tango chat that proposes vendor corpus re-extraction must check this file first.

### 7. Multi-audit-tool drift guard
Before writing any new `scripts/audit-*.mjs`: run `node scripts/dev-tool-conflict-detector.mjs`. If two existing scripts measure the same metric (even slightly differently), that IS a drift class tango owns — dedup the tooling, don't add a third variant.

### 8. Schema-read-first discipline (tango's own regression class)
From MEMORY.md: "a META/audit tool assumes a v1 schema vs v2 actual and reports a false zero." Before trusting any audit output, READ the schema of the parsed file (`data/state/*.json` all carry `schemaVersion`). A surprising zero count almost always means schema-read-blindness, not a real zero. Cite: `feedback_tango_schema_read_first`.

### 9. AWARENESS.md auto-generation caveat
`AWARENESS.md` in this galaxy reports "AI engines: 0 / AI dispatcher actions: 0" — this is a name-heuristic artifact from the generator, not a real audit result. Tango's core surfaces DO fire AI-adjacent actions. Do not trust `AWARENESS.md` AI counts for this galaxy without re-running `scripts/generate-galaxy-awareness.mjs` against a live dispatcher introspection.

---

## IDEAL SECTION OUTLINE

The discovery galaxy CLAUDE.md should be structured as follows (target: ~120 lines):

```
# Discovery Galaxy (TANGO slot) — doctrine
## 1. Domain identity (3 lines)
   - "tango = anti-duplication infrastructure + pipeline coverage; every other galaxy is a consumer"
## 2. Key engines (verified names, 1-line each, ~10 entries)
   - DuplicationGuardEngine, BloomDedupEngine, KnowledgeDeduplicationEngine
   - MasterIndexEngine, MasterIndexGenerator, PRISMSelfAwarenessEngine
   - CodeSystemIndexEngine, GlobalSearchEngine, AwarenessQueryEngine
   - EngineUtilizationAuditorEngine, SystemUtilizationAuditEngine
   - HookCoverageMaximizerEngine, SkillLibraryAuditEngine, CrossRegistryJoinEngine
## 3. Dispatcher actions quick-ref table (9 rows — verified actions)
   - prism_session, prism_guard, prism_dev, prism_knowledge actions
   - MCP-down fallback for each
## 4. Anti-patterns / refuses (domain-specific)
   - creation-time: no dup creation without DuplicationGuard THROWS check
   - runtime: no full-read system-graph.json; no direct tribal write; no regen-viz from tango
   - audit-time: no stale BUILD_STATE coverage claim; no new audit script without conflict-detector
## 5. Orphan triage protocol (5-line numbered list)
## 6. Known failure modes + regression classes
   - master-index cap on large graph (silent zero)
   - schema-read-blindness in META tools
   - pre-extracted vendor re-extraction (mustNotReExtract THROWS)
   - multi-audit-tool drift (N scripts measuring same metric)
   - concurrent system-graph.json writers (atomic-read discipline)
   - stale slot/tango worktree (commit to [MAIN] cad-fusion-live-ms0)
## 7. Wired hooks (auto-fire — know they exist, don't re-implement)
   - duplication-hard-block, dedup-auto-invoke, master-index-precheck-inject
   - inventory-check-guard, grep-index-first, pre-grep-graph-inject
   - stop_on_unwired_assets, audit-viz-first
   - UNWIRED-on-disk (do NOT assume active): ai-duplication-guard, audit-awareness-inject
## 8. Closed-loop india integration (compact, ~6 lines)
   - xproc_outcome_publish, xproc_kg_project_features, tribal_capture slot=tango
## 9. Cross-galaxy bridges (compact table: sierra/romeo/india/alpha/victor)
## 10. Wiki cross-refs (tango-authored entries)
## 11. Custom hook decision rationale (2 lines — preserve the reasoning)
## 12. Commit discipline (1 line — slot/tango stale; use [MAIN] on cad-fusion-live-ms0)
## 13. UNIVERSAL-CORE POINTER (single line; see below)
```

---

## UNIVERSAL-CORE POINTER

The following universal rules must remain available to a tango chat but should NOT be duplicated inside this galaxy CLAUDE.md — reference main CLAUDE.md by pointer only:

```
> Universal doctrine: H:/prism/CLAUDE.md
> Rules in scope: EXPERT ROLE · TOKEN ECONOMY (RTK prefix) · KARPATHY DISCIPLINE ·
>   HONESTY RULES (R1–R15, especially R8 read-before-write, R12 fail-loud, R15 wire-test-validate) ·
>   SCRUTINY GATE (3-of-3 consensus before Stop) · PER-CHAT HANDOFF (per-agent-handoff.mjs) ·
>   COMMIT FORMAT ([SCOPE]/U-ID: title) · UNITS-FIRST safety rail · NO-STUB enforcement ·
>   MULTI-AGENT PATTERNS (build-doctor / physics-reviewer / test-reviewer) ·
>   OLLAMA FALLBACK LADDER (Ollama → Sonnet agent → Opus) ·
>   WIKI PROTOCOL (query wiki/index.md before re-deriving)
> NOT duplicated here: PC hardware specs prose · full Ollama tier table · CAG/RAG/LoRA generic harness doctrine ·
>   GOLF SLOT section · FLEET-REAPER section · NN-GRAPH MS0/MS1/MS2 detail ·
>   milestone-prose sections (PSN-OCTOPUS, CROSS-SUBSTRATE, CHEAP-NODE-ACCESS, etc.)
```

Discovery-specific application of universal rules (one line each, in this CLAUDE.md):
- R8: READ `mcp-server/data/state/extraction-log.json` + `cross-session-asset-registry.json` + `ENGINE_DIGEST.md` before ANY create.
- R12: "coverage is clean" requires a freshly-run `build-state-snapshot.mjs` + named what was dropped.
- R15: every new audit asset must be wired to `prism_dev` AND tested against a known-orphan fixture.
- OLLAMA: route dedup-candidate set classification to `gpt-oss:20b`; DuplicationGuardEngine itself stays deterministic (NEVER Ollama-routed).
