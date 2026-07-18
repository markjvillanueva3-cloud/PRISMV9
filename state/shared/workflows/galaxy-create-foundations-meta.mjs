export const meta = {
  name: 'galaxy-create-foundations-meta',
  description: 'CREATE foundations wikis for the 17 meta/infra galaxies that map to real free-academic CS/engineering domains (OS, distributed systems, IR, software testing, compilers, information theory, visualization, NLP, CV). R12-gated; overlaps POINT to sibling foundations; compliance-safety is method-only with numeric thresholds gated. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'CreateMeta', detail: 'waves of 3: WebFetch free CS/eng academic sources, CREATE foundations, R12-gated' },
  ],
}

// 17 meta/infra galaxies WITHOUT foundations, each mapped to a genuine free-academic domain.
// pointTo = sibling foundations to reference (avoid duplication for overlapping galaxies).
// safetyGated = treat like a cutting galaxy: method/standards only, NO numeric thresholds.
const GALAXIES = [
  { g: 'fleet-hygiene', owner: 'golf', pointTo: '', safetyGated: false,
    domain: 'OS process lifecycle + distributed failure detection: the process/orphan/zombie/signal model, reaping a child vs an orphan, heartbeats, failure detectors, leader election, the split-brain problem. Free sources: OSTEP (Operating Systems: Three Easy Pieces, ostep.org -- free textbook, the process/scheduling/concurrency chapters), MIT 6.824 Distributed Systems lecture notes, the classic "Unreliable Failure Detectors" framing.' },
  { g: 'discovery', owner: 'tango', pointTo: '', safetyGated: false,
    domain: 'information retrieval + search + deduplication: inverted indexing, ranking (TF-IDF/BM25), near-duplicate detection (shingling/MinHash/LSH), anti-duplication. Free sources: "Mining of Massive Datasets" (mmds.org -- free book, the finding-similar-items + LSH chapters), Stanford CS276 Information Retrieval, the Manning/Raghavan/Schutze IR book (free online).' },
  { g: 'bug-hunting', owner: 'golf', pointTo: '', safetyGated: false,
    domain: 'software testing + static analysis + fault localization: test oracles, coverage criteria, silent-failure / no-op detection, static analysis, formal methods, assertion design. Free sources: MIT 6.005 / 6.031 Software Construction (testing + specs lectures), university software-testing courseware, NIST software-assurance.' },
  { g: 'system-viz', owner: 'sierra', pointTo: '', safetyGated: false,
    domain: 'information visualization + graph drawing: visual encoding channels, force-directed layout, large-graph navigation + level-of-detail, 3D rendering. Free sources: Munzner "Visualization Analysis & Design" concepts (free course materials), graph-drawing survey papers, WebGL/Three.js official docs.' },
  { g: 'backend-helper', owner: 'papa', pointTo: '', safetyGated: false,
    domain: 'compiler + type-system + build infrastructure: lexing/parsing, type checking + inference, module resolution (NodeNext .js suffix discipline), incremental compilation, dependency graphs. Free sources: Stanford CS143 Compilers, "Crafting Interpreters" (craftinginterpreters.com -- free online book), MIT 6.035, TAPL (Types and Programming Languages) concepts.' },
  { g: 'token-optimization', owner: 'alpha', pointTo: '', safetyGated: false,
    domain: 'information theory + compression + context economy: Shannon entropy, source coding theorem, lossless compression, the channel-capacity bound, context-window economy. Free sources: MIT 6.050J Information and Entropy (OCW), Cover & Thomas "Elements of Information Theory" concepts, Shannon 1948 "A Mathematical Theory of Communication" (free).' },
  { g: 'agent-orchestration', owner: 'zebra', pointTo: '', safetyGated: false,
    domain: 'multi-agent systems + distributed coordination: task decomposition, orchestrator-worker patterns, consensus, scheduling, deterministic coordination, failure handling. Free sources: MIT 6.824 Distributed Systems, multi-agent-systems courseware, the orchestrator-worker / map-reduce literature.' },
  { g: 'compliance-safety', owner: 'golf', pointTo: '', safetyGated: true,
    domain: 'functional safety + compliance methodology: hazard / risk assessment, safety integrity levels, audit-trail + traceability, the OSHA / ISO / IEC 61508 framing, defense-in-depth. SAFETY-CRITICAL: add ONLY the METHOD / STANDARD / framework; NEVER a numeric safety threshold (S(x), Omega, Cpk gate values) -- those live in state/shared/omega-thresholds.json + constants and stay owner-gated. Free sources: OSHA, NIST, ISO/IEC standards framing pages.' },
  { g: 'dormant-data', owner: 'victor', pointTo: '', safetyGated: false,
    domain: 'data lifecycle + storage management + garbage collection: hot/cold tiering, orphan/dead-data detection, GC algorithms (mark-sweep/generational), retention + reclamation. Free sources: OSTEP (free book, memory + persistence chapters), database-systems courseware on storage.' },
  { g: 'knowledge-conversion', owner: 'golf', pointTo: '', safetyGated: false,
    domain: 'knowledge representation + information extraction + NLP: parsing source material into structured knowledge, named-entity / relation extraction, ontologies, ETL. Free sources: Stanford CS224N NLP, MIT NLP courseware, knowledge-representation lecture notes.' },
  { g: 'corpus-aggregation', owner: 'golf', pointTo: 'discovery', safetyGated: false,
    domain: 'document processing + corpus construction + ETL: ingestion pipelines, text normalization, dedup, sharding, corpus statistics. Free sources: Stanford CS276, MMDS (free book). POINT to discovery-foundations for the shared IR/dedup theory rather than re-deriving it; keep THIS entry on the corpus-construction / ETL pipeline dimension.' },
  { g: 'wiring', owner: 'romeo', pointTo: '', safetyGated: false,
    domain: 'software architecture + dependency management: module systems, dependency graphs (DAG / topological order), dependency injection / wiring, coupling vs cohesion, build orchestration. Free sources: university software-architecture courseware, the dependency-injection + module-system literature, MIT 6.031 (designing for change).' },
  { g: 'tribal-knowledge', owner: 'golf', pointTo: '', safetyGated: false,
    domain: 'knowledge management + expertise capture + organizational learning: tacit-to-explicit conversion (the SECI model), lessons-learned / after-action systems, communities of practice, knowledge retention. Free sources: knowledge-management courseware, organizational-learning literature, the Nonaka SECI framing.' },
  { g: 'hermes-zulu', owner: 'zebra', pointTo: 'agent-orchestration', safetyGated: false,
    domain: 'agent-fleet orchestration: agent coordination, message passing, work allocation across a chat fleet, slot/lease management. Free sources: MIT 6.824, multi-agent courseware. POINT to agent-orchestration-foundations for the shared coordination theory; keep THIS entry on the fleet/slot-lease/message-bus dimension.' },
  { g: 'pdf-corpus', owner: 'golf', pointTo: 'blueprint-vision', safetyGated: false,
    domain: 'document analysis + OCR + PDF parsing + computer vision: the PDF object model, text vs raster extraction, OCR pipeline, layout analysis. Free sources: Szeliski "Computer Vision: Algorithms and Applications" (szeliski.org/Book -- free), OCR literature, the PDF spec. POINT to blueprint-vision-foundations for the vision/metrology spine; keep THIS entry on the PDF/document-extraction pipeline dimension.' },
  { g: 'pdf-corpus-mill', owner: 'golf', pointTo: 'pdf-corpus', safetyGated: false,
    domain: 'mill-domain document extraction: OCR + layout analysis specialized for milling PDFs (Haas/Mazak manuals, tool catalogs). Free sources: Szeliski Computer Vision (free book), OCR literature. POINT to pdf-corpus-foundations + blueprint-vision-foundations; keep THIS entry narrow on the mill-PDF-corpus specialization.' },
  { g: 'mit-curriculum', owner: 'lima', pointTo: 'academy-pedagogy', safetyGated: false,
    domain: 'open-courseware as a source corpus: the MIT OCW catalog structure, course-to-knowledge extraction, curriculum mapping. Free sources: MIT OpenCourseWare (ocw.mit.edu) catalog + Creative Commons licensing. POINT to academy-pedagogy-foundations for pedagogy theory; keep THIS entry on the MIT-OCW source-corpus catalog itself.' },
]

