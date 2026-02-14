import { BaseRegistry } from './BaseRegistry';
import { Material } from '../types/Material';
import { watch, FSWatcher } from 'fs';
import { readFileSync } from 'fs';
import { join } from 'path';

interface MaterialIndex {
  byId: Map<string, Material>;
  byISO: Map<string, Material[]>;
  byHardness: Map<string, Material[]>;
  byName: Map<string, Material[]>;
  nameTokens: Map<string, Set<string>>;
}

interface HardnessRange {
  min: number;
  max: number;
  unit: 'HB' | 'HRC' | 'HV';
}

interface KienzleCoefficients {
  kc1_1: number;
  mc: number;
}

export class MaterialRegistry extends BaseRegistry<Material> {
  private indexes: MaterialIndex;
  private watcher?: FSWatcher;
  private dataPath: string;

  constructor(dataPath: string = './data/materials.json') {
    super();
    this.dataPath = dataPath;
    this.indexes = {
      byId: new Map(),
      byISO: new Map(),
      byHardness: new Map(),
      byName: new Map(),
      nameTokens: new Map()
    };
    this.loadMaterials();
    this.setupFileWatcher();
  }

  private loadMaterials(): void {
    try {
      const data = readFileSync(this.dataPath, 'utf-8');
      const materials: Material[] = JSON.parse(data);
      this.clear();
      materials.forEach(material => this.add(material));
    } catch (error) {
      console.error('Failed to load materials:', error);
    }
  }

  private setupFileWatcher(): void {
    this.watcher = watch(this.dataPath, (eventType) => {
      if (eventType === 'change') {
        console.log('Materials file changed, reloading...');
        this.loadMaterials();
      }
    });
  }

  add(material: Material): void {
    super.add(material);
    this.updateIndexes(material);
  }

  remove(id: string): boolean {
    const material = this.indexes.byId.get(id);
    if (!material) return false;

    const removed = super.remove(id);
    if (removed) {
      this.removeFromIndexes(material);
    }
    return removed;
  }

  clear(): void {
    super.clear();
    this.clearIndexes();
  }

  private updateIndexes(material: Material): void {
    // Index by ID
    this.indexes.byId.set(material.id, material);

    // Index by ISO class
    if (material.isoClass) {
      const isoMaterials = this.indexes.byISO.get(material.isoClass) || [];
      isoMaterials.push(material);
      this.indexes.byISO.set(material.isoClass, isoMaterials);
    }

    // Index by hardness
    this.indexByHardness(material);

    // Index by name tokens
    this.indexByNameTokens(material);
  }

  private removeFromIndexes(material: Material): void {
    // Remove from ID index
    this.indexes.byId.delete(material.id);

    // Remove from ISO index
    if (material.isoClass) {
      const isoMaterials = this.indexes.byISO.get(material.isoClass) || [];
      const filtered = isoMaterials.filter(m => m.id !== material.id);
      if (filtered.length === 0) {
        this.indexes.byISO.delete(material.isoClass);
      } else {
        this.indexes.byISO.set(material.isoClass, filtered);
      }
    }

    // Remove from hardness indexes
    this.removeFromHardnessIndexes(material);

    // Remove from name token indexes
    this.removeFromNameTokenIndexes(material);
  }

  private indexByHardness(material: Material): void {
    const hardnessProps = ['hardnessHB', 'hardnessHRC', 'hardnessHV'];
    
    hardnessProps.forEach(prop => {
      const value = (material as any)[prop];
      if (typeof value === 'number') {
        const range = this.getHardnessRangeKey(value, prop.replace('hardness', '') as 'HB' | 'HRC' | 'HV');
        const materials = this.indexes.byHardness.get(range) || [];
        materials.push(material);
        this.indexes.byHardness.set(range, materials);
      }
    });
  }

  private removeFromHardnessIndexes(material: Material): void {
    for (const [key, materials] of this.indexes.byHardness.entries()) {
      const filtered = materials.filter(m => m.id !== material.id);
      if (filtered.length === 0) {
        this.indexes.byHardness.delete(key);
      } else {
        this.indexes.byHardness.set(key, filtered);
      }
    }
  }

  private indexByNameTokens(material: Material): void {
    const tokens = this.tokenizeName(material.name);
    tokens.forEach(token => {
      const materialIds = this.indexes.nameTokens.get(token) || new Set();
      materialIds.add(material.id);
      this.indexes.nameTokens.set(token, materialIds);
    });

    const materials = this.indexes.byName.get(material.name.toLowerCase()) || [];
    materials.push(material);
    this.indexes.byName.set(material.name.toLowerCase(), materials);
  }

  private removeFromNameTokenIndexes(material: Material): void {
    const tokens = this.tokenizeName(material.name);
    tokens.forEach(token => {
      const materialIds = this.indexes.nameTokens.get(token);
      if (materialIds) {
        materialIds.delete(material.id);
        if (materialIds.size === 0) {
          this.indexes.nameTokens.delete(token);
        }
      }
    });

    const materials = this.indexes.byName.get(material.name.toLowerCase()) || [];
    const filtered = materials.filter(m => m.id !== material.id);
    if (filtered.length === 0) {
      this.indexes.byName.delete(material.name.toLowerCase());
    } else {
      this.indexes.byName.set(material.name.toLowerCase(), filtered);
    }
  }

