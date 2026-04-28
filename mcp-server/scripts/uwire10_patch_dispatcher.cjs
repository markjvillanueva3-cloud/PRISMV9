// U-WIRE10: patch calcDispatcher.ts — ACTIONS array + switch cases
const fs = require('fs');
const filePath = 'H:/prism/mcp-server/src/tools/dispatchers/calcDispatcher.ts';
let content = fs.readFileSync(filePath, 'utf8');

// ── 1. ACTIONS array: append before '] as const;' ──────────────────────────
const ACTIONS_MARKER = '] as const;';
const actionsIdx = content.indexOf(ACTIONS_MARKER);
if (actionsIdx === -1) { console.error('ERROR: ACTIONS marker not found'); process.exit(1); }

const ACTIONS_INSERT = [
  '  // -- ENGINE-WIRE-MS0/U-WIRE10: 5 neural+adaptive engines --',
  '  "chatter_neural_classify", "thermal_neural_predict",',
  '  "adaptive_param_space_record", "adaptive_param_space_query",',
  '  "adaptive_machining_process", "adaptive_physics_bridge",',
].join('\r\n') + '\r\n';

content = content.slice(0, actionsIdx) + ACTIONS_INSERT + content.slice(actionsIdx);

// ── 2. Switch cases: insert before 'default:\r\n            throw new Error(`Unknown calculation action' ──
const DEFAULT_MARKER = "default:\r\n            throw new Error(`Unknown calculation action: ${action}`)";
const defaultIdx = content.indexOf(DEFAULT_MARKER);
if (defaultIdx === -1) {
  // try LF only
  const DEFAULT_MARKER_LF = "default:\n            throw new Error(`Unknown calculation action: ${action}`)";
  const idx2 = content.indexOf(DEFAULT_MARKER_LF);
  if (idx2 === -1) { console.error('ERROR: default throw marker not found'); process.exit(1); }
}

