export const meta = {
  name: 'galaxy-deepen-foundations',
  description: 'Deepen each galaxy foundations wiki toward world-leader breadth using the operator full free-source list (college courses/free books/gov reports/seminars/articles); create ai-training. R12-gated, no physics constants. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'Deepen', detail: 'waves of 3: WebFetch broader free sources, append confirmed depth sections, R12-gated' },
  ],
}

// 14 galaxies. ai-training = CREATE (no foundations yet); rest = DEEPEN existing.
// physics galaxies: only method/structure/standards depth, NEVER numeric cutting constants.
const GALAXIES = [
  { g: 'ai-training', owner: 'india', physics: false, file: 'knowledge/wiki/ai-training/ai-training-foundations.md', mode: 'CREATE' },
  { g: 'academy', owner: 'lima', physics: false, file: 'knowledge/wiki/academy/academy-pedagogy-foundations.md', mode: 'DEEPEN' },
  { g: 'business', owner: 'hotel', physics: false, file: 'knowledge/wiki/business/business-foundations.md', mode: 'DEEPEN' },
  { g: 'quoting', owner: 'charlie', physics: false, file: 'knowledge/wiki/quoting/quoting-foundations.md', mode: 'DEEPEN' },
  { g: 'quality', owner: 'quality-owner', physics: false, file: 'knowledge/wiki/quality/quality-foundations.md', mode: 'DEEPEN' },
  { g: 'shop-floor', owner: 'shop-floor-owner', physics: false, file: 'knowledge/wiki/shop-floor/shop-floor-foundations.md', mode: 'DEEPEN' },
  { g: 'blueprint-vision', owner: 'xray', physics: false, file: 'knowledge/wiki/blueprint-vision/blueprint-vision-foundations.md', mode: 'DEEPEN' },
  { g: 'cad', owner: 'delta', physics: false, file: 'knowledge/wiki/cad/cad-foundations.md', mode: 'DEEPEN' },
  { g: 'post-processor', owner: 'echo', physics: true, file: 'knowledge/wiki/post-processor/post-processor-foundations.md', mode: 'DEEPEN' },
  { g: 'speed-feed', owner: 'oscar', physics: true, file: 'knowledge/wiki/speed-feed/speed-feed-foundations.md', mode: 'DEEPEN' },
  { g: 'mill', owner: 'foxtrot', physics: true, file: 'knowledge/wiki/mill/mill-foundations.md', mode: 'DEEPEN' },
  { g: 'lathe', owner: 'whiskey', physics: true, file: 'knowledge/wiki/lathe/lathe-foundations.md', mode: 'DEEPEN' },
  { g: 'wedm', owner: 'mike', physics: true, file: 'knowledge/wiki/wedm/wedm-foundations.md', mode: 'DEEPEN' },
  { g: 'cam', owner: 'kilo', physics: true, file: 'knowledge/wiki/cam/cam-foundations.md', mode: 'DEEPEN' },
]

phase('Deepen')

function prompt({ g, owner, physics, file, mode }) {
  const physicsRule = physics
    ? `SAFETY-CRITICAL GALAXY. Add ONLY: formula STRUCTURE/geometry, process METHOD, mechanism/theory (qualitative), standards/vendor framing. NEVER add a numeric cutting constant (kc1.1 / specific cutting force / Taylor C,n / material constants / specific speeds/feeds/SFM/IPR/chip-loads) -- those live ONLY in mcp-server/src/physics/constants.ts and stay owner-gated. Deepen the METHOD/theory/standards coverage, not the numbers.`
    : `Non-physics galaxy. Add institutional / standards / methodology / process / theory depth. Leave specific dollar rates, control limits, or any unconfirmed number owner-gated.`
  const modeRule = mode === 'CREATE'
    ? `This galaxy has NO foundations wiki yet. CREATE ${file} fresh (mirror the structure of knowledge/wiki/academy/academy-pedagogy-foundations.md: YAML frontmatter with status VERIFIED-PARTIAL + verified_by "papa-deepen-workflow (2026-06-09)", themed sections of WebFetch-confirmed claims with citations, an "## Owner-gate (NOT promoted)" section, a "## Sources" list). Read its packet first: knowledge/wiki/${g}/_staging/deep-domain-research-2026-06-09.md . For ai-training the domain is AI/ML systems (GNN/GraphSAGE/LoRA/RAG/deep-learning) -- WebFetch-confirm AI/software claims (these are papa-verifiable, e.g. arXiv papers, framework docs), NOT physics.`
    : `This galaxy already has ${file} (a small verified subset). DEEPEN it: APPEND new themed sections of additional WebFetch-confirmed content, broadening source coverage. Do NOT rewrite or remove existing content -- only append + extend the "## Sources" list. Read the existing file first to avoid duplication.`
  return `You are deepening the PRISM "${g}" galaxy foundations wiki toward WORLD-LEADER encyclopedic breadth (owner: ${owner}). The operator wants each galaxy filled with as much VERIFIED content as possible, pulled from the FULL breadth of free + legal sources: **free college courses (MIT OCW + other .edu courseware), free textbooks (OpenStax/Gutenberg/public PDFs), government data reports (NIST/NASA/DOE/BLS), standards bodies, reputable seminars / conference papers / YouTube-lecture transcripts, and technical articles.**

ABSOLUTE RULES (R12 honesty -- a small honest addition beats a large fabricated one):
1. You may ONLY add a claim you CONFIRM by actually calling WebFetch on a free/legal source. Never fabricate a WebFetch result or assert an unchecked claim. If a fetch fails (403/TLS/timeout), retry once then leave that claim out.
2. PRIORITIZE source categories the existing entry has NOT used yet -- reach for free COLLEGE COURSES (MIT OCW lecture pages), free TEXTBOOKS (OpenStax etc.), and GOV DATA REPORTS (NIST/NASA/DOE), not just vendor blogs. Aim to add 4-8 newly-confirmed claims across 2-4 new themed sections.
3. ${physicsRule}
4. ${modeRule}
5. Legal sources ONLY (no paywalled/pirated -- no LibGen/SciHub). All ASCII in code; markdown fine in the wiki.
6. Do NOT run git / commit. The main chat commits. If a file-claim hook blocks an edit, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: ${file}
MODE: ${mode}
ADDED_CLAIMS: <count of newly WebFetch-confirmed claims you added>
NEW_SOURCES: <count of distinct NEW source URLs you WebFetched + confirmed>
COURSE_OR_BOOK_SOURCES: <count of those that are free college-course / free-textbook / gov-report sources (the untapped categories)>
SAFETY_CONSTANTS_LEFT_GATED: <yes/no/n_a>
NOTE: <one line: the single most valuable thing you added>`
}

const WAVE = 3
const all = []
for (let i = 0; i < GALAXIES.length; i += WAVE) {
  const slice = GALAXIES.slice(i, i + WAVE)
  log(`wave ${Math.floor(i / WAVE) + 1}/${Math.ceil(GALAXIES.length / WAVE)}: ${slice.map((e) => e.g).join(', ')}`)
  const waveResults = await parallel(
    slice.map((entry) => () => agent(prompt(entry), { label: `deepen:${entry.g}`, phase: 'Deepen' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`deepen complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
