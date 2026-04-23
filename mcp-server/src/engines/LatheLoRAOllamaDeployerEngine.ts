/**
 * LatheLoRAOllamaDeployerEngine — LATHE-LORA-MS0 U-LLR21
 * ======================================================
 *
 * Deploys LatheLoRA models to Ollama for local inference.
 * Handles Modelfile generation, model creation, and deployment
 * verification.
 *
 * Features:
 *   - Modelfile generation from GGUF
 *   - Ollama model creation and registration
 *   - System prompt configuration
 *   - Parameter tuning (temperature, top_p, etc.)
 *   - Deployment verification
 *
 * @module engines/LatheLoRAOllamaDeployerEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Deployment status */
export type DeploymentStatus = "pending" | "building" | "ready" | "failed" | "removed";

/** Ollama model config */
export interface OllamaModelConfig {
  name: string;
  gguf_path: string;
  system_prompt?: string;
  template?: string;
  parameters?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    num_ctx?: number;
    num_predict?: number;
    stop?: string[];
  };
  license?: string;
  tags?: string[];
}

/** Deployed model info */
export interface DeployedModel {
  name: string;
  status: DeploymentStatus;
  gguf_path: string;
  created_at: number;
  size_bytes: number;
  modelfile: string;
  ollama_model_name: string;
  endpoint: string;
  parameters: Record<string, unknown>;
  metrics?: {
    load_time_ms?: number;
    first_token_ms?: number;
    tokens_per_second?: number;
    memory_usage_mb?: number;
  };
}

