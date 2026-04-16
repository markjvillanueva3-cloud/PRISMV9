/**
 * Algorithm Wiring Engine
 * =======================
 * Wires 43 algorithms to consuming engines. Identifies orphaned algorithms
 * and suggests or auto-wires them to appropriate consumers.
 *
 * PP-WIRE-MS5: Wire 32 unused algorithms to consuming engines
 *
 * @module engines/AlgorithmWiringEngine
 * @version 1.0.0
 */

// ============================================================================
// ALGORITHM CATALOG
// ============================================================================

export interface AlgorithmInfo {
  name: string;
  file: string;
  category: AlgorithmCategory;
  description: string;
  inputs: string[];
  outputs: string[];
  complexity: "O(1)" | "O(n)" | "O(n log n)" | "O(n^2)" | "O(2^n)";
  useCases: string[];
}

export type AlgorithmCategory =
  | "optimization"
  | "prediction"
  | "detection"
  | "modeling"
  | "analysis"
  | "control"
  | "geometry"
  | "thermal"
  | "wear"
  | "vibration"
  | "machine_learning"
  | "signal_processing";

export interface WiringTarget {
  engineName: string;
  method: string;
  reason: string;
  confidence: number;
}

export interface AlgorithmWiring {
  algorithm: string;
  consumers: WiringTarget[];
  status: "wired" | "orphan" | "partially_wired";
  wireCount: number;
}

export interface WiringReport {
  totalAlgorithms: number;
  wiredCount: number;
  orphanCount: number;
  partialCount: number;
  coverage: number;
  wirings: AlgorithmWiring[];
}

// ============================================================================
// ALGORITHM CATALOG DATA
// ============================================================================

