/**
 * AtomicMultiFileWriteEngine — 2-Phase Commit for Multi-File Operations
 *
 * Phase 0.3 from AGI proximity plan. All forge-quint writes go through:
 *   prepare (temp files) → fsync → rename
 *
 * Partial failure leaves zero visible changes. Integrates with
 * TransactionLogEngine for journaling and rollback.
 *
 * @module engines/AtomicMultiFileWriteEngine
 */

import { log } from "../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fileURLToPath } from "url";
import { transactionLogEngine } from "./TransactionLogEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FileOperation {
  path: string;
  content: string;
  encoding?: BufferEncoding;
}

export interface PreparedWrite {
  id: string;
  operations: PreparedOperation[];
  preparedAt: string;
  committed: boolean;
}

interface PreparedOperation {
  targetPath: string;
  tempPath: string;
  content: string;
  encoding: BufferEncoding;
  isNew: boolean;
  originalContent?: string;
}

export interface WriteResult {
  success: boolean;
  filesWritten: number;
  errors: string[];
  rollbackAvailable: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMP_DIR_PREFIX = "prism-atomic-";
const PREPARE_TIMEOUT_MS = 30000; // 30 seconds
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

// ============================================================================
// ENGINE
// ============================================================================

export class AtomicMultiFileWriteEngine {
  private baseDir: string;
  private preparedWrites: Map<string, PreparedWrite> = new Map();

  constructor() {
    const thisFile = fileURLToPath(import.meta.url);
    this.baseDir = path.resolve(path.dirname(thisFile), "..", "..");
    log.info("[AtomicMultiFile] Initialized — 2-phase commit for file operations");
  }

  // ============================================================================
  // MAIN API
  // ============================================================================

  /**
   * Atomic write of multiple files — all-or-nothing semantics
   *
   * @param operations Files to write
   * @param useTransaction Whether to integrate with TransactionLogEngine
   * @returns Result with success status and details
   */
  async writeAll(
    operations: FileOperation[],
    useTransaction = true
  ): Promise<WriteResult> {
    const errors: string[] = [];

    // Validate inputs
    for (const op of operations) {
      if (!op.path) {
        errors.push("Empty path in operation");
        continue;
      }
      if (op.content.length > MAX_FILE_SIZE_BYTES) {
        errors.push(`File ${op.path} exceeds max size (${MAX_FILE_SIZE_BYTES} bytes)`);
      }
    }

    if (errors.length > 0) {
      return { success: false, filesWritten: 0, errors, rollbackAvailable: false };
    }

    // Begin transaction if requested
    if (useTransaction && !transactionLogEngine.isInTransaction()) {
      transactionLogEngine.beginTransaction();
    }

    try {
      // Phase 1: Prepare (write to temp files)
      const prepared = await this.prepare(operations);

      // Phase 2: Commit (atomic rename)
      const result = await this.commit(prepared.id);

      return result;
    } catch (err) {
      // Rollback transaction on any error
      if (useTransaction && transactionLogEngine.isInTransaction()) {
        await transactionLogEngine.rollbackTransaction();
      }

      return {
        success: false,
        filesWritten: 0,
        errors: [`Write failed: ${err}`],
        rollbackAvailable: false,
      };
    }
  }

