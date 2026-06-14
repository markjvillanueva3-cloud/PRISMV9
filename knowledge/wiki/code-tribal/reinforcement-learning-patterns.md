---
name: reinforcement-learning-patterns
category: code-tribal
domain: backend-dev
tags: [reinforcement-learning, q-learning, bandit, policy, reward-shaping, ai-development]
last_updated: 2026-05-18
---

# RL Patterns — bandits, Q-learning, conformal RL

PRISM uses RL for adaptive parameter selection, AI tier routing, operator-in-the-loop optimization. Three regimes.

## Regime 1 — Multi-armed bandit

K arms, stochastic reward, exploration vs exploitation. Algorithms: epsilon-greedy (eps=0.1), UCB1 (optimism), Thompson sampling (Bayesian, sample posterior), LinUCB (contextual). PRISM xproc_bandit_* defaults Thompson with Beta prior. Used for Ollama routing, scrutiny-reviewer selection, speed/feed ranking.

## Regime 2 — Q-learning (off-policy TD)

Q(s,a) update: Q + alpha (r + gamma max Q' - Q). alpha=0.1 decay 0.01, gamma=0.95. PRISM xproc_qlearn_*; used in adaptive_feed_modulate.

## Regime 3 — Policy gradients

Tabular + linear-with-features only (deep PG too sample-hungry for shop floor). xproc_policy_*.

## Reward shaping — most important choice

1. Match metric to goal. "Shortest cycle" alone crashes tools — add safety penalty.
2. Sparse rewards underspecify. Add intermediate signals (finish, spindle load).
3. Reward hacking is real. Reward "low residual" produces self-consistent but inaccurate policies. Use held-out eval.

xproc_reward_shape applies weighted shaping; xproc_reward_audit catches hacking.

## Safety-critical exploration

1. Safety envelope constraint — never act outside known-safe envelope. prism_safety:omega_safety_evaluate is the gate.
2. Off-policy from logged data — don't explore in the wild.
3. Conformal-set action selection — pick action whose upper bound on cost < threshold.

## Contextual bandits — PRISM sweet spot

Pick CAM strategy per material+feature+tool. Pick post dialect per controller. Pick Ollama model per latency budget. Thompson + LinUCB is the workhorse.

## Always-evaluate-against-baseline rule

Beat baseline by margin AND conformal sets cover at promised alpha. Gates: xproc_policy_get_baseline returns baseline; lifecycle checks both before flipping live.

## Exploration ratchet

Pure eps-greedy keeps selecting consistently-failed actions. PRISM tracks per-action failure history and downweights repeated failures even under exploration.

## When RL is the wrong tool

One-shot decisions = static rule. Have good human policy = imitation learning. No exploration budget = conformal-bounded contextual bandits.

## Related

- [[gradient-descent-and-optimizers]] · [[conformal-prediction-uq]] · [[lora-fine-tuning-patterns]] · [[fail-loud-r12-patterns]]
- prism_ai: xproc_qlearn_*, xproc_bandit_*, xproc_policy_*, xproc_reward_*