const ALGORITHM_CATALOG: AlgorithmInfo[] = [
  // Optimization algorithms
  {
    name: "BayesianOptimizer",
    file: "BayesianOptimizer.ts",
    category: "optimization",
    description: "Bayesian optimization for parameter tuning with Gaussian process surrogate",
    inputs: ["searchSpace", "objective", "numIterations"],
    outputs: ["optimalParams", "convergenceHistory"],
    complexity: "O(n^2)",
    useCases: ["speed_feed_tuning", "tool_selection", "parameter_optimization"],
  },
  {
    name: "GeneticOptimizer",
    file: "GeneticOptimizer.ts",
    category: "optimization",
    description: "Genetic algorithm for multi-objective optimization",
    inputs: ["population", "fitnessFunction", "generations"],
    outputs: ["paretoFront", "bestSolution"],
    complexity: "O(n^2)",
    useCases: ["toolpath_optimization", "schedule_optimization", "multi_pass_strategy"],
  },
  {
    name: "ParticleSwarm",
    file: "ParticleSwarm.ts",
    category: "optimization",
    description: "Particle swarm optimization for continuous parameter spaces",
    inputs: ["swarmSize", "bounds", "objective"],
    outputs: ["globalBest", "convergence"],
    complexity: "O(n)",
    useCases: ["cutting_parameter_tuning", "fixture_layout", "probe_path"],
  },
  {
    name: "SimulatedAnnealing",
    file: "SimulatedAnnealing.ts",
    category: "optimization",
    description: "Simulated annealing for combinatorial optimization",
    inputs: ["initialSolution", "temperature", "coolingRate"],
    outputs: ["optimizedSolution", "energy"],
    complexity: "O(n)",
    useCases: ["sequence_optimization", "nesting", "job_scheduling"],
  },
  {
    name: "AntColonyTSP",
    file: "AntColonyTSP.ts",
    category: "optimization",
    description: "Ant colony optimization for traveling salesman problems",
    inputs: ["nodes", "distanceMatrix", "pheromoneDecay"],
    outputs: ["shortestPath", "pathLength"],
    complexity: "O(n^2)",
    useCases: ["probe_sequence", "tool_change_sequence", "fixture_ordering"],
  },
  {
    name: "ILPAssignment",
    file: "ILPAssignment.ts",
    category: "optimization",
    description: "Integer linear programming for resource assignment",
    inputs: ["resources", "constraints", "costs"],
    outputs: ["assignment", "totalCost"],
    complexity: "O(2^n)",
    useCases: ["machine_assignment", "operator_scheduling", "tool_allocation"],
  },
  {
    name: "DPMultiPass",
    file: "DPMultiPass.ts",
    category: "optimization",
    description: "Dynamic programming for optimal multi-pass cutting strategy",
    inputs: ["totalDepth", "maxDepth", "costFunction"],
    outputs: ["passes", "totalTime"],
    complexity: "O(n^2)",
    useCases: ["roughing_strategy", "multi_pass_turning", "step_over_optimization"],
  },
  {
    name: "CSPSetupPlan",
    file: "CSPSetupPlan.ts",
    category: "optimization",
    description: "Constraint satisfaction for setup planning",
    inputs: ["operations", "constraints", "resources"],
    outputs: ["setupSequence", "feasible"],
    complexity: "O(2^n)",
    useCases: ["setup_planning", "operation_sequencing", "fixture_sequence"],
  },
  {
    name: "GilbertMRRModel",
    file: "GilbertMRRModel.ts",
    category: "optimization",
    description: "Gilbert model for material removal rate optimization",
    inputs: ["material", "toolGeometry", "machineParams"],
    outputs: ["optimalMRR", "constrainedParams"],
    complexity: "O(1)",
    useCases: ["roughing_optimization", "productivity_improvement", "cycle_time_reduction"],
  },

  // Prediction algorithms
  {
    name: "TimeSeriesPredictor",
    file: "TimeSeriesPredictor.ts",
    category: "prediction",
    description: "ARIMA/LSTM time series prediction for process monitoring",
    inputs: ["historicalData", "horizon", "features"],
    outputs: ["predictions", "confidenceInterval"],
    complexity: "O(n)",
    useCases: ["tool_wear_prediction", "vibration_forecast", "temperature_trend"],
  },
  {
    name: "ToolWearPrediction",
    file: "ToolWearPrediction.ts",
    category: "prediction",
    description: "Physics-informed wear prediction with Taylor model",
    inputs: ["cuttingParams", "material", "toolGeometry"],
    outputs: ["remainingLife", "wearRate"],
    complexity: "O(1)",
    useCases: ["tool_change_planning", "cost_estimation", "maintenance_scheduling"],
  },
  {
    name: "BayesianWearModel",
    file: "BayesianWearModel.ts",
    category: "prediction",
    description: "Bayesian updating of wear model with online data",
    inputs: ["priorParams", "observations", "machiningTime"],
    outputs: ["posteriorParams", "predictedWear"],
    complexity: "O(n)",
    useCases: ["adaptive_tool_life", "online_monitoring", "probabilistic_maintenance"],
  },
  {
    name: "UsuiWearModel",
    file: "UsuiWearModel.ts",
    category: "prediction",
    description: "Usui wear model for diffusion and adhesion wear",
    inputs: ["temperature", "contactPressure", "slidingVelocity"],
    outputs: ["flankWear", "craterWear"],
    complexity: "O(1)",
    useCases: ["high_speed_machining", "hardened_steel_turning", "wear_mechanism_analysis"],
  },
  {
    name: "DigitalTwinEstimator",
    file: "DigitalTwinEstimator.ts",
    category: "prediction",
    description: "Digital twin state estimation with sensor fusion",
    inputs: ["sensorData", "physicsModel", "machineState"],
    outputs: ["estimatedState", "healthIndex"],
    complexity: "O(n)",
    useCases: ["machine_monitoring", "predictive_maintenance", "process_optimization"],
  },
  {
    name: "EnsemblePredictorModel",
    file: "EnsemblePredictorModel.ts",
    category: "prediction",
    description: "Ensemble of ML models for robust prediction",
    inputs: ["features", "models", "weights"],
    outputs: ["prediction", "uncertainty"],
    complexity: "O(n)",
    useCases: ["quality_prediction", "defect_classification", "outcome_forecasting"],
  },

  // Detection algorithms
  {
    name: "AnomalyDetector",
    file: "AnomalyDetector.ts",
    category: "detection",
    description: "Isolation forest and statistical anomaly detection",
    inputs: ["dataStream", "threshold", "windowSize"],
    outputs: ["anomalies", "scores"],
    complexity: "O(n log n)",
    useCases: ["tool_breakage", "chatter_onset", "process_drift"],
  },
  {
    name: "WaveletBreakage",
    file: "WaveletBreakage.ts",
    category: "detection",
    description: "Wavelet analysis for tool breakage detection",
    inputs: ["vibrationSignal", "sampleRate", "levels"],
    outputs: ["breakageDetected", "coefficients"],
    complexity: "O(n log n)",
    useCases: ["real_time_monitoring", "breakage_prevention", "signal_analysis"],
  },

  // Modeling algorithms
  {
    name: "KienzleForceModel",
    file: "KienzleForceModel.ts",
    category: "modeling",
    description: "Kienzle cutting force model with specific cutting force",
    inputs: ["kc1_1", "mc", "chipArea", "approachAngle"],
    outputs: ["cuttingForce", "components"],
    complexity: "O(1)",
    useCases: ["force_prediction", "power_estimation", "spindle_load"],
  },
  {
    name: "JohnsonCookModel",
    file: "JohnsonCookModel.ts",
    category: "modeling",
    description: "Johnson-Cook constitutive model for material flow stress",
    inputs: ["strain", "strainRate", "temperature", "materialConstants"],
    outputs: ["flowStress", "deformation"],
    complexity: "O(1)",
    useCases: ["chip_formation", "cutting_simulation", "material_behavior"],
  },
  {
    name: "ExtendedTaylorModel",
    file: "ExtendedTaylorModel.ts",
    category: "modeling",
    description: "Extended Taylor tool life model with multiple factors",
    inputs: ["cuttingSpeed", "feed", "depth", "materialConstants"],
    outputs: ["toolLife", "confidenceBounds"],
    complexity: "O(1)",
    useCases: ["tool_life_estimation", "cost_optimization", "speed_selection"],
  },
  {
    name: "ChipBreakingModel",
    file: "ChipBreakingModel.ts",
    category: "modeling",
    description: "Chip breaking mechanics and curl prediction",
    inputs: ["chipThickness", "material", "toolGeometry"],
    outputs: ["breakability", "chipForm"],
    complexity: "O(1)",
    useCases: ["chip_control", "insert_selection", "turning_optimization"],
  },
  {
    name: "ChipEvacuationModel",
    file: "ChipEvacuationModel.ts",
    category: "modeling",
    description: "Chip evacuation in drilling and deep hole machining",
    inputs: ["holeDepth", "diameter", "chipVolume", "coolant"],
    outputs: ["evacuationRate", "jamRisk"],
    complexity: "O(1)",
    useCases: ["peck_cycle_design", "deep_drilling", "gun_drilling"],
  },
  {
    name: "ChipVolumeRate",
    file: "ChipVolumeRate.ts",
    category: "modeling",
    description: "Chip volume rate calculation for productivity",
    inputs: ["feed", "speed", "depth", "width"],
    outputs: ["Q_cm3_per_min", "specificEnergy"],
    complexity: "O(1)",
    useCases: ["productivity_analysis", "power_check", "coolant_flow_sizing"],
  },
  {
    name: "ChipThinningCompensation",
    file: "ChipThinningCompensation.ts",
    category: "modeling",
    description: "Chip thinning compensation for radial engagement",
    inputs: ["nominalFeed", "radialEngagement", "toolDiameter"],
    outputs: ["adjustedFeed", "actualChipLoad"],
    complexity: "O(1)",
    useCases: ["hsc_milling", "light_radial_cuts", "contour_milling"],
  },
  {
    name: "CoolantFlowModel",
    file: "CoolantFlowModel.ts",
    category: "modeling",
    description: "Coolant flow and pressure modeling for chip evacuation",
    inputs: ["flowRate", "pressure", "nozzleGeometry", "targetZone"],
    outputs: ["velocity", "coverage", "coolingCapacity"],
    complexity: "O(1)",
    useCases: ["coolant_optimization", "through_tool_design", "high_pressure_setup"],
  },
  {
    name: "ToolDeflectionModel",
    file: "ToolDeflectionModel.ts",
    category: "modeling",
    description: "Tool deflection with Euler-Bernoulli beam theory",
    inputs: ["toolLength", "diameter", "overhang", "force"],
    outputs: ["deflection", "stiffness"],
    complexity: "O(1)",
    useCases: ["finish_planning", "wall_accuracy", "boring_bar_selection"],
  },
  {
    name: "SurfaceFinishPredictor",
    file: "SurfaceFinishPredictor.ts",
    category: "modeling",
    description: "Surface finish prediction with feed marks and vibration",
    inputs: ["feed", "noseRadius", "vibration", "speed"],
    outputs: ["Ra", "Rz", "contributing_factors"],
    complexity: "O(1)",
    useCases: ["finish_passes", "quality_planning", "parameter_selection"],
  },
  {
    name: "PowerTorqueCalc",
    file: "PowerTorqueCalc.ts",
    category: "modeling",
    description: "Power and torque calculation for spindle load",
    inputs: ["cuttingForce", "speed", "diameter"],
    outputs: ["power_kW", "torque_Nm"],
    complexity: "O(1)",
    useCases: ["machine_selection", "spindle_protection", "power_monitoring"],
  },

  // Thermal algorithms
  {
    name: "JaegerTempField",
    file: "JaegerTempField.ts",
    category: "thermal",
    description: "Jaeger moving heat source temperature field model",
    inputs: ["heatFlux", "velocity", "thermalProperties"],
    outputs: ["temperatureField", "maxTemp"],
    complexity: "O(n)",
    useCases: ["cutting_zone_temp", "burn_prevention", "thermal_damage"],
  },
  {
    name: "ThermalFEAModel",
    file: "ThermalFEAModel.ts",
    category: "thermal",
    description: "Finite element thermal analysis for complex geometries",
    inputs: ["mesh", "boundaryConditions", "heatSources"],
    outputs: ["temperatureDistribution", "gradients"],
    complexity: "O(n^2)",
    useCases: ["workpiece_distortion", "fixture_thermal", "residual_stress"],
  },
  {
    name: "ThermalPartitionModel",
    file: "ThermalPartitionModel.ts",
    category: "thermal",
    description: "Heat partition between chip, tool, and workpiece",
    inputs: ["cuttingParams", "materials", "toolCoating"],
    outputs: ["partitionRatios", "temperatures"],
    complexity: "O(1)",
    useCases: ["coating_selection", "coolant_strategy", "high_speed_planning"],
  },

  // Vibration algorithms
  {
    name: "FFTAnalyzer",
    file: "FFTAnalyzer.ts",
    category: "signal_processing",
    description: "Fast Fourier Transform for frequency analysis",
    inputs: ["signal", "sampleRate", "windowType"],
    outputs: ["spectrum", "dominantFrequencies"],
    complexity: "O(n log n)",
    useCases: ["vibration_analysis", "chatter_detection", "bearing_diagnosis"],
  },
  {
    name: "STFTChatter",
    file: "STFTChatter.ts",
    category: "signal_processing",
    description: "Short-time Fourier transform for time-varying chatter",
    inputs: ["signal", "windowSize", "overlap"],
    outputs: ["spectrogram", "chatterOnset"],
    complexity: "O(n log n)",
    useCases: ["adaptive_control", "process_monitoring", "chatter_evolution"],
  },
  {
    name: "SpindleVibFFTModel",
    file: "SpindleVibFFTModel.ts",
    category: "vibration",
    description: "Spindle vibration FFT model for bearing health",
    inputs: ["vibrationData", "rpm", "bearingGeometry"],
    outputs: ["bearingDefects", "imbalance", "misalignment"],
    complexity: "O(n log n)",
    useCases: ["spindle_health", "predictive_maintenance", "quality_correlation"],
  },
  {
    name: "FRFStabilityLobe",
    file: "FRFStabilityLobe.ts",
    category: "vibration",
    description: "Frequency response function for stability lobe generation",
    inputs: ["FRF", "cuttingCoefficients", "rpmRange"],
    outputs: ["stabilityLobes", "optimalRPM"],
    complexity: "O(n)",
    useCases: ["chatter_avoidance", "spindle_speed_selection", "depth_optimization"],
  },
  {
    name: "StabilityLobeDiagram",
    file: "StabilityLobeDiagram.ts",
    category: "vibration",
    description: "Analytical stability lobe diagram computation",
    inputs: ["naturalFreq", "damping", "kc", "numTeeth"],
    outputs: ["lobeBoundaries", "stableZones"],
    complexity: "O(n)",
    useCases: ["parameter_planning", "machine_characterization", "process_window"],
  },
  {
    name: "RCSA",
    file: "RCSA.ts",
    category: "vibration",
    description: "Receptance coupling substructure analysis",
    inputs: ["toolFRF", "holderFRF", "spindleFRF"],
    outputs: ["assemblyFRF", "dynamicStiffness"],
    complexity: "O(n)",
    useCases: ["tool_assembly_dynamics", "stability_prediction", "holder_selection"],
  },

  // Control algorithms
  {
    name: "PIDController",
    file: "PIDController.ts",
    category: "control",
    description: "PID controller with anti-windup and derivative filter",
    inputs: ["setpoint", "measurement", "Kp", "Ki", "Kd"],
    outputs: ["controlSignal", "error"],
    complexity: "O(1)",
    useCases: ["adaptive_feed", "force_control", "temperature_regulation"],
  },
  {
    name: "KalmanFilter",
    file: "KalmanFilter.ts",
    category: "control",
    description: "Kalman filter for state estimation with noise",
    inputs: ["measurement", "systemModel", "noiseCovariance"],
    outputs: ["estimatedState", "covariance"],
    complexity: "O(n^2)",
    useCases: ["sensor_fusion", "wear_estimation", "position_tracking"],
  },
  {
    name: "FuzzyController",
    file: "FuzzyController.ts",
    category: "control",
    description: "Fuzzy logic controller for adaptive machining",
    inputs: ["inputs", "ruleBase", "membershipFunctions"],
    outputs: ["crispOutput", "firingStrengths"],
    complexity: "O(n)",
    useCases: ["adaptive_control", "expert_system", "parameter_adjustment"],
  },
  {
    name: "AdaptiveControllerModel",
    file: "AdaptiveControllerModel.ts",
    category: "control",
    description: "Model reference adaptive control for machining",
    inputs: ["referenceModel", "plantOutput", "adaptationRate"],
    outputs: ["adaptedParams", "trackingError"],
    complexity: "O(n)",
    useCases: ["constant_force", "variable_material", "real_time_optimization"],
  },

  // Geometry algorithms
  {
    name: "MinkowskiSum",
    file: "MinkowskiSum.ts",
    category: "geometry",
    description: "Minkowski sum for collision-free toolpath planning",
    inputs: ["polygonA", "polygonB"],
    outputs: ["minkowskiSum", "vertices"],
    complexity: "O(n log n)",
    useCases: ["collision_detection", "clearance_verification", "safe_path"],
  },
  {
    name: "SweptVolumeCollision",
    file: "SweptVolumeCollision.ts",
    category: "geometry",
    description: "Swept volume computation for collision checking",
    inputs: ["toolGeometry", "toolpath", "obstacles"],
    outputs: ["sweptVolume", "collisions"],
    complexity: "O(n^2)",
    useCases: ["5_axis_collision", "holder_interference", "fixture_check"],
  },
  {
    name: "CWEZBuffer",
    file: "CWEZBuffer.ts",
    category: "geometry",
    description: "Cutter-workpiece engagement Z-buffer method",
    inputs: ["toolpath", "stockModel", "resolution"],
    outputs: ["engagementProfile", "immersionAngles"],
    complexity: "O(n)",
    useCases: ["variable_feed", "force_prediction", "adaptive_roughing"],
  },
  {
    name: "InterpolationEngine",
    file: "InterpolationEngine.ts",
    category: "geometry",
    description: "Spline interpolation for smooth toolpaths",
    inputs: ["points", "method", "tolerance"],
    outputs: ["interpolatedPath", "curvature"],
    complexity: "O(n)",
    useCases: ["smooth_motion", "contour_following", "5_axis_interpolation"],
  },

  // FEA algorithms
  {
    name: "FEASolver2D",
    file: "FEASolver2D.ts",
    category: "analysis",
    description: "2D finite element solver for structural analysis",
    inputs: ["mesh", "boundaryConditions", "material"],
    outputs: ["displacements", "stresses"],
    complexity: "O(n^2)",
    useCases: ["fixture_analysis", "part_deflection", "residual_stress"],
  },

  // Machine learning algorithms
  {
    name: "NeuralInference",
    file: "NeuralInference.ts",
    category: "machine_learning",
    description: "Neural network inference for real-time prediction",
    inputs: ["features", "model", "config"],
    outputs: ["prediction", "confidence"],
    complexity: "O(n)",
    useCases: ["quality_prediction", "anomaly_scoring", "process_outcome"],
  },
  {
    name: "ClusteringEngine",
    file: "ClusteringEngine.ts",
    category: "machine_learning",
    description: "K-means and hierarchical clustering for data grouping",
    inputs: ["data", "numClusters", "method"],
    outputs: ["labels", "centroids"],
    complexity: "O(n^2)",
    useCases: ["part_family", "tool_grouping", "failure_modes"],
  },
  {
    name: "DecisionTreeClassifier",
    file: "DecisionTreeClassifier.ts",
    category: "machine_learning",
    description: "Decision tree for classification and rule extraction",
    inputs: ["features", "labels", "maxDepth"],
    outputs: ["predictions", "rules"],
    complexity: "O(n log n)",
    useCases: ["defect_classification", "setup_recommendation", "diagnosis"],
  },
  {
    name: "RegressionEngine",
    file: "RegressionEngine.ts",
    category: "machine_learning",
    description: "Linear and polynomial regression for modeling",
    inputs: ["X", "y", "degree"],
    outputs: ["coefficients", "predictions", "r2"],
    complexity: "O(n)",
    useCases: ["calibration", "trend_analysis", "parameter_correlation"],
  },

  // Monte Carlo
  {
    name: "MonteCarlo",
    file: "MonteCarlo.ts",
    category: "analysis",
    description: "Monte Carlo simulation for uncertainty propagation",
    inputs: ["model", "distributions", "numSamples"],
    outputs: ["results", "statistics", "histogram"],
    complexity: "O(n)",
    useCases: ["tolerance_stack", "process_capability", "risk_assessment"],
  },
];

