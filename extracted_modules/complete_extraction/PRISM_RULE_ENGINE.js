const PRISM_RULE_ENGINE = {
    // Create a rule engine
    create(options = {}) {
        return {
            rules: [],
            facts: new Map(),
            conflictResolution: options.conflictResolution || 'priority', // priority, specificity, order
            maxIterations: options.maxIterations || 1000,
            
            // Define a rule
            addRule(rule) {
                const ruleEntry = {
                    id: rule.id || `rule_${this.rules.length}`,
                    name: rule.name || rule.id,
                    description: rule.description || '',
                    priority: rule.priority || 0,
                    conditions: Array.isArray(rule.when) ? rule.when : [rule.when],
                    actions: Array.isArray(rule.then) ? rule.then : [rule.then],
                    enabled: rule.enabled !== false,
                    fired: false,
                    fireCount: 0
                };
                
                this.rules.push(ruleEntry);
                this._sortRules();
                
                return this;
            },
            
            // Assert a fact
            assertFact(name, value) {
                this.facts.set(name, value);
                return this;
            },
            
            // Retract a fact
            retractFact(name) {
                this.facts.delete(name);
                return this;
            },
            
            // Modify a fact
            modifyFact(name, modifier) {
                if (this.facts.has(name)) {
                    const value = this.facts.get(name);
                    this.facts.set(name, modifier(value));
                }
                return this;
            },
            
            // Get a fact
            getFact(name) {
                return this.facts.get(name);
            },
            
            // Run the rule engine
            run() {
                let iterations = 0;
                let rulesFired = [];
                
                // Reset fired flags
                for (const rule of this.rules) {
                    rule.fired = false;
                }
                
                while (iterations < this.maxIterations) {
                    iterations++;
                    
                    // Find matching rules
                    const matchingRules = this._findMatchingRules();
                    
                    if (matchingRules.length === 0) {
                        break;
                    }
                    
                    // Resolve conflicts
                    const ruleToFire = this._resolveConflicts(matchingRules);
                    
                    if (!ruleToFire) {
                        break;
                    }
                    
                    // Fire the rule
                    this._fireRule(ruleToFire);
                    rulesFired.push(ruleToFire.id);
                }
                
                return {
                    iterations,
                    rulesFired,
                    facts: Object.fromEntries(this.facts)
                };
            },
            
            // Run once (no loop)
            runOnce() {
                const matchingRules = this._findMatchingRules();
                const results = [];
                
                for (const rule of matchingRules) {
                    this._fireRule(rule);
                    results.push(rule.id);
                }
                
                return results;
            },
            
            // Find rules whose conditions match
            _findMatchingRules() {
                const matching = [];
                
                for (const rule of this.rules) {
                    if (!rule.enabled || rule.fired) continue;
                    
                    const allConditionsMet = rule.conditions.every(condition => 
                        this._evaluateCondition(condition)
                    );
                    
                    if (allConditionsMet) {
                        matching.push(rule);
                    }
                }
                
                return matching;
            },
            
            // Evaluate a single condition
            _evaluateCondition(condition) {
                if (typeof condition === 'function') {
                    return condition(Object.fromEntries(this.facts));
                }
                
                if (typeof condition === 'object') {
                    const { fact, operator, value } = condition;
                    const factValue = this.facts.get(fact);
                    
                    switch (operator) {
                        case '==':
                        case 'eq':
                            return factValue == value;
                        case '===':
                        case 'strictEq':
                            return factValue === value;
                        case '!=':
                        case 'neq':
                            return factValue != value;
                        case '>':
                        case 'gt':
                            return factValue > value;
                        case '>=':
                        case 'gte':
                            return factValue >= value;
                        case '<':
                        case 'lt':
                            return factValue < value;
                        case '<=':
                        case 'lte':
                            return factValue <= value;
                        case 'in':
                            return value.includes(factValue);
                        case 'contains':
                            return factValue && factValue.includes(value);
                        case 'exists':
                            return this.facts.has(fact);
                        case 'matches':
                            return new RegExp(value).test(factValue);
                        default:
                            return false;
                    }
                }
                
                return Boolean(condition);
            },
            
            // Resolve conflicts between matching rules
            _resolveConflicts(rules) {
                if (rules.length === 0) return null;
                if (rules.length === 1) return rules[0];
                
                switch (this.conflictResolution) {
                    case 'priority':
                        return rules.reduce((highest, rule) => 
                            rule.priority > highest.priority ? rule : highest
                        );
                    
                    case 'specificity':
                        return rules.reduce((mostSpecific, rule) => 
                            rule.conditions.length > mostSpecific.conditions.length ? rule : mostSpecific
                        );
                    
                    case 'order':
                    default:
                        return rules[0];
                }
            },
            
            // Fire a rule (execute its actions)
            _fireRule(rule) {
                console.log(`[RuleEngine] Firing rule: ${rule.name}`);
                
                const context = {
                    facts: Object.fromEntries(this.facts),
                    assert: (name, value) => this.assertFact(name, value),
                    retract: (name) => this.retractFact(name),
                    modify: (name, modifier) => this.modifyFact(name, modifier)
                };
                
                for (const action of rule.actions) {
                    if (typeof action === 'function') {
                        action(context);
                    } else if (typeof action === 'object') {
                        this._executeAction(action);
                    }
                }
                
                rule.fired = true;
                rule.fireCount++;
            },
            
            // Execute an action object
            _executeAction(action) {
                switch (action.type) {
                    case 'assert':
                        this.assertFact(action.fact, action.value);
                        break;
                    case 'retract':
                        this.retractFact(action.fact);
                        break;
                    case 'modify':
                        if (action.set) {
                            this.facts.set(action.fact, action.set);
                        } else if (action.add) {
                            const current = this.facts.get(action.fact) || 0;
                            this.facts.set(action.fact, current + action.add);
                        }
                        break;
                }
            },
            
            // Sort rules by priority
            _sortRules() {
                this.rules.sort((a, b) => b.priority - a.priority);
            },
            
            // Enable/disable a rule
            enableRule(id) {
                const rule = this.rules.find(r => r.id === id);
                if (rule) rule.enabled = true;
                return this;
            },
            
            disableRule(id) {
                const rule = this.rules.find(r => r.id === id);
                if (rule) rule.enabled = false;
                return this;
            },
            
            // Get rule statistics
            getStats() {
                return {
                    totalRules: this.rules.length,
                    enabledRules: this.rules.filter(r => r.enabled).length,
                    totalFacts: this.facts.size,
                    rulesFireCount: Object.fromEntries(
                        this.rules.map(r => [r.id, r.fireCount])
                    )
                };
            },
            
            // Reset the engine
            reset() {
                this.facts.clear();
                for (const rule of this.rules) {
                    rule.fired = false;
                }
                return this;
            }
        };
    },
    
    // Decision table helper
    createDecisionTable(conditions, actions) {
        // conditions: [{name, values: []}]
        // actions: [[...conditions] => action]
        return {
            conditions,
            actions,
            
            evaluate(facts) {
                for (const [conditionValues, action] of this.actions) {
                    let matches = true;
                    
                    for (let i = 0; i < this.conditions.length; i++) {
                        const condition = this.conditions[i];
                        const expectedValue = conditionValues[i];
                        const actualValue = facts[condition.name];
                        
                        if (expectedValue !== '*' && actualValue !== expectedValue) {
                            matches = false;
                            break;
                        }
                    }
                    
                    if (matches) {
                        return action;
                    }
                }
                
                return null;
            }
        };
    }
}