/**
 * PRISM_AI_AUTO_CAM
 * Extracted from PRISM v8.89.002 monolith
 * References: N/A
 * Lines: 553
 * Session: R2.1.1 Ralph Iteration 2
 */

const PRISM_AI_AUTO_CAM = (function() {
    'use strict';

    console.log('[PRISM_AI_AUTO_CAM] Loading v3.0...');

    // TOOL SELECTION SYSTEM

    const ToolSelector = {
        getOptimalTool: function(operation, material) {
            // Get available tools from database
            const availableTools = window.CuttingToolDatabase?.getAllTools() || [];
            
            // Filter by operation type
            let candidates = availableTools.filter(tool => {
                return this.isToolSuitableForOperation(tool, operation);
            });

            if (candidates.length === 0) {
                return this.getFallbackTool(operation);
            }
            // Score each tool
            candidates = candidates.map(tool => ({
                ...tool,
                score: this.scoreToolForOperation(tool, operation, material)
            }));

            // Sort by score
            candidates.sort((a, b) => b.score - a.score);

            return candidates[0];
        },
        isToolSuitableForOperation: function(tool, operation) {
            const suitabilityMap = {
                'face': ['face_mill', 'fly_cutter'],
                'rough': ['square_endmill', 'roughing_endmill', 'bull_endmill'],
                'semi_finish': ['square_endmill', 'bull_endmill', 'ball_endmill'],
                'finish': ['ball_endmill', 'bull_endmill', 'square_endmill'],
                'pocket_rough': ['square_endmill', 'roughing_endmill'],
                'drill': ['twist_drill', 'spot_drill'],
                'tap': ['tap'],
                'chamfer': ['chamfer_mill', 'countersink']
            };

            const suitableTypes = suitabilityMap[operation.type] || [];
            return suitableTypes.includes(tool.type);
        },
        scoreToolForOperation: function(tool, operation, material) {
            let score = 100;

            // Material compatibility
            if (tool.materials && tool.materials.includes(material)) {
                score += 50;
            }
            // Coating bonus for difficult materials
            if (tool.coating && ['stainless', 'titanium', 'inconel'].some(m => material.includes(m))) {
                score += 30;
            }
            // Size appropriateness (prefer tools that aren't too big/small)
            if (operation.geometry) {
                const { width, length, depth } = operation.geometry;
                const minFeature = Math.min(width || 100, length || 100);
                
                if (tool.diameter > minFeature * 0.8) score -= 40;
                if (tool.diameter < minFeature * 0.1) score -= 20;
            }
            // Flute count for material
            if (tool.flutes) {
                if (material.includes('aluminum') && tool.flutes <= 3) score += 20;
                if (material.includes('steel') && tool.flutes >= 4) score += 20;
            }
            return score;
        },
        getFallbackTool: function(operation) {
            // Return generic tools if database unavailable
            const fallbacks = {
                'face': {
                    toolNumber: 1,
                    type: 'face_mill',
                    diameter: 50,
                    flutes: 6,
                    name: '50mm Face Mill'
                },
                'rough': {
                    toolNumber: 2,
                    type: 'square_endmill',
                    diameter: 12,
                    flutes: 4,
                    name: '12mm Square End Mill'
                },
                'finish': {
                    toolNumber: 3,
                    type: 'ball_endmill',
                    diameter: 6,
                    flutes: 2,
                    name: '6mm Ball End Mill'
                },
                'drill': {
                    toolNumber: 10,
                    type: 'twist_drill',
                    diameter: 8,
                    name: '8mm Twist Drill'
                }
            };

            return fallbacks[operation.type] || fallbacks['rough'];
        }
    };
    // CUTTING PARAMETER CALCULATOR

    const CuttingParams = {
        calculate: function(tool, material, operation) {
            // Get base parameters from knowledge base
            const materialData = this.getMaterialData(material);
            const toolData = this.getToolData(tool);

            // Calculate SFM (Surface Feet per Minute)
            let sfm = materialData.baseSFM;
            
            // Adjust for tool material
            if (toolData.material === 'carbide') sfm *= 1.5;
            if (toolData.coating) sfm *= 1.3;

            // Adjust for operation
            const operationMultipliers = {
                'rough': 0.8,
                'semi_finish': 0.9,
                'finish': 1.1,
                'drill': 0.6
            };
            sfm *= (operationMultipliers[operation.type] || 1.0);

            // Calculate RPM
            const rpm = Math.round((sfm * 3.82) / tool.diameter);
            const clampedRPM = Math.min(Math.max(rpm, 100), 20000);

            // Calculate feed per tooth
            let fpt = materialData.baseFPT;
            if (tool.type === 'ball_endmill') fpt *= 0.7;
            if (operation.type === 'finish') fpt *= 0.5;

            // Calculate feed rate
            const flutes = tool.flutes || 4;
            const feedRate = Math.round(clampedRPM * flutes * fpt);

            // Depth of cut
            let doc = tool.diameter * 0.2;
            if (operation.type === 'rough') doc = tool.diameter * 0.5;
            if (operation.type === 'finish') doc = tool.diameter * 0.1;

            // Width of cut
            let woc = tool.diameter * 0.4;
            if (operation.type === 'rough') woc = tool.diameter * 0.6;
            if (operation.type === 'finish') woc = tool.diameter * 0.2;

            return {
                rpm: clampedRPM,
                feed: feedRate,
                doc: doc,
                woc: woc,
                sfm: Math.round(sfm),
                fpt: fpt.toFixed(4),
                calculated: true
            };
        },
        getMaterialData: function(material) {
            const materials = {
                'aluminum_wrought': { baseSFM: 1000, baseFPT: 0.005 },
                'aluminum_cast': { baseSFM: 800, baseFPT: 0.004 },
                'steel_mild': { baseSFM: 400, baseFPT: 0.003 },
                'steel_medium': { baseSFM: 300, baseFPT: 0.0025 },
                'steel_alloy': { baseSFM: 250, baseFPT: 0.002 },
                'stainless_304': { baseSFM: 200, baseFPT: 0.002 },
                'titanium_6al4v': { baseSFM: 150, baseFPT: 0.002 },
                'inconel_718': { baseSFM: 100, baseFPT: 0.0015 }
            };

            return materials[material] || materials['steel_mild'];
        },
        getToolData: function(tool) {
            return {
                material: tool.material || 'carbide',
                coating: tool.coating || false,
                geometry: tool.geometry || 'standard'
            };
        }
    };
    // STRATEGY GENERATOR

    const StrategyGenerator = {
        generateOperations: function(analysis, material) {
            const operations = [];
            let toolNumber = 1;

            // Always start with facing if needed
            if (this.shouldFace(analysis)) {
                operations.push(this.createFaceOperation(material, toolNumber++));
            }
            // Drilling operations first
            if (analysis.features?.basic) {
                const holes = analysis.features.basic.filter(f => f.type === 'hole');
                if (holes.length > 0) {
                    operations.push(...this.createDrillingOperations(holes, material, toolNumber));
                    toolNumber += holes.length;
                }
            }
            // Milling operations
            const complexity = analysis.features?.manufacturability?.complexity || 'moderate';
            
            if (complexity === 'high' || complexity === 'very_high') {
                // Multi-stage machining
                operations.push(this.createRoughOperation(analysis, material, toolNumber++));
                operations.push(this.createSemiFinishOperation(analysis, material, toolNumber++));
                operations.push(this.createFinishOperation(analysis, material, toolNumber++));
            } else if (complexity === 'moderate') {
                // Two-stage machining
                operations.push(this.createRoughOperation(analysis, material, toolNumber++));
                operations.push(this.createFinishOperation(analysis, material, toolNumber++));
            } else {
                // Single-stage machining
                operations.push(this.createFinishOperation(analysis, material, toolNumber++));
            }
            // Chamfering if needed
            if (this.shouldChamfer(analysis)) {
                operations.push(this.createChamferOperation(material, toolNumber++));
            }
            return operations;
        },
        shouldFace: function(analysis) {
            // Face if stock height > part height + 2mm
            return true; // Simplified - always face
        },
        shouldChamfer: function(analysis) {
            // Check for sharp edges or part requirements
            return analysis.partClass?.class === 'precision' || analysis.partClass?.class === 'highPrecision';
        },
        createFaceOperation: function(material, toolNumber) {
            const operation = {
                id: `face_${toolNumber}`,
                name: 'Face Mill',
                type: 'face',
                sequence: toolNumber,
                strategy: 'conventional',
                geometry: { width: 100, length: 100, depth: 2 }
            };
            
            operation.tool = ToolSelector.getOptimalTool(operation, material);
            operation.tool.toolNumber = toolNumber;
            operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

            return operation;
        },
        createRoughOperation: function(analysis, material, toolNumber) {
            const operation = {
                id: `rough_${toolNumber}`,
                name: 'Rough Mill',
                type: 'rough',
                sequence: toolNumber,
                strategy: 'adaptive_clearing',
                stockToLeave: 0.5,
                geometry: this.extractGeometry(analysis)
            };
            
            operation.tool = ToolSelector.getOptimalTool(operation, material);
            operation.tool.toolNumber = toolNumber;
            operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

            return operation;
        },
        createSemiFinishOperation: function(analysis, material, toolNumber) {
            const operation = {
                id: `semi_${toolNumber}`,
                name: 'Semi-Finish',
                type: 'semi_finish',
                sequence: toolNumber,
                strategy: 'rest_machining',
                stockToLeave: 0.1,
                geometry: this.extractGeometry(analysis)
            };
            
            operation.tool = ToolSelector.getOptimalTool(operation, material);
            operation.tool.toolNumber = toolNumber;
            operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

            return operation;
        },
        createFinishOperation: function(analysis, material, toolNumber) {
            const complexity = analysis.features?.manufacturability?.complexity || 'moderate';
            
            const operation = {
                id: `finish_${toolNumber}`,
                name: 'Finish Mill',
                type: 'finish',
                sequence: toolNumber,
                strategy: complexity === 'high' ? '5_axis_contour' : '3_axis_contour',
                springPasses: 2,
                geometry: this.extractGeometry(analysis)
            };
            
            operation.tool = ToolSelector.getOptimalTool(operation, material);
            operation.tool.toolNumber = toolNumber;
            operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

            return operation;
        },
        createDrillingOperations: function(holes, material, startToolNumber) {
            const operations = [];
            
            holes.forEach((hole, index) => {
                const operation = {
                    id: `drill_${startToolNumber + index}`,
                    name: `Drill Ø${hole.diameter}`,
                    type: 'drill',
                    sequence: startToolNumber + index,
                    holeCount: hole.count || 1,
                    geometry: { 
                        diameter: hole.diameter,
                        depth: hole.depth || 20
                    }
                };
                
                operation.tool = ToolSelector.getOptimalTool(operation, material);
                operation.tool.toolNumber = startToolNumber + index;
                operation.tool.diameter = hole.diameter; // Override for exact hole size
                operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

                operations.push(operation);
            });

            return operations;
        },
        createChamferOperation: function(material, toolNumber) {
            const operation = {
                id: `chamfer_${toolNumber}`,
                name: 'Chamfer Edges',
                type: 'chamfer',
                sequence: toolNumber,
                chamferSize: 0.5
            };
            
            operation.tool = ToolSelector.getOptimalTool(operation, material);
            operation.tool.toolNumber = toolNumber;
            operation.parameters = CuttingParams.calculate(operation.tool, material, operation);

            return operation;
        },
        extractGeometry: function(analysis) {
            const bbox = analysis.boundingBox || { x: 100, y: 100, z: 50 };
            return {
                width: bbox.x,
                length: bbox.y,
                depth: bbox.z
            };
        }
    };
    // TIME ESTIMATOR

    const TimeEstimator = {
        estimateOperationTime: function(operation) {
            if (!operation.parameters || !operation.tool) {
                return { minutes: 10, confidence: 'low' };
            }
            let time = 0;

            switch (operation.type) {
                case 'face':
                    time = this.estimateFaceTime(operation);
                    break;
                case 'rough':
                    time = this.estimateRoughTime(operation);
                    break;
                case 'semi_finish':
                    time = this.estimateSemiFinishTime(operation);
                    break;
                case 'finish':
                    time = this.estimateFinishTime(operation);
                    break;
                case 'drill':
                    time = this.estimateDrillTime(operation);
                    break;
                default:
                    time = 5; // Default
            }
            // Add tool change time
            time += 2; // 2 minutes for tool change

            return {
                minutes: Math.round(time),
                confidence: operation.parameters.calculated ? 'high' : 'medium'
            };
        },
        estimateFaceTime: function(operation) {
            const { width, length } = operation.geometry || { width: 100, length: 100 };
            const area = width * length;
            const woc = operation.parameters.woc || 35;
            const feed = operation.parameters.feed || 1000;

            const totalLength = (area / woc) * 1.2; // 20% overlap
            return totalLength / feed; // minutes
        },
        estimateRoughTime: function(operation) {
            const geometry = operation.geometry || { width: 100, length: 100, depth: 20 };
            const volume = geometry.width * geometry.length * geometry.depth;
            const mrr = this.calculateMRR(operation);

            return (volume / mrr) * 1.5; // 50% efficiency factor
        },
        estimateSemiFinishTime: function(operation) {
            return this.estimateRoughTime(operation) * 0.6;
        },
        estimateFinishTime: function(operation) {
            const geometry = operation.geometry || { width: 100, length: 100 };
            const area = geometry.width * geometry.length;
            const feed = operation.parameters.feed || 500;

            // Estimate total toolpath length
            const pathLength = area * 0.1; // Rough estimate
            return pathLength / feed * (operation.springPasses || 1);
        },
        estimateDrillTime: function(operation) {
            const holes = operation.holeCount || 1;
            const depth = operation.geometry?.depth || 20;
            const feed = operation.parameters.feed || 100;

            const timePerHole = (depth / feed) + 0.5; // +30s positioning
            return holes * timePerHole;
        },
        calculateMRR: function(operation) {
            if (!operation.parameters) return 1000;

            const { feed, doc, woc } = operation.parameters;
            return feed * doc * woc; // mm³/min
        }
    };
    // MAIN CAM GENERATION FUNCTION

    async function generateCAMProgram(analysisResult, material = 'steel_mild') {
        console.log('[PRISM_AI_AUTO_CAM] Generating CAM program...');
        
        const startTime = performance.now();

        // Generate operations
        const operations = StrategyGenerator.generateOperations(analysisResult, material);

        // Extract unique tools
        const toolMap = new Map();
        operations.forEach(op => {
            if (op.tool) {
                toolMap.set(op.tool.toolNumber, op.tool);
            }
        });
        const tools = Array.from(toolMap.values());

        // Estimate times
        let totalTime = 0;
        operations.forEach(op => {
            op.time = TimeEstimator.estimateOperationTime(op);
            totalTime += op.time.minutes;
        });

        // Create CAM program
        const camProgram = {
            id: `cam_${Date.now()}`,
            name: analysisResult.partName || 'AI Generated Program',
            timestamp: new Date().toISOString(),
            
            // Source data
            source: {
                format: analysisResult.sourceFormat,
                analysis: analysisResult.id
            },
            // Part information
            material: material,
            partClass: analysisResult.partClass,
            
            // Operations and tools
            operations: operations,
            tools: tools,
            
            // Metrics
            totalOperations: operations.length,
            totalTools: tools.length,
            estimatedTime: {
                total: totalTime,
                unit: 'minutes',
                breakdown: operations.map(op => ({
                    operation: op.name,
                    time: op.time.minutes
                }))
            },
            // Capabilities required
            capabilities: {
                axes: analysisResult.features?.manufacturability?.axesRequired || 3,
                spindle: Math.max(...operations.map(op => op.parameters?.rpm || 0)),
                toolChanger: tools.length > 1,
                coolant: true
            },
            // Generation info
            generatedBy: 'PRISM_AI_AUTO_CAM v3.0',
            generationTime: Math.round(performance.now() - startTime)
        };

        // Fire completion event
        window.dispatchEvent(new CustomEvent('prism:camGenerated', {
            detail: camProgram
        }));

        (typeof PRISM_CONSTANTS !== 'undefined' && PRISM_CONSTANTS.DEBUG) && console.log('[PRISM_AI_AUTO_CAM] CAM generation complete');
        console.log(`  Operations: ${operations.length}`);
        console.log(`  Tools: ${tools.length}`);
        console.log(`  Est. time: ${totalTime} minutes`);
        console.log(`  Complexity: ${analysisResult.features?.manufacturability?.complexity || 'unknown'}`);

        return camProgram;
    }
    // INITIALIZATION

    function init() {
        console.log('[PRISM_AI_AUTO_CAM] Initializing...');

        // Listen for industrial analysis completion
        window.addEventListener('prism:industrialAnalysisComplete', async (e) => {
            const analysis = e.detail;
            
            // Auto-generate CAM program
            const material = analysis.features?.material?.type || 'steel_mild';
            await generateCAMProgram(analysis, material);
        });

        console.log('[PRISM_AI_AUTO_CAM] Ready!');
        console.log('  Tool Selection: Advanced compatibility scoring');
        console.log('  Cutting Params: Material-optimized SFM/feed calculations');
        console.log('  Strategies: Adaptive clearing, rest machining, multi-axis');
        console.log('  Time Estimation: MRR-based with tool change overhead');
    }
    // PUBLIC API

    return {
        // Initialization
        init: init,

        // Main functions
        generateCAMProgram: generateCAMProgram,

        // Sub-systems
        ToolSelector: ToolSelector,
        CuttingParams: CuttingParams,
        StrategyGenerator: StrategyGenerator,
        TimeEstimator: TimeEstimator,

        // Utilities
        version: '3.0'
    };
})();