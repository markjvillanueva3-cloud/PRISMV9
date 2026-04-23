/**
 * GapPredictorEngine — U-FORE-03 (PSAU-FORESIGHT)
 * ================================================
 *
 * Scans a file (or set of files) against the CommonlyMissedPatternsRegistry
 * and reports every gap that would otherwise ship unfixed. Each finding
 * includes severity (1-5) and a concrete fix string.
 *
 * Designed to run in <100ms per file so it can live inside PreToolUse
 * hooks or pre-commit gates.
 */

import * as fs from "node:fs";
import {
  PATTERNS,
  PATTERNS_BY_ID,
  type GapArtifact,
  type Severity,
} from "./CommonlyMissedPatternsRegistry.js";

export interface GapFinding {
  patternId: string;
  title: string;
  severity: Severity;
  filePath: string;
  fix: string;
}

export interface GapReport {
  filePath: string;
  findings: GapFinding[];
  highestSeverity: number;
  totalChecked: number;
  totalHits: number;
  durationMs: number;
}

export interface BatchReport {
  fileCount: number;
  totalFindings: number;
  highestSeverity: number;
  perFile: GapReport[];
  detectionRate: number; // hits / patterns across all files
}

export class GapPredictorEngine {
  readonly name = "GapPredictorEngine";

  /**
   * Scan one artifact for all registered gap patterns.
   *
   * @param artifact The file's content + metadata (siblings, dispatcher ref)
   * @returns GapReport with all findings sorted by severity desc
   * @throws Error if artifact is null/undefined or filePath missing
   */
  scan(artifact: GapArtifact): GapReport {
    this.assertArtifact(artifact);
    const started = Date.now();
    const findings: GapFinding[] = [];
    for (const p of PATTERNS) {
      let hit = false;
      try {
        hit = p.detect(artifact);
      } catch {
        hit = false;
      }
      if (hit) {
        findings.push({
          patternId: p.id,
          title: p.title,
          severity: p.severity,
          filePath: artifact.filePath,
          fix: p.fix,
        });
      }
    }
    findings.sort((a, b) => b.severity - a.severity);
    return {
      filePath: artifact.filePath,
      findings,
      highestSeverity: findings.reduce((m, f) => Math.max(m, f.severity), 0),
      totalChecked: PATTERNS.length,
      totalHits: findings.length,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Scan a file from disk (reads content + optional dispatcher reference).
   *
   * @param filePath Absolute or repo-relative path
   * @param opts     Optional siblings list and dispatcher file path for cross-checks
   * @throws Error if the file is unreadable
   */
  scanFile(
    filePath: string,
    opts: { siblings?: string[]; dispatcherPath?: string } = {}
  ): GapReport {
    if (!fs.existsSync(filePath)) {
      throw new Error(`GapPredictorEngine.scanFile: not found: ${filePath}`);
    }
    const content = fs.readFileSync(filePath, "utf-8");
    let dispatcherText: string | undefined;
    if (opts.dispatcherPath && fs.existsSync(opts.dispatcherPath)) {
      try {
        dispatcherText = fs.readFileSync(opts.dispatcherPath, "utf-8");
      } catch {
        dispatcherText = undefined;
      }
    }
    return this.scan({
      filePath,
      content,
      siblings: opts.siblings,
      dispatcherText,
    });
  }

  /**
   * Scan multiple artifacts and aggregate. Useful for a planned unit's
   * files_created list.
   *
   * @param artifacts Array of artifacts to scan
   * @returns BatchReport with per-file breakdown + detection rate
   */
  scanBatch(artifacts: GapArtifact[]): BatchReport {
    if (!Array.isArray(artifacts)) {
      throw new Error("GapPredictorEngine.scanBatch: artifacts must be an array");
    }
    const perFile: GapReport[] = artifacts.map((a) => this.scan(a));
    const totalFindings = perFile.reduce((s, r) => s + r.totalHits, 0);
    const highestSeverity = perFile.reduce((m, r) => Math.max(m, r.highestSeverity), 0);
    const denom = artifacts.length * PATTERNS.length;
    return {
      fileCount: artifacts.length,
      totalFindings,
      highestSeverity,
      perFile,
      detectionRate: denom === 0 ? 0 : totalFindings / denom,
    };
  }

  /**
   * Look up a specific pattern by ID — useful for explaining a finding.
   *
   * @param id Pattern id from CommonlyMissedPatternsRegistry
   * @returns Pattern definition or null if unknown
   */
  lookupPattern(id: string): { id: string; title: string; severity: Severity; fix: string } | null {
    const p = PATTERNS_BY_ID[id];
    return p ? { id: p.id, title: p.title, severity: p.severity, fix: p.fix } : null;
  }

  // ─── Private ──────────────────────────────────────────────────────

  private assertArtifact(a: unknown): asserts a is GapArtifact {
    if (!a || typeof a !== "object") {
      throw new Error("GapPredictorEngine.scan: artifact must be an object");
    }
    const gapA = a as Partial<GapArtifact>;
    if (typeof gapA.filePath !== "string" || gapA.filePath.trim() === "") {
      throw new Error("GapPredictorEngine.scan: artifact.filePath required");
    }
    if (typeof gapA.content !== "string") {
      throw new Error("GapPredictorEngine.scan: artifact.content must be a string");
    }
  }
}

export const gapPredictorEngine = new GapPredictorEngine();
