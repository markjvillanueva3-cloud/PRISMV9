/**
 * ToolService — Concrete implementation of IToolService.
 * Delegates to ToolRegistry singleton for all data access.
 */

import { toolRegistry, type CuttingTool } from "../registries/ToolRegistry.js";
import type { IToolService, ToolSearchOptions } from "./interfaces/IToolService.js";

export class ToolService implements IToolService {
  getTool(id: string): CuttingTool | undefined {
    return toolRegistry.getTool(id);
  }

  async getByIdOrCatalog(identifier: string): Promise<CuttingTool | undefined> {
    return toolRegistry.getByIdOrCatalog(identifier);
  }

  getByCatalogNumber(catalogNumber: string): CuttingTool | undefined {
    return toolRegistry.getByCatalogNumber(catalogNumber);
  }

  search(options: ToolSearchOptions): CuttingTool[] {
    const result = toolRegistry.search({
      query: options.query,
      type: options.type,
      manufacturer: options.manufacturer,
      material_group: options.isoGroup,
      limit: options.limit,
    });
    return result.tools;
  }

  getForMaterialGroup(isoGroup: string): CuttingTool[] {
    return toolRegistry.getForMaterialGroup(isoGroup);
  }

  getByType(type: string): CuttingTool[] {
    return toolRegistry.getByType(type);
  }

  getCount(): number {
    return toolRegistry.count();
  }
}

/** Singleton instance */
export const toolService = new ToolService();
