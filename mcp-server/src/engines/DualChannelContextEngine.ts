/**
 * DualChannelContextEngine -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04 (slot:sierra)
 *
 * Builds a DUAL-CHANNEL context bundle for subagent dispatch: a structured JSON
 * channel (an ego-graph addressed by explicit `node-id:` markers) PLUS a visual
 * channel (a real PNG of the same ego-graph when a system Chrome/Edge is free,
 * else a mermaid+markdown "visual layer" fallback). The tldraw dual-channel
 * insight (2025): structured-data + a spatial/visual representation beats
 * prose-only context for multi-agent coordination -- a subagent that can SEE the
 * neighbourhood AND cite node-ids coordinates far better than one handed prose.
 *
 * Composes (does NOT duplicate):
 *   - GraphContextLensEngine (U-GAC01) -- ego-graph extraction + mermaid/markdown render.
 *   - scripts/render-viz-screenshot.mjs (U-GAC04) -- system-Chrome headless PNG (no npm dep).
 *
 * Design note on the viz channel: PNG rendering is BEST-EFFORT and capability-
 * probed. It succeeds on a host where Chrome/Edge can run headless (CI box, or a
 * desktop with no live Chrome singleton); it degrades to the mermaid+markdown
 * fallback when Chrome is unavailable OR forwards to a running instance (the
 * common desktop case). The dual-channel CONTRACT -- JSON node-ids + a visual
 * layer -- is therefore ALWAYS satisfied: mermaid is itself a parseable visual
 * diagram a text-only subagent can consume. (Spec failure_modes: chromium
 * unavailable -> MD-text fallback; PNG > 10MB -> downscale+warn; subagent rejects
 * binary -> flatten to base64 data URI.)
 *
 * @engine DualChannelContextEngine
 * @milestone GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04
 * @classification STANDARD (orchestration + text assembly, no physics)
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import {
  graphContextLensEngine,
  type EgoGraph,
  type EgoNode,
  type LensOpts,
} from "./GraphContextLensEngine.js";

// ---- public types ------------------------------------------------------------
export type DualMode = "json-only" | "viz-only" | "both";
export type VizChannelKind = "png" | "md-fallback" | "empty" | "none";

/** Result contract of a viz renderer (matches scripts/render-viz-screenshot.mjs stdout). */
export interface VizRenderResult {
  ok: boolean;
  mode?: string; // "png" | "empty" | "none"
  path?: string;
  bytes?: number;
  reason?: string;
  warnings?: string[];
}

/** Injectable PNG renderer (default spawns the .mjs CLI; tests inject a fake). */
export type DualChannelRenderer = (args: {
  ego: EgoGraph;
  layer?: string;
  outPath: string;
  maxBytes: number;
}) => VizRenderResult;

export interface DualChannelOpts {
  /** json-only / viz-only / both (variability axis). Default "both". */
  mode?: DualMode;
  /** Ego-graph hops around the node. Default 1. */
  hops?: number;
  /** Node cap for the ego slice. Default = GAC01 default (200). */
  maxNodes?: number;
  /** Viz layer filter (e.g. "L4"). Filters the VISUAL channel only; JSON stays full. */
  layer?: string;
  /** PNG byte ceiling before downscale-then-fallback. Default 10MB. */
  maxPngBytes?: number;
  /** How a successful PNG is attached: "path" (default) or "data-uri" (base64, for subagents that reject file refs). */
  embed?: "path" | "data-uri";
  /** Directory PNGs are written to. Default = a fresh temp dir. */
  outDir?: string;
  /** Injectable renderer (hermetic tests). Default = spawn render-viz-screenshot.mjs. */
  renderer?: DualChannelRenderer;
  /** Override adjacency sidecar path (passthrough to GAC01). */
  adjacencyPath?: string;
  /** Enrich ego nodes via seekCard (passthrough to GAC01). Default true. */
  enrich?: boolean;
}

