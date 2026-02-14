import { BaseRegistry } from './BaseRegistry';
import { Machine, MachineType, WorkEnvelope, KinematicChain, PostProcessor } from '../types/Machine';

export class MachineRegistry extends BaseRegistry<Machine> {
  private manufacturerIndex = new Map<string, Set<string>>();
  private typeIndex = new Map<MachineType, Set<string>>();
  private envelopeIndex = new Map<string, WorkEnvelope>();
  private controllerIndex = new Map<string, Set<string>>();
  private kinematicIndex = new Map<string, KinematicChain>();
  private postProcessorIndex = new Map<string, PostProcessor[]>();

  constructor() {
    super();
  }

  protected buildIndexes(): void {
    this.manufacturerIndex.clear();
    this.typeIndex.clear();
    this.envelopeIndex.clear();
    this.controllerIndex.clear();
    this.kinematicIndex.clear();
    this.postProcessorIndex.clear();

    for (const [id, machine] of this.items) {
      this.indexMachine(id, machine);
    }
  }

  private indexMachine(id: string, machine: Machine): void {
    // Manufacturer index
    const mfrKey = machine.manufacturer.toLowerCase();
    if (!this.manufacturerIndex.has(mfrKey)) {
      this.manufacturerIndex.set(mfrKey, new Set());
    }
    this.manufacturerIndex.get(mfrKey)!.add(id);

    // Type index
    if (!this.typeIndex.has(machine.type)) {
      this.typeIndex.set(machine.type, new Set());
    }
    this.typeIndex.get(machine.type)!.add(id);

    // Envelope index
    if (machine.workEnvelope) {
      this.envelopeIndex.set(id, machine.workEnvelope);
    }

    // Controller index
    if (machine.controller) {
      const ctrlKey = machine.controller.type.toLowerCase();
      if (!this.controllerIndex.has(ctrlKey)) {
        this.controllerIndex.set(ctrlKey, new Set());
      }
      this.controllerIndex.get(ctrlKey)!.add(id);
    }

    // Kinematic index
    if (machine.kinematicChain) {
      this.kinematicIndex.set(id, machine.kinematicChain);
    }

    // Post processor index
    if (machine.postProcessors) {
      this.postProcessorIndex.set(id, machine.postProcessors);
    }
  }

  public add(machine: Machine): void {
    super.add(machine);
    this.indexMachine(machine.id, machine);
  }

  public update(machine: Machine): void {
    super.update(machine);
    this.buildIndexes();
  }

  public remove(id: string): boolean {
    const result = super.remove(id);
    if (result) {
      this.buildIndexes();
    }
    return result;
  }

  public getById(id: string): Machine | undefined {
    return this.items.get(id);
  }

  public getByManufacturer(manufacturer: string): Machine[] {
    const mfrKey = manufacturer.toLowerCase();
    const ids = this.manufacturerIndex.get(mfrKey);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((machine): machine is Machine => machine !== undefined);
  }

  public getByType(type: MachineType): Machine[] {
    const ids = this.typeIndex.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((machine): machine is Machine => machine !== undefined);
  }

  public getByEnvelope(x: number, y: number, z: number): Machine[] {
    const results: Machine[] = [];

    for (const [id, envelope] of this.envelopeIndex) {
      if (envelope.x >= x && envelope.y >= y && envelope.z >= z) {
        const machine = this.items.get(id);
        if (machine) {
          results.push(machine);
        }
      }
    }

    return results;
  }

  public getByController(controllerType: string): Machine[] {
    const ctrlKey = controllerType.toLowerCase();
    const ids = this.controllerIndex.get(ctrlKey);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.items.get(id))
      .filter((machine): machine is Machine => machine !== undefined);
  }

  public getCompatiblePosts(machineId: string): PostProcessor[] {
    return this.postProcessorIndex.get(machineId) || [];
  }

  public getKinematicChain(machineId: string): KinematicChain | undefined {
    return this.kinematicIndex.get(machineId);
  }

  public findByCapabilities(capabilities: {
    manufacturer?: string;
    type?: MachineType;
    minEnvelope?: { x: number; y: number; z: number };
    controller?: string;
    hasPostProcessor?: boolean;
  }): Machine[] {
    let results = Array.from(this.items.values());

    if (capabilities.manufacturer) {
      const byMfr = this.getByManufacturer(capabilities.manufacturer);
      results = results.filter(m => byMfr.includes(m));
    }

    if (capabilities.type) {
      const byType = this.getByType(capabilities.type);
      results = results.filter(m => byType.includes(m));
    }

    if (capabilities.minEnvelope) {
      const byEnv = this.getByEnvelope(
        capabilities.minEnvelope.x,
        capabilities.minEnvelope.y,
        capabilities.minEnvelope.z
      );
      results = results.filter(m => byEnv.includes(m));
    }

    if (capabilities.controller) {
      const byCtrl = this.getByController(capabilities.controller);
      results = results.filter(m => byCtrl.includes(m));
    }

    if (capabilities.hasPostProcessor) {
      results = results.filter(m => 
        this.postProcessorIndex.has(m.id) && 
        this.postProcessorIndex.get(m.id)!.length > 0
      );
    }

    return results;
  }

  public getManufacturers(): string[] {
    return Array.from(this.manufacturerIndex.keys());
  }

  public getTypes(): MachineType[] {
    return Array.from(this.typeIndex.keys());
  }

  public getControllerTypes(): string[] {
    return Array.from(this.controllerIndex.keys());
  }

  public getStats(): {
    totalMachines: number;
    byManufacturer: Record<string, number>;
    byType: Record<MachineType, number>;
    byController: Record<string, number>;
    withKinematics: number;
    withPostProcessors: number;
  } {
    const byManufacturer: Record<string, number> = {};
    for (const [mfr, ids] of this.manufacturerIndex) {
      byManufacturer[mfr] = ids.size;
    }

    const byType: Record<MachineType, number> = {};
    for (const [type, ids] of this.typeIndex) {
      byType[type] = ids.size;
    }

    const byController: Record<string, number> = {};
    for (const [ctrl, ids] of this.controllerIndex) {
      byController[ctrl] = ids.size;
    }

    return {
      totalMachines: this.items.size,
      byManufacturer,
      byType,
      byController,
      withKinematics: this.kinematicIndex.size,
      withPostProcessors: this.postProcessorIndex.size
    };
  }
}