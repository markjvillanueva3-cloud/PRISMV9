# Neural-net training fundamentals (cheat-sheet, PRISM-anchored)

> Source: tetsuo (@tetsuoai) "How to Train a Neural Net" 4-page deep-learning cheat sheet (x.com/tetsuoai, 2026-06-07), reviewed + verified correct by slot:india 2026-06-09. This entry distills the 16 panels and anchors each to where PRISM's NN/GNN/LoRA stack actually uses it -- the value is the PRISM mapping, not the textbook restatement. PRISM already implements these; this is the reference + the debugging discipline that bears directly on the GNN gate-clearance work.

## The objective + the update (panels 1-4)
- Supervised objective: `J(theta) = (1/N) sum_i L(f_theta(x_i), y_i)`; `theta* = argmin_theta J(theta)`. Pipeline: data -> model f_theta -> prediction y_hat -> loss `L(y_hat, y)`.
- SGD update: `theta_{k+1} = theta_k - eta * grad_theta J_B(theta_k)` where the batch gradient `grad J_B = (1/|B|) sum_{i in B} grad L_i`. Gradient points uphill, so subtract it; eta = learning rate. Mini-batch gradients are noisy but cheap.
- Momentum (velocity form): `v_{k+1} = mu*v_k - eta*grad J_B`; `theta_{k+1} = theta_k + v_{k+1}`. Carries updates in a consistent direction, speeds convergence in narrow valleys, can overshoot. Gradient clipping `g <- g * min(1, tau/||g||_2)` limits unstable large gradients.
- Useful objectives: MSE `||y_hat - y||_2^2`, cross-entropy `-sum_c y_c log y_hat_c`. A useful objective gives local signal for improvement, matches the task/output space, and benefits from continuity + differentiability (smoothness helps but is not required -- ReLU/GeLU affect gradient flow).

## The graph + backprop (panels 5-9, 13-14)
- A neural net is a DAG of differentiable blocks: nodes are functions, edges carry activations/parameters/gradients. Forward computes activations + a scalar loss; backward sends error signals back through the graph.
- Backprop = reused chain rule (reverse dynamic programming): `g_{l-1} = (d x_l / d x_{l-1})^T g_l`; `dJ/d theta_l = (d x_l / d theta_l)^T g_l`. Naive chain rule recomputes shared products; backprop computes each shared term once.
- Generic layer backward: takes upstream `g_out`, returns `g_in = (d x_out/d x_in)^T g_out` for the previous activation and `g_theta = (d x_out/d theta)^T g_out` for the layer params.
- Linear layer: `x_out = W x_in + b`; `g_in = W^T g_out`; `dJ/dW = g_out x_in^T` (outer product); `dJ/db = g_out`. ReLU backward is a gate.
- DAG rules / parameter sharing: at a **merge (fan-in)** backward sends gradients to each input; at a **branch (fan-out)** gradients from downstream paths **sum**. If theta is reused, `dJ/d theta` is the **sum of all contributions** -- every path using a variable contributes to its gradient. (PRISM anchor: the GNN operates on the system graph -- a real DAG; shared-parameter message passing sums contributions across neighbors exactly this way.)

## Why average over the batch (panel 10)
Averaging (`J_B = (1/|B|) sum L_i`) keeps gradient scale roughly stable across batch sizes; summing would make the effective step grow with `|B|`. Batch size mainly trades noise vs compute.

## Debugging checks (panel 11) -- DIRECTLY actionable for PRISM's GNN
The panel's checklist IS the discipline the GNN tier-5 gate-clearance work runs under ([[nn-graph-ms0]], [[gnn-selective-deploy]]):
- **Loss decreases on a tiny batch** -- the overfit-a-tiny-set sanity test (a model that can't memorize a handful of examples has a wiring bug, not a data problem).
- **Gradients are finite (no NaN/Inf)** and **gradient norms are not all zero** -- the zero-grad / exploding failure modes (panel 5).
- **Check every tensor shape + matrix multiply.**
- **Verify train vs validation metrics separately; track validation loss independently** -- this is exactly why PRISM reports the GNN's holdout AUROC/Brier, not training fit, and why a single-seed AUROC lift is never trusted ([[feedback_multiseed_before_auroc_claim]] -- H2GCN +0.118 on seed5 was noise: seed7 -0.049). Require >=3 seeds + a realistic config before any AUROC claim.

## Differentiable programming + input optimization (panels 15-16)
- Deep learning = differentiable programming with learned params; any scalar cost can drive optimization; backprop can target **parameters, inputs, latents, or internal activations**.
- Training optimizes theta to reduce cost; **input optimization** optimizes x to maximize a target score: `x* = argmax_x h_j(x) - lambda*R(x)`. Unit visualization / DeepDream use this same idea. (PRISM anchor: feature-attribution / "what input makes a ghost node classify as dispatcher D" is the input-optimization framing -- backprop to the input, not the weights.)

## Mental model (panel 12)
Forward `x_0 -> x_1 -> ... -> x_L` builds the computation + stores activations; Loss `J = L(x_L, y)` turns behavior into one scalar; Backward `g_L -> ... -> g_0` measures how each variable affects that scalar; Update `theta_k <- theta_k - eta * dJ/d theta_k`. Training is repeated numerical improvement.

## What this changes for PRISM right now
Nothing structural -- PRISM's GraphSAGE GNN + LoRA stack already implement all 16 panels. The load-bearing takeaway is panel 11's debugging discipline as the standing checklist for the GNN gate-clearance work (#9, currently DATA-blocked at AUROC 0.808 selective-deploy): tiny-batch overfit, finite/non-zero grads, separate train/val tracking, and >=3-seed confirmation before any AUROC claim. See [[nn-graph-ms0]] / [[gnn-selective-deploy]] / [[feedback_multiseed_before_auroc_claim]].
