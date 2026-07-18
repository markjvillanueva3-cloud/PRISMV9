export const meta = {
  name: 'galaxy-advanced-techniques-domain',
  description: 'Advanced-Techniques layer (state-of-the-art STRATEGY/METHOD, world-leader depth) for the 6 saleable-core manufacturing domain galaxies (speed-feed, mill, lathe, wedm, cam, post-processor). Distinct from foundations (intro theory) and applied-practice (common gotchas): this is the proactive advanced strategy an expert reaches for. R12 STRICT: promote ONLY qualitative method/strategy/trade-off-direction -- NEVER a numeric cutting constant (kc1.1/Taylor/SFM/IPR/chip-load); every number stays owner-gated. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'AdvTech', detail: 'waves of 3: WebFetch reputable free sources, advanced strategy/method, numerics gated' },
  ],
}

const GALAXIES = [
  { g: 'speed-feed', owner: 'oscar', focus: 'advanced cutting-optimization STRATEGY: chatter stability-lobe-diagram exploitation (pick a stable spindle speed in a lobe), regenerative-chatter avoidance, HSM/high-feed engagement-angle control, variable/adaptive feed, tool-wear-aware re-optimization, MRR-vs-tool-life-vs-finish Pareto trade DIRECTION. Free: Altintas Manufacturing Automation framing, Smith/Tlusty machining-dynamics, NPTEL/MIT machining, academic SLD papers.' },
  { g: 'mill', owner: 'foxtrot', focus: 'advanced milling STRATEGY: high-efficiency/dynamic milling (low radial / high axial engagement), trochoidal slotting, adaptive clearing, 3+2 vs full 5-axis simultaneous decision, thin-wall deflection-compensation strategy, rest-machining order. Free: CNCCookbook, Harvey/Helical In-The-Loupe technique guides, MIT 2.008, NPTEL manufacturing.' },
  { g: 'lathe', owner: 'whiskey', focus: 'advanced turning STRATEGY: high-pressure-coolant chip-control, constant-surface-speed strategy near center, mill-turn live-tooling / Y-axis, hard-turning-vs-grinding decision, multi-pass threading infeed strategy (radial/flank/incremental), bar-feed automation. Free: Sandvik Coromant free knowledge articles, CNCCookbook, NPTEL/MIT.' },
  { g: 'wedm', owner: 'mike', focus: 'advanced wire-EDM STRATEGY: multi-pass rough+skim/trim sequencing for accuracy+finish, adaptive power/flushing control under varying height, 4-axis taper/independent-UV strategy, corner-strategy to fight wire-lag error, wire-tension/speed optimization DIRECTION, recast/HAZ-minimization method. Free: vendor EDM knowledge bases, NPTEL non-conventional machining, academic EDM literature.' },
  { g: 'cam', owner: 'kilo', focus: 'advanced CAM toolpath STRATEGY: adaptive/high-speed clearing with stock-model tracking, rest-machining cascade, collision-aware multi-axis posting, toolpath linking/lead-in-out optimization, engagement-driven feed optimization, simulation/verification-first discipline. Free: Autodesk Fusion/HSM learning, academic CAM literature, manufacturing courses.' },
  { g: 'post-processor', owner: 'echo', focus: 'advanced post-processor STRATEGY: multi-axis kinematics with RTCP/TCPC (machine does the rotary compensation), canned-cycle expansion vs native, controller-dialect abstraction layer, look-ahead/smoothing configuration strategy, probing/macro-B integration, safe-retract + work-offset (G54.1/G54-P) discipline. Free: LinuxCNC docs, public Haas/Fanuc/Heidenhain programming manuals, academic.' },
  { g: 'cad', owner: 'delta', focus: 'advanced parametric-CAD STRATEGY: master-model / skeleton top-down modeling for assembly control, robust-reference (attach features to stable datums/planes not derived faces -> avoid the topological-naming rebuild break), history-based vs direct-editing decision, design-for-manufacturing (DFM) feature intent, configuration/parameter tables for part families, class-A surfacing vs solid. Free: Autodesk/SolidWorks/FreeCAD official learning, academic CAD/PLM. Kernel tolerances stay owner-gated for delta.' },
  { g: 'blueprint-vision', owner: 'xray', focus: 'advanced GD&T-interpretation + extraction STRATEGY: datum-reference-frame establishment order, MMC/LMC bonus-tolerance exploitation, profile/position tolerance-zone interpretation, tolerance-stack accumulation direction, multi-VLM ensemble-consensus OCR (>=2-agree corroborated), born-digital-vs-OCR routing for dimension fidelity. Free: GD&T educational resources (ASME Y14.5 framing), document-AI/layout-analysis literature. Specific tolerance values stay owner-gated.' },
  { g: 'quoting', owner: 'charlie', focus: 'advanced cost-estimation STRATEGY: reference-class forecasting to debias optimism, parametric + should-cost modeling, capacity/bottleneck-based pricing, risk-adjusted margin + contingency, quote-vs-actual feedback loop, change-order/scope-creep capture. Free: industrial-engineering cost-estimation literature, project-management (reference-class) sources, OpenStax managerial accounting. Specific rates/margins stay owner-gated.' },
  { g: 'business', owner: 'hotel', focus: 'advanced operations/ERP STRATEGY: Theory of Constraints (exploit the bottleneck), lean/TPS waste elimination, working-capital + cash-conversion-cycle optimization, sales-and-operations planning (S&OP), activity-based costing vs volume-based distortion, KPI-gaming avoidance. Free: Goldratt TOC framing, lean literature, OpenStax/MIT Sloan open courses. Specific financials stay owner-gated.' },
  { g: 'academy', owner: 'lima', focus: 'advanced pedagogy STRATEGY: mastery learning + Bloom 2-sigma tutoring, spaced repetition + retrieval practice, deliberate practice with immediate feedback, cognitive apprenticeship, worked-example-to-faded-scaffold progression, formative-assessment-driven sequencing. Free: learning-science literature, MIT/Stanford teaching-and-learning open resources, OER pedagogy.' },
  { g: 'ai-training', owner: 'india', focus: 'advanced ML-training STRATEGY: curriculum + active learning, knowledge distillation, RAG retrieval-eval before generation-eval, LoRA rank/target-module selection, distribution-shift + data-drift handling, calibration + selective-prediction (abstain below a confidence gate), multi-seed variance control. Free: d2l.ai, HuggingFace courses, Stanford CS229/CS224N, fast.ai.' },
  { g: 'database-expansion', owner: 'juliett', focus: 'advanced database STRATEGY: query-plan reading + index-driven access-path design, partitioning + sharding, materialized views + incremental refresh, HNSW/vector-index parameter tuning (M/efConstruction trade), change-data-capture, isolation-level selection for the workload. Free: CMU 15-445/645 (Pavlo), Use-The-Index-Luke, PostgreSQL docs, MIT 6.830.' },
  { g: 'frontend-app', owner: 'quebec', focus: 'advanced web-performance + architecture STRATEGY: code-splitting + route-level lazy load, list virtualization, React Server Components / streaming SSR, Core Web Vitals (LCP/INP/CLS) optimization, cache-first data with stale-while-revalidate, edge rendering. Free: web.dev (Google), MDN, React docs, Patterns.dev.' },
  { g: 'quality', owner: 'golf', focus: 'advanced quality-engineering STRATEGY (thresholds gated): design of experiments (DOE) factor-screening + RSM, Six Sigma DMAIC, measurement-system analysis / gauge-R&R strategy, capability-vs-control distinction, FMEA risk-priority, SPC rule-set selection. Free: NIST/SEMATECH e-Handbook of Statistical Methods, ASQ open resources. R12: NO numeric Cpk/sigma/threshold (gated to quality owner).' },
  { g: 'shop-floor', owner: 'golf', focus: 'advanced shop-floor STRATEGY (thresholds gated): OEE decomposition (availability x performance x quality) + loss-tree, SMED setup-time reduction, total productive maintenance (TPM), MES/digital-twin integration, predictive + condition-based maintenance, takt-time/flow balancing. Free: lean/TPM literature, NIST manufacturing, MIT open courses. R12: NO numeric OEE/threshold (gated).' },
  { g: 'token-optimization', owner: 'alpha', focus: 'advanced context-economy STRATEGY: hierarchical summarization that preserves load-bearing detail, prompt-cache/KV-cache breakpoint placement, retrieval-vs-context-window trade, semantic dedup before merge, lossless structural compression of structured text. Free: MIT 6.050J info-theory, Anthropic prompt-caching docs, data-compression literature.' },
  { g: 'hermes-zulu', owner: 'zebra', focus: 'advanced multi-agent FLEET-orchestration STRATEGY: hierarchical orchestrator-worker decomposition, dynamic load-balancing, fencing-token write-safety for reaped-then-reassigned leases, quorum for shared fleet state, backpressure. Free: MIT 6.824, multi-agent-systems literature.' },
  { g: 'fleet-hygiene', owner: 'golf', focus: 'advanced process-lifecycle/reaping STRATEGY: process-group/cgroup reaping (not lone PID), graduated SIGTERM->grace->SIGKILL, ancestry-confirmed orphan detection, resource-pressure-gated reaping, double-fork daemon supervision. Free: OSTEP, Linux man pages (wait/signal/kill), Brendan Gregg systems-performance.' },
  { g: 'discovery', owner: 'tango', focus: 'advanced IR/ranking STRATEGY: learning-to-rank, query expansion, BM25F field-weighting, LSH band/row tuning for recall-precision, hybrid dense+sparse fusion (reciprocal-rank-fusion). Free: Stanford CS276, MMDS, Lucene docs.' },
  { g: 'system-viz', owner: 'sierra', focus: 'advanced graph-rendering STRATEGY: Barnes-Hut/FM3 scalable layout, level-of-detail + edge-bundling for hairballs, GPU instancing, streaming/progressive load for a large graph, focus+context navigation. Free: Munzner Visualization Analysis & Design, Handbook of Graph Drawing, WebGL docs.' },
  { g: 'agent-orchestration', owner: 'zebra', focus: 'advanced distributed-coordination STRATEGY: Raft/Paxos consensus, quorum + fencing tokens, lease-vs-lock, exactly-once via idempotency keys, saga/compensation for distributed transactions. Free: MIT 6.824, Raft paper, MapReduce/Dynamo.' },
  { g: 'wiring', owner: 'romeo', focus: 'advanced dependency-management STRATEGY: incremental topological rebuild (rebuild only the stale, in dep order), dependency-injection container design, cycle-breaking via interface seams, version-skew/diamond resolution. Free: MIT 6.031, Build Systems a la Carte, DI literature.' },
  { g: 'bug-hunting', owner: 'golf', focus: 'advanced testing STRATEGY: property-based testing + coverage-guided fuzzing, mutation testing to measure oracle quality, differential testing, delta-debugging to minimize a failing input, metamorphic testing. Free: MIT 6.031, fuzzing literature, NIST SARD.' },
  { g: 'backend-helper', owner: 'papa', focus: 'advanced TypeScript/build STRATEGY: project-references incremental tsc, isolatedModules + esbuild type-strip split, type-level performance (avoid deep conditional blowups), module-resolution (NodeNext) strategy, declaration bundling. Free: TypeScript handbook, esbuild docs, Node.js ESM docs.' },
  { g: 'dormant-data', owner: 'victor', focus: 'advanced GC/storage-lifecycle STRATEGY: generational + incremental tracing GC, MVCC-safe reclaim (prove no live snapshot references it), tiered storage + compaction, TTL/retention policy, reference-cycle detection. Free: The GC Handbook, OSTEP, CMU 15-445.' },
  { g: 'compliance-safety', owner: 'golf', focus: 'advanced safety-engineering STRATEGY (gated): STPA/STAMP systems-theoretic hazard analysis, fail-CLOSED defense-in-depth with INDEPENDENT layers, FMEA/FTA, ALARP, the safe-state-must-be-named principle. Free: Leveson Engineering a Safer World + STPA Handbook (MIT), IEC 61508 framing. R12: NO numeric SIL/threshold (gated).' },
  { g: 'knowledge-conversion', owner: 'golf', focus: 'advanced NLP/extraction STRATEGY: transformer NER + relation extraction, distant supervision, schema-guided/constrained extraction, entity linking + coreference, ETL fail-loud reconciliation (load N of M, drop K loudly). Free: Stanford CS224N, Jurafsky-Martin SLP3, spaCy docs.' },
  { g: 'corpus-aggregation', owner: 'golf', focus: 'advanced ETL/streaming STRATEGY: exactly-once stream processing, change-data-capture, schema-evolution handling, incremental dedup across heterogeneous sources, watermarking for late/out-of-order data. Free: data-engineering courses, Apache Airflow/dbt docs, stream-processing literature.' },
  { g: 'mit-curriculum', owner: 'lima', focus: 'advanced open-courseware curation STRATEGY: prerequisite-graph sequencing for a learner path, CC-license-aware aggregation + attribution, born-digital-vs-scan extraction routing, course-version-drift tracking, OER quality rubrics. Free: MIT OpenCourseWare, Creative Commons, OER literature.' },
  { g: 'tribal-knowledge', owner: 'golf', focus: 'advanced knowledge-management STRATEGY: operationalizing the SECI spiral, retrieval-augmented capture (capture + make-retrievable together), expertise-location, communities-of-practice, knowledge-decay/staleness management. Free: Nonaka SECI, Wenger communities-of-practice, KM literature.' },
  { g: 'pdf-corpus', owner: 'xray', focus: 'advanced OCR/document-AI STRATEGY: layout-analysis (region segmentation before recognition), multi-VLM ensemble consensus (>=2-agree), table-structure recognition, born-digital-text-vs-OCR routing, confidence-gated re-OCR, resumable corpus processing. Free: document-AI literature, Tesseract/pypdf docs, Szeliski Computer Vision.' },
  { g: 'pdf-corpus-mill', owner: 'golf', focus: 'advanced mill-document extraction STRATEGY: table-structure recognition for machining/tool tables, units-resolution-FIRST (title-block unit as a required field), diameter/radius symbol disambiguation, multi-page resumable extraction. Free: Camelot/Tesseract/pypdf docs, document-AI. Cutting numerics owner-gated.' },
  { g: 'cad-fusion-live', owner: 'delta', focus: 'advanced live-CAD automation STRATEGY: API-driven parametric generation, headless/scriptable session driving, robust-reference (datum-first) automation to survive rebuilds, regeneration-cascade management, live-session state recovery. Free: Autodesk Fusion API docs, FreeCAD scripting docs. Kernel tolerances owner-gated.' },
]

