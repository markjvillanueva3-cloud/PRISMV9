/**
 * PRISM MCP Server — Purchasing Directory Engine
 *
 * Industrial supplier/distributor database for CNC shops.
 * National distributors, specialty suppliers, regional distributors,
 * and manufacturer direct links.
 *
 * Ported from PRISM_PURCHASING_SYSTEM.js (monolith R2.3.1).
 *
 * @module PurchasingDirectoryEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Supplier {
  id: string;
  name: string;
  short_name: string;
  type: string;
  website: string;
  search_url?: string;
  features: string[];
  brands?: string;
  specialties: string[];
  price_level: string;
  account_benefits?: string[];
  region?: string;
}

/** Supplier Search Result configuration/data structure.
 */
export interface SupplierSearchResult {
  suppliers: Supplier[];
  total: number;
  query: string;
}

// ============================================================================
// DATA
// ============================================================================

const NATIONAL: Supplier[] = [
  { id: "msc", name: "MSC Industrial Direct", short_name: "MSC", type: "Full-Line Industrial Distributor", website: "https://www.mscdirect.com", search_url: "https://www.mscdirect.com/browse/tn/?searchterm=", features: ["Same-Day Shipping", "Technical Support", "Vending", "Tool Management"], brands: "All Major Brands", specialties: ["Cutting Tools", "Abrasives", "MRO", "Safety"], price_level: "Competitive", account_benefits: ["Volume Discounts", "Net Terms", "eProcurement"] },
  { id: "grainger", name: "Grainger", short_name: "Grainger", type: "MRO & Industrial Supplier", website: "https://www.grainger.com", search_url: "https://www.grainger.com/search?searchQuery=", features: ["500+ Branches", "Same-Day Pickup", "24/7 Support"], specialties: ["MRO", "Safety", "Facilities", "Some Tooling"], price_level: "Premium", account_benefits: ["Grainger Choice", "Consignment", "VMI"] },
  { id: "mcmaster", name: "McMaster-Carr", short_name: "McMaster", type: "Industrial Hardware Specialist", website: "https://www.mcmaster.com", features: ["Same-Day Shipping", "Huge Selection", "CAD Models"], specialties: ["Hardware", "Raw Materials", "Components", "Tools"], price_level: "Premium", account_benefits: ["No Minimum Order", "Fast Shipping"] },
  { id: "travers", name: "Travers Tool Co.", short_name: "Travers", type: "Cutting Tool Specialist", website: "https://www.travers.com", search_url: "https://www.travers.com/search#w=", features: ["Tool Specialists", "Technical Support", "Regrinding"], specialties: ["Cutting Tools", "Workholding", "Measurement"], price_level: "Competitive", account_benefits: ["Volume Pricing", "Credit Terms"] },
  { id: "kbc", name: "KBC Tools & Machinery", short_name: "KBC", type: "Industrial Tools & Machinery", website: "https://www.kbctools.com", features: ["Large Selection", "Machinery Sales"], specialties: ["Cutting Tools", "Machine Accessories", "Shop Equipment"], price_level: "Value-Competitive", account_benefits: ["Frequent Promotions", "Free Shipping Offers"] },
  { id: "zoro", name: "Zoro (Grainger Company)", short_name: "Zoro", type: "Online Industrial Supplier", website: "https://www.zoro.com", search_url: "https://www.zoro.com/search?q=", features: ["Online Only", "Free Shipping", "Wide Selection"], specialties: ["MRO", "Tools", "Safety", "Facilities"], price_level: "Value" },
  { id: "fastenal", name: "Fastenal", short_name: "Fastenal", type: "Industrial & Construction Supplies", website: "https://www.fastenal.com", search_url: "https://www.fastenal.com/products?term=", features: ["3,300+ Branches", "Vending", "On-Site Solutions"], specialties: ["Fasteners", "Safety", "Cutting Tools", "OEM Supply"], price_level: "Competitive", account_benefits: ["Vending Programs", "VMI", "Bin Stock"] },
  { id: "misumi", name: "MISUMI USA", short_name: "MISUMI", type: "Configurable Components", website: "https://us.misumi-ec.com", features: ["Configurable Parts", "CAD Downloads", "Fast Delivery"], specialties: ["Automation", "Components", "Die/Mold", "Cutting Tools"], price_level: "Value", account_benefits: ["Rapid Shipping", "Custom Configurations"] },
];

const SPECIALTY: Supplier[] = [
  { id: "carbide_depot", name: "Carbide Depot", short_name: "Carbide Depot", type: "Carbide Insert Specialist", website: "https://www.carbidedepot.com", features: ["25+ Years", "Expert Support"], specialties: ["Carbide Inserts", "Indexable Tooling"], price_level: "Value" },
  { id: "maritool", name: "Maritool", short_name: "Maritool", type: "Toolholding Manufacturer", website: "https://www.maritool.com", features: ["Made in USA"], specialties: ["ER Collets", "Toolholders"], price_level: "Value-Premium" },
  { id: "lakeshore", name: "Lakeshore Carbide", short_name: "Lakeshore", type: "End Mill Specialist", website: "https://www.lakeshorecarbide.com", features: ["Made in USA"], specialties: ["Carbide End Mills"], price_level: "Value" },
  { id: "carr_lane", name: "Carr Lane Manufacturing", short_name: "Carr Lane", type: "Workholding & Fixturing", website: "https://www.carrlane.com", features: ["Fixturing Specialist"], specialties: ["Fixturing", "Clamps", "Pins", "Locators"], price_level: "Premium" },
  { id: "master_fluid", name: "Master Fluid Solutions", short_name: "Master Fluid", type: "Metalworking Fluids", website: "https://www.masterfluidsolutions.com", features: ["Technical Support"], specialties: ["Coolants", "Cutting Fluids"], price_level: "Premium" },
];

