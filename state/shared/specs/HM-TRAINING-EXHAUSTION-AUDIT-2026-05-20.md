# hyperMILL / hyperCAD Training-Corpus Exhaustion Audit — 2026-05-20

> Author: claude-3db3fb3d (slot=foxtrot), /forge-audit-v2 run.
> Scope: assess whether the hyperMILL/hyperCAD-S training corpus is exhausted and whether harvested tribal knowledge + wiki is wired into the CAD AI / neural-network / learning engines.
> Status: **ADVISORY**. Verification channels declared per finding; META artifact is `scripts/hm-extraction-coverage.mjs` (deterministic, re-runnable).
> Companions: `ACSERVER-BRIDGE-AUDIT-2026-05-20.md`, `HYPERCAD-TEST-PLAYBOOK-2026-05-20.md`, `HYPERMILL-HYPERCAD-CLOSE-OUT-TRIAGE-2026-05-20.md`.

## 1. Scope-binding statement

I am auditing the *training-data exhaustion* of the hyperMILL + hyperCAD-S corpus that ships on disk under `H:/prism/Resources/OPEN MIND/` against the harvested-tribal store under `H:/prism/cad-engine/knowledge_store/doc-*.json` and the vector-recall surface `H:/prism/state/shared/tribal-embed-index.json`, plus consumer wiring across the 9 candidate AI/learning engines named below. The verification channel for every finding is `scripts/hm-extraction-coverage.mjs --json` — a deterministic re-runnable measurement returning corpus-on-disk vs corpus-extracted vs corpus-in-embed-index counts. Baseline this session (from `scripts/hm-extraction-coverage.mjs --json`, 2026-05-20T16:09Z): **48 PDFs on disk · 15 HM-related extractions · 3 544 HM tribal tips harvested · 4 ZERO-tip extraction failures · 36 UNPROCESSED PDFs · 0 HM entries in tribal-embed-index · GraphSAGE pool=0 deferred=true**.

### Headline gap (newly surfaced this run)

30+ unprocessed `hmAutoColor` Automation-Center PDFs (operator-authored workflow recipes: "Running the AC in a Server", "Tool report customization", "Customer toolbar", "Calculation in a server", "Setup new Clamp" — across v31.0 AddIns, v31.0 addins project, v33.0 AddIns, v33.0 addins project). These are exactly the kind of tribal-idiom content the AI hierarchy benefits most from — they describe HOW operators actually use AC, not just the API surface. ZERO of these are extracted.

## 2. Findings (verification-channel-gated)

### F1 — hyperCAD-S Manual extraction yielded ZERO tips — CRITICAL

`doc-cad-manual-en-us.json` exists in `knowledge_store/` but `.tips=[]` — the hyperCAD-S CAD manual produced no tribal output. This is the single highest-leverage gap: the CAD AI systems have no manual-derived tips to learn from for hyperCAD-S authoring features.

```yaml
finding: hyperCAD-S CAD_Manual extracted but produced 0 tribal tips
verifies_via:
  tool: node -e "console.log(JSON.parse(require('fs').readFileSync('H:/prism/cad-engine/knowledge_store/doc-cad-manual-en-us.json','utf8')).tips.length)"
  expected_signal: integer tip count
  re_run_cost: ~50ms
  baseline: 0 (CRITICAL)
  target: ≥200 tips (parity with hyperMILL CAM Manual which produced 488)
```

### F2 — Four additional ZERO-tip extractions

`doc-fusion-cad.json`, `doc-hypermill-sql-tool-db.json`, `doc-inventorhsm-getting-started.json`, `doc-sql-macro-database-manual-en-us.json` all `.tips=[]`. Some (sql-tool-db) are intrinsically content-poor (DBA setup); others (fusion-cad, inventorhsm-getting-started) are legitimately useful CAD/CAM material that the extractor failed on.

