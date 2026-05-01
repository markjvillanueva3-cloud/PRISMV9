# Algorithm → PRISM Engine Mapping

## Quick Reference: Academic Algorithms to PRISM Engines

---

## OPTIMIZATION ALGORITHMS

### Linear Programming
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Simplex | 6.251J, 15.060 | PRISM_CONSTRAINED_OPTIMIZER | Resource allocation |
| Interior Point | 6.251J, 6.079 | PRISM_INTERIOR_POINT_ENGINE | Large-scale LP |
| Dual Simplex | 6.251J | PRISM_CONSTRAINED_OPTIMIZER | Sensitivity analysis |

### Nonlinear Optimization
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Gradient Descent | 6.867, 6.079 | PRISM_GRADIENT_DESCENT | NN training, general |
| Newton's Method | 6.079, 10.34 | PRISM_TRUST_REGION_OPTIMIZER | Fast convergence |
| BFGS | 6.252J | PRISM_CONSTRAINED_OPTIMIZER | Quasi-Newton |
| Adam | 6.867 | PRISM_ADAM_OPTIMIZER | Neural networks |
| RMSprop | 6.867 | PRISM_RMSPROP | Adaptive learning |

### Metaheuristics
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Genetic Algorithm | 6.046J | PRISM_GENETIC_ALGORITHM | Global search |
| PSO | 15.097 | PRISM_PSO_OPTIMIZER | Continuous optimization |
| ACO | 6.046J | PRISM_ACO_SEQUENCER | Sequencing, routing |
| Simulated Annealing | 6.046J | PRISM_SIMULATED_ANNEALING | Combinatorial |
| CMA-ES | 6.867 | PRISM_CMA_ES | Black-box optimization |

### Multi-Objective
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| NSGA-II | 15.083J | PRISM_NSGA2 | Pareto optimization |
| NSGA-III | 15.083J | PRISM_NSGA3 | Many objectives |
| MOEA/D | 15.083J | PRISM_MOEAD | Decomposition |
| SPEA2 | 15.083J | PRISM_SPEA2 | Archive-based |

---

## MACHINE LEARNING ALGORITHMS

### Supervised Learning
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Linear Regression | 6.867, 18.650 | PRISM_LINEAR_REGRESSION | Baseline prediction |
| Ridge Regression | 6.867 | PRISM_RIDGE_REGRESSION | Regularized |
| Lasso | 6.867 | PRISM_LASSO_ENGINE | Feature selection |
| SVM | 6.867, 9.520 | PRISM_SVM_ENGINE | Classification |
| Decision Trees | 6.867 | PRISM_DECISION_TREE_ENGINE | Interpretable |
| Random Forest | 6.867 | PRISM_RANDOM_FOREST | Ensemble prediction |
| Gradient Boosting | 6.867 | PRISM_GRADIENT_BOOSTING | High accuracy |
| XGBoost | 6.867 | PRISM_XGBOOST_ENGINE | Competition-grade |
| Neural Network | 6.867, 9.520 | PRISM_NEURAL_NETWORK | Complex patterns |

### Unsupervised Learning
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| K-Means | 6.867 | PRISM_CLUSTERING_ENGINE | Clustering |
| PCA | 6.867, 18.06 | PRISM_PCA_ENGINE | Dimension reduction |
| Autoencoders | 6.867 | PRISM_AUTOENCODER | Representation learning |

### Bayesian Methods
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Bayesian Inference | 6.867, 6.041 | PRISM_BAYESIAN_SYSTEM | Uncertainty |
| Gaussian Processes | 6.867, 9.520 | PRISM_BAYESIAN_OPTIMIZER | Expensive functions |
| Monte Carlo | 6.867, 6.041 | PRISM_MONTE_CARLO_ENGINE | Sampling |

### Reinforcement Learning
| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Q-Learning | 6.867 | PRISM_DQN_ENGINE | Discrete actions |
| Policy Gradient | 6.867 | PRISM_POLICY_GRADIENT | Continuous actions |
| Actor-Critic | 6.867 | PRISM_ACTOR_CRITIC | Hybrid |
| PPO | 6.867 | PRISM_PPO_ENGINE | Stable training |
| SAC | 6.867 | PRISM_SAC_ENGINE | Sample efficient |

---

## SIGNAL PROCESSING ALGORITHMS

| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| FFT | 6.011 | PRISM_FFT_PREDICTIVE_CHATTER | Frequency analysis |
| STFT | 6.011, 6.341 | PRISM_STFT_ENGINE | Time-frequency |
| Wavelets | 6.341 | PRISM_WAVELET_CHATTER | Multi-scale analysis |
| Kalman Filter | 6.011 | PRISM_KALMAN_FILTER | State estimation |
| Extended Kalman | 6.011 | PRISM_EKF_ENGINE | Nonlinear systems |
| EMD | 6.341 | PRISM_EMD_ENGINE | Adaptive decomposition |
| Hilbert Transform | 6.341 | PRISM_HILBERT_TRANSFORM | Envelope extraction |

