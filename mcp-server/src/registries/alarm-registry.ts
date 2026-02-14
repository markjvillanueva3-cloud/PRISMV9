import { BaseRegistry } from './BaseRegistry';

export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export enum AlarmCategory {
  SERVO = 'SERVO',
  SPINDLE = 'SPINDLE',
  ATC = 'ATC',
  HYDRAULIC = 'HYDRAULIC',
  PNEUMATIC = 'PNEUMATIC',
  COOLANT = 'COOLANT',
  LUBRICATION = 'LUBRICATION',
  SAFETY = 'SAFETY',
  SYSTEM = 'SYSTEM',
  PROGRAM = 'PROGRAM',
  TOOL = 'TOOL',
  WORKPIECE = 'WORKPIECE'
}

export enum ControllerFamily {
  FANUC = 'FANUC',
  HAAS = 'HAAS',
  SIEMENS = 'SIEMENS',
  MAZAK = 'MAZAK',
  OKUMA = 'OKUMA',
  MAKINO = 'MAKINO',
  DMG_MORI = 'DMG_MORI',
  HEIDENHAIN = 'HEIDENHAIN'
}

export interface FixStep {
  step: number;
  description: string;
  warning?: string;
  toolsRequired?: string[];
  estimatedTime?: string;
}

export interface FixProcedure {
  id: string;
  alarmId: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';
  estimatedTime: string;
  prerequisites?: string[];
  steps: FixStep[];
  safetyNotes?: string[];
  partsRequired?: string[];
  lastUpdated: Date;
}

export interface Alarm {
  id: string;
  controller: ControllerFamily;
  code: string;
  subCode?: string;
  severity: Severity;
  category: AlarmCategory;
  title: string;
  description: string;
  possibleCauses: string[];
  immediateActions: string[];
  fixProcedureId?: string;
  relatedAlarms?: string[];
  documentation?: string;
  frequency: 'COMMON' | 'OCCASIONAL' | 'RARE';
  lastUpdated: Date;
  tags?: string[];
}

export class AlarmRegistry extends BaseRegistry<Alarm> {
  private controllerIndex: Map<ControllerFamily, Set<string>> = new Map();
  private codeIndex: Map<string, Set<string>> = new Map();
  private severityIndex: Map<Severity, Set<string>> = new Map();
  private categoryIndex: Map<AlarmCategory, Set<string>> = new Map();
  private fixProcedures: Map<string, FixProcedure> = new Map();
  private searchIndex: Map<string, Set<string>> = new Map();

  constructor() {
    super();
    this.initializeIndexes();
  }

  private initializeIndexes(): void {
    Object.values(ControllerFamily).forEach(controller => {
      this.controllerIndex.set(controller, new Set());
    });
    
    Object.values(Severity).forEach(severity => {
      this.severityIndex.set(severity, new Set());
    });
    
    Object.values(AlarmCategory).forEach(category => {
      this.categoryIndex.set(category, new Set());
    });
  }

  protected buildIndexes(): void {
    this.clearIndexes();
    
    for (const [id, alarm] of this.items) {
      this.addToControllerIndex(alarm.controller, id);
      this.addToCodeIndex(alarm.code, id);
      this.addToSeverityIndex(alarm.severity, id);
      this.addToCategoryIndex(alarm.category, id);
      this.buildSearchIndex(alarm);
    }
  }

  private clearIndexes(): void {
    this.controllerIndex.forEach(set => set.clear());
    this.codeIndex.clear();
    this.severityIndex.forEach(set => set.clear());
    this.categoryIndex.forEach(set => set.clear());
    this.searchIndex.clear();
  }

  private addToControllerIndex(controller: ControllerFamily, id: string): void {
    const controllerSet = this.controllerIndex.get(controller);
    if (controllerSet) {
      controllerSet.add(id);
    }
  }

