export const meta = {
  name: 'tournament-rank',
  description: 'Pattern 9 (ultracode) — rank N candidates by PAIRWISE comparison instead of absolute scoring. The single-elimination + placement bracket lives in deterministic JS (never re-injected into agent context); each match is one isolated agent() judging exactly two candidates against a rubric. Beats sort-by-score: comparison is more reliable than absolute calibration, and the bracket survives any candidate-set size. TEMPLATE — adapt the rubric/candidates per task; do not run verbatim.',
  phases: [
    { title: 'Seed', detail: 'normalize candidate list + build the bracket in code' },
    { title: 'Compete', detail: 'one agent() per pairwise match — judge picks the winner against the rubric' },
    { title: 'Rank', detail: 'fold match results into a final ordering (winner + runner-up placement)' },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// ARGS CONTRACT (pass via Workflow `args`, or edit the DEFAULTS below):
//   args.candidates : Array<{ id?: string, label: string, content: string }>   (>=2)
//   args.rubric     : string  — what "better" means; the judge grades pairs against this
//   args.judgeModel : string  — optional model override for the judge agent (default: inherit)
//   args.stubJudge  : boolean — TEST MODE: skip agent() calls, pick the candidate whose
//                               `content` has the higher leading integer (deterministic).
//                               Used by the verification channel; never set in real runs.
// Returns: { ranked: [{rank, id, label, wins, losses}], winner, matches, bracketRounds }
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULTS = {
  candidates: [
    { id: 'a', label: 'Candidate A', content: '1 baseline' },
    { id: 'b', label: 'Candidate B', content: '2 improved' },
  ],
  rubric: 'Which candidate better satisfies the stated goal? Prefer correctness, then completeness, then clarity.',
  judgeModel: null,
  stubJudge: false,
}

const cfg = {
  candidates: (args && Array.isArray(args.candidates) && args.candidates.length >= 2) ? args.candidates : DEFAULTS.candidates,
  rubric: (args && typeof args.rubric === 'string' && args.rubric.trim()) ? args.rubric : DEFAULTS.rubric,
  judgeModel: (args && args.judgeModel) || DEFAULTS.judgeModel,
  stubJudge: !!(args && args.stubJudge),
}

// R12 fail-loud on a malformed candidate set rather than silently ranking garbage.
for (let i = 0; i < cfg.candidates.length; i++) {
  const c = cfg.candidates[i]
  if (!c || typeof c.label !== 'string' || typeof c.content !== 'string') {
    throw new Error(`tournament-rank: candidate[${i}] must be {label:string, content:string} — got ${JSON.stringify(c)}`)
  }
  if (!c.id) c.id = `c${i}`
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['winnerId', 'reason'],
  properties: {
    winnerId: { type: 'string', description: 'the id of the candidate that wins THIS pair' },
    reason: { type: 'string', description: 'one-sentence justification grounded in the rubric' },
  },
}

phase('Seed')
const pool = cfg.candidates.slice()
const wins = Object.fromEntries(pool.map((c) => [c.id, 0]))
const losses = Object.fromEntries(pool.map((c) => [c.id, 0]))
const matches = []
log(`tournament-rank: ${pool.length} candidate(s), stubJudge=${cfg.stubJudge}`)

// The bracket is a deterministic JS structure — the whole point of Pattern 9 is that
// the orchestrator never holds it in its context window. Two regimes, both bracket-in-code:
//   n<=8  → full round-robin (O(n^2)): every distinct pair is one match → exact, transitivity-robust.
//   n>8   → single-elimination ladder (O(n log n)): resolved live in the Compete phase, because
//           each round's pairs depend on the prior round's judged winners (unknown until run).
// roundRobinPairs() is the only precomputable bracket (used for the n<=8 path).
function roundRobinPairs(ids) {
  const pairs = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]])
  }
  return pairs
}

const byId = Object.fromEntries(pool.map((c) => [c.id, c]))

