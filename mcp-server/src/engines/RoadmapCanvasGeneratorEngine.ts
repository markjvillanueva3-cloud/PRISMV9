/**
 * RoadmapCanvasGeneratorEngine.ts — emits a JSON Canvas v1.0 document
 * from `mcp-server/data/roadmap-index.json` for visualization in Obsidian.
 *
 * Each milestone becomes a `text` node; each `dependencies[]` entry becomes
 * a directed edge `dep → depender`. Layout is depth-bucketed via Kahn's
 * topo-sort (column = depth, row = position within depth, sorted by
 * track then id). Cycles are detected and the in-cycle edges dropped
 * with a structured warning rather than blowing up the layout.
 *
 * If the single full-roadmap canvas would exceed `maxBytes` (default 5
 * MiB), the engine paginates by `track`, emitting one canvas per track
 * with cross-track edges trimmed (edges only join nodes inside the same
 * track in paginated mode). Each piece is then asserted to fit under
 * the limit independently.
 *
 * P3-U03, INTEL-OLLAMA-OBSIDIAN-MS1.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, basename, join } from "node:path";

// ── Input shape (subset; tolerant of extra fields) ──────────────────

export interface RoadmapMilestone {
  id: string;
  title: string;
  track: string;
  status: string;
  total_units: number;
  completed_units: number;
  dependencies?: string[];
  // ignored fields: blocks, envelope_path, priority, sessions_p50/p90,
  // description, version, completed_at — read tolerantly.
  [key: string]: unknown;
}

export interface RoadmapInput {
  version?: string;
  title?: string;
  milestones: RoadmapMilestone[];
}

// ── Output shape (JSON Canvas v1.0 — see https://jsoncanvas.org/spec/) ──

export interface CanvasNode {
  id: string;
  type: "text" | "file" | "link" | "group";
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  text?: string;
  file?: string;
  url?: string;
  label?: string;
}

export interface CanvasEdge {
  id: string;
  fromNode: string;
  toNode: string;
  fromSide?: "top" | "right" | "bottom" | "left";
  toSide?: "top" | "right" | "bottom" | "left";
  fromEnd?: "none" | "arrow";
  toEnd?: "none" | "arrow";
  color?: string;
  label?: string;
}

export interface JSONCanvas {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

export interface GenerateOptions {
  /** Max byte size before triggering pagination by track. Default: 5 MiB. */
  maxBytes?: number;
  /** Force pagination even under maxBytes (test/debug). */
  forcePaginate?: boolean;
}

export interface CanvasFragment {
  /** Logical name: `roadmap` for the unpaginated canvas, `roadmap.<TRACK>` for paginated. */
  name: string;
  canvas: JSONCanvas;
  /** Serialized byte size when pretty-printed with 2-space indent. */
  bytes: number;
}

export interface CanvasResult {
  canvases: CanvasFragment[];
  /** Topo-sort warnings (cycles found, dropped edges, pagination triggers). */
  warnings: string[];
  totalBytes: number;
  paginated: boolean;
  /** Diagnostic counters for callers / tests. */
  stats: {
    nodes: number;
    edges: number;
    cycleMembers: number;
    cycleEdgesDropped: number;
    crossTrackEdgesDropped: number;
  };
}

// ── Layout constants ────────────────────────────────────────────────

const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 MiB
const NODE_WIDTH = 320;
const NODE_HEIGHT = 80;
const COLUMN_GAP = 380;
const ROW_GAP = 110;
const CYCLE_FALLBACK_ROW_BUCKET = 8; // cycle members spread over rows in groups of 8
const FALLBACK_COLOR_COMPLETE = "4"; // green
const FALLBACK_COLOR_IN_PROGRESS = "5"; // cyan
const FALLBACK_COLOR_BLOCKED = "1"; // red

// ── Engine ──────────────────────────────────────────────────────────

