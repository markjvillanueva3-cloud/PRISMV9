/**
 * PRISM_ACTIVATIONS_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 157
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_ACTIVATIONS_ENGINE = {
    name: 'PRISM_ACTIVATIONS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    // Standard activations
    relu: function(x) { return Math.max(0, x); },
    reluDeriv: function(x) { return x > 0 ? 1 : 0; },

    sigmoid: function(x) { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); },
    sigmoidDeriv: function(x) { const s = this.sigmoid(x); return s * (1 - s); },

    tanh: function(x) { return Math.tanh(x); },
    tanhDeriv: function(x) { const t = Math.tanh(x); return 1 - t * t; },

    // Advanced activations
    /**
     * ELU: Exponential Linear Unit
     * f(x) = x if x > 0, α(e^x - 1) if x ≤ 0
     */
    elu: function(x, alpha = 1.0) {
        return x >= 0 ? x : alpha * (Math.exp(x) - 1);
    },
    eluDeriv: function(x, alpha = 1.0) {
        return x >= 0 ? 1 : this.elu(x, alpha) + alpha;
    },

    /**
     * SELU: Scaled ELU (Self-Normalizing)
     * Used in self-normalizing neural networks
     */
    selu: function(x) {
        const alpha = 1.6732632423543772;
        const scale = 1.0507009873554805;
        return x >= 0 ? scale * x : scale * alpha * (Math.exp(x) - 1);
    },
    seluDeriv: function(x) {
        const alpha = 1.6732632423543772;
        const scale = 1.0507009873554805;
        return x >= 0 ? scale : scale * alpha * Math.exp(x);
    },

    /**
     * GELU: Gaussian Error Linear Unit
     * f(x) = x * Φ(x) where Φ is CDF of standard normal
     */
    gelu: function(x) {
        return 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
    },
    geluDeriv: function(x) {
        const cdf = 0.5 * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x * x * x)));
        const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
        return cdf + x * pdf;
    },

    /**
     * Swish: Self-gated activation (Google)
     * f(x) = x * sigmoid(βx)
     */
    swish: function(x, beta = 1.0) {
        return x * this.sigmoid(beta * x);
    },
    swishDeriv: function(x, beta = 1.0) {
        const sig = this.sigmoid(beta * x);
        return sig + x * beta * sig * (1 - sig);
    },

    /**
     * Mish: Self-regularized non-monotonic (Misra 2019)
     * f(x) = x * tanh(softplus(x))
     */
    mish: function(x) {
        const sp = Math.log(1 + Math.exp(x));
        return x * Math.tanh(sp);
    },

    /**
     * Leaky ReLU
     */
    leakyRelu: function(x, alpha = 0.01) {
        return x >= 0 ? x : alpha * x;
    },
    leakyReluDeriv: function(x, alpha = 0.01) {
        return x >= 0 ? 1 : alpha;
    },

    /**
     * PReLU: Parametric ReLU
     */
    prelu: function(x, alpha) {
        return x >= 0 ? x : alpha * x;
    },

    /**
     * Softplus: smooth approximation of ReLU
     * f(x) = log(1 + e^x)
     */
    softplus: function(x) {
        return x > 20 ? x : Math.log(1 + Math.exp(x));
    },
    softplusDeriv: function(x) {
        return this.sigmoid(x);
    },

    /**
     * Softsign
     * f(x) = x / (1 + |x|)
     */
    softsign: function(x) {
        return x / (1 + Math.abs(x));
    },
    softsignDeriv: function(x) {
        const denom = 1 + Math.abs(x);
        return 1 / (denom * denom);
    },

    /**
     * Hard Sigmoid (efficient approximation)
     */
    hardSigmoid: function(x) {
        return Math.max(0, Math.min(1, 0.2 * x + 0.5));
    },

    /**
     * Hard Swish (MobileNetV3)
     */
    hardSwish: function(x) {
        return x * this.hardSigmoid(x);
    },

    /**
     * Softmax (for arrays)
     */
    softmax: function(x) {
        const maxVal = Math.max(...x);
        const exps = x.map(v => Math.exp(v - maxVal));
        const sum = exps.reduce((a, b) => a + b, 0);
        return exps.map(e => e / sum);
    },

    /**
     * Log-Softmax (numerically stable)
     */
    logSoftmax: function(x) {
        const maxVal = Math.max(...x);
        const shifted = x.map(v => v - maxVal);
        const logSumExp = Math.log(shifted.reduce((s, v) => s + Math.exp(v), 0));
        return shifted.map(v => v - logSumExp);
    },

    // Apply activation to array
    apply: function(arr, activation, ...params) {
        const fn = this[activation];
        if (!fn) throw new Error(`Unknown activation: ${activation}`);
        return Array.isArray(arr) ? arr.map(x => fn.call(this, x, ...params)) : fn.call(this, arr, ...params);
    }
}