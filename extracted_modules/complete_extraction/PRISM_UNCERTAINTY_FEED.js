const PRISM_UNCERTAINTY_FEED = {
    name: 'Uncertainty-Aware Feed Control',
    sources: ['Stanford CS229', 'Stanford CS234'],
    patentClaim: 'Bayesian uncertainty quantification combined with RL for adaptive feed rate control',
    
    /**
     * Create controller
     */
    createController: function(config = {}) {
        return {
            // Bayesian parameters
            priorMean: config.nominalFeed || 0.2,
            priorStd: 0.1,
            posteriorMean: config.nominalFeed || 0.2,
            posteriorStd: 0.1,
            
            // Observation noise
            observationStd: 0.02,
            
            // RL parameters
            explorationRate: 0.1,
            learningRate: 0.1,
            
            // Value estimates
            Q: {},  // State-action values
            
            // History
            observations: [],
            actions: []
        };
    },
    
    /**
     * Get optimal feed rate considering uncertainty
     */
    getFeedRate: function(controller, state) {
        const { material, hardness, toolWear, vibration, targetFinish } = state;
        
        // State encoding
        const stateKey = `${material}_${Math.round(hardness/10)}_${Math.round(toolWear*10)}_${Math.round(vibration*10)}`;
        
        // Bayesian update of feed rate belief
        if (controller.observations.length > 0) {
            this._bayesianUpdate(controller);
        }
        
        // Exploration vs exploitation
        let feed;
        if (Math.random() < controller.explorationRate) {
            // Thompson sampling
            feed = this._thompsonSample(controller);
        } else {
            // Exploit: use posterior mean adjusted for uncertainty
            const uncertaintyPenalty = controller.posteriorStd * 2;
            feed = controller.posteriorMean - uncertaintyPenalty;
        }
        
        // Adjust for current conditions
        const adjustmentFactor = this._getAdjustmentFactor(state);
        feed *= adjustmentFactor;
        
        // Safety bounds
        feed = Math.max(0.05, Math.min(0.5, feed));
        
        controller.actions.push({ stateKey, feed, timestamp: Date.now() });
        
        return {
            feed: feed,
            confidence: 1 - controller.posteriorStd / controller.priorStd,
            uncertaintyLevel: controller.posteriorStd,
            recommendation: this._getRecommendation(controller, feed)
        };
    },
    
    /**
     * Update with observed outcome
     */
    observe: function(controller, outcome) {
        const { actualFinish, targetFinish, toolWearRate, cycleTime } = outcome;
        
        // Calculate reward
        const reward = this._calculateReward(outcome);
        
        // Store observation
        controller.observations.push({
            outcome: outcome,
            reward: reward,
            timestamp: Date.now()
        });
        
        // Update Q-values
        if (controller.actions.length > 0) {
            const lastAction = controller.actions[controller.actions.length - 1];
            const actionKey = `${lastAction.stateKey}_${Math.round(lastAction.feed * 100)}`;
            
            if (!controller.Q[actionKey]) {
                controller.Q[actionKey] = { value: 0, count: 0 };
            }
            
            const q = controller.Q[actionKey];
            q.count++;
            q.value += (reward - q.value) / q.count;  // Running average
        }
        
        return {
            reward: reward,
            updatedConfidence: 1 - controller.posteriorStd / controller.priorStd
        };
    },
    
    _bayesianUpdate: function(controller) {
        const recent = controller.observations.slice(-10);
        if (recent.length === 0) return;
        
        // Conjugate Gaussian update
        const observations = recent.map(o => o.outcome.actualFinish / o.outcome.targetFinish);
        const obsMean = observations.reduce((a, b) => a + b, 0) / observations.length;
        
        const priorPrec = 1 / (controller.priorStd * controller.priorStd);
        const obsPrec = observations.length / (controller.observationStd * controller.observationStd);
        
        const postPrec = priorPrec + obsPrec;
        controller.posteriorStd = Math.sqrt(1 / postPrec);
        controller.posteriorMean = (priorPrec * controller.priorMean + obsPrec * obsMean) / postPrec;
    },
    
    _thompsonSample: function(controller) {
        // Sample from posterior
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        return controller.posteriorMean + z * controller.posteriorStd;
    },
    
    _getAdjustmentFactor: function(state) {
        let factor = 1.0;
        
        if (state.toolWear > 0.5) factor *= 0.9;
        if (state.vibration > 0.3) factor *= 0.85;
        if (state.hardness > 50) factor *= 0.95;
        
        return factor;
    },
    
    _calculateReward: function(outcome) {
        let reward = 0;
        
        // Surface finish reward
        if (outcome.actualFinish <= outcome.targetFinish) {
            reward += 10;
        } else {
            reward -= 20 * (outcome.actualFinish / outcome.targetFinish - 1);
        }
        
        // Efficiency reward
        if (outcome.cycleTime) {
            reward += 5 * (1 - outcome.cycleTime / 60);  // Bonus for faster cycles
        }
        
        // Tool wear penalty
        if (outcome.toolWearRate) {
            reward -= outcome.toolWearRate * 10;
        }
        
        return reward;
    },
    
    _getRecommendation: function(controller, feed) {
        if (controller.posteriorStd > controller.priorStd * 0.8) {
            return 'GATHERING_DATA: Running conservative feed, need more observations';
        } else if (controller.posteriorStd > controller.priorStd * 0.5) {
            return 'MODERATE_CONFIDENCE: Feed rate optimizing, continue monitoring';
        } else {
            return 'HIGH_CONFIDENCE: Optimal feed rate established';
        }
    }
}