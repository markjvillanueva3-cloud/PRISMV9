# PSN-Synergy Fleet Roadmap — All 34 Galaxies (2026-05-31)

> **ADVISORY ONLY · mustHumanVerify** — Every "shipped" claim below was spot-verified against the `cad-fusion-live-ms0` integrator branch (HEAD `9531be0705`) on 2026-05-31, but file presence ≠ spec correctness. No status flip, no commit, no roadmap-index mutation is implied. A human (or the owning slot) must confirm each unit's scope before building.
> **Companion docs:** [[feedback_psn_definition]] (canonical 11-leg PSN taxonomy) · master audit [`PSN-OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT-2026-05-31.md`](./PSN-OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT-2026-05-31.md).
> **BRANCH GATE (R12/R13):** This roadmap is keyed to `cad-fusion-live-ms0`. The same paths are stubs or absent on `slot/bravo` and partial on `main`. **Any builder MUST start from `cad-fusion-live-ms0` or rebase onto it first** — building U-FLEET-P1 on `slot/bravo` re-introduces the 38-LOC PRISMContextInjectorEngine stub and inverts logical order.

---

## 1. Executive Headline

PRISM's "master brain" — the Hermes-coordinated octopus consensus stack over the 11-leg PSN — integrates at only **~2 of 11 legs** today, and the fleet-wide instrumentation (`psn-leg-state-inject.mjs`) measures **6 of 11** (not 3, as the source roadmap claimed). The leverage is concentrated in **6 BUILD-ONCE-FLEET-WIDE units**: a single retrieval substrate, a single live-vault wire, a single galaxy-memory mirror, a single coverage dial, plus the foundation runtime gap (one real octopus run) that gates every downstream metric. Build those six in strict dependency order and all **34 galaxies** light up from one implementation each; only then does per-galaxy corpus tuning pay off. The dominant risk is not feasibility — it is **branch divergence** and **measuring stubs**: octopus has never executed a real 5-voice fan-out (`octopus-runs.jsonl` is a 522-byte stub), so any P4/P5/P6 consumer built before the first real run reads a placeholder.

---

## 2. Fleet Leg-Coverage Summary (distribution across 34 galaxies)

The 11 PSN legs: **Obsidian · PRISM-OS · Wiki · Memories · Tribal · System-Viz · Engines · Algorithms · Formulas · NN-GNN · PRISM-AI** ([[feedback_psn_definition]]).

| Leg-count band | Galaxies | Read |
|---|---|---|
| **4 legs** | ai-training | Highest — owns the india self-improve template (~95 LoRA engines, GraphSAGE tier-5, closed-loop backbone) |
| **3 legs** | system-viz (5*), lathe, mill, quoting, academy | Have a domain corpus + a partial self-improve or viz seam. (*system-viz reads 5 via its own roost machinery) |
| **2 legs** | hermes-zulu, wedm, speed-feed, cam, cad, business, post-processor, blueprint-vision, database-expansion, fleet-hygiene, agent-orchestration, discovery, knowledge-conversion, corpus-aggregation, tribal-knowledge, shop-floor, quality, compliance-safety, mit-curriculum, pdf-corpus, pdf-corpus-mill, backend-helper, bug-hunting, dormant-data, wiring, cad-fusion-live | The bulk of the fleet — consulted only via Memories + System-Viz today |
| **1 leg** | frontend-app | Wiki/memory/tribal were all GAP; seeded at its galaxy buildout |

