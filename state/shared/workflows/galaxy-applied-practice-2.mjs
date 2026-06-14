export const meta = {
  name: 'galaxy-applied-practice-2',
  description: 'Complete the Applied Practice (practitioner-knowledge / tribal) layer for the 6 NON-manufacturing domain galaxies (ai-training, database-expansion, frontend-app, business, quoting, academy) -- cited QUALITATIVE gotchas/failure-modes/technique. CS/software claims are papa-verifiable; business galaxies keep specific dollar-rates/ratios owner-gated. WAVE-CHUNKED 3/wave.',
  phases: [
    { title: 'Practice2', detail: 'waves of 3: WebFetch reputable free sources, cited gotchas, business numerics gated' },
  ],
}

const GALAXIES = [
  { g: 'ai-training', owner: 'india', gated: false, focus: 'ML / AI-systems practitioner gotchas: data leakage + train/test contamination, overfitting + val/test split discipline, class imbalance, RAG chunking + retrieval-eval pitfalls, LoRA rank / target-module choice, prompt-eval traps, distribution/covariate shift, single-seed metric variance (high-variance AUROC on small subgraphs -- matches PRISM multi-seed lesson). Free papa-verifiable software sources: d2l.ai, Hugging Face docs/learn, Google ML crash course / rules-of-ML, fast.ai, arXiv abstracts.' },
  { g: 'database-expansion', owner: 'juliett', gated: false, focus: 'database practitioner gotchas: N+1 query, missing vs over-indexing, lock contention + deadlock, transaction-isolation anomalies (dirty/non-repeatable/phantom read), migration pitfalls (long-held locks / blocking DDL), connection-pool exhaustion, vector-index (HNSW) recall vs build-time tuning, WAL/checkpoint + fsync durability. Free: PostgreSQL docs, SQLite docs, CMU 15-445, Use The Index Luke, Jepsen analyses.' },
  { g: 'frontend-app', owner: 'quebec', gated: false, focus: 'web frontend practitioner gotchas: unnecessary re-renders + memoization, stale-closure in hooks/effects, derived-vs-source state traps, SSR hydration mismatch, accessibility misses (focus management / ARIA / keyboard), list key-prop bugs, fetch waterfalls + race conditions, bundle bloat / code-splitting. Free: MDN, React/Next.js official docs, web.dev, WAI-ARIA APG.' },
  { g: 'business', owner: 'hotel', gated: true, focus: 'manufacturing-business practitioner gotchas: month-end close errors, cost-allocation distortion (volume-based overhead on low-volume/high-complexity), inventory valuation pitfalls (FIFO/LIFO/standard variance), AR/AP timing + cash-flow, ERP master-data integrity, KPI gaming / vanity metrics. Free: OpenStax Accounting/Managerial, MIT OCW 15.x, SBA/SCORE, NIST MEP. R12: keep specific dollar rates / ratios / percentages owner-gated.' },
  { g: 'quoting', owner: 'charlie', gated: true, focus: 'quoting/estimation practitioner gotchas: optimism bias / systematic under-quoting, scope-creep + change-order discipline, NRE amortization errors over batch size, setup-time underestimation, material yield/scrap allowance, quote-vs-actual feedback loop (the learning that prevents repeat misquotes), margin erosion. Free: OpenStax managerial accounting, NIST cost guide, SCORE/SBA. R12: keep specific rates/margins owner-gated.' },
  { g: 'academy', owner: 'lima', gated: false, focus: 'instructional-design / training practitioner gotchas: assessment validity vs reliability, cognitive-load overload, transfer failure (inert knowledge), expert blind-spot in instruction, feedback timing, spacing vs massed practice, motivation/retention, competency-vs-seat-time. Free: MIT OCW, OER Commons, NIMS, learning-science public sources (retrieval practice / spacing).' },
]

phase('Practice2')

function prompt({ g, owner, gated, focus }) {
  const safety = gated
    ? `\nR12: keep specific numeric dollar rates, margins, ratios, or percentages owner-gated (describe the QUALITATIVE relationship; gate the number). Promote the technique/gotcha, not a shop-specific number.`
    : `\nQualitative practitioner technique + gotchas. CS/software/ML claims here are papa-verifiable -- cite framework docs / courses / papers. Leave any benchmark-specific numbers owner-gated.`
  return `You are creating the Applied Practice wiki for the PRISM "${g}" galaxy (owner: ${owner}): knowledge/wiki/${g}/${g}-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won gotchas, FAILURE MODES, and TECHNIQUE DECISIONS a world-class ${g} practitioner has that pure theory does not teach. This is DISTINCT from ${g}-foundations.md (theory) and ${g}-source-atlas.md (link directory) if those exist -- read them first so you do not repeat them.

FOCUS for ${g}: ${focus}${safety}

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (framework official docs, university course, gov, reputable practitioner reference, arXiv). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Verification/eval"). Each = the gotcha + WHY + the expert's avoidance, source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: ${g}, owner_slot: ${owner}, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
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
    slice.map((entry) => () => agent(prompt(entry), { label: `practice2:${entry.g}`, phase: 'Practice2' }))
  )
  all.push(...waveResults)
}

const ok = all.filter(Boolean)
log(`applied-practice-2 complete: ${ok.length}/${GALAXIES.length} galaxies returned`)
return { returned: ok.length, total: GALAXIES.length, summaries: ok }
