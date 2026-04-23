/**
 * CADArtifactStorageEngine — U-CINF07 (CAD-INFRA-MS0)
 *
 * Persists per-file CAD regression-test artifacts to a canonical on-disk
 * layout and enforces a retention policy that keeps only the most recent N
 * batches. Each file in a batch has a directory containing up to four
 * artifact kinds:
 *
 *   expected_step  — baseline ground-truth STEP
 *   actual_step    — STEP produced by this run
 *   diff_png       — pixel-diff overlay between the two
 *   error_log      — captured error text / stack
 *
 * Layout:
 *   data/cad-test-artifacts/{batchId}/{fileId}/expected.step
 *                                              /actual.step
 *                                              /diff.png
 *                                              /error.log
 *
 * Retention:
 *   DEFAULT_MAX_BATCHES = 5. On each pruneRetention() call, batches sorted
 *   by modification time are retained newest-first up to the limit; older
 *   batches are removed recursively. Safe on missing directory (no-op).
 *
 * Determinism:
 *   - All writes are atomic (utils/atomicWrite.ts) → crash-safe.
 *   - Path helpers are pure functions so consumers can construct artifact
 *     URIs for the dashboard/report without touching the engine instance.
 *
 * Duplication check: closest existing engine is DocumentArtifactEngine
 * (document-domain artifact persistence). Different layout, different
 * retention policy, different schema. Safe to create.
 *
 * @module engines/CADArtifactStorageEngine
 */

import * as nodePath from "path";
import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";

// ── Kinds ─────────────────────────────────────────────────────────────────────

export const ARTIFACT_KINDS = [
  "expected_step",
  "actual_step",
  "diff_png",
  "error_log",
] as const;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

const KIND_FILENAME: Record<ArtifactKind, string> = {
  expected_step: "expected.step",
  actual_step: "actual.step",
  diff_png: "diff.png",
  error_log: "error.log",
};

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_ARTIFACT_ROOT = nodePath.resolve(
  process.cwd(),
  "data/cad-test-artifacts",
);

/** Keep most recent N batches; older batches are pruned. */
export const DEFAULT_MAX_BATCHES = 5;

// ── Injectable FS ─────────────────────────────────────────────────────────────

export interface ArtifactFS {
  existsSync(p: string): boolean;
  mkdirSync(p: string, opts?: { recursive?: boolean }): void;
  readdirSync(p: string, opts: { withFileTypes: true }): Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  readdirSync(p: string): string[];
  statSync(p: string): { mtimeMs: number; size: number; isDirectory(): boolean };
  rmSync?(p: string, opts?: { recursive?: boolean; force?: boolean }): void;
}

// ── Output shape ──────────────────────────────────────────────────────────────

export interface ArtifactRecord {
  batchId: string;
  fileId: string;
  kind: ArtifactKind;
  /** Absolute resolved path on disk. */
  absolutePath: string;
  /** Size in bytes of the written data (buffer.byteLength or string UTF-8 length). */
  sizeBytes: number;
}

export interface BatchManifest {
  batchId: string;
  fileCount: number;
  artifactCount: number;
  /** Per-file records: fileId → { kind → ArtifactRecord } */
  byFile: Record<string, Partial<Record<ArtifactKind, ArtifactRecord>>>;
}

export interface RetentionReport {
  root: string;
  retained: string[];
  pruned: string[];
  maxBatches: number;
}

// ── Pure path helpers ─────────────────────────────────────────────────────────

/** Canonical directory for a batch. */
export function batchDir(batchId: string, root: string = DEFAULT_ARTIFACT_ROOT): string {
  return nodePath.join(root, batchId);
}

/** Canonical directory for a single file within a batch. */
export function fileDir(batchId: string, fileId: string, root: string = DEFAULT_ARTIFACT_ROOT): string {
  return nodePath.join(batchDir(batchId, root), fileId);
}