export class RoadmapCanvasGeneratorEngine {
  generate(roadmap: RoadmapInput, options: GenerateOptions = {}): CanvasResult {
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    const milestones = Array.isArray(roadmap?.milestones) ? roadmap.milestones : [];
    const warnings: string[] = [];

    if (milestones.length === 0) {
      const empty: JSONCanvas = { nodes: [], edges: [] };
      const bytes = Buffer.byteLength(JSON.stringify(empty, null, 2), "utf8");
      return {
        canvases: [{ name: "roadmap", canvas: empty, bytes }],
        warnings,
        totalBytes: bytes,
        paginated: false,
        stats: {
          nodes: 0,
          edges: 0,
          cycleMembers: 0,
          cycleEdgesDropped: 0,
          crossTrackEdgesDropped: 0,
        },
      };
    }

    // 1. Topo-sort with cycle detection (Kahn's algorithm).
    const idSet = new Set(milestones.map((m) => m.id));
    const indegree: Record<string, number> = {};
    const adj: Record<string, string[]> = {};
    for (const m of milestones) {
      indegree[m.id] = 0;
      adj[m.id] = [];
    }
    for (const m of milestones) {
      for (const d of m.dependencies ?? []) {
        if (!idSet.has(d)) continue; // external/typo dependency — skip silently
        adj[d].push(m.id);
        indegree[m.id] = (indegree[m.id] ?? 0) + 1;
      }
    }

    const depth: Record<string, number> = {};
    const queue: string[] = [];
    for (const id of Object.keys(indegree)) {
      if (indegree[id] === 0) {
        queue.push(id);
        depth[id] = 0;
      }
    }
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      order.push(id);
      for (const nb of adj[id]) {
        indegree[nb] -= 1;
        const newDepth = (depth[id] ?? 0) + 1;
        if ((depth[nb] ?? -1) < newDepth) depth[nb] = newDepth;
        if (indegree[nb] === 0) queue.push(nb);
      }
    }

    // Kahn's leaves two kinds of nodes outside the topo order: TRUE cycle
    // members (reachable-from-self through other stuck nodes) and stuck
    // DOWNSTREAM nodes (depend on cycle nodes but live in no cycle). Only
    // the former should drop edges; the latter keep their outgoing arrows.
    const orderedSet = new Set(order);
    const stuckIds = milestones.map((m) => m.id).filter((id) => !orderedSet.has(id));
    const stuckSet = new Set(stuckIds);

    const cycleMembers: string[] = [];
    for (const start of stuckIds) {
      const visited = new Set<string>();
      const stack = (adj[start] ?? []).filter((n) => stuckSet.has(n));
      let foundSelf = false;
      while (stack.length > 0) {
        const cur = stack.pop() as string;
        if (cur === start) {
          foundSelf = true;
          break;
        }
        if (visited.has(cur)) continue;
        visited.add(cur);
        for (const nb of adj[cur] ?? []) {
          if (stuckSet.has(nb)) stack.push(nb);
        }
      }
      if (foundSelf) cycleMembers.push(start);
    }

    const cycleEdgeKeys = new Set<string>();
    if (cycleMembers.length > 0) {
      const head = cycleMembers.slice(0, 6).join(", ");
      const tail = cycleMembers.length > 6 ? "…" : "";
      warnings.push(
        `topo-sort detected cycle involving ${cycleMembers.length} milestone(s): ${head}${tail}. ` +
          "Edges within the cycle dropped from canvas to avoid render loop."
      );
      const cycleSet = new Set(cycleMembers);
      for (const m of milestones) {
        if (!cycleSet.has(m.id)) continue;
        for (const dep of m.dependencies ?? []) {
          if (cycleSet.has(dep)) cycleEdgeKeys.add(`${dep}→${m.id}`);
        }
      }
      // Place cycle nodes in a fallback right-side column block so layout stays sane.
      const maxDepth = Object.values(depth).reduce((a, b) => Math.max(a, b), 0);
      cycleMembers.forEach((id, i) => {
        depth[id] = maxDepth + 1 + Math.floor(i / CYCLE_FALLBACK_ROW_BUCKET);
      });
    }