**Skew finding:** Only the **4-5 TEXT-retrieval legs** (Wiki, Memories, Tribal, Skills, +Graph) are real P1 targets. NN/GNN, PRISM-AI, and PRISM-OS have **no text-retrieval surface** — "all 11 legs" is an over-promise. Every P1 unit is scoped to the real retrievers. `psn-leg-state-inject.mjs` already instruments 6 legs (Memories #4, System-Viz #6, NN/GNN #10 in iter3; + Wiki #3, Tribal #5, +1 in iter7), so **~5 legs remain uninstrumented** (Obsidian, PRISM-OS, Engines, Algorithms, Formulas, PRISM-AI minus iter7's 6th) — P6's residual value is 5 legs, not 8.

---

## 3. BUILD-ONCE Units — THE KEYSTONE (rank order; one build → every galaxy)

> Strict logical order (R13): **P0 (real run) → P1 (substrate) → P2 (live wire) / P3 (mirror) in parallel → P6 (dial, gated on P1) → per-galaxy tuning.** P4 ghost-roosts are N/A fleet-wide until a galaxy emits a real ledger.

| Rank | ID | Title | Owner | Effort | Covers | Concrete first step |
|---|---|---|---|---|---|---|
| 1 | **U-FLEET-P0-OCTOPUS-FIRST-REAL-RUN** | Execute the first real 5-voice octopus fan-out (HOC02) so every downstream surface measures real data, not a stub | bravo | S–M | 34 | `git -C H:/prism switch cad-fusion-live-ms0`; populate `octopus-with-hermes-rag.mjs:60` `psnCorpora` with ≥1 real text leg; run one fan-out; confirm `octopus-runs.jsonl` grows past 522B with `consensus≠"stub-not-yet-merged"` and `psnExemplars≠null`. **RE-SCOPED from "wire missing subscriber" — the subscriber already exists (see §7).** |
| 2 | **U-FLEET-P1-OCTOPUS-RAG-SUBSTRATE** | Populate the leg-fan corpus loader feeding `PRISMContextInjectorEngine.buildContext()` into every voice's `MultiModelConsensusEngine.buildPrompt()` (P1 shared substrate) | bravo | M | 34 | In `octopus-with-hermes-rag.mjs`, replace `psnCorpora: {}` (line 60) with a real loader scoped to **4-5 text retrievers only** (wiki + memories + tribal + skills + graph). `buildContext()` (real BM25-over-graph, async, `mcp-server/src/engines/PRISMContextInjectorEngine.ts:70`) already exists — feed it. Fail-soft per leg; respect per-voice `modelBudget`. |
| 3 | **U-FLEET-P2-LIVEBRAIN-SLOTCTX** | Wire `liveBrainContext()` into `slot-context-bundle-inject.mjs` — fleet-wide live vault on EVERY prompt across all 26 slots | bravo | M | 34 | **Edit the RIGHT file:** `liveBrainContext()` lives at `mcp-server/src/engines/lib/zuluAwarenessReader.ts:262` (standalone async export, returns `Promise<LiveBrainContext\|null>`), **NOT** a method on ObsidianRestBridgeEngine. The hook is ALREADY async (`slot-context-bundle-inject.mjs:140`, `await import` line 169) — the real constraint is `.mjs`-cannot-import-`.ts`-at-runtime, so route through the **already-wired** `prism_session:obsidian_read` MCP action (:3100 is UP — verified `/health` 2026-05-31). Hard-timeout + cache + fail-soft to empty; gate `PRISM_OBSIDIAN_LIVE=1` (off by default). |
| 4 | **U-FLEET-P3-GALAXY-MEMORY-OBSIDIAN-MIRROR** | ONE generator mirrors the 34 `engines/<galaxy>/MEMORY.md` INDEX files into the Obsidian vault graph (P3) | alpha | M | 34 | **DIFF FIRST (mandatory):** `knowledge/memories/galaxies/` already holds 141 files across 23 dirs from the shipped slot-memory routing (`63bb5048fe`). Confirm the 34 `engines/<galaxy>/MEMORY.md` INDEX files are genuinely ABSENT before building. `obsidian-memory-sync.mjs:300` explicitly filters `f !== 'MEMORY.md'`, so the INDEX shape is a distinct, un-mirrored source needing a dedicated path (different header parsing — no frontmatter pipeline). New `syncGalaxyMemories()` in `scripts/obsidian-memory-sync.mjs` (at `scripts/`, NOT `scripts/lib/`). **MUST NOT duplicate `63bb5048fe`.** |
| 5 | **U-FLEET-P6-PSN-LEG-COVERAGE-DIAL** | Extend `psn-leg-state-inject.mjs` to an always-on per-leg consultation-coverage dial (P6 mechanism) | golf | S | 34 | Extend the hook (today at **6/11** legs, surfaces only-concerning silently) to an always-on 0-11 gauge. **GATED on U-FLEET-P1** — built before the corpus loader, it reads `psnCorpora:{}` null and reports 0/11 forever. Golf owns the hook → chat-bus first; ship injected-advisory half before any viz-overlay. |
| 6 | **U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER** | Feed the consensus ledger into `WeeklySynthesisEngine` via a SEPARATE `LoaderFn` (P5 shared half) | bravo | S | 34 | `WeeklySynthesisEngine.ts` has a clean injectable `LoaderFn` (interface line 90-91, `loader?` ctor arg line 399). Compose a SEPARATE loader (do not bolt heterogeneous input inline) that reads the **real** octopus ledger once U-FLEET-P0 produces it. Same `MAX_SOURCE_BYTES` truncation. Engine is already dispatcher-wired (`memoryDispatcher.ts weekly_synthesis_get`). |

**NOT in the build-once table (corrected from source roadmap):**
- ~~U-FLEET-P0-CONSENSUS-PERSIST-SUBSCRIBER~~ — **DROPPED.** Its premise ("zero EventBus subscribers") is FALSE: `ConsensusNeuralFeedbackEngine.ts:379` is a live subscriber to `CONSENSUS_COMPLETED_TOPIC`, and `MultiModelConsensusEngine.ts:385` publishes to it; persistence is ALSO inline (fire-and-forget). The real gap is the runtime/data gap, now captured as **U-FLEET-P0-OCTOPUS-FIRST-REAL-RUN** (rank 1).

---

## 4. Per-Galaxy Priority Table (all 33 domain galaxies + integrator)

| Galaxy | Priority | Legs | Top unit (pattern) |
|---|---|---|---|
| hermes-zulu | high | 2 | P1 octopus-leg-fan tuned to orchestration corpus + P4 octopus-consensus ghost-roost (sole live ledger emitter) |
| ai-training | high | 4 | P5-template — package india's ~95-LoRA / GraphSAGE / closed-loop kit as clonable per-galaxy self-improve |
| system-viz | high | 5 | P4-host — owns `regen-viz` FAST[] + `merge-augmentations` splice; render octopus + galaxy ledger roosts |
| wedm | high | 2 | P1 tuned to deepest domain corpus (586 backend + 879 knowledge nodes, 15 discharge gotchas, 4058 archive files) |
| speed-feed | high | 2 | P1 tuned to Kienzle/Taylor/Merchant/Altintas SLD corpus + P5 on 401-assert gauntlet outcomes |
| cam | high | 2 | P1 tuned to CAM toolpath corpus (60+ CAM*.ts + hyperMILL family, 6 tier-1 bridges) |
| cad | high | 2 | P1 tuned to 129K-file CAD corpus + STEP AP242 + [[cad-knowledge-index]] |
| lathe | med | 3 | P5 — already wires LoRA to india; tune turning-safety outcome loop (G50/CSS/chuck-jaw) ⚠ verify LoRA link |
| mill | med | 3 | P5 — already has india LoRA stack; tune VMC-01..05 cut outcomes + P1 to ~222-engine corpus ⚠ verify LoRA link |
| quoting | med | 3 | P5 — already ships a self-improving controller; tune quote-vs-actual reconciliation loop |
| post-processor | med | 2 | P1 tuned to 14-controller dialect corpus (MasterPost, JM .cps fleet) |
| business | med | 2 | P1 tuned to ERP/HR/accounting corpus (355 engines, 879 actions) + financial-invariant + PII discipline in retrieval |
| blueprint-vision | med | 2 | P1 tuned to OCR/blueprint corpus (~30 engines, cadDispatcher ~40 actions, multi-print-PDF split) |
| academy | med | 3 | P5 self-reflect on course-completion outcomes (16 engines, 63 course ids, MIT-OCW, pypdf 8752-page corpus) |
| database-expansion | med | 2 | P4 ledger-roost on store/migration outcomes ⚠ requires ledger EMITTER first |
| fleet-hygiene | med | 2 | P4 ledger-roost on reaper sweep / task-health runs (one of the few real emitters) |
| agent-orchestration | med | 2 | P1 tuned to orchestration + model-routing corpus |
| frontend-app | med | 1 | P3 — 3 PSN legs were GAP; ensure its MEMORY.md mirrors into the Obsidian graph via build-once P3 |
| discovery | low | 2 | P6 coverage-dial first reader (anti-dup / coverage / orphan audits already produce per-leg signal) |
| knowledge-conversion | low | 2 | P5 self-reflect on conversion accept/dup/discard rates (MIT+monolith → 6-node router) |
| corpus-aggregation | low | 2 | P3 mirror — clusters with mill/pdf-corpus; no own ledger |
| tribal-knowledge | low | 2 | P1 corpus SOURCE — ensure `tribal-embed-index` feeds the build-once P1 retriever |
| shop-floor | low | 2 | P4 ledger-roost — live machine status → adaptive/ERP outcomes IF it emits a ledger |
| quality | low | 2 | P4 — Cpk/SPC gate outcomes; cross-cutting meta-synthesis hub (degenerate-cluster risk) |
| compliance-safety | low | 2 | P4 — S(x) gate / alarm outcomes as ghost-roost IF ledger emitted |
| mit-curriculum | low | 2 | P1 corpus source for academy/ai-training; no own ledger |
| pdf-corpus | low | 2 | P3 mirror — pypdf 8752-page corpus source; clusters with mill |
| pdf-corpus-mill | low | 2 | P3 mirror — mill PDF extraction (Haas/Mazak); meta-synthesis cluster member |
| backend-helper | low | 2 | P3 mirror — build/TSC assist; no domain corpus or ledger |
| bug-hunting | low | 2 | P4 — silent-no-op / route-verify findings as ledger-roost |
| dormant-data | low | 2 | P4 — dormant/orphan-data ledger already conceptual; render as roost |
| wiring | low | 2 | P4 — engine→dispatcher wiring-closure outcomes as ledger-roost |
| cad-fusion-live | low | 2 | P3 mirror — long-running CAD/Fusion session pattern; integrator-branch namesake |

⚠ = claim flagged for human verification before build (no cited shipped file/commit confirming the LoRA-to-india wiring on lathe/mill).

---

## 5. Cross-Galaxy Insights (corrected)

1. **Leg-coverage is severely skewed** — master octopus consults ~2/11; `psn-leg-state-inject.mjs` instruments **6/11** (corrected from "3/11"). 5 legs (Obsidian, PRISM-OS, Engines, Algorithms, Formulas, PRISM-AI) have no live per-galaxy metric. P6 is the build-once fix, GATED on P1's corpus loader.
2. **Only 4-5 TEXT-retrieval legs are real P1 targets** — wiki + memories + tribal + skills (+graph). NN/GNN, PRISM-AI, PRISM-OS have no text-retrieval surface; scope every P1 unit accordingly; flag india (NN/GNN owner) advisorily only.
3. **Ledger emitters are RARE** — NO `engines/<galaxy>/` directory emits a run/outcome jsonl. The only octopus ledger is `octopus-runs.jsonl` (522B STUB). **CORRECTION:** `consensus-queue.jsonl` (66KB) is the auto-critical-edit PreToolUse REVIEW queue (last entry reviews a `camDispatcher.ts` edit), **NOT** 5-voice octopus output — it is the WRONG ledger for octopus roosts. **P4 ghost-roost applies to ~0 galaxies with real octopus data right now.** Every per-galaxy P4 unit hides an unscoped prerequisite: the galaxy must first EMIT a ledger (2-unit chains mislabeled as 1).
4. **Self-improving AI (P5) is doctrine fleet-wide** ([[feedback_domains_own_ai_training_systems]]) but SHIPPED in only ~4 galaxies: india (template owner), quoting, lathe, mill (LoRA stacks — lathe/mill links ⚠ unverified). The other ~30 must CLONE india's template.
5. **P5 reflection substrate is further along** — B1 `galaxy-reflection-synthesis.md` (2026-05-29) produced 34 per-galaxy L1 syntheses; L2/L3 meta-synthesis compounds them. The reflection LAYER exists fleet-wide; the gap is wiring each galaxy's live OUTCOMES (not memory text) into a self-correcting loop.
6. **Bidirectional Obsidian ("vault writes back") is the largest unbuilt fleet capability** — HERMES-MEMORY-VAULT-MS0 (U-HMEMV04 dream-cycle / U-HMEMV05 memory-router / U-HMEMV06 reflect-on-self) mostly UNSHIPPED. `liveBrainContext()` is built + exported but **consumed by NOTHING** (confirmed: zero `.claude` consumers) — P2 is the single highest-coverage unblock.
7. **Branch divergence is the dominant build risk (R12).** "Shipped" splits `slot/bravo` ≪ `main` < `cad-fusion-live-ms0`. This analysis ran on `cad-fusion-live-ms0` where all 34 MEMORY.md + `octopus-record-lib.mjs` + the real `PRISMContextInjectorEngine` impl are present. Path drifts from the spec draft: `obsidian-memory-sync.mjs` at `scripts/` (not `scripts/lib/`); `PRISMContextInjectorEngine.ts` + `WeeklySynthesisEngine.ts` at `mcp-server/src/engines/` root.
8. **Octopus has NEVER done a real run** — `octopus-runs.jsonl` is a single stub (`consensus="stub-not-yet-merged"`, `psnExemplars:null`). Strict order: **P0 first real run → P1 substrate → P5/P6 consumers**.
9. **Stale premises corrected (fail-loud):** (a) ":3100 MCP is DOWN" — FALSE, `/health` returns healthy, uptime ~41.4k s. (b) "zero CONSENSUS_COMPLETED_TOPIC subscribers" — FALSE, live subscriber at `ConsensusNeuralFeedbackEngine.ts:379`. (c) "psn-leg-state instruments 3/11" — FALSE, it is 6/11. (d) "`liveBrainContext` is a method on ObsidianRestBridgeEngine" — FALSE, standalone export in `zuluAwarenessReader.ts:262`. (e) "slot-context loader is sync .mjs" — FALSE, already async. A builder following the source spec verbatim edits the wrong file and codes around a non-existent outage.

---

## 6. Proposed Milestone — `PSN-OCTOPUS-FLEET-SYNERGY-MS0`

**13 units, dependency-ordered (foundation build-once first, then per-galaxy tuning):**

| Order | Unit | Layer | Depends on |
|---|---|---|---|
| 1 | U-FLEET-BRANCH-SYNC (prerequisite: rebase/start from `cad-fusion-live-ms0`) | gate | — |
| 2 | U-FLEET-P0-OCTOPUS-FIRST-REAL-RUN | foundation | 1 |
| 3 | U-FLEET-P1-OCTOPUS-RAG-SUBSTRATE | build-once | 2 |
| 4 | U-FLEET-P2-LIVEBRAIN-SLOTCTX | build-once | 1 (independent of P1) |
| 5 | U-FLEET-P3-GALAXY-MEMORY-OBSIDIAN-MIRROR | build-once | 1 (diff-gate) |
| 6 | U-FLEET-P6-PSN-LEG-COVERAGE-DIAL | build-once | 3 (P1 corpus loader) |
| 7 | U-FLEET-P5-WEEKLY-SYNTHESIS-OCTOPUS-LOADER | build-once | 2, 3 |
| 8 | U-GAL-P1-HERMES-ZULU (orchestration corpus) + P4 octopus roost | per-galaxy | 3, 2 |
| 9 | U-GAL-P1-WEDM (deepest domain corpus) | per-galaxy | 3 |
| 10 | U-GAL-P1-SPEED-FEED + P5 gauntlet | per-galaxy | 3 |
| 11 | U-GAL-P1-CAM / P1-CAD (toolpath + 129K corpus) | per-galaxy | 3 |
| 12 | U-GAL-P5-AITRAIN-TEMPLATE-KIT (clonable india kit) | per-galaxy template | 2 |
| 13 | U-GAL-P5-LATHE / P5-MILL / P5-QUOTING (tune existing loops) | per-galaxy | 12 |

Build-once units (orders 2-7) deliver fleet-wide coverage first; per-galaxy tuning (orders 8-13) only scopes the proven substrate. P4 ghost-roosts are deferred fleet-wide until emitters exist (only hermes-zulu + fleet-hygiene qualify near-term).

---

## 7. Cross-Lane Coordination Matrix (which slot builds what)

| Slot | Lane | Owns (build-once) | Owns (per-galaxy) | Coordination note |
|---|---|---|---|---|
| **bravo** | hermes/octopus | P0 (first run), P1 (substrate), P5 (loader) | hermes-zulu P1+P4 | Critical path — P0→P1 gates everyone. Post to chat-bus before editing `octopus-with-hermes-rag.mjs`. |
| **alpha** | Obsidian + memory | P3 (galaxy-memory mirror) | — | DIFF `galaxies/` vault before building; owns galaxy back-pointer registry. |
| **golf** | fleet-hygiene + hooks | P6 (coverage dial) | fleet-hygiene P4 | Owns `psn-leg-state-inject.mjs`; chat-bus first; GATED on bravo's P1. Allowlist-constrained — dial's injected half only. |
| **sierra** | system-viz | — (P4-host machinery) | renders octopus + galaxy roosts | Owns `regen-viz` FAST[] + `merge-augmentations` splice. No roost until an emitter ships. |
| **india** | AI training | — | ai-training P5-template kit | Packages the clonable india self-improve kit consumed by P5 per-galaxy units. |
| **mike** | wedm | — | wedm P1 | Deepest corpus; coordinate retriever scoping with bravo's substrate. |
| **oscar** | speed-feed | — | speed-feed P1 + P5 | |
| **kilo** | cam | — | cam P1 | |
| **delta** | cad | — | cad P1 | |
| **foxtrot / whiskey** | mill / lathe | — | mill / lathe P5 | Verify LoRA-india link before scoping P5 (⚠). |
| **charlie / hotel / echo / xray / lima / quebec / juliett** | quoting / business / post-proc / blueprint / academy / frontend / db-expansion | — | respective P1/P5/P3/P4 | Standard per-galaxy lane; pull from build-once substrate once orders 2-7 land. |

---

## 8. Already Shipped — DO NOT REBUILD

Verified present on `cad-fusion-live-ms0` (HEAD `9531be0705`), 2026-05-31:

- ✅ `ConsensusObsidianPersistenceEngine.ts` (15.3K) — real impl, YAML frontmatter, idempotency on `prompt_hash`, atomic writes, wiki/consensus indexing. Wired into MultiModelConsensusEngine + devDispatcher. **(NOT a bus subscriber — only a persist engine; do not confuse with the subscriber below.)**
- ✅ `ConsensusNeuralFeedbackEngine.ts` (15.9K) — **LIVE EventBus subscriber** to `CONSENSUS_COMPLETED_TOPIC` at line 379 (with dedup gating). The "zero subscribers" claim is FALSE — do NOT build a "wire the missing subscriber" unit.
- ✅ `MultiModelConsensusEngine.ts` (29.9K) — 5 voices, exports + **publishes** `CONSENSUS_COMPLETED_TOPIC` (line 385); inline fire-and-forget persist independent of the bus.
- ✅ `PRISMContextInjectorEngine.ts` (6.1K) — real BM25-over-graph `buildContext()` (async, line 70), fail-open, modelBudget clamp. De-stubbed by U-GO-C6 (`b1b01adf4e` / `bd521d0a90`). **Stub still on `slot/bravo` — do not rebuild from there.**
- ✅ `slot-context-bundle-inject.mjs` — async T2 UserPromptSubmit hook, composes 5 PSN legs, fail-soft, wired in settings.json. (Does NOT yet call `liveBrainContext` — that is P2.)
- ✅ 34× `engines/<galaxy>/MEMORY.md` INDEX files. (Mirror into Obsidian graph = P3, pending diff.)
- ✅ `obsidian-memory-sync.mjs` (17.3K, at `scripts/`) — slot-tagged C:→H: routing with `resolveMemoryGalaxy()`/`reconcileGalaxies()` → `knowledge/memories/galaxies/<galaxy>/` (141 files populated). Shipped `63bb5048fe`. **P3 must NOT duplicate this** — it filters out `MEMORY.md` (line 300), so the INDEX shape is a distinct un-mirrored source.
- ✅ `ObsidianRestBridgeEngine.ts` (14.9K) — read-only fail-soft REST bridge (:27123).
- ✅ `liveBrainContext()` — built + exported at `zuluAwarenessReader.ts:262`, BUT **dead code** (no consumer). Wiring it = P2.
- ✅ `WeeklySynthesisEngine.ts` (24.6K) — pluggable `LoaderFn`/`SummarizerFn` DI (lines 90-91, ctor line 399), dispatcher-wired (`weekly_synthesis_get`). Adding the octopus loader = P5.
- ✅ `octopus-record-lib.mjs` (`scripts/lib/`) — ledger WRITER (`d02bf0b697`). `octopus-runs.jsonl` = 522B STUB (one record, `consensus="stub-not-yet-merged"`).
- ✅ `psn-leg-state-inject.mjs` — instruments **6/11** legs (iter3 + iter7), surfaces only-concerning legs. Extending to an always-on 0-11 dial = P6.
- ✅ `regen-viz.mjs` FAST[] + `merge-augmentations.mjs` splice — the P4 dual-register seam (real pattern; no octopus roost until a real ledger emits).

---

> _Generated 2026-05-31 against `cad-fusion-live-ms0`. Advisory + mustHumanVerify. Cross-refs: [[feedback_psn_definition]] · [`PSN-OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT-2026-05-31.md`](./PSN-OBSIDIAN-OCTOPUS-SYNERGY-ASSESSMENT-2026-05-31.md) · [[feedback_domains_own_ai_training_systems]]._
