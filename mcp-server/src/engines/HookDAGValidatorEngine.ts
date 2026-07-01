/**
 * HookDAGValidatorEngine — HOOK-MANIFEST-DAG-MS26 / P0-U02
 *
 * Consumes a {@link ../schemas/hookManifestSchema.HookManifest} (output of
 * {@link HookManifestEngine.HookManifestEngine}, P0-U01) and emits a
 * {@link ../schemas/hookDAGSchema.HookDAGValidation}: per event, the implicit hook
 * execution DAG, every cycle, and a deterministic linear order (when no cycle).
 *
 * Why a static DAG check at all: the Claude Code harness has no documented total order
 * over hooks contributed by *different* settings files (user-global vs project vs
 * `.local`), and the per-file `order` is implicit (settings-array position). With ≥3
 * settings.json files contributing wirings across ≥10 events, drift creeps in fast
 * (e.g. a stale wiring with `continueOnError:false` left in `~/.claude/settings.json`
 * while the project pinned it `true`). This engine surfaces that drift before it
 * silently changes runtime behavior, and it gives the deterministic execution order
 * the harness *would* pick (lex on source, then `order` within source, then file path
 * on ties) so hook-ordering bugs become reproducible.
 *
 * Duplication check (manual — DuplicationGuardEngine's dynamic import chokes on
 * Windows `h:` paths from .mjs callers): closest existing assets are
 *   - `RoadmapDAGEngine` — Kahn's-algorithm DAG over roadmap units. Different domain
 *     (units, not hook files), different input (atomic-roadmap.json, not manifest).
 *     Kahn pattern is reused here verbatim.
 *   - `HookEngine` (orchestration) — tracks *registered* MCP-server hooks at runtime;
 *     no view of `.claude/hooks/*.mjs` or settings.json wirings.
 *   - `HookManifestEngine` — produces the catalog this engine consumes. No DAG logic.
 * No existing `HookDAG*` engine. Proceed.
 *
 * Algorithm (per event):
 *   1. Group wirings by `source` (settings file). Within a source, sort by `order` →
 *      chain of `(file_i, file_{i+1})` edges with reason `same-source-order`.
 *   2. Across sources, sort source paths lex. For each consecutive pair `(srcA, srcB)`,
 *      add `(lastFile(srcA), firstFile(srcB))` with reason `cross-source`. This gives a
 *      total order on wirings *under the lex-source assumption*, which mirrors how
 *      filesystem-ordered config systems typically work and is the only reproducible
 *      choice in the absence of an explicit precedence rule.
 *   3. Dedupe edges by `(from, to, reason, source)`.
 *   4. Run Kahn's algorithm (in-degree queue, tie-broken by file-path lex). Result is
 *      either a full topological order (no cycle) or a partial peel-off (cycle present).
 *   5. When a cycle is present, find each strongly-connected component with ≥2 nodes
 *      via Tarjan's algorithm and emit one cycle per SCC (a simple traversal across
 *      the SCC reconstructs the loop).
 *   6. Conflicts (NOT cycle-affecting): per-file mixed-block-mode and duplicate-wiring
 *      flags from the manifest's `wirings[]` array.
 *
 * Determinism: every loop iterates over sorted arrays (events, sources, files). No `Set`
 * iteration is observed except after spreading into a sorted array. A fixed input
 * produces a byte-identical output (modulo the `generatedAt` timestamp).
 *
 * Complexity: O(Σ_e N_e + Σ_e E_e + Σ_e N_e log N_e) — linear in nodes + edges, with one
 * sort per event. For PRISM's current scale (~480 hooks × ~10 events ≤ 5k node-events,
 * edges sparse), full validation runs in <50 ms.
 *
 * @module engines/HookDAGValidatorEngine
 */

