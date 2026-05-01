/**
 * PersistenceBridge — Write-Through Cache for Business Engine Data
 * ================================================================
 *
 * Bridges the synchronous in-memory Maps in business engines with the
 * async IBusinessStore persistence layer. Engines keep their Maps for
 * fast synchronous reads; the bridge ensures writes are durably persisted.
 *
 * Pattern:
 *   - At startup: loadAll() fills engine Maps from the store
 *   - After mutation: persist(entity, key, value) queues write with confirmation
 *   - At shutdown: gracefulShutdown() drains queue with timeout
 *
 * This avoids making engine APIs async (which would break all callers).
 *
 * Post-review fixes: C2 (error logging + retry), H5 (flush mutex),
 * M5 (paginated load), M8 (reset for tests).
 * INFRA-1-2: Write confirmation, 3 retries with backoff, pool=50, graceful shutdown with timeout.
 *
 * @version 1.2.0 — Session INFRA-1-2 (U-PER1)
 */

import { getStore, initPersistence, type StoreRecord } from "./BusinessStore.js";

// ─── Types ──────────────────────────────────────────────────────────────────

interface EntityRegistration<T extends StoreRecord> {
  entity: string;
  getMap: () => Map<string, T>;
  setMap?: (data: T[]) => void;
  getArray?: () => T[];
  setArray?: (data: T[]) => void;
  toRecord: (value: T) => StoreRecord;
  fromRecord: (record: StoreRecord) => T;
  keyField: string;
}

interface PendingWrite {
  entity: string;
  key: string;
  value: StoreRecord | null; // null = delete
  retries: number;
  /** Resolve callback for write confirmation (INFRA-1-2) */
  resolve?: (ok: boolean) => void;
}

/** Max retries with exponential backoff: 100ms, 200ms, 400ms (INFRA-1-2) */
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 100;

/** Connection pool target (INFRA-1-2: up from 20) */
export const POOL_SIZE = 50;

/** Graceful shutdown drain timeout (INFRA-1-2) */
const SHUTDOWN_TIMEOUT_MS = 10_000;

// ─── Bridge ─────────────────────────────────────────────────────────────────

