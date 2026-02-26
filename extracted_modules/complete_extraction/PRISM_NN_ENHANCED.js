const PRISM_NN_ENHANCED = {
    name: 'PRISM Neural Network Enhanced',
    version: '1.0.0',
    
    // ─────────────────────────────────────────────────────────────────────────
    // Activation Functions
    // ─────────────────────────────────────────────────────────────────────────
    Activations: {
        /**
         * ELU: Exponential Linear Unit
         * f(x) = x if x > 0 else α(e^x - 1)
         */
        elu: function(x, alpha = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.elu(v, alpha));
            }
            return x > 0 ? x : alpha * (Math.exp(x) - 1);
        },
        
        eluDerivative: function(x, alpha = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.eluDerivative(v, alpha));
            }
            return x > 0 ? 1 : alpha * Math.exp(x);
        },
        
        /**
         * GELU: Gaussian Error Linear Unit
         * f(x) = x * Φ(x) where Φ is CDF of N(0,1)
         * Approximation: x * 0.5 * (1 + tanh(√(2/π) * (x + 0.044715x³)))
         */
        gelu: function(x) {
            if (Array.isArray(x)) {
                return x.map(v => this.gelu(v));
            }
            const sqrt2Pi = Math.sqrt(2 / Math.PI);
            return x * 0.5 * (1 + Math.tanh(sqrt2Pi * (x + 0.044715 * x * x * x)));
        },
        
        geluDerivative: function(x) {
            if (Array.isArray(x)) {
                return x.map(v => this.geluDerivative(v));
            }
            const sqrt2Pi = Math.sqrt(2 / Math.PI);
            const inner = sqrt2Pi * (x + 0.044715 * x * x * x);
            const tanhInner = Math.tanh(inner);
            const cdf = 0.5 * (1 + tanhInner);
            const pdf = sqrt2Pi * (1 + 0.134145 * x * x) * (1 - tanhInner * tanhInner);
            return cdf + 0.5 * x * pdf;
        },
        
        /**
         * SELU: Scaled Exponential Linear Unit
         * f(x) = λ * (x if x > 0 else α(e^x - 1))
         */
        selu: function(x) {
            const lambda = 1.0507009873554804934193349852946;
            const alpha = 1.6732632423543772848170429916717;
            if (Array.isArray(x)) {
                return x.map(v => this.selu(v));
            }
            return lambda * (x > 0 ? x : alpha * (Math.exp(x) - 1));
        },
        
        /**
         * Swish: x * sigmoid(x)
         */
        swish: function(x, beta = 1.0) {
            if (Array.isArray(x)) {
                return x.map(v => this.swish(v, beta));
            }
            return x / (1 + Math.exp(-beta * x));
        }
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // Optimizers
    // ─────────────────────────────────────────────────────────────────────────
    Optimizers: {
        /**
         * SGD with momentum
         */
        SGD: function(params = {}) {
            const { lr = 0.01, momentum = 0.9 } = params;
            return {
                lr,
                momentum,
                velocities: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    if (!this.velocities.has(key)) {
                        this.velocities.set(key, gradients.map(g => 
                            Array.isArray(g) ? g.map(() => 0) : 0
                        ));
                    }
                    
                    const v = this.velocities.get(key);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                v[i][j] = this.momentum * v[i][j] + gradients[i][j];
                                weights[i][j] -= this.lr * v[i][j];
                            }
                        } else {
                            v[i] = this.momentum * v[i] + gradients[i];
                            weights[i] -= this.lr * v[i];
                        }
                    }
                    
                    return weights;
                }
            };
        },
        
        /**
         * AdaDelta: No learning rate needed
         * Uses ratio of RMS gradients
         */
        AdaDelta: function(params = {}) {
            const { rho = 0.95, epsilon = 1e-6 } = params;
            return {
                rho,
                epsilon,
                Eg2: new Map(),  // E[g²]
                Edx2: new Map(), // E[Δx²]
                
                step: function(weights, gradients, key = 'default') {
                    if (!this.Eg2.has(key)) {
                        this.Eg2.set(key, this._zeros(gradients));
                        this.Edx2.set(key, this._zeros(gradients));
                    }
                    
                    const Eg2 = this.Eg2.get(key);
                    const Edx2 = this.Edx2.get(key);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                // E[g²] = ρ * E[g²] + (1-ρ) * g²
                                Eg2[i][j] = this.rho * Eg2[i][j] + (1 - this.rho) * g * g;
                                // Δx = -√(E[Δx²] + ε) / √(E[g²] + ε) * g
                                const dx = -Math.sqrt(Edx2[i][j] + this.epsilon) / 
                                           Math.sqrt(Eg2[i][j] + this.epsilon) * g;
                                // E[Δx²] = ρ * E[Δx²] + (1-ρ) * Δx²
                                Edx2[i][j] = this.rho * Edx2[i][j] + (1 - this.rho) * dx * dx;
                                weights[i][j] += dx;
                            }
                        } else {
                            const g = gradients[i];
                            Eg2[i] = this.rho * Eg2[i] + (1 - this.rho) * g * g;
                            const dx = -Math.sqrt(Edx2[i] + this.epsilon) / 
                                       Math.sqrt(Eg2[i] + this.epsilon) * g;
                            Edx2[i] = this.rho * Edx2[i] + (1 - this.rho) * dx * dx;
                            weights[i] += dx;
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => 
                        Array.isArray(t) ? t.map(() => 0) : 0
                    );
                }
            };
        },
        
        /**
         * NAdam: Adam with Nesterov momentum
         */
        NAdam: function(params = {}) {
            const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = params;
            return {
                lr, beta1, beta2, epsilon,
                t: 0,
                m: new Map(),
                v: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    this.t++;
                    
                    if (!this.m.has(key)) {
                        this.m.set(key, this._zeros(gradients));
                        this.v.set(key, this._zeros(gradients));
                    }
                    
                    const m = this.m.get(key);
                    const v = this.v.get(key);
                    
                    // Bias correction terms
                    const beta1_t = Math.pow(this.beta1, this.t);
                    const beta2_t = Math.pow(this.beta2, this.t);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                // Update biased moments
                                m[i][j] = this.beta1 * m[i][j] + (1 - this.beta1) * g;
                                v[i][j] = this.beta2 * v[i][j] + (1 - this.beta2) * g * g;
                                // Bias-corrected moments
                                const m_hat = m[i][j] / (1 - beta1_t);
                                const v_hat = v[i][j] / (1 - beta2_t);
                                // Nesterov component
                                const m_nesterov = this.beta1 * m_hat + (1 - this.beta1) * g / (1 - beta1_t);
                                // Update
                                weights[i][j] -= this.lr * m_nesterov / (Math.sqrt(v_hat) + this.epsilon);
                            }
                        } else {
                            const g = gradients[i];
                            m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                            v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                            const m_hat = m[i] / (1 - beta1_t);
                            const v_hat = v[i] / (1 - beta2_t);
                            const m_nesterov = this.beta1 * m_hat + (1 - this.beta1) * g / (1 - beta1_t);
                            weights[i] -= this.lr * m_nesterov / (Math.sqrt(v_hat) + this.epsilon);
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => Array.isArray(t) ? t.map(() => 0) : 0);
                }
            };
        },
        
        /**
         * AdamW: Adam with decoupled weight decay
         */
        AdamW: function(params = {}) {
            const { lr = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8, weightDecay = 0.01 } = params;
            return {
                lr, beta1, beta2, epsilon, weightDecay,
                t: 0,
                m: new Map(),
                v: new Map(),
                
                step: function(weights, gradients, key = 'default') {
                    this.t++;
                    
                    if (!this.m.has(key)) {
                        this.m.set(key, this._zeros(gradients));
                        this.v.set(key, this._zeros(gradients));
                    }
                    
                    const m = this.m.get(key);
                    const v = this.v.get(key);
                    const bc1 = 1 - Math.pow(this.beta1, this.t);
                    const bc2 = 1 - Math.pow(this.beta2, this.t);
                    
                    for (let i = 0; i < weights.length; i++) {
                        if (Array.isArray(weights[i])) {
                            for (let j = 0; j < weights[i].length; j++) {
                                const g = gradients[i][j];
                                m[i][j] = this.beta1 * m[i][j] + (1 - this.beta1) * g;
                                v[i][j] = this.beta2 * v[i][j] + (1 - this.beta2) * g * g;
                                const m_hat = m[i][j] / bc1;
                                const v_hat = v[i][j] / bc2;
                                // AdamW: decoupled weight decay
                                weights[i][j] -= this.lr * (m_hat / (Math.sqrt(v_hat) + this.epsilon) 
                                                           + this.weightDecay * weights[i][j]);
                            }
                        } else {
                            const g = gradients[i];
                            m[i] = this.beta1 * m[i] + (1 - this.beta1) * g;
                            v[i] = this.beta2 * v[i] + (1 - this.beta2) * g * g;
                            const m_hat = m[i] / bc1;
                            const v_hat = v[i] / bc2;
                            weights[i] -= this.lr * (m_hat / (Math.sqrt(v_hat) + this.epsilon) 
                                                    + this.weightDecay * weights[i]);
                        }
                    }
                    
                    return weights;
                },
                
                _zeros: function(template) {
                    return template.map(t => Array.isArray(t) ? t.map(() => 0) : 0);
                }
            };
        }
    }
}