import * as nodeFs from "node:fs";
import * as nodePath from "node:path";
import { BaseEngine, type EngineCapability } from "./BaseEngine.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import { HookManifestSchema, type HookManifest, type HookEntry, type HookWiring, KNOWN_HOOK_EVENTS } from "../schemas/hookManifestSchema.js";
import {
  HOOK_DAG_SCHEMA_VERSION,
  HookDAGValidationSchema,
  type HookDAGValidation,
  type HookDAGEvent,
  type HookDAGEdge,
  type HookDAGCycle,
  type HookDAGConflict,
  type HookDAGSummary,
} from "../schemas/hookDAGSchema.js";

// ── Injectable FS surface (same shape as HookManifestEngine — minimal vs. full `node:fs`) ─

export type DAGFS = Pick<typeof nodeFs, "existsSync" | "readFileSync">;

// ── Options ────────────────────────────────────────────────────────────────────

export interface HookDAGValidatorOptions {
  /** Pre-built manifest. If omitted, `manifestPath` is read; if that's omitted too, `validate()` throws. */
  manifest?: HookManifest;
  /** Path to a JSON-serialized HookManifest. Read+Zod-validated when `manifest` is omitted. */
  manifestPath?: string;
  /** Restrict validation to this subset of event names. Default: every event in the manifest. */
  events?: string[];
  /** Injectable filesystem (tests + manifestPath reads). Defaults to `node:fs`. */
  fsImpl?: DAGFS;
}

// ── Path helpers ───────────────────────────────────────────────────────────────

function fwd(p: string): string {
  return p.replace(/\\/g, "/");
}
function isAbsLike(p: string): boolean {
  return nodePath.isAbsolute(p) || /^[A-Za-z]:[\\/]/.test(p);
}

// ── Engine ─────────────────────────────────────────────────────────────────────

