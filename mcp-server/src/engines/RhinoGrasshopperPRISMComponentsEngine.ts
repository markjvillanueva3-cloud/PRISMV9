/**
 * RhinoGrasshopperPRISMComponentsEngine — U-CAD-APP-08 (PHASE-48)
 *
 * Registry and runtime for Grasshopper components that invoke PRISM
 * manufacturing intelligence. Provides:
 *
 *   - Component definition registry (15 PRISM components)
 *   - Input validation and type coercion
 *   - Execution dispatch to PRISM actions via injected dispatcher
 *   - Output packaging for GH data trees
 *   - Runtime message aggregation
 *
 * The actual GH plugin (C#/GH_Kernel) maintains a thin wrapper that:
 *   1. Serializes inputs → JSON
 *   2. Calls this engine over HTTP/IPC
 *   3. Deserializes outputs → GH data tree
 *
 * @module engines/RhinoGrasshopperPRISMComponentsEngine
 */

import {
  PRISMGHComponentDefSchema,
  PRISMGHComponentRegistrySchema,
  GHComponentResultSchema,
  GHRuntimeMessageSchema,
  GHInputValueSchema,
  PRISM_COMPONENT_IDS,
  type PRISMGHComponentDef,
  type PRISMGHComponentRegistry,
  type GHComponentExecutionContext,
  type GHComponentResult,
  type GHInputValue,
  type GHOutputValue,
  type GHRuntimeMessage,
  type PRISMComponentId,
} from "../schemas/cadGrasshopperComponentSchema.js";

export interface PRISMDispatcherAdapter {
  /**
   * Invoke a PRISM dispatcher action and return the result.
   */
  invoke(
    dispatcher: string,
    action: string,
    params: Record<string, unknown>,
  ): { ok: boolean; result?: unknown; error?: string };
}

export interface GHClock {
  now(): string;
  monotonicMs(): number;
}

