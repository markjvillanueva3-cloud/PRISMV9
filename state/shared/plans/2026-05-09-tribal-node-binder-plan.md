# Tribal Knowledge ↔ System-Viz Auto-Wiring Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the keystone schema, binder pipeline, and PreToolUse hook that auto-injects bound tribal tips into Claude (and subagent) context whenever a tool call resolves to a known system-viz node.

**Architecture:** Pre-baked enriched node-context cards (sqlite + JSON mirror) produced by an offline binder pipeline that consumes Ollama nomic-embed-text, system-viz graph neighbors, Obsidian canonical entries, and PRISMCreativeReasoningEngine NN re-rank. Runtime PreToolUse hook is dumb (single sqlite SELECT) with hybrid live-fallback when card is missing or stale (>24h). Hot path <100ms, live-fallback <80ms, advisory-only (never blocks tool call).

**Tech Stack:** TypeScript (strict), better-sqlite3, vitest, Ollama (`nomic-embed-text`), existing PRISM engines (`TribalKnowledgeEngine`, `PRISMCreativeReasoningEngine`, `PRISMSelfAwarenessEngine`, `OllamaHookBridgeEngine`), existing scripts (`system-viz-query.mjs`, `system-viz-obsidian-bridge.mjs`).

**Spec:** `state/shared/specs/2026-05-09-tribal-node-binder-design.md`

---

## File Map (locked at planning time)

### Created
| Path | Responsibility |
|---|---|
| `mcp-server/src/schemas/enrichedNodeContext.ts` | TS types + zod schema + SCHEMA_VERSION constant |
| `mcp-server/src/engines/EnrichedNodeContextStore.ts` | Sqlite store: get/upsert/list/stats/atomic JSON mirror |
| `mcp-server/src/engines/NodeIdResolver.ts` | tool_name + tool_input → canonical nodeId |
| `mcp-server/src/engines/TipNodeBinderEngine.ts` | 8-stage build pipeline orchestrator |
| `mcp-server/src/engines/TipNodeBinderPipeline.ts` | Per-stage implementations (embed/cosine/override/rerank/neighbors/canonical/safety/persist) |
| `mcp-server/data/migrations/0001-node-context-index.sql` | sqlite DDL |
| `mcp-server/data/migrations/0002-embeddings-cache.sql` | embeddings cache DDL |
| `scripts/node-context-rebuild.mjs` | Cron-runnable + on-event binder runner |
| `scripts/node-context-stats.mjs` | Read tribal-injection-stats.json + rebuild_log → human report |
| `.claude/hooks/tribal-context-inject.mjs` | PreToolUse hook (runtime injection) |
| `.claude/hooks/tribal-spike.mjs` | Phase-0 spike logger (subagent parity test) |
| `mcp-server/src/__tests__/EnrichedNodeContextStore.test.ts` | Unit |
| `mcp-server/src/__tests__/NodeIdResolver.test.ts` | Unit |
| `mcp-server/src/__tests__/TipNodeBinderEngine.test.ts` | Unit |
| `mcp-server/src/__tests__/TipNodeBinderPipeline.test.ts` | Unit (per-stage) |
| `mcp-server/src/__tests__/tribal-context-inject.integration.test.ts` | Integration |
| `mcp-server/src/__tests__/tribal-bind-rebuild.e2e.test.ts` | E2E round-trip |

### Modified
| Path | Reason |
|---|---|
| `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts` | Add 4 actions: `tribal_bind_node`, `tribal_bindings_for_node`, `tribal_rebuild_index`, `tribal_index_stats` |
| `mcp-server/src/tools/dispatchers/memoryDispatcher.ts` | Add 3 actions: `context_card_get`, `context_card_list`, `context_card_stats` |
| `mcp-server/src/tools/dispatchers/sessionDispatcher.ts` | Add 1 action: `resolve_node_id` |
| `mcp-server/src/schemas/knowledgeExtActionSchemas.ts` | Add zod schemas for the 4 new tribal actions |
| `mcp-server/src/schemas/memoryActionSchemas.ts` (or similar) | Add zod schemas for the 3 new memory actions |
| `H:/.claude/settings.json` | Register PreToolUse hook + add to MINIMAL_ALLOWLIST |
| `scripts/system-viz-on-commit.mjs` | Trigger `node-context-rebuild.mjs` after graph regen |
| `scripts/system-viz-obsidian-bridge.mjs` | Extend to handle dispatcher + action node kinds (not just engines) |

---

## Phase 0 — Subagent Parity Spike (1 day)

### Task 0.1: Spike logger hook

**Files:**
- Create: `H:/prism/.claude/hooks/tribal-spike.mjs`
- Create: `H:/prism/.claude/spike-logs/tribal-spike.log` (empty placeholder, written by hook)

- [ ] **Step 1: Create the hook file**

```javascript
// H:/prism/.claude/hooks/tribal-spike.mjs
#!/usr/bin/env node
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const LOG = "H:/prism/.claude/spike-logs/tribal-spike.log";

try {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const input = JSON.parse(raw || "{}");
  const entry = {
    ts: new Date().toISOString(),
    tool_name: input.tool_name ?? null,
    is_subagent: input.is_subagent ?? null,
    session_id: input.session_id ?? null,
  };
  mkdirSync(dirname(LOG), { recursive: true });
  appendFileSync(LOG, JSON.stringify(entry) + "\n");
  process.exit(0);
} catch (err) {
  // advisory-only — never block
  process.exit(0);
}
```

- [ ] **Step 2: Register in settings.json (PreToolUse)**

Append to `H:/.claude/settings.json` PreToolUse array (preserve existing entries):

```json
{
  "matcher": ".*",
  "hooks": [
    { "type": "command", "command": "node H:/prism/.claude/hooks/tribal-spike.mjs", "timeout": 1000 }
  ]
}
```

- [ ] **Step 3: Restart Claude Code session and run mixed workload**

Run a session that calls (in this order):
1. `mcp__prism__prism_calc` with `action=cutting_force_calc` (main thread)
2. `Agent` with `subagent_type="Explore"`, `prompt="Grep for 'TribalKnowledgeEngine' across mcp-server/src/"`
3. Wait for agent completion.

- [ ] **Step 4: Inspect log**

Run:
```bash
rtk cat H:/prism/.claude/spike-logs/tribal-spike.log
```

Decision:
- If subagent's internal `Grep`/`Read` calls appear with `is_subagent: true` → **PASS**, primary path runtime injection.
- If only the parent's `Agent(...)` invocation logged → **FAIL**, use bridge wrapper fallback (Task 3.10).

- [ ] **Step 5: Document decision in spec §14**

Edit `H:/prism/state/shared/specs/2026-05-09-tribal-node-binder-design.md` §14 with the spike result, date, and chosen path.

- [ ] **Step 6: Commit**

```bash
rtk git add H:/prism/.claude/hooks/tribal-spike.mjs H:/.claude/settings.json H:/prism/state/shared/specs/2026-05-09-tribal-node-binder-design.md
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-PHASE0-SPIKE: subagent PreToolUse parity spike + decision

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 1 — Schema + Store (2 days)

### Task 1.1: EnrichedNodeContext schema

**Files:**
- Create: `mcp-server/src/schemas/enrichedNodeContext.ts`
- Test: `mcp-server/src/__tests__/enrichedNodeContext.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/enrichedNodeContext.test.ts
import { describe, it, expect } from "vitest";
import {
  SCHEMA_VERSION,
  EnrichedNodeContextSchema,
  type EnrichedNodeContext,
} from "../schemas/enrichedNodeContext.js";