export class HookDAGValidatorEngine extends BaseEngine {
  constructor() {
    super({
      name: "HookDAGValidatorEngine",
      version: "1.0.0",
      domain: "infrastructure/hooks",
      description:
        "Cycle detection + deterministic linear order over the implicit per-event hook DAG derived from HookManifest wirings. Surfaces ordering drift across user/project/.local settings.json files.",
    });
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "validate", description: "Validate a HookManifest. Returns per-event DAG (nodes, edges, order|null, cycles, conflicts) + summary." },
      { name: "validateAndWrite", description: "validate(), then atomically write to mcp-server/data/state/hook-dag-validation.json. Returns { validation, path }." },
      { name: "loadValidation", description: "Read + Zod-validate a previously written validation JSON." },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null) return "options object is required (pass at least `manifest` or `manifestPath`)";
    if (typeof input !== "object") return "expected an options object";
    const o = input as HookDAGValidatorOptions;
    if (o.manifest == null && (typeof o.manifestPath !== "string" || !o.manifestPath)) {
      return "either `manifest` or a non-empty `manifestPath` must be provided";
    }
    if (o.events != null && !Array.isArray(o.events)) return "events must be an array of strings";
    return null;
  }

  /** BaseEngine compliance — overrides the protected stub. */
  protected async executeImpl(input: unknown): Promise<HookDAGValidation> {
    return this.validateManifest((input as HookDAGValidatorOptions) ?? {});
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /** Validate a manifest (or one read from disk). Pure compute aside from the optional disk read. */
  validateManifest(opts: HookDAGValidatorOptions): HookDAGValidation {
    const fs: DAGFS = opts.fsImpl ?? nodeFs;

    // 1) Resolve the manifest.
    let manifest: HookManifest;
    if (opts.manifest) {
      // Self-check: caller-supplied manifest must match the schema; we trust nothing.
      manifest = HookManifestSchema.parse(opts.manifest);
    } else if (opts.manifestPath) {
      const p = fwd(isAbsLike(opts.manifestPath) ? nodePath.normalize(opts.manifestPath) : nodePath.resolve(opts.manifestPath));
      if (!fs.existsSync(p)) {
        throw new Error(`HookDAGValidatorEngine.validate: manifestPath does not exist: ${p}`);
      }
      let raw: unknown;
      try {
        raw = JSON.parse(fs.readFileSync(p, "utf-8") as string);
      } catch (err) {
        throw new Error(`HookDAGValidatorEngine.validate: manifestPath is not valid JSON (${p}): ${(err as Error).message}`);
      }
      manifest = HookManifestSchema.parse(raw);
    } else {
      throw new Error("HookDAGValidatorEngine.validate: pass `manifest` or `manifestPath`");
    }

    // 2) Compute per-file conflicts ONCE (they're not event-scoped). Each event then
    //    filters this list by node membership.
    const allConflicts = collectConflicts(manifest.hooks);

    // 3) Decide which events to validate. Default: every event with ≥1 wiring + every
    //    event referenced in `manifest.events` (some entries can be empty).
    const eventsRequested = opts.events && opts.events.length > 0 ? [...opts.events] : null;
    const eventsAll = new Set<string>();
    for (const h of manifest.hooks) for (const e of h.events) eventsAll.add(e);
    for (const k of Object.keys(manifest.events)) eventsAll.add(k);
    const eventsToCheck = eventsRequested
      ? eventsRequested.filter((e) => eventsAll.has(e))
      : sortEvents([...eventsAll]);

    // 4) Validate each event.
    const events: HookDAGEvent[] = [];
    for (const event of eventsToCheck) {
      events.push(validateEvent(event, manifest.hooks, allConflicts));
    }
    // events array is already sorted by `eventsToCheck` (which used sortEvents)

    // 5) Aggregate.
    let totalNodes = 0;
    let totalEdges = 0;
    let cycleCount = 0;
    let conflictCount = 0;
    let cleanEvents = 0;
    let dirtyEvents = 0;
    for (const e of events) {
      totalNodes += e.nodes.length;
      totalEdges += e.edges.length;
      cycleCount += e.cycles.length;
      conflictCount += e.conflicts.length;
      if (e.cycles.length === 0) cleanEvents++;
      else dirtyEvents++;
    }
    const summary: HookDAGSummary = {
      totalEvents: events.length,
      totalNodes,
      totalEdges,
      cycleCount,
      conflictCount,
      cleanEvents,
      dirtyEvents,
    };

    const validation: HookDAGValidation = {
      schemaVersion: HOOK_DAG_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      manifestGeneratedAt: manifest.generatedAt,
      manifestRepoRoot: manifest.repoRoot,
      ok: cycleCount === 0,
      events,
      summary,
    };
    return HookDAGValidationSchema.parse(validation); // self-check
  }

  /** Default output path for the committed validation. */
  defaultValidationPath(repoRoot: string): string {
    return fwd(nodePath.join(repoRoot, "mcp-server", "data", "state", "hook-dag-validation.json"));
  }

  /** validate() then atomically write the validation JSON. */
  async validateAndWrite(
    opts: HookDAGValidatorOptions & { outPath?: string },
  ): Promise<{ validation: HookDAGValidation; path: string }> {
    const validation = this.validateManifest(opts);
    const outPath = opts.outPath
      ? fwd(isAbsLike(opts.outPath) ? nodePath.normalize(opts.outPath) : nodePath.resolve(opts.outPath))
      : this.defaultValidationPath(validation.manifestRepoRoot);
    await atomicWrite(outPath, JSON.stringify(validation, null, 2) + "\n");
    return { validation, path: outPath };
  }

  /** Read + Zod-validate a previously written validation. */
  loadValidation(path: string, fs: DAGFS = nodeFs): HookDAGValidation {
    const p = fwd(path);
    return HookDAGValidationSchema.parse(JSON.parse(fs.readFileSync(p, "utf-8") as string));
  }
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Order events: known canonical events first (in `KNOWN_HOOK_EVENTS` order), then unknown alpha. */
function sortEvents(events: string[]): string[] {
  const known: ReadonlySet<string> = new Set(KNOWN_HOOK_EVENTS as readonly string[]);
  const inKnownOrder = KNOWN_HOOK_EVENTS.filter((e) => events.includes(e));
  const unknown = events.filter((e) => !known.has(e)).sort();
  return [...inKnownOrder, ...unknown];
}

/**
 * Scan every hook file's wiring list (across all events) for non-cycle integrity flags.
 * Returns one conflict per (file, kind) pairing; sources are aggregated.
 */
function collectConflicts(hooks: HookEntry[]): HookDAGConflict[] {
  const out: HookDAGConflict[] = [];
  for (const h of hooks) {
    if (h.wirings.length === 0) continue;

    // mixed-block-mode: at least one wiring has continueOnError===false, AND at least
    // one wiring has continueOnError===true or undefined.
    const hardSrc = new Set<string>();
    const softSrc = new Set<string>();
    for (const w of h.wirings) {
      if (w.continueOnError === false) hardSrc.add(w.source);
      else softSrc.add(w.source);
    }
    if (hardSrc.size > 0 && softSrc.size > 0) {
      out.push({
        file: h.file,
        kind: "mixed-block-mode",
        sources: [...new Set([...hardSrc, ...softSrc])].sort(),
        detail:
          `hook is wired hard-block (continueOnError:false) in [${[...hardSrc].sort().join(", ")}] ` +
          `but soft (continueOnError:true|undefined) in [${[...softSrc].sort().join(", ")}]`,
      });
    }

    // duplicate-wiring: identical (event, matcher, source) appearing ≥2× — the manifest's
    // own dedupe keys on more fields, so a survivor here means some other field differed
    // (timeout, args, continueOnError) → ambiguous, worth surfacing.
    const triple = new Map<string, HookWiring[]>();
    for (const w of h.wirings) {
      const k = `${w.event}::${w.matcher}::${w.source}`;
      const lst = triple.get(k);
      if (lst) lst.push(w);
      else triple.set(k, [w]);
    }
    for (const [, group] of triple) {
      if (group.length < 2) continue;
      const sources = [...new Set(group.map((g) => g.source))].sort();
      out.push({
        file: h.file,
        kind: "duplicate-wiring",
        sources,
        detail:
          `${group.length} wirings share (event=${group[0].event}, matcher=${JSON.stringify(group[0].matcher)}) ` +
          `under source ${group[0].source} but differ in timeout/args/continueOnError — ambiguous wiring`,
      });
    }
  }
  // Sort for deterministic output: file, kind, then joined sources.
  out.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.kind.localeCompare(b.kind) ||
      a.sources.join("|").localeCompare(b.sources.join("|")),
  );
  return out;
}

