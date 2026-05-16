# RGS-TOOL-AUTOINVOKE-MS0 — Design Spec (v2 — post 10-agent scrutiny)

> Status: HARDENED — all P0/P1 from 10 parallel review agents folded in. Awaiting final user approval.
> Author: claude-02436db5 (slot lima) · 2026-05-16 · branch cad-fusion-live-ms0
> Review verdict: architecture sound; FAILs were spec-text gaps, now closed. No redesign.

## 1. Problem

**4480 pending units across 679 milestones** (`state/shared/MILESTONE_PROGRESS.md`). Picking up a
unit (`/pick-unit`, `/loop`, `/checkin`, `/rgs continue`) currently re-derives — lossily, per chat,
on Claude tokens — which dev pipeline / tribal knowledge / skills / MCP tools / review agents apply.
PRISM already holds the deterministic signals to answer this.

**Goal:** RGS attaches a recommended, *self-correcting* PRISM toolchain to every open roadmap unit,
surfaced at pickup. The feedback loop (§9) is what stops it rotting like `roadmap-index.json` did.

## 2. Deliverable boundary (user-confirmed)

- **Tool-plan enrichment + surface-at-pickup.** NOT an autonomous executor — operator-in-the-loop
  unconditional. Storage = single sidecar, never mutates the 679 peer-claimed envelopes.
- Synthesis = **deterministic signal-fusion → Ollama qwen2.5-coder:7b synthesis for ALL units**,
  resumable checkpointed background batch on idle GPU (zero Claude tokens/unit). Deterministic-only
  is the automatic degradation mode (real fallback with a minimum-plan contract — §5.1, NOT a stub).
- **The outcome feedback loop (§9) is IN MS0** (the 10x — agent-10 consensus; without it this is a
  static index that rots). Cron auto-replan → MS1.

## 3. Unit enumeration (corrected — agent-2; whole batch depends on this)

- **Spine:** `mcp-server/data/milestones/<MILESTONE>.json` → `envelope.phases[]` → `phase.units[]`
  → `{id, title, effort, dependencies[], exit_conditions[], description}`. Milestone id = `envelope.id`
  (= filename stem). This is the ONLY source carrying effort/deps/exit/description.
- **Open-bit join:** `state/shared/MILESTONE_PROGRESS.json` `.milestones[]` (match `.id`) →
  `.units[]` → `shipped:bool`. Open unit = in envelope `phases[].units[]` AND matching
  MILESTONE_PROGRESS unit `shipped===false`.
- **Composite key (SYNTHESIZED, not read):** `` `${envelope.id}::${unit.id}` `` — unit ids are
  phase-relative (`P0-U01` recurs across milestones); `::` verified collision-safe (zero `:` in any
  real milestone/unit id, agent-8). Do NOT enumerate from `BUILD_STATE.STALE_MILESTONES` (object,
  milestone-granularity, no units).

## 4. Signal fusion — DELEGATE, don't reimplement (agent-1 R8 table)

`scripts/lib/rgs-signal-fusion.mjs` is PURE with **injected readers**. Each reader DELEGATES:

| Fusion sub-step | Delegate to (injected reader) | NOT |
|---|---|---|
| engines/dispatchers/actions/hooks/skills the unit touches | `PRISMSelfAwarenessEngine.findCapabilities(text)` (injected async) | a fresh BM25 scorer |
| candidate skills | `skill-auto-trigger.mjs` `scoreMatch()` + `_skill-triggers.jsonl` corpus | re-deriving triggers |
| complexity tier + build/integrate verdict | `RoadmapIntelligenceEngine.assessComplexity`/`analyzeBuildVsIntegrate` via unit→synthetic-`Milestone` adapter, **once per milestone (679×), cached** | per-unit (4480×) — it takes a Milestone object, CoT/MC-heavy |
| close-out verdict | BUILD_STATE.json + MILESTONE_PROGRESS.json (`build_vs_integrate` has NO close-out output) | roadmap_intel |
| tribal tips | `scripts/lib/master-index-search-lib.mjs` `runTribalSearch()` (keyword BM25-lite — the cosine `tribal-rerank.mjs` does NOT exist; embeddings present but unconsumed) | inventing a rerank CLI |
| system-viz graph neighbors | **graph loaded ONCE** by orchestrator → bound `findInGraph(G,terms)` reader (§6 P0-1) | per-unit subprocess |
| Ollama reachability | `AISystemRouterEngine.isReachable()` / `isOllamaAvailable()` from `ollama-hook-bridge.mjs` | new curl probe |

