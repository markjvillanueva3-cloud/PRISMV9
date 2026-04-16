/**
 * VendorEngine — Supplier master data, scorecards, and spend analysis
 *
 * Manages JM Die's vendor/supplier relationships: contact info, payment terms,
 * product categories, certifications, and performance scoring. Links to
 * PurchaseOrderEngine for spend tracking and delivery analysis.
 *
 * INGEST-MS2 / U-VND01
 * @module VendorEngine
 */

import { log } from "../utils/Logger.js";
import { persistenceBridge } from "../db/PersistenceBridge.js";

// ============================================================================
// TYPES
// ============================================================================

export type VendorCategory =
  | "tooling"         // cutting tools, inserts, holders
  | "material"        // raw stock, bar, plate, carbide
  | "consumables"     // coolant, wire, abrasives, filters
  | "equipment"       // machines, fixtures, workholding
  | "services"        // heat treat, plating, grinding, calibration
  | "office"          // office supplies, safety equipment
  | "maintenance"     // spare parts, repair services
  | "other";

export type PaymentTerms = "cod" | "net15" | "net30" | "net45" | "net60" | "prepaid" | "credit_card";

export interface VendorContact {
  name: string;
  email: string;
  phone: string;
  role: string;
}

export interface Vendor {
  id: string;
  name: string;
  short_name: string;
  categories: VendorCategory[];
  contacts: VendorContact[];
  terms: PaymentTerms;
  account_number: string;
  address: { street: string; city: string; state: string; zip: string; country: string };
  website: string;
  preferred: boolean;
  brands_carried: string[];
  certifications: string[];
  notes: string;
  spend_ytd: number;
  on_time_pct: number;
  quality_pct: number;
  created_at: string;
  updated_at: string;
  status: "active" | "inactive" | "blocked";
}

export interface VendorCreateInput {
  name: string;
  short_name?: string;
  categories?: VendorCategory[];
  contacts?: VendorContact[];
  terms?: PaymentTerms;
  account_number?: string;
  address?: Partial<Vendor["address"]>;
  website?: string;
  preferred?: boolean;
  brands_carried?: string[];
  certifications?: string[];
  notes?: string;
}

export interface VendorSearchInput {
  query?: string;
  category?: VendorCategory;
  brand?: string;
  preferred_only?: boolean;
  status?: Vendor["status"];
}

export interface VendorScorecard {
  vendor_id: string;
  vendor_name: string;
  on_time_pct: number;
  quality_pct: number;
  price_competitiveness: number;
  composite_score: number;
  spend_ytd: number;
  total_pos: number;
  risk_flags: string[];
}

export interface SpendAnalysis {
  vendor_id: string;
  vendor_name: string;
  total_spend: number;
  by_category: Record<string, number>;
  by_month: Array<{ month: string; amount: number }>;
  trend: "increasing" | "stable" | "decreasing";
}

// ============================================================================
// ENGINE
// ============================================================================

class VendorEngine {
  private vendors: Map<string, Vendor> = new Map();
  private nextId = 1;

  /**
   * Create a new vendor record.
   */
  create(input: VendorCreateInput): Vendor {
    const id = `VND-${String(this.nextId++).padStart(4, "0")}`;
    const now = new Date().toISOString();

    const vendor: Vendor = {
      id,
      name: input.name,
      short_name: input.short_name ?? input.name.split(/\s+/).slice(0, 2).join(" "),
      categories: input.categories ?? ["other"],
      contacts: input.contacts ?? [],
      terms: input.terms ?? "net30",
      account_number: input.account_number ?? "",
      address: {
        street: input.address?.street ?? "",
        city: input.address?.city ?? "",
        state: input.address?.state ?? "",
        zip: input.address?.zip ?? "",
        country: input.address?.country ?? "US",
      },
      website: input.website ?? "",
      preferred: input.preferred ?? false,
      brands_carried: input.brands_carried ?? [],
      certifications: input.certifications ?? [],
      notes: input.notes ?? "",
      spend_ytd: 0,
      on_time_pct: 100,
      quality_pct: 100,
      created_at: now,
      updated_at: now,
      status: "active",
    };

    this.vendors.set(id, vendor);
    persistenceBridge.persist("vendors", id, vendor as any);
    log.info(`[VendorEngine] Created vendor ${id}: ${vendor.name}`);
    return vendor;
  }

  /**
   * Get a vendor by ID.
   */
  get(vendorId: string): Vendor | null {
    return this.vendors.get(vendorId) ?? null;
  }

  /**
   * Update a vendor's fields.
   */
  update(vendorId: string, updates: Partial<Omit<Vendor, "id" | "created_at">>): Vendor {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);

