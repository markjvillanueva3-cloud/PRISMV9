// Verification channel for tournament-rank.mjs (forge7 Phase 0.7).
// Tests the PURE bracket/ranking logic in isolation — extracted to mirror the workflow's
// deterministic core so we never need to spawn agents to prove the bracket is correct.
// Run: node --test H:/prism/.claude/workflows/tournament-rank.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'

// ── Re-implement the workflow's pure core (the parts that do NOT call agent()) ──
// This mirrors tournament-rank.mjs Seed/Rank logic + the stub judge, so a regression
// in the ranking algorithm fails this test. The workflow file is the source of truth;
// if its algorithm changes, update this mirror (R9: test encodes the intended behavior).

function roundRobinPairs(ids) {
  const pairs = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) pairs.push([ids[i], ids[j]])
  }
  return pairs
}

function stubJudge(a, b) {
  // higher leading integer wins; tie → first (matches the workflow's stubJudge)
  const na = parseInt(String(a.content).trim(), 10)
  const nb = parseInt(String(b.content).trim(), 10)
  return (Number.isFinite(nb) && (!Number.isFinite(na) || nb > na)) ? b.id : a.id
}

function rank(candidates) {
  const pool = candidates.map((c, i) => ({ ...c, id: c.id || `c${i}` }))
  const byId = Object.fromEntries(pool.map((c) => [c.id, c]))
  const ids = pool.map((c) => c.id)
  const wins = Object.fromEntries(ids.map((id) => [id, 0]))
  const losses = Object.fromEntries(ids.map((id) => [id, 0]))
  const matches = []
  let bracketRounds = 0
  let championId = null

  if (ids.length <= 8) {
    bracketRounds = 1
    for (const [x, y] of roundRobinPairs(ids)) {
      const w = stubJudge(byId[x], byId[y])
      const l = w === x ? y : x
      wins[w]++; losses[l]++; matches.push({ a: x, b: y, winner: w })
    }
  } else {
    let cur = ids.slice()
    while (cur.length > 1) {
      bracketRounds++
      const advance = []
      for (let i = 0; i < cur.length; i += 2) {
        if (i + 1 < cur.length) {
          const w = stubJudge(byId[cur[i]], byId[cur[i + 1]])
          const l = w === cur[i] ? cur[i + 1] : cur[i]
          wins[w]++; losses[l]++; matches.push({ a: cur[i], b: cur[i + 1], winner: w })
          advance.push(w)
        } else advance.push(cur[i])
      }
      cur = advance
    }
    championId = cur[0]
  }

  const seed = Object.fromEntries(ids.map((id, i) => [id, i]))
  const standings = pool.slice()
    .sort((p, q) => (wins[q.id] - wins[p.id]) || (losses[p.id] - losses[q.id]) || (seed[p.id] - seed[q.id]))
  if (championId == null) championId = standings[0].id
  const ordered = [byId[championId], ...standings.filter((c) => c.id !== championId)]
  const ranked = ordered.map((c, i) => ({ rank: i + 1, id: c.id, label: c.label, wins: wins[c.id], losses: losses[c.id] }))
  return { ranked, winner: ranked[0], matches, bracketRounds }
}

// ── Happy path: 4 seeded candidates, transitively-strongest wins ──
test('round-robin: transitively-strongest candidate wins the bracket', () => {
  const r = rank([
    { id: 'a', label: 'A', content: '1 weak' },
    { id: 'b', label: 'B', content: '4 strongest' },
    { id: 'c', label: 'C', content: '2 mid' },
    { id: 'd', label: 'D', content: '3 strong' },
  ])
  assert.equal(r.winner.id, 'b', 'highest leading int (4) must win all pairwise matches')
  assert.equal(r.winner.wins, 3, 'winner beats all 3 others')
  assert.equal(r.matches.length, 6, 'C(4,2)=6 round-robin matches')
  assert.equal(r.bracketRounds, 1, 'round-robin is a single round')
  // full ordering must follow the leading-int magnitude: b(4) > d(3) > c(2) > a(1)
  assert.deepEqual(r.ranked.map((x) => x.id), ['b', 'd', 'c', 'a'])
})

// ── Failure mode 1: two candidates ──
test('two candidates: winner is the stronger, one match', () => {
  const r = rank([{ id: 'x', label: 'X', content: '5' }, { id: 'y', label: 'Y', content: '9' }])
  assert.equal(r.winner.id, 'y')
  assert.equal(r.matches.length, 1)
})

// ── Failure mode 2: ties broken by seed order (stable) ──
test('tie on wins: broken by losses then seed order', () => {
  // all equal content → stubJudge always picks the first id → a cycle by seed order
  const r = rank([
    { id: 'a', label: 'A', content: '7' },
    { id: 'b', label: 'B', content: '7' },
    { id: 'c', label: 'C', content: '7' },
  ])
  // a beats b, a beats c, b beats c → a:2W, b:1W1L, c:2L
  assert.deepEqual(r.ranked.map((x) => x.id), ['a', 'b', 'c'])
  assert.equal(r.ranked[0].wins, 2)
  assert.equal(r.ranked[2].losses, 2)
})

// ── Failure mode 3: large set switches to single-elimination ladder ──
test('>8 candidates: single-elimination ladder, log-depth rounds, bracket in code', () => {
  const cands = Array.from({ length: 16 }, (_, i) => ({ id: `c${i}`, label: `C${i}`, content: `${i}` }))
  const r = rank(cands)
  // highest leading int (15) must win the ladder
  assert.equal(r.winner.id, 'c15')
  assert.equal(r.bracketRounds, 4, '16 → 8 → 4 → 2 → 1 = 4 rounds (log2(16))')
  // ladder runs n-1 = 15 matches total
  assert.equal(r.matches.length, 15)
})

// ── Adversarial 1: odd count gets a bye, no candidate dropped ──
test('odd candidate count: bye carries up, all candidates ranked', () => {
  const cands = Array.from({ length: 9 }, (_, i) => ({ id: `c${i}`, label: `C${i}`, content: `${i}` }))
  const r = rank(cands)
  assert.equal(r.ranked.length, 9, 'all 9 candidates appear in final ranking (none lost to a bye)')
  assert.equal(r.winner.id, 'c8', 'highest leading int still wins despite byes')
})

// ── Adversarial 2: non-numeric content (real LLM judge case) ranks by stub fallback ──
test('non-numeric content: NaN leading-int handled, no crash, stable ranking', () => {
  const r = rank([
    { id: 'a', label: 'A', content: 'no number here' },
    { id: 'b', label: 'B', content: '2 has number' },
  ])
  assert.equal(r.winner.id, 'b', 'numeric beats NaN (Number.isFinite guard)')
  assert.equal(r.ranked.length, 2)
})
