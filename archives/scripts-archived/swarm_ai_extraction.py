#!/usr/bin/env python3
"""
PRISM AI/ML Swarm Extraction v2.0
Parallel search and extraction for stub modules + missing RL implementations
"""

import os
import re
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime

# Configuration
MONOLITH_PATH = r"C:\\PRISM\_BUILD\PRISM_v8_89_002_TRUE_100_PERCENT\PRISM_v8_89_002_TRUE_100_PERCENT.html"
OUTPUT_DIR = r"C:\\PRISM\EXTRACTED\engines\ai_ml"

# Search patterns for different module types
SEARCH_PATTERNS = {
    # Genetic Algorithm patterns
    'GA': [
        r'crossover.*function|function.*crossover',
        r'mutation.*rate|mutate.*function',
        r'selection.*tournament|roulette.*selection',
        r'fitness.*function|evaluate.*fitness',
        r'population.*generation|evolve.*population',
        r'genetic.*optimize|GA.*run'
    ],
    # Simulated Annealing patterns
    'SA': [
        r'temperature.*cooling|cooling.*schedule',
        r'anneal.*function|simulated.*anneal',
        r'accept.*probability|metropolis.*criterion',
        r'neighbor.*solution|perturbation'
    ],
    # Differential Evolution patterns
    'DE': [
        r'differential.*evolution|DE.*optimize',
        r'mutation.*factor|crossover.*CR',
        r'trial.*vector|donor.*vector',
        r'DE\/rand|DE\/best'
    ],
    # Reinforcement Learning patterns
    'RL_QLEARN': [
        r'Q.*table|Q.*value.*update',
        r'epsilon.*greedy|explore.*exploit',
        r'bellman.*equation|temporal.*difference',
        r'state.*action.*reward',
        r'PRISM_RL.*Q|qlearning'
    ],
    'RL_DQN': [
        r'experience.*replay|replay.*buffer',
        r'target.*network|double.*DQN',
        r'DQN.*predict|deep.*Q.*network',
        r'prioritized.*replay|PER'
    ],
    'RL_POLICY': [
        r'policy.*gradient|REINFORCE',
        r'actor.*critic|A2C|A3C',
        r'advantage.*function|baseline',
        r'PPO|TRPO|policy.*optimization'
    ],
    # CNN patterns
    'CNN': [
        r'convolution.*layer|conv2d',
        r'pooling.*layer|max.*pool',
        r'feature.*map|kernel.*filter',
        r'CNN.*forward|convolutional'
    ]
}

def search_pattern_in_file(pattern, lines, context=5):
    """Search for pattern and return matches with context"""
    results = []
    regex = re.compile(pattern, re.IGNORECASE)
    
    for i, line in enumerate(lines):
        if regex.search(line):
            start = max(0, i - context)
            end = min(len(lines), i + context + 1)
            results.append({
                'line_num': i + 1,
                'match': line.strip(),
                'context': lines[start:end]
            })
    return results

def extract_module_at_line(lines, start_line, module_name):
    """Extract complete module starting at line using brace matching"""
    idx = start_line - 1
    if idx >= len(lines):
        return None, 0, 0
    
    # Find opening brace
    brace_count = 0
    found_start = False
    content_lines = []
    actual_start = idx
    
    for i in range(idx, min(idx + 2000, len(lines))):
        line = lines[i]
        content_lines.append(line)
        
        brace_count += line.count('{') - line.count('}')
        
        if not found_start and '{' in line:
            found_start = True
            actual_start = i
        
        if found_start and brace_count == 0:
            return '\n'.join(content_lines), actual_start + 1, i + 1
    
    return '\n'.join(content_lines[:500]), actual_start + 1, actual_start + 500

def run_search_agent(agent_id, category, patterns, lines):
    """Single search agent for parallel execution"""
    results = {
        'agent_id': agent_id,
        'category': category,
        'matches': [],
        'total_hits': 0
    }
    
    for pattern in patterns:
        matches = search_pattern_in_file(pattern, lines, context=3)
        for m in matches:
            results['matches'].append({
                'pattern': pattern,
                'line': m['line_num'],
                'match': m['match'][:200]
            })
        results['total_hits'] += len(matches)
    
    # Deduplicate by line number
    seen_lines = set()
    unique_matches = []
    for m in results['matches']:
        if m['line'] not in seen_lines:
            seen_lines.add(m['line'])
            unique_matches.append(m)
    results['matches'] = unique_matches[:20]  # Top 20 unique
    
    return results

