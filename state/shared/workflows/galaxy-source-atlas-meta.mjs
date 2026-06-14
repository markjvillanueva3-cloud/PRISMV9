export const meta = {
  name: 'galaxy-source-atlas-meta',
  description: 'Open Source Atlas (living free-source curriculum: free college courses, free textbooks, free archives/data, lecture-video channels, official docs, standards) for the 14 meta/infra + cross-cutting galaxies that have foundations+applied-practice but NO source-atlas yet (fleet-hygiene, discovery, bug-hunting, system-viz, backend-helper, token-optimization, agent-orchestration, compliance-safety, dormant-data, knowledge-conversion, wiring, tribal-knowledge, frontend-app, database-expansion). WebFetch-VERIFIED links only; drop dead ones (R12). WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'MetaAtlas', detail: 'waves of 3: WebFetch reputable free CS/eng curricula, verified-live links only' },
  ],
}

const GALAXIES = [
  { g: 'fleet-hygiene', owner: 'golf', focus: 'OS + distributed-systems process-lifecycle curriculum: OSTEP (free full PDF, ostep.org), MIT 6.824 Distributed Systems (free lecture videos + papers), Linux man pages (wait(2)/signal(7)/kill(2)), Brendan Gregg systems-performance (free book/site), POSIX spec.' },
  { g: 'discovery', owner: 'tango', focus: 'Information Retrieval + near-dedup curriculum: Stanford CS276, Manning/Raghavan/Schutze Intro to IR (free online), MMDS Mining Massive Datasets (free book + course), Apache Lucene docs, MinHash/LSH primary literature.' },
  { g: 'bug-hunting', owner: 'golf', focus: 'software-testing + static-analysis curriculum: MIT 6.031/6.005 (OCW), Google Testing Blog, NIST SAMATE, mutation-testing literature (PIT/Stryker docs), property-based-testing (Hypothesis/QuickCheck docs).' },
  { g: 'system-viz', owner: 'sierra', focus: 'data-visualization + graph-drawing curriculum: Tamara Munzner Visualization Analysis & Design course/materials, d3js docs, WebGL Fundamentals, Handbook of Graph Drawing, force-directed/Barnes-Hut literature, observablehq.' },
  { g: 'backend-helper', owner: 'papa', focus: 'TypeScript + compilers + build-systems curriculum: TypeScript Handbook (official), Crafting Interpreters (free online book), Stanford CS143 Compilers, Node.js NodeNext/ESM docs, esbuild docs.' },
  { g: 'token-optimization', owner: 'alpha', focus: 'information-theory + compression curriculum: MIT 6.050J Information & Entropy (OCW), Shannon 1948 A Mathematical Theory of Communication, Cover & Thomas Elements of Information Theory, Anthropic prompt-caching docs, data-compression references.' },
  { g: 'agent-orchestration', owner: 'zebra', focus: 'distributed-coordination + consensus curriculum: MIT 6.824 (videos+labs), Raft paper + raft.github.io, MapReduce/Dynamo/Bigtable papers, Kleppmann Designing Data-Intensive Applications references, lease/lock literature.' },
  { g: 'compliance-safety', owner: 'golf', focus: 'safety-engineering + functional-safety curriculum (METHOD ONLY, gate any number): Nancy Leveson Engineering a Safer World (free MIT PDF) + STAMP/STPA, IEC 61508 overviews, NIST CSRC, OSHA standards, ALARP/fail-safe literature. R12: NO numeric SIL/threshold.' },
  { g: 'dormant-data', owner: 'victor', focus: 'garbage-collection + storage-lifecycle curriculum: OSTEP (memory/free-space), CMU 15-445 Database Systems (free Pavlo videos), GC Handbook references, PostgreSQL MVCC/VACUUM docs, reference-counting vs tracing literature.' },
  { g: 'knowledge-conversion', owner: 'golf', focus: 'NLP + information-extraction + ETL curriculum: Stanford CS224N (free videos+notes), Jurafsky & Martin Speech and Language Processing (free draft), spaCy docs (NER), relation-extraction literature, ETL best-practice references.' },
  { g: 'wiring', owner: 'romeo', focus: 'dependency-injection + build-systems + software-architecture curriculum: MIT 6.031 Software Construction, Build Systems a la Carte paper, dependency-injection literature (Fowler), topological-sort/DAG references, Bazel/build-graph docs.' },
  { g: 'tribal-knowledge', owner: 'golf', focus: 'knowledge-management + organizational-learning curriculum: Nonaka & Takeuchi SECI / The Knowledge-Creating Company, organizational-learning literature, KM open resources, communities-of-practice (Wenger), absorptive-capacity references.' },
  { g: 'frontend-app', owner: 'quebec', focus: 'modern web-development curriculum: MDN Web Docs, web.dev (Google), official React docs, MIT 6.031, WCAG/ARIA accessibility specs, TanStack Query docs, Next.js docs.' },
  { g: 'database-expansion', owner: 'juliett', focus: 'database-systems curriculum: CMU 15-445/645 (free Andy Pavlo videos), MIT 6.830/6.814, Readings in Database Systems (the Red Book, free online), Use The Index Luke, PostgreSQL docs, HNSW/vector-index literature.' },
  { g: 'hermes-zulu', owner: 'zebra', focus: 'multi-agent orchestration curriculum (agent-fleet master orchestrator -- the sibling of agent-orchestration but focused on the FLEET/agent layer): MIT 6.824 distributed-systems, multi-agent-systems literature, official docs for agent frameworks (LangGraph, AutoGen, CrewAI), the ReAct/Reflexion/orchestrator-worker agent papers on arXiv, leader-election/coordination references.' },
  { g: 'corpus-aggregation', owner: 'golf', focus: 'data-engineering + ETL/aggregation curriculum (feeds discovery/academy/NN -- the sibling of discovery but focused on the ETL/aggregation layer): free data-engineering courses, Apache Airflow + dbt official docs, ETL/ELT best-practice references, data-pipeline/data-quality literature, batch-vs-stream processing.' },
  { g: 'mit-curriculum', owner: 'lima', focus: 'open-courseware SOURCE curriculum (this galaxy IS the MIT-OCW course corpus feeding academy): MIT OpenCourseWare (ocw.mit.edu), OCW Scholar self-study courses, OER Commons, Creative Commons education licensing, OpenStax, the OCW course-catalog itself as the living source.' },
  { g: 'cad-fusion-live', owner: 'delta', focus: 'live parametric CAD curriculum (long-running CAD/Fusion session -- the sibling of cad but focused on the live-session/automation layer): Autodesk Fusion + Inventor official learning, free parametric-CAD courses, FreeCAD docs, CAD-automation/API references, points to cad-source-atlas for the core CAD theory.' },
  { g: 'pdf-corpus', owner: 'xray', focus: 'OCR + document-extraction curriculum (the PDF extraction corpus -- the sibling of blueprint-vision but focused on the document-corpus layer): Tesseract OCR docs, pypdf/pdfminer official docs, document-AI/layout-analysis literature, the Szeliski Computer Vision free book (OCR chapters), datasets like RVL-CDIP/FUNSD, points to blueprint-vision-source-atlas.' },
  { g: 'pdf-corpus-mill', owner: 'golf', focus: 'mill-specific document-extraction curriculum (mill PDF/manual corpus -- combines pdf-corpus OCR with mill machining docs): free machining handbooks/references (Machinery Handbook excerpts where free, Haas/Mazak public manuals), OCR docs (Tesseract/pypdf), points to BOTH pdf-corpus-source-atlas and mill-source-atlas for the parent domains.' },
]

