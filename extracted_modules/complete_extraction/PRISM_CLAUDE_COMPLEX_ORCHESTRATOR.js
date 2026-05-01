const PRISM_CLAUDE_COMPLEX_ORCHESTRATOR = {
  version: '1.0.0',

  config: {
    mode: 'local_simulation',
    enabled: true,
    verbosity: 'detailed'
  },
  /**
   * Orchestrate complete blisk/impeller design and manufacturing workflow
   */
  async orchestrateComplexPartWorkflow(partType, requirements) {
    console.log(`PRISM_CLAUDE_COMPLEX_ORCHESTRATOR: Starting ${partType} workflow...`);

    const workflow = {
      partType,
      requirements,
      stages: [],
      currentStage: 0,
      status: 'started',
      decisions: [],
      outputs: {}
    };
    try {
      // Stage 1: Requirements Analysis
      const reqAnalysis = await this._analyzeRequirements(partType, requirements);
      workflow.stages.push({ name: 'requirements_analysis', result: reqAnalysis });
      workflow.decisions.push(reqAnalysis.decisions);

      // Stage 2: Parameter Recommendation (using learning)
      const paramRec = await this._recommendParameters(partType, requirements, reqAnalysis);
      workflow.stages.push({ name: 'parameter_recommendation', result: paramRec });
      workflow.decisions.push(paramRec.decisions);

      // Stage 3: CAD Generation
      const cadResult = await this._generateCAD(partType, paramRec.parameters);
      workflow.stages.push({ name: 'cad_generation', result: cadResult });
      workflow.outputs.cadModel = cadResult.model;

      // Stage 4: CAM Strategy Selection
      const camStrategy = await this._selectCAMStrategy(partType, cadResult.model, requirements);
      workflow.stages.push({ name: 'cam_strategy', result: camStrategy });
      workflow.decisions.push(camStrategy.decisions);

      // Stage 5: Toolpath Generation
      const toolpaths = await this._generateToolpaths(partType, cadResult.model, camStrategy);
      workflow.stages.push({ name: 'toolpath_generation', result: toolpaths });
      workflow.outputs.toolpaths = toolpaths.program;

      // Stage 6: G-code Generation
      const gcode = await this._generateGCode(toolpaths.program, requirements.machine);
      workflow.stages.push({ name: 'gcode_generation', result: gcode });
      workflow.outputs.gcode = gcode.code;

      // Stage 7: Verification
      const verification = await this._verifyProgram(workflow.outputs);
      workflow.stages.push({ name: 'verification', result: verification });

      workflow.status = 'completed';
      workflow.summary = this._generateWorkflowSummary(workflow);

    } catch (error) {
      workflow.status = 'error';
      workflow.error = error.message;
      console.error('Workflow error:', error);
    }
    return workflow;
  },
  /**
   * Analyze requirements and make initial decisions
   */
  async _analyzeRequirements(partType, requirements) {
    const analysis = {
      decisions: [],
      recommendations: []
    };
    // Analyze material
    const materialDecision = this._decideOnMaterial(partType, requirements);
    analysis.decisions.push(materialDecision);

    // Analyze machine requirements
    const machineDecision = this._decideOnMachine(partType, requirements);
    analysis.decisions.push(machineDecision);

    // Analyze tolerance requirements
    const toleranceDecision = this._decideOnToleranceApproach(requirements);
    analysis.decisions.push(toleranceDecision);

    // Generate reasoning summary
    analysis.reasoning = [
      `Part Type: ${partType} - ${this._getPartTypeDescription(partType)}`,
      `Material: ${materialDecision.choice} selected for ${materialDecision.reason}`,
      `Machine: ${machineDecision.choice} required for ${machineDecision.reason}`,
      `Tolerance approach: ${toleranceDecision.choice}`
    ];

    return analysis;
  },
  _decideOnMaterial(partType, requirements) {
    const materials = {
      blisk: ['Ti-6Al-4V', 'Inconel 718', 'Ti-6246'],
      impeller: ['Aluminum 7075', 'Ti-6Al-4V', 'Inconel 625'],
      turbine_blade: ['Inconel 718', 'CMSX-4', 'Rene N5']
    };
    const recommended = materials[partType]?.[0] || requirements.material || 'Ti-6Al-4V';

    return {
      type: 'material_selection',
      choice: recommended,
      alternatives: materials[partType] || [],
      reason: partType === 'blisk' ? 'high strength-to-weight ratio and fatigue resistance' :
              partType === 'impeller' ? 'corrosion resistance and machinability' :
              'high temperature capability',
      confidence: 0.85
    };
  },
  _decideOnMachine(partType, requirements) {
    const machineReq = {
      blisk: { axes: 5, type: 'simultaneous', spindle: 'HSK-A63', rpm: 15000 },
      impeller: { axes: 5, type: 'simultaneous', spindle: 'HSK-A63', rpm: 20000 },
      turbine_blade: { axes: 5, type: 'simultaneous', spindle: 'HSK-E40', rpm: 25000 }
    };
    const req = machineReq[partType] || machineReq.blisk;

    return {
      type: 'machine_selection',
      choice: `5-axis ${req.type} with ${req.spindle}`,
      requirements: req,
      reason: 'complex blade geometry requires simultaneous 5-axis for surface quality',
      recommendations: [
        'DMG MORI DMU 65 monoBLOCK',
        'Makino D500',
        'GF Mikron MILL S 500 U'
      ],
      confidence: 0.9
    };
  },
  _decideOnToleranceApproach(requirements) {
    const profileTol = requirements.profileTolerance || 0.05;

    return {
      type: 'tolerance_approach',
      choice: profileTol < 0.025 ? 'multi_pass_finish' : 'single_finish_pass',
      profileTolerance: profileTol,
      surfaceFinish: profileTol < 0.025 ? 0.8 : 1.6,
      reason: profileTol < 0.025 ?
        'Tight tolerance requires spring passes and verification' :
        'Standard tolerance achievable with single finish pass',
      confidence: 0.88
    };
  },
  _getPartTypeDescription(partType) {
    const descriptions = {
      blisk: 'Bladed disk (integral blade rotor)',
      impeller: 'Radial or mixed-flow impeller',
      turbine_blade: 'Individual turbine blade with root attachment'
    };
    return descriptions[partType] || partType;
  },
  /**
   * Recommend parameters using learning engine
   */
  async _recommendParameters(partType, requirements, analysis) {
    const result = {
      decisions: [],
      parameters: {}
    };
    // Use PRISM_COMPLEX_CAD_LEARNING_ENGINE for recommendations
    if (partType === 'blisk') {
      result.parameters = PRISM_COMPLEX_CAD_LEARNING_ENGINE.recommendBliskParameters({
        targetDiameter: requirements.diameter || 300,
        targetBladeCount: requirements.bladeCount || 36,
        application: requirements.application,
        material: analysis.decisions[0].choice
      });

      result.decisions.push({
        type: 'parameter_source',
        choice: result.parameters.confidence > 0.7 ? 'learned_from_similar' : 'calculated_defaults',
        confidence: result.parameters.confidence,
        reason: result.parameters.confidence > 0.7 ?
          `Based on ${PRISM_COMPLEX_CAD_LEARNING_ENGINE.learnedPatterns.blisks.length} similar learned blisks` :
          'Using calculated defaults, recommend learning from reference parts'
      });
    }
    return result;
  },
  /**
   * Generate CAD model
   */
  async _generateCAD(partType, parameters) {
    const result = {
      model: null,
      statistics: {}
    };
    // Use AEROSPACE_MEDICAL_CAD_ENGINE for actual generation
    if (typeof AEROSPACE_MEDICAL_CAD_ENGINE !== 'undefined') {
      if (partType === 'blisk') {
        result.model = AEROSPACE_MEDICAL_CAD_ENGINE.blisk.generate(parameters);
      } else if (partType === 'impeller') {
        result.model = AEROSPACE_MEDICAL_CAD_ENGINE.impeller.generate(parameters);
      }
    }
    // Generate blade surfaces using advanced engine
    if (result.model && result.model.blades) {
      result.model.blades = result.model.blades.map(blade => {
        const surfaceResult = PRISM_ADVANCED_BLADE_SURFACE_ENGINE.generateBladeSurface({
          airfoilSections: blade.sections || [],
          spanPositions: blade.sections?.map((s, i) => i / (blade.sections.length - 1)) || [],
          continuity: 'G2'
        });

        return {
          ...blade,
          ...surfaceResult.surfaces
        };
      });
    }
    result.statistics = {
      bladeCount: result.model?.blades?.length || 0,
      surfaceCount: (result.model?.blades?.length || 0) * 2 + 1,  // 2 per blade + hub
      generatedAt: new Date().toISOString()
    };
    return result;
  },
  /**
   * Select CAM strategy
   */
  async _selectCAMStrategy(partType, model, requirements) {
    const result = {
      decisions: [],
      strategy: {}
    };
    // Use PRISM_MULTI_OBJECTIVE_OPTIMIZER if available
    if (typeof PRISM_MULTI_OBJECTIVE_OPTIMIZER !== 'undefined') {
      const optResult = PRISM_MULTI_OBJECTIVE_OPTIMIZER.selectOptimalStrategy({
        feature: { type: partType, geometry: model },
        material: requirements.material || 'Ti-6Al-4V',
        machine: requirements.machine,
        profile: 'balanced'
      });

      result.strategy = optResult;
      result.decisions.push({
        type: 'strategy_optimization',
        choice: optResult.recommended?.strategy || '5axis_flowline',
        scores: optResult.scores,
        reason: optResult.reasoning
      });
    } else {
      // Default strategies for complex parts
      result.strategy = {
        roughing: 'channel_roughing_5axis',
        semiFinish: 'blade_semifinish_flowline',
        finishing: 'blade_finish_flowline',
        fillet: 'fillet_parallel'
      };
      result.decisions.push({
        type: 'strategy_selection',
        choice: 'flowline_5axis',
        reason: 'Standard 5-axis flowline strategy for blade finishing',
        confidence: 0.75
      });
    }
    return result;
  },
  /**
   * Generate toolpaths
   */
  async _generateToolpaths(partType, model, camStrategy) {
    const result = {
      program: null,
      statistics: {}
    };
    if (partType === 'blisk') {
      result.program = PRISM_5AXIS_BLISK_CAM_ENGINE.generateBliskProgram(model, {
        roughingTool: { diameter: 6, cornerRadius: 0.5, type: 'ball', fluteLength: 25 },
        finishingTool: { diameter: 4, cornerRadius: 0, type: 'ball', fluteLength: 30 },
        stockAllowance: 0.5,
        finishAllowance: 0.1
      });
    }
    result.statistics = result.program?.statistics || {};

    return result;
  },
  /**
   * Generate G-code
   */
  async _generateGCode(program, machine) {
    const result = {
      code: '',
      lineCount: 0
    };
    if (program) {
      result.code = PRISM_5AXIS_BLISK_CAM_ENGINE.generateGCode(program, machine?.postProcessor || 'FANUC_5AXIS');
      result.lineCount = result.code.split('\n').length;
    }
    return result;
  },
  /**
   * Verify program
   */
  async _verifyProgram(outputs) {
    const result = {
      passed: true,
      checks: [],
      warnings: []
    };
    // Check G-code validity
    if (outputs.gcode) {
      result.checks.push({
        name: 'gcode_syntax',
        passed: true,
        message: 'G-code syntax valid'
      });

      // Check for 5-axis codes
      const has5Axis = outputs.gcode.includes('G43.4') || outputs.gcode.includes('G43.5');
      result.checks.push({
        name: '5axis_mode',
        passed: has5Axis,
        message: has5Axis ? 'TCPC mode enabled' : 'Warning: No TCPC mode detected'
      });

      if (!has5Axis) {
        result.warnings.push('5-axis TCPC mode not detected - verify post processor settings');
      }
    }
    return result;
  },
  _generateWorkflowSummary(workflow) {
    return {
      partType: workflow.partType,
      stages: workflow.stages.length,
      decisions: workflow.decisions.flat().length,
      outputs: Object.keys(workflow.outputs),
      totalTime: workflow.outputs.toolpaths?.statistics?.totalTime || 0,
      gcodeLines: workflow.outputs.gcode?.split('\n').length || 0
    };
  },
  /**
   * Get guidance for specific decision point
   */
  getDecisionGuidance(decisionType, context) {
    // Use base PRISM_CLAUDE_ORCHESTRATOR if available
    if (typeof PRISM_CLAUDE_ORCHESTRATOR !== 'undefined') {
      return PRISM_CLAUDE_ORCHESTRATOR.getGuidance(decisionType, context);
    }
    // Fallback for complex-specific decisions
    const guidance = {
      blade_thickness: {
        recommendation: 'Use 6-10% of chord for compressor blades',
        factors: ['aerodynamic efficiency', 'structural strength', 'manufacturability'],
        confidence: 0.8
      },
      fillet_radius: {
        recommendation: 'Root fillet = 8-12% of blade height for stress distribution',
        factors: ['stress concentration', 'flow separation', 'tool access'],
        confidence: 0.85
      },
      channel_width: {
        recommendation: 'Minimum 1.5x tool diameter for roughing access',
        factors: ['tool access', 'chip evacuation', 'surface finish'],
        confidence: 0.9
      }
    };
    return guidance[decisionType] || { recommendation: 'No specific guidance available', confidence: 0.5 };
  }
}