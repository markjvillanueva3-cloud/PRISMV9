/**
 * CADFunctionParameterEmitterEngine — KNOWLEDGE-EXTRACT-COMPLETE-MS0/U-KEC-CAD-PARAM-EMITTER
 *
 * The canonical emit pipeline that turns per-CAD `CADParameter[]` trees
 * (already in `*FunctionIndexEngine.ts` for Fusion360/HyperCADS/Mastercam/
 * SolidWorks/Inventor) into:
 *   1. Wiki node bodies — `knowledge/wiki/architecture/cad-params/<system>/<fn>/<param>.md`
 *   2. Tribal node bodies — `knowledge/wiki/architecture/tribal/cad-params/<system>-<fn>-<param>.md`
 *   3. NN-graph reference-pool seed records — `state/shared/cad-param-graph-seed.jsonl`
 *
 * Why this engine is the foundation, not the work itself: the user's new goal
 * is "extract every button + input as wiki + tribal nodes the NN can hop."
 * This engine fixes the SHAPE of the output. Per-CAD extractors fill the
 * content as they're enriched (U-KEC-FUSION-PARAM-PULL, etc.) — and they all
 * land in the same emit format because they all call this one engine.
 *
 * Pure + injectable. No I/O — emitters return strings/records the caller
 * persists. Adheres to CLAUDE.md §ENGINE rules: pure, typed result objects,
 * Zod validation at the boundary, companion test file.
 */

import { z } from "zod";

// ── Input contract (matches existing CADParameter shape verbatim) ───────────

export const CADParameterSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  unit: z.string().optional(),
  description: z.string().optional(),
  default: z.unknown().optional(),
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  values: z.array(z.string()).readonly().optional(),
  options: z.array(z.string()).readonly().optional(),
});
export type CADParameter = z.infer<typeof CADParameterSchema>;

export const SupportedSystem = ["hypercads", "fusion360", "solidworks", "inventor", "mastercam"] as const;
export type SupportedSystem = (typeof SupportedSystem)[number];

export interface ParameterEmitInput {
  readonly system: SupportedSystem;
  readonly functionName: string;
  readonly parameters: ReadonlyArray<CADParameter>;
  readonly category?: string;
  readonly functionDescription?: string;
}

export interface WikiNodeRecord {
  readonly relativePath: string; // under knowledge/wiki/
  readonly body: string;
  readonly frontmatter: Readonly<Record<string, string>>;
}

export interface TribalNodeRecord {
  readonly relativePath: string; // under knowledge/wiki/architecture/tribal/
  readonly body: string;
  readonly frontmatter: Readonly<Record<string, string>>;
}

export interface NNGraphSeedRecord {
  readonly nodeId: string;
  readonly nodeKind: "cad_parameter";
  readonly system: SupportedSystem;
  readonly functionName: string;
  readonly parameterName: string;
  readonly edges: ReadonlyArray<{ kind: string; target: string }>;
}

export interface EmitResult {
  readonly schemaVersion: 1;
  readonly system: SupportedSystem;
  readonly functionName: string;
  readonly parameterCount: number;
  readonly wikiNodes: ReadonlyArray<WikiNodeRecord>;
  readonly tribalNodes: ReadonlyArray<TribalNodeRecord>;
  readonly nnGraphSeeds: ReadonlyArray<NNGraphSeedRecord>;
}

// ── Pure helpers ────────────────────────────────────────────────────────────

const SLUG_BAD = /[^a-z0-9-]/g;
export function slugify(s: string): string {
  return s.toLowerCase().replace(/[_\s]+/g, "-").replace(SLUG_BAD, "").replace(/^-+|-+$/g, "");
}

function fmtRange(p: CADParameter): string {
  if (typeof p.min === "number" && typeof p.max === "number") return `${p.min}..${p.max}`;
  if (typeof p.min === "number") return `≥${p.min}`;
  if (typeof p.max === "number") return `≤${p.max}`;
  return "—";
}

function fmtAllowed(p: CADParameter): string {
  if (p.values && p.values.length > 0) return p.values.join(" | ");
  if (p.options && p.options.length > 0) return p.options.join(" | ");
  return "—";
}

function fmtFrontmatter(fm: Readonly<Record<string, string>>): string {
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) lines.push(`${k}: "${v.replace(/"/g, '\\"')}"`);
  lines.push("---");
  return lines.join("\n");
}

function nodeIdFor(system: SupportedSystem, fn: string, paramName: string): string {
  return `cad-param.${system}.${slugify(fn)}.${slugify(paramName)}`;
}

// ── Emit functions (pure) ───────────────────────────────────────────────────

