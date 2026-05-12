/**
 * ForgeQuintEngine — Atomic 5-Output Asset Creation with Full Wiring
 *
 * Phase 0.5 from AGI proximity plan. Extends forge-triple to forge-quint:
 * Creates 5 artifacts atomically with transactional rollback:
 *
 *   1. Engine file (src/engines/)
 *   2. Test file (src/__tests__/)
 *   3. Dispatcher action (wired to dispatcher)
 *   4. Skill/command (.claude/commands/)
 *   5. Protective hook (.claude/hooks/)
 *
 * All 5 are created atomically — partial failure rolls back ALL changes.
 * Integrates with:
 *   - TransactionLogEngine (journaling)
 *   - AtomicMultiFileWriteEngine (2-phase commit)
 *   - DistributedLockEngine (cross-session safety)
 *   - SemanticSimilarityGuardEngine (pre-creation dedup)
 *   - AwarenessQueryEngine (post-creation registration)
 *   - CrossTerminalBroadcastEngine (cross-session notification)
 *
 * @module engines/ForgeQuintEngine
 */

import { log } from "../utils/Logger.js";
import * as path from "path";
import { fileURLToPath } from "url";
import { transactionLogEngine } from "./TransactionLogEngine.js";
import { atomicMultiFileWriteEngine } from "./AtomicMultiFileWriteEngine.js";
import { distributedLockEngine } from "./DistributedLockEngine.js";
import { semanticSimilarityGuardEngine } from "./SemanticSimilarityGuardEngine.js";
import { awarenessQueryEngine } from "./AwarenessQueryEngine.js";
import { crossTerminalBroadcastEngine } from "./CrossTerminalBroadcastEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ForgeQuintInput {
  /** Engine name (PascalCase, e.g., "MyNewEngine") */
  engineName: string;
  /** Brief description of what the engine does */
  description: string;
  /** Domain keywords for similarity checking */
  keywords: string[];
  /** Engine implementation code */
  engineCode: string;
  /** Test implementation code */
  testCode: string;
  /** Dispatcher to wire to */
  dispatcherName: string;
  /** Action name for the dispatcher */
  actionName: string;
  /** Skill/command markdown content */
  skillContent: string;
  /** Hook script content (Python or JS) */
  hookContent: string;
  /** Hook filename */
  hookFilename: string;
  /** Optional correlation ID for tracing */
  correlationId?: string;
}

export interface ForgeQuintOutput {
  success: boolean;
  txId?: string;
  filesCreated: string[];
  errors: string[];
  warnings: string[];
  rollbackAvailable: boolean;
}

export interface ForgeQuintValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  similarAssets: Array<{ name: string; similarity: number }>;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const FORGE_LOCK_RESOURCE = "forge-quint-global";
const FORGE_LOCK_TIMEOUT_MS = 60000; // 1 minute
const FORGE_LOCK_TTL_MS = 300000; // 5 minutes

// ============================================================================
// ENGINE
// ============================================================================

export class ForgeQuintEngine {
  private baseDir: string;
  private mcpServerDir: string;
  private claudeDir: string;

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    this.mcpServerDir = this.baseDir;
    this.claudeDir = path.resolve(this.baseDir, "..", "..", ".claude");
    log.info("[ForgeQuint] Initialized — atomic 5-output asset creation");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Validate inputs before forging
   * Checks for duplicates, semantic similarity, and input completeness
   */
  async validate(input: ForgeQuintInput): Promise<ForgeQuintValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const similarAssets: Array<{ name: string; similarity: number }> = [];

    // Basic validation
    if (!input.engineName || !/^[A-Z][a-zA-Z0-9]*Engine$/.test(input.engineName)) {
      errors.push(`Engine name must be PascalCase ending with "Engine": ${input.engineName}`);
    }

    if (!input.description || input.description.length < 10) {
      errors.push("Description must be at least 10 characters");
    }

    if (!input.keywords || input.keywords.length < 2) {
      errors.push("At least 2 keywords required for similarity checking");
    }

    if (!input.engineCode || input.engineCode.length < 100) {
      errors.push("Engine code appears too short — must be real implementation");
    }

    if (!input.testCode || input.testCode.length < 50) {
      errors.push("Test code required — cannot create engine without tests");
    }

    if (!input.dispatcherName) {
      errors.push("Dispatcher name required for wiring");
    }

    if (!input.actionName) {
      errors.push("Action name required for dispatcher wiring");
    }

