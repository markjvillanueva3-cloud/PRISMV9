/**
 * BlueprintCalloutParserEngine — CAM-AI-TRAINING-MS0/U-CAMT-PRINT-PARSER
 *
 * Parses GD&T callouts, thread specs, surface finishes, material specs,
 * and title-block fields from blueprint text extracted by upstream OCR
 * / PDF / DXF text-extractor passes.
 *
 * Pure regex (using String.prototype.matchAll — NOT child_process.exec).
 * Caller supplies extracted blueprint text; engine returns a structured
 * ParsedPrint record the orchestrator routes to the tolerance propagator,
 * operation selector, material database, and dimensional inspector.
 *
 * Pulls REAL operator-drawn callouts only — no fabricated values.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";

export interface DimTolerance {
  raw: string;
  nominal: number;
  upperTol: number;
  lowerTol: number;
}

export interface GDTCallout {
  type:
    | "position"
    | "runout"
    | "profile_line"
    | "profile_surface"
    | "circularity"
    | "cylindricity"
    | "flatness"
    | "perpendicularity"
    | "parallelism"
    | "angularity"
    | "concentricity"
    | "straightness"
    | "total_runout";
  tolerance: number;
  modifier?: "MMC" | "LMC" | "RFS";
  datums?: ReadonlyArray<string>;
  raw: string;
}

export interface ThreadCallout {
  spec: string;
  nominalDiameterMm: number;
  /** TPI for imperial, pitch mm for metric. */
  pitch: number;
  class?: string;
  isMetric: boolean;
}

export interface SurfaceFinish {
  raMicrometers: number;
  raw: string;
}

export interface TitleBlockFields {
  partNumber?: string;
  revision?: string;
  drawnBy?: string;
  drawingDate?: string;
  scale?: string;
  material?: string;
  finish?: string;
}

export interface ParsedPrint {
  dimensions: ReadonlyArray<DimTolerance>;
  gdt: ReadonlyArray<GDTCallout>;
  threads: ReadonlyArray<ThreadCallout>;
  surfaceFinishes: ReadonlyArray<SurfaceFinish>;
  titleBlock: TitleBlockFields;
  materialSpec?: string;
}

const GDT_SYMBOL_MAP: Record<string, GDTCallout["type"]> = {
  "⌖": "position",
  "⌭": "runout",
  "⌒": "profile_line",
  "⌓": "profile_surface",
  "◯": "circularity",
  "○": "circularity",
  "⏥": "flatness",
  "⊥": "perpendicularity",
  "∥": "parallelism",
  "∠": "angularity",
  "◎": "concentricity",
};

