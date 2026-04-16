/**
 * DistributionNetworkEngine — Where JM Die buys what from whom
 *
 * Maps product categories to preferred vendors, tracks brand preferences,
 * identifies supply chain risks (single-source dependencies), and
 * recommends reorder sources based on vendor performance and pricing.
 *
 * INGEST-MS2 / U-VND02
 * @module DistributionNetworkEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export type ProductCategory =
  | "carbide_inserts"
  | "end_mills"
  | "drills"
  | "tool_holders"
  | "collets"
  | "coolant"
  | "wire_edm_wire"
  | "edm_graphite"
  | "raw_steel"
  | "carbide_blanks"
  | "grinding_wheels"
  | "abrasives"
  | "workholding"
  | "measuring_instruments"
  | "safety_equipment"
  | "machine_parts"
  | "other";

export interface VendorProductLink {
  id: string;
  vendor_id: string;
  vendor_name: string;
  product_category: ProductCategory;
  brands: string[];
  preferred: boolean;
  lead_time_days: number;
  min_order: number;
  notes: string;
}

export interface BrandPreference {
  brand: string;
  product_category: ProductCategory;
  usage_count: number;
  preferred_vendor_id: string;
  preferred_vendor_name: string;
  notes: string;
}

export interface SupplyChainRisk {
  product_category: ProductCategory;
  risk_level: "low" | "medium" | "high" | "critical";
  vendor_count: number;
  reason: string;
  recommendation: string;
}

export interface NetworkMap {
  total_links: number;
  categories_covered: number;
  categories_uncovered: ProductCategory[];
  single_source: ProductCategory[];
  links: VendorProductLink[];
  risks: SupplyChainRisk[];
}

export interface ReorderRecommendation {
  product_category: ProductCategory;
  recommended_vendor_id: string;
  recommended_vendor_name: string;
  reason: string;
  lead_time_days: number;
  alternative_vendors: Array<{ vendor_id: string; vendor_name: string }>;
}

// ============================================================================
// ENGINE
// ============================================================================

const ALL_CATEGORIES: ProductCategory[] = [
  "carbide_inserts", "end_mills", "drills", "tool_holders", "collets",
  "coolant", "wire_edm_wire", "edm_graphite", "raw_steel", "carbide_blanks",
  "grinding_wheels", "abrasives", "workholding", "measuring_instruments",
  "safety_equipment", "machine_parts", "other",
];

class DistributionNetworkEngine {
  private links: Map<string, VendorProductLink> = new Map();
  private brands: Map<string, BrandPreference> = new Map();
  private nextId = 1;

  /**
   * Add a vendor-product relationship.
   */
  addLink(input: {
    vendor_id: string;
    vendor_name: string;
    product_category: ProductCategory;
    brands?: string[];
    preferred?: boolean;
    lead_time_days?: number;
    min_order?: number;
    notes?: string;
  }): VendorProductLink {
    const id = `LINK-${String(this.nextId++).padStart(4, "0")}`;
    const link: VendorProductLink = {
      id,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name,
      product_category: input.product_category,
      brands: input.brands ?? [],
      preferred: input.preferred ?? false,
      lead_time_days: input.lead_time_days ?? 7,
      min_order: input.min_order ?? 0,
      notes: input.notes ?? "",
    };

    this.links.set(id, link);

    // Track brand preferences
    for (const brand of link.brands) {
      const key = `${brand.toLowerCase()}:${link.product_category}`;
      const existing = this.brands.get(key);
      if (existing) {
        existing.usage_count++;
      } else {
        this.brands.set(key, {
          brand,
          product_category: link.product_category,
          usage_count: 1,
          preferred_vendor_id: link.vendor_id,
          preferred_vendor_name: link.vendor_name,
          notes: "",
        });
      }
    }

    return link;
  }

  /**
   * Get all vendor links for a product category.
   */
  getVendorsForCategory(category: ProductCategory): VendorProductLink[] {
    return Array.from(this.links.values())
      .filter(l => l.product_category === category)
      .sort((a, b) => (b.preferred ? 1 : 0) - (a.preferred ? 1 : 0));
  }

  /**
   * Get all product categories a vendor supplies.
   */
  getCategoriesForVendor(vendorId: string): VendorProductLink[] {
    return Array.from(this.links.values()).filter(l => l.vendor_id === vendorId);
  }

  /**
   * Get brand preferences across all categories.
   */
  getBrandPreferences(category?: ProductCategory): BrandPreference[] {
    let prefs = Array.from(this.brands.values());
    if (category) prefs = prefs.filter(p => p.product_category === category);
    return prefs.sort((a, b) => b.usage_count - a.usage_count);
  }

  /**
   * Assess supply chain risk across all categories.
   */
  assessRisk(): SupplyChainRisk[] {
    const risks: SupplyChainRisk[] = [];

    for (const cat of ALL_CATEGORIES) {
      const vendors = this.getVendorsForCategory(cat);
      const count = vendors.length;

      if (count === 0) {
        risks.push({
          product_category: cat,
          risk_level: "high",
          vendor_count: 0,
          reason: "No vendor registered for this category",
          recommendation: `Find and register at least 2 vendors for ${cat}`,
        });
      } else if (count === 1) {
        risks.push({
          product_category: cat,
          risk_level: "medium",
          vendor_count: 1,
          reason: "Single-source dependency",
          recommendation: `Add a backup vendor for ${cat} (currently only ${vendors[0].vendor_name})`,
        });
      } else {
        risks.push({
          product_category: cat,
          risk_level: "low",
          vendor_count: count,
          reason: `${count} vendors available`,
          recommendation: "",
        });
      }
    }

    return risks;
  }

  /**
   * Generate a full network map showing all vendor-product relationships.
   */
  getNetworkMap(): NetworkMap {
    const allLinks = Array.from(this.links.values());
    const coveredCats = new Set(allLinks.map(l => l.product_category));
    const uncovered = ALL_CATEGORIES.filter(c => !coveredCats.has(c));

    const singleSource: ProductCategory[] = [];
    for (const cat of coveredCats) {
      const vendors = new Set(allLinks.filter(l => l.product_category === cat).map(l => l.vendor_id));
      if (vendors.size === 1) singleSource.push(cat);
    }

    return {
      total_links: allLinks.length,
      categories_covered: coveredCats.size,
      categories_uncovered: uncovered,
      single_source: singleSource,
      links: allLinks,
      risks: this.assessRisk(),
    };
  }

  /**
   * Recommend the best vendor for a reorder in a given category.
   */
  recommendReorder(category: ProductCategory): ReorderRecommendation | null {
    const vendors = this.getVendorsForCategory(category);
    if (vendors.length === 0) return null;

    // Prefer preferred vendors, then shortest lead time
    const sorted = [...vendors].sort((a, b) => {
      if (a.preferred && !b.preferred) return -1;
      if (!a.preferred && b.preferred) return 1;
      return a.lead_time_days - b.lead_time_days;
    });

    const best = sorted[0];
    return {
      product_category: category,
      recommended_vendor_id: best.vendor_id,
      recommended_vendor_name: best.vendor_name,
      reason: best.preferred ? "Preferred vendor" : "Shortest lead time",
      lead_time_days: best.lead_time_days,
      alternative_vendors: sorted.slice(1).map(v => ({
        vendor_id: v.vendor_id,
        vendor_name: v.vendor_name,
      })),
    };
  }

  /**
   * Get summary stats.
   */
  getStats(): {
    total_links: number;
    total_brands: number;
    categories_covered: number;
    categories_uncovered: number;
    single_source_count: number;
    high_risk_count: number;
  } {
    const map = this.getNetworkMap();
    return {
      total_links: map.total_links,
      total_brands: this.brands.size,
      categories_covered: map.categories_covered,
      categories_uncovered: map.categories_uncovered.length,
      single_source_count: map.single_source.length,
      high_risk_count: map.risks.filter(r => r.risk_level === "high" || r.risk_level === "critical").length,
    };
  }

  /**
   * Reset all network data.
   */
  reset(): void {
    this.links.clear();
    this.brands.clear();
    this.nextId = 1;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const distributionNetworkEngine = new DistributionNetworkEngine();
