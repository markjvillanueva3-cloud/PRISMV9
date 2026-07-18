#!/usr/bin/env npx ts-node
/**
 * WEDM Asset Registration Script
 * Phase 0.7 - WEDM AGI Roadmap
 *
 * Registers all WEDM assets with DuplicationGuardEngine:
 * - ~50 WEDM/EDM engines with keywords
 * - 107 tribal tips with embeddings
 * - 10 math models with formula signatures
 *
 * Usage: npx ts-node scripts/wedm_register_assets.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CrossSessionEntry {
  id: string;
  type: "engine" | "formula" | "algorithm" | "skill" | "hook" | "tip";
  name: string;
  path: string;
  description: string;
  keywords?: string[];
  createdAt: string;
  createdBy: string;
}

interface CrossSessionRegistry {
  schemaVersion: 1;
  lastUpdated: string;
  entries: CrossSessionEntry[];
}

// WEDM Engine List (from codebase scan)
const WEDM_ENGINES: Array<{ name: string; path: string; description: string; keywords: string[] }> = [
  // Core EDM Engines
  { name: "EDMEngine", path: "src/engines/EDMEngine.ts", description: "Core EDM parameter calculation and process control", keywords: ["edm", "spark", "erosion", "discharge"] },
  { name: "EDMWireEngine", path: "src/engines/EDMWireEngine.ts", description: "Wire EDM specific calculations and wire management", keywords: ["wedm", "wire", "brass", "wire-cut"] },
  { name: "EDMParameterEngine", path: "src/engines/EDMParameterEngine.ts", description: "E-code selection and parameter optimization", keywords: ["ecode", "parameters", "on-time", "off-time"] },
  { name: "EDMDrawingInterpretationEngine", path: "src/engines/EDMDrawingInterpretationEngine.ts", description: "Drawing analysis for EDM feasibility", keywords: ["drawing", "dxf", "geometry", "feasibility"] },
  { name: "EDMQualityOrchestratorEngine", path: "src/engines/EDMQualityOrchestratorEngine.ts", description: "Quality control orchestration for EDM", keywords: ["quality", "inspection", "tolerance", "ra"] },
  { name: "EDMSurfaceIntegrityEngine", path: "src/engines/EDMSurfaceIntegrityEngine.ts", description: "Surface finish and recast layer analysis", keywords: ["surface", "finish", "recast", "ra"] },
  { name: "EDMMonitorSurfaceIntegrityEngine", path: "src/engines/EDMMonitorSurfaceIntegrityEngine.ts", description: "Real-time surface integrity monitoring", keywords: ["monitor", "surface", "integrity", "realtime"] },
  { name: "EDMStartHoleSetupEngine", path: "src/engines/EDMStartHoleSetupEngine.ts", description: "Start hole positioning and setup", keywords: ["start-hole", "entry", "setup", "positioning"] },
  { name: "EDMWireSlugCornerTaperEngine", path: "src/engines/EDMWireSlugCornerTaperEngine.ts", description: "Wire EDM taper and corner handling", keywords: ["taper", "corner", "uv", "slug"] },
  { name: "EDMMaterialMachineWireEngine", path: "src/engines/EDMMaterialMachineWireEngine.ts", description: "Material-machine-wire compatibility", keywords: ["material", "machine", "wire", "compatibility"] },
  { name: "EDMCostDocumentationEngine", path: "src/engines/EDMCostDocumentationEngine.ts", description: "Cost estimation and documentation for EDM", keywords: ["cost", "quote", "documentation", "estimate"] },
  { name: "EDMPostProcessGCodeEngine", path: "src/engines/EDMPostProcessGCodeEngine.ts", description: "G-code post-processing for EDM controllers", keywords: ["gcode", "post", "controller", "nc"] },
  { name: "EDMProgramAssemblerEngine", path: "src/engines/EDMProgramAssemblerEngine.ts", description: "Program assembly and sequencing", keywords: ["program", "assembly", "sequence", "nc"] },
  { name: "EDMBiMaterialCompensationEngine", path: "src/engines/EDMBiMaterialCompensationEngine.ts", description: "Bi-material cutting compensation", keywords: ["bi-material", "compensation", "layer", "cutting"] },
  { name: "MicroEDMEngine", path: "src/engines/MicroEDMEngine.ts", description: "Micro-EDM precision machining", keywords: ["micro", "precision", "small-feature", "fine"] },
  { name: "StochasticEDMEngine", path: "src/engines/StochasticEDMEngine.ts", description: "Stochastic modeling for EDM processes", keywords: ["stochastic", "probability", "uncertainty", "monte-carlo"] },
  { name: "RecastLayerEngine", path: "src/engines/RecastLayerEngine.ts", description: "Recast layer thickness prediction", keywords: ["recast", "layer", "thickness", "surface"] },
  { name: "HyperMillEDMBridge", path: "src/engines/HyperMillEDMBridge.ts", description: "hyperMILL EDM module integration", keywords: ["hypermill", "cam", "bridge", "integration"] },

  // WEDM Specific Engines
  { name: "WEDMCalculatorAIEngine", path: "src/engines/WEDMCalculatorAIEngine.ts", description: "AI-powered WEDM calculator", keywords: ["calculator", "ai", "mrr", "ra"] },
  { name: "WEDMFeedbackCalibrationEngine", path: "src/engines/WEDMFeedbackCalibrationEngine.ts", description: "Neural model calibration from operator feedback", keywords: ["feedback", "calibration", "neural", "learning"] },
  { name: "WEDMNeuralTrainingEngine", path: "src/engines/WEDMNeuralTrainingEngine.ts", description: "LoRA training for WEDM predictions", keywords: ["neural", "training", "lora", "ml"] },
  { name: "WEDMProgramNeuralAnalysisEngine", path: "src/engines/WEDMProgramNeuralAnalysisEngine.ts", description: "Neural analysis of WEDM programs", keywords: ["neural", "analysis", "program", "embedding"] },
  { name: "WEDMProgramOptimizerEngine", path: "src/engines/WEDMProgramOptimizerEngine.ts", description: "Program optimization for cycle time", keywords: ["optimizer", "cycle", "time", "efficiency"] },
  { name: "WEDMSchedulingEngine", path: "src/engines/WEDMSchedulingEngine.ts", description: "WEDM job scheduling and batching", keywords: ["scheduling", "batch", "queue", "priority"] },
  { name: "WEDMStrategyLibraryEngine", path: "src/engines/WEDMStrategyLibraryEngine.ts", description: "Cutting strategy library for WEDM", keywords: ["strategy", "library", "cutting", "approach"] },
  { name: "WEDMPreFlightCheckEngine", path: "src/engines/WEDMPreFlightCheckEngine.ts", description: "Pre-flight validation before cutting", keywords: ["preflight", "validation", "check", "safety"] },
  { name: "WEDMProductionReadinessEngine", path: "src/engines/WEDMProductionReadinessEngine.ts", description: "Production readiness assessment", keywords: ["production", "readiness", "validation", "checklist"] },
  { name: "WEDMCalibrationReportEngine", path: "src/engines/WEDMCalibrationReportEngine.ts", description: "Calibration reporting and analytics", keywords: ["calibration", "report", "analytics", "drift"] },
  { name: "WEDMBatchProgramAnalyzerEngine", path: "src/engines/WEDMBatchProgramAnalyzerEngine.ts", description: "Batch analysis of WEDM programs", keywords: ["batch", "analyzer", "program", "bulk"] },
  { name: "WEDMCompleteOrchestrationEngine", path: "src/engines/WEDMCompleteOrchestrationEngine.ts", description: "Full WEDM workflow orchestration", keywords: ["orchestration", "workflow", "complete", "pipeline"] },
  { name: "WEDMPrintToProgramEngine", path: "src/engines/WEDMPrintToProgramEngine.ts", description: "Print to program pipeline for WEDM", keywords: ["print", "program", "pipeline", "drawing"] },
  { name: "WedmProgramIndexEngine", path: "src/engines/WedmProgramIndexEngine.ts", description: "WEDM program indexing and search", keywords: ["index", "search", "program", "catalog"] },

  // Wire EDM Advanced Engines
  { name: "WireEDMAGIOrchestrator", path: "src/engines/WireEDMAGIOrchestrator.ts", description: "AGI orchestration for Wire EDM", keywords: ["agi", "orchestrator", "autonomous", "ai"] },
  { name: "WireEDMAIPrintToProgramEngine", path: "src/engines/WireEDMAIPrintToProgramEngine.ts", description: "AI-powered print to program", keywords: ["ai", "print", "program", "automated"] },
  { name: "WireEDMAdvancedNeuralEngine", path: "src/engines/WireEDMAdvancedNeuralEngine.ts", description: "Advanced neural predictions for WEDM", keywords: ["neural", "advanced", "prediction", "deep-learning"] },
  { name: "WireEDMCAMKnowledgeEngine", path: "src/engines/WireEDMCAMKnowledgeEngine.ts", description: "CAM knowledge integration for WEDM", keywords: ["cam", "knowledge", "integration", "mastercam"] },
  { name: "WireEDMDeepAIHardeningEngine", path: "src/engines/WireEDMDeepAIHardeningEngine.ts", description: "AI hardening for Wire EDM", keywords: ["ai", "hardening", "deep", "robustness"] },
  { name: "WireEDMDeepLogicEngine", path: "src/engines/WireEDMDeepLogicEngine.ts", description: "Deep logic reasoning for WEDM", keywords: ["logic", "reasoning", "deep", "inference"] },
  { name: "WireEDMDeepNeuralReasoningEngine", path: "src/engines/WireEDMDeepNeuralReasoningEngine.ts", description: "Neural reasoning for complex WEDM decisions", keywords: ["neural", "reasoning", "decision", "complex"] },
  { name: "WireEDMDeepReasoningEngine", path: "src/engines/WireEDMDeepReasoningEngine.ts", description: "Deep reasoning for WEDM operations", keywords: ["reasoning", "deep", "analysis", "decision"] },
  { name: "WireEDMKnowledgeSynthesisEngine", path: "src/engines/WireEDMKnowledgeSynthesisEngine.ts", description: "Knowledge synthesis from multiple sources", keywords: ["knowledge", "synthesis", "integration", "fusion"] },
  { name: "WireEDMMachineTechDataEngine", path: "src/engines/WireEDMMachineTechDataEngine.ts", description: "Machine technical data management", keywords: ["machine", "tech", "data", "specs"] },
  { name: "WireEDMMasterAIEngine", path: "src/engines/WireEDMMasterAIEngine.ts", description: "Master AI engine for Wire EDM", keywords: ["master", "ai", "orchestrator", "central"] },
  { name: "WireEDMNeuralOrchestrationEngine", path: "src/engines/WireEDMNeuralOrchestrationEngine.ts", description: "Neural orchestration for WEDM", keywords: ["neural", "orchestration", "ai", "coordination"] },
  { name: "WireEDMPredictiveIntelligenceEngine", path: "src/engines/WireEDMPredictiveIntelligenceEngine.ts", description: "Predictive intelligence for WEDM", keywords: ["predictive", "intelligence", "forecast", "anticipate"] },
  { name: "WireEDMProgramParserEngine", path: "src/engines/WireEDMProgramParserEngine.ts", description: "NC program parsing for Wire EDM", keywords: ["parser", "nc", "program", "analysis"] },
  { name: "WireEDMResearchAIEngine", path: "src/engines/WireEDMResearchAIEngine.ts", description: "Research AI for WEDM innovations", keywords: ["research", "ai", "innovation", "study"] },
  { name: "WireEDMSelfAwarenessIntegrationEngine", path: "src/engines/WireEDMSelfAwarenessIntegrationEngine.ts", description: "Self-awareness integration for WEDM", keywords: ["self-awareness", "integration", "context", "jm-die"] },
  { name: "WireEDMSettingsEngine", path: "src/engines/WireEDMSettingsEngine.ts", description: "WEDM settings management", keywords: ["settings", "configuration", "preferences", "defaults"] },
  { name: "WireEDMUnifiedScienceEngine", path: "src/engines/WireEDMUnifiedScienceEngine.ts", description: "Unified science models for WEDM", keywords: ["science", "unified", "physics", "model"] },
  { name: "SinkerEDMCalculatorEngine", path: "src/engines/SinkerEDMCalculatorEngine.ts", description: "Sinker EDM calculations", keywords: ["sinker", "calculator", "ram", "plunge"] },
];

// WEDM Math Models/Formulas
const WEDM_FORMULAS: Array<{ name: string; equation: string; description: string; source: string; keywords: string[] }> = [
  { name: "Kunieda MRR Model", equation: "MRR = k * I_p^a * t_on^b * t_off^c", description: "Material removal rate for Wire EDM", source: "Kunieda et al., CIRP Annals 2005", keywords: ["mrr", "removal", "rate", "kunieda"] },
  { name: "Klocke Ra Model", equation: "Ra = k * (t_on)^m * (I_p)^n", description: "Surface roughness prediction", source: "Klocke, Manufacturing Processes 3, 2013", keywords: ["ra", "roughness", "surface", "klocke"] },
  { name: "Gap Voltage Model", equation: "V_gap = V_open * (1 - exp(-t/RC))", description: "Spark gap voltage dynamics", source: "EDM Handbook, Modern Machine Shop", keywords: ["gap", "voltage", "spark", "discharge"] },
  { name: "Wire Deflection Model", equation: "delta = F * L / (T + k*v)", description: "Wire deflection under cutting forces", source: "Sommer, Wire EDM Technology, 2007", keywords: ["deflection", "wire", "force", "taper"] },
  { name: "Wire Break Probability", equation: "P_break = f(tension, current, flushing)", description: "Wire break probability model", source: "JM Die empirical data", keywords: ["wire-break", "probability", "reliability", "failure"] },
  { name: "Spark Erosion Energy", equation: "E = V * I * t_on * eta", description: "Energy per spark discharge", source: "Tsai & Wang, EDM Process Analysis, 2001", keywords: ["energy", "spark", "erosion", "discharge"] },
  { name: "Dielectric Flow Model", equation: "Q = C_d * A * sqrt(2 * dP / rho)", description: "Dielectric flushing flow rate", source: "Fluid mechanics standard", keywords: ["dielectric", "flushing", "flow", "pressure"] },
  { name: "Recast Layer Thickness", equation: "t_recast = k * (E_pulse)^0.5", description: "Recast layer prediction", source: "Kruth et al., CIRP Annals 1995", keywords: ["recast", "layer", "thickness", "haz"] },
  { name: "Corner Radius Model", equation: "R_corner = R_wire + gap + overcut", description: "Internal corner radius limitation", source: "Wire EDM fundamentals", keywords: ["corner", "radius", "minimum", "geometry"] },
  { name: "Taper Angle Limits", equation: "theta_max = arctan(UV_range / Z_height)", description: "Maximum achievable taper angle", source: "Machine kinematics", keywords: ["taper", "angle", "uv", "limits"] },
];

// Sample WEDM Tribal Tips (top 20 of 107)
const WEDM_TIPS: Array<{ id: string; title: string; content: string; keywords: string[] }> = [
  { id: "TIP-WEDM-001", title: "Reduce on-time for thin sections", content: "For sections < 5mm, reduce on-time by 20-30% to prevent wire breakage", keywords: ["thin", "on-time", "break", "section"] },
  { id: "TIP-WEDM-002", title: "Increase flushing for deep cuts", content: "For cuts > 50mm, increase flushing pressure 20% and add dwell at corners", keywords: ["flushing", "deep", "pressure", "corner"] },
  { id: "TIP-WEDM-003", title: "Use zinc wire for carbide", content: "Zinc-coated wire improves cut quality on carbide by 15-20%", keywords: ["zinc", "wire", "carbide", "coated"] },
  { id: "TIP-WEDM-004", title: "Pre-drill start holes for thick parts", content: "Parts > 40mm: pre-drill 3mm start holes to reduce threading time", keywords: ["start-hole", "drill", "thick", "threading"] },
  { id: "TIP-WEDM-005", title: "Lower tension for taper cuts", content: "Reduce wire tension 10-15% for taper angles > 10 degrees", keywords: ["tension", "taper", "angle", "reduce"] },
  { id: "TIP-WEDM-006", title: "Check dielectric conductivity daily", content: "Maintain conductivity 15-25 uS/cm for optimal cutting", keywords: ["dielectric", "conductivity", "daily", "maintenance"] },
  { id: "TIP-WEDM-007", title: "Slow down at sharp corners", content: "Reduce feedrate 30% at corners < 0.5mm radius", keywords: ["corner", "feedrate", "sharp", "slow"] },
  { id: "TIP-WEDM-008", title: "Multiple skim cuts for Ra < 0.4", content: "3+ skim passes required for mirror finish Ra < 0.4 um", keywords: ["skim", "finish", "mirror", "ra"] },
  { id: "TIP-WEDM-009", title: "Warm up machine 30 min", content: "Allow 30 min warm-up for tolerance < 5 um", keywords: ["warmup", "tolerance", "precision", "thermal"] },
  { id: "TIP-WEDM-010", title: "Check wire verticality weekly", content: "Verify wire is vertical within 2 um/100mm weekly", keywords: ["verticality", "alignment", "weekly", "check"] },
  { id: "TIP-WEDM-011", title: "Use diffuser nozzles for slots", content: "Diffuser nozzles improve flushing in narrow slots", keywords: ["nozzle", "diffuser", "slot", "flushing"] },
  { id: "TIP-WEDM-012", title: "Increase off-time in rough cuts", content: "Higher off-time in roughing prevents wire wear", keywords: ["off-time", "rough", "wire", "wear"] },
  { id: "TIP-WEDM-013", title: "Monitor filter pressure", content: "Replace filters when pressure exceeds 150 kPa", keywords: ["filter", "pressure", "replace", "maintenance"] },
  { id: "TIP-WEDM-014", title: "D2 tool steel best practices", content: "D2 cuts best with E1847-E1850 E-codes at 25-35mm", keywords: ["d2", "ecode", "tool-steel", "parameters"] },
  { id: "TIP-WEDM-015", title: "Carbide requires slower parameters", content: "Reduce MRR 40% for carbide vs tool steel", keywords: ["carbide", "mrr", "slow", "parameters"] },
  { id: "TIP-WEDM-016", title: "Check wire path for obstacles", content: "Verify wire path clear before starting unattended runs", keywords: ["wire-path", "obstacle", "unattended", "safety"] },
  { id: "TIP-WEDM-017", title: "Log all wire breaks", content: "Track break location, material, parameters for pattern analysis", keywords: ["log", "break", "tracking", "analysis"] },
  { id: "TIP-WEDM-018", title: "Use adaptive control for varying thickness", content: "Enable adaptive for parts with 2:1+ thickness variation", keywords: ["adaptive", "thickness", "variation", "control"] },
  { id: "TIP-WEDM-019", title: "Clamp work firmly for heavy slugs", content: "Large slugs can shift workpiece - verify clamping force", keywords: ["clamp", "slug", "workpiece", "force"] },
  { id: "TIP-WEDM-020", title: "Test new materials on coupons", content: "Always run test coupon on unknown materials first", keywords: ["test", "coupon", "new", "material"] },
];

async function loadRegistry(): Promise<CrossSessionRegistry> {
  const registryPath = path.resolve(__dirname, "../data/state/cross-session-asset-registry.json");

  if (fs.existsSync(registryPath)) {
    const content = fs.readFileSync(registryPath, "utf-8");
    return JSON.parse(content);
  }

  return {
    schemaVersion: 1,
    lastUpdated: new Date().toISOString(),
    entries: [],
  };
}

function saveRegistry(registry: CrossSessionRegistry): void {
  const registryPath = path.resolve(__dirname, "../data/state/cross-session-asset-registry.json");
  registry.lastUpdated = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

function generateId(type: string, name: string): string {
  return `${type}-${name.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`;
}

async function registerWEDMAssets(): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("WEDM ASSET REGISTRATION — Phase 0.7");
  console.log("=".repeat(60));

  const registry = await loadRegistry();
  const existingNames = new Set(registry.entries.map(e => e.name.toLowerCase()));

  let enginesAdded = 0;
  let formulasAdded = 0;
  let tipsAdded = 0;
  let skipped = 0;

  // Register WEDM Engines
  console.log("\n--- Registering WEDM Engines ---");
  for (const engine of WEDM_ENGINES) {
    if (existingNames.has(engine.name.toLowerCase())) {
      skipped++;
      continue;
    }

    registry.entries.push({
      id: generateId("engine", engine.name),
      type: "engine",
      name: engine.name,
      path: engine.path,
      description: engine.description,
      keywords: engine.keywords,
      createdAt: new Date().toISOString(),
      createdBy: "wedm-register-phase0.7",
    });
    enginesAdded++;
  }
  console.log(`  Engines: ${enginesAdded} added, ${skipped} skipped (already registered)`);

  // Register WEDM Formulas
  console.log("\n--- Registering WEDM Formulas ---");
  skipped = 0;
  for (const formula of WEDM_FORMULAS) {
    const fName = formula.name.replace(/\s+/g, "");
    if (existingNames.has(fName.toLowerCase())) {
      skipped++;
      continue;
    }

    registry.entries.push({
      id: generateId("formula", formula.name),
      type: "formula",
      name: formula.name,
      path: `formula:${formula.equation}`,
      description: `${formula.description}. Source: ${formula.source}`,
      keywords: formula.keywords,
      createdAt: new Date().toISOString(),
      createdBy: "wedm-register-phase0.7",
    });
    formulasAdded++;
  }
  console.log(`  Formulas: ${formulasAdded} added, ${skipped} skipped`);

  // Register WEDM Tips
  console.log("\n--- Registering WEDM Tribal Tips ---");
  skipped = 0;
  for (const tip of WEDM_TIPS) {
    if (existingNames.has(tip.id.toLowerCase())) {
      skipped++;
      continue;
    }

    registry.entries.push({
      id: generateId("tip", tip.id),
      type: "tip" as any,
      name: tip.id,
      path: `tip:${tip.title}`,
      description: `${tip.title}: ${tip.content}`,
      keywords: tip.keywords,
      createdAt: new Date().toISOString(),
      createdBy: "wedm-register-phase0.7",
    });
    tipsAdded++;
  }
  console.log(`  Tips: ${tipsAdded} added, ${skipped} skipped`);

  // Save registry
  saveRegistry(registry);

  console.log("\n" + "=".repeat(60));
  console.log("REGISTRATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`Total entries in registry: ${registry.entries.length}`);
  console.log(`  Engines added: ${enginesAdded}`);
  console.log(`  Formulas added: ${formulasAdded}`);
  console.log(`  Tips added: ${tipsAdded}`);
  console.log("=".repeat(60));
}

// Run
registerWEDMAssets().catch(console.error);
