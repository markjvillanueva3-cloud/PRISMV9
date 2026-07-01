export const meta = {
  name: 'galaxy-resource-atlas-domain',
  description: 'Per-galaxy RESOURCE-ATLAS (fused easy-access index) for the 9 non-primary DOMAIN galaxies that have real external/local resources (quoting, business, academy, ai-training, database-expansion, frontend-app, quality, shop-floor, cad-fusion-live): LOCAL trove pointers (pre-seeded, verified) + curated YouTube channels/seminars/data-reports (WebFetch-verified) + reputable online, cross-linking the domains foundations/source-atlas/applied-practice/advanced-techniques. Operator: all reputable sources linked for easy access, do not stay stagnant. WAVE-CHUNKED 3/wave. The ~17 pure-meta/infra galaxies are deliberately deferred -- their source-atlas already IS their resource index (R7: a separate one would duplicate).',
  phases: [
    { title: 'ResourceAtlas', detail: 'waves of 3: local pointers (given) + WebFetch-verified YouTube/seminars/data + online' },
  ],
}

// LOCAL pointers are pre-seeded from known PRISM stores/corpora so agents LINK real paths, never fabricate.
// For thinner ones the source-atlas IS the primary resource index; the atlas then adds the video/seminar/data half.
const GALAXIES = [
  { g: 'quoting', owner: 'charlie', local: 'mcp-server/data/vendor-catalog-db/ (425 vendors + 77 catalog-vendors + JM procurement $4.91M); DocuStrata pricing index (manifest.json + .index, never re-OCR); JM DIE/ quote + financial records; resources/MANUFACTURER_CATALOGS(365) for cost basis', youtube: 'manufacturing estimating / cost-engineering channels + free webinars (SME, AMT/IMTS talks, Gardner/Modern Machine Shop, NTMA estimating webinars)', online: 'reputable free: cost-estimating handbooks (NASA Cost Estimating Handbook), AACE International open resources, BLS PPI material-price data reports' },
  { g: 'business', owner: 'hotel', local: 'JM DIE/ business + financial records; mcp-server/data/vendor-catalog-db/ JM procurement; prism_business dispatcher domain data', youtube: 'operations-management / lean / TOC channels + free seminars (MIT Sloan/Stanford GSB open lectures, Lean Enterprise Institute, AGI Goldratt TOC talks)', online: 'free: OpenStax Principles of Management/Financial Accounting, MIT OCW Sloan 15.x, SBA + SCORE small-business guides, BLS/Census economic data reports' },
  { g: 'academy', owner: 'lima', local: 'resources/MIT COURSES(1106); pdf-corpus pypdf 8,752-page extraction corpus (lima pypdf page-by-page extractor); academy engine course-0a..60 (63 ids)', youtube: 'open-courseware + instructional-design channels (MIT OpenCourseWare, Khan Academy, freeCodeCamp, Veritasium/3Blue1Brown for pedagogy reference)', online: 'free: MIT OCW, OpenStax, MERLOT, OER Commons, Bloom taxonomy + mastery-learning literature, Carl Wieman science-education resources' },
  { g: 'ai-training', owner: 'india', local: 'state/shared/nn-graph/ (GNN ref-pool + node-embeddings-768d.jsonl); LoRA datasets (vault-to-lora-dataset.mjs Alpaca triples); RAG corpus + tribal-embed-index; mcp-server/data/state/ model checkpoints', youtube: 'ML/DL channels + free lectures (Stanford CS229/CS224N/CS231N, Andrej Karpathy Zero-to-Hero, DeepLearning.AI, Hugging Face)', online: 'free: d2l.ai Dive into Deep Learning, fast.ai, Hugging Face course, arXiv (LoRA 2106.09685, RAG 2005.11401), Papers with Code' },
  { g: 'database-expansion', owner: 'juliett', local: 'Qdrant + AgentDB + SQLite-WAL + JSONL + state-JSON persistence stores; mcp-server/data/state/ (BASELINE_INVENTORY, HEALTH_CHECK_REPORT); mcp-server/data/vendor-catalog-db/', youtube: 'database-internals channels + free lectures (CMU 15-445/15-721 Andy Pavlo, MIT 6.830, Use-The-Index-Luke talks)', online: 'free: CMU Database Group courses, Use The Index Luke, PostgreSQL docs, The Red Book (Readings in Database Systems), HNSW/vector-search papers' },
  { g: 'frontend-app', owner: 'quebec', local: 'mcp-server/web/ (Next.js 15 App Router, ~18 routes, lib/api.ts -> HTTP bridge :3100); pending merges cqask/ui + mcp-cadquery/frontend; Recharts/TanStack/Zustand stack', youtube: 'frontend/React channels + free conf talks (web.dev, React Conf, Fireship, Josh Comeau, Theo)', online: 'free: MDN Web Docs, web.dev (Core Web Vitals), React docs, Patterns.dev, MIT 6.031 Software Construction, WCAG/WAI-ARIA' },
  { g: 'quality', owner: 'golf', local: 'prism_business quality actions (Cpk/SPC gates, numerics gated to golf/constants); quality galaxy MEMORY.md; JM DIE/ inspection records', youtube: 'SPC / Six Sigma / metrology channels + free webinars (ASQ webinars, NIST, Quality Digest, Hexagon/Mitutoyo metrology talks)', online: 'free: NIST/SEMATECH e-Handbook of Statistical Methods, ASQ open resources, Montgomery SPC reference, NIST metrology guides', note: 'R12: NO numeric Cpk/sigma/control-limit promoted -- link the method/source, thresholds stay owner-gated to golf.' },
  { g: 'shop-floor', owner: 'golf', local: 'shop-floor engine (live machine status -> adaptive + ERP); JM DIE/ 21-machine fleet config (ShopConfigurationEngine); MES/OEE telemetry stores', youtube: 'lean-manufacturing / TPM / MES channels + free seminars (Lean Enterprise Institute, Gemba Academy free content, MTConnect Institute, IMTS talks)', online: 'free: NIST manufacturing resources, MTConnect open standard docs, lean.org, OSHA machine-safety, takt/SMED/TPM references', note: 'R12: NO numeric OEE/availability threshold promoted -- method/standard only, thresholds owner-gated to golf.' },
  { g: 'cad-fusion-live', owner: 'delta', local: 'JM DIE/FUSION CAD AND CAM FILES(9746); resources/FUSION360(275); points at [[cad-resource-atlas]] (shares the CAD local trove -- Freecad/SOLIDWORKS/Inventor/DWG)', youtube: 'Fusion 360 API / parametric-automation channels (Autodesk Fusion, Autodesk Platform Services, Lars Christensen, FreeCAD scripting)', online: 'free: Autodesk Fusion API docs + Fusion 360 API samples, FreeCAD Python scripting wiki, parametric-design references' },
]