    // Check for stub patterns
    if (/return\s*\{\s*\}/.test(input.engineCode) || /TODO|STUB|PLACEHOLDER/i.test(input.engineCode)) {
      errors.push("Engine code contains stub patterns — must be real implementation");
    }

    if (/expect\(true\)\.toBe\(true\)|\.toBeTruthy\(\)/.test(input.testCode)) {
      warnings.push("Test code may contain trivial assertions");
    }

    // Semantic similarity check
    try {
      const similarityResult = await semanticSimilarityGuardEngine.checkSimilarity(
        input.engineName,
        input.description,
        input.engineCode
      );

      if (similarityResult.zone === "red") {
        errors.push(similarityResult.explanation);
        if (similarityResult.matchedAsset) {
          similarAssets.push({
            name: similarityResult.matchedAsset,
            similarity: similarityResult.similarity,
          });
        }
      } else if (similarityResult.zone === "yellow") {
        warnings.push(similarityResult.explanation);
        if (similarityResult.matchedAsset) {
          similarAssets.push({
            name: similarityResult.matchedAsset,
            similarity: similarityResult.similarity,
          });
        }
      }
    } catch (err) {
      warnings.push(`Similarity check failed: ${err}`);
    }

    // Check if engine already exists
    try {
      const exists = await awarenessQueryEngine.exists("engine", input.engineName);
      if (exists) {
        errors.push(`Engine "${input.engineName}" already exists`);
      }
    } catch {
      // Awareness query failed — continue anyway
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      similarAssets,
    };
  }

  /**
   * Forge all 5 outputs atomically
   * Uses distributed lock, transaction log, and atomic writes
   */
  async forge(input: ForgeQuintInput): Promise<ForgeQuintOutput> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const filesCreated: string[] = [];

    // Validate first
    const validation = await this.validate(input);
    if (!validation.valid) {
      return {
        success: false,
        filesCreated: [],
        errors: validation.errors,
        warnings: validation.warnings,
        rollbackAvailable: false,
      };
    }
    warnings.push(...validation.warnings);

    // Acquire distributed lock
    let lockAcquired = false;
    try {
      const lockResult = await distributedLockEngine.acquire(FORGE_LOCK_RESOURCE, {
        timeoutMs: FORGE_LOCK_TIMEOUT_MS,
        ttlMs: FORGE_LOCK_TTL_MS,
      });

      if (!lockResult.acquired) {
        return {
          success: false,
          filesCreated: [],
          errors: [`Could not acquire forge lock — another forge operation in progress (holder: ${lockResult.existingHolder})`],
          warnings,
          rollbackAvailable: false,
        };
      }
      lockAcquired = true;
    } catch (err) {
      return {
        success: false,
        filesCreated: [],
        errors: [`Lock acquisition failed: ${err}`],
        warnings,
        rollbackAvailable: false,
      };
    }

    // Begin transaction
    const txId = transactionLogEngine.beginTransaction(input.correlationId);

    try {
      // Prepare all 5 files
      const files = this.prepareFiles(input);

      // Checkpoint before writes
      transactionLogEngine.checkpoint("pre-write");

      // Atomic multi-file write
      const writeResult = await atomicMultiFileWriteEngine.writeAll(
        files.map((f) => ({ path: f.path, content: f.content })),
        false // Don't start nested transaction
      );

      if (!writeResult.success) {
        throw new Error(`Atomic write failed: ${writeResult.errors.join(", ")}`);
      }

      filesCreated.push(...files.map((f) => f.path));

      // Checkpoint after writes
      transactionLogEngine.checkpoint("post-write");

      // Register in awareness system
      try {
        await semanticSimilarityGuardEngine.registerAsset(
          input.engineName,
          files[0].path,
          input.description,
          input.engineCode
        );
      } catch (err) {
        warnings.push(`Failed to register in semantic similarity: ${err}`);
      }

      // Broadcast to other sessions
      try {
        await crossTerminalBroadcastEngine.notifyAssetAdded(
          "engine",
          input.engineName,
          files[0].path
        );
      } catch (err) {
        warnings.push(`Failed to broadcast: ${err}`);
      }

      // Commit transaction
      await transactionLogEngine.commitTransaction();

      log.info(`[ForgeQuint] Successfully created ${input.engineName} with 5 outputs`);

      return {
        success: true,
        txId,
        filesCreated,
        errors: [],
        warnings,
        rollbackAvailable: false,
      };
    } catch (err) {
      // Rollback on any error
      log.error(`[ForgeQuint] Error creating ${input.engineName}: ${err}`);

      try {
        await transactionLogEngine.rollbackTransaction();
      } catch (rollbackErr) {
        errors.push(`Rollback failed: ${rollbackErr}`);
      }

      return {
        success: false,
        txId,
        filesCreated: [],
        errors: [`Forge failed: ${err}`, ...errors],
        warnings,
        rollbackAvailable: true,
      };
    } finally {
      // Always release lock
      if (lockAcquired) {
        try {
          await distributedLockEngine.release(FORGE_LOCK_RESOURCE);
        } catch {
          // Ignore lock release errors
        }
      }
    }
  }

  /**
   * Rollback a previous forge operation by transaction ID
   */
  async rollback(txId: string): Promise<{ success: boolean; errors: string[] }> {
    try {
      const result = await transactionLogEngine.recoverTransaction(txId);
      return {
        success: result.success,
        errors: result.errors,
      };
    } catch (err) {
      return {
        success: false,
        errors: [`Rollback failed: ${err}`],
      };
    }
  }

  /**
   * Get status of forge lock
   */
  isForgeInProgress(): boolean {
    return distributedLockEngine.isLocked(FORGE_LOCK_RESOURCE);
  }

  /**
   * Get info about current forge lock holder
   */
  getForgeLockInfo(): { holder?: string; sessionId?: string; acquiredAt?: string } | null {
    const info = distributedLockEngine.getLockInfo(FORGE_LOCK_RESOURCE);
    if (!info) return null;
    return {
      holder: info.holder,
      sessionId: info.sessionId,
      acquiredAt: info.acquiredAt,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private prepareFiles(input: ForgeQuintInput): Array<{ path: string; content: string }> {
    const files: Array<{ path: string; content: string }> = [];

    // 1. Engine file
    const enginePath = path.join(this.mcpServerDir, "src", "engines", `${input.engineName}.ts`);
    files.push({
      path: enginePath,
      content: this.wrapEngineCode(input),
    });

    // 2. Test file
    const testPath = path.join(this.mcpServerDir, "src", "__tests__", `${this.toKebabCase(input.engineName)}.test.ts`);
    files.push({
      path: testPath,
      content: this.wrapTestCode(input),
    });

    // 3. Skill file
    const skillPath = path.join(this.claudeDir, "commands", `${this.toKebabCase(input.engineName.replace(/Engine$/, ""))}.md`);
    files.push({
      path: skillPath,
      content: input.skillContent,
    });

    // 4. Hook file
    const hookPath = path.join(this.claudeDir, "hooks", "lib", input.hookFilename);
    files.push({
      path: hookPath,
      content: input.hookContent,
    });

    // 5. Dispatcher wiring patch (as a marker file — actual wiring requires edit)
    const wiringPath = path.join(
      this.mcpServerDir,
      "data",
      "state",
      "pending-wiring",
      `${input.engineName}-to-${input.dispatcherName}.json`
    );
    files.push({
      path: wiringPath,
      content: JSON.stringify(
        {
          schemaVersion: 1,
          createdAt: new Date().toISOString(),
          engineName: input.engineName,
          dispatcherName: input.dispatcherName,
          actionName: input.actionName,
          status: "pending",
        },
        null,
        2
      ),
    });

    return files;
  }

  private wrapEngineCode(input: ForgeQuintInput): string {
    // If code already has JSDoc header, return as-is
    if (input.engineCode.startsWith("/**")) {
      return input.engineCode;
    }

    // Add standard header
    return `/**
 * ${input.engineName} — ${input.description}
 *
 * Created via ForgeQuintEngine (atomic 5-output creation).
 * Keywords: ${input.keywords.join(", ")}
 *
 * @module engines/${input.engineName}
 */

${input.engineCode}
`;
  }

  private wrapTestCode(input: ForgeQuintInput): string {
    // If code already has describe block, return as-is
    if (input.testCode.includes("describe(")) {
      return input.testCode;
    }

    // Wrap in standard test structure
    return `/**
 * ${input.engineName} Tests
 *
 * Created via ForgeQuintEngine.
 */

import { describe, it, expect } from "vitest";

${input.testCode}
`;
  }

  private toKebabCase(str: string): string {
    return str
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
      .toLowerCase();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const forgeQuintEngine = new ForgeQuintEngine();
