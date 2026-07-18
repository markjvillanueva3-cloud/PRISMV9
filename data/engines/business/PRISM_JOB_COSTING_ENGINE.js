/**
 * PRISM_JOB_COSTING_ENGINE
 * Extracted from PRISM v8.89.002 monolith
 * Lines: 373
 * Session: R2.3.1 Engine Gap Extraction Round 3
 */

const PRISM_JOB_COSTING_ENGINE = {

    version: '1.0.0',

    // Default shop rates (configurable)
    defaultRates: {
        laborRate: 45.00,           // $/hour - direct labor
        overheadRate: 35.00,        // $/hour - shop overhead
        adminRate: 15.00,           // $/hour - administrative
        setupRate: 55.00,           // $/hour - setup labor (usually higher)
        programmingRate: 75.00,     // $/hour - CAM programming
        inspectionRate: 50.00,      // $/hour - quality inspection

        // Machine-specific rates ($/hour)
        machineRates: {
            'manual_mill': 35.00,
            'cnc_mill_3axis': 85.00,
            'cnc_mill_5axis': 150.00,
            'cnc_lathe': 75.00,
            'swiss_lathe': 125.00,
            'wire_edm': 95.00,
            'sinker_edm': 85.00,
            'surface_grinder': 65.00,
            'cylindrical_grinder': 75.00
        }
    },
    /**
     * Calculate complete job cost
     */
    calculateJobCost: function(jobSpec) {
        const costs = {
            material: this.calculateMaterialCost(jobSpec),
            setup: this.calculateSetupCost(jobSpec),
            machining: this.calculateMachiningCost(jobSpec),
            programming: this.calculateProgrammingCost(jobSpec),
            inspection: this.calculateInspectionCost(jobSpec),
            finishing: this.calculateFinishingCost(jobSpec),
            overhead: 0,
            admin: 0,
            total: 0,
            perPart: 0
        };
        // Calculate overhead and admin
        const directLaborHours = (costs.setup.hours + costs.machining.hours +
                                  costs.programming.hours + costs.inspection.hours);
        costs.overhead = {
            hours: directLaborHours,
            cost: directLaborHours * (jobSpec.rates?.overheadRate || this.defaultRates.overheadRate)
        };
        costs.admin = {
            hours: directLaborHours * 0.15, // 15% of direct labor
            cost: directLaborHours * 0.15 * (jobSpec.rates?.adminRate || this.defaultRates.adminRate)
        };
        // Total cost
        costs.total = costs.material.cost + costs.setup.cost + costs.machining.cost +
                      costs.programming.cost + costs.inspection.cost + costs.finishing.cost +
                      costs.overhead.cost + costs.admin.cost;

        // Per-part cost
        const quantity = jobSpec.quantity || 1;
        costs.perPart = costs.total / quantity;

        // Add detailed breakdown
        costs.breakdown = {
            materialPercent: (costs.material.cost / costs.total * 100).toFixed(1),
            laborPercent: ((costs.setup.cost + costs.machining.cost) / costs.total * 100).toFixed(1),
            overheadPercent: ((costs.overhead.cost + costs.admin.cost) / costs.total * 100).toFixed(1)
        };
        return costs;
    },
    /**
     * Calculate material cost
     */
    calculateMaterialCost: function(jobSpec) {
        const material = jobSpec.material || {};
        const quantity = jobSpec.quantity || 1;

        // Stock dimensions with kerf allowance
        const stockLength = (material.length || 100) + (material.kerfAllowance || 3);
        const stockWidth = (material.width || 100) + (material.kerfAllowance || 3);
        const stockHeight = (material.height || 25) + (material.kerfAllowance || 2);

        // Calculate volume and weight
        const volumeMm3 = stockLength * stockWidth * stockHeight;
        const volumeIn3 = volumeMm3 / 16387.064;
        const density = material.density || 7850; // kg/m³ default steel
        const weightKg = volumeMm3 * 1e-9 * density;
        const weightLb = weightKg * 2.20462;

        // Material cost
        const pricePerLb = material.pricePerLb || this._getDefaultMaterialPrice(material.type);
        const materialCost = weightLb * pricePerLb * quantity;

        // Add scrap factor (typically 10-20%)
        const scrapFactor = material.scrapFactor || 0.15;
        const totalMaterialCost = materialCost * (1 + scrapFactor);

        return {
            stockDimensions: { length: stockLength, width: stockWidth, height: stockHeight },
            volumeIn3: volumeIn3 * quantity,
            weightLb: weightLb * quantity,
            pricePerLb,
            baseCost: materialCost,
            scrapAllowance: materialCost * scrapFactor,
            cost: totalMaterialCost
        };
    },
    _getDefaultMaterialPrice: function(materialType) {
        const prices = {
            'aluminum_6061': 3.50,
            'aluminum_7075': 5.00,
            'steel_1018': 1.25,
            'steel_4140': 2.00,
            'steel_4340': 2.50,
            'stainless_304': 4.00,
            'stainless_316': 5.50,
            'stainless_17-4': 8.00,
            'titanium_gr5': 25.00,
            'inconel_718': 45.00,
            'brass_360': 4.50,
            'bronze_932': 6.00,
            'plastic_delrin': 8.00,
            'plastic_peek': 75.00
        };
        return prices[materialType?.toLowerCase()] || 2.50;
    },
    /**
     * Calculate setup cost
     */
    calculateSetupCost: function(jobSpec) {
        const operations = jobSpec.operations || [];
        const quantity = jobSpec.quantity || 1;

        let totalSetupMinutes = 0;
        const setupDetails = [];

        operations.forEach(op => {
            let setupTime = op.setupTime || this._estimateSetupTime(op);
            setupDetails.push({
                operation: op.name || op.type,
                setupMinutes: setupTime
            });
            totalSetupMinutes += setupTime;
        });

        // First article inspection adds setup time
        if (jobSpec.firstArticleRequired) {
            totalSetupMinutes += 30; // 30 minutes for FAI
        }
        const setupHours = totalSetupMinutes / 60;
        const setupRate = jobSpec.rates?.setupRate || this.defaultRates.setupRate;

        return {
            operations: setupDetails,
            totalMinutes: totalSetupMinutes,
            hours: setupHours,
            rate: setupRate,
            cost: setupHours * setupRate
        };
    },
    _estimateSetupTime: function(operation) {
        const setupTimes = {
            'roughing': 20,
            'finishing': 10,
            'drilling': 15,
            'tapping': 20,
            'boring': 25,
            'facing': 10,
            'turning': 15,
            'threading': 25,
            'grinding': 30,
            '5axis': 45,
            'inspection': 15
        };
        return setupTimes[operation.type?.toLowerCase()] || 20;
    },
    /**
     * Calculate machining cost
     */
    calculateMachiningCost: function(jobSpec) {
        const operations = jobSpec.operations || [];
        const quantity = jobSpec.quantity || 1;
        const machineType = jobSpec.machineType || 'cnc_mill_3axis';

        let totalCycleMinutes = 0;
        const operationDetails = [];

        operations.forEach(op => {
            const cycleTime = op.cycleTime || this._estimateCycleTime(op, jobSpec);
            operationDetails.push({
                operation: op.name || op.type,
                cycleMinutes: cycleTime,
                totalMinutes: cycleTime * quantity
            });
            totalCycleMinutes += cycleTime * quantity;
        });

        // Add tool change time (avg 15 sec per change)
        const toolChanges = jobSpec.toolChanges || operations.length;
        const toolChangeTime = (toolChanges * 0.25) * quantity; // minutes
        totalCycleMinutes += toolChangeTime;

        const machineHours = totalCycleMinutes / 60;
        const machineRate = jobSpec.rates?.machineRate ||
                           this.defaultRates.machineRates[machineType] || 85.00;

        return {
            operations: operationDetails,
            toolChangeMinutes: toolChangeTime,
            totalMinutes: totalCycleMinutes,
            hours: machineHours,
            machineType,
            rate: machineRate,
            cost: machineHours * machineRate
        };
    },
    _estimateCycleTime: function(operation, jobSpec) {
        // MRR-based cycle time estimation
        const material = jobSpec.material || {};
        const mrr = operation.mrr || 10; // cm³/min default
        const volumeToRemove = operation.volumeToRemove || 50; // cm³ default

        // Base machining time
        let cycleTime = volumeToRemove / mrr;

        // Add positioning and rapid moves (20% overhead)
        cycleTime *= 1.2;

        // Adjust for operation type
        const multipliers = {
            'finishing': 2.0,  // Finishing takes longer per volume
            'roughing': 1.0,
            'drilling': 0.5,
            'tapping': 1.5
        };
        cycleTime *= multipliers[operation.type?.toLowerCase()] || 1.0;

        return Math.max(cycleTime, 1); // Minimum 1 minute
    },
    /**
     * Calculate programming cost
     */
    calculateProgrammingCost: function(jobSpec) {
        const complexity = jobSpec.complexity || 'medium';
        const operations = jobSpec.operations?.length || 3;

        // Base programming time by complexity
        const baseHours = {
            'simple': 0.5,
            'medium': 1.5,
            'complex': 4.0,
            'very_complex': 8.0
        }[complexity] || 1.5;

        // Add time per operation
        const perOpHours = operations * 0.25;

        // 5-axis adds complexity
        const axisMultiplier = jobSpec.machineType?.includes('5axis') ? 1.5 : 1.0;

        const totalHours = (baseHours + perOpHours) * axisMultiplier;
        const rate = jobSpec.rates?.programmingRate || this.defaultRates.programmingRate;

        return {
            complexity,
            baseHours,
            operationHours: perOpHours,
            axisMultiplier,
            hours: totalHours,
            rate,
            cost: totalHours * rate
        };
    },
    /**
     * Calculate inspection cost
     */
    calculateInspectionCost: function(jobSpec) {
        const quantity = jobSpec.quantity || 1;
        const inspectionLevel = jobSpec.inspectionLevel || 'standard';
        const criticalDimensions = jobSpec.criticalDimensions || 5;

        // Time per part by inspection level
        const minutesPerPart = {
            'minimal': 2,
            'standard': 5,
            'detailed': 15,
            'full_cmm': 30
        }[inspectionLevel] || 5;

        // Add time for critical dimensions
        const dimTime = criticalDimensions * 0.5;

        // Sampling rate (not all parts inspected for large batches)
        let partsToInspect = quantity;
        if (quantity > 50) {
            partsToInspect = Math.ceil(quantity * 0.1) + 10; // 10% + 10
        } else if (quantity > 20) {
            partsToInspect = Math.ceil(quantity * 0.2) + 5; // 20% + 5
        }
        // First article always inspected
        const faiTime = jobSpec.firstArticleRequired ? 30 : 0;

        const totalMinutes = (partsToInspect * (minutesPerPart + dimTime)) + faiTime;
        const hours = totalMinutes / 60;
        const rate = jobSpec.rates?.inspectionRate || this.defaultRates.inspectionRate;

        return {
            inspectionLevel,
            partsInspected: partsToInspect,
            minutesPerPart: minutesPerPart + dimTime,
            firstArticleMinutes: faiTime,
            totalMinutes,
            hours,
            rate,
            cost: hours * rate
        };
    },
    /**
     * Calculate finishing/secondary operations cost
     */
    calculateFinishingCost: function(jobSpec) {
        const finishingOps = jobSpec.finishingOperations || [];
        const quantity = jobSpec.quantity || 1;

        let totalCost = 0;
        const details = [];

        finishingOps.forEach(op => {
            let cost = 0;
            switch (op.type?.toLowerCase()) {
                case 'anodize':
                    cost = quantity * (op.costPerPart || 8.00);
                    break;
                case 'anodize_hard':
                    cost = quantity * (op.costPerPart || 15.00);
                    break;
                case 'powder_coat':
                    cost = quantity * (op.costPerPart || 12.00);
                    break;
                case 'nickel_plate':
                    cost = quantity * (op.costPerPart || 10.00);
                    break;
                case 'chrome_plate':
                    cost = quantity * (op.costPerPart || 18.00);
                    break;
                case 'heat_treat':
                    cost = quantity * (op.costPerPart || 5.00);
                    break;
                case 'passivate':
                    cost = quantity * (op.costPerPart || 3.00);
                    break;
                case 'deburr':
                    cost = quantity * (op.costPerPart || 2.00);
                    break;
                case 'bead_blast':
                    cost = quantity * (op.costPerPart || 4.00);
                    break;
                case 'tumble':
                    cost = quantity * (op.costPerPart || 1.50);
                    break;
                default:
                    cost = quantity * (op.costPerPart || 5.00);
            }
            details.push({ type: op.type, costPerPart: cost / quantity, totalCost: cost });
            totalCost += cost;
        });

        return {
            operations: details,
            cost: totalCost
        };
    }
}