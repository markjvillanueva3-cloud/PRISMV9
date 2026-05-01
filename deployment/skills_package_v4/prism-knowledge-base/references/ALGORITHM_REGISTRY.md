# PRISM ALGORITHM REGISTRY
## Complete Mapping: Algorithms → Source Courses → PRISM Engines
## Version 1.0 | Auto-Reference for Development

---

## OPTIMIZATION ALGORITHMS

### Linear Programming
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Simplex Method | 6.251J, 15.060 | PRISM_LP_SOLVER | Resource allocation |
| Dual Simplex | 6.251J | PRISM_LP_SOLVER | Sensitivity analysis |
| Interior Point | 6.251J, 6.079 | PRISM_INTERIOR_POINT_ENGINE | Large-scale LP |
| Big-M Method | 15.060 | PRISM_LP_SOLVER | Artificial variables |
| Two-Phase Method | 6.251J | PRISM_LP_SOLVER | Finding initial BFS |

### Nonlinear Programming
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Gradient Descent | 6.867, 6.079 | PRISM_GRADIENT_DESCENT | General NLP |
| Newton's Method | 6.252J, 6.079 | PRISM_NEWTON_OPTIMIZER | Second-order opt |
| Quasi-Newton (BFGS) | 6.252J | PRISM_BFGS_ENGINE | Approx Hessian |
| L-BFGS | 6.252J | PRISM_LBFGS_ENGINE | Limited memory |
| Conjugate Gradient | 6.252J | PRISM_CG_OPTIMIZER | Large systems |
| Trust Region | 6.252J, 6.079 | PRISM_TRUST_REGION_OPTIMIZER | Bounded steps |
| Barrier Method | 6.079 | PRISM_BARRIER_ENGINE | Inequality constraints |
| Penalty Method | 6.252J | PRISM_PENALTY_ENGINE | Constraint handling |
| Augmented Lagrangian | 6.079 | PRISM_AUGLAG_ENGINE | Equality constraints |
| SQP | 6.252J | PRISM_SQP_ENGINE | Constrained NLP |
| ADMM | 6.079 | PRISM_ADMM_ENGINE | Distributed opt |

### Convex Optimization
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Proximal Gradient | 6.079 | PRISM_PROXIMAL_ENGINE | Non-smooth opt |
| FISTA | 6.079 | PRISM_FISTA_ENGINE | Accelerated proximal |
| Frank-Wolfe | 6.079 | PRISM_FRANKWOLFE_ENGINE | Projection-free |
| Mirror Descent | 6.079 | PRISM_MIRROR_DESCENT | Non-Euclidean |
| Subgradient Method | 6.079 | PRISM_SUBGRADIENT_ENGINE | Non-differentiable |

### Combinatorial Optimization
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Branch & Bound | 15.083J, 18.433 | PRISM_BRANCH_BOUND_ENGINE | Integer programming |
| Branch & Cut | 15.083J | PRISM_BRANCH_CUT_ENGINE | Mixed-integer |
| Cutting Planes | 15.083J | PRISM_CUTTING_PLANE_ENGINE | IP relaxation |
| Dynamic Programming | 6.231, 6.046J | PRISM_DP_ENGINE | Sequential decisions |
| A* Search | 6.034, 16.410 | PRISM_ASTAR_ENGINE | Pathfinding |
| Dijkstra's | 6.006, 6.046J | PRISM_DIJKSTRA_ENGINE | Shortest path |
| Bellman-Ford | 6.006 | PRISM_BELLMANFORD_ENGINE | Negative weights |
| Floyd-Warshall | 6.006 | PRISM_FLOYDWARSHALL_ENGINE | All-pairs shortest |
| Hungarian | 15.083J | PRISM_HUNGARIAN_ENGINE | Assignment |
| Max Flow (Ford-Fulkerson) | 6.046J, 15.082J | PRISM_MAXFLOW_ENGINE | Network flow |
| Min Cut | 6.046J | PRISM_MINCUT_ENGINE | Graph partitioning |

