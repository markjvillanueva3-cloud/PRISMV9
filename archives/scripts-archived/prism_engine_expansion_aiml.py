#!/usr/bin/env python3
"""
PRISM ENGINE EXPANSION - AI/ML ENGINES
======================================
Optimization, Neural Networks, Reinforcement Learning, Probabilistic, 
Process Intelligence, Generative AI
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
    novelty: str
    ml_basis: List[str] = field(default_factory=list)
    estimated_lines: int = 500
    complexity: str = "MEDIUM"
    status: str = "DEFINED"
    def to_dict(self): return asdict(self)

# ═══════════════════════════════════════════════════════════════════════════════
# OPTIMIZATION ENGINES (45)
# ═══════════════════════════════════════════════════════════════════════════════

OPTIMIZATION = [
    # Swarm Intelligence
    ("pso_basic", "Particle Swarm Optimization", "STANDARD", "Basic PSO"),
    ("pso_adaptive", "Adaptive PSO", "ENHANCED", "Self-tuning parameters"),
    ("pso_multi_swarm", "Multi-Swarm PSO", "ENHANCED", "Cooperative swarms"),
    ("pso_constrained", "Constrained PSO", "ENHANCED", "Constraint handling"),
    ("aco", "Ant Colony Optimization", "STANDARD", "Pheromone-based"),
    ("abc", "Artificial Bee Colony", "STANDARD", "Foraging behavior"),
    ("firefly", "Firefly Algorithm", "STANDARD", "Light attraction"),
    ("grey_wolf", "Grey Wolf Optimizer", "STANDARD", "Pack hunting"),
    ("whale", "Whale Optimization", "STANDARD", "Bubble-net feeding"),
    ("bat", "Bat Algorithm", "STANDARD", "Echolocation"),
    ("cuckoo", "Cuckoo Search", "STANDARD", "Brood parasitism"),
    
    # Evolutionary
    ("ga_basic", "Genetic Algorithm", "STANDARD", "Basic GA"),
    ("ga_adaptive", "Adaptive GA", "ENHANCED", "Self-tuning operators"),
    ("nsga2", "NSGA-II Multi-Objective", "STANDARD", "Pareto front"),
    ("nsga3", "NSGA-III Reference Point", "ENHANCED", "Many-objective"),
    ("moead", "MOEA/D Decomposition", "ENHANCED", "Weight vector"),
    ("de", "Differential Evolution", "STANDARD", "Mutation strategies"),
    ("cma_es", "CMA-ES", "STANDARD", "Covariance adaptation"),
    ("eda", "Estimation of Distribution", "ENHANCED", "Probabilistic model"),
    
    # Gradient-Based
    ("gradient_descent", "Gradient Descent", "STANDARD", "Basic GD"),
    ("sgd", "Stochastic Gradient Descent", "STANDARD", "Mini-batch"),
    ("adam", "Adam Optimizer", "STANDARD", "Adaptive moments"),
    ("adamw", "AdamW", "ENHANCED", "Weight decay fix"),
    ("lbfgs", "L-BFGS", "STANDARD", "Quasi-Newton"),
    ("newton", "Newton Method", "STANDARD", "Second-order"),
    ("trust_region", "Trust Region Method", "ENHANCED", "Constrained step"),
    
    # Constrained
    ("penalty_method", "Penalty Method", "STANDARD", "Constraint handling"),
    ("barrier_method", "Interior Point Barrier", "STANDARD", "Barrier function"),
    ("augmented_lagrangian", "Augmented Lagrangian", "STANDARD", "Dual optimization"),
    ("sqp", "Sequential Quadratic Programming", "STANDARD", "NLP solver"),
    
    # NOVEL Manufacturing-Specific
    ("machining_pso", "Machining-Specific PSO", "NOVEL", "Process-optimized"),
    ("hybrid_pso_ga", "Hybrid PSO-GA Engine", "NOVEL", "Combined swarm-evolutionary"),
    ("physics_constrained_opt", "Physics-Constrained Optimizer", "NOVEL", "Physical limits"),
    ("robust_machining_opt", "Robust Machining Optimizer", "NOVEL", "Uncertainty handling"),
    ("multi_fidelity_opt", "Multi-Fidelity Optimizer", "NOVEL", "Cheap + expensive evals"),
    
    # INVENTIONS
    ("quantum_inspired_opt", "Quantum-Inspired Optimizer", "INVENTION", "QAOA-classical hybrid"),
    ("neural_guided_search", "Neural-Guided Search", "INVENTION", "NN guides optimization"),
    ("self_evolving_optimizer", "Self-Evolving Optimizer", "INVENTION", "Auto-adapting algorithm"),
    ("federated_optimization", "Federated Optimization", "INVENTION", "Distributed cross-machine"),
    ("transfer_optimization", "Transfer Optimization Engine", "INVENTION", "Cross-domain transfer"),
    ("meta_optimizer", "Meta-Optimization Engine", "INVENTION", "Optimizer of optimizers"),
    ("digital_twin_optimizer", "Digital Twin Optimizer", "INVENTION", "Simulation-coupled"),
    ("explainable_optimization", "Explainable Optimization", "INVENTION", "Interpretable decisions"),
    ("sustainable_optimizer", "Sustainable Process Optimizer", "INVENTION", "Energy + carbon + cost"),
    ("causal_optimization", "Causal Optimization Engine", "INVENTION", "Cause-effect optimization")
]

# ═══════════════════════════════════════════════════════════════════════════════
# NEURAL NETWORK ENGINES (50)
# ═══════════════════════════════════════════════════════════════════════════════

NEURAL = [
    # Feedforward
    ("mlp", "Multi-Layer Perceptron", "STANDARD", "Basic feedforward"),
    ("deep_mlp", "Deep MLP", "ENHANCED", "Many hidden layers"),
    ("residual_mlp", "Residual MLP", "ENHANCED", "Skip connections"),
    ("highway_network", "Highway Network", "ENHANCED", "Gated layers"),
    
    # Convolutional
    ("cnn_1d", "1D CNN", "STANDARD", "Time series/signals"),
    ("cnn_2d", "2D CNN", "STANDARD", "Images/spatial"),
    ("cnn_3d", "3D CNN", "ENHANCED", "Volumetric data"),
    ("resnet", "ResNet", "ENHANCED", "Deep residual"),
    ("densenet", "DenseNet", "ENHANCED", "Dense connections"),
    ("unet", "U-Net", "ENHANCED", "Encoder-decoder"),
    ("inception", "Inception Network", "ENHANCED", "Multi-scale"),
    
    # Recurrent
    ("rnn", "Recurrent Neural Network", "STANDARD", "Basic RNN"),
    ("lstm", "Long Short-Term Memory", "STANDARD", "Gated memory"),
    ("gru", "Gated Recurrent Unit", "STANDARD", "Simplified LSTM"),
    ("bidirectional_lstm", "Bidirectional LSTM", "ENHANCED", "Forward-backward"),
    ("seq2seq", "Sequence-to-Sequence", "ENHANCED", "Encoder-decoder RNN"),
    ("tcn", "Temporal Convolutional Network", "ENHANCED", "Causal convolutions"),
    
    # Attention/Transformer
    ("self_attention", "Self-Attention Mechanism", "STANDARD", "Attention layer"),
    ("multi_head_attention", "Multi-Head Attention", "STANDARD", "Parallel attention"),
    ("transformer_encoder", "Transformer Encoder", "STANDARD", "BERT-style"),
    ("transformer_decoder", "Transformer Decoder", "STANDARD", "GPT-style"),
    ("full_transformer", "Full Transformer", "STANDARD", "Encoder-decoder"),
    ("vision_transformer", "Vision Transformer", "ENHANCED", "ViT for images"),
    
    # Graph
    ("gnn", "Graph Neural Network", "STANDARD", "Node/edge learning"),
    ("gcn", "Graph Convolutional Network", "STANDARD", "Spectral convolution"),
    ("gat", "Graph Attention Network", "ENHANCED", "Attention on graphs"),
    ("message_passing", "Message Passing NN", "ENHANCED", "MPNN framework"),
    
    # Generative
    ("vae", "Variational Autoencoder", "STANDARD", "Latent space"),
    ("cvae", "Conditional VAE", "ENHANCED", "Conditioned generation"),
    ("gan", "Generative Adversarial Network", "STANDARD", "Generator-discriminator"),
    ("cgan", "Conditional GAN", "ENHANCED", "Conditioned GAN"),
    ("diffusion", "Diffusion Model", "ENHANCED", "Denoising diffusion"),
    
    # Physics-Informed
    ("pinn", "Physics-Informed Neural Network", "NOVEL", "PDE constraints"),
    ("neural_ode", "Neural ODE", "NOVEL", "Continuous-depth"),
    ("hamiltonian_nn", "Hamiltonian Neural Network", "NOVEL", "Energy conservation"),
    ("lagrangian_nn", "Lagrangian Neural Network", "NOVEL", "Variational physics"),
    
    # Manufacturing-Specific NOVEL
    ("machining_transformer", "Machining Transformer", "NOVEL", "Process sequence modeling"),
    ("toolpath_cnn", "Toolpath CNN", "NOVEL", "Spatial toolpath learning"),
    ("sensor_fusion_nn", "Sensor Fusion Network", "NOVEL", "Multi-modal sensor"),
    ("process_state_lstm", "Process State LSTM", "NOVEL", "Machining state tracking"),
    ("defect_detection_cnn", "Defect Detection CNN", "NOVEL", "Visual inspection"),
    
    # INVENTIONS
    ("adaptive_architecture", "Adaptive Architecture Engine", "INVENTION", "Self-designing network"),
    ("continual_machining_nn", "Continual Learning Machining NN", "INVENTION", "No forgetting"),
    ("few_shot_machining_nn", "Few-Shot Machining Network", "INVENTION", "Learn from <10 examples"),
    ("explainable_machining_nn", "Explainable Machining NN", "INVENTION", "Interpretable predictions"),
    ("quantum_neural_network", "Quantum Neural Network", "INVENTION", "Quantum circuit learning"),
    ("federated_machining_nn", "Federated Machining NN", "INVENTION", "Cross-machine learning"),
    ("neuro_symbolic_machining", "Neuro-Symbolic Machining", "INVENTION", "NN + knowledge graph"),
    ("self_supervised_machining", "Self-Supervised Machining", "INVENTION", "Unlabeled data learning"),
    ("meta_learning_machining", "Meta-Learning Machining", "INVENTION", "Learn to learn machining")
]

# ═══════════════════════════════════════════════════════════════════════════════
# REINFORCEMENT LEARNING ENGINES (30)
# ═══════════════════════════════════════════════════════════════════════════════

REINFORCEMENT = [
    # Value-Based
    ("q_learning", "Q-Learning", "STANDARD", "Tabular Q"),
    ("dqn", "Deep Q-Network", "STANDARD", "Neural Q-function"),
    ("double_dqn", "Double DQN", "ENHANCED", "Overestimation fix"),
    ("dueling_dqn", "Dueling DQN", "ENHANCED", "Value-advantage"),
    ("rainbow", "Rainbow DQN", "ENHANCED", "All improvements"),
    
    # Policy Gradient
    ("reinforce", "REINFORCE", "STANDARD", "Basic policy gradient"),
    ("a2c", "Advantage Actor-Critic", "STANDARD", "Synchronous A2C"),
    ("a3c", "Async A3C", "STANDARD", "Parallel training"),
    ("ppo", "Proximal Policy Optimization", "STANDARD", "Clipped surrogate"),
    ("trpo", "Trust Region Policy Opt", "STANDARD", "KL constraint"),
    
    # Continuous Control
    ("ddpg", "Deep Deterministic PG", "STANDARD", "Continuous actions"),
    ("td3", "Twin Delayed DDPG", "ENHANCED", "TD3 improvements"),
    ("sac", "Soft Actor-Critic", "ENHANCED", "Entropy regularization"),
    
    # Model-Based
    ("world_model", "World Model", "ENHANCED", "Learned dynamics"),
    ("mbpo", "Model-Based Policy Opt", "ENHANCED", "Dyna-style"),
    ("dreamer", "Dreamer", "ENHANCED", "Latent imagination"),
    
    # Manufacturing-Specific NOVEL
    ("machining_rl_control", "Machining Process Control RL", "NOVEL", "Parameter control"),
    ("adaptive_feed_rl", "Adaptive Feed Rate RL", "NOVEL", "Real-time feed"),
    ("tool_change_decision_rl", "Tool Change Decision RL", "NOVEL", "Optimal replacement"),
    ("spindle_speed_rl", "Spindle Speed Control RL", "NOVEL", "Speed optimization"),
    ("multi_machine_scheduling_rl", "Multi-Machine Scheduling RL", "NOVEL", "Shop floor"),
    
    # INVENTIONS
    ("safe_machining_rl", "Safe Machining RL", "INVENTION", "Constraint satisfaction"),
    ("transfer_machining_rl", "Transfer Machining RL", "INVENTION", "Cross-machine transfer"),
    ("hierarchical_machining_rl", "Hierarchical Machining RL", "INVENTION", "Multi-level control"),
    ("human_in_loop_machining_rl", "Human-in-the-Loop Machining RL", "INVENTION", "Operator feedback"),
    ("multi_agent_machining_rl", "Multi-Agent Machining RL", "INVENTION", "Cooperative machines"),
    ("offline_machining_rl", "Offline Machining RL", "INVENTION", "Learn from logs"),
    ("sim2real_machining_rl", "Sim2Real Machining RL", "INVENTION", "Simulation to reality"),
    ("causal_machining_rl", "Causal Machining RL", "INVENTION", "Causal policy learning"),
    ("sustainable_machining_rl", "Sustainable Machining RL", "INVENTION", "Energy-efficient control")
]

# ═══════════════════════════════════════════════════════════════════════════════
# PROBABILISTIC/STATISTICAL ENGINES (25)
# ═══════════════════════════════════════════════════════════════════════════════

PROBABILISTIC = [
    # Bayesian
    ("bayesian_inference", "Bayesian Inference Engine", "STANDARD", "Posterior computation"),
    ("gaussian_process", "Gaussian Process", "STANDARD", "GP regression"),
    ("bayesian_nn", "Bayesian Neural Network", "ENHANCED", "Weight uncertainty"),
    ("bayesian_optimization", "Bayesian Optimization", "STANDARD", "Acquisition functions"),
    ("variational_inference", "Variational Inference", "ENHANCED", "Approximate posterior"),
    
    # Sampling
    ("mcmc", "MCMC Sampling", "STANDARD", "Markov chain Monte Carlo"),
    ("hmc", "Hamiltonian Monte Carlo", "ENHANCED", "Gradient-based MCMC"),
    ("nuts", "No-U-Turn Sampler", "ENHANCED", "Auto-tuning HMC"),
    
    # State Estimation
    ("kalman_filter", "Kalman Filter", "STANDARD", "Linear state estimation"),
    ("ekf", "Extended Kalman Filter", "STANDARD", "Nonlinear EKF"),
    ("ukf", "Unscented Kalman Filter", "ENHANCED", "Sigma point"),
    ("particle_filter", "Particle Filter", "ENHANCED", "Sequential Monte Carlo"),
    
    # Statistical
    ("spc", "Statistical Process Control", "STANDARD", "Control charts"),
    ("capability_analysis", "Process Capability Analysis", "STANDARD", "Cp, Cpk"),
    ("hypothesis_testing", "Hypothesis Testing Engine", "STANDARD", "Statistical tests"),
    ("regression_analysis", "Regression Analysis Engine", "STANDARD", "Statistical regression"),
    
    # Manufacturing NOVEL
    ("machining_gp", "Machining-Optimized GP", "NOVEL", "Process kernel"),
    ("uncertainty_quantifier", "Uncertainty Quantification", "NOVEL", "Full UQ pipeline"),
    ("probabilistic_physics", "Probabilistic Physics Engine", "NOVEL", "Stochastic physics"),
    
    # INVENTIONS
    ("online_bayesian_machining", "Online Bayesian Machining", "INVENTION", "Real-time update"),
    ("multi_fidelity_gp", "Multi-Fidelity GP", "INVENTION", "Cheap + expensive"),
    ("causal_inference_machining", "Causal Inference Machining", "INVENTION", "Cause-effect"),
    ("federated_bayesian", "Federated Bayesian Learning", "INVENTION", "Cross-machine Bayesian"),
    ("conformal_prediction", "Conformal Prediction Engine", "INVENTION", "Guaranteed intervals"),
    ("probabilistic_digital_twin", "Probabilistic Digital Twin", "INVENTION", "Stochastic twin")
]

# ═══════════════════════════════════════════════════════════════════════════════
# ENSEMBLE/TRADITIONAL ML ENGINES (30)
# ═══════════════════════════════════════════════════════════════════════════════

ENSEMBLE = [
    # Tree-Based
    ("decision_tree", "Decision Tree", "STANDARD", "Basic tree"),
    ("random_forest", "Random Forest", "STANDARD", "Bagged trees"),
    ("extra_trees", "Extra Trees", "STANDARD", "Extremely randomized"),
    ("xgboost", "XGBoost", "STANDARD", "Gradient boosting"),
    ("lightgbm", "LightGBM", "STANDARD", "Fast gradient boosting"),
    ("catboost", "CatBoost", "STANDARD", "Categorical features"),
    ("histogram_gb", "Histogram Gradient Boosting", "ENHANCED", "Fast histogram"),
    
    # Ensemble Methods
    ("bagging", "Bagging Ensemble", "STANDARD", "Bootstrap aggregating"),
    ("boosting", "Boosting Ensemble", "STANDARD", "Sequential learning"),
    ("stacking", "Stacking Ensemble", "ENHANCED", "Meta-learner"),
    ("voting", "Voting Ensemble", "STANDARD", "Majority/weighted"),
    ("blending", "Blending Ensemble", "ENHANCED", "Holdout blending"),
    
    # Traditional ML
    ("svm", "Support Vector Machine", "STANDARD", "Kernel methods"),
    ("svr", "Support Vector Regression", "STANDARD", "SVM for regression"),
    ("knn", "K-Nearest Neighbors", "STANDARD", "Instance-based"),
    ("naive_bayes", "Naive Bayes", "STANDARD", "Probabilistic"),
    ("logistic_regression", "Logistic Regression", "STANDARD", "Linear classification"),
    ("linear_regression", "Linear Regression", "STANDARD", "Linear prediction"),
    ("ridge", "Ridge Regression", "STANDARD", "L2 regularization"),
    ("lasso", "Lasso Regression", "STANDARD", "L1 regularization"),
    ("elastic_net", "Elastic Net", "ENHANCED", "L1 + L2"),
    
    # Manufacturing NOVEL
    ("machining_ensemble", "Machining-Specific Ensemble", "NOVEL", "Domain-optimized"),
    ("adaptive_ensemble_selector", "Adaptive Ensemble Selector", "NOVEL", "Auto selection"),
    ("hybrid_physics_ensemble", "Hybrid Physics-Ensemble", "NOVEL", "Physics + ML trees"),
    
    # INVENTIONS
    ("self_calibrating_ensemble", "Self-Calibrating Ensemble", "INVENTION", "Auto-tuning weights"),
    ("uncertainty_ensemble", "Uncertainty-Aware Ensemble", "INVENTION", "Confidence estimation"),
    ("streaming_ensemble", "Streaming Ensemble", "INVENTION", "Online learning"),
    ("federated_ensemble", "Federated Ensemble", "INVENTION", "Cross-machine"),
    ("explainable_ensemble", "Explainable Ensemble", "INVENTION", "Interpretable"),
    ("causal_ensemble", "Causal Ensemble", "INVENTION", "Cause-effect trees")
]

# ═══════════════════════════════════════════════════════════════════════════════
# PROCESS INTELLIGENCE ENGINES (35) - NOVEL CATEGORY
# ═══════════════════════════════════════════════════════════════════════════════

PROCESS_INTELLIGENCE = [
    # Monitoring
    ("acoustic_emission_analyzer", "Acoustic Emission Analyzer", "NOVEL", "AE signal analysis"),
    ("vibration_signature_classifier", "Vibration Signature Classifier", "NOVEL", "FFT + ML"),
    ("power_signal_analyzer", "Power Signal Analyzer", "NOVEL", "Spindle/axis power"),
    ("current_signature_analyzer", "Current Signature Analyzer", "NOVEL", "Motor current"),
    ("force_signal_analyzer", "Force Signal Analyzer", "NOVEL", "Dynamometer signals"),
    
    # Vision
    ("tool_wear_image_cnn", "Tool Wear Image Recognition", "NOVEL", "Wear land CNN"),
    ("chip_morphology_classifier", "Chip Morphology Classifier", "NOVEL", "Chip type images"),
    ("surface_defect_detector", "Surface Defect Detector", "NOVEL", "Visual inspection"),
    ("dimensional_measurement_vision", "Dimensional Measurement Vision", "NOVEL", "Non-contact"),
    
    # Anomaly Detection
    ("real_time_anomaly_engine", "Real-Time Anomaly Engine", "NOVEL", "Process anomalies"),
    ("multivariate_anomaly", "Multivariate Anomaly Detection", "NOVEL", "Multi-signal"),
    ("autoencoder_anomaly", "Autoencoder Anomaly Detection", "NOVEL", "Reconstruction error"),
    
    # INVENTIONS
    ("sensor_fusion_intelligence", "Sensor Fusion Intelligence", "INVENTION", "Multi-modal fusion"),
    ("predictive_failure_engine", "Predictive Failure Engine", "INVENTION", "Before-failure detection"),
    ("root_cause_analyzer", "Automated Root Cause Analyzer", "INVENTION", "Cause identification"),
    ("process_fingerprint_engine", "Process Fingerprint Engine", "INVENTION", "Signature matching"),
    ("digital_twin_intelligence", "Digital Twin Process Intelligence", "INVENTION", "Twin-based monitoring"),
    ("edge_intelligence_engine", "Edge Intelligence Engine", "INVENTION", "On-machine AI"),
    ("federated_process_intelligence", "Federated Process Intelligence", "INVENTION", "Cross-machine learning"),
    ("human_ai_collaboration", "Human-AI Collaboration Engine", "INVENTION", "Operator + AI"),
    ("explainable_process_ai", "Explainable Process AI", "INVENTION", "Interpretable monitoring"),
    ("self_healing_process", "Self-Healing Process Engine", "INVENTION", "Auto-correction"),
    ("causal_process_inference", "Causal Process Inference", "INVENTION", "Cause-effect process"),
    ("sustainable_process_monitor", "Sustainable Process Monitor", "INVENTION", "Energy/carbon tracking"),
    ("quality_prediction_engine", "Quality Prediction Engine", "INVENTION", "Before-cut quality"),
    ("adaptive_control_engine", "Adaptive Control Engine", "INVENTION", "Real-time adjustment"),
    ("virtual_sensor_engine", "Virtual Sensor Engine", "INVENTION", "Soft sensors"),
    ("process_capability_predictor", "Process Capability Predictor", "INVENTION", "Cp/Cpk prediction"),
    ("multi_machine_correlation", "Multi-Machine Correlation", "INVENTION", "Fleet-level patterns"),
    ("process_optimization_ai", "Process Optimization AI", "INVENTION", "Continuous improvement"),
    ("knowledge_graph_process", "Knowledge Graph Process Engine", "INVENTION", "Semantic process knowledge"),
    ("generative_process_ai", "Generative Process AI", "INVENTION", "Generate process solutions"),
    ("transfer_learning_process", "Transfer Learning Process", "INVENTION", "Cross-process transfer"),
    ("meta_learning_process", "Meta-Learning Process", "INVENTION", "Learn to learn processes"),
    ("quantum_process_optimizer", "Quantum Process Optimizer", "INVENTION", "Quantum speedup")
]

def generate_aiml_engines():
    """Generate all AI/ML engines"""
    all_engines = []
    
    categories = [
        ("OPTIMIZATION", OPTIMIZATION),
        ("NEURAL", NEURAL),
        ("REINFORCEMENT", REINFORCEMENT),
        ("PROBABILISTIC", PROBABILISTIC),
        ("ENSEMBLE", ENSEMBLE),
        ("PROCESS_INTELLIGENCE", PROCESS_INTELLIGENCE)
    ]
    
    for cat_name, engines in categories:
        for eng_id, name, novelty, desc in engines:
            all_engines.append(EngineDef(
                id=f"ENG-ML-{cat_name[:4]}-{eng_id.upper()}",
                name=name,
                category="AI_ML",
                subcategory=cat_name,
                description=desc,
                novelty=novelty,
                ml_basis=[cat_name.lower()],
                estimated_lines=800 if novelty in ["NOVEL", "INVENTION"] else 500,
                complexity="HIGH" if novelty == "INVENTION" else "MEDIUM"
            ))
    
    return all_engines

def main():
    print("=" * 80)
    print("PRISM ENGINE EXPANSION - AI/ML ENGINES")
    print("=" * 80)
    
    # Load physics engines
    physics_path = r"C:\PRISM\registries\ENGINE_EXPANSION_PHYSICS.json"
    with open(physics_path, 'r') as f:
        physics_data = json.load(f)
    physics_engines = physics_data.get("engines", [])
    print(f"\nLoaded Physics Engines: {len(physics_engines)}")
    
    # Generate AI/ML engines
    aiml_engines = generate_aiml_engines()
    
    # Count by subcategory
    by_sub = {}
    for e in aiml_engines:
        s = e.subcategory
        by_sub[s] = by_sub.get(s, 0) + 1
    
    print(f"\nAI/ML Engines: {len(aiml_engines)}")
    print("\nBy Subcategory:")
    for s, n in sorted(by_sub.items(), key=lambda x: -x[1]):
        print(f"  {s}: {n}")
    
    # Combine
    all_engines = physics_engines + [e.to_dict() for e in aiml_engines]
    print(f"\nTotal Engines (Physics + AI/ML): {len(all_engines)}")
    
    # Count by novelty
    by_nov = {}
    for e in all_engines:
        n = e.get("novelty", "?")
        by_nov[n] = by_nov.get(n, 0) + 1
    
    print("\nBy Novelty:")
    for n, c in sorted(by_nov.items()):
        print(f"  {n}: {c}")
    
    # Save
    output = {
        "version": "2.0.0",
        "wave": "PHYSICS + AI_ML",
        "generatedAt": datetime.now().isoformat(),
        "totalEngines": len(all_engines),
        "byNovelty": by_nov,
        "engines": all_engines
    }
    
    path = r"C:\PRISM\registries\ENGINE_EXPANSION_WAVE2.json"
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    print(f"\nSaved: {path}")

if __name__ == "__main__":
    main()
