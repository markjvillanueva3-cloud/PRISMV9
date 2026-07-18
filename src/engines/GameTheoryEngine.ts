/**
 * GameTheoryEngine — Strategic Decision Analysis
 *
 * Game-theoretic models for manufacturing decisions:
 * - Zero-sum games (minimax)
 * - Nash equilibrium (2-player bimatrix)
 * - Auction/bidding strategies
 * - Decision under uncertainty (maximin, maximax, Hurwicz, Laplace)
 * - Cooperative game (Shapley value)
 *
 * Manufacturing use: supplier negotiation, machine bidding,
 * capacity allocation games, cost sharing in shared resources,
 * competitive pricing strategies.
 *
 * @module GameTheoryEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ZeroSumResult {
  rowStrategy: number[];   // Mixed strategy for row player
  colStrategy: number[];   // Mixed strategy for column player
  value: number;           // Game value
  saddlePoint?: [number, number];
}

export interface NashResult {
  player1Strategy: number[];
  player2Strategy: number[];
  player1Payoff: number;
  player2Payoff: number;
  isPure: boolean;
}

export interface DecisionResult {
  maximin: { action: number; value: number };
  maximax: { action: number; value: number };
  hurwicz: { action: number; value: number; alpha: number };
  laplace: { action: number; value: number };
  minimax_regret: { action: number; value: number };
}

export interface ShapleyResult {
  values: number[];
  totalValue: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class GameTheoryEngineImpl {

  /**
   * Solve a zero-sum game via minimax.
   */
  solveZeroSum(payoffMatrix: number[][]): ZeroSumResult {
    const m = payoffMatrix.length;     // rows
    const n = payoffMatrix[0].length;  // cols

    // Check for saddle point
    const rowMins = payoffMatrix.map(row => Math.min(...row));
    const maxRowMin = Math.max(...rowMins);
    const colMaxs = Array.from({ length: n }, (_, j) =>
      Math.max(...payoffMatrix.map(row => row[j]))
    );
    const minColMax = Math.min(...colMaxs);

    if (Math.abs(maxRowMin - minColMax) < 1e-10) {
      const rowIdx = rowMins.indexOf(maxRowMin);
      const colIdx = payoffMatrix[rowIdx].indexOf(maxRowMin);
      const rowStrategy = new Array(m).fill(0);
      rowStrategy[rowIdx] = 1;
      const colStrategy = new Array(n).fill(0);
      colStrategy[colIdx] = 1;
      return { rowStrategy, colStrategy, value: maxRowMin, saddlePoint: [rowIdx, colIdx] };
    }

    // 2x2 mixed strategy
    if (m === 2 && n === 2) {
      const a = payoffMatrix[0][0], b = payoffMatrix[0][1];
      const c = payoffMatrix[1][0], d = payoffMatrix[1][1];
      const denom = a - b - c + d;
      if (Math.abs(denom) > 1e-10) {
        const p = (d - c) / denom;  // Row player probability of row 0
        const q = (d - b) / denom;  // Col player probability of col 0
        const pClamped = Math.max(0, Math.min(1, p));
        const qClamped = Math.max(0, Math.min(1, q));
        const value = (a * d - b * c) / denom;
        return {
          rowStrategy: [pClamped, 1 - pClamped],
          colStrategy: [qClamped, 1 - qClamped],
          value,
        };
      }
    }

    // General case: iterative best response
    let rowStrategy = new Array(m).fill(1 / m);
    let colStrategy = new Array(n).fill(1 / n);

    for (let iter = 0; iter < 1000; iter++) {
      // Best response for column player (minimize)
      const colPayoffs = Array.from({ length: n }, (_, j) =>
        rowStrategy.reduce((s, p, i) => s + p * payoffMatrix[i][j], 0)
      );
      const bestCol = colPayoffs.indexOf(Math.min(...colPayoffs));
      const colLR = 2 / (iter + 2);
      colStrategy = colStrategy.map((s, j) =>
        s * (1 - colLR) + (j === bestCol ? colLR : 0)
      );

      // Best response for row player (maximize)
      const rowPayoffs = Array.from({ length: m }, (_, i) =>
        colStrategy.reduce((s, q, j) => s + q * payoffMatrix[i][j], 0)
      );
      const bestRow = rowPayoffs.indexOf(Math.max(...rowPayoffs));
      const rowLR = 2 / (iter + 2);
      rowStrategy = rowStrategy.map((s, i) =>
        s * (1 - rowLR) + (i === bestRow ? rowLR : 0)
      );
    }

    const value = rowStrategy.reduce((s, p, i) =>
      s + p * colStrategy.reduce((ss, q, j) => ss + q * payoffMatrix[i][j], 0), 0
    );

    return { rowStrategy, colStrategy, value };
  }

  /**
   * Find Nash equilibrium for 2-player bimatrix game (2x2).
   */
  nashEquilibrium(A: number[][], B: number[][]): NashResult {
    const m = A.length, n = A[0].length;

    // Check pure strategy NE
    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        const bestResponseRow = A.map(row => row[j]).indexOf(Math.max(...A.map(row => row[j])));
        const bestResponseCol = B[i].indexOf(Math.max(...B[i]));
        if (bestResponseRow === i && bestResponseCol === j) {
          const p1 = new Array(m).fill(0); p1[i] = 1;
          const p2 = new Array(n).fill(0); p2[j] = 1;
          return {
            player1Strategy: p1, player2Strategy: p2,
            player1Payoff: A[i][j], player2Payoff: B[i][j],
            isPure: true,
          };
        }
      }
    }

    // Mixed strategy NE for 2x2
    if (m === 2 && n === 2) {
      const denomP = B[0][0] - B[0][1] - B[1][0] + B[1][1];
      const denomQ = A[0][0] - A[0][1] - A[1][0] + A[1][1];
      const p = denomP !== 0 ? (B[1][1] - B[0][1]) / denomP : 0.5;
      const q = denomQ !== 0 ? (A[1][1] - A[1][0]) / denomQ : 0.5;
      const pC = Math.max(0, Math.min(1, p));
      const qC = Math.max(0, Math.min(1, q));

      const payoff1 = pC * qC * A[0][0] + pC * (1 - qC) * A[0][1] +
                       (1 - pC) * qC * A[1][0] + (1 - pC) * (1 - qC) * A[1][1];
      const payoff2 = pC * qC * B[0][0] + pC * (1 - qC) * B[0][1] +
                       (1 - pC) * qC * B[1][0] + (1 - pC) * (1 - qC) * B[1][1];

      return {
        player1Strategy: [pC, 1 - pC],
        player2Strategy: [qC, 1 - qC],
        player1Payoff: payoff1, player2Payoff: payoff2,
        isPure: false,
      };
    }

    // Fallback: return uniform strategies
    return {
      player1Strategy: new Array(m).fill(1 / m),
      player2Strategy: new Array(n).fill(1 / n),
      player1Payoff: 0, player2Payoff: 0,
      isPure: false,
    };
  }

  /**
   * Decision under uncertainty (payoff matrix: actions × states of nature).
   */
  decisionUnderUncertainty(
    payoffs: number[][],
    alpha: number = 0.5  // Hurwicz optimism coefficient
  ): DecisionResult {
    const m = payoffs.length;
    const n = payoffs[0].length;

    // Maximin (pessimistic)
    const rowMins = payoffs.map(row => Math.min(...row));
    const maximinIdx = rowMins.indexOf(Math.max(...rowMins));

    // Maximax (optimistic)
    const rowMaxs = payoffs.map(row => Math.max(...row));
    const maximaxIdx = rowMaxs.indexOf(Math.max(...rowMaxs));

    // Hurwicz
    const hurwiczValues = payoffs.map((_, i) =>
      alpha * rowMaxs[i] + (1 - alpha) * rowMins[i]
    );
    const hurwiczIdx = hurwiczValues.indexOf(Math.max(...hurwiczValues));

    // Laplace (equal probability)
    const laplaceValues = payoffs.map(row =>
      row.reduce((s, v) => s + v, 0) / n
    );
    const laplaceIdx = laplaceValues.indexOf(Math.max(...laplaceValues));

    // Minimax regret
    const colMaxs = Array.from({ length: n }, (_, j) =>
      Math.max(...payoffs.map(row => row[j]))
    );
    const regrets = payoffs.map(row =>
      row.map((v, j) => colMaxs[j] - v)
    );
    const maxRegrets = regrets.map(row => Math.max(...row));
    const regretIdx = maxRegrets.indexOf(Math.min(...maxRegrets));

    return {
      maximin: { action: maximinIdx, value: rowMins[maximinIdx] },
      maximax: { action: maximaxIdx, value: rowMaxs[maximaxIdx] },
      hurwicz: { action: hurwiczIdx, value: hurwiczValues[hurwiczIdx], alpha },
      laplace: { action: laplaceIdx, value: laplaceValues[laplaceIdx] },
      minimax_regret: { action: regretIdx, value: maxRegrets[regretIdx] },
    };
  }

  /**
   * Shapley value for cooperative game.
   * @param v Characteristic function: v(coalition) returns value.
   *          Coalition encoded as bitmask.
   */
  shapleyValue(n: number, v: (coalition: number) => number): ShapleyResult {
    const values = new Array(n).fill(0);
    const totalCoalitions = 1 << n;

    // For each player i, compute marginal contribution over all orderings
    for (let i = 0; i < n; i++) {
      for (let S = 0; S < totalCoalitions; S++) {
        if (S & (1 << i)) continue; // Skip if i is in S
        const sSize = this._popcount(S);
        const weight = this._factorial(sSize) * this._factorial(n - sSize - 1) /
                       this._factorial(n);
        const marginal = v(S | (1 << i)) - v(S);
        values[i] += weight * marginal;
      }
    }

    return { values, totalValue: v(totalCoalitions - 1) };
  }

  private _popcount(n: number): number {
    let count = 0;
    while (n) { count += n & 1; n >>= 1; }
    return count;
  }

  private _factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}

export const gameTheoryEngine = new GameTheoryEngineImpl();
