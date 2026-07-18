/**
 * WhiteLabelConfigEngine — Dealer/OEM Branding & Fleet Configuration
 *
 * Enables white-label deployments by persisting brand identity,
 * machine fleet subsets, pre-loaded tool libraries, and custom
 * tribal knowledge tips with dealer attribution.
 *
 * Persistent storage: ~/.prism/brand.json
 *
 * @engine WhiteLabelConfigEngine
 * @dispatcher businessDispatcher
 * @actions brand_configure, brand_status, brand_reset,
 *          brand_fleet, brand_tools, brand_tips
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync }
  from "fs";
import { join } from "path";
import { homedir } from "os";

// ── Types ──────────────────────────────────────────────────────

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent?: string;
  background?: string;
  text?: string;
}

export interface BrandConfig {
  companyName: string;
  logoUrl?: string;
  colorScheme?: ColorScheme;
  supportUrl?: string;
  greeting?: string;
  configuredAt: string;
  updatedAt: string;
}

export interface FleetConfig {
  machines: string[];
  configuredAt: string;
  count: number;
}

export interface ToolLibraryConfig {
  toolIds: string[];
  manufacturers: string[];
  configuredAt: string;
  totalTools: number;
}

export interface CustomTip {
  id: string;
  text: string;
  camSystem?: string;
  operation?: string;
  source: string;
  addedAt: string;
}

export interface TipsConfig {
  tips: CustomTip[];
  configuredAt: string;
  totalTips: number;
}

export interface WhiteLabelState {
  version: number;
  brand?: BrandConfig;
  fleet?: FleetConfig;
  toolLibrary?: ToolLibraryConfig;
  customTips?: TipsConfig;
}

export interface BrandConfigureInput {
  companyName: string;
  logoUrl?: string;
  colorScheme?: ColorScheme;
  supportUrl?: string;
  greeting?: string;
}

export interface FleetInput {
  machines: string[];
}

export interface ToolLibraryInput {
  toolIds?: string[];
  manufacturers?: string[];
}

export interface TipInput {
  text: string;
  camSystem?: string;
  operation?: string;
  source: string;
}

export interface TipsInput {
  tips: TipInput[];
}

// ── Constants ──────────────────────────────────────────────────

const PRISM_DIR = join(homedir(), ".prism");
const BRAND_FILE = join(PRISM_DIR, "brand.json");
const STATE_VERSION = 1;

const DEFAULT_BRAND: BrandConfig = {
  companyName: "PRISM",
  logoUrl: undefined,
  colorScheme: {
    primary: "#2563eb",
    secondary: "#1e40af",
    accent: "#f59e0b",
    background: "#ffffff",
    text: "#111827",
  },
  supportUrl: "https://prism.manufacturing/support",
  greeting: "Welcome to PRISM Manufacturing Intelligence",
  configuredAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Helpers ────────────────────────────────────────────────────

function ensurePrismDir(): void {
  if (!existsSync(PRISM_DIR)) {
    mkdirSync(PRISM_DIR, { recursive: true });
  }
}

function loadState(): WhiteLabelState {
  try {
    if (existsSync(BRAND_FILE)) {
      const raw = readFileSync(BRAND_FILE, "utf-8");
      const parsed = JSON.parse(raw) as WhiteLabelState;
      if (parsed.version === STATE_VERSION) {
        return parsed;
      }
    }
  } catch {
    // Corrupted file — start fresh
  }
  return { version: STATE_VERSION };
}

function saveState(state: WhiteLabelState): void {
  ensurePrismDir();
  writeFileSync(
    BRAND_FILE,
    JSON.stringify(state, null, 2),
    "utf-8"
  );
}

function generateTipId(index: number): string {
  const ts = Date.now().toString(36);
  return `wl-${ts}-${index.toString().padStart(3, "0")}`;
}

function validateHexColor(color: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function validateColorScheme(
  cs: ColorScheme
): string[] {
  const errors: string[] = [];
  for (const [key, val] of Object.entries(cs)) {
    if (val && !validateHexColor(val)) {
      errors.push(
        `colorScheme.${key}: "${val}" is not valid hex`
      );
    }
  }
  return errors;
}

// ── Engine ─────────────────────────────────────────────────────

export class WhiteLabelConfigEngine {
  /**
   * brand_configure — Set dealer/OEM branding.
   * Persists company name, logo, colors, support URL,
   * and custom greeting to ~/.prism/brand.json.
   */
  brandConfigure(input: BrandConfigureInput): {
    success: boolean;
    brand: BrandConfig;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const now = new Date().toISOString();

    // Validate company name
    if (
      !input.companyName ||
      input.companyName.trim().length === 0
    ) {
      return {
        success: false,
        brand: this.getCurrentBrand(),
        warnings: ["companyName is required"],
      };
    }
    const name = input.companyName.trim();
    if (name.length > 100) {
      warnings.push(
        "companyName truncated to 100 characters"
      );
    }

    // Validate logo URL
    if (input.logoUrl && !validateUrl(input.logoUrl)) {
      warnings.push(
        `logoUrl "${input.logoUrl}" is not a valid URL`
      );
    }

    // Validate support URL
    if (
      input.supportUrl &&
      !validateUrl(input.supportUrl)
    ) {
      warnings.push(
        `supportUrl "${input.supportUrl}" is not valid`
      );
    }

    // Validate color scheme
    if (input.colorScheme) {
      const colorErrors = validateColorScheme(
        input.colorScheme
      );
      warnings.push(...colorErrors);
    }

    // Validate greeting length
    if (input.greeting && input.greeting.length > 500) {
      warnings.push(
        "greeting truncated to 500 characters"
      );
    }

    const state = loadState();
    const existing = state.brand;

    const brand: BrandConfig = {
      companyName: name.slice(0, 100),
      logoUrl: input.logoUrl,
      colorScheme: input.colorScheme ??
        existing?.colorScheme ??
        DEFAULT_BRAND.colorScheme,
      supportUrl: input.supportUrl ??
        existing?.supportUrl,
      greeting: input.greeting
        ? input.greeting.slice(0, 500)
        : existing?.greeting ??
          `Welcome to ${name} powered by PRISM`,
      configuredAt: existing?.configuredAt ?? now,
      updatedAt: now,
    };

    state.brand = brand;
    saveState(state);

    return { success: true, brand, warnings };
  }

  /**
   * brand_status — Return the full white-label state:
   * brand config, fleet, tool library, custom tips.
   */
  brandStatus(): {
    configured: boolean;
    state: WhiteLabelState;
    summary: {
      companyName: string;
      fleetSize: number;
      toolCount: number;
      tipCount: number;
    };
  } {
    const state = loadState();
    const configured = !!state.brand;

    return {
      configured,
      state,
      summary: {
        companyName:
          state.brand?.companyName ?? "PRISM (default)",
        fleetSize: state.fleet?.count ?? 0,
        toolCount:
          state.toolLibrary?.totalTools ?? 0,
        tipCount: state.customTips?.totalTips ?? 0,
      },
    };
  }

  /**
   * brand_reset — Reset everything to PRISM defaults.
   * Clears brand, fleet, tools, and tips.
   */
  brandReset(): {
    success: boolean;
    message: string;
    previousCompany: string | undefined;
  } {
    const state = loadState();
    const prev = state.brand?.companyName;

    const fresh: WhiteLabelState = {
      version: STATE_VERSION,
    };
    saveState(fresh);

    return {
      success: true,
      message: "Reset to PRISM defaults",
      previousCompany: prev,
    };
  }

  /**
   * brand_fleet — Configure machine fleet subset.
   * Filters all PRISM recommendations to only these
   * machines (from the 910 in the machine catalog).
   */
  brandFleet(input: FleetInput): {
    success: boolean;
    fleet: FleetConfig;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const now = new Date().toISOString();

    if (!input.machines || !Array.isArray(input.machines)) {
      return {
        success: false,
        fleet: { machines: [], configuredAt: now, count: 0 },
        warnings: ["machines array is required"],
      };
    }

    // Deduplicate and trim
    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const m of input.machines) {
      const trimmed = String(m).trim();
      if (!trimmed) continue;
      if (seen.has(trimmed)) {
        warnings.push(`Duplicate machine: "${trimmed}"`);
        continue;
      }
      seen.add(trimmed);
      cleaned.push(trimmed);
    }

    if (cleaned.length === 0) {
      warnings.push(
        "No valid machine IDs after filtering"
      );
    }
    if (cleaned.length > 910) {
      warnings.push(
        `Fleet has ${cleaned.length} machines `
        + "(exceeds 910 catalog total)"
      );
    }

    const state = loadState();
    state.fleet = {
      machines: cleaned,
      configuredAt: now,
      count: cleaned.length,
    };
    saveState(state);

    return {
      success: true,
      fleet: state.fleet,
      warnings,
    };
  }

  /**
   * brand_tools — Pre-load a tool library for this
   * dealer/customer. Accepts explicit tool IDs and/or
   * manufacturer names to bulk-include.
   */
  brandTools(input: ToolLibraryInput): {
    success: boolean;
    toolLibrary: ToolLibraryConfig;
    warnings: string[];
  } {
    const warnings: string[] = [];
    const now = new Date().toISOString();

    const toolIds: string[] = [];
    const manufacturers: string[] = [];

    // Process tool IDs
    if (input.toolIds && Array.isArray(input.toolIds)) {
      const seen = new Set<string>();
      for (const id of input.toolIds) {
        const trimmed = String(id).trim();
        if (!trimmed) continue;
        if (seen.has(trimmed)) {
          warnings.push(
            `Duplicate toolId: "${trimmed}"`
          );
          continue;
        }
        seen.add(trimmed);
        toolIds.push(trimmed);
      }
    }

    // Process manufacturers
    if (
      input.manufacturers &&
      Array.isArray(input.manufacturers)
    ) {
      const seen = new Set<string>();
      for (const mfr of input.manufacturers) {
        const trimmed = String(mfr).trim();
        if (!trimmed) continue;
        const lower = trimmed.toLowerCase();
        if (seen.has(lower)) {
          warnings.push(
            `Duplicate manufacturer: "${trimmed}"`
          );
          continue;
        }
        seen.add(lower);
        manufacturers.push(trimmed);
      }
    }

    if (
      toolIds.length === 0 &&
      manufacturers.length === 0
    ) {
      return {
        success: false,
        toolLibrary: {
          toolIds: [],
          manufacturers: [],
          configuredAt: now,
          totalTools: 0,
        },
        warnings: [
          "Provide toolIds and/or manufacturers",
        ],
      };
    }

    const state = loadState();
    const existing = state.toolLibrary;

    // Merge with existing if present
    const mergedToolIds = new Set<string>(
      existing?.toolIds ?? []
    );
    for (const id of toolIds) mergedToolIds.add(id);

    const mergedMfrs = new Set<string>(
      existing?.manufacturers ?? []
    );
    for (const m of manufacturers) mergedMfrs.add(m);

    const finalToolIds = [...mergedToolIds];
    const finalMfrs = [...mergedMfrs];

    state.toolLibrary = {
      toolIds: finalToolIds,
      manufacturers: finalMfrs,
      configuredAt:
        existing?.configuredAt ?? now,
      totalTools: finalToolIds.length,
    };
    saveState(state);

    return {
      success: true,
      toolLibrary: state.toolLibrary,
      warnings,
    };
  }

  /**
   * brand_tips — Add custom tribal knowledge tips with
   * dealer attribution. Tips are appended (not replaced).
   */
  brandTips(input: TipsInput): {
    success: boolean;
    added: number;
    total: number;
    tips: CustomTip[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const now = new Date().toISOString();

    if (!input.tips || !Array.isArray(input.tips)) {
      return {
        success: false,
        added: 0,
        total: 0,
        tips: [],
        warnings: ["tips array is required"],
      };
    }

    const state = loadState();
    const existing = state.customTips?.tips ?? [];
    const newTips: CustomTip[] = [];

    for (let i = 0; i < input.tips.length; i++) {
      const t = input.tips[i];
      if (!t.text || t.text.trim().length === 0) {
        warnings.push(
          `Tip[${i}]: empty text — skipped`
        );
        continue;
      }
      if (!t.source || t.source.trim().length === 0) {
        warnings.push(
          `Tip[${i}]: source is required — skipped`
        );
        continue;
      }
      if (t.text.length > 2000) {
        warnings.push(
          `Tip[${i}]: text truncated to 2000 chars`
        );
      }

      // Check for duplicate text
      const trimText = t.text.trim().toLowerCase();
      const isDupe = existing.some(
        (e) => e.text.trim().toLowerCase() === trimText
      );
      if (isDupe) {
        warnings.push(
          `Tip[${i}]: duplicate text — skipped`
        );
        continue;
      }

      newTips.push({
        id: generateTipId(i),
        text: t.text.trim().slice(0, 2000),
        camSystem: t.camSystem?.trim() || undefined,
        operation: t.operation?.trim() || undefined,
        source: t.source.trim(),
        addedAt: now,
      });
    }

    const allTips = [...existing, ...newTips];
    state.customTips = {
      tips: allTips,
      configuredAt:
        state.customTips?.configuredAt ?? now,
      totalTips: allTips.length,
    };
    saveState(state);

    return {
      success: true,
      added: newTips.length,
      total: allTips.length,
      tips: newTips,
      warnings,
    };
  }

  // ── Query helpers (used by other engines) ──────────────

  /** Get current brand or PRISM defaults. */
  getCurrentBrand(): BrandConfig {
    const state = loadState();
    return state.brand ?? { ...DEFAULT_BRAND };
  }

  /** Get fleet machine list (empty = all machines). */
  getFleetMachines(): string[] {
    const state = loadState();
    return state.fleet?.machines ?? [];
  }

  /** Check if a machine is in the configured fleet. */
  isMachineInFleet(machineId: string): boolean {
    const fleet = this.getFleetMachines();
    if (fleet.length === 0) return true; // no filter
    return fleet.includes(machineId);
  }

  /** Get tool library config. */
  getToolLibrary(): ToolLibraryConfig | undefined {
    const state = loadState();
    return state.toolLibrary;
  }

  /** Check if a manufacturer is in the library. */
  isManufacturerAllowed(mfr: string): boolean {
    const lib = this.getToolLibrary();
    if (!lib || lib.manufacturers.length === 0) {
      return true; // no filter
    }
    const lower = mfr.toLowerCase();
    return lib.manufacturers.some(
      (m) => m.toLowerCase() === lower
    );
  }

  /** Get custom tips, optionally filtered. */
  getCustomTips(filter?: {
    camSystem?: string;
    operation?: string;
  }): CustomTip[] {
    const state = loadState();
    let tips = state.customTips?.tips ?? [];

    if (filter?.camSystem) {
      const cam = filter.camSystem.toLowerCase();
      tips = tips.filter(
        (t) => t.camSystem?.toLowerCase() === cam
      );
    }
    if (filter?.operation) {
      const op = filter.operation.toLowerCase();
      tips = tips.filter(
        (t) => t.operation?.toLowerCase() === op
      );
    }
    return tips;
  }

  /**
   * Dispatcher entry point — routes action string
   * to the appropriate method.
   */
  calculate(
    action: string,
    params: Record<string, any> = {}
  ): any {
    switch (action) {
      case "brand_configure":
        return this.brandConfigure(
          params as BrandConfigureInput
        );
      case "brand_status":
        return this.brandStatus();
      case "brand_reset":
        return this.brandReset();
      case "brand_fleet":
        return this.brandFleet(
          params as FleetInput
        );
      case "brand_tools":
        return this.brandTools(
          params as ToolLibraryInput
        );
      case "brand_tips":
        return this.brandTips(
          params as TipsInput
        );
      default:
        return {
          error: `Unknown action: ${action}`,
        };
    }
  }
}

export const whiteLabelConfigEngine =
  new WhiteLabelConfigEngine();
