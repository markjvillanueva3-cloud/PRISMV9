#!/usr/bin/env python3
"""
PRISM ENGINE EXPANSION WAVE 2 - AI/ML ENGINES
==============================================
Optimization, Neural Networks, Reinforcement Learning, Probabilistic
"""

import json
from datetime import datetime
from dataclasses import dataclass, asdict, field
from typing import List

@dataclass
class EngineDef:
    id: str
    name: str
    category: str
    subcategory: str
    description: str
    type: str
    novelty: str
    ml_components: List[str] = field(default_factory=list)
    estimated_lines: int = 500
    complexity: str = "MEDIUM"
    status: str = "DEFINED"
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION ENGINES (40+)
# ═══════════════════════════════════════════════════════════════════════════════

OPTIMIZATION_ENGINES = [
    # Swarm Intelligence
    ("pso_basic", "Particle Swarm Optimization", "STANDARD", "Basic PSO implementation"),
    ("pso_adaptive", "Adaptive PSO", "ENHANCED", "Self-tuning parameters"),
    ("pso_multi_swarm", "Multi-Swarm PSO", "ENHANCED", "Cooperative swarms"),
    ("aco", "Ant Colony Optimization", "STANDARD", "Pheromone-based optimization"),
    ("abc", "Artificial Bee Colony", "STANDARD", "Foraging behavior"),
    ("firefly", "Firefly Algorithm", "STANDARD", "Light attraction"),
    ("grey_wolf", "Grey Wolf Optimizer", "STANDARD", "Pack hunting behavior"),
    ("whale", "Whale Optimization Algorithm", "STANDARD", "Bubble-net feeding"),
    ("bat", "Bat Algorithm", "STANDARD", "Echolocation"),
    
    # Evolutionary
    ("ga_basic", "Genetic Algorithm", "STANDARD", "Basic GA"),
    ("ga_adaptive", "Adaptive Genetic Algorithm", "ENHANCED", "Self-tuning operators"),
    ("nsga2", "NSGA-II Multi-Objective", "STANDARD", "Pareto front"),
    ("nsga3", "NSGA-III Reference Point", "ENHANCED", "Many-objective"),
    ("moead", "MOEA/D Decomposition", "ENHANCED", "Weight vector based"),
    ("de", "Differential Evolution", "STANDARD", "Mutation strategies"),
    ("cma_es", "CMA-ES", "STANDARD", "Covariance matrix adaptation"),
    
    # Gradient-Based
    ("gradient_descent", "Gradient Descent", "STANDARD", "Basic GD"),
    ("sgd", "Stochastic Gradient Descent", "STANDARD", "Mini-batch training"),
    ("adam", "Adam Optimizer", "STANDARD", "Adaptive moments"),
    ("adamw", "AdamW", "ENHANCED", "Weight decay fix"),
    ("lbfgs", "L-BFGS", "STANDARD", "Quasi-Newton"),
    ("newton", "Newton Method", "STANDARD", "Second-order"),
    
    # Constrained
    ("penalty_method", "Penalty Method", "STANDARD", "Constraint handling"),
    ("barrier_method", "Barrier Method", "STANDARD", "Interior point"),
    ("augmented_lagrangian", "Augmented Lagrangian", "STANDARD", "Dual optimization"),
    ("sqp", "Sequential Quadratic Programming", "STANDARD", "NLP solver"),
    
    # Novel
    ("hybrid_pso_ga", "Hybrid PSO-GA", "NOVEL", "Combined swarm-evolutionary"),
    ("physics_guided_opt", "Physics-Guided Optimization", "NOVEL", "Constrained by physics"),
    ("transfer_optimization", "Transfer Optimization", "NOVEL", "Cross-domain transfer"),
    ("meta_optimization", "Meta-Optimization Engine", "NOVEL", "Optimizer of optimizers"),
    ("robust_optimization", "Robust Optimization Engine", "NOVEL", "Uncertainty handling"),
    
    # Inventions
    ("quantum_inspired_opt", "Quantum-Inspired Optimizer", "INVENTION", "QAOA-inspired classical"),
    ("neural_guided_search", "Neural-Guided Search", "INVENTION", "NN guides optimization"),
    ("self_evolving_optimizer", "Self-Evolving Optimizer", "INVENTION", "Auto-adapting algorithm"),
    ("federated_optimization", "Federated Optimization", "INVENTION", "Distributed learning opt"),
    ("digital_twin_optimizer", "Digital Twin Optimizer", "INVENTION", "Simulation-based opt")
]