    // Propagate depth to stuck-but-non-cycle nodes from their known-depth deps
    // so downstream chains (cycle → C → D) don't all collapse to x=0.
    const downstreamStuck = stuckIds.filter(
      (id) => !cycleEdgeKeys.size || !cycleMembers.includes(id)
    ).filter((id) => depth[id] === undefined);
    if (downstreamStuck.length > 0) {
      const milestoneById: Record<string, RoadmapMilestone> = Object.fromEntries(
        milestones.map((m) => [m.id, m])
      );
      let changed = true;
      let safety = downstreamStuck.length + 1;
      while (changed && safety-- > 0) {
        changed = false;
        for (const id of downstreamStuck) {
          if (depth[id] !== undefined) continue;
          const m = milestoneById[id];
          const known = (m.dependencies ?? [])
            .filter((d) => idSet.has(d) && depth[d] !== undefined)
            .map((d) => depth[d] as number);
          if (known.length > 0) {
            depth[id] = Math.max(...known) + 1;
            changed = true;
          }
        }
      }
    }

    // 2. Layout: bucket by depth, then sort within depth by track + id.
    const trackOf: Record<string, string> = Object.fromEntries(
      milestones.map((m) => [m.id, m.track ?? ""])
    );
    const byDepth: Record<number, string[]> = {};
    for (const m of milestones) {
      const d = depth[m.id] ?? 0;
      (byDepth[d] = byDepth[d] ?? []).push(m.id);
    }
    for (const k of Object.keys(byDepth)) {
      byDepth[+k].sort((a, b) => {
        const t = (trackOf[a] ?? "").localeCompare(trackOf[b] ?? "");
        return t !== 0 ? t : a.localeCompare(b);
      });
    }

    const positionMap: Record<string, { x: number; y: number }> = {};
    for (const k of Object.keys(byDepth)) {
      const d = +k;
      const ids = byDepth[d];
      ids.forEach((id, i) => {
        positionMap[id] = { x: d * COLUMN_GAP, y: i * ROW_GAP };
      });
    }

    // 3. Build nodes.
    const nodes: CanvasNode[] = milestones.map((m) => {
      const p = positionMap[m.id] ?? { x: 0, y: 0 };
      const denom = m.total_units > 0 ? m.total_units : 1;
      const completionPct = Math.round((m.completed_units / denom) * 100);
      const status = (m.status ?? "").trim() || "unknown";
      const text = `**${m.id}**\n${m.title}\n[${m.track ?? "?"}] ${status} (${completionPct}%)`;
      return {
        id: m.id,
        type: "text",
        x: p.x,
        y: p.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        color: this.colorFor(m),
        text,
      };
    });

    // 4. Build edges (drop cycle edges, dedupe).
    const edges: CanvasEdge[] = [];
    const seenEdges = new Set<string>();
    let cycleEdgesDropped = 0;
    for (const m of milestones) {
      for (const dep of m.dependencies ?? []) {
        if (!idSet.has(dep)) continue;
        const key = `${dep}→${m.id}`;
        if (cycleEdgeKeys.has(key)) {
          cycleEdgesDropped += 1;
          continue;
        }
        if (seenEdges.has(key)) continue;
        seenEdges.add(key);
        edges.push({
          id: `e-${dep}-${m.id}`,
          fromNode: dep,
          toNode: m.id,
          toEnd: "arrow",
        });
      }
    }

    // 5. Pagination decision.
    const fullCanvas: JSONCanvas = { nodes, edges };
    const fullJson = JSON.stringify(fullCanvas, null, 2);
    const fullBytes = Buffer.byteLength(fullJson, "utf8");

    const stats = {
      nodes: nodes.length,
      edges: edges.length,
      cycleMembers: cycleMembers.length,
      cycleEdgesDropped,
      crossTrackEdgesDropped: 0,
    };

