// ═══════════════════════════════════════════════════════════════════════════════
// PRISM_UNITS_ENHANCED - Extracted from PRISM v8.89 Monolith
// Source: PRISM_v8_89_002_TRUE_100_PERCENT.html
// Lines: 17773-18953 (1181 lines)
// Extracted: 2026-01-30
// Purpose: Comprehensive unit conversions
// ═══════════════════════════════════════════════════════════════════════════════

const PRISM_UNITS_ENHANCED = {
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 1: CORE CONFIGURATION
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    VERSION: '1.4.0',
    SESSION: '1.4',
    BUILD_DATE: '2026-01-18',
    
    _currentSystem: typeof PRISM_UNITS !== 'undefined' ? PRISM_UNITS._currentSystem : 'inch',
    
    get currentSystem() { return this._currentSystem; },
    set currentSystem(value) {
        if (value !== 'inch' && value !== 'metric') {
            console.warn(`[PRISM_UNITS_ENHANCED] Invalid unit system: ${value}. Use 'inch' or 'metric'.`);
            return;
        }
        this._currentSystem = value;
        this._notifySystemChange(value);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 2: COMPREHENSIVE DIMENSION DEFINITIONS (15 Dimensions)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    DIMENSIONS: Object.freeze({
        LENGTH: 'length',
        ANGLE: 'angle',
        LINEAR_VELOCITY: 'linear_velocity',
        ANGULAR_VELOCITY: 'angular_velocity',
        LINEAR_ACCELERATION: 'linear_acceleration',
        ANGULAR_ACCELERATION: 'angular_acceleration',
        FORCE: 'force',
        TORQUE: 'torque',
        PRESSURE: 'pressure',
        TEMPERATURE: 'temperature',
        TIME: 'time',
        POWER: 'power',
        ENERGY: 'energy',
        MASS: 'mass',
        VOLUME: 'volume'
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 3: INTERNAL STANDARD (Always Metric/SI base)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    INTERNAL: Object.freeze({
        length: 'mm',
        angle: 'rad',
        linear_velocity: 'mm/s',
        angular_velocity: 'rad/s',
        linear_acceleration: 'mm/s²',
        angular_acceleration: 'rad/s²',
        force: 'N',
        torque: 'N·mm',
        pressure: 'MPa',
        temperature: 'C',
        time: 's',
        power: 'W',
        energy: 'J',
        mass: 'kg',
        volume: 'mm³'
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 4: COMPREHENSIVE CONVERSION FACTORS - TO INTERNAL (75+ units)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    TO_INTERNAL: Object.freeze({
        // ═══ LENGTH (15 units) ═══
        'mm': 1, 'millimeter': 1, 'millimeters': 1,
        'cm': 10, 'centimeter': 10, 'centimeters': 10,
        'm': 1000, 'meter': 1000, 'meters': 1000,
        'km': 1000000, 'kilometer': 1000000,
        'in': 25.4, 'inch': 25.4, 'inches': 25.4, '"': 25.4,
        'ft': 304.8, 'foot': 304.8, 'feet': 304.8, "'": 304.8,
        'yd': 914.4, 'yard': 914.4, 'yards': 914.4,
        'thou': 0.0254, 'mil': 0.0254, 'mils': 0.0254,
        'µm': 0.001, 'um': 0.001, 'micron': 0.001, 'microns': 0.001,
        'nm': 0.000001, 'nanometer': 0.000001,
        
        // ═══ ANGLE (8 units) ═══
        'rad': 1, 'radian': 1, 'radians': 1,
        'deg': Math.PI / 180, 'degree': Math.PI / 180, 'degrees': Math.PI / 180, '°': Math.PI / 180,
        'arcmin': Math.PI / 10800, 'arcminute': Math.PI / 10800,
        'arcsec': Math.PI / 648000, 'arcsecond': Math.PI / 648000,
        'grad': Math.PI / 200, 'gradian': Math.PI / 200,
        'rev': 2 * Math.PI, 'revolution': 2 * Math.PI, 'turn': 2 * Math.PI,
        
        // ═══ LINEAR VELOCITY (18 units) ═══
        'mm/s': 1, 'mmps': 1, 'millimeters per second': 1,
        'mm/min': 1/60, 'mmpm': 1/60, 'millimeters per minute': 1/60,
        'm/s': 1000, 'mps': 1000, 'meters per second': 1000,
        'm/min': 1000/60, 'mpm': 1000/60, 'meters per minute': 1000/60,
        'in/s': 25.4, 'ips': 25.4, 'inches per second': 25.4,
        'in/min': 25.4/60, 'ipm': 25.4/60, 'IPM': 25.4/60, 'inches per minute': 25.4/60,
        'ft/min': 304.8/60, 'fpm': 304.8/60, 'FPM': 304.8/60, 'feet per minute': 304.8/60,
        'sfm': 304.8/60, 'SFM': 304.8/60, 'surface feet per minute': 304.8/60,
        'smm': 1/60, 'SMM': 1/60, 'surface meters per minute': 1000/60,
        'km/h': 1000000/3600, 'kph': 1000000/3600,
        'mph': 447.04, 'miles per hour': 447.04,
        
        // ═══ FEED RATE (10 units) - Special manufacturing units ═══
        'ipt': 25.4, 'IPT': 25.4, 'inches per tooth': 25.4,  // mm/tooth
        'ipr': 25.4, 'IPR': 25.4, 'inches per revolution': 25.4,  // mm/rev
        'mm/tooth': 1, 'mmpt': 1,
        'mm/rev': 1, 'mmpr': 1,
        
        // ═══ ANGULAR VELOCITY (8 units) ═══
        'rad/s': 1, 'rps': 2 * Math.PI, 'radians per second': 1,
        'deg/s': Math.PI / 180, 'degrees per second': Math.PI / 180,
        'rpm': Math.PI / 30, 'RPM': Math.PI / 30, 'revolutions per minute': Math.PI / 30,
        'rph': Math.PI / 1800, 'revolutions per hour': Math.PI / 1800,
        
        // ═══ LINEAR ACCELERATION (6 units) ═══
        'mm/s²': 1, 'mm/s^2': 1, 'millimeters per second squared': 1,
        'm/s²': 1000, 'm/s^2': 1000,
        'in/s²': 25.4, 'in/s^2': 25.4,
        'g': 9810, 'G': 9810, 'standard gravity': 9810,
        'ft/s²': 304.8, 'ft/s^2': 304.8,
        
        // ═══ ANGULAR ACCELERATION (4 units) ═══
        'rad/s²': 1, 'rad/s^2': 1,
        'deg/s²': Math.PI / 180, 'deg/s^2': Math.PI / 180,
        'rpm/s': Math.PI / 30,
        
        // ═══ FORCE (10 units) ═══
        'N': 1, 'newton': 1, 'newtons': 1,
        'kN': 1000, 'kilonewton': 1000, 'kilonewtons': 1000,
        'MN': 1000000, 'meganewton': 1000000,
        'mN': 0.001, 'millinewton': 0.001,
        'lbf': 4.44822, 'lb': 4.44822, 'pound-force': 4.44822, 'pounds': 4.44822,
        'kgf': 9.80665, 'kilogram-force': 9.80665,
        'ozf': 0.278014, 'ounce-force': 0.278014,
        'dyn': 0.00001, 'dyne': 0.00001,
        
        // ═══ TORQUE (10 units) ═══
        'N·mm': 1, 'N-mm': 1, 'Nmm': 1, 'newton-millimeter': 1,
        'N·m': 1000, 'N-m': 1000, 'Nm': 1000, 'newton-meter': 1000,
        'kN·m': 1000000, 'kN-m': 1000000,
        'lbf·ft': 1355.82, 'lb-ft': 1355.82, 'ft-lbf': 1355.82, 'foot-pound': 1355.82,
        'lbf·in': 112.985, 'lb-in': 112.985, 'in-lbf': 112.985, 'inch-pound': 112.985,
        'ozf·in': 7.06155, 'oz-in': 7.06155, 'ounce-inch': 7.06155,
        'kgf·m': 9806.65, 'kg-m': 9806.65,
        'kgf·cm': 98.0665, 'kg-cm': 98.0665,
        
        // ═══ PRESSURE (15 units) ═══
        'MPa': 1, 'megapascal': 1,
        'Pa': 1e-6, 'pascal': 1e-6,
        'kPa': 1e-3, 'kilopascal': 1e-3,
        'GPa': 1000, 'gigapascal': 1000,
        'psi': 0.00689476, 'PSI': 0.00689476, 'pound per square inch': 0.00689476,
        'ksi': 6.89476, 'KSI': 6.89476, 'kilopound per square inch': 6.89476,
        'bar': 0.1, 'bars': 0.1,
        'mbar': 0.0001, 'millibar': 0.0001,
        'atm': 0.101325, 'atmosphere': 0.101325,
        'torr': 0.000133322, 'mmHg': 0.000133322,
        'inHg': 0.00338639, 'inches of mercury': 0.00338639,
        
        // ═══ TEMPERATURE (Special - handled separately) ═══
        'C': 1, '°C': 1, 'celsius': 1, 'Celsius': 1,
        // F and K handled in special function
        
        // ═══ TIME (10 units) ═══
        's': 1, 'sec': 1, 'second': 1, 'seconds': 1,
        'ms': 0.001, 'millisecond': 0.001, 'milliseconds': 0.001,
        'µs': 0.000001, 'us': 0.000001, 'microsecond': 0.000001,
        'ns': 0.000000001, 'nanosecond': 0.000000001,
        'min': 60, 'minute': 60, 'minutes': 60,
        'hr': 3600, 'hour': 3600, 'hours': 3600, 'h': 3600,
        'day': 86400, 'days': 86400,
        
        // ═══ POWER (10 units) ═══
        'W': 1, 'watt': 1, 'watts': 1,
        'kW': 1000, 'kilowatt': 1000, 'kilowatts': 1000,
        'MW': 1000000, 'megawatt': 1000000,
        'mW': 0.001, 'milliwatt': 0.001,
        'hp': 745.7, 'HP': 745.7, 'horsepower': 745.7, 'mechanical horsepower': 745.7,
        'hp(M)': 735.5, 'metric horsepower': 735.5,
        'BTU/hr': 0.293071, 'BTU per hour': 0.293071,
        'ft-lbf/s': 1.35582, 'foot-pound per second': 1.35582,
        
        // ═══ ENERGY (8 units) ═══
        'J': 1, 'joule': 1, 'joules': 1,
        'kJ': 1000, 'kilojoule': 1000,
        'MJ': 1000000, 'megajoule': 1000000,
        'Wh': 3600, 'watt-hour': 3600,
        'kWh': 3600000, 'kilowatt-hour': 3600000,
        'cal': 4.184, 'calorie': 4.184,
        'kcal': 4184, 'kilocalorie': 4184,
        'BTU': 1055.06, 'British thermal unit': 1055.06,
        'ft-lbf': 1.35582, 'foot-pound': 1.35582,
        
        // ═══ MASS (8 units) ═══
        'kg': 1, 'kilogram': 1, 'kilograms': 1,
        'g': 0.001, 'gram': 0.001, 'grams': 0.001,
        'mg': 0.000001, 'milligram': 0.000001,
        'lb': 0.453592, 'lbm': 0.453592, 'pound-mass': 0.453592,
        'oz': 0.0283495, 'ounce': 0.0283495, 'ounces': 0.0283495,
        'ton': 907.185, 'short ton': 907.185,
        'tonne': 1000, 'metric ton': 1000, 't': 1000,
        
        // ═══ VOLUME (10 units) ═══
        'mm³': 1, 'mm^3': 1, 'cubic millimeter': 1,
        'cm³': 1000, 'cm^3': 1000, 'cc': 1000, 'cubic centimeter': 1000,
        'm³': 1e9, 'm^3': 1e9, 'cubic meter': 1e9,
        'L': 1000000, 'liter': 1000000, 'litre': 1000000,
        'mL': 1000, 'ml': 1000, 'milliliter': 1000,
        'in³': 16387.1, 'in^3': 16387.1, 'cubic inch': 16387.1,
        'ft³': 28316847, 'ft^3': 28316847, 'cubic foot': 28316847,
        'gal': 3785410, 'gallon': 3785410, 'US gallon': 3785410,
        'qt': 946353, 'quart': 946353,
        'fl oz': 29573.5, 'fluid ounce': 29573.5,
        
        // ═══ MATERIAL REMOVAL RATE (4 units) ═══
        'mm³/s': 1, 'cubic mm per second': 1,
        'mm³/min': 1/60, 'cubic mm per minute': 1/60,
        'in³/min': 16387.1/60, 'cubic inch per minute': 16387.1/60,
        'cm³/min': 1000/60, 'cc per minute': 1000/60
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 5: COMPREHENSIVE CONVERSION FACTORS - FROM INTERNAL
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    FROM_INTERNAL: Object.freeze({
        // ═══ LENGTH ═══
        'mm': 1, 'cm': 0.1, 'm': 0.001, 'km': 0.000001,
        'in': 1/25.4, 'inch': 1/25.4, 'ft': 1/304.8, 'feet': 1/304.8,
        'thou': 1/0.0254, 'mil': 1/0.0254, 'µm': 1000, 'um': 1000, 'micron': 1000,
        
        // ═══ ANGLE ═══
        'rad': 1, 'deg': 180/Math.PI, 'degree': 180/Math.PI, '°': 180/Math.PI,
        'arcmin': 10800/Math.PI, 'arcsec': 648000/Math.PI,
        'rev': 1/(2*Math.PI), 'turn': 1/(2*Math.PI),
        
        // ═══ LINEAR VELOCITY ═══
        'mm/s': 1, 'mm/min': 60, 'm/s': 0.001, 'm/min': 0.06,
        'in/s': 1/25.4, 'in/min': 60/25.4, 'ipm': 60/25.4, 'IPM': 60/25.4,
        'ft/min': 60/304.8, 'fpm': 60/304.8, 'sfm': 60/304.8, 'SFM': 60/304.8,
        
        // ═══ FEED RATE ═══
        'ipt': 1/25.4, 'IPT': 1/25.4, 'ipr': 1/25.4, 'IPR': 1/25.4,
        'mm/tooth': 1, 'mm/rev': 1,
        
        // ═══ ANGULAR VELOCITY ═══
        'rad/s': 1, 'deg/s': 180/Math.PI,
        'rpm': 30/Math.PI, 'RPM': 30/Math.PI,
        
        // ═══ FORCE ═══
        'N': 1, 'kN': 0.001, 'mN': 1000,
        'lbf': 1/4.44822, 'lb': 1/4.44822, 'kgf': 1/9.80665,
        
        // ═══ TORQUE ═══
        'N·mm': 1, 'N-mm': 1, 'Nmm': 1,
        'N·m': 0.001, 'N-m': 0.001, 'Nm': 0.001,
        'lbf·ft': 1/1355.82, 'lb-ft': 1/1355.82, 'ft-lbf': 1/1355.82,
        'lbf·in': 1/112.985, 'lb-in': 1/112.985, 'in-lbf': 1/112.985,
        
        // ═══ PRESSURE ═══
        'MPa': 1, 'Pa': 1e6, 'kPa': 1000, 'GPa': 0.001,
        'psi': 1/0.00689476, 'PSI': 1/0.00689476,
        'ksi': 1/6.89476, 'bar': 10, 'atm': 1/0.101325,
        
        // ═══ TIME ═══
        's': 1, 'ms': 1000, 'µs': 1000000, 'min': 1/60, 'hr': 1/3600, 'h': 1/3600,
        
        // ═══ POWER ═══
        'W': 1, 'kW': 0.001, 'MW': 0.000001,
        'hp': 1/745.7, 'HP': 1/745.7,
        
        // ═══ ENERGY ═══
        'J': 1, 'kJ': 0.001, 'Wh': 1/3600, 'kWh': 1/3600000,
        
        // ═══ MASS ═══
        'kg': 1, 'g': 1000, 'mg': 1000000,
        'lb': 1/0.453592, 'lbm': 1/0.453592, 'oz': 1/0.0283495,
        
        // ═══ VOLUME ═══
        'mm³': 1, 'cm³': 0.001, 'cc': 0.001, 'm³': 1e-9,
        'L': 0.000001, 'mL': 0.001, 'in³': 1/16387.1, 'ft³': 1/28316847,
        'gal': 1/3785410,
        
        // ═══ MRR ═══
        'mm³/s': 1, 'mm³/min': 60, 'in³/min': 60/16387.1, 'cm³/min': 60/1000
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 6: UNIT METADATA (For auto-detection and smart inference)
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    UNIT_METADATA: Object.freeze({
        'mm':   { dimension: 'length', symbol: 'mm', name: 'millimeter', system: 'metric' },
        'in':   { dimension: 'length', symbol: 'in', name: 'inch', system: 'imperial' },
        'ft':   { dimension: 'length', symbol: 'ft', name: 'foot', system: 'imperial' },
        'm':    { dimension: 'length', symbol: 'm', name: 'meter', system: 'metric' },
        'deg':  { dimension: 'angle', symbol: '°', name: 'degree', system: 'universal' },
        'rad':  { dimension: 'angle', symbol: 'rad', name: 'radian', system: 'universal' },
        'ipm':  { dimension: 'linear_velocity', symbol: 'IPM', name: 'inches per minute', system: 'imperial' },
        'sfm':  { dimension: 'linear_velocity', symbol: 'SFM', name: 'surface feet per minute', system: 'imperial' },
        'rpm':  { dimension: 'angular_velocity', symbol: 'RPM', name: 'revolutions per minute', system: 'universal' },
        'N':    { dimension: 'force', symbol: 'N', name: 'newton', system: 'metric' },
        'lbf':  { dimension: 'force', symbol: 'lbf', name: 'pound-force', system: 'imperial' },
        'MPa':  { dimension: 'pressure', symbol: 'MPa', name: 'megapascal', system: 'metric' },
        'psi':  { dimension: 'pressure', symbol: 'psi', name: 'pounds per square inch', system: 'imperial' },
        'hp':   { dimension: 'power', symbol: 'hp', name: 'horsepower', system: 'imperial' },
        'kW':   { dimension: 'power', symbol: 'kW', name: 'kilowatt', system: 'metric' },
        'C':    { dimension: 'temperature', symbol: '°C', name: 'Celsius', system: 'metric' },
        'F':    { dimension: 'temperature', symbol: '°F', name: 'Fahrenheit', system: 'imperial' }
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 7: PREFERRED UNITS BY DIMENSION AND SYSTEM
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    PREFERRED_UNITS: Object.freeze({
        inch: {
            length: 'in',
            angle: 'deg',
            linear_velocity: 'ipm',
            cutting_speed: 'sfm',
            angular_velocity: 'rpm',
            linear_acceleration: 'in/s²',
            angular_acceleration: 'deg/s²',
            force: 'lbf',
            torque: 'ft-lbf',
            pressure: 'psi',
            temperature: 'F',
            time: 's',
            power: 'hp',
            energy: 'BTU',
            mass: 'lb',
            volume: 'in³',
            feed_rate: 'ipt',
            mrr: 'in³/min'
        },
        metric: {
            length: 'mm',
            angle: 'deg',
            linear_velocity: 'mm/min',
            cutting_speed: 'm/min',
            angular_velocity: 'rpm',
            linear_acceleration: 'mm/s²',
            angular_acceleration: 'rad/s²',
            force: 'N',
            torque: 'N·m',
            pressure: 'MPa',
            temperature: 'C',
            time: 's',
            power: 'kW',
            energy: 'J',
            mass: 'kg',
            volume: 'mm³',
            feed_rate: 'mm/tooth',
            mrr: 'cm³/min'
        }
    }),
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 8: CORE CONVERSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Convert value TO internal units (metric base)
     * @param {number} value - Input value
     * @param {string} fromUnit - Source unit
     * @returns {number} Value in internal units
     */
    toInternal: function(value, fromUnit) {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'number' || !isFinite(value)) {
            console.warn(`[PRISM_UNITS_ENHANCED] toInternal received invalid value:`, value);
            return NaN;
        }
        
        // Temperature special handling
        if (fromUnit === 'F' || fromUnit === '°F' || fromUnit === 'fahrenheit') {
            return (value - 32) * 5/9;
        }
        if (fromUnit === 'K' || fromUnit === 'kelvin') {
            return value - 273.15;
        }
        
        const factor = this.TO_INTERNAL[fromUnit];
        if (factor === undefined) {
            console.warn(`[PRISM_UNITS_ENHANCED] Unknown input unit: ${fromUnit}, returning as-is`);
            return value;
        }
        return value * factor;
    },
    
    /**
     * Convert value FROM internal units (metric base)
     * @param {number} value - Internal value
     * @param {string} toUnit - Target unit
     * @returns {number} Value in target units
     */
    fromInternal: function(value, toUnit) {
        if (value === null || value === undefined) return value;
        if (typeof value !== 'number' || !isFinite(value)) {
            console.warn(`[PRISM_UNITS_ENHANCED] fromInternal received invalid value:`, value);
            return NaN;
        }
        
        // Temperature special handling
        if (toUnit === 'F' || toUnit === '°F' || toUnit === 'fahrenheit') {
            return value * 9/5 + 32;
        }
        if (toUnit === 'K' || toUnit === 'kelvin') {
            return value + 273.15;
        }
        
        const factor = this.FROM_INTERNAL[toUnit];
        if (factor === undefined) {
            console.warn(`[PRISM_UNITS_ENHANCED] Unknown output unit: ${toUnit}, returning as-is`);
            return value;
        }
        return value * factor;
    },
    
    /**
     * Convert value from one unit to another
     * @param {number} value - Input value
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {number} Converted value
     */
    convert: function(value, fromUnit, toUnit) {
        if (fromUnit === toUnit) return value;
        return this.fromInternal(this.toInternal(value, fromUnit), toUnit);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 9: BATCH CONVERSION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Convert array of values TO internal units
     * @param {number[]} values - Input values array
     * @param {string} fromUnit - Source unit
     * @returns {number[]} Values in internal units
     */
    batchToInternal: function(values, fromUnit) {
        if (!Array.isArray(values)) {
            console.warn('[PRISM_UNITS_ENHANCED] batchToInternal requires array');
            return [];
        }
        return values.map(v => this.toInternal(v, fromUnit));
    },
    
    /**
     * Convert array of values FROM internal units
     * @param {number[]} values - Internal values array
     * @param {string} toUnit - Target unit
     * @returns {number[]} Values in target units
     */
    batchFromInternal: function(values, toUnit) {
        if (!Array.isArray(values)) {
            console.warn('[PRISM_UNITS_ENHANCED] batchFromInternal requires array');
            return [];
        }
        return values.map(v => this.fromInternal(v, toUnit));
    },
    
    /**
     * Convert array from one unit to another
     * @param {number[]} values - Input values array
     * @param {string} fromUnit - Source unit
     * @param {string} toUnit - Target unit
     * @returns {number[]} Converted values
     */
    batchConvert: function(values, fromUnit, toUnit) {
        if (fromUnit === toUnit) return [...values];
        return values.map(v => this.convert(v, fromUnit, toUnit));
    },
    
    /**
     * Convert object properties with units
     * @param {Object} obj - Object with numeric properties
     * @param {Object} unitMap - Map of property names to their units
     * @param {string} targetSystem - 'internal' or 'inch' or 'metric'
     * @returns {Object} Converted object
     */
    convertObject: function(obj, unitMap, targetSystem = 'internal') {
        const result = { ...obj };
        for (const [prop, unit] of Object.entries(unitMap)) {
            if (result[prop] !== undefined && typeof result[prop] === 'number') {
                if (targetSystem === 'internal') {
                    result[prop] = this.toInternal(result[prop], unit);
                } else {
                    const targetUnit = this.getPreferredUnit(this.getDimension(unit), targetSystem);
                    result[prop] = this.convert(result[prop], unit, targetUnit);
                }
            }
        }
        return result;
    },
    
    /**
     * Convert point/vector coordinates
     * @param {Object} point - {x, y, z} or {x, y, z, a, b, c}
     * @param {string} fromUnit - Source unit for linear dimensions
     * @param {string} toUnit - Target unit for linear dimensions
     * @param {string} angleFromUnit - Source unit for angular dimensions (optional)
     * @param {string} angleToUnit - Target unit for angular dimensions (optional)
     * @returns {Object} Converted point
     */
    convertPoint: function(point, fromUnit, toUnit, angleFromUnit = 'deg', angleToUnit = 'deg') {
        const result = {};
        const linearKeys = ['x', 'y', 'z', 'X', 'Y', 'Z'];
        const angularKeys = ['a', 'b', 'c', 'A', 'B', 'C'];
        
        for (const key of linearKeys) {
            if (point[key] !== undefined) {
                result[key] = this.convert(point[key], fromUnit, toUnit);
            }
        }
        for (const key of angularKeys) {
            if (point[key] !== undefined) {
                result[key] = this.convert(point[key], angleFromUnit, angleToUnit);
            }
        }
        
        // Copy any other properties
        for (const [key, value] of Object.entries(point)) {
            if (result[key] === undefined) {
                result[key] = value;
            }
        }
        
        return result;
    },
    
    /**
     * Convert array of points
     */
    convertPoints: function(points, fromUnit, toUnit, angleFromUnit = 'deg', angleToUnit = 'deg') {
        return points.map(p => this.convertPoint(p, fromUnit, toUnit, angleFromUnit, angleToUnit));
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 10: SMART DETECTION AND INFERENCE
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Get the dimension category for a unit
     */
    getDimension: function(unit) {
        // Direct lookup in metadata
        if (this.UNIT_METADATA[unit]) {
            return this.UNIT_METADATA[unit].dimension;
        }
        
        // Pattern-based detection
        const patterns = {
            length: /^(mm|cm|m|km|in|inch|ft|feet|thou|mil|µm|um|micron)$/i,
            angle: /^(deg|degree|rad|radian|°|arcmin|arcsec|rev)$/i,
            linear_velocity: /^(mm\/s|mm\/min|m\/s|m\/min|in\/s|in\/min|ipm|fpm|sfm|mph|kph)$/i,
            angular_velocity: /^(rad\/s|deg\/s|rpm)$/i,
            force: /^(N|newton|kN|lbf|lb|kgf|ozf)$/i,
            torque: /^(N[·-]?mm?|Nm|lb[f]?[·-]?(ft|in)|ft-lb|in-lb|oz-in)$/i,
            pressure: /^(MPa|Pa|kPa|GPa|psi|ksi|bar|atm|torr)$/i,
            temperature: /^(C|°C|F|°F|K|celsius|fahrenheit|kelvin)$/i,
            time: /^(s|sec|second|ms|µs|us|min|minute|hr|hour|h)$/i,
            power: /^(W|kW|MW|hp|HP)$/i,
            mass: /^(kg|g|mg|lb|lbm|oz|ton|tonne)$/i,
            volume: /^(mm³|cm³|m³|cc|L|mL|in³|ft³|gal)$/i
        };
        
        for (const [dim, pattern] of Object.entries(patterns)) {
            if (pattern.test(unit)) return dim;
        }
        
        return 'unknown';
    },
    
    /**
     * Get preferred unit for a dimension in current or specified system
     */
    getPreferredUnit: function(dimension, system = null) {
        system = system || this._currentSystem;
        const prefs = this.PREFERRED_UNITS[system] || this.PREFERRED_UNITS.inch;
        return prefs[dimension] || dimension;
    },
    
    /**
     * Auto-detect unit from a string with value
     */
    parseWithUnit: function(input, defaultUnit = null) {
        if (typeof input === 'number') {
            const unit = defaultUnit || this.getPreferredUnit('length');
            return { value: this.toInternal(input, unit), unit, internal: true };
        }
        
        if (typeof input === 'string') {
            const match = input.trim().match(/^([-+]?\d*\.?\d+(?:[eE][-+]?\d+)?)\s*(.*)$/);
            if (match) {
                const value = parseFloat(match[1]);
                const unitStr = match[2].trim() || defaultUnit || this.getPreferredUnit('length');
                return { 
                    value: this.toInternal(value, unitStr), 
                    unit: unitStr, 
                    internal: true,
                    original: value
                };
            }
        }
        
        return { value: NaN, unit: 'unknown', internal: false };
    },
    
    /**
     * Parse multiple values with units
     */
    parseMultiple: function(inputs, defaultUnits = {}) {
        const results = {};
        for (const [key, input] of Object.entries(inputs)) {
            results[key] = this.parseWithUnit(input, defaultUnits[key]);
        }
        return results;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 11: FORMATTING AND DISPLAY
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Format value for display with appropriate precision
     */
    format: function(value, dimension, precision = null, system = null) {
        system = system || this._currentSystem;
        const unit = this.getPreferredUnit(dimension, system);
        const converted = this.fromInternal(value, unit);
        
        // Auto-precision based on unit
        if (precision === null) {
            precision = this._getDefaultPrecision(unit, dimension);
        }
        
        const formatted = converted.toFixed(precision);
        return `${formatted} ${this._getDisplaySymbol(unit)}`;
    },
    
    /**
     * Format for G-code output
     */
    formatGCode: function(value, dimension, gcodeUnits = null) {
        gcodeUnits = gcodeUnits || this._currentSystem;
        const outputInch = gcodeUnits === 'inch';
        
        switch (dimension) {
            case 'length':
                const lengthUnit = outputInch ? 'in' : 'mm';
                const lengthPrecision = outputInch ? 4 : 3;
                return this.fromInternal(value, lengthUnit).toFixed(lengthPrecision);
            
            case 'linear_velocity':
            case 'feed':
                const feedUnit = outputInch ? 'ipm' : 'mm/min';
                const feedPrecision = outputInch ? 1 : 0;
                return this.fromInternal(value, feedUnit).toFixed(feedPrecision);
            
            case 'angle':
                return this.fromInternal(value, 'deg').toFixed(3);
            
            case 'angular_velocity':
            case 'speed':
                return this.fromInternal(value, 'rpm').toFixed(0);
            
            default:
                return value.toString();
        }
    },
    
    /**
     * Format with engineering notation for very small/large values
     */
    formatEngineering: function(value, dimension, system = null) {
        system = system || this._currentSystem;
        const unit = this.getPreferredUnit(dimension, system);
        const converted = this.fromInternal(value, unit);
        
        if (Math.abs(converted) < 0.001 || Math.abs(converted) > 100000) {
            return `${converted.toExponential(3)} ${this._getDisplaySymbol(unit)}`;
        }
        return this.format(value, dimension, null, system);
    },
    
    _getDefaultPrecision: function(unit, dimension) {
        const precisions = {
            'in': 4, 'inch': 4, 'ft': 3, 'mm': 3, 'cm': 2, 'm': 4,
            'deg': 3, '°': 3, 'rad': 6,
            'ipm': 1, 'sfm': 0, 'mm/min': 0, 'm/min': 2,
            'rpm': 0, 'RPM': 0,
            'N': 2, 'lbf': 2, 'kN': 3,
            'MPa': 3, 'psi': 1, 'GPa': 4,
            'C': 1, 'F': 1,
            's': 3, 'min': 2,
            'kW': 3, 'hp': 2,
            'kg': 3, 'lb': 2
        };
        return precisions[unit] || 3;
    },
    
    _getDisplaySymbol: function(unit) {
        const symbols = {
            'deg': '°', 'degree': '°',
            'in': '"', 'inch': '"',
            'ft': "'", 'feet': "'",
            'C': '°C', 'celsius': '°C',
            'F': '°F', 'fahrenheit': '°F'
        };
        return symbols[unit] || unit;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 12: MANUFACTURING-SPECIFIC FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Convert cutting speed (SFM/m/min) to RPM given tool diameter
     * @param {number} cuttingSpeed - Cutting speed in internal units (mm/s)
     * @param {number} diameter - Tool diameter in internal units (mm)
     * @returns {number} RPM
     */
    cuttingSpeedToRPM: function(cuttingSpeed, diameter) {
        if (diameter <= 0) {
            console.warn('[PRISM_UNITS_ENHANCED] Invalid diameter for RPM calculation');
            return 0;
        }
        // V = π * D * N / 60000 (where V in mm/s, D in mm, N in RPM)
        // N = V * 60 / (π * D)
        return (cuttingSpeed * 60) / (Math.PI * diameter);
    },
    
    /**
     * Convert RPM to cutting speed given tool diameter
     * @param {number} rpm - Spindle speed in RPM
     * @param {number} diameter - Tool diameter in internal units (mm)
     * @returns {number} Cutting speed in internal units (mm/s)
     */
    rpmToCuttingSpeed: function(rpm, diameter) {
        // V = π * D * N / 60
        return (Math.PI * diameter * rpm) / 60;
    },
    
    /**
     * Calculate chip load from feedrate, RPM, and number of flutes
     * @param {number} feedrate - Feed rate in internal units (mm/s)
     * @param {number} rpm - Spindle speed in RPM
     * @param {number} flutes - Number of cutting flutes
     * @returns {number} Chip load in mm/tooth
     */
    calculateChipLoad: function(feedrate, rpm, flutes) {
        if (rpm <= 0 || flutes <= 0) return 0;
        // CL = F / (N * z) where F in mm/min, N in RPM, z is flutes
        return (feedrate * 60) / (rpm * flutes);
    },
    
    /**
     * Calculate feedrate from chip load, RPM, and number of flutes
     * @param {number} chipLoad - Chip load in mm/tooth
     * @param {number} rpm - Spindle speed in RPM
     * @param {number} flutes - Number of cutting flutes
     * @returns {number} Feed rate in internal units (mm/s)
     */
    calculateFeedrate: function(chipLoad, rpm, flutes) {
        // F = CL * N * z / 60 (result in mm/s)
        return (chipLoad * rpm * flutes) / 60;
    },
    
    /**
     * Calculate material removal rate
     * @param {number} feedrate - Feed rate in mm/s
     * @param {number} doc - Depth of cut in mm
     * @param {number} woc - Width of cut in mm
     * @returns {number} MRR in mm³/s
     */
    calculateMRR: function(feedrate, doc, woc) {
        return feedrate * doc * woc;
    },
    
    /**
     * Convert complete cutting parameters between systems
     */
    convertCuttingParams: function(params, fromSystem, toSystem) {
        const result = { ...params };
        
        if (params.speed !== undefined) {
            const speedUnit = fromSystem === 'inch' ? 'sfm' : 'm/min';
            const targetSpeedUnit = toSystem === 'inch' ? 'sfm' : 'm/min';
            result.speed = this.convert(params.speed, speedUnit, targetSpeedUnit);
        }
        
        if (params.feed !== undefined) {
            const feedUnit = fromSystem === 'inch' ? 'ipt' : 'mm/tooth';
            const targetFeedUnit = toSystem === 'inch' ? 'ipt' : 'mm/tooth';
            result.feed = this.convert(params.feed, feedUnit, targetFeedUnit);
        }
        
        if (params.doc !== undefined) {
            const docUnit = fromSystem === 'inch' ? 'in' : 'mm';
            const targetDocUnit = toSystem === 'inch' ? 'in' : 'mm';
            result.doc = this.convert(params.doc, docUnit, targetDocUnit);
        }
        
        if (params.woc !== undefined) {
            const wocUnit = fromSystem === 'inch' ? 'in' : 'mm';
            const targetWocUnit = toSystem === 'inch' ? 'in' : 'mm';
            result.woc = this.convert(params.woc, wocUnit, targetWocUnit);
        }
        
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 13: INTEGRATION HOOKS FOR PRISM SYSTEMS
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    /**
     * Create unit-aware wrapper for database accessor
     */
    createDatabaseWrapper: function(database, unitMapping) {
        return {
            get: (id, outputSystem = null) => {
                const data = database.get ? database.get(id) : database[id];
                if (!data) return null;
                
                outputSystem = outputSystem || this._currentSystem;
                return this._convertDataToSystem(data, unitMapping, outputSystem);
            },
            getInternal: (id) => {
                const data = database.get ? database.get(id) : database[id];
                if (!data) return null;
                return this._convertDataToInternal(data, unitMapping);
            }
        };
    },
    
    /**
     * Create unit-aware wrapper for calculation engine
     */
    createEngineWrapper: function(engine, inputUnitMap, outputUnitMap) {
        const self = this;
        return {
            calculate: function(params, inputSystem = null, outputSystem = null) {
                inputSystem = inputSystem || self._currentSystem;
                outputSystem = outputSystem || inputSystem;
                
                // Convert inputs to internal
                const internalParams = self._convertDataToInternal(params, inputUnitMap, inputSystem);
                
                // Run calculation
                const result = engine.calculate(internalParams);
                
                // Convert outputs to requested system
                return self._convertDataToSystem(result, outputUnitMap, outputSystem);
            },
            calculateInternal: function(params) {
                return engine.calculate(params);
            }
        };
    },
    
    _convertDataToInternal: function(data, unitMapping, fromSystem = 'inch') {
        if (!data || typeof data !== 'object') return data;
        
        const result = Array.isArray(data) ? [] : {};
        
        for (const [key, value] of Object.entries(data)) {
            if (unitMapping[key] && typeof value === 'number') {
                const unit = typeof unitMapping[key] === 'string' 
                    ? unitMapping[key] 
                    : unitMapping[key][fromSystem];
                result[key] = this.toInternal(value, unit);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this._convertDataToInternal(value, unitMapping, fromSystem);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    },
    
    _convertDataToSystem: function(data, unitMapping, toSystem = 'inch') {
        if (!data || typeof data !== 'object') return data;
        
        const result = Array.isArray(data) ? [] : {};
        
        for (const [key, value] of Object.entries(data)) {
            if (unitMapping[key] && typeof value === 'number') {
                const dimension = typeof unitMapping[key] === 'string' 
                    ? this.getDimension(unitMapping[key])
                    : unitMapping[key].dimension;
                const unit = this.getPreferredUnit(dimension, toSystem);
                result[key] = this.fromInternal(value, unit);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = this._convertDataToSystem(value, unitMapping, toSystem);
            } else {
                result[key] = value;
            }
        }
        
        return result;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 14: EVENT SYSTEM FOR UNIT CHANGES
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    _listeners: [],
    
    onSystemChange: function(callback) {
        this._listeners.push(callback);
        return () => {
            const idx = this._listeners.indexOf(callback);
            if (idx > -1) this._listeners.splice(idx, 1);
        };
    },
    
    _notifySystemChange: function(newSystem) {
        console.log(`[PRISM_UNITS_ENHANCED] Unit system changed to: ${newSystem}`);
        for (const listener of this._listeners) {
            try {
                listener(newSystem);
            } catch (e) {
                console.error('[PRISM_UNITS_ENHANCED] Error in system change listener:', e);
            }
        }
        
        // Publish to event bus if available
        if (typeof PRISM_EVENT_BUS !== 'undefined') {
            PRISM_EVENT_BUS.publish('units:changed', { system: newSystem });
        }
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 15: GATEWAY ROUTES REGISTRATION
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    registerGatewayRoutes: function() {
        if (typeof PRISM_GATEWAY === 'undefined') {
            console.warn('[PRISM_UNITS_ENHANCED] PRISM_GATEWAY not available, skipping route registration');
            return;
        }
        
        const routes = [
            // Core conversion routes
            ['units.toInternal', 'PRISM_UNITS_ENHANCED', 'toInternal'],
            ['units.fromInternal', 'PRISM_UNITS_ENHANCED', 'fromInternal'],
            ['units.convert', 'PRISM_UNITS_ENHANCED', 'convert'],
            
            // Batch conversion routes
            ['units.batch.toInternal', 'PRISM_UNITS_ENHANCED', 'batchToInternal'],
            ['units.batch.fromInternal', 'PRISM_UNITS_ENHANCED', 'batchFromInternal'],
            ['units.batch.convert', 'PRISM_UNITS_ENHANCED', 'batchConvert'],
            
            // Object/point conversion routes
            ['units.convertObject', 'PRISM_UNITS_ENHANCED', 'convertObject'],
            ['units.convertPoint', 'PRISM_UNITS_ENHANCED', 'convertPoint'],
            ['units.convertPoints', 'PRISM_UNITS_ENHANCED', 'convertPoints'],
            
            // Parsing routes
            ['units.parse', 'PRISM_UNITS_ENHANCED', 'parseWithUnit'],
            ['units.parseMultiple', 'PRISM_UNITS_ENHANCED', 'parseMultiple'],
            
            // Formatting routes
            ['units.format', 'PRISM_UNITS_ENHANCED', 'format'],
            ['units.formatGCode', 'PRISM_UNITS_ENHANCED', 'formatGCode'],
            ['units.formatEngineering', 'PRISM_UNITS_ENHANCED', 'formatEngineering'],
            
            // Manufacturing-specific routes
            ['units.mfg.speedToRPM', 'PRISM_UNITS_ENHANCED', 'cuttingSpeedToRPM'],
            ['units.mfg.rpmToSpeed', 'PRISM_UNITS_ENHANCED', 'rpmToCuttingSpeed'],
            ['units.mfg.chipLoad', 'PRISM_UNITS_ENHANCED', 'calculateChipLoad'],
            ['units.mfg.feedrate', 'PRISM_UNITS_ENHANCED', 'calculateFeedrate'],
            ['units.mfg.mrr', 'PRISM_UNITS_ENHANCED', 'calculateMRR'],
            ['units.mfg.convertParams', 'PRISM_UNITS_ENHANCED', 'convertCuttingParams'],
            
            // Utility routes
            ['units.getDimension', 'PRISM_UNITS_ENHANCED', 'getDimension'],
            ['units.getPreferred', 'PRISM_UNITS_ENHANCED', 'getPreferredUnit'],
            ['units.createWrapper', 'PRISM_UNITS_ENHANCED', 'createEngineWrapper'],
            ['units.createDBWrapper', 'PRISM_UNITS_ENHANCED', 'createDatabaseWrapper']
        ];
        
        let registered = 0;
        for (const [route, module, method] of routes) {
            if (PRISM_GATEWAY.registerAuthority(route, module, method)) {
                registered++;
            }
        }
        
        console.log(`[PRISM_UNITS_ENHANCED] Registered ${registered}/${routes.length} gateway routes`);
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 16: VALIDATION AND SELF-TEST
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    validate: function() {
        const results = {
            tests: [],
            passed: 0,
            failed: 0
        };
        
        const addResult = (name, pass, details = '') => {
            results.tests.push({ name, pass, details });
            pass ? results.passed++ : results.failed++;
        };
        
        // Test 1: Length conversion roundtrip (inch → mm → inch)
        const inch1 = 1;
        const mm1 = this.toInternal(inch1, 'in');
        const inch2 = this.fromInternal(mm1, 'in');
        addResult('Length inch roundtrip', Math.abs(inch1 - inch2) < 1e-10, `1 in → ${mm1} mm → ${inch2.toFixed(10)} in`);
        
        // Test 2: Temperature conversion F → C → F
        const f1 = 212;
        const c1 = this.toInternal(f1, 'F');
        const f2 = this.fromInternal(c1, 'F');
        addResult('Temperature F roundtrip', Math.abs(f1 - f2) < 1e-10, `${f1}°F → ${c1}°C → ${f2.toFixed(2)}°F`);
        
        // Test 3: Feed rate conversion IPM → mm/s → IPM
        const ipm1 = 100;
        const mms1 = this.toInternal(ipm1, 'ipm');
        const ipm2 = this.fromInternal(mms1, 'ipm');
        addResult('Feed rate IPM roundtrip', Math.abs(ipm1 - ipm2) < 1e-6, `${ipm1} IPM → ${mms1.toFixed(4)} mm/s → ${ipm2.toFixed(4)} IPM`);
        
        // Test 4: Torque conversion ft-lbf → N·mm → ft-lbf
        const ftlbf1 = 10;
        const nmm1 = this.toInternal(ftlbf1, 'ft-lbf');
        const ftlbf2 = this.fromInternal(nmm1, 'ft-lbf');
        addResult('Torque ft-lbf roundtrip', Math.abs(ftlbf1 - ftlbf2) < 1e-8, `${ftlbf1} ft-lbf → ${nmm1.toFixed(2)} N·mm → ${ftlbf2.toFixed(6)} ft-lbf`);
        
        // Test 5: Power conversion HP → W → HP
        const hp1 = 5;
        const w1 = this.toInternal(hp1, 'hp');
        const hp2 = this.fromInternal(w1, 'hp');
        addResult('Power HP roundtrip', Math.abs(hp1 - hp2) < 1e-8, `${hp1} HP → ${w1.toFixed(2)} W → ${hp2.toFixed(6)} HP`);
        
        // Test 6: Batch conversion
        const batch1 = [1, 2, 3, 4, 5];
        const batchMm = this.batchToInternal(batch1, 'in');
        const batch2 = this.batchFromInternal(batchMm, 'in');
        const batchPass = batch1.every((v, i) => Math.abs(v - batch2[i]) < 1e-10);
        addResult('Batch conversion', batchPass, `[${batch1.join(',')}] in → mm → [${batch2.map(v => v.toFixed(4)).join(',')}] in`);
        
        // Test 7: Point conversion
        const pt1 = { x: 1, y: 2, z: 3 };
        const pt2 = this.convertPoint(pt1, 'in', 'mm');
        const pt3 = this.convertPoint(pt2, 'mm', 'in');
        const ptPass = Math.abs(pt1.x - pt3.x) < 1e-10 && Math.abs(pt1.y - pt3.y) < 1e-10 && Math.abs(pt1.z - pt3.z) < 1e-10;
        addResult('Point conversion', ptPass, `{x:1,y:2,z:3} in → mm → {x:${pt3.x.toFixed(4)},y:${pt3.y.toFixed(4)},z:${pt3.z.toFixed(4)}} in`);
        
        // Test 8: Manufacturing RPM calculation
        const cuttingSpeed = this.toInternal(300, 'sfm'); // 300 SFM
        const diameter = this.toInternal(0.5, 'in');      // 0.5" diameter
        const rpm = this.cuttingSpeedToRPM(cuttingSpeed, diameter);
        const expectedRpm = (300 * 12) / (Math.PI * 0.5); // Classic formula
        addResult('RPM calculation', Math.abs(rpm - expectedRpm) < 1, `300 SFM, 0.5" dia → ${rpm.toFixed(0)} RPM (expected ~${expectedRpm.toFixed(0)})`);
        
        // Test 9: Chip load calculation
        const feedInternal = this.toInternal(20, 'ipm'); // 20 IPM
        const testRpm = 1000;
        const flutes = 4;
        const chipLoad = this.calculateChipLoad(feedInternal, testRpm, flutes);
        const chipLoadInch = this.fromInternal(chipLoad, 'ipt');
        const expectedCL = 20 / (1000 * 4); // 0.005 IPT
        addResult('Chip load calculation', Math.abs(chipLoadInch - expectedCL) < 1e-8, `20 IPM, 1000 RPM, 4 flutes → ${chipLoadInch.toFixed(6)} IPT (expected ${expectedCL})`);
        
        // Test 10: Dimension detection
        const dim1 = this.getDimension('psi');
        const dim2 = this.getDimension('sfm');
        const dim3 = this.getDimension('ft-lbf');
        addResult('Dimension detection', dim1 === 'pressure' && dim2 === 'linear_velocity' && dim3 === 'torque', 
            `psi→${dim1}, sfm→${dim2}, ft-lbf→${dim3}`);
        
        return results;
    },
    
    runSelfTest: function() {
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║    PRISM_UNITS_ENHANCED SESSION 1.4 - TRUE MAXIMUM COVERAGE SELF-TEST     ║');
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
        
        const results = this.validate();
        
        for (const test of results.tests) {
            console.log(`${test.pass ? '✅' : '❌'} ${test.name}: ${test.details}`);
        }
        
        console.log('');
        console.log(`═══════════════════════════════════════════════════════════════════════════`);
        console.log(`PRISM_UNITS_ENHANCED TESTS: ${results.passed}/${results.passed + results.failed} passed`);
        console.log(`═══════════════════════════════════════════════════════════════════════════`);
        
        return results;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════════════
    // SECTION 17: STATISTICS AND COVERAGE REPORT
    // ═══════════════════════════════════════════════════════════════════════════════════
    
    getStatistics: function() {
        const toInternalCount = Object.keys(this.TO_INTERNAL).length;
        const fromInternalCount = Object.keys(this.FROM_INTERNAL).length;
        const dimensionCount = Object.keys(this.DIMENSIONS).length;
        const metadataCount = Object.keys(this.UNIT_METADATA).length;
        
        return {
            version: this.VERSION,
            session: this.SESSION,
            build_date: this.BUILD_DATE,
            unit_conversions: {
                to_internal: toInternalCount,
                from_internal: fromInternalCount,
                total_unique: new Set([...Object.keys(this.TO_INTERNAL), ...Object.keys(this.FROM_INTERNAL)]).size
            },
            dimensions: dimensionCount,
            metadata_entries: metadataCount,
            preferred_units: {
                inch_system: Object.keys(this.PREFERRED_UNITS.inch).length,
                metric_system: Object.keys(this.PREFERRED_UNITS.metric).length
            },
            features: [
                'Batch conversion (arrays)',
                'Point/vector conversion',
                'Object property conversion',
                'Smart unit parsing',
                'Dimension auto-detection',
                'Manufacturing calculations (RPM, chip load, MRR)',
                'G-code formatting',
                'Engineering notation',
                'Database wrapper creation',
                'Engine wrapper creation',
                'Event system for unit changes',
                'Gateway route registration (25 routes)',
                'Self-validation test suite'
            ],
            coverage_targets: {
                databases: '53 DATABASE modules can use unit wrappers',
                engines: '228 ENGINE modules can use unit wrappers',
                total_modules: '969 modules with unit-aware access'
            }
        };
    },
    
    printStatistics: function() {
        const stats = this.getStatistics();
        console.log('');
        console.log('╔════════════════════════════════════════════════════════════════════════════╗');
        console.log('║        PRISM_UNITS_ENHANCED SESSION 1.4 - COVERAGE STATISTICS             ║');
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Version: ${stats.version.padEnd(64)}║`);
        console.log(`║  Session: ${stats.session.padEnd(64)}║`);
        console.log(`║  Build:   ${stats.build_date.padEnd(64)}║`);
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log(`║  Unit Conversions:                                                         ║`);
        console.log(`║    TO_INTERNAL:   ${String(stats.unit_conversions.to_internal).padEnd(55)}║`);
        console.log(`║    FROM_INTERNAL: ${String(stats.unit_conversions.from_internal).padEnd(55)}║`);
        console.log(`║    Total Unique:  ${String(stats.unit_conversions.total_unique).padEnd(55)}║`);
        console.log(`║  Dimensions:      ${String(stats.dimensions).padEnd(55)}║`);
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  Features:                                                                 ║');
        for (const feature of stats.features) {
            console.log(`║    ✓ ${feature.padEnd(68)}║`);
        }
        console.log('╠════════════════════════════════════════════════════════════════════════════╣');
        console.log('║  Coverage Targets:                                                         ║');
        console.log(`║    ${stats.coverage_targets.databases.padEnd(70)}║`);
        console.log(`║    ${stats.coverage_targets.engines.padEnd(70)}║`);
        console.log(`║    ${stats.coverage_targets.total_modules.padEnd(70)}║`);
        console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    }
};
