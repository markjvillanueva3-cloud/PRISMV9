const PRISM_PARTICLE_FILTER = {
    name: 'PRISM_PARTICLE_FILTER',
    version: '1.0.0',
    source: 'MIT 16.410 - Probabilistic State Estimation',
    
    /**
     * Particle Filter (Sequential Monte Carlo)
     * Real-time state estimation under uncertainty
     * Source: MIT 16.410 Lecture 18
     */
    create: function(config) {
        const {
            numParticles = 1000,
            initialDistribution,  // Function: () => particle
            motionModel,          // Function: (particle, control) => newParticle
            measurementModel,     // Function: (particle, measurement) => weight
            resampleThreshold = 0.5
        } = config;
        
        // Initialize particles
        let particles = [];
        let weights = [];
        
        for (let i = 0; i < numParticles; i++) {
            particles.push(initialDistribution());
            weights.push(1 / numParticles);
        }
        
        return {
            particles,
            weights,
            numParticles,
            motionModel,
            measurementModel,
            resampleThreshold,
            
            /**
             * Prediction step - propagate particles through motion model
             */
            predict: function(control) {
                this.particles = this.particles.map(p => this.motionModel(p, control));
            },
            
            /**
             * Update step - weight particles by measurement likelihood
             */
            update: function(measurement) {
                // Calculate weights
                this.weights = this.particles.map(p => this.measurementModel(p, measurement));
                
                // Normalize weights
                const weightSum = this.weights.reduce((a, b) => a + b, 0);
                if (weightSum > 0) {
                    this.weights = this.weights.map(w => w / weightSum);
                } else {
                    // All weights zero - uniform
                    this.weights = this.weights.map(() => 1 / this.numParticles);
                }
                
                // Check if resampling needed
                const nEff = 1 / this.weights.reduce((sum, w) => sum + w * w, 0);
                if (nEff < this.resampleThreshold * this.numParticles) {
                    this.resample();
                }
            },
            
            /**
             * Resample particles based on weights (low variance resampling)
             */
            resample: function() {
                const newParticles = [];
                const cumWeights = [];
                let cumSum = 0;
                
                for (const w of this.weights) {
                    cumSum += w;
                    cumWeights.push(cumSum);
                }
                
                // Low variance resampling
                const r = Math.random() / this.numParticles;
                let j = 0;
                
                for (let i = 0; i < this.numParticles; i++) {
                    const u = r + i / this.numParticles;
                    while (u > cumWeights[j] && j < this.numParticles - 1) {
                        j++;
                    }
                    newParticles.push(JSON.parse(JSON.stringify(this.particles[j])));
                }
                
                this.particles = newParticles;
                this.weights = this.weights.map(() => 1 / this.numParticles);
            },
            
            /**
             * Get estimated state (weighted mean)
             */
            getEstimate: function() {
                if (typeof this.particles[0] === 'number') {
                    return this.particles.reduce((sum, p, i) => sum + p * this.weights[i], 0);
                }
                
                // For object states, compute weighted mean of each property
                const estimate = {};
                const sample = this.particles[0];
                
                for (const key in sample) {
                    if (typeof sample[key] === 'number') {
                        estimate[key] = this.particles.reduce(
                            (sum, p, i) => sum + p[key] * this.weights[i], 0
                        );
                    }
                }
                
                return estimate;
            },
            
            /**
             * Get uncertainty (weighted covariance)
             */
            getUncertainty: function() {
                const mean = this.getEstimate();
                
                if (typeof mean === 'number') {
                    return Math.sqrt(
                        this.particles.reduce((sum, p, i) => 
                            sum + this.weights[i] * Math.pow(p - mean, 2), 0
                        )
                    );
                }
                
                const variance = {};
                for (const key in mean) {
                    variance[key] = Math.sqrt(
                        this.particles.reduce((sum, p, i) =>
                            sum + this.weights[i] * Math.pow(p[key] - mean[key], 2), 0
                        )
                    );
                }
                return variance;
            }
        };
    },
    
    /**
     * Tool Wear Particle Filter
     * Manufacturing-specific application
     */
    createToolWearFilter: function(config = {}) {
        const {
            numParticles = 500,
            initialWear = 0,
            wearRate = 0.001,  // mm per minute
            wearNoise = 0.0002,
            measurementNoise = 0.01
        } = config;
        
        return this.create({
            numParticles,
            
            initialDistribution: () => ({
                wear: initialWear + (Math.random() - 0.5) * 0.01,
                wearRate: wearRate + (Math.random() - 0.5) * wearRate * 0.2
            }),
            
            motionModel: (particle, cuttingTime) => ({
                wear: particle.wear + particle.wearRate * cuttingTime + 
                      (Math.random() - 0.5) * wearNoise * cuttingTime,
                wearRate: particle.wearRate + (Math.random() - 0.5) * wearNoise
            }),
            
            measurementModel: (particle, measuredWear) => {
                const error = Math.abs(particle.wear - measuredWear);
                return Math.exp(-error * error / (2 * measurementNoise * measurementNoise));
            }
        });
    }
}