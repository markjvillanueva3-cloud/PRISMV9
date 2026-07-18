export const meta = {
  name: 'papa-tsc-deep-fix',
  description: '[SCOPED] --force-fanout: fix the 38 remaining mcp-server tsc errors, one sonnet agent per error-file (strict no-stub/no-fabricate/no-inline-physics), then cold-tsc verify. Operator push-through + ultracode.',
  phases: [
    { title: 'Fix', detail: 'one sonnet agent per error-file, correct-or-defer (edits, no commit)' },
    { title: 'Verify', detail: 'cold 16GB-heap tsc, report new count + per-file remaining' },
  ],
}

const RULES = `HARD RULES (papa backend-helper soul refuse-list -- any violation = your fix is REJECTED):
- NO stub engines / NO placeholder returns / NO TODO/FIXME.
- NO weakening type safety: no \`any\`, no \`as any\`. A double-cast \`as unknown as X\` is a LAST resort ONLY when the runtime value is provably exactly X.
- NO inlining physics constants. Import from src/physics/constants.js. If a physics constant is genuinely missing you MAY add it to src/physics/constants.ts WITH a cited literature source + a source comment, and set touchedPhysics=true.
- NO fabricated values/data. If you don't know a correct value, DEFER.
- Fix the ROOT CAUSE. If fixing the surface error UNMASKS more errors in the same file (a common cascade), you MUST fix them all so the file reaches 0 errors -- OR cleanly REVERT your change and DEFER.
- READ the REAL APIs/types before editing (the target engine's actual public methods; the actual interface fields). Use Grep/Read. Cite file:line in your summary.
- If the only correct fix needs a domain decision or real algorithm implementation you cannot do confidently and correctly, DEFER with a precise reason + exactly what is needed and which galaxy owns it.
- Do NOT run tsc (whole-program, slow, shared .tsbuildinfo) -- reason carefully instead. Do NOT git commit. Edit ONLY the file(s) named in your task.`

const SCHEMA = { type:'object', additionalProperties:false,
  required:['file','status','summary'],
  properties:{
    file:{type:'string'},
    status:{type:'string', enum:['fixed','partial','deferred']},
    touchedPhysics:{type:'boolean'},
    summary:{type:'string', description:'what you changed + file:line citations of the real APIs you used'},
    citations:{type:'string', description:'literature/source citations if you added any constant/value'},
    deferReason:{type:'string'},
    riskNotes:{type:'string'} } }

