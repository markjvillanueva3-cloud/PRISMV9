/**
 * PRISM_PHASE7_KNOWLEDGE
 * Extracted from PRISM v8.89.002 monolith
 * References: 31
 * Category: knowledge
 * Lines: 2388
 * Session: R2.3.3 Algorithm Gap Extraction
 */

const PRISM_PHASE7_KNOWLEDGE = {
    version: '8.52.000',
    phase: 'Phase 7: Knowledge Systems & Manufacturing',
    buildDate: '2026-01-12',
    sources: [
        'MIT 6.871', 'MIT RES.16-002', 'MIT 2.008',
        'Stanford CS348A', 'Stanford CS468', 'CMU 15-381',
        'Princeton COS426', 'Georgia Tech ISyE', 'ISO 10303'
    ],

    // SECTION 7B: KNOWLEDGE MANAGEMENT SYSTEM
    // MIT 6.871 Knowledge-Based Systems + CMU AI

    KnowledgeSystem: {
        // Manufacturing Ontology - Hierarchical knowledge representation
        Ontology: class {
            constructor() {
                // Core manufacturing concepts hierarchy
                this.classes = new Map();
                this.properties = new Map();
                this.instances = new Map();
                this.relations = new Map();

                this._initializeManufacturingOntology();
            }
            _initializeManufacturingOntology() {
                // Top-level classes
                this.addClass('Thing', null);
                this.addClass('ManufacturingEntity', 'Thing');
                this.addClass('Process', 'ManufacturingEntity');
                this.addClass('Resource', 'ManufacturingEntity');
                this.addClass('Product', 'ManufacturingEntity');

                // Process hierarchy
                this.addClass('MachiningProcess', 'Process');
                this.addClass('Milling', 'MachiningProcess');
                this.addClass('Turning', 'MachiningProcess');
                this.addClass('Drilling', 'MachiningProcess');
                this.addClass('Grinding', 'MachiningProcess');
                this.addClass('EDM', 'MachiningProcess');

                // Milling subtypes
                this.addClass('FaceMilling', 'Milling');
                this.addClass('EndMilling', 'Milling');
                this.addClass('PocketMilling', 'Milling');
                this.addClass('ContourMilling', 'Milling');
                this.addClass('SlotMilling', 'Milling');
                this.addClass('HSMMilling', 'Milling');

                // Resource hierarchy
                this.addClass('Machine', 'Resource');
                this.addClass('Tool', 'Resource');
                this.addClass('Fixture', 'Resource');
                this.addClass('Material', 'Resource');

                // Machine types
                this.addClass('MillingMachine', 'Machine');
                this.addClass('Lathe', 'Machine');
                this.addClass('GrindingMachine', 'Machine');
                this.addClass('VMC', 'MillingMachine');
                this.addClass('HMC', 'MillingMachine');
                this.addClass('FiveAxisMill', 'MillingMachine');

                // Tool types
                this.addClass('CuttingTool', 'Tool');
                this.addClass('EndMill', 'CuttingTool');
                this.addClass('FaceMill', 'CuttingTool');
                this.addClass('DrillBit', 'CuttingTool');
                this.addClass('TurningInsert', 'CuttingTool');

                // Product hierarchy
                this.addClass('Feature', 'Product');
                this.addClass('Hole', 'Feature');
                this.addClass('Pocket', 'Feature');
                this.addClass('Slot', 'Feature');
                this.addClass('Boss', 'Feature');
                this.addClass('Fillet', 'Feature');
                this.addClass('Chamfer', 'Feature');

                // Properties
                this.addProperty('hasProcess', 'Feature', 'Process');
                this.addProperty('requiresTool', 'Process', 'Tool');
                this.addProperty('usesMachine', 'Process', 'Machine');
                this.addProperty('hasMaterial', 'Product', 'Material');
                this.addProperty('hasTolerance', 'Feature', 'number');
                this.addProperty('hasDepth', 'Feature', 'number');
                this.addProperty('hasDiameter', 'Hole', 'number');

                // Relations
                this.addRelation('canMachine', 'Machine', 'Material');
                this.addRelation('isCompatibleWith', 'Tool', 'Material');
                this.addRelation('produces', 'Process', 'Feature');
                this.addRelation('precedes', 'Process', 'Process');
            }
            addClass(name, parent) {
                this.classes.set(name, {
                    name,
                    parent,
                    children: [],
                    properties: []
                });
                if (parent && this.classes.has(parent)) {
                    this.classes.get(parent).children.push(name);
                }
            }
            addProperty(name, domain, range) {
                this.properties.set(name, { name, domain, range });
                if (this.classes.has(domain)) {
                    this.classes.get(domain).properties.push(name);
                }
            }
            addRelation(name, domain, range) {
                this.relations.set(name, { name, domain, range, instances: [] });
            }
            addInstance(name, className, properties = {}) {
                this.instances.set(name, {
                    name,
                    class: className,
                    properties
                });
            }
            // Query: get all subclasses
            getSubclasses(className, recursive = true) {
                const cls = this.classes.get(className);
                if (!cls) return [];

                let result = [...cls.children];
                if (recursive) {
                    for (const child of cls.children) {
                        result = result.concat(this.getSubclasses(child, true));
                    }
                }
                return result;
            }
            // Query: get all instances of class (including subclasses)
            getInstances(className) {
                const classes = [className, ...this.getSubclasses(className)];
                const result = [];
                for (const [name, instance] of this.instances) {
                    if (classes.includes(instance.class)) {
                        result.push(instance);
                    }
                }
                return result;
            }
            // Check if instance is of type
            isA(instanceName, className) {
                const instance = this.instances.get(instanceName);
                if (!instance) return false;

                let current = instance.class;
                while (current) {
                    if (current === className) return true;
                    const cls = this.classes.get(current);
                    current = cls?.parent;
                }
                return false;
            }
            // SPARQL-like query
            query(pattern) {
                const results = [];
                // Simplified pattern matching
                if (pattern.type === 'subclassOf') {
                    return this.getSubclasses(pattern.class);
                } else if (pattern.type === 'instanceOf') {
                    return this.getInstances(pattern.class);
                }
                return results;
            }
        },
        // Rule Engine - Forward and Backward Chaining
        RuleEngine: class {
            constructor() {
                this.rules = [];
                this.facts = new Set();
                this.agenda = [];
            }
            addRule(rule) {
                // Rule format: { name, conditions: [], actions: [], priority: 0 }
                this.rules.push({
                    ...rule,
                    priority: rule.priority || 0
                });
                // Sort by priority
                this.rules.sort((a, b) => b.priority - a.priority);
            }
            addFact(fact) {
                this.facts.add(fact);
            }
            removeFact(fact) {
                this.facts.delete(fact);
            }
            // Check if conditions match facts
            _matchConditions(conditions) {
                const bindings = {};

                for (const cond of conditions) {
                    let matched = false;

                    for (const fact of this.facts) {
                        const match = this._matchPattern(cond, fact, bindings);
                        if (match) {
                            matched = true;
                            Object.assign(bindings, match);
                            break;
                        }
                    }
                    if (!matched) return null;
                }
                return bindings;
            }
            _matchPattern(pattern, fact, existingBindings) {
                // Simple pattern matching with variables (?x)
                if (typeof pattern === 'string' && pattern.startsWith('?')) {
                    if (existingBindings[pattern]) {
                        return existingBindings[pattern] === fact ? {} : null;
                    }
                    return { [pattern]: fact };
                }
                if (typeof pattern === 'object' && typeof fact === 'object') {
                    const bindings = {};
                    for (const key in pattern) {
                        if (pattern[key].startsWith?.('?')) {
                            bindings[pattern[key]] = fact[key];
                        } else if (pattern[key] !== fact[key]) {
                            return null;
                        }
                    }
                    return bindings;
                }
                return pattern === fact ? {} : null;
            }
            // Forward chaining - data-driven
            forwardChain(maxIterations = 100) {
                const fired = [];
                let changed = true;
                let iterations = 0;

                while (changed && iterations < maxIterations) {
                    changed = false;
                    iterations++;

                    for (const rule of this.rules) {
                        const bindings = this._matchConditions(rule.conditions);

                        if (bindings) {
                            // Execute actions
                            for (const action of rule.actions) {
                                let newFact = action;

                                // Substitute variables
                                for (const [varName, value] of Object.entries(bindings)) {
                                    if (typeof newFact === 'string') {
                                        newFact = newFact.replace(varName, value);
                                    }
                                }
                                if (!this.facts.has(newFact)) {
                                    this.facts.add(newFact);
                                    fired.push({ rule: rule.name, fact: newFact });
                                    changed = true;
                                }
                            }
                        }
                    }
                }
                return { iterations, fired, facts: [...this.facts] };
            }
            // Backward chaining - goal-driven
            backwardChain(goal, depth = 0, maxDepth = 10) {
                if (depth > maxDepth) return { success: false, path: [] };

                // Check if goal is already a fact
                if (this.facts.has(goal)) {
                    return { success: true, path: [{ type: 'fact', goal }] };
                }
                // Find rules that can derive the goal
                for (const rule of this.rules) {
                    for (const action of rule.actions) {
                        if (this._canDerive(action, goal)) {
                            // Try to prove all conditions
                            const conditionResults = [];
                            let allSatisfied = true;

                            for (const cond of rule.conditions) {
                                const result = this.backwardChain(cond, depth + 1, maxDepth);
                                conditionResults.push(result);
                                if (!result.success) {
                                    allSatisfied = false;
                                    break;
                                }
                            }
                            if (allSatisfied) {
                                return {
                                    success: true,
                                    path: [{ type: 'rule', rule: rule.name, conditions: conditionResults }]
                                };
                            }
                        }
                    }
                }
                return { success: false, path: [] };
            }
            _canDerive(action, goal) {
                if (action === goal) return true;
                if (typeof action === 'string' && action.includes('?')) {
                    // Pattern with variables
                    const regex = new RegExp('^' + action.replace(/\?[a-z]+/g, '.*') + '$');
                    return regex.test(goal);
                }
                return false;
            }
        },
        // Case-Based Reasoning (CBR) System
        CaseBasedReasoning: class {
            constructor() {
                this.caseBase = [];
                this.similarityWeights = {
                    material: 0.25,
                    feature: 0.20,
                    tolerance: 0.20,
                    size: 0.15,
                    quantity: 0.10,
                    complexity: 0.10
                };
            }
            addCase(caseData) {
                this.caseBase.push({
                    ...caseData,
                    id: this.caseBase.length,
                    timestamp: Date.now()
                });
            }
            // Calculate similarity between two cases
            calculateSimilarity(case1, case2) {
                let similarity = 0;

                for (const [attr, weight] of Object.entries(this.similarityWeights)) {
                    if (case1[attr] !== undefined && case2[attr] !== undefined) {
                        const attrSim = this._attributeSimilarity(case1[attr], case2[attr], attr);
                        similarity += weight * attrSim;
                    }
                }
                return similarity;
            }
            _attributeSimilarity(val1, val2, attrType) {
                if (val1 === val2) return 1.0;

                if (typeof val1 === 'number' && typeof val2 === 'number') {
                    // Numerical: inverse of normalized difference
                    const maxDiff = Math.max(Math.abs(val1), Math.abs(val2)) || 1;
                    return 1 - Math.abs(val1 - val2) / maxDiff;
                }
                if (typeof val1 === 'string' && typeof val2 === 'string') {
                    // String: check for hierarchy relationship
                    if (attrType === 'material') {
                        return this._materialSimilarity(val1, val2);
                    }
                    if (attrType === 'feature') {
                        return this._featureSimilarity(val1, val2);
                    }
                    return 0;
                }
                return 0;
            }
            _materialSimilarity(mat1, mat2) {
                const materialGroups = {
                    steel: ['1045', '4140', '4340', 'A36', 'stainless'],
                    aluminum: ['6061', '7075', '2024', 'aluminum'],
                    titanium: ['Ti-6Al-4V', 'titanium'],
                    plastic: ['ABS', 'PEEK', 'nylon', 'delrin']
                };
                for (const [group, materials] of Object.entries(materialGroups)) {
                    const m1InGroup = materials.some(m => mat1.toLowerCase().includes(m.toLowerCase()));
                    const m2InGroup = materials.some(m => mat2.toLowerCase().includes(m.toLowerCase()));
                    if (m1InGroup && m2InGroup) return 0.8;
                }
                return 0;
            }
            _featureSimilarity(feat1, feat2) {
                const featureGroups = {
                    holes: ['hole', 'bore', 'drill', 'ream', 'tap'],
                    pockets: ['pocket', 'cavity', 'recess'],
                    slots: ['slot', 'groove', 'channel'],
                    surfaces: ['face', 'surface', 'plane']
                };
                for (const [group, features] of Object.entries(featureGroups)) {
                    const f1InGroup = features.some(f => feat1.toLowerCase().includes(f));
                    const f2InGroup = features.some(f => feat2.toLowerCase().includes(f));
                    if (f1InGroup && f2InGroup) return 0.7;
                }
                return 0;
            }
            // Retrieve similar cases
            retrieve(query, k = 5) {
                const similarities = this.caseBase.map(c => ({
                    case: c,
                    similarity: this.calculateSimilarity(query, c)
                }));

                similarities.sort((a, b) => b.similarity - a.similarity);
                return similarities.slice(0, k);
            }
            // Reuse: adapt solution from similar case
            reuse(query, retrievedCase) {
                const adaptedSolution = { ...retrievedCase.case.solution };

                // Adapt numerical values based on query
                if (query.size && retrievedCase.case.size) {
                    const sizeRatio = query.size / retrievedCase.case.size;
                    if (adaptedSolution.cycleTime) {
                        adaptedSolution.cycleTime *= sizeRatio;
                    }
                    if (adaptedSolution.cost) {
                        adaptedSolution.cost *= Math.pow(sizeRatio, 0.8);
                    }
                }
                // Adapt for tolerance requirements
                if (query.tolerance && retrievedCase.case.tolerance) {
                    if (query.tolerance < retrievedCase.case.tolerance) {
                        adaptedSolution.additionalOperations = ['finishing pass'];
                        adaptedSolution.cycleTime *= 1.3;
                    }
                }
                return {
                    originalSolution: retrievedCase.case.solution,
                    adaptedSolution,
                    confidence: retrievedCase.similarity
                };
            }
            // Full CBR cycle: Retrieve, Reuse, Revise, Retain
            solve(query) {
                // Retrieve
                const similarCases = this.retrieve(query, 3);

                if (similarCases.length === 0 || similarCases[0].similarity < 0.3) {
                    return { success: false, message: 'No sufficiently similar cases found' };
                }
                // Reuse
                const adapted = this.reuse(query, similarCases[0]);

                // Revise (would involve user feedback in practice)
                const revisedSolution = { ...adapted.adaptedSolution };

                return {
                    success: true,
                    solution: revisedSolution,
                    confidence: adapted.confidence,
                    basedOn: similarCases[0].case.id,
                    similarCases: similarCases.slice(0, 3).map(s => ({
                        id: s.case.id,
                        similarity: s.similarity.toFixed(3)
                    }))
                };
            }
            // Retain: add new case after verification
            retain(query, solution, verified = false) {
                if (verified) {
                    this.addCase({ ...query, solution, verified: true });
                }
            }
        },
        // Expert System Shell
        ExpertSystem: class {
            constructor(name, domain) {
                this.name = name;
                this.domain = domain;
                this.ontology = new PRISM_PHASE7_KNOWLEDGE.KnowledgeSystem.Ontology();
                this.ruleEngine = new PRISM_PHASE7_KNOWLEDGE.KnowledgeSystem.RuleEngine();
                this.cbr = new PRISM_PHASE7_KNOWLEDGE.KnowledgeSystem.CaseBasedReasoning();
                this.explanations = [];
            }
            // Load domain knowledge
            loadKnowledge(knowledgeBase) {
                // Load facts
                if (knowledgeBase.facts) {
                    for (const fact of knowledgeBase.facts) {
                        this.ruleEngine.addFact(fact);
                    }
                }
                // Load rules
                if (knowledgeBase.rules) {
                    for (const rule of knowledgeBase.rules) {
                        this.ruleEngine.addRule(rule);
                    }
                }
                // Load cases
                if (knowledgeBase.cases) {
                    for (const c of knowledgeBase.cases) {
                        this.cbr.addCase(c);
                    }
                }
            }
            // Consult the expert system
            consult(query) {
                this.explanations = [];

                // Try rule-based first
                const ruleResult = this.ruleEngine.backwardChain(query.goal);
                if (ruleResult.success) {
                    this.explanations.push({
                        method: 'rule-based',
                        reasoning: ruleResult.path
                    });
                    return {
                        answer: query.goal,
                        confidence: 1.0,
                        method: 'rule-based',
                        explanation: this.explain()
                    };
                }
                // Fall back to case-based reasoning
                const cbrResult = this.cbr.solve(query);
                if (cbrResult.success) {
                    this.explanations.push({
                        method: 'case-based',
                        similarCases: cbrResult.similarCases
                    });
                    return {
                        answer: cbrResult.solution,
                        confidence: cbrResult.confidence,
                        method: 'case-based',
                        explanation: this.explain()
                    };
                }
                return {
                    answer: null,
                    confidence: 0,
                    method: 'none',
                    explanation: 'No applicable knowledge found'
                };
            }
            // Generate explanation
            explain() {
                if (this.explanations.length === 0) {
                    return 'No reasoning performed';
                }
                const exp = this.explanations[this.explanations.length - 1];

                if (exp.method === 'rule-based') {
                    return `Derived using rules: ${JSON.stringify(exp.reasoning)}`;
                } else if (exp.method === 'case-based') {
                    return `Based on similar cases: ${exp.similarCases.map(c => `Case ${c.id} (${(c.similarity * 100).toFixed(0)}% similar)`).join(', ')}`;
                }
                return 'Unknown reasoning method';
            }
        },
        // Semantic Knowledge Base with embeddings
        SemanticKB: class {
            constructor(embeddingDim = 64) {
                this.embeddingDim = embeddingDim;
                this.entities = new Map();
                this.relations = new Map();
                this.triples = [];
            }
            // Add entity with embedding
            addEntity(name, type, embedding = null) {
                if (!embedding) {
                    embedding = Array(this.embeddingDim).fill(0).map(() => (Math.random() - 0.5) * 0.1);
                }
                this.entities.set(name, { name, type, embedding });
            }
            // Add relation
            addRelation(name, embedding = null) {
                if (!embedding) {
                    embedding = Array(this.embeddingDim).fill(0).map(() => (Math.random() - 0.5) * 0.1);
                }
                this.relations.set(name, { name, embedding });
            }
            // Add triple (head, relation, tail)
            addTriple(head, relation, tail) {
                this.triples.push({ head, relation, tail });
            }
            // TransE-style link prediction
            // h + r ≈ t
            predictTail(head, relation, k = 5) {
                const h = this.entities.get(head);
                const r = this.relations.get(relation);

                if (!h || !r) return [];

                // Expected tail embedding
                const expected = h.embedding.map((v, i) => v + r.embedding[i]);

                // Score all entities
                const scores = [];
                for (const [name, entity] of this.entities) {
                    if (name === head) continue;

                    const dist = Math.sqrt(
                        entity.embedding.reduce((sum, v, i) => sum + (v - expected[i]) ** 2, 0)
                    );
                    scores.push({ entity: name, score: 1 / (1 + dist) });
                }
                scores.sort((a, b) => b.score - a.score);
                return scores.slice(0, k);
            }
            // Query similar entities
            findSimilar(entityName, k = 5) {
                const target = this.entities.get(entityName);
                if (!target) return [];

                const scores = [];
                for (const [name, entity] of this.entities) {
                    if (name === entityName) continue;
                    if (entity.type !== target.type) continue;

                    const similarity = this._cosineSimilarity(target.embedding, entity.embedding);
                    scores.push({ entity: name, similarity });
                }
                scores.sort((a, b) => b.similarity - a.similarity);
                return scores.slice(0, k);
            }
            _cosineSimilarity(a, b) {
                let dot = 0, normA = 0, normB = 0;
                for (let i = 0; i < a.length; i++) {
                    dot += a[i] * b[i];
                    normA += a[i] * a[i];
                    normB += b[i] * b[i];
                }
                return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
            }
        }
    },
    // SECTION 7C: DESIGN FOR MANUFACTURABILITY (DFM)
    // MIT 2.008 Design & Manufacturing II + ASME Y14.5

    DFM: {
        // DFM Analysis Engine
        Analyzer: class {
            constructor() {
                this.rules = this._initDFMRules();
                this.costFactors = this._initCostFactors();
            }
            _initDFMRules() {
                return [
                    // Wall thickness rules
                    { id: 'WALL001', check: (f) => f.wallThickness >= 1.0,
                      message: 'Wall thickness below 1mm may cause distortion',
                      severity: 'warning', category: 'geometry' },
                    { id: 'WALL002', check: (f) => f.wallThickness >= 0.5,
                      message: 'Wall thickness below 0.5mm is not machinable',
                      severity: 'error', category: 'geometry' },

                    // Hole rules (ISO 286)
                    { id: 'HOLE001', check: (f) => !f.isHole || f.depth / f.diameter <= 10,
                      message: 'Hole depth-to-diameter ratio exceeds 10:1',
                      severity: 'warning', category: 'holes' },
                    { id: 'HOLE002', check: (f) => !f.isHole || f.diameter >= 1.0,
                      message: 'Hole diameter below 1mm requires special tooling',
                      severity: 'info', category: 'holes' },
                    { id: 'HOLE003', check: (f) => !f.isHole || !f.blind || f.bottomRadius >= f.diameter * 0.15,
                      message: 'Blind hole bottom should have radius >= 15% of diameter',
                      severity: 'warning', category: 'holes' },

                    // Corner rules
                    { id: 'CORNER001', check: (f) => !f.internalCorner || f.cornerRadius >= 3.0,
                      message: 'Internal corner radius below 3mm increases tool wear',
                      severity: 'warning', category: 'corners' },
                    { id: 'CORNER002', check: (f) => !f.internalCorner || f.cornerRadius >= f.depth * 0.1,
                      message: 'Corner radius should be >= 10% of pocket depth',
                      severity: 'info', category: 'corners' },

                    // Pocket rules
                    { id: 'POCKET001', check: (f) => !f.isPocket || f.depth / f.width <= 4,
                      message: 'Pocket depth-to-width ratio exceeds 4:1',
                      severity: 'warning', category: 'pockets' },
                    { id: 'POCKET002', check: (f) => !f.isPocket || f.draftAngle >= 0.5,
                      message: 'Consider adding draft angle for deep pockets',
                      severity: 'info', category: 'pockets' },

                    // Tolerance rules
                    { id: 'TOL001', check: (f) => f.tolerance >= 0.01,
                      message: 'Tolerance below 0.01mm requires grinding/lapping',
                      severity: 'warning', category: 'tolerances' },
                    { id: 'TOL002', check: (f) => f.tolerance >= 0.001,
                      message: 'Tolerance below 0.001mm is extremely difficult',
                      severity: 'error', category: 'tolerances' },

                    // Surface finish rules
                    { id: 'SURF001', check: (f) => f.surfaceFinish >= 0.8,
                      message: 'Surface finish below Ra 0.8 requires grinding',
                      severity: 'info', category: 'surface' },
                    { id: 'SURF002', check: (f) => f.surfaceFinish >= 0.2,
                      message: 'Surface finish below Ra 0.2 requires lapping/polishing',
                      severity: 'warning', category: 'surface' },

                    // Thread rules
                    { id: 'THREAD001', check: (f) => !f.isThread || f.threadDepth <= f.diameter * 1.5,
                      message: 'Thread engagement depth exceeds 1.5×diameter',
                      severity: 'info', category: 'threads' },
                    { id: 'THREAD002', check: (f) => !f.isThread || f.diameter >= 2.0,
                      message: 'Thread diameter below M2 is fragile',
                      severity: 'warning', category: 'threads' }
                ];
            }
            _initCostFactors() {
                return {
                    material: {
                        aluminum: 1.0,
                        steel: 1.2,
                        stainless: 1.8,
                        titanium: 5.0,
                        inconel: 8.0,
                        plastic: 0.5
                    },
                    tolerance: {
                        0.1: 1.0,
                        0.05: 1.3,
                        0.025: 1.8,
                        0.01: 2.5,
                        0.005: 4.0,
                        0.001: 10.0
                    },
                    surfaceFinish: {
                        3.2: 1.0,
                        1.6: 1.2,
                        0.8: 1.5,
                        0.4: 2.0,
                        0.2: 3.0,
                        0.1: 5.0
                    },
                    complexity: {
                        simple: 1.0,
                        moderate: 1.5,
                        complex: 2.5,
                        veryComplex: 4.0
                    }
                };
            }
            // Analyze part for DFM issues
            analyze(part) {
                const issues = [];
                const features = part.features || [part];

                for (const feature of features) {
                    for (const rule of this.rules) {
                        try {
                            if (!rule.check(feature)) {
                                issues.push({
                                    ruleId: rule.id,
                                    feature: feature.name || 'Part',
                                    message: rule.message,
                                    severity: rule.severity,
                                    category: rule.category
                                });
                            }
                        } catch (e) {
                            // Rule not applicable to this feature
                        }
                    }
                }
                // Calculate DFM score
                const errorCount = issues.filter(i => i.severity === 'error').length;
                const warningCount = issues.filter(i => i.severity === 'warning').length;
                const infoCount = issues.filter(i => i.severity === 'info').length;

                const score = Math.max(0, 100 - errorCount * 30 - warningCount * 10 - infoCount * 2);

                return {
                    score: score.toFixed(0),
                    grade: score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F',
                    issues,
                    summary: {
                        errors: errorCount,
                        warnings: warningCount,
                        info: infoCount,
                        total: issues.length
                    }
                };
            }
            // Estimate manufacturing cost
            estimateCost(part) {
                const baseTime = part.volume ? part.volume / 1000 : 10; // Base cycle time
                const baseRate = 75; // $/hr machine rate

                // Material factor
                const matFactor = this.costFactors.material[part.material] || 1.5;

                // Tolerance factor
                let tolFactor = 1.0;
                for (const [tol, factor] of Object.entries(this.costFactors.tolerance)) {
                    if (part.tolerance <= parseFloat(tol)) {
                        tolFactor = factor;
                    }
                }
                // Surface finish factor
                let surfFactor = 1.0;
                for (const [sf, factor] of Object.entries(this.costFactors.surfaceFinish)) {
                    if (part.surfaceFinish <= parseFloat(sf)) {
                        surfFactor = factor;
                    }
                }
                // Complexity factor
                const complexityFactor = this.costFactors.complexity[part.complexity] || 1.5;

                // Calculate cost
                const machiningCost = baseTime * baseRate / 60 * matFactor * complexityFactor;
                const finishingCost = machiningCost * (tolFactor - 1 + surfFactor - 1);
                const materialCost = (part.stockVolume || part.volume * 1.5) * (part.materialCostPerCC || 0.05);
                const setupCost = 50; // Fixed setup

                const totalCost = machiningCost + finishingCost + materialCost + setupCost;

                return {
                    machiningCost: machiningCost.toFixed(2),
                    finishingCost: finishingCost.toFixed(2),
                    materialCost: materialCost.toFixed(2),
                    setupCost: setupCost.toFixed(2),
                    totalCost: totalCost.toFixed(2),
                    breakdown: {
                        materialFactor: matFactor,
                        toleranceFactor: tolFactor,
                        surfaceFactor: surfFactor,
                        complexityFactor: complexityFactor
                    }
                };
            }
            // Generate recommendations
            getRecommendations(dfmResult) {
                const recommendations = [];

                for (const issue of dfmResult.issues) {
                    const rec = this._getRecommendation(issue);
                    if (rec) recommendations.push(rec);
                }
                // Add general recommendations
                if (dfmResult.score < 60) {
                    recommendations.push({
                        type: 'general',
                        priority: 'high',
                        message: 'Consider redesign to improve manufacturability'
                    });
                }
                return recommendations;
            }
            _getRecommendation(issue) {
                const recommendations = {
                    'WALL001': 'Increase wall thickness to 1.5mm or add ribs for support',
                    'HOLE001': 'Consider pecking cycle or gun drilling for deep holes',
                    'HOLE003': 'Specify drill point angle or counterbore at bottom',
                    'CORNER001': 'Increase corner radius or use EDM for sharp corners',
                    'POCKET001': 'Split into multiple operations or use longer tools',
                    'TOL001': 'Consider post-machining grinding operation',
                    'SURF001': 'Add finishing pass or grinding operation'
                };
                return recommendations[issue.ruleId] ? {
                    ruleId: issue.ruleId,
                    type: 'specific',
                    message: recommendations[issue.ruleId]
                } : null;
            }
        },
        // Tolerance Stack Analysis (RSS and worst-case)
        ToleranceAnalysis: class {
            constructor() {
                this.tolerances = [];
            }
            addTolerance(name, nominal, plusTol, minusTol = null) {
                this.tolerances.push({
                    name,
                    nominal,
                    plus: plusTol,
                    minus: minusTol || -plusTol
                });
            }
            clear() {
                this.tolerances = [];
            }
            // Worst-case stack (arithmetic)
            worstCase() {
                let nominalSum = 0;
                let maxPlus = 0;
                let maxMinus = 0;

                for (const t of this.tolerances) {
                    nominalSum += t.nominal;
                    maxPlus += Math.max(t.plus, 0);
                    maxMinus += Math.min(t.minus, 0);
                }
                return {
                    method: 'Worst Case',
                    nominal: nominalSum.toFixed(4),
                    max: (nominalSum + maxPlus).toFixed(4),
                    min: (nominalSum + maxMinus).toFixed(4),
                    totalTolerance: (maxPlus - maxMinus).toFixed(4)
                };
            }
            // RSS (Statistical) - assumes normal distribution
            RSS() {
                let nominalSum = 0;
                let varianceSum = 0;

                for (const t of this.tolerances) {
                    nominalSum += t.nominal;
                    // Assume tolerance = 3σ
                    const sigma = (t.plus - t.minus) / 6;
                    varianceSum += sigma * sigma;
                }
                const totalSigma = Math.sqrt(varianceSum);
                const tolerance3sigma = 3 * totalSigma;

                return {
                    method: 'RSS (Statistical)',
                    nominal: nominalSum.toFixed(4),
                    max: (nominalSum + tolerance3sigma).toFixed(4),
                    min: (nominalSum - tolerance3sigma).toFixed(4),
                    totalTolerance: (2 * tolerance3sigma).toFixed(4),
                    sigma: totalSigma.toFixed(4),
                    cpk: 'Assumes ±3σ (99.73%)'
                };
            }
            // Monte Carlo simulation
            monteCarlo(iterations = 10000) {
                const results = [];

                for (let i = 0; i < iterations; i++) {
                    let sum = 0;
                    for (const t of this.tolerances) {
                        // Sample from uniform distribution within tolerance
                        const sample = t.nominal + t.minus + Math.random() * (t.plus - t.minus);
                        sum += sample;
                    }
                    results.push(sum);
                }
                results.sort((a, b) => a - b);
                const mean = results.reduce((a, b) => a + b, 0) / iterations;
                const std = Math.sqrt(results.reduce((s, x) => s + (x - mean) ** 2, 0) / iterations);

                return {
                    method: 'Monte Carlo',
                    iterations,
                    mean: mean.toFixed(4),
                    std: std.toFixed(4),
                    min: results[0].toFixed(4),
                    max: results[iterations - 1].toFixed(4),
                    percentile_0_135: results[Math.floor(0.00135 * iterations)].toFixed(4),
                    percentile_99_865: results[Math.floor(0.99865 * iterations)].toFixed(4)
                };
            }
            // Full analysis
            analyze() {
                return {
                    tolerances: this.tolerances,
                    worstCase: this.worstCase(),
                    RSS: this.RSS(),
                    monteCarlo: this.monteCarlo()
                };
            }
        }
    },
    // SECTION 7D: CAD GENERATION ENGINE
    // MIT RES.16-002 + Stanford CS 348A Geometric Modeling

    CADEngine: {
        // 3D Vector operations
        Vec3: {
            create: (x = 0, y = 0, z = 0) => ({ x, y, z }),
            add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
            sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
            scale: (v, s) => ({ x: v.x * s, y: v.y * s, z: v.z * s }),
            dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
            cross: (a, b) => ({
                x: a.y * b.z - a.z * b.y,
                y: a.z * b.x - a.x * b.z,
                z: a.x * b.y - a.y * b.x
            }),
            length: (v) => Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z),
            normalize: (v) => {
                const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
                return len > 0 ? { x: v.x / len, y: v.y / len, z: v.z / len } : { x: 0, y: 0, z: 0 };
            },
            lerp: (a, b, t) => ({
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t,
                z: a.z + (b.z - a.z) * t
            })
        },
        // Parametric Primitives
        Primitives: {
            // Box
            createBox(width, height, depth, center = { x: 0, y: 0, z: 0 }) {
                const hw = width / 2, hh = height / 2, hd = depth / 2;
                const vertices = [
                    { x: center.x - hw, y: center.y - hh, z: center.z - hd },
                    { x: center.x + hw, y: center.y - hh, z: center.z - hd },
                    { x: center.x + hw, y: center.y + hh, z: center.z - hd },
                    { x: center.x - hw, y: center.y + hh, z: center.z - hd },
                    { x: center.x - hw, y: center.y - hh, z: center.z + hd },
                    { x: center.x + hw, y: center.y - hh, z: center.z + hd },
                    { x: center.x + hw, y: center.y + hh, z: center.z + hd },
                    { x: center.x - hw, y: center.y + hh, z: center.z + hd }
                ];
                const faces = [
                    [0, 1, 2, 3], [4, 7, 6, 5], // front, back
                    [0, 4, 5, 1], [2, 6, 7, 3], // bottom, top
                    [0, 3, 7, 4], [1, 5, 6, 2]  // left, right
                ];
                return { type: 'box', vertices, faces, volume: width * height * depth };
            },
            // Cylinder
            createCylinder(radius, height, segments = 32, center = { x: 0, y: 0, z: 0 }) {
                const vertices = [];
                const faces = [];

                // Generate vertices
                for (let i = 0; i < segments; i++) {
                    const angle = (2 * Math.PI * i) / segments;
                    const x = center.x + radius * Math.cos(angle);
                    const y = center.y + radius * Math.sin(angle);
                    vertices.push({ x, y, z: center.z });
                    vertices.push({ x, y, z: center.z + height });
                }
                // Center points
                const bottomCenter = vertices.length;
                vertices.push({ x: center.x, y: center.y, z: center.z });
                const topCenter = vertices.length;
                vertices.push({ x: center.x, y: center.y, z: center.z + height });

                // Generate faces
                for (let i = 0; i < segments; i++) {
                    const i0 = i * 2;
                    const i1 = ((i + 1) % segments) * 2;
                    faces.push([i0, i1, i1 + 1, i0 + 1]); // Side
                    faces.push([bottomCenter, i1, i0]); // Bottom
                    faces.push([topCenter, i0 + 1, i1 + 1]); // Top
                }
                return {
                    type: 'cylinder',
                    vertices,
                    faces,
                    volume: Math.PI * radius * radius * height
                };
            },
            // Sphere
            createSphere(radius, latSegments = 16, lonSegments = 32, center = { x: 0, y: 0, z: 0 }) {
                const vertices = [];
                const faces = [];

                for (let lat = 0; lat <= latSegments; lat++) {
                    const theta = (lat * Math.PI) / latSegments;
                    const sinTheta = Math.sin(theta);
                    const cosTheta = Math.cos(theta);

                    for (let lon = 0; lon <= lonSegments; lon++) {
                        const phi = (lon * 2 * Math.PI) / lonSegments;
                        vertices.push({
                            x: center.x + radius * sinTheta * Math.cos(phi),
                            y: center.y + radius * sinTheta * Math.sin(phi),
                            z: center.z + radius * cosTheta
                        });
                    }
                }
                for (let lat = 0; lat < latSegments; lat++) {
                    for (let lon = 0; lon < lonSegments; lon++) {
                        const i0 = lat * (lonSegments + 1) + lon;
                        const i1 = i0 + lonSegments + 1;
                        faces.push([i0, i1, i1 + 1, i0 + 1]);
                    }
                }
                return {
                    type: 'sphere',
                    vertices,
                    faces,
                    volume: (4 / 3) * Math.PI * radius * radius * radius
                };
            },
            // Cone
            createCone(radius, height, segments = 32, center = { x: 0, y: 0, z: 0 }) {
                const vertices = [];
                const faces = [];

                // Base vertices
                for (let i = 0; i < segments; i++) {
                    const angle = (2 * Math.PI * i) / segments;
                    vertices.push({
                        x: center.x + radius * Math.cos(angle),
                        y: center.y + radius * Math.sin(angle),
                        z: center.z
                    });
                }
                // Apex and base center
                const apex = vertices.length;
                vertices.push({ x: center.x, y: center.y, z: center.z + height });
                const baseCenter = vertices.length;
                vertices.push({ x: center.x, y: center.y, z: center.z });

                // Faces
                for (let i = 0; i < segments; i++) {
                    const next = (i + 1) % segments;
                    faces.push([i, next, apex]); // Side
                    faces.push([baseCenter, next, i]); // Base
                }
                return {
                    type: 'cone',
                    vertices,
                    faces,
                    volume: (1 / 3) * Math.PI * radius * radius * height
                };
            },
            // Torus
            createTorus(majorRadius, minorRadius, majorSegments = 32, minorSegments = 16, center = { x: 0, y: 0, z: 0 }) {
                const vertices = [];
                const faces = [];

                for (let i = 0; i < majorSegments; i++) {
                    const u = (2 * Math.PI * i) / majorSegments;
                    for (let j = 0; j < minorSegments; j++) {
                        const v = (2 * Math.PI * j) / minorSegments;
                        vertices.push({
                            x: center.x + (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u),
                            y: center.y + (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u),
                            z: center.z + minorRadius * Math.sin(v)
                        });
                    }
                }
                for (let i = 0; i < majorSegments; i++) {
                    for (let j = 0; j < minorSegments; j++) {
                        const i0 = i * minorSegments + j;
                        const i1 = ((i + 1) % majorSegments) * minorSegments + j;
                        const i2 = ((i + 1) % majorSegments) * minorSegments + (j + 1) % minorSegments;
                        const i3 = i * minorSegments + (j + 1) % minorSegments;
                        faces.push([i0, i1, i2, i3]);
                    }
                }
                return {
                    type: 'torus',
                    vertices,
                    faces,
                    volume: 2 * Math.PI * Math.PI * majorRadius * minorRadius * minorRadius
                };
            }
        },
        // NURBS Curves and Surfaces
        NURBS: {
            // B-spline basis function (Cox-de Boor recursion)
            basisFunction(i, p, u, knots) {
                if (p === 0) {
                    return (u >= knots[i] && u < knots[i + 1]) ? 1 : 0;
                }
                let result = 0;
                const denom1 = knots[i + p] - knots[i];
                const denom2 = knots[i + p + 1] - knots[i + 1];

                if (denom1 !== 0) {
                    result += ((u - knots[i]) / denom1) * this.basisFunction(i, p - 1, u, knots);
                }
                if (denom2 !== 0) {
                    result += ((knots[i + p + 1] - u) / denom2) * this.basisFunction(i + 1, p - 1, u, knots);
                }
                return result;
            },
            // Evaluate NURBS curve at parameter u
            evaluateCurve(controlPoints, weights, degree, knots, u) {
                const n = controlPoints.length;
                let numerator = { x: 0, y: 0, z: 0 };
                let denominator = 0;

                for (let i = 0; i < n; i++) {
                    const basis = this.basisFunction(i, degree, u, knots);
                    const w = weights[i] * basis;
                    numerator.x += controlPoints[i].x * w;
                    numerator.y += controlPoints[i].y * w;
                    numerator.z += controlPoints[i].z * w;
                    denominator += w;
                }
                if (denominator === 0) return { x: 0, y: 0, z: 0 };
                return {
                    x: numerator.x / denominator,
                    y: numerator.y / denominator,
                    z: numerator.z / denominator
                };
            },
            // Generate uniform knot vector
            uniformKnots(n, degree) {
                const knots = [];
                const m = n + degree + 1;
                for (let i = 0; i < m; i++) {
                    if (i <= degree) knots.push(0);
                    else if (i >= m - degree - 1) knots.push(1);
                    else knots.push((i - degree) / (m - 2 * degree - 1));
                }
                return knots;
            },
            // Evaluate NURBS surface at (u, v)
            evaluateSurface(controlNet, weightsNet, degreeU, degreeV, knotsU, knotsV, u, v) {
                const numU = controlNet.length;
                const numV = controlNet[0].length;
                let numerator = { x: 0, y: 0, z: 0 };
                let denominator = 0;

                for (let i = 0; i < numU; i++) {
                    const basisU = this.basisFunction(i, degreeU, u, knotsU);
                    for (let j = 0; j < numV; j++) {
                        const basisV = this.basisFunction(j, degreeV, v, knotsV);
                        const w = weightsNet[i][j] * basisU * basisV;
                        numerator.x += controlNet[i][j].x * w;
                        numerator.y += controlNet[i][j].y * w;
                        numerator.z += controlNet[i][j].z * w;
                        denominator += w;
                    }
                }
                if (denominator === 0) return { x: 0, y: 0, z: 0 };
                return {
                    x: numerator.x / denominator,
                    y: numerator.y / denominator,
                    z: numerator.z / denominator
                };
            },
            // Generate NURBS curve from control points
            createCurve(controlPoints, degree = 3, samples = 50) {
                const n = controlPoints.length;
                const weights = Array(n).fill(1);
                const knots = this.uniformKnots(n, degree);

                const curvePoints = [];
                for (let i = 0; i < samples; i++) {
                    const u = i / (samples - 1) * 0.999; // Avoid u=1 edge case
                    curvePoints.push(this.evaluateCurve(controlPoints, weights, degree, knots, u));
                }
                return { type: 'nurbs_curve', controlPoints, degree, knots, points: curvePoints };
            },
            // Generate NURBS surface from control net
            createSurface(controlNet, degreeU = 3, degreeV = 3, samplesU = 20, samplesV = 20) {
                const numU = controlNet.length;
                const numV = controlNet[0].length;
                const weightsNet = controlNet.map(row => Array(row.length).fill(1));
                const knotsU = this.uniformKnots(numU, degreeU);
                const knotsV = this.uniformKnots(numV, degreeV);

                const surfacePoints = [];
                for (let i = 0; i < samplesU; i++) {
                    const row = [];
                    const u = i / (samplesU - 1) * 0.999;
                    for (let j = 0; j < samplesV; j++) {
                        const v = j / (samplesV - 1) * 0.999;
                        row.push(this.evaluateSurface(controlNet, weightsNet, degreeU, degreeV, knotsU, knotsV, u, v));
                    }
                    surfacePoints.push(row);
                }
                return { type: 'nurbs_surface', controlNet, degreeU, degreeV, points: surfacePoints };
            }
        },
        // Boolean Operations (CSG)
        CSG: {
            // Ray-triangle intersection (Möller-Trumbore)
            rayTriangleIntersect(rayOrigin, rayDir, v0, v1, v2) {
                const Vec3 = PRISM_PHASE7_KNOWLEDGE.CADEngine.Vec3;
                const EPSILON = 1e-8;

                const edge1 = Vec3.sub(v1, v0);
                const edge2 = Vec3.sub(v2, v0);
                const h = Vec3.cross(rayDir, edge2);
                const a = Vec3.dot(edge1, h);

                if (Math.abs(a) < EPSILON) return null;

                const f = 1 / a;
                const s = Vec3.sub(rayOrigin, v0);
                const u = f * Vec3.dot(s, h);

                if (u < 0 || u > 1) return null;

                const q = Vec3.cross(s, edge1);
                const v = f * Vec3.dot(rayDir, q);

                if (v < 0 || u + v > 1) return null;

                const t = f * Vec3.dot(edge2, q);

                if (t > EPSILON) {
                    return {
                        t,
                        point: Vec3.add(rayOrigin, Vec3.scale(rayDir, t)),
                        u, v
                    };
                }
                return null;
            },
            // Point inside mesh test (ray casting)
            pointInside(point, mesh) {
                const Vec3 = PRISM_PHASE7_KNOWLEDGE.CADEngine.Vec3;
                const rayDir = { x: 1, y: 0, z: 0 };
                let intersections = 0;

                for (const face of mesh.faces) {
                    // Triangulate face if needed
                    for (let i = 1; i < face.length - 1; i++) {
                        const v0 = mesh.vertices[face[0]];
                        const v1 = mesh.vertices[face[i]];
                        const v2 = mesh.vertices[face[i + 1]];

                        const hit = this.rayTriangleIntersect(point, rayDir, v0, v1, v2);
                        if (hit) intersections++;
                    }
                }
                return intersections % 2 === 1;
            },
            // Union operation (simplified - combines vertices)
            union(meshA, meshB) {
                const vertices = [...meshA.vertices];
                const offset = vertices.length;

                for (const v of meshB.vertices) {
                    vertices.push({ ...v });
                }
                const faces = [...meshA.faces];
                for (const face of meshB.faces) {
                    faces.push(face.map(i => i + offset));
                }
                return {
                    type: 'union',
                    vertices,
                    faces,
                    volume: meshA.volume + meshB.volume
                };
            },
            // Difference operation (A - B)
            difference(meshA, meshB) {
                // Simplified: just mark the operation
                return {
                    type: 'difference',
                    operandA: meshA,
                    operandB: meshB,
                    volume: Math.max(0, meshA.volume - meshB.volume)
                };
            },
            // Intersection operation
            intersection(meshA, meshB) {
                return {
                    type: 'intersection',
                    operandA: meshA,
                    operandB: meshB,
                    volume: Math.min(meshA.volume, meshB.volume) * 0.5 // Estimate
                };
            }
        },
        // Feature-based Modeling
        Features: {
            // Create hole feature
            createHole(diameter, depth, position, direction = { x: 0, y: 0, z: -1 }) {
                const cyl = PRISM_PHASE7_KNOWLEDGE.CADEngine.Primitives.createCylinder(diameter / 2, depth, 24, position);
                return {
                    type: 'hole',
                    geometry: cyl,
                    parameters: { diameter, depth, position, direction },
                    operation: 'subtract'
                };
            },
            // Create pocket feature
            createPocket(width, length, depth, cornerRadius, position) {
                const Primitives = PRISM_PHASE7_KNOWLEDGE.CADEngine.Primitives;
                // Simplified: rectangular pocket
                const pocket = Primitives.createBox(width, length, depth, {
                    x: position.x,
                    y: position.y,
                    z: position.z - depth / 2
                });
                return {
                    type: 'pocket',
                    geometry: pocket,
                    parameters: { width, length, depth, cornerRadius, position },
                    operation: 'subtract'
                };
            },
            // Create boss feature
            createBoss(diameter, height, position) {
                const cyl = PRISM_PHASE7_KNOWLEDGE.CADEngine.Primitives.createCylinder(diameter / 2, height, 24, position);
                return {
                    type: 'boss',
                    geometry: cyl,
                    parameters: { diameter, height, position },
                    operation: 'add'
                };
            },
            // Create slot feature
            createSlot(width, length, depth, position, direction = { x: 1, y: 0, z: 0 }) {
                return {
                    type: 'slot',
                    parameters: { width, length, depth, position, direction },
                    operation: 'subtract'
                };
            },
            // Create chamfer
            createChamfer(edge, size, angle = 45) {
                return {
                    type: 'chamfer',
                    parameters: { edge, size, angle },
                    operation: 'modify'
                };
            },
            // Create fillet
            createFillet(edge, radius) {
                return {
                    type: 'fillet',
                    parameters: { edge, radius },
                    operation: 'modify'
                };
            }
        },
        // Parametric Model
        ParametricModel: class {
            constructor(name) {
                this.name = name;
                this.parameters = new Map();
                this.features = [];
                this.constraints = [];
                this.history = [];
            }
            addParameter(name, value, min = null, max = null) {
                this.parameters.set(name, { value, min, max });
            }
            setParameter(name, value) {
                const param = this.parameters.get(name);
                if (param) {
                    if (param.min !== null) value = Math.max(param.min, value);
                    if (param.max !== null) value = Math.min(param.max, value);
                    param.value = value;
                    this._rebuild();
                }
            }
            getParameter(name) {
                return this.parameters.get(name)?.value;
            }
            addFeature(feature) {
                this.features.push(feature);
                this.history.push({ type: 'add', feature: feature.type, timestamp: Date.now() });
            }
            addConstraint(constraint) {
                this.constraints.push(constraint);
            }
            _rebuild() {
                // Re-evaluate all features with current parameters
                for (const feature of this.features) {
                    if (feature.parametric) {
                        feature.parametric(this.parameters);
                    }
                }
            }
            evaluate() {
                let result = null;
                const CSG = PRISM_PHASE7_KNOWLEDGE.CADEngine.CSG;

                for (const feature of this.features) {
                    if (!feature.geometry) continue;

                    if (result === null) {
                        result = feature.geometry;
                    } else if (feature.operation === 'add') {
                        result = CSG.union(result, feature.geometry);
                    } else if (feature.operation === 'subtract') {
                        result = CSG.difference(result, feature.geometry);
                    }
                }
                return result;
            }
            export(format = 'json') {
                return {
                    name: this.name,
                    parameters: Object.fromEntries(this.parameters),
                    features: this.features.map(f => ({
                        type: f.type,
                        parameters: f.parameters,
                        operation: f.operation
                    })),
                    history: this.history
                };
            }
        }
    },
    // SECTION 7E: COMPUTER VISION SYSTEM
    // Stanford CS231N + MIT 6.869 Computer Vision

    ComputerVision: {
        // Image Processing Utilities
        ImageProcessing: {
            // Grayscale conversion
            toGrayscale(imageData) {
                const gray = new Float32Array(imageData.length / 4);
                for (let i = 0; i < gray.length; i++) {
                    const r = imageData[i * 4];
                    const g = imageData[i * 4 + 1];
                    const b = imageData[i * 4 + 2];
                    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
                }
                return gray;
            },
            // Gaussian blur
            gaussianBlur(image, width, height, sigma = 1.0) {
                const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
                const kernel = this._gaussianKernel(kernelSize, sigma);
                return this._convolve2D(image, width, height, kernel, kernelSize);
            },
            _gaussianKernel(size, sigma) {
                const kernel = new Float32Array(size * size);
                const center = Math.floor(size / 2);
                let sum = 0;

                for (let y = 0; y < size; y++) {
                    for (let x = 0; x < size; x++) {
                        const dx = x - center;
                        const dy = y - center;
                        const val = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
                        kernel[y * size + x] = val;
                        sum += val;
                    }
                }
                // Normalize
                for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
                return kernel;
            },
            _convolve2D(image, width, height, kernel, kernelSize) {
                const result = new Float32Array(width * height);
                const half = Math.floor(kernelSize / 2);

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        let sum = 0;
                        for (let ky = 0; ky < kernelSize; ky++) {
                            for (let kx = 0; kx < kernelSize; kx++) {
                                const px = Math.min(Math.max(x + kx - half, 0), width - 1);
                                const py = Math.min(Math.max(y + ky - half, 0), height - 1);
                                sum += image[py * width + px] * kernel[ky * kernelSize + kx];
                            }
                        }
                        result[y * width + x] = sum;
                    }
                }
                return result;
            },
            // Sobel edge detection
            sobelEdges(image, width, height) {
                const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
                const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

                const gx = this._convolve2D(image, width, height, new Float32Array(sobelX), 3);
                const gy = this._convolve2D(image, width, height, new Float32Array(sobelY), 3);

                const magnitude = new Float32Array(width * height);
                const direction = new Float32Array(width * height);

                for (let i = 0; i < magnitude.length; i++) {
                    magnitude[i] = Math.sqrt(gx[i] * gx[i] + gy[i] * gy[i]);
                    direction[i] = Math.atan2(gy[i], gx[i]);
                }
                return { magnitude, direction };
            },
            // Canny edge detection
            cannyEdges(image, width, height, lowThreshold = 50, highThreshold = 150) {
                // 1. Gaussian blur
                const blurred = this.gaussianBlur(image, width, height, 1.4);

                // 2. Sobel gradients
                const { magnitude, direction } = this.sobelEdges(blurred, width, height);

                // 3. Non-maximum suppression
                const suppressed = new Float32Array(width * height);
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const i = y * width + x;
                        const angle = direction[i] * 180 / Math.PI;

                        let n1, n2;
                        if ((angle >= -22.5 && angle < 22.5) || angle >= 157.5 || angle < -157.5) {
                            n1 = magnitude[i - 1];
                            n2 = magnitude[i + 1];
                        } else if ((angle >= 22.5 && angle < 67.5) || (angle >= -157.5 && angle < -112.5)) {
                            n1 = magnitude[(y - 1) * width + x + 1];
                            n2 = magnitude[(y + 1) * width + x - 1];
                        } else if ((angle >= 67.5 && angle < 112.5) || (angle >= -112.5 && angle < -67.5)) {
                            n1 = magnitude[(y - 1) * width + x];
                            n2 = magnitude[(y + 1) * width + x];
                        } else {
                            n1 = magnitude[(y - 1) * width + x - 1];
                            n2 = magnitude[(y + 1) * width + x + 1];
                        }
                        suppressed[i] = (magnitude[i] >= n1 && magnitude[i] >= n2) ? magnitude[i] : 0;
                    }
                }
                // 4. Double threshold and hysteresis
                const edges = new Float32Array(width * height);
                for (let i = 0; i < suppressed.length; i++) {
                    if (suppressed[i] >= highThreshold) edges[i] = 255;
                    else if (suppressed[i] >= lowThreshold) edges[i] = 128;
                    else edges[i] = 0;
                }
                return edges;
            },
            // Histogram equalization
            histogramEqualize(image) {
                const histogram = new Array(256).fill(0);
                for (const val of image) {
                    histogram[Math.min(255, Math.max(0, Math.round(val)))]++;
                }
                // CDF
                const cdf = new Array(256);
                cdf[0] = histogram[0];
                for (let i = 1; i < 256; i++) {
                    cdf[i] = cdf[i - 1] + histogram[i];
                }
                // Normalize
                const cdfMin = cdf.find(v => v > 0);
                const scale = 255 / (image.length - cdfMin);

                const result = new Float32Array(image.length);
                for (let i = 0; i < image.length; i++) {
                    const val = Math.round(image[i]);
                    result[i] = Math.round((cdf[Math.min(255, Math.max(0, val))] - cdfMin) * scale);
                }
                return result;
            }
        },
        // Part Recognition
        PartRecognition: class {
            constructor() {
                this.templates = [];
                this.featureExtractor = null;
            }
            addTemplate(name, features, metadata = {}) {
                this.templates.push({ name, features, metadata });
            }
            // Extract features from image region
            extractFeatures(image, width, height) {
                const IP = PRISM_PHASE7_KNOWLEDGE.ComputerVision.ImageProcessing;

                // Edge histogram
                const edges = IP.cannyEdges(image, width, height);
                const edgeHistogram = new Array(8).fill(0);
                const { direction } = IP.sobelEdges(image, width, height);

                for (let i = 0; i < edges.length; i++) {
                    if (edges[i] > 0) {
                        const bin = Math.floor(((direction[i] + Math.PI) / (2 * Math.PI)) * 8) % 8;
                        edgeHistogram[bin]++;
                    }
                }
                // Normalize
                const total = edgeHistogram.reduce((a, b) => a + b, 0) || 1;
                const normalizedHist = edgeHistogram.map(v => v / total);

                // Shape descriptors
                const moments = this._computeMoments(image, width, height);

                return {
                    edgeHistogram: normalizedHist,
                    moments,
                    aspectRatio: width / height
                };
            }
            _computeMoments(image, width, height) {
                let m00 = 0, m10 = 0, m01 = 0, m20 = 0, m02 = 0, m11 = 0;

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const val = image[y * width + x];
                        m00 += val;
                        m10 += x * val;
                        m01 += y * val;
                        m20 += x * x * val;
                        m02 += y * y * val;
                        m11 += x * y * val;
                    }
                }
                const cx = m10 / m00;
                const cy = m01 / m00;

                // Central moments
                const mu20 = m20 / m00 - cx * cx;
                const mu02 = m02 / m00 - cy * cy;
                const mu11 = m11 / m00 - cx * cy;

                // Hu moments (first two)
                const hu1 = mu20 + mu02;
                const hu2 = (mu20 - mu02) ** 2 + 4 * mu11 * mu11;

                return { m00, cx, cy, hu1, hu2 };
            }
            // Match features against templates
            match(features) {
                const matches = [];

                for (const template of this.templates) {
                    const score = this._compareFeatures(features, template.features);
                    matches.push({ name: template.name, score, metadata: template.metadata });
                }
                matches.sort((a, b) => b.score - a.score);
                return matches;
            }
            _compareFeatures(f1, f2) {
                // Histogram intersection
                let histScore = 0;
                for (let i = 0; i < 8; i++) {
                    histScore += Math.min(f1.edgeHistogram[i], f2.edgeHistogram[i]);
                }
                // Moment similarity
                const momentScore = 1 / (1 + Math.abs(f1.moments.hu1 - f2.moments.hu1) +
                                            Math.abs(f1.moments.hu2 - f2.moments.hu2));

                // Aspect ratio similarity
                const arScore = 1 - Math.abs(f1.aspectRatio - f2.aspectRatio) /
                                    Math.max(f1.aspectRatio, f2.aspectRatio);

                return 0.4 * histScore + 0.4 * momentScore + 0.2 * arScore;
            }
        },
        // Defect Detection
        DefectDetector: class {
            constructor() {
                this.referenceImage = null;
                this.threshold = 30;
                this.minDefectArea = 10;
            }
            setReference(image, width, height) {
                this.referenceImage = { data: image, width, height };
            }
            detect(image, width, height) {
                if (!this.referenceImage) {
                    return { error: 'No reference image set' };
                }
                const IP = PRISM_PHASE7_KNOWLEDGE.ComputerVision.ImageProcessing;

                // Compute difference
                const diff = new Float32Array(width * height);
                for (let i = 0; i < diff.length; i++) {
                    diff[i] = Math.abs(image[i] - this.referenceImage.data[i]);
                }
                // Threshold
                const binary = diff.map(v => v > this.threshold ? 255 : 0);

                // Find connected components (defect regions)
                const defects = this._findConnectedComponents(binary, width, height);

                // Filter by area
                const significantDefects = defects.filter(d => d.area >= this.minDefectArea);

                return {
                    defectCount: significantDefects.length,
                    defects: significantDefects,
                    totalDefectArea: significantDefects.reduce((sum, d) => sum + d.area, 0),
                    classification: this._classifyDefects(significantDefects)
                };
            }
            _findConnectedComponents(binary, width, height) {
                const visited = new Set();
                const components = [];

                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        const idx = y * width + x;
                        if (binary[idx] > 0 && !visited.has(idx)) {
                            const component = this._floodFill(binary, width, height, x, y, visited);
                            components.push(component);
                        }
                    }
                }
                return components;
            }
            _floodFill(binary, width, height, startX, startY, visited) {
                const stack = [{ x: startX, y: startY }];
                const pixels = [];
                let minX = startX, maxX = startX, minY = startY, maxY = startY;

                while (stack.length > 0) {
                    const { x, y } = stack.pop();
                    const idx = y * width + x;

                    if (x < 0 || x >= width || y < 0 || y >= height) continue;
                    if (visited.has(idx) || binary[idx] === 0) continue;

                    visited.add(idx);
                    pixels.push({ x, y });
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);

                    stack.push({ x: x + 1, y });
                    stack.push({ x: x - 1, y });
                    stack.push({ x, y: y + 1 });
                    stack.push({ x, y: y - 1 });
                }
                return {
                    area: pixels.length,
                    boundingBox: { minX, maxX, minY, maxY },
                    centroid: {
                        x: pixels.reduce((s, p) => s + p.x, 0) / pixels.length,
                        y: pixels.reduce((s, p) => s + p.y, 0) / pixels.length
                    },
                    aspectRatio: (maxX - minX + 1) / (maxY - minY + 1)
                };
            }
            _classifyDefects(defects) {
                return defects.map(d => {
                    let type = 'unknown';
                    if (d.aspectRatio > 3 || d.aspectRatio < 0.33) {
                        type = 'scratch';
                    } else if (d.area < 50) {
                        type = 'pit';
                    } else if (d.area < 200) {
                        type = 'inclusion';
                    } else {
                        type = 'major_defect';
                    }
                    return { ...d, type };
                });
            }
        },
        // Dimensional Measurement
        DimensionalMeasurement: class {
            constructor(pixelSize = 0.01) {  // mm per pixel
                this.pixelSize = pixelSize;
            }
            setCalibration(pixelsPerMM) {
                this.pixelSize = 1 / pixelsPerMM;
            }
            // Measure distance between two points
            measureDistance(p1, p2) {
                const dx = (p2.x - p1.x) * this.pixelSize;
                const dy = (p2.y - p1.y) * this.pixelSize;
                return {
                    pixels: Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2),
                    mm: Math.sqrt(dx * dx + dy * dy)
                };
            }
            // Measure from edge detection
            measureWidth(edges, width, height, y) {
                let leftEdge = -1, rightEdge = -1;

                for (let x = 0; x < width; x++) {
                    if (edges[y * width + x] > 0) {
                        if (leftEdge < 0) leftEdge = x;
                        rightEdge = x;
                    }
                }
                if (leftEdge >= 0 && rightEdge >= 0) {
                    return {
                        pixels: rightEdge - leftEdge,
                        mm: (rightEdge - leftEdge) * this.pixelSize,
                        leftEdge,
                        rightEdge
                    };
                }
                return null;
            }
            // Measure circle (diameter)
            measureCircle(edges, width, height) {
                // Simple Hough circle detection
                const points = [];
                for (let y = 0; y < height; y++) {
                    for (let x = 0; x < width; x++) {
                        if (edges[y * width + x] > 0) {
                            points.push({ x, y });
                        }
                    }
                }
                if (points.length < 10) return null;

                // Fit circle using least squares (simplified)
                const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
                const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
                const r = points.reduce((s, p) => s + Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2), 0) / points.length;

                return {
                    center: { x: cx, y: cy },
                    radiusPixels: r,
                    radiusMM: r * this.pixelSize,
                    diameterMM: r * 2 * this.pixelSize
                };
            }
        }
    },
    // SECTION 7F: FACTORY OPTIMIZATION
    // Georgia Tech ISyE + MIT 15.760 Operations Management

    FactoryOptimization: {
        // OEE (Overall Equipment Effectiveness) Calculator
        OEE: class {
            constructor() {
                this.shifts = [];
            }
            addShift(data) {
                // data: { plannedTime, actualRunTime, idealCycleTime, totalParts, goodParts }
                this.shifts.push({
                    ...data,
                    timestamp: Date.now()
                });
            }
            calculate(shiftData = null) {
                const data = shiftData || this.shifts[this.shifts.length - 1];
                if (!data) return { error: 'No data available' };

                // Availability = Actual Run Time / Planned Time
                const availability = data.actualRunTime / data.plannedTime;

                // Performance = (Total Parts × Ideal Cycle Time) / Actual Run Time
                const performance = (data.totalParts * data.idealCycleTime) / data.actualRunTime;

                // Quality = Good Parts / Total Parts
                const quality = data.goodParts / data.totalParts;

                // OEE = Availability × Performance × Quality
                const oee = availability * performance * quality;

                return {
                    availability: (availability * 100).toFixed(1) + '%',
                    performance: (performance * 100).toFixed(1) + '%',
                    quality: (quality * 100).toFixed(1) + '%',
                    oee: (oee * 100).toFixed(1) + '%',
                    worldClass: oee >= 0.85,
                    losses: {
                        availabilityLoss: ((1 - availability) * data.plannedTime).toFixed(0) + ' min',
                        performanceLoss: ((1 - performance) * data.actualRunTime).toFixed(0) + ' min',
                        qualityLoss: (data.totalParts - data.goodParts) + ' parts'
                    }
                };
            }
            trend(numShifts = 10) {
                const recent = this.shifts.slice(-numShifts);
                return recent.map(s => this.calculate(s));
            }
        },
        // Job Shop Scheduler (with genetic algorithm optimization)
        JobShopScheduler: class {
            constructor() {
                this.jobs = [];
                this.machines = [];
                this.schedule = null;
            }
            addJob(job) {
                // job: { id, operations: [{ machine, duration }], dueDate, priority }
                this.jobs.push(job);
            }
            addMachine(machine) {
                // machine: { id, name, capabilities, efficiency }
                this.machines.push({ ...machine, schedule: [] });
            }
            // Priority dispatching rules
            scheduleEDD() {
                // Earliest Due Date
                const sorted = [...this.jobs].sort((a, b) => a.dueDate - b.dueDate);
                return this._assignJobs(sorted);
            }
            scheduleSPT() {
                // Shortest Processing Time
                const sorted = [...this.jobs].sort((a, b) => {
                    const timeA = a.operations.reduce((s, o) => s + o.duration, 0);
                    const timeB = b.operations.reduce((s, o) => s + o.duration, 0);
                    return timeA - timeB;
                });
                return this._assignJobs(sorted);
            }
            scheduleCR() {
                // Critical Ratio
                const now = Date.now();
                const sorted = [...this.jobs].sort((a, b) => {
                    const remainingA = a.operations.reduce((s, o) => s + o.duration, 0);
                    const remainingB = b.operations.reduce((s, o) => s + o.duration, 0);
                    const crA = (a.dueDate - now) / remainingA;
                    const crB = (b.dueDate - now) / remainingB;
                    return crA - crB;
                });
                return this._assignJobs(sorted);
            }
            _assignJobs(sortedJobs) {
                const machineEndTimes = {};
                for (const m of this.machines) {
                    machineEndTimes[m.id] = 0;
                }
                const schedule = [];

                for (const job of sortedJobs) {
                    let jobStart = 0;
                    const operations = [];

                    for (const op of job.operations) {
                        const machineId = op.machine;
                        const start = Math.max(jobStart, machineEndTimes[machineId] || 0);
                        const end = start + op.duration;

                        operations.push({
                            machine: machineId,
                            start,
                            end,
                            duration: op.duration
                        });

                        machineEndTimes[machineId] = end;
                        jobStart = end;
                    }
                    schedule.push({
                        jobId: job.id,
                        operations,
                        completionTime: operations[operations.length - 1].end,
                        tardiness: Math.max(0, operations[operations.length - 1].end - job.dueDate)
                    });
                }
                return this._evaluateSchedule(schedule);
            }
            _evaluateSchedule(schedule) {
                const makespan = Math.max(...schedule.map(s => s.completionTime));
                const totalTardiness = schedule.reduce((s, j) => s + j.tardiness, 0);
                const numTardy = schedule.filter(j => j.tardiness > 0).length;
                const avgFlowTime = schedule.reduce((s, j) => s + j.completionTime, 0) / schedule.length;

                return {
                    schedule,
                    metrics: {
                        makespan,
                        totalTardiness,
                        numTardy,
                        avgFlowTime,
                        utilization: this._calculateUtilization(schedule, makespan)
                    }
                };
            }
            _calculateUtilization(schedule, makespan) {
                const machineUsage = {};
                for (const job of schedule) {
                    for (const op of job.operations) {
                        machineUsage[op.machine] = (machineUsage[op.machine] || 0) + op.duration;
                    }
                }
                const totalCapacity = makespan * this.machines.length;
                const totalUsage = Object.values(machineUsage).reduce((a, b) => a + b, 0);

                return (totalUsage / totalCapacity * 100).toFixed(1) + '%';
            }
            // Genetic algorithm optimization
            optimizeGA(generations = 100, populationSize = 50) {
                // Initialize population (random job orderings)
                let population = [];
                for (let i = 0; i < populationSize; i++) {
                    const individual = [...this.jobs].sort(() => Math.random() - 0.5);
                    population.push(individual);
                }
                for (let gen = 0; gen < generations; gen++) {
                    // Evaluate fitness
                    const evaluated = population.map(ind => ({
                        individual: ind,
                        fitness: this._fitness(this._assignJobs(ind))
                    }));

                    // Sort by fitness
                    evaluated.sort((a, b) => b.fitness - a.fitness);

                    // Selection (top 50%)
                    const selected = evaluated.slice(0, Math.floor(populationSize / 2));

                    // Crossover and mutation
                    const newPopulation = selected.map(s => s.individual);

                    while (newPopulation.length < populationSize) {
                        // Select two parents
                        const p1 = selected[Math.floor(Math.random() * selected.length)].individual;
                        const p2 = selected[Math.floor(Math.random() * selected.length)].individual;

                        // Order crossover
                        const child = this._orderCrossover(p1, p2);

                        // Mutation (swap two jobs)
                        if (Math.random() < 0.1) {
                            const i = Math.floor(Math.random() * child.length);
                            const j = Math.floor(Math.random() * child.length);
                            [child[i], child[j]] = [child[j], child[i]];
                        }
                        newPopulation.push(child);
                    }
                    population = newPopulation;
                }
                // Return best solution
                const best = population.map(ind => ({
                    individual: ind,
                    result: this._assignJobs(ind)
                })).sort((a, b) => this._fitness(b.result) - this._fitness(a.result))[0];

                return {
                    ...best.result,
                    generations,
                    method: 'Genetic Algorithm'
                };
            }
            _fitness(scheduleResult) {
                // Minimize makespan and tardiness
                return 1 / (scheduleResult.metrics.makespan + scheduleResult.metrics.totalTardiness * 10 + 1);
            }
            _orderCrossover(p1, p2) {
                const n = p1.length;
                const start = Math.floor(Math.random() * n);
                const end = start + Math.floor(Math.random() * (n - start));

                const child = new Array(n).fill(null);

                // Copy segment from p1
                for (let i = start; i <= end; i++) {
                    child[i] = p1[i];
                }
                // Fill remaining from p2
                let idx = (end + 1) % n;
                for (const job of p2) {
                    if (!child.includes(job)) {
                        while (child[idx] !== null) idx = (idx + 1) % n;
                        child[idx] = job;
                    }
                }
                return child;
            }
        },
        // Bottleneck Analysis
        BottleneckAnalyzer: class {
            constructor() {
                this.workstations = [];
            }
            addWorkstation(station) {
                // station: { id, name, cycleTime, efficiency, capacity }
                this.workstations.push(station);
            }
            analyze() {
                // Calculate throughput for each station
                const throughputs = this.workstations.map(ws => ({
                    id: ws.id,
                    name: ws.name,
                    cycleTime: ws.cycleTime,
                    throughput: (60 / ws.cycleTime) * ws.efficiency * (ws.capacity || 1),
                    utilization: 0
                }));

                // Find bottleneck (lowest throughput)
                const bottleneck = throughputs.reduce((min, ws) =>
                    ws.throughput < min.throughput ? ws : min
                );

                // Calculate utilization relative to bottleneck
                for (const ws of throughputs) {
                    ws.utilization = (bottleneck.throughput / ws.throughput * 100).toFixed(1) + '%';
                }
                // Calculate line efficiency
                const avgCycleTime = throughputs.reduce((s, ws) => s + ws.cycleTime, 0) / throughputs.length;
                const lineEfficiency = (avgCycleTime / bottleneck.cycleTime * 100).toFixed(1);

                return {
                    workstations: throughputs,
                    bottleneck: {
                        id: bottleneck.id,
                        name: bottleneck.name,
                        throughput: bottleneck.throughput.toFixed(2) + ' parts/hr'
                    },
                    lineEfficiency: lineEfficiency + '%',
                    recommendations: this._getRecommendations(throughputs, bottleneck)
                };
            }
            _getRecommendations(throughputs, bottleneck) {
                const recommendations = [];

                // Bottleneck improvement
                recommendations.push({
                    priority: 'high',
                    action: `Improve ${bottleneck.name} throughput`,
                    impact: 'Direct line improvement'
                });

                // Balance check
                const maxThroughput = Math.max(...throughputs.map(ws => ws.throughput));
                if (maxThroughput / bottleneck.throughput > 1.5) {
                    recommendations.push({
                        priority: 'medium',
                        action: 'Consider line balancing',
                        impact: 'Reduce WIP and lead time'
                    });
                }
                return recommendations;
            }
        },
        // Resource Allocation Optimizer
        ResourceAllocator: class {
            constructor() {
                this.resources = [];
                this.demands = [];
            }
            addResource(resource) {
                // resource: { id, type, capacity, cost }
                this.resources.push(resource);
            }
            addDemand(demand) {
                // demand: { id, resourceType, quantity, priority }
                this.demands.push(demand);
            }
            allocate() {
                // Sort demands by priority
                const sortedDemands = [...this.demands].sort((a, b) => b.priority - a.priority);

                // Track available capacity
                const available = {};
                for (const r of this.resources) {
                    if (!available[r.type]) available[r.type] = [];
                    available[r.type].push({ ...r, remaining: r.capacity });
                }
                const allocations = [];
                const unmet = [];

                for (const demand of sortedDemands) {
                    const resources = available[demand.resourceType] || [];
                    let remaining = demand.quantity;
                    const allocation = { demandId: demand.id, sources: [] };

                    for (const resource of resources) {
                        if (remaining <= 0) break;

                        const allocated = Math.min(remaining, resource.remaining);
                        if (allocated > 0) {
                            resource.remaining -= allocated;
                            remaining -= allocated;
                            allocation.sources.push({
                                resourceId: resource.id,
                                quantity: allocated,
                                cost: allocated * (resource.cost || 0)
                            });
                        }
                    }
                    allocation.totalAllocated = demand.quantity - remaining;
                    allocation.fulfilled = remaining === 0;

                    if (!allocation.fulfilled) {
                        unmet.push({ demandId: demand.id, shortage: remaining });
                    }
                    allocations.push(allocation);
                }
                return {
                    allocations,
                    unmetDemands: unmet,
                    totalCost: allocations.reduce((s, a) =>
                        s + a.sources.reduce((ss, src) => ss + src.cost, 0), 0
                    ),
                    utilizationByType: this._calculateUtilization(available)
                };
            }
            _calculateUtilization(available) {
                const utilization = {};
                for (const [type, resources] of Object.entries(available)) {
                    const totalCapacity = resources.reduce((s, r) => s + r.capacity, 0);
                    const totalUsed = resources.reduce((s, r) => s + (r.capacity - r.remaining), 0);
                    utilization[type] = (totalUsed / totalCapacity * 100).toFixed(1) + '%';
                }
                return utilization;
            }
        }
    },
    // TEST SUITE

    runTests() {
        console.log('════════════════════════════════════════════════════════════════');
        console.log('PRISM Phase 7 Knowledge Systems - MIT+ Algorithm Tests');
        console.log('════════════════════════════════════════════════════════════════');

        const results = [];

        // Test Ontology
        try {
            const ontology = new this.KnowledgeSystem.Ontology();
            const subclasses = ontology.getSubclasses('MachiningProcess');
            results.push({ name: 'Knowledge Ontology', status: 'PASS', subclasses: subclasses.length });
            console.log(`✓ Knowledge Ontology: PASS (${subclasses.length} machining subclasses)`);
        } catch (e) { results.push({ name: 'Ontology', status: 'FAIL' }); console.log('✗ Ontology: FAIL'); }

        // Test Rule Engine
        try {
            const engine = new this.KnowledgeSystem.RuleEngine();
            engine.addFact('material(steel)');
            engine.addFact('hardness(high)');
            engine.addRule({
                name: 'carbide_for_steel',
                conditions: ['material(steel)', 'hardness(high)'],
                actions: ['recommend(carbide_tool)']
            });
            const result = engine.forwardChain();
            results.push({ name: 'Rule Engine', status: 'PASS', fired: result.fired.length });
            console.log(`✓ Rule Engine: PASS (${result.fired.length} rules fired)`);
        } catch (e) { results.push({ name: 'RuleEngine', status: 'FAIL' }); console.log('✗ RuleEngine: FAIL'); }

        // Test CBR
        try {
            const cbr = new this.KnowledgeSystem.CaseBasedReasoning();
            cbr.addCase({ material: 'steel', feature: 'hole', tolerance: 0.05, solution: { tool: 'drill', rpm: 1000 } });
            cbr.addCase({ material: 'aluminum', feature: 'hole', tolerance: 0.1, solution: { tool: 'drill', rpm: 3000 } });
            const result = cbr.solve({ material: 'steel', feature: 'hole', tolerance: 0.08 });
            results.push({ name: 'Case-Based Reasoning', status: 'PASS', confidence: result.confidence?.toFixed(2) });
            console.log(`✓ CBR: PASS (confidence=${result.confidence?.toFixed(2)})`);
        } catch (e) { results.push({ name: 'CBR', status: 'FAIL' }); console.log('✗ CBR: FAIL'); }

        // Test DFM Analysis
        try {
            const dfm = new this.DFM.Analyzer();
            const part = {
                wallThickness: 0.8,
                features: [
                    { name: 'hole1', isHole: true, diameter: 5, depth: 60, blind: true, bottomRadius: 0.5 }
                ]
            };
            const analysis = dfm.analyze(part);
            results.push({ name: 'DFM Analysis', status: 'PASS', score: analysis.score });
            console.log(`✓ DFM Analysis: PASS (score=${analysis.score}, grade=${analysis.grade})`);
        } catch (e) { results.push({ name: 'DFM', status: 'FAIL' }); console.log('✗ DFM: FAIL'); }

        // Test Tolerance Stack
        try {
            const tolStack = new this.DFM.ToleranceAnalysis();
            tolStack.addTolerance('A', 10, 0.1);
            tolStack.addTolerance('B', 20, 0.05);
            tolStack.addTolerance('C', 15, 0.08);
            const analysis = tolStack.analyze();
            results.push({ name: 'Tolerance Analysis', status: 'PASS', rss: analysis.RSS.totalTolerance });
            console.log(`✓ Tolerance Stack: PASS (RSS=${analysis.RSS.totalTolerance}mm)`);
        } catch (e) { results.push({ name: 'TolStack', status: 'FAIL' }); console.log('✗ TolStack: FAIL'); }

        // Test CAD Primitives
        try {
            const box = this.CADEngine.Primitives.createBox(10, 20, 30);
            const cyl = this.CADEngine.Primitives.createCylinder(5, 15);
            results.push({ name: 'CAD Primitives', status: 'PASS', boxVol: box.volume, cylVol: cyl.volume.toFixed(2) });
            console.log(`✓ CAD Primitives: PASS (box=${box.volume}mm³, cyl=${cyl.volume.toFixed(2)}mm³)`);
        } catch (e) { results.push({ name: 'CAD', status: 'FAIL' }); console.log('✗ CAD: FAIL'); }

        // Test NURBS
        try {
            const controlPoints = [
                { x: 0, y: 0, z: 0 },
                { x: 10, y: 5, z: 0 },
                { x: 20, y: 0, z: 0 },
                { x: 30, y: 5, z: 0 }
            ];
            const curve = this.CADEngine.NURBS.createCurve(controlPoints, 3, 20);
            results.push({ name: 'NURBS Curve', status: 'PASS', points: curve.points.length });
            console.log(`✓ NURBS Curve: PASS (${curve.points.length} points)`);
        } catch (e) { results.push({ name: 'NURBS', status: 'FAIL' }); console.log('✗ NURBS: FAIL'); }

        // Test Image Processing
        try {
            const testImage = new Float32Array(100 * 100).fill(128);
            testImage[50 * 100 + 50] = 255; // Add bright spot
            const blurred = this.ComputerVision.ImageProcessing.gaussianBlur(testImage, 100, 100, 2);
            results.push({ name: 'Image Processing', status: 'PASS' });
            console.log('✓ Image Processing: PASS (Gaussian blur)');
        } catch (e) { results.push({ name: 'ImgProc', status: 'FAIL' }); console.log('✗ ImgProc: FAIL'); }

        // Test OEE
        try {
            const oee = new this.FactoryOptimization.OEE();
            oee.addShift({
                plannedTime: 480,
                actualRunTime: 420,
                idealCycleTime: 1,
                totalParts: 380,
                goodParts: 365
            });
            const result = oee.calculate();
            results.push({ name: 'OEE Calculator', status: 'PASS', oee: result.oee });
            console.log(`✓ OEE Calculator: PASS (OEE=${result.oee})`);
        } catch (e) { results.push({ name: 'OEE', status: 'FAIL' }); console.log('✗ OEE: FAIL'); }

        // Test Job Shop Scheduler
        try {
            const scheduler = new this.FactoryOptimization.JobShopScheduler();
            scheduler.addMachine({ id: 'M1', name: 'Mill' });
            scheduler.addMachine({ id: 'M2', name: 'Lathe' });
            scheduler.addJob({ id: 'J1', operations: [{ machine: 'M1', duration: 10 }, { machine: 'M2', duration: 5 }], dueDate: 30, priority: 1 });
            scheduler.addJob({ id: 'J2', operations: [{ machine: 'M2', duration: 8 }, { machine: 'M1', duration: 12 }], dueDate: 25, priority: 2 });
            const result = scheduler.scheduleEDD();
            results.push({ name: 'Job Shop Scheduler', status: 'PASS', makespan: result.metrics.makespan });
            console.log(`✓ Job Shop Scheduler: PASS (makespan=${result.metrics.makespan})`);
        } catch (e) { results.push({ name: 'Scheduler', status: 'FAIL' }); console.log('✗ Scheduler: FAIL'); }

        // Test Bottleneck Analysis
        try {
            const analyzer = new this.FactoryOptimization.BottleneckAnalyzer();
            analyzer.addWorkstation({ id: 'WS1', name: 'Station A', cycleTime: 2, efficiency: 0.9 });
            analyzer.addWorkstation({ id: 'WS2', name: 'Station B', cycleTime: 3, efficiency: 0.85 });
            analyzer.addWorkstation({ id: 'WS3', name: 'Station C', cycleTime: 2.5, efficiency: 0.92 });
            const result = analyzer.analyze();
            results.push({ name: 'Bottleneck Analysis', status: 'PASS', bottleneck: result.bottleneck.name });
            console.log(`✓ Bottleneck Analysis: PASS (bottleneck=${result.bottleneck.name})`);
        } catch (e) { results.push({ name: 'Bottleneck', status: 'FAIL' }); console.log('✗ Bottleneck: FAIL'); }

        console.log('════════════════════════════════════════════════════════════════');
        const passed = results.filter(r => r.status === 'PASS').length;
        console.log(`Results: ${passed}/${results.length} tests passed`);
        console.log('════════════════════════════════════════════════════════════════');

        return results;
    }
}