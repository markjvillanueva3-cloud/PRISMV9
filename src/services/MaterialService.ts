/**
 * MaterialService — Concrete implementation of IMaterialService.
 * Delegates to MaterialRegistry singleton for all data access.
 */

import { materialRegistry } from "../registries/MaterialRegistry.js";
import type { Material } from "../types.js";
import type { IMaterialService, MaterialSearchOptions } from "./interfaces/IMaterialService.js";

export class MaterialService implements IMaterialService {
  async getByIdOrName(identifier: string): Promise<Material | undefined> {
    return materialRegistry.getByIdOrName(identifier);
  }

  async search(options: MaterialSearchOptions): Promise<Material[]> {
    const result = await materialRegistry.search({
      query: options.query,
      iso_group: options.isoGroup,
      category: options.category,
      limit: options.limit,
    });
    return result.materials;
  }

  async getByISO(isoGroup: string): Promise<Material[]> {
    return materialRegistry.getByISO(isoGroup);
  }

  async getByCategory(category: string): Promise<Material[]> {
    return materialRegistry.getByCategory(category);
  }

  async getPhysicalProperties(identifier: string): Promise<Material["physical"] | undefined> {
    const material = await materialRegistry.getByIdOrName(identifier);
    return material?.physical;
  }

  async getCount(): Promise<number> {
    return materialRegistry.count();
  }
}

/** Singleton instance */
export const materialService = new MaterialService();
