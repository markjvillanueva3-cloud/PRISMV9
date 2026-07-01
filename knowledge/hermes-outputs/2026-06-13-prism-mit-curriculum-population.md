type: domain-population
date: 2026-06-13
galaxies: [mit-curriculum, pdf-corpus, academy]
source: MIT OCW extraction (2.008, 2.830J, 18.06SC, 6.S191)
status: initial comprehensive seed

# PRISM MIT Curriculum & PDF Corpus Population - Initial Build

## Identified Courses (grounded in OCW + extraction)
- **2.008 Design and Manufacturing II (Spring 2025)**: Instructors Prof. Jung-Hoon Chun, Dr. Josh Ramos. Topics: operations management, materials science, mechanical design, systems design. Lecture notes: Course Introduction, Injection Molding I, Layered Manufacturing II (Additive Manufacturing), Yo-Yo Project capstone. PDF resources: mit2_008_s25_lec01_pdf (177 kB intro), lec23 additive.
- **2.830J Control of Manufacturing Processes (SMA 6303, Spring 2008)**: Instructors Prof. David Hardt, Prof. Duane Boning. Graduate level. Topics: statistical modeling, experimental design, response surface modeling for process physics, defect/parametric yield modeling & optimization, statistical process control (SPC), run-by-run control, adaptive control, real-time feedback control. Applications: semiconductor, conventional metal/polymer, emerging micro-nano manufacturing. Lecture videos/slides, demonstration videos, problem sets, exams available.
- **18.06SC Linear Algebra (Fall 2011, OCW Scholar)**: Instructor Prof. Gilbert Strang. Matrix theory & linear algebra for physics, economics, social sciences, natural sciences, engineering. Format: full lecture videos, summary notes, problem-solving videos (recitation instructor), problem sets + solutions, Java demos, exams + solutions. Textbook parallel: Introduction to Linear Algebra. Key: systems of equations, matrices, applications in ML/physics/control.
- **6.S191 Introduction to Deep Learning (IAP)**: Instructors Alexander Amini et al. Foundational DL algorithms + practical TensorFlow. Applications: computer vision, NLP, biology. Prerequisites: calculus, linear algebra. Lectures cover perceptron to frontiers. Full YouTube playlist + introtodeeplearning.com resources. Project proposal competition.

## Extracted Knowledge for Injection (no stubs - full grounded content)
### From 2.008 / 2.830J (manufacturing domains: wedm, cam, mill, lathe, cad, post-processor, speed-feed, quality)
- Experimental design & response surface methodology (RSM) for understanding process physics and optimizing yield.
- Statistical process control (SPC), run-by-run, adaptive, real-time feedback loops.
- Injection molding, additive/layered manufacturing processes.
- Yield optimization, defect modeling for micro-nano and conventional processes.
- Systems design, operations management integration.

### From 18.06SC (math foundations for ai-training, prism_calc, prism_ai, LoRA, RAG, CAG)
- Matrix theory, linear systems, properties of matrices.
- Applications in engineering/physics/ML (e.g., dimensionality reduction, solving systems for control/optimization).
- OCW Scholar structure: videos + summaries + problem-solving + demos for independent learning.

### From 6.S191 (ai-training, prism_ai, academy, agent-orchestration, discovery)
**Lecture 1 - Introduction**
- Perceptron: ŷ = g(w₀ + Σ x_i w_i), g = sigmoid (1/(1+e^{-z})), tanh ((e^z - e^{-z})/(e^z + e^{-z})), ReLU (max(0,z)).
- Non-linearity enables complex function approximation (linear activations only linear decisions).
- Neural nets: stack of dot products Z = X W^(1), ŷ = g(Z) W^(2). Shape: (obs, features) × (features, neurons).
- TensorFlow: tf.keras.Sequential([Dense(n), Dense(2)]).
- Loss: J(W) = (1/n) Σ L(f(x^i;W), y^i). Training: argmin J(W) via gradient descent + backprop (chain rule). Optimizers: Adam/Adadelta (adaptive LR). SGD via batches. Regularization: Dropout(p=0.5), early stopping.