const TASKS = [
  { path:'src/physics/constants.ts', label:'constants-edm-sinker',
    errors:'ElectrodeAIReasoningEngine.ts(542-545) + TrilobeElectrodeGeometryEngine.ts(525,527,528) reference EDM_PHYSICS.sinker_spark_gap.{finish_mm,semi_mm,rough_mm}.graphite (and maybe other electrode materials) and EDM_PHYSICS.sinker_duty_cycle -- both MISSING from EDM_PHYSICS.',
    strategy:'READ the exact access paths in BOTH mcp-server/src/engines/ElectrodeAIReasoningEngine.ts (~525-545) and TrilobeElectrodeGeometryEngine.ts (~520-530) to derive the REQUIRED nested shape. Then add sinker_spark_gap and sinker_duty_cycle to EDM_PHYSICS in src/physics/constants.ts with REAL literature-cited sinker-EDM values (spark gap grows with discharge energy: finish smallest, rough largest; cite a published sinker-EDM source). Match the existing readonly style + source comment. Do NOT edit the two consumer files. touchedPhysics=true. If you cannot cite defensible values, DEFER.' },
  { path:'src/engines/AdaptiveSystemIntegrationEngine.ts', label:'AdaptiveSystemIntegration',
    errors:'(274,44) Expected 8 args got 5; (281,44) Expected 9 args got 5.',
    strategy:'Read each callee signature; supply the missing args from correct in-scope values (NOT placeholders). DEFER any call whose missing args have no correct available source.' },
  { path:'src/engines/CADAdapterRegistry.ts', label:'CADAdapterRegistry',
    errors:"(97,20) Property 'mastercamCADGeneratorAdapter' does not exist on the MastercamCodeGeneratorEngine module.",
    strategy:'Grep what MastercamCodeGeneratorEngine.ts actually EXPORTS. Rewire to the real export. If none exists, DEFER (route echo/CAM).' },
  { path:'src/engines/CADPartArchetypeRegistryEngine.ts', label:'CADPartArchetype',
    errors:'(37,11) Expected 2-3 args got 1 -- z.record(singleArg) deprecated Zod-v4.',
    strategy:'Change z.record(<value>) to z.record(z.string(), <value>). This UNMASKS a line-53 error: ARCHETYPE_REGISTRY op_template args contain undefined values violating Record<string,string|number|boolean>. Fix BOTH (migrate z.record AND fix the archetype data / make the value .optional() if undefined is intended). File must reach 0 errors.' },
  { path:'src/engines/CadQueryCodeGeneratorEngine.ts', label:'CadQuery',
    errors:"(326,47)+(379,47) Property 'generateCadQueryCode' does not exist on CADOperationTaxonomyEngine.",
    strategy:'Grep CADOperationTaxonomyEngine for the real method producing CadQuery code. Rewire both sites. If none, DEFER (route delta/CAD).' },
  { path:'src/engines/ChatterStabilityLobeEngine.ts', label:'ChatterStabilityLobe',
    errors:'(341,26)+(778,26) `new StabilityLobeDiagram()` not constructable.',
    strategy:'CRITICAL/SAFETY. StabilityLobeDiagram is a SINGLETON (src/algorithms/StabilityLobeDiagram.ts:243 export const StabilityLobeDiagram = new StabilityLobeDiagramImpl()), so new throws -> degraded chatter. Removing new is correct BUT unmasks ~19 stale-API errors in _computeWithStabilityLobeDiagram. READ StabilityLobeDiagramImpl real Algorithm<StabilityLobeInput,StabilityLobeOutput> interface (likely .execute) + the prior correct compute() usage in this file, then rewrite the WHOLE method. touchedPhysics=true. If you cannot correctly rewrite ALL of it, REVERT to new and DEFER (route foxtrot/oscar + physics-review).' },
  { path:'src/engines/FiveAxisDeepLearningEngine.ts', label:'FiveAxisDeepLearning',
    errors:'(313,397,481) 3 inline material literals missing density_kg_m3 + specific_heat_j_kgk (MaterialProps).',
    strategy:'Materials: D2 Tool Steel (iso H), M2 HSS (iso H), EDM-3 Graphite (iso N). Add density_kg_m3 + specific_heat_j_kgk with VERIFIED cited values (approx D2 ~7700/460, M2 ~8100/420, EDM-3 graphite ~1800/710 -- confirm via source). touchedPhysics=true. DEFER any you cannot cite.' },
  { path:'src/engines/FusionAIOrchestrationEngine.ts', label:'FusionAIOrchestration',
    errors:"(258,54) getPhysicsProfile missing on FusionMaterialBridgeEngine; (279,9) feature-type not in FusionFeatureType; (281,9) machine-type not in FusionMachineType.",
    strategy:'258: grep FusionMaterialBridgeEngine for the real physics-profile method; rewire or DEFER. 279/281: mapFeatureType/mapMachineType (~549/569) return a DIFFERENT taxonomy than FusionFeatureType/FusionMachineType (FusionDeepLearningEngine.ts:83). Remap outputs to valid members; DEFER if no faithful mapping.' },
  { path:'src/engines/InventorCADCodeGeneratorEngine.ts', label:'InventorCAD',
    errors:'(139,3) Set<string> not assignable to ReadonlySet<CADOperationKind>; (528,11) requireArg override TS2416.',
    strategy:'139: type INVENTOR_SUPPORTED_OPS as new Set<CADOperationKind>([...]) (import CADOperationKind) so ops validate -- mirror FreeCADCodeGeneratorEngine; drop the as-unknown-as-Set<string>. 528: base is protected requireArg(op,name,kind:"number"|"string"|"boolean"|"array"); override is private + uses "object". Align to base (protected + same kinds) OR delete the override if the base suffices (grep this.requireArg call sites here).' },
  { path:'src/engines/LatheMasterOrchestratorFacadeEngine.ts', label:'LatheMaster',
    errors:'(477,69) Expected 9 got 5; (487,17) Expected 1 got 4; (490,44) string not assignable to number.',
    strategy:'Read each callee signature; correct each call (right arity; fix the string->number at 490 with the correct numeric value). DEFER any needing unavailable values.' },
  { path:'src/engines/LatheQualityGateEngine.ts', label:'LatheQualityGate',
    errors:"(712,13) 'type' does not exist in OperationInput.",
    strategy:'omegaSafetyScoreEngine.evaluate(operation,material,machine,tool,workholding) -- the operation object uses type/cutting_speed_m_min but OperationInput (PipelineSafetyOrchestratorEngine.ts:73) has ap_mm/fz_mm/vc_mpm/tool_diameter_mm/num_teeth/tool_stickout_mm. Map the lathe op to the REAL OperationInput shape + pass the other 4 required args. DEFER if the needed data is unavailable (route whiskey/lathe).' },
  { path:'src/engines/NXCAMAIOrchestrationEngine.ts', label:'NXCAM',
    errors:"(223,52) selectStrategy missing on NXCAMStrategyEngine.",
    strategy:'NXCAMStrategyEngine has recommend(input: NXRecommendInput): NXStrategyRecommendation[] (~859), NOT selectStrategy. Read NXRecommendInput + NXStrategyRecommendation; rewire: adapt the input to NXRecommendInput + consume the array (take top-ranked [0] with a guard). Read how strategyResult is used after.' },
  { path:'src/engines/OfflineRLOrchestratorEngine.ts', label:'OfflineRL',
    errors:"(69,7) domain 'general'/'sinker' not in ledger query domain union (has 'sinker_edm', no 'general', has 'other').",
    strategy:'Map at policyExperienceLedgerEngine.query: sinker->sinker_edm, general->other. Keep mill/lathe/grinder/wedm/welder if accepted. riskNotes: general->other is a semantic choice india should confirm. Do NOT change the OfflineRL schema enum.' },
  { path:'src/engines/PowerMillAIOrchestrationEngine.ts', label:'PowerMill',
    errors:"(233,56) selectStrategy missing on PowerMillStrategyEngine.",
    strategy:'Grep PowerMillStrategyEngine for its real strategy-selection method (likely recommend, as NXCAM). Rewire input/output. DEFER if none.' },
  { path:'src/engines/ReinforcementLearningCAMFeedbackEngine.ts', label:'RLFeedback',
    errors:'(302,40)+(373,42) Expected 5 args got 4 on millingReinforcementLearningEngine.step().',
    strategy:'step(state,action,nextState,outcome,done) needs outcome:{mrr,tool_life_factor,surface_ra,safety_margin} as 4th arg; calls pass (state,action,nextState,done). Construct outcome from data in the surrounding method (mrr/tool-life/surface/safety, or derive from the empirical reward + nextState). If only a scalar reward is available and the components cannot be correctly sourced, DEFER (route india/CAM-RL -- do NOT fabricate).' },
  { path:'src/engines/ShopMachineOverlayEngine.ts', label:'ShopMachineOverlay',
    errors:"(396,9) canonical_package literal not assignable to CanonicalMachinePackage.",
    strategy:'Literal differs from CanonicalMachinePackage (MachineDataAuditEngine.ts:101): canonical_id vs id, type vs machine_type, missing footprint_mm/weight_kg/axes_count, ad-hoc spindle/tool_changer. Either build a CORRECT package OR change canonical_package field type to the actual overlay shape if intended. Read CanonicalMachinePackage fully; fix the whole literal (cascades). DEFER if correct data unavailable.' },
  { path:'src/engines/SolidCAMAIOrchestrationEngine.ts', label:'SolidCAM',
    errors:"(260,55) selectStrategy missing on SolidCAMStrategyEngine; (296,64) calculateOptimalLevel missing on an engagement-milling object.",
    strategy:'260: rewire selectStrategy to SolidCAMStrategyEngine real method (grep it; like NXCAM recommend). 296: grep the engagement object (has compute/variableStepover) for the real optimal-level method; rewire. DEFER either if none.' },
  { path:'src/engines/TurningStochasticPlanEngine.ts', label:'TurningStochastic',
    errors:"(92,45) insertChangeSchedule + (97,48) wearAccumulation missing on TurningInsertLifeEngine.",
    strategy:'TurningInsertLifeEngine has predictLife/selectGrade/validateChipbreaker only. If predictLife (or another real method) provides the needed schedule/wear data, rewire correctly. Else DEFER (route whiskey/lathe -- do NOT stub).' },
  { path:'src/engines/WEDMSafetyEnvelopeEngine.ts', label:'WEDMSafetyEnvelope',
    errors:'(62,3) envelope limits Record<keyof EnvelopeReading,EnvelopeLimit> missing U_mm,X_mm,Y_mm,Z_upper_mm + 2.',
    strategy:'Read EnvelopeReading + EnvelopeLimit. Add the missing axis-limit entries {min,max,soft_band} with REAL representative WEDM machine axis travel + soft-band values, cited. touchedPhysics=true (safety). If unsourceable, DEFER (route mike/wedm + physics-review).' },
]

