/**
 * SpeedFeedDownstreamSubscriberEngine — wires the 5 downstream PRISM consumers
 * to the SpeedFeedPropagationBridge so they auto-receive SFC updates without
 * having to call the orchestrator themselves.
 *
 * The bridge exists (U-OSC9-03). This engine REGISTERS the subscribers so
 * that the auto-emit event chain actually moves data into:
 *
 *   1. Post-processor pipeline cache    (drives feed/speed override blocks)
 *   2. Mill wizard form-defaults cache  (frontend form preload)
 *   3. Lathe wizard form-defaults cache (frontend form preload)
 *   4. Wire-EDM wizard hint cache       (pass-through advisory)
 *   5. Print-to-program param-pack cache (18-stage pipeline preload)
 *
 * Each cache is keyed by `(machine, material, tool_diameter)` — the same key
 * the bridge uses. Downstream consumers query their cache by key, never call
 * the orchestrator directly. When a new SFC snapshot is published, all 5
 * caches update in-place via the subscriber chain.
 *
 * Initialization is explicit (`registerAllSubscribers()`) so a consumer can
 * opt-out (e.g. during a regression-test run that needs deterministic state).
 *
 * @module engines/SpeedFeedDownstreamSubscriberEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-04
 * @author oscar (slot:oscar, 2026-05-26)
 */

import {
  speedFeedPropagationBridgeEngine,
  type PropagationDomain,
  type PropagationEvent,
  type SnapshotKey,
  type PostProcessorParameterPack,
  type MillWizardDefaults,
  type LatheWizardDefaults,
  type WedmWizardDefaults,
  type PrintToProgramParameterPack,
} from "./SpeedFeedPropagationBridgeEngine.js";

// ============================================================================
// CACHE TYPES — one cache per downstream consumer
// ============================================================================

/**
 * Generic cache entry: caches the bridge's domain-pack output keyed by
 * (machine, material, tool_diameter). Consumers query by key.
 */
interface CacheEntry<T> {
  key: SnapshotKey;
  version: number;
  pack: T;
  cached_at: string;
}

interface CacheSnapshot {
  post_processor: number;
  mill_wizard: number;
  lathe_wizard: number;
  wedm_wizard: number;
  print_to_program: number;
}

// ============================================================================
// ENGINE
// ============================================================================

const SNAPSHOT_KEY_DELIMITER = "::";

export class SpeedFeedDownstreamSubscriberEngine {
  private postProcessorCache = new Map<string, CacheEntry<PostProcessorParameterPack>>();
  private millWizardCache = new Map<string, CacheEntry<MillWizardDefaults>>();
  private latheWizardCache = new Map<string, CacheEntry<LatheWizardDefaults>>();
  private wedmWizardCache = new Map<string, CacheEntry<WedmWizardDefaults>>();
  private printToProgramCache = new Map<string, CacheEntry<PrintToProgramParameterPack>>();

  private activeUnsubscribers: Array<() => void> = [];
  private registered = false;

  /**
   * Register subscribers for all 5 downstream domains. Idempotent — calling
   * twice is a no-op.
   */
  registerAllSubscribers(): { registered: PropagationDomain[]; alreadyActive: boolean } {
    if (this.registered) {
      return {
        registered: [],
        alreadyActive: true,
      };
    }

    const bridge = speedFeedPropagationBridgeEngine;

    this.activeUnsubscribers.push(
      bridge.subscribe("post_processor", (e) => this.onPostProcessor(e)),
      bridge.subscribe("mill_wizard", (e) => this.onMillWizard(e)),
      bridge.subscribe("lathe_wizard", (e) => this.onLatheWizard(e)),
      bridge.subscribe("wedm_wizard", (e) => this.onWedmWizard(e)),
      bridge.subscribe("print_to_program", (e) => this.onPrintToProgram(e)),
    );

    this.registered = true;
    return {
      registered: ["post_processor", "mill_wizard", "lathe_wizard", "wedm_wizard", "print_to_program"],
      alreadyActive: false,
    };
  }

  /** Tear down all subscriptions. Used for test isolation + shutdown. */
  unregisterAllSubscribers(): void {
    for (const unsub of this.activeUnsubscribers) {
      try { unsub(); } catch { /* best-effort */ }
    }
    this.activeUnsubscribers = [];
    this.registered = false;
  }

