const PRISM_UNIFIED_MACHINE_SELECTOR = {
  version: '1.0',

  // Current selections
  state: {
    tier: 'tier1',
    mode: 'mill',
    manufacturer: null,
    type: null,
    model: null,
    spindle: null,
    controller: null,
    features: []
  },
  // Tier-based brand access
  tierBrands: {
    tier1: ['generic'],
    tier2: 'all', // v8.65.028: Full manufacturer selection for Tier 2+
    tier3: 'all', // All brands
    tier4: 'all'
  },
  /**
   * Initialize the machine selector
   */
  init() {
    console.log('[PRISM_UNIFIED_MACHINE_SELECTOR] Initializing...');

    // Sync with global state
    this.state.tier = window.currentTier || 'tier1';
    this.state.mode = window.currentMachineMode || 'mill';

    // Listen for tier changes
    window.addEventListener('tierChanged', (e) => {
      this.state.tier = e.detail.tier;
      this.updateBrandDropdown();
      this.filterMachines();
    });

    // Listen for mode changes
    window.addEventListener('machineModeChanged', (e) => {
      this.state.mode = e.detail.mode;
      this.updateBrandDropdown();
      this.filterMachines();
    });

    // Replace global functions with our implementations
    window._extendedFilterMachines = this.filterMachines.bind(this);
    window._extendedPopulateManufacturerDropdown = this.updateBrandDropdown.bind(this);

    // Initialize dropdowns
    this.setupDropdowns();
    this.updateBrandDropdown();

    console.log('[PRISM_UNIFIED_MACHINE_SELECTOR] Initialized');
    return this;
  },
  /**
   * Get the appropriate database for current mode
   */
  getDatabase() {
    const databases = {
      mill: typeof MACHINE_DATABASE !== 'undefined' ? MACHINE_DATABASE : null,
      lathe: typeof LATHE_MACHINE_DATABASE !== 'undefined' ? LATHE_MACHINE_DATABASE : null,
      edm: typeof EDM_MACHINE_DATABASE !== 'undefined' ? EDM_MACHINE_DATABASE : null,
      wire_edm: typeof EDM_MACHINE_DATABASE !== 'undefined' ? EDM_MACHINE_DATABASE : null,
      laser: typeof LASER_MACHINE_DATABASE !== 'undefined' ? LASER_MACHINE_DATABASE : null,
      waterjet: typeof WATERJET_MACHINE_DATABASE !== 'undefined' ? WATERJET_MACHINE_DATABASE : null
    };
    return databases[this.state.mode] || databases.mill;
  },
  /**
   * Get allowed brands for current tier
   */
  getAllowedBrands() {
    const tierConfig = this.tierBrands[this.state.tier];
    if (tierConfig === 'all') {
      return this.getAllBrands();
    }
    return tierConfig || ['generic'];
  },
  /**
   * Get all available brands from databases
   */
  getAllBrands() {
    const brands = new Set(['generic']);

    // Get from all databases
    const databases = [
      typeof MACHINE_DATABASE !== 'undefined' ? MACHINE_DATABASE : null,
      typeof LATHE_MACHINE_DATABASE !== 'undefined' ? LATHE_MACHINE_DATABASE : null,
      typeof EDM_MACHINE_DATABASE !== 'undefined' ? EDM_MACHINE_DATABASE : null,
      typeof LASER_MACHINE_DATABASE !== 'undefined' ? LASER_MACHINE_DATABASE : null,
      typeof WATERJET_MACHINE_DATABASE !== 'undefined' ? WATERJET_MACHINE_DATABASE : null
    ];

    databases.forEach(db => {
      if (!db) return;

      // Check manufacturers object
      if (db.manufacturers) {
        Object.keys(db.manufacturers).forEach(m => brands.add(m.toLowerCase()));
      }
      // Check machines for manufacturer field
      if (db.machines) {
        Object.values(db.machines).forEach(m => {
          if (m.manufacturer) brands.add(m.manufacturer.toLowerCase());
        });
      }
    });

    return Array.from(brands).sort();
  },
  /**
   * Setup dropdown event listeners
   */
  setupDropdowns() {
    const manufacturerSelect = document.getElementById('machineManufacturer');
    const typeSelect = document.getElementById('machineType');
    const modelSelect = document.getElementById('machineModel');
    const spindleSelect = document.getElementById('spindleSelect');
    const controllerSelect = document.getElementById('controllerSelect');

    if (manufacturerSelect) {
      manufacturerSelect.addEventListener('change', () => {
        this.state.manufacturer = manufacturerSelect.value;
        this.updateTypeDropdown();
      });
    }
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        this.state.type = typeSelect.value;
        this.updateModelDropdown();
      });
    }
    if (modelSelect) {
      modelSelect.addEventListener('change', () => {
        this.state.model = modelSelect.value;
        this.updateSpindleDropdown();
        this.updateControllerDropdown();
        this.updateFeatures();
      });
    }
    if (spindleSelect) {
      spindleSelect.addEventListener('change', () => {
        this.state.spindle = spindleSelect.value;
        this.onMachineConfigChanged();
      });
    }
    if (controllerSelect) {
      controllerSelect.addEventListener('change', () => {
        this.state.controller = controllerSelect.value;
        this.onMachineConfigChanged();
      });
    }
  },
  /**
   * Update brand/manufacturer dropdown based on tier
   */
  updateBrandDropdown() {
    const select = document.getElementById('machineManufacturer');
    if (!select) return;

    const allowedBrands = this.getAllowedBrands();
    const tier = this.state.tier;

    let html = '<option value="">Select Manufacturer</option>';

    // Generic always available
    html += '<option value="generic">Generic Machine</option>';

    if (tier === 'tier1') {
      html += '<option value="" disabled>── Upgrade for Brands ──</option>';
      html += '<option value="__upgrade__">🔓 Upgrade to Tier 2</option>';
    } else {
      // Group brands by region
      const regions = {
        'Japanese': ['mazak', 'okuma', 'makino', 'mori_seiki', 'citizen', 'star', 'brother', 'sodick', 'mitsubishi'],
        'American': ['haas', 'hurco', 'fadal', 'cincinnati'],
        'German': ['dmg', 'hermle', 'chiron', 'grob', 'trumpf'],
        'Korean': ['doosan', 'hyundai_wia', 'hwacheon'],
        'Taiwanese': ['victor', 'leadwell', 'tongtai'],
        'Other': []
      };
      // Sort allowed brands into regions
      const sortedBrands = {};
      allowedBrands.forEach(brand => {
        if (brand === 'generic') return;
        let found = false;
        for (const [region, brands] of Object.entries(regions)) {
          if (brands.includes(brand)) {
            if (!sortedBrands[region]) sortedBrands[region] = [];
            sortedBrands[region].push(brand);
            found = true;
            break;
          }
        }
        if (!found) {
          if (!sortedBrands['Other']) sortedBrands['Other'] = [];
          sortedBrands['Other'].push(brand);
        }
      });

      // Build optgroups
      for (const [region, brands] of Object.entries(sortedBrands)) {
        if (brands.length > 0) {
          html += '<optgroup label="' + region + '">';
          brands.sort().forEach(brand => {
            const displayName = this.getBrandDisplayName(brand);
            html += '<option value="' + brand + '">' + displayName + '</option>';
          });
          html += '</optgroup>';
        }
      }
    }
    select.innerHTML = html;

    // Reset dependent dropdowns
    this.state.manufacturer = null;
    this.updateTypeDropdown();
  },
  /**
   * Get display name for a brand
   */
  getBrandDisplayName(brand) {
    const names = {
      'haas': 'Haas Automation',
      'mazak': 'Mazak',

    // --- Legacy Machine Learning Entries (converted from nested format) ---
    'haas_vf2_3axis': {
      manufacturer: 'HAAS', source: 'haas_vf2_model.step', confidence: 0.92, priority: 'learned',
      dimensions: { baseWidthRatio: 2.2, baseDepthRatio: 1.6, columnHeightRatio: 3.5 },
      specs: { type: '3AXIS_VMC', x: 762, y: 406, z: 508, taper: 'CAT40' }
    },
    'haas_umc750_5axis': {
      manufacturer: 'HAAS', source: 'haas_umc750_model.step', confidence: 0.90, priority: 'learned',
      dimensions: { baseWidthRatio: 2.4, baseDepthRatio: 2.0, trunnionWidthRatio: 0.6 },
      specs: { type: '5AXIS_TRUNNION', x: 762, y: 508, z: 508, taper: 'CAT40' }
    },
    'haas_st10_lathe': {
      manufacturer: 'HAAS', source: 'haas_st10_model.step', confidence: 0.88, priority: 'learned',
      dimensions: { bedLengthRatio: 2.5, headstockWidthRatio: 0.4 },
      specs: { type: 'TURNING_CENTER', swingDia: 419, maxLength: 356, taper: 'A2-5' }
    },
    'dmg_mori_dmu50_5axis': {
      manufacturer: 'DMG_MORI', source: 'dmg_dmu50_model.step', confidence: 0.94, priority: 'learned',
      dimensions: { baseWidthRatio: 2.8, baseDepthRatio: 2.2, columnHeightRatio: 3.8 },
      specs: { type: '5AXIS_TRUNNION', x: 500, y: 450, z: 400, taper: 'HSK-A63' }
    },
    'dmg_mori_ntx2000_millturn': {
      manufacturer: 'DMG_MORI', source: 'dmg_ntx2000_model.step', confidence: 0.91, priority: 'learned',
      dimensions: { bedLengthRatio: 3.5, turretHeightRatio: 0.6 },
      specs: { type: 'MILL_TURN', bRange: [-120, 120], cRange: [0, 360], taper: 'HSK-A63' }
    },
    'mazak_variaxis_5axis': {
      manufacturer: 'MAZAK', source: 'mazak_variaxis_model.step', confidence: 0.93, priority: 'learned',
      dimensions: { baseWidthRatio: 2.6, baseDepthRatio: 2.1, columnHeightRatio: 3.6 },
      specs: { type: '5AXIS_TRUNNION', aRange: [-30, 120], cRange: [0, 360], taper: 'HSK-A63' }
    },
    'mazak_integrex_millturn': {
      manufacturer: 'MAZAK', source: 'mazak_integrex_model.step', confidence: 0.92, priority: 'learned',
      dimensions: { bedLengthRatio: 4.0, millHeadHeightRatio: 0.8 },
      specs: { type: 'MILL_TURN', bRange: [-90, 90], cRange: [0, 360], taper: 'Capto-C6' }
    },
    'makino_a61nx_hmc': {
      manufacturer: 'MAKINO', source: 'makino_a61nx_model.step', confidence: 0.91, priority: 'learned',
      dimensions: { baseWidthRatio: 2.5, baseDepthRatio: 3.0, palletSizeRatio: 0.5 },
      specs: { type: '4AXIS_HMC', bRange: [0, 360], pallet: 400, taper: 'HSK-A63' }
    },
    'makino_edaf_graphite': {
      manufacturer: 'MAKINO', source: 'makino_edaf_model.step', confidence: 0.89, priority: 'learned',
      dimensions: { baseWidthRatio: 1.8, spindleHeightRatio: 2.5 },
      specs: { type: '3AXIS_HSM', rpm: 40000, taper: 'HSK-E40' }
    },
    'doosan_dnm_3axis': {
      manufacturer: 'DOOSAN', source: 'doosan_dnm_model.step', confidence: 0.87, priority: 'learned',
      dimensions: { baseWidthRatio: 2.3, baseDepthRatio: 1.7, columnHeightRatio: 3.4 },
      specs: { type: '3AXIS_VMC', x: 800, y: 450, z: 510, taper: 'BT40' }
    },
    'doosan_lynx_lathe': {
      manufacturer: 'DOOSAN', source: 'doosan_lynx_model.step', confidence: 0.86, priority: 'learned',
      dimensions: { bedLengthRatio: 2.2, headstockWidthRatio: 0.38 },
      specs: { type: 'TURNING_CENTER', swingDia: 340, maxLength: 510, taper: 'A2-6' }
    },
    'brother_tc32bn_tapping': {
      manufacturer: 'BROTHER', source: 'brother_tc32bn_model.step', confidence: 0.88, priority: 'learned',
      dimensions: { baseWidthRatio: 1.6, baseDepthRatio: 1.4, compactHeightRatio: 2.2 },
      specs: { type: '3AXIS_TAPPING', rapidRate: 50000, rpm: 16000, taper: 'BT30' }
    },
    'hurco_vmx42_5axis': {
      manufacturer: 'HURCO', source: 'hurco_vmx42_model.step', confidence: 0.85, priority: 'learned',
      dimensions: { baseWidthRatio: 2.4, baseDepthRatio: 1.9, trunnionWidthRatio: 0.5 },
      specs: { type: '5AXIS_TRUNNION', aRange: [-30, 110], cRange: [0, 360], taper: 'CAT40' }
    },
      'okuma': 'Okuma',
      'dmg': 'DMG Mori',
      'mori_seiki': 'Mori Seiki',
      'makino': 'Makino',
      'hurco': 'Hurco',
      'doosan': 'Doosan',
      'fanuc': 'Fanuc',
      'brother': 'Brother',
      'citizen': 'Citizen',
      'star': 'Star',
      'sodick': 'Sodick',
      'mitsubishi': 'Mitsubishi',
      'hermle': 'Hermle',
      'chiron': 'Chiron',
      'grob': 'Grob',
      'trumpf': 'Trumpf',
      'hyundai_wia': 'Hyundai WIA',
      'hwacheon': 'Hwacheon',
      'victor': 'Victor Taichung',
      'leadwell': 'Leadwell',
      'tongtai': 'Tongtai',
      'fadal': 'Fadal',
      'cincinnati': 'Cincinnati',
      'generic': 'Generic'
    };
    return names[brand] || brand.charAt(0).toUpperCase() + brand.slice(1).replace(/_/g, ' ');
  },
  /**
   * Update machine type dropdown based on manufacturer
   */
  updateTypeDropdown() {
    const select = document.getElementById('machineType');
    if (!select) return;

    const manufacturer = this.state.manufacturer;
    const mode = this.state.mode;

    // Define types based on mode
    const typesByMode = {
      mill: {
        'vmc': 'Vertical Machining Center (VMC)',
        'hmc': 'Horizontal Machining Center (HMC)',
        '5axis': '5-Axis Machining Center',
        'gantry': 'Gantry/Bridge Mill',
        'compact': 'Compact/Desktop Mill'
      },
      lathe: {
        '2axis': '2-Axis CNC Lathe',
        'turning': 'CNC Turning Center',
        'mill_turn': 'Mill-Turn / Multi-Tasking',
        'swiss': 'Swiss-Type Lathe',
        'vtl': 'Vertical Turret Lathe (VTL)'
      },
      edm: {
        'sinker': 'Sinker/Die-Sinking EDM',
        'ram': 'Ram EDM'
      },
      wire_edm: {
        'wire': 'Wire EDM',
        'wire_submerged': 'Submerged Wire EDM'
      },
      laser: {
        'fiber': 'Fiber Laser',
        'co2': 'CO2 Laser',
        'disk': 'Disk Laser'
      },
      waterjet: {
        'abrasive': 'Abrasive Waterjet',
        'pure': 'Pure Water Jet'
      }
    };
    const types = typesByMode[mode] || typesByMode.mill;

    let html = '<option value="">Select Type</option>';
    for (const [value, label] of Object.entries(types)) {
      html += '<option value="' + value + '">' + label + '</option>';
    }
    select.innerHTML = html;
    select.parentElement.style.display = (manufacturer && manufacturer !== 'generic') ? 'block' : 'none';

    this.state.type = null;
    this.updateModelDropdown();
  },
  /**
   * Update model dropdown based on manufacturer and type
   */
  updateModelDropdown() {
    const select = document.getElementById('machineModel');
    const container = document.getElementById('machineModelSelect');

    if (!select && !container) return;

    const manufacturer = this.state.manufacturer;
    const type = this.state.type;
    const db = this.getDatabase();

    // Get machines matching criteria
    let machines = [];

    if (db && db.machines) {
      machines = Object.entries(db.machines).filter(([id, m]) => {
        const matchMfr = !manufacturer || manufacturer === 'generic' ||
                        m.manufacturer?.toLowerCase() === manufacturer.toLowerCase();
        const matchType = !type || m.type?.toLowerCase().includes(type.toLowerCase());
        return matchMfr && matchType;
      }).map(([id, m]) => ({ id, ...m }));
    }
    // If no database machines, create generic options
    if (machines.length === 0) {
      machines = this.getGenericMachines();
    }
    // Build select
    if (select) {
      let html = '<option value="">Select Model</option>';
      machines.forEach(m => {
        html += '<option value="' + m.id + '">' + (m.name || m.model || m.id) + '</option>';
      });
      select.innerHTML = html;
      select.style.display = 'block';
    }
    this.state.model = null;
    this.updateSpindleDropdown();
    this.updateControllerDropdown();
  },
  /**
   * Get generic machine options for Essentials tier
   */
  getGenericMachines() {
    const genericByMode = {
      mill: [
        { id: 'generic_vmc_40t', name: 'Generic VMC - 40 Taper', type: 'vmc', spindle: { taper: 'CAT40', maxRpm: 10000 } },
        { id: 'generic_vmc_bt40', name: 'Generic VMC - BT40', type: 'vmc', spindle: { taper: 'BT40', maxRpm: 12000 } },
        { id: 'generic_hmc_50t', name: 'Generic HMC - 50 Taper', type: 'hmc', spindle: { taper: 'CAT50', maxRpm: 6000 } }
      ],
      lathe: [
        { id: 'generic_lathe_8in', name: 'Generic Lathe - 8" Chuck', type: 'lathe', spindle: { maxRpm: 4000 } },
        { id: 'generic_lathe_10in', name: 'Generic Lathe - 10" Chuck', type: 'lathe', spindle: { maxRpm: 3500 } }
      ],
      edm: [
        { id: 'generic_sinker_edm', name: 'Generic Sinker EDM', type: 'sinker' }
      ],
      wire_edm: [
        { id: 'generic_wire_edm', name: 'Generic Wire EDM', type: 'wire' }
      ],
      laser: [
        { id: 'generic_fiber_laser', name: 'Generic Fiber Laser', type: 'fiber' }
      ],
      waterjet: [
        { id: 'generic_abrasive_wj', name: 'Generic Abrasive Waterjet', type: 'abrasive' }
      ]
    };
    return genericByMode[this.state.mode] || genericByMode.mill;
  },
  /**
   * Update spindle dropdown based on selected machine
   */
  updateSpindleDropdown() {
    const select = document.getElementById('spindleSelect');
    const group = document.getElementById('spindleSelectGroup');
    if (!select) return;

    const modelId = this.state.model;
    const db = this.getDatabase();

    let spindles = [];

    // Get machine-specific spindle options
    if (db && db.machines && modelId) {
      const machine = db.machines[modelId];
      if (machine) {
        if (machine.spindleOptions) {
          spindles = machine.spindleOptions;
        } else if (machine.spindle) {
          spindles = [machine.spindle];
        }
      }
    }
    // Default spindles if none found
    if (spindles.length === 0) {
      spindles = [
        { id: 'std_8k', name: 'Standard 8,000 RPM', maxRpm: 8000, power: 15 },
        { id: 'std_12k', name: 'Standard 12,000 RPM', maxRpm: 12000, power: 18 },
        { id: 'hsp_15k', name: 'High-Speed 15,000 RPM', maxRpm: 15000, power: 22 },
        { id: 'hsp_20k', name: 'High-Speed 20,000 RPM', maxRpm: 20000, power: 25 }
      ];
    }
    let html = '<option value="">Select Spindle</option>';
    spindles.forEach(s => {
      const id = s.id || s.name;
      const label = s.name || (s.maxRpm + ' RPM');
      html += '<option value="' + id + '">' + label + '</option>';
    });

    select.innerHTML = html;
    if (group) {
      group.style.display = (this.state.manufacturer && this.state.manufacturer !== 'generic') ? 'block' : 'none';
    }
  },
  /**
   * Update controller dropdown based on selected machine
   */
  updateControllerDropdown() {
    const select = document.getElementById('controllerSelect');
    if (!select) return;

    const modelId = this.state.model;
    const manufacturer = this.state.manufacturer;
    const db = this.getDatabase();

    // Get available controllers
    let controllers = [];

    // Machine-specific controller
    if (db && db.machines && modelId) {
      const machine = db.machines[modelId];
      if (machine?.controller) {
        controllers.push({ id: machine.controller, name: machine.controller });
      }
    }
    // Manufacturer-standard controllers
    const mfrControllers = {
      'haas': ['Haas NGC', 'Haas Classic'],
      'mazak': ['Mazatrol SmoothAi', 'Mazatrol SmoothG', 'Mazatrol Matrix 2'],
      'okuma': ['OSP-P500', 'OSP-P400', 'OSP-P300'],
      'dmg': ['Siemens 840D', 'Heidenhain TNC 640', 'CELOS'],
      'fanuc': ['Fanuc 0i-TF', 'Fanuc 30i', 'Fanuc 31i'],
      'hurco': ['WinMax', 'Max 5'],
      'doosan': ['Fanuc 0i-MF', 'Fanuc 31i-B'],
      'generic': ['Fanuc 0i', 'Siemens 828D', 'Haas NGC']
    };
    if (controllers.length === 0 && manufacturer && mfrControllers[manufacturer]) {
      controllers = mfrControllers[manufacturer].map(c => ({ id: c.toLowerCase().replace(/\s+/g, '_'), name: c }));
    }
    // Fallback controllers
    if (controllers.length === 0) {
      controllers = [
        { id: 'fanuc_0i', name: 'Fanuc 0i' },
        { id: 'fanuc_30i', name: 'Fanuc 30i' },
        { id: 'siemens_840d', name: 'Siemens 840D' },
        { id: 'haas_ngc', name: 'Haas NGC' }
      ];
    }
    let html = '<option value="">Select Controller</option>';
    controllers.forEach(c => {
      html += '<option value="' + c.id + '">' + c.name + '</option>';
    });

    select.innerHTML = html;
  },
  /**
   * Update optional features section
   */
  updateFeatures() {
    const container = document.getElementById('machineFeaturesList') || document.getElementById('machineFeaturesPanel');
    if (!container) return;

    const modelId = this.state.model;
    const db = this.getDatabase();

    let features = [];

    // Get machine-specific features
    if (db && db.machines && modelId) {
      const machine = db.machines[modelId];
      if (machine?.options) {
        features = machine.options;
      } else if (machine?.features) {
        features = machine.features;
      }
    }
    // Default features by mode
    if (features.length === 0) {
      const defaultFeatures = {
        mill: [
          { id: 'probe', name: 'Tool/Work Probe', description: 'Renishaw or compatible probing system' },
          { id: 'tsc', name: 'Through-Spindle Coolant', description: 'High-pressure coolant through tool' },
          { id: '4th_axis', name: '4th Axis Rotary', description: 'Additional rotary axis' },
          { id: 'chip_conv', name: 'Chip Conveyor', description: 'Automatic chip removal system' }
        ],
        lathe: [
          { id: 'live_tool', name: 'Live Tooling', description: 'Driven tools for milling operations' },
          { id: 'subspindle', name: 'Sub-Spindle', description: 'Secondary spindle for back operations' },
          { id: 'y_axis', name: 'Y-Axis', description: 'Off-center machining capability' },
          { id: 'bar_feed', name: 'Bar Feeder', description: 'Automatic bar feeding system' }
        ]
      };
      features = defaultFeatures[this.state.mode] || defaultFeatures.mill;
    }
    // Build features UI
    let html = '';
    features.forEach(f => {
      html += '<label class="feature-checkbox" style="display: block; padding: 6px; margin: 4px 0; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;">';
      html += '<input type="checkbox" value="' + f.id + '" onchange="PRISM_UNIFIED_MACHINE_SELECTOR.toggleFeature(\'' + f.id + '\')" style="margin-right: 8px;">';
      html += '<span style="color: var(--text);">' + f.name + '</span>';
      if (f.description) {
        html += '<span style="display: block; font-size: 10px; color: var(--text-muted); margin-left: 20px;">' + f.description + '</span>';
      }
      html += '</label>';
    });

    container.innerHTML = html;
  },
  /**
   * Toggle a feature selection
   */
  toggleFeature(featureId) {
    const idx = this.state.features.indexOf(featureId);
    if (idx === -1) {
      this.state.features.push(featureId);
    } else {
      this.state.features.splice(idx, 1);
    }
    this.onMachineConfigChanged();
  },
  /**
   * Filter machines (main filter function)
   */
  filterMachines() {
    console.log('[PRISM_UNIFIED_MACHINE_SELECTOR] Filtering machines for tier:', this.state.tier);
    this.updateBrandDropdown();
    // v8.65.028: Call the actual machine filtering function
    if (typeof window.filterMachines === 'function') {
      // Use setTimeout to ensure brand dropdown is updated first
      setTimeout(() => {
        // Find the real filterMachines (not this one)
        const realFilter = window._realFilterMachines || window.filterMachines;
        if (typeof realFilter === 'function') {
          realFilter();
        }
      }, 10);
    }
  },
  /**
   * Called when machine configuration changes
   */
  onMachineConfigChanged() {
    // Dispatch event for other modules
    window.dispatchEvent(new CustomEvent('machineConfigChanged', {
      detail: {
        manufacturer: this.state.manufacturer,
        type: this.state.type,
        model: this.state.model,
        spindle: this.state.spindle,
        controller: this.state.controller,
        features: this.state.features
      }
    }));

    console.log('[PRISM_UNIFIED_MACHINE_SELECTOR] Config changed:', this.state);
  },
  /**
   * Get current machine configuration
   */
  getConfig() {
    return { ...this.state };
  },
  /**
   * Get full machine data
   */
  getMachineData() {
    const db = this.getDatabase();
    if (db && db.machines && this.state.model) {
      return db.machines[this.state.model];
    }
    return null;
  }
}