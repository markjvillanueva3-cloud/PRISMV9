/**
 * MCAT-MS0 P2-U03: Shop Machine Overlay Engine
 *
 * Persists user-owned shop machine profiles and calculator machine presets
 * as overlays on canonical machine packages. This engine bridges:
 *
 * 1. ShopConfigurationEngine (shop-specific machine data)
 * 2. CanonicalMachinePackage (universal machine truth model)
 * 3. UserMachineProfileOverlay (user customizations)
 *
 * Key features:
 * - Creates overlays from shop machine definitions
 * - Persists overlays to JSON state files
 * - Returns merged views (canonical + shop + user overlay)
 * - Supports calculator presets and downstream consumer binding
 * - Tracks overlay provenance and version history
 *
 * @module engines/ShopMachineOverlayEngine
 * @milestone MCAT-MS0/P2-U03
 */

import { log } from "../utils/Logger.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import { shopConfigurationEngine, type ShopMachine, type ShopProfile } from "./ShopConfigurationEngine.js";
import { machineCapabilitySurfaceEngine } from "./MachineCapabilitySurfaceEngine.js";
import { machineVocabularyNormalizerEngine } from "./MachineVocabularyNormalizerEngine.js";
import type {
  UserMachineProfileOverlay,
  UserMachineProfileReadModel,
  UserMachineProfileConsumer,
  MachineCapabilitySnapshot,
  MachineOptionSource,
  MachineAxisTopology,
  ControllerPackage,
  SpindlePackageOption,
  CoolantStrategyOption,
  KinematicPackage,
  MachineMeasuredPerformanceOverlay,
} from "../contracts/userMachineProfile.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ShopMachineOverlay {
  /** Unique overlay ID */
  overlay_id: string;
  /** Shop profile ID this belongs to */
  shop_id: string;
  /** Shop machine ID (from ShopConfigurationEngine) */
  shop_machine_id: string;
  /** Canonical machine package ID (from MCAT) */
  canonical_package_id: string;
  /** User-defined display name */
  display_name: string;
  /** User overlay data */
  overlay: UserMachineProfileOverlay;
  /** Is this a calculator preset? */
  is_calculator_preset: boolean;
  /** Preset name if this is a calculator preset */
  preset_name?: string;
  /** Which consumers can use this overlay */
  enabled_consumers: UserMachineProfileConsumer[];
  /** Is this the default for the shop machine? */
  is_default: boolean;
  /** Version number (incremented on each save) */
  version: number;
  /** Creation timestamp */
  created_at: string;
  /** Last update timestamp */
  updated_at: string;
  /** Who created this overlay */
  created_by: string;
  /** Who last updated this overlay */
  updated_by: string;
}

export interface CreateOverlayInput {
  /** Shop machine ID to create overlay for */
  shop_machine_id: string;
  /** Optional canonical package ID (auto-resolved if not provided) */
  canonical_package_id?: string;
  /** Display name for the overlay */
  display_name?: string;
  /** Is this a calculator preset? */
  is_calculator_preset?: boolean;
  /** Preset name */
  preset_name?: string;
  /** Which consumers can use this overlay */
  enabled_consumers?: UserMachineProfileConsumer[];
  /** User ID creating this overlay */
  user_id: string;
  /** Override settings */
  overrides?: Partial<UserMachineProfileOverlay>;
}

export interface UpdateOverlayInput {
  /** Overlay ID to update */
  overlay_id: string;
  /** Fields to update */
  updates: Partial<ShopMachineOverlay>;
  /** User ID making the update */
  user_id: string;
}

/**
 * Enriched canonical-package preview emitted inline by `getMergedView`.
 *
 * This is the overlay/merge view shape -- keyed on `canonical_id` and consumed
 * downstream via `mergedView.canonical_package?.canonical_id`
 * (MachineConsumerBindingEngine). It is deliberately NOT the persisted
 * `CanonicalMachinePackage` (which keys on `id` / `machine_type`); they are
 * different layers. Kept structurally aligned with the literal built in
 * `getMergedView` so the producer and this type never drift.
 */
