/**
 * PRISM_QUALITY_MANAGER
 * Extracted from PRISM v8.89.002 monolith
 * References: 35
 * Lines: 371
 * Session: R2.3.1 Engine Gap Extraction
 */

const PRISM_QUALITY_MANAGER = {
    version: '1.0.0',
    authority: 'PRISM_QUALITY_MANAGER',
    
    // Quality records
    inspections: {},
    ncrs: {},           // Non-Conformance Reports
    cars: {},           // Corrective Action Reports
    spcData: {},        // SPC control data by characteristic
    
    // Inspection types
    INSPECTION_TYPES: ['first_article', 'in_process', 'final', 'receiving', 'periodic'],
    NCR_STATUSES: ['open', 'under_review', 'disposition', 'closed'],
    DISPOSITIONS: ['use_as_is', 'rework', 'repair', 'scrap', 'return_to_vendor'],
    
    createInspection: function(params) {
        const { workOrderId, type = 'in_process', partNumber, quantity, inspector, characteristics = [] } = params;
        
        const id = 'INS-' + Date.now().toString(36).toUpperCase();
        
        this.inspections[id] = {
            id,
            workOrderId,
            type,
            partNumber,
            quantity,
            inspector,
            status: 'pending',
            created: Date.now(),
            completed: null,
            characteristics: characteristics.map((c, idx) => ({
                id: idx + 1,
                name: c.name || 'Characteristic ' + (idx + 1),
                nominal: c.nominal,
                upperLimit: c.upperLimit,
                lowerLimit: c.lowerLimit,
                unit: c.unit || 'mm',
                measurements: [],
                result: null  // pass, fail, pending
            })),
            overallResult: 'pending',
            notes: '',
            attachments: []
        };
        
        this._persistData();
        return this.inspections[id];
    },
    
    recordMeasurement: function(inspectionId, characteristicId, values) {
        const inspection = this.inspections[inspectionId];
        if (!inspection) throw new Error('Inspection not found');
        
        const char = inspection.characteristics.find(c => c.id === characteristicId);
        if (!char) throw new Error('Characteristic not found');
        
        // values can be a single number or array
        const measurements = Array.isArray(values) ? values : [values];
        char.measurements.push(...measurements.map(v => ({ value: v, timestamp: Date.now() })));
        
        // Check against limits
        const allPass = char.measurements.every(m => 
            m.value >= char.lowerLimit && m.value <= char.upperLimit
        );
        char.result = allPass ? 'pass' : 'fail';
        
        // Add to SPC data
        const spcKey = `${inspection.partNumber}_${char.name}`;
        if (!this.spcData[spcKey]) {
            this.spcData[spcKey] = {
                partNumber: inspection.partNumber,
                characteristic: char.name,
                nominal: char.nominal,
                upperLimit: char.upperLimit,
                lowerLimit: char.lowerLimit,
                measurements: []
            };
        }
        this.spcData[spcKey].measurements.push(...measurements.map(v => ({
            value: v,
            timestamp: Date.now(),
            inspectionId
        })));
        
        // Update overall inspection result
        this._updateInspectionResult(inspection);
        
        this._persistData();
        return char;
    },
    
    completeInspection: function(inspectionId, notes = '') {
        const inspection = this.inspections[inspectionId];
        if (!inspection) throw new Error('Inspection not found');
        
        inspection.status = 'complete';
        inspection.completed = Date.now();
        inspection.notes = notes;
        
        // Verify all characteristics have results
        for (const char of inspection.characteristics) {
            if (char.result === null || char.result === 'pending') {
                char.result = char.measurements.length > 0 ? 'pass' : 'incomplete';
            }
        }
        
        this._updateInspectionResult(inspection);
        
        // Auto-create NCR if failed
        if (inspection.overallResult === 'fail') {
            this.createNCR({
                inspectionId,
                partNumber: inspection.partNumber,
                workOrderId: inspection.workOrderId,
                description: 'Failed inspection: ' + inspection.characteristics.filter(c => c.result === 'fail').map(c => c.name).join(', '),
                quantity: inspection.quantity
            });
        }
        
        this._persistData();
        return inspection;
    },
    
    createNCR: function(params) {
        const { inspectionId = null, workOrderId = null, partNumber, description, quantity, defectType = 'dimensional' } = params;
        
        const id = 'NCR-' + Date.now().toString(36).toUpperCase();
        
        this.ncrs[id] = {
            id,
            inspectionId,
            workOrderId,
            partNumber,
            description,
            quantity,
            defectType,
            status: 'open',
            disposition: null,
            dispositionNotes: '',
            rootCause: '',
            created: Date.now(),
            closed: null,
            cost: 0,
            carId: null,  // linked Corrective Action
            history: [{ status: 'open', timestamp: Date.now() }]
        };
        
        this._persistData();
        return this.ncrs[id];
    },
    
    updateNCRDisposition: function(ncrId, disposition, notes = '', cost = 0) {
        const ncr = this.ncrs[ncrId];
        if (!ncr) throw new Error('NCR not found');
        if (!this.DISPOSITIONS.includes(disposition)) throw new Error('Invalid disposition');
        
        ncr.status = 'disposition';
        ncr.disposition = disposition;
        ncr.dispositionNotes = notes;
        ncr.cost = cost;
        ncr.history.push({ status: 'disposition', disposition, timestamp: Date.now() });
        
        this._persistData();
        return ncr;
    },
    
    closeNCR: function(ncrId, rootCause = '') {
        const ncr = this.ncrs[ncrId];
        if (!ncr) throw new Error('NCR not found');
        
        ncr.status = 'closed';
        ncr.closed = Date.now();
        ncr.rootCause = rootCause;
        ncr.history.push({ status: 'closed', timestamp: Date.now() });
        
        this._persistData();
        return ncr;
    },
    
    createCAR: function(params) {
        const { ncrId = null, title, description, assignedTo, dueDate } = params;
        
        const id = 'CAR-' + Date.now().toString(36).toUpperCase();
        
        // Link to NCR if provided
        if (ncrId && this.ncrs[ncrId]) {
            this.ncrs[ncrId].carId = id;
        }
        
        this.cars[id] = {
            id,
            ncrId,
            title,
            description,
            assignedTo,
            dueDate,
            status: 'open',
            rootCauseAnalysis: '',
            correctiveActions: [],
            preventiveActions: [],
            verificationDate: null,
            verificationNotes: '',
            effectiveness: null,  // effective, ineffective, partial
            created: Date.now(),
            closed: null
        };
        
        this._persistData();
        return this.cars[id];
    },
    
    getSPCAnalysis: function(partNumber, characteristicName) {
        const spcKey = `${partNumber}_${characteristicName}`;
        const spc = this.spcData[spcKey];
        if (!spc || spc.measurements.length < 2) return null;
        
        const values = spc.measurements.map(m => m.value);
        const n = values.length;
        
        // Calculate statistics
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1);
        const stdDev = Math.sqrt(variance);
        
        // Control limits (3-sigma)
        const ucl = mean + 3 * stdDev;
        const lcl = mean - 3 * stdDev;
        
        // Cp and Cpk (process capability)
        const usl = spc.upperLimit;
        const lsl = spc.lowerLimit;
        const cp = (usl - lsl) / (6 * stdDev);
        const cpk = Math.min((usl - mean) / (3 * stdDev), (mean - lsl) / (3 * stdDev));
        
        // Out of control points
        const outOfControl = values.filter(v => v > ucl || v < lcl).length;
        const outOfSpec = values.filter(v => v > usl || v < lsl).length;
        
        return {
            partNumber,
            characteristic: characteristicName,
            sampleSize: n,
            mean: mean.toFixed(4),
            stdDev: stdDev.toFixed(4),
            controlLimits: { ucl: ucl.toFixed(4), lcl: lcl.toFixed(4) },
            specLimits: { usl, lsl },
            cp: cp.toFixed(3),
            cpk: cpk.toFixed(3),
            processCapable: cpk >= 1.33,
            outOfControl,
            outOfSpec,
            trend: this._calculateTrend(values)
        };
    },
    
    getQualityMetrics: function(dateRange = null) {
        const inspections = Object.values(this.inspections);
        const ncrs = Object.values(this.ncrs);
        
        const completed = inspections.filter(i => i.status === 'complete');
        const passed = completed.filter(i => i.overallResult === 'pass');
        const failed = completed.filter(i => i.overallResult === 'fail');
        
        const openNCRs = ncrs.filter(n => n.status !== 'closed');
        const scrapNCRs = ncrs.filter(n => n.disposition === 'scrap');
        const totalNCRCost = ncrs.reduce((a, n) => a + (n.cost || 0), 0);
        
        return {
            totalInspections: inspections.length,
            completedInspections: completed.length,
            passRate: completed.length > 0 ? (passed.length / completed.length * 100).toFixed(1) + '%' : 'N/A',
            failRate: completed.length > 0 ? (failed.length / completed.length * 100).toFixed(1) + '%' : 'N/A',
            totalNCRs: ncrs.length,
            openNCRs: openNCRs.length,
            scrapRate: ncrs.length > 0 ? (scrapNCRs.length / ncrs.length * 100).toFixed(1) + '%' : 'N/A',
            totalNCRCost,
            avgNCRCost: ncrs.length > 0 ? (totalNCRCost / ncrs.length).toFixed(2) : 0,
            openCARs: Object.values(this.cars).filter(c => c.status === 'open').length
        };
    },
    
    _updateInspectionResult: function(inspection) {
        const results = inspection.characteristics.map(c => c.result);
        if (results.some(r => r === 'fail')) {
            inspection.overallResult = 'fail';
        } else if (results.every(r => r === 'pass')) {
            inspection.overallResult = 'pass';
        } else {
            inspection.overallResult = 'pending';
        }
    },
    
    _calculateTrend: function(values) {
        if (values.length < 5) return 'insufficient_data';
        
        const recent = values.slice(-5);
        const older = values.slice(-10, -5);
        
        if (older.length < 5) return 'insufficient_data';
        
        const recentMean = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderMean = older.reduce((a, b) => a + b, 0) / older.length;
        
        const diff = (recentMean - olderMean) / olderMean;
        
        if (diff > 0.05) return 'increasing';
        if (diff < -0.05) return 'decreasing';
        return 'stable';
    },
    
    _persistData: function() {
        try {
            localStorage.setItem('prism_quality', JSON.stringify({
                inspections: this.inspections,
                ncrs: this.ncrs,
                cars: this.cars,
                spcData: this.spcData
            }));
        } catch (e) { /* Storage unavailable */ }
    },
    
    loadPersistedData: function() {
        try {
            const saved = localStorage.getItem('prism_quality');
            if (saved) {
                const data = JSON.parse(saved);
                this.inspections = data.inspections || {};
                this.ncrs = data.ncrs || {};
                this.cars = data.cars || {};
                this.spcData = data.spcData || {};
            }
        } catch (e) { /* Storage unavailable */ }
    },
    
    runSelfTests: function() {
        console.log('[QUALITY_MANAGER] Running self-tests...');
        const results = { passed: 0, failed: 0, tests: [] };
        
        try {
            const ins = this.createInspection({
                workOrderId: 'WO1', type: 'first_article', partNumber: 'P1', quantity: 1, inspector: 'QC1',
                characteristics: [{ name: 'Diameter', nominal: 25.0, upperLimit: 25.05, lowerLimit: 24.95, unit: 'mm' }]
            });
            if (ins.id && ins.characteristics.length === 1) { results.passed++; results.tests.push({ name: 'Create Inspection', status: 'PASS' }); }
            else throw new Error('Invalid');
            
            this.recordMeasurement(ins.id, 1, [25.02, 25.01, 25.03]);
            const char = ins.characteristics[0];
            if (char.result === 'pass' && char.measurements.length === 3) { results.passed++; results.tests.push({ name: 'Record Measurement', status: 'PASS' }); }
            else throw new Error('Invalid measurement');
            
            delete this.inspections[ins.id];
        } catch (e) { results.failed++; results.tests.push({ name: 'Inspection Tests', status: 'FAIL', error: e.message }); }
        
        try {
            const ncr = this.createNCR({ partNumber: 'P1', description: 'Test NCR', quantity: 5 });
            if (ncr.id && ncr.status === 'open') { results.passed++; results.tests.push({ name: 'Create NCR', status: 'PASS' }); }
            else throw new Error('Invalid NCR');
            delete this.ncrs[ncr.id];
        } catch (e) { results.failed++; results.tests.push({ name: 'Create NCR', status: 'FAIL', error: e.message }); }
        
        try {
            const m = this.getQualityMetrics();
            if (typeof m.totalInspections === 'number') { results.passed++; results.tests.push({ name: 'Quality Metrics', status: 'PASS' }); }
            else throw new Error('Invalid metrics');
        } catch (e) { results.failed++; results.tests.push({ name: 'Quality Metrics', status: 'FAIL', error: e.message }); }
        
        console.log('[QUALITY_MANAGER] Tests: ' + results.passed + '/' + (results.passed + results.failed) + ' passed');
        return results;
    }
}