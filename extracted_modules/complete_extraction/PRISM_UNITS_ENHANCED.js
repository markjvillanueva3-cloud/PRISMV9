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