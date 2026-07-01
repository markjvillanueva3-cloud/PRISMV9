# PRISM Fleet 1-Month Trajectory & Fallback Backlog (2026-06-03)

Produced by a 17-agent session-history read — one agent per active chat slot mined its own commit log, handoffs, and slot-query state to reconstruct what it actually worked on over the last ~30 days. Purpose: give the operator a single decision surface that answers (1) what every chat has been doing, (2) where its unfinished + queue-eligible work fits into the canonical roadmaps, and (3) whether its 30-day trajectory is moving toward the domain north-star goal or has drifted. This is a planning/triage artifact, not a build — every item below traces to a card or a roadmap file; no work was invented. Roadmap mapping uses `PRISM-UNIFIED-ROADMAP-v2.md` (the ONLY canonical roadmap), `mcp-server/data/roadmap-index.json`, `state/shared/specs/ROADMAP-CONSOLIDATED.md` (4,347 remaining items), `state/shared/MILESTONE_PROGRESS.md` (2,724 shipped / 3,025 pending across 729 milestones), and the same-day `state/shared/specs/FLEET-DOMAIN-GOALS-2026-06-03.md`.

## Fleet activity summary

| Slot | Galaxy | Active focus now | Shipped (30d) count/highlight | In-flight |
|------|--------|------------------|-------------------------------|-----------|
| alpha | token-optimization | BLACKWELL-TOKEN-SYNERGY-MS0 (hardware-aware Ollama/cost-router tiers) | ~15+ units; Blackwell 32B route-profile + PSN-synergy graph honesty + galaxy-context federation | None uncommitted (precompact stubs) |
| bravo | hermes-zulu | HERMES-MASTER-ORCHESTRATOR-MS0 (orchestrator→slot brief channel, auto-fanout) | 60+ units; slot-brief channel → fleet-orchestrate → auto-fanout + orphan-engine wiring sweep | None open; U-OPUS-EXECUTE-WIRE deferred |
| charlie | quoting | QUOTING-SYNERGY-MS0 closed-loop (idle between units) | ~40 commits; reference-reliability + price calibration + under-quote/variance reporting | None uncommitted |
| delta | cad | CAD-TRAINING-PIPELINE live closed-loop /loop (iter 8/20), drifted to Hermes pin | Heavy; CAD-FUSION-LIVE host bridges + DRAW-MAX round-trip + COMPLETE engines + REVERSE-ENGINEER | Fusion add-in `/new`-doubling fix (operator-side) |
| echo | post-processor | CIMCO-INTEGRATION-MS0 (JM post-proving / verification-sim bridge) | 179 commits; CimcoVerificationBridge + 3 fail-OPEN gate fixes + NC-normalize + POST-TRAIN Haas | CIMCO live-sim arm (SPINE-2) + 246 golden-drift groups |
| foxtrot | mill | PRINT-TO-PROGRAM-REPLICATION-MS0 (hyperMILL replicate-from-print wire) | Heavy; P2P-replicate wire + TRIBAL-OUTCOME-LOOP + VIDEO/PDF corpus + MILL-PARITY LoRA stack | iter2: real corpus loader + 4-axis fixture + replicate_similarity_search E2E |
| golf | fleet-hygiene | Local-LLM/Blackwell GPU infra (qwen3 catalog + reaper host presets) | Heavy; 4125→0 tsc + MCP-concurrency fix + memory-recall economy + Blackwell host preset | U-BW-CATALOG-REALIGN (promote qwen3 floor → true tiers) |
| hotel | business | JM-DOC-POPULATION-MS0 (real-corpus inbox/ERP population) | ~17 + verticals; 554,999 files reconciled, gate 0→61.44% + ERP/HR app Phase 1-3 + commission/flash | 7 financial tuples pending (gate <100%); q2s frontend verbs |
| india | ai-training | BLACKWELL-AI-MS0 (GPU-leverage AI plan, capability probe) | Heavy; OllamaCapabilityProbe + 2 NN/GNN schema-read fixes + feature-separability close + self-improving-loop | None open; BLACKWELL-AI follow-on tiers remain |
| kilo | cam | BLACKWELL-TOKEN-SYNERGY shadow (own line = CAM closed-loop) | Heavy; CAM-LOOP learn-order + DOMAIN-PIPELINE intake + MCP-OOM fix + WIRE-UNWIRED + P2P-reconcile | CAM /loop iter 1/20 (learn LATHE_OP_ORDER) not closed |
| lima | academy | BLACKWELL-TOKEN routing (own line = Academy hub UX) | ~20 units; ACADEMY-MOBILE citation discipline 9 courses + ContinueLearningWidget + MCP-connectivity fix | Tag metadata + ProgressTracker active-path + phone E2E |
| mike | wedm | WEDM-P2P-ACCURACY (ACU 7-pass E-code regression fix) | ~10 WEDM + infra; FA-S family restore + TRAINING-WIZARD audit + BRIDGE-WIRING + COMMAND-KERNEL | TASK #3: real G-code emit vs held-out JM corpus |
| oscar | speed-feed | OSCAR-SFC-3WAY / 9AXIS-MS0 (vendor-fairness comparator) | Heavy; G-Wizard compare leg + PDFCorpusBridge + HSMAdvisor adapter + dormant-engine wave | Vendor-fairness #50 + calibration loop (CALIB-APPLY-WIRE) orphaned |
| romeo | wiring | BLACKWELL-DB-GEN-MS0 (host-aware GPU catalog DB-gen) | Heavy; DB-COVERAGE-GAPFILL + CIMCO-TOOLDB + JM-FUSION-TOOLS + catalog extraction plan | Run estimateExtractionPlan() concurrent OCR extraction |
| sierra | system-viz | CROSS-SUBSTRATE-SYNERGY-MS0 (typed ADD-only edge spine) | Heavy; XSUB edge schema + 34-galaxy roost + nav-inject + find-cache hardening + heap headroom | None in-lane; absorbing romeo cross-lane orphans |
| whiskey | lathe | WHISKEY-LATHE-ACCURACY-MS0 (Okuma .MIN roundtrip accuracy) | Heavy; accuracy harness + adapter-bind + JM-DIE-LATHE-UPGRADE (39 actions) + full-corpus train | iter-3: material inference + JM shop SFM/feed calibration |
| xray | blueprint-vision | BLACKWELL-DB-GEN shadow (own line = cross-source dim reconcile) | Heavy; CrossSourceDimReconcile + OCR closed-loop + overnight batch + CAD-match lift +83% | Source REAL dim candidates (3 thin adapters) |

**Fleet-wide themes this month (what the fleet collectively pushed on):**
1. **Blackwell GPU pivot (fleet-wide, last ~5 days).** A hardware swap to an RTX PRO 6000 96GB Blackwell box pulled ≥7 slots into hardware-aware local-LLM work simultaneously — alpha (route-profile/offload-tiers), india (capability probe), golf (host presets + qwen3 catalog), romeo (concurrent catalog OCR), plus kilo/lima/mike/xray *terminals* drifting onto the milestone via precompact RESUME-line borrowing. This is the dominant recent signal and a coordination hazard (multiple slots shadowing alpha-authored BLACKWELL units).
2. **Per-galaxy self-improving AI + closed-loop accuracy proving.** Domains moved from "wire the AI engines" to "prove real accuracy with honest lower bounds" — whiskey (41.6% lathe roundtrip floor), mike (WEDM regression-lock vs measured), charlie (MAPE self-audit), foxtrot (outcome loop), oscar (vendor-fairness), india (definitive GNN negative result). The R12 "fail-loud, honest numbers" discipline is consistent across all of them.
3. **Real JM Die corpus population.** hotel (554,999 files), romeo (empty tool/material catalogs), xray (overnight OCR batch), delta (20K-file reverse corpus), whiskey (16,558 programs trained) — the fleet is replacing demo/synthetic data with the real shop corpus.
4. **Infra reliability + orphan wiring.** golf (4125→0 tsc, MCP-concurrency fix), kilo/lima (MCP-OOM + ESM crash fixes), bravo/xray/mike (orphan-engine wiring sweeps) — sustained substrate-hardening that unblocks everyone.

## Per-chat trajectories

### ALPHA — token-optimization

**Active focus now:** BLACKWELL-TOKEN-SYNERGY-MS0 — hardware-aware Ollama/cost-router offload tiers (slot live, heartbeat 1m ago, branch `slot/alpha`, topic `alpha-work`, 0 active claims).

