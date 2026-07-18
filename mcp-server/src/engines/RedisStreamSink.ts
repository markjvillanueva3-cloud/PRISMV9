/**
 * RedisStreamSink -- fail-soft Redis Streams durable transport for EventBusEngine.
 *
 * Phase 3 of INFRA-SYNERGY-RESEARCH-2026-06-25 (slot:bravo). This is the
 * durable BACKEND that the in-memory EventBusEngine optionally fans out to (it
 * is NOT a competing event bus -- the wired EventBusEngine stays the one bus;
 * see INFRA-SYNERGY-PHASE3-EVENTBUS-DESIGN.md). Redis Streams consumer groups
 * give each consumer its OWN durable offset -> per-group lag (XPENDING) instead
 * of the file bus's single global "unread" (the AGENT_CHAT.jsonl 29,405 symptom),
 * and one published event fans out to N independent groups.
 *
 * No new dependency: `ioredis` is already wired (RedisCacheProvider.ts).
 *
 * FAIL-SOFT CONTRACT (mirrors RedisCacheProvider's graceful degradation): every
 * op returns a structured { ok:false } when Redis is unreachable and NEVER
 * throws on I/O. Input validation (bad ARGS) throws. The core is injectable
 * (attachClient) so it unit-tests against a mocked stream client with no live
 * Redis. Companion test: src/__tests__/RedisStreamSink.test.ts.
 *
 * @module engines/RedisStreamSink
 */

import { log } from "../utils/Logger.js";

const KEY_PREFIX = process.env.PRISM_EVENT_KEY_PREFIX ?? "prism:events:";

/** A durable event. `ts` defaults to append time; `source` is the emitter. */
export interface SinkEvent {
  type: string;
  payload?: Record<string, unknown>;
  ts?: number;
  source?: string;
}

export interface AppendResult {
  ok: boolean;
  /** Stream entry id assigned by Redis, or null on failure. */
  id: string | null;
  error: string | null;
}

export interface ConsumedEvent {
  id: string;
  event: SinkEvent;
}

export interface ConsumeResult {
  ok: boolean;
  events: ConsumedEvent[];
  error: string | null;
}

export interface AckResult {
  ok: boolean;
  acked: number;
  error: string | null;
}

export interface PendingResult {
  ok: boolean;
  /** Delivered-but-unacked entries for the group (the per-group "lag"). */
  count: number;
  error: string | null;
}

export interface ConsumeOptions {
  /** Max entries to read. Default 10. */
  count?: number;
  /** Group-create starting id when the group does not exist. Default "$" (new only). */
  fromId?: string;
}

/**
 * The subset of the ioredis client this sink uses. Declared explicitly so
 * (a) no `any`, and (b) tests inject a mock without a live Redis. A real
 * ioredis instance satisfies this structurally.
 */
export interface RedisStreamClient {
  xadd(key: string, id: string, field: string, value: string): Promise<string | null>;
  xgroup(subcommand: string, key: string, group: string, id: string, mkstream: string): Promise<unknown>;
  xreadgroup(...args: Array<string | number>): Promise<Array<[string, Array<[string, string[]]>]> | null>;
  xack(key: string, group: string, ...ids: string[]): Promise<number>;
  xpending(key: string, group: string): Promise<unknown[]>;
  quit?(): Promise<unknown>;
}

interface RawIoredis extends RedisStreamClient {
  on(event: string, handler: (...args: unknown[]) => void): void;
  connect(): Promise<void>;
}

export class RedisStreamSink {
  private client: RedisStreamClient | null = null;
  private connected = false;

  get isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  /** Inject a stream client (tests, or reuse of an existing ioredis connection). */
  attachClient(client: RedisStreamClient): void {
    this.client = client;
    this.connected = true;
  }

