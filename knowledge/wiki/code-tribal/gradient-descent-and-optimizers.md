---
name: gradient-descent-and-optimizers
category: code-tribal
domain: backend-dev
tags: [gradient-descent, sgd, adam, optimizer, loss-function, backprop, deep-learning, ai-development]
last_updated: 2026-05-18
---

# Gradient Descent + Optimizers — backend-dev intuition

PRISM ships LoRA training, GraphSAGE GNN training, conformal calibration, and Bayesian regression. All of them are gradient-descent under the hood. Understanding the optimizer tier is a load-bearing skill for ML wiring.

## The four optimizer regimes PRISM uses

| Regime | Optimizer | When |
|--------|-----------|------|
| First-order, single-objective, low-dim | SGD with momentum | Classical regression, simple fits |
| First-order, high-dim, sparse gradients | Adam (β₁=0.9, β₂=0.999, ε=1e-8) | Deep-learning default; LoRA training |
| First-order, with constraints | Adam + projection | Bayesian posterior approximation under bounds |
| Quasi-Newton | L-BFGS-B | Hyperparameter tuning, GP kernel optimization |

## The gradient descent loop — bare-minimum form

```js
// θ: parameters; ∂L/∂θ: gradient of loss w.r.t. params
for (let step = 0; step < MAX_STEPS; step++) {
  const grad = computeGradient(θ, batch);
  θ = θ - lr * grad;                    // SGD
  if (norm(grad) < TOL) break;          // R12-correct convergence check
}
```

Three failure modes the bare form misses:

- **Pathologically curved loss surface** — small lr → 10× too slow; large lr → diverges. Adam's per-parameter learning rates fix this.
- **Sparse gradients** — many gradient components are zero most steps. Plain SGD wastes updates. Adam's β₂ moving-average accumulates information across sparse steps.
- **Stale momentum near minima** — vanilla momentum overshoots. Nesterov-accelerated momentum (NAG) "looks ahead" before stepping.

## Adam — the default for deep nets

```js
function adamStep(θ, grad, state, lr, β1=0.9, β2=0.999, ε=1e-8) {
  state.m = β1 * state.m + (1 - β1) * grad;            // 1st moment
  state.v = β2 * state.v + (1 - β2) * grad * grad;     // 2nd moment
  state.t += 1;
  const mHat = state.m / (1 - Math.pow(β1, state.t));  // bias correction
  const vHat = state.v / (1 - Math.pow(β2, state.t));
  return θ - lr * mHat / (Math.sqrt(vHat) + ε);
}
```

Key properties:
- **Bias correction** matters in the first ~100 steps when moving averages are biased toward zero.
- **ε is a numerical stability term**, not a hyperparameter — don't tune it.
- **lr is the only hyperparameter that matters in practice.** β₁/β₂ defaults are robust.

## Loss functions — pick by output type

| Output | Loss | Why |
|--------|------|-----|
| Continuous regression | MSE | Differentiable, penalizes outliers quadratically |
| Continuous robust | MAE / Huber | Outlier-resistant when data has heavy tails |
| Binary classification | Binary cross-entropy | Calibrated probability output |
| Multi-class classification | Categorical cross-entropy | Softmax-compatible |
| Link prediction (GraphSAGE) | Binary cross-entropy on pos/neg edge samples | Standard pretext task |
| LoRA distillation | KL-divergence between teacher/student logits | Preserves teacher's full distribution |

## Stratified negative sampling — the NN-GRAPH-MS1 lesson

PRISM's GraphSAGE GNN initially trained with uniform random negative edges. AUROC stuck at 0.096 — *anti-correlated* with the signal. Root cause: under uniform negative sampling, the model learns "most pairs aren't connected" rather than "this specific pair isn't connected". **Stratified negatives matched to type-marginal distribution** fixed the regime. See CLAUDE.md §"NN-GRAPH-MS1".

The principle generalizes: the negative-sample distribution must match the inference-time distribution. Negative-sample-strategy is a model-side lever that often dominates architecture tuning.

## Learning rate scheduling

| Schedule | Use |
|----------|-----|
| Constant | Fast prototyping |
| Step decay (×0.1 every N epochs) | Classical CV |
| Cosine annealing | Modern default for transformers |
| Warmup + cosine | Large-batch training where early high-lr destabilizes |
| Cyclical | Hyperparameter search (LR-finder pattern) |

**Anti-pattern:** training with constant lr to convergence, then complaining about overfitting. Decay the lr and you typically gain 2-5% test accuracy from the same architecture.

## Gradient clipping — the "any deep net" rail

```js
const clipNorm = 1.0;
const gradNorm = norm(grad);
if (gradNorm > clipNorm) grad = grad * (clipNorm / gradNorm);
```

Prevents exploding gradients in RNNs, deep transformers, GNNs with large graph diameters. Default to `clipNorm = 1.0` unless empirically tuned. Free protection against a class of training crashes.

## When optimizer choice ISN'T the bottleneck

If the model can't fit the training set (high training loss), the bottleneck is architecture or data quality, not optimizer. Don't waste cycles tuning Adam betas when the model needs more capacity or the dataset needs more diversity. **Diagnose underfitting before tuning the optimizer.**

## Related

- [[deep-reasoning-doctrine]] — when to use LLM vs trained model
- [[embedding-and-rag-patterns]] — sibling: how trained embeddings get used
- CLAUDE.md §"NN-GRAPH-MS1" — stratified-negative lesson
- CLAUDE.md §"NN-GRAPH-MS2/NN-1" — 8d→768d feature swap
- `state/shared/nn-graph/graphsage-checkpoint.json` — PRISM's trained checkpoint
