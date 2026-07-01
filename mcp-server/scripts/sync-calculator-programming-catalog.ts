import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { multiCamStrategyEngine } from '../src/engines/MultiCamStrategyEngine.ts';
import { MultiCamStrategyEngineExt } from '../src/engines/MultiCamStrategyEngineExt.ts';

type MachineMode = 'mill' | 'lathe' | 'edm' | 'wire_edm' | 'laser' | 'waterjet';

type ToolpathOption = {
  id: string;
  label: string;
  path: string;
  summary: string;
  operationId: string;
};

type EnvironmentOption = {
  id: string;
  mode: MachineMode;
  label: string;
  vendor: string;
  kind: string;
  badge: string;
  summary: string;
  toolpaths: ToolpathOption[];
};

const extEngine = new MultiCamStrategyEngineExt();

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const backendCatalogPath = path.join(repoRoot, 'src', 'data', 'calculatorProgrammingCatalog.json');
const webSupplementPath = path.join(repoRoot, 'web', 'src', 'data', 'calculatorProgrammingCatalogSupplements.ts');

const ENVIRONMENT_SYSTEM_MAP: Record<string, string> = {
  'fusion360-mill': 'fusion360',
  'fusion360-lathe': 'fusion360',
  'mastercam-mill': 'mastercam',
  'mastercam-lathe': 'mastercam',
  'hypermill-mill': 'hypermill',
  'nx-mill': 'siemensnx',
  'nx-lathe': 'siemensnx',
  'solidcam-mill': 'solidcam',
  'solidcam-lathe': 'solidcam',
  'powermill-mill': 'powermill',
  'esprit-mill': 'esprit',
  'esprit-lathe': 'esprit',
  'gibbscam-mill': 'gibbscam',
  'gibbscam-lathe': 'gibbscam',
  'bobcad-mill': 'bobcad',
  'edgecam-mill': 'edgecam',
  'edgecam-lathe': 'edgecam',
  'solidworks-cam-mill': 'camworks',
  'cimatron-mill': 'cimatron',
  'tebis-mill': 'tebis',
  'worknc-mill': 'worknc',
  'topsolid-mill': 'topsolid',
  'topsolid-lathe': 'topsolid',
  'catia-mill': 'catia',
};

const GENERIC_TOKENS = new Set([
  'rough',
  'roughing',
  'finish',
  'finishing',
  'milling',
  'machining',
  'cycle',
  'cycles',
  'toolpath',
  'toolpaths',
  'strategy',
  'strategies',
]);

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function labelTokens(value: string) {
  return normalizeLabel(value)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !GENERIC_TOKENS.has(token));
}

function areEquivalentStrategyNames(left: string, right: string) {
  const normalizedLeft = normalizeLabel(left);
  const normalizedRight = normalizeLabel(right);
  if (normalizedLeft === normalizedRight) {
    return true;
  }

  const leftTokens = new Set(labelTokens(left));
  const rightTokens = new Set(labelTokens(right));
  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return false;
  }

  const overlap = [...leftTokens].filter((token) => rightTokens.has(token));
  const minimum = Math.min(leftTokens.size, rightTokens.size);
  return overlap.length >= minimum;
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getStrategiesForSystem(system: string) {
  const baseSystems = multiCamStrategyEngine.listSystems();
  if (baseSystems.includes(system as never)) {
    return multiCamStrategyEngine.listStrategies(system as never).map((item) => item.strategyName);
  }

  const extSystems = extEngine.listSystems();
  if (extSystems.includes(system as never)) {
    return extEngine.listStrategies(system as never).map((item) => item.strategyName);
  }

  return [];
}

function isLatheStrategy(name: string) {
  return /(lathe|turn|groove|cutoff|part[- ]?off|thread|swiss|mill-turn|c-axis|y-axis|live tool|face turning|turning drilling|manual turning|trochoidal turning|balanced rough turning|tilted turning|advanced mill-turn)/i.test(name);
}

function isWireStrategy(name: string) {
  return /(wire|skim|slug|taper cut)/i.test(name);
}

function isEdmStrategy(name: string) {
  return /(electrode|die sinking|burn)/i.test(name);
}

function isRelevantForMode(name: string, mode: MachineMode) {
  if (mode === 'lathe') {
    return isLatheStrategy(name) || /\bdrill\b|\bboring\b|\bhole making\b/i.test(name);
  }
  if (mode === 'wire_edm') {
    return isWireStrategy(name);
  }
  if (mode === 'edm') {
    return isEdmStrategy(name);
  }
  if (mode === 'mill') {
    return !isLatheStrategy(name) && !isWireStrategy(name) && !isEdmStrategy(name);
  }
  return false;
}