/** Canonical path for a single artifact. */
export function artifactPath(
  batchId: string,
  fileId: string,
  kind: ArtifactKind,
  root: string = DEFAULT_ARTIFACT_ROOT,
): string {
  return nodePath.join(fileDir(batchId, fileId, root), KIND_FILENAME[kind]);
}

// ── Engine ────────────────────────────────────────────────────────────────────

export class CADArtifactStorageEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADArtifactStorageEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Per-file artifact storage for CAD regression: STEP expected/actual, " +
        "diff PNG, error log. Atomic writes, 5-batch retention policy.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "write",
        description: "Persist a single artifact",
        actions: ["cad_artifact_write"],
      },
      {
        name: "list",
        description: "List artifact records for a batch",
        actions: ["cad_artifact_list"],
      },
      {
        name: "prune",
        description: "Enforce retention policy — keep latest N batches",
        actions: ["cad_artifact_prune"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    const o = input as { op?: unknown };
    if (typeof o.op !== "string") return "input.op must be a string";
    if (!["write", "list", "prune"].includes(o.op as string)) {
      return `input.op must be write|list|prune (got ${o.op})`;
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const o = input as {
      op: "write" | "list" | "prune";
      batchId?: string;
      fileId?: string;
      kind?: ArtifactKind;
      data?: string | Uint8Array;
      root?: string;
      maxBatches?: number;
      fs?: ArtifactFS;
    };
    if (o.op === "write") {
      if (!o.batchId || !o.fileId || !o.kind || o.data === undefined) {
        throw new Error("write requires batchId, fileId, kind, data");
      }
      return this.write(o.batchId, o.fileId, o.kind, o.data, o.root, o.fs);
    }
    if (o.op === "list") {
      if (!o.batchId) throw new Error("list requires batchId");
      return this.listBatch(o.batchId, o.root, o.fs);
    }
    if (o.op === "prune") {
      return this.pruneRetention(o.maxBatches, o.root, o.fs);
    }
    throw new Error(`unknown op ${o.op}`);
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Persist a single artifact atomically.
   *
   * @param batchId - UUID of the regression batch
   * @param fileId  - SHA-256 fileId from the master index
   * @param kind    - One of expected_step|actual_step|diff_png|error_log
   * @param data    - String (text artifacts) or Uint8Array (binary artifacts)
   * @param root    - Artifact root directory (defaults to DEFAULT_ARTIFACT_ROOT)
   * @param fsImpl  - Injectable FS (for testing)
   * @returns The ArtifactRecord describing the written file.
   */
  async write(
    batchId: string,
    fileId: string,
    kind: ArtifactKind,
    data: string | Uint8Array,
    root: string = DEFAULT_ARTIFACT_ROOT,
    fsImpl?: ArtifactFS,
  ): Promise<ArtifactRecord> {
    const fs = fsImpl ?? (await this._defaultFS());
    const dir = fileDir(batchId, fileId, root);
    fs.mkdirSync(dir, { recursive: true });
    const abs = artifactPath(batchId, fileId, kind, root);

    // atomicWrite handles both string and binary via utf-8; for binary we
    // convert Uint8Array → base64 is not appropriate — we need raw bytes.
    // atomicWrite.ts writes utf-8 strings, so for binary we use a small
    // direct write path.
    let sizeBytes: number;
    if (typeof data === "string") {
      await atomicWrite(abs, data);
      sizeBytes = Buffer.byteLength(data, "utf-8");
    } else {
      await this._writeBinaryAtomic(abs, data);
      sizeBytes = data.byteLength;
    }

    return { batchId, fileId, kind, absolutePath: abs, sizeBytes };
  }

  /**
   * List every artifact in a batch as a BatchManifest.
   * Missing batch dir → returns empty manifest.
   */
  async listBatch(
    batchId: string,
    root: string = DEFAULT_ARTIFACT_ROOT,
    fsImpl?: ArtifactFS,
  ): Promise<BatchManifest> {
    const fs = fsImpl ?? (await this._defaultFS());
    const manifest: BatchManifest = {
      batchId,
      fileCount: 0,
      artifactCount: 0,
      byFile: {},
    };
    const bd = batchDir(batchId, root);
    if (!fs.existsSync(bd)) return manifest;

    const fileEntries = fs.readdirSync(bd, { withFileTypes: true }) as Array<{
      name: string;
      isDirectory(): boolean;
    }>;
    for (const fileEntry of fileEntries) {
      if (!fileEntry.isDirectory()) continue;
      const fileId = fileEntry.name;
      const fd = fileDir(batchId, fileId, root);
      const perKind: Partial<Record<ArtifactKind, ArtifactRecord>> = {};
      for (const kind of ARTIFACT_KINDS) {
        const path = artifactPath(batchId, fileId, kind, root);
        if (!fs.existsSync(path)) continue;
        const stat = fs.statSync(path);
        perKind[kind] = {
          batchId,
          fileId,
          kind,
          absolutePath: path,
          sizeBytes: stat.size,
        };
        manifest.artifactCount++;
      }
      if (Object.keys(perKind).length > 0) {
        manifest.byFile[fileId] = perKind;
        manifest.fileCount++;
      }
    }
    return manifest;
  }

  /**
   * Enforce the retention policy: keep the newest `maxBatches` batches
   * (by mtime); recursively prune older ones.
   *
   * @param maxBatches - Number of batches to retain (default 5).
   * @param root       - Artifact root (default DEFAULT_ARTIFACT_ROOT).
   * @param fsImpl     - Injectable FS (for testing).
   */
  async pruneRetention(
    maxBatches: number = DEFAULT_MAX_BATCHES,
    root: string = DEFAULT_ARTIFACT_ROOT,
    fsImpl?: ArtifactFS,
  ): Promise<RetentionReport> {
    const fs = fsImpl ?? (await this._defaultFS());
    const cap = Math.max(0, maxBatches);
    const report: RetentionReport = { root, retained: [], pruned: [], maxBatches: cap };

    if (!fs.existsSync(root)) return report;

    const entries = (fs.readdirSync(root, { withFileTypes: true }) as Array<{
      name: string;
      isDirectory(): boolean;
    }>).filter((e) => e.isDirectory());

    const sorted = entries
      .map((e) => {
        const bd = nodePath.join(root, e.name);
        const stat = fs.statSync(bd);
        return { batchId: e.name, absolutePath: bd, mtimeMs: stat.mtimeMs };
      })
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    for (let i = 0; i < sorted.length; i++) {
      if (i < cap) {
        report.retained.push(sorted[i].batchId);
      } else {
        report.pruned.push(sorted[i].batchId);
        if (fs.rmSync) {
          fs.rmSync(sorted[i].absolutePath, { recursive: true, force: true });
        }
      }
    }
    return report;
  }

  // ── Private ─────────────────────────────────────────────────────────────────

  private async _defaultFS(): Promise<ArtifactFS> {
    const mod = await import("fs");
    return mod as unknown as ArtifactFS;
  }

  /**
   * Binary atomic write via tmp + rename. Mirrors atomicWrite.ts behaviour
   * but handles Uint8Array payloads (atomicWrite.ts is string-only).
   */
  private async _writeBinaryAtomic(abs: string, data: Uint8Array): Promise<void> {
    const { writeFile, rename, unlink } = await import("fs/promises");
    const tmp = `${abs}.${Date.now()}.tmp`;
    try {
      await writeFile(tmp, data);
      await rename(tmp, abs);
    } catch (err) {
      try { await unlink(tmp); } catch { /* best-effort */ }
      throw err;
    }
  }
}

/** Singleton for dispatcher use. */
export const cadArtifactStorageEngine = new CADArtifactStorageEngine();
