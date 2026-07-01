/**
 * CodeGraphProjectionEngine.ts -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC03
 * =================================================================
 * Projects TypeScript source into a code graph for ego-graph retrieval by coding
 * agents (RepoGraph, ICLR 2025: ego-graph retrieval boosts SWE-bench resolve rate
 * +32.8%). Nodes = files + top-level symbols + import targets; edges = `declares`
 * (file -> symbol) and `imports` (file -> file/external).
 *
 * DESIGN: per-file `ts.createSourceFile` (SYNTACTIC parse only -- no project-wide
 * type-check / no ts-morph Project graph), so it CANNOT OOM on the full mcp-server
 * tree (the spec's stated ts-morph failure mode). One file at a time; oversize files
 * skipped; dep cycles recorded + continued (never thrown). Composes the U-GAC01
 * ego-graph pattern via egoGraph() over the projected (in-memory) graph.
 *
 * Wired: prism_dev:code_graph_project (devDispatcher).
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

export interface CodeNode {
  id: string; // file:<rel> | sym:<rel>#<symbol> | ext:<spec>
  file: string; // posix rel path (empty for external)
  kind: string; // file | function | class | interface | type | enum | const | external
  symbol: string;
}
export interface CodeEdge {
  from: string;
  to: string;
  kind: "declares" | "imports";
}
export interface CodeGraph {
  target: string;
  nodes: CodeNode[];
  edges: CodeEdge[];
  filesParsed: number;
  filesSkipped: number;
  relativeImportsFound: number; // count of relative-import specifiers seen
  depsResolved: boolean; // every relative import resolved (vacuously true when none were found -- check relativeImportsFound to disambiguate)
  warnings: string[];
}
export interface EgoCodeGraph {
  center: string;
  hops: number;
  nodes: CodeNode[];
  edges: CodeEdge[];
  truncated: boolean;
  warnings: string[];
}

export interface ProjectOpts {
  target?: string; // file or dir (rel to repo root, or absolute). Default mcp-server/src
  maxFiles?: number; // walk cap (default 2000)
  maxFileBytes?: number; // per-file size skip cap (default 5MB)
  repoRoot?: string; // override repo-root resolution (tests)
}

const EXTS = [".ts", ".tsx"];
const SKIP_DIRS = new Set(["node_modules", "dist", ".git", "coverage", ".cache"]);
const MAX_FILE_BYTES = 5 * 1024 * 1024; // skip pathological files (adversarial 50MB)
const DEFAULT_MAX_FILES = 2000;
const DEFAULT_EGO_MAXNODES = 200;
const MAX_HOPS = 12;

function resolveRepoRoot(override?: string): string {
  if (override) return override;
  // Climb to the nearest ancestor (incl cwd) that IS or CONTAINS mcp-server/ -- robust
  // to the dispatcher's MCP-server cwd, the CLI's repo-root cwd, and any sub-dir cwd.
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (path.basename(dir).toLowerCase() === "mcp-server") return path.dirname(dir);
    try {
      if (fs.existsSync(path.join(dir, "mcp-server"))) return dir;
    } catch {
      /* ignore */
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

