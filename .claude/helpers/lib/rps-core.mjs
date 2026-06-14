#!/usr/bin/env node
// rps-core.mjs — pure rock-paper-scissors arbitration primitives.
// COMMIT-COORD-MS0 / U-CC-RPS-CORE (2026-05-20, slot:foxtrot).
//
// Canonical home for the deterministic RPS math. No I/O, no side effects —
// safe to import from hooks, helpers, and tests. The commit coordinator uses
// rpsTournament() to pick the next commit-lane holder fairly + reproducibly.
//
// WHY DETERMINISTIC: two chats must agree on the RPS outcome WITHOUT both
// being interactively online to "throw" a play. Each chat's play is derived
// by sha256 from a shared seed + its own id, so any observer computes the
// same winner. This is the "auto rock-paper-scissors" — no human throws.
//
// LIVENESS: RPS can cycle (r>s>p>r). rps-arbitration.mjs THREW when 5 tie
// rounds all cycled — a latent liveness bug. rpsDuel() here cascades 8 tie
// rounds then falls back to a sha256 coin-flip, so it ALWAYS yields a winner.

import crypto from "node:crypto";

export const PLAYS = Object.freeze(["r", "p", "s"]);
export const PLAY_LABELS = Object.freeze({ r: "rock", p: "paper", s: "scissors" });

// Fixed prime stride applied to playerB's round counter in rpsDuel so the two
// sides hash decorrelated inputs (see rpsDuel for the full rationale).
const ROUND_STRIDE_B = 17;

/**
 * resolveWinner — single-round RPS outcome.
 * @param {"r"|"p"|"s"} playA
 * @param {"r"|"p"|"s"} playB
 * @returns {0|1|2} 0 = tie, 1 = playA wins, 2 = playB wins.
 */
export function resolveWinner(playA, playB) {
  if (playA === playB) return 0;
  if (
    (playA === "r" && playB === "s") ||
    (playA === "p" && playB === "r") ||
    (playA === "s" && playB === "p")
  ) {
    return 1;
  }
  return 2;
}

/**
 * deterministicTieBreak — derive a stable r/p/s play from a seed + round.
 * @param {string} baseSeed
 * @param {number} roundNumber
 * @returns {"r"|"p"|"s"}
 */
export function deterministicTieBreak(baseSeed, roundNumber) {
  const digest = crypto
    .createHash("sha256")
    .update(`${baseSeed}|round:${roundNumber}`)
    .digest("hex");
  return PLAYS[Number.parseInt(digest.slice(0, 8), 16) % 3];
}

/**
 * rpsDuel — fully deterministic 2-player RPS. Each player's play is derived
 * from `seed|player`. Ties cascade through up to 8 deterministic tie-break
 * rounds; if every round still cycles, a sha256 coin-flip guarantees a total
 * order (RPS can cycle, so a hard fallback is required for liveness).
 *
 * @param {string} playerA
 * @param {string} playerB
 * @param {string} seed  shared seed both sides agree on (e.g. "commit-lane|2026-05-20|7")
 * @returns {{winner:string, loser:string, rounds:object[], resolution:string}}
 */
export function rpsDuel(playerA, playerB, seed) {
  if (playerA === playerB) {
    throw new Error("rpsDuel: playerA and playerB must differ");
  }
  const rounds = [];
  for (let round = 1; round <= 8; round += 1) {
    // playerB's round counter is offset by a fixed prime stride so the two
    // sides draw decorrelated play streams — without it both players would
    // hash near-identical inputs and tie every round until the fallback.
    const playA = deterministicTieBreak(`${seed}|${playerA}`, round);
    const playB = deterministicTieBreak(`${seed}|${playerB}`, round + ROUND_STRIDE_B);
    const outcome = resolveWinner(playA, playB);
    rounds.push({ round, playA, playB, outcome });
    if (outcome === 1) {
      return { winner: playerA, loser: playerB, rounds, resolution: `round-${round}` };
    }
    if (outcome === 2) {
      return { winner: playerB, loser: playerA, rounds, resolution: `round-${round}` };
    }
  }
  // Hard fallback — deterministic coin flip on the seed (guarantees liveness).
  const flip = crypto
    .createHash("sha256")
    .update(`${seed}|flip|${playerA}|${playerB}`)
    .digest("hex");
  const aWins = Number.parseInt(flip.slice(0, 8), 16) % 2 === 0;
  return {
    winner: aWins ? playerA : playerB,
    loser: aWins ? playerB : playerA,
    rounds,
    resolution: "sha256-coinflip",
  };
}

/**
 * rpsTournament — deterministic total-order ranking of N participants via a
 * round-robin RPS tournament. Every pair plays rpsDuel(); wins are tallied;
 * participants rank by win-count descending, ties broken by a stable
 * sha256(seed|id) key so the ordering is reproducible across machines.
 *
 * @param {string[]} participants  chat ids contending for the lane
 * @param {string} seed
 * @returns {{ranked:string[], wins:Record<string,number>, duels:object[]}}
 */
export function rpsTournament(participants, seed) {
  const ids = [
    ...new Set((participants || []).filter((p) => typeof p === "string" && p.length > 0)),
  ];
  if (ids.length <= 1) {
    return { ranked: ids, wins: Object.fromEntries(ids.map((i) => [i, 0])), duels: [] };
  }
  const wins = Object.fromEntries(ids.map((i) => [i, 0]));
  const duels = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const d = rpsDuel(ids[i], ids[j], seed);
      wins[d.winner] += 1;
      duels.push({ a: ids[i], b: ids[j], winner: d.winner, resolution: d.resolution });
    }
  }
  const tieKey = (id) =>
    crypto.createHash("sha256").update(`${seed}|tie|${id}`).digest("hex");
  const ranked = [...ids].sort((x, y) => {
    if (wins[y] !== wins[x]) return wins[y] - wins[x];
    const kx = tieKey(x);
    const ky = tieKey(y);
    return kx < ky ? -1 : kx > ky ? 1 : 0;
  });
  return { ranked, wins, duels };
}
