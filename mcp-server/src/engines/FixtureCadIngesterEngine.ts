/**
 * FixtureCadIngesterEngine (E101)
 * =================================
 *
 * Parses fixture assembly CAD files for lathe workholding:
 *   - Inventor .ipt (part) / .iam (assembly) — Windows-only via Inventor API
 *   - STEP (.step/.stp) — universal, delegates to OkumaMachineStepIngesterEngine
 *   - IGES (.iges/.igs) — universal, minimal header/entity extraction
 *
 * Platform strategy (per roadmap):
 *   - Native .ipt/.iam parsing requires Autodesk Inventor on Windows
 *   - STEP/IGES fallback is documented + implemented so CI still works
 *   - When .ipt is present but Inventor absent, we surface a warning with
 *     a suggested export path rather than silently failing
 *
 * @module engines/FixtureCadIngesterEngine
 * @milestone LATHE-AWARE-HARDEN MS6 (U-LAT44)
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type FixtureFileKind =
  | "inventor_part" // .ipt
  | "inventor_assembly" // .iam
  | "step"
  | "iges"
  | "unknown";

export interface FixtureComponent {
  name: string;
  kind: "chuck" | "collet" | "tailstock" | "steady_rest" | "jaw" | "soft_jaw" | "mandrel" | "face_driver" | "unknown";
  count?: number;
  inferred_from: "filename" | "metadata" | "geometry";
}

export interface FixtureBoundingBox {
  min_mm: { x: number; y: number; z: number };
  max_mm: { x: number; y: number; z: number };
  span_mm: { x: number; y: number; z: number };
}

export interface FixtureCadResult {
  source: string;
  file_kind: FixtureFileKind;
  platform_supported: boolean;
  components: FixtureComponent[];
  bounding_box?: FixtureBoundingBox;
  mass_kg?: number;
  materials?: string[];
  assembly_depth?: number;
  parse_warnings: string[];
  fallback_suggestion?: string;
  generated_at: string;
}

export interface IngestOptions {
  /** Override platform detection (for testing) */
  force_platform?: "win32" | "linux" | "darwin";
  /** Inventor API endpoint (defaults to env PRISM_INVENTOR_API_URL) */
  inventor_api_url?: string;
  /** Limit bounding box computation (STEP files can be huge) */
  max_step_entities?: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function detectKind(filePath: string): FixtureFileKind {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ipt":
      return "inventor_part";
    case ".iam":
      return "inventor_assembly";
    case ".step":
    case ".stp":
      return "step";
    case ".iges":
    case ".igs":
      return "iges";
    default:
      return "unknown";
  }
}

function classifyComponentFromName(name: string): FixtureComponent["kind"] {
  const lower = name.toLowerCase();
  // Order matters: more specific / higher-priority classes checked first
  // ("chuck_3jaw" should classify as chuck, not jaw)
  if (/soft[\s_-]?jaw/.test(lower)) return "soft_jaw";
  if (/chuck/.test(lower)) return "chuck";
  if (/collet/.test(lower)) return "collet";
  if (/tailstock/.test(lower)) return "tailstock";
  if (/steady/.test(lower) || /rest/.test(lower)) return "steady_rest";
  if (/mandrel/.test(lower)) return "mandrel";
  if (/face[\s_-]?driver/.test(lower)) return "face_driver";
  if (/jaw/.test(lower)) return "jaw";
  return "unknown";
}

// ── IGES Header Parser ────────────────────────────────────────────────────

function parseIgesHeader(content: string): { description: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const description: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    // IGES Start (S) + Global (G) sections live in first 80-char fixed-width lines
    if (/^[SG]\s/i.test(line) || /\bS\d+$/.test(line)) {
      const payload = line.slice(0, 72).trim();
      if (payload.length > 0) description.push(payload);
    }
  }
  if (description.length === 0) {
    warnings.push("IGES header sections (S/G) not found — file may not be IGES");
  }
  return { description, warnings };
}

// ── Engine Implementation ──────────────────────────────────────────────────

class FixtureCadIngesterEngineImpl {
  /**
   * Ingest a single fixture CAD file.
   */
  async ingestFile(filePath: string, options: IngestOptions = {}): Promise<FixtureCadResult> {
    if (!fs.existsSync(filePath)) {
      return this.emptyResult(filePath, "unknown", [`File not found: ${filePath}`]);
    }

    const kind = detectKind(filePath);
    const platform = options.force_platform ?? process.platform;

    switch (kind) {
      case "inventor_part":
      case "inventor_assembly":
        return this.ingestInventor(filePath, kind, platform);
      case "step":
        return this.ingestStep(filePath, options);
      case "iges":
        return this.ingestIges(filePath);
      default:
        return this.emptyResult(filePath, "unknown", [
          `Unsupported file extension: ${path.extname(filePath)}`,
        ]);
    }
  }

  /**
   * Ingest a directory of fixture CAD files.
   */
  async ingestDirectory(
    dirPath: string,
    options: IngestOptions = {}
  ): Promise<{ results: FixtureCadResult[]; summary: Record<FixtureFileKind, number> }> {
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
      return {
        results: [],
        summary: {
          inventor_part: 0,
          inventor_assembly: 0,
          step: 0,
          iges: 0,
          unknown: 0,
        },
      };
    }
    const entries = fs.readdirSync(dirPath);
    const cadFiles = entries.filter((f) => /\.(ipt|iam|step|stp|iges|igs)$/i.test(f));
    const results: FixtureCadResult[] = [];
    for (const f of cadFiles) {
      results.push(await this.ingestFile(path.join(dirPath, f), options));
    }