  /**
   * Phase 1: Prepare — Write all files to temp locations
   * Returns a prepared write ID that can be committed or aborted
   */
  async prepare(operations: FileOperation[]): Promise<PreparedWrite> {
    const prepareId = `prep-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    // WIRE-UNWIRED-PAPA/U-WIRE-ATOMIC-MULTIFILE (slot:papa 2026-05-26 iter2):
    // os.tmpdir() returns paths containing unexpanded `%SystemDrive%` on some
    // Windows-portable-Node configurations (incl. this repo's vitest harness),
    // which makes the temp path relative-to-cwd and crashes the rename phase
    // with EPERM. Fall back to baseDir/data/.atomic-temp/ in that case — same
    // drive as the engine itself + always expanded.
    const osTmp = os.tmpdir();
    const isSafeOsTmp = !osTmp.includes("%") && path.isAbsolute(osTmp);
    const tempBase = isSafeOsTmp ? osTmp : path.join(this.baseDir, "data", ".atomic-temp");
    const tempDir = path.join(tempBase, `${TEMP_DIR_PREFIX}${prepareId}`);

    // Create temp directory
    fs.mkdirSync(tempDir, { recursive: true });

    const preparedOps: PreparedOperation[] = [];

    try {
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        const encoding = op.encoding || "utf-8";
        const tempPath = path.join(tempDir, `file-${i}.tmp`);

        // Capture original content for rollback
        let originalContent: string | undefined;
        const isNew = !fs.existsSync(op.path);

        if (!isNew) {
          try {
            originalContent = fs.readFileSync(op.path, encoding);
          } catch {
            // File might be unreadable, that's OK
          }
        }

        // Ensure target directory exists
        const targetDir = path.dirname(op.path);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        // Write to temp file
        fs.writeFileSync(tempPath, op.content, { encoding });

        // Force sync to disk
        const fd = fs.openSync(tempPath, "r");
        fs.fsyncSync(fd);
        fs.closeSync(fd);

        preparedOps.push({
          targetPath: op.path,
          tempPath,
          content: op.content,
          encoding,
          isNew,
          originalContent,
        });
      }

      const prepared: PreparedWrite = {
        id: prepareId,
        operations: preparedOps,
        preparedAt: new Date().toISOString(),
        committed: false,
      };

      this.preparedWrites.set(prepareId, prepared);

      log.info(`[AtomicMultiFile] Prepared ${operations.length} files (id: ${prepareId})`);
      return prepared;
    } catch (err) {
      // Cleanup temp files on prepare failure
      this.cleanupTempDir(tempDir);
      throw err;
    }
  }

  /**
   * Phase 2: Commit — Atomically rename temp files to targets
   */
  async commit(prepareId: string): Promise<WriteResult> {
    const prepared = this.preparedWrites.get(prepareId);
    if (!prepared) {
      return {
        success: false,
        filesWritten: 0,
        errors: [`Prepared write ${prepareId} not found`],
        rollbackAvailable: false,
      };
    }

    if (prepared.committed) {
      return {
        success: false,
        filesWritten: 0,
        errors: [`Prepared write ${prepareId} already committed`],
        rollbackAvailable: false,
      };
    }

    const errors: string[] = [];
    let filesWritten = 0;

    try {
      // Rename all temp files to targets
      for (const op of prepared.operations) {
        try {
          // Record in transaction log
          if (transactionLogEngine.isInTransaction()) {
            transactionLogEngine.recordOperation(
              op.isNew ? "file_create" : "file_modify",
              op.targetPath,
              op.originalContent,
              op.content
            );
          }

          // Atomic rename (on same filesystem) or copy+delete
          if (this.canAtomicRename(op.tempPath, op.targetPath)) {
            fs.renameSync(op.tempPath, op.targetPath);
          } else {
            // Cross-filesystem: copy then delete temp
            fs.copyFileSync(op.tempPath, op.targetPath);
            fs.unlinkSync(op.tempPath);
          }

          filesWritten++;
        } catch (err) {
          errors.push(`Failed to commit ${op.targetPath}: ${err}`);
        }
      }

      prepared.committed = true;

      // Cleanup temp directory
      const tempDir = path.dirname(prepared.operations[0]?.tempPath || "");
      if (tempDir) {
        this.cleanupTempDir(tempDir);
      }

      // Commit transaction if we started it
      if (transactionLogEngine.isInTransaction()) {
        await transactionLogEngine.commitTransaction();
      }

      this.preparedWrites.delete(prepareId);

      log.info(`[AtomicMultiFile] Committed ${filesWritten} files`);

      return {
        success: errors.length === 0,
        filesWritten,
        errors,
        rollbackAvailable: false, // Already committed
      };
    } catch (err) {
      // Attempt rollback on commit failure
      await this.abort(prepareId);

      return {
        success: false,
        filesWritten,
        errors: [...errors, `Commit failed: ${err}`],
        rollbackAvailable: true,
      };
    }
  }

  /**
   * Abort a prepared write — cleanup temp files without committing
   */
  async abort(prepareId: string): Promise<boolean> {
    const prepared = this.preparedWrites.get(prepareId);
    if (!prepared) {
      return false;
    }

    if (prepared.committed) {
      log.warn(`[AtomicMultiFile] Cannot abort already committed write ${prepareId}`);
      return false;
    }

    // Cleanup temp files
    const tempDir = path.dirname(prepared.operations[0]?.tempPath || "");
    if (tempDir) {
      this.cleanupTempDir(tempDir);
    }

    this.preparedWrites.delete(prepareId);

    // Rollback transaction if active
    if (transactionLogEngine.isInTransaction()) {
      await transactionLogEngine.rollbackTransaction();
    }

    log.info(`[AtomicMultiFile] Aborted prepared write ${prepareId}`);
    return true;
  }

  /**
   * Write a single file atomically
   */
  async writeSingle(filePath: string, content: string, encoding: BufferEncoding = "utf-8"): Promise<WriteResult> {
    return this.writeAll([{ path: filePath, content, encoding }]);
  }

  /**
   * Check for stale prepared writes and clean them up
   */
  async cleanupStale(maxAgeMs = PREPARE_TIMEOUT_MS): Promise<number> {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, prepared] of this.preparedWrites) {
      const preparedTime = new Date(prepared.preparedAt).getTime();
      if (now - preparedTime > maxAgeMs && !prepared.committed) {
        await this.abort(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.info(`[AtomicMultiFile] Cleaned up ${cleaned} stale prepared writes`);
    }

    return cleaned;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private canAtomicRename(sourcePath: string, targetPath: string): boolean {
    // On Windows, cross-drive renames fail; on Unix, cross-filesystem renames fail
    // Simple heuristic: same drive letter (Windows) or same mount prefix
    const sourceRoot = path.parse(sourcePath).root;
    const targetRoot = path.parse(targetPath).root;
    return sourceRoot === targetRoot;
  }

  private cleanupTempDir(tempDir: string): void {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (err) {
      log.warn(`[AtomicMultiFile] Failed to cleanup temp dir: ${err}`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const atomicMultiFileWriteEngine = new AtomicMultiFileWriteEngine();
