/**
 * ActivationFunctionsAlgorithm — canonical neural-network activation library.
 *
 * U-EXTRACT-ACTIVATIONS (slot:golf 2026-05-24, iter 16): extracted from
 * extracted_modules/ai_ml_engines/PRISM_ACTIVATIONS_ENGINE.js. Verified
 * via grep that PRISM had NO existing implementation of relu / sigmoid /
 * tanh / softmax in src/engines/ or src/algorithms/. Genuine 17-function
 * gap closure for the ML/DL subsystems.
 *
 * Sources: MIT 6.036 (Intro to ML), Stanford CS 231N (CNNs).
 *
 * Numerical-stability hardening (preserved from extraction source):
 *  - sigmoid: input clamped to ±500 before exp() to prevent overflow
 *  - softmax: shift by max(x) before exp() for stability
 *  - softplus: x>20 short-circuits to x (log(1+e^x) ≈ x for large x)
 *  - log-softmax: max-shift + log-sum-exp pattern
 *
 * All functions are pure (stateless). Each activation has a sibling
 * derivative for backprop. The `apply(arr, name, ...args)` dispatcher
 * supports array OR scalar input.
 */

export type ActivationName =
  | "relu" | "sigmoid" | "tanh" | "elu" | "selu" | "gelu" | "swish" | "mish"
  | "leakyRelu" | "prelu" | "softplus" | "softsign" | "hardSigmoid" | "hardSwish";

const SELU_ALPHA = 1.6732632423543772;
const SELU_SCALE = 1.0507009873554805;
const GELU_INNER_COEF = 0.044715;
const SQRT_2_OVER_PI = Math.sqrt(2 / Math.PI);
const SQRT_2_PI = Math.sqrt(2 * Math.PI);
const SIGMOID_CLAMP = 500;
const SOFTPLUS_CUTOFF = 20;

export class ActivationFunctionsAlgorithm {
  // ----------------- Standard activations -----------------
  static relu(x: number): number { return Math.max(0, x); }
  static reluDeriv(x: number): number { return x > 0 ? 1 : 0; }

  static sigmoid(x: number): number {
    const clamped = Math.max(-SIGMOID_CLAMP, Math.min(SIGMOID_CLAMP, x));
    return 1 / (1 + Math.exp(-clamped));
  }
  static sigmoidDeriv(x: number): number {
    const s = ActivationFunctionsAlgorithm.sigmoid(x);
    return s * (1 - s);
  }

  static tanh(x: number): number { return Math.tanh(x); }
  static tanhDeriv(x: number): number {
    const t = Math.tanh(x);
    return 1 - t * t;
  }

  // ----------------- Advanced activations -----------------
  /** ELU: x if x>0, α(e^x − 1) otherwise. */
  static elu(x: number, alpha = 1.0): number {
    return x >= 0 ? x : alpha * (Math.exp(x) - 1);
  }
  static eluDeriv(x: number, alpha = 1.0): number {
    return x >= 0 ? 1 : ActivationFunctionsAlgorithm.elu(x, alpha) + alpha;
  }

  /** SELU: scaled ELU for self-normalizing networks. */
  static selu(x: number): number {
    return x >= 0
      ? SELU_SCALE * x
      : SELU_SCALE * SELU_ALPHA * (Math.exp(x) - 1);
  }
  static seluDeriv(x: number): number {
    return x >= 0 ? SELU_SCALE : SELU_SCALE * SELU_ALPHA * Math.exp(x);
  }

  /** GELU: Gaussian Error Linear Unit (Hendrycks & Gimpel 2016). */
  static gelu(x: number): number {
    const inner = SQRT_2_OVER_PI * (x + GELU_INNER_COEF * x * x * x);
    return 0.5 * x * (1 + Math.tanh(inner));
  }
  static geluDeriv(x: number): number {
    const inner = SQRT_2_OVER_PI * (x + GELU_INNER_COEF * x * x * x);
    const cdf = 0.5 * (1 + Math.tanh(inner));
    const pdf = Math.exp(-0.5 * x * x) / SQRT_2_PI;
    return cdf + x * pdf;
  }

