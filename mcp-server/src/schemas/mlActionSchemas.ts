/**
 * ML Pipeline Action Schemas — U-LEARN-03 + U-LEARN-04 + U-LEARN-05
 * ===================================================================
 *
 * Zod schemas for prism_ml dispatcher actions covering:
 * - corpus_crawl: Scan and parse JM Die program archive
 * - corpus_stats: Quick file counts without parsing
 * - program_parse_min: Parse Okuma .MIN program
 * - program_parse_nc: Parse standard .NC program
 * - run_log_parse: Parse controller run log
 * - training_assemble: Join programs + logs into training examples
 * - training_export: Export training examples to JSONL
 * - rag_program_build: Build JM Die program RAG index
 * - rag_program_search: Search similar programs
 * - rag_tribal_build: Build tribal knowledge RAG index
 * - rag_tribal_search: Search tribal tips
 * - rag_rerank: Rerank retrieval results
 * - provenance_create: Create provenance record
 * - provenance_validate: Validate provenance record
 * - lora_register_expert: Register LoRA expert adapter
 * - lora_gate: MoE top-K gating
 * - lora_compose: Compose adapters for forward pass
 * - dora_create: Create DoRA adapter
 * - dora_init_weights: Initialize DoRA weights
 * - dora_forward: DoRA forward pass
 * - adalora_create: Create AdaLoRA allocation
 * - adalora_step: Step AdaLoRA training
 * - olora_register: Register directions for orthogonality
 * - olora_check: Check orthogonality violations
 *
 * @module schemas/mlActionSchemas
 * @milestone PSAU P2.5-LEARN U-LEARN-03 U-LEARN-04 U-LEARN-05
 */

import { z } from "zod";

export const ML_ACTIONS = [
  "corpus_crawl",
  "corpus_stats",
  "program_parse_min",
  "program_parse_mcx",
  "min_batch_extract",
  "mcx_batch_extract",
  "lathe_infer_features",
  "bue_onset_check",
  "program_parse_nc",
  "run_log_parse",
  "training_assemble",
  "training_export",
  // U-LEARN-04 RAG actions
  "rag_program_build",
  "rag_program_search",
  "rag_tribal_build",
  "rag_tribal_search",
  "rag_rerank",
  "provenance_create",
  "provenance_validate",
  // U-LEARN-05 LoRA composition actions
  "lora_register_expert",
  "lora_gate",
  "lora_compose",
  "dora_create",
  "dora_init_weights",
  "dora_forward",
  "adalora_create",
  "adalora_step",
  "olora_register",
  "olora_check",
  // U-LEARN-08 Offline RL actions
  "iql_create",
  "iql_train",
  "iql_infer",
  "maxent_irl_create",
  "maxent_irl_train",
  "maxent_irl_reward",
  "safety_shield_create",
  "safety_shield_evaluate",
  "offline_rl_train",
  "offline_rl_infer",
  // U-ML-01 Physics consistency gate
  "physics_gate_validate",
  "physics_gate_batch",
  "physics_gate_constants",
  // U-LEARN-10 Continual Learning actions
  "si_register",
  "si_update",
  "si_consolidate",
  "si_loss",
  "der_create",
  "der_add",
  "der_sample",
  "der_loss",
  "tta_configure",
  "tta_adapt",
  "tta_reset",
  "tta_stats",
  "cascade_create",
  "cascade_propagate",
  "cascade_stats",
  "cascade_pending",
  "fedlora_aggregate",
  "fedlora_weights",
  "fedlora_stats",
  "per_create",
  "per_add",
  "per_sample",
  "per_update_priorities",
  "per_stats",
  "transfer_register",
  "transfer_execute",
  "transfer_find",
  "transfer_history",
  "continual_lora_create",
  "continual_lora_train",
  "continual_lora_state",
  "continual_lora_list",
  // U-LEARN-11 ProtoMAML Few-Shot actions
  "proto_compute",
  "proto_predict",
  "proto_state",
  "proto_clear",
  "proto_list",
  "protomaml_register",
  "protomaml_adapt",
  "protomaml_predict",
  "protomaml_cache_stats",
  "protomaml_clear_cache",
  "protomaml_list_configs",
  // Ollama task offloading
  "offload_decide",
  "offload_execute",
  "offload_stats",
] as const;

export type MLAction = typeof ML_ACTIONS[number];

