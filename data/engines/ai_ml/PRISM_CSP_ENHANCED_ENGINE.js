/**
 * PRISM_CSP_ENHANCED_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 355
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_CSP_ENHANCED_ENGINE = {
    name: 'PRISM_CSP_ENHANCED_ENGINE',
    version: '1.0.0',
    description: 'Enhanced CSP solver with MRV, LCV, forward checking, min-conflicts',
    source: 'MIT 6.034, Stanford CS 221',
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Enhanced CSP Solver with all heuristics
    // ─────────────────────────────────────────────────────────────────────────────
    
    solve: function(csp, options = {}) {
        const {
            useMRV = true,      // Minimum Remaining Values
            useLCV = true,      // Least Constraining Value
            useAC3 = true,      // Arc Consistency preprocessing
            useForwardChecking = true
        } = options;
        
        const { variables, domains, constraints } = csp;
        const domainsCopy = {};
        for (const v of variables) {
            domainsCopy[v] = [...domains[v]];
        }
        
        // Apply AC-3 preprocessing
        if (useAC3) {
            if (!this.ac3(variables, domainsCopy, constraints)) {
                return { solved: false, reason: 'AC-3 detected inconsistency' };
            }
        }
        
        const assignment = {};
        const stats = { backtracks: 0, nodesExplored: 0 };
        
        const result = this._backtrackEnhanced(
            assignment, variables, domainsCopy, constraints,
            useMRV, useLCV, useForwardChecking, stats
        );
        
        return result ? 
            { solved: true, assignment: result, stats } : 
            { solved: false, stats };
    },
    
    _backtrackEnhanced: function(assignment, variables, domains, constraints, useMRV, useLCV, useForwardChecking, stats) {
        stats.nodesExplored++;
        
        if (Object.keys(assignment).length === variables.length) {
            return { ...assignment };
        }
        
        // Select unassigned variable
        const variable = useMRV ? 
            this._selectVariableMRV(variables, assignment, domains) :
            variables.find(v => !(v in assignment));
        
        if (!variable) return null;
        
        // Order domain values
        const orderedValues = useLCV ?
            this._orderValuesLCV(variable, domains[variable], assignment, constraints, domains) :
            domains[variable];
        
        for (const value of orderedValues) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                
                // Forward checking
                let domainsCopy = domains;
                let consistent = true;
                
                if (useForwardChecking) {
                    domainsCopy = this._forwardCheck(variable, value, domains, constraints);
                    consistent = Object.values(domainsCopy).every(d => d.length > 0);
                }
                
                if (consistent) {
                    const result = this._backtrackEnhanced(
                        assignment, variables, domainsCopy, constraints,
                        useMRV, useLCV, useForwardChecking, stats
                    );
                    if (result) return result;
                }
                
                delete assignment[variable];
                stats.backtracks++;
            }
        }
        
        return null;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Minimum Remaining Values (MRV) Heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    _selectVariableMRV: function(variables, assignment, domains) {
        let bestVar = null;
        let minRemaining = Infinity;
        
        for (const v of variables) {
            if (!(v in assignment)) {
                const remaining = domains[v].length;
                if (remaining < minRemaining) {
                    minRemaining = remaining;
                    bestVar = v;
                }
            }
        }
        
        return bestVar;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Least Constraining Value (LCV) Heuristic
    // ─────────────────────────────────────────────────────────────────────────────
    
    _orderValuesLCV: function(variable, values, assignment, constraints, domains) {
        const scores = values.map(value => {
            let ruledOut = 0;
            
            // Count how many values this rules out for neighbors
            for (const constraint of constraints) {
                if (!constraint.variables.includes(variable)) continue;
                
                for (const neighbor of constraint.variables) {
                    if (neighbor === variable || neighbor in assignment) continue;
                    
                    for (const neighborVal of domains[neighbor]) {
                        const testAssignment = { ...assignment, [variable]: value, [neighbor]: neighborVal };
                        if (!constraint.check(testAssignment)) {
                            ruledOut++;
                        }
                    }
                }
            }
            
            return { value, ruledOut };
        });
        
        // Sort by least constraining (fewest ruled out)
        scores.sort((a, b) => a.ruledOut - b.ruledOut);
        return scores.map(s => s.value);
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Forward Checking
    // ─────────────────────────────────────────────────────────────────────────────
    
    _forwardCheck: function(variable, value, domains, constraints) {
        const newDomains = {};
        for (const v in domains) {
            newDomains[v] = [...domains[v]];
        }
        newDomains[variable] = [value];
        
        // Remove inconsistent values from neighbors
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            for (const neighbor of constraint.variables) {
                if (neighbor === variable) continue;
                
                newDomains[neighbor] = newDomains[neighbor].filter(neighborVal => {
                    const testAssignment = { [variable]: value, [neighbor]: neighborVal };
                    return constraint.check(testAssignment);
                });
            }
        }
        
        return newDomains;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // AC-3 Algorithm (Arc Consistency)
    // ─────────────────────────────────────────────────────────────────────────────
    
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
                
                // Add all neighbors of xi (except xj) to queue
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
    
    _isConsistent: function(variable, value, assignment, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            // Check if all variables in constraint are assigned
            const allAssigned = constraint.variables.every(v => v === variable || v in assignment);
            if (!allAssigned) continue;
            
            const testAssignment = { ...assignment, [variable]: value };
            if (!constraint.check(testAssignment)) return false;
        }
        return true;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Min-Conflicts Local Search (for overconstrained problems)
    // ─────────────────────────────────────────────────────────────────────────────
    
    minConflicts: function(csp, maxIterations = 10000) {
        const { variables, domains, constraints } = csp;
        
        // Random initial assignment
        const assignment = {};
        for (const v of variables) {
            assignment[v] = domains[v][Math.floor(Math.random() * domains[v].length)];
        }
        
        for (let i = 0; i < maxIterations; i++) {
            // Find conflicted variables
            const conflicted = variables.filter(v => this._countConflicts(v, assignment, constraints) > 0);
            
            if (conflicted.length === 0) {
                return { solved: true, assignment, iterations: i };
            }
            
            // Pick random conflicted variable
            const variable = conflicted[Math.floor(Math.random() * conflicted.length)];
            
            // Find value that minimizes conflicts
            let bestValue = assignment[variable];
            let minConflicts = this._countConflicts(variable, assignment, constraints);
            
            for (const value of domains[variable]) {
                const testAssignment = { ...assignment, [variable]: value };
                const conflicts = this._countConflicts(variable, testAssignment, constraints);
                
                if (conflicts < minConflicts) {
                    minConflicts = conflicts;
                    bestValue = value;
                }
            }
            
            assignment[variable] = bestValue;
        }
        
        return { solved: false, assignment, reason: 'Max iterations reached' };
    },
    
    _countConflicts: function(variable, assignment, constraints) {
        let count = 0;
        
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (!allAssigned) continue;
            
            if (!constraint.check(assignment)) count++;
        }
        
        return count;
    },
    
    // ─────────────────────────────────────────────────────────────────────────────
    // Constraint Propagation (Maintaining Arc Consistency - MAC)
    // ─────────────────────────────────────────────────────────────────────────────
    
    mac: function(csp) {
        const { variables, domains, constraints } = csp;
        const domainsCopy = {};
        for (const v of variables) {
            domainsCopy[v] = [...domains[v]];
        }
        
        const assignment = {};
        return this._macBacktrack(assignment, variables, domainsCopy, constraints);
    },
    
    _macBacktrack: function(assignment, variables, domains, constraints) {
        if (Object.keys(assignment).length === variables.length) {
            return { solved: true, assignment: { ...assignment } };
        }
        
        const variable = this._selectVariableMRV(variables, assignment, domains);
        if (!variable) return { solved: false };
        
        for (const value of domains[variable]) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                
                // Make a copy of domains and propagate
                const newDomains = {};
                for (const v in domains) {
                    newDomains[v] = [...domains[v]];
                }
                newDomains[variable] = [value];
                
                // Run AC-3 with inference
                if (this.ac3(variables, newDomains, constraints)) {
                    const result = this._macBacktrack(assignment, variables, newDomains, constraints);
                    if (result.solved) return result;
                }
                
                delete assignment[variable];
            }
        }
        
        return { solved: false };
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('csp.solve.enhanced', 'PRISM_CSP_ENHANCED_ENGINE.solve');
            PRISM_GATEWAY.register('csp.minConflicts', 'PRISM_CSP_ENHANCED_ENGINE.minConflicts');
            PRISM_GATEWAY.register('csp.mac', 'PRISM_CSP_ENHANCED_ENGINE.mac');
            PRISM_GATEWAY.register('csp.ac3', 'PRISM_CSP_ENHANCED_ENGINE.ac3');
        }
    }
}