**Shipped (last 30d):**
- **BLACKWELL-TOKEN-SYNERGY-MS0** (current, last 9h): `U-BW-ROUTE-PROFILE` (teach ModelRoutingEngine the RTX PRO 6000 Blackwell → route code/reasoning to FREE local qwen2.5-coder:32b, safety stays cloud) → `U-BW-OFFLOAD-TIER` (host-class detector unlocks 14B/32B that were capped at 7B) → `U-BW-AUTO-ROUTE-ALLOWLIST` (gist-only auto-route gate) → `U-BW-BEST-TIER-REACH` (32b reachable for synthesis-heavy offload) — e2cdbe2e86, 4e1d41ccdc, ddf0fcac70, d673f2866f.
- **PSN-SYNERGY-COLLECT-MS2/MS3 + INSPECT-MS1** (11-leg synergy graph): out-edge honesty fixes, 5-single-peer-leg out-edge scan (p0_critical 19→10), obsidian/tribal/wiki leg-edge coverage lifts (0→100%), `U-PSN-LEG-OWNER-ROUTE` (leg-health digest names owning slot), `U-DENSITYFLOOR-RECAL` (scale-invariant ROI banding) — 511c6b2fa2, b1bf46b3b1, 33ad35ecb4, 1be4e99e06.
- **GALAXY-CONTEXT-FEDERATION-MS0**: federation → /system-viz ghost roost (PSN leg #6), 34/34 galaxy coverage, awareness-surface restore, plus the `U-TRIBAL-SLOT-DOMAIN-WIRE` slot-token-hijack root-cause fix (8998f53693).
- **KARPATHY-DOCTRINE-GALAXIES**: applied CLAUDE.md-as-agent-OS + LLM-Wiki doctrine to all 34 galaxy brains (77e66c69b2, 9368cf96f1).
- **OBSIDIAN-SYNC-MS1** `U-VAULT-AUTODISCOVER` (default vault resolver, fixes `obsidian_sync_status configured:false`); 34/34 galaxy wiki architecture-map pages seeded+indexed.

**In-flight / unfinished:** None uncommitted — both newest handoffs are sparse precompact auto-writes; last real work (BW + PSN-MS3 + a cross-substrate roost touch) is committed. The `U-NN-FEATURE-SEPARABILITY-CLOSE` thread (india's negative GNN result) was closed, not left open.

**Fallback work available (eligible queue):** `U-WIRE-BACKLOG-MILL` [GAP]; bridge-wiring units `U-BRIDGE-WIRE-MULTI / -FIVE / -TOOL / -MILLING`; domain units `muS-01..muS-20`; audit units `U-AUDIT-01/02/04/06/15-*`. Roadmap shows 759 milestones / 374 done; handoff "Next" pointer cites `L8-P0-MS2, L8-P1-MS2, L8-P2-MS2`.

**Trajectory direction:** Squarely on its token-optimization soul — moved from PSN-synergy graph honesty/coverage work into hardware-aware local-LLM offload (Blackwell 32B/14B routing) to raise Ollama offload take-rate and cut paid-cloud spend. Likely next: continue BLACKWELL tier work or pick up a wiring/bridge GAP unit.

**Notable findings / blockers / cross-slot deps:** Owns the **Wiki/Memories** PSN legs; `U-PSN-LEG-OWNER-ROUTE` formalizes cross-slot routing (NN/GNN→india, SystemViz→sierra, Tribal→golf, Engines→papa). Recurring R12/R7 self-corrections this month — `U-CONFLICT1-RESOLVE` (false-positive 31.5% vs 0.8% granularity), `U-TRIBAL-DOMAIN-MAP-GAP` (superseded a band-aid patch after verifying it would regress oscar/juliett/hotel tips to zero). No active blockers; Blackwell routing is gated on `strong-model-present` (no false-fallback telemetry) and non-Blackwell hosts stay byte-identical.

### BRAVO — hermes-zulu

**Active focus now:** HERMES-MASTER-ORCHESTRATOR-MS0 — building Hermes-as-ZULU fleet-master orchestration (orchestrator→slot brief channel, auto-fanout, fleet-orchestrate "wake the fleet"); binding `claude-68828b1a` on `slot/bravo`, no active claims, heartbeat fresh.

**Shipped (last 30d):** All committed on `cad-fusion-live-ms0`/main, ~60+ units across three thrusts:
- **HERMES-MASTER-ORCHESTRATOR-MS0** (newest): `97cf13fee4` U-SLOT-BRIEF-CHANNEL → `6607defcbe` SlotBriefEngine WRITE + `prism_context:slot_brief_{write,list}` → `5fb2318190` U-FLEET-ORCHESTRATE ("wake the fleet" per-slot briefs) + `fe9ce8e4c6`/`0c33a67896` status dashboard/--apply contract; `42f4c408ad` U-HMO-AUTO-FANOUT (dormant Hermes fan-out, DECISION-layer assessAutoTrigger, 27/27 tests); `ed5f6d3cde` U-FLEET-DOMAIN-GOALS (17-galaxy clear-goals via 18-agent workflow); `06ac0f7ab8` U-BRAVO-SOUL-DOMAIN-FIX (corrected stale soul mill-specialist → hermes-zulu-builder).
- **Orphan-engine wiring sweep** (all-galaxies): `267a74b76d` ZuluFleetGovernorEngine→zulu_authority_check, `c7e69d2909` DreamMarkerScannerEngine→dream_scan, `8a8612e5b4` PostProcessorVerificationOrchestratorEngine→pp_verify_posted_nc, `5ebf02aad3` MillLoRAPipelineCoordinatorEngine→mill_lora_pipeline_coord, plus `f8be5949ff` ModelAttribution, `5fe5ad5198` OpusCapability, `6c72c58615` CodeGenerationIntegrity, `874ffd6250` LSHDedup, `fe4f03e873` EmbeddingFilter — closing stop_on_unwired_assets orphans.
- **Bug fixes (fail-loud)**: `ca38013a4f` U-HERMES-ASSIGN-FAILLOUD (handleAssign 501 instead of silently corrupting claim store, R12), `213a1da6f8` U-HERMES-FTH-DRIFT-SYNC (fleet-task-health watched only 12/39 real scheduled tasks → 39, complete-by-construction).

**In-flight / unfinished:** None genuinely open — both newest handoffs are precompact auto-write stubs (empty STATE/CONTEXT) following completed commits. The HERMES-MASTER-ORCHESTRATOR-MS0 milestone is the live thread but each unit lands committed; last session ended clean at `ed5f6d3cde`. Deferred sub-unit: **U-OPUS-EXECUTE-WIRE** (LLM-backed OpusCapabilityEngine.execute() deferred from `5fe5ad5198` — needs live Anthropic client + integration harness).

**Fallback work available:** Eligible queue (30 of 365) is lathe/turning-skewed, NOT bravo's hermes-zulu domain: `U-GAP-LATHE-LIVE-TOOLING`, `U-GAP-LATHE-NOSE-RADIUS-COMP`, `U-WIRE-BACKLOG-LATHE`, `U-BRIDGE-WIRE-{LATHE,SWISS,TURNING}`, `CK-MS10/U01`, `CK-MS10/U04`, and a `muS-L01..L22` block (micro-Swiss lathe units). The roadmap pointer in handoffs names `L8-P0-MS2 / L8-P1-MS2 / L8-P2-MS2` as next. These are domain-mismatched for a hermes-zulu builder — bravo would more naturally continue HERMES-MASTER-ORCHESTRATOR-MS2 (L8 layer) or pick up U-OPUS-EXECUTE-WIRE.

**Trajectory direction:** Converging on making Hermes the operational ZULU fleet-master — bravo migrated from scattered all-galaxy orphan-wiring (PSN-OCTOPUS sweep, late May) into a focused build of the orchestrator→slot command-and-control substrate (brief channel → fleet-orchestrate → auto-fanout → domain-goals). Heading toward live multi-slot orchestration with operator-gated PUSH-assign still held behind GOVERNANCE.

**Notable findings / blockers / cross-slot deps:** (1) **Hermes fleet-control readiness = NO-GO** (`0a59e00ea2` GO/NO-GO artifact) — COMMAND_CONTROL stays NOT_READY by design (PUSH-assign gated behind GOVERNANCE). (2) **R12 tsc baseline ~654-655 pre-existing peer errors** noted across multiple commits — bravo's wires add 0 new but the workspace baseline is non-clean (peer-owned). (3) **CRLF/LF flips**: `69e8232541` had to restore LF on 4 slot-brief files (Edit/Write flipped CRLF; repo convention LF, core.autocrlf=false). (4) **Cross-slot pickups**: bravo committed oscar's untracked SpeedFeedChatterStabilityAdapterEngine.test.ts (`d1a57b9fac`) and fixed a latent never-tracked-engine broken build (`2cac254f03`) — recurring pattern of bravo cleaning fresh-checkout gaps left by peers' uncommitted shared-workdir files.

### CHARLIE — quoting

**Active focus now:** QUOTING-SYNERGY-MS0 closed-loop quote-training pipeline — slot is currently idle (binding `claude-3bc389f2`, status null, heartbeat ~1h ago, zero active claims); last real work was `U-QP-DOCUSTRATA-VARIANCE` 7h ago.

**Shipped (last 30d):** ~40 commits, almost entirely QUOTING-SYNERGY-MS0 hardening the print-to-quote training/calibration loop. Most significant:
- `87c40bdba6` U-QP-DOCUSTRATA-VARIANCE — docustrata quote-execution variance (freshness-preflight, advisory-only, units-clean per-line, 9 tests)
- `aefaeaea99` U-QP-UNDERQUOTE-ASSESS — per-job under/fair/over classification by signed gap_pct, dollars-left-on-table per-customer rollup (10 tests)
- `31a8eeff85` U-QP-DRIFT-REF-RELIABILITY — drift-summary consumes ledger reliability, tri-state alert (fires ≥3 measured AND ≥50% unreliable)
- `ae2bb88cce` U-QP-LEDGER-REF-RELIABILITY — outbound-calibration reference health into train-cycle JSONL audit ledger
- `f87ae28c09` U-QP-TRAIN-DATA-COVERAGE — closed loop self-reports data-source coverage (2-of-5 sources honestly surfaced as gap)
- `c2899616e3`/`cf8402694f` U-QP-EXTPRICE-CALIB + `516de9f49e` U-QP-OUTBOUND-PRICE-CALIB + `1e67cfab93` U-QP-ORCH-PSI-FIELD-FIX (dead Stage-4 psi_delta feed fix)
- `d42e969a2c` U-QP-BASELINE-GUARD — refuse training on degenerate baseline; `92c55ee62f` U-PSCL02 — per-slot closed-loop integration wiring

**In-flight / unfinished:** None uncommitted for charlie's quoting work — every unit shipped with 2-reviewer PASS + tests. The newest handoffs (`charlie-db-coverage`, `charlie-cad-fusion-l`, `charlie-blackwell-to`) are precompact auto-writes whose RESUME lines cite OTHER slots' commits (juliett CoolantDB, golf Blackwell host-preset) — cross-slot terminal-reuse noise, not charlie deliverables.

**Fallback work available:** Eligible queue = 30 units. Quoting-adjacent picks: `U-GAP-WIRE-JMDIE-CORPUS`, `U-WIRE-BACKLOG-WIRE`, bridge-wire units (`U-BRIDGE-WIRE-WET/WIRE/ELECTRODE`). Plus a large `muS-*` DOMAIN backlog (muS-C01, muS-C10..C50, muS-W01..W13, muS-D54..D59). The closed-loop self-report already flagged 3 present-but-unconsumed data sources (cost-index, tool-purchases, docustrata) as the natural next wiring target.

**Trajectory direction:** Steadily hardening the quoting closed-loop from "trains" to "trains honestly + self-audits" — recent arc is reference-reliability instrumentation (ledger → drift-summary → training-status), price calibration (ext/outbound priors), and advisory variance/under-quote reporting. Converging toward consuming the remaining 3/5 unconsumed data sources and surfacing dollars-left-on-table to operators.

**Notable findings / blockers / cross-slot deps:** Caught + fixed several fail-OPEN / dead-feed bugs (U-QP-ORCH-PSI-FIELD-FIX dead Stage-4 psi_delta; U-QP-BASELINE-GUARD degenerate-baseline refusal). Discipline is strong: units-safe (never blends data sources of different grain), advisory-only outputs (won't pass model estimates off as quotes). Cross-slot dependency on Docustrata pricing corpus (shared resource root) for variance work; terminal/slot binding is being reused by juliett/golf precompact writes — attribution noise to watch but no functional blocker.

### DELTA — cad

**Active focus now:** Slot bound (chatId claude-1f9a1032, heartbeat 8m ago) but topic is unset and there are 0 active claims; the last substantive thread was a live closed-loop CAD /loop (`CAD-TRAINING-PIPELINE` iter 8/20) that drifted onto a HERMES-MASTER-ORCHESTRATOR-MS0 auto-pin post-/compact (no delta-domain commit since).

**Shipped (last 30d):** Heavy, sustained CAD-galaxy output across several milestones —
- `CAD-FUSION-LIVE-MS0` host bridges (7d ago): `U-FUS-APISRV` + `U-FUS-APISRV-FILES` (Fusion 360 PRISM API Server host-side HTTP add-in) and `U-HCS-CONNECTOR` (hyperCAD-S host add-in + TS electrode engine + INSTALL guide).
- `CAD-DRAW-MAX-MS1` round-trip print pipeline: `U-VALIDATION-ROUNDTRIP` (print→CAD→print→dim-diff, 28/28 tests), `U-PRINT-OCR-LIVE` (wired BlueprintVisionOCREngine), `U-CAD-DIM-EXTRACT`, `U-PRINT-REGEN-LIVE`, plus the `U-VALIDATION-50` hypercad validation harness (75% E2E ≥70% gate, JM Die 12-case corpus).
- `CAD-COMPLETE-MS0` real engine ships: `CADTransactionEngine` (U-AI-08, atomic begin/apply/commit/rollback, 60 tests), `CADPreviewEngine` (U-AI-07), `CADConsensusEngine` (U-AI-11), `CADPartArchetypeRegistryEngine`/`CADJMDieArchetypeFrequencyEngine` (U-CADC32/33), `CADSystemNeuralArchAdapterEngine` (U-CADC-NN04/05/06), plus large silent close-out drains (Mode C/D/E tools flipping 211→158 pending CAD units).
- `CAD-REVERSE-ENGINEER-MS0` (U1-U3): `CADReverseTemplateEngine` + `CADCanonicalTreeAdapterEngine` (bridging the 20,006-file ground-truth corpus) + `CADReverseCorpusCatalogEngine`.
- `CAD-DRAW-MAX-MS0` feature backbone: `CADUnifiedFeatureBridgeEngine` (33-d), `CADToleranceSignalEncoderEngine`, `CADSequencePoolEngine`, `CADOperationDecoderEngine`.
- Cross-domain infra: `U-LIMA-PYPDF-METHOD-SHARED` (hoisted lima's 76x-deeper pypdf page-extractor to shared tree for all 26 slots) and `U-IDX-JM-DIE-TRIBAL-WIKI-PRIORITY-WALK` (indexer 1.1→1.2, JM Die tribal/wiki priority walk, 1008→3935 PDFs).

**In-flight / unfinished:** The live closed-loop CAD /loop (`CAD-TRAINING-PIPELINE`, iter 8/20) — last commit `12f4e04a4d U-CADTP-REAP-BY-ACTIVE` (doc-lifecycle reap-by-delta, 29/29 tests, LIVE-VERIFIED). Open remainder noted in handoff: the Fusion add-in's `/new` doubling case — a build may land in a pre-existing doc (components=4=prior+this); needs an add-in `/new` fix or explicit `/execute` fresh-doc create+activate (operator-side). This was NOT closed before the session drifted to the Hermes orchestrator pin.

**Fallback work available:** Eligible queue (30 of 340) is CAD-leaning with DELTA-PRIOR tags — most relevant: `U-PPL-D1`, `U-PPL-D4` / `U-PPL-D4-EXT` (pipeline), `U-GAP-CAD-FEATURE-PRIMITIVES`, `U-GC-01`/`U-GC-02`/`U-GC-15`, `U-DOCU-04`/`U-DOCU-05`, `U-INTENT-WIRE`, `U-ALL01-09`/`U-ALL10`/`U-ALL11`/`U-ALL12`. Explicitly deferred: FreeCAD + Siemens NX CAD-system units and 155 non-priority CAD units archived per user indefinite-hold directive (`U-CAD-ARCHIVE+ASSESS`).

**Trajectory direction:** Delta is PRISM's CAD-galaxy specialist and has driven CAD from engine-build (CAD-COMPLETE/DRAW-MAX) into LIVE host integration — the current frontier is the closed-loop "print → CAD → live Fusion/hyperCAD-S build → verify-every-dimension" pipeline with real add-in execution and doc-lifecycle reaping. Next logical step is finishing the Fusion add-in `/new` fresh-doc fix and resuming the CAD-TRAINING-PIPELINE /loop, not the Hermes orchestrator topic it currently auto-pinned to.

**Notable findings / blockers / cross-slot deps:** Blocker = Fusion add-in `/new`-doubling (build lands in pre-existing doc) is operator/add-in-side, not pure-TS-fixable from the slot. Cross-slot dep: the live closed-loop /loop explicitly coordinates with **kilo** (CAM galaxy) for Fusion ownership/runCandidate. Process note: this slot shows repeated post-/compact topic drift (latest session pinned to `delta-hermes-master-orchestrator` and did 0 units) — the real delta thread is in the f27ecf49 handoff, so a resume should re-bind topic to CAD before picking up.

### ECHO — post-processor

**Active focus now:** CIMCO-INTEGRATION-MS0 — JM-fleet post-proving / CIMCO verification-sim bridge (active /loop "CIMCO blind-nav map + post-proving, full suite 100% working posts"). Slot binding `claude-aaa87bb3`, branch `slot/echo`, **0 active claims** (between units); newest precompact handoff drifted onto an alpha BLACKWELL-TOKEN commit during a force-reclaim, but echo's own line is CIMCO.

**Shipped (last 30d):** 179 `slot:echo` commits. Most significant, newest-first:
- `U-CIMCO-BRIDGE-ENGINE` (SPINE-1) — `CimcoVerificationBridgeEngine` + `prism_cimco` dispatcher (6 actions) wired into index.ts; units-first sim-report pass/fail gate, 21/21 tests.
- `U-CIMCO-SIM-VERDICT-HARDEN` / `U-CIMCO-BRIDGE-PARITY-FIX` / `U-DIALECT-MASK-FAILOPEN-FIX` — three fail-OPEN safety-gate holes closed (empty report ≠ cleared-for-live; `??`→`||` parity divergence; unanchored greedy comment masks). Echo's signature this month is adversarial fail-open hunting in shop-floor safety gates.
- `U-NC-NORMALIZE-CORE` + `U-NC-DIALECT-MASKS` — strict NC normalizer / byte-equivalence comparator + per-dialect volatile-comment masks (`scripts/lib/nc-normalize.mjs`, `nc-dialect-masks.mjs`); golden round-trip classifier (byte-identical | volatile-header-only | semantic-drift).
- CIMCO inventory triad: `U-CIMCO-MACHINE-INDEX` (86 .mcfg, 44 units-UNRESOLVED 25.4× flagged), `U-CIMCO-POST-INDEX` (25 .js + 44 .eRPost), `U-CIMCO-TOOL-INDEX` (14 .tmlib, 366 cutters) + `U-CIMCO-JM-MACHINE-MAP` (15-machine JM fleet → CIMCO sim machines) + `U-CIMCO-NAV-MAP` (511-surface CHM blind-nav map).
- Prior milestone **POST-TRAIN-MS0**: `U-PT-HAAS-ENGINE` (`HaasNGCMillMasterPostEngine`, closed condition-2 Haas full-post gap, caught an inch-mode 25.4× P0), `U-PT-HAAS-CANNED-CYCLES`/`-CYCLE-BYTE-MATCH` (G81/82/83/73/84/85 byte-matched to JM goldens), `U-WINMAX-LIVE-PROBE-FINDING` (condition-1 spine re-proven vs live Mill sim). Earlier still: PER-SLOT-GALAXY-BUILDOUT `U-PSGB-ECHO` (post-processor galaxy to MASTER-BRAIN-TEMPLATE) and POST-BRIDGE-SYNERGY-MS0 /loop tail (HSM entry-geometry gate, CMM uncertainty propagation, modal-invariant check).

**In-flight / unfinished:** CIMCO-INTEGRATION-MS0 is mid-stream, not closed. Open threads logged in the post-proof ledger/wiki: real post-proof needs CIMCO live-sim or byte-equiv re-emission (offline can't fully pass); 246–247 same-base-name golden drift groups still need an operator-chosen baseline ("which golden per part" is ambiguous due to versioning); non-.nc format gaps (Okuma .MIN, Hurco .hnc lathe pools); P1 Roku-HC orientation HELD as unverified (R12); `.mcfg` post-authoring + SPINE-2 (live CIMCO-sim eval arm) pending. Several units shipped with agent scrutiny rate-limited/deferred (session 3-of-3 held instead).

**Fallback work available:** Eligible queue (30/196) leans toward post/CAM/bridge work natural to this slot — `U-BRIDGE-WIRE-FUSION`, `U-BRIDGE-WIRE-HYPER`, `U-BRIDGE-WIRE-MASTERCAM`, the `U-BRIDGE-SFC-*` family (ESPRIT/FUSION/HYPERMILL/MASTERCAM/SOLIDWORKS/INVENTORHSM), `U-GAP-CAM-HYPERMILL-SDK`, `U-WIRE-BACKLOG-CAM`, plus `U-SYNERGY-AUDIT-CONTINUE` / `U-SYNERGIZE-CROSS-SURFACE` and DOMAIN units `CK-MS9/U01-U04`, `muS-HM06/08/09`, `muS-MC02/05/06`.

**Trajectory direction:** Building the offline-provable verification spine for the JM post-processor fleet — from NC normalization → dialect-aware golden round-trip → CIMCO inventory/machine-map → the `prism_cimco` sim-bridge — toward "all JM posts proven, 100% working" before live CIMCO-sim (SPINE-2) lights up. Heavy emphasis on units-first (25.4× trap) and fail-CLOSED safety gates.

**Notable findings / blockers / cross-slot deps:** Repeatedly caught fail-OPEN holes in safety gates this month (3+ in CIMCO alone) — lesson memos `feedback_port_gate_operator_byte_faithful`, `feedback_regex_token_direction_blindspot`. Real CIMCO proof is **blocked on the live app** (`CIMCOSimulation.exe` headless candidate, bundled MariaDB) — offline arm is the only one shipped. Cross-slot feeds: CIMCO indexes feed **juliett** (DB-ingest), **kilo** (tool-registry mapping), **foxtrot/whiskey** (machine clone). Slot was just force-reclaimed by a fresh session whose precompact picked up an unrelated alpha BLACKWELL-TOKEN-SYNERGY commit — note that drift; echo's true thread is CIMCO post-proving.

### FOXTROT — mill

**Active focus now:** No live slot binding (slot-query shows none); the newest session (claude-501bd704, ~1h ago) drifted into bravo's HERMES-MASTER-ORCHESTRATOR-MS0 work, but foxtrot's genuine active thread is PRINT-TO-PROGRAM-REPLICATION-MS0 — wiring the orphaned hyperMILL replicate-from-print chain into the mill galaxy.

**Shipped (last 30d):** Heavy, sustained mill-galaxy output across ~5 milestones:
- `5d5c0c442f` PRINT-TO-PROGRAM-REPLICATION-MS0/U-P2P-REPLICATE-WIRE — wired orphaned hyperMILL replication chain (MillProgramReplicationEngine: retrieve-similar-program + adapt-by-reading-a-print, +3 multiAxisProgramDispatcher actions, axis-escalation 3→5, 22 tests, 3-of-3 PASS)
- TRIBAL-OUTCOME-LOOP-MS0 (5 core + 4 wire units, U-TTOB01→U-TTOB-RUNBOOK) — closed-loop self-training: `TribalTipOutcomeBridgeEngine` joins tribal-tip applications to OutcomeTrackingEngine (Laplace-smoothed effectiveness scoring), +2 millDispatcher actions, auto-fire instrumentation in `MillingPrintToProgramEngine`, IntelligentSequencingEngine S3.7 OOP re-ordering, cited-tip embedder
- MILL-VIDEO-CORPUS-MS0 (~12 units) — real video tribal extraction (yt-dlp captions from Dapra/Haas/Sandvik/PTSolutions + Titans/NYC CNC) growing the milling tip corpus to ~309 tips; thread-mill/5-axis/drilling/order-of-operations doctrine buckets
- MILL-PDF-CORPUS-MS0 (~7 units) — +83 cited vendor tips (25 tooling + 20 machine + 10 toolholder + 10 workholding vendors) via deep web/PDF research, KnowledgeCurriculumBridgeEngine feeding /mill-studio
- MILL-PARITY-UPGRADE-MS0 (iter89–98) — full Mill-LoRA stack at lathe parity: Cadence/Deployment/ExperimentTracker/EnsembleCombiner/Monitoring/MasterOrchestrator/ModelSelector/EnsembleOrchestrator/TribalExtractor/TribalAugmentation engines, all with mill-canonical signals (chatter-breach/FPA-gate/TCPM-fault) and per-axis_mode scoping, ~100+ new millDispatcher actions

**In-flight / unfinished:** iter2 of PRINT-TO-PROGRAM-REPLICATION — wire a REAL corpus loader (`HMCProjectParser.parse` over `data/programs` + JM DIE .hmc/.nc) so `replicate_from_print` runs against actual shop programs, plus a 4-axis fixture + `replicate_similarity_search` dispatcher E2E (from HANDOFF-fb40ed27, not yet committed). Open P3s on shipped work: P2P corpus is caller-supplied (needs the loader above); `deriveAxisCount` trusts the operationType tag for inferred sources (warn-only).

**Fallback work available:** 27 eligible queue units, mill/tribal-flavored: `U-GAP-TRIBAL-KNOWLEDGE-GRAPH`, `U-GAP-TRIBAL-MACRO-INTEL`, `U-WIRE-BACKLOG-TRIBAL`, the BRIDGE cluster (`U-BRIDGE-WIRE-MACHINE`, `U-BRIDGE-WIRE-SHOP`, `U-BRIDGE-WIRE-SENSOR`, `U-BRIDGE-SHOPFLOOR-LEARN`, `U-BRIDGE-OPERATOR-GATES`), `U-CAMAGI12`, `U-TK16`/`U-TK26`, `U-TRAIN-15`, `U-LEARN-04`, plus PROSE machine/tribal units (`U-PROSE-MCAT...MACHINE-CATALOG-CONVERGENCE`, `U-PROSE-MS-INFRA...JM-DIE-MACHINE-CONFIG`). Plus the wiki-named honest gaps still open from TRIBAL-OUTCOME-LOOP: bucket parity, source corroboration (≥2-source promotion), embedding regen (run `embed-cited-tips-into-tribal-index.mjs` once Ollama is back), train/val/test split, cross-domain corpus.

**Trajectory direction:** Building out the mill galaxy's self-improving knowledge backbone — corpus ingestion (PDF→video→cited tribal) feeding a closed outcome loop, then wiring that knowledge into the real print-to-program pipeline (replication-from-print). Moving from "gather mill knowledge" toward "make programs from a print using prior shop programs + scored tips."

**Notable findings / blockers / cross-slot deps:** (1) Ollama has been offline session-wide — forced honest-substitute tip mining (marked `confidence:draft`) and left the cited-tip embedding step deferred. (2) Cross-slot: depends on lima's pypdf extractor (FOXTROT-LIMA-CROSSOVER) for PDF corpus; the P2P corpus loader will want juliett's CIMCO machine-index + echo's CIMCO machine defs. (3) Domain-routing bug context: an alpha fix (`8998f53693` U-TRIBAL-SLOT-DOMAIN-WIRE) corrected a slot-token hijack that had mis-routed foxtrot=mill to backend-dev in tribal rerank — relevant to whether foxtrot's tribal tips surface correctly. (4) The newest session (501bd704) wandered off-domain into Hermes orchestrator work — note for continuity, not foxtrot's core lane.

### GOLF — fleet-hygiene

**Active focus now:** Bound `golf-work` on branch `cad-fusion-live-ms0` (chatId claude-8765f828, heartbeat live); zero active claims. Current lane = local-LLM/Blackwell GPU infra — cataloging the qwen3 model stack + fleet-reaper host presets for the new RTX PRO 6000 96GB swap.

**Shipped (last 30d):**
- `f737e23661` [LOCAL-LLM-FOUNDATION]/U-MODEL-CATALOG-QWEN3 — catalog qwen3 Blackwell stack (5 models) as conservative route() floor tiers, 50/50 tests
- `4047a82236` [BLACKWELL-GPU-SWAP]/U-BLACKWELL-HOST-PRESET — fleet-reaper `blackwell` host preset (RTX PRO 6000 96GB, qwen2.5-coder:32b prewarm, 24GB GPU floor)
- `1297b0a8f5` + `e5cca342a3` [MCP-CONCURRENCY-FIX]/U-MCP-FACTORY-REFACTOR — fresh McpServer per /mcp request (fixed ":3100 already-connected-to-transport" fleet disconnect regression) + doc-reflect
- `2167e22cc8`/`9dc5b30818`/`0ba1fa1d5b` [MCP-HARDEN] — port preflight bind-fail-fast + supervisor stand-down + watchdog BOOTING guard
- Memory-recall economy cluster (`06a6de1b51`, `3172f51903`, `9800c262a7`, `07748c3c3c`, `6fce5f3281`): supersede-exclude + domain-boost + prompt-hash throttle + per-galaxy recall-readiness scorecard
- `f9aa45d9d6` → `61074fa740` [GOAL-TSC-FIX] /loop iter1→iter28: **4125 → 0 tsc errors workspace-wide** (full clean), ~28 iterations
- [FLEET-HYGIENE]/[DB-HYGIENE]: `a66fdb4e32`/`63dac04f0b` tmp-orphan-janitor .tmp-<pid>/.tmp.<pid> scan-gap fixes; `8261542e2f` MCP supervisor persistence + ollama-stats leak fix

**In-flight / unfinished:** Blackwell Ollama/RTX utilization optimization completed as DURABLE host changes (no repo edits) — disabled the 16GB-era CPU throttle, fixed dual-serve, warmed 32b+r1:14b+vl:8b+nomic to 54GB resident, `detectHostClass=home_blackwell` live. Qwen3 catalog shipped as conservative floor declarations only; **U-BW-CATALOG-REALIGN** (promote to true tiers once `/api/tags` confirms model presence) is the named next step, still open.

**Fallback work available (eligible queue):** `U-SKILL-MIRROR-RECONCILE` [DEV-INFRA], `U-VAULT04`, `U-SR05`/`U-SR06` [SLOT-RECOVERY-PHASE-A], `U-FD02`–`U-FD05` [FLEET-DASHBOARD-PHASE-B], `U-FH02` [FLEET-HEALTH-PHASE-C], `U-MCP-FACTORY-REFACTOR` [MCP-CAPACITY-MS0, L]. Also explicitly deferred for peer slots: alpha/india MS1 `U-ROUTE-LADDER` (purge ~18 qwen2.5-coder:7b hardcodes), india qwen3-embedding:4b acquire+reindex (MS2).

**Trajectory direction:** Migrated from pure code hygiene (TSC zero-out) early in the window into deep MCP-daemon reliability hardening, then context-economy (memory-recall throttle/supersede), and now into local-LLM/GPU infrastructure — capitalizing on the RTX PRO 6000 Blackwell hardware swap to consolidate Ollama serving and unlock 32b-tier offload for the fleet.

**Notable findings / blockers / cross-slot deps:**
- Known blocker: **32b cold-load stall ~220s** on Blackwell (`reference-golf-ollama-coldload-stall`) — mitigated by `KEEP_ALIVE=-1` resident warming.
- Caught + fixed a fleet-wide regression: MCP `/mcp` handler called `server.connect()` on the shared singleton per request (SDK allows 1 transport/server) → multi-chat disconnects + watchdog restart loops.
- Cross-slot dependency: the qwen3-coder:30b / qwen3:32b / qwen3-vl:32b model tiers are gated on golf pulling them on request; cost-router cheap-tier (qwen2.5-coder:3b) + embedder re-index depend on alpha/india action. Operator decision pending on `PRISM_OLLAMA_ROUTE_AUTO=1`.

### HOTEL — business

**Active focus now:** JM-DOC-POPULATION-MS0 — populating PRISM's inbox/ERP layer with JM Die's real document corpus (554,999 part-files + 111,745 DocuStrata business docs) under a financial-discipline soul; no slot binding currently held, last commit ~22h ago (`U-JMDOC05` PartsLibraryEngine seed).

**Shipped (last 30d):**
- **JM-DOC-POPULATION-MS0** (dominant campaign, ~17 commits): accountability ledger/gate backbone (`U-JMDOC-LEDGER`/`01+02`, all 554,999 files reconciled, 0 silent drops); 4 archive seed-bridges on `DocumentInboxEngine` — `seedFromJMCorpus` (109,558 docs), `seedViewerArchive` (85,345 scans), `seedManifestPointers` (104,587 DocuStrata, never re-OCR), `seedFinancialPointers` (34,452 financial docs as **link-only pointers**, no AR/AP/GL records created); gate driven 0%→61.44% coverage (`U-JMDOC10`); `PartsLibraryEngine.seedFromJMCorpus` (30,890 part rows, 468 customers); synergy surface `prism_inbox:inbox_population_status` + status dashboard + wiki entry.
- **QUOTE-TO-SHIP-FRONTEND verticals:** `U-HOTEL-COMMISSION-REPORT` (new margin-tiered `CommissionReportEngine`, 23 tests) + `U-HOTEL-DAILY-FLASH-WIRE` (`daily_flash_*` actions).
- **HOTEL-NETPLAT-UI de-stub batch:** swapped generic demo data for real JM Die fleet across Dashboard/AI-Learning/SPC/Quality/Plan-Progress pages (5/8 pages, `U-DESTUB-*`).
- **HOTEL ERP/HR app** (earlier /goal run): Phase 1-3 ERP closure (`U-ERP-PHASE1-P0`/`PHASE3`, 273/273 tests — Department/ManagerRegistry/AIProposalApprovalQueue engines), `U-EMPLOYEE-TIMECLOCK` (FLSA OT), `U-PO-LIFECYCLE` (8-state FSM), `U-SHIPPING-RECEIVING-LOG` (3-way match), `U-INSPECTION-REPORT` (FAI+auto-NCR), `U-OSHA-300-LOG`, `U-EMP-HUB-FRONTEND`+route-wire, `U-WIRE-BACKLOG-ERP-PARTIAL` (wired the unwired 1489-LOC `BusinessIntelligenceEngine`).
- **QUOTE-TO-SHIP-TRAINING:** `U-JM-CUSTOMER-SEED-VERIFY` + `DOCUSTRATA-ACTIVE` (real-corpus customer seed-bridge).

**In-flight / unfinished:** From the `U-JMDOC10` gate state — 7 financial tuples still **pending** (gate at 61.44%, not yet 100%). The QUOTE-TO-SHIP spec (`HOTEL-ERP-FRONTEND-WIRING-SPEC-2026-06-01.md`) has next-up verbs queued but not yet built: `rfq_assign`/`rfq_update_status`, Kaizen `kaizen_list`/`update_status` aliases, OEE `oee_losses`/`oee_trend` + routes, `credit_review_all`. `U-JMDOC05` part.json routing was R7-corrected/re-deferred once before final ship.

**Fallback work available (from slot-query eligible queue, 30/134):** `U-BIZ01`..`U-BIZ07`, the ERP GAP units `U-GAP-ERP-{QUOTING-JOBCOST, PURCHASING-INVENTORY, HR-EMPLOYEE, JOBSHOP-SCHEDULING, FINANCIAL-ANALYTICS, LEAN-SIXSIGMA, SUBSCRIPTION-SYSTEM, DRAWING-AUTOMATION}`, `U-WIRE-BACKLOG-ERP` (remaining after PARTIAL), bridges `U-BRIDGE-ERP-QUOTE`/`U-BRIDGE-ERP-SCHED`, app units `U-APPW42A`/`U-APPW43`, plus muS-* domain units. Explicitly **deferred** in the q2s spec: `BlueprintQuoteBridge` (engine missing on disk) and Kanban (no engine, data-model decision pending).

**Trajectory direction:** Moving from building ERP/business engines toward *populating them with JM Die's real corpus and surfacing closed-loop awareness* — the through-line is making PRISM's business layer queryable on real data (not demo data) while holding a strict financial-discipline soul. Next logical step is closing the JM-DOC gate to 100% (7 pending financial tuples) and continuing the q2s frontend-vertical drip.

**Notable findings / blockers / cross-slot deps:**
- **Financial-discipline soul (load-bearing):** DocuStrata financial docs (34,452) are deliberately indexed-only / `financial_guard` link-only pointers — invariant asserts `count(consumed AND financial_guard)===0` to prevent silent-financial-clobber. Don't let any future unit create discrete AR/AP/GL records from these.
- **Cross-slot dep on charlie:** DocuStrata manifest-pointer work is distinct from charlie's `DocuStrataMaterialPriorEngine` pricing-priors (coordinated via AGENT_CHAT); 1,036 quote tuples deferred to charlie.
- **Cross-slot dep on delta:** `part_library/other` flagged as a CAD-shared lane (coord:delta).
- **Bug caught + fixed:** `inbox_seed_jm_viewer` was missing from the `ACTION_INBOX_SCHEMAS` map (fixed in `U-JMDOC09`).
- **Data caveat:** commission live page needs a salesperson-tagged closed-deal store (`SalesOrderEngine` is a pure FSM with no salesperson field); DSO/AR numbers are NEEDS-DATA — never fabricate.
- The 4 newest handoffs are precompact auto-write stubs with generic RESUME pointers (point at alpha/bravo commits, not hotel's own) — git log is the authoritative trajectory source here.

### INDIA — ai-training

**Active focus now:** BLACKWELL-AI-MS0 — GPU-leverage AI-upgrade plan for the home Blackwell box (96GB VRAM); keystone `U-CAP-PROBE` just shipped (OllamaCapabilityProbeEngine). No active slot-task claims; chatId `claude-501bd704`, branch `slot/india`, topic `india-work`, heartbeat live.

**Shipped (last 30d):**
- `86716f4aaf` **[BLACKWELL-AI-MS0]/U-CAP-PROBE** — OllamaCapabilityProbeEngine: runtime host-capability probe (nvidia-smi + Ollama /api/tags+/api/ps), WDDM-aware free-VRAM correction, feeds `route()` so it can never pick an absent model. Wired `prism_ai:capability_probe`, 19 tests.
- `93f85ec067` / `f436b2c614` **[PSN-LEG-HEALTH-FIX] NN/GNN schema-read fixes** — fixed fleet-wide fabricated "embeddingSource mismatch" diagnosis; `classifyGnn` now reads graded `metrics.auroc/brier` (deploy gate) + `checkpointMeta` fallback so a real measured grade is never reported "DORMANT". 87 tests.
- `44702e0cac` **[PSN-SYNERGY-COLLECT-MS3]/U-NN-FEATURE-SEPARABILITY-CLOSE** — definitive negative result: tier-5 GNN cannot learn dispatcher wiring from text features (LOO 0.339 < 0.5, intra/inter cosine gap 0.0017 → NON-SEPARABLE). Thread closed; cascade correctly defers to tiers 1-4.
- `56b942f50a` **U-CAG-SUMMARIZE-NOSOURCES-FIX** — CAG `summarize()` honest empty-route render (`(no sources)` instead of dangling `+`).
- `816ab9cb19` / `ab14c36979` / `b10c6e0efe` **[PSN-SELF-IMPROVING-LOOP-MS0]** — U-LOOP-WIRE, U-LOOP-INTEGRATOR, U-OUTCOME-INGEST + shop-profile adapter + coordination-consensus: closed-loop outcome backbone.
- `ce7777d68a`+ (batch) **[MIT-COURSE-INTEGRATION]/U-PDF-EXTRACT-*** — MIT-OCW PDF extraction feeding speeds/feeds, G-M-code, G76-thread inventory into the training corpus.

**In-flight / unfinished:** None genuinely open — the two newest handoffs (`india-blackwell-toke` 23m ago, `india-psn-synergy-co` 13h ago) both close on committed work. NN feature-separability thread is explicitly CLOSED (no retrain warranted). BLACKWELL-AI-MS0 plan is shipped with keystone done; follow-on tiers of that plan remain (LoRA gate, CAG/reward generalization flagged "aspirational").

**Fallback work available (eligible queue):** GNN/post-processor adjacent units — `U-GAP-POST-RL-POSTPROCESSOR`, `U-GAP-POST-JMDIE-LEARNING`, `U-GAP-POST-GCODE-BACKPLOT`, `U-WIRE-BACKLOG-POST`, `U-AGI03`, `U-AGI17`, `U-DAE2E01`, `U-DAMPP01/03/06`, `U-DB06/07`, plus `muS-*` domain units. Handoff RESUME repeatedly names `L8-P0-MS2, L8-P1-MS2, L8-P2-MS2` as the next roadmap envelope (759 ms total, 374 done).

**Trajectory direction:** Pivoting from the now-exhausted NN/GNN tier-5 work (proven a dead end for text-feature wiring inference) into **Blackwell GPU-leverage AI infrastructure** — making model routing hardware-aware so the idle 32b/large local models on the 96GB box get used for synthesis-heavy offload instead of throttling to 14b. Continues the slot's self-improving-loop and corpus-ingest mission.

**Notable findings / blockers / cross-slot deps:** (1) Definitive negative result logged — tier-5 GNN is honestly dormant; ghosts lack dispatcher edges by definition (cold-start), structural label not recoverable from semantic text. (2) Recurring NN/GNN schema-read blindness class (two fixes this period, f436b2c614 then 93f85ec067) — consumers diverging on `NN-EVAL.json` shape; now routed through canonical `classifyGnn`. (3) Blackwell plan surfaced 6 P0 corrections vs live code (kimi2.6 is CLOUD-ONLY not local; GPU idle is a WDDM artifact; python3.13 GPU venv owned by golf) — cross-slot dep on **golf** for the GPU venv and on shared `ModelRoutingEngine` substrate (extend, not rebuild).

### KILO — cam

**Active focus now:** No live slot binding; freshest kilo session (`16c4c64a`, handoff 13m ago) is parked on **BLACKWELL-TOKEN-SYNERGY-MS0** (Blackwell GPU cost-router / Ollama tier-reach offload) — but kilo's most recent *own-authored* commit is the CAM closed-loop work; the BLACKWELL units shipping now (`U-BW-BEST-TIER-REACH`, `U-BW-AUTO-ROUTE-ALLOWLIST`) are `slot:alpha`-authored, so kilo is shadowing/feeding that milestone without an uncommitted unit of its own yet.

**Shipped (last 30d):** real kilo-authored commits, newest→oldest —
- `446dc68261 [kilo] [CAM-LOOP]/U-CAM-LOOP-LEARN-ORDER` — CAM closed-loop self-improve: learn `LATHE_OP_ORDER` from corpus pairwise preferences + fixed 2 oracle/loop bugs (2026-06-02)
- `92c55ee62f [PER-SLOT-CLOSED-LOOP-INTEGRATION]/U-PSCL02` and `ed02805d58 [FLEET-TRAINING-INVENTORY]/U-CORPUS-AGGREGATE` — fleet-wide training-corpus inventory aggregator; `67178f76d6 [CAD-CAM-RESOURCES-INDEX]/U-PDF-DOMAIN-WIRE` (1008-PDF resources index build+query+wiki)
- `8cbd06cf5a` / `ee8be4fd2f [MCP-OOM-FIX]/U-WATCHDOG-MEM-PROBE + U-SUPERVISOR-HEAP-BUMP` — fixed the :3100 MCP OOM-kill loop (watchdog RSS-pressure preemptive restart + 4GB heap bump)
- `[DOMAIN-PIPELINE-MS0]` run (iter1–8): `U-OCR-ADAPTER-IFACE` (BlueprintOCRAdapter contract), `U-KILO-P2P-INTAKE-{SKILL,WIKI,FEEDBACK-MEM}` (`/p2p-intake-check` pre-flight, ~99% token savings on incomplete P2P inputs), `U-DPM0-INTAKE-CHECK-WIRE` (surfaced `print_to_program_check_intake` MCP action), `U-KILO-QUEUE-PSN-SYNERGY` + `U-KILO-DECOMP-JSON` (28-subunit decomposition routed to 7 owner slots)
- `[KILO-P2P-RECONCILE-MS0]/U-KP2P-02..04` (wired 2 orphaned P2P capstone engines, priority-queue peer-slot fix, PIPE-MS0 close-out) and `[WIRE-UNWIRED-MS0]` batch (wired Diff/Config/Event/Health/Queue/Logging engines into `prism_infra`)
- `f093621a88 [HIGH-ROI-SKILL-SYNERGY]/U-SKILL-LEDGER-REVIVE` (regen 0→482 skill-triggers + `/synergy-recall`); `1b87f98f2c [TEST]/SPEEDFEED-VARIABILITY-MS0` (103-case max-variability matrix + AutoSpeedFeed R12 Math.round fix)

**In-flight / unfinished:** An active `/loop` (iter 1/20) on **"CAM closed-loop self-improve: learn LATHE_OP_ORDER from corpus pairwise preferences"** is recorded as resumable in handoff `1981bb83-kilo-kilo` — its first iter shipped as `446dc68261` but the 20-iter loop was not closed. The freshest session then pivoted to BLACKWELL-TOKEN-SYNERGY with no committed kilo unit yet (precompact-only handoff).

**Fallback work available:** Eligible kilo queue (30 units) is **CAMX-dominated** — `U-CAMX07..24` (CAM strategy/toolpath units) plus P2P/print-to-program: `U-GAP-P2P-JMDIE-PARTLIB`, `U-GAP-P2P-OCR-DIMENSION`, `U-GAP-P2P-VALIDATION-HARNESS`, `U-BRIDGE-WIRE-PRINT`, DocuStrata `U-DOCU-01/03`, `U-PXPX01`, and the P2P training set `U-TRAIN-P2P-01..05/08`. Note: kilo's own audits (`U-DPM0-PRINT2PROG-AUDIT-EXTEND`) flagged the print-to-program queue as **false-positive-dominated for 1-session shipping** — several "gap" units are already-built duplicates, so the CAMX block is the cleaner fallback.

**Trajectory direction:** Arc moved from infra-wiring/orphan-rescue (WIRE-UNWIRED, MCP-OOM, P2P-reconcile) → CAM/CAD corpus + P2P-intake pipeline (DOMAIN-PIPELINE-MS0) → CAM **closed-loop self-improvement** (learning operation-order from corpus) → token-economy GPU offload (BLACKWELL-TOKEN). Heading toward cam-galaxy self-improving-AI + local-LLM cost-routing, consistent with the cam soul and the "domains own their AI training" fleet rule.

**Notable findings / blockers / cross-slot deps:** (1) Recurring **peer-absorption** during lock-contention windows — `U-DPM0-INTAKE-CHECK-WIRE` engine+test got absorbed into a `slot:whiskey` commit (`b925b381df`), documented as the 3rd recurrence (`reference_sf_psn_peer_sweep_recurrence`). (2) **Attribution risk on BLACKWELL-TOKEN**: the latest kilo session file's RESUME quotes a `slot:alpha` commit — kilo is shadowing alpha's milestone; coordinate ownership before committing a U-BW unit to avoid double-work. (3) Kilo found the print-to-program/P2P queue is largely false-positives (real validateIntake already does completeness detection), so blind queue pickup risks duplicate engines — verify against existing assets first.

### LIMA — academy

**Active focus now:** No live slot binding (slot-query shows no binding/active claims). Most recent session was BLACKWELL-TOKEN-SYNERGY-MS0 token-routing work (handoff `lima-blackwell-token`, 2026-06-04), but that `## RESUME` references alpha's commits — lima's own last authored ship was the PRISM Academy hub UX overhaul (`cbaaeea215`, 7d ago).

**Shipped (last 30d):**
- **PRISM-ACADEMY-MOBILE-MS0** — full citation-discipline propagation across 9+ courses (`U-PAM-MODEXPAND-0A..12`): added "Citation Discipline" capstone modules to courses 0a/0b/0c/1/2/3/4/5/12 citing real standards (ISO 6983/3685/8688/13399, Kienzle 1952, Taylor 1907, OSHA 29 CFR, Sandvik/Iscar/Kennametal catalogs). Plus PWA service-worker + `U-PAM-WIKI`/`U-PAM-DOCREFLECT`/`U-PAM-PSN-SYNERGY` (8 of 11 PSN legs wired).
- **PRISM-ACADEMY-FEATURES-MS0** `U-CONTINUE-LEARNING-WIDGET` (`cbaaeea215`) — drop-in ContinueLearningWidget wired into LearningLayout sidebar; AcademyHub UX overhaul (5 files / 1555 LOC / 37 tests).
- **MCP-CONNECTIVITY-FIX** (`173c562e04`, `1dda943c11`) — fixed 2 ESM import bugs crashing the :3100 MCP server + ASCII-folded MCP task installers (fleet-wide unblock, not academy-scoped).
- **CADCAM-DAGI-MS4** `U-CAMAGI13` (`fc4cf18ace`) — RL CAM feedback engine + wire.
- **AI-WIRE-MS0** (`a75d27afd8`, `5cfddcc9b7`) — wired 3 learning engines into prism_ai; drift close-out of 10 AI Core engines.
- **BRAIN-SYNERGY-MS0** (`786d0033d0`) — exposed Obsidian-vault BM25 as `prism_memory:brain_recall`.
- **RGS-TOOL-AUTOINVOKE-MS1** (`U-LIMA-A6/A7/A8`) — RoadmapIntelligenceEngine complexity adapter, CAMConfidenceCalibrationEngine into RGS confidence path, cross-pipeline transfer-priors adapter.

**In-flight / unfinished:** From `da82938b` handoff: `U-ACADEMY-TAG-METADATA` (Course.tags[] migration), wiring active-path into ProgressTracker + Assessment, storage-degraded toast, a 44pt touch-target fix on the right-rail X, and Justin phone E2E verify — all open after the AcademyHub overhaul. Hotel was directed (via AGENT_CHAT.jsonl) to wire ContinueLearningWidget into DashboardPage hero.

**Fallback work available:** Eligible academy-domain queue: `U-GAP-ACADEMY-220-COURSES`, `U-GAP-ACADEMY-MIT-KERNELS`, `U-GAP-ACADEMY-MIT-OCW-INGEST`, `U-GAP-ACADEMY-TRAINING-DAYS`, `U-GAP-ACADEMY-UNIVERSITY-ALGS`, `U-WIRE-BACKLOG-ACADEMY`. Plus AI/learning bridges lima already touches: `U-BRIDGE-AI-TIER1-TIER2`, `U-BRIDGE-AI-TIER2-TIER3`, `U-BRIDGE-LEARN-CAM`, `U-BRIDGE-WIRE-OUTCOME/PROCESS/VIDEO`, `U-RGS-RULE-BACKEND-DEV`, `U-AIW05`, `U-AIW09`.

**Trajectory direction:** Primary arc is PRISM Academy buildout — course-content depth (citation discipline), the learning web/PWA frontend (ContinueLearningWidget, AcademyHub, service worker), and wiring academy/learning engines into the AI + RGS substrate. Recently broadened into shared backend infra (MCP connectivity fixes, AI-core wiring, Blackwell token-routing offload). Next logical step is closing the academy MS0 in-flight tail (tag metadata, ProgressTracker/Assessment active-path) then picking up the MIT-OCW / university-algorithm gap units.

**Notable findings / blockers / cross-slot deps:** Cross-slot dep on **hotel** to wire ContinueLearningWidget into DashboardPage hero (handed off via AGENT_CHAT.jsonl). The lima↔foxtrot crossover (`U-FOXTROT-LIMA-CROSSOVER`, MILL-PDF-CORPUS) and shared pypdf method (`U-LIMA-PYPDF-METHOD-SHARED`) show lima's pypdf page-extractor is the fleet-canonical corpus tool. Blocker context: lima fixed the :3100 MCP server crash (2 ESM import bugs) that was affecting the whole fleet — connectivity, not academy. No open bugs flagged in lima's own scope; the recent handoffs are precompact-padded stubs whose `## RESUME` lines carry alpha's drift, not lima state — git log is the authoritative trajectory source here.

### MIKE — wedm

**Active focus now:** WEDM print-to-program accuracy (WEDM-P2P-ACCURACY on cad-fusion-live-ms0) — ACU 7-pass E-code family regression fix; no live slot binding/active claims at query time (between sessions). A stray 4-min-old "mike-blackwell-token" precompact handoff borrowed an alpha BLACKWELL commit into its RESUME line — not real mike work.

**Shipped (last 30d):**
- `8a96d81a44` [WEDM-P2P-ACCURACY] restore E952/E56xx ACU 7-pass families from real FA-S `.tech` (3→5) + fail-loud compound-material flag + `scripts/wedm-print-to-program-accuracy.ts` harness; 8-agent adversarial Workflow caught 2 real bugs; 168/168 (22h ago)
- `dd20ca8467` [WEDM-TRAINING-WIZARD-MS0]/U-WTW-AUDIT — cross-domain training-loop parity audit: found 164 WEDM engines / ~100 orphan, `WEDMLoRADatasetBuilderEngine.ts` is **0 bytes** (blocks wedm_lora), ~600KB orphan AI-tier code; recommended hand-off to charlie (canonical wire slot)
- `a8c04e355e`..`544cd9b952` [BRIDGE-WIRING] 7-unit sweep — wired ConversationTrimmer/SmartPrefetch/IncrementalRead/ToolOutputSummarizer/RepetitionDetector/EditPlanner to prism_orchestrate + Conveyor/3 Mobile-Field engines to prism_shop
- `92b92935b2`..`023f862470` [COMMAND-KERNEL-MS0]/U-CK11 phases — wiki entity backfill 1→304/304, top-3-bucket verdicts, shadow/gitignore decisions
- `5b566b9f89` [HIGH-ROI-MISC-HYGIENE] atomic-write fix for fleet-wide close-out audit corruption; `82c650901b`/`cb6b9fc945` [CLOSE-OUT] envelope-drift reconciliation + phases-envelope crediting fix
- `44d4651864` [FIX] post-/compact false hard-cap on precompact compact-summary

**In-flight / unfinished:** WEDM-P2P-ACCURACY **TASK #3** (per HANDOFF-72a2ebd6) — break the N=3 closed test loop: (a) drive WEDMPrintToProgramEngine/EDMPostProcessGCodeEngine to emit real G-code and compare structural skeleton vs ground truth; (b) add `--heldout` corpus arg pointing at JM WEDM programs *outside* ITW/NOZE/FIOCCHI (4,058-file archive) so accuracy can drop below 100% and expose the `patterns.ts` R7 gap (cannot emit E952/E56xx); (c) optionally unify the 3 divergent E-code selectors. Current "100%" is a regression-lock, NOT measured accuracy (honestly flagged).

**Fallback work available:** Eligible queue (30 of 69) skews to database/GAP units, not WEDM: `U-GAP-DB-GCODE-MCODE`, `U-GAP-DB-MACHINE-LIBRARY`, `U-GAP-DB-MASTER-ALARM`, `U-GAP-DB-TOOL-CATALOG-HARVEST`, `U-WIRE-BACKLOG-DATABASE`, `U-DB02/03/08/17/21`, `U-MACHINE-SCHEMA-REGISTRY`, `U-LASER01`, plus `U-L8-P0-MS2`. Deferred WEDM debt from the U-WTW-AUDIT: P0 LoRA-gap closure (`U-WTW00/00a/00b` — fix the 0-byte dataset builder), P1 wire-the-orphans (~150 wires, ~600KB AI-tier code), 5 controller-post engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) on disk but only the router wired.

**Trajectory direction:** Mike has shifted over the month from broad fleet-hygiene/infra (COMMAND-KERNEL-MS0, BRIDGE-WIRING, CLOSE-OUT reconciliation) toward its wedm soul — the last ~10 days are WEDM-focused (training-wizard audit → P2P accuracy harness). Next logical step is forcing real G-code emission against a held-out JM corpus to expose genuine accuracy gaps.

**Notable findings / blockers / cross-slot deps:** (1) **Blocker** — `WEDMLoRADatasetBuilderEngine.ts` is 0 bytes, so WEDM cannot run wedm_lora r=4 training (U-TRAIN-13 blocked); ~100 WEDM engines + 5 controller-post engines are orphan in edmDispatcher. (2) **Cross-slot dep** — U-WTW-AUDIT explicitly recommends handing the WEDM-TRAINING-WIZARD-MS0 build-out to **charlie** (canonical wire-EDM slot per JULIETT-12CHAT); mike's soul = misc-cleanup. (3) Regression caught/fixed this session: tech-tables registry had lost 2 of 5 ACU 7-pass families + `getJMDiePatternForMaterial` silently mislabeled compound materials (now in CLAUDE.md ## Recent regressions, 2026-06-02).

### OSCAR — speed-feed

**Active focus now:** OSCAR-SFC-3WAY-MS0 / OSCAR-SFC-9AXIS-MS0 — closing the PRISM-vs-HSMAdvisor-vs-G-Wizard vendor-fairness comparator and a closed-loop JM-Die-first SFC sweep; binding `claude-f7b0f940`, topic `oscar-sfc-9axis-ms0`, tree clean, 0 active claims.

**Shipped (last 30d):**
- `2d0a2d54ea` [OSCAR-SFC-3WAY-MS0]/U-GWIZARD-COMPARE — PRISM↔G-Wizard comparison leg (the missing 3rd leg of the PRISM/HSMAdvisor/G-Wizard 3-way) — 22h ago
- `aefecf1676` [OSCAR-SFC-9AXIS-MS0]/U-OSC9-10 — `SpeedFeedPDFCorpusBridgeEngine` (fleet PDF corpora → SFC tribal prior, 310 LOC, 33/33 tests, `prism_calc:sfc_pdf_corpus_bridge`)
- `32a707ec22` U-OSC9-09 — HSMAdvisor `settings_v2.xml` live-state adapter; `7c9643f7f0` U-OSC9-08 — ShopToolLibrary → MRR-ranked SFC bridge
- `be173cf2b5` U-OSC9-WIRE-FIX — closed silent wire-break (GWizardAdapter + WedmTrainingPairBridge were slot-only while dispatcher actions lived on main → 404)
- MILL-STUDIO-MS0 (`e555001055`→`87d0ce9793`): SPEC + ENVELOPE + mill-panel wiring into CalculatorPage mill-mode
- PSN-SYNERGY dormant-engine wave (`0fd90359de`/`565e01449d`/`541d09b5f7` + Outcome/Process/Multi/Cross/Inventor/Print bridge-wire iters) — stood up `prism_outcome`/`prism_process`/`prism_multi` dispatchers

**In-flight / unfinished:** SFC vendor-fairness closed-loop (`SFC-VENDOR-FAIRNESS-PLAN-2026-06-03.md`). Units #59-62 shipped (full JM-first sweep over live 41,209 G-Wizard rows, G-Wizard zero-SFM honesty, baseline matcher false-match fix, shop-tool-rank action). **#50 still pending.** Calibration loop is ORPHANED (`U-OSC9-CALIB-APPLY-WIRE` keystone, flag-gated, not wired).

**Fallback work available:** Slot-query queue is empty (0 eligible/0 total — no roadmap-index units claimed). Real fallback comes from the vendor-fairness plan, dependency-ordered: `U-OSC9-BASELINE-BORING` (28-tool hole), `U-OSC9-BASELINE-TURN-DRILL-ISO` (155-tool drilling majority), `U-OSC9-BASELINE-DIA-BUCKETS` — all require REAL cited cutting data (Sandvik/Kennametal/Machinery's Handbook; R9 NO fabrication). Parallelizable: `U-OSC9-TOOLING-TRACKER-ENGINE`. Plus `U-OSC9-CALIB-APPLY-WIRE` keystone.

**Trajectory direction:** Moving from "wire dormant SFC engines" toward proving SFC accuracy against external vendor calculators (HSMAdvisor + G-Wizard) on real JM-Die tooling, then populating a PRISM-owned reference cutting-dataset so the comparator is fair across all 3 vendors. Heading into the data-population grind (cited baselines) + a tooling tracker engine.

**Notable findings / blockers / cross-slot deps:** (1) AXIS-C G-Wizard fairness is structurally impossible by code — toolcrib S/F write-back is a circular cache; needs manual UI capture → PRISM-owned reference dataset. (2) `calcDispatcher.ts` has recurring CRLF-in-index issues (a peer LF-restore landed `61e9cfe6a4`). (3) Comparator tests OOM unless run `--pool=forks --fileParallelism=false`. (4) Cross-slot: React/frontend tracker UI is QUEBEC's lane (oscar emits the engine, quebec renders); bravo committed oscar's untracked `SpeedFeedChatterStabilityAdapterEngine.test.ts` (`d1a57b9fac`) — an attribution split where oscar's engine shipped but its test was left untracked on a fresh checkout.

### ROMEO — wiring

**Active focus now:** BLACKWELL-DB-GEN-MS0 — host-aware GPU profiling for catalog DB-generation; bound to slot/romeo (chatId claude-16c4c64a, heartbeat ~1m ago, topic romeo-work). No active slot-task claims, eligible queue empty. Latest commit `1495d61872` U-CGP-PLAN (8h ago).

**Shipped (last 30d):** A heavy run of DB/tooling-catalog and cross-domain wiring units, all `(slot:romeo)`:
- **BLACKWELL-DB-GEN-MS0** (newest): `1495d61872` U-CGP-PLAN (`estimateExtractionPlan()` quantifying concurrent vision-OCR throughput, R12-refuses-to-fabricate), `6e00a8cfb2`/`c8409a1621` U-CGP-PROFILE+P3 (host-aware catalog-extraction GPU profile; Blackwell unlocks concurrent OCR vs baked-in 16GB overnight-only, qwen3-vl label fix, 32/32 green).
- **DB-COVERAGE-GAPFILL-MS0** (~9 units, 13-21h ago): filled empty tool catalogs — Sandvik (`ca83643e40`, CoroDrill 460/860 + CoroMill Plura), Helical+Sumitomo (`96507b436a`), ISCAR/Kennametal/Korloy indexable (`6ae44e7efb`), Guhring/OSG + ERP front-end DB (`be3f4bae4d`); P/N/H material R3 files all 6 ISO groups (`155902c36e` U-MAT01); JM mill handbooks VMC-01/02/03 (`3f941f2885` U-MACH01).
- **CIMCO-TOOLDB-FILL-MS0** (`44484c85b7`/`cd589a4877`/`988a5bec53`): PRISM tools → CIMCO Edit 2026 .tmlib exporter + 4-DB fill-guide + `cimco_toollib_export`→prism_data round-trip wiring.
- **JM-FUSION-TOOLS-MS0** (~6 units, `ef1ada9310`..`4c54ecaca4`): per-material-group Fusion tool libraries from JM real crib, SFC cutting presets, tool-material compatibility gate (+P0 safety/metallurgy fix `1f25831b15`), JM machine DB → Fusion .machine XML, JM crib → hyperMILL .hmt SQL.
- **Earlier (9-10d):** FMERGE-MS0 close-out (`b4c6fa5613`, flip to ready_for_merge + Capacitor 6 mobile-wrap phase), FRONTEND-AUDIT-MS0 (`867d9a1347`), LEGO-STACKING-MS0 cross-domain cohort-bridge Stages 1/3/4/5 (`d479285dd0`,`ff0ece0ace`,`3a21b4f7e2`), PRISM-BRIDGE-MAP graph builder + auto-wire (`41b122e5aa`,`a7ef3ce23e`).

**In-flight / unfinished:** A precompact `/loop` (iter 6/20, "Generate Fusion-cloud tool holders + tool libraries for JM Die") was captured 2026-06-01 in HANDOFF-claude-859c0089 — that thread has since been superseded by the committed JM-FUSION-TOOLS-MS0 + DB-COVERAGE + BLACKWELL units, so it is effectively closed. The single newest romeo session transcript terminated on a `401 Invalid authentication credentials` (/login) error, not on substantive uncommitted work. No romeo-attributable uncommitted code in the shared tree (the `M` files there are fleet-wide CRLF/digest churn, not romeo's slot worktree).

**Fallback work available:** slot-query reports the eligible queue **empty (0/0)** and zero active claims — there is no pre-claimed next-unit. Romeo's recent momentum points to the obvious continuations: execute the BLACKWELL-DB-GEN-MS0 plan from `estimateExtractionPlan()` (run the concurrent vision-OCR catalog extraction it sized), and any remaining empty-catalog gaps surfaced by DB-COVERAGE-GAPFILL-MS0. No explicitly-deferred U-IDs were logged in the queue.

**Trajectory direction:** Romeo (wiring galaxy) has pivoted hard into **DB/tooling-catalog population + CAM-vendor export wiring** — filling empty tool/material catalogs and wiring PRISM's tool data out to real shop tools (CIMCO Edit 2026, Fusion .machine, hyperMILL .hmt) for JM Die, then leveraging the Blackwell GPU host to make catalog OCR-generation concurrent rather than overnight-batched. Heading toward live catalog DB generation at scale.

**Notable findings / blockers / cross-slot deps:** (1) Physics-scrutiny caught a **P0 safety + P1 metallurgy bug** in the Fusion per-material preset gate, fixed in `1f25831b15`. (2) Cross-slot dependency on **juliett** (database-expansion): juliett shipped the canonical CAM-agnostic ISO-513 tool/holder material axis (`28042d6592` "help romeo") and holder taper/contact categorization (`f544da914f`,`c90fa4e524`) that romeo's per-material-group exports build on. (3) BLACKWELL profile work assumes this PC's GPU tier — host-keyed, so throughput claims are R12-gated against fabrication. (4) Newest session blocked on an API auth (`401`) error, not a code blocker.

### SIERRA — system-viz

**Active focus now:** Bound to `slot/sierra` (chatId claude-9a962981, heartbeat live); finishing **CROSS-SUBSTRATE-SYNERGY-MS0** — typed ADD-only cross-substrate edge spine connecting the system-viz graph to the Hermes slot fleet. No active task-claims; latest commit `d254c65305` U-XSUB-DOCUMENTED-BY (41m ago).

**Shipped (last 30d):**
- **CROSS-SUBSTRATE-SYNERGY-MS0** (newest, ~5 commits): `8a6f574b98` U-XSUB-EDGE-SCHEMA+CLOSURE (typed edge schema 18/18 + 48 owned-by-slot edge generator + ADD-only merge splice; brainstorm-workflow rejected the unbounded framing per R12), `956fbabdb3` U-XSUB-GALAXY-ROOST (lifted owned-by-slot coverage 7 → all 34 galaxies via galaxy-roost nodes, 82 edges + 34 nodes), `a48ac72709` FAST[]-register, `f9bc30b6c9` HTML companion, `d254c65305` documented-by edge type.
- **SYSTEM-VIZ nav-inject feature** (~6 commits): `33753f4c67`/`754626f63f`/`ffcfdb2b5d` U-SV-NAV-INJECT-GREP-WRITE (exact-path node→path nav inject in pre-grep/pre-write via shared graph-exact-match helper + creditNavOnEmit gate), `2acbb20dac` U-SV-NODE-PATH-TEMPLATE + `/nav` skill.
- **VIZ-NODE-SUBSTRATE find-cache hardening**: `c074220997` U-SV-FINDCACHE-OFFLINE-REGEN (killed the cold-parse-on-first-find that silently broke fleet-wide node-context inject), `b9e67edb68` cache-status subcommand, `a19b686afb` idempotent regen, `cc75cbdbed`/`1b1325b38c`/`fb117e7649` noteCount brain-coverage surface on master-index/find hits.
- **SIERRA-LEVERAGE batch**: `1e11fa0642` U-N1-RANKED-HYBRID (ranked-hybrid-graph-search engine + prism_session wiring), `f87b3810ce` U-VIZ-MERGE-HEAP-HEADROOM (regen heap 16→24GB, fixes intermittent merge exit-134 OOM), `9560b33374` U-VIZ-DEAD-PIXEL-WIRE (surfaced 15.7K-dead-edge finding), `9765b93b51` U-PSGB-SIERRA (completed + owns the system-viz galaxy).
- **Earlier in window**: MASTER-MACHINIST-ORCHESTRATOR-MS0 stage adapters (`a6a0535e93`, `1539db607f`, `495eca0170` CAD-fanout streaming), CAG router + PSN-ENHANCE-MS0 hybrid_search MCP wiring (`d38959daca`/`c9e3992e84`).

**In-flight / unfinished:** Most recent session (claude-cd8e1622, 12h ago) was a **cross-lane rescue** — committed romeo's DB-COVERAGE-GAPFILL-MS0/U-MACH01 (JM mill handbooks VMC-01/02/03, `3f941f2885`), not sierra-lane work. The prior sierra session (claude-9bc46b46) reports in-lane work COMPLETE, nothing uncommitted. Two SYSTEM-VIZ-BRAIN-MS0 done-untracked units (quality-gate, slot-overlay) flagged for envelope correction to in_progress (not yet done).

**Fallback work available:** slot-query shows **eligible queue empty (0/0)** for sierra. Handoff directs a fresh session to pick via `node .claude/helpers/priority-queue.mjs --pick --slot sierra`. Deferred/cross-lane (NOT sierra's to pick): U-P3-FORGE-OLLAMA-CODEGEN routed to ALPHA, U-P1-QDRANT-EPISODIC-RECALL routed to JULIETT/INDIA. Earlier deferred: 7 of 9 U-VIZ-FAST-REGISTER-9 roosts were blocked-on-merge-OOM (now partly unblocked by the 24GB heap bump).

**Trajectory direction:** Sierra is the system-viz galaxy owner, steadily converting the 548MB live graph into a fleet-wide *search/navigation substrate* — find-cache reliability → nav-inject (node→path redirect on grep/write) → brain-coverage noteCount surfacing → and now typed cross-substrate edges (owned-by-slot, documented-by) wiring the graph to the Hermes fleet/Obsidian/Wiki. Direction: bounded, schema-typed graph enrichment + token-saving navigation surfaces.

**Notable findings / blockers / cross-slot deps:** (1) **Merge-OOM** was a recurring blocker — exit-134 at 16GB heap during regen merge, fixed by bump to 24GB (`f87b3810ce`); N2 orphan-hub pairing was explicitly merge-OOM-blocked. (2) **15.7K dead edges** found in the graph (`9560b33374`). (3) **Cold-parse find-cache bug** silently broke fleet-wide node-context inject (`c074220997`). (4) Cross-slot deps: 2 SYSTEM-VIZ-BRAIN-MS0 gaps routed off-lane to ALPHA (forge/Ollama codegen seam) and JULIETT/INDIA (Qdrant flakiness). (5) Sierra is actively absorbing cross-lane orphan commits (romeo's DB-COVERAGE work) when its own queue is empty.

### WHISKEY — lathe

**Active focus now:** WHISKEY-LATHE-ACCURACY-MS0 — proving print-to-program-to-post roundtrip accuracy on real JM Die Okuma .MIN programs (binding `whiskey-work`, branch `slot/whiskey`, chatId claude-8662b848; 0 active claims, queue empty).

**Shipped (last 30d):**
- **WHISKEY-LATHE-ACCURACY-MS0** (last 22h, 4 units): `U-PARAM-ACCURACY-HARNESS` (95a38bffe0) → `U-PARAM-DATA-OPT+VERDICT` (bcd8cdd280) → `U-LATHE-ADAPTER-BIND` (ed9b295fbf, binds `makeLatheAdapter` wrapping TurningPrintToProgramEngine into the 6-stage harness, 26/26 tests) → `U-ROUNDTRIP-ACCURACY-RUNG-B` (3e9b3e8667, honest 24-sample baseline: op-coverage 100%, SFM 8.5%, IPR 6.3%, mean 41.6% — a lower bound).
- **JM-DIE-LATHE-UPGRADE-MS0** (~9-10d ago, the large body — ~45 iters): wired the entire AI-tier lathe engine surface onto `prism_turning` (up to 39 actions) — Bayesian opt, active learning, CAM intelligence, RL select-action, DL-intel-analyze, LoRA training/tribal, unified-AI orchestrator. Reached "zero unwired lathe engines fleet-wide" saturation.
- **Full-corpus AI training proof** (`U-AI-TRAIN-FULL-CORPUS` aa82b01858): 16,558/16,558 JM Die lathe programs trained, avg_score 58.63; convergence validated across 200/2K/5K/10K/16.5K runs (σ <1.5) — closed operator /goal #2.
- **3-stage lathe audit pipeline** (`U-AUDIT-PIPELINE` 6bf21c062d + `U-AUDIT-FULL-CORPUS-DASHBOARD`): LatheProgramAuditPipelineEngine over 114,646 variants; surfaced 99.88% FAIL — exposed that V2 upgrader does NOT body-rescale toolpaths per machine envelope (operator-actionable shop-floor pull). Fixed via `U-UPGRADE-BODY-RESCALE` (envelope-fit gate) + Okuma false-positive fixes (`U-GCANALYZER-MODAL-F-TRACK`, `U-GCANALYZER-OKUMA-START-BLOCK`, `U-OKUMA-LATHE-G50-CHECK`).
- **WHISKEY-LATHE-CLOSED-LOOP-MS0** `U-CL1-OPERATOR-OVERRIDE-CAPTURE` (a7a4e1b4ef): operator SFM-override capture on prism_ai, ready-for-training at 30-experience threshold.
- **WHISKEY-PDF-WIKI-TRIBAL-MS0** (`U-WPWT-WAVE3`, `U-WPWT-EXTRACT-FALLBACK`): vendor milling PDF extracts (20 PDFs / ~1.5K pages) + pdf-parse fallback extractor.

**In-flight / unfinished:** Roundtrip accuracy gap-closing (iter-3, from newest handoff claude-52bebb83). Two next steps NOT yet committed: (1) material inference from .MIN comments/customer/family (non-speed-circular) feeding `deriveInput()` in `lathe-print-to-program-roundtrip-accuracy.ts`; (2) JM shop-profile SFM/feed calibration override in TurningPrintToProgramEngine (Ra-driven finish feed) calibrated to the Rung-A cloud (finish .0025IPR/200SFM, rough .007IPR/250SFM). Both safety-relevant → require per-file 2-reviewer gate.

**Fallback work available:** Slot-query queue is empty (0 eligible / 0 total — no claimed units pending). Whiskey is running off self-defined MS0 milestones rather than the roadmap queue. The standing fallback is the iter-3 accuracy-gap work above, plus the `U-UPGRADE-MILL/WEDM/WELDER` audit-pipeline template generalization flagged in `U-AUDIT-FINDINGS-BRIEF` (d99d41cddc).

**Trajectory direction:** Moved from breadth (wiring every lathe AI engine + corpus training) to depth/rigor: now proving real print-to-program accuracy against JM Okuma ground truth with R12-honest lower bounds. Next is closing the SFM/IPR in-band gap by injecting real material inference + JM-shop calibration so the textbook P-speeds (currently 2-4x JM's conservative practice) align with measured shop behavior.

**Notable findings / blockers / cross-slot deps:** Key honest finding — PRISM textbook ISO-P speeds run ~2-4x faster than JM's real conservative shop practice (the root of the 41.6% mean accuracy floor). Gotcha: `catalogLoader.ts` CJS `__dirname` breaks tsx engine-import (worked around with a shim in the harness). Cross-slot: complements **mike** (per-machine lathe capability inventory, MIKE-LATHE-CAPABILITY-MS0) — whiskey owns upgrade/audit/accuracy, mike owns per-machine specs; the `U-PROGRAM-LIBRARY-FRONTEND-SPEC` carries a forward-compat hook for mike's machine merge. Frontend hand-off spec (5 nodes: lathe-wizard/lathe-studio/shop-mgmt/biz-mgmt/employee-portal) is queued for consuming slots. Performance note: full-corpus recursive scan can OOM (130K files) — `PRISM_OUTCOME_CAPTURE_DISABLE=1` knob added to clear a 52x batch-throughput bottleneck.

### XRAY — blueprint-vision

**Active focus now:** Bound to `slot/xray` (topic `xray-work`); most recent session pivoted onto BLACKWELL-DB-GEN-MS0 (catalog-DB-gen, a romeo-owned milestone — `U-CGP-PLAN` estimateExtractionPlan); no active slot-task claims. Prior xray-owned thread = cross-source dimension reconciliation (committed `a57ef19c2d`).

**Shipped (last 30d):** Heavy PER-SLOT-GALAXY-BUILDOUT run for blueprint-vision —
- `a57ef19c2d` U-XRAY-CROSS-SOURCE-DIM: `CrossSourceDimensionReconciliationEngine` fusing print-OCR + CAD-geometry + CNC-toolpath dim candidates (noisy-OR, confidence-weighted, type-aware tolerance, R12 conflict-flag-never-average), wired `prism_cad cad_dimension_reconcile`, 22 tests.
- OCR closed-loop pipeline: `U-PSGB-XRAY-CLOSED-LOOP-SCORER`/`-RUNNER` (Kuhn's optimal dimension-set matching), `-SCORER-TYPEAWARE`, `-PAGE-CLASSIFIER`(+PDF gate), `-SYNTH-DIM-TYPES`, `-TRAINSET-CURATE`.
- Overnight OCR batch vehicle: `U-PSGB-XRAY-BATCH`(+FIX), `-CONCURRENT-OCR` (qwen3-vl:8b GPU-resident), `-OVERNIGHT-VEHICLE` (reaper-immune), `-REVIEW` morning digest, `-RENDER-TIMEOUT`, `-OCR-GATEWAY`, `-MULTIPAGE`, `-RICH-SCHEMA`, `-SCAN-PREPROCESS`.
- `7385b735fe` U-PSGB-XRAY-CAD-MATCH-LIFT: fixed 4-digit-PN blindspot, 272→498 matched PNs (+83%).
- `754e1a8801` supervised training spine `build-blueprint-cad-program-pairs.mjs` (4,207 train-eligible of 76,205 prints); `46ce1bcc0d` training-readiness manifest (12,321 blueprints need GPU-OCR); `47258dbf09`/`185c4582f4`/`519d23f1f7` full galaxy soul + CLAUDE/MEMORY/PATHS/wiki (corrected 21 phantom seed engine names, fixed 96%-conflation claim).
- Earlier (≈9d): WIRE-UNWIRED-MS0 batches — `034d4cc6ba` BATCH-10, `0331bbe9ab` BATCH-9 (100 UNKNOWN engines), `45e5ceaa7e` BATCH-8 (~70 engines), CAM/EDM batches.

**In-flight / unfinished:** Newest handoff (8h ago, `claude-beab93ce`) shows a context switch into BLACKWELL-DB-GEN-MS0 with "Units completed: 0" — no xray commit landed from that session, so that thread is in-flight/un-shipped. The dim-reconcile NEXT step (REAL candidate sourcing) is started-but-unbuilt.

**Fallback work available:** slot-query queue is **empty (0 eligible/0 total)** — no pre-claimed units. The explicit deferred next-unit from the 32h handoff: source REAL dim candidates for `cad_dimension_reconcile` via 3 thin adapters — (a) print-OCR store (never re-OCR; search jm-die-database + Docustrata + Qdrant), (b) CAD STEP geometry measure (INCH→mm, CONVERSION_BASED_UNIT 25.4), (c) CNC G-code coord-span — plus a survey workflow over JM parts having all 3 sources. Blackwell roadmap also names `L8-P0-MS2`, `L8-P1-MS2`, `L8-P2-MS2` as next.

**Trajectory direction:** Steady march from galaxy scaffolding → working OCR closed-loop + overnight batch OCR → supervised print-to-CAD/program training data → multi-source dimension fusion. Heading toward feeding REAL (not synthetic) dim candidates into the reconciliation engine and closing the print→CAD→program training triple; the latest session diverged into Blackwell catalog-DB generation.

**Notable findings / blockers / cross-slot deps:** Corpus 100% blocked on operator GPU-OCR + Ollama-vision (resolved in-session via qwen3-vl:8b concurrent model). CAD-match is lossy (PN-in-stem join). 7 pre-existing tsc errors in `cadDispatcher.ts` (lines 3262/4086-4091/4708) — not xray-introduced, left untouched. Cross-slot deps: **india** fine-tunes the vision model / owns AI-training substrate; **delta** consumes the round-trip CAD eval; reuses **juliett**'s DB (R8); latest pivot rides **romeo**'s Blackwell milestone. Dispatcher `slimResponse()` gotcha: empty arrays stripped (report returns absent, not `[]`).

## Fallback-work backlog (mapped to roadmaps)

Operator directive: the saved roadmaps/plans are fallback work — strategize where everything fits. For each slot below: its unfinished + eligible-queue work, mapped to the canonical roadmap/milestone it belongs to. **Items flagged `[ORPHAN]` are not in any roadmap envelope** (work in a card or self-defined MS with no roadmap-index/UNIFIED-ROADMAP home — needing a home). Ordered by leverage (cross-domain unblockers first, per the FLEET-DOMAIN-GOALS Tier-0/1/2 ranking).

**Note on `muS-*` and `U-WIRE-BACKLOG-*` / `U-BRIDGE-WIRE-*`:** every slot's eligible queue contains these. They map to **ROADMAP-CONSOLIDATED.md §Bridge layer (26 wiring units / 836 built-but-unwired engines + 16 deep-integration units)** and the `muS-*` micro-Swiss/domain decomposition block. These are romeo's canonical mission (wiring galaxy) — when a non-wiring slot's queue surfaces them, prefer routing to romeo rather than forking the wire.

### Tier 0 — substrate unblockers (highest leverage; gate other domains)

| Slot | Fallback item | Roadmap home | Leverage |
|------|---------------|--------------|----------|
| sierra | Streaming/chunked merge to kill exit-134 OOM (`pendingCount=0` guarantee) + splice the 7 OOM-blocked FAST[] roosts | **FLEET-DOMAIN-GOALS Tier-0 #1**; SYSTEM-VIZ-BRAIN-MS0 (BUILD_STATE in_progress_real) | Blocks india's eval holdout + every slot's search substrate |
| india | Seed ≥2 reference ghosts (poolSize 0→holdout) + apply `graph_heterophily_aggregate` (H2GCN) + fresh `runAssessment` → clear deploy gate (`U-NN-REFPOOL-REEVAL`) | **FLEET-DOMAIN-GOALS Tier-0 #3**; NN-GRAPH MS2 (CLAUDE.md §NN-GRAPH); `U-GAP-POST-*` queue adjacent | Gates the "proven training" half of mill/lathe/wedm/cam/quoting/sfc/cad/xray (8 galaxies) |
| golf | Guarded MCP :3100-only auto-restart actuator + fleet-health dashboard (`U-FD02..05`, `U-FH02`) | **FLEET-DOMAIN-GOALS Tier-0 #2**; FLEET-DASHBOARD-PHASE-B / FLEET-HEALTH-PHASE-C (roadmap-index) | A wedged daemon drops all `prism_*` reachability for 33 galaxies at once |

### Tier 1 — wiring + reachability (the dormant-capacity gaps the SVI breakdown ranks highest)

| Slot | Fallback item | Roadmap home | Leverage |
|------|---------------|--------------|----------|
| romeo | Wire the 110 unwired engines in ≤5/commit batches + purge ghost Zod actions | **FLEET-DOMAIN-GOALS Tier-1 #4**; ROADMAP-CONSOLIDATED §Bridge wiring (26 units); `U-BRIDGE-WIRE-*` | Single largest reachable-units lever fleet-wide (Engines 88%→100%) |
| romeo | Execute BLACKWELL-DB-GEN-MS0 extraction plan (concurrent vision-OCR catalog gen) | **[ORPHAN]** BLACKWELL-DB-GEN-MS0 (self-defined, no envelope); adjacent to REVENUE-ROADMAP RES-MS14 (287 tooldb import) | Real cited tool/material catalogs → SFC/quoting/CAM all consume |
| echo | Convert ~14 stub-wired post engines from `method?.()` dark fallbacks to real executing calls | **FLEET-DOMAIN-GOALS Tier-1 #5**; MS-WIRE-BACKEND (0/60); POST-GEN-COVERAGE-AUDIT | Blocks mill/lathe/wedm end-to-end (every toolpath terminates in echo) |
| hotel | Wire orphan `HotelERPTribalKnowledgeEngine` (17 stranded cats) + extract 6 inline financial/HR constants families | **FLEET-DOMAIN-GOALS Tier-1 #6**; `U-WIRE-BACKLOG-ERP`; `U-GAP-ERP-*` cluster | Unblocks charlie's outbound-revenue calibration ground truth |
| foxtrot | Wire mill BRIDGE cluster (`U-BRIDGE-WIRE-MACHINE/SHOP/SENSOR`, `U-BRIDGE-SHOPFLOOR-LEARN`, `U-BRIDGE-OPERATOR-GATES`) | ROADMAP-CONSOLIDATED §Deep-integration (`U-BRIDGE-SHOPFLOOR-LEARN`, `U-BRIDGE-OPERATOR-GATES` listed) | Shop-floor telemetry → learning loop; operator gates on autonomous output |

### Tier 2 — pipeline reachability (close the lowest-scoring pipelines)

| Slot | Fallback item | Roadmap home | Leverage |
|------|---------------|--------------|----------|
| mike | Close LoRA gap (`U-WTW00/00a/00b` — fix 0-byte `WEDMLoRADatasetBuilderEngine`) + wire wire/electrode + dielectric registries into EDM 8-stage pipeline | **FLEET-DOMAIN-GOALS Tier-2 #7**; WEDM-TRAINING-WIZARD-MS0 **[ORPHAN — self-defined]**; MS-WIRE-BACKEND | EDM pipeline 0.38 (worst in fleet)→0.72; also caps kilo EDM + echo wire-post |
| mike | WEDM-P2P-ACCURACY TASK #3 (real G-code emit vs held-out JM corpus, expose `patterns.ts` R7 gap) | **[ORPHAN]** WEDM-P2P-ACCURACY (self-defined MS, no envelope) | Turns regression-lock into measured accuracy (R12 honesty) |
| charlie | Feed 3 unconsumed data sources (cost-index/tool-purchases/docustrata) to training + connect QuoteToShip `strategies` registry | **FLEET-DOMAIN-GOALS Tier-2 #8**; QUOTING-SYNERGY-MS0; ROADMAP-CONSOLIDATED REVENUE-ROADMAP RES-MS11 (cutting conditions) | QuoteToShip 0.51→1.0; charlie's gap blocks india's quoting calibration |
| whiskey | iter-3 accuracy gap-close (material inference + JM-shop SFM/feed calibration) + connect Turning 4th (strategies) registry | **FLEET-DOMAIN-GOALS Tier-2 #9**; LATHE-MASTER (envelope drift — close-out needed); WHISKEY-LATHE-ACCURACY-MS0 **[ORPHAN — self-defined]** | Turning 0.74→0.92 (match MillTurn); fixes envelope drift |
| foxtrot | iter2 P2P-replication real corpus loader (`HMCProjectParser` over JM .hmc/.nc) + 4-axis fixture + `replicate_similarity_search` E2E | **FLEET-DOMAIN-GOALS Tier-2 #10**; PRINT-TO-PROGRAM-REPLICATION-MS0 **[ORPHAN — self-defined]** | Closes mill PrintToProgram 0.90 → end-to-end reachable |
| kilo | Wire EDM/Grinding/Laser strategy stages into `cam_strategy_recommend` (machine-domain keyed); CAMX block `U-CAMX07..24` | **FLEET-DOMAIN-GOALS Tier-2 #11**; CAMX-MS* (MILESTONE_PROGRESS in_progress_real, drift cases) | Lifts weak CAM-adjacent pipelines (EDM 0.38/Laser 0.37/Grinding 0.52) |
| kilo | Close CAM /loop iter 1/20 (learn LATHE_OP_ORDER) | **[ORPHAN]** CAM-LOOP (self-defined /loop, no envelope) | Resumes an open self-improving loop |

### Tier 3 — saleable product surfaces + in-flight closure (turn reachable into revenue)

| Slot | Fallback item | Roadmap home | Leverage |
|------|---------------|--------------|----------|
| kilo + oscar | MS-CAM-MASTERY in-seat add-in buttons (Fusion D1/D2/D3 + Mastercam); oscar's "Speed&Feed via PRISM" rides pillar D | **FLEET-DOMAIN-GOALS Tier-3 #12**; MS-CAM-MASTERY (MILESTONE_PROGRESS 3/34, revenue track) | Revenue-Day-1 deliverable, unbuilt |
| oscar | Build `MS-SFC-CALIBRATE` (24u Stacked-Bayesian ensemble) + vendor-fairness baselines (`U-OSC9-BASELINE-*`, cited data) + wire orphaned `U-OSC9-CALIB-APPLY-WIRE` | **FLEET-DOMAIN-GOALS Tier-3 #13**; MS-SFC-CALIBRATE (never_started, revenue); REVENUE-ROADMAP RES-MS1 (formula extraction) | The saleable SFC moat (physics-default → shop-calibrated) |
| echo | Clear U-LEGAL-13 → ship MS-MASTERPOST (0/44) with byte-equivalence; CIMCO SPINE-2 live-sim arm | **FLEET-DOMAIN-GOALS Tier-3 #14**; MS-MASTERPOST (never_started 0/44, gated U-LEGAL-13); CIMCO-INTEGRATION-MS0 **[ORPHAN — self-defined]** | Saleable MasterPost product (legally gated) |
| delta | Convert CADCAM-AGI-MS0 (never_started) + drive JM corpus 33%→high + merge 2 CAD UIs; finish CAD-TRAINING-PIPELINE /loop + Fusion `/new` fix | **FLEET-DOMAIN-GOALS Tier-3 #15**; CADCAM-AGI-MS0 (24u never_started) + CADCAM-DAGI-MS1/2/3/5 (~64u); FMERGE | Geometry brain gets a product-visible front door |
| alpha | Lift offload 11%→30% (fix dead `ollama-route-pretooluse` 0-offload hook) + convert advisory route-nudges to binding; close `U-CK11` (COMMAND-KERNEL-MS0) | **FLEET-DOMAIN-GOALS Tier-3 #16**; COMMAND-KERNEL-MS0 (28/29, U-CK11 open); BLACKWELL-TOKEN-SYNERGY-MS0 **[ORPHAN — self-defined]** | Force-multiplier: lowers cost of all 33 galaxies |
| alpha | Continue BLACKWELL tier work (`U-BW-*`); golf's `U-BW-CATALOG-REALIGN` (promote qwen3 floor→true tiers) | **[ORPHAN]** BLACKWELL-TOKEN-SYNERGY-MS0 / LOCAL-LLM-FOUNDATION (self-defined) | Unlocks free 32B local offload fleet-wide |
| india + lima + xray + romeo + golf | Per-galaxy SVI instrumentation (academy Courses subsystem, wiring score, blueprint-vision psi, ai-training psi, fleet-hygiene attribution) | **FLEET-DOMAIN-GOALS Tier-3 #17** **[ORPHAN — cross-cutting, no envelope]** | Makes every galaxy's progress-to-1.0 measurable not inferred |

### Domain-build close-out + frontend (lower leverage, still queued)

| Slot | Fallback item | Roadmap home |
|------|---------------|--------------|
| bravo | U-OPUS-EXECUTE-WIRE (live Anthropic client behind OpusCapabilityEngine.execute) | HERMES-MASTER-ORCHESTRATOR-MS0 **[ORPHAN — self-defined]** |
| hotel | Close JM-DOC-POPULATION gate to 100% (7 financial tuples) + q2s frontend verbs (`rfq_*`, `kaizen_*`, `oee_*`, `credit_review_all`) | JM-DOC-POPULATION-MS0 **[ORPHAN]**; HOTEL-ERP-FRONTEND-WIRING-SPEC; `U-BIZ01..07` |
| lima | Academy MS0 tail: `U-ACADEMY-TAG-METADATA`, ProgressTracker/Assessment active-path, phone E2E; then `U-GAP-ACADEMY-MIT-OCW-INGEST` | PRISM-ACADEMY-MOBILE/FEATURES-MS0 **[ORPHAN]**; `U-GAP-ACADEMY-*` queue |
| xray | Source REAL dim candidates for `cad_dimension_reconcile` (3 thin adapters: OCR-store / STEP-measure / G-code coord-span) | **[ORPHAN]** PER-SLOT-GALAXY-BUILDOUT xray dim-reconcile (no envelope) |
| oscar | `U-OSC9-TOOLING-TRACKER-ENGINE` (engine; quebec renders UI) | **[ORPHAN]** OSCAR-SFC-9AXIS-MS0 (self-defined) |
| charlie | `U-GAP-WIRE-JMDIE-CORPUS`; `muS-C*/W*/D*` domain block | `U-GAP-*` / `muS-*` (roadmap-index queue) |
| delta | `U-PPL-D1/D4`, `U-GC-01/02/15`, `U-DOCU-04/05`, `U-ALL01-12` | roadmap-index CAD-prior queue |
| bravo | Eligible lathe queue (`U-GAP-LATHE-*`, `muS-L01..L22`) — **domain mismatch; route to whiskey/mike, not bravo** | roadmap-index (mis-routed to bravo's queue) |

**Orphan-work summary:** The bulk of each slot's *active* trajectory runs on **self-defined `*-MS0` milestones with no roadmap-index/UNIFIED-ROADMAP envelope** — BLACKWELL-TOKEN-SYNERGY, BLACKWELL-DB-GEN, BLACKWELL-AI, CIMCO-INTEGRATION, WEDM-P2P-ACCURACY, WHISKEY-LATHE-ACCURACY, PRINT-TO-PROGRAM-REPLICATION, JM-DOC-POPULATION, CROSS-SUBSTRATE-SYNERGY, PRISM-ACADEMY-MOBILE, HERMES-MASTER-ORCHESTRATOR, CAM-LOOP. These are real, high-value, scrutiny-gated work but live OUTSIDE the canonical roadmap — a roadmap-index reconciliation pass (or promotion into UNIFIED-ROADMAP lanes) would close the visibility gap. By contrast, the **eligible-queue fallback** (`muS-*`, `U-WIRE-BACKLOG-*`, `U-BRIDGE-*`, `U-GAP-*`, CAMX-*) is well-anchored in ROADMAP-CONSOLIDATED + roadmap-index but is largely *unclaimed/dormant* — the inverse problem.

## Trajectory vs goals alignment

Cross-referencing each domain's actual 30-day trajectory against its FLEET-DOMAIN-GOALS north-star.

| Domain | North-star | 30d trajectory verdict | Note |
|--------|-----------|------------------------|------|
| alpha (token-opt) | offload 11%→30%, binding routes | **MOVING TOWARD** | Blackwell route-profile directly targets offload-rate gap; but realized take-rate still 0.8% (binding-route gap untouched) |
| bravo (hermes-zulu) | live slot-less conductor | **STALLED (by design)** | Built the whole orchestrator substrate but readiness = NO-GO; 0 slots zuluOptIn — "wired but dark" is the central gap and trajectory hasn't crossed it |
| charlie (quoting) | one-shot margin-correct quote, loop closes | **MOVING TOWARD** | Reference-reliability + calibration arc is exactly the QuoteToShip-0.51 path; blocked on hotel ERP actuals (cross-domain), 3/5 sources still unconsumed |
| delta (cad) | geometry brain, live Fusion | **MOVING TOWARD (process-drift risk)** | Strong CAD-FUSION-LIVE + DRAW-MAX work directly on goal; BUT recurring post-/compact topic-drift to Hermes pin loses days — process hazard, not direction |
| echo (post-processor) | canonical emitter, byte-equiv MasterPost | **MOVING TOWARD** | CIMCO verification spine + fail-OPEN fixes are the byte-equivalence foundation; MS-MASTERPOST itself still legally-gated (U-LEGAL-13) and untouched |
| foxtrot (mill) | print→proven-program for 5-VMC | **MOVING TOWARD** | P2P-replication + tribal-outcome loop are on-goal; mill already healthiest (0.90-0.92); corpus loader is the honest next step |
| golf (fleet-hygiene) | zero-babysit self-healing fleet | **MOVING TOWARD** | MCP-concurrency fix + Blackwell presets + tsc-clean defend the substrate; self-improving reaper threshold-tuner (the "perfect" lever) still unbuilt |
| hotel (business) | zero-touch quote→ship→cash | **MOVING TOWARD** | JM-DOC real-corpus population is on-goal; but orphan `HotelERPTribalKnowledgeEngine` + 6 inline-constants families (the Tier-1 unblockers) untouched; financial-discipline soul held well |
| india (ai-training) | deploy gate clears (AUROC≥0.78) | **DIVERGENT / STALLED** | Spent the window proving GNN tier-5 is a DEAD END for text-feature wiring (honest negative result) + pivoting to Blackwell infra — NOT closing the deploy gate (poolSize 0 + heterophily). The fleet's #1 Tier-0 dependency is the one domain moving away from it |
| kilo (cam) | in-seat add-in button, universal CAM brain | **DIVERGENT (attribution drift)** | Own CAM-LOOP work is on-goal, but the freshest session shadows alpha's BLACKWELL milestone with no kilo unit; MS-CAM-MASTERY add-in (the revenue goal) untouched; weak EDM/Laser pipelines unwired |
| lima (academy) | self-compounding course factory | **MOVING TOWARD (partial)** | Citation-discipline + UX frontend on-goal; BUT MIT-OCW corpus still never harvested at scale + course→certification→scheduler loop not closed (the load-bearing gap) |
| mike (wedm) | deepest closed-loop EDM, 0.38→1.0 | **STALLED at the keystone** | WEDM-P2P-accuracy is on-goal direction, but the EDM-0.38 root cause (no wire registry) + 0-byte LoRA builder are both untouched; mike's soul is "misc-cleanup" and the deep build was recommended to charlie |
| oscar (speed-feed) | calibrated vendor-beating saleable SFC | **MOVING TOWARD** | Vendor-fairness 3-way comparator is the accuracy-proof foundation; MS-SFC-CALIBRATE (the saleable moat) still never_started; CALIB-APPLY-WIRE orphaned |
| romeo (wiring) | 97%→sustained 100% coverage | **DIVERGENT** | Pivoted hard into DB/catalog population + Blackwell — valuable, but the 110-unwired-engines core mission (its rank-2-fleet-wide leverage) has zero shipped wiring sessions ("No sessions yet" in MEMORY). The wiring galaxy isn't wiring |
| sierra (system-viz) | always-fresh trustworthy graph, OOM→0 | **MOVING TOWARD** | Heap-headroom + find-cache + cross-substrate edges directly on-goal; the exit-134 OOM (Tier-0 #1, gates india) is mitigated (24GB) but not structurally killed (streaming merge) |
| whiskey (lathe) | crash-safe Okuma program, 0.74→1.0 | **MOVING TOWARD** | Accuracy-harness + honest 41.6% lower bound is exactly the rigor the goal wants; Turning-registry + envelope-drift fixes are the named next steps |
| xray (blueprint-vision) | universal front-door, 100% coverage | **MOVING TOWARD (process-drift risk)** | Cross-source dim reconcile + OCR closed-loop on-goal; BUT latest session diverged to romeo's Blackwell DB-gen with 0 xray units — same shadow-drift pattern as kilo |

**Flagged DIVERGENT/STALLED (operator attention):**
1. **india — DIVERGENT/STALLED on the fleet's #1 dependency.** india is the Tier-0 substrate that gates 8 galaxies' "proven" status, yet its 30-day arc moved *away* from clearing the deploy gate (poolSize-0 reseed + heterophily aggregator) into a definitive-negative-result + Blackwell-infra pivot. `U-NN-REFPOOL-REEVAL` is the single highest-leverage unstuck move in the fleet and it sits open.
2. **romeo — DIVERGENT from its core mission.** The wiring galaxy did valuable DB/catalog work but shipped zero wiring sessions; the 110 unwired engines (largest reachable-units lever per SVI_TARGET_BREAKDOWN) are untouched. Either re-point romeo at wiring or formally reassign the wiring mission.
3. **mike — STALLED at the EDM keystone.** EDM is the worst pipeline (0.38) and the two root causes (missing wire registry, 0-byte LoRA builder) are both unaddressed; mike's own audit recommended handing the deep WEDM build to charlie. Ownership needs an operator decision.
4. **bravo — STALLED by design (NO-GO).** Fully-built orchestrator that's "wired but dark" (0 zuluOptIn). Crossing to live requires the operator-gated zuluOptIn + U-OPUS-EXECUTE-WIRE decision — a governance call, not a build gap.
5. **kilo + xray — DIVERGENT via attribution-drift.** Both had on-goal own-domain threads but their freshest sessions shadow other slots' BLACKWELL milestones with 0 own-domain units committed — the Blackwell-pivot coordination hazard manifesting as lost domain progress.

## Recommended next-pickups per slot

One concrete, synergy-aware next unit per chat, drawn from the fallback backlog. Preference (per the synergy-first principle): items that lift >1 domain's SVI rank above items that lift only the slot's own.

| Slot | Recommended next unit | Why (synergy / leverage) |
|------|----------------------|--------------------------|
| **india** | `U-NN-REFPOOL-REEVAL` — seed ≥2 reference ghosts + H2GCN aggregator + fresh runAssessment → clear deploy gate | **Tier-0; unblocks 8 galaxies' "proven training" half.** The single highest-leverage move in the fleet. Reverses the divergent trajectory |
| **sierra** | Streaming/chunked merge to structurally kill exit-134 OOM | **Tier-0; gates india's eval holdout** (stale graph = no real holdout) + every slot's search. Direct dependency of india's pickup above |
| **golf** | Guarded MCP :3100-only auto-restart actuator (`U-FD/FH` dashboard pair) | **Tier-0; a wedged daemon kills `prism_*` reachability for 33 galaxies.** Protects the substrate india/sierra/everyone depends on |
| **romeo** | Wire the 110 unwired engines in ≤5/commit batches (start Other:21/Speed:6/Monolith:5) | **Tier-1; largest reachable-units lever fleet-wide** (Engines 88%→100%). Re-points romeo at its core mission; feeds india's GNN target-dispatcher corpus |
| **echo** | Convert ~14 stub-wired post engines from `method?.()` dark fallbacks to real calls | **Tier-1; unblocks mill+lathe+wedm end-to-end** (every toolpath terminates in echo). Lifts 3 pipelines at once |
| **hotel** | Wire orphan `HotelERPTribalKnowledgeEngine` + close JM-DOC gate (7 tuples) | **Tier-1; unblocks charlie's outbound-revenue calibration** (the only true ground truth). Counts 17 stranded tribal nodes as reachable |
| **mike** | `U-WTW00/00a/00b` — fix 0-byte `WEDMLoRADatasetBuilderEngine` + wire wire/electrode registry into EDM pipeline | **Tier-2; EDM 0.38→0.72** (worst pipeline) + unblocks kilo EDM-CAM + echo wire-post. (Coordinate charlie-vs-mike ownership first) |
| **charlie** | Feed the 3 unconsumed data sources to training + connect QuoteToShip `strategies` registry | **Tier-2; QuoteToShip 0.51→1.0** + feeds india's quoting calibration corpus. Pairs with hotel's ERP-actuals pickup |
| **whiskey** | iter-3: material inference + JM-shop SFM/feed calibration (close the 41.6% accuracy floor) + fix LATHE-MASTER envelope drift | **Tier-2; Turning 0.74→0.92.** On-goal continuation of proven-accuracy rigor; per-file 2-reviewer gate (safety) |
| **foxtrot** | iter2 P2P-replication real corpus loader (`HMCProjectParser` over JM .hmc/.nc) + `replicate_similarity_search` E2E | **Tier-2; closes mill PrintToProgram 0.90→end-to-end.** Consumes echo's CIMCO machine-defs + juliett machine-index (cross-slot) |
| **kilo** | Wire EDM/Grinding/Laser strategy stages into `cam_strategy_recommend` (machine-domain keyed) | **Tier-2; lifts 3 weak CAM-adjacent pipelines** (EDM 0.38/Laser 0.37/Grinding 0.52). Re-anchors kilo on its own domain off the Blackwell shadow |
| **oscar** | `MS-SFC-CALIBRATE` foundation + wire orphaned `U-OSC9-CALIB-APPLY-WIRE` keystone | **Tier-3 revenue moat; SFC calibration lifts mill+lathe+wedm+quoting** (all consume SFC). The saleable differentiator |
| **delta** | Finish CAD-TRAINING-PIPELINE /loop + Fusion `/new` fresh-doc fix, then convert CADCAM-AGI-MS0 | **Tier-3; geometry brain product surface.** Re-bind topic to CAD first (process-drift fix). Feeds cam/quoting/xray consumers |
| **alpha** | Lift offload 11%→30% (fix dead `ollama-route-pretooluse` 0-offload hook) + close `U-CK11` | **Tier-3 force-multiplier; lowers cost of all 33 galaxies.** Converts the Blackwell routing work into realized savings |
| **lima** | Close academy MS0 tail (tag metadata + ProgressTracker/Assessment active-path) then `U-GAP-ACADEMY-MIT-OCW-INGEST` | **Tier-3; closes the in-flight tail + the content-backbone gap.** Course→certification loop is the load-bearing academy feature |
| **xray** | Source REAL dim candidates for `cad_dimension_reconcile` (3 thin adapters: OCR-store/STEP-measure/G-code-span) | **Tier-3; closes the print→CAD→program training triple.** Feeds india's training corpus + delta's round-trip. Re-anchors off the Blackwell shadow |
| **bravo** | `U-OPUS-EXECUTE-WIRE` (live Anthropic client behind OpusCapabilityEngine.execute) | Unblocks the model-tier router from advisory→real; the buildable half of the NO-GO (zuluOptIn is the operator-governance half) |