class CodeGraphProjectionEngine {
  /** Project a target file/dir to a code graph. Per-file syntactic parse. */
  project(opts: ProjectOpts = {}): CodeGraph {
    const warnings: string[] = [];
    const repoRoot = resolveRepoRoot(opts.repoRoot);
    const target = opts.target || "mcp-server/src";
    const maxFiles =
      Number.isFinite(opts.maxFiles) && (opts.maxFiles as number) > 0 ? Math.floor(opts.maxFiles as number) : DEFAULT_MAX_FILES;
    const maxFileBytes =
      Number.isFinite(opts.maxFileBytes) && (opts.maxFileBytes as number) > 0 ? (opts.maxFileBytes as number) : MAX_FILE_BYTES;
    const targetAbs = path.isAbsolute(target) ? target : path.join(repoRoot, target);

    const files = this.resolveFiles(targetAbs, maxFiles, warnings);
    const nodes = new Map<string, CodeNode>();
    const edges: CodeEdge[] = [];
    const edgeSeen = new Set<string>();
    const addNode = (n: CodeNode) => {
      if (!nodes.has(n.id)) nodes.set(n.id, n);
    };
    const addEdge = (from: string, to: string, kind: CodeEdge["kind"]) => {
      const key = `${from}->${to}:${kind}`;
      if (!edgeSeen.has(key)) {
        edgeSeen.add(key);
        edges.push({ from, to, kind });
      }
    };

    let filesParsed = 0;
    let filesSkipped = 0;
    let unresolvedRelative = 0;
    let relativeImportsFound = 0;

    for (const abs of files) {
      const rel = this.relId(repoRoot, abs);
      let stat: fs.Stats;
      try {
        stat = fs.statSync(abs);
      } catch {
        filesSkipped++;
        warnings.push(`missing: ${rel}`);
        continue;
      }
      if (stat.size > maxFileBytes) {
        filesSkipped++;
        warnings.push(`skipped oversize (${stat.size} > ${maxFileBytes} bytes): ${rel}`);
        continue;
      }
      let text: string;
      try {
        text = fs.readFileSync(abs, "utf8");
      } catch {
        filesSkipped++;
        warnings.push(`unreadable: ${rel}`);
        continue;
      }
      const fileNodeId = `file:${rel}`;
      addNode({ id: fileNodeId, file: rel, kind: "file", symbol: path.basename(rel) });

      // ts.createSourceFile is lenient -- a syntactically invalid file yields a partial
      // AST rather than throwing, so we still extract what parsed (no silent total loss).
      let src: ts.SourceFile;
      try {
        src = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      } catch (e) {
        filesSkipped++;
        warnings.push(`parse error ${rel}: ${(e as Error).message}`);
        continue;
      }

      for (const stmt of src.statements) {
        for (const d of this.declInfo(stmt)) {
          const symId = `sym:${rel}#${d.symbol}`;
          addNode({ id: symId, file: rel, kind: d.kind, symbol: d.symbol });
          addEdge(fileNodeId, symId, "declares");
        }
        if (ts.isImportDeclaration(stmt) && stmt.moduleSpecifier && ts.isStringLiteral(stmt.moduleSpecifier)) {
          const spec = stmt.moduleSpecifier.text;
          if (spec.startsWith(".")) {
            relativeImportsFound++;
            const resolved = this.resolveImportToRel(repoRoot, rel, spec);
            if (resolved) {
              const tid = `file:${resolved}`;
              addNode({ id: tid, file: resolved, kind: "file", symbol: path.basename(resolved) });
              addEdge(fileNodeId, tid, "imports");
            } else {
              unresolvedRelative++;
              warnings.push(`unresolved relative import '${spec}' in ${rel}`);
            }
          } else {
            const tid = `ext:${spec}`;
            addNode({ id: tid, file: "", kind: "external", symbol: spec });
            addEdge(fileNodeId, tid, "imports");
          }
        }
      }
      filesParsed++;
    }

    return {
      target,
      nodes: [...nodes.values()],
      edges,
      filesParsed,
      filesSkipped,
      relativeImportsFound,
      depsResolved: unresolvedRelative === 0,
      warnings,
    };
  }

  /** Ego-graph over a projected code graph (RepoGraph retrieval): BFS over edges in
   * BOTH directions up to `hops`, cycle-safe, node-capped. Pure (no IO). */
  egoGraph(graph: CodeGraph, centerId: string, hops = 1, maxNodes = DEFAULT_EGO_MAXNODES): EgoCodeGraph {
    const warnings: string[] = [];
    if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new Error("CodeGraphProjectionEngine.egoGraph: graph must have nodes[] + edges[]");
    }
    let effectiveHops = Number.isFinite(hops) ? Math.floor(hops) : 1;
    if (effectiveHops < 0) effectiveHops = 0;
    if (effectiveHops > MAX_HOPS) effectiveHops = MAX_HOPS;
    const cap = Number.isFinite(maxNodes) && maxNodes > 0 ? Math.floor(maxNodes) : DEFAULT_EGO_MAXNODES;

