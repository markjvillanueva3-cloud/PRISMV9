import {
  filterCoolantOptionIds,
  type CoolantOptionId,
  type MachineCatalogItem,
  type MachineControllerCapabilityOption,
  type MachineConfigurationOption,
  type MachineMode,
  type SelectionOption,
} from '../data/calculatorWorkspace';
import { mergeMachinePackageConfidence } from './machinePackageContract';

function selectionOptionKey(option: SelectionOption): string {
  return `${option.label.trim().toLowerCase()}::${option.detail.trim().toLowerCase()}`;
}

function configurationKey(configuration: MachineConfigurationOption): string {
  const controllerKey = dedupeSelectionOptions(configuration.controllerOptions)
    .map(selectionOptionKey)
    .sort()
    .join('|');
  const spindleKey = dedupeSelectionOptions(configuration.spindleOptions)
    .map(selectionOptionKey)
    .sort()
    .join('|');
  const coolantKey = [...new Set(configuration.coolantOptionIds)].sort().join('|');
  return `${controllerKey}::${spindleKey}::${coolantKey}`;
}

export function dedupeSelectionOptions<T extends SelectionOption>(options: T[]): T[] {
  const unique = new Map<string, T>();
  for (const option of options) {
    const key = selectionOptionKey(option);
    if (!unique.has(key)) unique.set(key, option);
  }
  return [...unique.values()];
}

export function buildDefaultMachineConfigurationOptions(
  machine?: MachineCatalogItem | null,
): MachineConfigurationOption[] {
  if (!machine) return [];
  return [
    {
      id: `${machine.id}-standard-configuration`,
      label: 'Standard machine package',
      detail: 'Default calculator package synthesized from the machine record.',
      controllerOptions: dedupeSelectionOptions(machine.controllerOptions),
      spindleOptions: dedupeSelectionOptions(machine.spindleOptions),
      controllerCapabilityOptions: dedupeSelectionOptions(machine.controllerCapabilityOptions ?? []),
      coolantOptionIds: filterCoolantOptionIds(machine.coolantOptionIds, machine.mode),
      sourceRecordIds: machine.packageProvenance?.sourceRecordIds ?? [machine.id],
      confidence: machine.packageProvenance?.confidence ?? 'fallback',
    },
  ];
}

export function resolveMachineConfigurationOptions(
  machine?: MachineCatalogItem | null,
): MachineConfigurationOption[] {
  const rawConfigurations = machine?.configurationOptions?.length
    ? machine.configurationOptions
    : buildDefaultMachineConfigurationOptions(machine);
  const unique = new Map<string, MachineConfigurationOption>();

  for (const configuration of rawConfigurations) {
    const normalized: MachineConfigurationOption = {
      ...configuration,
      controllerOptions: dedupeSelectionOptions(configuration.controllerOptions),
      spindleOptions: dedupeSelectionOptions(configuration.spindleOptions),
      controllerCapabilityOptions: dedupeSelectionOptions(
        configuration.controllerCapabilityOptions ?? machine?.controllerCapabilityOptions ?? [],
      ),
      coolantOptionIds: filterCoolantOptionIds(configuration.coolantOptionIds, machine?.mode ?? 'mill'),
      sourceRecordIds: [...new Set(configuration.sourceRecordIds ?? machine?.packageProvenance?.sourceRecordIds ?? [])],
      confidence: configuration.confidence ?? machine?.packageProvenance?.confidence ?? 'fallback',
    };
    const key = configurationKey(normalized);
    if (!unique.has(key)) unique.set(key, normalized);
  }

  return [...unique.values()];
}

export function filterMachineConfigurationsByController(
  configurations: MachineConfigurationOption[],
  controllerOptionId: string,
): MachineConfigurationOption[] {
  if (!controllerOptionId) return configurations;
  const filtered = configurations.filter((configuration) =>
    configuration.controllerOptions.some((option) => option.id === controllerOptionId),
  );
  return filtered.length ? filtered : configurations;
}

