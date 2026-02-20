const PRISM_CSP_ENHANCED = {
    name: 'PRISM_CSP_ENHANCED',
    version: '1.0.0',
    source: 'MIT 6.034 - Constraint Satisfaction',
    
    /**
     * Forward Checking - Source: MIT 6.034 Lecture 5
     */
    forwardChecking: function(csp) {
        const { variables, domains, constraints } = csp;
        const currentDomains = {};
        for (const v of variables) currentDomains[v] = [...domains[v]];
        
        const assignment = {};
        const result = this._fcBacktrack(assignment, variables, currentDomains, constraints);
        return result ? { solved: true, assignment: result } : { solved: false };
    },
    
    _fcBacktrack: function(assignment, variables, domains, constraints) {
        if (Object.keys(assignment).length === variables.length) return { ...assignment };
        
        const unassigned = variables.filter(v => !(v in assignment));
        const variable = unassigned.reduce((best, v) => domains[v].length < domains[best].length ? v : best);
        
        for (const value of this._orderDomainValues(variable, domains, constraints, assignment)) {
            if (this._isConsistent(variable, value, assignment, constraints)) {
                assignment[variable] = value;
                const savedDomains = this._saveDomains(domains, variables);
                const pruneResult = this._pruneDomainsFC(variable, value, domains, constraints);
                
                if (pruneResult.valid) {
                    const result = this._fcBacktrack(assignment, variables, domains, constraints);
                    if (result) return result;
                }
                
                this._restoreDomains(domains, savedDomains);
                delete assignment[variable];
            }
        }
        return null;
    },
    
    _pruneDomainsFC: function(variable, value, domains, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            for (const other of constraint.variables) {
                if (other === variable) continue;
                domains[other] = domains[other].filter(otherVal => {
                    return constraint.check({ [variable]: value, [other]: otherVal });
                });
                if (domains[other].length === 0) return { valid: false };
            }
        }
        return { valid: true };
    },
    
    _orderDomainValues: function(variable, domains, constraints, assignment) {
        const values = [...domains[variable]];
        const countConstraints = (value) => {
            let count = 0;
            for (const constraint of constraints) {
                if (!constraint.variables.includes(variable)) continue;
                for (const other of constraint.variables) {
                    if (other === variable || other in assignment) continue;
                    for (const otherVal of domains[other]) {
                        if (!constraint.check({ [variable]: value, [other]: otherVal })) count++;
                    }
                }
            }
            return count;
        };
        values.sort((a, b) => countConstraints(a) - countConstraints(b));
        return values;
    },
    
    _isConsistent: function(variable, value, assignment, constraints) {
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            const allAssigned = constraint.variables.every(v => v === variable || v in assignment);
            if (allAssigned) {
                const testAssignment = { ...assignment, [variable]: value };
                if (!constraint.check(testAssignment)) return false;
            }
        }
        return true;
    },
    
    _saveDomains: function(domains, variables) {
        const saved = {};
        for (const v of variables) saved[v] = [...domains[v]];
        return saved;
    },
    
    _restoreDomains: function(domains, saved) {
        for (const v in saved) domains[v] = saved[v];
    },
    
    /**
     * Conflict-Directed Backjumping - Source: MIT 6.034 Lecture 6
     */
    conflictDirectedBackjumping: function(csp) {
        const { variables, domains, constraints } = csp;
        const assignment = {};
        const conflictSets = {};
        for (const v of variables) conflictSets[v] = new Set();
        
        const result = this._cbjBacktrack(0, variables, domains, constraints, assignment, conflictSets);
        return result.solution ? { solved: true, assignment: result.solution } : { solved: false };
    },
    
    _cbjBacktrack: function(index, variables, domains, constraints, assignment, conflictSets) {
        if (index === variables.length) return { solution: { ...assignment } };
        
        const variable = variables[index];
        conflictSets[variable] = new Set();
        
        for (const value of domains[variable]) {
            const conflicts = this._findConflicts(variable, value, assignment, constraints);
            
            if (conflicts.length === 0) {
                assignment[variable] = value;
                const result = this._cbjBacktrack(index + 1, variables, domains, constraints, assignment, conflictSets);
                
                if (result.solution) return result;
                
                if (result.conflictSet) {
                    for (const v of result.conflictSet) {
                        if (v !== variable) conflictSets[variable].add(v);
                    }
                    if (!result.conflictSet.has(variable)) {
                        return { solution: null, conflictSet: result.conflictSet };
                    }
                }
                delete assignment[variable];
            } else {
                for (const cv of conflicts) conflictSets[variable].add(cv);
            }
        }
        return { solution: null, conflictSet: conflictSets[variable] };
    },
    
    _findConflicts: function(variable, value, assignment, constraints) {
        const conflicts = [];
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            for (const other of constraint.variables) {
                if (other === variable || !(other in assignment)) continue;
                const testAssignment = { ...assignment, [variable]: value };
                if (!constraint.check(testAssignment)) conflicts.push(other);
            }
        }
        return conflicts;
    },
    
    /**
     * Min-Conflicts Local Search - Source: MIT 6.034
     */
    minConflicts: function(csp, maxSteps = 10000) {
        const { variables, domains, constraints } = csp;
        
        const assignment = {};
        for (const v of variables) {
            assignment[v] = domains[v][Math.floor(Math.random() * domains[v].length)];
        }
        
        for (let step = 0; step < maxSteps; step++) {
            const conflicted = this._getConflictedVariables(assignment, constraints);
            if (conflicted.length === 0) return { solved: true, assignment, steps: step };
            
            const variable = conflicted[Math.floor(Math.random() * conflicted.length)];
            let minConflicts = Infinity, bestValue = assignment[variable];
            
            for (const value of domains[variable]) {
                const tempAssignment = { ...assignment, [variable]: value };
                const conflicts = this._countConflicts(variable, tempAssignment, constraints);
                if (conflicts < minConflicts) { minConflicts = conflicts; bestValue = value; }
            }
            assignment[variable] = bestValue;
        }
        
        return { solved: false, assignment, steps: maxSteps };
    },
    
    _getConflictedVariables: function(assignment, constraints) {
        const conflicted = new Set();
        for (const constraint of constraints) {
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (allAssigned && !constraint.check(assignment)) {
                for (const v of constraint.variables) conflicted.add(v);
            }
        }
        return [...conflicted];
    },
    
    _countConflicts: function(variable, assignment, constraints) {
        let count = 0;
        for (const constraint of constraints) {
            if (!constraint.variables.includes(variable)) continue;
            const allAssigned = constraint.variables.every(v => v in assignment);
            if (allAssigned && !constraint.check(assignment)) count++;
        }
        return count;
    }
}