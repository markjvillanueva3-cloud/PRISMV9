/**
 * LatheLoRAEvalHarnessEngine — Evaluation Harness
 *
 * U-LTH71: Evaluates fine-tuned LoRA models on lathe G-code generation.
 * Metrics: structural validity, syntax correctness, semantic accuracy.
 *
 * @module engines/LatheLoRAEvalHarnessEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface EvalConfig {
  model_path: string;
  eval_dataset_path: string;
  output_path: string;
  max_samples: number;
  temperature: number;
  top_p: number;
  max_new_tokens: number;
  batch_size: number;
}

export interface GCodeMetrics {
  has_program_number: boolean;
  has_program_end: boolean;
  has_safe_start: boolean;
  has_home_return: boolean;
  valid_g_codes: number;
  invalid_g_codes: number;
  valid_m_codes: number;
  invalid_m_codes: number;
  tool_count: number;
  operation_count: number;
  line_count: number;
}

export interface EvalSample {
  instruction: string;
  input: string;
  expected: string;
  generated: string;
  metrics: GCodeMetrics;
  scores: {
    structural: number;
    syntax: number;
    semantic: number;
    overall: number;
  };
  latency_ms: number;
}

export interface EvalReport {
  model_path: string;
  dataset_path: string;
  timestamp: string;
  samples_evaluated: number;
  aggregate_scores: {
    structural: { mean: number; std: number; min: number; max: number };
    syntax: { mean: number; std: number; min: number; max: number };
    semantic: { mean: number; std: number; min: number; max: number };
    overall: { mean: number; std: number; min: number; max: number };
  };
  pass_rates: {
    has_program_number: number;
    has_program_end: number;
    has_safe_start: number;
    has_home_return: number;
    valid_structure: number;
  };
  latency: {
    mean_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  };
  samples: EvalSample[];
}

// ============================================================================
// VALID CODES
// ============================================================================

const VALID_G_CODES = new Set([
  "G00", "G01", "G02", "G03", "G04",
  "G10", "G17", "G18", "G19", "G20", "G21",
  "G28", "G30", "G32", "G33",
  "G40", "G41", "G42", "G43", "G49",
  "G50", "G53", "G54", "G55", "G56", "G57", "G58", "G59",
  "G70", "G71", "G72", "G73", "G74", "G75", "G76",
  "G80", "G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89",
  "G90", "G91", "G92", "G94", "G95", "G96", "G97", "G98", "G99",
  "G0", "G1", "G2", "G3", "G4",
]);

const VALID_M_CODES = new Set([
  "M00", "M01", "M02", "M03", "M04", "M05", "M06", "M08", "M09",
  "M10", "M11", "M19",
  "M30", "M98", "M99",
  "M0", "M1", "M2", "M3", "M4", "M5", "M6", "M8", "M9",
]);

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: EvalConfig = {
  model_path: "models/lathe-lora/final",
  eval_dataset_path: "data/training/lathe-lora-eval.jsonl",
  output_path: "data/eval",
  max_samples: 100,
  temperature: 0.3,
  top_p: 0.9,
  max_new_tokens: 1024,
  batch_size: 1,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheLoRAEvalHarnessEngine {
  private config: EvalConfig = { ...DEFAULT_CONFIG };

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<EvalConfig>): EvalConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): EvalConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // G-Code Analysis
  // --------------------------------------------------------------------------

  analyzeGCode(content: string): GCodeMetrics {
    const lines = content.toUpperCase().split("\n");

    let validGCodes = 0;
    let invalidGCodes = 0;
    let validMCodes = 0;
    let invalidMCodes = 0;
    const tools = new Set<string>();
    const operations = new Set<string>();

    for (const line of lines) {
      const gMatches = line.match(/G\d+/g) || [];
      for (const g of gMatches) {
        if (VALID_G_CODES.has(g)) {
          validGCodes++;
          if (["G71", "G72", "G70", "G76", "G75", "G74", "G83", "G84"].includes(g)) {
            operations.add(g);
          }
        } else {
          invalidGCodes++;
        }
      }

      const mMatches = line.match(/M\d+/g) || [];
      for (const m of mMatches) {
        if (VALID_M_CODES.has(m)) {
          validMCodes++;
        } else {
          invalidMCodes++;
        }
      }

      const toolMatches = line.match(/T\d{2,4}/g) || [];
      for (const t of toolMatches) {
        tools.add(t);
      }
    }

    return {
      has_program_number: /O\d{4}/.test(content),
      has_program_end: /M30|M02/.test(content.toUpperCase()),
      has_safe_start: /G28|G53/.test(content.toUpperCase()),
      has_home_return: this.hasHomeBeforeEnd(lines),
      valid_g_codes: validGCodes,
      invalid_g_codes: invalidGCodes,
      valid_m_codes: validMCodes,
      invalid_m_codes: invalidMCodes,
      tool_count: tools.size,
      operation_count: operations.size,
      line_count: lines.filter(l => l.trim()).length,
    };
  }

  private hasHomeBeforeEnd(lines: string[]): boolean {
    let lastHomeIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("G28") || lines[i].includes("G53")) {
        lastHomeIndex = i;
      }
      if (lines[i].includes("M30") || lines[i].includes("M02")) {
        endIndex = i;
      }
    }

    return lastHomeIndex >= 0 && endIndex >= 0 && lastHomeIndex < endIndex;
  }

  // --------------------------------------------------------------------------
  // Scoring
  // --------------------------------------------------------------------------

  scoreStructural(metrics: GCodeMetrics): number {
    let score = 100;

    if (!metrics.has_program_number) score -= 15;
    if (!metrics.has_program_end) score -= 20;
    if (!metrics.has_safe_start) score -= 10;
    if (!metrics.has_home_return) score -= 10;

    if (metrics.line_count < 10) score -= 20;
    if (metrics.tool_count === 0) score -= 15;

    return Math.max(0, Math.min(100, score));
  }

  scoreSyntax(metrics: GCodeMetrics): number {
    const totalCodes = metrics.valid_g_codes + metrics.invalid_g_codes +
                       metrics.valid_m_codes + metrics.invalid_m_codes;

    if (totalCodes === 0) return 0;

    const validRatio = (metrics.valid_g_codes + metrics.valid_m_codes) / totalCodes;
    return Math.round(validRatio * 100);
  }

  scoreSemantic(generated: string, expected: string): number {
    const genOps = this.extractOperations(generated);
    const expOps = this.extractOperations(expected);

    if (expOps.size === 0) return 100;

    let matches = 0;
    for (const op of genOps) {
      if (expOps.has(op)) matches++;
    }

    const precision = genOps.size > 0 ? matches / genOps.size : 0;
    const recall = matches / expOps.size;

    if (precision + recall === 0) return 0;
    const f1 = (2 * precision * recall) / (precision + recall);

    return Math.round(f1 * 100);
  }

  private extractOperations(content: string): Set<string> {
    const ops = new Set<string>();
    const upper = content.toUpperCase();

    if (upper.includes("G71") || upper.includes("G72")) ops.add("roughing");
    if (upper.includes("G70")) ops.add("finishing");
    if (upper.includes("G76") || upper.includes("G32") || upper.includes("G33")) ops.add("threading");
    if (upper.includes("G75") || upper.includes("G74")) ops.add("grooving");
    if (upper.includes("G83") || upper.includes("G84")) ops.add("drilling");

    return ops;
  }

  // --------------------------------------------------------------------------
  // Sample Evaluation
  // --------------------------------------------------------------------------

  evaluateSample(
    instruction: string,
    input: string,
    expected: string,
    generated: string,
    latencyMs: number
  ): EvalSample {
    const metrics = this.analyzeGCode(generated);

    const structuralScore = this.scoreStructural(metrics);
    const syntaxScore = this.scoreSyntax(metrics);
    const semanticScore = this.scoreSemantic(generated, expected);

    const overall = Math.round(
      structuralScore * 0.3 + syntaxScore * 0.4 + semanticScore * 0.3
    );

    return {
      instruction,
      input,
      expected,
      generated,
      metrics,
      scores: {
        structural: structuralScore,
        syntax: syntaxScore,
        semantic: semanticScore,
        overall,
      },
      latency_ms: latencyMs,
    };
  }

  // --------------------------------------------------------------------------
  // Report Generation
  // --------------------------------------------------------------------------

  generateReport(samples: EvalSample[]): EvalReport {
    const structural = samples.map(s => s.scores.structural);
    const syntax = samples.map(s => s.scores.syntax);
    const semantic = samples.map(s => s.scores.semantic);
    const overall = samples.map(s => s.scores.overall);
    const latencies = samples.map(s => s.latency_ms);

    return {
      model_path: this.config.model_path,
      dataset_path: this.config.eval_dataset_path,
      timestamp: new Date().toISOString(),
      samples_evaluated: samples.length,
      aggregate_scores: {
        structural: this.computeStats(structural),
        syntax: this.computeStats(syntax),
        semantic: this.computeStats(semantic),
        overall: this.computeStats(overall),
      },
      pass_rates: {
        has_program_number: samples.filter(s => s.metrics.has_program_number).length / samples.length,
        has_program_end: samples.filter(s => s.metrics.has_program_end).length / samples.length,
        has_safe_start: samples.filter(s => s.metrics.has_safe_start).length / samples.length,
        has_home_return: samples.filter(s => s.metrics.has_home_return).length / samples.length,
        valid_structure: samples.filter(s => s.scores.structural >= 70).length / samples.length,
      },
      latency: this.computeLatencyStats(latencies),
      samples,
    };
  }

  private computeStats(values: number[]): { mean: number; std: number; min: number; max: number } {
    if (values.length === 0) {
      return { mean: 0, std: 0, min: 0, max: 0 };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);

    return {
      mean: Math.round(mean * 100) / 100,
      std: Math.round(std * 100) / 100,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  }

  private computeLatencyStats(latencies: number[]): {
    mean_ms: number;
    p50_ms: number;
    p95_ms: number;
    p99_ms: number;
  } {
    if (latencies.length === 0) {
      return { mean_ms: 0, p50_ms: 0, p95_ms: 0, p99_ms: 0 };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    return {
      mean_ms: Math.round(mean),
      p50_ms: sorted[Math.floor(sorted.length * 0.5)],
      p95_ms: sorted[Math.floor(sorted.length * 0.95)],
      p99_ms: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  // --------------------------------------------------------------------------
  // Evaluation Script Generation
  // --------------------------------------------------------------------------

  generateEvalScript(): string {
    const c = this.config;

    return `#!/usr/bin/env python3
"""
LatheLoRA Evaluation Script

Generated by LatheLoRAEvalHarnessEngine (U-LTH71)
Model: ${c.model_path}
Dataset: ${c.eval_dataset_path}
"""

import json
import time
from pathlib import Path
from unsloth import FastLanguageModel
from datasets import load_dataset

# Configuration
CONFIG = {
    "model_path": "${c.model_path}",
    "eval_dataset_path": "${c.eval_dataset_path}",
    "output_path": "${c.output_path}",
    "max_samples": ${c.max_samples},
    "temperature": ${c.temperature},
    "top_p": ${c.top_p},
    "max_new_tokens": ${c.max_new_tokens},
}

PROMPT_TEMPLATE = """### Instruction:
{instruction}

### Input:
{input}

### Response:
"""

def load_model():
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=CONFIG["model_path"],
        max_seq_length=2048,
        dtype=None,
        load_in_4bit=True,
    )
    FastLanguageModel.for_inference(model)
    return model, tokenizer

def generate(model, tokenizer, instruction: str, input_text: str) -> tuple[str, float]:
    prompt = PROMPT_TEMPLATE.format(instruction=instruction, input=input_text)
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda")

    start = time.time()
    outputs = model.generate(
        **inputs,
        max_new_tokens=CONFIG["max_new_tokens"],
        temperature=CONFIG["temperature"],
        top_p=CONFIG["top_p"],
        do_sample=True,
    )
    latency = (time.time() - start) * 1000

    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    generated = response.split("### Response:")[-1].strip()
    return generated, latency

def main():
    print(f"Loading model from {CONFIG['model_path']}...")
    model, tokenizer = load_model()

    print(f"Loading dataset from {CONFIG['eval_dataset_path']}...")
    dataset = load_dataset("json", data_files=CONFIG["eval_dataset_path"], split="train")

    samples = []
    for i, example in enumerate(dataset):
        if i >= CONFIG["max_samples"]:
            break

        generated, latency = generate(
            model, tokenizer,
            example["instruction"],
            example.get("input", "")
        )

        samples.append({
            "instruction": example["instruction"],
            "input": example.get("input", ""),
            "expected": example["output"],
            "generated": generated,
            "latency_ms": latency,
        })

        if (i + 1) % 10 == 0:
            print(f"Evaluated {i + 1}/{CONFIG['max_samples']} samples")

    # Save results
    output_dir = Path(CONFIG["output_path"])
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "eval_results.json"

    with open(output_file, "w") as f:
        json.dump(samples, f, indent=2)

    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    main()
`;
  }

  // --------------------------------------------------------------------------
  // Thresholds and Validation
  // --------------------------------------------------------------------------

  checkThresholds(report: EvalReport): {
    passed: boolean;
    failures: string[];
  } {
    const failures: string[] = [];

    if (report.aggregate_scores.overall.mean < 70) {
      failures.push(`Overall score ${report.aggregate_scores.overall.mean} < 70`);
    }

    if (report.pass_rates.has_program_end < 0.95) {
      failures.push(`Program end rate ${(report.pass_rates.has_program_end * 100).toFixed(1)}% < 95%`);
    }

    if (report.pass_rates.valid_structure < 0.80) {
      failures.push(`Valid structure rate ${(report.pass_rates.valid_structure * 100).toFixed(1)}% < 80%`);
    }

    if (report.latency.p95_ms > 5000) {
      failures.push(`P95 latency ${report.latency.p95_ms}ms > 5000ms`);
    }

    return {
      passed: failures.length === 0,
      failures,
    };
  }

  // --------------------------------------------------------------------------
  // Comparison
  // --------------------------------------------------------------------------

  compareReports(
    baseline: EvalReport,
    current: EvalReport
  ): {
    improved: string[];
    regressed: string[];
    delta: Record<string, number>;
  } {
    const delta: Record<string, number> = {
      structural: current.aggregate_scores.structural.mean - baseline.aggregate_scores.structural.mean,
      syntax: current.aggregate_scores.syntax.mean - baseline.aggregate_scores.syntax.mean,
      semantic: current.aggregate_scores.semantic.mean - baseline.aggregate_scores.semantic.mean,
      overall: current.aggregate_scores.overall.mean - baseline.aggregate_scores.overall.mean,
      latency: baseline.latency.mean_ms - current.latency.mean_ms, // lower is better
    };

    const improved: string[] = [];
    const regressed: string[] = [];

    for (const [metric, change] of Object.entries(delta)) {
      if (change > 2) {
        improved.push(`${metric}: +${change.toFixed(1)}`);
      } else if (change < -2) {
        regressed.push(`${metric}: ${change.toFixed(1)}`);
      }
    }

    return { improved, regressed, delta };
  }
}

export const latheLoRAEvalHarnessEngine = new LatheLoRAEvalHarnessEngine();
