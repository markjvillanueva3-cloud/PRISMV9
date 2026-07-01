/**
 * CodingCopilotEngine — MXU-MS1
 *
 * Smart coding assistance using PRISM's own engine knowledge:
 *   1. Pattern suggestion — recommend existing engines to reuse
 *   2. Duplication detection — flag when new code overlaps existing
 *   3. Wiring pattern recommendation — suggest dispatcher/action patterns
 *   4. Convention enforcement — check naming, structure, exports
 *   5. Engine template generation — scaffold new engines from patterns
 *
 * This engine makes PRISM self-aware when building new capabilities,
 * reducing duplication and accelerating development.
 *
 * Sources:
 *   - MXU-MS1: Coding + Build Copilot Plane
 *   - ENGINE_DIGEST.md for engine catalog
 *   - CapabilityCensusEngine for live utilization data
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ReuseSuggestion {
  engine_name: string;
  domain: string;
  relevance_score: number;
  reason: string;
  import_path: string;
}

export interface DuplicationCheck {
  is_duplicate: boolean;
  confidence: number;
  overlapping_engines: string[];
  recommendation: "proceed" | "merge" | "extend" | "skip";
  explanation: string;
}

export interface WiringPattern {
  dispatcher: string;
  action_name: string;
  schema_pattern: string;
  example: string;
}

export interface ConventionCheck {
  pass: boolean;
  issues: ConventionIssue[];
}

export interface ConventionIssue {
  rule: string;
  severity: "error" | "warning" | "info";
  message: string;
  fix?: string;
}

export interface EngineTemplate {
  class_name: string;
  file_name: string;
  domain: string;
  skeleton: string;
  suggested_dispatcher: string;
  suggested_actions: string[];
}

export interface CopilotSuggestion {
  task_description: string;
  reuse_suggestions: ReuseSuggestion[];
  duplication_check: DuplicationCheck;
  wiring_patterns: WiringPattern[];
  convention_check: ConventionCheck;
  template?: EngineTemplate;
}

// ============================================================================
// ENGINE KNOWLEDGE BASE
// ============================================================================

/** Known engine domains and their key engines for reuse */
const DOMAIN_ENGINES: Record<string, Array<{ name: string; capabilities: string[] }>> = {
  physics: [
    { name: "SpeedFeedOrchestratorEngine", capabilities: ["speed/feed calculation", "material resolution", "machine limits", "Monte Carlo UQ"] },
    { name: "KienzleForceModelEngine", capabilities: ["cutting force", "specific cutting force", "rake correction", "size effect"] },
    { name: "ChatterStabilityLobeEngine", capabilities: ["stability lobes", "SLD generation", "natural frequency"] },
    { name: "ThermalWearCouplingEngine", capabilities: ["thermal modeling", "Usui wear", "coupled ODE", "RK4"] },
    { name: "CuttingTemperatureEngine", capabilities: ["cutting temperature", "chip temperature", "thermal partition"] },
    { name: "SurfaceFinishPredictorEngine", capabilities: ["Ra prediction", "nose radius", "feed marks"] },
    { name: "DeflectionAnalysisEngine", capabilities: ["tool deflection", "beam theory", "stiffness"] },
  ],
  post_processor: [
    { name: "PostProcessorPipelineEngine", capabilities: ["G-code generation", "38-stage pipeline", "dialect support", "per-block S/F"] },
    { name: "ControllerProgrammingIntelligenceEngine", capabilities: ["controller knowledge", "alarm codes", "programming patterns"] },
    { name: "PostProcessorAutopilotEngine", capabilities: ["dialect resolution", "config generation", "20 dialects"] },
  ],
  business: [
    { name: "QuoteToShipOrchestratorEngine", capabilities: ["quoting", "21-stage pipeline", "job tracking"] },
    { name: "QuoteAutopilotEngine", capabilities: ["cost estimation", "qty breaks", "DFM check", "telemetry"] },
    { name: "OEECalculatorEngine", capabilities: ["OEE", "availability", "performance", "quality metrics"] },
  ],
  quality: [
    { name: "SPCEngine", capabilities: ["statistical process control", "control charts", "Cpk"] },
    { name: "FAIEngine", capabilities: ["first article inspection", "AS9102", "measurement plans"] },
  ],
  edm: [
    { name: "WireEDMSettingsEngine", capabilities: ["WEDM parameters", "Kunieda MRR", "skim feeds", "wire offset"] },
    { name: "EDMProgramAssemblerEngine", capabilities: ["EDM G-code", "6 dialects", "wire/sinker/micro"] },
  ],
  materials: [
    { name: "MaterialRegistry", capabilities: ["2,957 materials", "ISO groups", "physics properties"] },
    { name: "CANONICAL_MATERIAL_DB", capabilities: ["Kienzle constants", "Taylor constants", "thermal properties"] },
  ],
  tooling: [
    { name: "ToolRegistry", capabilities: ["95,608 tools", "geometry", "materials", "coatings"] },
    { name: "ToolLifeOptimizationEngine", capabilities: ["tool life", "Taylor model", "cost optimization"] },
  ],
  automation: [
    { name: "AutomationChainEngine", capabilities: ["task classification", "9 classes", "context bundles", "chain routing"] },
    { name: "BuildGuardChainEngine", capabilities: ["pre-edit safety", "typecheck", "test resolution", "review gate"] },
    { name: "ChainFailureRecoveryEngine", capabilities: ["retry", "degradation", "notifications", "health tracking"] },
  ],
};

