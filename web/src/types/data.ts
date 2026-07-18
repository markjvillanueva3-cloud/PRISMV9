export interface SearchParams {
  query: string;
  limit?: number;
}

export interface MaterialRecord {
  id: string;
  name: string;
  iso_group: string;
  hardness_hrc?: number;
  tensile_strength_mpa?: number;
  machinability_rating?: number;
  density_kg_m3?: number;
  thermal_conductivity?: number;
}

export interface ToolRecord {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  diameter_mm: number;
  flutes?: number;
  coating?: string;
  material?: string;
  max_depth_mm?: number;
}

export interface MachineRecord {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  axes: number;
  max_rpm: number;
  power_kw: number;
  table_size?: { x: number; y: number };
  travel?: { x: number; y: number; z: number };
}

export interface AlarmResult {
  code: string;
  controller: string;
  description: string;
  cause: string;
  remedy: string;
  severity: string;
}

export interface SearchResult<T> {
  results: T[];
  total: number;
  query: string;
}

export interface ApiError {
  message: string;
  code?: string;
}
