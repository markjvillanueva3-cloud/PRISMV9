/**
 * LayeredAssetCheckEngine — Composite gate: fuzzy-name + semantic-embedding
 *
 * Hooks that fire before asset creation (e.g. `ai-duplication-guard`) need a
 * single "ok / warn / block" answer. This engine orchestrates two layers
 * without modifying either backing engine:
 *
 *   Layer 1 — fuzzy name check. Asks an injected name-check callback
 *             whether the candidate collides with any known asset by name
 *             (typically DuplicationGuardEngine). On a hard match, returns
 *             `block` immediately.
 *
 *   Layer 2 — semantic embedding check. If the name layer is clear, asks
 *             an injected band-check callback (typically EmbeddingGuardEngine)
 *             for a green / yellow / red band on the description.
 *
 * The result combines both signals into a single decision the hook can act
 * on, along with the full reasoning trail so the user sees *why*.
 *
 * @module engines/LayeredAssetCheckEngine
 * @milestone PP-INFRA-LAYERED-CHECK
 */

export type LayeredDecision = "proceed" | "warn" | "block";

export interface NameCheckInput {
  type: "engine" | "formula" | "algorithm" | "action" | "skill" | "hook";
  name: string;
  keywords?: string[];
  description: string;
}

export interface NameCheckOutcome {
  match: "none" | "fuzzy" | "exact";
  matchedName?: string;
  matchedType?: string;
  similarity?: number;
  reason?: string;
}

export interface BandCheckInput {
  id: string;
  name: string;
  description: string;
}

export interface BandCheckOutcome {
  band: "green" | "yellow" | "red";
  topMatchName?: string;
  topSimilarity?: number;
  rationale?: string;
}

export interface LayeredCheckInput {
  type: NameCheckInput["type"];
  proposedName: string;
  description: string;
  keywords?: string[];
}

export interface LayeredCheckResult {
  decision: LayeredDecision;
  nameLayer: NameCheckOutcome;
  semanticLayer: BandCheckOutcome | null;
  reason: string;
  recommendation: string;
}

export type NameChecker = (input: NameCheckInput) => Promise<NameCheckOutcome> | NameCheckOutcome;
export type BandChecker = (input: BandCheckInput) => Promise<BandCheckOutcome> | BandCheckOutcome;

export interface LayeredAssetCheckOptions {
  name: NameChecker;
  band?: BandChecker; // optional — if absent, only the name layer runs
}

export class LayeredAssetCheckEngine {
  private readonly nameChecker: NameChecker;
  private readonly bandChecker: BandChecker | null;

  constructor(options: LayeredAssetCheckOptions) {
    if (!options || typeof options.name !== "function") {
      throw new Error("name checker required");
    }
    if (options.band !== undefined && typeof options.band !== "function") {
      throw new Error("band checker must be a function when provided");
    }
    this.nameChecker = options.name;
    this.bandChecker = options.band ?? null;
  }

  async check(input: LayeredCheckInput): Promise<LayeredCheckResult> {
    this.validateInput(input);

    const nameOutcome = await Promise.resolve(
      this.nameChecker({
        type: input.type,
        name: input.proposedName,
        keywords: input.keywords,
        description: input.description,
      })
    );

    if (nameOutcome.match === "exact") {
      return {
        decision: "block",
        nameLayer: nameOutcome,
        semanticLayer: null,
        reason: `exact name collision with '${nameOutcome.matchedName ?? "existing asset"}'`,
        recommendation: "use the existing asset instead of creating a duplicate",
      };
    }

    // For fuzzy name matches, still run the semantic layer if available —
    // it gives the hook more signal rather than less when borderline.
    let semantic: BandCheckOutcome | null = null;
    if (this.bandChecker) {
      semantic = await Promise.resolve(
        this.bandChecker({
          id: `candidate:${input.proposedName}`,
          name: input.proposedName,
          description: input.description,
        })
      );
    }

    if (nameOutcome.match === "fuzzy") {
      // Fuzzy name + red semantic → block. Fuzzy + green → warn. Fuzzy alone → warn.
      if (semantic && semantic.band === "red") {
        return {
          decision: "block",
          nameLayer: nameOutcome,
          semanticLayer: semantic,
          reason: `fuzzy name collision with '${nameOutcome.matchedName ?? "existing asset"}' AND semantic red band`,
          recommendation: "rename and reduce overlap with the matched asset",
        };
      }
      return {
        decision: "warn",
        nameLayer: nameOutcome,
        semanticLayer: semantic,
        reason: `fuzzy name match against '${nameOutcome.matchedName ?? "existing asset"}' (similarity ${formatSim(nameOutcome.similarity)})`,
        recommendation: "consider renaming or extending the matched asset",
      };
    }

    // Name layer clear. Decision depends on semantic band.
    if (!semantic) {
      return {
        decision: "proceed",
        nameLayer: nameOutcome,
        semanticLayer: null,
        reason: "name check clear; no semantic layer configured",
        recommendation: "proceed with creation",
      };
    }

    switch (semantic.band) {
      case "red":
        return {
          decision: "block",
          nameLayer: nameOutcome,
          semanticLayer: semantic,
          reason: `semantic duplicate of '${semantic.topMatchName ?? "existing asset"}' (similarity ${formatSim(semantic.topSimilarity)})`,
          recommendation: "extend the matched asset or justify why a new one is needed",
        };
      case "yellow":
        return {
          decision: "warn",
          nameLayer: nameOutcome,
          semanticLayer: semantic,
          reason: `semantic borderline vs '${semantic.topMatchName ?? "existing asset"}' (similarity ${formatSim(semantic.topSimilarity)})`,
          recommendation: "review the matched asset before proceeding; document the distinction",
        };
      case "green":
        return {
          decision: "proceed",
          nameLayer: nameOutcome,
          semanticLayer: semantic,
          reason: "name check clear; semantic band green",
          recommendation: "proceed with creation",
        };
    }
  }

  private validateInput(i: LayeredCheckInput): void {
    if (!i || typeof i !== "object") throw new Error("input required");
    if (!["engine", "formula", "algorithm", "action", "skill", "hook"].includes(i.type)) {
      throw new Error(`invalid type '${i.type}'`);
    }
    if (!i.proposedName || i.proposedName.trim() === "") throw new Error("proposedName required");
    if (typeof i.description !== "string") throw new Error("description required");
    if (i.keywords !== undefined && !Array.isArray(i.keywords)) {
      throw new Error("keywords must be array");
    }
  }
}

function formatSim(s?: number): string {
  if (s === undefined || !Number.isFinite(s)) return "?";
  return s.toFixed(4);
}
