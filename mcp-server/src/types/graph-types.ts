/**
 * PRISM F2: Memory Graph Type Definitions
 * =========================================
 * 
 * Cross-session memory graph for decision tracing and pattern learning.
 * Graph is ENHANCEMENT ONLY — total failure = no cross-session learning,
 * NOT loss of manufacturing capability. Dispatchers continue normally.
 * 
 * @version 1.0.0
 * @feature F2
 */

// ============================================================================
// GRAPH NODE — Discriminated Union
// ============================================================================

export type NodeType = 'DECISION' | 'OUTCOME' | 'CONTEXT' | 'ERROR' | 'PATTERN';

interface BaseNode {
  readonly id: string;              // UUID v4
  readonly type: NodeType;
  readonly timestamp: number;       // Unix ms
  readonly sessionId: string;
  readonly checksum: string;        // SHA-256
  tags: string[];
}

export interface DecisionNode extends BaseNode {
  readonly type: 'DECISION';
  readonly dispatcher: string;
  readonly action: string;
  readonly params_summary: string;  // max 200 chars
  readonly rationale?: string;      // why this action was chosen
}

export interface OutcomeNode extends BaseNode {
  readonly type: 'OUTCOME';
  readonly dispatcher: string;
  readonly action: string;
  readonly success: boolean;
  readonly latencyMs: number;
  readonly result_summary: string;  // max 200 chars
  readonly errorClass?: string;
}

export interface ContextNode extends BaseNode {
  readonly type: 'CONTEXT';
  readonly key: string;             // e.g. 'material', 'machine', 'tool'
  readonly value: string;           // max 500 chars
  readonly source: string;          // dispatcher that provided this
}

export interface ErrorNode extends BaseNode {
  readonly type: 'ERROR';
  readonly dispatcher: string;
  readonly action: string;
  readonly errorClass: string;
  readonly message: string;         // max 300 chars
  readonly recoveryAction?: string;
}

export interface PatternNode extends BaseNode {
  readonly type: 'PATTERN';
  readonly patternType: string;     // e.g. 'failure_sequence', 'optimization'
  readonly description: string;     // max 300 chars
  readonly confidence: number;      // 0.0-1.0
  readonly occurrences: number;
}

export type GraphNode = DecisionNode | OutcomeNode | ContextNode | ErrorNode | PatternNode;

// ============================================================================
// GRAPH EDGE
// ============================================================================

export type EdgeType =
  | 'CAUSED'        // decision → outcome
  | 'PRECEDED'      // decision → decision (sequence)
  | 'SIMILAR_TO'    // node → node (similarity, max 10 per node)
  | 'CONTEXT_OF'    // context → decision
  | 'TRIGGERED'     // error → pattern
  | 'RESOLVED_BY';  // error → decision

export interface GraphEdge {
  readonly id: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly type: EdgeType;
  readonly weight: number;          // 0.0-1.0
  readonly timestamp: number;
  readonly metadata?: string;       // max 100 chars
}

// ============================================================================
// GRAPH INDEX
// ============================================================================

export interface GraphIndex {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, string[]>;        // type → node IDs
  edgesBySource: Record<string, string[]>;         // nodeId → edge IDs
  edgesByTarget: Record<string, string[]>;         // nodeId → edge IDs
  nodesByDispatcher: Record<string, string[]>;     // dispatcher → node IDs
  nodesBySession: Record<string, string[]>;        // sessionId → node IDs
  similarToCount: Record<string, number>;          // nodeId → count of SIMILAR_TO edges
  checkpointByteOffset: number;                    // WAL replay start point
  lastUpdated: number;
}

export const EMPTY_INDEX: GraphIndex = {
  nodeCount: 0,
  edgeCount: 0,
  nodesByType: { DECISION: [], OUTCOME: [], CONTEXT: [], ERROR: [], PATTERN: [] },
  edgesBySource: {},
  edgesByTarget: {},
  nodesByDispatcher: {},
  nodesBySession: {},
  similarToCount: {},
  checkpointByteOffset: 0,
  lastUpdated: Date.now(),
};

// ============================================================================
// WRITE-AHEAD LOG
// ============================================================================

export type WALEntryType = 'ADD_NODE' | 'ADD_EDGE' | 'DELETE_NODE' | 'DELETE_EDGE';

export interface WALEntry {
  readonly seq: number;
  readonly type: WALEntryType;
  readonly timestamp: number;
  readonly data: GraphNode | GraphEdge;
}

// ============================================================================
// QUERY TYPES
// ============================================================================

export interface TraceDecisionQuery {
  nodeId: string;
  depth?: number;       // default 3
  direction?: 'forward' | 'backward' | 'both';  // default 'both'
}

export interface FindSimilarQuery {
  dispatcher?: string;
  action?: string;
  errorClass?: string;
  nodeType?: NodeType;
  limit?: number;       // default 10
  minConfidence?: number;
}

export interface GraphHealthReport {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<NodeType, number>;
  indexAge_ms: number;
  walPending: number;
  integrityViolations: number;
  memoryUsageBytes: number;
  similarToMaxPerNode: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface MemoryGraphConfig {
  maxNodes: number;                 // default 100000
  maxEdgesPerNode: number;          // default 50
  maxSimilarTo: number;             // default 10
  walFlushIntervalMs: number;       // default 5000
  integrityCheckInterval: number;   // default 50 (calls)
  checkpointInterval: number;       // default 50 (calls)
  evictionPolicy: 'oldest_context' | 'lru';  // default 'oldest_context'
  memoryLimitBytes: number;         // default 10485760 (10MB)
  maxNodeAge_ms: number;            // default 2592000000 (30 days)
}

export const DEFAULT_GRAPH_CONFIG: MemoryGraphConfig = {
  maxNodes: 100_000,
  maxEdgesPerNode: 50,
  maxSimilarTo: 10,
  walFlushIntervalMs: 5_000,
  integrityCheckInterval: 50,
  checkpointInterval: 50,
  evictionPolicy: 'oldest_context',
  memoryLimitBytes: 10_485_760,
  maxNodeAge_ms: 2_592_000_000,
};