  private tokenizeName(name: string): string[] {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 1);
  }

  private getHardnessRangeKey(value: number, unit: 'HB' | 'HRC' | 'HV'): string {
    const ranges = this.getHardnessRanges(unit);
    for (const range of ranges) {
      if (value >= range.min && value <= range.max) {
        return `${unit}_${range.min}_${range.max}`;
      }
    }
    return `${unit}_other`;
  }

  private getHardnessRanges(unit: 'HB' | 'HRC' | 'HV'): HardnessRange[] {
    switch (unit) {
      case 'HB':
        return [
          { min: 0, max: 100, unit: 'HB' },
          { min: 101, max: 200, unit: 'HB' },
          { min: 201, max: 300, unit: 'HB' },
          { min: 301, max: 400, unit: 'HB' },
          { min: 401, max: 500, unit: 'HB' },
          { min: 501, max: 1000, unit: 'HB' }
        ];
      case 'HRC':
        return [
          { min: 0, max: 20, unit: 'HRC' },
          { min: 21, max: 40, unit: 'HRC' },
          { min: 41, max: 50, unit: 'HRC' },
          { min: 51, max: 60, unit: 'HRC' },
          { min: 61, max: 70, unit: 'HRC' }
        ];
      case 'HV':
        return [
          { min: 0, max: 200, unit: 'HV' },
          { min: 201, max: 400, unit: 'HV' },
          { min: 401, max: 600, unit: 'HV' },
          { min: 601, max: 800, unit: 'HV' },
          { min: 801, max: 1200, unit: 'HV' }
        ];
    }
  }

  private clearIndexes(): void {
    this.indexes.byId.clear();
    this.indexes.byISO.clear();
    this.indexes.byHardness.clear();
    this.indexes.byName.clear();
    this.indexes.nameTokens.clear();
  }

  getById(id: string): Material | undefined {
    return this.indexes.byId.get(id);
  }

  getByISO(isoClass: string): Material[] {
    return this.indexes.byISO.get(isoClass) || [];
  }

  getByHardnessRange(min: number, max: number, unit: 'HB' | 'HRC' | 'HV' = 'HB'): Material[] {
    const results: Material[] = [];
    const hardnessProp = `hardness${unit}`;

    for (const material of this.getAll()) {
      const hardness = (material as any)[hardnessProp];
      if (typeof hardness === 'number' && hardness >= min && hardness <= max) {
        results.push(material);
      }
    }

    return results;
  }

  search(query: string): Material[] {
    if (!query.trim()) return [];

    const tokens = this.tokenizeName(query);
    const materialIds = new Set<string>();

    // Search by name tokens
    tokens.forEach(token => {
      const ids = this.indexes.nameTokens.get(token);
      if (ids) {
        ids.forEach(id => materialIds.add(id));
      }
    });

    // Search by exact name match
    const exactMatches = this.indexes.byName.get(query.toLowerCase()) || [];
    exactMatches.forEach(material => materialIds.add(material.id));

    // Search by ID
    if (this.indexes.byId.has(query)) {
      materialIds.add(query);
    }

    // Search by ISO class
    const isoMatches = this.indexes.byISO.get(query.toUpperCase()) || [];
    isoMatches.forEach(material => materialIds.add(material.id));

    return Array.from(materialIds)
      .map(id => this.indexes.byId.get(id))
      .filter((material): material is Material => material !== undefined);
  }

  getKienzleCoefficients(materialId: string): KienzleCoefficients | undefined {
    const material = this.getById(materialId);
    if (!material) return undefined;

    return {
      kc1_1: material.kienzleKc1_1 || 0,
      mc: material.kienzeleMc || 0
    };
  }

  getMaterialsByProperty(property: keyof Material, value: any): Material[] {
    return this.getAll().filter(material => (material as any)[property] === value);
  }

  getMaterialsInRange(property: keyof Material, min: number, max: number): Material[] {
    return this.getAll().filter(material => {
      const val = (material as any)[property];
      return typeof val === 'number' && val >= min && val <= max;
    });
  }

  getISOClasses(): string[] {
    return Array.from(this.indexes.byISO.keys()).sort();
  }

  getStatistics(): {
    totalMaterials: number;
    byISOClass: Record<string, number>;
    hardnessDistribution: Record<string, number>;
  } {
    const stats = {
      totalMaterials: this.size(),
      byISOClass: {} as Record<string, number>,
      hardnessDistribution: {} as Record<string, number>
    };

    for (const [isoClass, materials] of this.indexes.byISO.entries()) {
      stats.byISOClass[isoClass] = materials.length;
    }

    for (const [range, materials] of this.indexes.byHardness.entries()) {
      stats.hardnessDistribution[range] = materials.length;
    }

    return stats;
  }

  destroy(): void {
    if (this.watcher) {
      this.watcher.close();
    }
    this.clear();
  }
}