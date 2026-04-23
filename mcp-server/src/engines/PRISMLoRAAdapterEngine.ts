/**
 * PRISMLoRAAdapterEngine — Phase 0.19 U-LLM3
 *
 * Manages the *inventory* of LoRA adapters trained by
 * `IncrementalLearningEngine` (U-LLM6). This is the registry side —
 * adapters live on disk under a root directory, each in its own folder
 * with a small JSON descriptor. The engine supports:
 *
 *   - register()  : record a new adapter produced by a training run
 *   - list()      : enumerate adapters (optionally filtered by base model)
 *   - activate()  : mark one adapter as "active" for a base model, so
 *                   downstream orchestration (U-LLM4/7) knows which
 *                   fine-tune to apply
 *   - get()       : look up a single adapter by id
 *   - remove()    : delete an adapter (descriptor + folder) — used when
 *                   a run is superseded or a bad adapter must be retired
 *
 * Nothing here spawns Python. Actual training is the Python trainer's
 * job; this engine only cares about *where* the adapter files land and
 * *which* one the orchestrator should load.
 *
 * Disk layout (under `dataDir`, default `data/lora-adapters/`):
 *   adapters/<adapterId>/
 *     adapter_config.json      (written by Python trainer)
 *     adapter_model.safetensors (written by Python trainer)
 *     prism.json               (written HERE — descriptor)
 *   active.json                 (map baseModel → adapterId)
 *
 * The descriptor (prism.json) carries provenance back to the training
 * job: baseModel, jobId, trainedAt, metrics, tags.
 *
 * @module engines/PRISMLoRAAdapterEngine
 * @milestone PP-0.19-U-LLM3
 */

