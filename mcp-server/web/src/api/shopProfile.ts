import { fetchJson } from './requestCore';
import { getRequestHeaders } from './client';

export interface ShopMachine {
  id: string;
  name: string;
  type: string;
  hourly_rate: number;
  capabilities: string[];
  controller?: string;
  max_rpm?: number;
  max_power_kw?: number;
  bar_capacity_mm?: number;
  has_bar_feeder?: boolean;
  has_sub_spindle?: boolean;
  has_live_tooling?: boolean;
  turret_stations?: number;
  coolant_types?: string[];
  magazine?: Array<{
    station: number;
    insert_type?: string;
    holder?: string;
    remaining_life_min?: number;
  }>;
  wedm_uv_travel_mm?: number;
  wedm_max_taper_deg?: number;
  wedm_max_workpiece_height_mm?: number;
  wedm_auto_threading?: boolean;
  wedm_submerged_cutting?: boolean;
  wedm_brand?: string;
  wedm_wire_inventory?: Array<{
    wire_type: string;
    diameter_mm: number;
    spool_weight_kg: number;
    remaining_pct: number;
  }>;
}

export interface ShopProfile {
  company_profile: {
    legal_name: string;
    short_code: string;
    domain: string;
    industry: string;
    specialization: string;
    region: string;
    timezone: string;
    file_archive_path: string;
    canonical_test_shop: boolean;
    development_role: string;
    cad_systems: string[];
    cam_systems: string[];
  };
  source_roots: {
    company_root: string;
    programs_root: string;
    employee_database_root: string;
    machines_root: string;
    controllers_root: string;
    tool_holders_root: string;
    tooling_root: string;
    materials_root: string;
    prints_root: string;
  };
  seed_domains: Array<{
    id: string;
    label: string;
    status: 'seeded' | 'in_progress' | 'planned';
    note: string;
    source_path: string;
  }>;
  id: string;
  name: string;
  rates: {
    labor_per_hr: number;
    overhead_per_hr: number;
    admin_per_hr: number;
    setup_per_hr: number;
    programming_per_hr: number;
    inspection_per_hr: number;
  };
  machines: ShopMachine[];
  overhead_pct: number;
  material_markup_pct: number;
  tooling_cost_per_op: number;
  material_cost_per_part_default: number;
  admin_burden_pct: number;
}

export interface ShopMachineControllerRegistryEntry {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  controller_family: string;
  controller_model: string;
  shop_controller: string;
  post_processor?: string;
  machine_rate_per_hour: number;
  canonical_test_machine: boolean;
  program_release_ready: boolean;
  machine_source_root: string;
  controller_source_root: string;
}

export interface ShopMachineSeedSummary {
  shop_id: string;
  machine_count: number;
  mapped_controller_count: number;
  unmapped_machine_count: number;
  program_release_ready_machine_count: number;
  machine_source_root: string;
  controller_source_root: string;
}

export interface JMDieSelectorSeedSummary {
  shop_id: string;
  toolholder_count: number;
  tooling_package_count: number;
  stock_profile_count: number;
  live_tool_count: number;
  live_holder_count: number;
  tooling_categories: string[];
  tool_holders_root: string;
  tooling_root: string;
  materials_root: string;
  tool_holders_root_present: boolean;
  tooling_root_present: boolean;
  materials_root_present: boolean;
}

type ProfileResponse = {
  ok: boolean;
  profile: ShopProfile;
};

type MachinesResponse = {
  ok: boolean;
  machines: ShopMachine[];
};

type RegistryResponse = {
  ok: boolean;
  registry: ShopMachineControllerRegistryEntry[];
};

type MachineSeedSummaryResponse = {
  ok: boolean;
  summary: ShopMachineSeedSummary;
};

type SelectorSeedSummaryResponse = {
  ok: boolean;
  summary: JMDieSelectorSeedSummary;
};

const SHOP_API_BASE = '/api/v1/shop';

function requestShopJson<T>(path: string, options?: {
  method?: string;
  body?: Record<string, unknown>;
  fallbackMessage?: string;
}) {
  // U-ERP-SHOPCONFIG-AUTH: the /api/v1/shop router now requires verifyToken.
  // getRequestHeaders() carries the Bearer token (when logged in) + the
  // Content-Type, so every shop-profile call authenticates instead of 401ing.
  return fetchJson<T>(`${SHOP_API_BASE}${path}`, {
    method: options?.method,
    headers: getRequestHeaders(),
    body: options?.body ? JSON.stringify(options.body) : undefined,
    fallbackMessage: options?.fallbackMessage ?? 'Shop profile request failed',
  });
}

export async function fetchActiveShopProfile() {
  const response = await requestShopJson<ProfileResponse>('/profile', {
    fallbackMessage: 'Unable to load the active shop profile',
  });
  return response.profile;
}

export async function updateActiveShopProfile(updates: Partial<ShopProfile>) {
  const response = await requestShopJson<ProfileResponse>('/profile', {
    method: 'PUT',
    body: updates as Record<string, unknown>,
    fallbackMessage: 'Unable to save the active shop profile',
  });
  return response.profile;
}

export async function addShopMachine(machine: ShopMachine) {
  const response = await requestShopJson<MachinesResponse>('/machines', {
    method: 'POST',
    body: machine as unknown as Record<string, unknown>,
    fallbackMessage: 'Unable to add the shop machine',
  });
  return response.machines;
}

export async function updateShopMachine(machineId: string, machine: ShopMachine) {
  const response = await requestShopJson<{ ok: boolean; machine: ShopMachine }>(`/machines/${encodeURIComponent(machineId)}`, {
    method: 'PUT',
    body: machine as unknown as Record<string, unknown>,
    fallbackMessage: 'Unable to update the shop machine',
  });
  return response.machine;
}

export async function removeShopMachine(machineId: string) {
  const response = await requestShopJson<MachinesResponse>(`/machines/${encodeURIComponent(machineId)}`, {
    method: 'DELETE',
    fallbackMessage: 'Unable to remove the shop machine',
  });
  return response.machines;
}

export async function fetchShopMachineControllerRegistry() {
  const response = await requestShopJson<RegistryResponse>('/machine-controller-registry', {
    fallbackMessage: 'Unable to load the JM Die machine/controller registry',
  });
  return response.registry;
}

export async function fetchShopMachineSeedSummary() {
  const response = await requestShopJson<MachineSeedSummaryResponse>('/machine-seed-summary', {
    fallbackMessage: 'Unable to load the JM Die machine seed summary',
  });
  return response.summary;
}

export async function fetchShopSelectorResourceSummary() {
  const response = await requestShopJson<SelectorSeedSummaryResponse>('/selector-resource-summary', {
    fallbackMessage: 'Unable to load the JM Die selector seed summary',
  });
  return response.summary;
}
