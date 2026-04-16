/**
 * PRISM MCP Server -- Q-Learning Engine
 *
 * Tabular reinforcement learning:
 * - Q-Learning (off-policy TD)
 * - SARSA (on-policy TD)
 * - Epsilon-greedy, softmax, UCB1 action selection
 * - Epsilon decay, policy extraction
 *
 * Based on MIT 6.036, Sutton & Barto 2018.
 * Ported from PRISM_RL_QLEARNING_ENGINE.js (monolith R2.3.1).
 *
 * @module QLearningEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AgentConfig {
  stateSize?: number;
  actionSize?: number;
  learningRate?: number;
  discountFactor?: number;
  epsilon?: number;
  epsilonMin?: number;
  epsilonDecay?: number;
  algorithm?: "qlearning" | "sarsa" | "expected_sarsa";
}

export interface Agent {
  stateSize: number;
  actionSize: number;
  learningRate: number;
  discountFactor: number;
  epsilon: number;
  epsilonMin: number;
  epsilonDecay: number;
  algorithm: string;
  qTable: Map<string, number[]>;
  visitCounts: Map<string, number[]>;
  totalSteps: number;
}

export interface LearnResult {
  tdError: number;
  newQ: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class QLearningEngineImpl {

  /** Create a Q-Learning/SARSA agent. */
  createAgent(config: AgentConfig = {}): Agent {
    return {
      stateSize: config.stateSize ?? 10,
      actionSize: config.actionSize ?? 4,
      learningRate: config.learningRate ?? 0.1,
      discountFactor: config.discountFactor ?? 0.99,
      epsilon: config.epsilon ?? 1.0,
      epsilonMin: config.epsilonMin ?? 0.01,
      epsilonDecay: config.epsilonDecay ?? 0.995,
      algorithm: config.algorithm ?? "qlearning",
      qTable: new Map(),
      visitCounts: new Map(),
      totalSteps: 0,
    };
  }

  /** Convert state to string key. */
  stateKey(state: number | number[]): string {
    if (Array.isArray(state)) return state.map(s => s.toFixed(4)).join(",");
    return String(state);
  }

  /** Get Q-values for a state (initializes to zeros if new). */
  getQValues(agent: Agent, state: number | number[]): number[] {
    const key = this.stateKey(state);
    if (!agent.qTable.has(key)) agent.qTable.set(key, new Array(agent.actionSize).fill(0));
    return agent.qTable.get(key)!;
  }

  /** Get single Q(s,a). */
  getQ(agent: Agent, state: number | number[], action: number): number {
    return this.getQValues(agent, state)[action];
  }

  /** Set single Q(s,a). */
  setQ(agent: Agent, state: number | number[], action: number, value: number): void {
    const qv = this.getQValues(agent, state);
    qv[action] = value;
  }

  /** Epsilon-greedy action selection. */
  selectAction(agent: Agent, state: number | number[], training: boolean = true): number {
    if (training && Math.random() < agent.epsilon) {
      return Math.floor(Math.random() * agent.actionSize);
    }
    const qValues = this.getQValues(agent, state);
    const maxQ = Math.max(...qValues);
    const maxActions = qValues.map((q, i) => q === maxQ ? i : -1).filter(i => i >= 0);
    return maxActions[Math.floor(Math.random() * maxActions.length)];
  }

  /** Softmax (Boltzmann) action selection. */
  selectActionSoftmax(agent: Agent, state: number | number[], temperature: number = 1.0): number {
    const qValues = this.getQValues(agent, state);
    const maxQ = Math.max(...qValues);
    const expValues = qValues.map(q => Math.exp((q - maxQ) / temperature));
    const sumExp = expValues.reduce((s, e) => s + e, 0);
    let rand = Math.random();
    for (let i = 0; i < expValues.length; i++) {
      rand -= expValues[i] / sumExp;
      if (rand <= 0) return i;
    }
    return agent.actionSize - 1;
  }

  /** UCB1 action selection. */
  selectActionUCB(agent: Agent, state: number | number[], c: number = 2.0): number {
    const key = this.stateKey(state);
    const qValues = this.getQValues(agent, state);
    if (!agent.visitCounts.has(key)) agent.visitCounts.set(key, new Array(agent.actionSize).fill(0));
    const visits = agent.visitCounts.get(key)!;
    const totalVisits = visits.reduce((s, v) => s + v, 0);
    for (let i = 0; i < agent.actionSize; i++) {
      if (visits[i] === 0) return i;
    }
    const ucb = qValues.map((q, i) => q + c * Math.sqrt(Math.log(totalVisits) / visits[i]));
    return ucb.indexOf(Math.max(...ucb));
  }

  /** Q-Learning update: Q(s,a) += α[r + γ·max Q(s') - Q(s,a)]. */
  learnQLearning(agent: Agent, state: number | number[], action: number, reward: number, nextState: number | number[], done: boolean): LearnResult {
    const currentQ = this.getQ(agent, state, action);
    const targetQ = done ? reward : reward + agent.discountFactor * Math.max(...this.getQValues(agent, nextState));
    const newQ = currentQ + agent.learningRate * (targetQ - currentQ);
    this.setQ(agent, state, action, newQ);
    this._incrementVisit(agent, state, action);
    return { tdError: targetQ - currentQ, newQ };
  }

  /** SARSA update: Q(s,a) += α[r + γ·Q(s',a') - Q(s,a)]. */
  learnSARSA(agent: Agent, state: number | number[], action: number, reward: number, nextState: number | number[], nextAction: number, done: boolean): LearnResult {
    const currentQ = this.getQ(agent, state, action);
    const targetQ = done ? reward : reward + agent.discountFactor * this.getQ(agent, nextState, nextAction);
    const newQ = currentQ + agent.learningRate * (targetQ - currentQ);
    this.setQ(agent, state, action, newQ);
    this._incrementVisit(agent, state, action);
    return { tdError: targetQ - currentQ, newQ };
  }

  /** Decay epsilon. */
  decayEpsilon(agent: Agent): void {
    agent.epsilon = Math.max(agent.epsilonMin, agent.epsilon * agent.epsilonDecay);
  }

  /** Extract greedy policy from Q-table. */
  getPolicy(agent: Agent): Map<string, number> {
    const policy = new Map<string, number>();
    for (const [state, qValues] of agent.qTable.entries()) {
      policy.set(state, qValues.indexOf(Math.max(...qValues)));
    }
    return policy;
  }

  private _incrementVisit(agent: Agent, state: number | number[], action: number): void {
    const key = this.stateKey(state);
    if (!agent.visitCounts.has(key)) agent.visitCounts.set(key, new Array(agent.actionSize).fill(0));
    agent.visitCounts.get(key)![action]++;
    agent.totalSteps++;
  }
}

export const qLearningEngine = new QLearningEngineImpl();