def generate_optimization_engines() -> List[EngineDef]:
    engines = []
    for eng_id, name, novelty, desc in OPTIMIZATION_ENGINES:
        engines.append(EngineDef(
            id=f"ENG-OPT-{eng_id.upper()}",
            name=name, category="AI_ML", subcategory="OPTIMIZATION",
            description=desc, type="AI_ML", novelty=novelty,
            ml_components=["optimization", "search"],
            estimated_lines=700 if novelty in ["NOVEL", "INVENTION"] else 400
        ))
    return engines

# ═══════════════════════════════════════════════════════════════════════════════
# NEURAL NETWORK ENGINES (40+)
# ═══════════════════════════════════════════════════════════════════════════════

NEURAL_ENGINES = [
    # Feedforward
    ("mlp", "Multi-Layer Perceptron", "STANDARD", "Basic feedforward NN"),
    ("deep_mlp", "Deep MLP", "ENHANCED", "Many hidden layers"),
    ("residual_mlp", "Residual MLP", "ENHANCED", "Skip connections"),
    
    # Convolutional
    ("cnn_1d", "1D Convolutional Network", "STANDARD", "Time series/signals"),
    ("cnn_2d", "2D Convolutional Network", "STANDARD", "Images/spatial"),
    ("resnet", "ResNet Architecture", "ENHANCED", "Deep residual"),
    ("unet", "U-Net Architecture", "ENHANCED", "Encoder-decoder"),
    
    # Recurrent
    ("rnn", "Recurrent Neural Network", "STANDARD", "Basic RNN"),
    ("lstm", "Long Short-Term Memory", "STANDARD", "Gated memory"),
    ("gru", "Gated Recurrent Unit", "STANDARD", "Simplified LSTM"),
    ("bidirectional", "Bidirectional RNN", "ENHANCED", "Forward-backward"),
    ("seq2seq", "Sequence-to-Sequence", "ENHANCED", "Encoder-decoder RNN"),
    
    # Attention/Transformer
    ("attention", "Attention Mechanism", "STANDARD", "Self-attention"),
    ("transformer", "Transformer Network", "STANDARD", "Full transformer"),
    ("bert_style", "BERT-Style Encoder", "ENHANCED", "Masked language model"),
    ("gpt_style", "GPT-Style Decoder", "ENHANCED", "Autoregressive"),
    
    # Graph
    ("gnn", "Graph Neural Network", "STANDARD", "Node/edge learning"),
    ("gcn", "Graph Convolutional Network", "STANDARD", "Spectral convolution"),
    ("gat", "Graph Attention Network", "ENHANCED", "Attention on graphs"),
    
    # Generative
    ("vae", "Variational Autoencoder", "STANDARD", "Latent space"),
    ("gan", "Generative Adversarial Network", "STANDARD", "Generator-discriminator"),
    ("diffusion", "Diffusion Model", "ENHANCED", "Denoising process"),
    
    # Physics-Informed
    ("pinn", "Physics-Informed Neural Network", "NOVEL", "PDE constraints"),
    ("neural_ode", "Neural ODE", "NOVEL", "Continuous-depth"),
    ("hamiltonian_nn", "Hamiltonian Neural Network", "NOVEL", "Energy conservation"),
    
    # Manufacturing-Specific Novel
    ("machining_transformer", "Machining Transformer", "NOVEL", "Process sequence modeling"),
    ("toolpath_cnn", "Toolpath CNN", "NOVEL", "Spatial toolpath learning"),
    ("sensor_fusion_nn", "Sensor Fusion Network", "NOVEL", "Multi-modal sensor"),
    
    # Inventions
    ("adaptive_architecture", "Adaptive Architecture Engine", "INVENTION", "Self-designing network"),
    ("continual_learner", "Continual Learning Network", "INVENTION", "No catastrophic forgetting"),
    ("few_shot_machining", "Few-Shot Machining Network", "INVENTION", "Learn from <10 examples"),
    ("explainable_nn", "Explainable Neural Network", "INVENTION", "Interpretable predictions"),
    ("quantum_nn", "Quantum Neural Network", "INVENTION", "Quantum circuit learning")
]