class PersistenceBridgeImpl {
  private registrations: EntityRegistration<any>[] = [];
  private pendingWrites: PendingWrite[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;
  private flushPromise: Promise<{ flushed: number; errors: number }> | null = null;
  private initialized = false;
  private mode: "postgres" | "memory" = "memory";

  // C2: error tracking for health checks
  private totalFlushed = 0;
  private totalErrors = 0;
  private lastError: string | null = null;

  registerMap<T extends StoreRecord>(config: {
    entity: string;
    getMap: () => Map<string, T>;
    keyField: string;
    toRecord?: (value: T) => StoreRecord;
    fromRecord?: (record: StoreRecord) => T;
  }): void {
    this.registrations.push({
      entity: config.entity,
      getMap: config.getMap,
      keyField: config.keyField,
      toRecord: config.toRecord ?? ((v) => v as StoreRecord),
      fromRecord: config.fromRecord ?? ((r) => r as T),
    });
  }

  registerArray<T extends StoreRecord>(config: {
    entity: string;
    getArray: () => T[];
    setArray: (data: T[]) => void;
    keyField: string;
    toRecord?: (value: T) => StoreRecord;
    fromRecord?: (record: StoreRecord) => T;
  }): void {
    this.registrations.push({
      entity: config.entity,
      getMap: () => new Map(),
      getArray: config.getArray,
      setArray: config.setArray,
      keyField: config.keyField,
      toRecord: config.toRecord ?? ((v) => v as StoreRecord),
      fromRecord: config.fromRecord ?? ((r) => r as T),
    });
  }

  /**
   * Initialize persistence and load all registered data from the store.
   * Call once at server startup after all engines have registered.
   * M5 fix: paginates through all rows instead of capping at 50k.
   */
  async loadAll(): Promise<{ mode: "postgres" | "memory"; loaded: Record<string, number> }> {
    const { mode } = await initPersistence();
    this.mode = mode;
    this.initialized = true;

    const loaded: Record<string, number> = {};

    if (mode === "memory") {
      return { mode, loaded };
    }

    for (const reg of this.registrations) {
      try {
        const store = getStore<StoreRecord>(reg.entity);
        let allRows: StoreRecord[] = [];
        let offset = 0;
        const pageSize = 5000;

        // M5 fix: paginated load
        while (true) {
          const page = await store.findAll({ limit: pageSize, offset });
          if (!page.ok || page.data.length === 0) break;
          allRows = allRows.concat(page.data);
          if (page.data.length < pageSize) break; // last page
          offset += pageSize;
        }

        if (allRows.length > 0) {
          if (reg.setArray) {
            reg.setArray(allRows.map((r) => reg.fromRecord(r)));
          } else {
            const map = reg.getMap();
            for (const record of allRows) {
              const item = reg.fromRecord(record);
              const key = String(item[reg.keyField] ?? record.id);
              map.set(key, item);
            }
          }
        }
        loaded[reg.entity] = allRows.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[PersistenceBridge] Failed to load ${reg.entity}: ${msg}`);
        loaded[reg.entity] = -1;
      }
    }

    return { mode, loaded };
  }

  /**
   * Persist a single record after an engine mutation.
   * INFRA-1-2: Returns a confirmation promise. Callers can await for write safety,
   * or ignore the promise for backward-compatible fire-and-forget behavior.
   */
  persist(entity: string, key: string, value: StoreRecord | null): Promise<boolean> {
    if (this.mode === "memory" || !this.initialized) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      this.pendingWrites.push({ entity, key, value, retries: 0, resolve });
      this.scheduleFlush();
    });
  }

  persistAppend(entity: string, value: StoreRecord): Promise<boolean> {
    if (this.mode === "memory" || !this.initialized) return Promise.resolve(true);
    return new Promise<boolean>((resolve) => {
      this.pendingWrites.push({ entity, key: "", value, retries: 0, resolve });
      this.scheduleFlush();
    });
  }

  /**
   * Flush all pending writes to the store. H5 fix: mutex prevents concurrent execution.
   * C2 fix: logs errors and retries failed writes once.
   */
  async flushAll(): Promise<{ flushed: number; errors: number }> {
    // H5 fix: if already flushing, wait for current flush then re-flush remaining
    if (this.flushing) {
      if (this.flushPromise) {
        await this.flushPromise;
        // After the first flush completes, if there are pending writes, flush again
        if (this.pendingWrites.length > 0 && !this.flushing) {
          return this.flushAll();
        }
      }
      return { flushed: 0, errors: 0 };
    }
    this.flushing = true;

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    const writes = [...this.pendingWrites];
    this.pendingWrites = [];

    let flushed = 0;
    let errors = 0;
    const retryQueue: PendingWrite[] = [];

    for (const write of writes) {
      try {
        const store = getStore<StoreRecord>(write.entity);
        if (write.value === null) {
          await store.delete(write.key);
        } else if (write.key) {
          const existing = await store.findByField(
            this.getKeyField(write.entity),
            write.key
          );
          if (existing.ok && existing.data) {
            await store.update(String(existing.data.id), write.value);
          } else {
            await store.save(write.value);
          }
        } else {
          await store.save(write.value);
        }
        flushed++;
        write.resolve?.(true); // INFRA-1-2: confirm success
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[PersistenceBridge] Write failed for ${write.entity}` +
          `${write.key ? ` key=${write.key}` : ""} (attempt ${write.retries + 1}/${MAX_RETRIES}): ${msg}`
        );
        this.lastError = `${write.entity}: ${msg}`;

        // INFRA-1-2: retry with exponential backoff up to MAX_RETRIES
        if (write.retries < MAX_RETRIES - 1) {
          const delay = RETRY_BASE_MS * Math.pow(2, write.retries);
          retryQueue.push({ ...write, retries: write.retries + 1 });
          // Stagger retries so they don't all fire at once
          if (retryQueue.length === 1) {
            setTimeout(() => this.scheduleFlush(), delay);
          }
        } else {
          console.error(
            `[PersistenceBridge] PERMANENT FAILURE for ${write.entity}` +
            `${write.key ? ` key=${write.key}` : ""} after ${MAX_RETRIES} attempts`
          );
          errors++;
          write.resolve?.(false); // INFRA-1-2: confirm failure
        }
      }
    }

    // Re-queue retries for next flush cycle
    if (retryQueue.length > 0) {
      this.pendingWrites.push(...retryQueue);
    }

    this.totalFlushed += flushed;
    this.totalErrors += errors;
    this.flushing = false;
    this.flushPromise = null;

    return { flushed, errors };
  }

