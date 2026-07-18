/**
 * CAMTrainingManifestEngine — CAM-AI-TRAINING-MS0/U-CAMT-MANIFEST
 *
 * Composes all the Phase-C training artifacts into a single training
 * manifest the AI training pipelines (LoRA, RAG, wiki indexer, tribal
 * embedder) consume in one pass.
 *
 * Inputs (all optional — manifest is additive):
 *   - templates (B03)
 *   - clickSequences (B-CLICK)
 *   - wikiEntries (WIKI)
 *   - tribalTips (TRIBAL)
 *   - loraTuples (LORA)
 *   - ragEntries (RAG)
 *
 * Output: a single CAMTrainingManifest JSON the consumer can ingest
 * with one call (instead of stitching 6 separate corpora). Carries
 * aggregate stats + provenance.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export interface CAMTrainingManifest {
  schemaVersion: "1.0.0";
  generatedAt: string;
  /** Counts at the time of build. */
  counts: {
    templates: number;
    clickSequences: number;
    wikiEntries: number;
    tribalTips: number;
    loraTuples: number;
    ragEntries: number;
  };
  /** Hashes for downstream invalidation. */
  hashes: {
    templates?: string;
    clickSequences?: string;
    wikiEntries?: string;
    tribalTips?: string;
    loraTuples?: string;
    ragEntries?: string;
  };
  /** Provenance metadata. */
  provenance: {
    realDataOnly: true;
    sourceMilestone: "CAM-AI-TRAINING-MS0";
    sourceSlot: "kilo";
    operatorConstraint: string;
  };
  /** Per-artifact counts by CAM system (only when computable). */
  perSystem: Record<string, {
    templates: number;
    clickSequences: number;
    wikiEntries: number;
  }>;
}

/** Minimal artifact shape — covers every Phase-C engine output. */
interface ArtifactWithSystem {
  system?: string;
}

export interface ManifestInputs {
  templates?: ReadonlyArray<ArtifactWithSystem>;
  clickSequences?: ReadonlyArray<ArtifactWithSystem>;
  wikiEntries?: ReadonlyArray<ArtifactWithSystem>;
  tribalTips?: ReadonlyArray<unknown>;
  loraTuples?: ReadonlyArray<unknown>;
  ragEntries?: ReadonlyArray<unknown>;
}

/**
 * Cheap deterministic-order hash — FNV-1a 32-bit over the JSON-stringified
 * array. Not cryptographic — used for downstream invalidation only.
 */
function fnv1a32(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function hashArr(arr: ReadonlyArray<unknown> | undefined): string | undefined {
  if (!arr || arr.length === 0) return undefined;
  return fnv1a32(JSON.stringify(arr));
}

export class CAMTrainingManifestEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMTrainingManifestEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Composes Phase-C artifacts into a single training manifest.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "build",     description: "Build a manifest from artifact arrays", actions: ["cam_manifest_build"] },
      { name: "diff",      description: "Diff two manifests by counts + hashes", actions: ["cam_manifest_diff"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMTrainingManifestEngine", note: "use typed methods" };
  }

  /** Build the unified training manifest. */
  build(inputs: ManifestInputs): CAMTrainingManifest {
    const templates = inputs.templates ?? [];
    const clickSequences = inputs.clickSequences ?? [];
    const wikiEntries = inputs.wikiEntries ?? [];
    const tribalTips = inputs.tribalTips ?? [];
    const loraTuples = inputs.loraTuples ?? [];
    const ragEntries = inputs.ragEntries ?? [];

    const perSystem: Record<string, { templates: number; clickSequences: number; wikiEntries: number }> = {};
    const bumpSystem = (system: string | undefined, key: "templates" | "clickSequences" | "wikiEntries") => {
      if (!system) return;
      if (!perSystem[system]) perSystem[system] = { templates: 0, clickSequences: 0, wikiEntries: 0 };
      perSystem[system][key] += 1;
    };
    for (const t of templates) bumpSystem(t.system, "templates");
    for (const c of clickSequences) bumpSystem(c.system, "clickSequences");
    for (const w of wikiEntries) bumpSystem(w.system, "wikiEntries");

    return {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      counts: {
        templates: templates.length,
        clickSequences: clickSequences.length,
        wikiEntries: wikiEntries.length,
        tribalTips: tribalTips.length,
        loraTuples: loraTuples.length,
        ragEntries: ragEntries.length,
      },
      hashes: {
        templates: hashArr(templates),
        clickSequences: hashArr(clickSequences),
        wikiEntries: hashArr(wikiEntries),
        tribalTips: hashArr(tribalTips),
        loraTuples: hashArr(loraTuples),
        ragEntries: hashArr(ragEntries),
      },
      provenance: {
        realDataOnly: true,
        sourceMilestone: "CAM-AI-TRAINING-MS0",
        sourceSlot: "kilo",
        operatorConstraint: "no synthetic parts, must be real parts taken from real reputable sources (2026-05-25)",
      },
      perSystem,
    };
  }

  /** Diff two manifests — surface count + hash deltas for incremental retrain triggering. */
  diff(prev: CAMTrainingManifest, curr: CAMTrainingManifest): {
    countDeltas: Record<string, number>;
    hashChanged: Record<string, boolean>;
    anyChange: boolean;
  } {
    const countDeltas: Record<string, number> = {};
    for (const k of Object.keys(curr.counts) as Array<keyof typeof curr.counts>) {
      countDeltas[k] = curr.counts[k] - (prev.counts[k] ?? 0);
    }
    const hashChanged: Record<string, boolean> = {};
    for (const k of Object.keys(curr.hashes) as Array<keyof typeof curr.hashes>) {
      hashChanged[k] = (prev.hashes[k] ?? null) !== (curr.hashes[k] ?? null);
    }
    const anyChange = Object.values(countDeltas).some((n) => n !== 0) || Object.values(hashChanged).some(Boolean);
    return { countDeltas, hashChanged, anyChange };
  }
}

export const camTrainingManifestEngine = new CAMTrainingManifestEngine();