export function emitWikiNode(
  input: ParameterEmitInput,
  param: CADParameter,
): WikiNodeRecord {
  const fnSlug = slugify(input.functionName);
  const paramSlug = slugify(param.name);
  const fm: Record<string, string> = {
    name: `cad-param-${input.system}-${fnSlug}-${paramSlug}`,
    system: input.system,
    function: input.functionName,
    parameter: param.name,
    type: param.type,
  };
  if (param.unit) fm.unit = param.unit;
  if (param.required !== undefined) fm.required = String(param.required);

  const body = [
    fmtFrontmatter(fm),
    "",
    `# CAD parameter — \`${input.system}\` · \`${input.functionName}\` · \`${param.name}\``,
    "",
    `**Type:** \`${param.type}\`${param.unit ? `  ·  **Unit:** \`${param.unit}\`` : ""}`,
    `**Required:** ${param.required === true ? "yes" : param.required === false ? "no" : "unspecified"}`,
    `**Range:** ${fmtRange(param)}  ·  **Allowed values:** ${fmtAllowed(param)}`,
    `**Default:** ${param.default !== undefined ? "`" + JSON.stringify(param.default) + "`" : "—"}`,
    "",
    `## Description`,
    param.description ?? "_(no description provided — fill via per-CAD content extraction)_",
    "",
    `## Cross-references`,
    `- Function: [[cad-fn-${input.system}-${fnSlug}]]`,
    `- System adapter: [[CADSystemNeuralArchAdapterEngine]]`,
    `- Producer facade: [[CADMultiSystemAIProducerEngine]]`,
  ].join("\n");

  return {
    relativePath: `architecture/cad-params/${input.system}/${fnSlug}/${paramSlug}.md`,
    body,
    frontmatter: fm,
  };
}

export function emitTribalNode(
  input: ParameterEmitInput,
  param: CADParameter,
): TribalNodeRecord {
  const fnSlug = slugify(input.functionName);
  const paramSlug = slugify(param.name);
  const fm: Record<string, string> = {
    name: `tribal-cad-param-${input.system}-${fnSlug}-${paramSlug}`,
    domain: "cad",
    system: input.system,
    function: input.functionName,
    parameter: param.name,
  };
  const body = [
    fmtFrontmatter(fm),
    "",
    `# Tribal — \`${input.system}\` parameter \`${param.name}\` of \`${input.functionName}\``,
    "",
    param.description ?? "_(no operator guidance yet — fill from shop-floor knowledge or vendor docs)_",
    "",
    `When set outside [${fmtRange(param)}], expect ${param.type === "number" ? "numeric clamping or validation rejection" : "API-side type rejection"}.`,
  ].join("\n");

  return {
    relativePath: `architecture/tribal/cad-params/${input.system}-${fnSlug}-${paramSlug}.md`,
    body,
    frontmatter: fm,
  };
}

export function emitNNGraphSeed(
  input: ParameterEmitInput,
  param: CADParameter,
): NNGraphSeedRecord {
  return {
    nodeId: nodeIdFor(input.system, input.functionName, param.name),
    nodeKind: "cad_parameter",
    system: input.system,
    functionName: input.functionName,
    parameterName: param.name,
    edges: [
      { kind: "parameter_of", target: `cad-fn.${input.system}.${slugify(input.functionName)}` },
      { kind: "typed_as",     target: `cad-type.${slugify(param.type)}` },
      ...(param.unit ? [{ kind: "in_unit", target: `unit.${slugify(param.unit)}` }] : []),
    ],
  };
}

// ── Engine ──────────────────────────────────────────────────────────────────

export class CADFunctionParameterEmitterEngine {
  emit(rawInput: unknown): EmitResult {
    const input = z.object({
      system: z.enum(SupportedSystem),
      functionName: z.string().min(1),
      parameters: z.array(CADParameterSchema),
      category: z.string().optional(),
      functionDescription: z.string().optional(),
    }).parse(rawInput) as ParameterEmitInput;

    const wikiNodes:   WikiNodeRecord[]    = input.parameters.map(p => emitWikiNode(input, p));
    const tribalNodes: TribalNodeRecord[]  = input.parameters.map(p => emitTribalNode(input, p));
    const nnGraphSeeds: NNGraphSeedRecord[] = input.parameters.map(p => emitNNGraphSeed(input, p));

    return {
      schemaVersion: 1,
      system: input.system,
      functionName: input.functionName,
      parameterCount: input.parameters.length,
      wikiNodes, tribalNodes, nnGraphSeeds,
    };
  }

  supportedSystems(): ReadonlyArray<SupportedSystem> {
    return SupportedSystem;
  }

  summary(): { schemaVersion: 1; supportedSystems: ReadonlyArray<SupportedSystem>; emitSurfaces: ReadonlyArray<string> } {
    return {
      schemaVersion: 1,
      supportedSystems: SupportedSystem,
      emitSurfaces: ["wiki", "tribal", "nn-graph-seed"],
    };
  }
}

export const cadFunctionParameterEmitterEngine = new CADFunctionParameterEmitterEngine();