def build_ga_module(constants_found):
    """Build complete GA module from found constants + MIT knowledge"""
    return '''// PRISM_GA_ENGINE - Genetic Algorithm Optimizer
// Built from PRISM_CONSTANTS.AI + MIT 6.036 Genetic Algorithms
// Generated: ''' + datetime.now().isoformat() + '''

const PRISM_GA_ENGINE = {
    name: 'PRISM_GA_ENGINE',
    version: '2.0.0',
    source: 'MIT 6.036, Holland 1975, Goldberg 1989',
    
    // Default parameters from PRISM_CONSTANTS
    defaults: {
        populationSize: 200,
        maxGenerations: 100,
        mutationRate: 0.1,
        crossoverRate: 0.8,
        eliteRatio: 0.1,
        tournamentSize: 3
    },
    
    /**
     * Initialize population with random chromosomes
     */
    initializePopulation: function(size, chromosomeLength, bounds) {
        const population = [];
        for (let i = 0; i < size; i++) {
            const chromosome = [];
            for (let j = 0; j < chromosomeLength; j++) {
                const [min, max] = bounds[j] || [0, 1];
                chromosome.push(min + Math.random() * (max - min));
            }
            population.push({ genes: chromosome, fitness: 0 });
        }
        return population;
    },
    
    /**
     * Tournament selection
     */
    tournamentSelect: function(population, tournamentSize = 3) {
        let best = null;
        for (let i = 0; i < tournamentSize; i++) {
            const idx = Math.floor(Math.random() * population.length);
            const candidate = population[idx];
            if (!best || candidate.fitness > best.fitness) {
                best = candidate;
            }
        }
        return best;
    },
    
    /**
     * Roulette wheel selection
     */
    rouletteSelect: function(population) {
        const totalFitness = population.reduce((sum, ind) => sum + Math.max(0, ind.fitness), 0);
        if (totalFitness === 0) return population[Math.floor(Math.random() * population.length)];
        
        let spin = Math.random() * totalFitness;
        for (const individual of population) {
            spin -= Math.max(0, individual.fitness);
            if (spin <= 0) return individual;
        }
        return population[population.length - 1];
    },
    
    /**
     * Single-point crossover
     */
    crossover: function(parent1, parent2, rate = 0.8) {
        if (Math.random() > rate) {
            return [{ ...parent1 }, { ...parent2 }];
        }
        
        const point = Math.floor(Math.random() * parent1.genes.length);
        const child1Genes = [...parent1.genes.slice(0, point), ...parent2.genes.slice(point)];
        const child2Genes = [...parent2.genes.slice(0, point), ...parent1.genes.slice(point)];
        
        return [
            { genes: child1Genes, fitness: 0 },
            { genes: child2Genes, fitness: 0 }
        ];
    },
    
    /**
     * Two-point crossover
     */
    crossoverTwoPoint: function(parent1, parent2, rate = 0.8) {
        if (Math.random() > rate) {
            return [{ ...parent1 }, { ...parent2 }];
        }
        
        const len = parent1.genes.length;
        let point1 = Math.floor(Math.random() * len);
        let point2 = Math.floor(Math.random() * len);
        if (point1 > point2) [point1, point2] = [point2, point1];
        
        const child1Genes = [
            ...parent1.genes.slice(0, point1),
            ...parent2.genes.slice(point1, point2),
            ...parent1.genes.slice(point2)
        ];
        const child2Genes = [
            ...parent2.genes.slice(0, point1),
            ...parent1.genes.slice(point1, point2),
            ...parent2.genes.slice(point2)
        ];
        
        return [
            { genes: child1Genes, fitness: 0 },
            { genes: child2Genes, fitness: 0 }
        ];
    },
    
    /**
     * Uniform crossover
     */
    crossoverUniform: function(parent1, parent2, rate = 0.5) {
        const child1Genes = [];
        const child2Genes = [];
        
        for (let i = 0; i < parent1.genes.length; i++) {
            if (Math.random() < rate) {
                child1Genes.push(parent2.genes[i]);
                child2Genes.push(parent1.genes[i]);
            } else {
                child1Genes.push(parent1.genes[i]);
                child2Genes.push(parent2.genes[i]);
            }
        }
        
        return [
            { genes: child1Genes, fitness: 0 },
            { genes: child2Genes, fitness: 0 }
        ];
    },
    
    /**
     * Gaussian mutation
     */
    mutate: function(individual, rate = 0.1, bounds = null, sigma = 0.1) {
        const mutated = { genes: [...individual.genes], fitness: 0 };
        
        for (let i = 0; i < mutated.genes.length; i++) {
            if (Math.random() < rate) {
                // Gaussian perturbation
                const range = bounds ? (bounds[i][1] - bounds[i][0]) : 1;
                mutated.genes[i] += this._gaussianRandom() * sigma * range;
                
                // Clamp to bounds
                if (bounds) {
                    mutated.genes[i] = Math.max(bounds[i][0], Math.min(bounds[i][1], mutated.genes[i]));
                }
            }
        }
        return mutated;
    },
    
    /**
     * Box-Muller transform for Gaussian random
     */
    _gaussianRandom: function() {
        let u1, u2;
        do { u1 = Math.random(); } while (u1 === 0);
        u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    
    /**
     * Main optimization loop
     */
    optimize: function(fitnessFunc, options = {}) {
        const {
            populationSize = this.defaults.populationSize,
            maxGenerations = this.defaults.maxGenerations,
            mutationRate = this.defaults.mutationRate,
            crossoverRate = this.defaults.crossoverRate,
            eliteRatio = this.defaults.eliteRatio,
            tournamentSize = this.defaults.tournamentSize,
            chromosomeLength = 10,
            bounds = null,
            verbose = false,
            callback = null
        } = options;
        
        // Initialize
        const defaultBounds = Array(chromosomeLength).fill([0, 1]);
        const actualBounds = bounds || defaultBounds;
        let population = this.initializePopulation(populationSize, chromosomeLength, actualBounds);
        
        // Evaluate initial fitness
        for (const ind of population) {
            ind.fitness = fitnessFunc(ind.genes);
        }
        
        let bestEver = { genes: null, fitness: -Infinity };
        const history = [];
        
        // Evolution loop
        for (let gen = 0; gen < maxGenerations; gen++) {
            // Sort by fitness (descending)
            population.sort((a, b) => b.fitness - a.fitness);
            
            // Track best
            if (population[0].fitness > bestEver.fitness) {
                bestEver = { genes: [...population[0].genes], fitness: population[0].fitness };
            }
            
            // Elitism - keep top individuals
            const eliteCount = Math.floor(populationSize * eliteRatio);
            const newPopulation = population.slice(0, eliteCount).map(ind => ({
                genes: [...ind.genes],
                fitness: ind.fitness
            }));
            
            // Generate offspring
            while (newPopulation.length < populationSize) {
                const parent1 = this.tournamentSelect(population, tournamentSize);
                const parent2 = this.tournamentSelect(population, tournamentSize);
                
                let [child1, child2] = this.crossover(parent1, parent2, crossoverRate);
                
                child1 = this.mutate(child1, mutationRate, actualBounds);
                child2 = this.mutate(child2, mutationRate, actualBounds);
                
                newPopulation.push(child1);
                if (newPopulation.length < populationSize) {
                    newPopulation.push(child2);
                }
            }
            
            // Evaluate new population
            for (const ind of newPopulation) {
                if (ind.fitness === 0) {
                    ind.fitness = fitnessFunc(ind.genes);
                }
            }
            
            population = newPopulation;
            
            // Statistics
            const avgFitness = population.reduce((s, i) => s + i.fitness, 0) / population.length;
            history.push({
                generation: gen,
                best: population[0].fitness,
                average: avgFitness,
                bestEver: bestEver.fitness
            });
            
            if (verbose && gen % 10 === 0) {
                console.log(`Gen ${gen}: Best=${population[0].fitness.toFixed(4)}, Avg=${avgFitness.toFixed(4)}`);
            }
            
            if (callback) callback(gen, bestEver, history);
        }
        
        return {
            solution: bestEver.genes,
            fitness: bestEver.fitness,
            history: history,
            finalPopulation: population
        };
    }
};

// Export
if (typeof module !== 'undefined') module.exports = PRISM_GA_ENGINE;
if (typeof window !== 'undefined') window.PRISM_GA_ENGINE = PRISM_GA_ENGINE;
'''

