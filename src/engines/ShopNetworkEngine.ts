/**
 * PRISM MCP Server — ShopNetworkEngine (E1134, CAMX-MS21/U02)
 *
 * Future networking concept for connecting machine shops for job sharing and
 * overflow routing. All data is modelled in-memory — no actual network calls
 * are made. The API surface is intentionally designed so that a real marketplace
 * back-end can be wired in later without changing the public interface.
 *
 * Privacy model
 * ─────────────
 * • Search returns scored matches but never exposes proprietary drawings.
 * • Shop identity is hidden in broadcast responses until mutual interest is
 *   confirmed (NDA gate). Only capability metadata and a masked shop_id are
 *   shared during search/broadcast phases.
 * • Actual job details (geometry, tolerances, drawings) are out of scope until
 *   an NDA has been executed — that workflow is explicitly stubbed here.
 *
 * Actions (wired in camDispatcher):
 *   shop_network_register  — register or update a shop profile
 *   shop_network_search    — find shops matching capability / cert / capacity
 *   shop_network_broadcast — post an overflow job to the network
 *   shop_network_stats     — summary statistics for the network
 *
 * @module ShopNetworkEngine
 */

// ============================================================================
// TYPES — DATA MODEL
// ============================================================================

/** Machine capability record for a single machine in the shop. */
export interface ShopMachine {
  /** Human-readable name, e.g. "Haas VF-5SS" */
  name: string;
  /** Process type, e.g. "milling" | "turning" | "grinding" | "EDM" | "laser" */
  type: string;
  /** Number of CNC axes (3 | 4 | 5 | ...) */
  axes: number;
  /** Working envelope — all dimensions in mm */
  travel_x_mm: number;
  travel_y_mm: number;
  travel_z_mm: number;
  /** Positional accuracy, mm (optional) */
  accuracy_mm?: number;
  /** Spindle max RPM (optional) */
  max_rpm?: number;
  /** Additional capability tags, e.g. ["live_tooling", "sub_spindle", "bar_feeder"] */
  capabilities?: string[];
}

/** Industry certification held by a shop. */
export type Certification =
  | "ISO_9001"
  | "AS9100"
  | "ITAR"
  | "NADCAP"
  | "ISO_13485"
  | "IATF_16949"
  | string;   // allow custom / future certs

/** Shift schedule descriptor. */
export interface ShiftSchedule {
  /** Number of shifts per day (1 | 2 | 3) */
  shifts_per_day: 1 | 2 | 3;
  /** Days per week shop operates */
  days_per_week: number;
}

/** Full shop profile submitted during registration. */
export interface ShopProfile {
  /** Unique shop name — used as a stable key before shop_id is assigned */
  name: string;
  /** City, state/province, country — used for distance scoring */
  location: {
    city: string;
    state?: string;
    country: string;
    /** WGS-84 latitude — required for distance-based search */
    lat?: number;
    /** WGS-84 longitude — required for distance-based search */
    lon?: number;
  };
  /** List of machines on the shop floor */
  machines: ShopMachine[];
  /** Quality / regulatory certifications */
  certifications: Certification[];
  /** Total billable capacity per week (all machines combined), hours */
  capacity_hours_per_week: number;
  /** Optional shift breakdown */
  shift_schedule?: ShiftSchedule;
  /** Material expertise, e.g. ["titanium", "inconel", "aluminium_6061"] */
  specialties_materials?: string[];
  /** Typical part size range */
  specialties_part_sizes?: Array<"micro" | "small" | "medium" | "large" | "heavy">;
  /** Industries served, e.g. ["aerospace", "medical", "defense", "automotive"] */
  specialties_industries?: string[];
  /** Preferred minimum order value, USD (optional) */
  min_order_usd?: number;
}

/** Criteria supplied to searchShops(). */
export interface ShopSearchCriteria {
  /** Process types or capability tags required, e.g. ["5-axis", "grinding", "EDM"] */
  required_capabilities?: string[];
  /** Certifications the winning shop must hold */
  required_certifications?: Certification[];
  /** Only include shops within this many kilometres of the reference_lat/lon */
  max_distance_km?: number;
  /** Reference latitude for proximity filter (required when max_distance_km is set) */
  reference_lat?: number;
  /** Reference longitude for proximity filter (required when max_distance_km is set) */
  reference_lon?: number;
  /** Minimum available hours per week required */
  min_capacity_hours?: number;
  /** Preferred industries */
  preferred_industries?: string[];
  /** Maximum number of results to return (default 10) */
  limit?: number;
}

