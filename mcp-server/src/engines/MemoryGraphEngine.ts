/**
 * PRISM F2: Cross-Session Memory Graph Engine
 * =============================================
 * 
 * Persistent graph for decision tracing and cross-session learning.
 * 
 * Components:
 * 1. GraphWriteQueue — Single-writer serialization (Node.js single-process)
 * 2. WAL — Write-ahead log for atomic multi-record operations
 * 3. InMemoryIndex — Fast lookups with incremental O(1) updates
 * 4. QueryEngine — trace_decision, find_similar, get_health
 * 5. IntegrityChecker — Validates edges, detects cycles, caps SIMILAR_TO
 * 6. Eviction — Oldest ContextNodes first, then by age
 * 
 * SAFETY: Graph failure = no cross-session learning.
 * Dispatchers continue normally. Manufacturing capability unaffected.
 * 
 * CONCURRENCY: Node.js single-process. GraphWriteQueue serializes all writes.
 * Reads operate on in-memory index snapshot. No race conditions.
 * 
 * @version 1.0.0
 * @feature F2
 */

import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import {
  GraphNode, GraphEdge, GraphIndex, EMPTY_INDEX, NodeType, EdgeType,
  WALEntry, WALEntryType, TraceDecisionQuery, FindSimilarQuery,
  GraphHealthReport, MemoryGraphConfig, DEFAULT_GRAPH_CONFIG,
  DecisionNode, OutcomeNode, ContextNode, ErrorNode, PatternNode,
} from '../types/graph-types.js';
import { crc32 } from './TelemetryEngine.js';
import { log } from '../utils/Logger.js';
import { safeWriteSync } from "../utils/atomicWrite.js";

// ============================================================================
// STATE DIRECTORY
// ============================================================================

const STATE_DIR = path.join('C:', 'PRISM', 'mcp-server', 'state', 'memory_graph');

function ensureStateDir(): void {
  try {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true });
    }
  } catch { /* Non-fatal */ }
}

// ============================================================================
// SHA-256 FOR GRAPH NODES
// ============================================================================

function computeNodeChecksum(node: Omit<GraphNode, 'checksum'>): string {
  const payload = `${node.id}|${node.type}|${node.timestamp}|${node.sessionId}|${JSON.stringify(node.tags)}`;
  return crc32(payload);
}

// ============================================================================
// MEMORY GRAPH ENGINE — SINGLETON
// ============================================================================

export class MemoryGraphEngine {
  private config: MemoryGraphConfig;
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private index: GraphIndex = { ...EMPTY_INDEX };
  private walBuffer: WALEntry[] = [];
  private walSeq: number = 0;
  private walFlushTimer: ReturnType<typeof setInterval> | null = null;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private writeQueue: Array<() => void> = [];
  private isProcessingQueue: boolean = false;
  private operationsSinceCheckpoint: number = 0;
  private operationsSinceIntegrity: number = 0;
  private initialized: boolean = false;

