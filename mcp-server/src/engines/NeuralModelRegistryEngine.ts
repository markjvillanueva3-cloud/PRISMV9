/**
 * NeuralModelRegistryEngine — Model Versioning & Weight Persistence
 * ==================================================================
 *
 * P0-CRITICAL: Addresses scrutiny gaps for weight persistence and model version tracking.
 *
 * Features:
 *   1. MODEL CHECKPOINT SCHEMA — Semantic versioning, architecture metadata
 *   2. WEIGHT PERSISTENCE — Binary storage with SHA-256 checksums
 *   3. REGISTRY OPERATIONS — Register, promote, deprecate, rollback
 *   4. HOT LOADING — Load weights without restart
 *   5. G-CODE TAGGING — Embed model version in output headers
 *
 * Storage Layout:
 *   mcp-server/data/models/{modelId}/{version}/
 *     - checkpoint.json     — Model metadata
 *     - layer_{name}.bin    — Binary weight files
 *
 * Persistence: mcp-server/data/state/model-registry.json
 *
 * @module engines/NeuralModelRegistryEngine
 * @version 1.0.0
 */

import { promises as fs } from "fs";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { log } from "../utils/Logger.js";
import { atomicWrite } from "../utils/atomicWrite.js";

// ============================================================================
// TYPES — MODEL CHECKPOINT SCHEMA
// ============================================================================

/**
 * Supported neural network architectures
 */
export type ModelArchitecture =
  | "transformer"
  | "mlp"
  | "gnn"
  | "cnn"
  | "lstm"
  | "attention"
  | "hybrid"
  | "ensemble";

/**
 * Weight data types for storage
 */
export type WeightDtype = "float32" | "float16" | "int8" | "bfloat16";

/**
 * Model deployment lifecycle status
 */
export type DeploymentStatus =
  | "development"
  | "staging"
  | "production"
  | "deprecated"
  | "archived";

/**
 * Weight layer definition
 */
export interface WeightLayer {
  /** Layer name (e.g., "encoder.self_attn.q_proj") */
  layerName: string;
  /** Tensor shape (e.g., [512, 768]) */
  shape: number[];
  /** Data type */
  dtype: WeightDtype;
  /** Relative path to binary weights file */
  dataPath: string;
  /** SHA-256 checksum of the binary file */
  checksum: string;
}

/**
 * Training metadata for model provenance
 */
export interface TrainingMetadata {
  /** ISO timestamp when training completed */
  trainedAt: string;
  /** Number of training epochs */
  epochs: number;
  /** Final training loss value */
  finalLoss: number;
  /** Validation accuracy (0-1) */
  validationAccuracy: number;
  /** Dataset version used for training */
  datasetVersion: string;
  /** Optional: hardware used for training */
  hardware?: string;
  /** Optional: training duration in seconds */
  durationSeconds?: number;
  /** Optional: batch size used */
  batchSize?: number;
  /** Optional: learning rate */
  learningRate?: number;
}

/**
 * Complete model checkpoint definition
 */
export interface ModelCheckpoint {
  /** Unique model identifier (e.g., "pp-transformer") */
  modelId: string;
  /** Semantic version (e.g., "2.3.1") */
  version: string;
  /** Schema version for migrations */
  schemaVersion: number;
  /** Model architecture type */
  architecture: ModelArchitecture;
  /** Total trainable parameter count */
  parameterCount: number;
  /** Weight layer definitions */
  weights: WeightLayer[];
  /** Model configuration (hyperparameters, etc.) */
  config: Record<string, unknown>;
  /** Training provenance */
  trainingMetadata: TrainingMetadata;
  /** Current deployment status */
  deploymentStatus: DeploymentStatus;
  /** ISO timestamp when registered */
  registeredAt?: string;
  /** ISO timestamp of last status change */
  statusChangedAt?: string;
  /** Optional model description */
  description?: string;
  /** Optional tags for filtering */
  tags?: string[];
}

/**
 * Filter options for listing models
 */
export interface ModelFilter {
  architecture?: ModelArchitecture;
  deploymentStatus?: DeploymentStatus;
  minVersion?: string;
  tags?: string[];
  modelIdPrefix?: string;
}

/**
 * G-code model tag for output embedding
 */
