/**
 * BlueprintLoRABridgeEngine — BLUEPRINT-OCR-TRAINING-MS1/U-MS1-U8
 *
 * LoRA export bundle producer. Selects ground-truth training pairs from the
 * GroundTruthRegistryEngine + anonymizes (scrubs customer names, part numbers,
 * program content per [[feedback_no_public_h_drive]]) + formats per the target
 * fine-tune provider's spec + writes a sealed bundle.
 *
 * HARD RULE (spec): customer names + part numbers MUST NOT appear in exported
 * bundles. Anonymization is enforced via the ANONYMIZATION_PATTERNS deny-list
 * + a final-pass scrubber. Tests assert `not.toMatch(/ALCOA|ITW|...|HOLO-KROME/)`.
 *
 * HARD RULE (spec): exports stay in `mcp-server/data/training/lora/staging/`
 * by default; writes outside that dir require `_LORA_EXPORT_OPERATOR_APPROVED`
 * marker file at the output dir. Without the marker, writes are blocked.
 *
 * @engine BlueprintLoRABridgeEngine
 * @milestone BLUEPRINT-OCR-TRAINING-MS1 / U-MS1-U8
 * @classification CRITICAL (LoRA export — HARD RULE anonymization)
 */

import * as fs from "node:fs";
import { ANONYMIZATION_PATTERNS, applyAnonymizationPatterns } from "./blueprint-vision/blueprintRedaction.js";
import * as path from "node:path";
import { z } from "zod";

// ── Domain ──────────────────────────────────────────────────────────────────

export const LORA_PROVIDERS = ["gemini-finetune", "openai-finetune", "modal", "local-lora"] as const;
export type LoRAProvider = (typeof LORA_PROVIDERS)[number];

export const LORA_CONFIDENCE_TIERS = ["operator_verified", "ensemble_consensus", "single_backend"] as const;
export type LoRAConfidenceTier = (typeof LORA_CONFIDENCE_TIERS)[number];

export interface LoRATrainingPair {
  pairId: string;
  customer: string;
  partNumber: string;
  pdfPath: string;
  extractionType: string;
  groundTruthValue: string;
  /** Free-text context for the LoRA example (sources cited, etc.) */
  context: string;
}

export const LoRABundleManifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    bundleId: z.string().min(1),
    provider: z.enum(LORA_PROVIDERS),
    setId: z.string().min(1),
    pairCount: z.number().int().min(0),
    confidenceTier: z.enum(LORA_CONFIDENCE_TIERS),
    anonymizationApplied: z.boolean(),
    createdAt: z.string(),
    outputPath: z.string().min(1),
  })
  .strict();
export type LoRABundleManifest = z.infer<typeof LoRABundleManifestSchema>;

/**
 * Spec-mandated customer-name deny list + part-number patterns -- EXTRACTED to the shared
 * blueprint-vision/blueprintRedaction module (U-APP-REDACT-LIB) so the LoRA export and the new
 * app-facing drawing redaction share ONE redactor (build-once, R15/R16). Re-exported here for
 * back-compat: existing importers and the `not.toMatch(/ALCOA|ITW|.../)` spec tests are unaffected --
 * the CORE deny-list is coverage-identical (separator matching only widened from `-?` to `[\s_-]*`,
 * never narrowed) and the [REDACTED] mask token + ordered scrub are preserved.
 */
export { ANONYMIZATION_PATTERNS, applyAnonymizationPatterns };

export const DEFAULT_STAGING_DIR = "mcp-server/data/training/lora/staging";
export const OPERATOR_APPROVAL_MARKER = "_LORA_EXPORT_OPERATOR_APPROVED";

const MAX_SIZE_CAP = 100_000;
const DEFAULT_SIZE_CAP = 5_000;

export interface TrainingSetSelection {
  setId: string;
  pairs: LoRATrainingPair[];
  confidenceTier: LoRAConfidenceTier;
  anonymized: boolean;
}

export interface ExternalEndpoint {
  bundleId: string;
  endpointURL: string;
  providerType: LoRAProvider;
  registeredAt: string;
}

