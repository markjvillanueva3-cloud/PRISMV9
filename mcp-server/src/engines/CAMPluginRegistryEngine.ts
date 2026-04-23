/**
 * CAMPluginRegistryEngine — Plugin Discovery, Health, Compatibility (U-CAM98)
 * ============================================================================
 *
 * PHASE-7: Higher-level registry on top of the in-memory plugin table inside
 * CAMPluginCommunicationHubEngine (U-CAM96). Where the hub tracks transient
 * routing state, this registry persists the structured metadata that the
 * PRISM app, dashboards, and orchestrators need:
 *
 *   - Capability advertisement (richer than the hub's simple frame-type array)
 *   - Health state machine: online → degraded → offline → reconnecting
 *   - Version compatibility vs a declared PRISM version (SemVer)
 *   - Auto-reconnect backoff schedule with bounded attempt count
 *   - Observable event log for a health dashboard (most-recent N events)
 *
 * Health state machine:
 *
 *     register() ──► online
 *          │
 *          │ heartbeat()
 *          ▼
 *        online ◄─────── attemptReconnect() success
 *          │ ▲                                ▲
 *          │ └──────────── reportSuccess()    │
 *          │                                   │
 *          │ reportFailure() (< FAIL_BEFORE_OFFLINE)
 *          ▼                                   │
 *       degraded                               │
 *          │ reportFailure() (= FAIL_BEFORE_OFFLINE)
 *          ▼                                   │
 *        offline ──► attemptReconnect() ──► reconnecting
 *          │                    failure       │
 *          │                                   ▼ backoff expires → next attempt
 *          └── exceeds MAX_RECONNECT_ATTEMPTS ──► offline (terminal)
 *
 * Reconnect backoff:  1s, 2s, 4s, 8s, 16s, 32s, 60s cap, 10-attempt ceiling.
 *
 * @module engines/CAMPluginRegistryEngine
 * @milestone CAM-EXHAUST-MS0 U-CAM98
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const RegistryTransportSchema = z.enum(["websocket", "grpc"]);
export type RegistryTransport = z.infer<typeof RegistryTransportSchema>;

export const RegistryTargetSchema = z.enum([
  "hypermill",
  "fusion360",
  "inventor_hsm",
  "mastercam",
  "generic",
]);
export type RegistryTarget = z.infer<typeof RegistryTargetSchema>;

export const HealthStateSchema = z.enum([
  "online",
  "degraded",
  "offline",
  "reconnecting",
]);
export type HealthState = z.infer<typeof HealthStateSchema>;

/** SemVer tuple — parsed form of an "x.y.z" string. */
export const SemVerSchema = z.object({
  major: z.number().int().nonnegative(),
  minor: z.number().int().nonnegative(),
  patch: z.number().int().nonnegative(),
});
export type SemVer = z.infer<typeof SemVerSchema>;

/** Compatibility window advertised by the plugin. */
export const CompatRangeSchema = z.object({
  min_prism_version: z.string().regex(/^\d+\.\d+\.\d+$/),
  max_prism_version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/)
    .optional(),
});
export type CompatRange = z.infer<typeof CompatRangeSchema>;

/** Rich capability advertisement. */
export const PluginCapabilitySchema = z.object({
  frame_types: z.array(z.string()).min(1),
  formats: z.array(z.string()).default([]),
  actions: z.array(z.string()).default([]),
  max_throughput_fps: z.number().positive().default(60),
  max_payload_mb: z.number().positive().default(100),
});
export type PluginCapability = z.infer<typeof PluginCapabilitySchema>;

/** Input when a plugin registers with this registry. */
export const PluginRegistrationInputSchema = z.object({
  plugin_id: z.string().min(1),
  target: RegistryTargetSchema,
  transport: RegistryTransportSchema,
  endpoint: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  os: z.enum(["windows", "macos", "linux"]).default("windows"),
  arch: z.enum(["x64", "arm64", "x86"]).default("x64"),
  capability: PluginCapabilitySchema,
  compat_range: CompatRangeSchema,
  metadata: z.record(z.string(), z.string()).optional(),
});
export type PluginRegistrationInput = z.infer<typeof PluginRegistrationInputSchema>;

/** Full record kept in the registry after acceptance. */
export const RegisteredPluginSchema = PluginRegistrationInputSchema.extend({
  registered_at_ms: z.number().int().nonnegative(),
  last_seen_at_ms: z.number().int().nonnegative(),
  health: HealthStateSchema,
  consecutive_failures: z.number().int().nonnegative(),
  reconnect_attempts: z.number().int().nonnegative(),
  next_reconnect_at_ms: z.number().int().nonnegative().nullable(),
  total_heartbeats: z.number().int().nonnegative(),
  total_failures: z.number().int().nonnegative(),
});
export type RegisteredPlugin = z.infer<typeof RegisteredPluginSchema>;

