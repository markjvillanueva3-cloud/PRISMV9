## wiring — slot:romeo

### Current state

**File:** `H:/prism/mcp-server/src/engines/wiring/CLAUDE.md`
**Size:** ~5,950 bytes · 134 lines

**Quality grade: GOOD**

The file is substantively better than most galaxy CLAUDE.md files: it has a real domain identity, a concrete wiring discipline checklist, a meaningful anti-patterns list, Karpathy 5-step adapted to wiring work, live GNN synergy context, related-galaxy cross-refs, and a working closed-loop integration block. It is NOT a stub.

**Stale / inaccurate / fabricated content found (R12 — cite specifics):**

1. **`engines/AgentSDKVerifierEngine.ts` — does NOT exist on disk.** `ls mcp-server/src/engines/AgentSDKVerifier*.ts` → no file. Cited in §"Wiring engines + bridges" as a live verifier. // FABRICATED path — must be removed or replaced with a real engine name.

2. **`engines/EngineUtilizationAuditEngine.ts` — wrong name.** The real file is `mcp-server/src/engines/EngineUtilizationAuditorEngine.ts` (class `EngineUtilizationAuditorEngine`). The CLAUDE.md cites `EngineUtilizationAuditEngine` (missing "or"). Minor but violates the R12 "cite file:line" rule.

3. **`engines/DispatcherRoutingEngine.ts` — does NOT exist on disk.** `ls mcp-server/src/engines/DispatcherRoutingEngine.ts` → no file. The real runtime route-table engine is `mcp-server/src/engines/DispatcherMapEngine.ts`. // FABRICATED — replace or remove.

4. **`scripts/audit-orphan-inventory.mjs` — does NOT exist.** Verified: `ls scripts/audit-orphan-inventory.mjs` → not found. The real orphan/unwired audit script is `scripts/audit-unwired-engines.mjs` (verified present) + `scripts/audit-orphan-doctrine.mjs`. Remove or correct.

5. **`/CHAT-SLOT-DOMAINS.md` path cited as `H:/CHAT-SLOT-DOMAINS.md`** — the file exists there (root of H:), but no absolute-path anchor is given. Low risk but fragile for new chats.

6. **Unwired count is stale.** The CLAUDE.md says "593 unwired engines" at galaxy birth; MEMORY.md says "64 dormant engines (state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json, regen 2026-06-10)." The current audit JSON (`state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json`) reports `UNWIRED: 60`. The CLAUDE.md header scope quote ("593 built engines have no dispatcher reference") is now 10x stale — it confuses a new chat about the actual backlog size.

7. **MEMORY.md `High-ROI memories` block is about MIT course classification** — clearly a wiring-synthesis generation error (the synthesis from "24 domain memories" generated course-department content, not wiring-domain content). The CLAUDE.md doesn't have this issue; it's in MEMORY.md, but the CLAUDE.md has a pointer to that synthesis, so a chat reading both gets noise.

8. **`outcome-bus-auto-tap.mjs` referenced in closed-loop section** — not verified. Grep finds no such file in scripts/. Possibly fabricated or renamed. Mark // UNVERIFIED until confirmed.

9. **`state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md`** — existence not checked here; file may be stale-dated (2026-05-28 spec). Advisory risk only.

---

### KEEP

These sections are accurate, load-bearing, and domain-specific — retain verbatim or with minor corrections:

- **§"What lives here"** — accurate scope statement for romeo; the wiring-sources-of-truth block (AWARENESS-SNAPSHOT.md, `audit-unwired-engines.mjs`, DISPATCHER_DIGEST.md, ENGINE_DIGEST.md) is all verified present.
- **§"Per-wiring discipline (every commit MUST include)"** — the 5-step checklist (import → Zod enum → switch case → round-trip test → commit format) is the core operating doctrine and is correct.
- **§"Auto-suggest skill surface"** (`/wire-unwired`, `/wiring-batch`, `/wiring-potential`, `/utilization-dashboard`) — all four skills verified present in `.claude/commands/`.
- **§"Anti-patterns (romeo refuses)"** — the 6 anti-patterns are domain-precise and all reflect real failure modes from MEMORY.md wiring sessions. Keep in full.
- **§"Karpathy 5-step for wiring work"** — wiring-specific adaptation is excellent and covers real edge cases (Zod type mismatch, async-without-await, test-bypasses-wire). Keep verbatim.
- **§"Synergy — GNN tier-5 leverage"** — content is accurate (AUROC 0.808, τ=0.7, ~32% coverage, india owns the model) and directly actionable for romeo. Keep the consumer-not-owner framing.
- **§"Related galaxies"** — tango/papa/uniform/sierra cross-refs are accurate and load-bearing.
- **§"Bridges OUT"** — three `prism_dev:engine_util_audit`, `prism_session:dispatcher_map_compact`, `prism_session:master_index_query` bridges are verified dispatcher surfaces. Keep.
- **§"Closed-loop integration with india"** — the outcome-publishing and tribal-capture pattern is valid; remove the `outcome-bus-auto-tap.mjs` reference until verified.
- **§"Cross-cutting methodology" block** (PC specs, Ollama models, loops, vault, LoRA/CAG/RAG) — accurate and fleet-wide consistent. Keep as-is.
- **§"Critic + keep-working contract" stanza** — correct pointer to global doctrine; keep.
- **§"AI-SYSTEMS-STATE" comment block** — correct pointer to the live fleet AI-systems state file. Keep.

