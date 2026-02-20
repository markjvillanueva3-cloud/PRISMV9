const PRISM_OPTIMIZATION = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LINEAR ALGEBRA HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  _dot: function(a, b) {
    return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  },
  
  _norm: function(v) {
    return Math.sqrt(v.reduce((sum, vi) => sum + vi * vi, 0));
  },
  
  _scale: function(v, s) {
    return v.map(vi => vi * s);
  },
  
  _add: function(a, b) {
    return a.map((ai, i) => ai + b[i]);
  },
  
  _sub: function(a, b) {
    return a.map((ai, i) => ai - b[i]);
  },
  
  _matVec: function(A, x) {
    return A.map(row => this._dot(row, x));
  },
  
  _transpose: function(A) {
    return A[0].map((_, j) => A.map(row => row[j]));
  },
  
  _solveLinear: function(A, b) {
    const n = b.length;
    const aug = A.map((row, i) => [...row, b[i]]);
    
    // Forward elimination with pivoting
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
      }
      [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
      
      if (Math.abs(aug[i][i]) < 1e-12) continue;
      
      for (let k = i + 1; k < n; k++) {
        const factor = aug[k][i] / aug[i][i];
        for (let j = i; j <= n; j++) {
          aug[k][j] -= factor * aug[i][j];
        }
      }
    }
    
    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = aug[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= aug[i][j] * x[j];
      }
      x[i] /= aug[i][i] || 1;
    }
    
    return x;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // NEWTON'S METHOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  newtonMethod: function(config) {
    const { f, gradient, hessian, x0, maxIter = 100, tol = 1e-8, alpha = 0.3, beta = 0.8 } = config;
    
    let x = [...x0];
    const history = [{ x: [...x], f: f(x) }];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const g = gradient(x);
      const gradNorm = this._norm(g);
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      const H = hessian(x);
      const d = this._solveLinear(H, g.map(gi => -gi));
      
      // Backtracking line search
      let t = 1;
      const fx = f(x);
      const gd = this._dot(g, d);
      
      while (f(this._add(x, this._scale(d, t))) > fx + alpha * t * gd) {
        t *= beta;
        if (t < 1e-10) break;
      }
      
      x = this._add(x, this._scale(d, t));
      history.push({ x: [...x], f: f(x), gradNorm, step: t });
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BFGS QUASI-NEWTON
  // ═══════════════════════════════════════════════════════════════════════════
  
  bfgs: function(config) {
    const { f, gradient, x0, maxIter = 100, tol = 1e-8 } = config;
    const n = x0.length;
    
    let x = [...x0];
    let g = gradient(x);
    let B = Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    ); // Identity matrix
    
    const history = [{ x: [...x], f: f(x) }];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const gradNorm = this._norm(g);
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Search direction: d = -B * g
      const d = this._matVec(B, g).map(v => -v);
      
      // Line search
      let alpha = 1;
      const fx = f(x);
      while (f(this._add(x, this._scale(d, alpha))) > fx + 0.0001 * alpha * this._dot(g, d)) {
        alpha *= 0.5;
        if (alpha < 1e-10) break;
      }
      
      const s = this._scale(d, alpha);
      const xNew = this._add(x, s);
      const gNew = gradient(xNew);
      const y = this._sub(gNew, g);
      
      // BFGS update
      const rho = 1 / this._dot(y, s);
      if (isFinite(rho) && rho > 0) {
        // B = (I - rho*s*y') * B * (I - rho*y*s') + rho*s*s'
        const sy = this._outer(s, y);
        const ys = this._outer(y, s);
        const ss = this._outer(s, s);
        
        const I = Array(n).fill(null).map((_, i) => 
          Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
        );
        
        const left = this._matSub(I, this._matScale(sy, rho));
        const right = this._matSub(I, this._matScale(ys, rho));
        
        B = this._matAdd(this._matMul(this._matMul(left, B), right), this._matScale(ss, rho));
      }
      
      x = xNew;
      g = gNew;
      history.push({ x: [...x], f: f(x), gradNorm, step: alpha });
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  _outer: function(a, b) {
    return a.map(ai => b.map(bj => ai * bj));
  },
  
  _matMul: function(A, B) {
    const m = A.length, n = B[0].length, k = B.length;
    return Array(m).fill(null).map((_, i) =>
      Array(n).fill(0).map((_, j) =>
        A[i].reduce((sum, aik, kk) => sum + aik * B[kk][j], 0)
      )
    );
  },
  
  _matAdd: function(A, B) {
    return A.map((row, i) => row.map((a, j) => a + B[i][j]));
  },
  
  _matSub: function(A, B) {
    return A.map((row, i) => row.map((a, j) => a - B[i][j]));
  },
  
  _matScale: function(A, s) {
    return A.map(row => row.map(a => a * s));
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GRADIENT DESCENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  gradientDescent: function(config) {
    const { f, gradient, x0, learningRate = 0.01, momentum = 0.9, maxIter = 1000, tol = 1e-6 } = config;
    
    let x = [...x0];
    let v = x.map(() => 0);
    const history = [];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const g = gradient(x);
      const gradNorm = this._norm(g);
      
      history.push({ x: [...x], f: f(x), gradNorm });
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Momentum update
      v = this._add(this._scale(v, momentum), this._scale(g, -learningRate));
      x = this._add(x, v);
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONJUGATE GRADIENT
  // ═══════════════════════════════════════════════════════════════════════════
  
  conjugateGradient: function(config) {
    const { f, gradient, x0, maxIter = 1000, tol = 1e-6 } = config;
    
    let x = [...x0];
    let g = gradient(x);
    let d = g.map(gi => -gi);
    const history = [];
    
    for (let iter = 0; iter < maxIter; iter++) {
      const gradNorm = this._norm(g);
      history.push({ x: [...x], f: f(x), gradNorm });
      
      if (gradNorm < tol) {
        return { x, f: f(x), converged: true, iterations: iter, history };
      }
      
      // Line search
      let alpha = this._lineSearch(f, x, d, 1);
      x = this._add(x, this._scale(d, alpha));
      
      const gNew = gradient(x);
      
      // Polak-Ribière formula
      const beta = Math.max(0, this._dot(gNew, this._sub(gNew, g)) / this._dot(g, g));
      
      d = this._add(this._scale(gNew, -1), this._scale(d, beta));
      g = gNew;
    }
    
    return { x, f: f(x), converged: false, iterations: maxIter, history };
  },
  
  _lineSearch: function(f, x, d, initialAlpha) {
    let alpha = initialAlpha;
    const fx = f(x);
    
    while (f(this._add(x, this._scale(d, alpha))) > fx && alpha > 1e-10) {
      alpha *= 0.5;
    }
    
    return alpha;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PENALTY METHOD
  // ═══════════════════════════════════════════════════════════════════════════
  
  penaltyMethod: function(config) {
    const { f, gradient, constraints, x0, mu0 = 1, muFactor = 10, maxOuter = 20, tol = 1e-6 } = config;
    
    let x = [...x0];
    let mu = mu0;
    
    for (let outer = 0; outer < maxOuter; outer++) {
      // Define penalized objective
      const penalizedF = (x) => {
        let penalty = 0;
        for (const g of constraints) {
          const violation = Math.max(0, g(x));
          penalty += violation * violation;
        }
        return f(x) + mu * penalty;
      };
      
      const penalizedGrad = (x) => {
        const n = x.length;
        const grad = gradient(x);
        const h = 1e-6;
        
        for (const g of constraints) {
          const violation = Math.max(0, g(x));
          if (violation > 0) {
            for (let i = 0; i < n; i++) {
              const xPlus = [...x]; xPlus[i] += h;
              const xMinus = [...x]; xMinus[i] -= h;
              const gGrad = (g(xPlus) - g(xMinus)) / (2 * h);
              grad[i] += 2 * mu * violation * gGrad;
            }
          }
        }
        
        return grad;
      };
      
      // Solve unconstrained subproblem
      const result = this.bfgs({
        f: penalizedF,
        gradient: penalizedGrad,
        x0: x,
        maxIter: 100,
        tol: tol / 10
      });
      
      x = result.x;
      
      // Check constraint satisfaction
      let maxViolation = 0;
      for (const g of constraints) {
        maxViolation = Math.max(maxViolation, Math.max(0, g(x)));
      }
      
      if (maxViolation < tol) {
        return { x, f: f(x), converged: true, outerIterations: outer + 1, maxViolation };
      }
      
      mu *= muFactor;
    }
    
    return { x, f: f(x), converged: false, outerIterations: maxOuter };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATED ANNEALING
  // ═══════════════════════════════════════════════════════════════════════════
  
  simulatedAnnealing: function(config) {
    const { 
      f, 
      neighbor, 
      x0, 
      T0 = 1000, 
      coolingRate = 0.995, 
      minT = 0.01, 
      iterPerTemp = 100 
    } = config;
    
    let x = Array.isArray(x0) ? [...x0] : x0;
    let fx = f(x);
    let best = x;
    let bestF = fx;
    let T = T0;
    
    const history = [];
    
    while (T > minT) {
      for (let i = 0; i < iterPerTemp; i++) {
        const xNew = neighbor(x);
        const fNew = f(xNew);
        const delta = fNew - fx;
        
        if (delta < 0 || Math.random() < Math.exp(-delta / T)) {
          x = xNew;
          fx = fNew;
          
          if (fx < bestF) {
            best = Array.isArray(x) ? [...x] : x;
            bestF = fx;
          }
        }
      }
      
      history.push({ T, f: fx, bestF });
      T *= coolingRate;
    }
    
    return { x: best, f: bestF, history };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // GENETIC ALGORITHM
  // ═══════════════════════════════════════════════════════════════════════════
  
  geneticAlgorithm: function(config) {
    const {
      fitness,
      createIndividual,
      crossover,
      mutate,
      populationSize = 100,
      generations = 100,
      eliteRatio = 0.1,
      mutationRate = 0.1
    } = config;
    
    // Initialize population
    let population = Array(populationSize).fill(null).map(() => createIndividual());
    let best = null;
    let bestFitness = -Infinity;
    
    const history = [];
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness
      const evaluated = population.map(ind => ({
        individual: ind,
        fitness: fitness(ind)
      })).sort((a, b) => b.fitness - a.fitness);
      
      // Track best
      if (evaluated[0].fitness > bestFitness) {
        bestFitness = evaluated[0].fitness;
        best = evaluated[0].individual;
      }
      
      history.push({
        generation: gen,
        bestFitness: evaluated[0].fitness,
        avgFitness: evaluated.reduce((s, e) => s + e.fitness, 0) / populationSize
      });
      
      // Selection and reproduction
      const eliteCount = Math.floor(populationSize * eliteRatio);
      const newPopulation = evaluated.slice(0, eliteCount).map(e => e.individual);
      
      while (newPopulation.length < populationSize) {
        // Tournament selection
        const parent1 = this._tournamentSelect(evaluated, 3);
        const parent2 = this._tournamentSelect(evaluated, 3);
        
        let child = crossover(parent1, parent2);
        
        if (Math.random() < mutationRate) {
          child = mutate(child);
        }
        
        newPopulation.push(child);
      }
      
      population = newPopulation;
    }
    
    return { best, fitness: bestFitness, history };
  },
  
  _tournamentSelect: function(evaluated, k) {
    const tournament = [];
    for (let i = 0; i < k; i++) {
      tournament.push(evaluated[Math.floor(Math.random() * evaluated.length)]);
    }
    return tournament.sort((a, b) => b.fitness - a.fitness)[0].individual;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PARTICLE SWARM OPTIMIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  pso: function(config) {
    const {
      f,
      bounds,
      swarmSize = 30,
      maxIterations = 100,
      w = 0.7,      // inertia
      c1 = 1.5,     // cognitive
      c2 = 1.5      // social
    } = config;
    
    const dim = bounds.length;
    
    // Initialize swarm
    const particles = Array(swarmSize).fill(null).map(() => {
      const position = bounds.map(([lo, hi]) => lo + Math.random() * (hi - lo));
      const velocity = bounds.map(([lo, hi]) => (Math.random() - 0.5) * (hi - lo) * 0.1);
      return {
        position,
        velocity,
        pBest: [...position],
        pBestF: f(position)
      };
    });
    
    let gBest = [...particles[0].pBest];
    let gBestF = particles[0].pBestF;
    
    for (const p of particles) {
      if (p.pBestF < gBestF) {
        gBest = [...p.pBest];
        gBestF = p.pBestF;
      }
    }
    
    const history = [];
    
    for (let iter = 0; iter < maxIterations; iter++) {
      for (const p of particles) {
        // Update velocity
        for (let d = 0; d < dim; d++) {
          const r1 = Math.random(), r2 = Math.random();
          p.velocity[d] = w * p.velocity[d]
            + c1 * r1 * (p.pBest[d] - p.position[d])
            + c2 * r2 * (gBest[d] - p.position[d]);
        }
        
        // Update position
        for (let d = 0; d < dim; d++) {
          p.position[d] += p.velocity[d];
          // Clamp to bounds
          p.position[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], p.position[d]));
        }
        
        // Evaluate
        const fx = f(p.position);
        
        // Update personal best
        if (fx < p.pBestF) {
          p.pBest = [...p.position];
          p.pBestF = fx;
        }
        
        // Update global best
        if (fx < gBestF) {
          gBest = [...p.position];
          gBestF = fx;
        }
      }
      
      history.push({ iteration: iter, gBestF });
    }
    
    return { x: gBest, f: gBestF, history };
  }
}