export interface JsonChannel {
  nodeId: string;
  nodeIds: string[];
  nodeCount: number;
  edgeCount: number;
  rendered: string; // pretty JSON of the ego-graph
}

export interface VizChannel {
  kind: VizChannelKind;
  layer: string | null;
  pngPath?: string;
  bytes?: number;
  dataUri?: string;
  mermaid?: string;
  markdown?: string;
  reason?: string;
  warnings: string[];
}

export interface DualChannelBundle {
  prompt: string;
  mode: DualMode;
  nodeId: string;
  json: JsonChannel | null;
  viz: VizChannel | null;
  warnings: string[];
}

// ---- constants ---------------------------------------------------------------
const DEFAULT_HOPS = 1;
const DEFAULT_MAX_PNG_BYTES = 10 * 1024 * 1024; // 10MB
/** Stable reused PNG output dir (under os.tmpdir) when the caller supplies none --
 * avoids a per-call mkdtemp leak; files overwrite by node-id name (bounded). */
const AUTO_PNG_DIR = "prism-gac04-png";
const MAX_CENTER_SLUG = 80;
const MAX_LAYER_SLUG = 20;
const RENDER_TIMEOUT_MS = 40_000;
const RENDER_MAX_BUFFER = 8 * 1024 * 1024;
const SCRIPT_REL = path.join("scripts", "render-viz-screenshot.mjs");
/** Channel sentinel -- also the recursion guard token (one viz channel per prompt). */
const SENTINEL_OPEN = "<<PRISM-DUAL-CHANNEL";
const SENTINEL_CLOSE = "<<END-PRISM-DUAL-CHANNEL>>";

// ---- script-path resolution (launch-cwd-independent, like GAC03) -------------
function resolveScriptPath(): string {
  const fromEnv = process.env.PRISM_VIZ_SHOT_SCRIPT;
  if (fromEnv && fs.existsSync(fromEnv)) return fromEnv;
  // walk up from cwd to the nearest ancestor that contains scripts/render-viz-screenshot.mjs
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const cand = path.join(dir, SCRIPT_REL);
    if (fs.existsSync(cand)) return cand;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // last resort: relative to this engine file (../../.. = repo root from mcp-server/src/engines)
  return path.resolve(process.cwd(), SCRIPT_REL);
}