  /** Returns true if subscribers are currently registered. */
  isRegistered(): boolean {
    return this.registered;
  }

  // ──── Per-domain cache lookups (downstream consumers call these) ──────

  getPostProcessorPack(key: SnapshotKey): PostProcessorParameterPack | undefined {
    return this.postProcessorCache.get(this.keyToString(key))?.pack;
  }

  getMillWizardDefaults(key: SnapshotKey): MillWizardDefaults | undefined {
    return this.millWizardCache.get(this.keyToString(key))?.pack;
  }

  getLatheWizardDefaults(key: SnapshotKey): LatheWizardDefaults | undefined {
    return this.latheWizardCache.get(this.keyToString(key))?.pack;
  }

  getWedmWizardDefaults(key: SnapshotKey): WedmWizardDefaults | undefined {
    return this.wedmWizardCache.get(this.keyToString(key))?.pack;
  }

  getPrintToProgramPack(key: SnapshotKey): PrintToProgramParameterPack | undefined {
    return this.printToProgramCache.get(this.keyToString(key))?.pack;
  }

  /** Per-cache size — useful for health checks + capacity planning. */
  cacheSnapshot(): CacheSnapshot {
    return {
      post_processor: this.postProcessorCache.size,
      mill_wizard: this.millWizardCache.size,
      lathe_wizard: this.latheWizardCache.size,
      wedm_wizard: this.wedmWizardCache.size,
      print_to_program: this.printToProgramCache.size,
    };
  }

  /** Total cache version count — sums versions across every key+domain. */
  totalVersionCount(): number {
    let sum = 0;
    for (const c of [
      this.postProcessorCache, this.millWizardCache,
      this.latheWizardCache, this.wedmWizardCache, this.printToProgramCache,
    ]) {
      for (const entry of c.values()) sum += entry.version;
    }
    return sum;
  }

  /** Clear every cache + unregister. Test/shutdown helper. */
  clear(): void {
    this.unregisterAllSubscribers();
    this.postProcessorCache.clear();
    this.millWizardCache.clear();
    this.latheWizardCache.clear();
    this.wedmWizardCache.clear();
    this.printToProgramCache.clear();
  }

  // ──── Subscriber callbacks ────────────────────────────────────────────

  private onPostProcessor(event: PropagationEvent): void {
    const pack = speedFeedPropagationBridgeEngine.bridgeToPostProcessor(event.snapshot);
    this.postProcessorCache.set(this.keyToString(event.snapshot.key), {
      key: event.snapshot.key,
      version: event.snapshot.version,
      pack,
      cached_at: new Date().toISOString(),
    });
  }

  private onMillWizard(event: PropagationEvent): void {
    const pack = speedFeedPropagationBridgeEngine.bridgeToMillWizard(event.snapshot);
    this.millWizardCache.set(this.keyToString(event.snapshot.key), {
      key: event.snapshot.key,
      version: event.snapshot.version,
      pack,
      cached_at: new Date().toISOString(),
    });
  }

  private onLatheWizard(event: PropagationEvent): void {
    const pack = speedFeedPropagationBridgeEngine.bridgeToLatheWizard(event.snapshot);
    this.latheWizardCache.set(this.keyToString(event.snapshot.key), {
      key: event.snapshot.key,
      version: event.snapshot.version,
      pack,
      cached_at: new Date().toISOString(),
    });
  }

  private onWedmWizard(event: PropagationEvent): void {
    const pack = speedFeedPropagationBridgeEngine.bridgeToWedmWizard(event.snapshot);
    this.wedmWizardCache.set(this.keyToString(event.snapshot.key), {
      key: event.snapshot.key,
      version: event.snapshot.version,
      pack,
      cached_at: new Date().toISOString(),
    });
  }

  private onPrintToProgram(event: PropagationEvent): void {
    const pack = speedFeedPropagationBridgeEngine.bridgeToPrintToProgram(event.snapshot);
    this.printToProgramCache.set(this.keyToString(event.snapshot.key), {
      key: event.snapshot.key,
      version: event.snapshot.version,
      pack,
      cached_at: new Date().toISOString(),
    });
  }

  private keyToString(key: SnapshotKey): string {
    return [key.machine_name, key.material_name, key.tool_diameter_mm.toFixed(2)].join(SNAPSHOT_KEY_DELIMITER);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedDownstreamSubscriberEngine = new SpeedFeedDownstreamSubscriberEngine();