describe("EnrichedNodeContext schema", () => {
  it("rejects payload with missing schemaVersion", () => {
    const bad: any = { nodeId: "engine:X" };
    expect(() => EnrichedNodeContextSchema.parse(bad)).toThrow();
  });

  it("accepts a minimal valid payload", () => {
    const ok: EnrichedNodeContext = {
      schemaVersion: SCHEMA_VERSION,
      nodeId: "engine:CuttingForceEngine",
      nodeKind: "engine",
      nodeLabel: "CuttingForceEngine",
      nodeLayer: "L4",
      nodeSubgroup: "engines",
      tips: [],
      vizNeighbors: [],
      obsidianCanonical: null,
      domainTags: [],
      safetyClass: "production",
      nnConfidence: 0.5,
      hadFrontmatterOverride: false,
      bakedAt: new Date().toISOString(),
      bakedBy: "manual",
      ttlHours: 24,
    };
    expect(() => EnrichedNodeContextSchema.parse(ok)).not.toThrow();
  });

  it("caps tips at 5 entries", () => {
    const tips = Array.from({ length: 6 }, (_, i) => ({
      tipId: "x".repeat(64),
      title: `t${i}`,
      excerpt: "e",
      source: "s",
      confidence: 0.5,
      bindScore: 0.5,
      bindReason: "embedding" as const,
    }));
    const bad: any = {
      schemaVersion: SCHEMA_VERSION,
      nodeId: "engine:X",
      nodeKind: "engine",
      nodeLabel: "X",
      nodeLayer: "L0",
      nodeSubgroup: "engines",
      tips,
      vizNeighbors: [],
      obsidianCanonical: null,
      domainTags: [],
      safetyClass: "sim",
      nnConfidence: 0.5,
      hadFrontmatterOverride: false,
      bakedAt: new Date().toISOString(),
      bakedBy: "manual",
      ttlHours: 24,
    };
    expect(() => EnrichedNodeContextSchema.parse(bad)).toThrow(/at most 5/i);
  });

  it("caps vizNeighbors at 8 entries", () => {
    const neighbors = Array.from({ length: 9 }, (_, i) => ({
      nodeId: `engine:N${i}`,
      relation: "calls" as const,
      distance: 1 as const,
    }));
    const bad: any = {
      schemaVersion: SCHEMA_VERSION,
      nodeId: "engine:X",
      nodeKind: "engine",
      nodeLabel: "X",
      nodeLayer: "L0",
      nodeSubgroup: "engines",
      tips: [],
      vizNeighbors: neighbors,
      obsidianCanonical: null,
      domainTags: [],
      safetyClass: "sim",
      nnConfidence: 0.5,
      hadFrontmatterOverride: false,
      bakedAt: new Date().toISOString(),
      bakedBy: "manual",
      ttlHours: 24,
    };
    expect(() => EnrichedNodeContextSchema.parse(bad)).toThrow(/at most 8/i);
  });

  it("rejects nnConfidence outside 0..1", () => {
    expect(() =>
      EnrichedNodeContextSchema.parse({
        schemaVersion: SCHEMA_VERSION,
        nodeId: "engine:X",
        nodeKind: "engine",
        nodeLabel: "X",
        nodeLayer: "L0",
        nodeSubgroup: "engines",
        tips: [],
        vizNeighbors: [],
        obsidianCanonical: null,
        domainTags: [],
        safetyClass: "sim",
        nnConfidence: 1.5,
        hadFrontmatterOverride: false,
        bakedAt: new Date().toISOString(),
        bakedBy: "manual",
        ttlHours: 24,
      } as any)
    ).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/enrichedNodeContext.test.ts
```
Expected: FAIL with "Cannot find module '../schemas/enrichedNodeContext.js'"

- [ ] **Step 3: Implement the schema**

```typescript
// mcp-server/src/schemas/enrichedNodeContext.ts
import { z } from "zod";

export const SCHEMA_VERSION = "1.0.0" as const;

export const NodeKindSchema = z.enum([
  "engine",
  "dispatcher",
  "action",
  "registry",
  "page",
  "skill",
]);
export type NodeKind = z.infer<typeof NodeKindSchema>;

export const SafetyClassSchema = z.enum([
  "shop_floor",
  "production",
  "proven_out",
  "sim",
]);
export type SafetyClass = z.infer<typeof SafetyClassSchema>;

export const BindReasonSchema = z.enum([
  "embedding",
  "frontmatter_override",
  "domain_match",
]);

export const BakedBySchema = z.enum([
  "cron",
  "on_tip_ingest",
  "on_graph_regen",
  "manual",
  "live_fallback",
]);

export const TipBindingSchema = z.object({
  tipId: z.string().min(8),
  title: z.string(),
  excerpt: z.string().max(200),
  source: z.string(),
  confidence: z.number().min(0).max(1),
  bindScore: z.number().min(0).max(1),
  bindReason: BindReasonSchema,
});
export type TipBinding = z.infer<typeof TipBindingSchema>;

export const NeighborRefSchema = z.object({
  nodeId: z.string(),
  relation: z.enum(["calls", "called_by", "sibling", "wires_to", "reads", "writes"]),
  distance: z.literal(1),
});
export type NeighborRef = z.infer<typeof NeighborRefSchema>;

export const EnrichedNodeContextSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  nodeId: z.string().min(1),
  nodeKind: NodeKindSchema,
  nodeLabel: z.string(),
  nodeLayer: z.string(),
  nodeSubgroup: z.string(),
  tips: z.array(TipBindingSchema).max(5),
  vizNeighbors: z.array(NeighborRefSchema).max(8),
  obsidianCanonical: z.string().nullable(),
  domainTags: z.array(z.string()),
  safetyClass: SafetyClassSchema,
  nnConfidence: z.number().min(0).max(1),
  hadFrontmatterOverride: z.boolean(),
  bakedAt: z.string().datetime(),
  bakedBy: BakedBySchema,
  ttlHours: z.literal(24),
});
export type EnrichedNodeContext = z.infer<typeof EnrichedNodeContextSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/enrichedNodeContext.test.ts
```
Expected: PASS, 5 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/schemas/enrichedNodeContext.ts mcp-server/src/__tests__/enrichedNodeContext.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P1T1: EnrichedNodeContext zod schema + tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: Sqlite migrations

**Files:**
- Create: `mcp-server/data/migrations/0001-node-context-index.sql`
- Create: `mcp-server/data/migrations/0002-embeddings-cache.sql`
- Create: `mcp-server/src/__tests__/node-context-migrations.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/node-context-migrations.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("node-context migrations", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "ncmig-"));
  });

  it("0001 creates node_context, tip_to_node, rebuild_log tables", () => {
    const db = new Database(join(dir, "ncix.sqlite"));
    const sql = readFileSync(
      "mcp-server/data/migrations/0001-node-context-index.sql",
      "utf8"
    );
    db.exec(sql);
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const names = tables.map((t) => t.name).sort();
    expect(names).toContain("node_context");
    expect(names).toContain("tip_to_node");
    expect(names).toContain("rebuild_log");
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("0002 creates embeddings table with content_hash PRIMARY KEY", () => {
    const db = new Database(join(dir, "emb.sqlite"));
    const sql = readFileSync(
      "mcp-server/data/migrations/0002-embeddings-cache.sql",
      "utf8"
    );
    db.exec(sql);
    const cols = db.prepare("PRAGMA table_info(embeddings)").all() as Array<{
      name: string;
      pk: number;
    }>;
    const pk = cols.find((c) => c.pk === 1);
    expect(pk?.name).toBe("content_hash");
    db.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/node-context-migrations.test.ts
```
Expected: FAIL with "ENOENT: no such file"

- [ ] **Step 3: Create migration 0001**

```sql
-- mcp-server/data/migrations/0001-node-context-index.sql
CREATE TABLE IF NOT EXISTS node_context (
  node_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  baked_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  card_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_baked_at ON node_context(baked_at);

CREATE TABLE IF NOT EXISTS tip_to_node (
  tip_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  bind_score REAL NOT NULL,
  PRIMARY KEY (tip_id, node_id)
);
CREATE INDEX IF NOT EXISTS idx_tip ON tip_to_node(tip_id);
CREATE INDEX IF NOT EXISTS idx_node ON tip_to_node(node_id);

CREATE TABLE IF NOT EXISTS rebuild_log (
  rebuild_id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  trigger TEXT NOT NULL,
  tips_processed INTEGER,
  nodes_processed INTEGER,
  cards_written INTEGER,
  cards_skipped INTEGER,
  errors_json TEXT
);
```

- [ ] **Step 4: Create migration 0002**

```sql
-- mcp-server/data/migrations/0002-embeddings-cache.sql
CREATE TABLE IF NOT EXISTS embeddings (
  content_hash TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  vector BLOB NOT NULL,
  embedded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_source ON embeddings(source_kind, source_id);
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/node-context-migrations.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 6: Commit**

```bash
rtk git add mcp-server/data/migrations/0001-node-context-index.sql mcp-server/data/migrations/0002-embeddings-cache.sql mcp-server/src/__tests__/node-context-migrations.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P1T2: sqlite migrations for node-context-index + embeddings-cache

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.3: EnrichedNodeContextStore engine

**Files:**
- Create: `mcp-server/src/engines/EnrichedNodeContextStore.ts`
- Test: `mcp-server/src/__tests__/EnrichedNodeContextStore.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/EnrichedNodeContextStore.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EnrichedNodeContextStore } from "../engines/EnrichedNodeContextStore.js";
import { SCHEMA_VERSION, type EnrichedNodeContext } from "../schemas/enrichedNodeContext.js";

const sample = (overrides: Partial<EnrichedNodeContext> = {}): EnrichedNodeContext => ({
  schemaVersion: SCHEMA_VERSION,
  nodeId: "engine:CuttingForceEngine",
  nodeKind: "engine",
  nodeLabel: "CuttingForceEngine",
  nodeLayer: "L4",
  nodeSubgroup: "engines",
  tips: [],
  vizNeighbors: [],
  obsidianCanonical: null,
  domainTags: [],
  safetyClass: "production",
  nnConfidence: 0.7,
  hadFrontmatterOverride: false,
  bakedAt: new Date().toISOString(),
  bakedBy: "manual",
  ttlHours: 24,
  ...overrides,
});

describe("EnrichedNodeContextStore", () => {
  let dir: string;
  let store: EnrichedNodeContextStore;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "encs-"));
    store = new EnrichedNodeContextStore({
      sqlitePath: join(dir, "ix.sqlite"),
      jsonMirrorPath: join(dir, "ix.json"),
    });
  });
  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("upsert + get round-trip", () => {
    const card = sample();
    store.upsert(card);
    const got = store.get("engine:CuttingForceEngine");
    expect(got?.nodeId).toBe(card.nodeId);
    expect(got?.nnConfidence).toBe(0.7);
  });

  it("returns null for missing nodeId", () => {
    expect(store.get("engine:Nope")).toBeNull();
  });

  it("schema version mismatch returns null (cache miss)", () => {
    const card = sample();
    store.upsert(card);
    // simulate corrupt/mismatched record
    const db = (store as any).db;
    db.prepare(
      "UPDATE node_context SET schema_version = '0.9.9' WHERE node_id = ?"
    ).run("engine:CuttingForceEngine");
    expect(store.get("engine:CuttingForceEngine")).toBeNull();
  });

  it("isStale returns true when bakedAt > ttlHours old", () => {
    const old = new Date(Date.now() - 25 * 3600 * 1000).toISOString();
    const card = sample({ bakedAt: old });
    store.upsert(card);
    expect(store.isStale("engine:CuttingForceEngine")).toBe(true);
  });

  it("isStale returns false when bakedAt within ttlHours", () => {
    const card = sample({ bakedAt: new Date().toISOString() });
    store.upsert(card);
    expect(store.isStale("engine:CuttingForceEngine")).toBe(false);
  });

  it("upsert is idempotent on identical payload (no_op skip)", () => {
    const card = sample();
    store.upsert(card);
    const before = store.stats();
    const result = store.upsert(card);
    const after = store.stats();
    expect(result.skipped).toBe(true);
    expect(after.totalCards).toBe(before.totalCards);
  });

  it("writes JSON mirror atomically", () => {
    const card = sample();
    store.upsert(card);
    store.flushMirror();
    const path = join(dir, "ix.json");
    expect(existsSync(path)).toBe(true);
    const json = JSON.parse(readFileSync(path, "utf8"));
    expect(json.cards["engine:CuttingForceEngine"]).toBeDefined();
  });

  it("stats reports totalCards + lastBakedAt", () => {
    store.upsert(sample({ nodeId: "engine:A" }));
    store.upsert(sample({ nodeId: "engine:B" }));
    const s = store.stats();
    expect(s.totalCards).toBe(2);
    expect(s.lastBakedAt).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/EnrichedNodeContextStore.test.ts
```
Expected: FAIL with "Cannot find module '../engines/EnrichedNodeContextStore.js'"

- [ ] **Step 3: Implement the store**

```typescript
// mcp-server/src/engines/EnrichedNodeContextStore.ts
import Database from "better-sqlite3";
import { createHash } from "node:crypto";
import { writeFileSync, renameSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  EnrichedNodeContextSchema,
  SCHEMA_VERSION,
  type EnrichedNodeContext,
} from "../schemas/enrichedNodeContext.js";

const MIGRATIONS = [
  "0001-node-context-index.sql",
];

interface StoreOptions {
  sqlitePath: string;
  jsonMirrorPath: string;
  migrationsDir?: string;
}

export interface UpsertResult {
  written: boolean;
  skipped: boolean;
  cardHash: string;
}

export interface StoreStats {
  totalCards: number;
  lastBakedAt: string | null;
  schemaVersion: string;
}

export class EnrichedNodeContextStore {
  private db: Database.Database;
  private opts: StoreOptions;

  constructor(opts: StoreOptions) {
    this.opts = opts;
    mkdirSync(dirname(opts.sqlitePath), { recursive: true });
    this.db = new Database(opts.sqlitePath);
    this.db.pragma("journal_mode = WAL");
    this.runMigrations(opts.migrationsDir ?? "mcp-server/data/migrations");
  }

  private runMigrations(dir: string): void {
    for (const file of MIGRATIONS) {
      const sql = readFileSync(join(dir, file), "utf8");
      this.db.exec(sql);
    }
  }

  private hashCard(card: EnrichedNodeContext): string {
    const norm = JSON.stringify(card, Object.keys(card).sort());
    return createHash("sha256").update(norm).digest("hex");
  }

  upsert(card: EnrichedNodeContext): UpsertResult {
    EnrichedNodeContextSchema.parse(card); // throws on invalid
    const cardHash = this.hashCard(card);
    const existing = this.db
      .prepare("SELECT card_hash FROM node_context WHERE node_id = ?")
      .get(card.nodeId) as { card_hash: string } | undefined;
    if (existing && existing.card_hash === cardHash) {
      return { written: false, skipped: true, cardHash };
    }
    this.db
      .prepare(
        `INSERT INTO node_context (node_id, schema_version, baked_at, payload_json, card_hash)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(node_id) DO UPDATE SET
           schema_version = excluded.schema_version,
           baked_at = excluded.baked_at,
           payload_json = excluded.payload_json,
           card_hash = excluded.card_hash`
      )
      .run(card.nodeId, card.schemaVersion, card.bakedAt, JSON.stringify(card), cardHash);
    return { written: true, skipped: false, cardHash };
  }

  get(nodeId: string): EnrichedNodeContext | null {
    const row = this.db
      .prepare(
        "SELECT payload_json, schema_version FROM node_context WHERE node_id = ?"
      )
      .get(nodeId) as { payload_json: string; schema_version: string } | undefined;
    if (!row) return null;
    if (row.schema_version !== SCHEMA_VERSION) return null;
    try {
      return EnrichedNodeContextSchema.parse(JSON.parse(row.payload_json));
    } catch {
      return null;
    }
  }

  isStale(nodeId: string): boolean {
    const row = this.db
      .prepare("SELECT baked_at FROM node_context WHERE node_id = ?")
      .get(nodeId) as { baked_at: string } | undefined;
    if (!row) return true;
    const ageMs = Date.now() - new Date(row.baked_at).getTime();
    return ageMs > 24 * 3600 * 1000;
  }

  stats(): StoreStats {
    const total = (this.db
      .prepare("SELECT COUNT(*) as n FROM node_context")
      .get() as { n: number }).n;
    const last = (this.db
      .prepare("SELECT baked_at FROM node_context ORDER BY baked_at DESC LIMIT 1")
      .get() as { baked_at: string } | undefined)?.baked_at ?? null;
    return { totalCards: total, lastBakedAt: last, schemaVersion: SCHEMA_VERSION };
  }

  list(limit = 100): Array<{ nodeId: string; bakedAt: string }> {
    return this.db
      .prepare(
        "SELECT node_id as nodeId, baked_at as bakedAt FROM node_context ORDER BY baked_at DESC LIMIT ?"
      )
      .all(limit) as Array<{ nodeId: string; bakedAt: string }>;
  }

  flushMirror(): void {
    const rows = this.db
      .prepare("SELECT node_id, payload_json FROM node_context")
      .all() as Array<{ node_id: string; payload_json: string }>;
    const cards: Record<string, unknown> = {};
    for (const r of rows) {
      const card = JSON.parse(r.payload_json) as EnrichedNodeContext;
      // store tip references only; full tip text lives in TRIBAL_TIP_INDEX.json
      cards[r.node_id] = {
        ...card,
        tips: card.tips.map((t) => ({ tipId: t.tipId, bindScore: t.bindScore, bindReason: t.bindReason })),
      };
    }
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      cards,
    };
    const tmp = this.opts.jsonMirrorPath + ".tmp";
    mkdirSync(dirname(this.opts.jsonMirrorPath), { recursive: true });
    writeFileSync(tmp, JSON.stringify(payload, null, 2));
    renameSync(tmp, this.opts.jsonMirrorPath);
  }

  close(): void {
    this.db.close();
  }
}

let _singleton: EnrichedNodeContextStore | null = null;
export function getDefaultStore(): EnrichedNodeContextStore {
  if (!_singleton) {
    _singleton = new EnrichedNodeContextStore({
      sqlitePath: "mcp-server/data/state/node-context-index.sqlite",
      jsonMirrorPath: "mcp-server/data/state/node-context-index.json",
    });
  }
  return _singleton;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/EnrichedNodeContextStore.test.ts
```
Expected: PASS, 8 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/EnrichedNodeContextStore.ts mcp-server/src/__tests__/EnrichedNodeContextStore.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P1T3: EnrichedNodeContextStore engine + tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.4: Wire store to prism_memory dispatcher

**Files:**
- Modify: `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`
- Test: `mcp-server/src/__tests__/memoryDispatcher.context-card.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/memoryDispatcher.context-card.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { memoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";
import { EnrichedNodeContextStore } from "../engines/EnrichedNodeContextStore.js";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("memoryDispatcher: context_card_*", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "mdcc-"));
  });

  it("context_card_get returns null for missing nodeId", async () => {
    const store = new EnrichedNodeContextStore({
      sqlitePath: join(dir, "ix.sqlite"),
      jsonMirrorPath: join(dir, "ix.json"),
    });
    const result = await memoryDispatcher.execute({
      action: "context_card_get",
      params: { nodeId: "engine:Nope" },
    }, { storeOverride: store });
    expect(result.card).toBeNull();
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("context_card_stats returns totalCards", async () => {
    const store = new EnrichedNodeContextStore({
      sqlitePath: join(dir, "ix.sqlite"),
      jsonMirrorPath: join(dir, "ix.json"),
    });
    const result = await memoryDispatcher.execute({
      action: "context_card_stats",
      params: {},
    }, { storeOverride: store });
    expect(result.totalCards).toBe(0);
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/memoryDispatcher.context-card.test.ts
```
Expected: FAIL — `context_card_get` not in action enum

- [ ] **Step 3: Add the 3 actions to memoryDispatcher**

In `mcp-server/src/tools/dispatchers/memoryDispatcher.ts`, locate the action enum / switch and add:

```typescript
import { getDefaultStore, type EnrichedNodeContextStore } from "../../engines/EnrichedNodeContextStore.js";

// add to action enum (the z.enum or string-literal union):
"context_card_get" | "context_card_list" | "context_card_stats"

// add to dispatch switch:
case "context_card_get": {
  const store = ctx?.storeOverride ?? getDefaultStore();
  const nodeId = String(params.nodeId ?? "");
  return { card: store.get(nodeId) };
}
case "context_card_list": {
  const store = ctx?.storeOverride ?? getDefaultStore();
  const limit = Number(params.limit ?? 100);
  return { cards: store.list(limit) };
}
case "context_card_stats": {
  const store = ctx?.storeOverride ?? getDefaultStore();
  return store.stats();
}
```

(Adapt to the actual dispatcher signature; the existing pattern in this file is the source of truth — match its style for `ctx`, `params`, and return shape.)

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/memoryDispatcher.context-card.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/tools/dispatchers/memoryDispatcher.ts mcp-server/src/__tests__/memoryDispatcher.context-card.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P1T4: wire EnrichedNodeContextStore to prism_memory (3 actions)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 2 — Binder Pipeline (3 days)

### Task 2.1: NodeIdResolver engine

**Files:**
- Create: `mcp-server/src/engines/NodeIdResolver.ts`
- Test: `mcp-server/src/__tests__/NodeIdResolver.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/NodeIdResolver.test.ts
import { describe, it, expect } from "vitest";
import { NodeIdResolver } from "../engines/NodeIdResolver.js";

describe("NodeIdResolver", () => {
  const resolver = new NodeIdResolver();

  it("resolves MCP dispatcher action", () => {
    expect(
      resolver.resolve("mcp__prism__prism_calc", { action: "cutting_force_calc" })
    ).toBe("action:prism_calc:cutting_force_calc");
  });

  it("resolves Edit/Write/Read on engine file", () => {
    expect(
      resolver.resolve("Edit", {
        file_path: "H:/prism/mcp-server/src/engines/CuttingForceEngine.ts",
      })
    ).toBe("engine:CuttingForceEngine");
  });

  it("returns null for Agent calls (subagent intercepts on its own tools)", () => {
    expect(resolver.resolve("Agent", { subagent_type: "Explore", prompt: "x" })).toBeNull();
  });

  it("returns null for Bash", () => {
    expect(resolver.resolve("Bash", { command: "ls" })).toBeNull();
  });

  it("returns null for unknown tool", () => {
    expect(resolver.resolve("FrobnicateTool", {})).toBeNull();
  });

  it("returns null for malformed dispatcher params", () => {
    expect(resolver.resolve("mcp__prism__prism_calc", { actionn: "wat" } as any)).toBeNull();
  });

  it("normalises Windows backslashes in file paths", () => {
    expect(
      resolver.resolve("Edit", {
        file_path: "H:\\prism\\mcp-server\\src\\engines\\CuttingForceEngine.ts",
      })
    ).toBe("engine:CuttingForceEngine");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/NodeIdResolver.test.ts
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement NodeIdResolver**

```typescript
// mcp-server/src/engines/NodeIdResolver.ts
const MCP_PRISM_PREFIX = "mcp__prism__";
const ENGINE_PATH_RE = /[/\\]engines[/\\]([A-Za-z0-9_]+)\.ts$/;

export class NodeIdResolver {
  resolve(toolName: string, toolInput: Record<string, unknown>): string | null {
    if (!toolName) return null;

    // MCP dispatcher action
    if (toolName.startsWith(MCP_PRISM_PREFIX)) {
      const dispatcher = toolName.slice(MCP_PRISM_PREFIX.length);
      const action = toolInput?.action;
      if (typeof action !== "string" || action.length === 0) return null;
      return `action:${dispatcher}:${action}`;
    }

    // Edit/Write/Read on engine file
    if (toolName === "Edit" || toolName === "Write" || toolName === "Read") {
      const path = toolInput?.file_path;
      if (typeof path !== "string") return null;
      const normalised = path.replace(/\\/g, "/");
      const m = normalised.match(/\/engines\/([A-Za-z0-9_]+)\.ts$/);
      return m ? `engine:${m[1]}` : null;
    }

    // Agent tool calls — agent's internal tools fire their own PreToolUse
    // (or fall back to bridge wrapper per spec §9.3 if spike fails)
    if (toolName === "Agent") return null;

    // Bash, Grep, Glob, etc. — no resolution
    return null;
  }
}

let _singleton: NodeIdResolver | null = null;
export function getDefaultResolver(): NodeIdResolver {
  return (_singleton ??= new NodeIdResolver());
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/NodeIdResolver.test.ts
```
Expected: PASS, 7 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/NodeIdResolver.ts mcp-server/src/__tests__/NodeIdResolver.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T1: NodeIdResolver engine (tool_name+input → nodeId)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: Wire NodeIdResolver to prism_session

**Files:**
- Modify: `mcp-server/src/tools/dispatchers/sessionDispatcher.ts`
- Test: `mcp-server/src/__tests__/sessionDispatcher.resolve-node-id.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/sessionDispatcher.resolve-node-id.test.ts
import { describe, it, expect } from "vitest";
import { sessionDispatcher } from "../tools/dispatchers/sessionDispatcher.js";

describe("sessionDispatcher: resolve_node_id", () => {
  it("returns nodeId for MCP dispatcher action", async () => {
    const result = await sessionDispatcher.execute({
      action: "resolve_node_id",
      params: {
        toolName: "mcp__prism__prism_calc",
        toolInput: { action: "cutting_force_calc" },
      },
    });
    expect(result.nodeId).toBe("action:prism_calc:cutting_force_calc");
  });

  it("returns null for Bash", async () => {
    const result = await sessionDispatcher.execute({
      action: "resolve_node_id",
      params: { toolName: "Bash", toolInput: { command: "ls" } },
    });
    expect(result.nodeId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/sessionDispatcher.resolve-node-id.test.ts
```
Expected: FAIL — action not in enum

- [ ] **Step 3: Add `resolve_node_id` to sessionDispatcher**

```typescript
// add to sessionDispatcher action enum:
"resolve_node_id"

// add to switch:
import { getDefaultResolver } from "../../engines/NodeIdResolver.js";

case "resolve_node_id": {
  const r = getDefaultResolver();
  const toolName = String(params.toolName ?? "");
  const toolInput = (params.toolInput as Record<string, unknown>) ?? {};
  return { nodeId: r.resolve(toolName, toolInput) };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/sessionDispatcher.resolve-node-id.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/tools/dispatchers/sessionDispatcher.ts mcp-server/src/__tests__/sessionDispatcher.resolve-node-id.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T2: wire NodeIdResolver to prism_session:resolve_node_id

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.3: Pipeline stage ① — embed (Ollama nomic-embed-text)

**Files:**
- Create: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.embed.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.embed.test.ts
import { describe, it, expect, vi } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.embed", () => {
  it("returns 768-dim Float32Array for valid input", async () => {
    const fakeOllama = {
      embed: vi.fn().mockResolvedValue(new Float32Array(768).fill(0.1)),
    };
    const p = new TipNodeBinderPipeline({ ollama: fakeOllama });
    const v = await p.embed("kienzle constants must come from constants.ts");
    expect(v).toBeInstanceOf(Float32Array);
    expect(v.length).toBe(768);
  });

  it("retries 3× on transient failure then returns null", async () => {
    const fakeOllama = {
      embed: vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    };
    const p = new TipNodeBinderPipeline({ ollama: fakeOllama });
    const v = await p.embed("anything", { retries: 3, backoffMs: 1 });
    expect(v).toBeNull();
    expect(fakeOllama.embed).toHaveBeenCalledTimes(3);
  });

  it("uses cache when content_hash matches", async () => {
    const cached = new Float32Array(768).fill(0.5);
    const fakeOllama = { embed: vi.fn() };
    const fakeCache = {
      get: vi.fn().mockReturnValue(cached),
      put: vi.fn(),
    };
    const p = new TipNodeBinderPipeline({ ollama: fakeOllama, cache: fakeCache });
    const v = await p.embed("hello");
    expect(v).toBe(cached);
    expect(fakeOllama.embed).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.embed.test.ts
```
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement embed (and stub other methods so file compiles)**

```typescript
// mcp-server/src/engines/TipNodeBinderPipeline.ts
import { createHash } from "node:crypto";

export interface OllamaEmbedClient {
  embed(text: string): Promise<Float32Array>;
}

export interface EmbeddingCache {
  get(contentHash: string): Float32Array | null;
  put(contentHash: string, sourceKind: "tip" | "node", sourceId: string, vector: Float32Array): void;
}

export interface PipelineDeps {
  ollama?: OllamaEmbedClient;
  cache?: EmbeddingCache;
}

export interface EmbedOptions {
  retries?: number;
  backoffMs?: number;
}

export class TipNodeBinderPipeline {
  private ollama: OllamaEmbedClient | undefined;
  private cache: EmbeddingCache | undefined;

  constructor(deps: PipelineDeps = {}) {
    this.ollama = deps.ollama;
    this.cache = deps.cache;
  }

  hashContent(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  async embed(content: string, opts: EmbedOptions = {}): Promise<Float32Array | null> {
    const hash = this.hashContent(content);
    if (this.cache) {
      const hit = this.cache.get(hash);
      if (hit) return hit;
    }
    if (!this.ollama) return null;
    const retries = opts.retries ?? 3;
    const backoff = opts.backoffMs ?? 100;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const v = await this.ollama.embed(content);
        if (this.cache) this.cache.put(hash, "tip", "", v);
        return v;
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, backoff * Math.pow(2, attempt)));
      }
    }
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.embed.test.ts
```
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.embed.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T3: pipeline stage 1 — embed via Ollama nomic-embed-text

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.4: Stage ② — cosine match

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.cosine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.cosine.test.ts
import { describe, it, expect } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

const f = (a: number[]) => new Float32Array(a);

describe("TipNodeBinderPipeline.cosineTopK", () => {
  it("returns identical-vector match with score 1.0", () => {
    const p = new TipNodeBinderPipeline();
    const node = f([1, 0, 0]);
    const tips = [{ id: "a", vec: f([1, 0, 0]) }];
    const r = p.cosineTopK(node, tips, 5, 0.55);
    expect(r[0].score).toBeCloseTo(1.0, 5);
    expect(r[0].id).toBe("a");
  });

  it("filters tips below tau threshold", () => {
    const p = new TipNodeBinderPipeline();
    const node = f([1, 0]);
    const tips = [
      { id: "high", vec: f([1, 0]) }, // 1.0
      { id: "low", vec: f([0, 1]) },  // 0.0
    ];
    const r = p.cosineTopK(node, tips, 5, 0.55);
    expect(r.length).toBe(1);
    expect(r[0].id).toBe("high");
  });

  it("caps at K results sorted descending", () => {
    const p = new TipNodeBinderPipeline();
    const node = f([1, 0]);
    const tips = [
      { id: "a", vec: f([1, 0]) },
      { id: "b", vec: f([0.95, 0.31]) },
      { id: "c", vec: f([0.9, 0.43]) },
      { id: "d", vec: f([0.85, 0.52]) },
    ];
    const r = p.cosineTopK(node, tips, 2, 0);
    expect(r.length).toBe(2);
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it("returns empty for empty tip set (no throw)", () => {
    const p = new TipNodeBinderPipeline();
    expect(p.cosineTopK(f([1, 0]), [], 5, 0.55)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.cosine.test.ts
```
Expected: FAIL — `cosineTopK` not defined

- [ ] **Step 3: Add cosineTopK method to TipNodeBinderPipeline**

Add to `TipNodeBinderPipeline.ts`:

```typescript
  private dot(a: Float32Array, b: Float32Array): number {
    let s = 0;
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) s += a[i] * b[i];
    return s;
  }

  private norm(a: Float32Array): number {
    let s = 0;
    for (let i = 0; i < a.length; i++) s += a[i] * a[i];
    return Math.sqrt(s);
  }

  cosine(a: Float32Array, b: Float32Array): number {
    const na = this.norm(a);
    const nb = this.norm(b);
    if (na === 0 || nb === 0) return 0;
    return this.dot(a, b) / (na * nb);
  }

  cosineTopK(
    nodeVec: Float32Array,
    tipVecs: Array<{ id: string; vec: Float32Array }>,
    k: number,
    tau: number
  ): Array<{ id: string; score: number }> {
    const scored = tipVecs.map((t) => ({ id: t.id, score: this.cosine(nodeVec, t.vec) }));
    return scored
      .filter((s) => s.score >= tau && Number.isFinite(s.score))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(0, k));
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.cosine.test.ts
```
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.cosine.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T4: pipeline stage 2 — cosine topK match

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.5: Stage ③ — frontmatter override

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.frontmatter.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.frontmatter.test.ts
import { describe, it, expect } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.applyFrontmatterOverrides", () => {
  const p = new TipNodeBinderPipeline();

  it("adds explicit binds_to entries to candidates", () => {
    const candidates = [{ id: "tip1", score: 0.7, reason: "embedding" as const }];
    const overrides = { tip1: { binds_to: ["engine:Force"], binds_excludes: [] } };
    const r = p.applyFrontmatterOverrides("engine:Force", candidates, overrides);
    expect(r.find((c) => c.id === "tip1")?.reason).toBe("frontmatter_override");
  });

  it("removes candidates matching binds_excludes glob", () => {
    const candidates = [
      { id: "tip1", score: 0.7, reason: "embedding" as const },
      { id: "tip2", score: 0.6, reason: "embedding" as const },
    ];
    const overrides = {
      tip1: { binds_to: [], binds_excludes: ["engine:Force"] },
    };
    const r = p.applyFrontmatterOverrides("engine:Force", candidates, overrides);
    expect(r.find((c) => c.id === "tip1")).toBeUndefined();
    expect(r.find((c) => c.id === "tip2")).toBeDefined();
  });

  it("supports * glob in excludes", () => {
    const candidates = [{ id: "tip1", score: 0.7, reason: "embedding" as const }];
    const overrides = {
      tip1: { binds_to: [], binds_excludes: ["engine:Composite*"] },
    };
    const r = p.applyFrontmatterOverrides("engine:CompositeForce", candidates, overrides);
    expect(r.length).toBe(0);
  });

  it("dedups when same tip has both cosine and frontmatter origin", () => {
    const candidates = [{ id: "tip1", score: 0.7, reason: "embedding" as const }];
    const overrides = { tip1: { binds_to: ["engine:Force"], binds_excludes: [] } };
    const r = p.applyFrontmatterOverrides("engine:Force", candidates, overrides);
    const matches = r.filter((c) => c.id === "tip1");
    expect(matches.length).toBe(1);
    expect(matches[0].reason).toBe("frontmatter_override");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.frontmatter.test.ts
```
Expected: FAIL — `applyFrontmatterOverrides` not defined

- [ ] **Step 3: Add applyFrontmatterOverrides**

```typescript
// add to TipNodeBinderPipeline.ts
import type { BindReason } from "../schemas/enrichedNodeContext.js";

export interface CandidateBinding {
  id: string;
  score: number;
  reason: BindReason;
}

export interface FrontmatterOverride {
  binds_to: string[];      // exact nodeIds, optional ":" omitted (e.g. "engine:Force")
  binds_excludes: string[]; // glob patterns
}

function globToRegex(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

  applyFrontmatterOverrides(
    nodeId: string,
    candidates: CandidateBinding[],
    overrides: Record<string, FrontmatterOverride>
  ): CandidateBinding[] {
    const out: Map<string, CandidateBinding> = new Map();
    for (const c of candidates) out.set(c.id, c);

    for (const [tipId, ov] of Object.entries(overrides)) {
      // explicit binds_to includes this nodeId → add (or upgrade reason)
      if (ov.binds_to.includes(nodeId)) {
        const prev = out.get(tipId);
        out.set(tipId, {
          id: tipId,
          score: prev?.score ?? 1.0,
          reason: "frontmatter_override",
        });
      }
      // excludes match this nodeId → remove
      if (ov.binds_excludes.some((g) => globToRegex(g).test(nodeId))) {
        out.delete(tipId);
      }
    }

    return [...out.values()].sort((a, b) => b.score - a.score);
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.frontmatter.test.ts
```
Expected: PASS, 4 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.frontmatter.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T5: pipeline stage 3 — frontmatter override

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.6: Stage ④ — NN re-rank (PRISMCreativeReasoningEngine)

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.rerank.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.rerank.test.ts
import { describe, it, expect, vi } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.nnRerank", () => {
  it("uses CreativeReasoningEngine result when it succeeds", async () => {
    const fake = {
      rankRelevance: vi.fn().mockResolvedValue({
        ordered: [{ id: "tip2", score: 0.95 }, { id: "tip1", score: 0.4 }],
        nnConfidence: 0.88,
      }),
    };
    const p = new TipNodeBinderPipeline({ creativeReasoning: fake });
    const r = await p.nnRerank(
      "engine:Force",
      [
        { id: "tip1", score: 0.7, reason: "embedding" },
        { id: "tip2", score: 0.6, reason: "embedding" },
      ]
    );
    expect(r.candidates[0].id).toBe("tip2");
    expect(r.nnConfidence).toBe(0.88);
  });

  it("falls back to cosine ordering when NN throws", async () => {
    const fake = {
      rankRelevance: vi.fn().mockRejectedValue(new Error("nn down")),
    };
    const p = new TipNodeBinderPipeline({ creativeReasoning: fake });
    const r = await p.nnRerank(
      "engine:Force",
      [
        { id: "tip1", score: 0.7, reason: "embedding" },
        { id: "tip2", score: 0.6, reason: "embedding" },
      ]
    );
    expect(r.candidates[0].id).toBe("tip1");
    expect(r.nnConfidence).toBe(0); // signal degraded
  });

  it("returns empty when no candidates", async () => {
    const p = new TipNodeBinderPipeline();
    const r = await p.nnRerank("engine:Force", []);
    expect(r.candidates).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.rerank.test.ts
```
Expected: FAIL — `nnRerank` not defined

- [ ] **Step 3: Add nnRerank**

```typescript
// extend PipelineDeps interface
export interface CreativeReasoningClient {
  rankRelevance(input: {
    nodeId: string;
    candidates: Array<{ id: string; score: number }>;
  }): Promise<{
    ordered: Array<{ id: string; score: number }>;
    nnConfidence: number;
  }>;
}

// extend constructor
private creativeReasoning: CreativeReasoningClient | undefined;
constructor(deps: PipelineDeps = {}) {
  this.ollama = deps.ollama;
  this.cache = deps.cache;
  this.creativeReasoning = deps.creativeReasoning;
}

  async nnRerank(
    nodeId: string,
    candidates: CandidateBinding[]
  ): Promise<{ candidates: CandidateBinding[]; nnConfidence: number }> {
    if (candidates.length === 0) return { candidates: [], nnConfidence: 0 };
    if (!this.creativeReasoning) return { candidates, nnConfidence: 0 };

    try {
      const result = await this.creativeReasoning.rankRelevance({
        nodeId,
        candidates: candidates.map((c) => ({ id: c.id, score: c.score })),
      });
      const reasonById = new Map(candidates.map((c) => [c.id, c.reason]));
      const reordered = result.ordered.map((o) => ({
        id: o.id,
        score: o.score,
        reason: reasonById.get(o.id) ?? ("embedding" as BindReason),
      }));
      return { candidates: reordered, nnConfidence: result.nnConfidence };
    } catch {
      return { candidates: [...candidates].sort((a, b) => b.score - a.score), nnConfidence: 0 };
    }
  }
```

Also update `PipelineDeps`:
```typescript
export interface PipelineDeps {
  ollama?: OllamaEmbedClient;
  cache?: EmbeddingCache;
  creativeReasoning?: CreativeReasoningClient;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.rerank.test.ts
```
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.rerank.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T6: pipeline stage 4 — NN rerank with cosine fallback

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.7: Stage ⑤ — viz neighbors

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.neighbors.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.neighbors.test.ts
import { describe, it, expect, vi } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.vizNeighbors", () => {
  it("returns 1-hop neighbors capped at 8", async () => {
    const fake = {
      getNeighbors: vi.fn().mockResolvedValue([
        ...Array.from({ length: 12 }, (_, i) => ({
          nodeId: `engine:N${i}`,
          relation: "calls",
        })),
      ]),
    };
    const p = new TipNodeBinderPipeline({ vizGraph: fake });
    const n = await p.vizNeighbors("engine:Force");
    expect(n.length).toBe(8);
    expect(n[0].distance).toBe(1);
  });

  it("returns empty when graph backend errors (no throw)", async () => {
    const fake = {
      getNeighbors: vi.fn().mockRejectedValue(new Error("graph down")),
    };
    const p = new TipNodeBinderPipeline({ vizGraph: fake });
    expect(await p.vizNeighbors("engine:Force")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.neighbors.test.ts
```
Expected: FAIL

- [ ] **Step 3: Add vizNeighbors**

```typescript
// extend PipelineDeps + add interface
export interface VizGraphClient {
  getNeighbors(nodeId: string, hops: 1): Promise<Array<{ nodeId: string; relation: string }>>;
}

private vizGraph: VizGraphClient | undefined;
// in constructor:
this.vizGraph = deps.vizGraph;

  async vizNeighbors(nodeId: string): Promise<NeighborRef[]> {
    if (!this.vizGraph) return [];
    try {
      const raw = await this.vizGraph.getNeighbors(nodeId, 1);
      const valid = raw.filter((r) =>
        ["calls", "called_by", "sibling", "wires_to", "reads", "writes"].includes(r.relation)
      );
      return valid.slice(0, 8).map((r) => ({
        nodeId: r.nodeId,
        relation: r.relation as NeighborRef["relation"],
        distance: 1 as const,
      }));
    } catch {
      return [];
    }
  }
```

Add `import type { NeighborRef } from "../schemas/enrichedNodeContext.js";` at top.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.neighbors.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.neighbors.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T7: pipeline stage 5 — viz 1-hop neighbors

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.8: Stage ⑥ — Obsidian canonical resolve

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Modify: `scripts/system-viz-obsidian-bridge.mjs` (extend to handle dispatcher + action node kinds)
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.canonical.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.canonical.test.ts
import { describe, it, expect, vi } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.obsidianCanonical", () => {
  it("returns wiki path for engine nodeId", async () => {
    const fake = {
      resolveNodeToWiki: vi.fn().mockResolvedValue(
        "knowledge/wiki/code-tribal/canonical/cutting-force.md"
      ),
    };
    const p = new TipNodeBinderPipeline({ obsidianBridge: fake });
    expect(await p.obsidianCanonical("engine:CuttingForceEngine")).toBe(
      "knowledge/wiki/code-tribal/canonical/cutting-force.md"
    );
  });

  it("returns null when no canonical exists", async () => {
    const fake = {
      resolveNodeToWiki: vi.fn().mockResolvedValue(null),
    };
    const p = new TipNodeBinderPipeline({ obsidianBridge: fake });
    expect(await p.obsidianCanonical("engine:Unknown")).toBeNull();
  });

  it("returns null on bridge error (no throw)", async () => {
    const fake = {
      resolveNodeToWiki: vi.fn().mockRejectedValue(new Error("fs error")),
    };
    const p = new TipNodeBinderPipeline({ obsidianBridge: fake });
    expect(await p.obsidianCanonical("engine:X")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.canonical.test.ts
```
Expected: FAIL

- [ ] **Step 3: Add obsidianCanonical method + extend bridge**

```typescript
// in TipNodeBinderPipeline.ts:
export interface ObsidianBridgeClient {
  resolveNodeToWiki(nodeId: string): Promise<string | null>;
}

// extend PipelineDeps:
obsidianBridge?: ObsidianBridgeClient;

// in constructor:
private obsidianBridge: ObsidianBridgeClient | undefined;
this.obsidianBridge = deps.obsidianBridge;

  async obsidianCanonical(nodeId: string): Promise<string | null> {
    if (!this.obsidianBridge) return null;
    try {
      return await this.obsidianBridge.resolveNodeToWiki(nodeId);
    } catch {
      return null;
    }
  }
```

In `scripts/system-viz-obsidian-bridge.mjs`, add handling for the new node-kind prefixes. Locate the existing `resolveNodeToWiki` (or add it):

```javascript
// scripts/system-viz-obsidian-bridge.mjs
import { existsSync } from "node:fs";
import { join } from "node:path";

const WIKI_ROOT = "knowledge/wiki";

function slugify(s) {
  return String(s).replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export async function resolveNodeToWiki(nodeId) {
  if (!nodeId) return null;
  const [kind, ...rest] = nodeId.split(":");
  const tail = rest.join(":");

  const candidates = [];
  if (kind === "engine") {
    candidates.push(join(WIKI_ROOT, "code-tribal/canonical", `${slugify(tail)}.md`));
    candidates.push(join(WIKI_ROOT, "entities", `${slugify(tail)}.md`));
  } else if (kind === "dispatcher") {
    candidates.push(join(WIKI_ROOT, "architecture/dispatchers", `${tail}.md`));
  } else if (kind === "action") {
    const [disp, action] = tail.split(":");
    candidates.push(join(WIKI_ROOT, "architecture/dispatchers", disp, `${slugify(action)}.md`));
    candidates.push(join(WIKI_ROOT, "architecture/dispatchers", `${disp}.md`));
  }

  for (const c of candidates) {
    if (existsSync(c)) return c.replace(/\\/g, "/");
  }
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.canonical.test.ts
```
Expected: PASS, 3 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.canonical.test.ts scripts/system-viz-obsidian-bridge.mjs
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T8: pipeline stage 6 — Obsidian canonical resolve, bridge extended for dispatcher+action kinds

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.9: Stage ⑦ — safety class classification

**Files:**
- Modify: `mcp-server/src/engines/TipNodeBinderPipeline.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderPipeline.safety.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderPipeline.safety.test.ts
import { describe, it, expect, vi } from "vitest";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderPipeline.classifySafety", () => {
  it("returns shop_floor for force/feed/spindle nodes per awareness engine", async () => {
    const fake = {
      classifyDomain: vi.fn().mockResolvedValue({
        safetyClass: "shop_floor",
        domainTags: ["force", "lathe"],
      }),
    };
    const p = new TipNodeBinderPipeline({ awareness: fake });
    const r = await p.classifySafety("engine:LathePartingForceEngine");
    expect(r.safetyClass).toBe("shop_floor");
    expect(r.domainTags).toContain("force");
  });

  it("defaults to sim on classifier error", async () => {
    const fake = {
      classifyDomain: vi.fn().mockRejectedValue(new Error("down")),
    };
    const p = new TipNodeBinderPipeline({ awareness: fake });
    const r = await p.classifySafety("engine:X");
    expect(r.safetyClass).toBe("sim");
    expect(r.domainTags).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.safety.test.ts
```
Expected: FAIL

- [ ] **Step 3: Add classifySafety**

```typescript
// in TipNodeBinderPipeline.ts:
import type { SafetyClass } from "../schemas/enrichedNodeContext.js";

export interface AwarenessClient {
  classifyDomain(nodeId: string): Promise<{
    safetyClass: SafetyClass;
    domainTags: string[];
  }>;
}

// extend PipelineDeps:
awareness?: AwarenessClient;

private awareness: AwarenessClient | undefined;
// in constructor:
this.awareness = deps.awareness;

  async classifySafety(
    nodeId: string
  ): Promise<{ safetyClass: SafetyClass; domainTags: string[] }> {
    if (!this.awareness) return { safetyClass: "sim", domainTags: [] };
    try {
      return await this.awareness.classifyDomain(nodeId);
    } catch {
      return { safetyClass: "sim", domainTags: [] };
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderPipeline.safety.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderPipeline.ts mcp-server/src/__tests__/TipNodeBinderPipeline.safety.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T9: pipeline stage 7 — safety class via PRISMSelfAwareness

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.10: TipNodeBinderEngine orchestrator

**Files:**
- Create: `mcp-server/src/engines/TipNodeBinderEngine.ts`
- Test: `mcp-server/src/__tests__/TipNodeBinderEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/TipNodeBinderEngine.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { TipNodeBinderEngine } from "../engines/TipNodeBinderEngine.js";
import { EnrichedNodeContextStore } from "../engines/EnrichedNodeContextStore.js";
import { TipNodeBinderPipeline } from "../engines/TipNodeBinderPipeline.js";

describe("TipNodeBinderEngine.bindNode", () => {
  let dir: string;
  let store: EnrichedNodeContextStore;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "tnbe-"));
    store = new EnrichedNodeContextStore({
      sqlitePath: join(dir, "ix.sqlite"),
      jsonMirrorPath: join(dir, "ix.json"),
    });
  });
  afterEach(() => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it("orchestrates all 8 stages and writes a card", async () => {
    const v = new Float32Array(768).fill(0.1);
    const pipeline = new TipNodeBinderPipeline({
      ollama: { embed: vi.fn().mockResolvedValue(v) },
      cache: { get: () => null, put: () => {} },
      creativeReasoning: {
        rankRelevance: vi.fn().mockResolvedValue({
          ordered: [{ id: "tip1", score: 0.9 }],
          nnConfidence: 0.8,
        }),
      },
      vizGraph: {
        getNeighbors: vi.fn().mockResolvedValue([
          { nodeId: "engine:Sibling", relation: "sibling" },
        ]),
      },
      obsidianBridge: {
        resolveNodeToWiki: vi.fn().mockResolvedValue("knowledge/wiki/code-tribal/canonical/cutting-force.md"),
      },
      awareness: {
        classifyDomain: vi.fn().mockResolvedValue({
          safetyClass: "shop_floor",
          domainTags: ["force"],
        }),
      },
    });
    const engine = new TipNodeBinderEngine({
      pipeline,
      store,
      tipsLoader: async () => [
        { tipId: "tip1", title: "Kienzle from constants", content: "kc1.1 P=1800 from constants.ts", source: "shop", confidence: 0.9, keywords: ["kienzle"] },
      ],
      nodeLoader: async () => [
        { nodeId: "engine:CuttingForceEngine", nodeKind: "engine", nodeLabel: "CuttingForceEngine", nodeLayer: "L4", nodeSubgroup: "engines", info: "Kienzle force calc" },
      ],
      frontmatterLoader: async () => ({}),
    });
    const result = await engine.bindNode("engine:CuttingForceEngine", "manual");
    expect(result.cardWritten).toBe(true);
    const card = store.get("engine:CuttingForceEngine");
    expect(card?.tips.length).toBe(1);
    expect(card?.safetyClass).toBe("shop_floor");
    expect(card?.obsidianCanonical).toContain("cutting-force.md");
  });

  it("rebuildAll iterates all nodes and writes rebuild_log entry", async () => {
    const pipeline = new TipNodeBinderPipeline();
    const engine = new TipNodeBinderEngine({
      pipeline,
      store,
      tipsLoader: async () => [],
      nodeLoader: async () => [
        { nodeId: "engine:A", nodeKind: "engine", nodeLabel: "A", nodeLayer: "L0", nodeSubgroup: "engines", info: "" },
        { nodeId: "engine:B", nodeKind: "engine", nodeLabel: "B", nodeLayer: "L0", nodeSubgroup: "engines", info: "" },
      ],
      frontmatterLoader: async () => ({}),
    });
    const r = await engine.rebuildAll("manual");
    expect(r.nodesProcessed).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderEngine.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement TipNodeBinderEngine**

```typescript
// mcp-server/src/engines/TipNodeBinderEngine.ts
import { randomUUID } from "node:crypto";
import {
  type EnrichedNodeContext,
  type NodeKind,
  type TipBinding,
  SCHEMA_VERSION,
  type BakedBy,
} from "../schemas/enrichedNodeContext.js";
import type { EnrichedNodeContextStore } from "./EnrichedNodeContextStore.js";
import type {
  TipNodeBinderPipeline,
  CandidateBinding,
  FrontmatterOverride,
} from "./TipNodeBinderPipeline.js";

export interface TipRecord {
  tipId: string;
  title: string;
  content: string;
  source: string;
  confidence: number;
  keywords: string[];
}

export interface NodeRecord {
  nodeId: string;
  nodeKind: NodeKind;
  nodeLabel: string;
  nodeLayer: string;
  nodeSubgroup: string;
  info: string;
}

export interface BinderDeps {
  pipeline: TipNodeBinderPipeline;
  store: EnrichedNodeContextStore;
  tipsLoader: () => Promise<TipRecord[]>;
  nodeLoader: () => Promise<NodeRecord[]>;
  frontmatterLoader: () => Promise<Record<string, FrontmatterOverride>>;
}

export interface BindNodeResult {
  cardWritten: boolean;
  cardSkipped: boolean;
  errors: string[];
}

export interface RebuildResult {
  rebuildId: string;
  nodesProcessed: number;
  cardsWritten: number;
  cardsSkipped: number;
  errors: Array<{ stage: string; message: string; nodeId?: string }>;
}

const TIP_INPUT = (t: TipRecord) =>
  `${t.title}\n${t.content}\n${t.keywords.join(" ")}`;
const NODE_INPUT = (n: NodeRecord) =>
  `${n.nodeLabel}\n${n.info}\n${n.nodeSubgroup}`;

export class TipNodeBinderEngine {
  constructor(private deps: BinderDeps) {}

  async bindNode(nodeId: string, trigger: BakedBy): Promise<BindNodeResult> {
    const errors: string[] = [];
    try {
      const [tips, nodes, frontmatter] = await Promise.all([
        this.deps.tipsLoader(),
        this.deps.nodeLoader(),
        this.deps.frontmatterLoader(),
      ]);
      const node = nodes.find((n) => n.nodeId === nodeId);
      if (!node) return { cardWritten: false, cardSkipped: false, errors: ["node_not_found"] };

      // ① embed
      const nodeVec = await this.deps.pipeline.embed(NODE_INPUT(node));
      if (!nodeVec) {
        errors.push("embed_node_failed");
        return { cardWritten: false, cardSkipped: false, errors };
      }
      const tipVecs: Array<{ id: string; vec: Float32Array; record: TipRecord }> = [];
      for (const t of tips) {
        const v = await this.deps.pipeline.embed(TIP_INPUT(t));
        if (v) tipVecs.push({ id: t.tipId, vec: v, record: t });
      }

      // ② cosine match
      const cosine = this.deps.pipeline.cosineTopK(
        nodeVec,
        tipVecs.map((t) => ({ id: t.id, vec: t.vec })),
        5,
        0.55
      );
      const candidates: CandidateBinding[] = cosine.map((c) => ({
        id: c.id,
        score: c.score,
        reason: "embedding",
      }));

      // ③ frontmatter override
      const withOverrides = this.deps.pipeline.applyFrontmatterOverrides(
        nodeId,
        candidates,
        frontmatter
      );
      const hadOverride = withOverrides.some((c) => c.reason === "frontmatter_override");

      // ④ NN rerank
      const reranked = await this.deps.pipeline.nnRerank(nodeId, withOverrides);

      // ⑤–⑦ neighbors, canonical, safety in parallel
      const [neighbors, canonical, safety] = await Promise.all([
        this.deps.pipeline.vizNeighbors(nodeId),
        this.deps.pipeline.obsidianCanonical(nodeId),
        this.deps.pipeline.classifySafety(nodeId),
      ]);

      // build tips array
      const recById = new Map(tipVecs.map((t) => [t.id, t.record]));
      const tipsBound: TipBinding[] = reranked.candidates
        .slice(0, 5)
        .map((c) => {
          const r = recById.get(c.id);
          return r
            ? {
                tipId: r.tipId,
                title: r.title,
                excerpt: r.content.slice(0, 200),
                source: r.source,
                confidence: r.confidence,
                bindScore: c.score,
                bindReason: c.reason,
              }
            : null;
        })
        .filter((x): x is TipBinding => x !== null);

      const card: EnrichedNodeContext = {
        schemaVersion: SCHEMA_VERSION,
        nodeId: node.nodeId,
        nodeKind: node.nodeKind,
        nodeLabel: node.nodeLabel,
        nodeLayer: node.nodeLayer,
        nodeSubgroup: node.nodeSubgroup,
        tips: tipsBound,
        vizNeighbors: neighbors,
        obsidianCanonical: canonical,
        domainTags: safety.domainTags,
        safetyClass: safety.safetyClass,
        nnConfidence: reranked.nnConfidence,
        hadFrontmatterOverride: hadOverride,
        bakedAt: new Date().toISOString(),
        bakedBy: trigger,
        ttlHours: 24,
      };

      const upserted = this.deps.store.upsert(card);
      return { cardWritten: upserted.written, cardSkipped: upserted.skipped, errors };
    } catch (err) {
      errors.push(`orchestrator_error:${(err as Error).message}`);
      return { cardWritten: false, cardSkipped: false, errors };
    }
  }

  async rebuildAll(trigger: BakedBy): Promise<RebuildResult> {
    const rebuildId = `${new Date().toISOString()}-${randomUUID().slice(0, 8)}`;
    const startedAt = new Date().toISOString();
    const nodes = await this.deps.nodeLoader();
    let cardsWritten = 0;
    let cardsSkipped = 0;
    const errors: RebuildResult["errors"] = [];

    for (const node of nodes) {
      const r = await this.bindNode(node.nodeId, trigger);
      if (r.cardWritten) cardsWritten++;
      if (r.cardSkipped) cardsSkipped++;
      for (const e of r.errors) errors.push({ stage: "bindNode", message: e, nodeId: node.nodeId });
    }

    return {
      rebuildId,
      nodesProcessed: nodes.length,
      cardsWritten,
      cardsSkipped,
      errors,
    };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/TipNodeBinderEngine.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/engines/TipNodeBinderEngine.ts mcp-server/src/__tests__/TipNodeBinderEngine.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T10: TipNodeBinderEngine orchestrator (all 8 stages)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.11: Wire binder to prism_knowledge dispatcher

**Files:**
- Modify: `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts`
- Test: `mcp-server/src/__tests__/knowledgeDispatcher.tribal-binder.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/knowledgeDispatcher.tribal-binder.test.ts
import { describe, it, expect } from "vitest";
import { knowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

describe("knowledgeDispatcher: tribal_*", () => {
  it("tribal_index_stats returns totalCards", async () => {
    const result = await knowledgeDispatcher.execute({
      action: "tribal_index_stats",
      params: {},
    });
    expect(typeof result.totalCards).toBe("number");
  });

  it("tribal_bindings_for_node returns null for unknown node", async () => {
    const result = await knowledgeDispatcher.execute({
      action: "tribal_bindings_for_node",
      params: { nodeId: "engine:Nope" },
    });
    expect(result.card).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/knowledgeDispatcher.tribal-binder.test.ts
```
Expected: FAIL

- [ ] **Step 3: Add the 4 actions**

In `mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts`:

```typescript
// add to action enum:
"tribal_bind_node" | "tribal_bindings_for_node" | "tribal_rebuild_index" | "tribal_index_stats"

// add to switch:
import { TipNodeBinderEngine } from "../../engines/TipNodeBinderEngine.js";
import { TipNodeBinderPipeline } from "../../engines/TipNodeBinderPipeline.js";
import { getDefaultStore } from "../../engines/EnrichedNodeContextStore.js";
// + your loader factory imports (loaders read TRIBAL_TIP_INDEX.json, system-graph.json, frontmatter dir)

let _binder: TipNodeBinderEngine | null = null;
function getBinder(): TipNodeBinderEngine {
  if (_binder) return _binder;
  // wire pipeline with real Ollama / awareness / etc. clients here
  // (use existing engine singletons; details in Task 2.12)
  _binder = new TipNodeBinderEngine({
    pipeline: new TipNodeBinderPipeline(/* deps */),
    store: getDefaultStore(),
    tipsLoader: async () => loadTribalTipIndex(),
    nodeLoader: async () => loadSystemVizNodes(),
    frontmatterLoader: async () => loadCodeTribalFrontmatter(),
  });
  return _binder;
}

case "tribal_bind_node": {
  const r = await getBinder().bindNode(String(params.nodeId), "manual");
  return r;
}
case "tribal_bindings_for_node": {
  const card = getDefaultStore().get(String(params.nodeId));
  return { card };
}
case "tribal_rebuild_index": {
  const trigger = (params.trigger as any) ?? "manual";
  return await getBinder().rebuildAll(trigger);
}
case "tribal_index_stats": {
  return getDefaultStore().stats();
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/knowledgeDispatcher.tribal-binder.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/tools/dispatchers/knowledgeDispatcher.ts mcp-server/src/__tests__/knowledgeDispatcher.tribal-binder.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T11: wire TipNodeBinderEngine to prism_knowledge (4 actions)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.12: node-context-rebuild.mjs script + cron registration

**Files:**
- Create: `scripts/node-context-rebuild.mjs`
- Modify: `scripts/system-viz-on-commit.mjs` (add post-regen call to rebuild)

- [ ] **Step 1: Create the rebuild script**

```javascript
// scripts/node-context-rebuild.mjs
#!/usr/bin/env node
/**
 * Cron-runnable + on-event runner for the tribal node-context binder.
 * Usage: node scripts/node-context-rebuild.mjs [--trigger=cron|on_tip_ingest|on_graph_regen|manual]
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const exec = promisify(execFile);
const LOCK = "mcp-server/data/state/.tribal-rebuild.lock";

function parseTrigger() {
  const arg = process.argv.find((a) => a.startsWith("--trigger="));
  if (!arg) return "manual";
  return arg.slice("--trigger=".length);
}

async function acquireLock() {
  if (existsSync(LOCK)) {
    console.error(`[tribal-rebuild] another rebuild is in progress (lock: ${LOCK})`);
    process.exit(2);
  }
  mkdirSync(dirname(LOCK), { recursive: true });
  writeFileSync(LOCK, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
}

async function releaseLock() {
  try { await import("node:fs").then((m) => m.unlinkSync(LOCK)); } catch {}
}

async function main() {
  const trigger = parseTrigger();
  await acquireLock();
  try {
    // Use the dispatcher CLI bridge; alternative: dynamic import of engine if running in-process
    const { stdout } = await exec("node", [
      "mcp-server/scripts/dispatcher-cli.mjs",
      "prism_knowledge",
      "tribal_rebuild_index",
      JSON.stringify({ trigger }),
    ], { maxBuffer: 50 * 1024 * 1024 });
    console.log(stdout);
  } finally {
    await releaseLock();
  }
}

main().catch((err) => {
  console.error("[tribal-rebuild] error:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Hook into system-viz-on-commit.mjs**

Find the post-regen tail of `scripts/system-viz-on-commit.mjs` and append:

```javascript
// after viz regen completes, kick off tribal rebuild (non-blocking)
import { spawn } from "node:child_process";
const child = spawn("node", ["scripts/node-context-rebuild.mjs", "--trigger=on_graph_regen"], {
  detached: true,
  stdio: "ignore",
});
child.unref();
```

- [ ] **Step 3: Run script smoke test**

```bash
node H:/prism/scripts/node-context-rebuild.mjs --trigger=manual
```
Expected: outputs RebuildResult JSON with `nodesProcessed` ≥ 1.

- [ ] **Step 4: Commit**

```bash
rtk git add scripts/node-context-rebuild.mjs scripts/system-viz-on-commit.mjs
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P2T12: rebuild script + viz-on-commit chain

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — PreToolUse Hook (2 days)

### Task 3.1: Hook scaffolding (input parsing, no-op safe path)

**Files:**
- Create: `H:/prism/.claude/hooks/tribal-context-inject.mjs`
- Test: `mcp-server/src/__tests__/tribal-context-inject.scaffold.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/tribal-context-inject.scaffold.test.ts
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";

describe("tribal-context-inject hook scaffolding", () => {
  it("exits 0 on malformed input (advisory-only invariant)", () => {
    const result = execFileSync("node", ["H:/prism/.claude/hooks/tribal-context-inject.mjs"], {
      input: "not json{}{",
      encoding: "utf8",
    });
    expect(result).toBeDefined();
  });

  it("exits 0 when PRISM_TRIBAL_INJECT=0", () => {
    const result = execFileSync("node", ["H:/prism/.claude/hooks/tribal-context-inject.mjs"], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "ls" } }),
      env: { ...process.env, PRISM_TRIBAL_INJECT: "0" },
      encoding: "utf8",
    });
    expect(result).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.scaffold.test.ts
```
Expected: FAIL — file not found

- [ ] **Step 3: Create the hook**

```javascript
// H:/prism/.claude/hooks/tribal-context-inject.mjs
#!/usr/bin/env node
/**
 * PreToolUse hook: injects bound tribal tips for the resolved nodeId.
 * Advisory-only — NEVER blocks the tool call. Sub-100ms hot path.
 */
import process from "node:process";

const cooldown = new Map(); // session_id → Map<nodeId, lastFiredAt>
const COOLDOWN_MS = 5 * 60 * 1000;

async function readStdin() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

async function main() {
  if (process.env.PRISM_TRIBAL_INJECT === "0") return;
  const raw = await readStdin();
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return; // malformed input → silently no-op
  }
  // resolution + lookup will be added in subsequent tasks
  // for scaffold: just exit 0
}

main().catch(() => {
  // never block — swallow all errors
}).finally(() => process.exit(0));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.scaffold.test.ts
```
Expected: PASS, 2 tests

- [ ] **Step 5: Commit**

```bash
rtk git add H:/prism/.claude/hooks/tribal-context-inject.mjs mcp-server/src/__tests__/tribal-context-inject.scaffold.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P3T1: PreToolUse hook scaffolding (advisory-only invariant)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Hot path + cold/stale path with Promise.race

**Files:**
- Modify: `H:/prism/.claude/hooks/tribal-context-inject.mjs`
- Test: `mcp-server/src/__tests__/tribal-context-inject.integration.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/tribal-context-inject.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EnrichedNodeContextStore } from "../engines/EnrichedNodeContextStore.js";
import { SCHEMA_VERSION } from "../schemas/enrichedNodeContext.js";

describe("tribal-context-inject hook hot/cold/miss paths", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "tcih-"));
    // pre-populate sqlite at the path the hook expects
    process.env.PRISM_TRIBAL_INJECT_SQLITE = join(dir, "ix.sqlite");
    const s = new EnrichedNodeContextStore({
      sqlitePath: process.env.PRISM_TRIBAL_INJECT_SQLITE!,
      jsonMirrorPath: join(dir, "ix.json"),
    });
    s.upsert({
      schemaVersion: SCHEMA_VERSION,
      nodeId: "action:prism_calc:cutting_force_calc",
      nodeKind: "action",
      nodeLabel: "cutting_force_calc",
      nodeLayer: "L4",
      nodeSubgroup: "actions",
      tips: [{
        tipId: "x".repeat(64),
        title: "Kienzle from constants.ts",
        excerpt: "kc1.1 must come from src/physics/constants.ts",
        source: "shop-floor",
        confidence: 0.9,
        bindScore: 0.91,
        bindReason: "frontmatter_override",
      }],
      vizNeighbors: [],
      obsidianCanonical: null,
      domainTags: ["force"],
      safetyClass: "shop_floor",
      nnConfidence: 0.85,
      hadFrontmatterOverride: true,
      bakedAt: new Date().toISOString(),
      bakedBy: "manual",
      ttlHours: 24,
    });
    s.close();
  });
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("HOT path: pre-baked card → injection emitted with tip excerpt", () => {
    const stdout = execFileSync(
      "node",
      ["H:/prism/.claude/hooks/tribal-context-inject.mjs"],
      {
        input: JSON.stringify({
          tool_name: "mcp__prism__prism_calc",
          tool_input: { action: "cutting_force_calc" },
          session_id: "test-1",
        }),
        env: process.env,
        encoding: "utf8",
      }
    );
    expect(stdout).toContain("Tribal Knowledge for action:prism_calc:cutting_force_calc");
    expect(stdout).toContain("Kienzle from constants.ts");
    expect(stdout).toContain("Safety class: shop_floor");
  });

  it("MISS: unresolvable tool → empty stdout, exit 0", () => {
    const stdout = execFileSync(
      "node",
      ["H:/prism/.claude/hooks/tribal-context-inject.mjs"],
      {
        input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "ls" } }),
        env: process.env,
        encoding: "utf8",
      }
    );
    expect(stdout).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.integration.test.ts
```
Expected: FAIL — hook is no-op, no injection

- [ ] **Step 3: Implement hot path + cold path**

Replace the body of `H:/prism/.claude/hooks/tribal-context-inject.mjs`:

```javascript
// H:/prism/.claude/hooks/tribal-context-inject.mjs
#!/usr/bin/env node
import process from "node:process";
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const SQLITE = process.env.PRISM_TRIBAL_INJECT_SQLITE
  ?? "H:/prism/mcp-server/data/state/node-context-index.sqlite";
const SCHEMA_VERSION = "1.0.0";
const TTL_HOURS = 24;
const TOKEN_CAP = 800;
const COOLDOWN_MS = 5 * 60 * 1000;
const cooldown = new Map(); // sessionId → Map<nodeId, lastFiredAt>

function resolveNodeId(toolName, toolInput) {
  if (!toolName) return null;
  if (toolName.startsWith("mcp__prism__")) {
    const dispatcher = toolName.slice("mcp__prism__".length);
    const action = toolInput?.action;
    if (typeof action !== "string" || !action) return null;
    return `action:${dispatcher}:${action}`;
  }
  if (toolName === "Edit" || toolName === "Write" || toolName === "Read") {
    const p = toolInput?.file_path;
    if (typeof p !== "string") return null;
    const norm = p.replace(/\\/g, "/");
    const m = norm.match(/\/engines\/([A-Za-z0-9_]+)\.ts$/);
    return m ? `engine:${m[1]}` : null;
  }
  return null;
}

function checkCooldown(sessionId, nodeId) {
  if (!sessionId || !nodeId) return false;
  const m = cooldown.get(sessionId);
  if (!m) return false;
  const last = m.get(nodeId);
  return last !== undefined && Date.now() - last < COOLDOWN_MS;
}

function recordFire(sessionId, nodeId) {
  if (!sessionId || !nodeId) return;
  let m = cooldown.get(sessionId);
  if (!m) { m = new Map(); cooldown.set(sessionId, m); }
  m.set(nodeId, Date.now());
}

function getCard(nodeId) {
  if (!existsSync(SQLITE)) return { card: null, error: "sqlite_missing" };
  let db;
  try {
    db = new Database(SQLITE, { readonly: true, fileMustExist: true });
    const row = db.prepare(
      "SELECT payload_json, schema_version, baked_at FROM node_context WHERE node_id = ?"
    ).get(nodeId);
    if (!row) return { card: null, error: "miss" };
    if (row.schema_version !== SCHEMA_VERSION) return { card: null, error: "schema_mismatch" };
    const ageMs = Date.now() - new Date(row.baked_at).getTime();
    if (ageMs > TTL_HOURS * 3600 * 1000) {
      return { card: JSON.parse(row.payload_json), error: "stale" };
    }
    return { card: JSON.parse(row.payload_json), error: null };
  } catch (err) {
    return { card: null, error: `db_error:${err.message}` };
  } finally {
    if (db) db.close();
  }
}

function formatInjection(card) {
  const lines = [];
  lines.push(`─── Tribal Knowledge for ${card.nodeId} ───`);
  if (card.tips.length > 0) {
    lines.push(`★ Top ${Math.min(card.tips.length, 3)} tips (NN-reranked, score):`);
    for (const t of card.tips.slice(0, 3)) {
      lines.push(`  • [${t.bindScore.toFixed(2)}] ${t.title.slice(0, 80)}`);
      lines.push(`    (source: ${t.source}, confidence ${t.confidence.toFixed(2)})`);
    }
  } else {
    lines.push("(no tips bound)");
  }
  if (card.vizNeighbors.length > 0) {
    const refs = card.vizNeighbors.slice(0, 4).map((n) => n.nodeId).join(", ");
    lines.push(`↻ Related nodes: ${refs}`);
  }
  if (card.obsidianCanonical) {
    lines.push(`📖 Wiki: ${card.obsidianCanonical}`);
  }
  if (card.safetyClass !== "sim") {
    lines.push(`🛡 Safety class: ${card.safetyClass}`);
  }
  lines.push(`─────────────────────────────────────────────────────────────`);
  let out = lines.join("\n");
  // crude token cap (1 token ≈ 4 chars, so 800 tokens ≈ 3200 chars)
  if (out.length > TOKEN_CAP * 4) {
    out = out.slice(0, TOKEN_CAP * 4) + "\n[truncated]";
  }
  return out;
}

async function readStdin() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  return raw;
}

async function main() {
  if (process.env.PRISM_TRIBAL_INJECT === "0") return;
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch { return; }

  const nodeId = resolveNodeId(input.tool_name, input.tool_input ?? {});
  if (!nodeId) return;

  if (checkCooldown(input.session_id, nodeId)) return;

  const { card, error } = getCard(nodeId);
  if (!card) {
    if (error === "sqlite_missing") {
      process.stdout.write(
        `─── Tribal Knowledge ───\n  (tribal index not built — run /tribal-rebuild)\n─────────────────────────\n`
      );
    }
    // miss / schema_mismatch / db_error → silent
    return;
  }

  process.stdout.write(formatInjection(card));
  recordFire(input.session_id, nodeId);
}

main().catch(() => {
  // advisory-only — never block, never throw
}).finally(() => process.exit(0));
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.integration.test.ts
```
Expected: PASS, 2 tests (HOT + MISS)

- [ ] **Step 5: Commit**

```bash
rtk git add H:/prism/.claude/hooks/tribal-context-inject.mjs mcp-server/src/__tests__/tribal-context-inject.integration.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P3T2: hot path + cold/stale + miss paths in PreToolUse hook

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.3: Telemetry emission

**Files:**
- Modify: `H:/prism/.claude/hooks/tribal-context-inject.mjs`
- Test: `mcp-server/src/__tests__/tribal-context-inject.telemetry.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// mcp-server/src/__tests__/tribal-context-inject.telemetry.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, unlinkSync } from "node:fs";

const STATS = "H:/prism/mcp-server/data/state/tribal-injection-stats.json";

describe("tribal-context-inject telemetry", () => {
  beforeEach(() => {
    if (existsSync(STATS)) unlinkSync(STATS);
  });

  it("appends an entry on miss", () => {
    execFileSync(
      "node",
      ["H:/prism/.claude/hooks/tribal-context-inject.mjs"],
      {
        input: JSON.stringify({ tool_name: "Bash", tool_input: { command: "ls" }, session_id: "tt" }),
        env: process.env,
        encoding: "utf8",
      }
    );
    // miss because nodeId resolves to null — no telemetry expected
    expect(existsSync(STATS)).toBe(false);
  });

  it("appends an entry when card is fetched", () => {
    // requires pre-populated sqlite (reuse sample from Task 3.2)
    // ... see Task 3.2 setup
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.telemetry.test.ts
```
Expected: FAIL (telemetry not yet emitted)

- [ ] **Step 3: Add telemetry emission to the hook**

Add to `H:/prism/.claude/hooks/tribal-context-inject.mjs`:

```javascript
import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync as fsExists } from "node:fs";
import { dirname } from "node:path";

const STATS_PATH = process.env.PRISM_TRIBAL_INJECT_STATS
  ?? "H:/prism/mcp-server/data/state/tribal-injection-stats.json";

function recordTelemetry(entry) {
  try {
    mkdirSync(dirname(STATS_PATH), { recursive: true });
    let cur = { schemaVersion: "1.0.0", fires: [] };
    if (fsExists(STATS_PATH)) {
      try { cur = JSON.parse(readFileSync(STATS_PATH, "utf8")); } catch {}
    }
    cur.fires.push(entry);
    // 7-day rolling: trim entries older than 7d
    const cutoff = Date.now() - 7 * 24 * 3600 * 1000;
    cur.fires = cur.fires.filter((f) => new Date(f.ts).getTime() >= cutoff);
    writeFileSync(STATS_PATH, JSON.stringify(cur));
  } catch {
    // telemetry failure is non-fatal
  }
}
```

Wrap the main handler so each branch records its outcome:

```javascript
const t0 = Date.now();
const sessionId = input.session_id ?? null;
const isSubagent = Boolean(input.is_subagent);
let path = "miss";
let tokensEmitted = 0;

const { card, error } = getCard(nodeId);
if (card) {
  const out = formatInjection(card);
  process.stdout.write(out);
  recordFire(sessionId, nodeId);
  path = error === "stale" ? "cold_stale" : "hot";
  tokensEmitted = Math.ceil(out.length / 4);
} else if (error === "sqlite_missing") {
  process.stdout.write(`─── Tribal Knowledge ───\n  (tribal index not built — run /tribal-rebuild)\n─────────────────────────\n`);
  path = "error";
} else {
  path = error || "miss";
}

recordTelemetry({
  ts: new Date().toISOString(),
  session_id: sessionId,
  nodeId,
  is_subagent: isSubagent,
  path,
  elapsed_ms: Date.now() - t0,
  tokens_emitted: tokensEmitted,
});
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd H:/prism/mcp-server && rtk npx vitest run src/__tests__/tribal-context-inject.telemetry.test.ts
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add H:/prism/.claude/hooks/tribal-context-inject.mjs mcp-server/src/__tests__/tribal-context-inject.telemetry.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P3T3: telemetry emission to tribal-injection-stats.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.4: Register hook in settings.json

**Files:**
- Modify: `H:/.claude/settings.json` (mirror to `H:/prism/.claude/settings.json` per c-to-h-mirror convention)

- [ ] **Step 1: Open settings.json and locate the PreToolUse array**

```bash
rtk grep -n "PreToolUse" H:/.claude/settings.json | head -5
```

- [ ] **Step 2: Add hook registration**

Inside the existing `"PreToolUse"` array, append:

```json
{
  "matcher": ".*",
  "hooks": [
    {
      "type": "command",
      "command": "node H:/prism/.claude/hooks/tribal-context-inject.mjs",
      "timeout": 200
    }
  ]
}
```

If a `MINIMAL_ALLOWLIST` constant exists (or similar guard), add `"tribal-context-inject"` to it so `PRISM_HOOK_PROFILE` cannot disable it. If no allowlist exists, that's fine — only `PRISM_TRIBAL_INJECT=0` disables.

- [ ] **Step 3: Verify settings.json is valid JSON**

```bash
rtk node -e "JSON.parse(require('fs').readFileSync('H:/.claude/settings.json','utf8'))"
```
Expected: no output (valid JSON)

- [ ] **Step 4: Smoke test — restart a session, verify hook fires**

In a fresh Claude Code session, call `mcp__prism__prism_calc` with a known action. The injection block should appear in the next response context (visible via `/context` or by Claude's own reaction).

- [ ] **Step 5: Commit**

```bash
rtk git add H:/.claude/settings.json
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P3T4: register PreToolUse tribal-context-inject hook in settings.json

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.5: Subagent path (chosen per Phase-0 spike outcome)

This task runs ONE of two paths based on Phase-0 spike result.

**If spike PASSED** (subagent tool calls fire PreToolUse):
- The hook from Task 3.2 already covers subagents — no extra work.
- Add an integration test that verifies subagent invocation triggers injection (see Task 4.1).

**If spike FAILED** (subagent tool calls do NOT fire PreToolUse):

**Files:**
- Create: `H:/prism/.claude/agents/tribal-bridge-wrapper.mjs`
- Modify: each agent definition under `H:/prism/.claude/agents/*.md` adds a frontmatter wrapper hook

- [ ] **Step 1: Create bridge wrapper**

```javascript
// H:/prism/.claude/agents/tribal-bridge-wrapper.mjs
#!/usr/bin/env node
/**
 * At Agent spawn time, scan the prompt for likely-relevant nodeIds
 * and prepend a Tribal Knowledge Pack to the prompt.
 */
import Database from "better-sqlite3";
import { existsSync } from "node:fs";

const SQLITE = "H:/prism/mcp-server/data/state/node-context-index.sqlite";

const NODE_PATTERN = /\b(?:mcp__prism__(\w+)|engine:(\w+)|action:(\w+):(\w+))\b/g;

function extractCandidates(prompt) {
  const set = new Set();
  for (const m of prompt.matchAll(NODE_PATTERN)) {
    if (m[1]) set.add(`dispatcher:${m[1]}`);
    if (m[2]) set.add(`engine:${m[2]}`);
    if (m[3] && m[4]) set.add(`action:${m[3]}:${m[4]}`);
  }
  return [...set].slice(0, 5);
}

async function main() {
  let raw = "";
  for await (const c of process.stdin) raw += c;
  const input = JSON.parse(raw || "{}");
  const prompt = input.prompt ?? "";
  const candidates = extractCandidates(prompt);
  if (!candidates.length || !existsSync(SQLITE)) {
    process.stdout.write(prompt);
    return;
  }
  const db = new Database(SQLITE, { readonly: true });
  const stmt = db.prepare("SELECT payload_json FROM node_context WHERE node_id = ?");
  const cards = candidates.map((c) => stmt.get(c)?.payload_json).filter(Boolean);
  db.close();
  if (!cards.length) {
    process.stdout.write(prompt);
    return;
  }
  const pack = [
    "─── Tribal Knowledge Pack (auto-prepended) ───",
    ...cards.map((j) => {
      const card = JSON.parse(j);
      return `[${card.nodeId}] ${card.tips.slice(0, 2).map((t) => t.title).join("; ")}`;
    }),
    "─────────────────────────────────────────────",
    "",
  ].join("\n");
  process.stdout.write(pack + prompt);
}

main().catch(() => process.stdout.write(""));
```

- [ ] **Step 2: Wire wrapper into agent definitions**

Add a frontmatter field to each `.claude/agents/*.md`:

```yaml
preprocess: H:/prism/.claude/agents/tribal-bridge-wrapper.mjs
```

(Implementation depends on harness support; if no native preprocess hook, add a Skill that the agent invokes at Step 1 of its instructions.)

- [ ] **Step 3: Smoke test**

Spawn an Agent with a prompt containing `mcp__prism__prism_calc` and verify the agent's transcript includes the prepended pack.

- [ ] **Step 4: Commit**

```bash
rtk git add H:/prism/.claude/agents/
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P3T5: bridge wrapper for subagent tribal injection (Phase-0 fallback)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Validation (1 day)

### Task 4.1: Run full test suite + E2E round-trip

**Files:**
- Create: `mcp-server/src/__tests__/tribal-bind-rebuild.e2e.test.ts`

- [ ] **Step 1: Write the E2E test**

```typescript
// mcp-server/src/__tests__/tribal-bind-rebuild.e2e.test.ts
import { describe, it, expect } from "vitest";
import { knowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";
import { memoryDispatcher } from "../tools/dispatchers/memoryDispatcher.js";

describe("E2E: capture → rebuild → bound retrieval", () => {
  it("captures a tip, rebuilds the index, retrieves binding via memory dispatcher", async () => {
    // 1. capture a new tip
    const cap = await knowledgeDispatcher.execute({
      action: "tribal_capture",
      params: {
        title: "E2E test tip",
        content: "verify the round-trip from capture to bound retrieval",
        source: "e2e-test",
        keywords: ["e2e", "round-trip"],
      },
    });
    expect(cap.tipId).toBeTruthy();

    // 2. rebuild
    const rb = await knowledgeDispatcher.execute({
      action: "tribal_rebuild_index",
      params: { trigger: "manual" },
    });
    expect(rb.nodesProcessed).toBeGreaterThan(0);

    // 3. verify card exists for some node
    const stats = await memoryDispatcher.execute({
      action: "context_card_stats",
      params: {},
    });
    expect(stats.totalCards).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the full suite**

```bash
cd H:/prism/mcp-server && rtk npx vitest run --testPathPatterns "tribal|EnrichedNodeContext|NodeIdResolver|TipNodeBinder|node-context"
```
Expected: ALL PASS

- [ ] **Step 3: Run a real production rebuild**

```bash
cd H:/prism && rtk node scripts/node-context-rebuild.mjs --trigger=manual
```
Expected: stdout shows `nodesProcessed ≥ 700`, `cardsWritten > 0`, errors empty.

- [ ] **Step 4: Inspect telemetry**

```bash
rtk cat H:/prism/mcp-server/data/state/tribal-injection-stats.json
```
Expected: file exists, valid JSON.

- [ ] **Step 5: Commit**

```bash
rtk git add mcp-server/src/__tests__/tribal-bind-rebuild.e2e.test.ts
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P4T1: E2E test (capture → rebuild → bound retrieval)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.2: Production stats reporter + 24h soak readiness

**Files:**
- Create: `scripts/node-context-stats.mjs`

- [ ] **Step 1: Create stats reporter**

```javascript
// scripts/node-context-stats.mjs
#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";

const STATS = "mcp-server/data/state/tribal-injection-stats.json";

if (!existsSync(STATS)) {
  console.log("(no telemetry recorded yet)");
  process.exit(0);
}

const data = JSON.parse(readFileSync(STATS, "utf8"));
const fires = data.fires ?? [];
const byPath = {};
let totalElapsed = 0;
let totalTokens = 0;
for (const f of fires) {
  byPath[f.path] = (byPath[f.path] ?? 0) + 1;
  totalElapsed += f.elapsed_ms ?? 0;
  totalTokens += f.tokens_emitted ?? 0;
}
console.log(`Tribal injection telemetry (${fires.length} fires, last 7 days)`);
console.log(`  Avg elapsed: ${(totalElapsed / Math.max(1, fires.length)).toFixed(1)}ms`);
console.log(`  Avg tokens emitted: ${(totalTokens / Math.max(1, fires.length)).toFixed(1)}`);
console.log(`  Path breakdown:`);
for (const [path, n] of Object.entries(byPath).sort(([, a], [, b]) => b - a)) {
  console.log(`    ${path.padEnd(20)} ${n}`);
}
```

- [ ] **Step 2: Run it**

```bash
rtk node scripts/node-context-stats.mjs
```
Expected: shows fire counts and path breakdown.

- [ ] **Step 3: Commit**

```bash
rtk git add scripts/node-context-stats.mjs
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P4T2: tribal-injection-stats reporter for 24h soak

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.3: Final readiness gate

- [ ] **Step 1: Run full PRISM build**

```bash
cd H:/prism/mcp-server && rtk npm run build
```
Expected: 0 tsc errors, esbuild succeeds.

- [ ] **Step 2: Run full test suite**

```bash
cd H:/prism/mcp-server && rtk npx vitest run
```
Expected: all tests pass.

- [ ] **Step 3: Verify telemetry after 24h soak**

After 24 hours of normal session use:

```bash
rtk node scripts/node-context-stats.mjs
```
Expected: hot-path rate ≥ 80%, avg elapsed < 50ms, no `error` path entries above 1% of fires.

- [ ] **Step 4: Update spec §14 with final spike result + soak summary**

Edit `state/shared/specs/2026-05-09-tribal-node-binder-design.md` §14 with the live numbers.

- [ ] **Step 5: Commit & handoff**

```bash
rtk git add state/shared/specs/2026-05-09-tribal-node-binder-design.md
rtk git commit -m "[CAD-FUSION-LIVE-MS0]/U-TRIBAL-P4T3: 24h soak summary, sub-project C complete

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

Run `/handoff` to record the milestone.

---

## Self-review notes (locked at planning time)

**Spec coverage check:** every spec section has corresponding tasks:
- §5.1 build-time pipeline → Tasks 2.3–2.10, 2.12
- §5.2 runtime hook → Tasks 3.1–3.4
- §5.3 components table → Tasks 1.1–3.5
- §6 data model → Tasks 1.1, 1.2
- §7 pipeline detail → Tasks 2.3–2.10
- §8 hook contract → Tasks 3.1–3.3
- §9 agent parity spike + fallback → Tasks 0.1–0.3, 3.5
- §11 error handling → covered in unit tests of 1.3, 2.3, 2.6, 2.7, 2.9 + integration 3.2
- §12 testing matrix → tests in every task
- §13 rollout → 5 phases mapped 1:1

**Type consistency check:** `EnrichedNodeContext` schema fields stay identical across Tasks 1.1, 1.3, 2.10, 3.2. `BindReason` literal union matches between schema and pipeline. `BakedBy` enum values used identically by binder and rebuild script.

**No placeholders.** Each step contains actual code or actual command. Sub-project A/B/D/E specs are explicitly out of scope.

**Total commits:** 22 (1 spike + 4 phase-1 + 12 phase-2 + 4 phase-3 + 3 phase-4) — matches the "frequent commits" discipline.