function inferOperationId(name: string, mode: MachineMode) {
  const signature = normalizeLabel(name);

  if (mode === 'lathe') {
    if (/groove|cutoff|part off/.test(signature)) return 'grooving';
    if (/thread/.test(signature)) return 'turning_finish';
    if (/drill|bore|hole making/.test(signature)) return 'boring';
    if (/finish/.test(signature)) return 'turning_finish';
    return 'turning_rough';
  }

  if (mode === 'wire_edm') {
    return /skim/.test(signature) ? 'wire_skims' : 'wire_profile';
  }

  if (mode === 'edm') {
    return /rough|prep/.test(signature) ? 'burn_roughing' : 'burn_finishing';
  }

  if (/thread/.test(signature)) return 'finishing';
  if (/drill|bore|tap|hole/.test(signature)) return 'drilling';
  if (/pocket/.test(signature)) return 'pocket_milling';
  if (/slot/.test(signature)) return 'slot_milling';
  if (/face/.test(signature)) return 'face_milling';
  if (/profile|contour|sweeping|curve|wrap/.test(signature)) return 'shoulder_milling';
  if (/adapt|dynamic|vortex|waveform|volumill|imachining|rest|re rough|rerough|clear|rough|plunge/.test(signature)) {
    return 'roughing';
  }
  return 'finishing';
}

function inferPath(environment: EnvironmentOption, strategyName: string) {
  const modeLabel =
    environment.mode === 'wire_edm'
      ? 'Wire EDM'
      : environment.mode === 'edm'
        ? 'EDM'
        : environment.mode === 'waterjet'
          ? 'Waterjet'
          : environment.mode === 'laser'
            ? 'Laser'
            : environment.mode === 'lathe'
              ? 'Turning'
              : 'Milling';
  return `${environment.label} > ${modeLabel} > ${strategyName}`;
}

function inferSummary(environment: EnvironmentOption, strategyName: string, operationId: string) {
  if (environment.mode === 'lathe') {
    return `${strategyName} turning path exposed for ${environment.label} so the calculator can match the actual lathe or mill-turn cycle family.`;
  }
  if (environment.mode === 'wire_edm') {
    return `${strategyName} wire EDM path exposed for ${environment.label} so skim, taper, and release planning stay aligned.`;
  }
  if (environment.mode === 'edm') {
    return `${strategyName} EDM path exposed for ${environment.label} so cavity burn posture and wear planning stay aligned.`;
  }
  if (operationId === 'roughing') {
    return `${strategyName} supplier path exposed for ${environment.label} roughing so the calculator can match the actual stock-removal rhythm.`;
  }
  if (operationId === 'drilling') {
    return `${strategyName} supplier path exposed for ${environment.label} holemaking so drilling and boring assumptions stay aligned.`;
  }
  return `${strategyName} supplier path exposed for ${environment.label} finishing so the calculator can match the actual surface-generation strategy.`;
}

function buildSupplementToolpath(environment: EnvironmentOption, strategyName: string): ToolpathOption {
  const operationId = inferOperationId(strategyName, environment.mode);
  return {
    id: `${environment.id}-${toSlug(strategyName)}`,
    label: strategyName,
    path: inferPath(environment, strategyName),
    summary: inferSummary(environment, strategyName, operationId),
    operationId,
  };
}

function buildSupplements(catalog: EnvironmentOption[]) {
  const supplements: Record<string, ToolpathOption[]> = {};
  for (const environment of catalog) {
    const system = ENVIRONMENT_SYSTEM_MAP[environment.id];
    if (!system) continue;

    const existingLabels = environment.toolpaths.map((toolpath) => toolpath.label);
    const strategies = getStrategiesForSystem(system).filter((name) => isRelevantForMode(name, environment.mode));
    const missing = strategies.filter(
      (strategyName) => !existingLabels.some((existing) => areEquivalentStrategyNames(existing, strategyName)),
    );
    if (missing.length === 0) continue;

    supplements[environment.id] = missing.map((strategyName) => buildSupplementToolpath(environment, strategyName));
  }
  return supplements;
}

function mergeCatalog(catalog: EnvironmentOption[], supplements: Record<string, ToolpathOption[]>) {
  return catalog.map((environment) => {
    const extra = supplements[environment.id] ?? [];
    if (extra.length === 0) return environment;
    return {
      ...environment,
      toolpaths: [...environment.toolpaths, ...extra],
    };
  });
}

function renderSupplementModule(supplements: Record<string, ToolpathOption[]>) {
  return `export const PROGRAMMING_ENVIRONMENT_TOOLPATH_SUPPLEMENTS = ${JSON.stringify(supplements, null, 2)};\n`;
}

const currentCatalog = JSON.parse(fs.readFileSync(backendCatalogPath, 'utf8')) as EnvironmentOption[];
const supplements = buildSupplements(currentCatalog);
const mergedCatalog = mergeCatalog(currentCatalog, supplements);

fs.writeFileSync(backendCatalogPath, `${JSON.stringify(mergedCatalog, null, 2)}\n`);
fs.writeFileSync(webSupplementPath, renderSupplementModule(supplements));

const stats = Object.entries(supplements).map(([environmentId, toolpaths]) => ({
  environmentId,
  added: toolpaths.length,
}));

console.log(JSON.stringify({ ok: true, updated: mergedCatalog.length, supplements: stats }, null, 2));