async function judgePair(idA, idB) {
  const a = byId[idA]
  const b = byId[idB]
  if (cfg.stubJudge) {
    // deterministic: higher leading integer in content wins; tie → first id
    const na = parseInt(String(a.content).trim(), 10)
    const nb = parseInt(String(b.content).trim(), 10)
    const winnerId = (Number.isFinite(nb) && (!Number.isFinite(na) || nb > na)) ? idB : idA
    return { winnerId, reason: `stub: ${a.content} vs ${b.content}` }
  }
  const v = await agent(
    `You are an impartial judge. You have NEVER seen which candidate was produced by whom — judge ONLY on the rubric.\n\nRUBRIC: ${cfg.rubric}\n\n--- CANDIDATE [${idA}] ${a.label} ---\n${a.content}\n\n--- CANDIDATE [${idB}] ${b.label} ---\n${b.content}\n\nPick the single better candidate. Return its id (${idA} or ${idB}).`,
    { label: `match:${idA}-vs-${idB}`, phase: 'Compete', schema: VERDICT_SCHEMA, ...(cfg.judgeModel ? { model: cfg.judgeModel } : {}) },
  )
  // A hallucinated/invalid verdict must NOT silently advantage idA (the lower-seed-index is always
  // the left element of every pair → that would be a deterministic seed bias under repeated judge
  // failure). Return winnerId:null → caller records NO match (neither candidate gains/loses) and logs.
  if (!v || (v.winnerId !== idA && v.winnerId !== idB)) {
    log(`match:${idA}-vs-${idB} — judge returned invalid id; recording NO result (no seed bias)`)
    return { winnerId: null, reason: v?.reason || 'invalid-verdict' }
  }
  return { winnerId: v.winnerId, reason: v.reason || 'n/a' }
}

function recordMatch(idA, idB, winnerId) {
  if (winnerId == null) {
    // invalid verdict — record the match as a no-result (neither candidate gains/loses); no seed bias.
    matches.push({ a: idA, b: idB, winner: null })
    return
  }
  const loserId = winnerId === idA ? idB : idA
  wins[winnerId]++
  losses[loserId]++
  matches.push({ a: idA, b: idB, winner: winnerId })
}

phase('Compete')
let bracketRounds = 0
let championId = null // the bracket winner — last survivor (ladder) or most-wins (round-robin)
const ids = pool.map((c) => c.id)

if (ids.length <= 8) {
  // round-robin: all pairs are independent → run concurrently (parallel barrier)
  const pairs = roundRobinPairs(ids)
  bracketRounds = 1
  const results = await parallel(pairs.map(([x, y]) => () => judgePair(x, y).then((r) => ({ x, y, r }))))
  for (const res of results.filter(Boolean)) recordMatch(res.x, res.y, res.r.winnerId)
  // round-robin champion = most wins (tiebreak: fewest losses, then seed) — set below from ranked[0]
} else {
  // single-elimination ladder: each round depends on the previous → sequential rounds,
  // but matches WITHIN a round run concurrently. Bracket state stays in this JS scope.
  let cur = ids.slice()
  while (cur.length > 1) {
    bracketRounds++
    const pairs = []
    const byes = []
    for (let i = 0; i < cur.length; i += 2) {
      if (i + 1 < cur.length) pairs.push([cur[i], cur[i + 1]])
      else byes.push(cur[i])
    }
    const roundResults = await parallel(pairs.map(([x, y]) => () => judgePair(x, y).then((r) => ({ x, y, r }))))
    const advance = byes.slice()
    for (const res of roundResults.filter(Boolean)) {
      recordMatch(res.x, res.y, res.r.winnerId)
      // A single-elimination slot MUST be filled — on a no-result verdict the bracket still
      // needs one to advance. recordMatch already logged + recorded no win/loss; we advance the
      // first candidate here purely to keep the bracket structurally valid (no standings bias,
      // since neither got a win). This is the one place a no-result still picks a survivor.
      advance.push(res.r.winnerId ?? res.x)
    }
    cur = advance
  }
  championId = cur[0] // last survivor IS the bracket champion (byes mean it may not have the most wins)
}

phase('Rank')
// Standings: by wins desc, then losses asc, then seed order (stable).
// CAVEAT (Pattern 9 subtlety): in single-elimination, the bracket CHAMPION is the last
// survivor — NOT necessarily the most-wins candidate, because byes give the top seed fewer
// matches. So we pin the champion to rank 1 explicitly, then rank the rest by standings.
// In round-robin every candidate plays every other, so most-wins === champion naturally.
const seedOrder = Object.fromEntries(ids.map((id, i) => [id, i]))
const standings = pool
  .slice()
  .sort((p, q) => (wins[q.id] - wins[p.id]) || (losses[p.id] - losses[q.id]) || (seedOrder[p.id] - seedOrder[q.id]))
if (championId == null) championId = standings[0].id // round-robin: champion = top of standings
const ordered = [byId[championId], ...standings.filter((c) => c.id !== championId)]
const ranked = ordered.map((c, i) => ({ rank: i + 1, id: c.id, label: c.label, wins: wins[c.id], losses: losses[c.id] }))

const winner = ranked[0]
log(`tournament-rank: winner = [${winner.id}] ${winner.label} (${winner.wins}W/${winner.losses}L) over ${matches.length} match(es)`)

return { ranked, winner, matches, bracketRounds }