/** Build the per-event DAG, run topo + cycle detection, and assemble a HookDAGEvent. */
function validateEvent(event: string, hooks: HookEntry[], allConflicts: HookDAGConflict[]): HookDAGEvent {
  // 1) Collect every wiring for this event, keyed by (file, source).
  const wired: Array<{ file: string; source: string; order: number }> = [];
  const nodeSet = new Set<string>();
  for (const h of hooks) {
    for (const w of h.wirings) {
      if (w.event !== event) continue;
      wired.push({ file: h.file, source: w.source, order: w.order });
      nodeSet.add(h.file);
    }
  }
  const nodes = [...nodeSet].sort((a, b) => a.localeCompare(b));

  // 2) Edges from same-source-order. Within each source, sort by (order, file).
  const sources = [...new Set(wired.map((w) => w.source))].sort();
  const edgeKey = new Set<string>();
  const edges: HookDAGEdge[] = [];
  const addEdge = (e: HookDAGEdge): void => {
    if (e.from === e.to) return; // a self-loop would represent the same file wired twice in one source — not a useful edge
    const k = `${e.from}\x1f${e.to}\x1f${e.reason}\x1f${e.source ?? ""}`;
    if (edgeKey.has(k)) return;
    edgeKey.add(k);
    edges.push(e);
  };

  const perSourceFirstLast = new Map<string, { first: string; last: string }>();
  for (const src of sources) {
    const inSrc = wired
      .filter((w) => w.source === src)
      .sort((a, b) => a.order - b.order || a.file.localeCompare(b.file));
    if (inSrc.length === 0) continue;
    perSourceFirstLast.set(src, { first: inSrc[0].file, last: inSrc[inSrc.length - 1].file });
    for (let i = 0; i < inSrc.length - 1; i++) {
      addEdge({ from: inSrc[i].file, to: inSrc[i + 1].file, reason: "same-source-order", source: src });
    }
  }

  // 3) Cross-source edges: lex-order on source paths gives a deterministic
  //    inter-source precedence (the harness loads user → project → .local in source
  //    order; lex on absolute path is a stable proxy).
  for (let i = 0; i < sources.length - 1; i++) {
    const a = perSourceFirstLast.get(sources[i]);
    const b = perSourceFirstLast.get(sources[i + 1]);
    if (!a || !b) continue;
    addEdge({ from: a.last, to: b.first, reason: "cross-source" });
  }

  // 4) Sort edges for deterministic output.
  edges.sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.reason.localeCompare(b.reason) ||
      (a.source ?? "").localeCompare(b.source ?? ""),
  );

  // 5) Kahn's algorithm — topo sort, tie-break by file lex.
  const order = kahnTopoSort(nodes, edges);

  // 6) Cycle detection (only when topo failed).
  const cycles: HookDAGCycle[] = order === null ? findCycles(nodes, edges) : [];

  // 7) Filter the global conflict list to this event's node set.
  const eventConflicts = allConflicts.filter((c) => nodeSet.has(c.file));

  return { event, nodes, edges, order, cycles, conflicts: eventConflicts };
}