### Metaheuristics
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Genetic Algorithm | 6.034, 15.097 | PRISM_GENETIC_ALGORITHM | Global search |
| Particle Swarm (PSO) | 15.097 | PRISM_PSO_OPTIMIZER | Continuous opt |
| Simulated Annealing | 6.046J | PRISM_SIMULATED_ANNEALING | Escape local minima |
| Tabu Search | 15.083J | PRISM_TABU_SEARCH | Memory-based search |
| Ant Colony (ACO) | 15.097 | PRISM_ACO_SEQUENCER | Routing, sequencing |
| Differential Evolution | 15.097 | PRISM_DIFFERENTIAL_EVOLUTION | Real-valued opt |
| CMA-ES | 6.867 | PRISM_CMA_ES | Evolution strategies |
| NSGA-II | 15.083J | PRISM_NSGA2 | Multi-objective |
| NSGA-III | 15.083J | PRISM_NSGA3 | Many-objective |
| MOEA/D | 15.083J | PRISM_MOEAD | Decomposition |

### Dynamic Programming
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Value Iteration | 6.231 | PRISM_VALUE_ITERATION | MDP |
| Policy Iteration | 6.231 | PRISM_POLICY_ITERATION | MDP |
| Q-Learning | 6.231, 6.867 | PRISM_QLEARNING_ENGINE | Model-free RL |
| SARSA | 6.231 | PRISM_SARSA_ENGINE | On-policy RL |
| Bellman Equation | 6.231 | PRISM_BELLMAN_ENGINE | Optimal control |

---

## MACHINE LEARNING ALGORITHMS

### Supervised Learning
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Linear Regression | 6.867, 15.060 | PRISM_LINEAR_REGRESSION | Prediction |
| Ridge Regression | 6.867 | PRISM_RIDGE_REGRESSION | L2 regularization |
| Lasso | 6.867 | PRISM_LASSO_ENGINE | L1 / feature selection |
| Elastic Net | 6.867 | PRISM_ELASTIC_NET | Combined L1+L2 |
| Logistic Regression | 6.867 | PRISM_LOGISTIC_REGRESSION | Classification |
| SVM | 6.867, 9.520 | PRISM_SVM_ENGINE | Classification/regression |
| Decision Tree | 6.867 | PRISM_DECISION_TREE_ENGINE | Interpretable models |
| Random Forest | 6.867, 15.097 | PRISM_RANDOM_FOREST | Ensemble |
| Gradient Boosting | 6.867, 15.097 | PRISM_GRADIENT_BOOSTING | Ensemble |
| XGBoost | 15.097 | PRISM_XGBOOST_ENGINE | Fast boosting |
| LightGBM | 15.097 | PRISM_LIGHTGBM_ENGINE | Large datasets |
| CatBoost | 15.097 | PRISM_CATBOOST_ENGINE | Categorical features |
| k-NN | 6.867 | PRISM_KNN_ENGINE | Instance-based |
| Naive Bayes | 6.867 | PRISM_NAIVE_BAYES | Probabilistic |
| Gaussian Processes | 6.867, 9.520 | PRISM_GP_ENGINE | Uncertainty quantification |

### Unsupervised Learning
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| K-Means | 6.867 | PRISM_KMEANS_ENGINE | Clustering |
| DBSCAN | 6.867 | PRISM_DBSCAN_ENGINE | Density clustering |
| Hierarchical Clustering | 6.867 | PRISM_HIERARCHICAL_CLUSTER | Dendrograms |
| GMM | 6.867 | PRISM_GMM_ENGINE | Soft clustering |
| PCA | 6.867 | PRISM_PCA_ENGINE | Dimensionality reduction |
| ICA | 6.867 | PRISM_ICA_ENGINE | Source separation |
| t-SNE | 6.867 | PRISM_TSNE_ENGINE | Visualization |
| UMAP | 6.867 | PRISM_UMAP_ENGINE | Manifold learning |
| Autoencoders | 6.867 | PRISM_AUTOENCODER | Representation learning |
| VAE | 6.867 | PRISM_VAE_ENGINE | Generative |