import {
  mkdir,
  readFile,
  writeFile,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const DESCRIPTOR_SCHEMA_VERSION = 1 as const;

export const AdapterDescriptorSchema = z.object({
  schemaVersion: z.literal(1),
  adapterId: z.string().min(1),
  baseModel: z.string().min(1),
  /** Training run that produced this adapter. Optional for imports. */
  jobId: z.string().optional(),
  /** ISO-8601 UTC. */
  trainedAt: z.string(),
  /** Short human label, e.g., "nightly-2026-04-16". */
  label: z.string().optional(),
  /** Free-form metric summary the trainer emitted. */
  metrics: z
    .object({
      trainLoss: z.number().optional(),
      evalLoss: z.number().optional(),
      exampleCount: z.number().int().nonnegative().optional(),
      stepCount: z.number().int().nonnegative().optional(),
      durationSec: z.number().nonnegative().optional(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  /** Optional notes from the trainer or a human reviewer. */
  notes: z.string().optional(),
});

export type AdapterDescriptor = z.infer<typeof AdapterDescriptorSchema>;

export interface RegisterInput {
  adapterId: string;
  baseModel: string;
  jobId?: string;
  trainedAt?: string;
  label?: string;
  metrics?: AdapterDescriptor["metrics"];
  tags?: string[];
  notes?: string;
  /**
   * If true, writes the descriptor even if the adapter folder does not
   * yet exist (useful when registering before the Python trainer has
   * flushed its files). Default true — we create the folder.
   */
  ensureFolder?: boolean;
}

export interface ListFilter {
  baseModel?: string;
  tag?: string;
}

export interface PRISMLoRAAdapterDeps {
  dataDir?: string;
  /** Clock for deterministic trainedAt defaults in tests. */
  clock?: () => Date;
}

interface ActiveMap {
  schemaVersion: 1;
  updatedAt: string;
  active: Record<string, string>; // baseModel → adapterId
}

export class PRISMLoRAAdapterEngine {
  private dataDir: string;
  private clock: () => Date;

  constructor(deps: PRISMLoRAAdapterDeps = {}) {
    this.dataDir =
      deps.dataDir ?? path.resolve(process.cwd(), "data", "lora-adapters");
    this.clock = deps.clock ?? (() => new Date());
  }

  /** Root directory where adapter folders and active.json live. */
  getDataDir(): string {
    return this.dataDir;
  }

  /** Absolute folder for a given adapter. Does not check existence. */
  getAdapterDir(adapterId: string): string {
    return path.join(this.dataDir, "adapters", adapterId);
  }

  /** Register (or re-register) an adapter descriptor. Overwrites prism.json. */
  async register(input: RegisterInput): Promise<AdapterDescriptor> {
    const descriptor: AdapterDescriptor = {
      schemaVersion: DESCRIPTOR_SCHEMA_VERSION,
      adapterId: input.adapterId,
      baseModel: input.baseModel,
      jobId: input.jobId,
      trainedAt: input.trainedAt ?? this.clock().toISOString(),
      label: input.label,
      metrics: input.metrics,
      tags: input.tags,
      notes: input.notes,
    };
    const parsed = AdapterDescriptorSchema.parse(descriptor);
    const dir = this.getAdapterDir(input.adapterId);
    if (input.ensureFolder !== false && !existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    if (!existsSync(dir)) {
      throw new Error(
        `adapter folder missing and ensureFolder=false: ${dir}`,
      );
    }
    await writeFile(
      path.join(dir, "prism.json"),
      JSON.stringify(parsed, null, 2),
      "utf-8",
    );
    return parsed;
  }

  /** Look up one adapter by id. Returns null if descriptor missing. */
  async get(adapterId: string): Promise<AdapterDescriptor | null> {
    const file = path.join(this.getAdapterDir(adapterId), "prism.json");
    if (!existsSync(file)) return null;
    try {
      const raw = await readFile(file, "utf-8");
      const parsed = AdapterDescriptorSchema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  /** Enumerate adapters on disk. Newest trainedAt first. */
  async list(filter: ListFilter = {}): Promise<AdapterDescriptor[]> {
    const adaptersDir = path.join(this.dataDir, "adapters");
    if (!existsSync(adaptersDir)) return [];
    const entries = await readdir(adaptersDir);
    const out: AdapterDescriptor[] = [];
    for (const name of entries) {
      const descriptor = await this.get(name);
      if (!descriptor) continue;
      if (filter.baseModel && descriptor.baseModel !== filter.baseModel) {
        continue;
      }
      if (filter.tag && !(descriptor.tags ?? []).includes(filter.tag)) {
        continue;
      }
      out.push(descriptor);
    }
    out.sort((a, b) => (a.trainedAt < b.trainedAt ? 1 : -1));
    return out;
  }

  /**
   * Mark `adapterId` as the active adapter for its base model. The
   * descriptor's baseModel is the source of truth — callers don't
   * have to supply it.
   */
  async activate(adapterId: string): Promise<AdapterDescriptor> {
    const descriptor = await this.get(adapterId);
    if (!descriptor) {
      throw new Error(`adapter not found: ${adapterId}`);
    }
    const active = await this.readActive();
    active.active[descriptor.baseModel] = adapterId;
    active.updatedAt = this.clock().toISOString();
    await this.writeActive(active);
    return descriptor;
  }

  /** Read the active adapter for a base model (or null). */
  async activeFor(baseModel: string): Promise<AdapterDescriptor | null> {
    const active = await this.readActive();
    const id = active.active[baseModel];
    return id ? this.get(id) : null;
  }

  /** Full active map. */
  async activeMap(): Promise<Record<string, string>> {
    const active = await this.readActive();
    return { ...active.active };
  }

  /**
   * Remove an adapter: deletes its folder AND clears any active
   * pointer. Safe to call on missing adapters (returns false).
   */
  async remove(adapterId: string): Promise<boolean> {
    const dir = this.getAdapterDir(adapterId);
    if (!existsSync(dir)) return false;
    const descriptor = await this.get(adapterId);
    await rm(dir, { recursive: true, force: true });
    if (descriptor) {
      const active = await this.readActive();
      if (active.active[descriptor.baseModel] === adapterId) {
        delete active.active[descriptor.baseModel];
        active.updatedAt = this.clock().toISOString();
        await this.writeActive(active);
      }
    }
    return true;
  }

  /** Quick summary for dashboards. */
  async summary(): Promise<{
    count: number;
    byBaseModel: Record<string, number>;
    active: Record<string, string>;
    totalSizeBytes: number;
  }> {
    const list = await this.list();
    const byBaseModel: Record<string, number> = {};
    let totalSizeBytes = 0;
    for (const a of list) {
      byBaseModel[a.baseModel] = (byBaseModel[a.baseModel] ?? 0) + 1;
      try {
        const s = await stat(this.getAdapterDir(a.adapterId));
        // stat on a dir is not recursive; approximate with descriptor size.
        totalSizeBytes += s.size;
      } catch {
        // ignore
      }
    }
    return {
      count: list.length,
      byBaseModel,
      active: await this.activeMap(),
      totalSizeBytes,
    };
  }

  // ── internals ────────────────────────────────────────────────────────

  private getActivePath(): string {
    return path.join(this.dataDir, "active.json");
  }

  private async readActive(): Promise<ActiveMap> {
    const file = this.getActivePath();
    if (!existsSync(file)) {
      return {
        schemaVersion: 1,
        updatedAt: this.clock().toISOString(),
        active: {},
      };
    }
    try {
      const raw = await readFile(file, "utf-8");
      const obj = JSON.parse(raw) as Partial<ActiveMap>;
      if (obj.schemaVersion !== 1 || typeof obj.active !== "object") {
        return {
          schemaVersion: 1,
          updatedAt: this.clock().toISOString(),
          active: {},
        };
      }
      return {
        schemaVersion: 1,
        updatedAt: obj.updatedAt ?? this.clock().toISOString(),
        active: { ...obj.active } as Record<string, string>,
      };
    } catch {
      return {
        schemaVersion: 1,
        updatedAt: this.clock().toISOString(),
        active: {},
      };
    }
  }

  private async writeActive(active: ActiveMap): Promise<void> {
    if (!existsSync(this.dataDir)) {
      await mkdir(this.dataDir, { recursive: true });
    }
    await writeFile(
      this.getActivePath(),
      JSON.stringify(active, null, 2),
      "utf-8",
    );
  }
}

export const prismLoRAAdapterEngine = new PRISMLoRAAdapterEngine();