/** A single match returned from searchShops(). */
export interface ShopMatch {
  /** Masked shop identifier — real name only revealed after mutual interest */
  shop_id: string;
  /** Overall match quality, 0–100 */
  capability_score: number;
  /** True if the shop holds all required certifications */
  cert_match: boolean;
  /** Great-circle distance from reference location, km (null if geo data missing) */
  distance_km: number | null;
  /** Reported available capacity, hours/week */
  available_hours: number;
  /** Number of axes on the best-fit machine for the requested process */
  best_machine_axes: number | null;
  /** Matched capability tags */
  matched_capabilities: string[];
  /** Industries served by this shop */
  industries: string[];
}

/** An overflow job broadcast to the network. */
export interface JobBroadcast {
  /** Short human-readable title — no drawing details */
  title: string;
  /** Required process / capability, e.g. "5-axis milling" */
  required_process: string;
  /** Required certifications the winning shop must hold */
  required_certifications?: Certification[];
  /** Approximate quantity of parts */
  quantity: number;
  /** Material group, e.g. "aluminium", "titanium", "steel_4140" */
  material: string;
  /** Desired delivery days from award */
  lead_time_days: number;
  /** Estimated hours of machine time per part */
  estimated_hours_per_part?: number;
  /** Budget ceiling per part, USD (optional — may be omitted for bid scenarios) */
  budget_per_part_usd?: number;
  /** Geographic preference — ISO country code or free-text region */
  preferred_region?: string;
  /** NDA required before drawing release? (default true) */
  nda_required?: boolean;
}

/** A shop's response to a broadcast job. */
export interface JobResponse {
  /** The responding shop's identifier */
  shop_id: string;
  /** Quoted price per part, USD */
  quote_per_part_usd: number;
  /** Quoted lead time, days */
  lead_time_days: number;
  /** Any notes the responding shop chooses to share */
  notes?: string;
}

// ============================================================================
// INTERNAL STORAGE
// ============================================================================

interface RegisteredShop extends ShopProfile {
  shop_id: string;
  registered_at: string; // ISO timestamp
}