  private addToCodeIndex(code: string, id: string): void {
    const normalizedCode = this.normalizeCode(code);
    if (!this.codeIndex.has(normalizedCode)) {
      this.codeIndex.set(normalizedCode, new Set());
    }
    this.codeIndex.get(normalizedCode)!.add(id);
  }

  private addToSeverityIndex(severity: Severity, id: string): void {
    const severitySet = this.severityIndex.get(severity);
    if (severitySet) {
      severitySet.add(id);
    }
  }

  private addToCategoryIndex(category: AlarmCategory, id: string): void {
    const categorySet = this.categoryIndex.get(category);
    if (categorySet) {
      categorySet.add(id);
    }
  }

  private buildSearchIndex(alarm: Alarm): void {
    const searchTerms = [
      alarm.title,
      alarm.description,
      ...alarm.possibleCauses,
      ...alarm.immediateActions,
      ...(alarm.tags || [])
    ];

    searchTerms.forEach(term => {
      const words = this.extractSearchWords(term);
      words.forEach(word => {
        if (!this.searchIndex.has(word)) {
          this.searchIndex.set(word, new Set());
        }
        this.searchIndex.get(word)!.add(alarm.id);
      });
    });
  }

  private extractSearchWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private normalizeCode(code: string): string {
    return code.toUpperCase().replace(/\s+/g, '');
  }

  public add(alarm: Alarm): void {
    super.add(alarm);
    this.addToControllerIndex(alarm.controller, alarm.id);
    this.addToCodeIndex(alarm.code, alarm.id);
    this.addToSeverityIndex(alarm.severity, alarm.id);
    this.addToCategoryIndex(alarm.category, alarm.id);
    this.buildSearchIndex(alarm);
  }

  public remove(id: string): boolean {
    const alarm = this.get(id);
    if (!alarm) return false;

    const removed = super.remove(id);
    if (removed) {
      this.removeFromIndexes(alarm, id);
    }
    return removed;
  }

  private removeFromIndexes(alarm: Alarm, id: string): void {
    this.controllerIndex.get(alarm.controller)?.delete(id);
    
    const normalizedCode = this.normalizeCode(alarm.code);
    this.codeIndex.get(normalizedCode)?.delete(id);
    
    this.severityIndex.get(alarm.severity)?.delete(id);
    this.categoryIndex.get(alarm.category)?.delete(id);
    
    this.searchIndex.forEach(set => set.delete(id));
  }

  public decode(controller: string, code: string): Alarm | undefined {
    const controllerFamily = this.parseController(controller);
    if (!controllerFamily) return undefined;

    const normalizedCode = this.normalizeCode(code);
    const codeMatches = this.codeIndex.get(normalizedCode);
    const controllerMatches = this.controllerIndex.get(controllerFamily);

    if (!codeMatches || !controllerMatches) return undefined;

    const intersection = new Set([...codeMatches].filter(id => controllerMatches.has(id)));
    
    if (intersection.size === 0) return undefined;
    
    const alarmId = intersection.values().next().value;
    return this.get(alarmId);
  }

  private parseController(controller: string): ControllerFamily | undefined {
    const normalized = controller.toUpperCase().replace(/[\s_-]/g, '');
    
    for (const family of Object.values(ControllerFamily)) {
      if (normalized.includes(family) || family.includes(normalized)) {
        return family;
      }
    }
    
    return undefined;
  }

  public getByController(controller: string): Alarm[] {
    const controllerFamily = this.parseController(controller);
    if (!controllerFamily) return [];

    const alarmIds = this.controllerIndex.get(controllerFamily);
    if (!alarmIds) return [];

    return Array.from(alarmIds)
      .map(id => this.get(id))
      .filter((alarm): alarm is Alarm => alarm !== undefined);
  }

  public getBySeverity(level: Severity): Alarm[] {
    const alarmIds = this.severityIndex.get(level);
    if (!alarmIds) return [];

    return Array.from(alarmIds)
      .map(id => this.get(id))
      .filter((alarm): alarm is Alarm => alarm !== undefined);
  }