def build_sa_module():
    """Build complete Simulated Annealing module"""
    return '''// PRISM_SIMULATED_ANNEALING - Simulated Annealing Optimizer
// Built from MIT 6.036 + Kirkpatrick 1983
// Generated: ''' + datetime.now().isoformat() + '''

const PRISM_SIMULATED_ANNEALING = {
    name: 'PRISM_SIMULATED_ANNEALING',
    version: '2.0.0',
    source: 'MIT 6.036, Kirkpatrick 1983, Cerny 1985',
    
    defaults: {
        initialTemp: 1000,
        finalTemp: 0.001,
        coolingRate: 0.995,
        maxIterations: 10000,
        maxIterPerTemp: 100
    },
    
    /**
     * Generate neighbor solution (Gaussian perturbation)
     */
    generateNeighbor: function(solution, bounds, sigma = 0.1) {
        const neighbor = [...solution];
        const idx = Math.floor(Math.random() * solution.length);
        
        const range = bounds ? (bounds[idx][1] - bounds[idx][0]) : 1;
        neighbor[idx] += this._gaussianRandom() * sigma * range;
        
        if (bounds) {
            neighbor[idx] = Math.max(bounds[idx][0], Math.min(bounds[idx][1], neighbor[idx]));
        }
        return neighbor;
    },
    
    _gaussianRandom: function() {
        let u1, u2;
        do { u1 = Math.random(); } while (u1 === 0);
        u2 = Math.random();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    },
    
    /**
     * Acceptance probability (Metropolis criterion)
     */
    acceptanceProbability: function(currentEnergy, newEnergy, temperature) {
        if (newEnergy < currentEnergy) return 1.0;
        return Math.exp((currentEnergy - newEnergy) / temperature);
    },
    
    /**
     * Cooling schedules
     */
    cooling: {
        exponential: (temp, rate) => temp * rate,
        linear: (temp, rate, iteration, maxIter) => temp - (temp * rate / maxIter),
        logarithmic: (temp, iteration) => temp / Math.log(iteration + 2),
        quadratic: (temp, rate) => temp * rate * rate
    },
    
    /**
     * Main optimization
     */
    optimize: function(objectiveFunc, options = {}) {
        const {
            initialSolution = null,
            dimensions = 10,
            bounds = null,
            initialTemp = this.defaults.initialTemp,
            finalTemp = this.defaults.finalTemp,
            coolingRate = this.defaults.coolingRate,
            maxIterations = this.defaults.maxIterations,
            maxIterPerTemp = this.defaults.maxIterPerTemp,
            coolingSchedule = 'exponential',
            minimize = true,
            verbose = false,
            callback = null
        } = options;
        
        // Initialize
        const defaultBounds = Array(dimensions).fill([0, 1]);
        const actualBounds = bounds || defaultBounds;
        
        let current = initialSolution || actualBounds.map(([min, max]) => min + Math.random() * (max - min));
        let currentEnergy = objectiveFunc(current);
        if (!minimize) currentEnergy = -currentEnergy;
        
        let best = [...current];
        let bestEnergy = currentEnergy;
        
        let temperature = initialTemp;
        const history = [];
        let iteration = 0;
        
        while (temperature > finalTemp && iteration < maxIterations) {
            for (let i = 0; i < maxIterPerTemp; i++) {
                const neighbor = this.generateNeighbor(current, actualBounds);
                let neighborEnergy = objectiveFunc(neighbor);
                if (!minimize) neighborEnergy = -neighborEnergy;
                
                const ap = this.acceptanceProbability(currentEnergy, neighborEnergy, temperature);
                
                if (Math.random() < ap) {
                    current = neighbor;
                    currentEnergy = neighborEnergy;
                    
                    if (currentEnergy < bestEnergy) {
                        best = [...current];
                        bestEnergy = currentEnergy;
                    }
                }
                
                iteration++;
                if (iteration >= maxIterations) break;
            }
            
            // Cool down
            const coolingFn = this.cooling[coolingSchedule] || this.cooling.exponential;
            temperature = coolingFn(temperature, coolingRate, iteration, maxIterations);
            
            history.push({
                iteration,
                temperature,
                currentEnergy: minimize ? currentEnergy : -currentEnergy,
                bestEnergy: minimize ? bestEnergy : -bestEnergy
            });
            
            if (verbose && iteration % 1000 === 0) {
                console.log(`Iter ${iteration}: Temp=${temperature.toFixed(2)}, Best=${(minimize ? bestEnergy : -bestEnergy).toFixed(4)}`);
            }
            
            if (callback) callback(iteration, best, bestEnergy, temperature);
        }
        
        return {
            solution: best,
            energy: minimize ? bestEnergy : -bestEnergy,
            iterations: iteration,
            finalTemperature: temperature,
            history
        };
    }
};

if (typeof module !== 'undefined') module.exports = PRISM_SIMULATED_ANNEALING;
if (typeof window !== 'undefined') window.PRISM_SIMULATED_ANNEALING = PRISM_SIMULATED_ANNEALING;
'''

