# FLEET KNOWLEDGE-MAX ROADMAP — 14 named galaxies → world-leading-expert depth

> **Origin:** operator `/goal` 2026-06-13 (slot:zulu, orchestrator): *"populate delta, echo, foxtrot, hotel,
> india, charlie, kilo, lima, oscar, papa, romeo, tango, whiskey, xray — max context and knowledge utilizing
> every bit of data we have in the entire codebase. When we exhaust all internal resources, do deep research
> and data gathering to continue maxing out each domain so each domain would be considered a world-leading expert."*
>
> **Two-phase program (this is a fleet multi-session effort, NOT one-session-complete — R12):**
> - **Phase 1 — internal-data exhaustion (RUNNING + DURABLE).** `mine-galaxy-transcripts.mjs` over all
>   session transcripts → per-galaxy synthesis + Obsidian vault feed. Now durable via 11 reaper-immune
>   `PRISM Galaxy Mine (<g>)` scheduled tasks (staggered 01:00–06:00 daily) — see §Phase-1 status.
> - **Phase 2 — external deep research (THIS ROADMAP).** Per-galaxy targeted external sources to push each
>   domain past internal-data depth to world-leading-expert. Phase 2 starts per galaxy once its Phase-1
>   mining converges (vault memo covers ≥90% of mineable sessions).
>
> **Not a duplicate of** `FLEET-AI-SYSTEMS-ROADMAP-2026-06-01.md` (that = AI *plumbing*: closed-loop wiring,
> GNN, synergy bridges). THIS = domain *knowledge depth*. Complementary axes.
>
> **Companion measured state:** AI-SYNERGY-AUDIT.md (all 34 @ 1/1 plumbing), MASTER-DIGEST.md (galaxy cards).
> **Method note (heed [[reference_fleet_ai_systems_roadmap_2026_06_01]]):** the 2026-06-01 14-parallel-agent
> fleet assessment was killed by API rate-limiting. This roadmap is **file-grounded synthesis**, not a fan-out.

---

## Phase-1 status (internal mining) — measured 2026-06-13 (dry-run + digest count)

| galaxy (slot) | mineable | digests done | **remaining** | durable task |
|---|--:|--:|--:|---|
| cad (delta) | 235 | 234 | ~1 ✅ | — (complete) |
| post-processor (echo) | 36 | 35 | ~1 ✅ | — (complete) |
| discovery (tango) | 5 | 6 | 0 ✅ | — (complete) |
| cam (kilo) | 225 | 43 | **~182** | `PRISM Galaxy Mine (cam)` 01:00 |
| mill (foxtrot) | 171 | 4→grinding | **~167** | `(mill)` 01:30 — **running now** |
| ai-training (india) | 79 | 6 | **~73** | `(ai-training)` 02:00 |
| quoting (charlie) | 97 | 41 | **~56** | `(quoting)` 02:30 |
| wiring (romeo) | 44 | 6 | ~38 | `(wiring)` 03:00 |
| academy (lima) | 35 | 8 | ~27 | `(academy)` 03:30 |
| speed-feed (oscar) | 28 | 2 | ~26 | `(speed-feed)` 04:00 |
| business (hotel) | 30 | 11 | ~19 | `(business)` 04:30 |
| lathe (whiskey) | 16 | 2 | ~14 | `(lathe)` 05:00 |
| blueprint-vision (xray) | 14 | 4 | ~10 | `(blueprint-vision)` 05:30 |
| backend-helper (papa) | 10 | 2 | ~8 | `(backend-helper)` 06:00 |

Total remaining across the 14 ≈ **~620 mineable sessions** (~15 h of qwen2.5-coder:32b at ~90 s/session).
The daily tasks are resumable + 6 h-capped + `IgnoreNew` → each converges over a few nights. EVERY galaxy
already has a baseline `_SYNTHESIS.md` + vault memo, so none is "blind"; the under-mined ones (mill 4/171,
speed-feed 2/28, lathe 2/16) are SHALLOW, not absent.

**Convergence gate for Phase-2 start (per galaxy):** vault memo `coverage_sessions / mineable_sessions ≥ 0.90`.

---

## Phase-2 deep-research targets (per galaxy) — external sources to reach world-leading-expert

