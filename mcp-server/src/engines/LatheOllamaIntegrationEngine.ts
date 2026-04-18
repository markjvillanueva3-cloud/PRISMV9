/**
 * LatheOllamaIntegrationEngine — Ollama Deployment
 *
 * U-LTH73: Deploys fine-tuned LatheLoRA models to Ollama for local inference.
 * Generates Modelfiles, manages model lifecycle, and provides inference API.
 *
 * @module engines/LatheOllamaIntegrationEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OllamaConfig {
  model_name: string;
  gguf_path: string;
  base_model?: string;
  system_prompt: string;
  temperature: number;
  top_p: number;
  top_k: number;
  num_ctx: number;
  num_predict: number;
  stop_sequences: string[];
  ollama_host: string;
}

export interface ModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

export interface GenerateRequest {
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  options?: Partial<OllamaConfig>;
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface InferenceResult {
  gcode: string;
  tokens_generated: number;
  inference_time_ms: number;
  tokens_per_second: number;
  model: string;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are LatheLoRA, an AI assistant specialized in generating Okuma lathe G-code programs.

Rules:
1. Always start with O-number (O0001)
2. Include safe start (G28 U0 W0)
3. Declare spindle speed before M03
4. Use G96 for constant surface speed or G97 for constant RPM
5. End with G28 U0 W0 and M30
6. Follow JM Die company conventions

Generate valid .MIN G-code that can run on an Okuma LB3000.`;

const DEFAULT_CONFIG: OllamaConfig = {
  model_name: "lathe-lora",
  gguf_path: "models/lathe-merged/lathe-lora-q4_k_m.gguf",
  system_prompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.3,
  top_p: 0.9,
  top_k: 40,
  num_ctx: 4096,
  num_predict: 1024,
  stop_sequences: ["M30", "### Instruction:", "### Input:"],
  ollama_host: "http://localhost:11434",
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheOllamaIntegrationEngine {
  private config: OllamaConfig = { ...DEFAULT_CONFIG };

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<OllamaConfig>): OllamaConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): OllamaConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Modelfile Generation
  // --------------------------------------------------------------------------

  generateModelfile(): string {
    const c = this.config;

    const lines: string[] = [];

    if (c.base_model) {
      lines.push(`FROM ${c.base_model}`);
    } else {
      lines.push(`FROM ${c.gguf_path}`);
    }

    lines.push("");
    lines.push("# System prompt");
    lines.push(`SYSTEM """${c.system_prompt}"""`);

    lines.push("");
    lines.push("# Parameters");
    lines.push(`PARAMETER temperature ${c.temperature}`);
    lines.push(`PARAMETER top_p ${c.top_p}`);
    lines.push(`PARAMETER top_k ${c.top_k}`);
    lines.push(`PARAMETER num_ctx ${c.num_ctx}`);
    lines.push(`PARAMETER num_predict ${c.num_predict}`);

    for (const stop of c.stop_sequences) {
      lines.push(`PARAMETER stop "${stop}"`);
    }

    lines.push("");
    lines.push("# Template");
    lines.push(`TEMPLATE """{{ if .System }}<|system|>
{{ .System }}<|end|>
{{ end }}{{ if .Prompt }}<|user|>
{{ .Prompt }}<|end|>
<|assistant|>
{{ end }}{{ .Response }}"""`);

    lines.push("");
    lines.push("# License");
    lines.push(`LICENSE """LatheLoRA - JM Die Company Training
Fine-tuned on proprietary lathe programs.
For internal use only."""`);

    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // CLI Commands
  // --------------------------------------------------------------------------

  getCreateCommand(): string {
    return `ollama create ${this.config.model_name} -f Modelfile`;
  }

  getRunCommand(): string {
    return `ollama run ${this.config.model_name}`;
  }

  getListCommand(): string {
    return "ollama list";
  }

  getShowCommand(): string {
    return `ollama show ${this.config.model_name}`;
  }

  getDeleteCommand(): string {
    return `ollama rm ${this.config.model_name}`;
  }

  getPullCommand(model: string): string {
    return `ollama pull ${model}`;
  }

  // --------------------------------------------------------------------------
  // API URL Generation
  // --------------------------------------------------------------------------

  getApiUrl(endpoint: string): string {
    return `${this.config.ollama_host}/api/${endpoint}`;
  }

  // --------------------------------------------------------------------------
  // Request Building
  // --------------------------------------------------------------------------

  buildGenerateRequest(
    instruction: string,
    input?: string
  ): GenerateRequest {
    let prompt = `### Instruction:\n${instruction}`;

    if (input) {
      prompt += `\n\n### Input:\n${input}`;
    }

    prompt += "\n\n### Response:\n";

    return {
      prompt,
      stream: false,
      options: {
        temperature: this.config.temperature,
        top_p: this.config.top_p,
        top_k: this.config.top_k,
        num_predict: this.config.num_predict,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Response Parsing
  // --------------------------------------------------------------------------

  parseResponse(response: GenerateResponse): InferenceResult {
    const evalDuration = response.eval_duration || 1;
    const evalCount = response.eval_count || 0;

    return {
      gcode: this.cleanGCode(response.response),
      tokens_generated: evalCount,
      inference_time_ms: Math.round(evalDuration / 1_000_000),
      tokens_per_second: evalCount / (evalDuration / 1_000_000_000),
      model: response.model,
    };
  }

  private cleanGCode(raw: string): string {
    let gcode = raw.trim();

    for (const stop of this.config.stop_sequences) {
      if (gcode.includes(stop) && stop !== "M30") {
        gcode = gcode.split(stop)[0];
      }
    }

    if (!gcode.includes("M30") && !gcode.endsWith("M30")) {
      gcode += "\nM30";
    }

    return gcode.trim();
  }

  // --------------------------------------------------------------------------
  // cURL Examples
  // --------------------------------------------------------------------------

  getCurlGenerate(prompt: string): string {
    const request = this.buildGenerateRequest(prompt);

    return `curl -X POST ${this.getApiUrl("generate")} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
      model: this.config.model_name,
      ...request,
    }, null, 2).replace(/'/g, "'\\''")}'`;
  }

  getCurlList(): string {
    return `curl ${this.getApiUrl("tags")}`;
  }

  getCurlShow(): string {
    return `curl -X POST ${this.getApiUrl("show")} \\
  -d '{"name": "${this.config.model_name}"}'`;
  }

  // --------------------------------------------------------------------------
  // Python Client
  // --------------------------------------------------------------------------

  generatePythonClient(): string {
    const c = this.config;

    return `#!/usr/bin/env python3
"""
LatheLoRA Ollama Client

Generated by LatheOllamaIntegrationEngine (U-LTH73)
"""

import requests
from typing import Optional

OLLAMA_HOST = "${c.ollama_host}"
MODEL_NAME = "${c.model_name}"

def generate(
    instruction: str,
    input_text: Optional[str] = None,
    temperature: float = ${c.temperature},
    max_tokens: int = ${c.num_predict},
) -> dict:
    """Generate G-code from instruction."""

    prompt = f"### Instruction:\\n{instruction}"
    if input_text:
        prompt += f"\\n\\n### Input:\\n{input_text}"
    prompt += "\\n\\n### Response:\\n"

    response = requests.post(
        f"{OLLAMA_HOST}/api/generate",
        json={
            "model": MODEL_NAME,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
            },
        },
    )
    response.raise_for_status()
    return response.json()


def list_models() -> list:
    """List available models."""
    response = requests.get(f"{OLLAMA_HOST}/api/tags")
    response.raise_for_status()
    return response.json().get("models", [])


def model_info() -> dict:
    """Get model info."""
    response = requests.post(
        f"{OLLAMA_HOST}/api/show",
        json={"name": MODEL_NAME},
    )
    response.raise_for_status()
    return response.json()


if __name__ == "__main__":
    result = generate(
        instruction="Generate an Okuma lathe program for ALCOA.",
        input_text="Customer: ALCOA\\nMaterial: 6061\\nOperations: roughing, finishing",
    )
    print(result["response"])
`;
  }

  // --------------------------------------------------------------------------
  // Deployment Script
  // --------------------------------------------------------------------------

  generateDeployScript(): string {
    return `#!/usr/bin/env bash
# LatheLoRA Ollama Deployment Script
# Generated by LatheOllamaIntegrationEngine (U-LTH73)

set -e

MODEL_NAME="${this.config.model_name}"
GGUF_PATH="${this.config.gguf_path}"
MODELFILE="Modelfile"

echo "=== LatheLoRA Ollama Deployment ==="
echo ""

# Check if Ollama is running
if ! curl -s ${this.config.ollama_host}/api/tags > /dev/null 2>&1; then
    echo "Error: Ollama is not running at ${this.config.ollama_host}"
    echo "Start Ollama with: ollama serve"
    exit 1
fi

# Check if GGUF exists
if [ ! -f "$GGUF_PATH" ]; then
    echo "Error: GGUF file not found: $GGUF_PATH"
    exit 1
fi

# Generate Modelfile
echo "Generating Modelfile..."
cat > "$MODELFILE" << 'EOF'
${this.generateModelfile()}
EOF

# Create model
echo "Creating model: $MODEL_NAME"
ollama create "$MODEL_NAME" -f "$MODELFILE"

# Verify
echo ""
echo "Verifying model..."
ollama show "$MODEL_NAME" --modelfile

echo ""
echo "=== Deployment Complete ==="
echo "Run with: ollama run $MODEL_NAME"
`;
  }

  // --------------------------------------------------------------------------
  // Validation
  // --------------------------------------------------------------------------

  validateConfig(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.model_name || !/^[a-z0-9_-]+$/.test(this.config.model_name)) {
      errors.push("model_name must be lowercase alphanumeric with hyphens/underscores");
    }

    if (!this.config.gguf_path && !this.config.base_model) {
      errors.push("Either gguf_path or base_model is required");
    }

    if (this.config.num_ctx < 512) {
      warnings.push("num_ctx < 512 may limit G-code generation quality");
    }

    if (this.config.temperature > 0.7) {
      warnings.push("temperature > 0.7 may produce invalid G-code");
    }

    if (this.config.stop_sequences.length === 0) {
      warnings.push("No stop sequences defined - generation may not terminate cleanly");
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  getHealthCheckScript(): string {
    return `#!/usr/bin/env bash
# LatheLoRA Ollama Health Check

OLLAMA_HOST="${this.config.ollama_host}"
MODEL_NAME="${this.config.model_name}"

echo "Checking Ollama at $OLLAMA_HOST..."

# Check server
if curl -s "$OLLAMA_HOST/api/tags" > /dev/null 2>&1; then
    echo "✓ Ollama server is running"
else
    echo "✗ Ollama server not reachable"
    exit 1
fi

# Check model
if ollama list | grep -q "$MODEL_NAME"; then
    echo "✓ Model $MODEL_NAME is loaded"
else
    echo "✗ Model $MODEL_NAME not found"
    exit 1
fi

# Test generation
echo "Testing generation..."
RESULT=$(curl -s -X POST "$OLLAMA_HOST/api/generate" \\
    -d '{"model":"'"$MODEL_NAME"'","prompt":"O0001","stream":false,"options":{"num_predict":10}}')

if echo "$RESULT" | grep -q "response"; then
    echo "✓ Generation test passed"
else
    echo "✗ Generation test failed"
    exit 1
fi

echo ""
echo "All health checks passed!"
`;
  }
}

export const latheOllamaIntegrationEngine = new LatheOllamaIntegrationEngine();