/** Health transition event emitted whenever state changes. */
export const HealthEventSchema = z.object({
  plugin_id: z.string(),
  from_state: HealthStateSchema.nullable(),
  to_state: HealthStateSchema,
  at_ms: z.number().int().nonnegative(),
  reason: z.string().nullable(),
});
export type HealthEvent = z.infer<typeof HealthEventSchema>;

/** Compatibility check result. */
export const CompatibilityResultSchema = z.object({
  plugin_id: z.string(),
  prism_version: z.string(),
  compatible: z.boolean(),
  reason: z.string().nullable(),
});
export type CompatibilityResult = z.infer<typeof CompatibilityResultSchema>;

/** Reconnect attempt result. */
export const ReconnectResultSchema = z.object({
  plugin_id: z.string(),
  attempt: z.number().int().nonnegative(),
  succeeded: z.boolean(),
  next_reconnect_at_ms: z.number().int().nonnegative().nullable(),
  exhausted: z.boolean(),
  reason: z.string().nullable(),
});
export type ReconnectResult = z.infer<typeof ReconnectResultSchema>;

/** Aggregated dashboard snapshot. */
export const HealthDashboardSchema = z.object({
  total_registered: z.number().int().nonnegative(),
  online_count: z.number().int().nonnegative(),
  degraded_count: z.number().int().nonnegative(),
  offline_count: z.number().int().nonnegative(),
  reconnecting_count: z.number().int().nonnegative(),
  stale_count: z.number().int().nonnegative(),
  per_target_count: z.record(RegistryTargetSchema, z.number()),
  reconnect_queue_count: z.number().int().nonnegative(),
  events_captured: z.number().int().nonnegative(),
});
export type HealthDashboard = z.infer<typeof HealthDashboardSchema>;

// ── Constants ────────────────────────────────────────────────────────────────

/** After N consecutive failures → move from degraded → offline. */
export const FAIL_BEFORE_OFFLINE = 3;
/** After this many reconnect attempts without success → permanent offline. */
export const MAX_RECONNECT_ATTEMPTS = 10;
/** Heartbeat freshness window — beyond this a plugin is 'stale'. */
export const STALE_AFTER_MS = 10_000;
/** Backoff schedule in ms, capped at 60 s. */
const BACKOFF_SCHEDULE_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 32_000, 60_000];
/** Event log retention. */
const MAX_EVENTS = 256;

// ── Internal State ───────────────────────────────────────────────────────────

const plugins = new Map<string, RegisteredPlugin>();
const events: HealthEvent[] = [];

// ── Helpers ──────────────────────────────────────────────────────────────────

