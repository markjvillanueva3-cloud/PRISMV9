const PRISM_STATE_MACHINE = {
    // Create a new state machine
    create(config = {}) {
        return {
            states: new Map(),
            currentState: null,
            previousState: null,
            stateStack: [], // For pushdown automaton
            history: [],
            maxHistory: config.maxHistory || 100,
            context: config.context || {},
            
            // Define a state
            addState(name, handlers = {}) {
                this.states.set(name, {
                    name,
                    enter: handlers.enter || (() => {}),
                    exit: handlers.exit || (() => {}),
                    update: handlers.update || (() => {}),
                    transitions: new Map(),
                    parent: handlers.parent || null,
                    children: new Set()
                });
                
                // Register with parent
                if (handlers.parent) {
                    const parent = this.states.get(handlers.parent);
                    if (parent) parent.children.add(name);
                }
                
                return this;
            },
            
            // Define a transition
            addTransition(from, event, to, condition = null, action = null) {
                const state = this.states.get(from);
                if (!state) throw new Error(`Unknown state: ${from}`);
                
                if (!state.transitions.has(event)) {
                    state.transitions.set(event, []);
                }
                
                state.transitions.get(event).push({
                    to,
                    condition: condition || (() => true),
                    action: action || (() => {})
                });
                
                return this;
            },
            
            // Set initial state
            start(initialState) {
                if (!this.states.has(initialState)) {
                    throw new Error(`Unknown state: ${initialState}`);
                }
                
                this._enterState(initialState);
                return this;
            },
            
            // Send an event to trigger transition
            send(event, data = {}) {
                if (!this.currentState) return false;
                
                const state = this.states.get(this.currentState);
                const transitions = state.transitions.get(event) || [];
                
                // Also check parent state transitions (hierarchical)
                let parentTransitions = [];
                if (state.parent) {
                    const parent = this.states.get(state.parent);
                    parentTransitions = parent?.transitions.get(event) || [];
                }
                
                const allTransitions = [...transitions, ...parentTransitions];
                
                // Find first valid transition
                for (const transition of allTransitions) {
                    if (transition.condition(this.context, data)) {
                        transition.action(this.context, data);
                        this._transitionTo(transition.to, data);
                        return true;
                    }
                }
                
                return false;
            },
            
            // Direct state change (force)
            transitionTo(stateName, data = {}) {
                if (!this.states.has(stateName)) {
                    throw new Error(`Unknown state: ${stateName}`);
                }
                this._transitionTo(stateName, data);
            },
            
            // Push current state and go to new state
            push(stateName, data = {}) {
                if (this.currentState) {
                    this.stateStack.push(this.currentState);
                }
                this._transitionTo(stateName, data);
            },
            
            // Pop and return to previous state
            pop(data = {}) {
                if (this.stateStack.length === 0) {
                    console.warn('[FSM] State stack is empty');
                    return;
                }
                
                const previousState = this.stateStack.pop();
                this._transitionTo(previousState, data);
            },
            
            // Update current state
            update(deltaTime) {
                if (!this.currentState) return;
                
                const state = this.states.get(this.currentState);
                state.update(this.context, deltaTime);
                
                // Also update parent states (hierarchical)
                let parentName = state.parent;
                while (parentName) {
                    const parent = this.states.get(parentName);
                    parent.update(this.context, deltaTime);
                    parentName = parent.parent;
                }
            },
            
            // Check if in a specific state (or child of it)
            isInState(stateName) {
                if (this.currentState === stateName) return true;
                
                // Check if current state is child of stateName
                let current = this.states.get(this.currentState);
                while (current && current.parent) {
                    if (current.parent === stateName) return true;
                    current = this.states.get(current.parent);
                }
                
                return false;
            },
            
            // Internal transition
            _transitionTo(newState, data) {
                const oldStateName = this.currentState;
                
                if (oldStateName) {
                    this._exitState(oldStateName, data);
                }
                
                this.previousState = oldStateName;
                this._enterState(newState, data);
                
                // Record history
                this.history.push({
                    from: oldStateName,
                    to: newState,
                    timestamp: Date.now(),
                    data
                });
                
                if (this.history.length > this.maxHistory) {
                    this.history.shift();
                }
            },
            
            _enterState(stateName, data = {}) {
                const state = this.states.get(stateName);
                
                // Enter parent states first (hierarchical)
                if (state.parent && !this.isInState(state.parent)) {
                    this._enterState(state.parent, data);
                }
                
                this.currentState = stateName;
                state.enter(this.context, data);
            },
            
            _exitState(stateName, data = {}) {
                const state = this.states.get(stateName);
                state.exit(this.context, data);
            },
            
            // Get current state info
            getState() {
                return {
                    current: this.currentState,
                    previous: this.previousState,
                    stack: [...this.stateStack],
                    historyLength: this.history.length
                };
            },
            
            // Serialize state
            serialize() {
                return {
                    currentState: this.currentState,
                    stateStack: [...this.stateStack],
                    context: JSON.parse(JSON.stringify(this.context))
                };
            },
            
            // Deserialize state
            deserialize(data) {
                this.currentState = data.currentState;
                this.stateStack = data.stateStack || [];
                this.context = data.context || {};
            }
        };
    },
    
    // Create a behavior tree (alternative to FSM)
    createBehaviorTree() {
        return {
            root: null,
            blackboard: {},
            
            // Node types
            sequence(...children) {
                return {
                    type: 'sequence',
                    children,
                    tick(blackboard) {
                        for (const child of this.children) {
                            const result = child.tick(blackboard);
                            if (result !== 'success') return result;
                        }
                        return 'success';
                    }
                };
            },
            
            selector(...children) {
                return {
                    type: 'selector',
                    children,
                    tick(blackboard) {
                        for (const child of this.children) {
                            const result = child.tick(blackboard);
                            if (result !== 'failure') return result;
                        }
                        return 'failure';
                    }
                };
            },
            
            condition(predicate) {
                return {
                    type: 'condition',
                    tick(blackboard) {
                        return predicate(blackboard) ? 'success' : 'failure';
                    }
                };
            },
            
            action(fn) {
                return {
                    type: 'action',
                    tick(blackboard) {
                        return fn(blackboard);
                    }
                };
            },
            
            inverter(child) {
                return {
                    type: 'inverter',
                    child,
                    tick(blackboard) {
                        const result = this.child.tick(blackboard);
                        if (result === 'success') return 'failure';
                        if (result === 'failure') return 'success';
                        return result;
                    }
                };
            },
            
            tick() {
                if (!this.root) return 'failure';
                return this.root.tick(this.blackboard);
            }
        };
    }
}