export function filterMachineConfigurationsBySpindle(
  configurations: MachineConfigurationOption[],
  spindleOptionId: string,
): MachineConfigurationOption[] {
  if (!spindleOptionId) return configurations;
  const filtered = configurations.filter((configuration) =>
    configuration.spindleOptions.some((option) => option.id === spindleOptionId),
  );
  return filtered.length ? filtered : configurations;
}

export interface MachineSelectionResolution {
  configurationOptions: MachineConfigurationOption[];
  controllerOptions: SelectionOption[];
  spindleOptions: SelectionOption[];
  controllerCapabilityOptions: MachineControllerCapabilityOption[];
  coolantOptionIds: CoolantOptionId[];
}

export function resolveMachineSelectionOptions(
  machine: MachineCatalogItem | null | undefined,
  controllerOptionId: string,
  spindleOptionId: string,
  mode: MachineMode,
): MachineSelectionResolution {
  const configurationOptions = resolveMachineConfigurationOptions(machine);
  const controllerOptions = dedupeSelectionOptions(
    configurationOptions.flatMap((configuration) => configuration.controllerOptions),
  );
  const controllerScopedConfigurations = filterMachineConfigurationsByController(
    configurationOptions,
    controllerOptionId,
  );
  const spindleOptions = dedupeSelectionOptions(
    controllerScopedConfigurations.flatMap((configuration) => configuration.spindleOptions),
  );
  const spindleScopedConfigurations = filterMachineConfigurationsBySpindle(
    controllerScopedConfigurations,
    spindleOptionId,
  );
  const controllerCapabilityOptions = dedupeSelectionOptions(
    spindleScopedConfigurations.flatMap((configuration) => configuration.controllerCapabilityOptions ?? []),
  );
  const coolantOptionIds = filterCoolantOptionIds(
    [
      ...new Set(
        spindleScopedConfigurations.flatMap((configuration) => configuration.coolantOptionIds),
      ),
    ],
    mode,
  );

  return {
    configurationOptions,
    controllerOptions,
    spindleOptions,
    controllerCapabilityOptions,
    coolantOptionIds,
  };
}

export function mergeMachineConfigurationOptions(
  existing: MachineConfigurationOption[],
  incoming: MachineConfigurationOption[],
  mode: MachineMode,
): MachineConfigurationOption[] {
  const unique = new Map<string, MachineConfigurationOption>();

  for (const configuration of [...existing, ...incoming]) {
    const normalized: MachineConfigurationOption = {
      ...configuration,
      controllerOptions: dedupeSelectionOptions(configuration.controllerOptions),
      spindleOptions: dedupeSelectionOptions(configuration.spindleOptions),
      controllerCapabilityOptions: dedupeSelectionOptions(configuration.controllerCapabilityOptions ?? []),
      coolantOptionIds: filterCoolantOptionIds(configuration.coolantOptionIds, mode),
      sourceRecordIds: [...new Set(configuration.sourceRecordIds ?? [])],
      confidence: configuration.confidence ?? 'fallback',
    };
    const key = configurationKey(normalized);
    if (!unique.has(key)) {
      unique.set(key, normalized);
      continue;
    }

    const current = unique.get(key)!;
    unique.set(key, {
      ...current,
      controllerOptions: dedupeSelectionOptions([
        ...current.controllerOptions,
        ...normalized.controllerOptions,
      ]),
      spindleOptions: dedupeSelectionOptions([
        ...current.spindleOptions,
        ...normalized.spindleOptions,
      ]),
      controllerCapabilityOptions: dedupeSelectionOptions([
        ...(current.controllerCapabilityOptions ?? []),
        ...(normalized.controllerCapabilityOptions ?? []),
      ]),
      coolantOptionIds: filterCoolantOptionIds(
        [...new Set([...current.coolantOptionIds, ...normalized.coolantOptionIds])],
        mode,
      ),
      sourceRecordIds: [
        ...new Set([
          ...(current.sourceRecordIds ?? []),
          ...(normalized.sourceRecordIds ?? []),
        ]),
      ],
      confidence: mergeMachinePackageConfidence(
        current.confidence ?? 'fallback',
        normalized.confidence ?? 'fallback',
      ),
    });
  }

  return [...unique.values()];
}
