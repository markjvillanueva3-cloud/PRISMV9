const PRISM_PHASE3_OPTIMIZATION = {
    version: '8.48.000',
    phase: 'Phase 3: Global Optimization',
    buildDate: '2026-01-12',
    sources: ['MIT 15.093', 'MIT 18.433', 'MIT 6.251J', 'MIT 15.066J', 'MIT 2.854'],

    // SECTION 1: NSGA-II MULTI-OBJECTIVE OPTIMIZATION (MIT 15.093)
    // Non-dominated Sorting Genetic Algorithm II (Deb et al., 2002)
    // Complexity: O(MN²) for non-dominated sorting where M=objectives, N=pop

    NSGA2: class {
        constructor(options = {}) {
            this.populationSize = options.populationSize || 100;
            this.maxGenerations = options.maxGenerations || 200;
            this.crossoverRate = options.crossoverRate || 0.9;
            this.mutationRate = options.mutationRate || 0.1;
            this.objectives = options.objectives || [];
            this.constraints = options.constraints || [];
            this.bounds = options.bounds || [];
            this.dimension = this.bounds.length;
            this.population = [];
            this.paretoFront = [];
            this.stats = { evaluations: 0, generations: 0, paretoSize: 0 };
        }
        _initPopulation() {
            this.population = [];
            for (let i = 0; i < this.populationSize; i++) {
                const ind = {
                    x: this.bounds.map(([min, max]) => min + Math.random() * (max - min)),
                    objectives: [], rank: 0, crowdingDistance: 0, violation: 0
                };
                this._evaluate(ind);
                this.population.push(ind);
            }
        }
        _evaluate(ind) {
            this.stats.evaluations++;
            ind.objectives = this.objectives.map(f => f(ind.x));
            ind.violation = 0;
            for (const c of this.constraints) {
                const v = c(ind.x);
                if (v > 0) ind.violation += v;
            }
        }
        // Fast non-dominated sort - O(MN²)
        _fastNonDominatedSort(pop) {
            const fronts = [[]];
            const S = new Map(), n = new Map();

            for (const p of pop) { S.set(p, []); n.set(p, 0); }

            for (let i = 0; i < pop.length; i++) {
                for (let j = i + 1; j < pop.length; j++) {
                    const p = pop[i], q = pop[j];
                    if (this._dominates(p, q)) { S.get(p).push(q); n.set(q, n.get(q) + 1); }
                    else if (this._dominates(q, p)) { S.get(q).push(p); n.set(p, n.get(p) + 1); }
                }
            }
            for (const p of pop) {
                if (n.get(p) === 0) { p.rank = 0; fronts[0].push(p); }
            }
            let i = 0;
            while (fronts[i].length > 0) {
                const Q = [];
                for (const p of fronts[i]) {
                    for (const q of S.get(p)) {
                        n.set(q, n.get(q) - 1);
                        if (n.get(q) === 0) { q.rank = i + 1; Q.push(q); }
                    }
                }
                i++;
                fronts.push(Q);
            }
            fronts.pop();
            return fronts;
        }
        _dominates(p, q) {
            if (p.violation < q.violation) return true;
            if (p.violation > q.violation) return false;
            let dominated = false;
            for (let i = 0; i < p.objectives.length; i++) {
                if (p.objectives[i] > q.objectives[i]) return false;
                if (p.objectives[i] < q.objectives[i]) dominated = true;
            }
            return dominated;
        }
        _crowdingDistance(front) {
            const n = front.length;
            if (n === 0) return;
            for (const ind of front) ind.crowdingDistance = 0;

            const M = front[0].objectives.length;
            for (let m = 0; m < M; m++) {
                front.sort((a, b) => a.objectives[m] - b.objectives[m]);
                front[0].crowdingDistance = front[n-1].crowdingDistance = Infinity;
                const range = front[n-1].objectives[m] - front[0].objectives[m] || 1;
                for (let i = 1; i < n - 1; i++) {
                    front[i].crowdingDistance += (front[i+1].objectives[m] - front[i-1].objectives[m]) / range;
                }
            }
        }
        _tournamentSelect() {
            const i = Math.floor(Math.random() * this.population.length);
            const j = Math.floor(Math.random() * this.population.length);
            const a = this.population[i], b = this.population[j];
            if (a.rank < b.rank) return a;
            if (b.rank < a.rank) return b;
            return a.crowdingDistance > b.crowdingDistance ? a : b;
        }
        // SBX Crossover
        _crossover(p1, p2) {
            if (Math.random() > this.crossoverRate) return [{ x: [...p1.x] }, { x: [...p2.x] }];
            const eta = 20, c1 = { x: [] }, c2 = { x: [] };
            for (let i = 0; i < this.dimension; i++) {
                const u = Math.random();
                const beta = u <= 0.5 ? Math.pow(2*u, 1/(eta+1)) : Math.pow(1/(2*(1-u)), 1/(eta+1));
                const [min, max] = this.bounds[i];
                c1.x[i] = Math.max(min, Math.min(max, 0.5*((1+beta)*p1.x[i] + (1-beta)*p2.x[i])));
                c2.x[i] = Math.max(min, Math.min(max, 0.5*((1-beta)*p1.x[i] + (1+beta)*p2.x[i])));
            }
            return [c1, c2];
        }
        // Polynomial Mutation
        _mutate(ind) {
            const eta = 20;
            for (let i = 0; i < this.dimension; i++) {
                if (Math.random() < this.mutationRate) {
                    const [min, max] = this.bounds[i], delta = max - min, x = ind.x[i], u = Math.random();
                    const deltaq = u < 0.5
                        ? Math.pow(2*u + (1-2*u)*Math.pow(1-(x-min)/delta, eta+1), 1/(eta+1)) - 1
                        : 1 - Math.pow(2*(1-u) + 2*(u-0.5)*Math.pow(1-(max-x)/delta, eta+1), 1/(eta+1));
                    ind.x[i] = Math.max(min, Math.min(max, x + deltaq * delta));
                }
            }
        }
        optimize() {
            this._initPopulation();

            for (let gen = 0; gen < this.maxGenerations; gen++) {
                this.stats.generations++;
                const offspring = [];
                while (offspring.length < this.populationSize) {
                    const [c1, c2] = this._crossover(this._tournamentSelect(), this._tournamentSelect());
                    this._mutate(c1); this._mutate(c2);
                    c1.objectives = []; c1.rank = 0; c1.crowdingDistance = 0; c1.violation = 0;
                    c2.objectives = []; c2.rank = 0; c2.crowdingDistance = 0; c2.violation = 0;
                    this._evaluate(c1); this._evaluate(c2);
                    offspring.push(c1, c2);
                }
                const combined = [...this.population, ...offspring.slice(0, this.populationSize)];
                const fronts = this._fastNonDominatedSort(combined);

                this.population = [];
                let fi = 0;
                while (this.population.length + fronts[fi].length <= this.populationSize) {
                    this._crowdingDistance(fronts[fi]);
                    this.population.push(...fronts[fi]);
                    fi++;
                    if (fi >= fronts.length) break;
                }
                if (this.population.length < this.populationSize && fi < fronts.length) {
                    this._crowdingDistance(fronts[fi]);
                    fronts[fi].sort((a, b) => b.crowdingDistance - a.crowdingDistance);
                    this.population.push(...fronts[fi].slice(0, this.populationSize - this.population.length));
                }
            }
            const finalFronts = this._fastNonDominatedSort(this.population);
            this.paretoFront = finalFronts[0].filter(ind => ind.violation === 0);
            this.stats.paretoSize = this.paretoFront.length;

            return {
                paretoFront: this.paretoFront.map(ind => ({ x: ind.x, objectives: ind.objectives })),
                stats: this.stats
            };
        }
    },
    // SECTION 2: GLOBAL OPTIMIZATION ALGORITHMS (MIT 15.093)

    // Simulated Annealing - Kirkpatrick et al. (1983)
    SimulatedAnnealing: class {
        constructor(options = {}) {
            this.objective = options.objective;
            this.bounds = options.bounds || [];
            this.T0 = options.initialTemp || 1000;
            this.Tmin = options.minTemp || 1e-8;
            this.alpha = options.coolingRate || 0.995;
            this.iterPerTemp = options.iterPerTemp || 100;
            this.dimension = this.bounds.length;
            this.stats = { evaluations: 0, accepted: 0, iterations: 0 };
        }
        _randomSolution() {
            return this.bounds.map(([min, max]) => min + Math.random() * (max - min));
        }
        _neighbor(x, T) {
            const scale = T / this.T0;
            return x.map((xi, i) => {
                const [min, max] = this.bounds[i];
                return Math.max(min, Math.min(max, xi + (Math.random() - 0.5) * (max - min) * scale));
            });
        }
        optimize() {
            let x = this._randomSolution();
            let fx = this.objective(x);
            this.stats.evaluations++;
            let best = { x: [...x], value: fx };
            let T = this.T0;

            while (T > this.Tmin) {
                for (let i = 0; i < this.iterPerTemp; i++) {
                    this.stats.iterations++;
                    const xNew = this._neighbor(x, T);
                    const fxNew = this.objective(xNew);
                    this.stats.evaluations++;

                    const delta = fxNew - fx;
                    if (delta < 0 || Math.exp(-delta / T) > Math.random()) {
                        x = xNew; fx = fxNew; this.stats.accepted++;
                        if (fx < best.value) { best = { x: [...x], value: fx }; }
                    }
                }
                T *= this.alpha;
            }
            return { x: best.x, value: best.value, stats: this.stats };
        }
    },
    // Differential Evolution - Storn & Price (1997)
    DifferentialEvolution: class {
        constructor(options = {}) {
            this.objective = options.objective;
            this.bounds = options.bounds || [];
            this.popSize = options.populationSize || 50;
            this.maxGen = options.maxGenerations || 500;
            this.F = options.F || 0.8;  // Differential weight
            this.CR = options.CR || 0.9; // Crossover rate
            this.dimension = this.bounds.length;
            this.stats = { evaluations: 0, generations: 0 };
        }
        _initPop() {
            const pop = [];
            for (let i = 0; i < this.popSize; i++) {
                const x = this.bounds.map(([min, max]) => min + Math.random() * (max - min));
                pop.push({ x, fitness: this.objective(x) });
                this.stats.evaluations++;
            }
            return pop;
        }
        optimize() {
            let pop = this._initPop();
            let best = pop.reduce((a, b) => a.fitness < b.fitness ? a : b);

            for (let g = 0; g < this.maxGen; g++) {
                this.stats.generations++;
                const newPop = [];

                for (let i = 0; i < this.popSize; i++) {
                    // Select 3 random distinct individuals (not i)
                    const indices = [];
                    while (indices.length < 3) {
                        const r = Math.floor(Math.random() * this.popSize);
                        if (r !== i && !indices.includes(r)) indices.push(r);
                    }
                    // DE/best/1 mutation
                    const mutant = best.x.map((xi, j) => {
                        let v = xi + this.F * (pop[indices[0]].x[j] - pop[indices[1]].x[j]);
                        const [min, max] = this.bounds[j];
                        return Math.max(min, Math.min(max, v));
                    });

                    // Binomial crossover
                    const jRand = Math.floor(Math.random() * this.dimension);
                    const trial = pop[i].x.map((xi, j) =>
                        (Math.random() < this.CR || j === jRand) ? mutant[j] : xi
                    );

                    const trialFitness = this.objective(trial);
                    this.stats.evaluations++;

                    if (trialFitness <= pop[i].fitness) {
                        newPop.push({ x: trial, fitness: trialFitness });
                        if (trialFitness < best.fitness) best = { x: [...trial], fitness: trialFitness };
                    } else {
                        newPop.push(pop[i]);
                    }
                }
                pop = newPop;
            }
            return { x: best.x, value: best.fitness, stats: this.stats };
        }
    },
    // CMA-ES - Hansen & Ostermeier (2001)
    // Covariance Matrix Adaptation Evolution Strategy
    CMAES: class {
        constructor(options = {}) {
            this.objective = options.objective;
            this.bounds = options.bounds || [];
            this.sigma0 = options.sigma || 0.5;
            this.maxIter = options.maxIterations || 500;
            this.dimension = this.bounds.length;
            this.stats = { evaluations: 0, iterations: 0 };
        }
        _init() {
            const n = this.dimension;
            this.lambda = Math.floor(4 + 3 * Math.log(n));
            this.mu = Math.floor(this.lambda / 2);

            // Weights for recombination
            this.weights = [];
            for (let i = 0; i < this.mu; i++) this.weights.push(Math.log(this.mu + 0.5) - Math.log(i + 1));
            const sumW = this.weights.reduce((a, b) => a + b, 0);
            this.weights = this.weights.map(w => w / sumW);
            this.mueff = 1 / this.weights.reduce((s, w) => s + w * w, 0);

            // Adaptation parameters
            this.cc = (4 + this.mueff/n) / (n + 4 + 2*this.mueff/n);
            this.cs = (this.mueff + 2) / (n + this.mueff + 5);
            this.c1 = 2 / ((n + 1.3)**2 + this.mueff);
            this.cmu = Math.min(1 - this.c1, 2 * (this.mueff - 2 + 1/this.mueff) / ((n + 2)**2 + this.mueff));
            this.damps = 1 + 2 * Math.max(0, Math.sqrt((this.mueff - 1)/(n + 1)) - 1) + this.cs;

            this.mean = this.bounds.map(([min, max]) => (min + max) / 2);
            this.sigma = this.sigma0;
            this.pc = Array(n).fill(0);
            this.ps = Array(n).fill(0);
            this.C = Array(n).fill(null).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
            this.B = Array(n).fill(null).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
            this.D = Array(n).fill(1);
        }
        _randn() {
            const u1 = Math.random(), u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        }
        _samplePop() {
            const pop = [];
            for (let i = 0; i < this.lambda; i++) {
                const z = Array(this.dimension).fill(0).map(() => this._randn());
                const y = Array(this.dimension).fill(0);
                for (let j = 0; j < this.dimension; j++) {
                    for (let k = 0; k < this.dimension; k++) y[j] += this.B[j][k] * this.D[k] * z[k];
                }
                const x = this.mean.map((m, j) => {
                    const [min, max] = this.bounds[j];
                    return Math.max(min, Math.min(max, m + this.sigma * y[j]));
                });
                pop.push({ x, y, fitness: this.objective(x) });
                this.stats.evaluations++;
            }
            return pop;
        }
        _update(pop) {
            const n = this.dimension;
            pop.sort((a, b) => a.fitness - b.fitness);

            const oldMean = [...this.mean];
            this.mean = Array(n).fill(0);
            for (let i = 0; i < this.mu; i++) {
                for (let j = 0; j < n; j++) this.mean[j] += this.weights[i] * pop[i].x[j];
            }
            const meanDiff = this.mean.map((m, i) => (m - oldMean[i]) / this.sigma);
            const chiN = Math.sqrt(n) * (1 - 1/(4*n) + 1/(21*n*n));

            // Update evolution paths
            for (let i = 0; i < n; i++) {
                this.ps[i] = (1 - this.cs) * this.ps[i] + Math.sqrt(this.cs * (2 - this.cs) * this.mueff) * meanDiff[i];
            }
            const psNorm = Math.sqrt(this.ps.reduce((s, p) => s + p*p, 0));
            this.sigma *= Math.exp((this.cs / this.damps) * (psNorm / chiN - 1));

            const hsig = psNorm / Math.sqrt(1 - Math.pow(1 - this.cs, 2 * this.stats.iterations)) < (1.4 + 2/(n+1)) * chiN ? 1 : 0;
            for (let i = 0; i < n; i++) {
                this.pc[i] = (1 - this.cc) * this.pc[i] + hsig * Math.sqrt(this.cc * (2 - this.cc) * this.mueff) * meanDiff[i];
            }
            // Update covariance matrix
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    this.C[i][j] = (1 - this.c1 - this.cmu) * this.C[i][j] + this.c1 * this.pc[i] * this.pc[j];
                    for (let k = 0; k < this.mu; k++) {
                        this.C[i][j] += this.cmu * this.weights[k] * pop[k].y[i] * pop[k].y[j];
                    }
                }
            }
        }
        optimize() {
            this._init();
            let best = { x: [...this.mean], value: this.objective(this.mean) };
            this.stats.evaluations++;

            for (let iter = 0; iter < this.maxIter; iter++) {
                this.stats.iterations++;
                const pop = this._samplePop();
                this._update(pop);
                if (pop[0].fitness < best.value) best = { x: [...pop[0].x], value: pop[0].fitness };
                if (this.sigma < 1e-12) break;
            }
            return { x: best.x, value: best.value, stats: this.stats };
        }
    },
    // Basin Hopping - Wales & Doye (1997)
    BasinHopping: class {
        constructor(options = {}) {
            this.objective = options.objective;
            this.bounds = options.bounds || [];
            this.stepSize = options.stepSize || 0.5;
            this.T = options.temperature || 1.0;
            this.maxIter = options.maxIterations || 100;
            this.localIter = options.localIterations || 50;
            this.dimension = this.bounds.length;
            this.stats = { evaluations: 0, hops: 0 };
        }
        // Nelder-Mead local minimization
        _localMin(x0) {
            const n = this.dimension;
            const simplex = [{ x: [...x0], f: this.objective(x0) }];
            this.stats.evaluations++;

            for (let i = 0; i < n; i++) {
                const xi = [...x0];
                xi[i] += 0.05 * (this.bounds[i][1] - this.bounds[i][0]);
                xi[i] = Math.max(this.bounds[i][0], Math.min(this.bounds[i][1], xi[i]));
                simplex.push({ x: xi, f: this.objective(xi) });
                this.stats.evaluations++;
            }
            for (let iter = 0; iter < this.localIter; iter++) {
                simplex.sort((a, b) => a.f - b.f);

                // Centroid
                const c = Array(n).fill(0);
                for (let i = 0; i < n; i++) {
                    for (let j = 0; j < n; j++) c[j] += simplex[i].x[j] / n;
                }
                // Reflection
                const worst = simplex[n];
                const r = c.map((ci, j) => {
                    const v = ci + (ci - worst.x[j]);
                    return Math.max(this.bounds[j][0], Math.min(this.bounds[j][1], v));
                });
                const fr = this.objective(r);
                this.stats.evaluations++;

                if (fr < simplex[0].f) {
                    // Expansion
                    const e = c.map((ci, j) => {
                        const v = ci + 2 * (r[j] - ci);
                        return Math.max(this.bounds[j][0], Math.min(this.bounds[j][1], v));
                    });
                    const fe = this.objective(e);
                    this.stats.evaluations++;
                    simplex[n] = fe < fr ? { x: e, f: fe } : { x: r, f: fr };
                } else if (fr < simplex[n-1].f) {
                    simplex[n] = { x: r, f: fr };
                } else {
                    // Contraction
                    const h = c.map((ci, j) => {
                        const v = ci + 0.5 * (worst.x[j] - ci);
                        return Math.max(this.bounds[j][0], Math.min(this.bounds[j][1], v));
                    });
                    const fh = this.objective(h);
                    this.stats.evaluations++;

                    if (fh < worst.f) {
                        simplex[n] = { x: h, f: fh };
                    } else {
                        // Shrink
                        for (let i = 1; i <= n; i++) {
                            simplex[i].x = simplex[i].x.map((xi, j) => {
                                const v = simplex[0].x[j] + 0.5 * (xi - simplex[0].x[j]);
                                return Math.max(this.bounds[j][0], Math.min(this.bounds[j][1], v));
                            });
                            simplex[i].f = this.objective(simplex[i].x);
                            this.stats.evaluations++;
                        }
                    }
                }
            }
            simplex.sort((a, b) => a.f - b.f);
            return { x: simplex[0].x, value: simplex[0].f };
        }
        _perturb(x) {
            return x.map((xi, i) => {
                const [min, max] = this.bounds[i];
                const v = xi + (Math.random() - 0.5) * this.stepSize * (max - min);
                return Math.max(min, Math.min(max, v));
            });
        }
        optimize() {
            let current = this.bounds.map(([min, max]) => min + Math.random() * (max - min));
            let { x: cx, value: cv } = this._localMin(current);
            let best = { x: [...cx], value: cv };

            for (let i = 0; i < this.maxIter; i++) {
                const perturbed = this._perturb(cx);
                const { x: nx, value: nv } = this._localMin(perturbed);

                if (nv < cv || Math.exp((cv - nv) / this.T) > Math.random()) {
                    cx = nx; cv = nv; this.stats.hops++;
                    if (nv < best.value) best = { x: [...nx], value: nv };
                }
            }
            return { x: best.x, value: best.value, stats: this.stats };
        }
    },
    // SECTION 3: CONSTRAINT HANDLING (MIT 15.093)

    ConstraintHandler: {
        // Penalty method - quadratic penalty for constraint violations
        penaltyMethod(objective, constraints, rho = 1000) {
            return (x) => {
                let penalty = 0;
                for (const c of constraints) {
                    const v = c(x);
                    if (v > 0) penalty += rho * v * v;
                }
                return objective(x) + penalty;
            };
        },
        // Barrier method (log barrier) - interior point
        barrierMethod(objective, constraints, mu = 0.1) {
            return (x) => {
                let barrier = 0;
                for (const c of constraints) {
                    const g = c(x);
                    if (g >= 0) return Infinity;
                    barrier -= Math.log(-g);
                }
                return objective(x) + mu * barrier;
            };
        },
        // Augmented Lagrangian
        AugmentedLagrangian: class {
            constructor(objective, constraints, options = {}) {
                this.f = objective;
                this.g = constraints;
                this.rho = options.rho || 1;
                this.lambda = constraints.map(() => 0);
            }
            augmented(x) {
                let L = this.f(x);
                for (let i = 0; i < this.g.length; i++) {
                    const gi = this.g[i](x);
                    const term = Math.max(0, gi + this.lambda[i] / this.rho);
                    L += this.rho / 2 * term * term - this.lambda[i]**2 / (2 * this.rho);
                }
                return L;
            }
            update(x) {
                for (let i = 0; i < this.g.length; i++) {
                    this.lambda[i] = Math.max(0, this.lambda[i] + this.rho * this.g[i](x));
                }
            }
        }
    },
    // SECTION 4: CONVEX OPTIMIZATION (MIT 6.251J)

    // Interior Point Method for LP: min c'x s.t. Ax <= b
    InteriorPointLP: class {
        constructor(c, A, b) {
            this.c = c; this.A = A; this.b = b;
            this.n = c.length; this.m = A.length;
            this.maxIter = 100; this.tol = 1e-8;
        }
        solve() {
            let x = Array(this.n).fill(1);
            let s = Array(this.m).fill(1);
            let y = Array(this.m).fill(1);
            let mu = 1;

            for (let iter = 0; iter < this.maxIter; iter++) {
                const gap = s.reduce((sum, si, i) => sum + si * y[i], 0);
                if (gap < this.tol) {
                    return { x, value: this.c.reduce((s, ci, i) => s + ci * x[i], 0), iterations: iter, converged: true };
                }
                // Simplified Newton step
                for (let j = 0; j < this.n; j++) {
                    let grad = this.c[j];
                    for (let i = 0; i < this.m; i++) grad -= this.A[i][j] * y[i];
                    x[j] = Math.max(0.001, x[j] - 0.1 * grad);
                }
                for (let i = 0; i < this.m; i++) {
                    let ax = 0;
                    for (let j = 0; j < this.n; j++) ax += this.A[i][j] * x[j];
                    s[i] = Math.max(0.001, this.b[i] - ax);
                    y[i] = Math.max(0.001, mu / s[i]);
                }
                mu = gap / (3 * this.m);
            }
            return { x, value: this.c.reduce((s, ci, i) => s + ci * x[i], 0), iterations: this.maxIter, converged: false };
        }
    },
    // ADMM for Lasso: min 0.5||Ax - b||² + λ||x||₁
    ADMM: class {
        constructor(options = {}) {
            this.rho = options.rho || 1;
            this.maxIter = options.maxIter || 1000;
            this.tol = options.tol || 1e-6;
        }
        solveLasso(A, b, lambda) {
            const [m, n] = [A.length, A[0].length];
            let x = Array(n).fill(0);
            let z = Array(n).fill(0);
            let u = Array(n).fill(0);

            // Precompute A'A diagonal + rho
            const AtAdiag = Array(n).fill(0);
            const Atb = Array(n).fill(0);
            for (let i = 0; i < n; i++) {
                for (let k = 0; k < m; k++) {
                    AtAdiag[i] += A[k][i] * A[k][i];
                    Atb[i] += A[k][i] * b[k];
                }
                AtAdiag[i] += this.rho;
            }
            for (let iter = 0; iter < this.maxIter; iter++) {
                // x-update
                for (let i = 0; i < n; i++) {
                    x[i] = (Atb[i] + this.rho * (z[i] - u[i])) / AtAdiag[i];
                }
                // z-update (soft thresholding)
                const thresh = lambda / this.rho;
                for (let i = 0; i < n; i++) {
                    const v = x[i] + u[i];
                    z[i] = Math.sign(v) * Math.max(0, Math.abs(v) - thresh);
                }
                // u-update
                for (let i = 0; i < n; i++) u[i] += x[i] - z[i];

                const primalRes = Math.sqrt(x.reduce((s, xi, i) => s + (xi - z[i])**2, 0));
                if (primalRes < this.tol) return { x: z, iterations: iter, converged: true };
            }
            return { x: z, iterations: this.maxIter, converged: false };
        }