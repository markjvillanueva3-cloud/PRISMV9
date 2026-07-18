/**
 * IMaterialService — Service contract for material data access.
 * Wraps MaterialRegistry so engines don't import registry singletons directly.
 */

import type { Material } from "../../types.js";

export interface MaterialSearchOptions {
  query?: string;
  isoGroup?: string;
  category?: string;
  limit?: number;
}

export interface IMaterialService {
  /** Find material by ID or name */
  getByIdOrName(identifier: string): Promise<Material | undefined>;

  /** Search materials with filters */
  search(options: MaterialSearchOptions): Promise<Material[]>;

  /** Get all materials in an ISO group (P, M, K, N, S, H) */
  getByISO(isoGroup: string): Promise<Material[]>;

  /** Get all materials in a category */
  getByCategory(category: string): Promise<Material[]>;

  /** Get material physical properties (density, thermal conductivity, etc.) */
  getPhysicalProperties(identifier: string): Promise<Material["physical"] | undefined>;

  /** Get material count */
  getCount(): Promise<number>;
}