export interface EnrichedCanonicalPackagePreview {
  canonical_id: string;
  manufacturer: string;
  model: string;
  type: string;
  controller: { family: string; model: string | undefined };
  spindle: { max_rpm?: number; power?: number; torque?: number };
  coolant: { type?: string; pressure?: string };
  envelope: Record<string, unknown>;
  axes: { count: number };
  tool_changer: { capacity: number };
  provenance: Record<string, unknown>;
  ambiguities: unknown[];
  enrichment_history: unknown[];
  confidence_breakdown: {
    controller: number;
    spindle: number;
    coolant: number;
    envelope: number;
    axes: number;
    tool_changer: number;
    overall: number;
  };
  source_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface MergedMachineView {
  /** Shop machine data */
  shop_machine: ShopMachine;
  /** Enriched canonical-package preview (if resolved) */
  canonical_package: EnrichedCanonicalPackagePreview | null;
  /** Active overlay (if any) */
  overlay: ShopMachineOverlay | null;
  /** Merged capability snapshot for downstream consumers */
  merged_snapshot: MachineCapabilitySnapshot;
  /** Read model with consumer bindings */
  read_model: UserMachineProfileReadModel;
}

export interface OverlayStoreState {
  /** Schema version */
  schemaVersion: number;
  /** All overlays indexed by overlay_id */
  overlays: Record<string, ShopMachineOverlay>;
  /** Index: shop_machine_id → overlay_ids */
  by_shop_machine: Record<string, string[]>;
  /** Index: canonical_package_id → overlay_ids */
  by_canonical_package: Record<string, string[]>;
  /** Index: preset_name → overlay_id (for calculator presets) */
  presets: Record<string, string>;
  /** Last updated */
  updated_at: string;
}

// ============================================================================
// STATE FILE PATH
// ============================================================================

const OVERLAY_STORE_PATH = "data/state/shop-machine-overlays.json";

// ============================================================================
// ENGINE IMPLEMENTATION
// ============================================================================

class ShopMachineOverlayEngine {
  private state: OverlayStoreState | null = null;
  private dirty = false;

  /**
   * Create an overlay for a shop machine on a canonical package
   */
  createOverlay(input: CreateOverlayInput): ShopMachineOverlay {
    this.ensureLoaded();

    const shopMachine = this.getShopMachine(input.shop_machine_id);
    if (!shopMachine) {
      throw new Error(`Shop machine not found: ${input.shop_machine_id}`);
    }

    // Resolve canonical package ID
    const canonicalId = input.canonical_package_id ?? this.inferCanonicalPackageId(shopMachine);

    // Generate overlay ID
    const overlayId = `overlay-${input.shop_machine_id}-${Date.now()}`;

    // Build the capability snapshot
    const snapshot = this.buildSnapshotFromShopMachine(shopMachine, canonicalId);

    // Build the user profile overlay
    const profileOverlay: UserMachineProfileOverlay = {
      profileId: overlayId,
      userId: input.user_id,
      displayName: input.display_name ?? shopMachine.name,
      machine: snapshot,
      selectedControllerId: snapshot.controllerPackages[0]?.controllerId ?? "default",
      enabledControllerFeatureIds: [],
      selectedSpindlePackageId: snapshot.spindlePackages[0]?.id ?? "default",
      enabledCoolantStrategyIds: snapshot.coolantStrategies.filter(c => c.availability.enabled).map(c => c.id),
      toolingStationCountOverride: undefined,
      measuredPerformance: this.buildMeasuredPerformance(shopMachine),
      ...input.overrides,
    };

    const overlay: ShopMachineOverlay = {
      overlay_id: overlayId,
      shop_id: shopConfigurationEngine.getActiveProfile().id,
      shop_machine_id: input.shop_machine_id,
      canonical_package_id: canonicalId,
      display_name: input.display_name ?? shopMachine.name,
      overlay: profileOverlay,
      is_calculator_preset: input.is_calculator_preset ?? false,
      preset_name: input.preset_name,
      enabled_consumers: input.enabled_consumers ?? ["calculator", "program_release", "print_to_cnc", "quote_builder"],
      is_default: false,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: input.user_id,
      updated_by: input.user_id,
    };

    // Store
    this.state!.overlays[overlayId] = overlay;

    // Update indexes
    if (!this.state!.by_shop_machine[input.shop_machine_id]) {
      this.state!.by_shop_machine[input.shop_machine_id] = [];
    }
    this.state!.by_shop_machine[input.shop_machine_id].push(overlayId);

    if (!this.state!.by_canonical_package[canonicalId]) {
      this.state!.by_canonical_package[canonicalId] = [];
    }
    this.state!.by_canonical_package[canonicalId].push(overlayId);

    if (input.is_calculator_preset && input.preset_name) {
      this.state!.presets[input.preset_name] = overlayId;
    }

    this.dirty = true;
    this.persist();

    log.info(`[ShopMachineOverlay] Created overlay ${overlayId} for machine ${input.shop_machine_id}`);
    return overlay;
  }