phase('MetaAtlas')

function prompt({ g, owner, focus }) {
  return `You are creating the Open Source Atlas wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-source-atlas.md.

PURPOSE: the LIVING-SOURCE curriculum -- a curated, kept-fresh directory of WHERE TO KEEP LEARNING this galaxy's domain from reputable FREE/LEGAL sources, so the knowledge never goes stagnant. DISTINCT from ${g}-foundations.md (synthesized theory) and ${g}-applied-practice.md (practitioner gotchas) -- read both first so you do not repeat them; this entry is the "keep-learning directory": free college courses, free textbooks, free archives/data, reputable lecture-video channels/playlists, official docs, and standards.

FOCUS for ${g}: ${focus}

ABSOLUTE RULES (R12 honesty):
1. ONLY list a source you CONFIRM is real, free/legal, and reachable by WebFetch. Never fabricate a URL or a course number. If a fetch fails, retry once then DROP it -- do not guess a link. A short verified list beats a long fabricated one.
2. Organize into 4-6 themed sections (e.g. Free college courses / Free textbooks / Lecture-video channels / Official docs & standards / Data & archives / Keep-fresh cadence). For each source: name + verified URL + one line on what it teaches + which part of THIS galaxy it feeds.
3. Legal free sources ONLY (no paywalled, no LibGen/SciHub). All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-source-atlas-meta (2026-06-10)", verification_method, tags. End with a "## Keep-fresh cadence" note + "## Sources" (the distinct confirmed URLs).
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-source-atlas.md
CREATED: <yes/no>
VERIFIED_SOURCES: <count of WebFetch-confirmed live free sources>
DEAD_DROPPED: <count of candidate links dropped because unreachable/unconfirmable>
NOTE: <one line: the single highest-value living source this atlas points at>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `metaatlas:${entry.g}`, phase: 'MetaAtlas' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`source-atlas-meta complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