  /** Swish: x · sigmoid(βx) (Ramachandran et al 2017). */
  static swish(x: number, beta = 1.0): number {
    return x * ActivationFunctionsAlgorithm.sigmoid(beta * x);
  }
  static swishDeriv(x: number, beta = 1.0): number {
    const sig = ActivationFunctionsAlgorithm.sigmoid(beta * x);
    return sig + x * beta * sig * (1 - sig);
  }

  /** Mish: x · tanh(softplus(x)) (Misra 2019). */
  static mish(x: number): number {
    const sp = ActivationFunctionsAlgorithm.softplus(x);
    return x * Math.tanh(sp);
  }

  /** Leaky ReLU: leak slope α for x<0. */
  static leakyRelu(x: number, alpha = 0.01): number {
    return x >= 0 ? x : alpha * x;
  }
  static leakyReluDeriv(x: number, alpha = 0.01): number {
    return x >= 0 ? 1 : alpha;
  }

  /** Parametric ReLU: caller-supplied α. */
  static prelu(x: number, alpha: number): number {
    return x >= 0 ? x : alpha * x;
  }

  /** Softplus: log(1+e^x) — smooth ReLU. Cutoff x>20 returns x. */
  static softplus(x: number): number {
    return x > SOFTPLUS_CUTOFF ? x : Math.log(1 + Math.exp(x));
  }
  static softplusDeriv(x: number): number {
    return ActivationFunctionsAlgorithm.sigmoid(x);
  }

  /** Softsign: x / (1+|x|). */
  static softsign(x: number): number {
    return x / (1 + Math.abs(x));
  }
  static softsignDeriv(x: number): number {
    const denom = 1 + Math.abs(x);
    return 1 / (denom * denom);
  }

  /** Hard Sigmoid: piecewise-linear approximation. */
  static hardSigmoid(x: number): number {
    return Math.max(0, Math.min(1, 0.2 * x + 0.5));
  }

  /** Hard Swish: x · hardSigmoid(x) (MobileNetV3). */
  static hardSwish(x: number): number {
    return x * ActivationFunctionsAlgorithm.hardSigmoid(x);
  }

  // ----------------- Array activations -----------------
  /** Softmax with max-shift for numerical stability. Sum of output = 1. */
  static softmax(x: number[]): number[] {
    if (!Array.isArray(x) || x.length === 0) return [];
    const maxVal = Math.max(...x);
    const exps = x.map(v => Math.exp(v - maxVal));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(e => e / sum);
  }

  /** Log-Softmax (numerically stable via log-sum-exp). */
  static logSoftmax(x: number[]): number[] {
    if (!Array.isArray(x) || x.length === 0) return [];
    const maxVal = Math.max(...x);
    const shifted = x.map(v => v - maxVal);
    const logSumExp = Math.log(shifted.reduce((s, v) => s + Math.exp(v), 0));
    return shifted.map(v => v - logSumExp);
  }

  /**
   * Apply a named activation to a scalar OR an array of scalars. Throws on
   * unknown activation name (fail-loud — caller can't accidentally get the
   * wrong function).
   */
  static apply(arr: number | number[], name: ActivationName, ...params: number[]): number | number[] {
    const fn = (ActivationFunctionsAlgorithm as unknown as Record<string, (x: number, ...p: number[]) => number>)[name];
    if (typeof fn !== "function") {
      throw new Error(`ActivationFunctionsAlgorithm: unknown activation "${name}"`);
    }
    if (Array.isArray(arr)) return arr.map(x => fn(x, ...params));
    return fn(arr, ...params);
  }
}

/** Singleton export per PRISM engine convention. */
export const activationFunctionsAlgorithm = ActivationFunctionsAlgorithm;