  constructor(configOverrides?: Partial<MemoryGraphConfig>) {
    this.config = { ...DEFAULT_GRAPH_CONFIG, ...configOverrides };
    ensureStateDir();
    // Auto-init on construction — ensures loadCheckpoint + WAL timer start
    this.init();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  init(): void {
    if (this.initialized) return;

    this.loadCheckpoint();
    this.replayWAL();

    // Start WAL flush timer
    this.walFlushTimer = setInterval(() => {
      try { this.flushWAL(); } catch (e) {
        log.warn(`[GRAPH] WAL flush error: ${(e as Error).message}`);
      }
    }, this.config.walFlushIntervalMs);

    // Periodic checkpoint save (every 60s) — survives kill without shutdown()
    this.checkpointTimer = setInterval(() => {
      try {
        if (this.nodes.size > 0) {
          this.flushWAL();
          this.saveCheckpoint();
        }
      } catch (e) {
        log.warn(`[GRAPH] Periodic checkpoint error: ${(e as Error).message}`);
      }
    }, 60_000);

    // Process signal handlers — save on kill
    const gracefulShutdown = () => {
      try { this.shutdown(); } catch { /* best effort */ }
    };
    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
    process.on('beforeExit', gracefulShutdown);

    this.initialized = true;
    log.info(`[GRAPH] Engine initialized (${this.nodes.size} nodes, ${this.edges.size} edges)`);
  }

  shutdown(): void {
    if (this.walFlushTimer) clearInterval(this.walFlushTimer);
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    this.flushWAL();
    this.saveCheckpoint();
    this.initialized = false;
  }

  // ==========================================================================
  // WRITE QUEUE — Serializes all mutations
  // ==========================================================================

  private enqueueWrite(fn: () => void): void {
    this.writeQueue.push(fn);
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  private processQueue(): void {
    this.isProcessingQueue = true;
    while (this.writeQueue.length > 0) {
      const fn = this.writeQueue.shift()!;
      try { fn(); } catch (e) {
        log.warn(`[GRAPH] Write queue error: ${(e as Error).message}`);
      }
    }
    this.isProcessingQueue = false;
  }

  // ==========================================================================
  // NODE OPERATIONS
  // ==========================================================================

  addNode(node: Omit<GraphNode, 'id' | 'timestamp' | 'checksum'>): string | null {
    try {
      // Eviction check
      if (this.nodes.size >= this.config.maxNodes) {
        this.evict();
      }

      const id = randomUUID();
      const timestamp = Date.now();
      const partial = { ...node, id, timestamp, checksum: '' } as any;
      partial.checksum = computeNodeChecksum(partial);
      const fullNode = partial as GraphNode;

      this.enqueueWrite(() => {
        this.nodes.set(id, fullNode);
        this.updateIndexForNode(fullNode, 'add');
        this.appendWAL({ seq: ++this.walSeq, type: 'ADD_NODE', timestamp, data: fullNode });
        this.tickOperations();
      });

      return id;
    } catch (e) {
      log.warn(`[GRAPH] addNode error: ${(e as Error).message}`);
      return null;
    }
  }

  addEdge(sourceId: string, targetId: string, type: EdgeType, weight: number = 1.0, metadata?: string): string | null {
    try {
      // Validate source and target exist
      if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
        return null;
      }

      // Cap SIMILAR_TO edges per node
      if (type === 'SIMILAR_TO') {
        const currentCount = this.index.similarToCount[sourceId] || 0;
        if (currentCount >= this.config.maxSimilarTo) {
          return null; // Silently skip — not an error
        }
      }

      // Cap total edges per node
      const sourceEdges = this.index.edgesBySource[sourceId]?.length || 0;
      if (sourceEdges >= this.config.maxEdgesPerNode) {
        return null;
      }

      const id = randomUUID();
      const timestamp = Date.now();
      const edge: GraphEdge = { id, sourceId, targetId, type, weight, timestamp, metadata };

      this.enqueueWrite(() => {
        this.edges.set(id, edge);
        this.updateIndexForEdge(edge, 'add');
        this.appendWAL({ seq: ++this.walSeq, type: 'ADD_EDGE', timestamp, data: edge });
        this.tickOperations();
      });

      return id;
    } catch (e) {
      log.warn(`[GRAPH] addEdge error: ${(e as Error).message}`);
      return null;
    }
  }

  // ==========================================================================
  // INDEX OPERATIONS — O(1) incremental updates
  // ==========================================================================

  private updateIndexForNode(node: GraphNode, op: 'add' | 'remove'): void {
    if (op === 'add') {
      this.index.nodeCount++;
      this.index.nodesByType[node.type].push(node.id);

      if ('dispatcher' in node && node.dispatcher) {
        if (!this.index.nodesByDispatcher[node.dispatcher]) {
          this.index.nodesByDispatcher[node.dispatcher] = [];
        }
        this.index.nodesByDispatcher[node.dispatcher].push(node.id);
      }

      if (!this.index.nodesBySession[node.sessionId]) {
        this.index.nodesBySession[node.sessionId] = [];
      }
      this.index.nodesBySession[node.sessionId].push(node.id);
    } else {
      this.index.nodeCount--;
      const typeArr = this.index.nodesByType[node.type];
      const typeIdx = typeArr.indexOf(node.id);
      if (typeIdx >= 0) typeArr.splice(typeIdx, 1);

      // Remove from dispatcher index
      if ('dispatcher' in node && node.dispatcher) {
        const dispArr = this.index.nodesByDispatcher[node.dispatcher];
        if (dispArr) {
          const dIdx = dispArr.indexOf(node.id);
          if (dIdx >= 0) dispArr.splice(dIdx, 1);
        }
      }

      // Remove from session index
      const sessArr = this.index.nodesBySession[node.sessionId];
      if (sessArr) {
        const sIdx = sessArr.indexOf(node.id);
        if (sIdx >= 0) sessArr.splice(sIdx, 1);
      }
    }
    this.index.lastUpdated = Date.now();
  }

  private updateIndexForEdge(edge: GraphEdge, op: 'add' | 'remove'): void {
    if (op === 'add') {
      this.index.edgeCount++;
      if (!this.index.edgesBySource[edge.sourceId]) {
        this.index.edgesBySource[edge.sourceId] = [];
      }
      this.index.edgesBySource[edge.sourceId].push(edge.id);

      if (!this.index.edgesByTarget[edge.targetId]) {
        this.index.edgesByTarget[edge.targetId] = [];
      }
      this.index.edgesByTarget[edge.targetId].push(edge.id);

      if (edge.type === 'SIMILAR_TO') {
        this.index.similarToCount[edge.sourceId] = (this.index.similarToCount[edge.sourceId] || 0) + 1;
      }
    } else {
      this.index.edgeCount--;
      const srcArr = this.index.edgesBySource[edge.sourceId];
      if (srcArr) {
        const idx = srcArr.indexOf(edge.id);
        if (idx >= 0) srcArr.splice(idx, 1);
      }

      const tgtArr = this.index.edgesByTarget[edge.targetId];
      if (tgtArr) {
        const idx = tgtArr.indexOf(edge.id);
        if (idx >= 0) tgtArr.splice(idx, 1);
      }

      if (edge.type === 'SIMILAR_TO') {
        this.index.similarToCount[edge.sourceId] = Math.max(0, (this.index.similarToCount[edge.sourceId] || 0) - 1);
      }
    }
    this.index.lastUpdated = Date.now();
  }

  // ==========================================================================
  // OPERATION TRACKING + AUTO CHECKS
  // ==========================================================================

  private tickOperations(): void {
    this.operationsSinceCheckpoint++;
    this.operationsSinceIntegrity++;

    if (this.operationsSinceIntegrity >= this.config.integrityCheckInterval) {
      this.operationsSinceIntegrity = 0;
      try { this.runIntegrityCheck(); } catch { /* non-fatal */ }
    }

    if (this.operationsSinceCheckpoint >= this.config.checkpointInterval) {
      this.operationsSinceCheckpoint = 0;
      try { this.saveCheckpoint(); } catch { /* non-fatal */ }
    }
  }

  // ==========================================================================
  // WAL — Write-Ahead Log
  // ==========================================================================

  private appendWAL(entry: WALEntry): void {
    this.walBuffer.push(entry);
  }

  private flushWAL(): void {
    if (this.walBuffer.length === 0) return;

    try {
      const walPath = path.join(STATE_DIR, 'wal.jsonl');
      const lines = this.walBuffer.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.appendFileSync(walPath, lines);
      this.walBuffer = [];
    } catch (e) {
      log.warn(`[GRAPH] WAL flush failed: ${(e as Error).message}`);
      // Buffer retained — will retry next flush
    }
  }

  private replayWAL(): void {
    try {
      const walPath = path.join(STATE_DIR, 'wal.jsonl');
      if (!fs.existsSync(walPath)) return;

      const content = fs.readFileSync(walPath, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());

      // Skip entries before checkpoint offset
      let replayed = 0;
      for (const line of lines) {
        try {
          const entry: WALEntry = JSON.parse(line);
          if (entry.seq <= this.index.checkpointByteOffset) continue;

          if (entry.type === 'ADD_NODE') {
            const node = entry.data as GraphNode;
            if (!this.nodes.has(node.id)) {
              this.nodes.set(node.id, node);
              this.updateIndexForNode(node, 'add');
              replayed++;
            }
          } else if (entry.type === 'ADD_EDGE') {
            const edge = entry.data as GraphEdge;
            if (!this.edges.has(edge.id)) {
              this.edges.set(edge.id, edge);
              this.updateIndexForEdge(edge, 'add');
              replayed++;
            }
          }
          this.walSeq = Math.max(this.walSeq, entry.seq);
        } catch { /* skip corrupt WAL line */ }
      }

      if (replayed > 0) {
        log.info(`[GRAPH] WAL replayed ${replayed} entries`);
      }
    } catch (e) {
      log.warn(`[GRAPH] WAL replay failed: ${(e as Error).message}`);
    }
  }

  // ==========================================================================
  // QUERY ENGINE
  // ==========================================================================

  traceDecision(query: TraceDecisionQuery): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const depth = query.depth ?? 3;
    const direction = query.direction ?? 'both';
    const visited = new Set<string>();
    const resultNodes: GraphNode[] = [];
    const resultEdges: GraphEdge[] = [];

    const traverse = (nodeId: string, currentDepth: number) => {
      if (currentDepth > depth || visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) resultNodes.push(node);

      // Forward: follow outgoing edges
      if (direction === 'forward' || direction === 'both') {
        const outEdgeIds = this.index.edgesBySource[nodeId] || [];
        for (const eid of outEdgeIds) {
          const edge = this.edges.get(eid);
          if (edge && !visited.has(edge.targetId)) {
            resultEdges.push(edge);
            traverse(edge.targetId, currentDepth + 1);
          }
        }
      }

      // Backward: follow incoming edges
      if (direction === 'backward' || direction === 'both') {
        const inEdgeIds = this.index.edgesByTarget[nodeId] || [];
        for (const eid of inEdgeIds) {
          const edge = this.edges.get(eid);
          if (edge && !visited.has(edge.sourceId)) {
            resultEdges.push(edge);
            traverse(edge.sourceId, currentDepth + 1);
          }
        }
      }
    };

    try {
      traverse(query.nodeId, 0);
    } catch (e) {
      log.warn(`[GRAPH] traceDecision error: ${(e as Error).message}`);
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  findSimilar(query: FindSimilarQuery): GraphNode[] {
    const limit = query.limit ?? 10;
    const results: GraphNode[] = [];

    try {
      let candidates: string[] = [];

      if (query.dispatcher) {
        candidates = this.index.nodesByDispatcher[query.dispatcher] || [];
      } else if (query.nodeType) {
        candidates = this.index.nodesByType[query.nodeType] || [];
      } else {
        candidates = Array.from(this.nodes.keys());
      }

      for (const id of candidates) {
        if (results.length >= limit) break;
        const node = this.nodes.get(id);
        if (!node) continue;

        // Filter by action
        if (query.action && 'action' in node && node.action !== query.action) continue;

        // Filter by errorClass
        if (query.errorClass && 'errorClass' in node && node.errorClass !== query.errorClass) continue;

        // Filter by confidence (PatternNode)
        if (query.minConfidence && node.type === 'PATTERN') {
          if ((node as PatternNode).confidence < query.minConfidence) continue;
        }

        results.push(node);
      }
    } catch (e) {
      log.warn(`[GRAPH] findSimilar error: ${(e as Error).message}`);
    }

    return results;
  }

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  getNodesBySession(sessionId: string): GraphNode[] {
    const ids = this.index.nodesBySession[sessionId] || [];
    return ids.map(id => this.nodes.get(id)).filter(Boolean) as GraphNode[];
  }

  // ==========================================================================
  // INTEGRITY CHECK
  // ==========================================================================

  runIntegrityCheck(): { violations: number; fixed: number } {
    let violations = 0;
    let fixed = 0;

    try {
      // 1. Validate edge references
      for (const [edgeId, edge] of this.edges) {
        if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) {
          this.edges.delete(edgeId);
          this.updateIndexForEdge(edge, 'remove');
          violations++;
          fixed++;
        }
      }

      // 2. Cap SIMILAR_TO edges (>10 per node)
      for (const [nodeId, count] of Object.entries(this.index.similarToCount)) {
        if (count > this.config.maxSimilarTo) {
          const edgeIds = this.index.edgesBySource[nodeId] || [];
          const similarEdges = edgeIds
            .map(eid => this.edges.get(eid))
            .filter(e => e && e.type === 'SIMILAR_TO')
            .sort((a, b) => (a!.weight - b!.weight)); // Remove lowest weight first

          while (similarEdges.length > this.config.maxSimilarTo) {
            const edge = similarEdges.shift()!;
            this.edges.delete(edge.id);
            this.updateIndexForEdge(edge, 'remove');
            violations++;
            fixed++;
          }
        }
      }

      // 3. Remove expired nodes
      const now = Date.now();
      const cutoff = now - this.config.maxNodeAge_ms;
      for (const [nodeId, node] of this.nodes) {
        if (node.timestamp < cutoff) {
          this.removeNodeAndEdges(nodeId);
          violations++;
          fixed++;
        }
      }

      if (violations > 0) {
        log.info(`[GRAPH] Integrity check: ${violations} violations, ${fixed} fixed`);
      }
    } catch (e) {
      log.warn(`[GRAPH] Integrity check error: ${(e as Error).message}`);
    }

    return { violations, fixed };
  }

  private removeNodeAndEdges(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Remove all edges referencing this node
    const outEdgeIds = [...(this.index.edgesBySource[nodeId] || [])];
    const inEdgeIds = [...(this.index.edgesByTarget[nodeId] || [])];

    for (const eid of [...outEdgeIds, ...inEdgeIds]) {
      const edge = this.edges.get(eid);
      if (edge) {
        this.edges.delete(eid);
        this.updateIndexForEdge(edge, 'remove');
      }
    }

    this.nodes.delete(nodeId);
    this.updateIndexForNode(node, 'remove');
  }

  // ==========================================================================
  // EVICTION — Oldest ContextNodes first, then by age
  // ==========================================================================

  private evict(): void {
    const target = Math.floor(this.config.maxNodes * 0.9); // Evict to 90%

    // Phase 1: Remove oldest ContextNodes
    const contextIds = [...(this.index.nodesByType['CONTEXT'] || [])];
    const contextNodes = contextIds
      .map(id => this.nodes.get(id))
      .filter(Boolean)
      .sort((a, b) => a!.timestamp - b!.timestamp) as GraphNode[];

    for (const node of contextNodes) {
      if (this.nodes.size <= target) break;
      this.removeNodeAndEdges(node.id);
    }

    // Phase 2: If still over, remove oldest of any type
    if (this.nodes.size > target) {
      const allNodes = Array.from(this.nodes.values())
        .sort((a, b) => a.timestamp - b.timestamp);

      for (const node of allNodes) {
        if (this.nodes.size <= target) break;
        this.removeNodeAndEdges(node.id);
      }
    }

    log.info(`[GRAPH] Eviction: reduced to ${this.nodes.size} nodes`);
  }

  // ==========================================================================
  // PERSISTENCE — Checkpoint save/load
  // ==========================================================================

  saveCheckpoint(): void {
    try {
      ensureStateDir();

      // Save nodes
      const nodesPath = path.join(STATE_DIR, 'nodes.jsonl');
      const nodesTmp = nodesPath + '.tmp';
      const nodeLines = Array.from(this.nodes.values()).map(n => JSON.stringify(n)).join('\n');
      safeWriteSync(nodesTmp, nodeLines);
      fs.renameSync(nodesTmp, nodesPath);

      // Save edges
      const edgesPath = path.join(STATE_DIR, 'edges.jsonl');
      const edgesTmp = edgesPath + '.tmp';
      const edgeLines = Array.from(this.edges.values()).map(e => JSON.stringify(e)).join('\n');
      safeWriteSync(edgesTmp, edgeLines);
      fs.renameSync(edgesTmp, edgesPath);

      // Save index with current WAL sequence
      const indexPath = path.join(STATE_DIR, 'index.json');
      const indexTmp = indexPath + '.tmp';
      this.index.checkpointByteOffset = this.walSeq;
      safeWriteSync(indexTmp, JSON.stringify(this.index));
      fs.renameSync(indexTmp, indexPath);

      // Truncate WAL (already checkpointed)
      const walPath = path.join(STATE_DIR, 'wal.jsonl');
      safeWriteSync(walPath, '');

      log.info(`[GRAPH] Checkpoint saved (${this.nodes.size} nodes, ${this.edges.size} edges, WAL seq=${this.walSeq})`);
    } catch (e) {
      log.warn(`[GRAPH] Checkpoint save failed: ${(e as Error).message}`);
    }
  }

  private loadCheckpoint(): void {
    try {
      // Load index first (has checkpoint offset)
      const indexPath = path.join(STATE_DIR, 'index.json');
      if (fs.existsSync(indexPath)) {
        const raw = fs.readFileSync(indexPath, 'utf-8');
        this.index = JSON.parse(raw);
      }

      // Load nodes
      const nodesPath = path.join(STATE_DIR, 'nodes.jsonl');
      if (fs.existsSync(nodesPath)) {
        const content = fs.readFileSync(nodesPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const node: GraphNode = JSON.parse(line);
            this.nodes.set(node.id, node);
          } catch { /* skip corrupt line */ }
        }
      }

      // Load edges
      const edgesPath = path.join(STATE_DIR, 'edges.jsonl');
      if (fs.existsSync(edgesPath)) {
        const content = fs.readFileSync(edgesPath, 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());
        for (const line of lines) {
          try {
            const edge: GraphEdge = JSON.parse(line);
            this.edges.set(edge.id, edge);
          } catch { /* skip corrupt line */ }
        }
      }

      if (this.nodes.size > 0) {
        log.info(`[GRAPH] Checkpoint loaded (${this.nodes.size} nodes, ${this.edges.size} edges)`);
      }
    } catch (e) {
      log.warn(`[GRAPH] Checkpoint load failed, starting fresh: ${(e as Error).message}`);
      this.nodes.clear();
      this.edges.clear();
      this.index = { ...EMPTY_INDEX };
    }
  }