  /**
   * Connect a real ioredis client (mirrors RedisCacheProvider.init). Fail-soft:
   * ioredis absent or Redis unreachable -> false, sink stays disconnected and
   * every op degrades to { ok:false }.
   *
   * @param url redis:// or rediss:// URL. Falls back to REDIS_URL then localhost.
   * @returns true only when connected.
   */
  async connect(url?: string): Promise<boolean> {
    let Redis: (new (url: string, opts: Record<string, unknown>) => RawIoredis) | null = null;
    try {
      Redis = ((await import("ioredis")) as { default: new (url: string, opts: Record<string, unknown>) => RawIoredis }).default;
    } catch {
      log.info("[RedisStreamSink] ioredis not available -- durable bus disabled");
      return false;
    }
    const target = url || process.env.REDIS_URL || "redis://127.0.0.1:6379";
    try {
      const raw = new Redis(target, {
        maxRetriesPerRequest: 3,
        enableOfflineQueue: false,
        lazyConnect: true,
        retryStrategy: (times: number) => (times > 5 ? null : Math.min(times * 200, 2000)),
      });
      raw.on("connect", () => { this.connected = true; log.info("[RedisStreamSink] Connected to Redis"); });
      raw.on("error", (err: unknown) => {
        if (this.connected) log.warn(`[RedisStreamSink] Redis error: ${(err as Error)?.message ?? String(err)}`);
        this.connected = false;
      });
      raw.on("close", () => { this.connected = false; });
      await raw.connect();
      this.client = raw;
      return this.connected;
    } catch (e) {
      log.info(`[RedisStreamSink] Redis not available (${this.errMsg(e)}) -- durable bus disabled`);
      this.client = null;
      this.connected = false;
      return false;
    }
  }

  /**
   * Append an event to the topic stream (XADD). Fail-soft: not connected or any
   * Redis error -> { ok:false, id:null }, NEVER throws. `ts` is stamped at
   * append time when omitted.
   *
   * @param topic logical stream name (non-empty). Keyed as `prism:events:<topic>`.
   * @param event { type, payload?, ts?, source? }; `type` must be non-empty.
   * @throws if topic or event.type is empty (programmer error).
   */
  async append(topic: string, event: SinkEvent): Promise<AppendResult> {
    this.assertNonEmpty(topic, "topic");
    if (!event || typeof event !== "object" || typeof event.type !== "string" || event.type.length === 0) {
      throw new Error("event.type must be a non-empty string");
    }
    if (!this.isConnected || !this.client) return { ok: false, id: null, error: "not connected" };
    const stamped: SinkEvent = { ...event, ts: event.ts ?? Date.now() };
    try {
      const id = await this.withTimeout(this.client.xadd(this.streamKey(topic), "*", "data", JSON.stringify(stamped)), "xadd");
      return { ok: id !== null, id, error: id === null ? "xadd returned null" : null };
    } catch (e) {
      return { ok: false, id: null, error: this.errMsg(e) };
    }
  }

  /**
   * Read up to `count` new events for a consumer group (XREADGROUP `>`),
   * creating the group on first use (XGROUP ... MKSTREAM; an existing group is
   * fine). Fail-soft -> { ok:false, events:[] }. Entries whose `data` field is
   * missing/unparseable are skipped (logged), never crashing the batch.
   *
   * @throws if topic/group/consumer is empty (programmer error).
   */
  async consume(topic: string, group: string, consumer: string, opts: ConsumeOptions = {}): Promise<ConsumeResult> {
    this.assertNonEmpty(topic, "topic");
    this.assertNonEmpty(group, "group");
    this.assertNonEmpty(consumer, "consumer");
    if (!this.isConnected || !this.client) return { ok: false, events: [], error: "not connected" };
    const key = this.streamKey(topic);
    const count = opts.count && opts.count > 0 ? opts.count : 10;

    try {
      await this.withTimeout(this.client.xgroup("CREATE", key, group, opts.fromId ?? "$", "MKSTREAM"), "xgroup");
    } catch (e) {
      const msg = this.errMsg(e);
      if (!/BUSYGROUP/i.test(msg)) return { ok: false, events: [], error: `xgroup: ${msg}` };
    }

    try {
      const reply = await this.withTimeout(this.client.xreadgroup("GROUP", group, consumer, "COUNT", count, "STREAMS", key, ">"), "xreadgroup");
      return { ok: true, events: this.parseStreamReply(reply), error: null };
    } catch (e) {
      return { ok: false, events: [], error: this.errMsg(e) };
    }
  }

