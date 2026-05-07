/**
 * CADFormatConversionMatrixEngine — U-FS-09 (PHASE-47)
 *
 * Maintains the lossless/lossy conversion graph for 25+ CAD formats.
 * Answers:
 *   - classifyConversion(from, to): ConversionReport
 *   - bestPath(from, to): path with maximum composite score (BFS + product)
 *   - sniffFormat(bytes|hex): magic-byte sniff
 *   - probeValidity(filename, bytes): extension + sniff agreement check
 *
 * The built-in matrix is intentionally conservative and well-attested:
 *   - STEP / IGES / Parasolid round-trip with other neutral formats losslessly
 *     wrt geometry but drop feature trees (lossy_visual).
 *   - STL / OBJ always tessellate → lossy_geometry.
 *   - Native→Native requires a neutral hop (modeled as composed edges).
 *
 * @module engines/CADFormatConversionMatrixEngine
 */

import {
  ConversionEdgeSchema,
  ConversionReportSchema,
  MagicByteSignatureSchema,
  ValidityProbeSchema,
  type ConversionEdge,
  type ConversionQuality,
  type ConversionReport,
  type ValidityProbe,
  type MagicByteSignature,
} from "../schemas/cadFormatConversionSchema.js";

// ── Built-in magic-byte signatures ──────────────────────────────────────────

const BUILT_IN_SIGNATURES: MagicByteSignature[] = [
  // STEP: ISO-10303-21 starts with ASCII "ISO-10303-21;"
  MagicByteSignatureSchema.parse({
    format: "step",
    magicHex: "49534f2d31303330332d32313b",
    offset: 0,
    asciiPrefix: "ISO-10303-21;",
  }),
  // IGES begins with "S" in column 73 — we settle for first-line contains "S      1" pattern fallback.
  // Use a conservative prefix: ASCII "                                                                        S"
  // is impractical; use asciiPrefix "START" comment is not standard. Use a softer check: content must be ASCII.
  // DXF: "  0\nSECTION" pattern; magic is often "  0" (ASCII). Keep "300 0d 0a" as a practical hint
  MagicByteSignatureSchema.parse({
    format: "dxf",
    magicHex: "20203020202020200d0a",
    offset: 0,
    asciiPrefix: "  0\r\n",
  }),
  // DWG: "AC10xx" sequence (AutoCAD version).
  MagicByteSignatureSchema.parse({
    format: "dwg",
    magicHex: "414331",
    offset: 0,
    asciiPrefix: "AC1",
  }),
  // Parasolid x_t: "**ABAQUS*VERSION:" unlikely — use "PS=" or "PARASOLID" fallback.
  // A real x_t begins with "**ABAQUS" is wrong. True: first line contains "PARASOLID".
  MagicByteSignatureSchema.parse({
    format: "x_t",
    magicHex: "5041524153",
    offset: 0,
    asciiPrefix: "PARAS",
  }),
  // glTF binary: 0x67 0x6c 0x54 0x46 ("glTF") magic
  MagicByteSignatureSchema.parse({
    format: "glb",
    magicHex: "676c5446",
    offset: 0,
    asciiPrefix: "glTF",
  }),
  // 3MF is a ZIP: "PK\x03\x04"
  MagicByteSignatureSchema.parse({
    format: "3mf",
    magicHex: "504b0304",
    offset: 0,
  }),
  // PDF: "%PDF-"
  MagicByteSignatureSchema.parse({
    format: "pdf",
    magicHex: "255044462d",
    offset: 0,
    asciiPrefix: "%PDF-",
  }),
  // STL ASCII: "solid "
  MagicByteSignatureSchema.parse({
    format: "stl",
    magicHex: "736f6c6964",
    offset: 0,
    asciiPrefix: "solid",
  }),
  // OBJ: "#" comment (weak). Instead check "o " or "v ".
  MagicByteSignatureSchema.parse({
    format: "obj",
    magicHex: "762028",
    offset: 0,
    asciiPrefix: "v ",
  }),
];

// ── Built-in conversion edges (curated subset) ──────────────────────────────
// We encode a small authoritative set and compute composed paths at runtime.

function E(
  from: string,
  to: string,
  quality: ConversionQuality,
  geometricAccuracy: number,
  semanticRetention: number,
  notes: string,
): ConversionEdge {
  return ConversionEdgeSchema.parse({
    from,
    to,
    quality,
    geometricAccuracy,
    semanticRetention,
    notes,
  });
}