def generate_neural_engines() -> List[EngineDef]:
    engines = []
    for eng_id, name, novelty, desc in NEURAL_ENGINES:
        engines.append(EngineDef(
            id=f"ENG-NN-{eng_id.upper()}",
            name=name, category="AI_ML", subcategory="NEURAL",
            description=desc, type="AI_ML", novelty=novelty,
            ml_components=["neural_network", "deep_learning"],
            estimated_lines=800 if novelty in ["NOVEL", "INVENTION"] else 500
        ))
    return engines

# ═══════════════════════════════════════════════════════════════════════════════
# ENSEMBLE/TRADITIONAL ML ENGINES (25+)
# ═══════════════════════════════════════════════════════════════════════════════

ENSEMBLE_ENGINES = [
    # Tree-Based
    ("decision_tree", "Decision Tree", "STANDARD", "Basic tree"),
    ("random_forest", "Random Forest", "STANDARD", "Bagged trees"),
    ("xgboost", "XGBoost", "STANDARD", "Gradient boosting"),
    ("lightgbm", "LightGBM", "STANDARD", "Fast gradient boosting"),
    ("catboost", "CatBoost", "STANDARD", "Categorical features"),
    
    # Ensemble Methods
    ("bagging", "Bagging Ensemble", "STANDARD", "Bootstrap aggregating"),
    ("boosting", "Boosting Ensemble", "STANDARD", "Sequential learning"),
    ("stacking", "Stacking Ensemble", "ENHANCED", "Meta-learner"),
    ("voting", "Voting Ensemble", "STANDARD", "Majority/weighted vote"),
    
    # Traditional
    ("svm", "Support Vector Machine", "STANDARD", "Kernel methods"),
    ("knn", "K-Nearest Neighbors", "STANDARD", "Instance-based"),
    ("naive_bayes", "Naive Bayes", "STANDARD", "Probabilistic"),
    ("logistic_regression", "Logistic Regression", "STANDARD", "Linear classification"),
    ("linear_regression", "Linear Regression", "STANDARD", "Linear prediction"),
    
    # Novel Manufacturing
    ("machining_ensemble", "Machining-Specific Ensemble", "NOVEL", "Domain-optimized"),
    ("adaptive_ensemble", "Adaptive Ensemble Selector", "NOVEL", "Auto model selection"),
    ("hybrid_physics_ensemble", "Hybrid Physics-Ensemble", "NOVEL", "Physics + ML trees"),
    
    # Inventions
    ("self_calibrating_ensemble", "Self-Calibrating Ensemble", "INVENTION", "Auto-tuning weights"),
    ("uncertainty_ensemble", "Uncertainty-Aware Ensemble", "INVENTION", "Confidence estimation"),
    ("streaming_ensemble", "Streaming Ensemble", "INVENTION", "Online learning ensemble")
]

def generate_ensemble_engines() -> List[EngineDef]:
    engines = []
    for eng_id, name, novelty, desc in ENSEMBLE_ENGINES:
        engines.append(EngineDef(
            id=f"ENG-ENS-{eng_id.upper()}",
            name=name, category="AI_ML", subcategory="ENSEMBLE",
            description=desc, type="AI_ML", novelty=novelty,
            ml_components=["ensemble", "tree"],
            estimated_lines=500 if novelty in ["NOVEL", "INVENTION"] else 300
        ))
    return engines