---

## GRAPH ALGORITHMS

| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Dijkstra | 6.046J | PRISM_TOOLPATH_OPTIMIZER | Shortest path |
| A* | 6.046J | PRISM_TOOLPATH_OPTIMIZER | Heuristic search |
| Minimum Spanning Tree | 6.046J | PRISM_TOOLPATH_LINKING | Network design |
| Topological Sort | 6.046J | PRISM_DEPENDENCY_RESOLVER | Ordering |
| Max Flow | 6.046J, 15.082J | PRISM_RESOURCE_ALLOCATOR | Capacity allocation |
| GNN | 6.867 | PRISM_GNN_COMPLETE | Graph learning |

---

## PHYSICS/MECHANICS ALGORITHMS

| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Runge-Kutta | 10.34 | PRISM_RIGID_BODY_DYNAMICS_ENGINE | ODE integration |
| FEM | 2.086 | PRISM_STRESS_ANALYSIS | Structural analysis |
| Modal Analysis | 2.032 | PRISM_VIBRATION_ANALYSIS_ENGINE | Natural frequencies |
| Stability Lobes | 2.032 | PRISM_STABILITY_LOBES | Chatter prediction |

### Material Models
| Model | Course | PRISM Engine | Use Case |
|-------|--------|--------------|----------|
| Johnson-Cook | 2.810 | PRISM_JOHNSON_COOK_ENGINE | High-speed cutting |
| Zerilli-Armstrong | Materials | PRISM_ZERILLI_ARMSTRONG_ENGINE | BCC metals |
| Cowper-Symonds | Materials | PRISM_COWPER_SYMONDS | Strain rate |

### Wear Models
| Model | Course | PRISM Engine | Use Case |
|-------|--------|--------------|----------|
| Taylor | 2.810 | PRISM_TAYLOR_TOOL_LIFE | Tool life |
| Archard | Materials | PRISM_FLANK_WEAR_MODEL | Abrasive wear |
| Usui | 2.810 | PRISM_CRATER_WEAR_MODEL | Crater wear |

---

## GEOMETRY/CAD ALGORITHMS

| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| B-Spline Evaluation | 6.837 | PRISM_BSPLINE_ENGINE | Curve evaluation |
| NURBS | 6.837 | PRISM_NURBS_ADVANCED_ENGINE | Surface modeling |
| CSG Boolean | 6.837 | PRISM_CSG_ENGINE | Solid operations |
| BVH | 6.837 | PRISM_COLLISION_ENGINE | Collision detection |
| GJK | 6.837 | PRISM_COLLISION_ENGINE | Penetration depth |
| Mesh Decimation | 6.838 | PRISM_MESH_DECIMATION_ENGINE | Simplification |

---

## SCHEDULING ALGORITHMS

| Algorithm | Course | PRISM Engine | Use Case |
|-----------|--------|--------------|----------|
| Critical Path | 2.854 | PRISM_SCHEDULING_ENGINE | Project scheduling |
| Job Shop | 2.854, 15.083J | PRISM_JOB_SHOP_SCHEDULING_ENGINE | Machine scheduling |
| Dispatching Rules | 2.854 | PRISM_PRODUCTION_SCHEDULER | Real-time scheduling |
| Branch & Bound | 15.083J | PRISM_COMBINATORIAL_OPTIMIZER | Optimal scheduling |

---

## Quick Lookup by PRISM Engine

| PRISM Engine | Primary Algorithms | Courses |
|--------------|-------------------|---------|
| PRISM_SPEED_FEED_CALCULATOR | Optimization, ML | 6.079, 6.867, 2.810 |
| PRISM_FORCE_CALCULATOR | Kienzle, FEM | 2.810, 2.086 |
| PRISM_CHATTER_PREDICTION_ENGINE | FFT, Stability Lobes | 6.011, 2.032 |
| PRISM_TOOL_LIFE_ENGINE | Taylor, Regression, RF | 2.810, 6.867 |
| PRISM_BAYESIAN_OPTIMIZER | GP, Acquisition | 6.867, 15.097 |
| PRISM_COLLISION_ENGINE | BVH, GJK, SAT | 6.837 |
| PRISM_SCHEDULING_ENGINE | MILP, Heuristics | 15.083J, 2.854 |
| PRISM_NEURAL_NETWORK | Backprop, Adam | 6.867 |
| PRISM_PSO_OPTIMIZER | Swarm Intelligence | 15.097 |
| PRISM_GENETIC_ALGORITHM | Evolution, Crossover | 6.046J |
