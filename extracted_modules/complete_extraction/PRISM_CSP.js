const PRISM_CSP = {
    
    /**
     * CSP Backtracking with MRV and forward checking
     * @param {Object} csp - CSP definition
     * @returns {Object} Solution or null
     */
    backtrackingSearch: function(csp) {
        const {
            variables,        // Array of variable names
            domains,          // {var: [possible values]}
            constraints       // function(assignment) => boolean
        } = csp;
        
        // Create working copy of domains
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        const assignment = {};
        let nodesExplored = 0;
        
        const selectVariable = () => {
            // MRV: choose variable with minimum remaining values
            let minVar = null, minSize = Infinity;
            for (const v of variables) {
                if (!(v in assignment) && currentDomains[v].length < minSize) {
                    minSize = currentDomains[v].length;
                    minVar = v;
                }
            }
            return minVar;
        };
        
        const isConsistent = (variable, value) => {
            assignment[variable] = value;
            const result = constraints(assignment);
            delete assignment[variable];
            return result;
        };
        
        const backtrack = () => {
            nodesExplored++;
            
            if (Object.keys(assignment).length === variables.length) {
                return { ...assignment };
            }
            
            const variable = selectVariable();
            if (!variable) return null;
            
            for (const value of currentDomains[variable]) {
                if (isConsistent(variable, value)) {
                    assignment[variable] = value;
                    
                    const result = backtrack();
                    if (result) return result;
                    
                    delete assignment[variable];
                }
            }
            
            return null;
        };
        
        const solution = backtrack();
        return { solution, nodesExplored };
    },
    
    /**
     * AC-3 Arc Consistency Algorithm
     * @param {Object} csp - CSP with binary constraints
     * @returns {Object} Reduced domains
     */
    ac3: function(csp) {
        const { variables, domains, binaryConstraints } = csp;
        // binaryConstraints: {[v1,v2]: function(val1, val2) => boolean}
        
        const currentDomains = {};
        for (const v of variables) {
            currentDomains[v] = [...domains[v]];
        }
        
        // Initialize queue with all arcs
        const queue = [];
        for (const [key, _] of Object.entries(binaryConstraints)) {
            const [xi, xj] = key.split(',');
            queue.push([xi, xj]);
            queue.push([xj, xi]);
        }
        
        let revisionsCount = 0;
        
        const revise = (xi, xj) => {
            let revised = false;
            const constraintKey = `${xi},${xj}`;
            const reverseKey = `${xj},${xi}`;
            const constraint = binaryConstraints[constraintKey] || 
                              ((a, b) => binaryConstraints[reverseKey]?.(b, a));
            
            if (!constraint) return false;
            
            currentDomains[xi] = currentDomains[xi].filter(vi => {
                for (const vj of currentDomains[xj]) {
                    if (constraint(vi, vj)) return true;
                }
                revised = true;
                return false;
            });
            
            if (revised) revisionsCount++;
            return revised;
        };
        
        while (queue.length > 0) {
            const [xi, xj] = queue.shift();
            
            if (revise(xi, xj)) {
                if (currentDomains[xi].length === 0) {
                    return { consistent: false, domains: currentDomains };
                }
                
                // Add all arcs (xk, xi) to queue
                for (const xk of variables) {
                    if (xk !== xi && xk !== xj) {
                        const key1 = `${xk},${xi}`;
                        const key2 = `${xi},${xk}`;
                        if (binaryConstraints[key1] || binaryConstraints[key2]) {
                            queue.push([xk, xi]);
                        }
                    }
                }
            }
        }
        
        return { consistent: true, domains: currentDomains, revisions: revisionsCount };
    }
}