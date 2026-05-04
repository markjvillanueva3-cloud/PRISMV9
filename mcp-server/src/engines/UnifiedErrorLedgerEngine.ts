/**
 * UnifiedErrorLedgerEngine.ts — centralized write+embed for error ledger
 * ====================================================================
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03.
 *
 * Single point of entry for every error-capture hook in the system.
 * Validates entries against the canonical Zod schema, appends to
 * `mcp-server/data/state/UNIFIED_ERROR_LEDGER.jsonl`, dedupes via
 * content hash in `UNIFIED_ERROR_LEDGER.index.json`, and (when an
 * embedder is wired through QdrantMemoryEngineSingleton) embeds the
 * normalized signature into the Qdrant `error` collection so future
 * prewarn passes can query vector neighbors.
 *
 * Designed to never throw: every method returns
 * `{ ok: true, ... } | { ok: false, error }` so hooks can stay short
 * and don't need try/catch around routine writes.
 *
 * @module engines/UnifiedErrorLedgerEngine
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P2-U03
 * @version 1.0.0
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import {
  unifiedErrorLedgerEntrySchema,
  buildErrorSignature,
  type UnifiedErrorLedgerEntry,
  type ErrorLedgerSource,
} from "../schemas/unifiedErrorLedger.js";

const STATE_DIR = "H:/prism/mcp-server/data/state";
const LEDGER = path.join(STATE_DIR, "UNIFIED_ERROR_LEDGER.jsonl");
const INDEX = path.join(STATE_DIR, "UNIFIED_ERROR_LEDGER.index.json");
const MAX_TAIL_BYTES = 256 * 1024;

interface LedgerIndex {
  schemaVersion: string;
  hashes: Record<string, { ts: string; source: string }>;
}

export interface AppendInput {
  source: ErrorLedgerSource;
  tool?: string;
  errorClass?: string;
  message?: string;
  context?: Record<string, unknown>;
  ts?: string;
  id?: string;
}

export type AppendResult =
  | { ok: true; entry: UnifiedErrorLedgerEntry; deduped: false }
  | { ok: true; entry: UnifiedErrorLedgerEntry; deduped: true }
  | { ok: false; error: string };

export type EmbedResult =
  | { ok: true; embeddingId: string }
  | { ok: false; error: string };

export interface RecallHit {
  id: string;
  score?: number;
  signature?: string;
  source?: string;
  ts?: string;
}

class UnifiedErrorLedgerEngineImpl {
  private ensureDir(d: string): void {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  private loadIndex(): LedgerIndex {
    if (!fs.existsSync(INDEX)) return { schemaVersion: "1.0.0", hashes: {} };
    try {
      const parsed = JSON.parse(fs.readFileSync(INDEX, "utf8")) as Partial<LedgerIndex>;
      return {
        schemaVersion: parsed.schemaVersion ?? "1.0.0",
        hashes: parsed.hashes ?? {},
      };
    } catch {
      return { schemaVersion: "1.0.0", hashes: {} };
    }
  }

  private saveIndex(idx: LedgerIndex): void {
    this.ensureDir(path.dirname(INDEX));
    fs.writeFileSync(INDEX, JSON.stringify(idx, null, 2));
  }

  private hashEntry(e: { source: string; signature: string; ts: string; tool?: string }): string {
    const stable = JSON.stringify({ source: e.source, signature: e.signature, ts: e.ts, tool: e.tool ?? "" });
    return createHash("sha1").update(stable).digest("hex").slice(0, 16);
  }

  private newId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Validate + append a single entry. Idempotent — duplicates (same
   * source+signature+ts+tool) are silently dropped.
   */
  append(input: AppendInput): AppendResult {
    const ts = input.ts ?? new Date().toISOString();
    const id = input.id ?? this.newId(input.source);
    const signature = buildErrorSignature({
      errorClass: input.errorClass,
      message: input.message,
      tool: input.tool,
    });
    const candidate: UnifiedErrorLedgerEntry = {
      id,
      ts,
      source: input.source,
      tool: input.tool,
      context: input.context,
      signature,
      embedding_id: null,
    };
    const v = unifiedErrorLedgerEntrySchema.safeParse(candidate);
    if (!v.success) {
      return { ok: false, error: `schema-validation-failed: ${v.error.issues.map((i) => i.message).join("; ")}` };
    }
    const entry = v.data as UnifiedErrorLedgerEntry;
    const idx = this.loadIndex();
    const h = this.hashEntry(entry);
    if (idx.hashes[h]) {
      return { ok: true, entry, deduped: true };
    }
    try {
      this.ensureDir(path.dirname(LEDGER));
      fs.appendFileSync(LEDGER, JSON.stringify(entry) + "\n");
      idx.hashes[h] = { ts: entry.ts, source: entry.source };
      this.saveIndex(idx);
      return { ok: true, entry, deduped: false };
    } catch (e) {
      return { ok: false, error: `write-failed: ${e instanceof Error ? e.message : String(e)}` };
    }
  }

  /**
   * Embed a previously appended entry's signature into the Qdrant
   * `error` collection. Updates the entry's embedding_id in the
   * in-memory copy; the ledger row itself is left immutable. Best-effort —
   * returns ok:false when Qdrant/Ollama are unreachable.
   */
  async embed(entry: UnifiedErrorLedgerEntry): Promise<EmbedResult> {
    try {
      const mod = await import("./QdrantMemoryEngineSingleton.js");
      const engine = mod.QdrantMemoryEngineSingleton.getInstance();
      const text = `${entry.signature}\n\nsource=${entry.source}\ntool=${entry.tool ?? ""}`.slice(0, 8192);
      const r = await engine.remember({
        kind: "error",
        id: entry.id,
        text,
        metadata: {
          source: entry.source,
          tool: entry.tool ?? "",
          ts: entry.ts,
          signature: entry.signature,
        },
      });
      if (!r.ok) return { ok: false, error: r.error ?? "remember-failed" };
      return { ok: true, embeddingId: entry.id };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Combined: append + embed + (best-effort) update the ledger row's
   * embedding_id field. Embedding failures are non-fatal.
   */
  async appendAndEmbed(input: AppendInput): Promise<AppendResult & { embedded?: boolean; embedError?: string }> {
    const r = this.append(input);
    if (!r.ok) return r;
    const e = await this.embed(r.entry);
    return e.ok
      ? { ...r, embedded: true }
      : { ...r, embedded: false, embedError: e.error };
  }

  /** Return the most recent N entries (tail-read). */
  getRecent(limit = 50, sourceFilter?: ErrorLedgerSource): UnifiedErrorLedgerEntry[] {
    if (!fs.existsSync(LEDGER)) return [];
    let content: string;
    try {
      const stat = fs.statSync(LEDGER);
      if (stat.size > MAX_TAIL_BYTES) {
        const fd = fs.openSync(LEDGER, "r");
        const buf = Buffer.alloc(MAX_TAIL_BYTES);
        fs.readSync(fd, buf, 0, MAX_TAIL_BYTES, stat.size - MAX_TAIL_BYTES);
        fs.closeSync(fd);
        content = buf.toString("utf8");
        const firstNl = content.indexOf("\n");
        if (firstNl > 0) content = content.slice(firstNl + 1);
      } else {
        content = fs.readFileSync(LEDGER, "utf8");
      }
    } catch {
      return [];
    }
    const lines = content.split(/\r?\n/).filter(Boolean);
    const out: UnifiedErrorLedgerEntry[] = [];
    for (let i = lines.length - 1; i >= 0 && out.length < limit; i--) {
      try {
        const row = JSON.parse(lines[i]) as UnifiedErrorLedgerEntry;
        if (sourceFilter && row.source !== sourceFilter) continue;
        out.push(row);
      } catch { /* skip malformed */ }
    }
    return out;
  }

  /**
   * Search Qdrant for similar past errors by signature. Returns hits
   * with score+metadata; gracefully returns empty array if Qdrant
   * is unreachable so callers can degrade to local pattern lookup.
   */
  async recallSimilar(signature: string, limit = 3): Promise<RecallHit[]> {
    try {
      const mod = await import("./QdrantMemoryEngineSingleton.js");
      const engine = mod.QdrantMemoryEngineSingleton.getInstance();
      const r = await engine.recall({ kind: "error", query: signature, limit });
      if (!r.ok) return [];
      return r.value.map((it) => ({
        id: String(it.id),
        score: it.score,
        signature: typeof it.metadata?.signature === "string" ? (it.metadata.signature as string) : undefined,
        source: typeof it.metadata?.source === "string" ? (it.metadata.source as string) : undefined,
        ts: typeof it.metadata?.ts === "string" ? (it.metadata.ts as string) : undefined,
      }));
    } catch {
      return [];
    }
  }

  /** Test helper: drop the in-memory cache so the next read hits disk. */
  reset(): void { /* no in-memory cache currently — placeholder for future LRU */ }
}

export const unifiedErrorLedgerEngine = new UnifiedErrorLedgerEngineImpl();
