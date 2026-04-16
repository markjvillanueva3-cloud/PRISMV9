/**
 * Pipeline Checkpoint Manager — stage-by-stage serialization + resume.
 * Saves intermediate results to ~/.prism/pipeline-checkpoints/{pipelineId}/{stage}.json
 * Enables resume-from-stage on failure.
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const CHECKPOINT_BASE = join(homedir(), '.prism', 'pipeline-checkpoints');

export interface CheckpointData {
  pipelineId: string;
  stageName: string;
  stageIndex: number;
  timestamp: string;
  data: any;
  metadata?: {
    duration_ms?: number;
    input_hash?: string;
  };
}

export class PipelineCheckpointManager {
  private pipelineId: string;
  private checkpointDir: string;

  constructor(pipelineName: string, runId?: string) {
    this.pipelineId = `${pipelineName}-${runId || Date.now()}`;
    this.checkpointDir = join(CHECKPOINT_BASE, this.pipelineId);
  }

  /**
   * Save checkpoint after successful stage completion.
   */
  checkpoint(stageName: string, stageIndex: number, data: any, durationMs?: number): string {
    try {
      mkdirSync(this.checkpointDir, { recursive: true });
      const cp: CheckpointData = {
        pipelineId: this.pipelineId,
        stageName,
        stageIndex,
        timestamp: new Date().toISOString(),
        data,
        metadata: { duration_ms: durationMs }
      };
      const filePath = join(this.checkpointDir, `stage-${stageIndex}-${stageName}.json`);
      writeFileSync(filePath, JSON.stringify(cp, null, 2));
      return filePath;
    } catch {
      return ''; // Never crash on checkpoint failure
    }
  }

  /**
   * Resume from a specific stage — returns checkpoint data or null.
   */
  resumeFrom(stageIndex: number): CheckpointData | null {
    try {
      const files = readdirSync(this.checkpointDir).filter(f => f.startsWith(`stage-${stageIndex}-`));
      if (files.length === 0) return null;
      const content = readFileSync(join(this.checkpointDir, files[0]), 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Get the latest completed stage index.
   */
  getLatestStage(): number {
    try {
      if (!existsSync(this.checkpointDir)) return -1;
      const files = readdirSync(this.checkpointDir).filter(f => f.startsWith('stage-'));
      if (files.length === 0) return -1;
      const indices = files.map(f => parseInt(f.split('-')[1])).filter(n => !isNaN(n));
      return Math.max(...indices);
    } catch {
      return -1;
    }
  }

  /**
   * List all checkpoints for this pipeline run.
   */
  listCheckpoints(): CheckpointData[] {
    try {
      if (!existsSync(this.checkpointDir)) return [];
      return readdirSync(this.checkpointDir)
        .filter(f => f.endsWith('.json'))
        .map(f => JSON.parse(readFileSync(join(this.checkpointDir, f), 'utf-8')))
        .sort((a, b) => a.stageIndex - b.stageIndex);
    } catch {
      return [];
    }
  }

  /**
   * Cleanup checkpoints for this run.
   */
  cleanup(): void {
    try {
      if (!existsSync(this.checkpointDir)) return;
      for (const f of readdirSync(this.checkpointDir)) {
        unlinkSync(join(this.checkpointDir, f));
      }
    } catch { /* ignore */ }
  }

  /**
   * Cleanup old checkpoints across all pipeline runs (>24h).
   */
  static cleanupOld(maxAgeHours: number = 24): number {
    let removed = 0;
    try {
      if (!existsSync(CHECKPOINT_BASE)) return 0;
      const cutoff = Date.now() - (maxAgeHours * 3600_000);
      for (const dir of readdirSync(CHECKPOINT_BASE)) {
        const dirPath = join(CHECKPOINT_BASE, dir);
        try {
          const stat = statSync(dirPath);
          if (stat.mtimeMs < cutoff) {
            for (const f of readdirSync(dirPath)) {
              unlinkSync(join(dirPath, f));
              removed++;
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* ignore */ }
    return removed;
  }
}