phase('CreateMeta')

function prompt({ g, owner, domain, pointTo, safetyGated }) {
  const ptr = pointTo ? `\nOVERLAP: this galaxy overlaps the "${pointTo}" galaxy. For the shared theory, POINT to knowledge/wiki/${pointTo}/${pointTo === 'academy-pedagogy' ? 'academy-pedagogy-foundations.md' : pointTo + '-foundations.md'} (read it first to confirm it exists) instead of re-deriving it. Keep THIS entry focused on what is distinct to ${g}.` : ''
  const safety = safetyGated ? `\nSAFETY-CRITICAL: add ONLY methodology / standards / framework. NEVER write a numeric safety threshold (S(x), Omega, Cpk gate value, exposure limit) -- those stay owner-gated in state/shared/omega-thresholds.json and the constants. If a source quotes one, name the source and gate it, do not promote the number.` : ''
  return `You are CREATING the foundations wiki for the PRISM "${g}" galaxy (owner: ${owner}) toward WORLD-LEADER encyclopedic breadth. This galaxy has NO foundations wiki yet -- create knowledge/wiki/${g}/${g}-foundations.md fresh.

DOMAIN (real free-academic CS/engineering grounding -- this is NOT padding): ${domain}${ptr}${safety}

ABSOLUTE RULES (R12 honesty -- a small honest entry beats a large fabricated one):
1. You may ONLY add a claim you CONFIRM by actually calling WebFetch on a free/legal source. Never fabricate a WebFetch result. If a fetch fails (403/404/TLS/timeout), retry once then either find an alternate reputable free source or leave that claim out and note it in the NOTE / Owner-gate.
2. PRIORITIZE the free college-course / free-textbook / gov categories named in the DOMAIN above. Aim for 8-14 WebFetch-confirmed claims across 4-6 themed sections. Map each piece of theory to how THIS PRISM galaxy uses it (one line per section is enough -- the engineering relevance).
3. Legal sources ONLY (no paywalled/pirated). All ASCII in code; markdown fine in the wiki body.
4. MIRROR the structure of knowledge/wiki/academy/academy-pedagogy-foundations.md: YAML frontmatter (title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-meta-create-workflow (2026-06-10)", verification_method, tags), intro, themed "## " sections each grounded in a cited WebFetched source, a "## Owner-gate (NOT promoted)" section, and a "## Sources" list of the distinct confirmed URLs.
5. Do NOT run git / commit. Do NOT register in the index (the main chat does that). If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-foundations.md
CREATED: <yes/no>
CONFIRMED_CLAIMS: <count of WebFetch-confirmed claims in the new file>
SOURCES: <count of distinct source URLs you WebFetched + confirmed>
COURSE_OR_BOOK_SOURCES: <count of those that are free college-course / free-textbook / gov-report sources>
SAFETY_THRESHOLDS_LEFT_GATED: <yes/no/n_a>
NOTE: <one line: the single most valuable thing the new foundations entry establishes>`
}

// drop the placeholder entry
const LIVE = GALAXIES.filter((e) => e.g !== 'knowledge-conversion-overlap-skip' && e.domain)

const WAVE = 3
const all = []
for (let i = 0; i < LIVE.length; i += WAVE) {
  const slice = LIVE.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(LIVE.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `meta:${entry.g}`, phase: 'CreateMeta' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`meta-create complete: ${ok.length}/${LIVE.length} galaxies returned`)
return { returned: ok.length, total: LIVE.length, summaries: ok }