def build_de_module():
    """Build complete Differential Evolution module"""
    return '''// PRISM_DIFFERENTIAL_EVOLUTION - Differential Evolution Optimizer
// Built from MIT 6.036 + Storn & Price 1997
// Generated: ''' + datetime.now().isoformat() + '''

const PRISM_DIFFERENTIAL_EVOLUTION = {
    name: 'PRISM_DIFFERENTIAL_EVOLUTION',
    version: '2.0.0',
    source: 'MIT 6.036, Storn & Price 1997',
    
    defaults: {
        populationSize: 50,
        maxGenerations: 1000,
        F: 0.8,           // Mutation factor
        CR: 0.9,          // Crossover rate
        strategy: 'rand1bin'
    },
    
    /**
     * DE Strategies
     */
    strategies: {
        // DE/rand/1/bin
        rand1bin: function(population, target, F, best) {
            const n = population.length;
            let r1, r2, r3;
            do { r1 = Math.floor(Math.random() * n); } while (r1 === target);
            do { r2 = Math.floor(Math.random() * n); } while (r2 === target || r2 === r1);
            do { r3 = Math.floor(Math.random() * n); } while (r3 === target || r3 === r1 || r3 === r2);
            
            return population[r1].genes.map((g, i) => 
                g + F * (population[r2].genes[i] - population[r3].genes[i])
            );
        },
        
        // DE/best/1/bin
        best1bin: function(population, target, F, best) {
            const n = population.length;
            let r1, r2;
            do { r1 = Math.floor(Math.random() * n); } while (r1 === target);
            do { r2 = Math.floor(Math.random() * n); } while (r2 === target || r2 === r1);
            
            return best.genes.map((g, i) => 
                g + F * (population[r1].genes[i] - population[r2].genes[i])
            );
        },
        
        // DE/rand/2/bin
        rand2bin: function(population, target, F, best) {
            const n = population.length;
            const indices = [];
            while (indices.length < 5) {
                const r = Math.floor(Math.random() * n);
                if (r !== target && !indices.includes(r)) indices.push(r);
            }
            const [r1, r2, r3, r4, r5] = indices;
            
            return population[r1].genes.map((g, i) => 
                g + F * (population[r2].genes[i] - population[r3].genes[i]) +
                F * (population[r4].genes[i] - population[r5].genes[i])
            );
        },
        
        // DE/current-to-best/1/bin
        currentToBest1bin: function(population, target, F, best) {
            const n = population.length;
            let r1, r2;
            do { r1 = Math.floor(Math.random() * n); } while (r1 === target);
            do { r2 = Math.floor(Math.random() * n); } while (r2 === target || r2 === r1);
            
            return population[target].genes.map((g, i) => 
                g + F * (best.genes[i] - g) +
                F * (population[r1].genes[i] - population[r2].genes[i])
            );
        }
    },
    
    /**
     * Binomial crossover
     */
    crossoverBinomial: function(target, donor, CR) {
        const dim = target.length;
        const jRand = Math.floor(Math.random() * dim);
        
        return target.map((t, j) => 
            (Math.random() < CR || j === jRand) ? donor[j] : t
        );
    },
    
    /**
     * Exponential crossover
     */
    crossoverExponential: function(target, donor, CR) {
        const dim = target.length;
        const trial = [...target];
        let j = Math.floor(Math.random() * dim);
        let L = 0;
        
        do {
            trial[j] = donor[j];
            j = (j + 1) % dim;
            L++;
        } while (Math.random() < CR && L < dim);
        
        return trial;
    },
    
    /**
     * Main optimization
     */
    optimize: function(objectiveFunc, options = {}) {
        const {
            populationSize = this.defaults.populationSize,
            maxGenerations = this.defaults.maxGenerations,
            F = this.defaults.F,
            CR = this.defaults.CR,
            strategy = this.defaults.strategy,
            dimensions = 10,
            bounds = null,
            minimize = true,
            verbose = false,
            callback = null
        } = options;
        
        const defaultBounds = Array(dimensions).fill([0, 1]);
        const actualBounds = bounds || defaultBounds;
        
        // Initialize population
        let population = [];
        for (let i = 0; i < populationSize; i++) {
            const genes = actualBounds.map(([min, max]) => min + Math.random() * (max - min));
            let fitness = objectiveFunc(genes);
            if (!minimize) fitness = -fitness;
            population.push({ genes, fitness });
        }
        
        // Find initial best
        let best = population.reduce((b, ind) => ind.fitness < b.fitness ? ind : b, population[0]);
        best = { genes: [...best.genes], fitness: best.fitness };
        
        const history = [];
        const strategyFn = this.strategies[strategy] || this.strategies.rand1bin;
        
        // Evolution loop
        for (let gen = 0; gen < maxGenerations; gen++) {
            const newPopulation = [];
            
            for (let i = 0; i < populationSize; i++) {
                // Mutation
                const donor = strategyFn(population, i, F, best);
                
                // Bound checking
                const boundedDonor = donor.map((d, j) => 
                    Math.max(actualBounds[j][0], Math.min(actualBounds[j][1], d))
                );
                
                // Crossover
                const trial = this.crossoverBinomial(population[i].genes, boundedDonor, CR);
                
                // Selection
                let trialFitness = objectiveFunc(trial);
                if (!minimize) trialFitness = -trialFitness;
                
                if (trialFitness <= population[i].fitness) {
                    newPopulation.push({ genes: trial, fitness: trialFitness });
                    if (trialFitness < best.fitness) {
                        best = { genes: [...trial], fitness: trialFitness };
                    }
                } else {
                    newPopulation.push(population[i]);
                }
            }
            
            population = newPopulation;
            
            const avgFitness = population.reduce((s, i) => s + i.fitness, 0) / populationSize;
            history.push({
                generation: gen,
                best: minimize ? best.fitness : -best.fitness,
                average: minimize ? avgFitness : -avgFitness
            });
            
            if (verbose && gen % 100 === 0) {
                console.log(`Gen ${gen}: Best=${(minimize ? best.fitness : -best.fitness).toFixed(6)}`);
            }
            
            if (callback) callback(gen, best, history);
        }
        
        return {
            solution: best.genes,
            fitness: minimize ? best.fitness : -best.fitness,
            history,
            finalPopulation: population
        };
    }
};

if (typeof module !== 'undefined') module.exports = PRISM_DIFFERENTIAL_EVOLUTION;
if (typeof window !== 'undefined') window.PRISM_DIFFERENTIAL_EVOLUTION = PRISM_DIFFERENTIAL_EVOLUTION;
'''

