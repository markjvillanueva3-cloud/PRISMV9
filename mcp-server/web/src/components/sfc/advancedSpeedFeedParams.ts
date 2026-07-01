/**
 * Map the standalone SFC page's selections (MaterialEntry / OperationType /
 * SfcParams / CuttingToolEntry) to the flat SpeedFeedParams the 9-axis
 * orchestrator route consumes. Pure + testable; guards optional fields so a
 * partial selection never sends a malformed value (iso_group / coolant_type
 * are unions -- pass only recognized members, omit otherwise).
 */
import type { SpeedFeedParams } from '../../api/speedfeed';
import type { MaterialEntry } from '../../data/materials';
import type { OperationType } from '../../data/operations';
import type { CuttingToolEntry } from '../../data/tools';
import type { SfcParams } from './ParameterPanel';

const ISO_GROUPS: ReadonlySet<string> = new Set(['P', 'M', 'K', 'N', 'S', 'H']);
const COOLANT_TYPES: ReadonlySet<string> = new Set([
  'flood',
  'mist',
  'MQL',
  'dry',
  'cryogenic',
  'through_tool',
]);

// ParameterPanel's coolant dropdown emits a few tokens that are not exact
// SpeedFeedParams.coolant_type members ('mql' lowercase, 'air_blast'); alias them
// so the operator's coolant choice still reaches the orchestrator (was silently
// dropped). air_blast has no liquid coolant -> nearest physical analog is 'dry'.
const COOLANT_ALIAS: Record<string, SpeedFeedParams['coolant_type']> = {
  mql: 'MQL',
  air_blast: 'dry',
};

function positive(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function toAdvancedSpeedFeedParams(
  material: MaterialEntry,
  operation: OperationType,
  params: SfcParams,
  tool?: CuttingToolEntry | null,
): SpeedFeedParams {
  const isoGroup = ISO_GROUPS.has(material.group)
    ? (material.group as SpeedFeedParams['iso_group'])
    : undefined;
  const coolant = COOLANT_TYPES.has(params.coolant)
    ? (params.coolant as SpeedFeedParams['coolant_type'])
    : COOLANT_ALIAS[params.coolant];
  const diameter = positive(params.tool_diameter) ?? positive(tool?.diameter);
  const flutes = positive(params.number_of_teeth) ?? positive(tool?.fluteCount);
  const doc = positive(params.depth);
  const woc = positive(params.width);

  return {
    material: material.name,
    operation: operation.id,
    iso_group: isoGroup,
    hardness_hb: positive(material.hardness),
    tool_diameter_mm: diameter,
    flutes,
    num_flutes: flutes,
    tool_material: params.tool_material || tool?.substrate || undefined,
    tool_coating: tool?.coating || undefined,
    axial_depth_mm: doc,
    radial_depth_mm: woc,
    doc_mm: doc,
    woc_mm: woc,
    coolant_type: coolant,
    output_detail: 'full',
  };
}