  /**
   * Update an existing overlay
   */
  updateOverlay(input: UpdateOverlayInput): ShopMachineOverlay | null {
    this.ensureLoaded();

    const existing = this.state!.overlays[input.overlay_id];
    if (!existing) {
      return null;
    }

    const updated: ShopMachineOverlay = {
      ...existing,
      ...input.updates,
      overlay_id: existing.overlay_id, // Can't change ID
      shop_machine_id: existing.shop_machine_id, // Can't change binding
      canonical_package_id: existing.canonical_package_id, // Can't change binding
      version: existing.version + 1,
      updated_at: new Date().toISOString(),
      updated_by: input.user_id,
    };

    this.state!.overlays[input.overlay_id] = updated;
    this.dirty = true;
    this.persist();

    log.info(`[ShopMachineOverlay] Updated overlay ${input.overlay_id} to v${updated.version}`);
    return updated;
  }

  /**
   * Get overlay by ID
   */
  getOverlay(overlayId: string): ShopMachineOverlay | null {
    this.ensureLoaded();
    return this.state!.overlays[overlayId] ?? null;
  }

  /**
   * Get all overlays for a shop machine
   */
  getOverlaysForMachine(shopMachineId: string): ShopMachineOverlay[] {
    this.ensureLoaded();
    const ids = this.state!.by_shop_machine[shopMachineId] ?? [];
    return ids.map(id => this.state!.overlays[id]).filter(Boolean);
  }

  /**
   * Get the default overlay for a shop machine
   */
  getDefaultOverlay(shopMachineId: string): ShopMachineOverlay | null {
    const overlays = this.getOverlaysForMachine(shopMachineId);
    return overlays.find(o => o.is_default) ?? overlays[0] ?? null;
  }

  /**
   * Get a calculator preset by name
   */
  getPreset(presetName: string): ShopMachineOverlay | null {
    this.ensureLoaded();
    const overlayId = this.state!.presets[presetName];
    return overlayId ? this.state!.overlays[overlayId] ?? null : null;
  }

  /**
   * List all calculator presets
   */
  listPresets(): ShopMachineOverlay[] {
    this.ensureLoaded();
    return Object.values(this.state!.presets)
      .map(id => this.state!.overlays[id])
      .filter(Boolean);
  }

  /**
   * Set an overlay as the default for its shop machine
   */
  setDefault(overlayId: string, userId: string): boolean {
    this.ensureLoaded();

    const overlay = this.state!.overlays[overlayId];
    if (!overlay) return false;

    // Clear default on all other overlays for this machine
    const siblingIds = this.state!.by_shop_machine[overlay.shop_machine_id] ?? [];
    for (const id of siblingIds) {
      if (this.state!.overlays[id]) {
        this.state!.overlays[id].is_default = (id === overlayId);
        if (id === overlayId) {
          this.state!.overlays[id].updated_at = new Date().toISOString();
          this.state!.overlays[id].updated_by = userId;
        }
      }
    }

    this.dirty = true;
    this.persist();
    return true;
  }

