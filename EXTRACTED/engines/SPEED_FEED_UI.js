// SPEED_FEED_UI - Lines 458594-459487 (894 lines) - Speed/feed UI\n\nconst SPEED_FEED_UI = {

    version: '7.0.0',

    state: {
        units: 'inch',
        initialized: false,
        lastCalculation: null,
        savedSets: [],
        customMaterials: [],
        customTools: [],
        calculationHistory: [],
        maxHistoryItems: 20,
        overrides: {
            rpm: null,
            feed: null,
            speed: null
        }
    },
    elements: {},

    // INITIALIZATION

    init: function() {
        console.log('[SPEED_FEED_UI] Initializing...');
        this.cacheElements();
        this.loadSavedData();
        this.setupEventListeners();
        this.loadPreferences();
        this.populateDropdowns();
        this.renderCustomMaterials();
        this.renderCustomTools();
        this.renderPresets();
        this.calculate();
        this.state.initialized = true;
        console.log('[SPEED_FEED_UI] Initialized');
        return this;
    },
    cacheElements: function() {
        this.elements.unitToggle = document.querySelectorAll('[data-unit-toggle]');
        this.elements.materialGroup = document.getElementById('material-group');
        this.elements.materialSelect = document.getElementById('material-select');
        this.elements.machineSelect = document.getElementById('machine-select');
        this.elements.toolDiameter = document.getElementById('tool-diameter');
        this.elements.flutes = document.getElementById('flutes');
        this.elements.stickout = document.getElementById('stickout');
        this.elements.cornerRadius = document.getElementById('corner-radius');
        this.elements.doc = document.getElementById('doc');
        this.elements.woc = document.getElementById('woc');
        this.elements.operation = document.getElementById('operation');
        this.elements.strategy = document.getElementById('strategy');
        this.elements.coolant = document.getElementById('coolant');
        this.elements.speedAdjust = document.getElementById('speed-adjust');
        this.elements.speedAdjustValue = document.getElementById('speed-adjust-value');
        this.elements.feedAdjust = document.getElementById('feed-adjust');
        this.elements.feedAdjustValue = document.getElementById('feed-adjust-value');
        this.elements.finishEnabled = document.getElementById('finish-enabled');
        this.elements.finishTarget = document.getElementById('finish-target');
        this.elements.resultsContainer = document.getElementById('results-container');
        this.elements.warningsContainer = document.getElementById('warnings-container');
        this.elements.suggestionsContainer = document.getElementById('suggestions-container');
        this.elements.engineComparison = document.getElementById('engine-comparison');
        this.elements.calculateBtn = document.getElementById('calculate-btn');

        // Custom input elements (may not exist on all pages)
        this.elements.customMaterialForm = document.getElementById('custom-material-form');
        this.elements.customToolForm = document.getElementById('custom-tool-form');
        this.elements.presetsList = document.getElementById('presets-list');
        this.elements.historyList = document.getElementById('calculation-history');
        this.elements.savePresetBtn = document.getElementById('save-preset-btn');

        // Override inputs
        this.elements.rpmOverride = document.getElementById('rpm-override');
        this.elements.feedOverride = document.getElementById('feed-override');
        this.elements.speedOverride = document.getElementById('speed-override');
    },
    // EVENT LISTENERS - Auto-recalculation on any change

    setupEventListeners: function() {
        const self = this;

        // Unit toggle
        this.elements.unitToggle.forEach(btn => {
            btn.addEventListener('click', function() {
                self.setUnits(this.dataset.unit);
            });
        });

        // Material group change - updates material dropdown and recalculates
        if (this.elements.materialGroup) {
            this.elements.materialGroup.addEventListener('change', function() {
                self.onMaterialGroupChange(this.value);
                self.calculate(); // Auto-recalculate
            });
        }
        // All input elements trigger auto-recalculation
        const inputElements = [
            'materialSelect', 'machineSelect', 'toolDiameter', 'flutes',
            'stickout', 'cornerRadius', 'doc', 'woc', 'operation',
            'strategy', 'coolant', 'finishEnabled', 'finishTarget'
        ];

        inputElements.forEach(name => {
            const el = this.elements[name];
            if (el) {
                // Dropdowns and checkboxes - immediate recalculation
                el.addEventListener('change', () => {
                    self.clearOverrides(); // Clear any manual overrides when inputs change
                    self.calculate();
                });

                // Number/text inputs - debounced recalculation for smooth typing
                if (el.type === 'number' || el.type === 'text') {
                    el.addEventListener('input', () => {
                        self.clearOverrides();
                        self.debounceCalculate();
                    });

                    // Also recalculate on blur (leaving field)
                    el.addEventListener('blur', () => self.calculate());
                }
            }
        });

        // Adjustment sliders - real-time update with debounce
        if (this.elements.speedAdjust) {
            this.elements.speedAdjust.addEventListener('input', function() {
                if (self.elements.speedAdjustValue) {
                    self.elements.speedAdjustValue.textContent = this.value + '%';
                }
                self.debounceCalculate();
            });
        }
        if (this.elements.feedAdjust) {
            this.elements.feedAdjust.addEventListener('input', function() {
                if (self.elements.feedAdjustValue) {
                    self.elements.feedAdjustValue.textContent = this.value + '%';
                }
                self.debounceCalculate();
            });
        }
        // Manual calculate button
        if (this.elements.calculateBtn) {
            this.elements.calculateBtn.addEventListener('click', () => self.calculate());
        }
        // Save preset button
        if (this.elements.savePresetBtn) {
            this.elements.savePresetBtn.addEventListener('click', () => self.saveCurrentAsPreset());
        }
        // Custom material form
        if (this.elements.customMaterialForm) {
            this.elements.customMaterialForm.addEventListener('submit', (e) => {
                e.preventDefault();
                self.addCustomMaterial();
            });
        }
        // Custom tool form
        if (this.elements.customToolForm) {
            this.elements.customToolForm.addEventListener('submit', (e) => {
                e.preventDefault();
                self.addCustomTool();
            });
        }
        // Override inputs - allow manual override of calculated values
        ['rpmOverride', 'feedOverride', 'speedOverride'].forEach(name => {
            const el = this.elements[name];
            if (el) {
                el.addEventListener('input', function() {
                    self.applyOverride(name.replace('Override', ''), this.value);
                });
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save preset
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                self.saveCurrentAsPreset();
            }
            // Ctrl+R to recalculate
            if (e.ctrlKey && e.key === 'r') {
                e.preventDefault();
                self.calculate();
            }
        });
    },
    // UNIT CONVERSION

    setUnits: function(units) {
        if (units === this.state.units) return;

        const oldUnits = this.state.units;
        this.state.units = units;

        this.elements.unitToggle.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.unit === units);
        });

        if (oldUnits === 'inch' && units === 'metric') {
            this.convertInputsToMetric();
        } else if (oldUnits === 'metric' && units === 'inch') {
            this.convertInputsToInch();
        }
        this.updateUnitLabels();

        if (window.DATABASE_HUB) {
            DATABASE_HUB.units.set(units);
        }
        if (window.CALCULATION_ORCHESTRATOR) {
            CALCULATION_ORCHESTRATOR.units.set(units);
        }
        this.calculate(); // Auto-recalculate after unit change
        this.savePreferences();
    },
    convertInputsToMetric: function() {
        const convert = v => Math.round(v * 25.4 * 1000) / 1000;

        const fields = ['toolDiameter', 'stickout', 'cornerRadius', 'doc', 'woc'];
        fields.forEach(name => {
            const el = this.elements[name];
            if (el && el.value) {
                el.value = convert(parseFloat(el.value));
            }
        });
    },
    convertInputsToInch: function() {
        const convert = v => Math.round((v / 25.4) * 10000) / 10000;

        const fields = ['toolDiameter', 'stickout', 'cornerRadius', 'doc', 'woc'];
        fields.forEach(name => {
            const el = this.elements[name];
            if (el && el.value) {
                el.value = convert(parseFloat(el.value));
            }
        });
    },
    updateUnitLabels: function() {
        const labels = this.state.units === 'metric'
            ? { length: 'mm', speed: 'm/min', feed: 'mm/min', feedTooth: 'mm/tooth' }
            : { length: 'in', speed: 'SFM', feed: 'IPM', feedTooth: 'IPT' };

        document.querySelectorAll('[data-unit-label]').forEach(el => {
            const type = el.dataset.unitLabel;
            if (labels[type]) el.textContent = labels[type];
        });
    },
    // DROPDOWN POPULATION

    populateDropdowns: function() {
        this.populateMaterialGroups();
        this.populateMachines();
        this.populateOperations();
        this.populateStrategies();
        this.populateCoolants();
    },
    populateMaterialGroups: function() {
        const select = this.elements.materialGroup;
        if (!select) return;

        select.innerHTML = `
            <option value="P">P - Steel</option>
            <option value="M">M - Stainless Steel</option>
            <option value="K">K - Cast Iron</option>
            <option value="N">N - Non-Ferrous</option>
            <option value="S">S - Superalloys</option>
            <option value="H">H - Hardened Steel</option>
            <option value="custom">★ Custom Materials</option>
        `;
        this.onMaterialGroupChange('P');
    },
    onMaterialGroupChange: function(group) {
        const select = this.elements.materialSelect;
        if (!select) return;

        // Handle custom materials group
        if (group === 'custom') {
            select.innerHTML = '<option value="">Select Custom Material...</option>';
            this.state.customMaterials.forEach(mat => {
                const option = document.createElement('option');
                option.value = 'custom_' + mat.id;
                option.textContent = mat.name + (mat.hardness ? ` (${mat.hardness} HRC)` : '');
                select.appendChild(option);
            });
            if (this.state.customMaterials.length === 0) {
                select.innerHTML = '<option value="">No custom materials - add one below</option>';
            }
            return;
        }
        const fallback = {
            'P': [{ id: '1018', name: '1018 Carbon Steel' }, { id: '4140', name: '4140 Alloy Steel' }, { id: '4340', name: '4340 Alloy Steel' }, { id: '1045', name: '1045 Medium Carbon' }],
            'M': [{ id: '303', name: '303 Stainless' }, { id: '304', name: '304 Stainless' }, { id: '316', name: '316 Stainless' }, { id: '17-4PH', name: '17-4 PH Stainless' }],
            'K': [{ id: 'GCI', name: 'Gray Cast Iron' }, { id: 'DCI', name: 'Ductile Cast Iron' }, { id: 'CGI', name: 'Compacted Graphite Iron' }],
            'N': [{ id: '6061-T6', name: '6061-T6 Aluminum' }, { id: '7075-T6', name: '7075-T6 Aluminum' }, { id: 'C360', name: 'C360 Brass' }, { id: 'C110', name: 'C110 Copper' }],
            'S': [{ id: 'IN718', name: 'Inconel 718' }, { id: 'Ti6Al4V', name: 'Ti-6Al-4V' }, { id: 'Waspaloy', name: 'Waspaloy' }, { id: 'Hastelloy', name: 'Hastelloy X' }],
            'H': [{ id: 'D2', name: 'D2 Tool Steel (60 HRC)' }, { id: 'H13', name: 'H13 Tool Steel (50 HRC)' }, { id: 'M2', name: 'M2 HSS (65 HRC)' }]
        };
        let materials = [];
        if (window.DATABASE_HUB && DATABASE_HUB.status.initialized) {
            materials = DATABASE_HUB.getMaterialsByGroup(group);
        }
        if (materials.length === 0) materials = fallback[group] || [];

        select.innerHTML = '<option value="">Select Material...</option>' +
            materials.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    },
    populateMachines: function() {
        const select = this.elements.machineSelect;
        if (!select) return;

        const machines = [
            { id: 'haas_vf2', name: 'Haas VF-2 (8.1K RPM, 20HP)' },
            { id: 'haas_vf4', name: 'Haas VF-4 (8.1K RPM, 20HP)' },
            { id: 'haas_umc750', name: 'Haas UMC-750 (8.1K RPM, 30HP)' },
            { id: 'dmg_cmx800', name: 'DMG MORI CMX 800 (12K RPM, 25HP)' },
            { id: 'mazak_vcn530c', name: 'Mazak VCN-530C (12K RPM, 30HP)' },
            { id: 'okuma_m460v', name: 'Okuma M460V-5AX (15K RPM, 30HP)' },
            { id: 'generic_vmc', name: 'Generic VMC (10K RPM, 20HP)' },
            { id: 'generic_hmc', name: 'Generic HMC (12K RPM, 30HP)' },
            { id: 'hss_low', name: 'Low-Speed Mill (4K RPM, 10HP)' }
        ];

        select.innerHTML = '<option value="">Select Machine...</option>' +
            machines.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
    },
    populateOperations: function() {
        const select = this.elements.operation;
        if (!select) return;

        select.innerHTML = `
            <option value="roughing">Roughing</option>
            <option value="finishing">Finishing</option>
            <option value="hsm">High Speed Machining</option>
            <option value="adaptive">Adaptive Clearing</option>
            <option value="slotting">Slotting</option>
            <option value="profiling">Profiling</option>
            <option value="facing">Facing</option>
            <option value="drilling">Drilling</option>
        `;
    },
    populateStrategies: function() {
        const select = this.elements.strategy;
        if (!select) return;

        select.innerHTML = `
            <option value="conservative">Conservative (Max Tool Life)</option>
            <option value="balanced" selected>Balanced</option>
            <option value="aggressive">Aggressive (Max MRR)</option>
            <option value="finish_priority">Finish Priority</option>
            <option value="quiet">Quiet/Low Vibration</option>
        `;
    },
    populateCoolants: function() {
        const select = this.elements.coolant;
        if (!select) return;

        select.innerHTML = `
            <option value="flood">Flood Coolant</option>
            <option value="mist">Mist</option>
            <option value="air">Air Blast</option>
            <option value="tsc">Through-Spindle Coolant</option>
            <option value="mql">MQL (Minimum Quantity)</option>
            <option value="dry">Dry</option>
        `;
    },
    // CALCULATION - Core auto-recalculation logic

    debounceTimer: null,
    debounceCalculate: function() {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(() => this.calculate(), 150);
    },
    calculate: function() {
        const params = this.gatherInputs();
        let result;

        // Use the most advanced available calculation engine
        if (window.CALCULATION_ORCHESTRATOR) {
            result = CALCULATION_ORCHESTRATOR.calculate(params);
        } else if (window.DATABASE_HUB) {
            result = DATABASE_HUB.calculateSpeedFeed(params);
        } else {
            result = this.fallbackCalculation(params);
        }
        // Apply any manual overrides
        result = this.applyOverridesToResult(result);

        this.state.lastCalculation = result;

        // Update all displays
        this.displayResults(result);
        this.displayEngineComparison(result);
        this.displayWarnings(result);
        this.displaySuggestions(result);

        // Add to history
        this.addToHistory(params, result);

        // Fire custom event for other modules to react
        window.dispatchEvent(new CustomEvent('prism:calculated', { detail: result }));

        return result;
    },
    gatherInputs: function() {
        const isMetric = this.state.units === 'metric';

        // Check if using custom material
        const materialValue = this.elements.materialSelect?.value || '';
        let materialData = null;
        if (materialValue.startsWith('custom_')) {
            const customId = materialValue.replace('custom_', '');
            materialData = this.state.customMaterials.find(m => m.id === customId);
        }
        return {
            inputUnit: this.state.units,
            materialId: materialValue,
            materialGroup: this.elements.materialGroup?.value || 'P',
            customMaterial: materialData,
            machineId: this.elements.machineSelect?.value || null,
            toolDiameter: parseFloat(this.elements.toolDiameter?.value) || (isMetric ? 12.7 : 0.5),
            flutes: parseInt(this.elements.flutes?.value) || 4,
            stickout: parseFloat(this.elements.stickout?.value) || (isMetric ? 38 : 1.5),
            cornerRadius: parseFloat(this.elements.cornerRadius?.value) || (isMetric ? 0.4 : 0.015),
            doc: parseFloat(this.elements.doc?.value) || (isMetric ? 6 : 0.25),
            woc: parseFloat(this.elements.woc?.value) || (isMetric ? 3 : 0.125),
            operation: this.elements.operation?.value || 'roughing',
            strategy: this.elements.strategy?.value || 'balanced',
            coolant: this.elements.coolant?.value || 'flood',
            speedAdjust: parseInt(this.elements.speedAdjust?.value) || 100,
            feedAdjust: parseInt(this.elements.feedAdjust?.value) || 100,
            targetFinish: this.elements.finishEnabled?.checked ? parseFloat(this.elements.finishTarget?.value) || 63 : null
        };
    },
    fallbackCalculation: function(params) {
        const dia = params.toolDiameter;
        const sfm = params.materialGroup === 'N' ? 800 :
                    params.materialGroup === 'H' ? 150 :
                    params.materialGroup === 'S' ? 100 : 400;
        const rpm = Math.round((sfm * 12) / (Math.PI * dia));
        const chipload = 0.001 * Math.pow(dia / 0.25, 0.4);
        const feedRate = Math.round(rpm * chipload * params.flutes);

        return {
            success: true,
            results: {
                rpm: rpm,
                speed: { value: sfm, unit: 'SFM' },
                feedRate: { value: feedRate, unit: 'IPM' },
                chipload: { value: chipload.toFixed(4), unit: 'IPT' },
                mrr: { value: (params.woc * params.doc * feedRate).toFixed(3), unit: 'in³/min' },
                power: { value: '5.0', unit: 'HP' },
                torque: { value: '10.0', unit: 'ft-lb' },
                deflection: { value: '0.5', unit: 'thou' },
                surfaceFinish: { value: 63, unit: 'µin', isoGrade: 'N7' },
                chipThinningFactor: '1.00',
                toolLife: { value: 30, unit: 'min' }
            },
            warnings: [],
            suggestions: ['Load databases for complete analysis'],
            confidence: 100,
            engineComparison: {}
        };
    },
    // OVERRIDES - Allow manual adjustment of calculated values

    applyOverride: function(param, value) {
        const numValue = parseFloat(value);
        if (!isNaN(numValue) && numValue > 0) {
            this.state.overrides[param] = numValue;
        } else {
            this.state.overrides[param] = null;
        }
        this.displayResults(this.state.lastCalculation);
    },
    clearOverrides: function() {
        this.state.overrides = { rpm: null, feed: null, speed: null };
        ['rpmOverride', 'feedOverride', 'speedOverride'].forEach(name => {
            if (this.elements[name]) this.elements[name].value = '';
        });
    },
    applyOverridesToResult: function(result) {
        if (!result || !result.results) return result;

        const r = result.results;
        const o = this.state.overrides;

        if (o.rpm !== null) {
            r.rpm = o.rpm;
            r.speed.value = Math.round((o.rpm * Math.PI * (this.elements.toolDiameter?.value || 0.5)) / 12);
            result.overrideApplied = true;
        }
        if (o.feed !== null) {
            r.feedRate.value = o.feed;
            result.overrideApplied = true;
        }
        if (o.speed !== null) {
            r.speed.value = o.speed;
            r.rpm = Math.round((o.speed * 12) / (Math.PI * (this.elements.toolDiameter?.value || 0.5)));
            result.overrideApplied = true;
        }
        return result;
    },
    // CUSTOM MATERIALS

    addCustomMaterial: function() {
        const form = this.elements.customMaterialForm;
        if (!form) return;

        const material = {
            id: 'mat_' + Date.now(),
            name: form.querySelector('#custom-mat-name')?.value || 'Custom Material',
            group: form.querySelector('#custom-mat-group')?.value || 'P',
            hardness: parseFloat(form.querySelector('#custom-mat-hardness')?.value) || null,
            Kc11: parseFloat(form.querySelector('#custom-mat-kc')?.value) || 2000,
            mc: parseFloat(form.querySelector('#custom-mat-mc')?.value) || 0.25,
            baseSfm: parseFloat(form.querySelector('#custom-mat-sfm')?.value) || 400,
            feedFactor: parseFloat(form.querySelector('#custom-mat-feed')?.value) || 1.0
        };
        this.state.customMaterials.push(material);
        this.saveCustomData();
        this.renderCustomMaterials();

        // Reset form
        form.reset();

        // Select the custom materials group
        if (this.elements.materialGroup) {
            this.elements.materialGroup.value = 'custom';
            this.onMaterialGroupChange('custom');
        }
        console.log('[SPEED_FEED_UI] Added custom material:', material.name);
    },
    deleteCustomMaterial: function(id) {
        this.state.customMaterials = this.state.customMaterials.filter(m => m.id !== id);
        this.saveCustomData();
        this.renderCustomMaterials();
        this.onMaterialGroupChange(this.elements.materialGroup?.value || 'P');
    },
    renderCustomMaterials: function() {
        const container = document.getElementById('custom-materials-list');
        if (!container) return;

        if (this.state.customMaterials.length === 0) {
            container.innerHTML = '<p class="text-muted">No custom materials defined</p>';
            return;
        }
        container.innerHTML = this.state.customMaterials.map(mat => `
            <div class="custom-item">
                <span class="custom-item-name">${mat.name}</span>
                <span class="custom-item-detail">${mat.baseSfm} SFM, Kc=${mat.Kc11}</span>
                <button class="btn-delete" onclick="SPEED_FEED_UI.deleteCustomMaterial('${mat.id}')">×</button>
            </div>
        `).join('');
    },
    // CUSTOM TOOLS

    addCustomTool: function() {
        const form = this.elements.customToolForm;
        if (!form) return;

        const tool = {
            id: 'tool_' + Date.now(),
            name: form.querySelector('#custom-tool-name')?.value || 'Custom Tool',
            type: form.querySelector('#custom-tool-type')?.value || 'endmill',
            diameter: parseFloat(form.querySelector('#custom-tool-dia')?.value) || 0.5,
            flutes: parseInt(form.querySelector('#custom-tool-flutes')?.value) || 4,
            length: parseFloat(form.querySelector('#custom-tool-length')?.value) || 3,
            cornerRadius: parseFloat(form.querySelector('#custom-tool-corner')?.value) || 0,
            coating: form.querySelector('#custom-tool-coating')?.value || 'TiAlN',
            manufacturer: form.querySelector('#custom-tool-mfr')?.value || ''
        };
        this.state.customTools.push(tool);
        this.saveCustomData();
        this.renderCustomTools();

        form.reset();
        console.log('[SPEED_FEED_UI] Added custom tool:', tool.name);
    },
    loadCustomTool: function(id) {
        const tool = this.state.customTools.find(t => t.id === id);
        if (!tool) return;

        if (this.elements.toolDiameter) this.elements.toolDiameter.value = tool.diameter;
        if (this.elements.flutes) this.elements.flutes.value = tool.flutes;
        if (this.elements.stickout) this.elements.stickout.value = tool.length * 0.6;
        if (this.elements.cornerRadius) this.elements.cornerRadius.value = tool.cornerRadius;

        this.calculate();
    },
    deleteCustomTool: function(id) {
        this.state.customTools = this.state.customTools.filter(t => t.id !== id);
        this.saveCustomData();
        this.renderCustomTools();
    },
    renderCustomTools: function() {
        const container = document.getElementById('custom-tools-list');
        if (!container) return;

        if (this.state.customTools.length === 0) {
            container.innerHTML = '<p class="text-muted">No custom tools defined</p>';
            return;
        }
        container.innerHTML = this.state.customTools.map(tool => `
            <div class="custom-item">
                <span class="custom-item-name">${tool.name}</span>
                <span class="custom-item-detail">Ø${tool.diameter}" ${tool.flutes}FL ${tool.coating}</span>
                <button class="btn-load" onclick="SPEED_FEED_UI.loadCustomTool('${tool.id}')">Load</button>
                <button class="btn-delete" onclick="SPEED_FEED_UI.deleteCustomTool('${tool.id}')">×</button>
            </div>
        `).join('');
    },
    // PRESETS - Save and load complete parameter sets

    saveCurrentAsPreset: function() {
        const name = prompt('Enter preset name:',
            `${this.elements.materialSelect?.options[this.elements.materialSelect.selectedIndex]?.text || 'Custom'} - ${this.elements.operation?.value || 'Roughing'}`);

        if (!name) return;

        const preset = {
            id: 'preset_' + Date.now(),
            name: name,
            created: new Date().toISOString(),
            params: this.gatherInputs(),
            result: this.state.lastCalculation?.results
        };
        this.state.savedSets.push(preset);
        this.saveCustomData();
        this.renderPresets();

        console.log('[SPEED_FEED_UI] Saved preset:', name);
    },
    loadPreset: function(id) {
        const preset = this.state.savedSets.find(p => p.id === id);
        if (!preset || !preset.params) return;

        const p = preset.params;

        // Load all values
        if (this.elements.materialGroup && p.materialGroup) {
            this.elements.materialGroup.value = p.materialGroup;
            this.onMaterialGroupChange(p.materialGroup);
        }
        if (this.elements.materialSelect && p.materialId) {
            this.elements.materialSelect.value = p.materialId;
        }
        if (this.elements.machineSelect && p.machineId) {
            this.elements.machineSelect.value = p.machineId;
        }
        if (this.elements.toolDiameter) this.elements.toolDiameter.value = p.toolDiameter;
        if (this.elements.flutes) this.elements.flutes.value = p.flutes;
        if (this.elements.stickout) this.elements.stickout.value = p.stickout;
        if (this.elements.cornerRadius) this.elements.cornerRadius.value = p.cornerRadius;
        if (this.elements.doc) this.elements.doc.value = p.doc;
        if (this.elements.woc) this.elements.woc.value = p.woc;
        if (this.elements.operation) this.elements.operation.value = p.operation;
        if (this.elements.strategy) this.elements.strategy.value = p.strategy;
        if (this.elements.coolant) this.elements.coolant.value = p.coolant;
        if (this.elements.speedAdjust) {
            this.elements.speedAdjust.value = p.speedAdjust;
            if (this.elements.speedAdjustValue) {
                this.elements.speedAdjustValue.textContent = p.speedAdjust + '%';
            }
        }
        if (this.elements.feedAdjust) {
            this.elements.feedAdjust.value = p.feedAdjust;
            if (this.elements.feedAdjustValue) {
                this.elements.feedAdjustValue.textContent = p.feedAdjust + '%';
            }
        }
        this.calculate();
        console.log('[SPEED_FEED_UI] Loaded preset:', preset.name);
    },
    deletePreset: function(id) {
        this.state.savedSets = this.state.savedSets.filter(p => p.id !== id);
        this.saveCustomData();
        this.renderPresets();
    },
    renderPresets: function() {
        const container = this.elements.presetsList || document.getElementById('presets-list');
        if (!container) return;

        if (this.state.savedSets.length === 0) {
            container.innerHTML = '<p class="text-muted">No saved presets</p>';
            return;
        }
        container.innerHTML = this.state.savedSets.map(preset => `
            <div class="preset-item">
                <div class="preset-info">
                    <span class="preset-name">${preset.name}</span>
                    <span class="preset-detail">${preset.result?.rpm || '?'} RPM, ${preset.result?.feedRate?.value || '?'} IPM</span>
                </div>
                <div class="preset-actions">
                    <button class="btn-load" onclick="SPEED_FEED_UI.loadPreset('${preset.id}')">Load</button>
                    <button class="btn-delete" onclick="SPEED_FEED_UI.deletePreset('${preset.id}')">×</button>
                </div>
            </div>
        `).join('');
    },
    // CALCULATION HISTORY

    addToHistory: function(params, result) {
        if (!result || !result.results) return;

        const historyItem = {
            timestamp: new Date().toISOString(),
            material: params.materialId || params.materialGroup,
            tool: `Ø${params.toolDiameter}" ${params.flutes}FL`,
            operation: params.operation,
            rpm: result.results.rpm,
            feed: result.results.feedRate?.value
        };
        this.state.calculationHistory.unshift(historyItem);

        // Limit history size
        if (this.state.calculationHistory.length > this.state.maxHistoryItems) {
            this.state.calculationHistory = this.state.calculationHistory.slice(0, this.state.maxHistoryItems);
        }
        this.renderHistory();
    },
    renderHistory: function() {
        const container = this.elements.historyList || document.getElementById('calculation-history');
        if (!container) return;

        if (this.state.calculationHistory.length === 0) {
            container.innerHTML = '<p class="text-muted">No calculation history</p>';
            return;
        }
        container.innerHTML = this.state.calculationHistory.slice(0, 10).map(item => `
            <div class="history-item">
                <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
                <span class="history-params">${item.material} / ${item.tool}</span>
                <span class="history-result">${item.rpm} RPM, ${item.feed} IPM</span>
            </div>
        `).join('');
    },
    // DISPLAY FUNCTIONS

    displayResults: function(result) {
        if (!result || !result.results) return;
        const r = result.results;

        const setResult = (id, value, unit) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = `${value} <span class="result-unit">${unit || ''}</span>`;
        };
        setResult('rpm-result', r.rpm?.toLocaleString() || '-', '');
        setResult('speed-result', r.speed?.value || '-', r.speed?.unit);
        setResult('feed-result', r.feedRate?.value || '-', r.feedRate?.unit);
        setResult('chipload-result', r.chipload?.value || '-', r.chipload?.unit);
        setResult('mrr-result', r.mrr?.value || '-', r.mrr?.unit);
        setResult('power-result', r.power?.value || '-', r.power?.unit);
        setResult('torque-result', r.torque?.value || '-', r.torque?.unit);
        setResult('deflection-result', r.deflection?.value || '-', r.deflection?.unit);
        setResult('ctf-result', r.chipThinningFactor || '-', '');
        setResult('tool-life-result', r.toolLife?.value || '-', r.toolLife?.unit);

        const finishEl = document.getElementById('finish-result');
        if (finishEl && r.surfaceFinish) {
            finishEl.innerHTML = `${r.surfaceFinish.value} <span class="result-unit">${r.surfaceFinish.unit}</span> <span class="text-muted">(${r.surfaceFinish.isoGrade})</span>`;
        }
        // Show override indicator if any overrides are active
        const overrideIndicator = document.getElementById('override-indicator');
        if (overrideIndicator) {
            overrideIndicator.style.display = result.overrideApplied ? 'block' : 'none';
        }
    },
    displayEngineComparison: function(result) {
        const container = this.elements.engineComparison;
        if (!container || !result.engineComparison) return;

        const engines = result.engineComparison;
        if (Object.keys(engines).length === 0) {
            container.innerHTML = '<p class="text-muted">Engine comparison available when full orchestrator is loaded.</p>';
            return;
        }
        const rows = Object.entries(engines).map(([engine, data]) => `
            <tr>
                <td>${engine.charAt(0).toUpperCase() + engine.slice(1)}</td>
                <td class="mono">${data.rpm?.toLocaleString() || '-'}</td>
                <td class="mono">${data.sfm || '-'}</td>
                <td class="mono">${data.feedRate || '-'}</td>
                <td class="mono">${data.power || '-'}</td>
                <td class="text-muted">${((data.weight || 0) * 100).toFixed(0)}%</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <table class="table">
                <thead><tr><th>Engine</th><th>RPM</th><th>SFM</th><th>Feed</th><th>Power</th><th>Weight</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        `;
    },
    displayWarnings: function(result) {
        const container = this.elements.warningsContainer;
        if (!container) return;

        if (!result.warnings || result.warnings.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = result.warnings.map(w => `
            <div class="alert alert-${w.type === 'critical' ? 'danger' : 'warning'}">
                <div class="alert-content">${w.message || w.text}</div>
            </div>
        `).join('');
    },
    displaySuggestions: function(result) {
        const container = this.elements.suggestionsContainer;
        if (!container) return;

        if (!result.suggestions || result.suggestions.length === 0) {
            container.innerHTML = '';
            return;
        }
        container.innerHTML = `
            <div class="alert alert-info">
                <ul style="margin: 0; padding-left: 16px;">
                    ${result.suggestions.map(s => `<li>${s}</li>`).join('')}
                </ul>
            </div>
        `;
    },
    // PERSISTENCE - Save/load user data

    savePreferences: function() {
        try {
            localStorage.setItem('prism_sf_prefs', JSON.stringify({ units: this.state.units }));
        } catch (e) { console.warn('Could not save preferences:', e); }
    },
    loadPreferences: function() {
        try {
            const prefs = JSON.parse(localStorage.getItem('prism_sf_prefs') || '{}');
            if (prefs.units) this.setUnits(prefs.units);
        } catch (e) { console.warn('Could not load preferences:', e); }
    },
    saveCustomData: function() {
        try {
            localStorage.setItem('prism_sf_custom', JSON.stringify({
                customMaterials: this.state.customMaterials,
                customTools: this.state.customTools,
                savedSets: this.state.savedSets
            }));
        } catch (e) { console.warn('Could not save custom data:', e); }
    },
    loadSavedData: function() {
        try {
            const data = JSON.parse(localStorage.getItem('prism_sf_custom') || '{}');
            if (data.customMaterials) this.state.customMaterials = data.customMaterials;
            if (data.customTools) this.state.customTools = data.customTools;
            if (data.savedSets) this.state.savedSets = data.savedSets;
        } catch (e) { console.warn('Could not load saved data:', e); }
    },
    // EXPORT/IMPORT

    exportData: function() {
        const data = {
            version: this.version,
            exported: new Date().toISOString(),
            customMaterials: this.state.customMaterials,
            customTools: this.state.customTools,
            savedSets: this.state.savedSets
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'prism-speedfeed-data.json';
        a.click();
        URL.revokeObjectURL(url);
    },
    importData: function(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.customMaterials) this.state.customMaterials = data.customMaterials;
                if (data.customTools) this.state.customTools = data.customTools;
                if (data.savedSets) this.state.savedSets = data.savedSets;

                this.saveCustomData();
                this.renderCustomMaterials();
                this.renderCustomTools();
                this.renderPresets();

                alert('Data imported successfully!');
            } catch (err) {
                alert('Error importing data: ' + err.message);
            }
        };
        reader.readAsText(file);
    }
};