export function parseSemVer(s: string): SemVer {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(s);
  if (!match) {
    throw new Error(`Invalid SemVer: ${s}`);
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function compareSemVer(a: SemVer, b: SemVer): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function pickBackoff(attempt: number): number {
  const idx = Math.min(attempt, BACKOFF_SCHEDULE_MS.length - 1);
  return BACKOFF_SCHEDULE_MS[idx];
}

function logEvent(
  plugin_id: string,
  from_state: HealthState | null,
  to_state: HealthState,
  at_ms: number,
  reason: string | null,
): void {
  events.push({ plugin_id, from_state, to_state, at_ms, reason });
  while (events.length > MAX_EVENTS) events.shift();
}

function transition(
  plugin: RegisteredPlugin,
  next: HealthState,
  now_ms: number,
  reason: string | null,
): void {
  const prev = plugin.health;
  if (prev === next) return;
  plugin.health = next;
  logEvent(plugin.plugin_id, prev, next, now_ms, reason);
}

// ── Engine ───────────────────────────────────────────────────────────────────

export class CAMPluginRegistryEngine {
  static readonly FAIL_BEFORE_OFFLINE = FAIL_BEFORE_OFFLINE;
  static readonly MAX_RECONNECT_ATTEMPTS = MAX_RECONNECT_ATTEMPTS;
  static readonly STALE_AFTER_MS = STALE_AFTER_MS;

  /** Register (or re-register) a plugin with the registry. */
  static register(
    input: PluginRegistrationInput,
    now_ms: number = Date.now(),
  ): RegisteredPlugin {
    const parsed = PluginRegistrationInputSchema.parse(input);
    const existing = plugins.get(parsed.plugin_id) ?? null;
    const record: RegisteredPlugin = {
      ...parsed,
      registered_at_ms: existing?.registered_at_ms ?? now_ms,
      last_seen_at_ms: now_ms,
      health: "online",
      consecutive_failures: 0,
      reconnect_attempts: 0,
      next_reconnect_at_ms: null,
      total_heartbeats: existing?.total_heartbeats ?? 0,
      total_failures: existing?.total_failures ?? 0,
    };
    plugins.set(parsed.plugin_id, record);
    logEvent(parsed.plugin_id, existing?.health ?? null, "online", now_ms, "register");
    return { ...record };
  }

  /** Remove a plugin from the registry. */
  static unregister(plugin_id: string, now_ms: number = Date.now()): boolean {
    const existing = plugins.get(plugin_id);
    if (!existing) return false;
    plugins.delete(plugin_id);
    logEvent(plugin_id, existing.health, "offline", now_ms, "unregister");
    return true;
  }

  /** Heartbeat — restores online status and resets failure counters. */
  static heartbeat(plugin_id: string, now_ms: number = Date.now()): boolean {
    const plugin = plugins.get(plugin_id);
    if (!plugin) return false;
    plugin.last_seen_at_ms = now_ms;
    plugin.consecutive_failures = 0;
    plugin.reconnect_attempts = 0;
    plugin.next_reconnect_at_ms = null;
    plugin.total_heartbeats += 1;
    transition(plugin, "online", now_ms, "heartbeat");
    return true;
  }

  /**
   * Report a failed interaction. Moves plugin through degraded → offline
   * after FAIL_BEFORE_OFFLINE consecutive failures.
   */
  static reportFailure(
    plugin_id: string,
    reason: string,
    now_ms: number = Date.now(),
  ): RegisteredPlugin | null {
    const plugin = plugins.get(plugin_id);
    if (!plugin) return null;
    plugin.consecutive_failures += 1;
    plugin.total_failures += 1;
    if (plugin.consecutive_failures >= FAIL_BEFORE_OFFLINE) {
      transition(plugin, "offline", now_ms, `offline: ${reason}`);
      plugin.next_reconnect_at_ms = now_ms + pickBackoff(0);
    } else {
      transition(plugin, "degraded", now_ms, `degraded: ${reason}`);
    }
    return { ...plugin };
  }

  /**
   * Attempt a reconnect for an offline plugin. Returns the outcome including
   * the next scheduled attempt time (or `exhausted=true` after the cap).
   */
  static attemptReconnect(
    plugin_id: string,
    now_ms: number = Date.now(),
    succeeded: boolean = false,
  ): ReconnectResult {
    const plugin = plugins.get(plugin_id);
    if (!plugin) {
      return {
        plugin_id,
        attempt: 0,
        succeeded: false,
        next_reconnect_at_ms: null,
        exhausted: false,
        reason: "unknown plugin",
      };
    }
    if (plugin.health === "online") {
      return {
        plugin_id,
        attempt: plugin.reconnect_attempts,
        succeeded: true,
        next_reconnect_at_ms: null,
        exhausted: false,
        reason: "already online",
      };
    }
    plugin.reconnect_attempts += 1;
    transition(plugin, "reconnecting", now_ms, `reconnect attempt ${plugin.reconnect_attempts}`);

    if (succeeded) {
      plugin.last_seen_at_ms = now_ms;
      plugin.consecutive_failures = 0;
      plugin.reconnect_attempts = 0;
      plugin.next_reconnect_at_ms = null;
      plugin.total_heartbeats += 1;
      transition(plugin, "online", now_ms, "reconnect succeeded");
      return {
        plugin_id,
        attempt: 0,
        succeeded: true,
        next_reconnect_at_ms: null,
        exhausted: false,
        reason: null,
      };
    }

    if (plugin.reconnect_attempts >= MAX_RECONNECT_ATTEMPTS) {
      plugin.next_reconnect_at_ms = null;
      transition(plugin, "offline", now_ms, "reconnect attempts exhausted");
      return {
        plugin_id,
        attempt: plugin.reconnect_attempts,
        succeeded: false,
        next_reconnect_at_ms: null,
        exhausted: true,
        reason: "max attempts reached",
      };
    }

    const backoff = pickBackoff(plugin.reconnect_attempts);
    plugin.next_reconnect_at_ms = now_ms + backoff;
    // Back to `offline` until the next scheduled attempt.
    transition(plugin, "offline", now_ms, `backoff ${backoff}ms`);
    return {
      plugin_id,
      attempt: plugin.reconnect_attempts,
      succeeded: false,
      next_reconnect_at_ms: plugin.next_reconnect_at_ms,
      exhausted: false,
      reason: `retry in ${backoff}ms`,
    };
  }

  /** Look up a single plugin by id. Returns a snapshot (not live). */
  static getPlugin(plugin_id: string): RegisteredPlugin | null {
    const plugin = plugins.get(plugin_id);
    return plugin ? { ...plugin } : null;
  }

  /** List plugins, optionally filtered. */
  static listPlugins(filter?: {
    target?: RegistryTarget;
    transport?: RegistryTransport;
    health?: HealthState;
  }): RegisteredPlugin[] {
    const out: RegisteredPlugin[] = [];
    for (const p of plugins.values()) {
      if (filter?.target && p.target !== filter.target) continue;
      if (filter?.transport && p.transport !== filter.transport) continue;
      if (filter?.health && p.health !== filter.health) continue;
      out.push({ ...p });
    }
    return out;
  }

  /**
   * Check compatibility of a registered plugin against a PRISM version. A
   * plugin is compatible when the PRISM version falls inside its advertised
   * compat_range. Both endpoints inclusive when present.
   */
  static checkCompatibility(
    plugin_id: string,
    prism_version: string,
  ): CompatibilityResult {
    const plugin = plugins.get(plugin_id);
    if (!plugin) {
      return {
        plugin_id,
        prism_version,
        compatible: false,
        reason: "plugin not registered",
      };
    }
    let pv: SemVer;
    try {
      pv = parseSemVer(prism_version);
    } catch (e) {
      return {
        plugin_id,
        prism_version,
        compatible: false,
        reason: (e as Error).message,
      };
    }
    const min = parseSemVer(plugin.compat_range.min_prism_version);
    if (compareSemVer(pv, min) < 0) {
      return {
        plugin_id,
        prism_version,
        compatible: false,
        reason: `PRISM ${prism_version} < plugin min ${plugin.compat_range.min_prism_version}`,
      };
    }
    if (plugin.compat_range.max_prism_version) {
      const max = parseSemVer(plugin.compat_range.max_prism_version);
      if (compareSemVer(pv, max) > 0) {
        return {
          plugin_id,
          prism_version,
          compatible: false,
          reason: `PRISM ${prism_version} > plugin max ${plugin.compat_range.max_prism_version}`,
        };
      }
    }
    return {
      plugin_id,
      prism_version,
      compatible: true,
      reason: null,
    };
  }

  /** Find plugins that are due for a reconnect attempt at `now_ms`. */
  static dueForReconnect(now_ms: number = Date.now()): RegisteredPlugin[] {
    const out: RegisteredPlugin[] = [];
    for (const p of plugins.values()) {
      if (p.health !== "offline") continue;
      if (p.next_reconnect_at_ms === null) continue;
      if (p.next_reconnect_at_ms <= now_ms) out.push({ ...p });
    }
    return out;
  }

  /** Snapshot a health dashboard covering the whole registry. */
  static computeHealthDashboard(now_ms: number = Date.now()): HealthDashboard {
    const perTarget: Record<RegistryTarget, number> = {
      hypermill: 0,
      fusion360: 0,
      inventor_hsm: 0,
      mastercam: 0,
      generic: 0,
    };
    let online = 0;
    let degraded = 0;
    let offline = 0;
    let reconnecting = 0;
    let stale = 0;
    let queue = 0;
    for (const p of plugins.values()) {
      perTarget[p.target] += 1;
      switch (p.health) {
        case "online":
          online += 1;
          break;
        case "degraded":
          degraded += 1;
          break;
        case "offline":
          offline += 1;
          if (p.next_reconnect_at_ms !== null) queue += 1;
          break;
        case "reconnecting":
          reconnecting += 1;
          break;
      }
      if (now_ms - p.last_seen_at_ms > STALE_AFTER_MS) stale += 1;
    }
    return {
      total_registered: plugins.size,
      online_count: online,
      degraded_count: degraded,
      offline_count: offline,
      reconnecting_count: reconnecting,
      stale_count: stale,
      per_target_count: perTarget,
      reconnect_queue_count: queue,
      events_captured: events.length,
    };
  }

  /** Return the most recent N health events (default 50). */
  static recentEvents(n: number = 50): HealthEvent[] {
    return events.slice(-n).map(e => ({ ...e }));
  }

  /** Clear registry + event log (test isolation). */
  static resetRegistry(): void {
    plugins.clear();
    events.length = 0;
  }
}

export const camPluginRegistryEngine = CAMPluginRegistryEngine;