  /**
   * Delete an overlay
   */
  deleteOverlay(overlayId: string): boolean {
    this.ensureLoaded();

    const overlay = this.state!.overlays[overlayId];
    if (!overlay) return false;

    // Remove from indexes
    const machineIds = this.state!.by_shop_machine[overlay.shop_machine_id];
    if (machineIds) {
      this.state!.by_shop_machine[overlay.shop_machine_id] = machineIds.filter(id => id !== overlayId);
    }

    const pkgIds = this.state!.by_canonical_package[overlay.canonical_package_id];
    if (pkgIds) {
      this.state!.by_canonical_package[overlay.canonical_package_id] = pkgIds.filter(id => id !== overlayId);
    }

    if (overlay.preset_name && this.state!.presets[overlay.preset_name] === overlayId) {
      delete this.state!.presets[overlay.preset_name];
    }

    delete this.state!.overlays[overlayId];
    this.dirty = true;
    this.persist();

    log.info(`[ShopMachineOverlay] Deleted overlay ${overlayId}`);
    return true;
  }

  /**
   * Get merged view of shop machine with canonical package and overlay
   */
  getMergedView(shopMachineId: string): MergedMachineView | null {
    const shopMachine = this.getShopMachine(shopMachineId);
    if (!shopMachine) return null;

    const overlay = this.getDefaultOverlay(shopMachineId);
    const canonicalId = overlay?.canonical_package_id ?? this.inferCanonicalPackageId(shopMachine);

    // Get canonical package capabilities
    const controllerCaps = machineCapabilitySurfaceEngine.getControllerCapabilities(canonicalId);
    const spindlePkg = machineCapabilitySurfaceEngine.getSpindlePackage(canonicalId);
    const coolantStrategy = machineCapabilitySurfaceEngine.getCoolantStrategy(canonicalId);

    // Build merged snapshot
    const snapshot = overlay?.overlay.machine ?? this.buildSnapshotFromShopMachine(shopMachine, canonicalId);

    // Determine supported consumers
    const consumers: UserMachineProfileConsumer[] = overlay?.enabled_consumers ?? ["calculator"];

    const readModel: UserMachineProfileReadModel = {
      profile: overlay?.overlay ?? this.buildDefaultProfileOverlay(shopMachine, snapshot),
      supportedConsumers: consumers,
      canDriveCalculatorSelections: consumers.includes("calculator"),
      canDriveProgramRelease: consumers.includes("program_release"),
      canDrivePrintToCnc: consumers.includes("print_to_cnc"),
      canDriveShopDefaults: consumers.includes("shop_floor"),
    };

    return {
      shop_machine: shopMachine,
      canonical_package: controllerCaps ? {
        canonical_id: canonicalId,
        manufacturer: controllerCaps.vendor,
        model: shopMachine.name,
        type: shopMachine.type as any,
        controller: { family: controllerCaps.controllerFamily, model: controllerCaps.controllerModel },
        spindle: spindlePkg ? { max_rpm: spindlePkg.maxRpm, power: spindlePkg.ratedPower, torque: spindlePkg.continuousTorque } : {},
        coolant: coolantStrategy ? { type: coolantStrategy.defaultStrategy, pressure: coolantStrategy.maxPressure.toString() } : {},
        envelope: shopMachine.work_envelope ?? {},
        axes: { count: shopMachine.capabilities.includes("5axis") ? 5 : 3 },
        tool_changer: { capacity: shopMachine.turret_stations ?? 0 },
        provenance: {},
        ambiguities: [],
        enrichment_history: [],
        confidence_breakdown: { controller: 0.7, spindle: 0.7, coolant: 0.6, envelope: 0.8, axes: 0.7, tool_changer: 0.6, overall: 0.7 },
        source_ids: [shopMachineId],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } : null,
      overlay,
      merged_snapshot: snapshot,
      read_model: readModel,
    };
  }

  /**
   * Bulk create overlays for all shop machines
   */
  createOverlaysForShop(userId: string): ShopMachineOverlay[] {
    const profile = shopConfigurationEngine.getActiveProfile();
    const results: ShopMachineOverlay[] = [];

    for (const machine of profile.machines) {
      // Skip if overlay already exists
      const existing = this.getOverlaysForMachine(machine.id);
      if (existing.length > 0) continue;

      try {
        const overlay = this.createOverlay({
          shop_machine_id: machine.id,
          user_id: userId,
          enabled_consumers: ["calculator", "program_release", "print_to_cnc", "quote_builder"],
        });
        results.push(overlay);
      } catch (err) {
        log.warn(`[ShopMachineOverlay] Failed to create overlay for ${machine.id}: ${err}`);
      }
    }

    log.info(`[ShopMachineOverlay] Created ${results.length} overlays for shop ${profile.id}`);
    return results;
  }

