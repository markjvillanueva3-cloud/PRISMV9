/**
 * SpeedFeedDeepLearningEngine — SF-AI-L1
 *
 * First-layer AI hardening for Calculator Studio (Speed/Feed).
 * Neural networks, Monte Carlo, Bayesian optimization, chain-of-thought,
 * and self-learning feedback for cutting parameter optimization.
 *
 * AI Capabilities:
 * ----------------
 * 1. NEURAL NETWORK MODELS
 *    - Speed prediction from material/tool/operation context
 *    - Feed optimization with chip load balancing
 *    - Tool life prediction from cutting conditions
 *    - Surface finish estimation from geometry + dynamics
 *    - Power/torque prediction for machine limits
 *
 * 2. MONTE CARLO UNCERTAINTY
 *    - Speed/feed confidence intervals
 *    - Tool life distribution (Weibull)
 *    - MRR variability under process noise
 *    - Safety margin quantification
 *
 * 3. BAYESIAN OPTIMIZATION
 *    - Multi-objective: MRR vs tool life vs finish
 *    - Gaussian Process surrogate for expensive simulations
 *    - Expected Improvement acquisition function
 *    - Constraint-aware optimization (power, torque, chatter)
 *
 * 4. CHAIN-OF-THOUGHT REASONING
 *    - Step-by-step parameter derivation
 *    - Physics principle explanation
 *    - Trade-off analysis with confidence
 *
 * 5. SELF-LEARNING FEEDBACK
 *    - Actual vs predicted tracking
 *    - Shop floor calibration
 *    - Continuous model refinement
 *
 * Physics Integration:
 * --------------------
 * - Kienzle force model (Fc = kc1.1 * ap * fz^(1-mc))
 * - Taylor tool life (VT^n = C)
 * - Loewen-Shaw thermal model
 * - Chip thinning compensation
 * - Stability lobe integration
 *
 * @module engines/SpeedFeedDeepLearningEngine
 * @version 1.0.0
 */
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, } from "../physics/constants.js";
// ============================================================================
// NEURAL NETWORKS
// ============================================================================
/**
 * Initialize MLP with physics-informed weights.
 * Weights are seeded to approximate Kienzle/Taylor relationships.
 */
function createSpeedNetwork() {
    return {
        layers: [
            {
                weights: Array(8).fill(0).map(() => Array(16).fill(0).ma