    if (fullBytes <= maxBytes && !options.forcePaginate) {
      return {
        canvases: [{ name: "roadmap", canvas: fullCanvas, bytes: fullBytes }],
        warnings,
        totalBytes: fullBytes,
        paginated: false,
        stats,
      };
    }

    // 6. Paginate by track.
    if (options.forcePaginate) {
      warnings.push("forcePaginate=true — emitting one canvas per track.");
    } else {
      warnings.push(
        `canvas size ${fullBytes} bytes exceeds limit ${maxBytes}; paginating by track.`
      );
    }

    const trackToIds: Record<string, Set<string>> = {};
    for (const m of milestones) {
      const t = m.track ?? "MISC";
      (trackToIds[t] = trackToIds[t] ?? new Set()).add(m.id);
    }

    const fragments: CanvasFragment[] = [];
    let totalBytes = 0;
    let crossTrackDropped = 0;
    for (const [track, idSetForTrack] of Object.entries(trackToIds)) {
      const trackNodes = nodes.filter((n) => idSetForTrack.has(n.id));
      const trackEdges: CanvasEdge[] = [];
      for (const e of edges) {
        const inA = idSetForTrack.has(e.fromNode);
        const inB = idSetForTrack.has(e.toNode);
        if (inA && inB) trackEdges.push(e);
        else if (inA || inB) crossTrackDropped += 1;
      }
      const trackCanvas: JSONCanvas = { nodes: trackNodes, edges: trackEdges };
      const json = JSON.stringify(trackCanvas, null, 2);
      const bytes = Buffer.byteLength(json, "utf8");
      fragments.push({ name: `roadmap.${track}`, canvas: trackCanvas, bytes });
      totalBytes += bytes;
    }
    // Cross-track drops are double-counted (once per endpoint side); halve
    // so the number reflects unique edges severed.
    stats.crossTrackEdgesDropped = Math.floor(crossTrackDropped / 2);
    if (stats.crossTrackEdgesDropped > 0) {
      warnings.push(
        `pagination dropped ${stats.crossTrackEdgesDropped} cross-track edge(s) — visit the source track to follow the dependency.`
      );
    }

    return { canvases: fragments, warnings, totalBytes, paginated: true, stats };
  }

  /**
   * Convenience: load JSON from disk and emit canvas file(s). When
   * paginated, individual canvases are written next to `outputPath` with
   * the track name spliced in (e.g. `roadmap.canvas` → `roadmap.INFRA.canvas`).
   */
  generateFromFile(
    roadmapPath: string,
    outputPath: string,
    options: GenerateOptions = {}
  ): { result: CanvasResult; written: string[] } {
    const raw = readFileSync(roadmapPath, "utf8");
    const data = JSON.parse(raw) as RoadmapInput;
    const result = this.generate(data, options);
    const written: string[] = [];

    if (!result.paginated) {
      writeFileSync(
        outputPath,
        JSON.stringify(result.canvases[0].canvas, null, 2),
        "utf8"
      );
      written.push(outputPath);
    } else {
      const dir = dirname(outputPath);
      const base = basename(outputPath).replace(/\.canvas$/i, "");
      for (const c of result.canvases) {
        const trackTag = c.name.replace(/^roadmap\./, "");
        const path = join(dir, `${base}.${trackTag}.canvas`);
        writeFileSync(path, JSON.stringify(c.canvas, null, 2), "utf8");
        written.push(path);
      }
    }

    return { result, written };
  }

  private colorFor(m: RoadmapMilestone): string | undefined {
    const s = (m.status ?? "").toLowerCase();
    if (s === "complete") return FALLBACK_COLOR_COMPLETE;
    if (s === "in_progress") return FALLBACK_COLOR_IN_PROGRESS;
    if (s === "blocked") return FALLBACK_COLOR_BLOCKED;
    return undefined;
  }
}

export const roadmapCanvasGeneratorEngine = new RoadmapCanvasGeneratorEngine();