### Neural Networks
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| MLP | 6.867 | PRISM_NEURAL_NETWORK | General NN |
| CNN | 6.867 | PRISM_CNN_ENGINE | Image processing |
| RNN | 6.867 | PRISM_RNN_ENGINE | Sequences |
| LSTM | 6.867 | PRISM_LSTM_ENGINE | Long sequences |
| GRU | 6.867 | PRISM_GRU_ENGINE | Efficient RNN |
| Transformer | 6.867 | PRISM_TRANSFORMER_ENGINE | Attention |
| GNN | 6.867 | PRISM_GNN_COMPLETE | Graph data |
| ResNet | 6.867 | PRISM_RESNET_ENGINE | Deep networks |
| Dropout | 6.867 | PRISM_NEURAL_ENGINE_ENHANCED | Regularization |
| Batch Norm | 6.867 | PRISM_NEURAL_ENGINE_ENHANCED | Training stability |

### Bayesian Methods
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Bayesian Inference | 6.041, 6.867 | PRISM_BAYESIAN_SYSTEM | Uncertainty |
| Bayesian Optimization | 6.867, 15.097 | PRISM_BAYESIAN_OPTIMIZER | Hyperparameter tuning |
| MCMC | 6.867 | PRISM_MONTE_CARLO_ENGINE | Sampling |
| Metropolis-Hastings | 6.867 | PRISM_MONTE_CARLO_ENGINE | Posterior sampling |
| Gibbs Sampling | 6.867 | PRISM_MONTE_CARLO_ENGINE | Conditional sampling |
| Variational Inference | 6.867 | PRISM_VARIATIONAL_ENGINE | Approximate inference |
| Thompson Sampling | 15.097 | PRISM_THOMPSON_SAMPLING | Bandits |
| UCB | 15.097 | PRISM_UCB_LEARNER | Exploration |

### Reinforcement Learning
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| DQN | 6.867 | PRISM_DQN_ENGINE | Deep Q-learning |
| Double DQN | 6.867 | PRISM_ADVANCED_DQN | Overestimation fix |
| PPO | 6.867 | PRISM_PPO_ENGINE | Policy gradient |
| A2C/A3C | 6.867 | PRISM_A2C_ENGINE | Actor-critic |
| SAC | 6.867 | PRISM_SAC_ENGINE | Maximum entropy |
| DDPG | 6.867 | PRISM_DDPG_ENGINE | Continuous control |
| TD3 | 6.867 | PRISM_TD3_ENGINE | Twin delayed DDPG |

---

## SIGNAL PROCESSING ALGORITHMS

| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| FFT | 6.011, 6.341 | PRISM_FFT_PREDICTIVE_CHATTER | Frequency analysis |
| DFT | 6.011 | PRISM_SIGNAL_PROCESSING | Discrete transform |
| STFT | 6.341 | PRISM_STFT_ENGINE | Time-frequency |
| Wavelet Transform | 6.341 | PRISM_WAVELET_CHATTER | Multi-resolution |
| EMD | 6.341 | PRISM_EMD_ENGINE | Decomposition |
| EEMD | 6.341 | PRISM_EEMD_ENGINE | Ensemble EMD |
| VMD | 6.341 | PRISM_VMD_ENGINE | Variational decomp |
| Kalman Filter | 6.011, 2.004 | PRISM_KALMAN_FILTER | State estimation |
| Extended Kalman | 2.004 | PRISM_EKF_ENGINE | Nonlinear |
| Welch PSD | 6.011 | PRISM_WELCH_PSD | Power spectrum |
| Hilbert Transform | 6.011 | PRISM_HILBERT_TRANSFORM | Envelope |
| Autocorrelation | 6.011, 6.432 | PRISM_AUTOCORRELATION | Periodicity |
| Cross-correlation | 6.011 | PRISM_CROSS_CORRELATION | Signal alignment |