---

### DROP

These sections waste tokens or are generic duplicates of universal-core content:

1. **The `H:/CHAT-SLOT-DOMAINS.md` verbatim quote block** (lines 3-4) — the domain sentence is good but the raw quote format adds no value; convert to a one-liner.
2. **The TOOLBELT.md content** (`Shared token-lean patterns`, `Karpathy 5-step generic form`) — generic fleet-wide content already in the universal core. The TOOLBELT.md companion file covers it; don't repeat in CLAUDE.md.
3. **§"Wiki cross-refs" block** — `[[architecture/dispatcher-wiring-discipline]]`, `[[architecture/awareness-stack]]` etc. are pointers any chat can find via `prism_session:master_index_query`; listing them in the CLAUDE.md adds marginal value. Condense to a single "see wiki/architecture/dispatcher-wiring-discipline" line.
4. **§"Related galaxies (PSN edges — symmetric)"** second instance (lines 105-106, dormant-data/victor) — duplicates information already in the main §"Related galaxies" block above. Merge into one block.
5. **The `<!-- AI-SYSTEMS-STATE -->` block appears TWICE** (lines 120-127 and again via MEMORY.md duplication) — deduplicate to one occurrence.
6. **Closed-loop integration spec path** `state/shared/specs/PER-SLOT-CLOSED-LOOP-INTEGRATION-2026-05-28.md` — stale-dated, lower value than the inline description. Drop the path reference; the inline pattern description is sufficient.
7. **Cross-cutting methodology section** — useful content but much of it (PC specs, Ollama model table, vault patterns) is identical across all 34 galaxies and belongs in the universal-core pointer, not duplicated per-galaxy. Keep only the wiring-domain-specific hooks: "offload: explain dispatcher contract, summarize wiring diff → `qwen2.5-coder:32b`" and the `/loop` target ("drive `stop_on_unwired_assets` to 0"). Drop the generic hardware/LoRA/CAG/RAG tutorial text.

---

### ADD (domain-specific — the heart of this assessment)

What romeo's CLAUDE.md currently lacks and critically needs:

**1. Live unwired count with regen command (not stale 593).**
```
Current unwired: UNWIRED=60 (regen: node scripts/audit-unwired-engines.mjs)
Audit file: state/shared/UNWIRED-ENGINE-AUDIT-2026-05-07.json
  WIRED-DIRECT: 3531 | UNWIRED: 60 | WIRE-EXEMPT: 112 | WIRED-VIA-ORCH: 39
```
A new romeo chat must know the real backlog size at session start, not a 10x-stale figure from galaxy birth.

**2. Triage gate — which engines NOT to wire.**
From MEMORY.md `TRIAGE FINDING 2026-06-11` — this is critical domain doctrine currently buried in MEMORY, not surfaced in CLAUDE.md:
- **DEFER class (constructor-dependency-injected engines):** `SemanticAssetIndexEngine`, `LocalEmbeddingEngine`, `FeedbackCollectorEngine` — require live Qdrant + embedder; wiring these without infra = pure overhead. Pattern: if constructor signature takes `qdrantStore | embedder | config` → DEFER to WIRE-VIA-ENGINE.
- **DEFER class (active peer /loop):** Never wire `XProcNeuralAutoFireEngine` or any engine with an active claim in `state/shared/slot-task-claims.json`.
- **PREFER class (self-contained pure-compute manufacturing engines):** static-method classes, no external deps, deterministic return values. Examples from MEMORY: `SubprogramExtractionEngine`, `MeasureSummaryEngine`, `BarRemnantManagementEngine`. Explicitly add to CLAUDE.md as the heuristic.