/**
 * Kahn's algorithm — deterministic topological sort. Returns the full order, or `null`
 * if a cycle blocks completion. Ties (multiple zero-indegree nodes) broken by file lex.
 */
function kahnTopoSort(nodes: string[], edges: HookDAGEdge[]): string[] | null {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n, 0);
    adj.set(n, []);
  }
  for (const e of edges) {
    if (!indeg.has(e.from) || !indeg.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  // Stable priority queue via a sorted "ready" array, popped left.
  const ready: string[] = nodes.filter((n) => (indeg.get(n) ?? 0) === 0).sort();
  const out: string[] = [];
  while (ready.length > 0) {
    const n = ready.shift()!;
    out.push(n);
    const next = (adj.get(n) ?? []).slice().sort();
    for (const m of next) {
      const d = (indeg.get(m) ?? 0) - 1;
      indeg.set(m, d);
      if (d === 0) {
        // Insertion-sorted insert keeps `ready` lex-sorted across iterations.
        let i = 0;
        while (i < ready.length && ready[i] < m) i++;
        ready.splice(i, 0, m);
      }
    }
  }
  return out.length === nodes.length ? out : null;
}

/**
 * Find every strongly-connected component with ≥2 nodes (Tarjan's algorithm), then for
 * each SCC reconstruct a representative cycle via BFS-find-cycle inside the SCC. The
 * representative cycle is the shortest loop starting at the lex-min SCC member.
 */
function findCycles(nodes: string[], edges: HookDAGEdge[]): HookDAGCycle[] {
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n, []);
  for (const e of edges) {
    if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from)!.push(e.to);
  }

  // Tarjan: iterative to avoid blowing the stack on a chain SCC.
  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  let counter = 0;
  const sccs: string[][] = [];

  for (const root of [...nodes].sort()) {
    if (index.has(root)) continue;
    type Frame = { node: string; itIdx: number; neighbors: string[] };
    const work: Frame[] = [];
    index.set(root, counter);
    lowlink.set(root, counter);
    counter++;
    stack.push(root);
    onStack.add(root);
    work.push({ node: root, itIdx: 0, neighbors: (adj.get(root) ?? []).slice().sort() });

    while (work.length > 0) {
      const f = work[work.length - 1];
      if (f.itIdx < f.neighbors.length) {
        const w = f.neighbors[f.itIdx++];
        if (!index.has(w)) {
          index.set(w, counter);
          lowlink.set(w, counter);
          counter++;
          stack.push(w);
          onStack.add(w);
          work.push({ node: w, itIdx: 0, neighbors: (adj.get(w) ?? []).slice().sort() });
        } else if (onStack.has(w)) {
          lowlink.set(f.node, Math.min(lowlink.get(f.node)!, index.get(w)!));
        }
      } else {
        // Done with f.node — fold its lowlink into its parent's, then pop.
        if (lowlink.get(f.node) === index.get(f.node)) {
          const scc: string[] = [];
          let w: string;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            scc.push(w);
          } while (w !== f.node);
          if (scc.length >= 2) sccs.push(scc);
        }
        const popped = work.pop()!;
        if (work.length > 0) {
          const parent = work[work.length - 1];
          parent && lowlink.set(parent.node, Math.min(lowlink.get(parent.node)!, lowlink.get(popped.node)!));
        }
      }
    }
  }

  // Convert each ≥2-node SCC to a concrete cycle: shortest loop starting at lex-min member.
  const cycles: HookDAGCycle[] = [];
  for (const scc of sccs) {
    const setSCC = new Set(scc);
    const start = [...scc].sort()[0];
    // BFS for the shortest cycle from `start` back to `start`, staying inside the SCC.
    const parent = new Map<string, { from: string; edge: HookDAGEdge }>();
    const visited = new Set<string>();
    const queue: string[] = [start];
    let closingFrom: string | null = null;
    visited.add(start);
    bfs: while (queue.length > 0) {
      const cur = queue.shift()!;
      const outs = (adj.get(cur) ?? []).filter((n) => setSCC.has(n)).sort();
      for (const nxt of outs) {
        // First touch of `start` from within the SCC closes the loop. Skip the
        // start in `visited` so it can be re-reached via a non-trivial path.
        const edge = findEdge(edges, cur, nxt);
        if (!edge) continue;
        if (nxt === start) {
          parent.set(nxt + "__close__", { from: cur, edge });
          closingFrom = cur;
          break bfs;
        }
        if (visited.has(nxt)) continue;
        visited.add(nxt);
        parent.set(nxt, { from: cur, edge });
        queue.push(nxt);
      }
    }

    if (closingFrom == null) continue; // degenerate (shouldn't happen for SCC ≥ 2)

    // Reconstruct path: start → … → closingFrom → start.
    const pathNodes: string[] = [];
    const pathEdges: HookDAGEdge[] = [];
    let curN = closingFrom;
    const seenSafety = new Set<string>();
    while (curN !== start && !seenSafety.has(curN)) {
      seenSafety.add(curN);
      pathNodes.unshift(curN);
      const back = parent.get(curN);
      if (!back) break;
      pathEdges.unshift(back.edge);
      curN = back.from;
    }
    const closing = parent.get(start + "__close__");
    const cycleFiles = [start, ...pathNodes, start];
    const cycleEdges = closing ? [...pathEdges, closing.edge] : pathEdges;

    if (cycleFiles.length >= 3 && cycleEdges.length === cycleFiles.length - 1) {
      cycles.push({ files: cycleFiles, edges: cycleEdges });
    }
  }

  // Sort cycles by their lex-min start node for stable output.
  cycles.sort((a, b) => a.files[0].localeCompare(b.files[0]));
  return cycles;
}

/** Find the first edge `from → to` in `edges`. Lex-stable because edges are pre-sorted. */
function findEdge(edges: HookDAGEdge[], from: string, to: string): HookDAGEdge | null {
  for (const e of edges) if (e.from === from && e.to === to) return e;
  return null;
}

/** Singleton for dispatcher use. */
export const hookDAGValidatorEngine = new HookDAGValidatorEngine();