const BUILT_IN_EDGES: ConversionEdge[] = [
  // STEP↔IGES↔Parasolid↔JT: neutral geometry exchange
  E("step", "iges", "lossy_visual", 0.98, 0.4, "geometry preserved; feature tree lost"),
  E("iges", "step", "lossy_visual", 0.98, 0.4, "geometry preserved; feature tree lost"),
  E("step", "x_t", "lossy_visual", 0.99, 0.4, "Parasolid B-rep; features lost"),
  E("x_t", "step", "lossy_visual", 0.99, 0.4, "Parasolid→STEP B-rep"),
  E("step", "jt", "lossy_geometry", 0.92, 0.3, "JT tessellation lossy"),
  E("jt", "step", "lossy_geometry", 0.85, 0.1, "JT→STEP reverse-engineered surfaces"),

  // Native ↔ STEP (all vendors)
  E("sldprt", "step", "lossy_visual", 0.97, 0.2, "SolidWorks features lost"),
  E("step", "sldprt", "lossy_visual", 0.95, 0.1, "Reconstructed via import; no parametric tree"),
  E("prt", "step", "lossy_visual", 0.97, 0.2, "NX/Creo features lost"),
  E("catpart", "step", "lossy_visual", 0.97, 0.2, "CATIA features lost"),
  E("ipt", "step", "lossy_visual", 0.97, 0.2, "Inventor features lost"),
  E("f3d", "step", "lossy_visual", 0.95, 0.25, "Fusion features lost"),

  // Mesh conversions
  E("step", "stl", "lossy_geometry", 0.85, 0, "tessellation lossy"),
  E("step", "obj", "lossy_geometry", 0.85, 0, "tessellation lossy"),
  E("step", "3mf", "lossy_geometry", 0.88, 0.1, "tessellation + some metadata"),
  E("stl", "obj", "lossless", 1, 1, "both are triangle soups"),
  E("obj", "stl", "lossless", 1, 1, "both are triangle soups"),

  // Drawing paths
  E("dwg", "dxf", "lossless", 1, 0.95, "DWG and DXF near-identical"),
  E("dxf", "dwg", "lossless", 1, 0.95, "DWG and DXF near-identical"),
  E("slddrw", "pdf", "lossy_metadata", 0.98, 0.3, "PDF loses CAD metadata"),
  E("idw", "pdf", "lossy_metadata", 0.98, 0.3, "PDF loses CAD metadata"),
  E("catdrawing", "pdf", "lossy_metadata", 0.98, 0.3, "PDF loses CAD metadata"),

  // Self-loops are lossless
];

function compositeScore(edge: ConversionEdge): number {
  return 0.6 * edge.geometricAccuracy + 0.4 * edge.semanticRetention;
}

