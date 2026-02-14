import { BaseRegistry } from './BaseRegistry';
import { CuttingTool, ToolType, CoatingType, Material, Operation } from '../types';

interface CuttingData {
  surfaceSpeed: number; // m/min
  spindleSpeed: number; // rpm
  feedRate: number; // mm/min
  axialDepthOfCut: number; // mm
  radialDepthOfCut: number; // mm
  plungeRate: number; // mm/min
}

interface ToolCompatibility {
  materialIds: string[];
  operations: string[];
  hardnessRange?: { min: number; max: number };
  temperatureRange?: { min: number; max: number };
}

interface EnhancedCuttingTool extends CuttingTool {
  compatibility: ToolCompatibility;
  cuttingData: Map<string, CuttingData>; // materialId -> cutting data
  wear: {
    expectedLife: number; // minutes
    wearIndicators: string[];
  };
}

export class ToolRegistry extends BaseRegistry<EnhancedCuttingTool> {
  private typeIndex: Map<ToolType, Set<string>> = new Map();
  private diameterIndex: Map<string, Set<string>> = new Map();
  private coatingIndex: Map<CoatingType, Set<string>> = new Map();
  private materialIndex: Map<string, Set<string>> = new Map();
  private operationIndex: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeIndexes();
  }

  private initializeIndexes(): void {
    Object.values(ToolType).forEach(type => {
      this.typeIndex.set(type, new Set());
    });
    Object.values(CoatingType).forEach(coating => {
      this.coatingIndex.set(coating, new Set());
    });
  }

  protected buildIndexes(): void {
    this.clearIndexes();
    
    for (const [id, tool] of this.items) {
      this.addToTypeIndex(id, tool.type);
      this.addToDiameterIndex(id, tool.diameter);
      this.addToCoatingIndex(id, tool.coating);
      this.addToMaterialIndexes(id, tool.compatibility.materialIds);
      this.addToOperationIndexes(id, tool.compatibility.operations);
    }
  }

  private clearIndexes(): void {
    this.typeIndex.forEach(set => set.clear());
    this.diameterIndex.clear();
    this.coatingIndex.forEach(set => set.clear());
    this.materialIndex.clear();
    this.operationIndex.clear();
  }

  private addToTypeIndex(id: string, type: ToolType): void {
    if (!this.typeIndex.has(type)) {
      this.typeIndex.set(type, new Set());
    }
    this.typeIndex.get(type)!.add(id);
  }

  private addToDiameterIndex(id: string, diameter: number): void {
    const range = this.getDiameterRange(diameter);
    if (!this.diameterIndex.has(range)) {
      this.diameterIndex.set(range, new Set());
    }
    this.diameterIndex.get(range)!.add(id);
  }

  private addToCoatingIndex(id: string, coating: CoatingType): void {
    if (!this.coatingIndex.has(coating)) {
      this.coatingIndex.set(coating, new Set());
    }
    this.coatingIndex.get(coating)!.add(id);
  }

  private addToMaterialIndexes(id: string, materialIds: string[]): void {
    materialIds.forEach(materialId => {
      if (!this.materialIndex.has(materialId)) {
        this.materialIndex.set(materialId, new Set());
      }
      this.materialIndex.get(materialId)!.add(id);
    });
  }

  private addToOperationIndexes(id: string, operations: string[]): void {
    operations.forEach(operation => {
      if (!this.operationIndex.has(operation)) {
        this.operationIndex.set(operation, new Set());
      }
      this.operationIndex.get(operation)!.add(id);
    });
  }

  private getDiameterRange(diameter: number): string {
    if (diameter <= 1) return '0-1';
    if (diameter <= 3) return '1-3';
    if (diameter <= 6) return '3-6';
    if (diameter <= 10) return '6-10';
    if (diameter <= 16) return '10-16';
    if (diameter <= 25) return '16-25';
    if (diameter <= 40) return '25-40';
    return '40+';
  }

  public getById(id: string): EnhancedCuttingTool | undefined {
    return this.items.get(id);
  }

  public getByType(type: ToolType): EnhancedCuttingTool[] {
    const ids = this.typeIndex.get(type) || new Set();
    return Array.from(ids).map(id => this.items.get(id)!).filter(Boolean);
  }

  public getByDiameter(min: number, max: number): EnhancedCuttingTool[] {
    const results: EnhancedCuttingTool[] = [];
    
    for (const [id, tool] of this.items) {
      if (tool.diameter >= min && tool.diameter <= max) {
        results.push(tool);
      }
    }
    
    return results;
  }

  public getByCoating(coating: CoatingType): EnhancedCuttingTool[] {
    const ids = this.coatingIndex.get(coating) || new Set();
    return Array.from(ids).map(id => this.items.get(id)!).filter(Boolean);
  }

  public getCompatibleTools(materialId: string, operation: string): EnhancedCuttingTool[] {
    const materialTools = this.materialIndex.get(materialId) || new Set();
    const operationTools = this.operationIndex.get(operation) || new Set();
    
    const compatibleIds = new Set([...materialTools].filter(id => operationTools.has(id)));
    
    return Array.from(compatibleIds).map(id => this.items.get(id)!).filter(Boolean);
  }

  public recommend(material: Material, operation: Operation): EnhancedCuttingTool[] {
    const candidates = this.getCompatibleTools(material.id, operation.type);
    
    return candidates
      .filter(tool => this.isToolSuitable(tool, material, operation))
      .sort((a, b) => this.calculateToolScore(b, material, operation) - this.calculateToolScore(a, material, operation))
      .slice(0, 10);
  }

  private isToolSuitable(tool: EnhancedCuttingTool, material: Material, operation: Operation): boolean {
    const compatibility = tool.compatibility;
    
    if (compatibility.hardnessRange) {
      const hardness = material.properties?.hardness || 0;
      if (hardness < compatibility.hardnessRange.min || hardness > compatibility.hardnessRange.max) {
        return false;
      }
    }
    
    if (compatibility.temperatureRange && operation.temperature) {
      if (operation.temperature < compatibility.temperatureRange.min || 
          operation.temperature > compatibility.temperatureRange.max) {
        return false;
      }
    }
    
    return true;
  }

  private calculateToolScore(tool: EnhancedCuttingTool, material: Material, operation: Operation): number {
    let score = 0;
    
    // Base score from tool type match
    if (this.isOptimalToolType(tool.type, operation.type)) {
      score += 50;
    }
    
    // Coating compatibility
    if (this.isOptimalCoating(tool.coating, material.type)) {
      score += 30;
    }
    
    // Diameter suitability
    if (this.isOptimalDiameter(tool.diameter, operation)) {
      score += 20;
    }
    
    // Tool life consideration
    const cuttingData = tool.cuttingData.get(material.id);
    if (cuttingData) {
      score += Math.min(tool.wear.expectedLife / 60, 20); // Max 20 points for tool life
    }
    
    return score;
  }

  private isOptimalToolType(toolType: ToolType, operationType: string): boolean {
    const optimalMappings: Record<string, ToolType[]> = {
      'roughing': [ToolType.ROUGHING_ENDMILL, ToolType.FACE_MILL],
      'finishing': [ToolType.BALL_ENDMILL, ToolType.FINISHING_ENDMILL],
      'drilling': [ToolType.DRILL, ToolType.CENTER_DRILL],
      'tapping': [ToolType.TAP],
      'boring': [ToolType.BORING_BAR],
      'turning': [ToolType.TURNING_INSERT],
      'grooving': [ToolType.GROOVING_INSERT]
    };
    
    return optimalMappings[operationType]?.includes(toolType) || false;
  }

  private isOptimalCoating(coating: CoatingType, materialType: string): boolean {
    const coatingMappings: Record<string, CoatingType[]> = {
      'steel': [CoatingType.TiAlN, CoatingType.TiCN, CoatingType.AlCrN],
      'stainless': [CoatingType.TiAlN, CoatingType.AlCrN],
      'aluminum': [CoatingType.UNCOATED, CoatingType.DLC],
      'titanium': [CoatingType.TiAlN, CoatingType.AlCrN],
      'hardened': [CoatingType.AlCrN, CoatingType.TiAlN]
    };
    
    return coatingMappings[materialType]?.includes(coating) || false;
  }

  private isOptimalDiameter(diameter: number, operation: Operation): boolean {
    if (!operation.requiredDiameter) return true;
    
    const tolerance = operation.requiredDiameter * 0.1;
    return Math.abs(diameter - operation.requiredDiameter) <= tolerance;
  }

  public getCuttingData(toolId: string, materialId: string): CuttingData | undefined {
    const tool = this.getById(toolId);
    return tool?.cuttingData.get(materialId);
  }

  public updateCuttingData(toolId: string, materialId: string, data: CuttingData): boolean {
    const tool = this.getById(toolId);
    if (!tool) return false;
    
    tool.cuttingData.set(materialId, data);
    this.notifyChange('update', toolId, tool);
    return true;
  }

  public getToolsByMaterial(materialId: string): EnhancedCuttingTool[] {
    const ids = this.materialIndex.get(materialId) || new Set();
    return Array.from(ids).map(id => this.items.get(id)!).filter(Boolean);
  }

  public getToolsByOperation(operation: string): EnhancedCuttingTool[] {
    const ids = this.operationIndex.get(operation) || new Set();
    return Array.from(ids).map(id => this.items.get(id)!).filter(Boolean);
  }

  public searchTools(query: {
    type?: ToolType;
    diameterMin?: number;
    diameterMax?: number;
    coating?: CoatingType;
    materialId?: string;
    operation?: string;
  }): EnhancedCuttingTool[] {
    let results = Array.from(this.items.values());
    
    if (query.type) {
      results = results.filter(tool => tool.type === query.type);
    }
    
    if (query.diameterMin !== undefined) {
      results = results.filter(tool => tool.diameter >= query.diameterMin!);
    }
    
    if (query.diameterMax !== undefined) {
      results = results.filter(tool => tool.diameter <= query.diameterMax!);
    }
    
    if (query.coating) {
      results = results.filter(tool => tool.coating === query.coating);
    }
    
    if (query.materialId) {
      results = results.filter(tool => 
        tool.compatibility.materialIds.includes(query.materialId!)
      );
    }
    
    if (query.operation) {
      results = results.filter(tool => 
        tool.compatibility.operations.includes(query.operation!)
      );
    }
    
    return results;
  }

  protected onAdd(id: string, tool: EnhancedCuttingTool): void {
    this.addToTypeIndex(id, tool.type);
    this.addToDiameterIndex(id, tool.diameter);
    this.addToCoatingIndex(id, tool.coating);
    this.addToMaterialIndexes(id, tool.compatibility.materialIds);
    this.addToOperationIndexes(id, tool.compatibility.operations);
  }

  protected onUpdate(id: string, tool: EnhancedCuttingTool): void {
    this.buildIndexes();
  }

  protected onRemove(id: string): void {
    this.buildIndexes();
  }
}