---

## NUMERICAL METHODS

| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Euler Method | 10.34, 18.311 | PRISM_ODE_SOLVER | Simple ODE |
| Runge-Kutta (RK4) | 10.34 | PRISM_RK4_ENGINE | Accurate ODE |
| Adams-Bashforth | 10.34 | PRISM_MULTISTEP_ENGINE | Multi-step |
| Backward Euler | 10.34 | PRISM_IMPLICIT_EULER | Stiff ODEs |
| Gauss-Seidel | 1.124J | PRISM_GAUSS_SEIDEL | Linear systems |
| Jacobi | 1.124J | PRISM_JACOBI_ENGINE | Iterative solve |
| LU Decomposition | 1.124J | PRISM_LU_ENGINE | Direct solve |
| QR Decomposition | 1.124J | PRISM_QR_ENGINE | Least squares |
| SVD | 6.867, 1.124J | PRISM_SVD_ENGINE | Matrix factorization |
| Conjugate Gradient | 10.34 | PRISM_CG_SOLVER | Sparse systems |
| GMRES | 10.34 | PRISM_GMRES_ENGINE | Non-symmetric |
| Newton-Raphson | 10.34 | PRISM_NEWTON_RAPHSON | Root finding |
| Bisection | 10.34 | PRISM_BISECTION_ENGINE | Bracketing |
| Secant Method | 10.34 | PRISM_SECANT_ENGINE | No derivative |
| FEM | RES.2-002, 2.086 | PRISM_FEM_ENGINE | PDE |
| FDM | 18.311 | PRISM_FDM_ENGINE | Finite difference |
| Gauss Quadrature | 10.34 | PRISM_QUADRATURE_ENGINE | Integration |
| Spline Interpolation | 2.158J | PRISM_SPLINE_ENGINE | Curve fitting |

---

## GEOMETRY/CAD ALGORITHMS

| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Convex Hull | 6.046J | PRISM_CONVEX_HULL_ENGINE | Bounding geometry |
| Delaunay Triangulation | 6.838 | PRISM_DELAUNAY_ENGINE | Meshing |
| Voronoi Diagram | 6.838 | PRISM_VORONOI_ENGINE | Proximity |
| B-Rep Operations | 2.158J | PRISM_BREP_TESSELLATOR | Solid modeling |
| CSG Operations | 6.837 | PRISM_CSG_ENGINE | Boolean ops |
| NURBS Evaluation | 2.158J | PRISM_NURBS_ADVANCED_ENGINE | Surfaces |
| Bézier Curves | 2.158J | PRISM_BEZIER_INTERSECTION_ENGINE | Curves |
| B-Spline | 2.158J | PRISM_BSPLINE_ENGINE | Smooth curves |
| Mesh Decimation | 6.837 | PRISM_MESH_DECIMATION_ENGINE | LOD |
| Mesh Repair | 6.838 | PRISM_MESH_REPAIR_ENGINE | Fix topology |
| Collision Detection | 6.837 | PRISM_COLLISION_ENGINE | Interference |
| Ray Tracing | 6.837 | PRISM_RAYCAST_ENGINE | Visibility |
| Marching Cubes | 6.837 | PRISM_ISOSURFACE_ENGINE | Volume rendering |

---

## PHYSICS/MECHANICS ALGORITHMS

### Cutting Mechanics
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Kienzle Force Model | 2.810 | PRISM_KIENZLE_FORCE | Cutting force |
| Merchant Force Model | 2.810 | PRISM_MERCHANT_FORCE | Shear plane |
| Taylor Tool Life | 2.810 | PRISM_TAYLOR_TOOL_LIFE | Tool wear |
| Kronenberg Model | 2.810 | PRISM_KRONENBERG_ENGINE | Extended Taylor |
| Johnson-Cook | 2.810 | PRISM_JOHNSON_COOK_ENGINE | Material flow |
| Oxley Model | 2.810 | PRISM_OXLEY_ENGINE | Thermal-mechanical |
| Chip Formation | 2.810 | PRISM_CHIP_FORMATION_ENGINE | Chip geometry |

