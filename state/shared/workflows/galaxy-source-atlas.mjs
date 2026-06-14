export const meta = {
  name: 'galaxy-source-atlas',
  description: 'CREATE a per-galaxy Open Source Atlas wiki -- a curated, WebFetch-verified directory of the best FREE LIVING resources (free college course series, free textbooks, archives, gov data-report portals, reputable lecture-video channels, standards bodies) so each galaxy has a non-stagnant "keep learning" curriculum. Distinct from foundations (which synthesizes claims). R12: only list links you confirm resolve. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'Atlas', detail: 'waves of 3: WebFetch-verify the best free living sources, organize by type, R12-link-verified' },
  ],
}

// 14 deep-domain galaxies with rich free living-source ecosystems.
const GALAXIES = [
  { g: 'mill', owner: 'foxtrot', topic: 'milling / machining processes' },
  { g: 'lathe', owner: 'whiskey', topic: 'turning / lathe machining' },
  { g: 'wedm', owner: 'mike', topic: 'wire/sinker electrical-discharge machining' },
  { g: 'cam', owner: 'kilo', topic: 'computer-aided manufacturing / toolpath strategy' },
  { g: 'speed-feed', owner: 'oscar', topic: 'metal-cutting mechanics / speeds and feeds physics' },
  { g: 'post-processor', owner: 'echo', topic: 'CNC G-code / RS-274 / controller post-processing' },
  { g: 'cad', owner: 'delta', topic: 'computer-aided design / solid modeling / geometry' },
  { g: 'blueprint-vision', owner: 'xray', topic: 'engineering drawings / GD&T / machine vision / metrology' },
  { g: 'quoting', owner: 'charlie', topic: 'manufacturing cost estimation / job-order costing / quoting' },
  { g: 'business', owner: 'hotel', topic: 'manufacturing business / accounting / ERP / operations management' },
  { g: 'quality', owner: 'quality-owner', topic: 'quality engineering / SPC / metrology / process capability' },
  { g: 'shop-floor', owner: 'shop-floor-owner', topic: 'shop-floor operations / OEE / MES / lean / industrial safety' },
  { g: 'academy', owner: 'lima', topic: 'manufacturing/machining education / pedagogy / workforce training' },
  { g: 'ai-training', owner: 'india', topic: 'machine learning / GNN / LoRA / RAG / deep learning systems' },
]

phase('Atlas')

function prompt({ g, owner, topic }) {
  return `Create the Open Source Atlas wiki for the PRISM "${g}" galaxy (owner: ${owner}, domain: ${topic}): knowledge/wiki/${g}/${g}-source-atlas.md.

PURPOSE: a curated, VERIFIED directory of the best FREE + LEGAL LIVING resources for ${topic} -- so the galaxy has a non-stagnant "keep-learning" curriculum that stays current because it points to continuously-updated sources. This is DISTINCT from knowledge/wiki/${g}/${g}-foundations.md (read it first -- the atlas must NOT just repeat the foundations' Sources list; the atlas curates BROADER living resources: full course series, textbook homepages, data portals, lecture-video series, standards landing pages).

CONTEXT (R8 -- do not duplicate existing work): a bulk free-source corpus already exists at state/shared/specs/GALAXY-FREE-SOURCE-CORPUS-2026-06-09.md (flat pointers, NOT auto-invoked). This atlas is the CURATED + VERIFIED + auto-invokable per-galaxy form -- pick the best ~15-25 LIVING sources, verify each resolves, organize by type. Do NOT re-dump that corpus; ADD value by verifying + curating + type-organizing the strongest continuously-updated sources.

ORGANIZE the atlas into these "## " sections (include a section only if you find verified entries for it):
- ## Free college courses (full course / lecture-series homepages: MIT OCW, NPTEL, Stanford/CMU/Berkeley open courseware, edX/Coursera audit-free)
- ## Free textbooks & references (OpenStax, LibreTexts, Gutenberg, official open-license docs, free PDFs)
- ## Archives & open data / gov reports (NIST, NASA, DOE, BLS, archive.org, gov data portals -- the "data reports" the operator wants)
- ## Lecture series & video (reputable YouTube lecture channels / recorded seminars -- name the channel + topic, link the channel or a representative playlist)
- ## Standards & authoritative bodies (ISO/ASME/ANSI/OSHA/IEC landing pages relevant to ${topic})

Each entry = a markdown bullet: source name + URL + one-line "what it is good for in ${topic}".

ABSOLUTE RULES (R12 honesty):
1. ONLY list a resource after you WebFetch its URL and CONFIRM it resolves to the relevant content. Never list a URL you did not verify resolves. If a fetch fails, drop it. (You are verifying the LINK is live + on-topic; you do not need to extract claims.)
2. Legal + free ONLY (no paywalled/pirated; audit-free / open-license / gov / public-domain). For YouTube, name reputable educational channels you can confirm exist (e.g. via the channel/about page or a known playlist URL) -- do NOT fabricate channel names or video IDs.
3. Aim for 12-25 verified entries across the sections. Quality + currency over quantity -- prefer sources that are continuously updated.
4. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-source-atlas (2026-06-10)", verification_method (note you verified each link resolves), tags. End with a "## Maintenance" note: this atlas should be re-verified periodically (link-rot) -- name that as the freshness mechanism.
5. NO physics/cutting constants (irrelevant -- this is a link directory). All ASCII in code; markdown fine in the body.
6. Do NOT run git/commit, do NOT register in the index (the main chat does that). If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: knowledge/wiki/${g}/${g}-source-atlas.md
CREATED: <yes/no>
VERIFIED_LINKS: <count of links you WebFetched + confirmed resolve>
SECTIONS: <count of sections with at least one entry>
DEAD_LINKS_DROPPED: <count of URLs you tried that failed + were dropped>
NOTE: <one line: the single best living-source this atlas surfaces for the galaxy>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `atlas:${entry.g}`, phase: 'Atlas' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`atlas complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