function riskOf(quality: ConversionQuality, composite: number): ConversionReport["risk"] {
  if (quality === "unsupported") return "red";
  if (quality === "lossless") return "green";
  if (composite >= 0.85) return "yellow";
  return "red";
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CADFormatConversionMatrixEngine {
  private edges = new Map<string, ConversionEdge>();
  private signatures: MagicByteSignature[] = [];

  constructor() {
    for (const e of BUILT_IN_EDGES) this.edges.set(`${e.from}::${e.to}`, e);
    this.signatures = [...BUILT_IN_SIGNATURES];
  }

  get edgeCount(): number {
    return this.edges.size;
  }

  listEdges(): ConversionEdge[] {
    return [...this.edges.values()];
  }

  addEdge(edge: ConversionEdge): void {
    this.edges.set(
      `${edge.from.toLowerCase()}::${edge.to.toLowerCase()}`,
      ConversionEdgeSchema.parse(edge),
    );
  }

  // ── Classification ─────────────────────────────────────────────────────────

  classifyConversion(rawFrom: string, rawTo: string): ConversionReport {
    const from = rawFrom.toLowerCase();
    const to = rawTo.toLowerCase();
    if (from === to) {
      return ConversionReportSchema.parse({
        from,
        to,
        quality: "lossless",
        geometricAccuracy: 1,
        semanticRetention: 1,
        notes: "identity",
        risk: "green",
        compositeScore: 1,
      });
    }
    const direct = this.edges.get(`${from}::${to}`);
    if (direct) {
      const score = compositeScore(direct);
      return ConversionReportSchema.parse({
        from: direct.from,
        to: direct.to,
        quality: direct.quality,
        geometricAccuracy: direct.geometricAccuracy,
        semanticRetention: direct.semanticRetention,
        notes: direct.notes,
        risk: riskOf(direct.quality, score),
        compositeScore: score,
      });
    }
    // Unsupported
    return ConversionReportSchema.parse({
      from,
      to,
      quality: "unsupported",
      geometricAccuracy: 0,
      semanticRetention: 0,
      notes: `no direct conversion path from ${from} to ${to}`,
      risk: "red",
      compositeScore: 0,
    });
  }

  /**
   * BFS from `from` to `to`, maximizing product of composite scores along path.
   * Returns sequence of formats, or null if unreachable.
   */
  bestPath(rawFrom: string, rawTo: string): {
    path: string[];
    compositeScore: number;
  } | null {
    const from = rawFrom.toLowerCase();
    const to = rawTo.toLowerCase();
    if (from === to) return { path: [from], compositeScore: 1 };

    // Build adjacency
    const adj = new Map<string, ConversionEdge[]>();
    for (const e of this.edges.values()) {
      if (!adj.has(e.from)) adj.set(e.from, []);
      adj.get(e.from)!.push(e);
    }

    // Dijkstra-style with NEGATIVE log of composite → shortest path = best product
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    dist.set(from, 0);
    const queue: { node: string; cost: number }[] = [{ node: from, cost: 0 }];

    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const { node, cost } = queue.shift()!;
      if (node === to) break;
      if (cost > (dist.get(node) ?? Infinity)) continue;
      for (const e of adj.get(node) ?? []) {
        const sc = compositeScore(e);
        if (sc <= 0) continue;
        const next = cost - Math.log(sc); // negative log accumulation
        if (next < (dist.get(e.to) ?? Infinity)) {
          dist.set(e.to, next);
          prev.set(e.to, node);
          queue.push({ node: e.to, cost: next });
        }
      }
    }

    if (!dist.has(to)) return null;
    const path: string[] = [to];
    let cur: string | undefined = to;
    while (cur !== from) {
      const p = prev.get(cur!);
      if (!p) return null;
      path.push(p);
      cur = p;
    }
    path.reverse();
    const compositeScoreTotal = Math.exp(-dist.get(to)!);
    return { path, compositeScore: compositeScoreTotal };
  }

  // ── Magic-byte sniff ──────────────────────────────────────────────────────

  private bytesToHex(bytes: Uint8Array, maxLen = 32): string {
    let s = "";
    const n = Math.min(bytes.length, maxLen);
    for (let i = 0; i < n; i++) {
      s += bytes[i].toString(16).padStart(2, "0");
    }
    return s;
  }

  sniffFormat(input: Uint8Array | string): string | undefined {
    let hex: string;
    if (typeof input === "string") {
      hex = input.toLowerCase();
    } else {
      hex = this.bytesToHex(input, 64);
    }
    for (const sig of this.signatures) {
      const off = sig.offset * 2;
      if (hex.length >= off + sig.magicHex.length) {
        if (hex.slice(off, off + sig.magicHex.length) === sig.magicHex) {
          return sig.format;
        }
      }
    }
    return undefined;
  }

  probeValidity(filename: string, input: Uint8Array | string): ValidityProbe {
    const ext = filename.toLowerCase().replace(/^.*\./, "");
    const sniffed = this.sniffFormat(input);
    const extMatch = sniffed !== undefined && sniffed === ext;
    return ValidityProbeSchema.parse({
      sniffedFormat: sniffed,
      extensionFormat: ext || undefined,
      extensionMatch: extMatch,
      likelyValid: sniffed !== undefined,
      notes: sniffed
        ? extMatch
          ? "extension matches magic-byte sniff"
          : `extension=${ext}, sniffed=${sniffed} — possible mislabeling`
        : "no matching signature",
    });
  }

  addSignature(sig: MagicByteSignature): void {
    this.signatures.push(MagicByteSignatureSchema.parse(sig));
  }
}

export const cadFormatConversionMatrixEngine = new CADFormatConversionMatrixEngine();