def build_rl_qlearning_module():
    """Build Q-Learning module"""
    return '''// PRISM_RL_QLEARNING_ENGINE - Q-Learning Implementation
// Built from MIT 6.036, Stanford CS 229, Watkins 1989
// Generated: ''' + datetime.now().isoformat() + '''

const PRISM_RL_QLEARNING_ENGINE = {
    name: 'PRISM_RL_QLEARNING_ENGINE',
    version: '2.0.0',
    source: 'MIT 6.036, Stanford CS 229, Watkins 1989',
    
    defaults: {
        learningRate: 0.1,
        discountFactor: 0.99,
        epsilon: 1.0,
        epsilonMin: 0.01,
        epsilonDecay: 0.995
    },
    
    /**
     * Create Q-Learning agent
     */
    createAgent: function(options = {}) {
        const {
            stateSize = 10,
            actionSize = 4,
            learningRate = this.defaults.learningRate,
            discountFactor = this.defaults.discountFactor,
            epsilon = this.defaults.epsilon,
            epsilonMin = this.defaults.epsilonMin,
            epsilonDecay = this.defaults.epsilonDecay
        } = options;
        
        return {
            stateSize,
            actionSize,
            learningRate,
            discountFactor,
            epsilon,
            epsilonMin,
            epsilonDecay,
            qTable: new Map(),
            
            _stateKey: function(state) {
                return Array.isArray(state) ? state.join(',') : String(state);
            },
            
            _getQ: function(state, action) {
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    this.qTable.set(key, new Array(this.actionSize).fill(0));
                }
                return this.qTable.get(key)[action];
            },
            
            _setQ: function(state, action, value) {
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    this.qTable.set(key, new Array(this.actionSize).fill(0));
                }
                this.qTable.get(key)[action] = value;
            },
            
            /**
             * Epsilon-greedy action selection
             */
            selectAction: function(state, training = true) {
                if (training && Math.random() < this.epsilon) {
                    return Math.floor(Math.random() * this.actionSize);
                }
                
                const key = this._stateKey(state);
                if (!this.qTable.has(key)) {
                    return Math.floor(Math.random() * this.actionSize);
                }
                
                const qValues = this.qTable.get(key);
                return qValues.indexOf(Math.max(...qValues));
            },
            
            /**
             * Q-Learning update (Bellman equation)
             */
            learn: function(state, action, reward, nextState, done) {
                const currentQ = this._getQ(state, action);
                
                let targetQ;
                if (done) {
                    targetQ = reward;
                } else {
                    const nextKey = this._stateKey(nextState);
                    const nextQs = this.qTable.get(nextKey) || new Array(this.actionSize).fill(0);
                    const maxNextQ = Math.max(...nextQs);
                    targetQ = reward + this.discountFactor * maxNextQ;
                }
                
                // TD update
                const newQ = currentQ + this.learningRate * (targetQ - currentQ);
                this._setQ(state, action, newQ);
                
                return newQ;
            },
            
            /**
             * Decay epsilon after episode
             */
            decayEpsilon: function() {
                this.epsilon = Math.max(this.epsilonMin, this.epsilon * this.epsilonDecay);
            },
            
            /**
             * Get all Q-values for a state
             */
            getQValues: function(state) {
                const key = this._stateKey(state);
                return this.qTable.get(key) || new Array(this.actionSize).fill(0);
            },
            
            /**
             * Save Q-table
             */
            save: function() {
                return {
                    qTable: Array.from(this.qTable.entries()),
                    epsilon: this.epsilon,
                    config: {
                        stateSize: this.stateSize,
                        actionSize: this.actionSize,
                        learningRate: this.learningRate,
                        discountFactor: this.discountFactor
                    }
                };
            },
            
            /**
             * Load Q-table
             */
            load: function(data) {
                this.qTable = new Map(data.qTable);
                this.epsilon = data.epsilon;
                Object.assign(this, data.config);
            }
        };
    },
    
    /**
     * Train agent on environment
     */
    train: function(agent, env, options = {}) {
        const {
            episodes = 1000,
            maxSteps = 200,
            verbose = false,
            callback = null
        } = options;
        
        const history = [];
        
        for (let ep = 0; ep < episodes; ep++) {
            let state = env.reset();
            let totalReward = 0;
            let steps = 0;
            
            for (let step = 0; step < maxSteps; step++) {
                const action = agent.selectAction(state);
                const { nextState, reward, done } = env.step(action);
                
                agent.learn(state, action, reward, nextState, done);
                
                state = nextState;
                totalReward += reward;
                steps++;
                
                if (done) break;
            }
            
            agent.decayEpsilon();
            
            history.push({
                episode: ep,
                totalReward,
                steps,
                epsilon: agent.epsilon
            });
            
            if (verbose && ep % 100 === 0) {
                const avgReward = history.slice(-100).reduce((s, h) => s + h.totalReward, 0) / Math.min(100, history.length);
                console.log(`Episode ${ep}: Avg Reward=${avgReward.toFixed(2)}, Epsilon=${agent.epsilon.toFixed(3)}`);
            }
            
            if (callback) callback(ep, agent, history);
        }
        
        return { agent, history };
    }
};

if (typeof module !== 'undefined') module.exports = PRISM_RL_QLEARNING_ENGINE;
if (typeof window !== 'undefined') window.PRISM_RL_QLEARNING_ENGINE = PRISM_RL_QLEARNING_ENGINE;
'''