> Each block: **internal corpus to finish ingesting first** (cheap, do before web) · **external deep-research
> targets** (the canonical sources a world-leading expert in this domain has mastered) · **highest-ROI next**.
> Critical internal roots (already wired to every galaxy PATHS.md): `H:/PRISM/resources`, `H:/PRISM/JM DIE`,
> `H:/PRISM/Docustrata` (257K files — search `manifest.json` + `.index/`, never re-OCR).

### delta — CAD (feature recognition, STEP/IGES, GD&T, electrode/trilobe gen)
- **Internal:** Docustrata CAD subtree; `resources/CAD FILES/*.stp/.STEP` (blisk, impeller, jet assembly); CADQuery/Fusion seat UI knowledge.
- **External:** ISO 10303 (STEP) AP242 ed2 schema; OpenCASCADE OCCT docs (BRep, topology); ASME Y14.5-2018 GD&T; Automatic Feature Recognition literature (AAG/graph-based, hint-based, ML — Babic 2008 survey, Shi 2020 deep-learning AFR); DFM rule sets (Bralla *Design for Manufacturability Handbook*); build123d / CadQuery API; ISO 128 drawing reps.
- **Next:** finish Docustrata CAD ingest → ingest OCCT topology model + AFR survey → wire into cad feature-recognition engines.

### echo — Post-processors (controller dialects, .cps, master-post, prove-out)
- **Internal:** JM `.cps` fleet; OPEN MIND/Mastercam post libraries under `resources`; post-processor synthesis (35/36 — near-complete).
- **External:** controller manuals — **Fanuc 30i/31i + 0i-MF**, **Haas NGC**, **Okuma OSP-P300**, **Siemens SINUMERIK 840D sl**, **Heidenhain TNC640**, **Mazak Mazatrol**; ISO 6983 (G/M-code); ISO 14649 STEP-NC; Autodesk post-processor reference (`.cps` FormatConfiguration API); 5-axis RTCP/TCPM kinematics (TWP, G43.4/G234); Mitsubishi/Brother high-speed look-ahead.
- **Next:** ingest the 6 controller manuals' alarm + G/M tables → per-controller dialect coverage matrix.

### foxtrot — Mill / Milling Wizard (HSM, trochoidal, ap/ae, pocketing)
- **Internal:** `pdf-corpus-mill` (Haas/Mazak handbooks); JM VMC-01..05 programs; mill tribal tips.
- **External:** **Machinery's Handbook** (31st ed, milling); **Sandvik Coromant Technical Guide** + milling app guide; Altintas *Manufacturing Automation* (mechanics, chatter, SLD); trochoidal/HSM theory (radial chip-thinning, constant engagement); Kennametal/Seco/Iscar milling catalogs; ISO 513 (carbide grade P/M/K/N/S/H); tool-life Taylor extended; thread-mill + helical-interp.
- **Next:** mill mine converging now → on convergence, ingest Sandvik milling guide + chip-thinning model; cross-link to speed-feed (oscar) physics.

### hotel — Business (ERP, HR/payroll, accounting, legal, owner)
- **Internal:** JM customer/vendor records (`jm-die-database`, $4.91M procurement); QuickBooks-parity work (done).
- **External:** US GAAP ASC 606 (revenue recognition) + ASC 330 (inventory); manufacturing cost accounting (job-order costing, overhead absorption, standard vs actual); QuickBooks Online API + IIF schema; FLSA + state labor law (OT, exempt/non-exempt); AS9100D / ISO 9001:2015 QMS clauses; NIST 800-171 (defense supplier); incoterms + PO/invoice EDI (X12 850/810).
- **Next:** seed JM customers (open thread) → ingest ASC 606 + job-costing model into quoting↔ERP bridge.

### india — AI-training (NN/GNN, LoRA, RAG, deep learning, octopus consensus)
- **Internal:** transcript synthesis; GNN ref-pool; LoRA datasets (vault-to-lora feeder).
- **External:** GraphSAGE (Hamilton 2017), H2GCN heterophily (Zhu 2020), GAT, link-prediction eval (Liben-Nowell); LoRA (Hu 2021) + QLoRA (Dettmers 2023); RAG (Lewis 2020), HyDE, reranking (ColBERT, bge-reranker); calibration (Platt, isotonic, Guo 2017 temperature scaling); proper scoring (Brier, Murphy decomposition); Ollama/llama.cpp internals, GGUF quant; multi-agent consensus (debate, self-consistency).
- **Next:** GNN full-coverage gate is ref-pool-bound (AUROC 0.808 selective-deploy @τ=0.7); ingest H2GCN + temperature-scaling refs → retrain with grown ref-pool.