**3. Dispatcher target quick-map (the daily routing question).**
The current CLAUDE.md says "physics → `prism_calc`, CAM → `prism_cam`, AI → `prism_ai`, safety → `prism_safety`" but is incomplete. Add the full routing surface with verified dispatcher names:
```
Engine domain → target dispatcher
NC/post-processor parse  → prism_pp (postProcessorDispatcher.ts)
Lathe/turning            → prism_turning (turningDispatcher.ts)
Quality/metrology/CMM    → prism_quality (qualityDispatcher.ts)
Business/ERP/quoting     → prism_business (businessDispatcher.ts)
CAD/geometry             → prism_cad (cadDispatcher.ts)
Mill/machining           → prism_mill (not yet confirmed — check DISPATCHER_DIGEST.md)
WEDM                     → prism_wedm (check DISPATCHER_DIGEST.md)
Session/context          → prism_session (contextDispatcher.ts)
Dev/tooling              → prism_dev (devDispatcher.ts)
```
This is the most-used daily decision for romeo and is currently too sparse.

**4. normalizeParams behavior per dispatcher (from MEMORY — critical to avoid bugs).**
From MEMORY.md wiring sessions (U-WIRE-BARREMNANT):
> `turningDispatcher` (+ quality + pp) `normalizeParams` is TOP-LEVEL-ONLY — no recursion. Nested snake_case objects (e.g. `job.part_length_mm`) pass through INTACT — engine reads nested fields directly; no camel-case mangling on nested keys.
This is a real wiring bug class. Add as a named gotcha: "normalizeParams is shallow — nested object keys are NOT camelCased."

**5. Schema location for dispatcher Zod schemas.**
Currently CLAUDE.md says "Zod enum entry added to action union" but doesn't tell romeo WHERE the schema files are. From MEMORY (U-WIRE-MEASURE):
- Quality schemas: `mcp-server/src/schemas/qualityActionSchemas.ts`
- Turning schemas: `mcp-server/src/schemas/turningActionSchemas.ts`
- Each dispatcher has a peer `*ActionSchemas.ts` in `mcp-server/src/schemas/`
Add: "Zod schemas live in `mcp-server/src/schemas/<domain>ActionSchemas.ts` — add new action schemas there, not inline in the dispatcher."

**6. Pre-existing dispatcher collision watchlist.**
From MEMORY (U-WIRE-MEASURE): pre-existing collision found — `measure_summary` token exists in BOTH `integrationDispatcher.ts` AND `intelligenceDispatcher.ts`. Romeo must check for action-name collisions across ALL dispatchers before adding a new action. Add: "Run `grep -r 'case \"<proposed_action>\"' mcp-server/src/tools/dispatchers/` before adding any new action — cross-dispatcher name collisions exist in the wild."

**7. Worktree / toolchain discipline for this slot.**
From MEMORY (2026-06-11 session):
- romeo's worktree is `H:/prism-slot-romeo` on branch `slot/romeo`
- Commit scope: `[slot/romeo]` prefix (bare `[WIRING]` routes to wrong worktree)
- `npm ci` must be run in `H:/prism-slot-romeo/mcp-server` for vitest/tsc to work in-slot
- Divergence: `slot/romeo` is ahead/behind `cad-fusion-live-ms0` — verify engine byte-identity across branches when cross-verifying
This is mandatory for romeo not to repeat the blocked-commit issue.

**8. Dispatcher size guard.**
From MEMORY regression watchlist: `dispatcher.ts > 5000 lines → tsc memory pressure → wire to a sub-dispatcher instead`. Romeo needs to check `wc -l` on the target dispatcher before adding actions. Add as explicit check step 0.5 in the per-wiring discipline.

**9. WIRE-EXEMPT canonical tag format + engine list.**
Current CLAUDE.md mentions the `// WIRE-EXEMPT: <reason>` tag but doesn't list known exempt engines. Add: "Known WIRE-EXEMPT (do not attempt to wire — singleton pattern):" with at least `QdrantMemoryEngine ← QdrantMemoryEngineSingleton` (cited in CLAUDE.md) plus instruct romeo to check `state/shared/UNWIRED-ENGINE-AUDIT-*.json` for the `WIRE-EXEMPT` category (currently 112 engines) before spending time on an engine.