  /**
   * Get stats about overlay coverage
   */
  getStats(): {
    total_overlays: number;
    machines_covered: number;
    total_shop_machines: number;
    presets_count: number;
    coverage_pct: number;
  } {
    this.ensureLoaded();
    const profile = shopConfigurationEngine.getActiveProfile();
    const totalMachines = profile.machines.length;
    const machinesCovered = Object.keys(this.state!.by_shop_machine).length;

    return {
      total_overlays: Object.keys(this.state!.overlays).length,
      machines_covered: machinesCovered,
      total_shop_machines: totalMachines,
      presets_count: Object.keys(this.state!.presets).length,
      coverage_pct: totalMachines > 0 ? Math.round((machinesCovered / totalMachines) * 100) : 0,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getShopMachine(machineId: string): ShopMachine | null {
    const profile = shopConfigurationEngine.getActiveProfile();
    return profile.machines.find(m => m.id === machineId) ?? null;
  }

  private inferCanonicalPackageId(machine: ShopMachine): string {
    // Try to match against known canonical IDs based on machine name/controller
    const normalized = machineVocabularyNormalizerEngine.normalizeController(machine.controller ?? "");
    const manufacturerGuess = machine.name.split(" ")[0]?.toLowerCase() ?? "unknown";

    // Check common patterns
    if (machine.name.toLowerCase().includes("haas") && machine.name.toLowerCase().includes("vf")) {
      return "haas_vf2";
    }
    if (machine.name.toLowerCase().includes("dmg") || machine.name.toLowerCase().includes("dmu")) {
      return "dmg_dmu50";
    }
    if (machine.name.toLowerCase().includes("okuma")) {
      if (machine.type === "Lathe") return "okuma_lb3000";
      return "okuma_mb46vae";
    }

    // Fallback to generated ID
    return `${manufacturerGuess}_${machine.id}`.toLowerCase().replace(/[^a-z0-9_]/g, "_");
  }

  private buildSnapshotFromShopMachine(machine: ShopMachine, canonicalId: string): MachineCapabilitySnapshot {
    const topology = this.inferTopology(machine);
    const manufacturerId = machine.name.split(" ")[0]?.toLowerCase() ?? "unknown";

    const controllerPackages: ControllerPackage[] = [{
      controllerId: machine.controller ?? "generic",
      controllerLabel: machine.controller?.toUpperCase() ?? "Generic",
      controlFeatures: [],
    }];

    const spindlePackages: SpindlePackageOption[] = [{
      id: "main_spindle",
      label: "Main Spindle",
      maxRpm: machine.max_rpm,
      maxPowerHp: machine.max_power_kw ? machine.max_power_kw * 1.34 : undefined,
      maxTorqueFtLb: machine.max_torque_nm ? machine.max_torque_nm * 0.737 : undefined,
      taper: machine.spindle_taper,
      availability: { enabled: true, source: "shop_audit" },
    }];

    const coolantStrategies: CoolantStrategyOption[] = (machine.coolant_types ?? ["flood"]).map(ct => ({
      id: ct,
      label: ct.charAt(0).toUpperCase() + ct.slice(1),
      availability: { enabled: true, source: "shop_audit" },
    }));

    const kinematics: KinematicPackage = {
      familyId: topology,
      familyLabel: topology.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      topology,
      travelXIn: machine.work_envelope?.x_mm ? machine.work_envelope.x_mm / 25.4 : undefined,
      travelYIn: machine.work_envelope?.y_mm ? machine.work_envelope.y_mm / 25.4 : undefined,
      travelZIn: machine.work_envelope?.z_mm ? machine.work_envelope.z_mm / 25.4 : undefined,
    };

    return {
      machineId: machine.id,
      canonicalMachineId: canonicalId,
      packageId: `pkg-${machine.id}`,
      manufacturerId,
      manufacturerLabel: machine.name.split(" ")[0] ?? "Unknown",
      modelLabel: machine.name,
      familyId: topology,
      familyLabel: topology.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      controllerPackages,
      spindlePackages,
      coolantStrategies,
      kinematics,
      sourceRecords: [machine.id],
    };
  }

  private inferTopology(machine: ShopMachine): MachineAxisTopology {
    const type = machine.type.toLowerCase();
    const caps = machine.capabilities.map(c => c.toLowerCase());

    if (type.includes("lathe") || type.includes("turning")) {
      if (machine.has_sub_spindle) return "sub_spindle_lathe";
      if (caps.includes("y_axis")) return "y_axis_lathe";
      return "2_axis_lathe";
    }
    if (type.includes("swiss")) return "swiss";
    if (type.includes("mill-turn") || type.includes("mill_turn")) return "mill_turn";
    if (type.includes("wire") && type.includes("edm")) return "wire_edm";
    if (type.includes("sinker") || (type.includes("edm") && !type.includes("wire"))) return "sinker_edm";
    if (type.includes("5-axis") || type.includes("5axis") || caps.includes("5axis")) return "5_axis_vertical";
    if (type.includes("hmc") || type.includes("horizontal")) return "3_axis_horizontal";
    if (type.includes("vtl")) return "vtl";

    return "3_axis_vertical";
  }

  private buildMeasuredPerformance(machine: ShopMachine): MachineMeasuredPerformanceOverlay | undefined {
    if (!machine.max_power_kw && !machine.max_torque_nm) return undefined;

    return {
      measuredPowerKw: machine.max_power_kw,
      measuredMaxTorqueNm: machine.max_torque_nm,
    };
  }

  private buildDefaultProfileOverlay(machine: ShopMachine, snapshot: MachineCapabilitySnapshot): UserMachineProfileOverlay {
    return {
      profileId: `default-${machine.id}`,
      userId: "system",
      displayName: machine.name,
      machine: snapshot,
      selectedControllerId: snapshot.controllerPackages[0]?.controllerId ?? "default",
      enabledControllerFeatureIds: [],
      selectedSpindlePackageId: snapshot.spindlePackages[0]?.id ?? "default",
      enabledCoolantStrategyIds: snapshot.coolantStrategies.filter(c => c.availability.enabled).map(c => c.id),
    };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private ensureLoaded(): void {
    if (this.state) return;

    try {
      if (existsSync(OVERLAY_STORE_PATH)) {
        const raw = readFileSync(OVERLAY_STORE_PATH, "utf-8");
        this.state = JSON.parse(raw) as OverlayStoreState;
      }
      if (!this.state || !this.state.overlays) {
        this.state = this.createEmptyState();
      }
    } catch {
      this.state = this.createEmptyState();
    }
  }

  private createEmptyState(): OverlayStoreState {
    return {
      schemaVersion: 1,
      overlays: {},
      by_shop_machine: {},
      by_canonical_package: {},
      presets: {},
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    if (!this.dirty || !this.state) return;

    try {
      this.state.updated_at = new Date().toISOString();
      const dir = dirname(OVERLAY_STORE_PATH);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(OVERLAY_STORE_PATH, JSON.stringify(this.state, null, 2), "utf-8");
      this.dirty = false;
    } catch (err) {
      log.error(`[ShopMachineOverlay] Failed to persist state: ${err}`);
    }
  }

  // ============================================================================
  // SELF-AWARENESS
  // ============================================================================

  getSelfAwareness() {
    const stats = this.getStats();
    return {
      engine: "ShopMachineOverlayEngine",
      purpose: "Persist user-owned shop machine profiles as overlays on canonical machine packages",
      milestone: "MCAT-MS0/P2-U03",
      capabilities: [
        "createOverlay",
        "updateOverlay",
        "getOverlay",
        "getOverlaysForMachine",
        "getDefaultOverlay",
        "getPreset",
        "listPresets",
        "setDefault",
        "deleteOverlay",
        "getMergedView",
        "createOverlaysForShop",
        "getStats",
      ],
      state: {
        total_overlays: stats.total_overlays,
        coverage_pct: stats.coverage_pct,
        presets_count: stats.presets_count,
      },
      integrations: [
        "ShopConfigurationEngine",
        "MachineCapabilitySurfaceEngine",
        "MachineVocabularyNormalizerEngine",
      ],
    };
  }
}

export const shopMachineOverlayEngine = new ShopMachineOverlayEngine();
