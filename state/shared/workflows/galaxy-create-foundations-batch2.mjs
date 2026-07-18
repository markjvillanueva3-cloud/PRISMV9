export const meta = {
  name: 'galaxy-create-foundations-batch2',
  description: 'CREATE foundations wikis for the 3 domain galaxies that have a genuine external free-academic domain but no foundations yet (frontend-app, database-expansion, cad-fusion-live). R12-gated, WebFetch-confirmed free college/textbook/gov sources only. Single wave of 3.',
  phases: [
    { title: 'Create', detail: '3 galaxies in one wave: WebFetch free academic sources, CREATE foundations wiki, R12-gated' },
  ],
}

// 3 domain galaxies WITHOUT a foundations wiki but WITH a real external academic domain.
// (The other ~17 non-foundations galaxies are pure meta/infra -- fleet-hygiene, discovery,
//  wiring, bug-hunting, system-viz, agent-orchestration, etc. -- with NO free-academic
//  domain, so a "free-source foundations" for them would be padding, not content. Excluded
//  deliberately per R12.)
const GALAXIES = [
  {
    g: 'frontend-app', owner: 'quebec',
    file: 'knowledge/wiki/frontend-app/frontend-app-foundations.md',
    domain: 'web/front-end software engineering: HTML/CSS/JS semantics, the DOM + rendering pipeline, component architecture, state management, accessibility (WCAG/WAI-ARIA), HTTP/REST/fetch, software construction discipline, testing. Reach for FREE college courseware (MIT 6.031 Software Construction, MIT 6.005, other .edu web courses), MDN Web Docs (CC-licensed reference), web.dev / W3C / WHATWG living standards, freeCodeCamp curriculum, framework docs (React/Next.js official). These are papa-verifiable software claims.',
  },
  {
    g: 'database-expansion', owner: 'juliett',
    file: 'knowledge/wiki/database-expansion/database-expansion-foundations.md',
    domain: 'database systems & persistence: relational model + normalization, ACID transactions, isolation levels, indexing (B-tree/LSM/HNSW), query processing, the WAL + recovery, replication/consistency (CAP, linearizability), vector search. Reach for FREE college courseware (CMU 15-445 Database Systems by Andy Pavlo, MIT 6.830/6.814, Stanford CS145), the free "Readings in Database Systems" (Red Book), PostgreSQL/SQLite official docs, Jepsen consistency analyses, NIST. These are papa-verifiable software/CS claims.',
  },
  {
    g: 'cad-fusion-live', owner: 'delta',
    file: 'knowledge/wiki/cad-fusion-live/cad-fusion-live-foundations.md',
    domain: 'live/long-running parametric CAD modeling sessions (Fusion-style): parametric feature history + the feature tree, constraint-based sketching (geometric + dimensional constraints, degrees of freedom), direct vs parametric modeling, assembly mates, the timeline/rollback model, associativity. This OVERLAPS the cad galaxy: for the underlying solid-modeling MATH (B-rep/NURBS/CSG) POINT to knowledge/wiki/cad/cad-foundations.md rather than re-deriving it -- keep THIS entry focused on the live-session / parametric-history / constraint-solver workflow dimension. Reach for FREE college courseware (MIT 2.158J Computational Geometry, other .edu CAD/parametric-modeling courses), NIST MBE / DMSC, public CAD-kernel / constraint-solver literature.',
  },
]

phase('Create')

function prompt({ g, owner, file, domain }) {
  return `You are CREATING the foundations wiki for the PRISM "${g}" galaxy (owner: ${owner}) toward WORLD-LEADER encyclopedic breadth. This galaxy has NO foundations wiki yet -- create ${file} fresh.

DOMAIN: ${domain}

ABSOLUTE RULES (R12 honesty -- a small honest entry beats a large fabricated one):
1. You may ONLY add a claim you CONFIRM by actually calling WebFetch on a free/legal source. Never fabricate a WebFetch result or assert an unchecked claim. If a fetch fails (403/TLS/timeout), retry once then leave that claim out and note it.
2. PRIORITIZE the untapped high-authority categories: FREE COLLEGE COURSES (.edu courseware / lecture pages), FREE TEXTBOOKS / reference (MDN, OpenStax, official docs under open licenses), and GOV/STANDARDS reports. Aim for 8-15 WebFetch-confirmed claims across 4-6 themed sections.
3. Legal sources ONLY (no paywalled/pirated -- no LibGen/SciHub). All ASCII in code; markdown fine in the wiki body.
4. MIRROR the structure of the existing exemplar knowledge/wiki/academy/academy-pedagogy-foundations.md: YAML frontmatter (title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-create-workflow (2026-06-10)", verification_method, tags), an intro paragraph, themed "## " sections each grounded in a cited WebFetched source, a "## Owner-gate (NOT promoted)" section for anything ${owner} must verify, and a "## Sources" list with the distinct URLs you confirmed.
5. Do NOT run git / commit. The main chat commits. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: ${g}
FILE: ${file}
CREATED: <yes/no>
CONFIRMED_CLAIMS: <count of WebFetch-confirmed claims in the new file>
SOURCES: <count of distinct source URLs you WebFetched + confirmed>
COURSE_OR_BOOK_SOURCES: <count of those that are free college-course / free-textbook / gov-report sources>
NOTE: <one line: the single most valuable thing the new foundations entry establishes>`
}

const results = await parallel(
  GALAXIES.map((entry) => () => agent(prompt(entry), { label: `create:${entry.g}`, phase: 'Create' }))
)

const ok = results.filter(Boolean)
log(`create complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