    const summary: Record<FixtureFileKind, number> = {
      inventor_part: 0,
      inventor_assembly: 0,
      step: 0,
      iges: 0,
      unknown: 0,
    };
    for (const r of results) summary[r.file_kind]++;

    return { results, summary };
  }

  // ── Private Ingest Paths ──────────────────────────────────────────────

  private async ingestInventor(
    filePath: string,
    kind: FixtureFileKind,
    platform: string
  ): Promise<FixtureCadResult> {
    const warnings: string[] = [];
    const supported = platform === "win32";
    let fallback = "Export to STEP/IGES from Inventor and rerun this engine on the exported file.";

    const filename = path.basename(filePath, path.extname(filePath));
    const components: FixtureComponent[] = [];

    // Always infer at least one component from filename (best-effort metadata)
    const kindFromName = classifyComponentFromName(filename);
    if (kindFromName !== "unknown") {
      components.push({
        name: filename,
        kind: kindFromName,
        inferred_from: "filename",
      });
    }

    if (!supported) {
      warnings.push(
        `Inventor ${kind} parsing requires Windows + Autodesk Inventor. Current platform: ${platform}.`
      );
    } else {
      // On Windows with Inventor available, we would call the COM API here.
      // For this codebase we document the contract; the actual bridge is
      // platform-specific and out of scope for unit tests.
      warnings.push(
        "Native Inventor API bridge not implemented — returning filename-inferred component only. Use STEP export for full metadata."
      );
    }

    return {
      source: filePath,
      file_kind: kind,
      platform_supported: supported,
      components,
      parse_warnings: warnings,
      fallback_suggestion: fallback,
      generated_at: new Date().toISOString(),
    };
  }

  private async ingestStep(
    filePath: string,
    options: IngestOptions
  ): Promise<FixtureCadResult> {
    // Delegate to OkumaMachineStepIngesterEngine — it already parses STEP
    const { okumaMachineStepIngesterEngine } = await import(
      "./OkumaMachineStepIngesterEngine.js"
    );
    const stepResult = okumaMachineStepIngesterEngine.parseFile(filePath);

    const components: FixtureComponent[] = [];
    // Map STEP products → fixture components
    for (const p of stepResult.product_names) {
      components.push({
        name: p,
        kind: classifyComponentFromName(p),
        inferred_from: "metadata",
      });
    }

    // Compute bounding box from point cloud (coarse — use all placement origins)
    let bb: FixtureBoundingBox | undefined;
    if (stepResult.axis_placements.length > 0) {
      const xs = stepResult.axis_placements.map((p) => p.origin.x);
      const ys = stepResult.axis_placements.map((p) => p.origin.y);
      const zs = stepResult.axis_placements.map((p) => p.origin.z);
      const min = { x: Math.min(...xs), y: Math.min(...ys), z: Math.min(...zs) };
      const max = { x: Math.max(...xs), y: Math.max(...ys), z: Math.max(...zs) };
      bb = {
        min_mm: min,
        max_mm: max,
        span_mm: {
          x: max.x - min.x,
          y: max.y - min.y,
          z: max.z - min.z,
        },
      };
    }

    return {
      source: filePath,
      file_kind: "step",
      platform_supported: true,
      components,
      bounding_box: bb,
      parse_warnings: stepResult.parse_warnings,
      generated_at: new Date().toISOString(),
    };
  }

  private async ingestIges(filePath: string): Promise<FixtureCadResult> {
    const content = fs.readFileSync(filePath, "utf-8");
    const { description, warnings } = parseIgesHeader(content);

    // Infer component from filename since IGES doesn't carry named products
    const filename = path.basename(filePath, path.extname(filePath));
    const kindFromName = classifyComponentFromName(filename);
    const components: FixtureComponent[] = [];
    if (kindFromName !== "unknown") {
      components.push({
        name: filename,
        kind: kindFromName,
        inferred_from: "filename",
      });
    }

    return {
      source: filePath,
      file_kind: "iges",
      platform_supported: true,
      components,
      materials: description.length > 0 ? description.slice(0, 3) : undefined,
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  private emptyResult(
    source: string,
    kind: FixtureFileKind,
    warnings: string[]
  ): FixtureCadResult {
    return {
      source,
      file_kind: kind,
      platform_supported: false,
      components: [],
      parse_warnings: warnings,
      generated_at: new Date().toISOString(),
    };
  }

  getStats(): {
    supported_extensions: string[];
    component_classes: FixtureComponent["kind"][];
    fallback_chain: string;
  } {
    return {
      supported_extensions: [".ipt", ".iam", ".step", ".stp", ".iges", ".igs"],
      component_classes: [
        "chuck",
        "collet",
        "tailstock",
        "steady_rest",
        "jaw",
        "soft_jaw",
        "mandrel",
        "face_driver",
        "unknown",
      ],
      fallback_chain: ".ipt/.iam → STEP export → STEP parser (primary universal path)",
    };
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const fixtureCadIngesterEngine = new FixtureCadIngesterEngineImpl();
export type { FixtureCadIngesterEngineImpl };