# ═══════════════════════════════════════════════════════════════════════════════
# REINFORCEMENT LEARNING ENGINES (25+)
# ═══════════════════════════════════════════════════════════════════════════════

RL_ENGINES = [
    # Value-Based
    ("q_learning", "Q-Learning", "STANDARD", "Tabular Q"),
    ("dqn", "Deep Q-Network", "STANDARD", "Neural Q-function"),
    ("double_dqn", "Double DQN", "ENHANCED", "Overestimation fix"),
    ("dueling_dqn", "Dueling DQN", "ENHANCED", "Value-advantage split"),
    ("rainbow", "Rainbow DQN", "ENHANCED", "Combined improvements"),
    
    # Policy Gradient
    ("reinforce", "REINFORCE", "STANDARD", "Basic policy gradient"),
    ("a2c", "Advantage Actor-Critic", "STANDARD", "Synchronous A2C"),
    ("a3c", "Async Advantage Actor-Critic", "STANDARD", "Parallel training"),
    ("ppo", "Proximal Policy Optimization", "STANDARD", "Clipped surrogate"),
    ("trpo", "Trust Region Policy Opt", "STANDARD", "KL constraint"),
    
    # Continuous Control
    ("ddpg", "Deep Deterministic PG", "STANDARD", "Continuous actions"),
    ("td3", "Twin Delayed DDPG", "ENHANCED", "TD3 improvements"),
    ("sac", "Soft Actor-Critic", "ENHANCED", "Entropy regularization"),
    
    # Model-Based
    ("world_model", "World Model", "ENHANCED", "Learned dynamics"),
    ("mbpo", "Model-Based Policy Opt", "ENHANCED", "Dyna-style"),
    
    # Manufacturing-Specific Novel
    ("machining_rl", "Machining Control RL", "NOVEL", "Process parameter control"),
    ("adaptive_feed_rl", "Adaptive Feed Rate RL", "NOVEL", "Real-time feed adjustment"),
    ("tool_change_rl", "Tool Change Decision RL", "NOVEL", "Optimal replacement"),
    ("multi_machine_rl", "Multi-Machine Scheduling RL", "NOVEL", "Shop floor optimization"),
    
    # Inventions
    ("safe_rl", "Safe RL for Manufacturing", "INVENTION", "Constraint satisfaction"),
    ("transfer_rl", "Transfer RL Engine", "INVENTION", "Cross-machine transfer"),
    ("hierarchical_machining_rl", "Hierarchical Machining RL", "INVENTION", "Multi-level control"),
    ("human_in_loop_rl", "Human-in-the-Loop RL", "INVENTION", "Operator feedback learning")
]

def generate_rl_engines() -> List[EngineDef]:
    engines = []
    for eng_id, name, novelty, desc in RL_ENGINES:
        engines.append(EngineDef(
            id=f"ENG-RL-{eng_id.upper()}",
            name=name, category="AI_ML", subcategory="REINFORCEMENT",
            description=desc, type="AI_ML", novelty=novelty,
            ml_components=["reinforcement_learning", "policy"],
            estimated_lines=800 if novelty in ["NOVEL", "INVENTION"] else 500
        ))
    return engines

# ═══════════════════════════════════════════════════════════════════════════════
# PROBABILISTIC ENGINES (20+)
# ═══════════════════════════════════════════════════════════════════════════════

