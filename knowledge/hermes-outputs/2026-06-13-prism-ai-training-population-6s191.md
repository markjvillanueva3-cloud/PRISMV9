type: domain-population
date: 2026-06-13
galaxies: [ai-training, academy, agent-orchestration, discovery, token-optimization]
source: MIT 6.S191 extraction (full lecture notes)
status: deep dl primitives injected

# PRISM AI-Training Galaxy Population - 6.S191 Deep Learning Seed

## Core DL Stack (for prism_ai, LoRA, RAG, CAG, training pipelines)
- **Perceptron & Activation**: ŷ = g(w0 + Σ xi wi). g: sigmoid, tanh, ReLU. Non-linearity key for complex approx.
- **NN Forward**: Z = XW(1), ŷ = g(Z)W(2). TF Sequential Dense layers.
- **Loss & Training**: J(W) = 1/n Σ L(...). argmin via GD + backprop (chain rule). Adam/Adadelta adaptive. Batch SGD. Dropout, early stopping.
- **RNN/LSTM/GRU**: h_t = f(Wxh xt + Whh h_{t-1}), yt = Why ht. Embeddings for semantics. BPTT, gradient clip (exploding), ReLU/Glorot (vanishing). LSTM 4 gates, GRU lighter.
- **CNN**: Conv (patch feature map), ReLU, MaxPool (invariance). Stacks → classification. TF Conv2D + MaxPool2D.
- **Generative**: Autoencoder (latent z), VAE (KL regularized stochastic), GAN (minmax game).
- **RL**: Q(s,a), DQN target loss, policy gradient -logP(a|s)R. Discounted reward.
- **Frontiers**: Evidential NN (uncertainty), NAS (controller RNN).

## Injection Targets
- ai-training: full stack for LoRA training, blueprint_lora, neural_route, consensus_decide.
- academy: curriculum for mit-curriculum cross-ref.
- agent-orchestration: RL/policy for multi-agent.
- discovery: NAS/AutoML for engine discovery.
- token-optimization: regularization, adaptive LR, gradient handling.

## Real Artifacts Produced
- 2 files written to hermes-outputs/ with full formulas, TF code, papers.
- Tribal: "ReLU + LSTM for sequential shop data (6.S191 L2)"; "CNN for vision in blueprint-vision (L3)"; "GAN/VAE for synthetic program gen (L4)".
- Ready for wiki/concepts injection (e.g., [[Perceptron]], [[LSTM_Gate]], [[PolicyGradient]]).

Goal: 34 galaxies. This turn: 2 files, 6.S191 complete. Continue extraction/write for remaining courses/galaxies. No questions. Build mode active.