/**
 * PRISM_LOSS_FUNCTIONS_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 139
 * Session: R2.3.1 Engine Gap Extraction Round 2
 */

const PRISM_LOSS_FUNCTIONS_ENGINE = {
    name: 'PRISM_LOSS_FUNCTIONS_ENGINE',
    version: '1.0.0',
    source: 'MIT 6.036, Stanford CS 231N',

    /**
     * Mean Squared Error
     */
    mse: function(predictions, targets) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.pow(predictions[i] - targets[i], 2);
        }
        return sum / predictions.length;
    },

    /**
     * Mean Absolute Error
     */
    mae: function(predictions, targets) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            sum += Math.abs(predictions[i] - targets[i]);
        }
        return sum / predictions.length;
    },

    /**
     * Huber Loss (smooth L1)
     */
    huber: function(predictions, targets, delta = 1.0) {
        let sum = 0;
        for (let i = 0; i < predictions.length; i++) {
            const error = Math.abs(predictions[i] - targets[i]);
            if (error <= delta) {
                sum += 0.5 * error * error;
            } else {
                sum += delta * (error - 0.5 * delta);
            }
        }
        return sum / predictions.length;
    },

    /**
     * Cross-Entropy Loss
     */
    crossEntropy: function(predictions, targets, epsilon = 1e-15) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[i]));
            loss -= targets[i] * Math.log(p) + (1 - targets[i]) * Math.log(1 - p);
        }
        return loss / predictions.length;
    },

    /**
     * Categorical Cross-Entropy (for multi-class)
     */
    categoricalCrossEntropy: function(predictions, targetIndex, epsilon = 1e-15) {
        const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[targetIndex]));
        return -Math.log(p);
    },

    /**
     * Focal Loss (for imbalanced data)
     */
    focalLoss: function(predictions, targets, gamma = 2.0, alpha = 0.25, epsilon = 1e-15) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            const p = Math.max(epsilon, Math.min(1 - epsilon, predictions[i]));
            const pt = targets[i] === 1 ? p : 1 - p;
            const alphat = targets[i] === 1 ? alpha : 1 - alpha;
            loss -= alphat * Math.pow(1 - pt, gamma) * Math.log(pt);
        }
        return loss / predictions.length;
    },

    /**
     * Hinge Loss (for SVM)
     */
    hingeLoss: function(predictions, targets, margin = 1.0) {
        let loss = 0;
        for (let i = 0; i < predictions.length; i++) {
            // targets should be -1 or 1
            loss += Math.max(0, margin - targets[i] * predictions[i]);
        }
        return loss / predictions.length;
    },

    /**
     * Contrastive Loss (for siamese networks)
     */
    contrastiveLoss: function(distance, label, margin = 1.0) {
        // label: 1 if same class, 0 if different
        if (label === 1) {
            return distance * distance;
        } else {
            return Math.max(0, margin - distance) ** 2;
        }
    },

    /**
     * Triplet Loss (for metric learning)
     */
    tripletLoss: function(anchor, positive, negative, margin = 1.0) {
        const distAP = this._euclidean(anchor, positive);
        const distAN = this._euclidean(anchor, negative);
        return Math.max(0, distAP - distAN + margin);
    },

    /**
     * KL Divergence
     */
    klDivergence: function(p, q, epsilon = 1e-15) {
        let divergence = 0;
        for (let i = 0; i < p.length; i++) {
            const pi = Math.max(epsilon, p[i]);
            const qi = Math.max(epsilon, q[i]);
            divergence += pi * Math.log(pi / qi);
        }
        return divergence;
    },

    /**
     * Jensen-Shannon Divergence
     */
    jsDivergence: function(p, q) {
        const m = p.map((pi, i) => (pi + q[i]) / 2);
        return (this.klDivergence(p, m) + this.klDivergence(q, m)) / 2;
    },

    _euclidean: function(a, b) {
        let sum = 0;
        for (let i = 0; i < a.length; i++) {
            sum += (a[i] - b[i]) ** 2;
        }
        return Math.sqrt(sum);
    }
}