const MANUFACTURERS: Record<string, Array<{ id: string; name: string; url: string; category: string }>> = {
  cutting_tools: [
    { id: "sandvik", name: "Sandvik Coromant", url: "https://www.sandvik.coromant.com", category: "cutting_tools" },
    { id: "kennametal", name: "Kennametal", url: "https://www.kennametal.com", category: "cutting_tools" },
    { id: "iscar", name: "ISCAR", url: "https://www.iscar.com", category: "cutting_tools" },
    { id: "walter", name: "Walter Tools", url: "https://www.walter-tools.com", category: "cutting_tools" },
    { id: "seco", name: "Seco Tools", url: "https://www.secotools.com", category: "cutting_tools" },
    { id: "guhring", name: "Guhring", url: "https://www.guhring.com", category: "cutting_tools" },
    { id: "harvey", name: "Harvey Tool", url: "https://www.harveytool.com", category: "cutting_tools" },
    { id: "osg", name: "OSG USA", url: "https://www.osgtool.com", category: "cutting_tools" },
    { id: "tungaloy", name: "Tungaloy", url: "https://www.tungaloy.com", category: "cutting_tools" },
  ],
  workholding: [
    { id: "schunk", name: "SCHUNK", url: "https://schunk.com", category: "workholding" },
    { id: "rego_fix", name: "REGO-FIX", url: "https://www.rego-fix.com", category: "workholding" },
    { id: "haimer", name: "HAIMER", url: "https://www.haimer.com", category: "workholding" },
    { id: "big_kaiser", name: "BIG KAISER", url: "https://www.bigkaiser.com", category: "workholding" },
  ],
  machine_parts: [
    { id: "fanuc", name: "FANUC America", url: "https://www.fanucamerica.com", category: "machine_parts" },
    { id: "siemens", name: "Siemens CNC", url: "https://www.siemens.com/cnc", category: "machine_parts" },
    { id: "heidenhain", name: "HEIDENHAIN", url: "https://www.heidenhain.com", category: "machine_parts" },
    { id: "renishaw", name: "Renishaw", url: "https://www.renishaw.com", category: "machine_parts" },
  ],
};

// ============================================================================
// ENGINE
// ============================================================================

class PurchasingDirectoryEngineImpl {

  /**
   * Search suppliers by keyword (matches name, specialties, type)
   */
  searchSuppliers(query: string): SupplierSearchResult {
    const q = query.toLowerCase();
    const all = [...NATIONAL, ...SPECIALTY];
    const matches = all.filter(s =>
      s.name.toLowerCase().includes(q)
      || s.specialties.some(sp => sp.toLowerCase().includes(q))
      || s.type.toLowerCase().includes(q)
      || s.features.some(f => f.toLowerCase().includes(q)),
    );
    return { suppliers: matches, total: matches.length, query };
  }

  /**
   * Get all national distributors
   */
  getNationalDistributors(): Supplier[] {
    return NATIONAL;
  }

  /**
   * Get specialty suppliers by category
   */
  getSpecialtySuppliers(category?: string): Supplier[] {
    if (!category) return SPECIALTY;
    const q = category.toLowerCase();
    return SPECIALTY.filter(s =>
      s.specialties.some(sp => sp.toLowerCase().includes(q)),
    );
  }

  /**
   * Get manufacturer direct links by category
   */
  getManufacturers(category?: string): Array<{
    id: string; name: string; url: string; category: string;
  }> {
    if (category && MANUFACTURERS[category]) {
      return MANUFACTURERS[category];
    }
    return Object.values(MANUFACTURERS).flat();
  }

  /**
   * Recommend suppliers for a specific need
   */
  recommendSuppliers(params: {
    need: string;
    priority?: "price" | "speed" | "quality" | "selection";
  }): SupplierSearchResult {
    const results = this.searchSuppliers(params.need);
    if (params.priority === "price") {
      results.suppliers.sort((a, b) => {
        const rank = { Value: 0, "Value-Competitive": 1, Competitive: 2, Premium: 3 };
        return (rank[a.price_level as keyof typeof rank] ?? 2)
             - (rank[b.price_level as keyof typeof rank] ?? 2);
      });
    }
    return results;
  }

  /**
   * Get supplier by ID
   */
  getSupplier(id: string): Supplier | { error: string } {
    const all = [...NATIONAL, ...SPECIALTY];
    return all.find(s => s.id === id) ?? { error: `Supplier '${id}' not found` };
  }

  /**
   * Summary stats
   */
  summary(): {
    national: number;
    specialty: number;
    manufacturers: number;
    categories: string[];
  } {
    return {
      national: NATIONAL.length,
      specialty: SPECIALTY.length,
      manufacturers: Object.values(MANUFACTURERS).flat().length,
      categories: Object.keys(MANUFACTURERS),
    };
  }
}

/** Purchasing Directory Engine constant.
 */
export const purchasingDirectoryEngine = new PurchasingDirectoryEngineImpl();
