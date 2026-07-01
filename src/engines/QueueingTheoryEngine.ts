/**
 * QueueingTheoryEngine — Manufacturing Queue Analysis
 *
 * Queueing theory models for production system analysis:
 * - M/M/1 (single server, Poisson arrivals, exponential service)
 * - M/M/c (multi-server)
 * - M/M/1/K (finite buffer)
 * - M/G/1 (general service, Pollaczek-Khinchine)
 * - Network of queues (Jackson network)
 * - WIP analysis (Little's Law)
 *
 * Manufacturing use: machine utilization, WIP prediction, bottleneck
 * identification, buffer sizing, production line balancing, lead time
 * estimation.
 *
 * @module QueueingTheoryEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QueueMetrics {
  utilization: number;     // ρ = λ/μ (or λ/cμ)
  Lq: number;             // Average queue length
  Ls: number;             // Average system size
  Wq: number;             // Average wait time
  Ws: number;             // Average system time
  P0: number;             // Probability of empty system
  throughput: number;      // Effective throughput
  stable: boolean;
}

export interface MM1KMetrics extends QueueMetrics {
  Pk: number;             // Probability system full
  effectiveLambda: number; // Effective arrival rate
  lossRate: number;        // Rejection rate
}

export interface JacksonNetwork {
  nodes: {
    servers: number;
    serviceRate: number;
  }[];
  routingMatrix: number[][];  // P[i][j] = prob of routing from i to j
  externalArrivals: number[]; // λ_i external arrivals
}

export interface NetworkMetrics {
  nodeMetrics: QueueMetrics[];
  totalWIP: number;
  totalThroughput: number;
  bottleneck: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class QueueingTheoryEngineImpl {

  /**
   * M/M/1 queue analysis.
   */
  mm1(lambda: number, mu: number): QueueMetrics {
    const rho = lambda / mu;
    const stable = rho < 1;

    if (!stable) {
      return {
        utilization: rho, Lq: Infinity, Ls: Infinity,
        Wq: Infinity, Ws: Infinity, P0: 0,
        throughput: mu, stable: false,
      };
    }

    const Ls = rho / (1 - rho);
    const Lq = rho * rho / (1 - rho);
    const Ws = 1 / (mu - lambda);
    const Wq = rho / (mu - lambda);
    const P0 = 1 - rho;

    return { utilization: rho, Lq, Ls, Wq, Ws, P0, throughput: lambda, stable: true };
  }

  /**
   * M/M/c queue (c parallel servers).
   */
  mmc(lambda: number, mu: number, c: number): QueueMetrics {
    const rho = lambda / (c * mu);
    const a = lambda / mu; // Offered load

    if (rho >= 1) {
      return {
        utilization: rho, Lq: Infinity, Ls: Infinity,
        Wq: Infinity, Ws: Infinity, P0: 0,
        throughput: c * mu, stable: false,
      };
    }

    // P0 calculation
    let sum = 0;
    for (let n = 0; n < c; n++) {
      sum += Math.pow(a, n) / this._factorial(n);
    }
    sum += Math.pow(a, c) / (this._factorial(c) * (1 - rho));
    const P0 = 1 / sum;

    // Erlang C formula
    const erlangC = (Math.pow(a, c) / this._factorial(c)) * (1 / (1 - rho)) * P0;

    const Lq = erlangC * rho / (1 - rho);
    const Wq = Lq / lambda;
    const Ws = Wq + 1 / mu;
    const Ls = lambda * Ws;

    return { utilization: rho, Lq, Ls, Wq, Ws, P0, throughput: lambda, stable: true };
  }

  /**
   * M/M/1/K queue (finite buffer of size K).
   */
  mm1k(lambda: number, mu: number, K: number): MM1KMetrics {
    const rho = lambda / mu;

    let P0: number, Pk: number;
    if (Math.abs(rho - 1) < 1e-10) {
      P0 = 1 / (K + 1);
      Pk = P0;
    } else {
      P0 = (1 - rho) / (1 - Math.pow(rho, K + 1));
      Pk = P0 * Math.pow(rho, K);
    }

    const effectiveLambda = lambda * (1 - Pk);
    const lossRate = lambda * Pk;

    let Ls: number;
    if (Math.abs(rho - 1) < 1e-10) {
      Ls = K / 2;
    } else {
      Ls = rho * (1 - (K + 1) * Math.pow(rho, K) + K * Math.pow(rho, K + 1)) /
           ((1 - rho) * (1 - Math.pow(rho, K + 1)));
    }

    const Ws = effectiveLambda > 0 ? Ls / effectiveLambda : 0;
    const Lq = Ls - effectiveLambda / mu;
    const Wq = effectiveLambda > 0 ? Lq / effectiveLambda : 0;
    const utilization = effectiveLambda / mu;

    return {
      utilization, Lq: Math.max(0, Lq), Ls, Wq: Math.max(0, Wq), Ws,
      P0, throughput: effectiveLambda, stable: true,
      Pk, effectiveLambda, lossRate,
    };
  }

  /**
   * M/G/1 queue (Pollaczek-Khinchine formula).
   * @param serviceVariance Variance of service time
   */
  mg1(lambda: number, mu: number, serviceVariance: number): QueueMetrics {
    const rho = lambda / mu;
    if (rho >= 1) {
      return {
        utilization: rho, Lq: Infinity, Ls: Infinity,
        Wq: Infinity, Ws: Infinity, P0: 0,
        throughput: mu, stable: false,
      };
    }

    const meanService = 1 / mu;
    const cs2 = serviceVariance / (meanService * meanService); // Squared CV

    // P-K formula
    const Lq = (rho * rho * (1 + cs2)) / (2 * (1 - rho));
    const Wq = Lq / lambda;
    const Ws = Wq + meanService;
    const Ls = lambda * Ws;

    return {
      utilization: rho, Lq, Ls, Wq, Ws,
      P0: 1 - rho, throughput: lambda, stable: true,
    };
  }

  /**
   * Little's Law: L = λ * W.
   */
  littlesLaw(params: {
    L?: number; lambda?: number; W?: number
  }): { L: number; lambda: number; W: number } {
    const { L, lambda, W } = params;
    if (L != null && lambda != null) return { L, lambda, W: L / lambda };
    if (L != null && W != null) return { L, lambda: L / W, W };
    if (lambda != null && W != null) return { L: lambda * W, lambda, W };
    return { L: 0, lambda: 0, W: 0 };
  }

  /**
   * Jackson network of queues.
   */
  jacksonNetwork(network: JacksonNetwork): NetworkMetrics {
    const n = network.nodes.length;
    const { routingMatrix, externalArrivals } = network;

    // Solve traffic equations: λ_i = γ_i + Σ_j λ_j * P_ji
    // (I - P^T) * λ = γ
    const A: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) =>
        (i === j ? 1 : 0) - (routingMatrix[j]?.[i] ?? 0)
      )
    );
    const totalLambda = this._solveLinear(A, externalArrivals, n);

    // Analyze each node as M/M/c
    const nodeMetrics: QueueMetrics[] = [];
    let bottleneck = 0;
    let maxUtil = 0;

    for (let i = 0; i < n; i++) {
      const node = network.nodes[i];
      const metrics = node.servers > 1
        ? this.mmc(Math.max(0, totalLambda[i]), node.serviceRate, node.servers)
        : this.mm1(Math.max(0, totalLambda[i]), node.serviceRate);
      nodeMetrics.push(metrics);

      if (metrics.utilization > maxUtil) {
        maxUtil = metrics.utilization;
        bottleneck = i;
      }
    }

    const totalWIP = nodeMetrics.reduce((s, m) => s + m.Ls, 0);
    const totalThroughput = externalArrivals.reduce((s, v) => s + v, 0);

    return { nodeMetrics, totalWIP, totalThroughput, bottleneck };
  }

  /**
   * Production line analysis: compute cycle time and throughput.
   */
  productionLine(
    stations: { serviceRate: number; servers: number; cv?: number }[],
    arrivalRate: number
  ): {
    stationMetrics: QueueMetrics[];
    totalCycleTime: number;
    throughput: number;
    bottleneckStation: number;
    totalWIP: number;
  } {
    const metrics = stations.map(st => {
      if (st.cv != null && st.cv > 0) {
        const variance = (st.cv / st.serviceRate) ** 2;
        return this.mg1(arrivalRate, st.serviceRate, variance);
      }
      return st.servers > 1
        ? this.mmc(arrivalRate, st.serviceRate, st.servers)
        : this.mm1(arrivalRate, st.serviceRate);
    });

    const totalCycleTime = metrics.reduce((s, m) => s + m.Ws, 0);
    const totalWIP = metrics.reduce((s, m) => s + m.Ls, 0);
    const bottleneckStation = metrics.reduce(
      (maxIdx, m, i, arr) => m.utilization > arr[maxIdx].utilization ? i : maxIdx, 0
    );

    return {
      stationMetrics: metrics,
      totalCycleTime,
      throughput: arrivalRate,
      bottleneckStation,
      totalWIP,
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _factorial(n: number): number {
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }

  private _solveLinear(A: number[][], b: number[], n: number): number[] {
    const aug = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
      let maxRow = col;
      for (let row = col + 1; row < n; row++) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
      }
      if (maxRow !== col) [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
      const pivot = aug[col][col];
      if (Math.abs(pivot) < 1e-14) continue;
      for (let row = col + 1; row < n; row++) {
        const f = aug[row][col] / pivot;
        for (let j = col; j <= n; j++) aug[row][j] -= f * aug[col][j];
      }
    }
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = aug[i][n];
      for (let j = i + 1; j < n; j++) sum -= aug[i][j] * x[j];
      x[i] = Math.abs(aug[i][i]) > 1e-14 ? sum / aug[i][i] : 0;
    }
    return x;
  }
}

export const queueingTheoryEngine = new QueueingTheoryEngineImpl();