const SWITCH_CASES = `          case "chatter_neural_classify": {
            const { chatterNeuralClassifierEngine } = await import("../../engines/ChatterNeuralClassifierEngine.js");
            const p = params as Record<string, unknown>;
            const frf = {
              frequencyBins: Array.isArray(p.frequencyBins) ? p.frequencyBins as number[] : [100, 200, 300, 400, 500],
              magnitudes: Array.isArray(p.magnitudes) ? p.magnitudes as number[] : [0.1, 0.2, 0.3, 0.2, 0.1],
            };
            const features = {
              spindleRpm: typeof p.spindleRpm === "number" ? p.spindleRpm : 5000,
              axialDepthMm: typeof p.axialDepthMm === "number" ? p.axialDepthMm : 5,
              radialDepthMm: typeof p.radialDepthMm === "number" ? p.radialDepthMm : 5,
              feedPerToothMm: typeof p.feedPerToothMm === "number" ? p.feedPerToothMm : 0.1,
              toolDiameterMm: typeof p.toolDiameterMm === "number" ? p.toolDiameterMm : 10,
              fluteCount: typeof p.fluteCount === "number" ? p.fluteCount : 4,
              overhangMm: typeof p.overhangMm === "number" ? p.overhangMm : 50,
              materialIsoGroup: (typeof p.materialIsoGroup === "string" ? p.materialIsoGroup : "P") as "P"|"M"|"K"|"N"|"S"|"H",
              helixAngleDeg: typeof p.helixAngleDeg === "number" ? p.helixAngleDeg : undefined,
              kc11Mpa: typeof p.kc11Mpa === "number" ? p.kc11Mpa : undefined,
              machineStiffnessNPerUm: typeof p.machineStiffnessNPerUm === "number" ? p.machineStiffnessNPerUm : undefined,
              naturalFrequencyHz: typeof p.naturalFrequencyHz === "number" ? p.naturalFrequencyHz : undefined,
            };
            result = chatterNeuralClassifierEngine.classify(frf, features);
            break;
          }
          case "thermal_neural_predict": {
            const { thermalNeuralPredictorEngine } = await import("../../engines/ThermalNeuralPredictorEngine.js");
            const p = params as Record<string, unknown>;
            const input = {
              material: {
                iso_group: (typeof p.material_iso_group === "string" ? p.material_iso_group : "P") as "P"|"M"|"K"|"N"|"S"|"H",
                thermal_conductivity_w_mk: typeof p.thermal_conductivity_w_mk === "number" ? p.thermal_conductivity_w_mk : undefined,
                specific_heat_j_kgk: typeof p.specific_heat_j_kgk === "number" ? p.specific_heat_j_kgk : undefined,
                density_kg_m3: typeof p.density_kg_m3 === "number" ? p.density_kg_m3 : undefined,
              },
              tool: {
                material: (typeof p.tool_material === "string" ? p.tool_material : "carbide") as "carbide"|"ceramic"|"cbn"|"pcd"|"hss",
                coating: typeof p.tool_coating === "string" ? p.tool_coating as "uncoated"|"TiN"|"TiAlN"|"AlTiN"|"DLC" : undefined,
                thermal_conductivity_w_mk: typeof p.tool_conductivity_w_mk === "number" ? p.tool_conductivity_w_mk : undefined,
              },
              conditions: {
                cutting_speed_mpm: typeof p.cutting_speed_mpm === "number" ? p.cutting_speed_mpm : 200,
                feed_per_tooth_mm: typeof p.feed_per_tooth_mm === "number" ? p.feed_per_tooth_mm : 0.1,
                axial_depth_mm: typeof p.axial_depth_mm === "number" ? p.axial_depth_mm : 5,
                radial_depth_mm: typeof p.radial_depth_mm === "number" ? p.radial_depth_mm : 5,
                cutting_force_n: typeof p.cutting_force_n === "number" ? p.cutting_force_n : 500,
              },
              coolant: {
                type: (typeof p.coolant_type === "string" ? p.coolant_type : "flood") as "dry"|"flood"|"mql"|"cryogenic",
                flow_rate_lpm: typeof p.coolant_flow_lpm === "number" ? p.coolant_flow_lpm : undefined,
                temperature_c: typeof p.coolant_temp_c === "number" ? p.coolant_temp_c : undefined,
              },
              history: typeof p.cutting_time_s === "number" ? { cutting_time_s: p.cutting_time_s } : undefined,
            };
            result = thermalNeuralPredictorEngine.predict(input);
            break;
          }
          case "adaptive_param_space_record": {
            const { adaptiveParameterSpaceEngine } = await import("../../engines/AdaptiveParameterSpaceEngine.js");
            const p = params as Record<string, unknown>;
            adaptiveParameterSpaceEngine.recordOperation({
              parameters: typeof p.parameters === "object" && p.parameters !== null ? p.parameters as Record<string, number> : {},
              timestamp: new Date().toISOString(),
              outcome: (typeof p.outcome === "string" ? p.outcome : "success") as "success"|"marginal"|"failure",
              context: typeof p.context === "object" && p.context !== null ? p.context as Record<string, unknown> : {},
            });
            result = adaptiveParameterSpaceEngine.getStatistics();
            break;
          }
          case "adaptive_param_space_query": {
            const { adaptiveParameterSpaceEngine } = await import("../../engines/AdaptiveParameterSpaceEngine.js");
            const p = params as Record<string, unknown>;
            const count = typeof p.count === "number" ? p.count : 5;
            result = {
              statistics: adaptiveParameterSpaceEngine.getStatistics(),
              explorationTargets: adaptiveParameterSpaceEngine.suggestExplorationTargets(count),
              unexploredGaps: adaptiveParameterSpaceEngine.identifyUnexploredGaps().slice(0, count),
              exploredRegions: adaptiveParameterSpaceEngine.getExploredRegions().slice(0, count),
            };
            break;
          }
          case "adaptive_machining_process": {
            const { adaptiveMachiningIntegrationEngine } = await import("../../engines/AdaptiveMachiningIntegrationEngine.js");
            result = adaptiveMachiningIntegrationEngine.process(
              params as unknown as Parameters<typeof adaptiveMachiningIntegrationEngine.process>[0]
            );
            break;
          }
          case "adaptive_physics_bridge": {
            const { adaptivePhysicsBridgeEngine } = await import("../../engines/AdaptivePhysicsBridgeEngine.js");
            const p = params as Record<string, unknown>;
            const conditions = {
              feed_mm_rev: typeof p.feed_mm_rev === "number" ? p.feed_mm_rev : 0.2,
              depth_of_cut_mm: typeof p.depth_of_cut_mm === "number" ? p.depth_of_cut_mm : 2,
              cutting_speed_mpm: typeof p.cutting_speed_mpm === "number" ? p.cutting_speed_mpm : 150,
              material: (typeof p.material === "string" ? p.material : "steel") as "steel"|"stainless"|"aluminum"|"cast_iron"|"titanium"|"superalloy",
              tool_diameter_mm: typeof p.tool_diameter_mm === "number" ? p.tool_diameter_mm : undefined,
              rake_angle_deg: typeof p.rake_angle_deg === "number" ? p.rake_angle_deg : undefined,
              insert_nose_radius_mm: typeof p.insert_nose_radius_mm === "number" ? p.insert_nose_radius_mm : undefined,
              chipbreaker_type: typeof p.chipbreaker_type === "string" ? p.chipbreaker_type as "none"|"light"|"medium"|"heavy" : undefined,
              coolant: typeof p.coolant === "boolean" ? p.coolant : true,
            };
            const cuttingPower = typeof p.cutting_power_kw === "number" ? p.cutting_power_kw : 5;
            const ratedPower = typeof p.rated_power_kw === "number" ? p.rated_power_kw : 15;
            const cuttingTime = typeof p.cutting_time_min === "number" ? p.cutting_time_min : 30;
            result = adaptivePhysicsBridgeEngine.performIntegratedAnalysis(conditions, cuttingPower, ratedPower, cuttingTime);
            break;
          }
`;

const insertIdx = content.indexOf(DEFAULT_MARKER);
if (insertIdx === -1) { console.error('ERROR: default throw marker not found after content update'); process.exit(1); }

content = content.slice(0, insertIdx) + SWITCH_CASES + content.slice(insertIdx);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Dispatcher patch OK. New length:', content.length);

const actions = ['chatter_neural_classify','thermal_neural_predict','adaptive_param_space_record','adaptive_param_space_query','adaptive_machining_process','adaptive_physics_bridge'];
actions.forEach(a => {
  if (!content.includes('"' + a + '"')) { console.error('MISSING action in ACTIONS:', a); process.exit(1); }
  if (!content.includes('case "' + a + '"')) { console.error('MISSING case:', a); process.exit(1); }
  console.log('VERIFIED:', a);
});
console.log('All dispatcher patches verified.');
