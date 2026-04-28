// U-WIRE10: patch calcActionSchemas.ts with 6 new schema entries
const fs = require('fs');
const filePath = 'H:/prism/mcp-server/src/schemas/calcActionSchemas.ts';
let content = fs.readFileSync(filePath, 'utf8');

const CRLF = '\r\n';

const newBlock = [
  '  // -- ENGINE-WIRE-MS0/U-WIRE10: 5 neural+adaptive engines --',
  '  chatter_neural_classify: z.object({',
  "    frequencyBins: z.array(z.number()).min(1).describe('FRF frequency bins (Hz)'),",
  "    magnitudes: z.array(z.number()).min(1).describe('FRF magnitude values'),",
  "    spindleRpm: posNum.describe('Spindle speed (RPM)'),",
  "    axialDepthMm: posNum.describe('Axial depth of cut (mm)'),",
  "    radialDepthMm: posNum.describe('Radial depth of cut (mm)'),",
  "    feedPerToothMm: posNum.describe('Feed per tooth (mm)'),",
  "    toolDiameterMm: posNum.describe('Tool diameter (mm)'),",
  "    fluteCount: z.number().int().min(1).describe('Number of flutes'),",
  "    overhangMm: posNum.describe('Tool overhang (mm)'),",
  "    materialIsoGroup: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),",
  "    helixAngleDeg: optPosNum.describe('Helix angle (degrees)'),",
  "    kc11Mpa: optPosNum.describe('Kienzle kc1.1 coefficient (MPa)'),",
  "    machineStiffnessNPerUm: optPosNum.describe('Machine stiffness (N/um)'),",
  "    naturalFrequencyHz: optPosNum.describe('Natural frequency (Hz)'),",
  "  }).passthrough().describe('1D-CNN neural classifier for chatter stability: stable/at_risk/chatter'),",
  '  thermal_neural_predict: z.object({',
  "    material_iso_group: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),",
  "    thermal_conductivity_w_mk: optPosNum.describe('Material thermal conductivity (W/mK)'),",
  "    specific_heat_j_kgk: optPosNum.describe('Specific heat capacity (J/kgK)'),",
  "    density_kg_m3: optPosNum.describe('Material density (kg/m3)'),",
  "    tool_material: z.enum(['carbide','ceramic','cbn','pcd','hss']).describe('Tool substrate material'),",
  "    tool_coating: z.enum(['uncoated','TiN','TiAlN','AlTiN','DLC']).optional().describe('Tool coating type'),",
  "    tool_conductivity_w_mk: optPosNum.describe('Tool thermal conductivity (W/mK)'),",
  "    cutting_speed_mpm: posNum.describe('Cutting speed (m/min)'),",
  "    feed_per_tooth_mm: posNum.describe('Feed per tooth (mm)'),",
  "    axial_depth_mm: posNum.describe('Axial depth of cut (mm)'),",
  "    radial_depth_mm: posNum.describe('Radial depth of cut (mm)'),",
  "    cutting_force_n: posNum.describe('Cutting force (N)'),",
  "    coolant_type: z.enum(['dry','flood','mql','cryogenic']).describe('Coolant strategy'),",
  "    coolant_flow_lpm: optPosNum.describe('Coolant flow rate (L/min)'),",
  "    coolant_temp_c: optNum.describe('Coolant temperature (C)'),",
  "    cutting_time_s: optPosNum.describe('Accumulated cutting time (s)'),",
  "  }).passthrough().describe('Physics-LSTM hybrid temperature prediction with coating degradation risk'),",
  '  adaptive_param_space_record: z.object({',
  "    parameters: z.record(z.string(), z.number()).describe('Parameter name to value map'),",
  "    outcome: z.enum(['success','marginal','failure']).describe('Operation outcome'),",
  "    context: z.record(z.string(), z.unknown()).optional().describe('Additional context metadata'),",
  "  }).passthrough().describe('Record operation outcome to expand the adaptive parameter space'),",
  '  adaptive_param_space_query: z.object({',
  "    count: z.number().int().min(1).max(20).optional().describe('Number of exploration targets (default 5)'),",
  "  }).passthrough().describe('Query adaptive parameter space: stats, gaps, exploration targets'),",
  '  adaptive_machining_process: z.object({',
  "    domain: z.enum(['milling','turning','mill_turn']).describe('Machining domain'),",
  "    requestType: z.enum(['pre_analysis','real_time','post_analysis','full_cycle']).describe('Analysis type'),",
  "    material: z.string().min(1).describe('Material name or identifier'),",
  "    materialIso: z.enum(['P','M','K','N','S','H']).describe('ISO material group'),",
  "    machineId: z.string().min(1).describe('Machine identifier'),",
  "    toolId: z.string().min(1).describe('Tool identifier'),",
  "    operationType: z.string().min(1).describe('Operation type'),",
  '    milling: z.object({',
  '      toolDiameter: z.number().positive(),',
  '      flutes: z.number().int().min(1),',
  '      axialDepth: z.number().positive(),',
  '      radialDepth: z.number().positive(),',
  '      feedPerTooth: z.number().positive(),',
  '      cuttingSpeed: z.number().positive(),',
  "      toolpathType: z.enum(['linear','trochoidal','adaptive','hsr']),",
  "    }).optional().describe('Milling-specific parameters'),",
  '    turning: z.object({',
  '      diameter: z.number().positive(),',
  '      depthOfCut: z.number().positive(),',
  '      feedPerRev: z.number().positive(),',
  '      leadAngle: z.number(),',
  '      noseRadius: z.number().positive(),',
  '      cuttingSpeed: z.number().positive(),',
  '      cssEnabled: z.boolean(),',
  "      operationType: z.enum(['od_turning','id_boring','facing','grooving','threading','parting']),",
  "    }).optional().describe('Turning-specific parameters'),",
  '    environment: z.object({',
  '      ambientTemp: z.number(),',
  '      humidity: z.number(),',
  '      machineUptime: z.number(),',
  "    }).optional().describe('Environmental conditions'),",
  "    includeFailureAnalysis: optBool.describe('Include failure mode analysis'),",
  "    includeEnvironmentalAnalysis: optBool.describe('Include environmental sensitivity analysis'),",
  "    includeRecommendations: optBool.describe('Include operation recommendations'),",
  "  }).passthrough().describe('Unified adaptive machining integration: milling/turning pre/real-time/post analysis'),",
  '  adaptive_physics_bridge: z.object({',
  "    feed_mm_rev: posNum.describe('Feed per revolution (mm/rev)'),",
  "    depth_of_cut_mm: posNum.describe('Depth of cut (mm)'),",
  "    cutting_speed_mpm: posNum.describe('Cutting speed (m/min)'),",
  "    material: z.enum(['steel','stainless','aluminum','cast_iron','titanium','superalloy']).describe('Workpiece material'),",
  "    tool_diameter_mm: optPosNum.describe('Tool diameter (mm)'),",
  "    rake_angle_deg: optNum.describe('Tool rake angle (degrees)'),",
  "    insert_nose_radius_mm: optPosNum.describe('Insert nose radius (mm)'),",
  "    chipbreaker_type: z.enum(['none','light','medium','heavy']).optional().describe('Chipbreaker type'),",
  "    coolant: optBool.describe('Coolant active'),",
  "    cutting_power_kw: optPosNum.describe('Current cutting power (kW)'),",
  "    rated_power_kw: optPosNum.describe('Machine rated power (kW)'),",
  "    cutting_time_min: optPosNum.describe('Cutting time (min)'),",
  "  }).passthrough().describe('Integrated adaptive physics bridge: chip+coolant+spindle+wear analysis'),",
].join(CRLF) + CRLF;

const insertPoint = content.lastIndexOf('};');
if (insertPoint === -1) { console.error('ERROR: Cannot find closing }; of ACTION_CALC_SCHEMAS'); process.exit(1); }

content = content.slice(0, insertPoint) + newBlock + content.slice(insertPoint);
fs.writeFileSync(filePath, content, 'utf8');
console.log('Schema patch OK. New length:', content.length);

const keys = ['chatter_neural_classify','thermal_neural_predict','adaptive_param_space_record','adaptive_param_space_query','adaptive_machining_process','adaptive_physics_bridge'];
keys.forEach(k => {
  if (!content.includes(k)) { console.error('MISSING:', k); process.exit(1); }
  console.log('FOUND:', k);
});
console.log('All schema keys verified.');
