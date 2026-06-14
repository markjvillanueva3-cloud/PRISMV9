export const meta = {
  name: 'galaxy-applied-practice-meta',
  description: 'Applied Practice (practitioner-knowledge / tribal) layer for the 12 meta/infra galaxies with genuinely-distinct CS-engineering gotchas (fleet-hygiene, discovery, bug-hunting, system-viz, backend-helper, token-optimization, agent-orchestration, compliance-safety, dormant-data, knowledge-conversion, wiring, tribal-knowledge). Cited CS-engineering failure-modes/gotchas; compliance-safety method-only with thresholds gated. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'MetaPractice', detail: 'waves of 3: WebFetch reputable free CS sources, cited engineering gotchas, R12-gated' },
  ],
}

const GALAXIES = [
  { g: 'fleet-hygiene', owner: 'golf', gated: false, focus: 'process-lifecycle/reaping practitioner gotchas: PID-reuse race (reaping a recycled PID -> killing the wrong process), zombie vs orphan distinction + who reaps each, SIGTERM-vs-SIGKILL grace period, reaping a process you do not own, double-fork daemon detachment, heartbeat false-positive (slow != dead -> the confirm-after-N-ticks pattern), thundering-herd on restart. Free: OSTEP, Linux man pages (wait(2)/signal(7)), MIT 6.824.' },
  { g: 'discovery', owner: 'tango', gated: false, focus: 'IR/dedup practitioner gotchas: LSH band/row tuning false-negative-vs-false-positive trade, MinHash permutation-count vs accuracy, stop-word/stemming mismatch breaking matches, BM25 k1/b parameter sensitivity, exact-vs-fuzzy dedup threshold, stale index returning ghosts. Free: MMDS, Stanford CS276 / Manning IR.' },
  { g: 'bug-hunting', owner: 'golf', gated: false, focus: 'testing/static-analysis practitioner gotchas: green test with no oracle (asserts nothing -- the R9 failure), flaky-test root causes (shared state / timing / ordering), coverage != correctness, mock drift from real interface, silent catch-and-continue hiding failures, boundary off-by-one. Free: MIT 6.005/6.031, software-testing literature, NIST SAMATE.' },
  { g: 'system-viz', owner: 'sierra', gated: false, focus: 'graph-visualization practitioner gotchas: naive force-layout O(n^2)/O(n^3) blowup (Barnes-Hut/LOD mandatory at scale), label overlap/occlusion, hairball at high edge-density (filtering/edge-bundling), color-encoding accessibility, streaming-vs-materialize OOM on a large graph, stale-render after data change. Free: Munzner viz, graph-drawing surveys, WebGL docs.' },
  { g: 'backend-helper', owner: 'papa', gated: false, focus: 'build/TSC/module practitioner gotchas (PAPA OWN galaxy): NodeNext missing .js import suffix (#1 silent break), single-source type cascade (fix root not symptoms), circular import + TDZ ReferenceError, esbuild-strips-types-vs-tsc-checks semantic gap, declaration-merging surprises, an any-leak masking real errors, tsc heap-OOM on a large project (--max-old-space-size). Free: TypeScript handbook, Crafting Interpreters, Stanford CS143.' },
  { g: 'token-optimization', owner: 'alpha', gated: false, focus: 'compression/context-economy practitioner gotchas: lossy summarization dropping load-bearing detail (irreversible), the entropy floor (cannot losslessly compress structured text past it), redundant re-reads of the same file, prompt-cache TTL misuse (cold-tier miss), dedup false-merge of distinct items, context-window thrash. Free: MIT 6.050J info-theory, Shannon 1948.' },
  { g: 'agent-orchestration', owner: 'zebra', gated: false, focus: 'distributed-coordination practitioner gotchas: split-brain (two leaders act), lease-vs-lock (a dead lock-holder freezes the unit forever; a lease expires), thundering-herd retry storm, lost-update read-modify-write race, at-least-once-vs-exactly-once delivery, heartbeat false-positive evicting a live worker. Free: MIT 6.824, Raft, MapReduce OSDI04.' },
  { g: 'compliance-safety', owner: 'golf', gated: true, focus: 'safety-gate practitioner gotchas: fail-OPEN vs fail-CLOSED default (a gate that fails open is a non-gate -- the recurring PRISM bug class), single-point-of-failure in a safety check, audit-trail gaps breaking traceability, alarm fatigue (too many warnings -> all ignored), ALARP misapplication, defense-in-depth reduced to one real layer. Free: OSHA, NIST, IEC 61508 framing. R12: NO numeric safety thresholds (gated).' },
  { g: 'dormant-data', owner: 'victor', gated: false, focus: 'GC/storage-lifecycle practitioner gotchas: refcount misses cycles (tracing needed), premature reclaim of still-referenced data, age != unreachable (a 1-year-old hot row), a full scan demoting hot data, TOCTOU race on delete (file recreated between check and unlink), retention-policy gap losing required records. Free: OSTEP, database-storage courses.' },
  { g: 'knowledge-conversion', owner: 'golf', gated: false, focus: 'NLP/extraction/ETL practitioner gotchas: NER brittleness on domain-specific terms (a milling term mis-tagged), relation-extraction precision-vs-recall trade, ontology drift over time, ETL silent-drop on a malformed record (vs fail-loud), unicode/encoding mangling, dedup over-merge of distinct entities. Free: Stanford CS224N, NLP literature.' },
  { g: 'wiring', owner: 'romeo', gated: false, focus: 'dependency-wiring practitioner gotchas: circular dependency (DAG violation -> build/init break), wiring an engine to ONE consumer not ALL natural ones (orphan -- the R15 failure), dependency-injection over-abstraction, topological-order build break, tight coupling via shared mutable state, version-skew between producer and consumer. Free: MIT 6.031, dependency-injection / build-system literature.' },
  { g: 'tribal-knowledge', owner: 'golf', gated: false, focus: 'knowledge-management practitioner gotchas: tacit knowledge resists explicit capture (the SECI externalization bottleneck), lessons-learned nobody reads (capture without retrieval), knowledge silos, expert-departure knowledge loss, stale tribal tips outliving their context, a tip indexed but never surfaced (recall gap). Free: KM literature, Nonaka SECI, organizational-learning sources.' },
  { g: 'hermes-zulu', owner: 'zebra', gated: false, focus: 'multi-agent FLEET-orchestration practitioner gotchas (the fleet/chat-slot layer, sibling of agent-orchestration): slot-drift after a compact reclaiming the wrong terminal, lease-not-lock for slot claims (a dead chat holding a claim forever), thundering-herd on fleet restart, orphan/zombie chat reaping (reap the owning ancestor not the PID), cross-slot file-claim races, handoff continuity lost on topic-drift. Free: MIT 6.824, multi-agent-systems literature, orchestrator-worker pattern.' },
  { g: 'corpus-aggregation', owner: 'golf', gated: false, focus: 'ETL/data-aggregation practitioner gotchas (sibling of knowledge-conversion, the aggregation layer): silent-drop of a malformed record (vs fail-loud report loaded-N-of-M), dedup over-merge across heterogeneous sources, schema drift between sources breaking the join, incremental-vs-full reload correctness, late-arriving/out-of-order data, encoding mismatch across feeds. Free: data-engineering courses, Airflow/dbt docs, ETL literature.' },
  { g: 'mit-curriculum', owner: 'lima', gated: false, focus: 'open-courseware curriculum-source practitioner gotchas (the OCW corpus that feeds academy): CC-BY-NC-SA attribution/share-alike obligations easy to violate, course-version drift (a course revised or withdrawn breaks a citation), transcript-vs-video desync, prerequisite-graph gaps mis-sequencing a learner, stale OCW deep-links, scanned-PDF vs born-digital extraction quality. Free: MIT OCW, Creative Commons licensing docs, OER literature.' },
  { g: 'cad-fusion-live', owner: 'delta', gated: false, focus: 'live parametric-CAD-session practitioner gotchas (sibling of cad, the live/automation layer): a parametric rebuild cascade where one edit silently breaks downstream features, UNITS mismatch = the 25.4x inch/mm scale error (units-first!), feature-tree order dependency, live-session state loss on a crash, CAD-API automation race against the user, over-constrained sketch rejection. Free: Autodesk/FreeCAD docs, parametric-CAD courses. Numerics (kernel tolerances) stay owner-gated for delta.' },
  { g: 'pdf-corpus', owner: 'xray', gated: false, focus: 'OCR/PDF-extraction practitioner gotchas (sibling of blueprint-vision, the document-corpus layer -- map to PRISMs OWN lived regressions): multi-page PDF read page-0-only dropping dimension-bearing pages, leading-dot decimal .171 breaking JSON.parse losing a whole extraction, truncated-JSON loss, non-resumable corpus burn (re-OCR waste on a kill), encoding mangling, VLM hallucination needing >=2-model consensus. Free: Tesseract/pypdf docs, Szeliski Computer Vision free book, document-AI literature.' },
  { g: 'pdf-corpus-mill', owner: 'golf', gated: false, focus: 'mill-specific document-extraction practitioner gotchas (combines pdf-corpus OCR + mill-manual domain): table-extraction from a machining handbook losing column alignment, UNITS in a machining doc (inch vs mm in the same manual), OCR of a dimensioned drawing confusing diameter/radius symbols, parameter-table row mis-association, + the pdf-corpus multi-page/resume gotchas. Free: Tesseract/pypdf docs, free machining references. Cutting numerics stay owner-gated.' },
]

phase('MetaPractice')

function prompt({ g, owner, gated, focus }) {
  const safety = gated
    ? `\nR12 SAFETY: promote ONLY the qualitative method/failure-mode. NO numeric safety threshold (S(x)/Omega/SIL value). Gate any number.`
    : `\nCS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.`
  return `You are creating the Applied Practice wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from ${g}-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for ${g}: ${focus}${safety}

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-applied-practice.md
CREATED: <yes/no>
CITED_GOTCHAS: <count of WebFetch-confirmed practitioner claims>
SOURCES: <count of distinct source URLs confirmed>
NUMERICS_LEFT_GATED: <yes/no/n_a>
NOTE: <one line: the single most valuable gotcha this entry captures>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `metaprac:${entry.g}`, phase: 'MetaPractice' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`applied-practice-meta complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