    const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
    const adj = new Map<string, string[]>();
    for (const e of graph.edges) {
      (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
      (adj.get(e.to) ?? adj.set(e.to, []).get(e.to)!).push(e.from);
    }

    const visited = new Set<string>([centerId]);
    if (!nodeById.has(centerId)) warnings.push(`center '${centerId}' not in graph`);
    let frontier = [centerId];
    let truncated = false;
    for (let h = 0; h < effectiveHops && !truncated; h++) {
      const next: string[] = [];
      for (const id of frontier) {
        for (const nb of adj.get(id) ?? []) {
          if (visited.has(nb)) continue;
          if (visited.size >= cap) {
            truncated = true;
            break;
          }
          visited.add(nb);
          next.push(nb);
        }
        if (truncated) break;
      }
      frontier = next;
      if (frontier.length === 0) break;
    }
    if (truncated) warnings.push(`node cap ${cap} reached; reachable subset`);

    const nodes = [...visited].map((id) => nodeById.get(id)).filter((n): n is CodeNode => Boolean(n));
    const edges = graph.edges.filter((e) => visited.has(e.from) && visited.has(e.to));
    return { center: centerId, hops: effectiveHops, nodes, edges, truncated, warnings };
  }

  /** Top-level declaration(s) of a statement -> {kind, symbol}. */
  private declInfo(stmt: ts.Statement): { kind: string; symbol: string }[] {
    if (ts.isFunctionDeclaration(stmt) && stmt.name) return [{ kind: "function", symbol: stmt.name.text }];
    if (ts.isClassDeclaration(stmt) && stmt.name) return [{ kind: "class", symbol: stmt.name.text }];
    if (ts.isInterfaceDeclaration(stmt)) return [{ kind: "interface", symbol: stmt.name.text }];
    if (ts.isTypeAliasDeclaration(stmt)) return [{ kind: "type", symbol: stmt.name.text }];
    if (ts.isEnumDeclaration(stmt)) return [{ kind: "enum", symbol: stmt.name.text }];
    if (ts.isVariableStatement(stmt)) {
      const out: { kind: string; symbol: string }[] = [];
      for (const d of stmt.declarationList.declarations) {
        if (ts.isIdentifier(d.name)) out.push({ kind: "const", symbol: d.name.text });
      }
      return out;
    }
    return [];
  }

  /** Resolve a relative import specifier to a posix rel path (or null if no file). */
  private resolveImportToRel(repoRoot: string, fromRel: string, spec: string): string | null {
    const baseDir = path.posix.dirname(fromRel.split(path.sep).join("/"));
    const raw = path.posix.normalize(path.posix.join(baseDir, spec));
    const candidates: string[] = [];
    if (/\.[cm]?tsx?$/.test(raw)) {
      candidates.push(raw); // already a TS path -- use exactly
    } else if (/\.[cm]?js$/.test(raw)) {
      candidates.push(raw.replace(/\.[cm]?js$/, ".ts"), raw.replace(/\.[cm]?js$/, ".tsx"), raw);
    } else {
      candidates.push(`${raw}.ts`, `${raw}.tsx`, `${raw}/index.ts`, `${raw}/index.tsx`);
    }
    for (const c of candidates) {
      try {
        if (fs.existsSync(path.join(repoRoot, c.split("/").join(path.sep)))) return c;
      } catch {
        /* keep trying */
      }
    }
    return null;
  }

  /** Resolve target to a file list (single file or recursive dir walk, capped). */
  private resolveFiles(targetAbs: string, maxFiles: number, warnings: string[]): string[] {
    let stat: fs.Stats;
    try {
      stat = fs.statSync(targetAbs);
    } catch {
      warnings.push(`target not found: ${targetAbs}`);
      return [];
    }
    if (stat.isFile()) return EXTS.includes(path.extname(targetAbs)) ? [targetAbs] : [];
    const out: string[] = [];
    const walk = (dir: string) => {
      if (out.length >= maxFiles) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const e of entries) {
        if (out.length >= maxFiles) return;
        if (e.isSymbolicLink()) continue; // don't follow symlinks (cycle / escape guard)
        if (e.isDirectory()) {
          if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name));
        } else if (e.isFile() && EXTS.includes(path.extname(e.name)) && !e.name.endsWith(".d.ts")) {
          out.push(path.join(dir, e.name));
        }
      }
    };
    walk(targetAbs);
    if (out.length >= maxFiles) warnings.push(`file cap ${maxFiles} reached; projection is a subset`);
    return out;
  }

  private relId(repoRoot: string, abs: string): string {
    return path.relative(repoRoot, abs).split(path.sep).join("/");
  }
}

export { CodeGraphProjectionEngine };
export const codeGraphProjectionEngine = new CodeGraphProjectionEngine();