// ---- default renderer: spawn the .mjs CLI ------------------------------------
// execFileSync (execFile family -- argv array, NO shell) so neither the node
// path nor the script args are shell-interpolated (no command injection).
function defaultRenderer(args: {
  ego: EgoGraph;
  layer?: string;
  outPath: string;
  maxBytes: number;
}): VizRenderResult {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "gac04-ego-"));
  const egoPath = path.join(work, "ego.json");
  try {
    fs.writeFileSync(egoPath, JSON.stringify(args.ego), "utf8");
    const script = resolveScriptPath();
    const cli = [script, `--ego=${egoPath}`, `--out=${args.outPath}`, `--max-bytes=${args.maxBytes}`];
    if (args.layer) cli.push(`--layer=${args.layer}`);
    let stdout = "";
    try {
      stdout = execFileSync(process.execPath, cli, {
        encoding: "utf8",
        timeout: RENDER_TIMEOUT_MS,
        maxBuffer: RENDER_MAX_BUFFER,
      });
    } catch (e: any) {
      // CLI exits 1 on a render miss but still prints the JSON status line.
      stdout = (e?.stdout ? String(e.stdout) : "") || "";
    }
    const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop() || "{}";
    try {
      return JSON.parse(line) as VizRenderResult;
    } catch {
      return { ok: false, reason: "renderer-parse-failed" };
    }
  } finally {
    try {
      fs.rmSync(work, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

// ---- helpers -----------------------------------------------------------------
function assertNodeId(method: string, nodeId: unknown): asserts nodeId is string {
  if (typeof nodeId !== "string" || nodeId.trim() === "") {
    throw new Error(`DualChannelContextEngine.${method}: nodeId must be a non-empty string`);
  }
}

/** Build a layer-filtered shallow copy of an ego graph (center always kept). */
function filterEgoByLayer(ego: EgoGraph, layer?: string): EgoGraph {
  if (!layer) return ego;
  const nodes = ego.nodes.filter((n) => n.id === ego.center || n.layer === layer);
  const idset = new Set(nodes.map((n) => n.id));
  const edges = ego.edges.filter((e) => idset.has(e.from) && idset.has(e.to));
  return { ...ego, nodes, edgeCount: edges.length, nodeCount: nodes.length, edges };
}

function nodeLine(n: EgoNode): string {
  const meta = [n.layer, n.kind, n.status].filter(Boolean).join("/");
  return `- node-id: \`${n.id}\`${meta ? ` [${meta}]` : ""}${n.label ? ` ${n.label}` : ""}`;
}

// ---- engine ------------------------------------------------------------------
export class DualChannelContextEngine {
  /**
   * JSON channel: append a structured ego-graph (addressed by explicit
   * `node-id:` markers + raw JSON) to a subagent prompt.
   */
  async attachJsonContext(
    subagentPrompt: string,
    nodeId: string,
    opts: DualChannelOpts = {},
  ): Promise<{ prompt: string; json: JsonChannel; warnings: string[] }> {
    assertNodeId("attachJsonContext", nodeId);
    const ego = await this.extractEgo(nodeId, opts);
    const json = this.buildJsonChannel(ego);
    const block = this.renderJsonBlock(json, ego);
    return {
      prompt: `${subagentPrompt}\n\n${SENTINEL_OPEN} nodeId=${nodeId} mode=json-only>>\n${block}\n${SENTINEL_CLOSE}`,
      json,
      warnings: ego.warnings,
    };
  }

  /**
   * Viz channel: append a visual layer (PNG when a free Chrome renders it, else
   * a mermaid+markdown diagram) of the node's ego-graph, filtered to `layerFilter`.
   * The anchor node comes from `opts.nodeId` (the spec signature passes the
   * layer filter positionally; the node id is required to know WHAT to render).
   */
  async attachVizScreenshot(
    subagentPrompt: string,
    layerFilter: string | undefined,
    opts: DualChannelOpts & { nodeId: string },
  ): Promise<{ prompt: string; viz: VizChannel; warnings: string[] }> {
    assertNodeId("attachVizScreenshot", opts.nodeId);
    // recursion guard: never embed a viz channel into a prompt that already
    // carries ANY dual-channel block (the "screenshot-of-screenshot recursion"
    // adversarial case). Guarding on the sentinel itself -- not only viz-flavored
    // modes -- also blocks appending a viz channel onto a prior json-only block.
    if (subagentPrompt.includes(SENTINEL_OPEN)) {
      const viz: VizChannel = {
        kind: "none",
        layer: layerFilter ?? null,
        reason: "recursion-guard: prompt already contains a dual-channel block",
        warnings: ["recursion-guard fired -- viz channel not re-embedded"],
      };
      return { prompt: subagentPrompt, viz, warnings: viz.warnings };
    }
    const ego = await this.extractEgo(opts.nodeId, opts);
    const viz = this.buildVizChannel(ego, layerFilter, opts);
    const block = this.renderVizBlock(viz);
    return {
      prompt: `${subagentPrompt}\n\n${SENTINEL_OPEN} nodeId=${opts.nodeId} mode=viz-only>>\n${block}\n${SENTINEL_CLOSE}`,
      viz,
      warnings: viz.warnings,
    };
  }

  /**
   * Combined dual-channel bundle (the primary entry point). Modes:
   *   "json-only" / "viz-only" / "both" (default).
   */
  async buildDualChannel(
    subagentPrompt: string,
    nodeId: string,
    opts: DualChannelOpts = {},
  ): Promise<DualChannelBundle> {
    assertNodeId("buildDualChannel", nodeId);
    const mode: DualMode = opts.mode ?? "both";
    const ego = await this.extractEgo(nodeId, opts);
    const warnings = [...ego.warnings];

    let json: JsonChannel | null = null;
    let viz: VizChannel | null = null;
    const sections: string[] = [];

    if (mode === "json-only" || mode === "both") {
      json = this.buildJsonChannel(ego);
      sections.push(this.renderJsonBlock(json, ego));
    }
    if (mode === "viz-only" || mode === "both") {
      viz = this.buildVizChannel(ego, opts.layer, opts);
      warnings.push(...viz.warnings);
      sections.push(this.renderVizBlock(viz));
    }

    const prompt = `${subagentPrompt}\n\n${SENTINEL_OPEN} nodeId=${nodeId} mode=${mode}>>\n${sections.join("\n\n")}\n${SENTINEL_CLOSE}`;
    return { prompt, mode, nodeId, json, viz, warnings };
  }

  // ---- internals -------------------------------------------------------------
  private async extractEgo(nodeId: string, opts: DualChannelOpts): Promise<EgoGraph> {
    const lensOpts: LensOpts = {
      maxNodes: opts.maxNodes,
      enrich: opts.enrich,
      adjacencyPath: opts.adjacencyPath,
    };
    return graphContextLensEngine.extractEgoGraph(nodeId, opts.hops ?? DEFAULT_HOPS, lensOpts);
  }

  private buildJsonChannel(ego: EgoGraph): JsonChannel {
    return {
      nodeId: ego.center,
      nodeIds: ego.nodes.map((n) => n.id),
      nodeCount: ego.nodeCount,
      edgeCount: ego.edgeCount,
      rendered: graphContextLensEngine.render(ego, "json"),
    };
  }

  private renderJsonBlock(json: JsonChannel, ego: EgoGraph): string {
    const lines: string[] = [];
    lines.push(`## Channel 1 -- JSON graph context (structured)`);
    lines.push(
      `Ego-graph around node-id: \`${json.nodeId}\` (${json.nodeCount} nodes, ${json.edgeCount} edges, ${ego.effectiveHops}-hop)`,
    );
    lines.push(`Reference any of these by their node-id::`);
    for (const n of ego.nodes) lines.push(nodeLine(n));
    lines.push("", "Raw JSON:", "```json", json.rendered, "```");
    return lines.join("\n");
  }

  private buildVizChannel(ego: EgoGraph, layer: string | undefined, opts: DualChannelOpts): VizChannel {
    const warnings: string[] = [];
    const filtered = filterEgoByLayer(ego, layer);
    const emptyForLayer = !!layer && filtered.nodes.every((n) => n.id === ego.center && n.layer !== layer);

    // Always compute the mermaid+markdown fallback (the guaranteed visual layer).
    const mermaid = graphContextLensEngine.render(filtered, "mermaid");
    const markdown = graphContextLensEngine.render(filtered, "markdown");

    if (emptyForLayer || filtered.nodes.length === 0) {
      warnings.push(`viz: no nodes in layer ${layer} for ${ego.center}`);
      return { kind: "empty", layer: layer ?? null, mermaid, markdown, warnings };
    }

    // Attempt the PNG (best-effort, capability-probed).
    const renderer = opts.renderer ?? defaultRenderer;
    const maxBytes = opts.maxPngBytes ?? DEFAULT_MAX_PNG_BYTES;
    // Stable reused output dir when the caller supplies none (no per-call mkdtemp leak).
    const autoDir = !opts.outDir;
    const outDir = opts.outDir ?? path.join(os.tmpdir(), AUTO_PNG_DIR);
    if (autoDir) {
      try { fs.mkdirSync(outDir, { recursive: true }); } catch { /* ignore */ }
    }
    // Sanitize BOTH the node id and the layer before they become a filename path
    // segment (a caller-controlled layer like "../../x" would otherwise escape outDir).
    const safe = ego.center.replace(/[^A-Za-z0-9_.-]/g, "_").slice(0, MAX_CENTER_SLUG);
    const safeLayer = layer ? layer.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, MAX_LAYER_SLUG) : "";
    const outPath = path.join(outDir, `${safe}${safeLayer ? `.${safeLayer}` : ""}.png`);

    let result: VizRenderResult;
    try {
      result = renderer({ ego: filtered, layer, outPath, maxBytes });
    } catch (e: any) {
      result = { ok: false, reason: `renderer-threw: ${e?.message ?? e}` };
    }
    if (result.warnings) warnings.push(...result.warnings);

    if (result.ok && result.path && result.mode !== "none") {
      const viz: VizChannel = {
        kind: "png",
        layer: layer ?? null,
        pngPath: result.path,
        bytes: result.bytes,
        mermaid,
        markdown,
        warnings,
      };
      // "subagent rejects binary -> flatten to base64 data URI" -- but only when the
      // PNG is within the byte ceiling (a ~13MB base64 inlined into a subagent prompt
      // would blow the prompt budget); otherwise keep the path as the reference.
      if (opts.embed === "data-uri") {
        try {
          const buf = fs.readFileSync(result.path);
          if (buf.length > maxBytes) {
            warnings.push(`data-uri skipped: PNG ${buf.length}B exceeds maxPngBytes ${maxBytes}B; keeping path`);
          } else {
            viz.dataUri = `data:image/png;base64,${buf.toString("base64")}`;
            // bytes are now inlined; drop the on-disk file when we own the dir
            if (autoDir) {
              try { fs.rmSync(result.path, { force: true }); } catch { /* ignore */ }
              viz.pngPath = undefined;
            }
          }
        } catch (e: any) {
          warnings.push(`data-uri encode failed: ${e?.message ?? e}; falling back to path`);
        }
      }
      return viz;
    }

    // PNG unavailable -> mermaid+markdown is the visual layer (spec MD fallback).
    warnings.push(`viz PNG unavailable (${result.reason ?? "unknown"}); using mermaid+markdown visual layer`);
    return { kind: "md-fallback", layer: layer ?? null, mermaid, markdown, reason: result.reason, warnings };
  }

  private renderVizBlock(viz: VizChannel): string {
    const lines: string[] = [];
    lines.push(`## Channel 2 -- visual layer (${viz.kind})`);
    if (viz.layer) lines.push(`Layer filter: ${viz.layer}`);
    if (viz.kind === "png") {
      if (viz.dataUri) {
        lines.push(`Visual layer (PNG, base64 data URI -- ${viz.bytes ?? 0} bytes):`);
        lines.push(viz.dataUri);
      } else {
        lines.push(`Visual layer (PNG, ${viz.bytes ?? 0} bytes) attached at: ${viz.pngPath}`);
      }
      lines.push("", "Same neighbourhood as a mermaid diagram (for text-only consumers):");
      lines.push("```mermaid", viz.mermaid ?? "", "```");
    } else if (viz.kind === "empty") {
      lines.push(`Visual layer: no nodes match this layer filter.`);
      lines.push("```mermaid", viz.mermaid ?? "", "```");
    } else if (viz.kind === "none") {
      lines.push(`Visual layer suppressed: ${viz.reason ?? "unavailable"}`);
    } else {
      // md-fallback
      lines.push(`Visual layer (mermaid diagram -- PNG unavailable: ${viz.reason ?? "n/a"}):`);
      lines.push("```mermaid", viz.mermaid ?? "", "```");
    }
    return lines.join("\n");
  }
}

export { DualChannelContextEngine as _DualChannelContextEngine };
export const dualChannelContextEngine = new DualChannelContextEngine();
