const PRISM_DEEP_MACHINE_INTEGRATION = {
    version: '1.0.0',

    // Current selected machine
    currentMachine: null,

    /**
     * Set current machine and extract all relevant specs
     */
    setMachine(machineId) {
        let machineData = null;

        // Try COMPLETE_MACHINE_DATABASE first
        if (typeof COMPLETE_MACHINE_DATABASE !== 'undefined') {
            if (COMPLETE_MACHINE_DATABASE.machines_3axis?.[machineId]) {
                machineData = COMPLETE_MACHINE_DATABASE.machines_3axis[machineId];
            } else if (COMPLETE_MACHINE_DATABASE.machines_5axis?.[machineId]) {
                machineData = COMPLETE_MACHINE_DATABASE.machines_5axis[machineId];
            } else if (COMPLETE_MACHINE_DATABASE.lathes?.[machineId]) {
                machineData = COMPLETE_MACHINE_DATABASE.lathes[machineId];
            }
        }
        // Try unified access
        if (!machineData && typeof UNIFIED_MACHINES_ACCESS !== 'undefined') {
            machineData = UNIFIED_MACHINES_ACCESS.get(machineId);
        }
        // Try MACHINE_DATABASE
        if (!machineData && typeof MACHINE_DATABASE !== 'undefined') {
            machineData = MACHINE_DATABASE.machines?.[machineId] || MACHINE_DATABASE[machineId];
        }
        if (machineData) {
            this.currentMachine = {
                id: machineId,
                ...machineData,
                specs: this._extractSpecs(machineData)
            };
            console.log('[MACHINE_INTEGRATION] Set machine:', machineId, this.currentMachine.specs);
        } else {
            // Use defaults
            this.currentMachine = this._getDefaultMachine(machineId);
            console.log('[MACHINE_INTEGRATION] Using defaults for:', machineId);
        }
        return this.currentMachine;
    },
    /**
     * Extract key specs from machine data
     */
    _extractSpecs(data) {
        return {
            // Spindle
            maxRpm: data.spindle?.rpm || data.spindle?.maxRpm || data.maxRpm || 10000,
            minRpm: data.spindle?.minRpm || 100,
            spindlePower: data.spindle?.hp || data.spindle?.power || data.hp || 15,
            spindleTorque: data.spindle?.torque || 50, // Nm
            taper: data.spindle?.taper || data.taper || 'CAT40',

            // Rapids
            rapidX: data.rapidRate?.x || data.rapids?.x || 1000, // IPM
            rapidY: data.rapidRate?.y || data.rapids?.y || 1000,
            rapidZ: data.rapidRate?.z || data.rapids?.z || 800,

            // Travels
            travelX: data.travels?.x || data.xTravel || 30,
            travelY: data.travels?.y || data.yTravel || 16,
            travelZ: data.travels?.z || data.zTravel || 20,

            // Tool changer
            toolCapacity: data.toolChanger?.capacity || data.tools || 20,
            toolChangeTime: data.toolChanger?.time || data.toolChangeTime || 4, // seconds

            // Controller
            controller: data.controller || 'FANUC',

            // Rigidity (derived)
            rigidityClass: this._deriveRigidity(data),

            // Type
            machineType: data.type || 'VMC'
        };
    },
    /**
     * Derive rigidity class from machine data
     */
    _deriveRigidity(data) {
        const power = data.spindle?.hp || data.hp || 15;
        const taper = (data.spindle?.taper || data.taper || '').toUpperCase();

        // HSK or Capto = typically more rigid
        if (taper.includes('HSK') || taper.includes('CAPTO')) {
            if (power >= 30) return 'ultra_rigid';
            if (power >= 20) return 'heavy';
            return 'medium';
        }
        // CAT/BT
        if (taper.includes('CAT50') || taper.includes('BT50')) {
            if (power >= 40) return 'ultra_rigid';
            if (power >= 25) return 'heavy';
            return 'medium';
        }
        // CAT40/BT40
        if (power >= 25) return 'heavy';
        if (power >= 15) return 'medium';
        if (power >= 7) return 'light';
        return 'ultra_light';
    },
    /**
     * Default machine specs
     */
    _getDefaultMachine(id) {
        return {
            id: id || 'GENERIC_VMC',
            specs: {
                maxRpm: 10000,
                minRpm: 100,
                spindlePower: 15,
                spindleTorque: 50,
                taper: 'CAT40',
                rapidX: 1000,
                rapidY: 1000,
                rapidZ: 800,
                travelX: 30,
                travelY: 16,
                travelZ: 20,
                toolCapacity: 20,
                toolChangeTime: 4,
                controller: 'FANUC',
                rigidityClass: 'medium',
                machineType: 'VMC'
            }
        };
    },
    /**
     * Get current machine specs
     */
    getSpecs() {
        if (!this.currentMachine) {
            return this._getDefaultMachine().specs;
        }
        return this.currentMachine.specs;
    },
    /**
     * Apply machine limits to calculated parameters
     */
    applyLimits(params) {
        const specs = this.getSpecs();
        const adjusted = { ...params };

        // Limit RPM
        if (adjusted.rpm) {
            adjusted.rpm = Math.min(adjusted.rpm, specs.maxRpm);
            adjusted.rpm = Math.max(adjusted.rpm, specs.minRpm);
            if (adjusted.rpm !== params.rpm) {
                adjusted.rpmLimited = true;
                adjusted.originalRpm = params.rpm;
            }
        }
        // Check power requirement
        if (adjusted.power && adjusted.power > specs.spindlePower) {
            adjusted.powerExceeded = true;
            adjusted.requiredPower = adjusted.power;
            // Reduce DOC or feed to bring power in line
            const reduction = specs.spindlePower / adjusted.power;
            if (adjusted.feedRate) {
                adjusted.feedRate = Math.round(adjusted.feedRate * reduction);
                adjusted.feedReduced = true;
            }
        }
        // Apply rigidity adjustments
        if (typeof PRISM_MACHINE_RIGIDITY_SYSTEM !== 'undefined') {
            const rigidityAdj = PRISM_MACHINE_RIGIDITY_SYSTEM.adjustParams({
                sfm: adjusted.sfm || 400,
                ipt: adjusted.ipt || 0.004,
                doc: adjusted.doc || 0.1,
                woc: adjusted.woc || 0.2
            }, this.currentMachine?.id);

            adjusted.sfm = rigidityAdj.sfm;
            adjusted.ipt = rigidityAdj.ipt;
            adjusted.doc = rigidityAdj.doc;
            adjusted.woc = rigidityAdj.woc;
            adjusted.rigidityApplied = rigidityAdj.rigidityClass;
        }
        return adjusted;
    },
    /**
     * Get rapids for cycle time calculation
     */
    getRapids() {
        const specs = this.getSpecs();
        return {
            x: specs.rapidX,
            y: specs.rapidY,
            z: specs.rapidZ,
            average: (specs.rapidX + specs.rapidY + specs.rapidZ) / 3
        };
    },
    /**
     * Get tool change time
     */
    getToolChangeTime() {
        return this.getSpecs().toolChangeTime / 60; // Return in minutes
    },
    /**
     * Get controller type for G-code output
     */
    getController() {
        return this.getSpecs().controller;
    }
}