const PRISM_TIME_LOOKUP = {
    getToolChangeTime: function(machineType = 'standard') {
        const type = machineType.toLowerCase();
        if (type.includes('fast') || type.includes('high-speed')) {
            return PRISM_CONSTANTS.TIME_ESTIMATION.TOOL_CHANGE_FAST;
        }
        if (type.includes('turret') || type.includes('lathe')) {
            return PRISM_CONSTANTS.TIME_ESTIMATION.TOOL_CHANGE_TURRET;
        }
        return PRISM_CONSTANTS.TIME_ESTIMATION.TOOL_CHANGE_STANDARD;
    },
    
    getSetupTime: function(jobType = 'repeat', fixtureComplexity = 'simple') {
        let baseTime = jobType === 'first' ? 
            PRISM_CONSTANTS.TIME_ESTIMATION.SETUP_FIRST_PART :
            PRISM_CONSTANTS.TIME_ESTIMATION.SETUP_REPEAT_PART;
        
        if (fixtureComplexity === 'complex') {
            baseTime += PRISM_CONSTANTS.TIME_ESTIMATION.SETUP_FIXTURE_COMPLEX;
        } else {
            baseTime += PRISM_CONSTANTS.TIME_ESTIMATION.SETUP_FIXTURE_SIMPLE;
        }
        
        return baseTime; // minutes
    },
    
    getLoadUnloadTime: function(partSize = 'medium', method = 'manual') {
        if (method === 'robot') return PRISM_CONSTANTS.TIME_ESTIMATION.LOAD_UNLOAD_ROBOT;
        if (method === 'pallet') return PRISM_CONSTANTS.TIME_ESTIMATION.LOAD_UNLOAD_PALLET;
        
        // Manual based on size
        const size = partSize.toLowerCase();
        if (size === 'small') return PRISM_CONSTANTS.TIME_ESTIMATION.LOAD_UNLOAD_MANUAL_SMALL;
        if (size === 'large') return PRISM_CONSTANTS.TIME_ESTIMATION.LOAD_UNLOAD_MANUAL_LARGE;
        return PRISM_CONSTANTS.TIME_ESTIMATION.LOAD_UNLOAD_MANUAL_MEDIUM;
    },
    
    getEfficiencyFactor: function(machineAge = 'standard') {
        const age = machineAge.toLowerCase();
        if (age === 'new') return PRISM_CONSTANTS.TIME_ESTIMATION.MACHINE_EFFICIENCY_NEW;
        if (age === 'old') return PRISM_CONSTANTS.TIME_ESTIMATION.MACHINE_EFFICIENCY_OLD;
        return PRISM_CONSTANTS.TIME_ESTIMATION.MACHINE_EFFICIENCY_STANDARD;
    },
    
    getContingencyFactor: function(runType = 'repeat') {
        const type = runType.toLowerCase();
        if (type === 'first' || type === 'prototype') {
            return PRISM_CONSTANTS.TIME_ESTIMATION.CONTINGENCY_FIRST_RUN;
        }
        if (type === 'difficult') {
            return PRISM_CONSTANTS.TIME_ESTIMATION.CONTINGENCY_DIFFICULT;
        }
        return PRISM_CONSTANTS.TIME_ESTIMATION.CONTINGENCY_REPEAT;
    },
    
    estimateCycleTime: function(params) {
        const { cuttingTime, numToolChanges, machineType, partSize, runType } = params;
        
        const toolChangeTime = this.getToolChangeTime(machineType) * (numToolChanges || 0);
        const loadUnload = this.getLoadUnloadTime(partSize);
        const efficiency = this.getEfficiencyFactor(machineType);
        const contingency = this.getContingencyFactor(runType);
        
        const baseCycle = (cuttingTime / efficiency) + toolChangeTime + loadUnload;
        return baseCycle * contingency;
    }
}