PROBABILISTIC_ENGINES = [
    # Bayesian
    ("bayesian_inference", "Bayesian Inference Engine", "STANDARD", "Posterior computation"),
    ("gaussian_process", "Gaussian Process", "STANDARD", "GP regression"),
    ("bayesian_nn", "Bayesian Neural Network", "ENHANCED", "Uncertainty in weights"),
    ("bayesian_optimization", "Bayesian Optimization", "STANDARD", "Acquisition functions"),
    
    # Sampling
    ("mcmc", "MCMC Sampling", "STANDARD", "Markov chain Monte Carlo"),
    ("hmc", "Hamiltonian Monte Carlo", "ENHANCED", "Gradient-based MCMC"),
    ("variational_inference", "Variational Inference", "ENHANCED", "Approximate posterior"),
    
    # State Estimation
    ("kalman_filter", "Kalman Filter", "STANDARD", "Linear state estimation"),
    ("ekf", "Extended Kalman Filter", "STANDARD", "Nonlinear estimation"),
    ("ukf", "Unscented Kalman Filter", "ENHANCED", "Sigma point"),
    ("particle_filter", "Particle Filter", "ENHANCED", "Sequential Monte Carlo"),
    
    # Novel
    ("machining_gp", "Machining-Specific GP", "NOVEL", "Process-optimized kernel"),
    ("uncertainty_quantifier", "Uncertainty Quantification Engine", "NOVEL", "Full UQ pipeline"),
    ("probabilistic_physics", "Probabilistic Physics Engine", "NOVEL", "Stochastic physics"),
    
    # Inventions
    ("online_bayesian", "Online Bayesian Engine", "INVENTION", "Real-time Bayesian update"),
    ("multi_fidelity_gp", "Multi-Fidelity GP", "INVENTION", "Cheap + expensive data"),
    ("causal_inference", "Causal Inference Engine", "INVENTION", "Cause-effect discovery")
]

def generate_probabilistic_engines() -> List[EngineDef]:
    engines = []
    for eng_id, name, novelty, desc in PROBABILISTIC_ENGINES:
        engines.append(EngineDef(
            id=f"ENG-PROB-{eng_id.upper()}",
            name=name, category="AI_ML", subcategory="PROBABILISTIC",
            description=desc, type="AI_ML", novelty=novelty,
            ml_components=["probabilistic", "bayesian"],
            estimated_lines=600 if novelty in ["NOVEL", "INVENTION"] else 400
        ))
    return engines

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("=" * 80)
    print("PRISM ENGINE EXPANSION WAVE 2 - AI/ML ENGINES")
    print("=" * 80)
    
    # Load Wave 1
    wave1_path = r"C:\PRISM\registries\ENGINE_REGISTRY_WAVE1.json"
    with open(wave1_path, 'r') as f:
        wave1_data = json.load(f)
    wave1_engines = wave1_data.get("engines", [])
    print(f"\nLoaded Wave 1: {len(wave1_engines)} engines")
    
    generators = [
        ("OPTIMIZATION", generate_optimization_engines),
        ("NEURAL", generate_neural_engines),
        ("ENSEMBLE", generate_ensemble_engines),
        ("REINFORCEMENT", generate_rl_engines),
        ("PROBABILISTIC", generate_probabilistic_engines)
    ]
    
    wave2_engines = []
    for name, func in generators:
        engines = func()
        wave2_engines.extend([e.to_dict() for e in engines])
        print(f"  {name}: {len(engines)}")
    
    print(f"\nWave 2 AI/ML Engines: {len(wave2_engines)}")
    
    # Combine
    all_engines = wave1_engines + wave2_engines
    print(f"Total Engines: {len(all_engines)}")
    
    # Count by novelty
    novelty = {}
    for e in all_engines:
        n = e.get("novelty", "?")
        novelty[n] = novelty.get(n, 0) + 1
    print("\nBy Novelty:")
    for n, c in sorted(novelty.items()):
        print(f"  {n}: {c}")
    
    # Save combined
    output_path = r"C:\PRISM\registries\ENGINE_REGISTRY_WAVE2.json"
    registry = {
        "version": "2.0.0",
        "wave": 2,
        "focus": "PHYSICS + AI_ML",
        "generatedAt": datetime.now().isoformat(),
        "totalEngines": len(all_engines),
        "byNovelty": novelty,
        "engines": all_engines
    }
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, indent=2)
    print(f"\nSaved: {output_path}")

if __name__ == "__main__":
    main()
