const PRISM_ACTIVITY_BASED_COSTING = {
        name: 'PRISM Activity Based Costing',
        version: '1.0.0',
        source: 'MIT 15.963 Management Accounting',
        
        // Activity pools storage
        activityPools: new Map(),
        costDrivers: new Map(),
        
        /**
         * Initialize ABC system for a machine shop
         */
        initialize: function() {
            this.activityPools.clear();
            this.costDrivers.clear();
            return this;
        },
        
        /**
         * Define an activity cost pool
         * @param {string} activityName - Name of the activity
         * @param {number} totalCost - Total cost for this activity pool
         * @param {string} costDriver - Cost driver (e.g., 'setups', 'machine_hours')
         * @param {number} totalDriverQuantity - Total quantity of the driver
         */
        defineActivity: function(activityName, totalCost, costDriver, totalDriverQuantity) {
            if (totalDriverQuantity <= 0) {
                throw new Error(`Invalid driver quantity for ${activityName}`);
            }
            
            const rate = totalCost / totalDriverQuantity;
            
            this.activityPools.set(activityName, {
                name: activityName,
                totalCost,
                costDriver,
                driverQuantity: totalDriverQuantity,
                rate: rate
            });
            
            this.costDrivers.set(activityName, costDriver);
            
            return this;
        },
        
        /**
         * Setup standard machine shop activities
         * @param {Object} shopData - Shop overhead data
         */
        setupMachineShop: function(shopData) {
            this.initialize();
            
            // Machine Setup Activity
            if (shopData.totalSetupCosts && shopData.totalSetups > 0) {
                this.defineActivity(
                    'Machine Setup',
                    shopData.totalSetupCosts,
                    'Number of Setups',
                    shopData.totalSetups
                );
            }
            
            // Machine Running Activity
            if (shopData.totalMachineRunningCosts && shopData.totalMachineHours > 0) {
                this.defineActivity(
                    'Machine Running',
                    shopData.totalMachineRunningCosts,
                    'Machine Hours',
                    shopData.totalMachineHours
                );
            }
            
            // Quality Inspection Activity
            if (shopData.totalInspectionCosts && shopData.totalInspectionHours > 0) {
                this.defineActivity(
                    'Quality Inspection',
                    shopData.totalInspectionCosts,
                    'Inspection Hours',
                    shopData.totalInspectionHours
                );
            }
            
            // Material Handling Activity
            if (shopData.totalHandlingCosts && shopData.totalMoves > 0) {
                this.defineActivity(
                    'Material Handling',
                    shopData.totalHandlingCosts,
                    'Number of Moves',
                    shopData.totalMoves
                );
            }
            
            // Engineering Support Activity
            if (shopData.totalEngineeringCosts && shopData.totalEngineeringHours > 0) {
                this.defineActivity(
                    'Engineering Support',
                    shopData.totalEngineeringCosts,
                    'Engineering Hours',
                    shopData.totalEngineeringHours
                );
            }
            
            // Tooling Activity
            if (shopData.totalToolingCosts && shopData.totalToolChanges > 0) {
                this.defineActivity(
                    'Tooling',
                    shopData.totalToolingCosts,
                    'Tool Changes',
                    shopData.totalToolChanges
                );
            }
            
            // Programming Activity
            if (shopData.totalProgrammingCosts && shopData.totalProgrammingHours > 0) {
                this.defineActivity(
                    'Programming',
                    shopData.totalProgrammingCosts,
                    'Programming Hours',
                    shopData.totalProgrammingHours
                );
            }
            
            console.log(`[ABC] Initialized ${this.activityPools.size} activity pools`);
            return this;
        },
        
        /**
         * Cost a product/job using ABC
         * @param {Object} product - Product with activityUsage map
         * @returns {Object} Detailed cost breakdown
         */
        costProduct: function(product) {
            const costs = {};
            let totalCost = 0;
            
            for (const [activity, pool] of this.activityPools) {
                const driverQuantity = product.activityUsage?.[activity] || 0;
                const activityCost = driverQuantity * pool.rate;
                
                costs[activity] = {
                    driver: pool.costDriver,
                    driverQuantity: driverQuantity,
                    rate: pool.rate,
                    cost: activityCost
                };
                
                totalCost += activityCost;
            }
            
            const quantity = product.quantity || 1;
            
            return {
                productId: product.id,
                activityCosts: costs,
                totalCost: totalCost,
                unitCost: totalCost / quantity,
                quantity: quantity
            };
        },
        
        /**
         * Cost a job (with operations)
         * @param {Object} job - Job specification
         */
        costJob: function(job) {
            // Extract activity usage from job operations
            const activityUsage = {
                'Machine Setup': job.numSetups || 1,
                'Machine Running': job.machineHours || 0,
                'Quality Inspection': job.inspectionHours || 0,
                'Material Handling': job.materialMoves || 1,
                'Engineering Support': job.engineeringHours || 0,
                'Tooling': job.toolChanges || 0,
                'Programming': job.programmingHours || 0
            };
            
            return this.costProduct({
                id: job.id,
                quantity: job.quantity || 1,
                activityUsage: activityUsage
            });
        },
        
        /**
         * Compare traditional vs ABC costing
         * @param {Array} jobs - Array of job specifications
         * @param {Object} traditionalRates - {laborRate, overheadRate}
         */
        compareTraditionalVsABC: function(jobs, traditionalRates) {
            const comparison = jobs.map(job => {
                // Traditional costing (simple labor-hour based overhead)
                const directLaborHours = (job.machineHours || 0) + (job.setupHours || 0);
                const traditionalOverhead = directLaborHours * (traditionalRates.overheadRate || 50);
                const traditionalDirectLabor = directLaborHours * (traditionalRates.laborRate || 35);
                const traditionalTotal = traditionalOverhead + traditionalDirectLabor + (job.materialCost || 0);
                const traditionalUnitCost = traditionalTotal / (job.quantity || 1);
                
                // ABC costing
                const abcResult = this.costJob(job);
                const abcTotal = abcResult.totalCost + (job.materialCost || 0);
                const abcUnitCost = abcTotal / (job.quantity || 1);
                
                // Calculate difference
                const difference = abcUnitCost - traditionalUnitCost;
                const percentDiff = (difference / traditionalUnitCost) * 100;
                
                return {
                    jobId: job.id,
                    quantity: job.quantity,
                    traditionalUnitCost,
                    abcUnitCost,
                    difference,
                    percentDiff: percentDiff.toFixed(2) + '%',
                    undercosted: difference > 0,  // Traditional undercosted this job
                    abcBreakdown: abcResult.activityCosts
                };
            });
            
            // Summary statistics
            const avgDiff = comparison.reduce((sum, c) => sum + Math.abs(c.difference), 0) / comparison.length;
            const undercostedCount = comparison.filter(c => c.undercosted).length;
            
            return {
                comparison,
                summary: {
                    totalJobs: comparison.length,
                    averageAbsoluteDifference: avgDiff.toFixed(2),
                    jobsUndercosted: undercostedCount,
                    jobsOvercosted: comparison.length - undercostedCount,
                    insight: undercostedCount > comparison.length / 2 ?
                        'Traditional costing tends to undercost complex jobs and overcost simple jobs' :
                        'Traditional costing allocation is relatively accurate for this job mix'
                }
            };
        },
        
        /**
         * Get activity rates
         */
        getActivityRates: function() {
            const rates = {};
            for (const [name, pool] of this.activityPools) {
                rates[name] = {
                    driver: pool.costDriver,
                    rate: pool.rate,
                    totalCost: pool.totalCost,
                    totalDriverQuantity: pool.driverQuantity
                };
            }
            return rates;
        },
        
        // Self-test
        selfTest: function() {
            console.log('[ABC] Running self-test...');
            
            // Setup test shop
            this.setupMachineShop({
                totalSetupCosts: 50000,
                totalSetups: 500,
                totalMachineRunningCosts: 200000,
                totalMachineHours: 4000,
                totalInspectionCosts: 30000,
                totalInspectionHours: 600,
                totalHandlingCosts: 20000,
                totalMoves: 2000,
                totalToolingCosts: 15000,
                totalToolChanges: 3000
            });
            
            // Test job costing
            const testJob = {
                id: 'TEST-001',
                quantity: 100,
                numSetups: 5,
                machineHours: 20,
                inspectionHours: 2,
                materialMoves: 10,
                toolChanges: 15
            };
            
            const result = this.costJob(testJob);
            
            const success = result.totalCost > 0 && 
                result.unitCost > 0 &&
                Object.keys(result.activityCosts).length > 0;
            
            console.log(`  ✓ ABC Job Costing: ${success ? 'PASS' : 'FAIL'} (total=$${result.totalCost.toFixed(2)}, unit=$${result.unitCost.toFixed(2)})`);
            
            return { passed: success ? 1 : 0, total: 1 };
        }
    }