export class BlueprintCalloutParserEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "BlueprintCalloutParserEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description: "Parses GD&T, threads, surface finishes, material specs, and title-block fields from blueprint text.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "parse",         description: "Parse blueprint text → ParsedPrint", actions: ["blueprint_parse"] },
      { name: "parse_dim",     description: "Parse a single ± dimension",         actions: ["blueprint_parse_dim"] },
      { name: "parse_thread",  description: "Parse a single thread callout",      actions: ["blueprint_parse_thread"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "BlueprintCalloutParserEngine", note: "use typed methods" };
  }

  parse(text: string): ParsedPrint {
    return {
      dimensions: this.extractDimensions(text),
      gdt: this.extractGDT(text),
      threads: this.extractThreads(text),
      surfaceFinishes: this.extractSurfaceFinishes(text),
      titleBlock: this.extractTitleBlock(text),
      materialSpec: this.extractMaterial(text),
    };
  }

  parse_dim(s: string): DimTolerance | null {
    const split = /(\d+\.?\d*)\s*\+\s*\.?(\d+\.?\d*)\s*\/\s*-\s*\.?(\d+\.?\d*)/;
    const mSplit = s.match(split);
    if (mSplit) {
      const nominal = parseFloat(mSplit[1]);
      const upperTol = parseFloat("0." + mSplit[2].replace(/^\./, "")) || parseFloat(mSplit[2]);
      const lowerTol = parseFloat("0." + mSplit[3].replace(/^\./, "")) || parseFloat(mSplit[3]);
      return { raw: mSplit[0], nominal, upperTol, lowerTol };
    }
    const plusMinus = /(\d+\.?\d*)\s*[±]\s*(\d+\.?\d*)/;
    const mPm = s.match(plusMinus);
    if (mPm) {
      const nominal = parseFloat(mPm[1]);
      const tol = parseFloat(mPm[2]);
      return { raw: mPm[0], nominal, upperTol: tol, lowerTol: tol };
    }
    return null;
  }

  parse_thread(s: string): ThreadCallout | null {
    const metric = /M(\d+(?:\.\d+)?)[×x](\d+(?:\.\d+)?)\s*(?:-?\s*(\d+[Hh]?[Gg]?))?/;
    const mMet = s.match(metric);
    if (mMet) {
      return {
        spec: mMet[0],
        nominalDiameterMm: parseFloat(mMet[1]),
        pitch: parseFloat(mMet[2]),
        class: mMet[3],
        isMetric: true,
      };
    }
    const imperial = /(\d+\/\d+|\.\d+|\d+\.\d+|\d+)\s*-\s*(\d+)\s+(UNC|UNF|UNEF|NPT|NPSM)\s*(?:-\s*(\d+[A-Za-z]+))?/i;
    const mImp = s.match(imperial);
    if (mImp) {
      let inches: number;
      if (mImp[1].includes("/")) {
        const parts = mImp[1].split("/").map(Number);
        inches = parts[0] / parts[1];
      } else {
        inches = parseFloat(mImp[1]);
      }
      return {
        spec: mImp[0],
        nominalDiameterMm: inches * 25.4,
        pitch: parseFloat(mImp[2]),
        class: mImp[4],
        isMetric: false,
      };
    }
    return null;
  }

  private extractDimensions(text: string): DimTolerance[] {
    const out: DimTolerance[] = [];
    const splitRe = /(\d+\.?\d*)\s*\+\s*\.?(\d+\.?\d*)\s*\/\s*-\s*\.?(\d+\.?\d*)/g;
    for (const m of text.matchAll(splitRe)) {
      const parsed = this.parse_dim(m[0]);
      if (parsed) out.push(parsed);
    }
    const pmRe = /(\d+\.?\d*)\s*[±]\s*(\d+\.?\d*)/g;
    for (const m of text.matchAll(pmRe)) {
      const parsed = this.parse_dim(m[0]);
      if (parsed) out.push(parsed);
    }
    return out;
  }

  private extractGDT(text: string): GDTCallout[] {
    const out: GDTCallout[] = [];
    for (const [symbol, type] of Object.entries(GDT_SYMBOL_MAP)) {
      const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`${escaped}\\s*(\\d+\\.?\\d*)\\s*(MMC|LMC|RFS)?\\s*([A-Z](?:\\s*[A-Z])*)?`, "g");
      for (const m of text.matchAll(re)) {
        const tol = parseFloat(m[1]);
        if (!Number.isFinite(tol) || tol <= 0) continue;
        out.push({
          type,
          tolerance: tol,
          modifier: m[2] as GDTCallout["modifier"] | undefined,
          datums: m[3] ? m[3].split(/\s+/).filter(Boolean) : undefined,
          raw: m[0],
        });
      }
    }
    return out;
  }

  private extractThreads(text: string): ThreadCallout[] {
    const out: ThreadCallout[] = [];
    const metricRe = /M\d+(?:\.\d+)?[×x]\d+(?:\.\d+)?\s*(?:-?\s*\d+[Hh]?[Gg]?)?/g;
    const impRe = /(?:\d+\/\d+|\.\d+|\d+\.\d+|\d+)\s*-\s*\d+\s+(?:UNC|UNF|UNEF|NPT|NPSM)\s*(?:-\s*\d+[A-Za-z]+)?/gi;
    for (const m of text.matchAll(metricRe)) {
      const p = this.parse_thread(m[0]);
      if (p) out.push(p);
    }
    for (const m of text.matchAll(impRe)) {
      const p = this.parse_thread(m[0]);
      if (p) out.push(p);
    }
    return out;
  }

  private extractSurfaceFinishes(text: string): SurfaceFinish[] {
    const out: SurfaceFinish[] = [];
    const re = /Ra\s*(\d+(?:\.\d+)?)/gi;
    for (const m of text.matchAll(re)) {
      out.push({ raMicrometers: parseFloat(m[1]), raw: m[0] });
    }
    return out;
  }

  private extractTitleBlock(text: string): TitleBlockFields {
    const partNumber = this.firstMatch(text, /(?:PART(?:\s*#|\s+NO\.?|\s+NUMBER)?)\s*:?\s*([A-Z0-9\-]+)/i);
    const revision = this.firstMatch(text, /REV(?:ISION)?\s*:?\s*([A-Z0-9]+)/i);
    const drawnByRaw = this.firstMatch(text, /DRAWN\s+BY\s*:?\s*([A-Za-z\.\s]+?)(?:\n|$|DATE)/i);
    const drawingDate = this.firstMatch(text, /DATE\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/i);
    const scaleRaw = this.firstMatch(text, /SCALE\s*:?\s*([0-9:.\s]+)/i);
    const materialRaw = this.firstMatch(text, /MATERIAL\s*:?\s*([A-Z0-9\-\s]+?)(?:\n|$|FINISH)/i);
    const finishRaw = this.firstMatch(text, /FINISH\s*:?\s*([A-Z0-9\-\s]+?)(?:\n|$)/i);
    return {
      partNumber,
      revision,
      drawnBy: drawnByRaw?.trim(),
      drawingDate,
      scale: scaleRaw?.trim(),
      material: materialRaw?.trim(),
      finish: finishRaw?.trim(),
    };
  }

  private extractMaterial(text: string): string | undefined {
    // Order matters: prefer the more specific named alloys first; then bare
    // AISI carbon-steel grade numbers (1018, 1045, 4140, 4340, 8620, etc.).
    const re = /(AISI\s+\d+|6061-T\d|Ti-6Al-4V|Inconel\s+\d+|304\s+SS|316\s+SS|H-?13|A-?2|D-?2|O-?1|17-?4\s+PH|(?:^|\s)(10\d{2}|11\d{2}|41\d{2}|43\d{2}|46\d{2}|48\d{2}|51\d{2}|52\d{2}|61\d{2}|81\d{2}|86\d{2}|87\d{2}|92\d{2}|93\d{2}|94\d{2})(?=\s|$|[^\d]))/i;
    const m = text.match(re);
    if (!m) return undefined;
    return m[0].trim();
  }

  private firstMatch(text: string, re: RegExp): string | undefined {
    const m = text.match(re);
    return m ? m[1] : undefined;
  }
}

export const blueprintCalloutParserEngine = new BlueprintCalloutParserEngine();