```yaml
finding: 4 additional extractions returned 0 tips
verifies_via:
  tool: node scripts/hm-extraction-coverage.mjs --json | jq '.zero_tip_files'
  expected_signal: list of files with .tips.length===0
  re_run_cost: ~200ms
  baseline: 5 zero-tip files
  target: ≤1 (only intrinsically content-poor: sql-tool-db DBA setup)
```

### F3 — hyperMILL v31.0 manuals not separately extracted from v33.0

Disk has both v31.0 and v33.0 manuals for hyperMILL, hyperCAD-S, AUTOMATION Center. Only v33.0 was extracted. v31.0 contains historical idioms + features that v33.0 deprecated — these are exactly the tribal patterns AI training benefits most from (older syntax that still appears in operator-written templates).

```yaml
finding: hyperMILL/hyperCAD-S v31.0 manuals unprocessed
verifies_via:
  tool: node scripts/hm-extraction-coverage.mjs --json | jq '.unprocessed_pdfs'
  expected_signal: list of FS PDFs with no corresponding extraction-log entry
  re_run_cost: ~300ms
  baseline: 6 v31.0 PDFs unprocessed (hyperMILL Manual, hyperCAD-S Manual, AUTOMATION Center Manual, Installation, SQL Tool Database, SQL Macro Database)
  target: 0 (v31.0 separately extracted as `*-vol31*` to preserve idioms)
```

### F4 — tribal-embed-index has ZERO hyperMILL/hyperCAD entries — CRITICAL

The 2 988 HM tips exist as JSON but `grep -cE '"source":\s*"(doc-hypermill|hypermill|hyperCAD)' tribal-embed-index.json` returns **0**. The `tribal-by-domain-inject` UserPromptSubmit hook (slot-domain-aware tribal injection) is structurally blind to HM tips — they exist in storage but cannot be surfaced by vector recall.

```yaml
finding: HM tips not embedded in tribal-embed-index
verifies_via:
  tool: grep -cE '"source"\s*:\s*"(doc-hypermill|hypermill|hyperCAD)' state/shared/tribal-embed-index.json
  expected_signal: integer count
  re_run_cost: ~100ms
  baseline: 0 (CRITICAL — vector recall blind to 2 988 tips)
  target: ≥2 500 entries (allowing for dedup/embed failures)
```

### F5 — Wiki has hyperMILL pages but coverage is unverified for HC

`knowledge/wiki/` reports ~418 HM wiki entries (pre-compact enumeration). hyperCAD-S authoring/parametric/sketcher coverage was not separately verifiable in this session — same surface, different sub-corpus.

```yaml
finding: hyperCAD-S wiki coverage unverified
verifies_via:
  tool: ls knowledge/wiki/*/hyper-cad*.md knowledge/wiki/*/hypercad*.md 2>/dev/null | wc -l
  expected_signal: count of hyperCAD-S wiki entries (separate from hyperMILL CAM)
  re_run_cost: ~50ms
  baseline: unknown
  target: ≥40 (proportional to ~488 hyperMILL CAM entries — CAD-side is smaller surface)
```

### F6 — 9 consumer engines reference HM tribal but none has been measurement-verified to USE the JSON ingest path

`grep` finds 9 engines naming HM tribal/knowledge_store paths: HyperMillDeepLearningEngine, HyperMillStrategyKnowledgeEngine, HyperMillAIOrchestrationEngine, HyperMillFunctionIndexEngine, MillingAIUnificationEngine, CAMTrainingExtractionAggregatorEngine, CAMPluginSDKEngine, PostProcessorAGIMasterRegistryEngine, and `index.ts-2`. Wiring presence ≠ functional consumption. No measured-tip-loaded-into-engine baseline exists.

```yaml
finding: HM tribal consumer wiring is grep-confirmed but not measurement-confirmed
verifies_via:
  tool: node scripts/hm-extraction-coverage.mjs --json | jq '.consumers[]'
  expected_signal: per-consumer load-count (tips read in/used)
  re_run_cost: ~500ms (requires engine instantiation in test harness)
  baseline: 0 measured / 9 grep-named
  target: ≥3 measurement-verified consumers (HyperMillDeepLearningEngine, HyperMillStrategyKnowledgeEngine, MillingAIUnificationEngine)
```