### charlie — Quoting (print-to-quote, margin/NRE, RFQ, reconciliation)
- **Internal:** DocuStrata pricing; vendor-catalog-db (425 vendors); quote-vs-actual reconciliation.
- **External:** should-cost modeling; **Boothroyd-Dewhurst DFMA** machining cost; feature-based cost estimation (Feng/Zhang); market shop-rate data ($/hr by machine class/region); RFQ/RFP standards; margin theory (contribution, NRE amortization across qty breaks); competitive-bid calibration (win-rate vs margin curves).
- **Next:** ingest DFMA machining-cost model → calibrate cost-index against JM actuals (reconciliation loop).

### kilo — CAM (cross-vendor toolpath, collision, print-to-program)
- **Internal:** Mastercam X8 + hyperMILL 31/33 + OPEN MIND E-Learning corpus under `resources`; 6 tier-1 bridges.
- **External:** vendor automation APIs — **Fusion 360 API** (Python/JS), **Mastercam NET-Hook/C-Hook**, **hyperMILL** automation/API, **Esprit** KBM, **NX Open** + CAM, **SolidWorks CAM/EApp**, **PowerMill** macro; toolpath theory (Altintas); adaptive clearing (Volumill, SolidCAM iMachining patents); gouge/collision detection (Choi & Jerard *Sculptured Surface Machining*); ISO 14649.
- **Next:** cam mine (182 remaining, 01:00 nightly) → ingest the 6 vendor API references into the bridge engines.

### lima — Academy (courses, curriculum, certification, MIT-OCW)
- **Internal:** pypdf 8,752-page corpus; MIT-OCW (mit-curriculum galaxy); course-0a..60.
- **External:** MIT OCW **2.008** (Design & Manufacturing II), **2.810** (Manufacturing Processes), **2.71/2.72**; instructional design — Bloom's revised taxonomy, mastery learning (Bloom 1984), spaced repetition, Mayer multimedia principles; certification frameworks — **NIMS** CNC credentials, **SME** Tooling-U, Haas/Mastercam/Fusion official curricula; assessment psychometrics (item response theory).
- **Next:** map MIT 2.008/2.810 syllabi → course skill-tree; align certification paths to NIMS competencies.

### oscar — Speed-Feed Calculator (Kienzle/Taylor/Merchant, 9-axis, chip-load)
- **Internal:** 41K-tool HSMAdvisor/G-Wizard vendor parity; 401-assert gauntlet; SFC physics core.
- **External:** **Kienzle-Victor** specific-cutting-force kc1.1/mc (DIN 6584, ISO 3685); **Taylor** extended tool-life VT^n=C + Colding model; **Merchant** shear-plane + Lee-Shaffer; **Altintas** stability lobe diagram / regenerative chatter; radial chip-thinning + HSM feed comp; Sandvik/Kennametal/Seco cutting-data tables per ISO grade; Boothroyd *Fundamentals of Machining*; Shaw *Metal Cutting Principles*; tool-wear (Archard, diffusion, Usui).
- **Next:** ingest Shaw + Boothroyd machining-physics → validate kc1.1/Taylor constants vs published per-material; cross-link mill (foxtrot).

### papa — Backend-helper (build/TSC, infra, dev-loop)
- **Internal:** build pipeline (esbuild+tsc 16GB heap); infra fix history.
- **External:** TypeScript Compiler API + ts-morph; esbuild internals + plugin API; V8 GC/heap tuning (`--max-old-space-size`, string-cap 0x1fffffe8 — known repo limit); Node.js worker_threads + perf_hooks; MCP protocol spec (JSON-RPC); vitest internals; Windows scheduled-task + process-ancestry (reaper model).
- **Next:** codify the V8 512MiB string-cap + heap patterns into a backend-helper playbook engine (recurring repo failure class).