**10. Round-trip test location discipline.**
Currently partially covered; make explicit: "Round-trip tests MUST live in `mcp-server/src/__tests__/dispatcher-<name>.test.ts` — NOT in `src/engines/__tests__/`. The `stop_on_unwired_assets` hook only scans `mcp-server/src/__tests__/`." (From MEMORY standing patterns — this is a real trap for new sessions.)

---

### IDEAL SECTION OUTLINE

Ordered sections this galaxy CLAUDE.md SHOULD have (a romeo chat needs nothing else but the universal-core pointer):

```
1. SCOPE — romeo's mission (1 paragraph, no verbatim quote of CHAT-SLOT-DOMAINS)
2. LIVE BACKLOG STATE — current unwired count + regen command + breakdown table
3. SOURCES OF TRUTH — AWARENESS-SNAPSHOT, audit-unwired-engines.mjs, DISPATCHER_DIGEST, ENGINE_DIGEST (verified paths only)
4. ENGINE TRIAGE GATE — PREFER (pure/static/manufacturing) vs DEFER (infra-dep/active-claim) with examples
5. DISPATCHER ROUTING QUICK-MAP — engine domain → target dispatcher (complete, verified names)
6. PER-WIRING DISCIPLINE — 5-step checklist (import → schema → Zod enum → switch → round-trip test → commit)
   - Step 0.5: check dispatcher line count (>5000 → sub-dispatcher)
   - Step 0.5: check for cross-dispatcher action name collision
   - Zod schema location: mcp-server/src/schemas/<domain>ActionSchemas.ts
   - normalizeParams is SHALLOW — nested objects unchanged
7. ROUND-TRIP TEST DISCIPLINE — location rule + stop_on_unwired_assets scan scope
8. WIRE-EXEMPT PROTOCOL — tag format + audit file location (112 engines in UNWIRED-ENGINE-AUDIT)
9. ANTI-PATTERNS (romeo refuses) — 6 existing patterns (keep verbatim)
10. KARPATHY 5-STEP FOR WIRING — keep verbatim (excellent, domain-adapted)
11. GNN TIER-5 LEVERAGE — keep verbatim (AUROC 0.808, τ=0.7, india owns model)
12. RELATED GALAXIES — tango/papa/uniform/sierra + dormant-data/victor (merged, no duplicate)
13. BRIDGES OUT — prism_dev:engine_util_audit / prism_session:dispatcher_map_compact / master_index_query
14. WORKTREE / COMMIT DISCIPLINE — slot/romeo branch, [slot/romeo] prefix, npm ci location
15. CLOSED-LOOP INTEGRATION WITH INDIA — keep trimmed (remove unverified outcome-bus-auto-tap ref)
16. AI-SYSTEMS-STATE pointer — one occurrence only
17. CRITIC + KEEP-WORKING pointer — keep (one stanza)
```

Total target: ~120 lines (currently 134 but with duplicate removal + generic content drop → leaner).

---

### UNIVERSAL-CORE POINTER

The following rules must remain available to romeo but should NOT be duplicated into the galaxy file — reference via:
`> Universal rails: H:/prism/CLAUDE.md §[section] — do not duplicate here.`

| Rule | Section in main CLAUDE.md |
|------|--------------------------|
| R1-R15 full doctrine | §CLAUDE.md RULES 5-13 + §KARPATHY DISCIPLINE |
| 3-of-3 scrutiny gate | §SCRUTINY GATE (UNIVERSAL) |
| Per-file 2-arm scrutiny | §PER-FILE SCRUTINY GATE |
| Per-chat handoff write/read | §PER-CHAT HANDOFF |
| Commit format `[SCOPE]/U-ID` | §SESSION HYGIENE |
| Units-first (inch vs mm) | §SAFETY RAILS |
| No-stub enforcement | §SAFETY RAILS + §ENFORCEMENT |
| duplicationGuardEngine.checkBeforeCreating | §MANDATORY SELF-AWARENESS |
| engine-digest check before creating | §MANDATORY SELF-AWARENESS |
| Golf slot hygiene | §GOLF SLOT |
| RTK bash prefix | @RTK.md global import |
| Ollama fallback ladder | §AI SYSTEM ROUTING |
| SESSION CONTINUITY + per-slot wrappers | §SESSION CONTINUITY STACK |

Romeo's galaxy CLAUDE.md should open with:
```
> Universal rails (safety/R1-R15/scrutiny/handoff/commit/units): H:/prism/CLAUDE.md — not duplicated here.
> Domain-specific doctrine for slot:romeo only below.
```