    const updated: Vendor = {
      ...vendor,
      ...updates,
      id: vendor.id,
      created_at: vendor.created_at,
      address: updates.address ? { ...vendor.address, ...updates.address } : vendor.address,
      updated_at: new Date().toISOString(),
    };

    this.vendors.set(vendorId, updated);
    persistenceBridge.persist("vendors", vendorId, updated as any);
    return updated;
  }

  /**
   * Search vendors by name, category, brand, or preferred status.
   */
  search(input: VendorSearchInput): Vendor[] {
    let results = Array.from(this.vendors.values());

    if (input.status) results = results.filter(v => v.status === input.status);
    else results = results.filter(v => v.status === "active");

    if (input.category) results = results.filter(v => v.categories.includes(input.category!));
    if (input.preferred_only) results = results.filter(v => v.preferred);

    if (input.brand) {
      const b = input.brand.toLowerCase();
      results = results.filter(v => v.brands_carried.some(br => br.toLowerCase().includes(b)));
    }

    if (input.query) {
      const q = input.query.toLowerCase();
      results = results.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.short_name.toLowerCase().includes(q) ||
        v.account_number.toLowerCase().includes(q) ||
        v.brands_carried.some(b => b.toLowerCase().includes(q))
      );
    }

    return results;
  }

  /**
   * List all vendors, optionally filtered by status.
   */
  list(status?: Vendor["status"]): Vendor[] {
    const all = Array.from(this.vendors.values());
    return status ? all.filter(v => v.status === status) : all;
  }

  /**
   * Generate a scorecard for a vendor.
   */
  scorecard(vendorId: string): VendorScorecard {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);

    const priceComp = vendor.preferred ? 85 : 70;
    const composite = Math.round(
      (vendor.on_time_pct * 0.35 + vendor.quality_pct * 0.35 + priceComp * 0.30)
    );

    const riskFlags: string[] = [];
    if (vendor.on_time_pct < 80) riskFlags.push("low_on_time_delivery");
    if (vendor.quality_pct < 90) riskFlags.push("quality_concern");
    if (vendor.categories.length === 1 && vendor.spend_ytd > 50000) riskFlags.push("single_category_high_spend");

    return {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      on_time_pct: vendor.on_time_pct,
      quality_pct: vendor.quality_pct,
      price_competitiveness: priceComp,
      composite_score: composite,
      spend_ytd: vendor.spend_ytd,
      total_pos: 0,
      risk_flags: riskFlags,
    };
  }

  /**
   * Get spend analysis for a vendor.
   */
  spendAnalysis(vendorId: string): SpendAnalysis {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);

    const byCategory: Record<string, number> = {};
    for (const cat of vendor.categories) {
      byCategory[cat] = Math.round(vendor.spend_ytd / vendor.categories.length);
    }

    return {
      vendor_id: vendor.id,
      vendor_name: vendor.name,
      total_spend: vendor.spend_ytd,
      by_category: byCategory,
      by_month: [],
      trend: "stable",
    };
  }

  /**
   * Record a spend amount against a vendor.
   */
  recordSpend(vendorId: string, amount: number): void {
    const vendor = this.vendors.get(vendorId);
    if (!vendor) throw new Error(`Vendor not found: ${vendorId}`);
    vendor.spend_ytd += amount;
    vendor.updated_at = new Date().toISOString();
  }

  /**
   * Get summary stats across all vendors.
   */
  getStats(): {
    total_vendors: number;
    active: number;
    preferred: number;
    total_spend_ytd: number;
    by_category: Record<string, number>;
    avg_on_time: number;
    avg_quality: number;
  } {
    const active = this.list("active");
    const byCategory: Record<string, number> = {};
    for (const v of active) {
      for (const c of v.categories) {
        byCategory[c] = (byCategory[c] ?? 0) + 1;
      }
    }

    return {
      total_vendors: this.vendors.size,
      active: active.length,
      preferred: active.filter(v => v.preferred).length,
      total_spend_ytd: active.reduce((sum, v) => sum + v.spend_ytd, 0),
      by_category: byCategory,
      avg_on_time: active.length > 0
        ? Math.round(active.reduce((sum, v) => sum + v.on_time_pct, 0) / active.length)
        : 0,
      avg_quality: active.length > 0
        ? Math.round(active.reduce((sum, v) => sum + v.quality_pct, 0) / active.length)
        : 0,
    };
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const vendorEngine = new VendorEngine();

persistenceBridge.registerMap({
  entity: "vendors",
  getMap: () => (vendorEngine as any).vendors as unknown as Map<string, any>,
  keyField: "id",
});