  getMode(): "postgres" | "memory" {
    return this.mode;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  /** Health metrics for monitoring (C2 fix). */
  getHealth(): {
    mode: string;
    initialized: boolean;
    pendingWrites: number;
    totalFlushed: number;
    totalErrors: number;
    lastError: string | null;
    registeredEntities: string[];
  } {
    return {
      mode: this.mode,
      initialized: this.initialized,
      pendingWrites: this.pendingWrites.length,
      totalFlushed: this.totalFlushed,
      totalErrors: this.totalErrors,
      lastError: this.lastError,
      registeredEntities: this.registrations.map((r) => r.entity),
    };
  }

  /**
   * INFRA-1-2: Graceful shutdown — drain all pending writes with timeout.
   * Returns true if all writes completed, false if timed out.
   */
  async gracefulShutdown(timeoutMs: number = SHUTDOWN_TIMEOUT_MS): Promise<boolean> {
    console.log(`[PersistenceBridge] Graceful shutdown: ${this.pendingWrites.length} pending writes, timeout=${timeoutMs}ms`);

    const deadline = Date.now() + timeoutMs;
    let allFlushed = true;

    // Keep flushing until queue is empty or timeout
    while (this.pendingWrites.length > 0 && Date.now() < deadline) {
      const result = await this.flushAll();
      if (result.errors > 0) {
        allFlushed = false;
      }
      // If there are still pending retries, wait a bit
      if (this.pendingWrites.length > 0) {
        await new Promise((r) => setTimeout(r, Math.min(200, deadline - Date.now())));
      }
    }

    if (this.pendingWrites.length > 0) {
      console.error(
        `[PersistenceBridge] Shutdown timeout: ${this.pendingWrites.length} writes dropped`
      );
      // Resolve any remaining promises with failure
      for (const w of this.pendingWrites) {
        w.resolve?.(false);
      }
      this.pendingWrites = [];
      allFlushed = false;
    }

    console.log(`[PersistenceBridge] Shutdown complete: flushed=${this.totalFlushed}, errors=${this.totalErrors}`);
    return allFlushed;
  }

  /** M8 fix: full reset for test isolation. */
  reset(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.registrations = [];
    this.pendingWrites = [];
    this.flushing = false;
    this.initialized = false;
    this.mode = "memory";
    this.totalFlushed = 0;
    this.totalErrors = 0;
    this.lastError = null;
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      // Wrap in try/catch to prevent unhandled rejection crashing the process
      const promise = this.flushAll().catch((err) => {
        console.error("[PersistenceBridge] Flush cycle error:", err);
        return { flushed: 0, errors: 1 };
      });
      this.flushPromise = promise;
    }, 100);
  }

  private getKeyField(entity: string): string {
    const reg = this.registrations.find((r) => r.entity === entity);
    return reg?.keyField ?? "id";
  }
}

export const persistenceBridge = new PersistenceBridgeImpl();

// INFRA-1-2: graceful shutdown with timeout (replaces fire-and-forget P0-14)
if (typeof process !== "undefined" && process.on) {
  let shuttingDown = false;
  const shutdownFlush = () => {
    if (shuttingDown) return; // prevent double-flush
    shuttingDown = true;
    persistenceBridge.gracefulShutdown().catch((err) => {
      console.error("[PersistenceBridge] Shutdown error:", err);
    });
  };
  process.on("SIGTERM", shutdownFlush);
  process.on("SIGINT", shutdownFlush);
  process.on("beforeExit", shutdownFlush);
}
