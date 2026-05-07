/**
 * LatheLoRADatasetBuilderEngine — Training Dataset Builder
 *
 * U-LTH69: Builds instruction-tuning dataset from JM Die Okuma programs.
 * Walks archive via LatheFullArchiveTrainingEngine, filters by score,
 * extracts instruction prompts, emits JSONL with customer-level split.
 *
 * @module engines/LatheLoRADatasetBuilderEngine
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// TYPES
// ============================================================================

export interface DatasetExample {
  instruction: string;
  input: string;
  output: string;
  metadata: {
    program_id: string;
    customer: string;
    material?: string;
    operations: string[];
    score: number;
    line_count: number;
  };
}

export interface DatasetSplit {
  train: DatasetExample[];
  eval: DatasetExample[];
  train_customers: string[];
  eval_customers: string[];
}

export interface DatasetStats {
  total_programs_scanned: number;
  total_programs_filtered: number;
  total_examples: number;
  train_examples: number;
  eval_examples: number;
  unique_customers: number;
  train_customers: number;
  eval_customers: number;
  avg_output_lines: number;
  min_output_lines: number;
  max_output_lines: number;
  by_customer: Record<string, number>;
}

export interface BuildConfig {
  archive_path: string;
  output_path: string;
  min_score: number;
  train_ratio: number;
  min_lines: number;
  max_lines: number;
  strip_bom: boolean;
  include_comments: boolean;
}

export interface ProgramFile {
  path: string;
  customer: string;
  filename: string;
  content: string;
  line_count: number;
}

export interface ProgramAnalysis {
  program_id: string;
  score: number;
  operations: string[];
  tools: string[];
  material?: string;
  has_threading: boolean;
  has_grooving: boolean;
  has_drilling: boolean;
  errors: string[];
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: BuildConfig = {
  archive_path: "H:/PRISM/JM DIE/CNC LATHE",
  output_path: "data/training",
  min_score: 70,
  train_ratio: 0.8,
  min_lines: 20,
  max_lines: 800,
  strip_bom: true,
  include_comments: false,
};

// ============================================================================
// ENGINE
// ============================================================================

class LatheLoRADatasetBuilderEngine {
  private config: BuildConfig = { ...DEFAULT_CONFIG };

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setConfig(config: Partial<BuildConfig>): BuildConfig {
    this.config = { ...this.config, ...config };
    return this.config;
  }

  getConfig(): BuildConfig {
    return { ...this.config };
  }

  // --------------------------------------------------------------------------
  // Dataset Building
  // --------------------------------------------------------------------------

  async build(): Promise<{ stats: DatasetStats; split: DatasetSplit }> {
    const programs = this.scanArchive();
    const examples: DatasetExample[] = [];

    for (const program of programs) {
      const analysis = this.analyzeProgram(program);

      if (analysis.score < this.config.min_score) continue;
      if (program.line_count < this.config.min_lines) continue;
      if (program.line_count > this.config.max_lines) continue;

      const example = this.buildExample(program, analysis);
      if (example) {
        examples.push(example);
      }
    }

    const split = this.splitByCustomer(examples);
    const stats = this.computeStats(programs.length, examples, split);

    return { stats, split };
  }

  async buildAndSave(): Promise<{ stats: DatasetStats; files: string[] }> {
    const { stats, split } = await this.build();
    const files: string[] = [];

    const outputDir = this.config.output_path;
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write train set
    const trainPath = path.join(outputDir, "lathe-lora-train.jsonl");
    const trainLines = split.train.map((e) => JSON.stringify(e));
    fs.writeFileSync(trainPath, trainLines.join("\n"), "utf-8");
    files.push(trainPath);

    // Write eval set
    const evalPath = path.join(outputDir, "lathe-lora-eval.jsonl");
    const evalLines = split.eval.map((e) => JSON.stringify(e));
    fs.writeFileSync(evalPath, evalLines.join("\n"), "utf-8");
    files.push(evalPath);

    // Write stats
    const statsPath = path.join(outputDir, "lathe-lora-stats.json");
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), "utf-8");
    files.push(statsPath);

    // Write customer split info
    const splitInfoPath = path.join(outputDir, "lathe-lora-split.json");
    fs.writeFileSync(splitInfoPath, JSON.stringify({
      train_customers: split.train_customers,
      eval_customers: split.eval_customers,
    }, null, 2), "utf-8");
    files.push(splitInfoPath);

    return { stats, files };
  }

  // --------------------------------------------------------------------------
  // Archive Scanning
  // --------------------------------------------------------------------------

  private scanArchive(): ProgramFile[] {
    const programs: ProgramFile[] = [];
    const archivePath = this.config.archive_path;

    if (!fs.existsSync(archivePath)) {
      return programs;
    }

    const customers = fs.readdirSync(archivePath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const customer of customers) {
      const customerPath = path.join(archivePath, customer);
      const files = this.findProgramFiles(customerPath);

      for (const file of files) {
        try {
          let content = fs.readFileSync(file, "utf-8");

          if (this.config.strip_bom && content.charCodeAt(0) === 0xFEFF) {
            content = content.slice(1);
          }

          const lines = content.split("\n").filter((l) => l.trim());

          programs.push({
            path: file,
            customer,
            filename: path.basename(file),
            content,
            line_count: lines.length,
          });
        } catch {
          // Skip unreadable files
        }
      }
    }

    return programs;
  }

  private findProgramFiles(dir: string): string[] {
    const files: string[] = [];
    const extensions = [".MIN", ".min", ".nc", ".NC", ".prg", ".PRG"];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...this.findProgramFiles(fullPath));
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch {
      // Skip unreadable directories
    }

    return files;
  }

  // --------------------------------------------------------------------------
  // Program Analysis
  // --------------------------------------------------------------------------

  private analyzeProgram(program: ProgramFile): ProgramAnalysis {
    const content = program.content.toUpperCase();
    const lines = content.split("\n");

    const operations: string[] = [];
    const tools: string[] = [];
    const errors: string[] = [];
    let score = 100;

    // Detect operations
    if (content.includes("G76") || content.includes("G33") || content.includes("G32")) {
      operations.push("threading");
    }
    if (content.includes("G75") || content.includes("G74")) {
      operations.push("grooving");
    }
    if (content.includes("G83") || content.includes("G73")) {
      operations.push("drilling");
    }
    if (content.includes("G71") || content.includes("G72")) {
      operations.push("roughing");
    }
    if (content.includes("G70")) {
      operations.push("finishing");
    }

    // Extract tools
    const toolMatches = content.match(/T\d{2,4}/g);
    if (toolMatches) {
      tools.push(...new Set(toolMatches));
    }

    // Detect material from comments
    let material: string | undefined;
    const materialMatch = content.match(/\(.*?(STEEL|ALUMINUM|BRASS|TITANIUM|STAINLESS|4140|4340|6061|7075).*?\)/i);
    if (materialMatch) {
      material = materialMatch[1].toUpperCase();
    }

    // Score deductions
    if (!content.includes("M30") && !content.includes("M02")) {
      score -= 10;
      errors.push("Missing program end (M30/M02)");
    }

    if (!content.match(/O\d{4}/)) {
      score -= 5;
      errors.push("Missing O-number");
    }

    if (lines.length < 10) {
      score -= 20;
      errors.push("Too short");
    }

    // Check for dangerous patterns
    if (content.includes("G50 S0")) {
      score -= 30;
      errors.push("Zero spindle limit");
    }

    // Check for good practices
    if (content.includes("G28")) {
      score += 5;
    }

    if (operations.length === 0) {
      operations.push("general_turning");
    }

    return {
      program_id: program.filename.replace(/\.[^.]+$/, ""),
      score: Math.max(0, Math.min(100, score)),
      operations,
      tools,
      material,
      has_threading: operations.includes("threading"),
      has_grooving: operations.includes("grooving"),
      has_drilling: operations.includes("drilling"),
      errors,
    };
  }

  // --------------------------------------------------------------------------
  // Example Building
  // --------------------------------------------------------------------------

  private buildExample(
    program: ProgramFile,
    analysis: ProgramAnalysis
  ): DatasetExample | null {
    const instruction = this.buildInstruction(program, analysis);
    const input = this.buildInput(program, analysis);
    const output = this.cleanOutput(program.content);

    if (!output || output.length < 50) {
      return null;
    }

    return {
      instruction,
      input,
      output,
      metadata: {
        program_id: analysis.program_id,
        customer: program.customer,
        material: analysis.material,
        operations: analysis.operations,
        score: analysis.score,
        line_count: program.line_count,
      },
    };
  }

  private buildInstruction(program: ProgramFile, analysis: ProgramAnalysis): string {
    const parts: string[] = [
      `Generate an Okuma lathe program for ${program.customer}.`,
    ];

    if (analysis.material) {
      parts.push(`Material: ${analysis.material}.`);
    }

    if (analysis.operations.length > 0) {
      parts.push(`Operations: ${analysis.operations.join(", ")}.`);
    }

    if (analysis.tools.length > 0) {
      parts.push(`Tools required: ${analysis.tools.slice(0, 5).join(", ")}.`);
    }

    parts.push("Output valid .MIN G-code matching JM Die Okuma conventions. End with M30.");

    return parts.join(" ");
  }

  private buildInput(program: ProgramFile, analysis: ProgramAnalysis): string {
    const context: string[] = [];

    context.push(`Customer: ${program.customer}`);

    if (analysis.material) {
      context.push(`Material: ${analysis.material}`);
    }

    context.push(`Operations: ${analysis.operations.join(", ")}`);
    context.push(`Program ID: ${analysis.program_id}`);

    return context.join("\n");
  }

  private cleanOutput(content: string): string {
    let lines = content.split("\n");

    // Strip BOM
    if (lines[0] && lines[0].charCodeAt(0) === 0xFEFF) {
      lines[0] = lines[0].slice(1);
    }

    // Optionally remove comments
    if (!this.config.include_comments) {
      lines = lines.filter((l) => !l.trim().startsWith("(") || l.includes("TOOL") || l.includes("OP"));
    }

    // Remove empty lines at start/end
    while (lines.length > 0 && !lines[0].trim()) {
      lines.shift();
    }
    while (lines.length > 0 && !lines[lines.length - 1].trim()) {
      lines.pop();
    }

    return lines.join("\n");
  }

  // --------------------------------------------------------------------------
  // Customer-Level Split
  // --------------------------------------------------------------------------

  private splitByCustomer(examples: DatasetExample[]): DatasetSplit {
    // Group by customer
    const byCustomer = new Map<string, DatasetExample[]>();

    for (const example of examples) {
      const customer = example.metadata.customer;
      if (!byCustomer.has(customer)) {
        byCustomer.set(customer, []);
      }
      byCustomer.get(customer)!.push(example);
    }

    // Sort customers by example count (deterministic split)
    const customers = Array.from(byCustomer.keys()).sort((a, b) => {
      const countDiff = (byCustomer.get(b)?.length || 0) - (byCustomer.get(a)?.length || 0);
      return countDiff !== 0 ? countDiff : a.localeCompare(b);
    });

    // Split customers (not examples)
    const trainCustomerCount = Math.ceil(customers.length * this.config.train_ratio);
    const trainCustomers = customers.slice(0, trainCustomerCount);
    const evalCustomers = customers.slice(trainCustomerCount);

    // Collect examples
    const train: DatasetExample[] = [];
    const evalSet: DatasetExample[] = [];

    for (const customer of trainCustomers) {
      train.push(...(byCustomer.get(customer) || []));
    }

    for (const customer of evalCustomers) {
      evalSet.push(...(byCustomer.get(customer) || []));
    }

    return {
      train,
      eval: evalSet,
      train_customers: trainCustomers,
      eval_customers: evalCustomers,
    };
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  private computeStats(
    scanned: number,
    examples: DatasetExample[],
    split: DatasetSplit
  ): DatasetStats {
    const lineCounts = examples.map((e) => e.metadata.line_count);
    const avgLines = lineCounts.length > 0
      ? lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length
      : 0;

    const byCustomer: Record<string, number> = {};
    for (const example of examples) {
      const customer = example.metadata.customer;
      byCustomer[customer] = (byCustomer[customer] || 0) + 1;
    }

    return {
      total_programs_scanned: scanned,
      total_programs_filtered: scanned - examples.length,
      total_examples: examples.length,
      train_examples: split.train.length,
      eval_examples: split.eval.length,
      unique_customers: Object.keys(byCustomer).length,
      train_customers: split.train_customers.length,
      eval_customers: split.eval_customers.length,
      avg_output_lines: Math.round(avgLines),
      min_output_lines: lineCounts.length > 0 ? Math.min(...lineCounts) : 0,
      max_output_lines: lineCounts.length > 0 ? Math.max(...lineCounts) : 0,
      by_customer: byCustomer,
    };
  }

  // --------------------------------------------------------------------------
  // Utilities
  // --------------------------------------------------------------------------

  validateDataset(datasetPath: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!fs.existsSync(datasetPath)) {
      errors.push(`File not found: ${datasetPath}`);
      return { valid: false, errors };
    }

    const content = fs.readFileSync(datasetPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    let lineNum = 0;
    for (const line of lines) {
      lineNum++;
      try {
        const example = JSON.parse(line) as DatasetExample;

        if (!example.instruction) {
          errors.push(`Line ${lineNum}: Missing instruction`);
        }
        if (!example.output) {
          errors.push(`Line ${lineNum}: Missing output`);
        }
        if (example.output && example.output.length < 50) {
          errors.push(`Line ${lineNum}: Output too short`);
        }
      } catch (e) {
        errors.push(`Line ${lineNum}: Invalid JSON`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  loadDataset(datasetPath: string): DatasetExample[] {
    if (!fs.existsSync(datasetPath)) {
      return [];
    }

    const content = fs.readFileSync(datasetPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());

    return lines.map((line) => JSON.parse(line) as DatasetExample);
  }

  getDatasetSample(datasetPath: string, count: number = 5): DatasetExample[] {
    const examples = this.loadDataset(datasetPath);
    const shuffled = examples.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }
}

export const latheLoRADatasetBuilderEngine = new LatheLoRADatasetBuilderEngine();