  /**
   * Acknowledge processed entries (XACK). Fail-soft -> { ok:false, acked:0 }.
   * @throws if topic/group empty, or ids not an array (programmer error).
   */
  async ack(topic: string, group: string, ids: string[]): Promise<AckResult> {
    this.assertNonEmpty(topic, "topic");
    this.assertNonEmpty(group, "group");
    if (!Array.isArray(ids)) throw new Error("ids must be an array");
    if (ids.length === 0) return { ok: true, acked: 0, error: null };
    if (!this.isConnected || !this.client) return { ok: false, acked: 0, error: "not connected" };
    try {
      const acked = await this.withTimeout(this.client.xack(this.streamKey(topic), group, ...ids), "xack");
      return { ok: true, acked, error: null };
    } catch (e) {
      return { ok: false, acked: 0, error: this.errMsg(e) };
    }
  }

  /**
   * Delivered-but-unacked count for a group (XPENDING summary) -- the per-group
   * "lag" replacing the file bus's global "unread". Fail-soft -> { ok:false, count:0 }.
   */
  async pending(topic: string, group: string): Promise<PendingResult> {
    this.assertNonEmpty(topic, "topic");
    this.assertNonEmpty(group, "group");
    if (!this.isConnected || !this.client) return { ok: false, count: 0, error: "not connected" };
    try {
      const summary = await this.withTimeout(this.client.xpending(this.streamKey(topic), group), "xpending");
      const raw = Array.isArray(summary) ? summary[0] : 0;
      const count = typeof raw === "number" ? raw : Number(raw) || 0;
      return { ok: true, count, error: null };
    } catch (e) {
      return { ok: false, count: 0, error: this.errMsg(e) };
    }
  }

  async shutdown(): Promise<void> {
    if (this.client?.quit) {
      try { await this.client.quit(); } catch { /* ignore shutdown errors */ }
    }
    this.client = null;
    this.connected = false;
  }

  // ---- internals ----

  private parseStreamReply(reply: Array<[string, Array<[string, string[]]>]> | null): ConsumedEvent[] {
    if (!reply) return [];
    const out: ConsumedEvent[] = [];
    for (const [, entries] of reply) {
      for (const [id, fields] of entries) {
        const dataIdx = fields.indexOf("data");
        if (dataIdx === -1 || dataIdx + 1 >= fields.length) {
          log.warn(`[RedisStreamSink] entry ${id} has no data field -- skipped`);
          continue;
        }
        try {
          out.push({ id, event: JSON.parse(fields[dataIdx + 1]) as SinkEvent });
        } catch {
          log.warn(`[RedisStreamSink] entry ${id} data not JSON -- skipped`);
        }
      }
    }
    return out;
  }

  private streamKey(topic: string): string {
    return `${KEY_PREFIX}${topic}`;
  }

  private assertNonEmpty(v: string, name: string): void {
    if (typeof v !== "string" || v.trim().length === 0) {
      throw new Error(`${name} must be a non-empty string`);
    }
  }

  /** Per-call timeout (ms), env-overridable so tests can shrink it. */
  private timeoutMs(): number {
    const v = Number(process.env.PRISM_EVENT_TIMEOUT_MS ?? 5000);
    return Number.isFinite(v) && v > 0 ? v : 5000;
  }

  /**
   * Bound a Redis command so a CONNECTED-but-hung server (network blackhole)
   * degrades to a caught timeout -> { ok:false } instead of stalling the
   * caller (publish() is awaited by a wired dispatcher action). ioredis has no
   * AbortSignal, so the orphaned command is left to settle harmlessly.
   */
  private async withTimeout<T>(p: Promise<T>, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timeout`)), this.timeoutMs());
    });
    try {
      return await Promise.race([p, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private errMsg(e: unknown): string {
    const err = e as Error;
    return err?.message ?? String(e);
  }
}

export const redisStreamSink = new RedisStreamSink();