phase('Fix')
// Batch in small chunks (3 concurrent) to avoid the server-side rate-limit storm
// that killed a prior 14-wide burst. Sequential chunks spread the spawns over time.
const CHUNK = 3
const fixes = []
for (let i = 0; i < TASKS.length; i += CHUNK) {
  const batch = TASKS.slice(i, i + CHUNK)
  log(`Fix batch ${Math.floor(i / CHUNK) + 1}: ${batch.map(b => b.label).join(', ')}`)
  const batchResults = await parallel(batch.map(t => () =>
    agent(
      `Fix the TypeScript error(s) in exactly this file: mcp-server/${t.path}\n\nERRORS:\n${t.errors}\n\nSTRATEGY:\n${t.strategy}\n\n${RULES}\n\nWork from H:/prism/mcp-server. Return the structured result (file = "${t.path}").`,
      { label: `fix:${t.label}`, phase: 'Fix', schema: SCHEMA, model: 'sonnet' }
    ).then(r => r || { file: t.path, status: 'deferred', summary: 'agent returned null (died/skipped)' })
  ))
  fixes.push(...batchResults)
}

phase('Verify')
const verify = await agent(
  `Run this EXACT command and report ONLY its output:\n\n` +
  `cd H:/prism/mcp-server && NODE_OPTIONS=--max-old-space-size=16384 npx tsc -p tsconfig.json --noEmit --incremental false > /tmp/tsc_wf.txt 2>&1; echo "exit=$?"; echo "count=$(grep -cE 'error TS' /tmp/tsc_wf.txt)"; grep -E 'error TS' /tmp/tsc_wf.txt | grep -oE 'src/(engines|physics)/[A-Za-z0-9]+\\.ts' | sort | uniq -c | sort -rn\n\n` +
  `Use the Bash tool (~60-120s -- wait for it). Report the exit code, total error count, and per-file remaining counts verbatim. Do not edit anything.`,
  { label: 'verify:cold-tsc', phase: 'Verify', model: 'sonnet' }
)

return {
  totalTasks: TASKS.length,
  fixed: fixes.filter(f => f && f.status === 'fixed').map(f => f.file),
  partial: fixes.filter(f => f && f.status === 'partial').map(f => f.file),
  deferred: fixes.filter(f => f && f.status === 'deferred').map(f => ({ file: f.file, reason: f.deferReason || f.summary })),
  physicsTouched: fixes.filter(f => f && f.touchedPhysics).map(f => f.file),
  perFile: fixes,
  verify,
}