/** Dispatcher naming conventions */
const DISPATCHER_CONVENTIONS: Record<string, string> = {
  physics: "calcDispatcher",
  post_processor: "devDispatcher",
  business: "businessDispatcher",
  quality: "qualityDispatcher",
  edm: "edmDispatcher",
  materials: "dataDispatcher",
  tooling: "dataDispatcher",
  automation: "devDispatcher",
  cad_cam: "camDispatcher",
  machine: "machineSetupDispatcher",
  turning: "turningDispatcher",
  safety: "safetyDispatcher",
  knowledge: "knowledgeDispatcher",
  general: "devDispatcher",
};

// ============================================================================
// ENGINE
// ============================================================================

export class CodingCopilotEngine {

  // ── Reuse Suggestion ───────────────────────────────────────

  /**
   * Suggest existing engines to reuse based on task description.
   *
   * @param taskDescription What the developer wants to build
   * @param maxResults Maximum suggestions to return
   * @returns Ranked list of engines to consider reusing
   */
  suggestReuse(taskDescription: string, maxResults: number = 5): ReuseSuggestion[] {
    const lower = taskDescription.toLowerCase();
    const suggestions: ReuseSuggestion[] = [];

    for (const [domain, engines] of Object.entries(DOMAIN_ENGINES)) {
      for (const engine of engines) {
        let score = 0;

        // Score by capability keyword match
        for (const cap of engine.capabilities) {
          const capWords = cap.toLowerCase().split(/\s+/);
          for (const word of capWords) {
            if (word.length > 3 && lower.includes(word)) {
              score += 0.2;
            }
          }
        }

        // Score by engine name match
        const nameWords = engine.name.replace(/Engine$/, "").replace(/([A-Z])/g, " $1").trim().toLowerCase().split(/\s+/);
        for (const word of nameWords) {
          if (word.length > 3 && lower.includes(word)) {
            score += 0.3;
          }
        }

        if (score > 0) {
          suggestions.push({
            engine_name: engine.name,
            domain,
            relevance_score: Math.min(score, 1.0),
            reason: `Capabilities: ${engine.capabilities.slice(0, 3).join(", ")}`,
            import_path: `src/engines/${engine.name}.ts`,
          });
        }
      }
    }

    return suggestions
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .slice(0, maxResults);
  }

  // ── Duplication Detection ──────────────────────────────────

