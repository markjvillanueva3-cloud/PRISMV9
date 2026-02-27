/**
 * PRISM MCP Server - Agent Registry
 * Manages 64+ AI agents for manufacturing intelligence
 * 
 * Agent Categories:
 * - Domain Experts (10): Manufacturing, Materials, CAD/CAM, etc.
 * - Task Agents (24): Extraction, Analysis, Validation, etc.
 * - Coordination Agents (6): Orchestrator, Router, Balancer, etc.
 * - Cognitive Agents (2): Reasoning, Learning
 * - Specialized Agents (22+): Controller-specific, process-specific
 */

import * as path from "path";
import * as fs from "fs/promises";
import { BaseRegistry, RegistryEntry } from "./base.js";
import { PATHS } from "../constants.js";
import { apiConfig } from "../config/api-config.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// TYPES
// ============================================================================

export interface AgentCapability {
  name: string;
  description: string;
  input_types: string[];
  output_types: string[];
  confidence: number;  // 0-1 confidence in this capability
}

export interface AgentDependency {
  agent_id: string;
  relationship: "requires" | "enhances" | "validates" | "coordinates";
  optional: boolean;
}

export interface AgentMetrics {
  avg_response_time_ms: number;
  success_rate: number;
  total_invocations: number;
  last_invoked?: string;
}

export interface Agent {
  agent_id: string;
  name: string;
  category: AgentCategory;
  description: string;
  version: string;
  
  // Capabilities
  capabilities: AgentCapability[];
  domains: string[];
  
  // Configuration
  config: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout_ms?: number;
    retry_count?: number;
  };
  
  // System prompt or behavior specification
  system_prompt?: string;
  behavior_spec?: {
    role: string;
    goals: string[];
    constraints: string[];
    output_format: string;
  };
  
  // Dependencies and relationships
  dependencies: AgentDependency[];
  consumers: string[];  // Agent IDs that use this agent
  
  // Metrics
  metrics?: AgentMetrics;
  
  // Status
  status: "active" | "inactive" | "deprecated" | "experimental";
  enabled: boolean;
  
  // Metadata
  created: string;
  updated: string;
  author?: string;
  tags?: string[];
}

export type AgentCategory = 
  | "domain_expert"
  | "task_agent"
  | "coordination"
  | "cognitive"
  | "specialized"
  | "validation"
  | "extraction"
  | "analysis";

// ============================================================================
// AGENT REGISTRY
// ============================================================================

export class AgentRegistry extends BaseRegistry<Agent> {
  private indexByCategory: Map<AgentCategory, Set<string>> = new Map();
  private indexByDomain: Map<string, Set<string>> = new Map();
  private indexByCapability: Map<string, Set<string>> = new Map();
  private indexByStatus: Map<string, Set<string>> = new Map();
  
  // Built-in agents (always available)
  private builtInAgents: Map<string, Agent> = new Map();

  constructor() {
    super("agents", path.join(PATHS.STATE_DIR, "agent-registry.json"), "1.0.0");
    this.initializeBuiltInAgents();
  }