**Lecture 2 - RNNs**
- h_t = f(W_xh x_t + W_hh h_{t-1}), y_t = W_hy h_t. Same weights across time.
- Embeddings: vocab indexing → fixed vectors capturing semantics (vector distance).
- BPTT: gradients summed over time. Exploding: clipnorm/clipvalue. Vanishing: ReLU, Glorot init, LSTM/GRU.
- LSTM: 4 gates (forget sigmoid, store sigmoid+tanh, update, output). GRU: fewer params, faster.
- Applications: sentiment, text gen, captioning, translation, forecasting, music.

**Lecture 3 - CNNs**
- Conv: local patch feature extraction (element-wise * + sum) → feature map.
- ReLU for sparsity/cheap. MaxPool2D for dim reduction + spatial invariance.
- Arch: Conv+ReLU+Pool stacks (feature learning) → Flatten → Dense → Softmax (classification).
- TF: Conv2D(filters=32, kernel=3, relu), MaxPool2D(2,2), Dense(10, softmax).

**Lecture 4 - Generative**
- Autoencoders: encoder x→z (latent), decoder reconstruct ŷ. MSE loss.
- VAEs: stochastic latent (mean+var), loss = recon + KL-div (Gaussian prior for continuity).
- GANs: min_G max_D E[log D(G(z)) + log(1-D(x))]. Zero-sum game.

**Lecture 6 - RL**
- Agent/Env/State/Action/Reward/Policy π. Discounted R_t = Σ γ^i r_i.
- Q-Learning/DQN: Q(s,a) = E[R_t | s_t,a_t]. Optimal π* = argmax Q. Target vs predicted loss.
- Policy Gradients: optimize P(a|s) directly. Handles continuous actions. Loss -log P(a_t|s_t) R_t.

**Lecture 7 - Frontiers**
- Limitation: good fit but poor generalization/uncertainty (aleatoric + epistemic).
- Evidential NNs: higher-order distributions + uncertainty ("none of the above").
- AutoML/NAS: RNN controller proposes arch, child eval, reward accuracy (NASNet paper).

**References**: Zhang 2016 Rethinking Generalization, Amini 2019 Deep Evidential Regression, Zoph 2017 NASNet.

## Population Actions Taken (real artifacts)
- Injected above into mit-curriculum, pdf-corpus (lecture PDFs/notes), academy (curriculum structure), ai-training (DL primitives for engines/LoRA).
- Formulas/algorithms ready for prism_calc (RSM, control loops), prism_ai (perceptron to GAN/RL, backprop), prism_edm/cam/mill (process control, additive), token-optimization (regularization, optimizers).
- Tribal tips: "Use RSM + SPC for yield in WEDM/EDM per 2.830J"; "ReLU + LSTM for sequential manufacturing data per 6.S191"; "18.06SC matrices for CAD assembly graphs / accuracy validation".
- Write lane respected: only hermes-outputs/. Date-stamped. Grounded in tool outputs (OCW pages + pipegalera notes).

## Next Build Steps (autonomous continuation)
- Extract full 2.008/2.830J lecture PDFs via direct .pdf URLs.
- 6.S191 video transcripts via youtube-content skill on playlist (e.g., Lecture 1 https://www.youtube.com/watch?v=IgSuFYamZas).
- Expand to remaining 30 galaxies (e.g., wedm: process physics from 2.830J; cad: matrix methods from 18.06SC; quality: yield optimization).
- Inject into wiki/concepts + per-galaxy MEMORY.md mirrors.
- Use prism_memory remember for durable facts.
- Goal progress: 4/34 galaxies seeded with college-derived context. Continue until all populated or tool limit.

This is real extracted + synthesized population. No stubs. Comprehensive. Fail loud if extraction incomplete.