  /**
   * Check if a proposed engine duplicates existing functionality.
   *
   * @param proposedName Name of the proposed engine
   * @param proposedCapabilities What it would do
   * @param existingEngineNames All existing engine names
   * @returns Duplication assessment
   */
  checkDuplication(
    proposedName: string,
    proposedCapabilities: string[],
    existingEngineNames: string[],
  ): DuplicationCheck {
    const proposedLower = proposedName.toLowerCase().replace(/engine$/i, "");
    const proposedWords = proposedLower.replace(/([A-Z])/g, " $1").trim().split(/\s+/).filter(w => w.length > 2);
    const capWords = proposedCapabilities.flatMap(c => c.toLowerCase().split(/\s+/).filter(w => w.length > 3));

    const overlaps: Array<{ name: string; score: number }> = [];

    for (const existing of existingEngineNames) {
      const existingLower = existing.toLowerCase().replace(/engine$/i, "").replace(/\.ts$/, "");
      const existingWords = existingLower.replace(/([A-Z])/g, " $1").trim().split(/\s+/).filter(w => w.length > 2);

      // Name similarity
      let nameOverlap = 0;
      for (const pw of proposedWords) {
        if (existingWords.some(ew => ew.includes(pw) || pw.includes(ew))) {
          nameOverlap++;
        }
      }
      const nameSimilarity = proposedWords.length > 0 ? nameOverlap / proposedWords.length : 0;

      // Capability overlap (check against known domain engines)
      let capOverlap = 0;
      for (const [, engines] of Object.entries(DOMAIN_ENGINES)) {
        const match = engines.find(e => e.name.toLowerCase().includes(existingLower) || existingLower.includes(e.name.toLowerCase().replace(/engine$/, "")));
        if (match) {
          for (const cw of capWords) {
            if (match.capabilities.some(c => c.toLowerCase().includes(cw))) {
              capOverlap++;
            }
          }
        }
      }
      const capSimilarity = capWords.length > 0 ? Math.min(capOverlap / capWords.length, 1.0) : 0;

      const totalScore = nameSimilarity * 0.6 + capSimilarity * 0.4;
      if (totalScore > 0.3) {
        overlaps.push({ name: existing, score: totalScore });
      }
    }

    overlaps.sort((a, b) => b.score - a.score);
    const topOverlaps = overlaps.slice(0, 5);
    const maxScore = topOverlaps[0]?.score || 0;

    let recommendation: DuplicationCheck["recommendation"];
    let explanation: string;

    if (maxScore > 0.8) {
      recommendation = "skip";
      explanation = `Very high overlap with ${topOverlaps[0].name}. Use existing engine instead.`;
    } else if (maxScore > 0.6) {
      recommendation = "extend";
      explanation = `Significant overlap with ${topOverlaps[0].name}. Consider extending it rather than creating a new engine.`;
    } else if (maxScore > 0.4) {
      recommendation = "merge";
      explanation = `Moderate overlap with ${topOverlaps.map(o => o.name).join(", ")}. Consider merging capabilities.`;
    } else {
      recommendation = "proceed";
      explanation = "No significant duplication detected. Safe to create new engine.";
    }

    return {
      is_duplicate: maxScore > 0.6,
      confidence: parseFloat(maxScore.toFixed(2)),
      overlapping_engines: topOverlaps.map(o => o.name),
      recommendation,
      explanation,
    };
  }

  // ── Wiring Pattern Suggestion ──────────────────────────────

  /**
   * Suggest wiring patterns for an engine based on its domain.
   */
  suggestWiring(engineName: string, domain: string): WiringPattern[] {
    const dispatcher = DISPATCHER_CONVENTIONS[domain] || "devDispatcher";
    const baseName = engineName.replace(/Engine$/, "");
    const snakeName = baseName.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");

    return [
      {
        dispatcher,
        action_name: snakeName,
        schema_pattern: `{ action: z.enum(["${snakeName}"]), params: z.record(z.string(), z.any()).optional() }`,
        example: `case "${snakeName}": {\n  const { ${baseName.charAt(0).toLowerCase() + baseName.slice(1)}Engine } = await import("../../engines/${engineName}.js");\n  result = ${baseName.charAt(0).toLowerCase() + baseName.slice(1)}Engine.compute(params);\n  break;\n}`,
      },
    ];
  }

  // ── Convention Check ───────────────────────────────────────

  /**
   * Check if an engine name and structure follow PRISM conventions.
   */
  checkConventions(
    engineName: string,
    hasExportedClass: boolean,
    hasExportedInstance: boolean,
    hasTests: boolean,
    hasJSDoc: boolean,
  ): ConventionCheck {
    const issues: ConventionIssue[] = [];

    // Naming
    if (!engineName.endsWith("Engine")) {
      issues.push({
        rule: "naming",
        severity: "error",
        message: "Engine class must end with 'Engine'",
        fix: `Rename to ${engineName}Engine`,
      });
    }

    if (!/^[A-Z]/.test(engineName)) {
      issues.push({
        rule: "naming",
        severity: "error",
        message: "Engine class must start with uppercase",
      });
    }

    // Exports
    if (!hasExportedClass) {
      issues.push({
        rule: "export",
        severity: "error",
        message: "Must export the engine class",
        fix: `Add: export class ${engineName} { ... }`,
      });
    }

    if (!hasExportedInstance) {
      issues.push({
        rule: "export",
        severity: "warning",
        message: "Should export a singleton instance",
        fix: `Add: export const ${engineName.charAt(0).toLowerCase() + engineName.slice(1)} = new ${engineName}();`,
      });
    }

    // Tests
    if (!hasTests) {
      issues.push({
        rule: "testing",
        severity: "warning",
        message: "No test file found for this engine",
        fix: `Create: src/__tests__/${engineName}.test.ts`,
      });
    }

    // Documentation
    if (!hasJSDoc) {
      issues.push({
        rule: "documentation",
        severity: "info",
        message: "Public methods should have JSDoc with @param and @returns",
      });
    }

    return {
      pass: issues.filter(i => i.severity === "error").length === 0,
      issues,
    };
  }