**The one genuinely-new, non-delegatable artifact:** the **keyword→pipeline+agent rule table**
(unit semantics → `/forge-triple`,`/pdf-learn`,`/wire-unwired`,physics-reviewer,test-team,
3-of-3 gate…). This is the legitimate net-new core that justifies the milestone.

Ollama (via canonical helper, §5.4) is the **synthesizer/ranker** over the structured candidate
set — never the retriever.

## 5. Components

### 5.1 `scripts/lib/rgs-signal-fusion.mjs` — PURE deterministic fuser
- `fuseSignals({unit, readers}) → plan`. All readers injected (graph reader is pre-bound to the
  once-loaded graph). No own I/O.
- **Deterministic minimum-viable-plan contract (agent-9 P0-2, anti-stub R12):** a deterministic
  plan MUST contain ≥1 pipeline + the build-vs-integrate verdict + complexity tier + ≥1 of
  {tribal, skill, mcpTool} resolved from *real signal*. A plan failing this is an **error**, not a
  low-confidence success. Confidence capped ≤0.6 when `source:"deterministic"`.
- **Re-rank multiplier (the §9 loop's consumption point):** per candidate pipeline `P`,
  cohort = outcomes where `pipeline==P ∧ tier==unit.tier ∧ verdict==unit.verdict`;
  `successRate=(s+1)/(s+f+2)` (Laplace); `score *= (0.5 + successRate)` ∈ [0.5,1.5]. 0.5 floor =
  cold-start-safe, never zeroes a pipeline permanently (agent-10 load-bearing detail).

### 5.2 `scripts/rgs-tool-planner.mjs` — orchestrator
- Loads system-viz graph **ONCE** (~3.4s, run with large `--max-old-space-size`); enumerates open
  units (§3); per-MS roadmap_intel cache; per-unit fuse → optional Ollama synth → result.
- Flags: `--all-open --resume --milestone <m> --unit <ms::id> --ollama-off --force --limit N --time-budget <min> --concurrency N(default 1, cap 2) --json`.
- **Spawned detached** (FLEET-REAPER pattern); chat polls checkpoint JSONL. `/compact` of the chat ≠ kill of batch.
- Idempotent skip via normalized hash (§5.5). Periodic full-sidecar flush every N=50–100 units +
  final atomic flush (agent-3 P0-2 — kills the 4 GB O(n²) write amplification).

### 5.3 Surface-at-pickup — **FOLD into `pick-prefresh-inject.mjs`** (agents 1/5/9 consensus; NO new hook)
Per wire-on-demonstrated-need doctrine + 4-hook collision on `/checkin`/`/pick-unit`/`/loop`:
- Extend `pick-prefresh-inject.mjs` `TRIGGER_RX` to also match `/rgs continue` + `/continue-roadmap`
  (keep `/loop` gated by unit-id presence to avoid bare-`/loop` false-positives).
- Add `loadToolPlan(unitKey)` reading the sidecar with mtime cache (bounded 1.8 MB parse across the
  12-chat fleet). Append the plan section to its existing single `additionalContext` block.
- **Stale-on-pickup (agent-10, zero new infra):** if stored `sourceHash != currentHash`, still
  inject but prefix `⚠ STALE PLAN — re-derive critical steps` AND append
  `{unitKey,event:"stale-on-pickup"}` to the outcomes JSONL. No standalone hook, no new settings.json entry, no chain-length increase, no new drift surface.

### 5.4 Ollama integration — reuse canonical helper (agent-4 P0s)
- Import `queryOllama` + `isOllamaAvailable` from `H:/prism/.claude/hooks/lib/ollama-hook-bridge.mjs`.
  Additively extend it to forward `options.format:"json"` (backward-compat, ~3 lines, benefits all callers).
- `temperature ≤0.2`, `num_predict ≥300` (helper's 100 default truncates JSON → forced parse-fail),
  prompt budgeted <10 KB (helper hard-rejects >10000 chars).
- **Fallback triggers on network-down OR timeout OR malformed/schema-invalid JSON** (Zod-style:
  `toolchain` non-empty string[] ⊆ candidate set, `confidence` finite ∈[0,1]) — agent-4 P0: spec
  must not treat parse-fail as success.
- **Gate batch start** on `node scripts/ollama-docker-health.mjs --json`: if `ollama.up===false`,
  stamp the WHOLE index `degraded:true` (not just per-unit) so an all-deterministic 4480 run is
  never silently indistinguishable from healthy. Log cold-start cost if `warmCount===0`.
- Planner sends `"keep_alive":"10m"` (= FLEET-REAPER `DEFAULT_OLLAMA_KEEP_ALIVE`) per call; never
  writes `.ollama-routing-hint.json` (it's an Ollama client, not coordinator); align
  `PRISM_FLEET_REAPER_OLLAMA_PREWARM_MODEL`=qwen2.5-coder:7b for batch duration. Does NOT consult
  `ollama-rate-limits.json` (offloader category throttle, not an API quota — agent-4).

### 5.5 Storage schema (agent-8 corrected)
`state/shared/roadmap-tool-plans.json` — `schemaVersion:"1.0.0"` (string semver, matches
BUILD_STATE/MILESTONE_PROGRESS lineage). `plans["<ms>::<unit>"] = {milestone, unitId, unitStatus,
sourceHash, milestoneStatus, plannedAt, plan{pipelines[],tribal[],skills[],mcpTools[],agents[],
buildVsIntegrate,complexityTier,confidence,rationale,source}}`.
`sourceHash = sha256(NFC+wsCollapse(title)+""+desc+""+tier+""+verdict)` (agent-3/8
— formatting-only edits don't invalidate; semantic ones do).
`.roadmap-tool-plans.checkpoint.json` — **own `schemaVersion`** (agent-8 P0), `{batchId,
plannedKeySet[], completedKeys[] (SET not last-key+count — order-independent resume), failedKeys{}}`.
**Invalidation = ALL of:** key ∈ liveKeySet ∧ sourceHash match ∧ unitStatus match ∧ milestoneStatus
match. Lock `.roadmap-tool-plans.lock` heartbeat-refreshed ≤2 min (not bare 10-min TTL — agent-8 P2).

### 5.6 Tests — `scripts/lib/rgs-signal-fusion.test.mjs` (agent-6 rewritten suite, node:test)
T1 reader-injection: mock `roadmapIntel` verdict `build` → `/forge-triple` ∈ pipelines AND
`source≠deterministic`. T2 Ollama-down → `source==="deterministic"` ∧ `0≤conf≤0.6` ∧ ≥1 pipeline
∧ ≥1 tribal. T3 domain-boost algebraic invariant: `unit.domain="lathe"` → lathe tip ranks before
mill (`latheIdx<millIdx`). T4 purity: identical input → `deepStrictEqual` output. T5 adversarial
with EXACT verdicts: empty title→`null|conf=0`; NaN score→sanitize-to-number OR throw mentioning
NaN; unicode id→preserved-or-rejected-with-clear-error; missing milestone→`conf=0` not null;
100KB desc→no-crash-or-size-error. T6 spanning mill/lathe/wedm each → ≥1 pipeline + ≥1 tribal +
conf>0. Contrapositive everywhere (verdict change MUST change pipeline).

### 5.7 The 10x feedback loop — see §9 (IN MS0)

### 5.8 Doctrine close-out (agent-9 — 5 surfaces, mandatory before Stop)
1. **5-surface doc reflection** (NOT 4 — harness-config unit): CLAUDE.md pointer + wiki
   `knowledge/wiki/architecture/rgs-tool-autoinvoke-ms0.md` + MEMORY.md ≤200-char line + Obsidian
   memory + **(5th) settings.json grep-verification** (`pick-prefresh-inject` change present in BOTH
   C: and H: settings.json, byte-parity; c-to-h-mirror does NOT fire on Bash node-writes → manual
   `cp` + assert; smoke-test hook empty-stdin → `{"continue":true}`; record in commit body).
2. **Commit procedure:** `.md` (spec/wiki/MEMORY) → `git commit --no-verify` then
   `git show --stat <sha>` (lintstaged-noop guard); `.mjs` → normal gated commit, separate.
   Format `[RGS-TOOL-AUTOINVOKE-MS0]/U-<id>: title`.
3. **Safety tier:** dev-tooling — Ω/S(x) shop_floor gate does NOT apply (no physics/NC, do NOT add
   an Omega gate). SCRUTINY 3-of-3 Stop gate + per-file 2-agent gate DO apply (multi-file build).
4. Pre-impl viz-first dedup verdict for each §4 delegate recorded in the wiki entry.

## 6. Performance (agent-3 — was the FAIL axis)

- **P0-1 graph-load-once:** extract `loadGraph()`/`findInGraph()` from `system-viz-query.mjs` into
  `scripts/lib/system-viz-graph.mjs` (CLI becomes thin wrapper). Orchestrator loads the 324 MB /
  373K-node graph ONCE (~3.4s) → injects bound reader. **4.3 h → 3.4 s** for the system-viz signal.
- **P0-2 write amplification:** append-only JSONL checkpoint (resume oracle, set-membership) +
  periodic sidecar flush every 50–100 units + final atomic flush (tmp same volume as target;
  retry rename on Win32 `EBUSY`). **4 GB → ~80–160 MB.**
- Realistic operating point post-fix: Ollama-bound ~3 h serial, resumable, idle-GPU. `--time-budget`
  fits the `/loop` cadence (do 30 min, checkpoint, yield).

## 7. Error handling

Ollama unreachable/timeout/malformed → deterministic fallback (real minimum-plan, conf≤0.6, batch
continues). Missing/corrupt envelope → skip+stderr, continue (never abort the 4480 run). Atomic
sidecar write. Pure fusion → reproducible. Detached batch survives `/compact`.

## 8. Non-goals (YAGNI)

No autonomous execution · no envelope mutation · no cron in MS0 · no new physics/recommender engine
(pure composition) · no per-unit Claude · no standalone UserPromptSubmit hook (fold into pick-prefresh).

## 9. The 10x feedback loop — IN MS0 (agent-10 consensus)

Without this it's a static index that rots (the exact failure the user was burned by). Cheap because
the signals are deterministic byproducts the session already produces.

- `scripts/lib/rgs-plan-outcome.mjs` (PURE, injected readers) + a Stop-hook arm wired into the
  existing advisory cluster (between `session-end-peer-share` and `duplication-guard-stop`,
  no-finding → `{continue:true,suppressOutput:true}` — zero-risk wiring rule).
- On clean Stop: extract shipped unit IDs from `SCRUTINY_LEDGER.json` `notes` + last 30 commit
  bodies (`[SCOPE]/U-ID` is hook-enforced — deterministic regex); detect `reverted` via
  `git log --since=24h -- <emitted files>`. Append one record/unit to
  `state/shared/roadmap-tool-plan-outcomes.jsonl` (`v:1`, separate from the 1.8 MB sidecar).
- **Survivorship-bias guard (non-negotiable, agent-10):** `pick-prefresh-inject` logs a
  `{unitKey,event:"picked",predictedPipelines,predictedConfidence,sid}` line when it injects a plan.
  Stop-arm joins `picked`→terminal by `sid+unitKey`; a `picked` with no terminal join after session
  end ⇒ classified `blocked` (timeout, fleet-reaper confirm-after-N pattern).
- Consumed by §5.1 re-rank multiplier. Self-correcting within ~10 unit closes.
- **Compounding artifact (forge5/6 tax):** `scripts/rgs-plan-coverage.mjs` (re-runnable, JSON/text)
  — `% open units with fresh plan` (the anti-rot metric — makes staleness LOUD, R12),
  per-pipeline shipped/blocked/reverted rates, gate-able in CI, surfaceable on `/checkin`.

## 10. MS1 backlog (deferred)

Confidence calibration (compose `CAMConfidenceCalibrationEngine` ECE/Brier — needs ≥50 closed units;
MS0 records the raw pairs) · Ollama re-synthesis with outcome history · cron auto-replan gated on
coverage staleness · `prism_dev:roadmap_tool_plan_*` dispatcher actions · cross-milestone transfer
priors (`prism_ai:xproc_transfer_*`).

## 11. Buildable unit list (for writing-plans)

1. `scripts/lib/system-viz-graph.mjs` (extract loadGraph/findInGraph) + test
2. `scripts/lib/rgs-signal-fusion.mjs` (pure fuser + minimum-plan contract + re-rank) + agent-6 T1–T6
3. additive `options.format` in `ollama-hook-bridge.mjs` + regression test
4. `scripts/rgs-tool-planner.mjs` (orchestrator, detached, checkpoint JSONL, periodic flush) + test
5. `scripts/lib/rgs-plan-outcome.mjs` (pure outcome back-annotator) + test
6. `.claude/hooks/<stop-arm>.mjs` outcome recorder (advisory cluster) + test + settings wiring (5th surface)
7. `pick-prefresh-inject.mjs` extension (loadToolPlan + stale-on-pickup + picked-event log) + test
8. `/rgs` skill: `tool-plan [milestone|--all-open]` op (agent-7: name `tool-plan` not `plan-tools`
   to avoid `plan` route prefix-collision; `continue`/`generate` inject via sidecar not envelope) + frontmatter check
9. `scripts/rgs-plan-coverage.mjs` (compounding artifact) + test
10. Docs ×5 surfaces + wiki + MEMORY + Obsidian + settings grep-verify