/** Deployment result */
export interface DeploymentResult {
  success: boolean;
  model_name: string;
  ollama_name: string;
  status: DeploymentStatus;
  modelfile: string;
  commands: string[];
  verification?: {
    loaded: boolean;
    responsive: boolean;
    sample_output?: string;
  };
  error?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default LatheLoRA system prompt */
const DEFAULT_SYSTEM_PROMPT = `You are LatheLoRA, an expert CNC lathe programming assistant fine-tuned for Okuma lathe G-code generation.

You specialize in:
- Speed and feed calculations using Kienzle cutting force model
- Tool life prediction using Taylor equation
- Safe G-code generation with proper G50 spindle clamps
- Physics-validated turning parameters
- JM Die Company machining practices

Always:
1. Validate cutting parameters against material and tool limits
2. Include safety considerations (spindle limits, collision avoidance)
3. Reference physics principles when making recommendations
4. Use proper units (SFM, IPR, RPM)
5. Explain your reasoning`;

/** Default template for lathe operations */
const DEFAULT_TEMPLATE = `{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
{{ end }}<|assistant|>
{{ .Response }}<|end|>`;

/** Default parameters */
const DEFAULT_PARAMETERS = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  repeat_penalty: 1.1,
  num_ctx: 4096,
  num_predict: 2048,
  stop: ["<|end|>", "<|user|>", "<|system|>"],
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAOllamaDeployerEngine {
  private deployments: Map<string, DeployedModel> = new Map();
  private ollamaEndpoint: string = "http://localhost:11434";

  /**
   * Set Ollama endpoint
   */
  setEndpoint(endpoint: string): void {
    this.ollamaEndpoint = endpoint;
  }

  /**
   * Get Ollama endpoint
   */
  getEndpoint(): string {
    return this.ollamaEndpoint;
  }

  /**
   * Generate Modelfile for Ollama
   */
  generateModelfile(config: OllamaModelConfig): string {
    const lines: string[] = [];

    // Base model from GGUF
    lines.push(`FROM ${config.gguf_path}`);
    lines.push("");

    // Template
    if (config.template) {
      lines.push(`TEMPLATE """${config.template}"""`);
    } else {
      lines.push(`TEMPLATE """${DEFAULT_TEMPLATE}"""`);
    }
    lines.push("");

    // System prompt
    const systemPrompt = config.system_prompt || DEFAULT_SYSTEM_PROMPT;
    lines.push(`SYSTEM """${systemPrompt}"""`);
    lines.push("");

    // Parameters
    const params = { ...DEFAULT_PARAMETERS, ...config.parameters };
    lines.push(`PARAMETER temperature ${params.temperature}`);
    lines.push(`PARAMETER top_p ${params.top_p}`);
    lines.push(`PARAMETER top_k ${params.top_k}`);
    lines.push(`PARAMETER repeat_penalty ${params.repeat_penalty}`);
    lines.push(`PARAMETER num_ctx ${params.num_ctx}`);
    lines.push(`PARAMETER num_predict ${params.num_predict}`);

    if (params.stop && params.stop.length > 0) {
      for (const stop of params.stop) {
        lines.push(`PARAMETER stop "${stop}"`);
      }
    }

    // License
    if (config.license) {
      lines.push("");
      lines.push(`LICENSE """${config.license}"""`);
    }

    return lines.join("\n");
  }

  /**
   * Prepare deployment (generates modelfile and commands)
   */
  prepareDeployment(config: OllamaModelConfig): DeploymentResult {
    const ollamaName = this.sanitizeModelName(config.name);
    const modelfile = this.generateModelfile(config);

    const commands = [
      `# Save Modelfile`,
      `cat > Modelfile.${ollamaName} << 'EOF'`,
      modelfile,
      `EOF`,
      ``,
      `# Create model in Ollama`,
      `ollama create ${ollamaName} -f Modelfile.${ollamaName}`,
      ``,
      `# Verify model is available`,
      `ollama list | grep ${ollamaName}`,
      ``,
      `# Test inference`,
      `ollama run ${ollamaName} "What is the recommended surface speed for 4140 steel?"`,
    ];

    return {
      success: true,
      model_name: config.name,
      ollama_name: ollamaName,
      status: "pending",
      modelfile,
      commands,
    };
  }

  /**
   * Register deployed model
   */
  registerDeployment(
    config: OllamaModelConfig,
    result: Partial<DeploymentResult>
  ): DeployedModel {
    const ollamaName = this.sanitizeModelName(config.name);
    const modelfile = this.generateModelfile(config);

    const deployment: DeployedModel = {
      name: config.name,
      status: result.status || "ready",
      gguf_path: config.gguf_path,
      created_at: Date.now(),
      size_bytes: 0, // Would be filled by actual file check
      modelfile,
      ollama_model_name: ollamaName,
      endpoint: `${this.ollamaEndpoint}/api/generate`,
      parameters: { ...DEFAULT_PARAMETERS, ...config.parameters },
    };

    this.deployments.set(config.name, deployment);
    log.info(`Registered deployment: ${config.name} as ${ollamaName}`);

    return deployment;
  }

  /**
   * Get deployment by name
   */
  getDeployment(name: string): DeployedModel | undefined {
    return this.deployments.get(name);
  }

  /**
   * List all deployments
   */
  listDeployments(): DeployedModel[] {
    return Array.from(this.deployments.values());
  }

  /**
   * Generate inference request
   */
  generateInferenceRequest(
    modelName: string,
    prompt: string,
    options: {
      stream?: boolean;
      temperature?: number;
      max_tokens?: number;
    } = {}
  ): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  } {
    const deployment = this.deployments.get(modelName);
    const ollamaName = deployment?.ollama_model_name || this.sanitizeModelName(modelName);

    return {
      url: `${this.ollamaEndpoint}/api/generate`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        model: ollamaName,
        prompt,
        stream: options.stream ?? false,
        options: {
          temperature: options.temperature ?? 0.7,
          num_predict: options.max_tokens ?? 2048,
        },
      },
    };
  }

  /**
   * Generate chat request (multi-turn)
   */
  generateChatRequest(
    modelName: string,
    messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
    options: {
      stream?: boolean;
      temperature?: number;
    } = {}
  ): {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: Record<string, unknown>;
  } {
    const deployment = this.deployments.get(modelName);
    const ollamaName = deployment?.ollama_model_name || this.sanitizeModelName(modelName);

    return {
      url: `${this.ollamaEndpoint}/api/chat`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: {
        model: ollamaName,
        messages,
        stream: options.stream ?? false,
        options: {
          temperature: options.temperature ?? 0.7,
        },
      },
    };
  }

  /**
   * Generate verification test
   */
  generateVerificationTest(modelName: string): {
    prompts: Array<{ prompt: string; expected_contains: string[] }>;
    curl_commands: string[];
  } {
    const deployment = this.deployments.get(modelName);
    const ollamaName = deployment?.ollama_model_name || this.sanitizeModelName(modelName);

    const prompts = [
      {
        prompt: "What is the recommended surface speed for roughing 4140 steel with carbide?",
        expected_contains: ["SFM", "400", "steel", "carbide"],
      },
      {
        prompt: "Generate G-code for facing a 2 inch diameter part.",
        expected_contains: ["G50", "G96", "G01", "X"],
      },
      {
        prompt: "What safety checks should I perform before a turning operation?",
        expected_contains: ["spindle", "clearance", "tool"],
      },
    ];

    const curl_commands = prompts.map((p, i) =>
      `# Test ${i + 1}: ${p.prompt.substring(0, 40)}...
curl -X POST ${this.ollamaEndpoint}/api/generate \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${ollamaName}", "prompt": "${p.prompt.replace(/'/g, "'\\''")}", "stream": false}'`
    );

    return { prompts, curl_commands };
  }

  /**
   * Update deployment metrics
   */
  updateMetrics(
    name: string,
    metrics: Partial<DeployedModel["metrics"]>
  ): boolean {
    const deployment = this.deployments.get(name);
    if (!deployment) return false;

    deployment.metrics = { ...deployment.metrics, ...metrics };
    return true;
  }

  /**
   * Mark deployment as failed
   */
  markFailed(name: string, error: string): boolean {
    const deployment = this.deployments.get(name);
    if (!deployment) return false;

    deployment.status = "failed";
    log.error(`Deployment failed: ${name} — ${error}`);
    return true;
  }

  /**
   * Remove deployment
   */
  removeDeployment(name: string): {
    success: boolean;
    commands: string[];
  } {
    const deployment = this.deployments.get(name);
    if (!deployment) {
      return { success: false, commands: [] };
    }

    const commands = [
      `# Remove model from Ollama`,
      `ollama rm ${deployment.ollama_model_name}`,
      ``,
      `# Verify removal`,
      `ollama list | grep ${deployment.ollama_model_name} && echo "WARNING: Model still exists" || echo "Model removed successfully"`,
    ];

    deployment.status = "removed";
    this.deployments.delete(name);

    return { success: true, commands };
  }

  /**
   * Generate Docker deployment config
   */
  generateDockerConfig(
    modelNames: string[]
  ): string {
    const models = modelNames.map(n => this.deployments.get(n)).filter(Boolean) as DeployedModel[];

    const volumes = models.map(m => `      - ${m.gguf_path}:/models/${m.ollama_model_name}.gguf:ro`);
    const createCommands = models.map(m => `echo "Creating ${m.ollama_model_name}..." && ollama create ${m.ollama_model_name} -f /modelfiles/Modelfile.${m.ollama_model_name}`);

    return `version: '3.8'

services:
  ollama:
    image: ollama/ollama:latest
    container_name: lathe-lora-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
${volumes.join("\n")}
    environment:
      - OLLAMA_KEEP_ALIVE=24h
      - OLLAMA_NUM_PARALLEL=2
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:11434/api/tags"]
      interval: 30s
      timeout: 10s
      retries: 3
    entrypoint: ["/bin/bash", "-c"]
    command:
      - |
        ollama serve &
        sleep 5
        ${createCommands.join(" && ")}
        wait

volumes:
  ollama_data:
`;
  }

  /**
   * Sanitize model name for Ollama
   */
  private sanitizeModelName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  /**
   * Get deployment summary
   */
  getSummary(): string {
    const deployments = this.listDeployments();
    const ready = deployments.filter(d => d.status === "ready").length;
    const failed = deployments.filter(d => d.status === "failed").length;

    return [
      `LatheLoRA Ollama Deployments`,
      `============================`,
      `Total: ${deployments.length}`,
      `Ready: ${ready}`,
      `Failed: ${failed}`,
      `Endpoint: ${this.ollamaEndpoint}`,
      ``,
      ...deployments.map(d =>
        `[${d.status.toUpperCase()}] ${d.name} → ${d.ollama_model_name}`
      ),
    ].join("\n");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.deployments.clear();
    this.ollamaEndpoint = "http://localhost:11434";
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAOllamaDeployerEngine = new LatheLoRAOllamaDeployerEngine();
