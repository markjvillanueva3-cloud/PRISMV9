/**
 * AnchoredConfidenceEngine — U-FORE-13 (PSAU-FORESIGHT)
 * =======================================================
 *
 * Every advice claim carries {engine, confidence, source_citation}
 * and — in manufactured-disagreement mode — a dissenting viewpoint so
 * the user doesn't uncritically trust a single source.
 *
 * Caller attaches an Anchor to each claim; this engine validates shape,
 * formats the citation line, and can compose a "PRISM says X (c=…).
 * Sandvik says Y. You decide." banner.
 */

export interface Anchor {
  engine: string;
  confidence: number; // [0, 1]
  sourceCitation: string;
  disagreement?: string; // optional alternate view
}

export interface AnchoredClaim<T = unknown> {
  claim: T;
  anchor: Anchor;
}

export interface AnchoredRenderOptions {
  /** Include the full "manufactured disagreement" banner when disagreement field is set. */
  showDisagreement?: boolean;
  /** How many decimal places for the confidence % (default 0). */
  precision?: number;
}

const MAX_RECENT = 500;

export class AnchoredConfidenceEngine {
  readonly name = "AnchoredConfidenceEngine";
  private recent: AnchoredClaim[] = [];

  /**
   * Attach an anchor to a claim. Normalizes the confidence into [0, 1].
   */
  anchor<T>(claim: T, anchor: Anchor): AnchoredClaim<T> {
    this.assertAnchor(anchor);
    const normalized: Anchor = {
      engine: anchor.engine,
      confidence: Math.max(0, Math.min(1, anchor.confidence)),
      sourceCitation: anchor.sourceCitation,
      disagreement: anchor.disagreement,
    };
    const tagged: AnchoredClaim<T> = { claim, anchor: normalized };
    this.recent.push(tagged as AnchoredClaim);
    if (this.recent.length > MAX_RECENT) {
      this.recent.splice(0, this.recent.length - MAX_RECENT);
    }
    return tagged;
  }

  /**
   * Render a single claim as a citation-bearing line.
   */
  render<T>(c: AnchoredClaim<T>, opts: AnchoredRenderOptions = {}): string {
    const precision = opts.precision ?? 0;
    const cPct = (c.anchor.confidence * 100).toFixed(precision);
    const body = `${String(c.claim)} [${c.anchor.engine} c=${cPct}% src=${c.anchor.sourceCitation}]`;
    if (opts.showDisagreement && c.anchor.disagreement) {
      return `${body}\n  Counter-view: ${c.anchor.disagreement}. You decide.`;
    }
    return body;
  }

  /**
   * Render an array of claims, keeping the "PRISM says X / source says Y" framing
   * so downstream consumers can display both perspectives.
   */
  renderMany(claims: AnchoredClaim[], opts: AnchoredRenderOptions = {}): string[] {
    return claims.map((c) => this.render(c, opts));
  }

  /**
   * Summary stats across recent claims — useful for dashboards.
   */
  recentStats(): { count: number; avgConfidence: number; lowestConfidence: number } {
    if (this.recent.length === 0) {
      return { count: 0, avgConfidence: 0, lowestConfidence: 0 };
    }
    const confidences = this.recent.map((c) => c.anchor.confidence);
    const avg = confidences.reduce((s, n) => s + n, 0) / confidences.length;
    const low = Math.min(...confidences);
    return { count: this.recent.length, avgConfidence: avg, lowestConfidence: low };
  }

  /** Drop recent-claim history; mostly for tests. */
  reset(): void {
    this.recent = [];
  }

  private assertAnchor(anchor: unknown): asserts anchor is Anchor {
    if (!anchor || typeof anchor !== "object") {
      throw new Error("AnchoredConfidenceEngine.anchor: anchor must be an object");
    }
    const a = anchor as Partial<Anchor>;
    if (typeof a.engine !== "string" || a.engine.trim() === "") {
      throw new Error("AnchoredConfidenceEngine.anchor: engine required");
    }
    if (typeof a.confidence !== "number" || Number.isNaN(a.confidence)) {
      throw new Error("AnchoredConfidenceEngine.anchor: confidence must be a number");
    }
    if (typeof a.sourceCitation !== "string" || a.sourceCitation.trim() === "") {
      throw new Error("AnchoredConfidenceEngine.anchor: sourceCitation required");
    }
  }
}

export const anchoredConfidenceEngine = new AnchoredConfidenceEngine();