  // ── Engine Template ────────────────────────────────────────

  /**
   * Generate an engine template/scaffold.
   */
  generateTemplate(
    name: string,
    domain: string,
    capabilities: string[],
  ): EngineTemplate {
    const className = name.endsWith("Engine") ? name : `${name}Engine`;
    const instanceName = className.charAt(0).toLowerCase() + className.slice(1);
    const fileName = `${className}.ts`;
    const dispatcher = DISPATCHER_CONVENTIONS[domain] || "devDispatcher";
    const snakeName = name.replace(/Engine$/, "").replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");

    const capMethods = capabilities.map(cap => {
      const methodName = cap.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
      return `  /**\n   * ${cap}\n   */\n  ${methodName}(input: Record<string, unknown>): Record<string, unknown> {\n    // TODO: implement\n    return { status: "not_implemented" };\n  }`;
    });

    const skeleton = `/**
 * ${className} — ${domain} domain
 *
 * Capabilities:
${capabilities.map(c => ` *   - ${c}`).join("\n")}
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ${name.replace(/Engine$/, "")}Input {
  // TODO: define input type
}

export interface ${name.replace(/Engine$/, "")}Result {
  // TODO: define result type
}

// ============================================================================
// ENGINE
// ============================================================================

export class ${className} {

${capMethods.join("\n\n")}
}

export const ${instanceName} = new ${className}();
`;

    return {
      class_name: className,
      file_name: fileName,
      domain,
      skeleton,
      suggested_dispatcher: dispatcher,
      suggested_actions: [snakeName],
    };
  }

  // ── Full Copilot Suggestion ────────────────────────────────

  /**
   * Get comprehensive copilot suggestions for a coding task.
   *
   * @param taskDescription What the developer wants to build
   * @param proposedName Optional proposed engine name
   * @param existingEngineNames Known engine names for dedup check
   * @returns Full suggestion set
   */
  suggest(
    taskDescription: string,
    proposedName?: string,
    existingEngineNames: string[] = [],
  ): CopilotSuggestion {
    const reuse = this.suggestReuse(taskDescription);
    const domain = reuse[0]?.domain || "general";

    const name = proposedName || this.inferEngineName(taskDescription);

    const dedup = this.checkDuplication(
      name,
      [taskDescription],
      existingEngineNames,
    );

    const wiring = this.suggestWiring(name, domain);

    const convention = this.checkConventions(name, true, true, false, false);

    const template = dedup.recommendation === "proceed"
      ? this.generateTemplate(name, domain, [taskDescription])
      : undefined;

    return {
      task_description: taskDescription,
      reuse_suggestions: reuse,
      duplication_check: dedup,
      wiring_patterns: wiring,
      convention_check: convention,
      template,
    };
  }

  // ── Name Inference ─────────────────────────────────────────

  private inferEngineName(description: string): string {
    const words = description
      .replace(/[^a-zA-Z\s]/g, "")
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 3)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());

    return (words.join("") || "New") + "Engine";
  }

  // ── Domain Knowledge ───────────────────────────────────────

  /**
   * List all known domain engines.
   */
  listDomainEngines(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [domain, engines] of Object.entries(DOMAIN_ENGINES)) {
      result[domain] = engines.map(e => e.name);
    }
    return result;
  }

  /**
   * Get dispatcher convention for a domain.
   */
  getDispatcherFor(domain: string): string {
    return DISPATCHER_CONVENTIONS[domain] || "devDispatcher";
  }
}

export const codingCopilotEngine = new CodingCopilotEngine();
