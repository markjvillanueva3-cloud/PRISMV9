const PRISM_COST_ESTIMATION = {
  version: '1.0.0',

  // Default rates (can be customized per shop)
  rates: {
    machineHourly: {
      '3axis_vmc': 75,
      '4axis_vmc': 95,
      '5axis_vmc': 150,
      'lathe_2axis': 65,
      'lathe_live': 110,
      'swiss': 175,
      'mill_turn': 200,
      'edm_wire': 85,
      'edm_sinker': 75,
      'grinder': 90
    },
    laborHourly: {
      'setup': 55,
      'programming': 75,
      'inspection': 50,
      'operator': 35
    },
    overhead: 1.35,  // 35% overhead
    profitMargin: 0.25  // 25% profit
  },
  // Tool cost database (average costs)
  toolCosts: {
    endmill: {
      '0.125': { carbide: 18, hss: 8 },
      '0.250': { carbide: 28, hss: 12 },
      '0.375': { carbide: 42, hss: 18 },
      '0.500': { carbide: 55, hss: 25 },
      '0.750': { carbide: 85, hss: 40 },
      '1.000': { carbide: 120, hss: 55 }
    },
    drill: {
      '0.125': { carbide: 22, hss: 6 },
      '0.250': { carbide: 35, hss: 10 },
      '0.375': { carbide: 48, hss: 15 },
      '0.500': { carbide: 65, hss: 22 }
    },
    insert: {
      'CNMG': 12,
      'WNMG': 11,
      'DNMG': 10,
      'VNMG': 9,
      'CCMT': 8,
      'DCMT': 8
    },
    tap: {
      'spiral_point': 35,
      'spiral_flute': 45,
      'roll_form': 65
    }
  },
  /**
   * Estimate complete job cost
   */
  estimateJobCost(params) {
    const {
      operations,
      machineType = '3axis_vmc',
      material,
      quantity = 1,
      complexity = 'medium',  // 'simple', 'medium', 'complex'
      tolerance = 'standard'  // 'standard', 'precision', 'ultra'
    } = params;

    const estimate = {
      machineTime: 0,
      setupTime: 0,
      programmingTime: 0,
      inspectionTime: 0,
      materialCost: 0,
      toolingCost: 0,
      machineCost: 0,
      laborCost: 0,
      subtotal: 0,
      overhead: 0,
      profit: 0,
      total: 0,
      pricePerPart: 0,
      breakdown: []
    };
    // Calculate machine time from operations
    for (const op of operations) {
      const opTime = op.stats?.estimatedTime || this._estimateOperationTime(op);
      estimate.machineTime += opTime;

      estimate.breakdown.push({
        operation: op.type,
        time: opTime,
        cost: (opTime / 3600) * this.rates.machineHourly[machineType]
      });
    }
    // Setup time based on complexity
    const setupMultipliers = { simple: 0.5, medium: 1.0, complex: 2.0 };
    estimate.setupTime = 30 * 60 * setupMultipliers[complexity]; // Base 30 min

    // Programming time
    const progMultipliers = { simple: 0.5, medium: 1.0, complex: 3.0 };
    estimate.programmingTime = 60 * 60 * progMultipliers[complexity]; // Base 1 hour

    // Inspection time based on tolerance
    const inspMultipliers = { standard: 0.5, precision: 1.0, ultra: 2.0 };
    estimate.inspectionTime = 15 * 60 * inspMultipliers[tolerance] * quantity; // Base 15 min per part

    // Material cost (rough estimate based on volume)
    if (material) {
      const materialPrices = {
        'aluminum_6061': 3.50,  // per lb
        'aluminum_7075': 5.50,
        'steel_1018': 1.50,
        'steel_4140': 2.50,
        'stainless_304': 4.00,
        'stainless_316': 5.00,
        'titanium': 25.00,
        'brass': 6.00,
        'copper': 8.00
      };
      const pricePerLb = materialPrices[material.toLowerCase()] || 3.00;
      // Estimate 2 lbs per part as default
      estimate.materialCost = pricePerLb * 2 * quantity;
    }
    // Tooling cost (estimate wear)
    const toolWearCost = (estimate.machineTime / 3600) * 5; // $5/hr tooling wear
    estimate.toolingCost = toolWearCost * quantity;

    // Calculate costs
    estimate.machineCost = (estimate.machineTime / 3600) * this.rates.machineHourly[machineType] * quantity;
    estimate.laborCost =
      (estimate.setupTime / 3600) * this.rates.laborHourly.setup +
      (estimate.programmingTime / 3600) * this.rates.laborHourly.programming +
      (estimate.inspectionTime / 3600) * this.rates.laborHourly.inspection +
      (estimate.machineTime / 3600) * this.rates.laborHourly.operator * quantity * 0.5; // Assume 50% operator attention

    // Subtotal
    estimate.subtotal =
      estimate.machineCost +
      estimate.laborCost +
      estimate.materialCost +
      estimate.toolingCost;

    // Overhead and profit
    estimate.overhead = estimate.subtotal * (this.rates.overhead - 1);
    estimate.profit = (estimate.subtotal + estimate.overhead) * this.rates.profitMargin;

    // Total
    estimate.total = estimate.subtotal + estimate.overhead + estimate.profit;
    estimate.pricePerPart = estimate.total / quantity;

    return estimate;
  },
  _estimateOperationTime(operation) {
    // Rough time estimates in seconds
    const baseTimes = {
      face: 60,
      pocket: 180,
      contour: 120,
      drill: 30,
      tap: 45,
      od_rough: 120,
      od_finish: 90,
      face_turn: 60,
      groove: 45,
      thread: 90
    };
    return baseTimes[operation.type] || 60;
  },
  /**
   * Get tool cost estimate
   */
  getToolCost(toolType, diameter, material = 'carbide') {
    const sizeKey = diameter.toString();
    const costs = this.toolCosts[toolType];

    if (!costs) return 50; // Default

    if (typeof costs === 'object' && costs[sizeKey]) {
      return costs[sizeKey][material] || costs[sizeKey].carbide || 50;
    }
    return costs.default || 50;
  },
  /**
   * Generate quote document
   */
  generateQuote(jobParams) {
    const estimate = this.estimateJobCost(jobParams);

    return {
      quoteNumber: 'Q-' + Date.now().toString(36).toUpperCase(),
      date: new Date().toISOString().split('T')[0],
      validFor: '30 days',
      customer: jobParams.customer || 'Customer',
      partNumber: jobParams.partNumber || 'P/N TBD',
      description: jobParams.description || 'Machined Part',
      quantity: jobParams.quantity,
      estimate,
      terms: 'Net 30',
      notes: [
        'Quote valid for 30 days',
        'First article inspection included',
        'Material certification available upon request',
        'Expedite fees may apply for rush orders'
      ]
    };
  },
  init() {
    (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_COST_ESTIMATION] v1.0 initialized');
    return this;
  }
}