function defaultClock(): GHClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export class RhinoGrasshopperPRISMComponentsEngine {
  private registry: PRISMGHComponentRegistry;
  private dispatcher: PRISMDispatcherAdapter;
  private clock: GHClock;
  private messages: GHRuntimeMessage[] = [];

  constructor(opts: {
    dispatcher: PRISMDispatcherAdapter;
    clock?: GHClock;
    customComponents?: PRISMGHComponentDef[];
  }) {
    this.dispatcher = opts.dispatcher;
    this.clock = opts.clock ?? defaultClock();
    this.registry = PRISMGHComponentRegistrySchema.parse({
      version: "1.0.0",
      buildDate: this.clock.now(),
      components: [
        ...RhinoGrasshopperPRISMComponentsEngine.defaultComponents(),
        ...(opts.customComponents ?? []),
      ],
    });
  }

  // ── Registry ──────────────────────────────────────────────────────────────

  getRegistry(): PRISMGHComponentRegistry {
    return this.registry;
  }

  getComponent(componentId: PRISMComponentId): PRISMGHComponentDef | undefined {
    return this.registry.components.find((c) => c.componentId === componentId);
  }

  listComponents(opts: { category?: string; includeObsolete?: boolean } = {}): PRISMGHComponentDef[] {
    return this.registry.components.filter((c) => {
      if (!opts.includeObsolete && c.obsolete) return false;
      if (opts.category && c.category !== opts.category) return false;
      return true;
    });
  }

  componentCount(): number {
    return this.registry.components.filter((c) => !c.obsolete).length;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /**
   * Execute a component with the given inputs. Validates inputs against the
   * component spec, invokes the mapped PRISM action, and packages outputs.
   */
  execute(
    componentId: PRISMComponentId,
    inputs: GHInputValue[],
    ctx: GHComponentExecutionContext,
  ): GHComponentResult {
    const t0 = this.clock.monotonicMs();
    const comp = this.getComponent(componentId);

    if (!comp) {
      return this.errorResult(`Unknown component: ${componentId}`, t0);
    }

    // Validate inputs
    const validationErrors = this.validateInputs(comp, inputs);
    if (validationErrors.length > 0) {
      return this.errorResult(validationErrors.join("; "), t0);
    }

    // Build params for PRISM action
    const params = this.buildParams(comp, inputs, ctx);

    // Invoke PRISM dispatcher
    let dispatchResult: ReturnType<PRISMDispatcherAdapter["invoke"]>;
    try {
      dispatchResult = this.dispatcher.invoke(
        comp.prismDispatcher,
        comp.prismAction,
        params,
      );
    } catch (err) {
      return this.errorResult(
        `Dispatcher error: ${err instanceof Error ? err.message : String(err)}`,
        t0,
      );
    }

    if (!dispatchResult.ok) {
      return this.errorResult(dispatchResult.error ?? "PRISM action failed", t0);
    }

    // Package outputs
    const outputs = this.packageOutputs(comp, dispatchResult.result);
    const warnings = this.extractWarnings(dispatchResult.result);

    return GHComponentResultSchema.parse({
      success: true,
      outputs,
      warnings,
      errors: [],
      durationMs: this.clock.monotonicMs() - t0,
      prismCallId: this.generateCallId(),
    });
  }

  // ── Runtime messages ──────────────────────────────────────────────────────

  addMessage(msg: GHRuntimeMessage): void {
    this.messages.push(GHRuntimeMessageSchema.parse(msg));
  }

  getMessages(opts: { level?: GHRuntimeMessage["level"]; componentId?: PRISMComponentId } = {}): GHRuntimeMessage[] {
    return this.messages.filter((m) => {
      if (opts.level && m.level !== opts.level) return false;
      if (opts.componentId && m.componentId !== opts.componentId) return false;
      return true;
    });
  }

  clearMessages(): void {
    this.messages = [];
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private validateInputs(comp: PRISMGHComponentDef, inputs: GHInputValue[]): string[] {
    const errors: string[] = [];
    const inputMap = new Map(inputs.map((i) => [i.paramName, i]));

    for (const spec of comp.inputs) {
      const input = inputMap.get(spec.name);
      if (!input && !spec.optional) {
        errors.push(`Missing required input: ${spec.name}`);
        continue;
      }
      if (input) {
        // Type validation
        const typeError = this.validateType(input.value, spec.type);
        if (typeError) {
          errors.push(`${spec.name}: ${typeError}`);
        }
      }
    }

    return errors;
  }

  private validateType(value: unknown, expectedType: string): string | null {
    if (value === null || value === undefined) return null; // Optional values OK

    switch (expectedType) {
      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) {
          return "Expected number";
        }
        break;
      case "integer":
        if (typeof value !== "number" || !Number.isInteger(value)) {
          return "Expected integer";
        }
        break;
      case "boolean":
        if (typeof value !== "boolean") {
          return "Expected boolean";
        }
        break;
      case "text":
        if (typeof value !== "string") {
          return "Expected text";
        }
        break;
      case "point":
      case "vector":
        if (
          typeof value !== "object" ||
          !value ||
          !("x" in value) ||
          !("y" in value) ||
          !("z" in value)
        ) {
          return `Expected ${expectedType} with x, y, z`;
        }
        break;
      case "curve":
      case "surface":
      case "brep":
      case "mesh":
      case "geometry":
        if (typeof value !== "object" || !value) {
          return `Expected ${expectedType} object`;
        }
        break;
      case "color":
        if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
          return "Expected color as #RRGGBB";
        }
        break;
      case "material":
        if (typeof value !== "string" && typeof value !== "object") {
          return "Expected material name or object";
        }
        break;
      case "path":
        if (typeof value !== "string") {
          return "Expected file path";
        }
        break;
    }
    return null;
  }

  private buildParams(
    comp: PRISMGHComponentDef,
    inputs: GHInputValue[],
    ctx: GHComponentExecutionContext,
  ): Record<string, unknown> {
    const params: Record<string, unknown> = {
      _context: {
        instanceGuid: ctx.instanceGuid,
        iteration: ctx.iteration,
        branchPath: ctx.branchPath,
        rhinoUnits: ctx.rhinoUnits,
      },
    };

    for (const input of inputs) {
      params[input.paramName] = input.value;
    }

    return params;
  }

  private packageOutputs(comp: PRISMGHComponentDef, result: unknown): GHOutputValue[] {
    const outputs: GHOutputValue[] = [];

    if (typeof result !== "object" || result === null) {
      // Single value — map to first output
      if (comp.outputs.length > 0) {
        outputs.push({ paramName: comp.outputs[0].name, value: result });
      }
      return outputs;
    }

    const resultObj = result as Record<string, unknown>;

    for (const spec of comp.outputs) {
      const key = spec.name;
      if (key in resultObj) {
        outputs.push({ paramName: key, value: resultObj[key] });
      } else {
        // Missing output — use null
        outputs.push({ paramName: key, value: null });
      }
    }

    return outputs;
  }

  private extractWarnings(result: unknown): string[] {
    if (typeof result !== "object" || result === null) return [];
    const r = result as Record<string, unknown>;
    if (Array.isArray(r.warnings)) {
      return r.warnings.filter((w): w is string => typeof w === "string");
    }
    return [];
  }

  private errorResult(error: string, t0: number): GHComponentResult {
    return GHComponentResultSchema.parse({
      success: false,
      outputs: [],
      warnings: [],
      errors: [error],
      durationMs: this.clock.monotonicMs() - t0,
    });
  }

  private generateCallId(): string {
    return `gh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  // ── Default component definitions ─────────────────────────────────────────

  static defaultComponents(): PRISMGHComponentDef[] {
    return [
      // Speed/Feed
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.speedfeed",
        name: "Speed/Feed Calculator",
        nickname: "S/F",
        description: "Calculate optimal cutting speeds and feeds for a machining operation",
        category: "PRISM Speed/Feed",
        subcategory: "Calculate",
        iconName: "prism_speedfeed_24.png",
        inputs: [
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "ToolDiameter", nickname: "D", description: "Tool diameter (mm)", type: "number", access: "item" },
          { name: "ToolType", nickname: "T", description: "Tool type (endmill, drill, etc.)", type: "text", access: "item" },
          { name: "Operation", nickname: "Op", description: "Operation type (roughing, finishing)", type: "text", access: "item", optional: true, defaultValue: "roughing" },
          { name: "DepthOfCut", nickname: "ap", description: "Axial depth of cut (mm)", type: "number", access: "item", optional: true },
        ],
        outputs: [
          { name: "SpindleSpeed", nickname: "N", description: "Spindle speed (RPM)", type: "number", access: "item" },
          { name: "FeedRate", nickname: "F", description: "Feed rate (mm/min)", type: "number", access: "item" },
          { name: "SurfaceSpeed", nickname: "Vc", description: "Cutting speed (m/min)", type: "number", access: "item" },
          { name: "FeedPerTooth", nickname: "fz", description: "Feed per tooth (mm)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "speed_feed_calculate",
      }),

      // DFM
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.dfm_check",
        name: "DFM Check",
        nickname: "DFM",
        description: "Design-for-manufacturability analysis on geometry",
        category: "PRISM DFM",
        subcategory: "Analyze",
        iconName: "prism_dfm_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Brep or mesh to analyze", type: "brep", access: "item" },
          { name: "Process", nickname: "P", description: "Manufacturing process (milling, turning)", type: "text", access: "item", optional: true, defaultValue: "milling" },
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item", optional: true },
        ],
        outputs: [
          { name: "Score", nickname: "S", description: "DFM score (0-100)", type: "number", access: "item" },
          { name: "Issues", nickname: "I", description: "List of DFM issues", type: "text", access: "list" },
          { name: "Suggestions", nickname: "Sg", description: "Improvement suggestions", type: "text", access: "list" },
        ],
        prismDispatcher: "prism_cad",
        prismAction: "dfm_analyze",
      }),

      // Quote
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.quote",
        name: "Quick Quote",
        nickname: "Qt",
        description: "Generate a rough cost estimate for machining",
        category: "PRISM Quote",
        subcategory: "Estimate",
        iconName: "prism_quote_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Part geometry", type: "brep", access: "item" },
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "Quantity", nickname: "Q", description: "Part quantity", type: "integer", access: "item", optional: true, defaultValue: 1 },
          { name: "Tolerance", nickname: "Tol", description: "General tolerance class", type: "text", access: "item", optional: true },
        ],
        outputs: [
          { name: "UnitCost", nickname: "UC", description: "Cost per part ($)", type: "number", access: "item" },
          { name: "TotalCost", nickname: "TC", description: "Total cost ($)", type: "number", access: "item" },
          { name: "CycleTime", nickname: "CT", description: "Estimated cycle time (min)", type: "number", access: "item" },
          { name: "SetupTime", nickname: "ST", description: "Setup time (min)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_business",
        prismAction: "quote_estimate",
      }),

      // Tribal Tips
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.tribal_tip",
        name: "Tribal Tips",
        nickname: "Tip",
        description: "Get shop-floor tribal knowledge for a feature or operation",
        category: "PRISM Tribal",
        subcategory: "Knowledge",
        iconName: "prism_tribal_24.png",
        inputs: [
          { name: "Query", nickname: "Q", description: "Search query or feature type", type: "text", access: "item" },
          { name: "Material", nickname: "M", description: "Material context", type: "text", access: "item", optional: true },
          { name: "Limit", nickname: "L", description: "Max tips to return", type: "integer", access: "item", optional: true, defaultValue: 5 },
        ],
        outputs: [
          { name: "Tips", nickname: "T", description: "Tribal knowledge tips", type: "text", access: "list" },
          { name: "Confidence", nickname: "C", description: "Confidence scores", type: "number", access: "list" },
          { name: "Sources", nickname: "S", description: "Tip sources", type: "text", access: "list" },
        ],
        prismDispatcher: "prism_knowledge",
        prismAction: "tribal_search",
      }),

      // Material Lookup
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.material_lookup",
        name: "Material Lookup",
        nickname: "Mat",
        description: "Look up material properties and machining parameters",
        category: "PRISM Speed/Feed",
        subcategory: "Data",
        iconName: "prism_material_24.png",
        inputs: [
          { name: "MaterialName", nickname: "M", description: "Material name or grade", type: "text", access: "item" },
        ],
        outputs: [
          { name: "Hardness", nickname: "H", description: "Hardness (HRC or HB)", type: "number", access: "item" },
          { name: "Machinability", nickname: "Mc", description: "Machinability index", type: "number", access: "item" },
          { name: "Kc1_1", nickname: "Kc", description: "Specific cutting force (N/mm²)", type: "number", access: "item" },
          { name: "ISOGroup", nickname: "ISO", description: "ISO material group", type: "text", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "material_lookup",
      }),

      // Tool Select
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.tool_select",
        name: "Tool Selection",
        nickname: "Tl",
        description: "Recommend optimal tooling for an operation",
        category: "PRISM Speed/Feed",
        subcategory: "Select",
        iconName: "prism_tool_24.png",
        inputs: [
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "Operation", nickname: "Op", description: "Operation type", type: "text", access: "item" },
          { name: "FeatureSize", nickname: "Sz", description: "Feature size (mm)", type: "number", access: "item", optional: true },
          { name: "Depth", nickname: "D", description: "Feature depth (mm)", type: "number", access: "item", optional: true },
        ],
        outputs: [
          { name: "ToolType", nickname: "T", description: "Recommended tool type", type: "text", access: "item" },
          { name: "Diameter", nickname: "D", description: "Recommended diameter (mm)", type: "number", access: "item" },
          { name: "Coating", nickname: "C", description: "Recommended coating", type: "text", access: "item" },
          { name: "Grade", nickname: "G", description: "Carbide grade", type: "text", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "tool_recommend",
      }),

      // Cycle Time
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.cycle_time",
        name: "Cycle Time Estimate",
        nickname: "CT",
        description: "Estimate machining cycle time from geometry",
        category: "PRISM Analysis",
        subcategory: "Time",
        iconName: "prism_time_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Part geometry", type: "brep", access: "item" },
          { name: "StockSize", nickname: "S", description: "Stock bounding box", type: "geometry", access: "item", optional: true },
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "MachineType", nickname: "Mt", description: "Machine type", type: "text", access: "item", optional: true, defaultValue: "3-axis mill" },
        ],
        outputs: [
          { name: "CycleTime", nickname: "CT", description: "Total cycle time (min)", type: "number", access: "item" },
          { name: "RoughingTime", nickname: "RT", description: "Roughing time (min)", type: "number", access: "item" },
          { name: "FinishingTime", nickname: "FT", description: "Finishing time (min)", type: "number", access: "item" },
          { name: "MRR", nickname: "MRR", description: "Avg material removal rate (cm³/min)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "cycle_time_estimate",
      }),

      // Tolerance Check
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.tolerance_check",
        name: "Tolerance Feasibility",
        nickname: "Tol",
        description: "Check if tolerances are achievable with given process",
        category: "PRISM Analysis",
        subcategory: "Quality",
        iconName: "prism_tolerance_24.png",
        inputs: [
          { name: "Tolerance", nickname: "T", description: "Tolerance value (mm)", type: "number", access: "item" },
          { name: "Process", nickname: "P", description: "Manufacturing process", type: "text", access: "item" },
          { name: "FeatureType", nickname: "F", description: "Feature type (hole, slot, etc.)", type: "text", access: "item", optional: true },
        ],
        outputs: [
          { name: "Feasible", nickname: "OK", description: "Is tolerance achievable?", type: "boolean", access: "item" },
          { name: "ProcessCapability", nickname: "Cp", description: "Process capability index", type: "number", access: "item" },
          { name: "Recommendation", nickname: "R", description: "Process recommendation", type: "text", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "tolerance_feasibility",
      }),

      // Surface Finish
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.surface_finish",
        name: "Surface Finish Predictor",
        nickname: "Ra",
        description: "Predict achievable surface finish",
        category: "PRISM Analysis",
        subcategory: "Quality",
        iconName: "prism_surface_24.png",
        inputs: [
          { name: "FeedRate", nickname: "F", description: "Feed rate (mm/rev or mm/tooth)", type: "number", access: "item" },
          { name: "ToolRadius", nickname: "R", description: "Tool nose/corner radius (mm)", type: "number", access: "item" },
          { name: "Operation", nickname: "Op", description: "Operation type", type: "text", access: "item", optional: true },
        ],
        outputs: [
          { name: "Ra", nickname: "Ra", description: "Predicted Ra (µm)", type: "number", access: "item" },
          { name: "Rz", nickname: "Rz", description: "Predicted Rz (µm)", type: "number", access: "item" },
          { name: "Achievable", nickname: "OK", description: "Is finish achievable?", type: "boolean", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "surface_finish_predict",
      }),

      // Force Calculation
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.force_calc",
        name: "Cutting Force Calculator",
        nickname: "Fc",
        description: "Calculate cutting forces using Kienzle model",
        category: "PRISM Analysis",
        subcategory: "Physics",
        iconName: "prism_force_24.png",
        inputs: [
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "DepthOfCut", nickname: "ap", description: "Axial depth (mm)", type: "number", access: "item" },
          { name: "FeedPerTooth", nickname: "fz", description: "Feed per tooth (mm)", type: "number", access: "item" },
          { name: "WidthOfCut", nickname: "ae", description: "Radial width (mm)", type: "number", access: "item", optional: true },
        ],
        outputs: [
          { name: "CuttingForce", nickname: "Fc", description: "Main cutting force (N)", type: "number", access: "item" },
          { name: "FeedForce", nickname: "Ff", description: "Feed force (N)", type: "number", access: "item" },
          { name: "Power", nickname: "P", description: "Required power (kW)", type: "number", access: "item" },
          { name: "Torque", nickname: "T", description: "Spindle torque (Nm)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "cutting_force_kienzle",
      }),

      // Deflection
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.deflection",
        name: "Tool Deflection",
        nickname: "δ",
        description: "Calculate tool deflection under cutting load",
        category: "PRISM Analysis",
        subcategory: "Physics",
        iconName: "prism_deflection_24.png",
        inputs: [
          { name: "ToolDiameter", nickname: "D", description: "Tool diameter (mm)", type: "number", access: "item" },
          { name: "StickOut", nickname: "L", description: "Tool stickout (mm)", type: "number", access: "item" },
          { name: "CuttingForce", nickname: "F", description: "Cutting force (N)", type: "number", access: "item" },
          { name: "ToolMaterial", nickname: "TM", description: "Tool material", type: "text", access: "item", optional: true, defaultValue: "carbide" },
        ],
        outputs: [
          { name: "Deflection", nickname: "δ", description: "Tip deflection (mm)", type: "number", access: "item" },
          { name: "MaxDeflection", nickname: "δm", description: "Max recommended (mm)", type: "number", access: "item" },
          { name: "Safe", nickname: "OK", description: "Within safe limits?", type: "boolean", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "tool_deflection",
      }),

      // Thermal
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.thermal",
        name: "Thermal Analysis",
        nickname: "T°",
        description: "Estimate cutting zone temperature",
        category: "PRISM Analysis",
        subcategory: "Physics",
        iconName: "prism_thermal_24.png",
        inputs: [
          { name: "Material", nickname: "M", description: "Workpiece material", type: "text", access: "item" },
          { name: "CuttingSpeed", nickname: "Vc", description: "Cutting speed (m/min)", type: "number", access: "item" },
          { name: "FeedRate", nickname: "F", description: "Feed rate (mm/rev)", type: "number", access: "item" },
          { name: "Coolant", nickname: "C", description: "Coolant type", type: "text", access: "item", optional: true, defaultValue: "flood" },
        ],
        outputs: [
          { name: "Temperature", nickname: "T", description: "Estimated temp (°C)", type: "number", access: "item" },
          { name: "MaxSafe", nickname: "Tm", description: "Max safe temp (°C)", type: "number", access: "item" },
          { name: "Risk", nickname: "R", description: "Thermal risk level", type: "text", access: "item" },
        ],
        prismDispatcher: "prism_calc",
        prismAction: "thermal_estimate",
      }),

      // Toolpath Preview
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.toolpath_preview",
        name: "Toolpath Preview",
        nickname: "TP",
        description: "Generate toolpath preview curves from geometry",
        category: "PRISM Toolpath",
        subcategory: "Preview",
        iconName: "prism_toolpath_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Part geometry", type: "brep", access: "item" },
          { name: "Operation", nickname: "Op", description: "Operation type", type: "text", access: "item" },
          { name: "Stepover", nickname: "St", description: "Stepover (mm or %)", type: "number", access: "item", optional: true },
          { name: "Stepdown", nickname: "Sd", description: "Stepdown (mm)", type: "number", access: "item", optional: true },
        ],
        outputs: [
          { name: "Toolpath", nickname: "TP", description: "Toolpath curves", type: "curve", access: "list" },
          { name: "RapidMoves", nickname: "R", description: "Rapid move curves", type: "curve", access: "list" },
          { name: "TotalLength", nickname: "L", description: "Total path length (mm)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_cam",
        prismAction: "toolpath_preview",
      }),

      // STEP Export
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.step_export",
        name: "STEP Export",
        nickname: "STP",
        description: "Export geometry to STEP file",
        category: "PRISM Export",
        subcategory: "File",
        iconName: "prism_step_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Geometry to export", type: "brep", access: "list" },
          { name: "FilePath", nickname: "P", description: "Output file path", type: "path", access: "item" },
          { name: "Schema", nickname: "S", description: "STEP schema (AP203, AP214, AP242)", type: "text", access: "item", optional: true, defaultValue: "AP242" },
        ],
        outputs: [
          { name: "Success", nickname: "OK", description: "Export succeeded?", type: "boolean", access: "item" },
          { name: "FilePath", nickname: "P", description: "Output file path", type: "text", access: "item" },
          { name: "FileSize", nickname: "Sz", description: "File size (KB)", type: "number", access: "item" },
        ],
        prismDispatcher: "prism_cad",
        prismAction: "export_step",
      }),

      // Setup Sheet
      PRISMGHComponentDefSchema.parse({
        componentId: "prism.gh.setup_sheet",
        name: "Setup Sheet",
        nickname: "SS",
        description: "Generate setup sheet documentation",
        category: "PRISM Export",
        subcategory: "Documentation",
        iconName: "prism_setupsheet_24.png",
        inputs: [
          { name: "Geometry", nickname: "G", description: "Part geometry", type: "brep", access: "item" },
          { name: "Material", nickname: "M", description: "Material", type: "text", access: "item" },
          { name: "Operations", nickname: "Ops", description: "Operation list", type: "text", access: "list", optional: true },
          { name: "OutputPath", nickname: "P", description: "Output PDF path", type: "path", access: "item", optional: true },
        ],
        outputs: [
          { name: "PDFPath", nickname: "PDF", description: "Generated PDF path", type: "text", access: "item" },
          { name: "Preview", nickname: "Img", description: "Preview image", type: "text", access: "item" },
        ],
        prismDispatcher: "prism_cam",
        prismAction: "setup_sheet_generate",
      }),
    ];
  }
}

export const rhinoGrasshopperPRISMComponentsEngine = new RhinoGrasshopperPRISMComponentsEngine({
  dispatcher: {
    invoke: () => ({ ok: false, error: "Dispatcher not configured" }),
  },
});
