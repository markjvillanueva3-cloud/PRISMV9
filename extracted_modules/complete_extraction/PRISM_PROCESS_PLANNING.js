const PRISM_PROCESS_PLANNING = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // A* SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  
  aStarSearch: function(problem) {
    const openSet = new Map();
    const closedSet = new Set();
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();
    
    const startKey = JSON.stringify(problem.initial);
    openSet.set(startKey, problem.initial);
    gScore.set(startKey, 0);
    fScore.set(startKey, problem.heuristic(problem.initial));
    
    let iterations = 0;
    const maxIterations = problem.maxIterations || 10000;
    
    while (openSet.size > 0 && iterations < maxIterations) {
      iterations++;
      
      // Get node with lowest fScore
      let currentKey = null;
      let lowestF = Infinity;
      for (const [key, _] of openSet) {
        const f = fScore.get(key);
        if (f < lowestF) {
          lowestF = f;
          currentKey = key;
        }
      }
      
      const current = openSet.get(currentKey);
      
      if (problem.isGoal(current)) {
        return this._reconstructPath(cameFrom, currentKey, gScore.get(currentKey));
      }
      
      openSet.delete(currentKey);
      closedSet.add(currentKey);
      
      const successors = problem.getSuccessors ? 
        problem.getSuccessors(current) : 
        problem.successors(current);
      
      for (const { state, action, cost } of successors) {
        const neighborKey = JSON.stringify(state);
        
        if (closedSet.has(neighborKey)) continue;
        
        const tentativeG = gScore.get(currentKey) + cost;
        
        if (!openSet.has(neighborKey)) {
          openSet.set(neighborKey, state);
          gScore.set(neighborKey, Infinity);
        }
        
        if (tentativeG < gScore.get(neighborKey)) {
          cameFrom.set(neighborKey, { parent: currentKey, action, cost });
          gScore.set(neighborKey, tentativeG);
          fScore.set(neighborKey, tentativeG + problem.heuristic(state));
        }
      }
    }
    
    return { found: false, iterations };
  },
  
  _reconstructPath: function(cameFrom, goalKey, totalCost) {
    const path = [];
    let current = goalKey;
    
    while (cameFrom.has(current)) {
      const { parent, action, cost } = cameFrom.get(current);
      path.unshift({ action, cost });
      current = parent;
    }
    
    return { found: true, path, totalCost };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BFS & DFS
  // ═══════════════════════════════════════════════════════════════════════════
  
  bfs: function(problem) {
    const queue = [{ state: problem.initial, path: [], cost: 0 }];
    const visited = new Set([JSON.stringify(problem.initial)]);
    
    while (queue.length > 0) {
      const { state, path, cost } = queue.shift();
      
      if (problem.isGoal(state)) {
        return { found: true, path, cost };
      }
      
      for (const { state: next, action, cost: stepCost } of problem.getSuccessors(state)) {
        const key = JSON.stringify(next);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            state: next,
            path: [...path, action],
            cost: cost + stepCost
          });
        }
      }
    }
    
    return { found: false };
  },
  
  dfs: function(problem, maxDepth = 1000) {
    const stack = [{ state: problem.initial, path: [], cost: 0, depth: 0 }];
    const visited = new Set();
    
    while (stack.length > 0) {
      const { state, path, cost, depth } = stack.pop();
      const key = JSON.stringify(state);
      
      if (visited.has(key) || depth > maxDepth) continue;
      visited.add(key);
      
      if (problem.isGoal(state)) {
        return { found: true, path, cost };
      }
      
      for (const { state: next, action, cost: stepCost } of problem.getSuccessors(state)) {
        stack.push({
          state: next,
          path: [...path, action],
          cost: cost + stepCost,
          depth: depth + 1
        });
      }
    }
    
    return { found: false };
  },
  
  idaStar: function(problem) {
    let threshold = problem.heuristic(problem.initial);
    
    while (threshold < Infinity) {
      const result = this._idaSearch(problem, problem.initial, 0, threshold, []);
      
      if (result.found) return result;
      if (result.nextThreshold === Infinity) return { found: false };
      
      threshold = result.nextThreshold;
    }
    
    return { found: false };
  },
  
  _idaSearch: function(problem, state, g, threshold, path) {
    const f = g + problem.heuristic(state);
    
    if (f > threshold) return { found: false, nextThreshold: f };
    if (problem.isGoal(state)) return { found: true, path, cost: g };
    
    let minThreshold = Infinity;
    
    for (const { state: next, action, cost } of problem.getSuccessors(state)) {
      const result = this._idaSearch(problem, next, g + cost, threshold, [...path, action]);
      
      if (result.found) return result;
      minThreshold = Math.min(minThreshold, result.nextThreshold);
    }
    
    return { found: false, nextThreshold: minThreshold };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONSTRAINT SATISFACTION PROBLEM (CSP)
  // ═══════════════════════════════════════════════════════════════════════════
  
  cspSolver: function(csp) {
    const { variables, domains, constraints } = csp;
    const assignment = {};
    const domainsCopy = {};
    
    for (const v of variables) {
      domainsCopy[v] = [...domains[v]];
    }
    
    // Apply AC-3 first
    if (!this.ac3(variables, domainsCopy, constraints)) {
      return { solved: false, reason: 'Arc consistency failed' };
    }
    
    const result = this._backtrack(assignment, variables, domainsCopy, constraints);
    
    return result ? { solved: true, assignment: result } : { solved: false };
  },
  
  ac3: function(variables, domains, constraints) {
    const queue = [];
    
    // Initialize queue with all arcs
    for (const c of constraints) {
      if (c.variables.length === 2) {
        queue.push([c.variables[0], c.variables[1], c]);
        queue.push([c.variables[1], c.variables[0], c]);
      }
    }
    
    while (queue.length > 0) {
      const [xi, xj, constraint] = queue.shift();
      
      if (this._revise(domains, xi, xj, constraint)) {
        if (domains[xi].length === 0) return false;
        
        // Add all arcs pointing to xi
        for (const c of constraints) {
          if (c.variables.includes(xi)) {
            for (const xk of c.variables) {
              if (xk !== xi && xk !== xj) {
                queue.push([xk, xi, c]);
              }
            }
          }
        }
      }
    }
    
    return true;
  },
  
  _revise: function(domains, xi, xj, constraint) {
    let revised = false;
    
    domains[xi] = domains[xi].filter(x => {
      const hasSupport = domains[xj].some(y => {
        const testAssignment = { [xi]: x, [xj]: y };
        return constraint.check(testAssignment);
      });
      
      if (!hasSupport) revised = true;
      return hasSupport;
    });
    
    return revised;
  },
  
  _backtrack: function(assignment, variables, domains, constraints) {
    if (Object.keys(assignment).length === variables.length) {
      return { ...assignment };
    }
    
    // MRV heuristic
    const unassigned = variables.filter(v => !(v in assignment));
    const variable = unassigned.reduce((best, v) =>
      domains[v].length < domains[best].length ? v : best
    );
    
    for (const value of domains[variable]) {
      assignment[variable] = value;
      
      if (this._isConsistent(variable, value, assignment, constraints)) {
        const result = this._backtrack(assignment, variables, domains, constraints);
        if (result) return result;
      }
      
      delete assignment[variable];
    }
    
    return null;
  },
  
  _isConsistent: function(variable, value, assignment, constraints) {
    for (const constraint of constraints) {
      if (!constraint.variables.includes(variable)) continue;
      
      // Check if all variables in constraint are assigned
      const allAssigned = constraint.variables.every(v => v in assignment);
      if (!allAssigned) continue;
      
      if (!constraint.check(assignment)) return false;
    }
    return true;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HIDDEN MARKOV MODEL (HMM)
  // ═══════════════════════════════════════════════════════════════════════════
  
  createHMM: function(config) {
    return {
      states: config.states,
      observations: config.observations,
      initial: config.initial,           // π[i] = P(state_0 = i)
      transition: config.transition,      // A[i][j] = P(state_t+1 = j | state_t = i)
      emission: config.emission           // B[i][o] = P(obs = o | state = i)
    };
  },
  
  hmmForward: function(hmm, observations) {
    const T = observations.length;
    const N = hmm.states.length;
    const alpha = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialize
    for (let i = 0; i < N; i++) {
      const obsIdx = hmm.observations.indexOf(observations[0]);
      alpha[0][i] = hmm.initial[i] * hmm.emission[i][obsIdx];
    }
    
    // Forward pass
    for (let t = 1; t < T; t++) {
      const obsIdx = hmm.observations.indexOf(observations[t]);
      for (let j = 0; j < N; j++) {
        let sum = 0;
        for (let i = 0; i < N; i++) {
          sum += alpha[t-1][i] * hmm.transition[i][j];
        }
        alpha[t][j] = sum * hmm.emission[j][obsIdx];
      }
      
      // Normalize to prevent underflow
      const scale = alpha[t].reduce((a, b) => a + b, 0);
      if (scale > 0) {
        for (let j = 0; j < N; j++) alpha[t][j] /= scale;
      }
    }
    
    return {
      alpha,
      probability: alpha[T-1].reduce((a, b) => a + b, 0)
    };
  },
  
  hmmViterbi: function(hmm, observations) {
    const T = observations.length;
    const N = hmm.states.length;
    const delta = Array(T).fill(null).map(() => Array(N).fill(0));
    const psi = Array(T).fill(null).map(() => Array(N).fill(0));
    
    // Initialize
    for (let i = 0; i < N; i++) {
      const obsIdx = hmm.observations.indexOf(observations[0]);
      delta[0][i] = Math.log(hmm.initial[i]) + Math.log(hmm.emission[i][obsIdx]);
      psi[0][i] = 0;
    }
    
    // Recursion
    for (let t = 1; t < T; t++) {
      const obsIdx = hmm.observations.indexOf(observations[t]);
      for (let j = 0; j < N; j++) {
        let maxVal = -Infinity;
        let maxIdx = 0;
        
        for (let i = 0; i < N; i++) {
          const val = delta[t-1][i] + Math.log(hmm.transition[i][j]);
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
        }
        
        delta[t][j] = maxVal + Math.log(hmm.emission[j][obsIdx]);
        psi[t][j] = maxIdx;
      }
    }
    
    // Termination
    let maxVal = -Infinity;
    let lastState = 0;
    for (let i = 0; i < N; i++) {
      if (delta[T-1][i] > maxVal) {
        maxVal = delta[T-1][i];
        lastState = i;
      }
    }
    
    // Backtrack
    const path = [lastState];
    for (let t = T - 1; t > 0; t--) {
      path.unshift(psi[t][path[0]]);
    }
    
    return {
      path: path.map(i => hmm.states[i]),
      pathIndices: path,
      logProbability: maxVal
    };
  },
  
  hmmEstimate: function(observations, config = {}) {
    const hmm = config.model || this._defaultToolWearHMM();
    
    // Map observations to emission probabilities
    const mappedObs = observations.map(o => this._mapObservationToIndex(o, hmm));
    
    const forward = this.hmmForward(hmm, mappedObs);
    const viterbi = this.hmmViterbi(hmm, mappedObs);
    
    // Get current state probabilities
    const lastAlpha = forward.alpha[forward.alpha.length - 1];
    const sum = lastAlpha.reduce((a, b) => a + b, 0);
    const probabilities = lastAlpha.map(a => a / sum);
    
    const mostLikelyIdx = probabilities.indexOf(Math.max(...probabilities));
    
    return {
      currentState: hmm.states[mostLikelyIdx],
      probabilities: Object.fromEntries(hmm.states.map((s, i) => [s, probabilities[i]])),
      stateSequence: viterbi.path,
      wearLevel: mostLikelyIdx / (hmm.states.length - 1),
      confidence: Math.max(...probabilities)
    };
  },
  
  _defaultToolWearHMM: function() {
    return {
      states: ['new', 'light_wear', 'moderate_wear', 'heavy_wear', 'failed'],
      observations: ['normal', 'slightly_elevated', 'elevated', 'high', 'critical'],
      initial: [0.9, 0.08, 0.02, 0.0, 0.0],
      transition: [
        [0.85, 0.12, 0.02, 0.01, 0.00],
        [0.00, 0.75, 0.20, 0.05, 0.00],
        [0.00, 0.00, 0.65, 0.30, 0.05],
        [0.00, 0.00, 0.00, 0.50, 0.50],
        [0.00, 0.00, 0.00, 0.00, 1.00]
      ],
      emission: [
        [0.90, 0.08, 0.02, 0.00, 0.00],
        [0.10, 0.70, 0.15, 0.05, 0.00],
        [0.02, 0.15, 0.60, 0.20, 0.03],
        [0.00, 0.05, 0.15, 0.55, 0.25],
        [0.00, 0.00, 0.05, 0.25, 0.70]
      ]
    };
  },
  
  _mapObservationToIndex: function(obs, hmm) {
    if (typeof obs === 'number') {
      // Map numeric ratio to observation index
      if (obs < 1.1) return 0;
      if (obs < 1.3) return 1;
      if (obs < 1.6) return 2;
      if (obs < 2.0) return 3;
      return 4;
    }
    return hmm.observations.indexOf(obs);
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MARKOV DECISION PROCESS (MDP)
  // ═══════════════════════════════════════════════════════════════════════════
  
  valueIteration: function(mdp, config = {}) {
    const { gamma = 0.95, theta = 0.0001, maxIterations = 1000 } = config;
    const { states, actions, transition, reward } = mdp;
    
    let V = {};
    for (const s of states) V[s] = 0;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let delta = 0;
      
      for (const s of states) {
        const v = V[s];
        
        let maxValue = -Infinity;
        for (const a of actions) {
          let value = 0;
          const transitions = transition(s, a);
          
          for (const { nextState, probability } of transitions) {
            value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
          }
          
          maxValue = Math.max(maxValue, value);
        }
        
        V[s] = maxValue;
        delta = Math.max(delta, Math.abs(v - V[s]));
      }
      
      if (delta < theta) {
        return { V, iterations: iter + 1, converged: true, policy: this._extractPolicy(mdp, V, gamma) };
      }
    }
    
    return { V, iterations: maxIterations, converged: false, policy: this._extractPolicy(mdp, V, gamma) };
  },
  
  policyIteration: function(mdp, config = {}) {
    const { gamma = 0.95, maxIterations = 100 } = config;
    const { states, actions, transition, reward } = mdp;
    
    // Initialize random policy
    let policy = {};
    for (const s of states) {
      policy[s] = actions[0];
    }
    
    for (let iter = 0; iter < maxIterations; iter++) {
      // Policy Evaluation
      const V = this._policyEvaluation(mdp, policy, gamma);
      
      // Policy Improvement
      let stable = true;
      for (const s of states) {
        const oldAction = policy[s];
        
        let bestAction = actions[0];
        let bestValue = -Infinity;
        
        for (const a of actions) {
          let value = 0;
          for (const { nextState, probability } of transition(s, a)) {
            value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
          }
          
          if (value > bestValue) {
            bestValue = value;
            bestAction = a;
          }
        }
        
        policy[s] = bestAction;
        if (oldAction !== bestAction) stable = false;
      }
      
      if (stable) {
        return { policy, V, iterations: iter + 1, converged: true };
      }
    }
    
    return { policy, iterations: maxIterations, converged: false };
  },
  
  _policyEvaluation: function(mdp, policy, gamma, theta = 0.0001) {
    const { states, transition, reward } = mdp;
    
    let V = {};
    for (const s of states) V[s] = 0;
    
    for (let iter = 0; iter < 1000; iter++) {
      let delta = 0;
      
      for (const s of states) {
        const v = V[s];
        const a = policy[s];
        
        let newV = 0;
        for (const { nextState, probability } of transition(s, a)) {
          newV += probability * (reward(s, a, nextState) + gamma * V[nextState]);
        }
        
        V[s] = newV;
        delta = Math.max(delta, Math.abs(v - V[s]));
      }
      
      if (delta < theta) break;
    }
    
    return V;
  },
  
  _extractPolicy: function(mdp, V, gamma) {
    const { states, actions, transition, reward } = mdp;
    const policy = {};
    
    for (const s of states) {
      let bestAction = actions[0];
      let bestValue = -Infinity;
      
      for (const a of actions) {
        let value = 0;
        for (const { nextState, probability } of transition(s, a)) {
          value += probability * (reward(s, a, nextState) + gamma * V[nextState]);
        }
        
        if (value > bestValue) {
          bestValue = value;
          bestAction = a;
        }
      }
      
      policy[s] = bestAction;
    }
    
    return policy;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // RRT / RRT*
  // ═══════════════════════════════════════════════════════════════════════════
  
  rrt: function(config) {
    const { start, goal, obstacles, bounds, maxIterations = 5000, stepSize = 5, goalBias = 0.1 } = config;
    
    const nodes = [{ point: start, parent: null, cost: 0 }];
    
    for (let i = 0; i < maxIterations; i++) {
      // Sample with goal bias
      const target = Math.random() < goalBias ? goal : this._randomPoint(bounds);
      
      // Find nearest
      const nearest = this._findNearest(nodes, target);
      
      // Steer
      const newPoint = this._steer(nearest.point, target, stepSize);
      
      // Check collision
      if (this._collisionFree(nearest.point, newPoint, obstacles)) {
        const newNode = {
          point: newPoint,
          parent: nearest,
          cost: nearest.cost + this._distance(nearest.point, newPoint)
        };
        nodes.push(newNode);
        
        // Check goal
        if (this._distance(newPoint, goal) < stepSize) {
          return {
            found: true,
            path: this._extractPath(newNode),
            cost: newNode.cost,
            iterations: i + 1
          };
        }
      }
    }
    
    return { found: false, iterations: maxIterations };
  },
  
  rrtStar: function(config) {
    const { start, goal, obstacles, bounds, maxIterations = 5000, stepSize = 5, goalBias = 0.1, rewireRadius = 20 } = config;
    
    const nodes = [{ point: start, parent: null, cost: 0 }];
    let bestGoalNode = null;
    
    for (let i = 0; i < maxIterations; i++) {
      const target = Math.random() < goalBias ? goal : this._randomPoint(bounds);
      const nearest = this._findNearest(nodes, target);
      const newPoint = this._steer(nearest.point, target, stepSize);
      
      if (!this._collisionFree(nearest.point, newPoint, obstacles)) continue;
      
      // Find nearby nodes
      const nearby = nodes.filter(n => this._distance(n.point, newPoint) < rewireRadius);
      
      // Find best parent
      let bestParent = nearest;
      let bestCost = nearest.cost + this._distance(nearest.point, newPoint);
      
      for (const n of nearby) {
        const cost = n.cost + this._distance(n.point, newPoint);
        if (cost < bestCost && this._collisionFree(n.point, newPoint, obstacles)) {
          bestParent = n;
          bestCost = cost;
        }
      }
      
      const newNode = { point: newPoint, parent: bestParent, cost: bestCost };
      nodes.push(newNode);
      
      // Rewire
      for (const n of nearby) {
        const newCost = newNode.cost + this._distance(newNode.point, n.point);
        if (newCost < n.cost && this._collisionFree(newNode.point, n.point, obstacles)) {
          n.parent = newNode;
          n.cost = newCost;
        }
      }
      
      // Check goal
      if (this._distance(newPoint, goal) < stepSize) {
        if (!bestGoalNode || newNode.cost < bestGoalNode.cost) {
          bestGoalNode = newNode;
        }
      }
    }
    
    if (bestGoalNode) {
      return {
        found: true,
        path: this._extractPath(bestGoalNode),
        cost: bestGoalNode.cost,
        nodes: nodes.length
      };
    }
    
    return { found: false, nodes: nodes.length };
  },
  
  _randomPoint: function(bounds) {
    return {
      x: bounds.minX + Math.random() * (bounds.maxX - bounds.minX),
      y: bounds.minY + Math.random() * (bounds.maxY - bounds.minY),
      z: (bounds.minZ !== undefined) ? bounds.minZ + Math.random() * (bounds.maxZ - bounds.minZ) : 0
    };
  },
  
  _findNearest: function(nodes, point) {
    return nodes.reduce((nearest, n) =>
      this._distance(n.point, point) < this._distance(nearest.point, point) ? n : nearest
    );
  },
  
  _steer: function(from, to, stepSize) {
    const dist = this._distance(from, to);
    if (dist <= stepSize) return { ...to };
    
    const ratio = stepSize / dist;
    return {
      x: from.x + (to.x - from.x) * ratio,
      y: from.y + (to.y - from.y) * ratio,
      z: from.z !== undefined ? from.z + ((to.z || 0) - (from.z || 0)) * ratio : undefined
    };
  },
  
  _distance: function(a, b) {
    const dz = (a.z !== undefined && b.z !== undefined) ? (a.z - b.z) ** 2 : 0;
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + dz);
  },
  
  _collisionFree: function(from, to, obstacles) {
    if (!obstacles || obstacles.length === 0) return true;
    
    // Check line segment against each obstacle
    for (const obs of obstacles) {
      if (this._lineIntersectsAABB(from, to, obs)) return false;
    }
    return true;
  },
  
  _lineIntersectsAABB: function(p1, p2, box) {
    // Simplified AABB collision check
    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);
    
    return !(maxX < box.minX || minX > box.maxX || maxY < box.minY || minY > box.maxY);
  },
  
  _extractPath: function(node) {
    const path = [];
    while (node) {
      path.unshift(node.point);
      node = node.parent;
    }
    return path;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MONTE CARLO TREE SEARCH
  // ═══════════════════════════════════════════════════════════════════════════
  
  mcts: function(config) {
    const { rootState, getActions, applyAction, isTerminal, getReward, iterations = 1000, explorationConstant = 1.414 } = config;
    
    const root = {
      state: rootState,
      parent: null,
      children: [],
      visits: 0,
      value: 0,
      untriedActions: getActions(rootState)
    };
    
    for (let i = 0; i < iterations; i++) {
      let node = this._mctsSelect(root, explorationConstant);
      node = this._mctsExpand(node, getActions, applyAction);
      const reward = this._mctsSimulate(node.state, getActions, applyAction, isTerminal, getReward);
      this._mctsBackpropagate(node, reward);
    }
    
    // Return best child
    const bestChild = root.children.reduce((best, child) =>
      child.visits > best.visits ? child : best
    , root.children[0]);
    
    return {
      bestAction: bestChild?.action,
      visits: root.visits,
      children: root.children.map(c => ({
        action: c.action,
        visits: c.visits,
        value: c.value / c.visits
      }))
    };
  },
  
  _mctsSelect: function(node, c) {
    while (node.untriedActions.length === 0 && node.children.length > 0) {
      node = node.children.reduce((best, child) => {
        const ucb = child.value / child.visits + c * Math.sqrt(Math.log(node.visits) / child.visits);
        const bestUcb = best.value / best.visits + c * Math.sqrt(Math.log(node.visits) / best.visits);
        return ucb > bestUcb ? child : best;
      });
    }
    return node;
  },
  
  _mctsExpand: function(node, getActions, applyAction) {
    if (node.untriedActions.length > 0) {
      const action = node.untriedActions.pop();
      const newState = applyAction(node.state, action);
      const child = {
        state: newState,
        parent: node,
        action: action,
        children: [],
        visits: 0,
        value: 0,
        untriedActions: getActions(newState)
      };
      node.children.push(child);
      return child;
    }
    return node;
  },
  
  _mctsSimulate: function(state, getActions, applyAction, isTerminal, getReward, maxDepth = 100) {
    let currentState = state;
    let depth = 0;
    
    while (!isTerminal(currentState) && depth < maxDepth) {
      const actions = getActions(currentState);
      if (actions.length === 0) break;
      
      const action = actions[Math.floor(Math.random() * actions.length)];
      currentState = applyAction(currentState, action);
      depth++;
    }
    
    return getReward(currentState);
  },
  
  _mctsBackpropagate: function(node, reward) {
    while (node) {
      node.visits++;
      node.value += reward;
      node = node.parent;
    }
  }
}