### romeo — Wiring (dispatcher wiring, unwired-engine rescue, orphan activation)
- **Internal:** unwired-engine audit (66 truly-dormant + 23 library-layer); corpus→dispatcher feeds.
- **External:** dispatcher/command pattern (GoF); dependency-graph + reachability analysis; dead-code elimination / tree-shaking (Rollup, Closure); AST tooling (ts-morph, SWC); call-graph construction; lazy-import + code-splitting patterns; array-membership vs switch dispatch (the 2026-06-11 audit-detector lesson).
- **Next:** ingest reachability-analysis methods → harden `audit-unwired-engines.mjs` consumer classification (engine→engine + array-dispatch already fixed).

### tango — Discovery (algorithm/engine/pipeline discovery, dedup, dormant activation)
- **Internal:** master-index (110K-node graph); DuplicationGuard; cross-session-asset-registry.
- **External:** code search + embedding retrieval (CodeBERT, GraphCodeBERT); near-duplicate detection (MinHash, SimHash, LSH); knowledge-graph construction + entity resolution; capability taxonomy/ontology design; BM25 + dense hybrid retrieval; program analysis (def-use, slicing).
- **Next:** discovery is mining-complete; ingest MinHash/LSH → strengthen duplicate detection beyond name-heuristic.

### whiskey — Lathe / Lathe Wizard (CSS/G96, chuck-jaw, threading, sub-spindle)
- **Internal:** ~238 turning engines; turningDispatcher; lathe physics-first safety.
- **External:** **Machinery's Handbook** (turning, threading); Sandvik turning application guide + ISO turning insert ID (ISO 1832); CSS G96/G97 + constant-surface-speed safety (G50 cap); single-point threading (multi-start, infeed methods — radial/flank/modified-flank); nose-radius compensation (G41/G42 turning); grooving/parting mechanics; Swiss-type + sub-spindle + live-tooling (Y-axis); ISO 3685 tool-life (turning is the canonical test geometry).
- **Next:** lathe mine (14 remaining, 05:00) → ingest threading infeed + TNR-comp models; share Taylor/Kienzle with oscar.

### xray — Blueprint-vision (OCR/VLM ensemble, dimension extraction, GD&T)
- **Internal:** multi-VLM ensemble (qwen2.5vl:32b/7b, llama3.2-vision, moondream); OCR closed-loop training; JM 7,794-print corpus.
- **External:** document-AI / VLM — Qwen2.5-VL + Qwen3-VL technical reports, LayoutLMv3, Donut, GOT-OCR2.0; GD&T symbol detection (ASME Y14.5 feature-control-frame recognition); engineering-drawing standards ISO 128 / ISO 129 (dimensioning); title-block + revision-block parsing; table/balloon detection; ensemble consensus (≥2-agree corroboration — already shipped); active-learning for OCR calibration.
- **Next:** blueprint mine (10 remaining, 05:30) → ingest GD&T FCF detection + ISO 129 dimensioning rules into the VLM prompt/validation layer.

---

## Continuation contract (how this keeps going after this session — R6/R10)

1. **Phase-1 mining is durable** — 11 `PRISM Galaxy Mine (<g>)` daily tasks (reaper-immune; parent = Task
   Scheduler, NOT a chat). Verify: `Get-ScheduledTask -TaskName 'PRISM Galaxy Mine*'`. Each is resumable.
2. **Convergence check:** `node scripts/mine-galaxy-transcripts.mjs --dry-run --json` vs digest counts in
   `state/shared/galaxy-transcript-mining/<g>/`. A galaxy is Phase-1-done when remaining ≈ 0.
3. **Compound into brains:** `node scripts/galaxy-synthesis-refresh.mjs` (surgical — only changed clusters)
   folds mined memos into `<g>/MEMORY.md`; auto-embed propagates to wiki/tribal.
4. **Phase-2 (this roadmap):** once a galaxy's Phase-1 converges, the owning slot runs deep research against
   its §Phase-2 target list → writes findings to `engines/<g>/` knowledge files + `reference_<g>_*` memories.
   Owning slots: delta·echo·foxtrot·hotel·india·charlie·kilo·lima·oscar·papa·romeo·tango·whiskey·xray.
5. **Honest gate (R12):** "world-leading expert" is reached for a domain only when its Phase-2 target list is
   ingested + cited in the galaxy brain — NOT when the scaffold/synergy-plumbing exists. AI-SYNERGY-AUDIT=1/1
   measures plumbing, not depth.

_Authored 2026-06-13 (slot:zulu orchestrator). Spec is advisory; the durable tasks + miner are the executors._