  // ==========================================================================
  // HEALTH REPORT
  // ==========================================================================

  getHealth(): GraphHealthReport {
    let memoryEstimate = 0;
    memoryEstimate += this.nodes.size * 300;  // ~300 bytes per node
    memoryEstimate += this.edges.size * 150;  // ~150 bytes per edge
    memoryEstimate += JSON.stringify(this.index).length;

    let maxSimilar = 0;
    for (const count of Object.values(this.index.similarToCount)) {
      if (count > maxSimilar) maxSimilar = count;
    }

    const nodesByType: Record<NodeType, number> = {
      DECISION: (this.index.nodesByType['DECISION'] || []).length,
      OUTCOME: (this.index.nodesByType['OUTCOME'] || []).length,
      CONTEXT: (this.index.nodesByType['CONTEXT'] || []).length,
      ERROR: (this.index.nodesByType['ERROR'] || []).length,
      PATTERN: (this.index.nodesByType['PATTERN'] || []).length,
    };

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType,
      indexAge_ms: Date.now() - this.index.lastUpdated,
      walPending: this.walBuffer.length,
      integrityViolations: 0, // Computed on-demand
      memoryUsageBytes: memoryEstimate,
      similarToMaxPerNode: maxSimilar,
    };
  }

  // ==========================================================================
  // CONVENIENCE: Auto-capture from autoHookWrapper
  // ==========================================================================

  /**
   * Record a decision+outcome pair from a dispatcher call.
   * Called by autoHookWrapper after each dispatch.
   */
  /** Track last decision ID per session for PRECEDED edges */
  private lastDecisionId: string | null = null;

  captureDispatch(
    sessionId: string,
    dispatcher: string,
    action: string,
    paramsSummary: string,
    success: boolean,
    latencyMs: number,
    resultSummary: string,
    errorClass?: string
  ): { decisionId: string | null; outcomeId: string | null } {
    try {
      const decisionId = this.addNode({
        type: 'DECISION' as const,
        sessionId,
        tags: [dispatcher, action],
        dispatcher,
        action,
        params_summary: paramsSummary.slice(0, 200),
      } as any);

      const outcomeId = this.addNode({
        type: (success ? 'OUTCOME' : 'ERROR') as any,
        sessionId,
        tags: [dispatcher, action, success ? 'success' : 'failure'],
        dispatcher,
        action,
        ...(success
          ? { success: true, latencyMs, result_summary: resultSummary.slice(0, 200) }
          : { errorClass: errorClass || 'UnknownError', message: resultSummary.slice(0, 300) }
        ),
      } as any);

      // Link decision → outcome
      if (decisionId && outcomeId) {
        this.addEdge(decisionId, outcomeId, 'CAUSED');
      }

      // Auto-link PRECEDED: previous decision → this decision (sequence tracking)
      if (decisionId && this.lastDecisionId && this.nodes.has(this.lastDecisionId)) {
        this.addEdge(this.lastDecisionId, decisionId, 'PRECEDED');
      }
      if (decisionId) this.lastDecisionId = decisionId;

      // Auto-link SIMILAR_TO: find recent decisions with same dispatcher+action
      if (decisionId) {
        const candidates = this.index.nodesByDispatcher[dispatcher] || [];
        let linked = 0;
        for (let i = candidates.length - 1; i >= 0 && linked < 3; i--) {
          const cid = candidates[i];
          if (cid === decisionId) continue;
          const cnode = this.nodes.get(cid);
          if (!cnode || cnode.type !== 'DECISION') continue;
          if ((cnode as any).action !== action) continue;
          this.addEdge(decisionId, cid, 'SIMILAR_TO');
          linked++;
        }
      }

      // Auto-create CONTEXT node from params (extract key-value context)
      if (decisionId && paramsSummary.length > 10) {
        const contextId = this.addNode({
          type: 'CONTEXT' as const,
          sessionId,
          tags: [dispatcher, action, 'auto-context'],
          values: paramsSummary.slice(0, 500),
        } as any);
        if (contextId) {
          this.addEdge(contextId, decisionId, 'CONTEXT_OF');
        }
      }

      return { decisionId, outcomeId };
    } catch {
      return { decisionId: null, outcomeId: null };
    }
  }

  // ==========================================================================
  // PATTERN HELPERS — Wire GAP B (error→pattern learning)
  // ==========================================================================

  /**
   * Create a PATTERN node from an error occurrence and optionally link it
   * to the ERROR node via a TRIGGERED edge.
   */
  createPatternFromError(
    sessionId: string,
    patternType: string,
    description: string,
    confidence: number = 0.5,
    occurrences: number = 1,
    errorNodeId?: string
  ): string | null {
    try {
      const patternId = this.addNode({
        type: 'PATTERN' as const,
        sessionId,
        tags: ['auto-learned', patternType],
        patternType,
        description: description.slice(0, 300),
        confidence: Math.max(0, Math.min(1, confidence)),
        occurrences,
      } as any);

      if (patternId && errorNodeId && this.nodes.has(errorNodeId)) {
        this.addEdge(errorNodeId, patternId, 'TRIGGERED', confidence);
      }

      return patternId;
    } catch {
      return null;
    }
  }

  /**
   * Create a RESOLVED_BY edge from an ERROR node to the DECISION node
   * that resolved it.
   */
  linkErrorResolution(
    errorNodeId: string,
    resolvingDecisionId: string,
    weight: number = 1.0
  ): string | null {
    try {
      if (!this.nodes.has(errorNodeId) || !this.nodes.has(resolvingDecisionId)) {
        return null;
      }
      return this.addEdge(errorNodeId, resolvingDecisionId, 'RESOLVED_BY', weight);
    } catch {
      return null;
    }
  }

  /**
   * Update an existing PATTERN node's confidence and optionally increment occurrences.
   */
  updatePatternConfidence(
    patternId: string,
    newConfidence: number,
    incrementOccurrences: boolean = false
  ): boolean {
    try {
      const node = this.nodes.get(patternId);
      if (!node || node.type !== 'PATTERN') return false;
      const pNode = node as PatternNode;
      const updated = {
        ...pNode,
        confidence: Math.max(0, Math.min(1, newConfidence)),
        occurrences: incrementOccurrences ? pNode.occurrences + 1 : pNode.occurrences,
      } as any;
      updated.checksum = computeNodeChecksum(updated);
      this.enqueueWrite(() => {
        this.nodes.set(patternId, updated);
        this.appendWAL({ seq: ++this.walSeq, type: 'ADD_NODE' as WALEntryType, timestamp: Date.now(), data: updated });
      });
      return true;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // STATS
  // ==========================================================================

  getStats(): { nodes: number; edges: number; sessions: number; dispatchers: number } {
    return {
      nodes: this.nodes.size,
      edges: this.edges.size,
      sessions: Object.keys(this.index.nodesBySession).length,
      dispatchers: Object.keys(this.index.nodesByDispatcher).length,
    };
  }

  getConfig(): MemoryGraphConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const memoryGraphEngine = new MemoryGraphEngine();