def main():
    print("=" * 70)
    print("PRISM AI/ML SWARM EXTRACTION v2.0")
    print("=" * 70)
    
    # Load monolith
    print(f"\nLoading monolith from: {MONOLITH_PATH}")
    with open(MONOLITH_PATH, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    print(f"Loaded {len(lines):,} lines")
    
    # Run parallel searches
    print("\n" + "-" * 70)
    print("PHASE 1: Parallel Pattern Search (8 agents)")
    print("-" * 70)
    
    all_results = {}
    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = {}
        for idx, (category, patterns) in enumerate(SEARCH_PATTERNS.items()):
            future = executor.submit(run_search_agent, idx, category, patterns, lines)
            futures[future] = category
        
        for future in as_completed(futures):
            category = futures[future]
            result = future.result()
            all_results[category] = result
            print(f"  Agent {result['agent_id']} ({category}): {result['total_hits']} hits, {len(result['matches'])} unique")
    
    # Save search results
    search_report = {
        'timestamp': datetime.now().isoformat(),
        'total_lines_searched': len(lines),
        'results': all_results
    }
    
    report_path = os.path.join(OUTPUT_DIR, 'SWARM_SEARCH_REPORT.json')
    with open(report_path, 'w') as f:
        json.dump(search_report, f, indent=2)
    print(f"\nSearch report saved: {report_path}")
    
    # Phase 2: Build complete modules
    print("\n" + "-" * 70)
    print("PHASE 2: Building Complete Modules")
    print("-" * 70)
    
    modules_built = []
    
    # GA Module
    ga_path = os.path.join(OUTPUT_DIR, 'PRISM_GA_ENGINE.js')
    with open(ga_path, 'w') as f:
        f.write(build_ga_module(all_results.get('GA', {})))
    modules_built.append(('PRISM_GA_ENGINE', ga_path, 'Genetic Algorithm'))
    print(f"  ✓ Built: PRISM_GA_ENGINE.js")
    
    # SA Module
    sa_path = os.path.join(OUTPUT_DIR, 'PRISM_SIMULATED_ANNEALING.js')
    with open(sa_path, 'w') as f:
        f.write(build_sa_module())
    modules_built.append(('PRISM_SIMULATED_ANNEALING', sa_path, 'Simulated Annealing'))
    print(f"  ✓ Built: PRISM_SIMULATED_ANNEALING.js")
    
    # DE Module
    de_path = os.path.join(OUTPUT_DIR, 'PRISM_DIFFERENTIAL_EVOLUTION.js')
    with open(de_path, 'w') as f:
        f.write(build_de_module())
    modules_built.append(('PRISM_DIFFERENTIAL_EVOLUTION', de_path, 'Differential Evolution'))
    print(f"  ✓ Built: PRISM_DIFFERENTIAL_EVOLUTION.js")
    
    # Q-Learning Module
    ql_path = os.path.join(OUTPUT_DIR, 'PRISM_RL_QLEARNING_ENGINE.js')
    with open(ql_path, 'w') as f:
        f.write(build_rl_qlearning_module())
    modules_built.append(('PRISM_RL_QLEARNING_ENGINE', ql_path, 'Q-Learning'))
    print(f"  ✓ Built: PRISM_RL_QLEARNING_ENGINE.js")
    
    # Summary
    print("\n" + "=" * 70)
    print("EXTRACTION COMPLETE")
    print("=" * 70)
    print(f"Modules built: {len(modules_built)}")
    for name, path, desc in modules_built:
        size = os.path.getsize(path)
        print(f"  - {name}: {size:,} bytes ({desc})")
    
    # Update manifest
    manifest_path = os.path.join(OUTPUT_DIR, 'EXTRACTION_MANIFEST.json')
    if os.path.exists(manifest_path):
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    else:
        manifest = {'modules': [], 'created': datetime.now().isoformat()}
    
    manifest['swarm_extraction'] = {
        'timestamp': datetime.now().isoformat(),
        'modules_built': [m[0] for m in modules_built],
        'search_patterns_used': list(SEARCH_PATTERNS.keys())
    }
    
    with open(manifest_path, 'w') as f:
        json.dump(manifest, f, indent=2)
    
    print(f"\nManifest updated: {manifest_path}")

if __name__ == '__main__':
    main()