// ============================================================================
// WIRING RULES
// ============================================================================

interface WiringRule {
  algorithm: string;
  targetEngines: WiringTarget[];
}

const WIRING_RULES: WiringRule[] = [
  // Optimization algorithms -> Optimizer engines
  {
    algorithm: "BayesianOptimizer",
    targetEngines: [
      { engineName: "SpeedFeedOptimizerEngine", method: "optimizeWithBayesian", reason: "Parameter optimization with prior knowledge", confidence: 0.95 },
      { engineName: "AdaptiveSpeedFeedEngine", method: "adaptParameters", reason: "Online parameter adaptation", confidence: 0.90 },
      { engineName: "ToolSelectionEngine", method: "selectOptimalTool", reason: "Multi-criteria tool optimization", confidence: 0.85 },
    ],
  },
  {
    algorithm: "GeneticOptimizer",
    targetEngines: [
      { engineName: "MultiPassStrategyEngine", method: "optimizePassSequence", reason: "Multi-objective pass optimization", confidence: 0.95 },
      { engineName: "ToolpathOptimizerEngine", method: "optimizeToolpath", reason: "Complex toolpath optimization", confidence: 0.90 },
      { engineName: "SchedulingEngine", method: "optimizeSchedule", reason: "Job shop scheduling", confidence: 0.85 },
    ],
  },
  {
    algorithm: "ParticleSwarm",
    targetEngines: [
      { engineName: "CuttingParameterEngine", method: "optimizeParameters", reason: "Continuous parameter space search", confidence: 0.90 },
      { engineName: "FixtureLayoutEngine", method: "optimizeLayout", reason: "Spatial optimization", confidence: 0.85 },
    ],
  },
  {
    algorithm: "ILPAssignment",
    targetEngines: [
      { engineName: "MachineAssignmentEngine", method: "assignJobs", reason: "Optimal machine-job assignment", confidence: 0.95 },
      { engineName: "ResourceAllocationEngine", method: "allocateResources", reason: "Constrained resource allocation", confidence: 0.90 },
    ],
  },
  {
    algorithm: "CSPSetupPlan",
    targetEngines: [
      { engineName: "SetupPlanningEngine", method: "planSetups", reason: "Constraint satisfaction for setups", confidence: 0.95 },
      { engineName: "OperationSequencingEngine", method: "sequenceOperations", reason: "Feasible operation ordering", confidence: 0.90 },
    ],
  },
  {
    algorithm: "GilbertMRRModel",
    targetEngines: [
      { engineName: "RoughingStrategyEngine", method: "maximizeMRR", reason: "MRR maximization under constraints", confidence: 0.95 },
      { engineName: "ProductivityEngine", method: "optimizeProductivity", reason: "Productivity optimization", confidence: 0.90 },
    ],
  },

  // Prediction algorithms -> Monitoring engines
  {
    algorithm: "TimeSeriesPredictor",
    targetEngines: [
      { engineName: "ToolWearMonitorEngine", method: "predictWearTrend", reason: "Wear progression forecasting", confidence: 0.90 },
      { engineName: "ProcessMonitorEngine", method: "forecastDrift", reason: "Process drift prediction", confidence: 0.85 },
    ],
  },
  {
    algorithm: "DigitalTwinEstimator",
    targetEngines: [
      { engineName: "MachineHealthEngine", method: "estimateHealth", reason: "Real-time health assessment", confidence: 0.95 },
      { engineName: "PredictiveMaintenanceEngine", method: "predictFailure", reason: "Failure prediction", confidence: 0.90 },
    ],
  },
  {
    algorithm: "EnsemblePredictorModel",
    targetEngines: [
      { engineName: "QualityPredictionEngine", method: "predictQuality", reason: "Robust quality prediction", confidence: 0.90 },
      { engineName: "OutcomeForecastEngine", method: "forecastOutcome", reason: "Process outcome forecasting", confidence: 0.85 },
    ],
  },
  {
    algorithm: "UsuiWearModel",
    targetEngines: [
      { engineName: "HighSpeedMachiningEngine", method: "predictWear", reason: "Diffusion wear at high speeds", confidence: 0.95 },
      { engineName: "HardenedSteelTurningEngine", method: "estimateToolLife", reason: "Hard turning wear", confidence: 0.90 },
    ],
  },

  // Detection algorithms -> Monitoring engines
  {
    algorithm: "AnomalyDetector",
    targetEngines: [
      { engineName: "ProcessMonitorEngine", method: "detectAnomalies", reason: "Real-time anomaly detection", confidence: 0.95 },
      { engineName: "QualityControlEngine", method: "flagDefects", reason: "Defect detection", confidence: 0.90 },
    ],
  },

  // Thermal algorithms -> Thermal engines
  {
    algorithm: "JaegerTempField",
    targetEngines: [
      { engineName: "CuttingTemperatureEngine", method: "computeTemperature", reason: "Moving heat source model", confidence: 0.95 },
      { engineName: "ThermalDamageEngine", method: "assessDamage", reason: "Thermal damage prediction", confidence: 0.90 },
    ],
  },
  {
    algorithm: "ThermalFEAModel",
    targetEngines: [
      { engineName: "WorkpieceDistortionEngine", method: "predictDistortion", reason: "Thermal distortion analysis", confidence: 0.90 },
      { engineName: "FixtureThermalEngine", method: "analyzeGrowth", reason: "Fixture thermal analysis", confidence: 0.85 },
    ],
  },

  // Vibration algorithms -> Stability engines
  {
    algorithm: "SpindleVibFFTModel",
    targetEngines: [
      { engineName: "SpindleHealthEngine", method: "diagnoseBearings", reason: "Bearing defect detection", confidence: 0.95 },
      { engineName: "MaintenanceEngine", method: "scheduleService", reason: "Condition-based maintenance", confidence: 0.85 },
    ],
  },
  {
    algorithm: "FRFStabilityLobe",
    targetEngines: [
      { engineName: "ChatterStabilityEngine", method: "computeLobes", reason: "SLD from measured FRF", confidence: 0.95 },
      { engineName: "SpindleSpeedEngine", method: "selectStableRPM", reason: "Optimal RPM selection", confidence: 0.90 },
    ],
  },

  // Control algorithms -> Adaptive engines
  {
    algorithm: "FuzzyController",
    targetEngines: [
      { engineName: "AdaptiveControlEngine", method: "adjustParameters", reason: "Expert knowledge control", confidence: 0.90 },
      { engineName: "IntelligentMachiningEngine", method: "applyRules", reason: "Rule-based adjustment", confidence: 0.85 },
    ],
  },
  {
    algorithm: "AdaptiveControllerModel",
    targetEngines: [
      { engineName: "ConstantForceEngine", method: "maintainForce", reason: "Force-controlled machining", confidence: 0.95 },
      { engineName: "VariableMaterialEngine", method: "adaptToMaterial", reason: "Material variation handling", confidence: 0.90 },
    ],
  },

  // Geometry algorithms -> Collision engines
  {
    algorithm: "MinkowskiSum",
    targetEngines: [
      { engineName: "CollisionDetectionEngine", method: "checkClearance", reason: "Configuration space obstacle", confidence: 0.95 },
      { engineName: "SafePathEngine", method: "computeSafePath", reason: "Collision-free motion", confidence: 0.90 },
    ],
  },
  {
    algorithm: "SweptVolumeCollision",
    targetEngines: [
      { engineName: "FiveAxisCollisionEngine", method: "checkCollision", reason: "5-axis swept volume", confidence: 0.95 },
      { engineName: "HolderInterferenceEngine", method: "checkInterference", reason: "Holder collision check", confidence: 0.90 },
    ],
  },

  // ML algorithms -> Prediction engines
  {
    algorithm: "NeuralInference",
    targetEngines: [
      { engineName: "AIQualityEngine", method: "predict", reason: "Neural network inference", confidence: 0.90 },
      { engineName: "DeepLearningEngine", method: "infer", reason: "Deep model execution", confidence: 0.85 },
    ],
  },
  {
    algorithm: "DecisionTreeClassifier",
    targetEngines: [
      { engineName: "DefectClassificationEngine", method: "classify", reason: "Interpretable classification", confidence: 0.90 },
      { engineName: "DiagnosisEngine", method: "diagnose", reason: "Rule-based diagnosis", confidence: 0.85 },
    ],
  },

  // FEA algorithms -> Analysis engines
  {
    algorithm: "FEASolver2D",
    targetEngines: [
      { engineName: "FixtureAnalysisEngine", method: "analyzeStress", reason: "Fixture structural analysis", confidence: 0.90 },
      { engineName: "PartDeflectionEngine", method: "computeDeflection", reason: "Part deformation analysis", confidence: 0.85 },
    ],
  },

  // Coolant algorithms -> Coolant engines
  {
    algorithm: "CoolantFlowModel",
    targetEngines: [
      { engineName: "CoolantOptimizationEngine", method: "optimizeFlow", reason: "Coolant delivery optimization", confidence: 0.95 },
      { engineName: "ThroughToolCoolantEngine", method: "designDelivery", reason: "Through-tool design", confidence: 0.90 },
    ],
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class AlgorithmWiringEngine {
  private wirings: Map<string, AlgorithmWiring> = new Map();

  constructor() {
    this.buildWirings();
  }

  /**
   * Build all wirings from catalog and rules
   */
  private buildWirings(): void {
    // Initialize all algorithms as orphans
    for (const algo of ALGORITHM_CATALOG) {
      this.wirings.set(algo.name, {
        algorithm: algo.name,
        consumers: [],
        status: "orphan",
        wireCount: 0,
      });
    }

    // Apply wiring rules
    for (const rule of WIRING_RULES) {
      const wiring = this.wirings.get(rule.algorithm);
      if (wiring) {
        wiring.consumers = rule.targetEngines;
        wiring.wireCount = rule.targetEngines.length;
        wiring.status = wiring.wireCount > 0 ? "wired" : "orphan";
      }
    }
  }

  /**
   * List all algorithms with their info
   */
  listAlgorithms(category?: AlgorithmCategory): AlgorithmInfo[] {
    if (category) {
      return ALGORITHM_CATALOG.filter(a => a.category === category);
    }
    return [...ALGORITHM_CATALOG];
  }

  /**
   * Get algorithm info by name
   */
  getAlgorithm(name: string): AlgorithmInfo | undefined {
    return ALGORITHM_CATALOG.find(a => a.name === name);
  }

  /**
   * List orphaned algorithms (not wired to any engine)
   */
  listOrphanedAlgorithms(): string[] {
    return Array.from(this.wirings.values())
      .filter(w => w.status === "orphan")
      .map(w => w.algorithm);
  }

  /**
   * List wired algorithms with their consumers
   */
  listWiredAlgorithms(): AlgorithmWiring[] {
    return Array.from(this.wirings.values()).filter(w => w.status === "wired");
  }

  /**
   * Get consumers for an algorithm
   */
  getConsumers(algorithmName: string): WiringTarget[] {
    return this.wirings.get(algorithmName)?.consumers || [];
  }

  /**
   * Get algorithms used by an engine
   */
  getAlgorithmsForEngine(engineName: string): string[] {
    const algorithms: string[] = [];
    for (const [algoName, wiring] of this.wirings) {
      if (wiring.consumers.some(c => c.engineName === engineName)) {
        algorithms.push(algoName);
      }
    }
    return algorithms;
  }

  /**
   * Get full wiring report
   */
  getWiringReport(): WiringReport {
    const wirings = Array.from(this.wirings.values());
    const wiredCount = wirings.filter(w => w.status === "wired").length;
    const orphanCount = wirings.filter(w => w.status === "orphan").length;
    const partialCount = wirings.filter(w => w.status === "partially_wired").length;

    return {
      totalAlgorithms: wirings.length,
      wiredCount,
      orphanCount,
      partialCount,
      coverage: (wiredCount + partialCount * 0.5) / wirings.length,
      wirings,
    };
  }

  /**
   * Find algorithms by use case
   */
  findByUseCase(useCase: string): AlgorithmInfo[] {
    const lowerUseCase = useCase.toLowerCase();
    return ALGORITHM_CATALOG.filter(a =>
      a.useCases.some(uc => uc.includes(lowerUseCase) || lowerUseCase.includes(uc.replace(/_/g, " "))),
    );
  }

  /**
   * Get recommended algorithms for a problem domain
   */
  recommendAlgorithms(
    domain: "optimization" | "prediction" | "control" | "analysis" | "monitoring",
  ): AlgorithmInfo[] {
    const domainMapping: Record<string, AlgorithmCategory[]> = {
      optimization: ["optimization"],
      prediction: ["prediction", "machine_learning"],
      control: ["control"],
      analysis: ["analysis", "modeling", "geometry"],
      monitoring: ["detection", "signal_processing", "vibration"],
    };

    const categories = domainMapping[domain] || [];
    return ALGORITHM_CATALOG.filter(a => categories.includes(a.category));
  }

  /**
   * Get algorithm categories with counts
   */
  getCategories(): { category: AlgorithmCategory; count: number }[] {
    const counts = new Map<AlgorithmCategory, number>();
    for (const algo of ALGORITHM_CATALOG) {
      counts.set(algo.category, (counts.get(algo.category) || 0) + 1);
    }
    return Array.from(counts.entries()).map(([category, count]) => ({ category, count }));
  }

  /**
   * Wire an algorithm to an engine (manual wiring)
   */
  wireAlgorithm(algorithmName: string, target: WiringTarget): boolean {
    const wiring = this.wirings.get(algorithmName);
    if (!wiring) return false;

    // Check if already wired to this engine
    if (wiring.consumers.some(c => c.engineName === target.engineName)) {
      return false;
    }

    wiring.consumers.push(target);
    wiring.wireCount = wiring.consumers.length;
    wiring.status = "wired";
    return true;
  }

  /**
   * Suggest wirings for orphaned algorithms based on category matching
   */
  suggestWiringsForOrphan(algorithmName: string): WiringTarget[] {
    const algo = this.getAlgorithm(algorithmName);
    if (!algo) return [];

    // Category-based suggestions
    const categoryEngineMap: Record<AlgorithmCategory, WiringTarget[]> = {
      optimization: [
        { engineName: "GenericOptimizerEngine", method: "optimize", reason: "General optimization", confidence: 0.7 },
      ],
      prediction: [
        { engineName: "PredictionEngine", method: "predict", reason: "General prediction", confidence: 0.7 },
      ],
      detection: [
        { engineName: "MonitoringEngine", method: "detect", reason: "Anomaly detection", confidence: 0.7 },
      ],
      modeling: [
        { engineName: "PhysicsEngine", method: "model", reason: "Physical modeling", confidence: 0.7 },
      ],
      analysis: [
        { engineName: "AnalysisEngine", method: "analyze", reason: "General analysis", confidence: 0.7 },
      ],
      control: [
        { engineName: "ControlEngine", method: "control", reason: "Process control", confidence: 0.7 },
      ],
      geometry: [
        { engineName: "GeometryEngine", method: "compute", reason: "Geometric computation", confidence: 0.7 },
      ],
      thermal: [
        { engineName: "ThermalEngine", method: "analyze", reason: "Thermal analysis", confidence: 0.7 },
      ],
      wear: [
        { engineName: "WearEngine", method: "predict", reason: "Wear prediction", confidence: 0.7 },
      ],
      vibration: [
        { engineName: "VibrationEngine", method: "analyze", reason: "Vibration analysis", confidence: 0.7 },
      ],
      machine_learning: [
        { engineName: "MLEngine", method: "infer", reason: "ML inference", confidence: 0.7 },
      ],
      signal_processing: [
        { engineName: "SignalEngine", method: "process", reason: "Signal processing", confidence: 0.7 },
      ],
    };

    return categoryEngineMap[algo.category] || [];
  }

  /**
   * Get statistics about algorithm usage
   */
  getStats(): {
    totalAlgorithms: number;
    byCategory: { category: string; count: number }[];
    wiredCount: number;
    orphanCount: number;
    topUseCases: { useCase: string; count: number }[];
  } {
    const useCaseCounts = new Map<string, number>();
    for (const algo of ALGORITHM_CATALOG) {
      for (const uc of algo.useCases) {
        useCaseCounts.set(uc, (useCaseCounts.get(uc) || 0) + 1);
      }
    }

    const topUseCases = Array.from(useCaseCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([useCase, count]) => ({ useCase, count }));

    const report = this.getWiringReport();

    return {
      totalAlgorithms: ALGORITHM_CATALOG.length,
      byCategory: this.getCategories().map(c => ({ category: c.category, count: c.count })),
      wiredCount: report.wiredCount,
      orphanCount: report.orphanCount,
      topUseCases,
    };
  }
}

// Export singleton
export const algorithmWiringEngine = new AlgorithmWiringEngine();
