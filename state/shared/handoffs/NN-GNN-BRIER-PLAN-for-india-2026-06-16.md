1. **Reference‑pool growth** – add vetted ghost nodes from tier‑4 and high‑confidence pseudo‑labels (e.g., self‑training).  
   *Why it hits refinement*: more labeled examples sharpen the decision boundary, reducing intrinsic uncertainty rather than fixing systematic bias.  
   *Validation*: Full‑coverage Brier on a held‑out set ↓ ≥0.02 (target ≤0.19) while AUROC stays ≥0.78.

2. **Sharper node features** – augment each node with higher‑order structural descriptors (graphlet counts, spectral embeddings, positional encodings).  
   *Why it hits refinement*: richer representations increase separability, lowering the variance component of Brier (refinement loss).  
   *Validation*: AUROC ↑ ≥0.02 and Full‑coverage Brier ↓ ≥0.015 (target ≤0.175).

3. **H2GCN heterophily‑aware architecture** – replace vanilla GraphSAGE with H2GCN (or its residual variant) to model cross‑type edges explicitly.  
   *Why it hits refinement*: better captures true label patterns in a heterophilic graph, reducing prediction entropy (refinement).  
   *Validation*: Macro‑F1 ↑ ≥0.05 and Full‑coverage Brier ↓ ≥0.012 (target ≤0.163).

4. **Multi‑seed ensemble averaging** – train 5 independent seeds, average their softmax outputs at inference.  
   *Why it hits refinement*: ensembles reduce stochastic variance of predictions, directly lowering the refinement term of Brier.  
   *Validation*: Variance of subgraph AUROC < 0.01 and Full‑coverage Brier ↓ ≥0.010 (target ≤0.153).

5. **Post‑hoc temperature scaling** – fit a single temperature on the validation set after steps 1‑4.  
   *Why it hits refinement*: by tightening probability mass around correct classes, it further compresses residual uncertainty; calibration impact is minimal because Murphy term is already tiny.  
   *Validation*: Expected Calibration Error (ECE) ↓ ≤0.02 and Full‑coverage Brier ≤ 0.150.

6. **Graph‑diffusion label refinement**