### Dynamics & Vibration
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Modal Analysis | 2.032 | PRISM_MODAL_ANALYSIS_ENGINE | Natural frequencies |
| Stability Lobes | 2.032, 2.810 | PRISM_STABILITY_LOBES | Chatter |
| Newmark Beta | 2.032 | PRISM_NEWMARK_ENGINE | Time integration |
| Runge-Kutta (Dynamics) | 2.032 | PRISM_DYNAMICS_RK_ENGINE | ODE integration |
| Regenerative Chatter | 2.032, 2.810 | PRISM_CHATTER_PREDICTION_ENGINE | Stability |
| FRF Analysis | 2.032 | PRISM_FRF_ENGINE | Transfer function |

### Thermal
| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Heat Conduction | 2.51 | PRISM_HEAT_TRANSFER_ENGINE | Temperature |
| Convection | 2.51 | PRISM_CONVECTION_ENGINE | Cooling |
| Radiation | 2.51 | PRISM_RADIATION_ENGINE | High temp |
| Thermal Expansion | 2.51 | PRISM_THERMAL_EXPANSION_ENGINE | Distortion |

---

## SCHEDULING ALGORITHMS

| Algorithm | Source Course | PRISM Engine | Use Case |
|-----------|--------------|--------------|----------|
| Johnson's Rule | 2.854 | PRISM_JOHNSON_RULE_ENGINE | 2-machine flow shop |
| SPT/EDD | 2.854 | PRISM_DISPATCH_ENGINE | Dispatching |
| Critical Path | 16.410 | PRISM_CRITICAL_PATH_ENGINE | Project scheduling |
| Job Shop Scheduling | 15.083J, 2.854 | PRISM_JOB_SHOP_SCHEDULING_ENGINE | Complex scheduling |
| Resource Leveling | 2.854 | PRISM_RESOURCE_LEVELING | Capacity |
| MRP | 2.854 | PRISM_MRP_ENGINE | Material planning |

---

## QUICK LOOKUP BY PRISM ENGINE

```
PRISM_PSO_OPTIMIZER         → 15.097 (Prediction)
PRISM_BAYESIAN_OPTIMIZER    → 6.867 (ML), 15.097
PRISM_GENETIC_ALGORITHM     → 6.034 (AI), 15.097
PRISM_NEURAL_NETWORK        → 6.867 (ML)
PRISM_RANDOM_FOREST         → 6.867, 15.097
PRISM_COLLISION_ENGINE      → 6.837 (Graphics)
PRISM_KIENZLE_FORCE         → 2.810 (Manufacturing)
PRISM_STABILITY_LOBES       → 2.032 (Dynamics)
PRISM_FFT_PREDICTIVE_CHATTER → 6.011 (Signals)
PRISM_KALMAN_FILTER         → 6.011, 2.004
PRISM_FEM_ENGINE            → RES.2-002
PRISM_SIMPLEX_SOLVER        → 6.251J
PRISM_BRANCH_BOUND_ENGINE   → 15.083J
```

---

## ALGORITHM COUNT BY CATEGORY

| Category | Algorithms | Primary Courses |
|----------|------------|-----------------|
| Optimization | 45+ | 6.079, 6.251J, 6.252J, 15.083J |
| Machine Learning | 55+ | 6.867, 9.520, 15.097 |
| Signal Processing | 15+ | 6.011, 6.341 |
| Numerical Methods | 20+ | 10.34, 1.124J |
| Geometry/CAD | 15+ | 6.837, 6.838, 2.158J |
| Physics/Mechanics | 15+ | 2.810, 2.032, 2.51 |
| Scheduling | 8+ | 2.854, 15.083J |
| **TOTAL** | **175+** | |

---

**This registry maps EVERY algorithm in PRISM to its academic source.**
**Use it to validate implementations and find theoretical foundations.**