phase('AdvTech')

function prompt({ g, owner, focus }) {
  return `You are creating the Advanced-Techniques wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-advanced-techniques.md.

PURPOSE: the WORLD-LEADER-DEPTH layer -- the state-of-the-art STRATEGIES and ADVANCED METHODS an expert in this domain reaches for, BEYOND the intro theory and the common gotchas. DISTINCT from ${g}-foundations.md (intro theory) and ${g}-applied-practice.md (common practitioner gotchas) -- read BOTH first so you do not repeat them; this entry is "the advanced strategy that makes the difference at the top of the field."

FOCUS for ${g}: ${focus}

ABSOLUTE RULES (R12 honesty + SAFETY):
1. R12-SAFETY CRITICAL: promote ONLY the qualitative STRATEGY / METHOD / trade-off DIRECTION. NEVER promote a numeric cutting constant (kc1.1, Taylor C/n, a specific SFM/RPM/IPR/chip-load/feed/depth number, a coolant pressure psi). Those are owner-gated for ${owner} and live ONLY in mcp-server/src/physics/constants.ts. State the SHAPE of the relationship ("higher engagement angle raises cutting temperature, so reduce feed") never the number. If a source gives a number, describe the method, gate the number.
2. ONLY state a technique you CONFIRM by WebFetch on a reputable free/legal source (vendor knowledge base, university courseware, NPTEL, academic paper, official docs). Never fabricate. If a fetch fails, retry once then drop it.
3. Aim for 8-12 advanced techniques across 4-5 themed sections. Each = the technique + WHEN an expert uses it + the trade-off DIRECTION + source cited inline + one line on how THIS PRISM galaxy applies it.
4. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
5. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-advanced-techniques (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" listing the numeric constants/thresholds deliberately left for ${owner} + "## Sources".
6. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-advanced-techniques.md
CREATED: <yes/no>
CITED_TECHNIQUES: <count of WebFetch-confirmed advanced techniques>
SOURCES: <count of distinct source URLs confirmed>
NUMERICS_LEFT_GATED: <yes -- must be yes for a cutting galaxy>
NOTE: <one line: the single highest-leverage advanced technique this entry captures>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `advtech:${entry.g}`, phase: 'AdvTech' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`advanced-techniques-domain complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
