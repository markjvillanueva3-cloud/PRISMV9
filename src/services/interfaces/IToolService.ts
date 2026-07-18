/**
 * IToolService — Service contract for cutting tool data access.
 * Wraps ToolRegistry so engines don't import registry singletons directly.
 */

import type { CuttingTool } from "../../registries/ToolRegistry.js";

export interface ToolSearchOptions {
  query?: string;
  type?: string;
  manufacturer?: string;
  isoGroup?: string;
  limit?: number;
}

export interface IToolService {
  /** Get tool by ID */
  getTool(id: string): CuttingTool | undefined;

  /** Find tool by ID or catalog number */
  getByIdOrCatalog(identifier: string): Promise<CuttingTool | undefined>;

  /** Find tool by catalog number */
  getByCatalogNumber(catalogNumber: string): CuttingTool | undefined;

  /** Search tools with filters */
  search(options: ToolSearchOptions): CuttingTool[];

  /** Get tools suitable for a material ISO group */
  getForMaterialGroup(isoGroup: string): CuttingTool[];

  /** Get tools by type (endmill, drill, insert, etc.) */
  getByType(type: string): CuttingTool[];

  /** Get tool count */
  getCount(): number;
}