  /**
   * Initialize built-in agents
   */
  private initializeBuiltInAgents(): void {
    const builtIns: Agent[] = [
      // Domain Experts
      {
        agent_id: "AGT-EXPERT-MATERIALS",
        name: "Materials Expert",
        category: "domain_expert",
        description: "Expert in material science, selection, and machining properties",
        version: "1.0.0",
        capabilities: [
          { name: "material_selection", description: "Select optimal material for application", input_types: ["requirements"], output_types: ["material_recommendation"], confidence: 0.95 },
          { name: "property_analysis", description: "Analyze material properties", input_types: ["material_id"], output_types: ["property_report"], confidence: 0.98 },
          { name: "machinability_assessment", description: "Assess material machinability", input_types: ["material_id", "operation"], output_types: ["machinability_score"], confidence: 0.92 }
        ],
        domains: ["materials", "metallurgy", "machining"],
        config: { model: apiConfig.sonnetModel, temperature: 0.3, max_tokens: 4096 },
        behavior_spec: {
          role: "Materials Science Expert",
          goals: ["Provide accurate material data", "Recommend optimal materials", "Explain material behavior"],
          constraints: ["Use verified data only", "Cite sources", "Consider safety"],
          output_format: "structured_json"
        },
        dependencies: [],
        consumers: ["AGT-TASK-SPEED-FEED", "AGT-TASK-TOOL-SELECT"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["expert", "materials", "core"]
      },
      {
        agent_id: "AGT-EXPERT-MACHINES",
        name: "Machine Expert",
        category: "domain_expert",
        description: "Expert in CNC machines, capabilities, and configurations",
        version: "1.0.0",
        capabilities: [
          { name: "machine_selection", description: "Select optimal machine for job", input_types: ["part_requirements"], output_types: ["machine_recommendation"], confidence: 0.93 },
          { name: "capability_analysis", description: "Analyze machine capabilities", input_types: ["machine_id"], output_types: ["capability_report"], confidence: 0.96 },
          { name: "setup_optimization", description: "Optimize machine setup", input_types: ["machine_id", "part"], output_types: ["setup_plan"], confidence: 0.88 }
        ],
        domains: ["machines", "cnc", "manufacturing"],
        config: { model: apiConfig.sonnetModel, temperature: 0.3, max_tokens: 4096 },
        behavior_spec: {
          role: "CNC Machine Expert",
          goals: ["Match jobs to machines", "Optimize setups", "Ensure capability fit"],
          constraints: ["Verify machine specs", "Consider limitations", "Safety first"],
          output_format: "structured_json"
        },
        dependencies: [],
        consumers: ["AGT-TASK-JOB-ROUTING", "AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["expert", "machines", "core"]
      },
      {
        agent_id: "AGT-EXPERT-TOOLING",
        name: "Tooling Expert",
        category: "domain_expert",
        description: "Expert in cutting tools, selection, and application",
        version: "1.0.0",
        capabilities: [
          { name: "tool_selection", description: "Select optimal cutting tool", input_types: ["material", "operation", "requirements"], output_types: ["tool_recommendation"], confidence: 0.94 },
          { name: "tool_life_prediction", description: "Predict tool life", input_types: ["tool_id", "conditions"], output_types: ["life_estimate"], confidence: 0.85 },
          { name: "wear_analysis", description: "Analyze tool wear patterns", input_types: ["wear_data"], output_types: ["wear_report"], confidence: 0.82 }
        ],
        domains: ["tooling", "cutting_tools", "machining"],
        config: { model: apiConfig.sonnetModel, temperature: 0.3, max_tokens: 4096 },
        behavior_spec: {
          role: "Cutting Tool Expert",
          goals: ["Optimize tool selection", "Maximize tool life", "Ensure quality"],
          constraints: ["Use verified data", "Consider all factors", "Safety priority"],
          output_format: "structured_json"
        },
        dependencies: ["AGT-EXPERT-MATERIALS"] as any,
        consumers: ["AGT-TASK-SPEED-FEED", "AGT-TASK-CAM"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["expert", "tooling", "core"]
      },
      
      // Task Agents
      {
        agent_id: "AGT-TASK-SPEED-FEED",
        name: "Speed & Feed Calculator",
        category: "task_agent",
        description: "Calculates optimal cutting speeds and feed rates",
        version: "1.0.0",
        capabilities: [
          { name: "calculate_speed_feed", description: "Calculate cutting parameters", input_types: ["material", "tool", "operation"], output_types: ["speed_feed_params"], confidence: 0.96 },
          { name: "optimize_parameters", description: "Optimize for specific goal", input_types: ["params", "goal"], output_types: ["optimized_params"], confidence: 0.91 }
        ],
        domains: ["calculations", "machining", "optimization"],
        config: { model: apiConfig.sonnetModel, temperature: 0.1, max_tokens: 2048 },
        dependencies: ["AGT-EXPERT-MATERIALS", "AGT-EXPERT-TOOLING"] as any,
        consumers: ["AGT-TASK-CAM", "AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["task", "calculation", "core"]
      },
      {
        agent_id: "AGT-TASK-ALARM-DECODE",
        name: "Alarm Decoder",
        category: "task_agent",
        description: "Decodes controller alarms and provides fix procedures",
        version: "1.0.0",
        capabilities: [
          { name: "decode_alarm", description: "Decode alarm code", input_types: ["alarm_code", "controller"], output_types: ["alarm_info"], confidence: 0.97 },
          { name: "suggest_fix", description: "Suggest fix procedure", input_types: ["alarm_id"], output_types: ["fix_procedure"], confidence: 0.89 },
          { name: "find_related", description: "Find related alarms", input_types: ["alarm_id"], output_types: ["related_alarms"], confidence: 0.85 }
        ],
        domains: ["alarms", "troubleshooting", "controllers"],
        config: { model: apiConfig.sonnetModel, temperature: 0.2, max_tokens: 2048 },
        dependencies: [],
        consumers: ["AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["task", "alarms", "core"]
      },
      
      // Coordination Agents
      {
        agent_id: "AGT-COORD-ORCHESTRATOR",
        name: "Task Orchestrator",
        category: "coordination",
        description: "Coordinates multi-agent tasks and workflows",
        version: "1.0.0",
        capabilities: [
          { name: "route_task", description: "Route task to appropriate agent", input_types: ["task"], output_types: ["agent_assignment"], confidence: 0.94 },
          { name: "coordinate_workflow", description: "Coordinate multi-step workflow", input_types: ["workflow"], output_types: ["execution_plan"], confidence: 0.90 },
          { name: "aggregate_results", description: "Aggregate results from multiple agents", input_types: ["results[]"], output_types: ["aggregated_result"], confidence: 0.95 }
        ],
        domains: ["orchestration", "coordination", "workflow"],
        config: { model: apiConfig.sonnetModel, temperature: 0.2, max_tokens: 4096 },
        dependencies: [],
        consumers: [],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["coordination", "orchestrator", "core"]
      },
      {
        agent_id: "AGT-COORD-VALIDATOR",
        name: "Result Validator",
        category: "validation",
        description: "Validates agent outputs and ensures quality",
        version: "1.0.0",
        capabilities: [
          { name: "validate_output", description: "Validate agent output", input_types: ["output", "schema"], output_types: ["validation_result"], confidence: 0.97 },
          { name: "check_consistency", description: "Check result consistency", input_types: ["results[]"], output_types: ["consistency_report"], confidence: 0.93 },
          { name: "verify_safety", description: "Verify safety constraints", input_types: ["params"], output_types: ["safety_assessment"], confidence: 0.98 }
        ],
        domains: ["validation", "quality", "safety"],
        config: { model: apiConfig.sonnetModel, temperature: 0.1, max_tokens: 2048 },
        dependencies: [],
        consumers: ["AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["validation", "quality", "core"]
      },
      
      // Cognitive Agents
      {
        agent_id: "AGT-COG-REASONING",
        name: "Reasoning Engine",
        category: "cognitive",
        description: "Applies multi-step reasoning and analysis",
        version: "1.0.0",
        capabilities: [
          { name: "analyze_problem", description: "Analyze complex problem", input_types: ["problem"], output_types: ["analysis"], confidence: 0.88 },
          { name: "generate_hypotheses", description: "Generate solution hypotheses", input_types: ["problem", "context"], output_types: ["hypotheses[]"], confidence: 0.85 },
          { name: "evaluate_options", description: "Evaluate solution options", input_types: ["options[]", "criteria"], output_types: ["evaluation"], confidence: 0.90 }
        ],
        domains: ["reasoning", "analysis", "decision_support"],
        config: { model: apiConfig.sonnetModel, temperature: 0.4, max_tokens: 8192 },
        dependencies: [],
        consumers: ["AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "reasoning", "core"]
      },
      {
        agent_id: "AGT-COG-LEARNING",
        name: "Learning Engine",
        category: "cognitive",
        description: "Learns from outcomes and improves recommendations",
        version: "1.0.0",
        capabilities: [
          { name: "learn_from_outcome", description: "Learn from task outcome", input_types: ["task", "outcome", "feedback"], output_types: ["learning_update"], confidence: 0.82 },
          { name: "update_model", description: "Update prediction models", input_types: ["data"], output_types: ["model_update"], confidence: 0.78 },
          { name: "suggest_improvement", description: "Suggest process improvements", input_types: ["history"], output_types: ["improvements[]"], confidence: 0.75 }
        ],
        domains: ["learning", "improvement", "adaptation"],
        config: { model: apiConfig.sonnetModel, temperature: 0.5, max_tokens: 4096 },
        dependencies: [],
        consumers: ["AGT-COORD-ORCHESTRATOR"],
        status: "active",
        enabled: true,
        created: "2026-01-01",
        updated: "2026-01-31",
        tags: ["cognitive", "learning", "core"]
      }
    ];

    for (const agent of builtIns) {
      this.builtInAgents.set(agent.agent_id, agent);
    }
    
    log.debug(`Initialized ${this.builtInAgents.size} built-in agents`);
  }

  /**
   * Load agents from files and merge with built-ins
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading AgentRegistry...");
    
    // Start with built-in agents
    for (const [id, agent] of this.builtInAgents) {
      this.set(id, agent);
    }
    
    // Load from agent definition files
    await this.loadFromPath(PATHS.AGENTS);
    
    this.buildIndexes();
    
    this.loaded = true;
    log.info(`AgentRegistry loaded: ${this.entries.size} agents`);
  }

  /**
   * Load agents from a directory
   */
  private async loadFromPath(basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Agents path does not exist: ${basePath}`);
        return;
      }
      
      const files = await listDirectory(basePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      for (const file of jsonFiles) {
        try {
          const filePath = file.path;
          const data = await readJsonFile<Agent | Agent[]>(filePath);
          
          const agents = Array.isArray(data) ? data : [data];
          
          for (const agent of agents) {
            if (agent.agent_id) {
              // Merge with built-in if exists
              const existing = this.builtInAgents.get(agent.agent_id);
              if (existing) {
                // File data overrides built-in
                this.set(agent.agent_id, { ...existing, ...agent });
              } else {
                this.set(agent.agent_id, agent);
              }
            }
          }
        } catch (err) {
          log.warn(`Failed to load agent file ${file}: ${err}`);
        }
      }
    } catch (err) {
      log.warn(`Failed to load agents: ${err}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByCategory.clear();
    this.indexByDomain.clear();
    this.indexByCapability.clear();
    this.indexByStatus.clear();
    
    for (const [id, entry] of this.entries) {
      const agent = entry.data;
      
      // Index by category
      if (!this.indexByCategory.has(agent.category)) {
        this.indexByCategory.set(agent.category, new Set());
      }
      this.indexByCategory.get(agent.category)?.add(id);
      
      // Index by domain
      for (const domain of agent.domains || []) {
        if (!this.indexByDomain.has(domain)) {
          this.indexByDomain.set(domain, new Set());
        }
        this.indexByDomain.get(domain)?.add(id);
      }
      
      // Index by capability
      for (const cap of agent.capabilities || []) {
        if (!this.indexByCapability.has(cap.name)) {
          this.indexByCapability.set(cap.name, new Set());
        }
        this.indexByCapability.get(cap.name)?.add(id);
      }
      
      // Index by status
      if (!this.indexByStatus.has(agent.status)) {
        this.indexByStatus.set(agent.status, new Set());
      }
      this.indexByStatus.get(agent.status)?.add(id);
    }
  }

  /**
   * Get agent by ID — checks entries (from load()) then builtInAgents fallback
   */
  override get(id: string): Agent | undefined {
    // entries (via base) are populated after load(), builtInAgents always available
    const fromBase = super.get(id);
    if (fromBase) return fromBase;
    return this.builtInAgents.get(id);
  }

  /**
   * Get agent by ID (alias)
   */
  getAgent(id: string): Agent | undefined {
    return this.get(id);
  }

  /**
   * Get agents by category
   */
  getByCategory(category: AgentCategory): Agent[] {
    const ids = this.indexByCategory.get(category) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get agents by domain
   */
  getByDomain(domain: string): Agent[] {
    const ids = this.indexByDomain.get(domain) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Find agents with a specific capability
   */
  findByCapability(capabilityName: string): Agent[] {
    const ids = this.indexByCapability.get(capabilityName) || new Set();
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get active agents only
   */
  getActive(): Agent[] {
    const ids = this.indexByStatus.get("active") || new Set();
    return Array.from(ids)
      .map(id => this.get(id)!)
      .filter(a => a && a.enabled);
  }

  /**
   * Search agents with filters
   */
  search(options: {
    query?: string;
    category?: AgentCategory;
    domain?: string;
    capability?: string;
    status?: string;
    enabled?: boolean;
    limit?: number;
    offset?: number;
  }): { agents: Agent[]; total: number; hasMore: boolean } {
    let results: Agent[] = [];
    
    // Start with category filter if specified
    if (options.category) {
      results = this.getByCategory(options.category);
    } else if (options.domain) {
      results = this.getByDomain(options.domain);
    } else if (options.capability) {
      results = this.findByCapability(options.capability);
    } else {
      results = this.all();
    }
    
    // Apply additional filters
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.agent_id.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query)
      );
    }
    
    if (options.status) {
      results = results.filter(a => a.status === options.status);
    }
    
    if (options.enabled !== undefined) {
      results = results.filter(a => a.enabled === options.enabled);
    }
    
    // Pagination
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      agents: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get agent capabilities for a specific task type
   */
  findAgentForTask(taskType: string): Agent | undefined {
    // Find agents with capability matching task type
    const agents = this.findByCapability(taskType);
    
    if (agents.length === 0) return undefined;
    
    // Return the active agent with highest confidence for this capability
    let best: Agent | undefined;
    let bestConfidence = 0;
    
    for (const agent of agents) {
      if (!agent.enabled || agent.status !== "active") continue;
      
      const cap = agent.capabilities.find(c => c.name === taskType);
      if (cap && cap.confidence > bestConfidence) {
        best = agent;
        bestConfidence = cap.confidence;
      }
    }
    
    return best;
  }

  /**
   * Get dependency graph for an agent
   */
  getDependencyGraph(agentId: string): { agent: Agent; dependencies: Agent[]; consumers: Agent[] } | undefined {
    const agent = this.get(agentId);
    if (!agent) return undefined;
    
    const dependencies = agent.dependencies
      .map(d => this.get(d.agent_id))
      .filter(Boolean) as Agent[];
    
    const consumers = agent.consumers
      .map(id => this.get(id))
      .filter(Boolean) as Agent[];
    
    return { agent, dependencies, consumers };
  }

  /**
   * Get statistics about agents
   */
  getStats(): {
    total: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    activeEnabled: number;
    totalCapabilities: number;
  } {
    const stats = {
      total: this.entries.size,
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      activeEnabled: 0,
      totalCapabilities: 0
    };
    
    for (const [category, ids] of this.indexByCategory) {
      stats.byCategory[category] = ids.size;
    }
    
    for (const [status, ids] of this.indexByStatus) {
      stats.byStatus[status] = ids.size;
    }
    
    for (const entry of this.entries.values()) {
      const a = entry.data;
      if (a.status === "active" && a.enabled) stats.activeEnabled++;
      stats.totalCapabilities += a.capabilities?.length || 0;
    }
    
    return stats;
  }
}

// Export singleton instance
export const agentRegistry = new AgentRegistry();

// Type alias for backward compat — AgentExecutor imports AgentDefinition
export type AgentDefinition = Agent;
