// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_UNITS - Extracted from PRISM v8.89 Monolith
// Source: PRISM_v8_89_002_TRUE_100_PERCENT.html
// Lines: 11738-11882 (145 lines)
// Extracted: 2026-01-30
// Purpose: Core unit system
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_UNITS = {
    _currentSystem: 'inch',  // DEFAULT TO INCH per user preference

    get currentSystem() { return this._currentSystem; },
    set currentSystem(value) {
        if (value !== 'inch' && value !== 'metric') {
            console.warn(`[PRISM_UNITS] Invalid unit system: ${value}. Use 'inch' or 'metric'.`);
            return;
        }
        this._currentSystem = value;
        console.log(`[PRISM_UNITS] Unit system set to: ${value}`);
    },
    // Internal standard (ALWAYS metric)
    INTERNAL: Object.freeze({
        length: 'mm',
        angle: 'rad',
        velocity: 'mm/s',
        angularVelocity: 'rad/s',
        acceleration: 'mm/s²',
        force: 'N',
        torque: 'N·mm',
        temperature: 'C',
        pressure: 'MPa',
        time: 's'
    }),

    // Conversion factors TO internal units
    TO_INTERNAL: Object.freeze({
        'mm': 1, 'cm': 10, 'm': 1000,
        'in': 25.4, 'inch': 25.4, 'inches': 25.4, '"': 25.4,
        'ft': 304.8, 'feet': 304.8,
        'thou': 0.0254, 'mil': 0.0254,
        'rad': 1, 'radian': 1, 'radians': 1,
        'deg': Math.PI / 180, 'degree': Math.PI / 180, 'degrees': Math.PI / 180, '°': Math.PI / 180,
        'mm/s': 1, 'mm/min': 1/60, 'mmpm': 1/60,
        'm/s': 1000, 'm/min': 1000/60,
        'in/s': 25.4, 'in/min': 25.4/60, 'inch/min': 25.4/60,
        'ipm': 25.4/60, 'IPM': 25.4/60,
        'ft/min': 304.8/60, 'fpm': 304.8/60, 'sfm': 304.8/60,
        'rad/s': 1, 'deg/s': Math.PI / 180,
        'rpm': Math.PI / 30, 'RPM': Math.PI / 30,
        'mm/s²': 1, 'mm/s^2': 1, 'm/s²': 1000, 'in/s²': 25.4, 'g': 9810,
        'N': 1, 'newton': 1, 'kN': 1000, 'lbf': 4.44822, 'lb': 4.44822, 'ozf': 0.278014,
        'C': 1, '°C': 1, 'celsius': 1,
        'MPa': 1, 'Pa': 1e-6, 'kPa': 1e-3, 'GPa': 1000,
        'psi': 0.00689476, 'PSI': 0.00689476, 'ksi': 6.89476,
        'bar': 0.1, 'atm': 0.101325,
        's': 1, 'sec': 1, 'second': 1, 'ms': 0.001, 'min': 60, 'minute': 60, 'hr': 3600, 'hour': 3600
    }),

    // Conversion factors FROM internal units
    FROM_INTERNAL: Object.freeze({
        'mm': 1, 'cm': 0.1, 'm': 0.001,
        'in': 1/25.4, 'inch': 1/25.4, 'inches': 1/25.4, '"': 1/25.4,
        'ft': 1/304.8, 'thou': 1/0.0254, 'mil': 1/0.0254,
        'rad': 1, 'deg': 180 / Math.PI, 'degree': 180 / Math.PI, '°': 180 / Math.PI,
        'mm/s': 1, 'mm/min': 60, 'mmpm': 60, 'm/min': 0.06,
        'in/min': 60/25.4, 'ipm': 60/25.4, 'IPM': 60/25.4,
        'rad/s': 1, 'deg/s': 180 / Math.PI,
        'rpm': 30 / Math.PI, 'RPM': 30 / Math.PI,
        'N': 1, 'lbf': 1/4.44822, 'lb': 1/4.44822,
        'C': 1, '°C': 1,
        'MPa': 1, 'psi': 1/0.00689476, 'PSI': 1/0.00689476, 'ksi': 1/6.89476,
        's': 1, 'min': 1/60, 'ms': 1000
    }),

    toInternal: function(value, fromUnit) {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'number') {
            console.warn(`[PRISM_UNITS] toInternal received non-number:`, value);
            return value;
        }
        if (fromUnit === 'F' || fromUnit === '°F') return (value - 32) * 5/9;
        if (fromUnit === 'K') return value - 273.15;
        const factor = this.TO_INTERNAL[fromUnit];
        if (factor === undefined) {
            console.warn(`[PRISM_UNITS] Unknown input unit: ${fromUnit}, assuming internal`);
            return value;
        }
        return value * factor;
    },
    fromInternal: function(value, toUnit) {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'number') {
            console.warn(`[PRISM_UNITS] fromInternal received non-number:`, value);
            return value;
        }
        if (toUnit === 'F' || toUnit === '°F') return value * 9/5 + 32;
        if (toUnit === 'K') return value + 273.15;
        const factor = this.FROM_INTERNAL[toUnit];
        if (factor === undefined) {
            console.warn(`[PRISM_UNITS] Unknown output unit: ${toUnit}, assuming internal`);
            return value;
        }
        return value * factor;
    },
    convert: function(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;
        return this.fromInternal(this.toInternal(value, fromUnit), toUnit);
    },
    getPreferredUnit: function(dimension) {
        const inchUnits = { length: 'in', velocity: 'ipm', angle: 'deg', angularVelocity: 'rpm', force: 'lbf', pressure: 'psi', temperature: 'F' };
        const metricUnits = { length: 'mm', velocity: 'mm/min', angle: 'deg', angularVelocity: 'rpm', force: 'N', pressure: 'MPa', temperature: 'C' };
        return (this._currentSystem === 'inch' ? inchUnits : metricUnits)[dimension] || dimension;
    },
    format: function(value, dimension, precision = null) {
        const unit = this.getPreferredUnit(dimension);
        const converted = this.fromInternal(value, unit);
        if (precision === null) precision = (unit === 'in' || unit === 'inch') ? 4 : 3;
        return `${converted.toFixed(precision)} ${unit}`;
    },
    formatGCode: function(value, dimension, gcodeUnits = null) {
        const outputInch = gcodeUnits === 'inch' || (gcodeUnits === null && this._currentSystem === 'inch');
        if (dimension === 'length') {
            const unit = outputInch ? 'in' : 'mm';
            const precision = outputInch ? 4 : 3;
            return this.fromInternal(value, unit).toFixed(precision);
        }
        if (dimension === 'velocity') {
            const unit = outputInch ? 'ipm' : 'mm/min';
            const precision = outputInch ? 1 : 0;
            return this.fromInternal(value, unit).toFixed(precision);
        }
        if (dimension === 'angle') {
            return this.fromInternal(value, 'deg').toFixed(3);
        }
        return value.toString();
    },
    parseWithUnit: function(input, defaultUnit = null) {
        if (typeof input === 'number') {
            const unit = defaultUnit || this.getPreferredUnit('length');
            return this.toInternal(input, unit);
        }
        if (typeof input === 'string') {
            const match = input.trim().match(/^([-+]?\d*\.?\d+)\s*(.*)$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unit = match[2].trim() || defaultUnit || this.getPreferredUnit('length');
                return this.toInternal(value, unit);
            }
        }
        console.warn(`[PRISM_UNITS] Could not parse input:`, input);
        return null;
    }
};