export const ACTION_ML_SCHEMAS: Record<string, z.ZodType<unknown>> = {
  corpus_crawl: z.object({
    root_path: z.string().describe("Root path to JM DIE folder"),
    max_files: z.number().int().positive().max(100_000).default(50_000).describe("Max files to process"),
    file_types: z.array(z.enum([".MIN", ".NC", ".nc", ".log"])).default([".MIN", ".NC", ".nc"]).describe("File types to parse"),
    exclude_patterns: z.array(z.string()).default(["BACKUP", "OLD", "ARCHIVE", "TEMP"]).describe("Directory patterns to exclude"),
    parse_logs: z.boolean().default(true).describe("Also parse .log files for run metrics"),
  }).describe("Crawl JM Die archive and produce training examples"),

  corpus_stats: z.object({
    root_path: z.string().describe("Root path to scan"),
  }).describe("Quick scan for file counts without parsing"),

  program_parse_min: z.object({
    text: z.string().describe("Okuma .MIN program text"),
    source_path: z.string().default("<inline>").describe("Source file path for provenance"),
    max_lines: z.number().int().positive().max(1_000_000).default(200_000).describe("Max lines to parse"),
  }).describe("Parse an Okuma .MIN lathe program"),

  program_parse_mcx: z.object({
    file_path: z.string().optional().describe("Absolute path to .mcx/.mcx-8/.mcx-9/.mcam file (mutually exclusive with content_base64)"),
    content_base64: z.string().optional().describe("Base64-encoded file bytes for in-memory parse (mutually exclusive with file_path)"),
    filename: z.string().default("inline.mcx-8").describe("Filename used for extension-based format detection when content_base64 is supplied"),
    max_bytes: z.number().int().positive().max(64 * 1024 * 1024).default(64 * 1024 * 1024).describe("Per-file byte cap (≤64 MiB)"),
  }).refine((v) => Boolean(v.file_path) !== Boolean(v.content_base64), {
    message: "exactly one of file_path or content_base64 must be supplied",
  }).describe("Parse a Mastercam binary part file (LATHE-PROD-READY-MS0/U-LPR26)"),

  min_batch_extract: z.object({
    root_dir: z.string().describe("Root directory containing the .MIN corpus to walk recursively"),
    output_root: z.string().describe("Where the resumable checkpoint will be persisted under _checkpoints/"),
    run_id: z.string().min(1).describe("Stable run identifier — supply same value to resume"),
    max_files: z.number().int().positive().max(50_000).optional().describe("Cap on attempted files (e.g. 2000 for pt1)"),
    max_concurrency: z.number().int().positive().max(64).optional().describe("Worker pool size; defaults to min(cpus-1, 8)"),
    checkpoint_every: z.number().int().positive().max(10_000).default(250).describe("Persist checkpoint every N completions"),
    max_bytes_per_file: z.number().int().positive().max(64 * 1024 * 1024).default(32 * 1024 * 1024).describe("Per-file byte cap; oversized files are skipped"),
    resume: z.boolean().default(true).describe("Skip files already in the checkpoint when true"),
  }).describe("Bounded-concurrency .MIN batch parser with checkpoint+resume (LATHE-PROD-READY-MS0/U-LPR27)"),

  mcx_batch_extract: z.object({
    root_dir: z.string().describe("Root directory containing the Mastercam binary corpus"),
    output_root: z.string().describe("Where the resumable checkpoint will be persisted under _checkpoints/"),
    run_id: z.string().min(1).describe("Stable run identifier — supply same value to resume"),
    max_files: z.number().int().positive().max(50_000).optional().describe("Cap on attempted files"),
    max_concurrency: z.number().int().positive().max(64).optional().describe("Worker pool size; defaults to min(cpus-1, 8)"),
    checkpoint_every: z.number().int().positive().max(10_000).default(250).describe("Persist checkpoint every N completions"),
    max_bytes_per_file: z.number().int().positive().max(64 * 1024 * 1024).default(32 * 1024 * 1024).describe("Per-file byte cap; oversized files are skipped"),
    resume: z.boolean().default(true).describe("Skip files already in the checkpoint when true"),
  }).describe("Bounded-concurrency Mastercam-binary batch parser with checkpoint+resume (LATHE-PROD-READY-MS0/U-LPR28)"),

  lathe_infer_features: z.object({
    operations: z.array(z.object({
      index: z.number().int().nonnegative(),
      kind: z.string(),
      tool_id: z.string().optional(),
      canned_cycles: z.array(z.string()).optional(),
      x_min: z.number().nullable().optional(),
      x_max: z.number().nullable().optional(),
      z_start: z.number().nullable().optional(),
      z_end: z.number().nullable().optional(),
    })).describe("Operation views from a parsed MIN program (subset of MINOperation)"),
  }).describe("Reverse-engineer turning features from MIN operations (LATHE-PROD-READY-MS0/U-LPR29)"),

  bue_onset_check: z.object({
    cutting_speed_m_per_min: z.number().describe("Tangential cutting speed v_c"),
    iso_group: z.enum(["P","M","K","N","S","H"]).describe("ISO 513 workpiece group"),
    tool_material: z.enum(["hss","uncoated_carbide","coated_carbide","cermet","ceramic","cbn","pcd"]).describe("Insert/tool material"),
    rake_angle_deg: z.number().min(-30).max(30).default(0).describe("Effective rake; positive reduces BUE"),
  }).describe("Predict built-up edge onset risk (LATHE-PROD-READY-MS0/U-LPR-BUE)"),

  program_parse_nc: z.object({
    text: z.string().describe("Standard G-code .NC program text"),
    source_path: z.string().default("<inline>").describe("Source file path for provenance"),
    max_lines: z.number().int().positive().max(1_000_000).default(500_000).describe("Max lines to parse"),
  }).describe("Parse a standard G-code .NC program"),

  run_log_parse: z.object({
    text: z.string().describe("Controller run log text"),
    source_path: z.string().default("<inline>").describe("Log file path"),
    machine_id: z.string().default("unknown").describe("Machine identifier"),
    controller: z.enum(["okuma", "fanuc", "mazak", "haas", "hurco", "siemens", "unknown"]).default("unknown").describe("Controller type"),
    max_entries: z.number().int().positive().max(10_000_000).default(1_000_000).describe("Max log entries"),
  }).describe("Parse a controller run log"),

  training_assemble: z.object({
    programs: z.array(z.object({
      type: z.enum(["min", "nc"]).describe("Program type"),
      program: z.unknown().describe("Parsed MINProgram or NCProgram"),
    })).describe("Parsed programs to assemble"),
    run_logs: z.array(z.unknown()).default([]).describe("Parsed RunLog objects"),
    customer_name: z.string().default("unknown").describe("Default customer name"),
    machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "unknown"]).default("unknown").describe("Machine type"),
  }).describe("Assemble training examples from parsed programs and logs"),

  training_export: z.object({
    examples: z.array(z.unknown()).describe("Training examples to export"),
    output_path: z.string().describe("Output JSONL file path"),
  }).describe("Export training examples to JSONL file"),

  // U-LEARN-04 RAG actions
  rag_program_build: z.object({
    programs: z.array(z.object({
      source_path: z.string(),
      program_number: z.string().nullable(),
      customer: z.string(),
      material: z.string().optional(),
      machine_type: z.enum(["lathe", "mill", "wire_edm", "sinker_edm", "grinder", "unknown"]),
      controller: z.string(),
      tools: z.array(z.object({ tool_number: z.number(), tool_type: z.string().optional() })),
      operations: z.array(z.object({ kind: z.string(), g_codes: z.array(z.string()) })),
      total_lines: z.number(),
      cycle_time_sec: z.number().optional(),
    })).describe("Parsed programs to index"),
    index_path: z.string().optional().describe("Output index path"),
  }).describe("Build JM Die program RAG index"),

  rag_program_search: z.object({
    query: z.string().min(1).describe("Search query"),
    material: z.string().optional().describe("Filter by material"),
    machine_type: z.string().optional().describe("Filter by machine type"),
    operation_types: z.array(z.string()).optional().describe("Filter by operation types"),
    customer: z.string().optional().describe("Filter by customer"),
    top_k: z.number().int().min(1).max(100).default(10).describe("Number of results"),
    min_score: z.number().min(0).default(0).describe("Minimum score threshold"),
  }).describe("Search for similar programs"),

  rag_tribal_build: z.object({
    tips: z.array(z.object({
      tip_id: z.string().optional(),
      source: z.string(),
      domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder", "general"]),
      title: z.string(),
      body: z.string(),
      tags: z.array(z.string()).optional(),
      materials: z.array(z.string()).optional(),
      operations: z.array(z.string()).optional(),
      machines: z.array(z.string()).optional(),
      symptoms: z.array(z.string()).optional(),
      severity: z.enum(["info", "warning", "critical"]).optional(),
      confidence: z.number().min(0).max(1).optional(),
    })).describe("Tips to index"),
    index_path: z.string().optional().describe("Output index path"),
  }).describe("Build tribal knowledge RAG index"),

  rag_tribal_search: z.object({
    query: z.string().min(1).describe("Search query"),
    domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder", "general"]).optional(),
    material: z.string().optional(),
    operation: z.string().optional(),
    machine: z.string().optional(),
    symptom: z.string().optional(),
    severity: z.enum(["info", "warning", "critical"]).optional(),
    top_k: z.number().int().min(1).max(100).default(10),
    min_score: z.number().min(0).default(0),
  }).describe("Search tribal knowledge tips"),

  rag_rerank: z.object({
    query: z.string().min(1).describe("Original query"),
    candidates: z.array(z.object({
      id: z.string(),
      score: z.number(),
      source_type: z.string(),
      title: z.string().nullable(),
      excerpt: z.string().nullable(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    })).describe("Candidates to rerank"),
    top_k: z.number().int().min(1).max(20).default(3),
    diversity_weight: z.number().min(0).max(1).optional().describe("MMR diversity weight (0=relevance only)"),
  }).describe("Rerank retrieval candidates"),

  provenance_create: z.object({
    engine: z.string().describe("Engine producing the recommendation"),
    citations: z.array(z.object({
      source_type: z.enum(["formula", "constant", "tribal_tip", "playbook_rule", "program", "run_log", "lora_adapter", "ml_model", "operator", "manual", "material_db", "tool_db", "customer_spec", "unknown"]),
      source_id: z.string(),
      corpus: z.string().optional(),
      excerpt: z.string().optional(),
      confidence: z.number().min(0).max(1),
      retrieval_score: z.number().optional(),
    })).optional().describe("Source citations"),
    reasoning_trace: z.string().optional().describe("Explanation of reasoning"),
  }).describe("Create provenance record for a recommendation"),

  provenance_validate: z.object({
    provenance: z.object({
      recommendation_id: z.string(),
      timestamp: z.string(),
      engine: z.string(),
      citations: z.array(z.unknown()),
      primary_citation: z.unknown().nullable(),
      reasoning_trace: z.string().nullable(),
      audit_hash: z.string().nullable(),
    }).describe("Provenance record to validate"),
    require_citations: z.boolean().default(true).describe("Require at least one citation"),
  }).describe("Validate a provenance record"),

  // U-LEARN-05 LoRA Composition actions
  lora_register_expert: z.object({
    experts: z.array(z.object({
      adapter_id: z.string().describe("Adapter identifier"),
      domain: z.enum(["cutting_force", "tool_wear", "surface_finish", "cycle_time", "thermal", "vibration", "power", "quality", "cost", "general"]).describe("Expertise domain"),
      quality_score: z.object({
        accuracy: z.number().min(0).max(1),
        stability: z.number().min(0).max(1),
        coverage: z.number().min(0).max(1),
        confidence: z.number().min(0).max(1),
        freshness: z.number().min(0).max(1),
      }).describe("5-dim quality score"),
      rank: z.number().int().positive().describe("LoRA rank"),
      alpha: z.number().positive().describe("Scaling factor"),
    })).describe("Expert adapters to register"),
  }).describe("Register LoRA expert adapters for MoE routing"),

  lora_gate: z.object({
    domain: z.enum(["cutting_force", "tool_wear", "surface_finish", "cycle_time", "thermal", "vibration", "power", "quality", "cost", "general"]).describe("Target domain"),
    material: z.string().optional().describe("Material context"),
    machine: z.string().optional().describe("Machine context"),
    operation: z.string().optional().describe("Operation context"),
    quality_weights: z.array(z.number()).length(5).optional().describe("Weights for 5-dim quality score"),
    top_k: z.number().int().min(1).max(10).default(3).describe("Number of experts to select"),
    temperature: z.number().positive().default(1.0).describe("Softmax temperature"),
  }).describe("MoE gating to select top-K expert adapters"),

  lora_compose: z.object({
    domain: z.enum(["cutting_force", "tool_wear", "surface_finish", "cycle_time", "thermal", "vibration", "power", "quality", "cost", "general"]).describe("Target domain"),
    context: z.object({
      material: z.string().optional(),
      machine: z.string().optional(),
      operation: z.string().optional(),
      customer: z.string().optional(),
    }).describe("Context for adapter selection"),
    base_values: z.record(z.string(), z.number()).describe("Base physics values to adapt"),
    composition_mode: z.enum(["weighted_sum", "cascade", "residual", "attention"]).default("weighted_sum").describe("How to combine adapters"),
    max_experts: z.number().int().min(1).max(10).default(3).describe("Max experts to compose"),
  }).describe("Compose adapters into single forward pass"),

  dora_create: z.object({
    adapter_id: z.string().describe("Adapter identifier"),
    rank: z.number().int().positive().describe("LoRA rank"),
    alpha: z.number().positive().describe("Scaling factor"),
    magnitude_lr_scale: z.number().positive().default(1.0).describe("LR scale for magnitude"),
    direction_lr_scale: z.number().positive().default(1.0).describe("LR scale for direction"),
    normalize_direction: z.boolean().default(true).describe("Normalize direction vectors"),
  }).describe("Create DoRA adapter with magnitude/direction decomposition"),

  dora_init_weights: z.object({
    adapter_id: z.string().describe("Adapter to initialize"),
    input_dim: z.number().int().positive().describe("Input dimension"),
    output_dim: z.number().int().positive().describe("Output dimension"),
    init_scale: z.number().positive().default(0.01).describe("Initialization scale"),
  }).describe("Initialize DoRA adapter weights"),

  dora_forward: z.object({
    adapter_id: z.string().describe("Adapter to use"),
    inputs: z.array(z.array(z.number())).describe("Input vectors (batch)"),
  }).describe("DoRA forward pass"),

  adalora_create: z.object({
    adapter_id: z.string().describe("Adapter identifier"),
    total_rank_budget: z.number().int().positive().describe("Total rank budget across layers"),
    layer_names: z.array(z.string()).describe("Layer names to allocate"),
    min_rank: z.number().int().nonnegative().default(1).describe("Minimum rank per layer"),
    max_rank: z.number().int().positive().default(64).describe("Maximum rank per layer"),
    importance_metric: z.enum(["svd", "gradient", "fisher"]).default("svd").describe("Importance scoring method"),
    reallocation_interval: z.number().int().positive().default(100).describe("Steps between reallocations"),
  }).describe("Create AdaLoRA rank allocation"),

  adalora_step: z.object({
    adapter_id: z.string().describe("Adapter to step"),
    layer_data: z.record(z.string(), z.object({
      weights: z.array(z.array(z.number())).optional(),
      gradients: z.array(z.number()).optional(),
    })).describe("Per-layer training data"),
  }).describe("Step AdaLoRA training and potentially reallocate ranks"),

  olora_register: z.object({
    adapters: z.array(z.object({
      adapter_id: z.string(),
      direction: z.array(z.number()).describe("Flattened direction vector"),
      domain: z.string().optional(),
    })).describe("Adapter directions to register"),
  }).describe("Register adapter directions for orthogonality tracking"),

  olora_check: z.object({
    threshold: z.number().min(0).max(1).default(0.1).describe("Cosine similarity threshold for violations"),
    domain: z.string().optional().describe("Filter by domain"),
  }).describe("Check orthogonality violations between adapters"),

  // U-LEARN-08 Offline RL actions
  iql_create: z.object({
    policy_id: z.string().min(1).describe("Policy identifier"),
    state_dim: z.number().int().positive().describe("State dimension"),
    action_dim: z.number().int().positive().describe("Action dimension"),
    hidden_dims: z.array(z.number().int().positive()).default([256, 256]).describe("Hidden layer dimensions"),
    expectile: z.number().min(0).max(1).default(0.7).describe("Expectile τ for V regression"),
    temperature: z.number().positive().default(3.0).describe("AWR temperature β"),
    discount: z.number().min(0).max(1).default(0.99).describe("Discount factor γ"),
    learning_rate: z.number().positive().default(3e-4).describe("Learning rate"),
  }).describe("Create IQL policy for offline RL"),

  iql_train: z.object({
    policy_id: z.string().min(1).describe("Policy to train"),
    states: z.array(z.array(z.number())).describe("Batch of state vectors"),
    actions: z.array(z.array(z.number())).describe("Batch of action vectors"),
    rewards: z.array(z.number()).describe("Batch of scalar rewards"),
    next_states: z.array(z.array(z.number())).describe("Batch of next state vectors"),
    dones: z.array(z.boolean()).describe("Batch of terminal flags"),
  }).describe("Train IQL on a batch of transitions"),

  iql_infer: z.object({
    policy_id: z.string().min(1).describe("Policy to use"),
    state: z.array(z.number()).describe("Current state vector"),
    return_distribution: z.boolean().default(false).describe("Return action distribution"),
  }).describe("Get action from IQL policy"),

  maxent_irl_create: z.object({
    reward_model_id: z.string().min(1).describe("Reward model identifier"),
    state_dim: z.number().int().positive().describe("State dimension"),
    action_dim: z.number().int().positive().describe("Action dimension"),
    hidden_dims: z.array(z.number().int().positive()).default([128, 128]).describe("Hidden layer dimensions"),
    learning_rate: z.number().positive().default(1e-3).describe("Learning rate"),
    entropy_weight: z.number().min(0).default(0.01).describe("Entropy regularization"),
  }).describe("Create MaxEnt IRL reward model"),

  maxent_irl_train: z.object({
    reward_model_id: z.string().min(1).describe("Model to train"),
    demonstrations: z.array(z.object({
      demo_id: z.string().min(1),
      state: z.array(z.number()),
      action: z.array(z.number()),
      source: z.enum(["operator_override", "program_archive", "expert_annotation", "successful_job"]),
      confidence: z.number().min(0).max(1).default(1.0),
    })).min(1).describe("Expert demonstrations"),
    epochs: z.number().int().positive().default(100).describe("Training epochs"),
  }).describe("Train MaxEnt IRL on demonstrations"),

  maxent_irl_reward: z.object({
    reward_model_id: z.string().min(1).describe("Model to query"),
    state: z.array(z.number()).describe("State vector"),
    action: z.array(z.number()).describe("Action vector"),
  }).describe("Get learned reward for state-action pair"),

  safety_shield_create: z.object({
    shield_id: z.string().min(1).describe("Shield identifier"),
    constraints: z.array(z.object({
      constraint_id: z.string().min(1),
      type: z.enum(["force_limit", "spindle_load", "tool_deflection", "thermal_limit", "collision_margin", "tool_life_reserve", "vibration_limit", "power_limit"]),
      parameter: z.string(),
      limit_value: z.number(),
      limit_type: z.enum(["max", "min"]),
      probability_threshold: z.number().min(0).max(1).default(1e-4),
      severity: z.enum(["soft", "hard"]).default("hard"),
    })).min(1).describe("Safety constraints"),
    cbf_gamma: z.number().min(0).max(1).default(0.1).describe("CBF decay rate"),
  }).describe("Create safety shield with constraints"),

  safety_shield_evaluate: z.object({
    shield_id: z.string().min(1).describe("Shield to use"),
    state: z.record(z.string(), z.number()).describe("Current state"),
    proposed_action: z.record(z.string(), z.number()).describe("Proposed action"),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  }).describe("Evaluate action safety through shield"),

  offline_rl_train: z.object({
    policy_id: z.string().min(1).describe("Policy identifier"),
    domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder", "general"]).describe("Training domain"),
    epochs: z.number().int().positive().default(100).describe("Training epochs"),
    batch_size: z.number().int().positive().default(256).describe("Batch size"),
    demonstration_source: z.enum(["operator_overrides", "program_archive", "both"]).default("both"),
  }).describe("Train complete offline RL pipeline"),

  offline_rl_infer: z.object({
    policy_id: z.string().min(1).describe("Policy to use"),
    state: z.record(z.string(), z.number()).describe("Current state features"),
    apply_safety_shield: z.boolean().default(true).describe("Apply safety shield"),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  }).describe("Run inference with offline RL policy"),

  // U-ML-01 Physics consistency gate
  physics_gate_validate: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
    ap_mm: z.number().positive().describe("Depth of cut [mm]"),
    fz_mm: z.number().positive().describe("Feed per tooth [mm]"),
    vc_m_min: z.number().nonnegative().describe("Cutting speed [m/min]"),
    tool_diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
    tool_stickout_mm: z.number().positive().describe("Tool stick-out [mm]"),
    flute_count: z.number().int().positive().describe("Number of flutes"),
    ae_mm: z.number().nonnegative().optional().describe("Radial depth of cut [mm]"),
    rpm: z.number().positive().optional().describe("Spindle RPM"),
    machine_limits: z.record(z.string(), z.number()).optional().describe("Machine-specific limits"),
    cad_app: z.string().optional().describe("CAD app that generated params"),
    operation: z.string().optional().describe("Operation context"),
  }).describe("Validate CAD/CAM params against Kienzle/Taylor physics bounds"),

  physics_gate_batch: z.object({
    items: z.array(z.object({
      iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
      ap_mm: z.number().positive(),
      fz_mm: z.number().positive(),
      vc_m_min: z.number().nonnegative(),
      tool_diameter_mm: z.number().positive(),
      tool_stickout_mm: z.number().positive(),
      flute_count: z.number().int().positive(),
      ae_mm: z.number().nonnegative().optional(),
    })).describe("Batch of parameter sets"),
    stop_on_first_failure: z.boolean().default(false).describe("Stop at first REJECT"),
  }).describe("Batch validate multiple parameter sets"),

  physics_gate_constants: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
  }).describe("Get Kienzle/Taylor constants for ISO group"),

  // U-LEARN-10 Synaptic Intelligence actions
  si_register: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    parameter_count: z.number().int().positive().describe("Number of parameters"),
    importance_decay: z.number().min(0).max(1).default(0.99).describe("Importance decay factor"),
    damping: z.number().positive().default(0.1).describe("Damping factor for numerical stability"),
  }).describe("Register model for SI importance tracking"),

  si_update: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    gradients: z.array(z.number()).describe("Gradient vector"),
    parameter_deltas: z.array(z.number()).describe("Parameter change vector"),
  }).describe("Update SI importance with gradients and deltas"),

  si_consolidate: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    task_id: z.string().min(1).describe("Task identifier"),
  }).describe("Consolidate SI after task completion"),

  si_loss: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    current_params: z.array(z.number()).describe("Current parameter values"),
    lambda_si: z.number().positive().default(1.0).describe("SI regularization strength"),
  }).describe("Compute SI regularization loss"),

  // U-LEARN-10 DER++ actions
  der_create: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    max_size: z.number().int().positive().default(5000).describe("Maximum buffer size"),
    alpha: z.number().min(0).max(1).default(0.5).describe("Weight for KL loss"),
    beta: z.number().min(0).max(1).default(0.5).describe("Weight for MSE loss"),
  }).describe("Create DER++ replay buffer"),

  der_add: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    experience: z.object({
      experience_id: z.string().min(1),
      input: z.array(z.number()),
      target: z.array(z.number()),
      logits: z.array(z.number()),
      task_id: z.string().min(1),
    }).describe("Experience to add"),
  }).describe("Add experience to DER++ buffer"),

  der_sample: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    batch_size: z.number().int().positive().default(32).describe("Batch size"),
    task_id: z.string().optional().describe("Filter by task"),
  }).describe("Sample from DER++ buffer"),

  der_loss: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    current_logits: z.array(z.array(z.number())).describe("Current model logits"),
    sample_indices: z.array(z.number().int()).describe("Indices of sampled experiences"),
  }).describe("Compute DER++ distillation loss"),

  // U-LEARN-10 TTA actions
  tta_configure: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    entropy_threshold: z.number().positive().default(0.4).describe("EATA entropy threshold"),
    diversity_threshold: z.number().min(0).max(1).default(0.05).describe("Diversity threshold"),
    adaptation_lr: z.number().positive().default(1e-4).describe("Adaptation learning rate"),
    adapt_bn: z.boolean().default(true).describe("Adapt batch norm"),
    adapt_lora_a: z.boolean().default(true).describe("Adapt LoRA-A"),
    fisher_alpha: z.number().min(0).default(2000).describe("Fisher regularization strength"),
  }).describe("Configure test-time adaptation model"),

  tta_adapt: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
    sample_logits: z.array(z.number()).describe("Logits from current sample"),
    sample_features: z.array(z.number()).optional().describe("Feature vector for diversity check"),
  }).describe("Attempt test-time adaptation on a sample"),

  tta_reset: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
  }).describe("Reset TTA model to initial state"),

  tta_stats: z.object({
    model_id: z.string().min(1).describe("Model identifier"),
  }).describe("Get TTA adaptation statistics"),

  // U-LEARN-10 Cascade actions
  cascade_create: z.object({
    graph_id: z.string().min(1).describe("Graph identifier"),
    nodes: z.array(z.object({
      node_id: z.string().min(1),
      node_type: z.enum(["lora_finetune", "tribal_kb", "playbook_rule", "feature_store"]),
      threshold_count: z.number().int().positive().default(5),
      auto_promote: z.boolean().default(true),
    })).min(1).describe("Cascade nodes"),
    edges: z.array(z.object({
      from: z.string(),
      to: z.string(),
      weight: z.number().min(0).max(1).default(1),
    })).describe("Cascade edges"),
  }).describe("Create learning cascade graph"),

  cascade_propagate: z.object({
    graph_id: z.string().min(1).describe("Graph identifier"),
    outcome_id: z.string().min(1).describe("Outcome identifier"),
    domain: z.string().min(1).describe("Domain of outcome"),
    material: z.string().optional().describe("Material context"),
    machine: z.string().optional().describe("Machine context"),
    delta: z.record(z.string(), z.number()).describe("Parameter deltas"),
    confidence: z.number().min(0).max(1).describe("Outcome confidence"),
  }).describe("Propagate confirmed outcome through cascade"),

  cascade_stats: z.object({
    graph_id: z.string().min(1).describe("Graph identifier"),
  }).describe("Get cascade graph statistics"),

  cascade_pending: z.object({
    graph_id: z.string().min(1).describe("Graph identifier"),
    node_id: z.string().min(1).describe("Node identifier"),
  }).describe("Get pending outcomes for a cascade node"),

  // U-LEARN-10 FedLoRA actions
  fedlora_aggregate: z.object({
    round_id: z.string().min(1).describe("Aggregation round identifier"),
    clients: z.array(z.object({
      client_id: z.string().min(1),
      customer_id: z.string().min(1),
      material_class: z.string().min(1),
      operation_type: z.string().min(1),
      machine_class: z.string().min(1),
      lora_a_weights: z.array(z.array(z.number())),
      sample_count: z.number().int().nonnegative(),
    })).min(1).describe("Client contributions"),
    aggregation_method: z.enum(["fedavg", "fedprox", "scaffold"]).default("fedavg").describe("Aggregation method"),
    mu: z.number().nonnegative().default(0.01).describe("FedProx regularization"),
  }).describe("Aggregate LoRA-A matrices from clients"),

  fedlora_weights: z.object({
    material_class: z.string().min(1).describe("Material class"),
    operation_type: z.string().min(1).describe("Operation type"),
    machine_class: z.string().min(1).describe("Machine class"),
  }).describe("Get global LoRA-A weights for configuration"),

  fedlora_stats: z.object({}).describe("Get FedLoRA aggregation statistics"),

  // U-LEARN-10 PER actions
  per_create: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    max_size: z.number().int().positive().default(10000).describe("Maximum buffer size"),
    alpha: z.number().min(0).max(1).default(0.6).describe("Priority exponent"),
    beta_start: z.number().min(0).max(1).default(0.4).describe("Initial IS weight exponent"),
    beta_end: z.number().min(0).max(1).default(1.0).describe("Final IS weight exponent"),
    beta_frames: z.number().int().positive().default(100000).describe("Frames to anneal beta"),
    epsilon: z.number().positive().default(1e-6).describe("Priority epsilon"),
  }).describe("Create prioritized replay buffer"),

  per_add: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    experience: z.object({
      experience_id: z.string().min(1),
      state: z.array(z.number()),
      action: z.array(z.number()),
      reward: z.number(),
      next_state: z.array(z.number()),
      done: z.boolean(),
      td_error: z.number().optional(),
    }).describe("Experience to add"),
  }).describe("Add experience to PER buffer"),

  per_sample: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    batch_size: z.number().int().positive().default(32).describe("Batch size"),
  }).describe("Sample from PER buffer with IS weights"),

  per_update_priorities: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
    indices: z.array(z.number().int()).describe("Experience indices"),
    td_errors: z.array(z.number()).describe("New TD errors"),
  }).describe("Update PER priorities after learning"),

  per_stats: z.object({
    buffer_id: z.string().min(1).describe("Buffer identifier"),
  }).describe("Get PER buffer statistics"),

  // U-LEARN-10 Transfer actions
  transfer_register: z.object({
    source_customer: z.string().min(1).describe("Source customer"),
    source_policy_id: z.string().min(1).describe("Source policy ID"),
    material_class: z.string().min(1).describe("Material class"),
    operation_type: z.string().min(1).describe("Operation type"),
    machine_class: z.string().min(1).describe("Machine class"),
    performance_score: z.number().min(0).max(1).describe("Policy performance"),
    sample_count: z.number().int().positive().describe("Training sample count"),
  }).describe("Register source policy for cross-customer transfer"),

  transfer_execute: z.object({
    target_customer: z.string().min(1).describe("Target customer"),
    material_class: z.string().min(1).describe("Material class"),
    operation_type: z.string().min(1).describe("Operation type"),
    machine_class: z.string().min(1).describe("Machine class"),
    min_similarity: z.number().min(0).max(1).default(0.7).describe("Minimum similarity"),
    max_sources: z.number().int().positive().default(5).describe("Max source policies"),
  }).describe("Execute cross-customer policy transfer"),

  transfer_find: z.object({
    target_customer: z.string().min(1).describe("Target customer"),
    material_class: z.string().min(1).describe("Material class"),
    operation_type: z.string().min(1).describe("Operation type"),
    machine_class: z.string().min(1).describe("Machine class"),
    min_similarity: z.number().min(0).max(1).default(0.7).describe("Minimum similarity"),
    max_sources: z.number().int().positive().default(5).describe("Max results"),
  }).describe("Find similar source policies without transferring"),

  transfer_history: z.object({
    target_customer: z.string().optional().describe("Filter by target customer"),
  }).describe("Get policy transfer history"),

  // U-LEARN-10 ContinualLoRA actions
  continual_lora_create: z.object({
    adapter_id: z.string().min(1).describe("Adapter identifier"),
    domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]).describe("Domain"),
    rank: z.number().int().positive().default(8).describe("LoRA rank"),
    alpha: z.number().positive().default(16).describe("Scaling factor"),
    ewc_lambda: z.number().nonnegative().default(1000).describe("EWC++ regularization"),
    si_damping: z.number().positive().default(0.1).describe("SI damping"),
    der_buffer_size: z.number().int().positive().default(5000).describe("DER++ buffer size"),
    der_alpha: z.number().min(0).max(1).default(0.5).describe("DER++ alpha"),
    der_beta: z.number().min(0).max(1).default(0.5).describe("DER++ beta"),
  }).describe("Create unified continual LoRA adapter"),

  continual_lora_train: z.object({
    adapter_id: z.string().min(1).describe("Adapter identifier"),
    task_id: z.string().min(1).describe("Task identifier"),
    experiences: z.array(z.object({
      input: z.array(z.number()),
      target: z.array(z.number()),
      logits: z.array(z.number()).optional(),
    })).describe("Training experiences"),
    epochs: z.number().int().positive().default(10).describe("Training epochs"),
    batch_size: z.number().int().positive().default(32).describe("Batch size"),
    use_ewc: z.boolean().default(true).describe("Use EWC++ regularization"),
    use_si: z.boolean().default(true).describe("Use SI regularization"),
    use_der: z.boolean().default(true).describe("Use DER++ replay"),
  }).describe("Train continual LoRA with anti-forgetting"),

  continual_lora_state: z.object({
    adapter_id: z.string().min(1).describe("Adapter identifier"),
  }).describe("Get continual LoRA adapter state"),

  continual_lora_list: z.object({}).describe("List all continual LoRA adapters"),

  // U-LEARN-11 Prototypical Network actions
  proto_compute: z.object({
    task_id: z.string().min(1).describe("Unique task identifier"),
    domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]).describe("Manufacturing domain"),
    examples: z.array(z.object({
      class_id: z.string().min(1).describe("Class identifier (customer-material tuple)"),
      features: z.array(z.number()).min(1).describe("Feature vector"),
      target: z.number().describe("Target value"),
    })).min(1).describe("Support set examples"),
  }).describe("Compute prototypes from support set for few-shot classification"),

  proto_predict: z.object({
    task_id: z.string().min(1).describe("Task identifier with computed prototypes"),
    query_features: z.array(z.number()).min(1).describe("Query feature vector"),
  }).describe("Predict using nearest prototype distance"),

  proto_state: z.object({
    task_id: z.string().min(1).describe("Task identifier"),
  }).describe("Get task state including prototypes"),

  proto_clear: z.object({
    task_id: z.string().min(1).describe("Task identifier to clear"),
  }).describe("Clear task prototypes"),

  proto_list: z.object({}).describe("List all active prototype tasks"),

  // U-LEARN-11 ProtoMAML Few-Shot actions
  protomaml_register: z.object({
    config_id: z.string().min(1).describe("Configuration identifier"),
    domain: z.enum(["mill", "lathe", "wedm", "sinker", "grinder", "welder"]).describe("Manufacturing domain"),
    inner_lr: z.number().positive().default(0.01).describe("Inner loop learning rate"),
    inner_steps: z.number().int().positive().default(5).describe("Inner loop gradient steps"),
    meta_lr: z.number().positive().optional().describe("Meta learning rate (for outer loop)"),
    feature_dim: z.number().int().positive().describe("Input feature dimension"),
    hidden_dim: z.number().int().positive().default(8).describe("Hidden layer dimension"),
    use_proto_init: z.boolean().default(true).describe("Use prototypical initialization"),
    regularization_lambda: z.number().nonnegative().default(0.01).describe("L2 regularization strength"),
  }).describe("Register ProtoMAML configuration for few-shot adaptation"),

  protomaml_adapt: z.object({
    config_id: z.string().min(1).describe("Configuration identifier"),
    customer_id: z.string().min(1).describe("Customer identifier"),
    material_class: z.string().min(1).describe("Material class"),
    support_set: z.array(z.object({
      features: z.array(z.number()).min(1).describe("Feature vector"),
      target: z.number().describe("Target value"),
    })).min(1).describe("Few-shot support set (3-10 samples)"),
    cache_adapted: z.boolean().default(true).describe("Cache adapted params for future queries"),
  }).describe("Adapt model to new customer with inner loop optimization (<500ms target)"),

  protomaml_predict: z.object({
    config_id: z.string().min(1).describe("Configuration identifier"),
    customer_id: z.string().min(1).describe("Customer identifier"),
    material_class: z.string().min(1).describe("Material class"),
    query_features: z.array(z.number()).min(1).describe("Query feature vector"),
    use_cached: z.boolean().default(true).describe("Use cached adapted params if available"),
  }).describe("Predict with adapted or base model"),

  protomaml_cache_stats: z.object({}).describe("Get ProtoMAML adaptation cache statistics"),

  protomaml_clear_cache: z.object({
    customer_id: z.string().min(1).describe("Customer identifier"),
  }).describe("Clear cached adaptations for a customer"),

  protomaml_list_configs: z.object({}).describe("List registered ProtoMAML configurations"),

  // Ollama task offloading
  offload_decide: z.object({
    task: z.string().min(1).describe("Task description to classify"),
  }).describe("Decide if a task should be offloaded to local Ollama"),

  offload_execute: z.object({
    task: z.string().min(1).describe("Task to execute"),
    system_prompt: z.string().default("You are a helpful assistant for a CNC manufacturing platform.").describe("System prompt"),
    model: z.string().optional().describe("Specific model to use (auto-selects if omitted)"),
  }).describe("Execute a task on local Ollama"),

  offload_stats: z.object({}).describe("Get Ollama offload statistics"),
};

export const mlActionSchema = z.object({
  action: z.enum(ML_ACTIONS).describe("ML pipeline action"),
  params: z.record(z.string(), z.any()).optional().describe("Action parameters"),
});