### F7 — Neural-network tier-5 (GraphSAGE GNN) is dormant by data, not by code

Per CLAUDE.md §NN-GRAPH-MS2, the GNN cascade tier-5 was deployed but data-side-blocked (`poolSize:0` because 0 reference ghosts). Wiring 2 988 HM tips as ghost reference nodes would directly lift that. This is the most leveraged consumer for HM corpus exhaustion.

```yaml
finding: GraphSAGE tier-5 dormant; HM tips are highest-leverage ghost-pool feedstock
verifies_via:
  tool: cat state/shared/nn-graph/NN-EVAL.json | jq '.poolSize, .deferred'
  expected_signal: poolSize integer, deferred boolean
  re_run_cost: ~10ms
  baseline: poolSize 0, deferred:true
  target: poolSize ≥500 from HM ghost seeding, deferred:false
```

## 3. Headline numbers

| Metric | Baseline (now) | Target |
|---|---:|---:|
| HM PDFs on disk | 48 | — |
| HM-related extractions | 15 | 51 (v31.0 main + 36 hmAutoColor + 4 zero-tip fixes) |
| Unprocessed PDFs | **36** | 0 |
| HM tribal tips harvested | 3 544 | ≥6 000 (re-extract zero-tip + hmAutoColor + v31.0) |
| HM tips in embed-index | **0** | ≥5 000 |
| HM consumer engines wired | 8/8 grep / 0 measured | ≥3 measurement-verified |
| GraphSAGE pool from HM | 0 (deferred) | ≥500 (deferred:false) |

## 4. Verdict

**Not exhausted.** The corpus on disk is materially under-harvested:
1. hyperCAD-S manual extracted but zero-yield (F1 — single highest-leverage rebuild target).
2. 4 other zero-yield extractions (F2).
3. v31.0 manuals never separately extracted (F3).
4. Even the 2 988 tips that ARE harvested are unreachable by the vector-recall surface (F4 — the structural blocker).
5. Consumer wiring exists but is grep-confirmed only (F6).
6. The neural-net tier most able to benefit (GraphSAGE) is data-dormant and HM is its best seed source (F7).

Closing F4 alone (embed-index population) unlocks the 2 988 tips for fleet-wide tribal recall in every chat. Closing F1 (re-extract hyperCAD-S) unlocks CAD-side AI training. F7 (ghost-seed GraphSAGE) compounds both.

## 5. META artifact

`scripts/hm-extraction-coverage.mjs` — re-runnable measurement returning all baselines above as JSON. Drives Phase 6 of every subsequent re-audit. See `/loop` registration at §7.

## 6. /forge7 plan companion

See `state/shared/specs/HM-TRAINING-WIRING-PLAN-2026-05-20.md` for the 7-unit plan (`/forge7 /yolo-mode`).

## 7. Self-scheduled re-run

```bash
# /loop 5m — re-run this audit on a fast cadence while the wiring units land
/loop 5m /forge-audit-v2 assess HM/HC training exhaustion vs wiring progress
```

The fast 5-minute cadence is operator-directed (see Stop-hook goal). Default /forge-audit-v2 cadence is 7d; this is a hot-loop while wiring lands.

## See also

- `state/shared/specs/ACSERVER-BRIDGE-AUDIT-2026-05-20.md`
- `state/shared/specs/HYPERCAD-TEST-PLAYBOOK-2026-05-20.md`
- `state/shared/dashboards/HYPERMILL-HYPERCAD-CLOSE-OUT-TRIAGE-2026-05-20.md`
- `state/shared/specs/HM-TRAINING-WIRING-PLAN-2026-05-20.md` (/forge7 companion)
- CLAUDE.md §NN-GRAPH-MS2 (tier-5 dormancy)
- CLAUDE.md §KNOWLEDGE-CONVERSION-MS0 (lane-A direct-wire pattern reusable here)