  public getByCategory(category: AlarmCategory): Alarm[] {
    const alarmIds = this.categoryIndex.get(category);
    if (!alarmIds) return [];

    return Array.from(alarmIds)
      .map(id => this.get(id))
      .filter((alarm): alarm is Alarm => alarm !== undefined);
  }

  public search(description: string): Alarm[] {
    const searchWords = this.extractSearchWords(description);
    if (searchWords.length === 0) return [];

    const matchingSets = searchWords
      .map(word => this.searchIndex.get(word))
      .filter((set): set is Set<string> => set !== undefined);

    if (matchingSets.length === 0) return [];

    const intersection = matchingSets.reduce((acc, set) => {
      return new Set([...acc].filter(id => set.has(id)));
    });

    return Array.from(intersection)
      .map(id => this.get(id))
      .filter((alarm): alarm is Alarm => alarm !== undefined)
      .sort((a, b) => this.calculateRelevanceScore(b, searchWords) - this.calculateRelevanceScore(a, searchWords));
  }

  private calculateRelevanceScore(alarm: Alarm, searchWords: string[]): number {
    let score = 0;
    const alarmText = `${alarm.title} ${alarm.description}`.toLowerCase();
    
    searchWords.forEach(word => {
      const regex = new RegExp(word, 'gi');
      const matches = alarmText.match(regex);
      if (matches) {
        score += matches.length;
        if (alarm.title.toLowerCase().includes(word)) score += 2;
      }
    });
    
    return score;
  }

  public addFixProcedure(procedure: FixProcedure): void {
    this.fixProcedures.set(procedure.id, procedure);
  }

  public getFixProcedure(alarmId: string): FixProcedure | undefined {
    const alarm = this.get(alarmId);
    if (!alarm?.fixProcedureId) return undefined;
    
    return this.fixProcedures.get(alarm.fixProcedureId);
  }

  public getFixProcedureById(procedureId: string): FixProcedure | undefined {
    return this.fixProcedures.get(procedureId);
  }

  public removeFixProcedure(procedureId: string): boolean {
    return this.fixProcedures.delete(procedureId);
  }

  public getRelatedAlarms(alarmId: string): Alarm[] {
    const alarm = this.get(alarmId);
    if (!alarm?.relatedAlarms) return [];

    return alarm.relatedAlarms
      .map(id => this.get(id))
      .filter((alarm): alarm is Alarm => alarm !== undefined);
  }

  public getAlarmsByFrequency(frequency: 'COMMON' | 'OCCASIONAL' | 'RARE'): Alarm[] {
    return this.getAll().filter(alarm => alarm.frequency === frequency);
  }

  public getAlarmsByTag(tag: string): Alarm[] {
    return this.getAll().filter(alarm => 
      alarm.tags?.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
  }

  public getStatistics(): {
    totalAlarms: number;
    byController: Record<string, number>;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
    withFixProcedures: number;
  } {
    const stats = {
      totalAlarms: this.size(),
      byController: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      withFixProcedures: 0
    };

    this.controllerIndex.forEach((alarms, controller) => {
      stats.byController[controller] = alarms.size;
    });

    this.severityIndex.forEach((alarms, severity) => {
      stats.bySeverity[severity] = alarms.size;
    });

    this.categoryIndex.forEach((alarms, category) => {
      stats.byCategory[category] = alarms.size;
    });

    stats.withFixProcedures = this.getAll().filter(alarm => alarm.fixProcedureId).length;

    return stats;
  }

  public async hotReload(alarms: Alarm[], procedures?: FixProcedure[]): Promise<void> {
    this.clear();
    this.fixProcedures.clear();
    
    alarms.forEach(alarm => this.add(alarm));
    procedures?.forEach(procedure => this.addFixProcedure(procedure));
    
    this.buildIndexes();
  }

  public exportData(): { alarms: Alarm[]; procedures: FixProcedure[] } {
    return {
      alarms: this.getAll(),
      procedures: Array.from(this.fixProcedures.values())
    };
  }
}