phase('ResourceAtlas')

function prompt({ g, owner, local, youtube, online, note }) {
  return `You are creating the RESOURCE-ATLAS wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-resource-atlas.md.

PURPOSE (operator directive -- all reputable sources linked for EASY ACCESS, do not stay stagnant): a single easy-access index that links EVERY resource for this domain -- the LOCAL stores/corpora, curated YouTube + free seminars/webinars + data reports, and reputable free online -- so a chat in this galaxy jumps straight to what it needs. This FUSES the local half (given) with the online/video half. It is DISTINCT from [[${g}-source-atlas]] (which is the free-college-course/textbook curriculum): the resource-atlas adds the LOCAL trove pointers + the video/seminar/data-report half + a one-stop cross-link hub.

LOCAL TROVE / STORES (pre-known -- LINK these exactly, do NOT fabricate or re-count; pathway = store/corpus + its index):
${local}

YOUTUBE + SEMINARS to curate (WebFetch-VERIFY each before listing -- channel/playlist/page must resolve; drop on 404 after one retry): ${youtube}
REPUTABLE FREE ONLINE to curate (same verify rule): ${online}
Prefer official + reputable educator/standards sources; FREE + LEGAL only (no LibGen/SciHub).${note ? '\n' + note : ''}

ABSOLUTE RULES (R12):
1. LOCAL section: reproduce the given store/corpus pointers verbatim (verified). For YouTube/online: ONLY list a source you CONFIRM resolves via WebFetch; drop dead ones (retry once). Never fabricate a URL.
2. Cross-link the sibling wiki layers: [[${g}-foundations]] (theory), [[${g}-source-atlas]] (free courses/books), [[${g}-applied-practice]] (gotchas), [[${g}-advanced-techniques]] (world-leader strategy), plus [[primary-domain-resource-map]] + [[prism-methodology-foundations]].
3. R12 SAFETY: promote NO numeric cutting constant / Cpk / OEE / safety threshold -- link the method/source, the number stays owner-gated to ${owner} + constants.ts.
4. Sections: Local stores+corpora / Curated YouTube + seminars / Reputable free online + data reports / Cross-links / Keep-fresh cadence. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-resource-atlas (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-resource-atlas.md
CREATED: <yes/no>
LOCAL_POINTERS_LINKED: <count>
YOUTUBE_VERIFIED: <count of WebFetch-confirmed>
ONLINE_VERIFIED: <count>
NOTE: <one line: the single highest-value resource this atlas surfaces for the domain>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `resatlas:${entry.g}`, phase: 'ResourceAtlas' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`resource-atlas-domain complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