export interface GCodeModelTag {
  modelId: string;
  version: string;
  generatedAt: string;
  confidence: number;
}

/**
 * Registry state persisted to disk
 */
interface RegistryState {
  schemaVersion: number;
  lastUpdated: string;
  models: Record<string, Record<string, ModelCheckpoint>>; // modelId -> version -> checkpoint
  activeVersions: Record<string, string>; // modelId -> active version for production
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SCHEMA_VERSION = 1;
const MODELS_DIR = "data/models";
const REGISTRY_FILE = "data/state/model-registry.json";

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Configuration options for NeuralModelRegistryEngine
 */
export interface NeuralModelRegistryOptions {
  /** Custom base directory (default: process.cwd()) */
  baseDir?: string;
  /** Custom models subdirectory (default: "data/models") */
  modelsSubdir?: string;
  /** Custom registry file path (default: "data/state/model-registry.json") */
  registrySubpath?: string;
}

/**
 * NeuralModelRegistryEngine — Model versioning and weight persistence
 *
 * Handles complete lifecycle of neural network models from development to deprecation.
 */
export class NeuralModelRegistryEngine {
  private baseDir: string;
  private modelsDir: string;
  private registryPath: string;
  private state: RegistryState;
  private loadedWeights: Map<string, Map<string, Float32Array>> = new Map();

  constructor(options?: NeuralModelRegistryOptions) {
    this.baseDir = options?.baseDir ?? path.resolve(process.cwd());
    this.modelsDir = path.join(this.baseDir, options?.modelsSubdir ?? MODELS_DIR);
    this.registryPath = path.join(this.baseDir, options?.registrySubpath ?? REGISTRY_FILE);
    this.state = this.loadState();
    this.ensureDirectories();
    log.info("[NeuralModelRegistry] Initialized with " + this.getModelCount() + " registered models");
  }

