/**
 * CAMX-MS21/U02 Action Schemas — Zod v4
 *
 * 4 dispatcher actions (ShopNetworkEngine E1134):
 *   shop_network_register  — register or update a shop profile
 *   shop_network_search    — find shops by capability / cert / location / capacity
 *   shop_network_broadcast — post an overflow job to the network (no drawings)
 *   shop_network_stats     — aggregate network statistics
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const shopMachineZ = z.object({
  name:         z.string().min(1).describe("Machine name, e.g. 'Haas VF-5SS'"),
  type:         z.string().describe("Process type: milling | turning | grinding | EDM | laser | waterjet | ..."),
  axes:         z.number().int().min(1).max(9).describe("Number of CNC axes, e.g. 3 | 4 | 5"),
  travel_x_mm:  z.number().positive().describe("X working envelope, mm"),
  travel_y_mm:  z.number().positive().describe("Y working envelope, mm"),
  travel_z_mm:  z.number().positive().describe("Z working envelope, mm"),
  accuracy_mm:  z.number().positive().optional().describe("Positional accuracy, mm — e.g. 0.005"),
  max_rpm:      z.number().positive().optional().describe("Spindle max RPM"),
  capabilities: z.array(z.string()).optional().describe(
    "Extra capability tags, e.g. ['live_tooling', 'sub_spindle', 'bar_feeder', 'high_speed']"
  ),
}).passthrough();

const certificationZ = z.enum([
  "ISO_9001",
  "AS9100",
  "ITAR",
  "NADCAP",
  "ISO_13485",
  "IATF_16949",
]).or(z.string()).describe(
  "ISO_9001 | AS9100 | ITAR | NADCAP | ISO_13485 | IATF_16949 | <custom>"
);

const shiftScheduleZ = z.object({
  shifts_per_day:  z.union([z.literal(1), z.literal(2), z.literal(3)]).describe("Shifts per day"),
  days_per_week:   z.number().int().min(1).max(7).describe("Operating days per week"),
}).passthrough();

const locationZ = z.object({
  city:    z.string().min(1).describe("City name"),
  state:   z.string().optional().describe("State or province"),
  country: z.string().min(1).describe("Country name or ISO 3166-1 code"),
  lat:     z.number().min(-90).max(90).optional().describe("WGS-84 latitude — required for proximity search"),
  lon:     z.number().min(-180).max(180).optional().describe("WGS-84 longitude — required for proximity search"),
}).passthrough();

// ── shop_network_register ─────────────────────────────────────────────────────

const shopNetworkRegisterZ = z.object({
  name:                      z.string().min(1).describe("Shop name — used as a stable key for update semantics"),
  location:                  locationZ,
  machines:                  z.array(shopMachineZ).min(1).describe("At least one machine required"),
  certifications:            z.array(certificationZ).describe("Quality / regulatory certifications held"),
  capacity_hours_per_week:   z.number().positive().describe("Total available machine-hours per week across all machines"),
  shift_schedule:            shiftScheduleZ.optional().describe("Shift breakdown (optional)"),
  specialties_materials:     z.array(z.string()).optional().describe(
    "Material expertise, e.g. ['titanium', 'inconel', 'aluminium_6061']"
  ),
  specialties_part_sizes:    z.array(z.enum(["micro", "small", "medium", "large", "heavy"])).optional().describe(
    "Typical part size range handled"
  ),
  specialties_industries:    z.array(z.string()).optional().describe(
    "Industries served, e.g. ['aerospace', 'medical', 'defense', 'automotive']"
  ),
  min_order_usd:             z.number().nonnegative().optional().describe("Preferred minimum order value, USD"),
}).passthrough();

// ── shop_network_search ───────────────────────────────────────────────────────

const shopNetworkSearchZ = z.object({
  required_capabilities:    z.array(z.string()).optional().describe(
    "Process types or capability tags required, e.g. ['5-axis', 'grinding', 'EDM']"
  ),
  required_certifications:  z.array(certificationZ).optional().describe(
    "Certifications every result must hold"
  ),
  max_distance_km:          z.number().positive().optional().describe(
    "Radius filter — only return shops within this many km of reference_lat/lon"
  ),
  reference_lat:            z.number().min(-90).max(90).optional().describe(
    "WGS-84 latitude of the requester (required when max_distance_km is set)"
  ),
  reference_lon:            z.number().min(-180).max(180).optional().describe(
    "WGS-84 longitude of the requester (required when max_distance_km is set)"
  ),
  min_capacity_hours:       z.number().positive().optional().describe("Minimum available hours per week"),
  preferred_industries:     z.array(z.string()).optional().describe(
    "Boost shops that serve these industries, e.g. ['aerospace', 'medical']"
  ),
  limit:                    z.number().int().min(1).max(100).optional().default(10).describe(
    "Maximum results to return (default 10)"
  ),
}).passthrough();

// ── shop_network_broadcast ────────────────────────────────────────────────────

const shopNetworkBroadcastZ = z.object({
  title:                    z.string().min(1).describe("Short job title — no drawing details, e.g. 'Titanium bracket, 5-axis, 25 pcs'"),
  required_process:         z.string().min(1).describe("Required process or capability, e.g. '5-axis milling' | 'cylindrical grinding'"),
  required_certifications:  z.array(certificationZ).optional().describe("Certifications the winning shop must hold"),
  quantity:                 z.number().int().positive().describe("Part quantity"),
  material:                 z.string().min(1).describe("Material group, e.g. 'titanium' | 'aluminium' | 'steel_4140'"),
  lead_time_days:           z.number().int().positive().describe("Desired delivery days from award"),
  estimated_hours_per_part: z.number().positive().optional().describe("Estimated machine-hours per part"),
  budget_per_part_usd:      z.number().positive().optional().describe("Budget ceiling per part USD — omit for open bid"),
  preferred_region:         z.string().optional().describe("Geographic preference — ISO country code or free-text region"),
  nda_required:             z.boolean().optional().default(true).describe(
    "NDA required before drawing release? Default true — no drawings shared until NDA signed"
  ),
}).passthrough();

// ── shop_network_stats ────────────────────────────────────────────────────────

const shopNetworkStatsZ = z.object({
  // No input required — reserved for future filter parameters
}).passthrough();

// ── Export ────────────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS21_U02_SCHEMAS: ActionSchemaMap = {
  shop_network_register:  shopNetworkRegisterZ,
  shop_network_search:    shopNetworkSearchZ,
  shop_network_broadcast: shopNetworkBroadcastZ,
  shop_network_stats:     shopNetworkStatsZ,
};