interface BroadcastRecord {
  broadcast_id: string;
  job: JobBroadcast;
  posted_at: string;
  responses: Array<{ response_id: string; shop_id: string; response: JobResponse; submitted_at: string }>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Generate a short deterministic-ish ID. Not cryptographic — just unique enough
 *  for in-process demo usage. */
function genId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Great-circle distance between two WGS-84 points using the Haversine formula.
 * Returns km.
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth mean radius, km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Derive the flat capability tag set from a ShopProfile.
 * Includes machine types, axes labels ("5-axis"), and per-machine capability tags.
 */
function shopCapabilityTags(profile: ShopProfile): string[] {
  const tags = new Set<string>();
  for (const m of profile.machines) {
    tags.add(m.type.toLowerCase());
    tags.add(`${m.axes}-axis`);
    for (const cap of m.capabilities ?? []) tags.add(cap.toLowerCase());
  }
  return [...tags];
}

/**
 * Score how well a shop's capability tags satisfy the required list.
 * Returns a value in [0, 100].
 */
function scoreCapabilities(shopTags: string[], required: string[]): number {
  if (required.length === 0) return 100;
  const matched = required.filter((r) =>
    shopTags.some((t) => t.includes(r.toLowerCase()) || r.toLowerCase().includes(t))
  );
  return Math.round((matched.length / required.length) * 100);
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

class ShopNetworkEngine {
  private shops: Map<string, RegisteredShop> = new Map();
  private broadcasts: Map<string, BroadcastRecord> = new Map();

  // ── Registration ────────────────────────────────────────────────────────────

  /**
   * Register (or update) a shop profile in the network.
   *
   * @param profile  Complete shop profile — must include at least one machine.
   * @returns        Assigned shop_id and registration timestamp.
   */
  registerShop(profile: ShopProfile): { shop_id: string; registered_at: string; machine_count: number; capability_tags: string[] } {
    if (!profile.name || profile.name.trim() === "") {
      throw new Error("ShopNetworkEngine.registerShop: profile.name is required");
    }
    if (!profile.machines || profile.machines.length === 0) {
      throw new Error("ShopNetworkEngine.registerShop: at least one machine is required");
    }

    // Reuse existing shop_id if the same name re-registers (update semantics)
    const existing = [...this.shops.values()].find(
      (s) => s.name.toLowerCase() === profile.name.toLowerCase()
    );
    const shop_id = existing?.shop_id ?? genId("shop");
    const registered_at = new Date().toISOString();

    const record: RegisteredShop = { ...profile, shop_id, registered_at };
    this.shops.set(shop_id, record);

    return {
      shop_id,
      registered_at,
      machine_count: profile.machines.length,
      capability_tags: shopCapabilityTags(profile),
    };
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Search for shops matching the given criteria.
   *
   * Scoring (100-point scale):
   *   • Capability match  — 50 pts proportional to required tags matched
   *   • Certification     — 30 pts (all required certs matched = 30, partial pro-rated)
   *   • Capacity          — 10 pts (≥ min_capacity_hours = 10, else proportional)
   *   • Industry pref     — 10 pts (any preferred industry served = 10)
   *
   * Results are sorted by capability_score descending, then distance ascending.
   *
   * @param criteria  Search parameters.
   * @returns         Ranked list of ShopMatch records (identity masked).
   */
  searchShops(criteria: ShopSearchCriteria): ShopMatch[] {
    const limit = criteria.limit ?? 10;
    const reqCaps = criteria.required_capabilities ?? [];
    const reqCerts = criteria.required_certifications ?? [];

    const results: Array<ShopMatch & { _score: number }> = [];

    for (const shop of this.shops.values()) {
      const tags = shopCapabilityTags(shop);

      // ── Distance filter ────────────────────────────────────────────────────
      let distance_km: number | null = null;
      if (
        criteria.max_distance_km !== undefined &&
        criteria.reference_lat !== undefined &&
        criteria.reference_lon !== undefined
      ) {
        if (shop.location.lat !== undefined && shop.location.lon !== undefined) {
          distance_km = haversineKm(
            criteria.reference_lat,
            criteria.reference_lon,
            shop.location.lat,
            shop.location.lon
          );
          if (distance_km > criteria.max_distance_km) continue; // outside radius
        }
        // If shop has no geo data and a distance filter is active, skip it
        else {
          continue;
        }
      } else if (
        shop.location.lat !== undefined &&
        shop.location.lon !== undefined &&
        criteria.reference_lat !== undefined &&
        criteria.reference_lon !== undefined
      ) {
        distance_km = haversineKm(
          criteria.reference_lat,
          criteria.reference_lon,
          shop.location.lat,
          shop.location.lon
        );
      }

      // ── Capacity filter ────────────────────────────────────────────────────
      if (
        criteria.min_capacity_hours !== undefined &&
        shop.capacity_hours_per_week < criteria.min_capacity_hours
      ) {
        continue;
      }

      // ── Scoring ────────────────────────────────────────────────────────────
      const capScore = scoreCapabilities(tags, reqCaps) * 0.5; // 0–50

      let certScore = 0;
      if (reqCerts.length > 0) {
        const matched = reqCerts.filter((c) => shop.certifications.includes(c));
        certScore = (matched.length / reqCerts.length) * 30; // 0–30
      } else {
        certScore = 30;
      }

      let capacityScore = 0;
      if (criteria.min_capacity_hours) {
        capacityScore = Math.min(shop.capacity_hours_per_week / criteria.min_capacity_hours, 1) * 10;
      } else {
        capacityScore = 10;
      }

      let industryScore = 0;
      if (criteria.preferred_industries && criteria.preferred_industries.length > 0) {
        const served = shop.specialties_industries ?? [];
        const hit = criteria.preferred_industries.some((ind) =>
          served.some((s) => s.toLowerCase().includes(ind.toLowerCase()))
        );
        industryScore = hit ? 10 : 0;
      } else {
        industryScore = 10;
      }

      const totalScore = Math.round(capScore + certScore + capacityScore + industryScore);

      // Find best machine axes for the primary required process
      let best_machine_axes: number | null = null;
      if (reqCaps.length > 0) {
        const processTag = reqCaps[0].toLowerCase();
        const matching = shop.machines.filter(
          (m) =>
            m.type.toLowerCase().includes(processTag) ||
            (m.capabilities ?? []).some((c) => c.toLowerCase().includes(processTag))
        );
        if (matching.length > 0) {
          best_machine_axes = Math.max(...matching.map((m) => m.axes));
        }
      }

      const matchedCaps = reqCaps.filter((r) =>
        tags.some((t) => t.includes(r.toLowerCase()) || r.toLowerCase().includes(t))
      );

      results.push({
        shop_id: shop.shop_id,
        capability_score: totalScore,
        cert_match: reqCerts.every((c) => shop.certifications.includes(c)),
        distance_km,
        available_hours: shop.capacity_hours_per_week,
        best_machine_axes,
        matched_capabilities: matchedCaps,
        industries: shop.specialties_industries ?? [],
        _score: totalScore,
      });
    }

    // Sort: score desc, then distance asc (nulls last)
    results.sort((a, b) => {
      if (b._score !== a._score) return b._score - a._score;
      const da = a.distance_km ?? Infinity;
      const db = b.distance_km ?? Infinity;
      return da - db;
    });

    return results.slice(0, limit).map(({ _score: _ignored, ...m }) => m);
  }

  // ── Job Broadcasting ────────────────────────────────────────────────────────

  /**
   * Broadcast an overflow job to the network.
   *
   * No drawing or proprietary data is transmitted — only process/cert/material
   * requirements are shared. Shop identity is hidden until mutual interest.
   *
   * @param job  Job broadcast descriptor.
   * @returns    Assigned broadcast_id and metadata.
   */
  broadcastJob(job: JobBroadcast): {
    broadcast_id: string;
    posted_at: string;
    eligible_shop_count: number;
    nda_required: boolean;
    note: string;
  } {
    if (!job.title || job.title.trim() === "") {
      throw new Error("ShopNetworkEngine.broadcastJob: job.title is required");
    }
    if (!job.required_process || job.required_process.trim() === "") {
      throw new Error("ShopNetworkEngine.broadcastJob: job.required_process is required");
    }

    // Pre-screen: count shops that could plausibly respond
    const reqCaps = [job.required_process];
    const reqCerts = job.required_certifications ?? [];
    let eligibleCount = 0;
    for (const shop of this.shops.values()) {
      const tags = shopCapabilityTags(shop);
      const capMatch = scoreCapabilities(tags, reqCaps) > 0;
      const certMatch = reqCerts.every((c) => shop.certifications.includes(c));
      if (capMatch && certMatch) eligibleCount++;
    }

    const broadcast_id = genId("bcast");
    const posted_at = new Date().toISOString();

    this.broadcasts.set(broadcast_id, {
      broadcast_id,
      job,
      posted_at,
      responses: [],
    });

    return {
      broadcast_id,
      posted_at,
      eligible_shop_count: eligibleCount,
      nda_required: job.nda_required ?? true,
      note:
        "Broadcast posted. Shops matching your capability/cert requirements will see " +
        "this job. No drawing or proprietary data has been shared. Shop identities " +
        "are masked until mutual interest is confirmed.",
    };
  }

  /**
   * Submit a bid / response to a broadcast job.
   *
   * @param broadcast_id  The job broadcast to respond to.
   * @param response      The responding shop's bid.
   * @returns             Assigned response_id and confirmation.
   */
  respondToJob(
    broadcast_id: string,
    response: JobResponse
  ): { response_id: string; submitted_at: string; broadcast_id: string } {
    const broadcast = this.broadcasts.get(broadcast_id);
    if (!broadcast) {
      throw new Error(
        `ShopNetworkEngine.respondToJob: broadcast_id "${broadcast_id}" not found`
      );
    }
    if (!this.shops.has(response.shop_id)) {
      throw new Error(
        `ShopNetworkEngine.respondToJob: shop_id "${response.shop_id}" is not registered`
      );
    }

    const response_id = genId("resp");
    const submitted_at = new Date().toISOString();

    broadcast.responses.push({ response_id, shop_id: response.shop_id, response, submitted_at });

    return { response_id, submitted_at, broadcast_id };
  }

  // ── Statistics ──────────────────────────────────────────────────────────────

  /**
   * Return aggregate statistics about the current in-memory network.
   *
   * @returns  Network summary — shop counts broken down by capability and cert.
   */
  getNetworkStats(): {
    total_shops: number;
    total_broadcasts: number;
    by_capability: Record<string, number>;
    by_certification: Record<string, number>;
    by_industry: Record<string, number>;
    total_capacity_hours_per_week: number;
    average_capacity_hours_per_week: number;
  } {
    const by_capability: Record<string, number> = {};
    const by_certification: Record<string, number> = {};
    const by_industry: Record<string, number> = {};
    let totalCapacity = 0;

    for (const shop of this.shops.values()) {
      // Capability tags
      for (const tag of shopCapabilityTags(shop)) {
        by_capability[tag] = (by_capability[tag] ?? 0) + 1;
      }
      // Certifications
      for (const cert of shop.certifications) {
        by_certification[cert] = (by_certification[cert] ?? 0) + 1;
      }
      // Industries
      for (const ind of shop.specialties_industries ?? []) {
        by_industry[ind] = (by_industry[ind] ?? 0) + 1;
      }
      totalCapacity += shop.capacity_hours_per_week;
    }

    const total_shops = this.shops.size;

    return {
      total_shops,
      total_broadcasts: this.broadcasts.size,
      by_capability,
      by_certification,
      by_industry,
      total_capacity_hours_per_week: totalCapacity,
      average_capacity_hours_per_week:
        total_shops > 0 ? Math.round((totalCapacity / total_shops) * 10) / 10 : 0,
    };
  }

  // ── Internal helpers (used by tests / future endpoints) ─────────────────────

  /** Return all registered shops (for testing / admin views). */
  _listShops(): RegisteredShop[] {
    return [...this.shops.values()];
  }

  /** Return a broadcast record including responses (for testing). */
  _getBroadcast(broadcast_id: string): BroadcastRecord | undefined {
    return this.broadcasts.get(broadcast_id);
  }

  /** Clear all in-memory state — useful in test teardown. */
  _reset(): void {
    this.shops.clear();
    this.broadcasts.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const shopNetworkEngine = new ShopNetworkEngine();