  /**
   * Reset state (for testing only)
   */
  _resetForTesting(): void {
    this.state = {
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      models: {},
      activeVersions: {},
    };
    this.loadedWeights.clear();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  /**
   * Load registry state from disk
   */
  private loadState(): RegistryState {
    try {
      if (existsSync(this.registryPath)) {
        const data = readFileSync(this.registryPath, "utf-8");
        const parsed = JSON.parse(data) as RegistryState;
        // Migrate if needed
        if (parsed.schemaVersion < SCHEMA_VERSION) {
          return this.migrateState(parsed);
        }
        return parsed;
      }
    } catch (err) {
      log.warn("[NeuralModelRegistry] Failed to load state, starting fresh: " + (err as Error).message);
    }
    return {
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
      models: {},
      activeVersions: {},
    };
  }

  /**
   * Migrate state from older schema versions
   */
  private migrateState(oldState: RegistryState): RegistryState {
    log.info(`[NeuralModelRegistry] Migrating state from v${oldState.schemaVersion} to v${SCHEMA_VERSION}`);
    // Currently no migrations needed — future-proofing structure
    return {
      ...oldState,
      schemaVersion: SCHEMA_VERSION,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save registry state to disk atomically
   */
  private async saveState(): Promise<void> {
    this.state.lastUpdated = new Date().toISOString();
    await atomicWrite(this.registryPath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Ensure required directories exist
   */
  private ensureDirectories(): void {
    if (!existsSync(this.modelsDir)) {
      mkdirSync(this.modelsDir, { recursive: true });
    }
    const stateDir = path.dirname(this.registryPath);
    if (!existsSync(stateDir)) {
      mkdirSync(stateDir, { recursive: true });
    }
  }

  /**
   * Get model directory path
   */
  private getModelDir(modelId: string, version: string): string {
    return path.join(this.modelsDir, modelId, version);
  }

  /**
   * Get total count of registered models
   */
  private getModelCount(): number {
    let count = 0;
    for (const versions of Object.values(this.state.models)) {
      count += Object.keys(versions).length;
    }
    return count;
  }

  // ==========================================================================
  // REGISTRY OPERATIONS
  // ==========================================================================

  /**
   * Register a new model checkpoint
   *
   * @param checkpoint - Model checkpoint to register
   * @returns Registered checkpoint with timestamps
   * @throws Error if model version already exists
   */
  async registerModel(checkpoint: ModelCheckpoint): Promise<{
    ok: boolean;
    checkpoint?: ModelCheckpoint;
    error?: string;
  }> {
    const { modelId, version } = checkpoint;

    // Check for duplicate
    if (this.state.models[modelId]?.[version]) {
      return {
        ok: false,
        error: `Model ${modelId} v${version} already registered. Use promoteModel or rollbackModel instead.`,
      };
    }

    // Validate version format (semver)
    if (!this.isValidSemver(version)) {
      return {
        ok: false,
        error: `Invalid version format: ${version}. Use semantic versioning (e.g., 1.0.0)`,
      };
    }

    // Create model directory
    const modelDir = this.getModelDir(modelId, version);
    if (!existsSync(modelDir)) {
      mkdirSync(modelDir, { recursive: true });
    }

    // Add registration timestamps
    const registered: ModelCheckpoint = {
      ...checkpoint,
      registeredAt: new Date().toISOString(),
      statusChangedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };

    // Store in state
    if (!this.state.models[modelId]) {
      this.state.models[modelId] = {};
    }
    this.state.models[modelId][version] = registered;

    // Set as active if first version or production
    if (!this.state.activeVersions[modelId] || registered.deploymentStatus === "production") {
      this.state.activeVersions[modelId] = version;
    }

    // Save checkpoint.json to model directory
    const checkpointPath = path.join(modelDir, "checkpoint.json");
    await atomicWrite(checkpointPath, JSON.stringify(registered, null, 2));

    // Persist state
    await this.saveState();

    log.info(`[NeuralModelRegistry] Registered ${modelId} v${version} (${registered.architecture}, ${registered.parameterCount.toLocaleString()} params)`);

    return { ok: true, checkpoint: registered };
  }

  /**
   * Get a model by ID and optional version
   *
   * @param modelId - Model identifier
   * @param version - Specific version or undefined for active version
   * @returns Model checkpoint or null if not found
   */
  getModel(modelId: string, version?: string): ModelCheckpoint | null {
    const modelVersions = this.state.models[modelId];
    if (!modelVersions) return null;

    if (version) {
      return modelVersions[version] ?? null;
    }

    // Return active version
    const activeVersion = this.state.activeVersions[modelId];
    if (activeVersion && modelVersions[activeVersion]) {
      return modelVersions[activeVersion];
    }

    // Fallback to latest
    const versions = Object.keys(modelVersions).sort(this.compareSemver);
    return versions.length > 0 ? modelVersions[versions[versions.length - 1]] : null;
  }

  /**
   * List models with optional filtering
   *
   * @param filter - Optional filter criteria
   * @returns Array of matching model checkpoints
   */
  listModels(filter?: ModelFilter): ModelCheckpoint[] {
    const results: ModelCheckpoint[] = [];

    for (const [modelId, versions] of Object.entries(this.state.models)) {
      if (filter?.modelIdPrefix && !modelId.startsWith(filter.modelIdPrefix)) {
        continue;
      }

      for (const checkpoint of Object.values(versions)) {
        if (filter?.architecture && checkpoint.architecture !== filter.architecture) {
          continue;
        }
        if (filter?.deploymentStatus && checkpoint.deploymentStatus !== filter.deploymentStatus) {
          continue;
        }
        if (filter?.minVersion && this.compareSemver(checkpoint.version, filter.minVersion) < 0) {
          continue;
        }
        if (filter?.tags?.length) {
          const modelTags = checkpoint.tags ?? [];
          if (!filter.tags.some((t) => modelTags.includes(t))) {
            continue;
          }
        }
        results.push(checkpoint);
      }
    }

    // Sort by modelId then version
    return results.sort((a, b) => {
      const idCmp = a.modelId.localeCompare(b.modelId);
      return idCmp !== 0 ? idCmp : this.compareSemver(a.version, b.version);
    });
  }

  /**
   * Promote a model to a new deployment status
   *
   * @param modelId - Model identifier
   * @param version - Version to promote
   * @param targetStatus - Target deployment status
   * @returns Success status
   */
  async promoteModel(
    modelId: string,
    version: string,
    targetStatus: DeploymentStatus
  ): Promise<{ ok: boolean; error?: string }> {
    const checkpoint = this.getModel(modelId, version);
    if (!checkpoint) {
      return { ok: false, error: `Model ${modelId} v${version} not found` };
    }

    // Validate promotion path
    const validTransitions: Record<DeploymentStatus, DeploymentStatus[]> = {
      development: ["staging", "deprecated"],
      staging: ["production", "development", "deprecated"],
      production: ["deprecated"],
      deprecated: ["archived"],
      archived: [],
    };

    const allowed = validTransitions[checkpoint.deploymentStatus];
    if (!allowed.includes(targetStatus)) {
      return {
        ok: false,
        error: `Cannot transition from ${checkpoint.deploymentStatus} to ${targetStatus}. Allowed: ${allowed.join(", ")}`,
      };
    }

    // If promoting to production, demote current production version
    if (targetStatus === "production") {
      for (const [ver, cp] of Object.entries(this.state.models[modelId])) {
        if (cp.deploymentStatus === "production" && ver !== version) {
          cp.deploymentStatus = "staging";
          cp.statusChangedAt = new Date().toISOString();
        }
      }
      this.state.activeVersions[modelId] = version;
    }

    // Update status
    checkpoint.deploymentStatus = targetStatus;
    checkpoint.statusChangedAt = new Date().toISOString();

    // Persist
    await this.saveState();
    const checkpointPath = path.join(this.getModelDir(modelId, version), "checkpoint.json");
    await atomicWrite(checkpointPath, JSON.stringify(checkpoint, null, 2));

    log.info(`[NeuralModelRegistry] Promoted ${modelId} v${version} to ${targetStatus}`);
    return { ok: true };
  }

  /**
   * Deprecate a model version
   *
   * @param modelId - Model identifier
   * @param version - Version to deprecate
   * @returns Success status
   */
  async deprecateModel(
    modelId: string,
    version: string
  ): Promise<{ ok: boolean; error?: string }> {
    return this.promoteModel(modelId, version, "deprecated");
  }

  /**
   * Rollback to a previous model version
   *
   * @param modelId - Model identifier
   * @param toVersion - Version to rollback to
   * @returns Success status with previous version info
   */
  async rollbackModel(
    modelId: string,
    toVersion: string
  ): Promise<{
    ok: boolean;
    previousVersion?: string;
    error?: string;
  }> {
    const target = this.getModel(modelId, toVersion);
    if (!target) {
      return { ok: false, error: `Model ${modelId} v${toVersion} not found` };
    }

    const currentActive = this.state.activeVersions[modelId];

    // Demote current production
    if (currentActive && this.state.models[modelId][currentActive]) {
      const current = this.state.models[modelId][currentActive];
      if (current.deploymentStatus === "production") {
        current.deploymentStatus = "staging";
        current.statusChangedAt = new Date().toISOString();
      }
    }

    // Promote target to production
    target.deploymentStatus = "production";
    target.statusChangedAt = new Date().toISOString();
    this.state.activeVersions[modelId] = toVersion;

    // Persist
    await this.saveState();

    log.info(`[NeuralModelRegistry] Rolled back ${modelId} from v${currentActive} to v${toVersion}`);
    return { ok: true, previousVersion: currentActive };
  }

  // ==========================================================================
  // WEIGHT STORAGE
  // ==========================================================================

  /**
   * Store weight data for a model layer
   *
   * @param modelId - Model identifier
   * @param version - Model version
   * @param layerName - Layer name
   * @param data - Weight data as Float32Array
   * @param dtype - Data type
   * @returns Weight layer metadata with checksum
   */
  async storeWeights(
    modelId: string,
    version: string,
    layerName: string,
    data: Float32Array,
    dtype: WeightDtype = "float32"
  ): Promise<{ ok: boolean; layer?: WeightLayer; error?: string }> {
    const checkpoint = this.getModel(modelId, version);
    if (!checkpoint) {
      return { ok: false, error: `Model ${modelId} v${version} not found. Register model first.` };
    }

    const modelDir = this.getModelDir(modelId, version);
    const safeLayerName = layerName.replace(/[/\\:*?"<>|]/g, "_");
    const dataPath = `layer_${safeLayerName}.bin`;
    const fullPath = path.join(modelDir, dataPath);

    // Compute checksum
    const buffer = Buffer.from(data.buffer);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Write binary data
    await fs.writeFile(fullPath, buffer);

    // Create layer metadata
    const layer: WeightLayer = {
      layerName,
      shape: [data.length], // Flattened shape, actual shape should be passed
      dtype,
      dataPath,
      checksum,
    };

    // Update checkpoint weights
    const existingIdx = checkpoint.weights.findIndex((w) => w.layerName === layerName);
    if (existingIdx >= 0) {
      checkpoint.weights[existingIdx] = layer;
    } else {
      checkpoint.weights.push(layer);
    }

    // Persist checkpoint
    await this.saveState();
    const checkpointPath = path.join(modelDir, "checkpoint.json");
    await atomicWrite(checkpointPath, JSON.stringify(checkpoint, null, 2));

    log.debug(`[NeuralModelRegistry] Stored weights for ${modelId} v${version} layer ${layerName} (${data.length * 4} bytes)`);

    return { ok: true, layer };
  }

  /**
   * Load weights for a model with checksum validation
   *
   * @param modelId - Model identifier
   * @param version - Model version
   * @returns Map of layer name to weight data
   */
  async loadWeights(
    modelId: string,
    version?: string
  ): Promise<{
    ok: boolean;
    weights?: Map<string, Float32Array>;
    error?: string;
    validationErrors?: string[];
  }> {
    const checkpoint = this.getModel(modelId, version);
    if (!checkpoint) {
      return { ok: false, error: `Model ${modelId}${version ? " v" + version : ""} not found` };
    }

    const actualVersion = version ?? this.state.activeVersions[modelId];
    const cacheKey = `${modelId}@${actualVersion}`;

    // Return cached if already loaded
    if (this.loadedWeights.has(cacheKey)) {
      return { ok: true, weights: this.loadedWeights.get(cacheKey) };
    }

    const modelDir = this.getModelDir(modelId, actualVersion);
    const weights = new Map<string, Float32Array>();
    const validationErrors: string[] = [];

    for (const layer of checkpoint.weights) {
      const fullPath = path.join(modelDir, layer.dataPath);

      try {
        const buffer = await fs.readFile(fullPath);

        // Validate checksum
        const actualChecksum = crypto.createHash("sha256").update(buffer).digest("hex");
        if (actualChecksum !== layer.checksum) {
          validationErrors.push(
            `Checksum mismatch for ${layer.layerName}: expected ${layer.checksum.slice(0, 8)}..., got ${actualChecksum.slice(0, 8)}...`
          );
          continue;
        }

        // Convert to Float32Array (assuming float32 storage)
        const float32 = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.length / 4);
        weights.set(layer.layerName, float32);
      } catch (err) {
        validationErrors.push(`Failed to load ${layer.layerName}: ${(err as Error).message}`);
      }
    }

    if (validationErrors.length > 0) {
      log.warn(`[NeuralModelRegistry] Weight validation errors for ${modelId} v${actualVersion}: ${validationErrors.length}`);
    }

    // Cache loaded weights
    this.loadedWeights.set(cacheKey, weights);

    log.info(`[NeuralModelRegistry] Loaded ${weights.size} weight layers for ${modelId} v${actualVersion}`);

    return { ok: true, weights, validationErrors: validationErrors.length > 0 ? validationErrors : undefined };
  }

  /**
   * Hot-reload weights without restart (clears cache for model)
   *
   * @param modelId - Model identifier
   * @param version - Optional specific version
   */
  invalidateWeightCache(modelId: string, version?: string): void {
    for (const key of this.loadedWeights.keys()) {
      if (key.startsWith(modelId + "@")) {
        if (!version || key === `${modelId}@${version}`) {
          this.loadedWeights.delete(key);
        }
      }
    }
    log.info(`[NeuralModelRegistry] Invalidated weight cache for ${modelId}${version ? " v" + version : ""}`);
  }

  // ==========================================================================
  // G-CODE TAGGING
  // ==========================================================================

  /**
   * Generate G-code header with model version information
   *
   * @param modelId - Model identifier
   * @param confidence - Confidence score (0-100)
   * @param version - Optional specific version
   * @returns G-code comment block with model info
   */
  generateGCodeTag(
    modelId: string,
    confidence: number,
    version?: string
  ): string {
    const checkpoint = this.getModel(modelId, version);
    const actualVersion = checkpoint?.version ?? version ?? "unknown";
    const timestamp = new Date().toISOString();

    const lines = [
      `(PRISM AI Model: ${modelId}-v${actualVersion})`,
      `(Generated: ${timestamp})`,
      `(Confidence: ${confidence.toFixed(1)}%)`,
    ];

    if (checkpoint) {
      lines.push(`(Architecture: ${checkpoint.architecture})`);
      if (checkpoint.trainingMetadata.validationAccuracy > 0) {
        lines.push(`(Validation Accuracy: ${(checkpoint.trainingMetadata.validationAccuracy * 100).toFixed(1)}%)`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Create G-code model tag object for structured embedding
   *
   * @param modelId - Model identifier
   * @param confidence - Confidence score (0-100)
   * @param version - Optional specific version
   * @returns Structured tag object
   */
  createGCodeModelTag(
    modelId: string,
    confidence: number,
    version?: string
  ): GCodeModelTag {
    const checkpoint = this.getModel(modelId, version);
    return {
      modelId,
      version: checkpoint?.version ?? version ?? "unknown",
      generatedAt: new Date().toISOString(),
      confidence,
    };
  }

  /**
   * Parse G-code header to extract model tag
   *
   * @param gcode - G-code string
   * @returns Extracted model tag or null
   */
  parseGCodeTag(gcode: string): GCodeModelTag | null {
    // Match model ID (may contain hyphens) followed by -v and version number
    // Format: (PRISM AI Model: model-id-v1.2.3)
    const modelMatch = gcode.match(/\(PRISM AI Model:\s*(.+?)-v(\d+\.\d+\.\d+[^)]*)\)/);
    const genMatch = gcode.match(/\(Generated:\s*([^)]+)\)/);
    const confMatch = gcode.match(/\(Confidence:\s*([\d.]+)%\)/);

    if (!modelMatch) return null;

    return {
      modelId: modelMatch[1].trim(),
      version: modelMatch[2].trim(),
      generatedAt: genMatch?.[1]?.trim() ?? "",
      confidence: confMatch ? parseFloat(confMatch[1]) : 0,
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Validate semantic version format
   */
  private isValidSemver(version: string): boolean {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/.test(version);
  }

  /**
   * Compare two semantic versions
   */
  private compareSemver(a: string, b: string): number {
    const parse = (v: string) => v.split(/[.-]/).map((x) => (isNaN(Number(x)) ? x : Number(x)));
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] ?? 0;
      const vb = pb[i] ?? 0;
      if (typeof va === "number" && typeof vb === "number") {
        if (va !== vb) return va - vb;
      } else {
        const cmp = String(va).localeCompare(String(vb));
        if (cmp !== 0) return cmp;
      }
    }
    return 0;
  }

  /**
   * Get active version for a model
   */
  getActiveVersion(modelId: string): string | null {
    return this.state.activeVersions[modelId] ?? null;
  }

  /**
   * Get all versions for a model
   */
  getModelVersions(modelId: string): string[] {
    const versions = this.state.models[modelId];
    if (!versions) return [];
    return Object.keys(versions).sort(this.compareSemver.bind(this));
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalModels: number;
    totalVersions: number;
    byArchitecture: Record<string, number>;
    byStatus: Record<string, number>;
    totalParameters: number;
  } {
    let totalVersions = 0;
    let totalParameters = 0;
    const byArchitecture: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const versions of Object.values(this.state.models)) {
      for (const cp of Object.values(versions)) {
        totalVersions++;
        totalParameters += cp.parameterCount;
        byArchitecture[cp.architecture] = (byArchitecture[cp.architecture] ?? 0) + 1;
        byStatus[cp.deploymentStatus] = (byStatus[cp.deploymentStatus] ?? 0) + 1;
      }
    }

    return {
      totalModels: Object.keys(this.state.models).length,
      totalVersions,
      byArchitecture,
      byStatus,
      totalParameters,
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const neuralModelRegistryEngine = new NeuralModelRegistryEngine();