export interface LoRABridgeIO {
  fs?: {
    existsSync: typeof fs.existsSync;
    mkdirSync: typeof fs.mkdirSync;
    writeFileSync: typeof fs.writeFileSync;
    readFileSync: typeof fs.readFileSync;
  };
  loadTrainingPairs?: (confidenceTier: LoRAConfidenceTier) => Promise<LoRATrainingPair[]>;
  now?: () => string;
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class BlueprintLoRABridgeEngine {
  public readonly schemaVersion = "1.0.0" as const;

  private trainingSets = new Map<string, TrainingSetSelection>();
  private exportHistory: LoRABundleManifest[] = [];
  private activeEndpoints = new Map<string, ExternalEndpoint>();

  /**
   * Select training pairs from the registry at the given confidence tier and
   * anonymize. Always sets anonymize=true (HARD RULE — sourceless anonymized
   * exports are the only outbound shape allowed). The `anonymize:false` knob
   * is a placeholder for future operator-confirmed retain-PII modes; current
   * impl ignores it and forces true.
   */
  async prepareTrainingSet(input: {
    confidenceTier: LoRAConfidenceTier;
    sizeCap?: number;
    anonymize?: boolean;
    io?: LoRABridgeIO;
  }): Promise<TrainingSetSelection> {
    if (!LORA_CONFIDENCE_TIERS.includes(input.confidenceTier)) {
      throw new Error(`[BlueprintLoRABridgeEngine] invalid confidenceTier: ${input.confidenceTier}`);
    }
    const sizeCap = clampInt(input.sizeCap, DEFAULT_SIZE_CAP, 1, MAX_SIZE_CAP);
    const loader = input.io?.loadTrainingPairs;
    if (!loader) {
      throw new Error("[BlueprintLoRABridgeEngine] loadTrainingPairs injection required");
    }
    const raw = await loader(input.confidenceTier);
    if (!Array.isArray(raw)) {
      throw new Error("[BlueprintLoRABridgeEngine] loader must return array");
    }
    const capped = raw.slice(0, sizeCap);
    // HARD RULE: always anonymize. The `anonymize=false` mode is gated to
    // operator-confirmed retain-PII bundles in a future unit; today this is
    // a hard-coded true to prevent accidental PII leakage.
    const anonymizedPairs: LoRATrainingPair[] = capped.map((p) => ({
      pairId: p.pairId,
      customer: anonymizeCustomer(p.customer),
      partNumber: anonymizePartNumber(p.partNumber),
      pdfPath: anonymizePath(p.pdfPath),
      extractionType: p.extractionType,
      groundTruthValue: p.groundTruthValue,
      context: anonymizeText(p.context),
    }));
    const setId = `set:${input.confidenceTier}:${Date.now()}:${anonymizedPairs.length}`;
    const selection: TrainingSetSelection = {
      setId,
      pairs: anonymizedPairs,
      confidenceTier: input.confidenceTier,
      anonymized: true,
    };
    this.trainingSets.set(setId, selection);
    return selection;
  }

  /**
   * Export a prepared training set as a provider-formatted bundle. Refuses
   * to write outside DEFAULT_STAGING_DIR unless the operator approval marker
   * file exists at the target directory.
   */
  async exportBundle(input: {
    setId: string;
    provider: LoRAProvider;
    outputPath: string;
    io?: LoRABridgeIO;
  }): Promise<LoRABundleManifest> {
    const set = this.trainingSets.get(input.setId);
    if (!set) {
      throw new Error(`[BlueprintLoRABridgeEngine] unknown setId: ${input.setId}`);
    }
    if (!LORA_PROVIDERS.includes(input.provider)) {
      throw new Error(`[BlueprintLoRABridgeEngine] invalid provider: ${input.provider}`);
    }
    const fsImpl = input.io?.fs ?? {
      existsSync: fs.existsSync,
      mkdirSync: fs.mkdirSync,
      writeFileSync: fs.writeFileSync,
      readFileSync: fs.readFileSync,
    };
    const now = input.io?.now ?? (() => new Date().toISOString());
    const normalizedOutput = input.outputPath.replace(/\\/g, "/");
    const normalizedStaging = DEFAULT_STAGING_DIR.replace(/\\/g, "/");
    // HARD RULE check: outside staging dir? Require operator marker.
    if (!normalizedOutput.startsWith(normalizedStaging)) {
      const markerPath = path.join(path.dirname(normalizedOutput), OPERATOR_APPROVAL_MARKER).replace(/\\/g, "/");
      if (!fsImpl.existsSync(markerPath)) {
        throw new Error(
          `[BlueprintLoRABridgeEngine] BLOCKED: outputPath "${normalizedOutput}" is outside staging dir AND the operator approval marker "${OPERATOR_APPROVAL_MARKER}" was not found at ${markerPath}. Create the marker file or use a path under ${DEFAULT_STAGING_DIR}`,
        );
      }
    }
    // Format per provider
    const body = formatBundleForProvider(set, input.provider);
    // Final-pass scrub — defense in depth against any anonymization miss
    const scrubbed = applyAnonymizationPatterns(body);
    try {
      fsImpl.mkdirSync(path.dirname(normalizedOutput), { recursive: true });
      fsImpl.writeFileSync(normalizedOutput, scrubbed, "utf8");
    } catch (err) {
      throw new Error(`[BlueprintLoRABridgeEngine] bundle write failed: ${(err as Error).message}`);
    }
    const bundleId = `bundle:${input.provider}:${set.setId}:${now()}`;
    const manifest: LoRABundleManifest = {
      schemaVersion: this.schemaVersion,
      bundleId,
      provider: input.provider,
      setId: set.setId,
      pairCount: set.pairs.length,
      confidenceTier: set.confidenceTier,
      anonymizationApplied: set.anonymized,
      createdAt: now(),
      outputPath: normalizedOutput,
    };
    const parsed = LoRABundleManifestSchema.safeParse(manifest);
    if (!parsed.success) {
      throw new Error(`[BlueprintLoRABridgeEngine] manifest invalid: ${parsed.error.issues[0]?.message}`);
    }
    this.exportHistory.push(parsed.data);
    return parsed.data;
  }

  /**
   * Register an external fine-tuned endpoint as a new backend. Operator
   * approves the endpoint URL out-of-band — this method only records the
   * registration; downstream AISystemRouterEngine reads getActiveBundles()
   * to discover available endpoints.
   */
  registerExternalEndpoint(input: {
    bundleId: string;
    endpointURL: string;
    providerType: LoRAProvider;
    io?: LoRABridgeIO;
  }): ExternalEndpoint {
    if (!input.bundleId || !input.endpointURL || !input.providerType) {
      throw new Error("[BlueprintLoRABridgeEngine] bundleId, endpointURL, providerType required");
    }
    const now = input.io?.now ?? (() => new Date().toISOString());
    const ep: ExternalEndpoint = {
      bundleId: input.bundleId,
      endpointURL: input.endpointURL,
      providerType: input.providerType,
      registeredAt: now(),
    };
    this.activeEndpoints.set(input.bundleId, ep);
    return ep;
  }

  getExportHistory(): LoRABundleManifest[] {
    return [...this.exportHistory];
  }

  getActiveBundles(): ExternalEndpoint[] {
    return [...this.activeEndpoints.values()];
  }

  clearState(): void {
    this.trainingSets.clear();
    this.exportHistory = [];
    this.activeEndpoints.clear();
  }
}

// ── Helpers (exported for testability) ─────────────────────────────────────

export function anonymizeCustomer(_name: string): string {
  return "ANON-CUSTOMER";
}

export function anonymizePartNumber(_pn: string): string {
  return "ANON-PN";
}

export function anonymizePath(p: string): string {
  // Strip drive letter + customer-name path components. Use lookbehind+lookahead
  // so the path separators don't get consumed (otherwise adjacent customer dirs
  // share one delimiter and the second name is missed — the test fixture
  // `/JM DIE/ALCOA/AB-001/` triggers this exact bug).
  return p
    .replace(/^[A-Za-z]:/, "")
    .replace(/\\/g, "/")
    .replace(/(?<=\/)(JM[\s_-]?DIE|ALCOA|ITW|CONTINENTAL[\s_-]?MIDLAND|CONTINENTAL|OPTIMAS|SFS|HOLO-?KROME|FASTENAL)(?=\/)/gi, "CUSTOMER");
}

export function anonymizeText(text: string): string {
  return applyAnonymizationPatterns(text);
}

// applyAnonymizationPatterns is now imported + re-exported from blueprint-vision/blueprintRedaction
// (U-APP-REDACT-LIB build-once). anonymizeText (above) calls the imported binding; behavior is
// byte-identical (same CORE deny-list, [REDACTED] token, non-string -> "" contract, per-pass fresh RegExp).

export function formatBundleForProvider(set: TrainingSetSelection, provider: LoRAProvider): string {
  switch (provider) {
    case "openai-finetune":
      // JSONL: {"messages":[{"role":"system",...},{"role":"user",...},{"role":"assistant",...}]}
      return set.pairs.map((p) => JSON.stringify({
        messages: [
          { role: "system", content: "Extract dimensional + GD&T callouts from blueprints." },
          { role: "user", content: `Print: ${p.pdfPath} Context: ${p.context}` },
          { role: "assistant", content: p.groundTruthValue },
        ],
      })).join("\n") + (set.pairs.length > 0 ? "\n" : "");
    case "gemini-finetune":
      // JSONL: {"input_text":"...","output_text":"..."}
      return set.pairs.map((p) => JSON.stringify({
        input_text: `Print: ${p.pdfPath} Context: ${p.context}`,
        output_text: p.groundTruthValue,
      })).join("\n") + (set.pairs.length > 0 ? "\n" : "");
    case "modal":
    case "local-lora":
      // Generic JSONL with prompt + completion
      return set.pairs.map((p) => JSON.stringify({
        prompt: `Print: ${p.pdfPath} Context: ${p.context}`,
        completion: p.groundTruthValue,
      })).join("\n") + (set.pairs.length > 0 ? "\n" : "");
  }
}

function clampInt(raw: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

export const blueprintLoRABridgeEngine = new BlueprintLoRABridgeEngine();
