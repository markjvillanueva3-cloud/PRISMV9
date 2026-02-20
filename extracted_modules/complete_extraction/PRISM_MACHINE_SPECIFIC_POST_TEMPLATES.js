const PRISM_MACHINE_SPECIFIC_POST_TEMPLATES = {
  version: '1.0.0',
  lastUpdated: '2026-01-06',

  // HAAS MACHINES (NGC Controller)
  haas: {
    vf_series: {
      controller: 'NGC',
      dialect: 'HAAS_NGC',
      features: {
        rigidTapping: { code: 'G84', reversal: 'automatic' },
        highSpeedMachining: { code: 'G187', modes: ['P1', 'P2', 'P3'] },
        probing: { available: true, cycles: ['G65 P9810', 'G65 P9811', 'G65 P9812'] },
        workOffsets: { standard: ['G54', 'G55', 'G56', 'G57', 'G58', 'G59'],
                       extended: ['G110-G129', 'G154 P1-P99'] },
        toolSetting: { code: 'G37', automatic: true },
        coolant: { flood: 'M8', mist: 'M7', thruSpindle: 'M88', off: 'M9' },
        chipConveyor: { forward: 'M31', reverse: 'M32', off: 'M33' }
      },
      formatting: {
        lineNumbers: true,
        lineIncrement: 5,
        decimals: { linear: 4, angular: 3, feed: 1 },
        modalGCodes: true,
        blockSkip: '/',
        optionalStop: 'M1'
      },
      safeStart: `G00 G17 G40 G49 G80 G90
G28 G91 Z0.
G28 X0. Y0.
G90`,
      safeEnd: `M5
M9
G28 G91 Z0.
G28 X0. Y0.
G90
M30`,
      machineSpecific: {
        maxRPM: { vf1: 8100, vf2: 8100, vf3: 8100, vf4: 8100 },
        tableSizeX: { vf1: 26, vf2: 36, vf3: 40, vf4: 52 },
        tableSizeY: { vf1: 14, vf2: 14, vf3: 20, vf4: 20 },
        toolChanger: { vf1: 20, vf2: 20, vf3: 24, vf4: 24 }
      }
    },
    umc_series: {
      controller: 'NGC',
      dialect: 'HAAS_NGC_5AXIS',
      is5Axis: true,
      kinematics: 'trunnion',
      rotaryAxes: { a: { min: -120, max: 30 }, c: { min: 0, max: 360 } },
      features: {
        tcpc: { code: 'G234', activates: true },
        dynamicWorkOffset: { code: 'G254' },
        rigidTapping: { code: 'G84', reversal: 'automatic' },
        highSpeedMachining: { code: 'G187', modes: ['P1', 'P2', 'P3'] }
      },
      safeStart: `G00 G17 G40 G49 G80 G90
G28 G91 Z0.
G28 A0. C0.
G28 X0. Y0.
G90`,
      safeEnd: `M5
M9
G234
G28 G91 Z0.
G28 A0. C0.
G28 X0. Y0.
G90
M30`
    }
  },
  // DMG MORI MACHINES (CELOS/Siemens/Fanuc)
  dmg_mori: {
    dmu_series: {
      controller: 'SIEMENS_840D',
      dialect: 'SIEMENS_840D_DMG',
      is5Axis: true,
      kinematics: 'table_table',
      rotaryAxes: { b: { min: -5, max: 110 }, c: { min: 0, max: 360 } },
      features: {
        traori: { code: 'TRAORI', deactivate: 'TRAFOOF' },
        cycleDefinition: { drilling: 'CYCLE81', peck: 'CYCLE83', tapping: 'CYCLE84' },
        toolCompensation: { length: 'G43', radius: 'G41/G42' },
        lookAhead: { code: 'G642', blocks: 100 },
        compressor: { code: 'COMPCURV', tolerance: 0.01 },
        splineInterpolation: { code: 'ASPLINE', available: true }
      },
      formatting: {
        lineNumbers: true,
        lineIncrement: 10,
        decimals: { linear: 3, angular: 3, feed: 0 },
        blockEnd: '',
        programEnd: 'M30',
        programStart: '%MPF'
      },
      safeStart: `G0 G17 G40 G49 G90
G64 G642
SUPA G0 Z0
SUPA G0 X0 Y0`,
      safeEnd: `TRAFOOF
SUPA G0 Z0
SUPA G0 X0 Y0
M5
M30`,
      machineSpecific: {
        dmu50: { maxRPM: 14000, taper: 'HSK-A63', toolChanger: 30 },
        dmu60: { maxRPM: 14000, taper: 'HSK-A63', toolChanger: 60 },
        dmu80: { maxRPM: 12000, taper: 'HSK-A63', toolChanger: 60 }
      }
    },
    ntx_series: {
      controller: 'FANUC_31i_CELOS',
      dialect: 'FANUC_31i_DMG_MILLTURN',
      isMillTurn: true,
      features: {
        milling: { cAxis: true, yAxis: true, bAxis: true },
        turret: { stations: 12, liveTools: true },
        subSpindle: { available: true, transfer: 'M130' },
        synchronization: { spindle: 'M51', turret: 'M52' }
      }
    }
  },
  // MAZAK MACHINES (Mazatrol/SmoothG/SmoothAI)
  mazak: {
    variaxis_series: {
      controller: 'MAZATROL_SMOOTH_G',
      dialect: 'MAZAK_SMOOTH_5AXIS',
      is5Axis: true,
      kinematics: 'trunnion',
      rotaryAxes: { b: { min: -30, max: 120 }, c: { min: 0, max: 360 } },
      features: {
        smoothControl: { version: 'SmoothG', aiAssist: true },
        intelligentMachining: { code: 'G61.1', available: true },
        thermalShield: { active: true },
        voiceTurning: { available: true }
      },
      conversational: {
        available: true,
        mode: 'MAZATROL',
        programTypes: ['MAZ', 'EIA']
      },
      formatting: {
        lineNumbers: true,
        lineIncrement: 10,
        decimals: { linear: 4, angular: 3, feed: 1 },
        modalGCodes: true
      }
    },
    integrex_series: {
      controller: 'MAZATROL_SMOOTH_G',
      dialect: 'MAZAK_SMOOTH_MILLTURN',
      isMillTurn: true,
      features: {
        multiTasking: { available: true },
        superposition: { code: 'G143', available: true },
        yAxisMilling: { available: true, travel: 200 },
        bAxisMilling: { available: true, range: { min: -120, max: 30 } },
        lowerTurret: { available: true, stations: 9 },
        upperTurret: { available: true, stations: 24 }
      }
    }
  },
  // OKUMA MACHINES (OSP-P300/P500)
  okuma: {
    genos_series: {
      controller: 'OSP_P300',
      dialect: 'OKUMA_OSP',
      features: {
        thermo_friendly: { active: true },
        collisionAvoidance: { code: 'G22', active: true },
        superNurbs: { code: 'G05.1', available: true },
        variableSpeedCutting: { code: 'M55', available: true }
      },
      formatting: {
        lineNumbers: false,
        decimals: { linear: 4, angular: 3, feed: 1 },
        modalGCodes: true,
        blockEnd: ';'
      },
      safeStart: `G0 G17 G40 G49 G80 G90
G28 H0
G28 H1`,
      safeEnd: `M5
M9
G28 H0
G28 H1
M30`
    },
    mu_series: {
      controller: 'OSP_P500',
      dialect: 'OKUMA_OSP_5AXIS',
      is5Axis: true,
      kinematics: 'trunnion',
      rotaryAxes: { a: { min: -120, max: 30 }, c: { min: 0, max: 360 } },
      features: {
        superNurbs: { code: 'G05.1', available: true },
        tcpc: { code: 'G169', available: true },
        machineLock: { code: 'G22', available: true }
      }
    }
  },
  // MAKINO MACHINES (Pro5/Pro6/Fanuc)
  makino: {
    a_series: {
      controller: 'MAKINO_PRO6',
      dialect: 'MAKINO_PRO6',
      features: {
        sgi: { code: 'G05.1 Q1', available: true },
        aiContour: { available: true },
        highSpeedMilling: { code: 'G05 P10000', available: true },
        inertiaActive: { available: true }
      },
      formatting: {
        lineNumbers: true,
        lineIncrement: 1,
        decimals: { linear: 4, angular: 4, feed: 1 }
      }
    },
    d_series: {
      controller: 'MAKINO_PRO6',
      dialect: 'MAKINO_PRO6_5AXIS',
      is5Axis: true,
      kinematics: 'spindle_head',
      rotaryAxes: { a: { min: -120, max: 30 }, c: { min: 0, max: 360 } }
    }
  },
  // HELPER METHODS

  /**
   * Get machine-specific post configuration
   */
  getPostConfig(manufacturer, series, model = null) {
    const mfr = this[manufacturer.toLowerCase()];
    if (!mfr) return null;

    const seriesConfig = mfr[series.toLowerCase() + '_series'];
    if (!seriesConfig) return null;

    if (model && seriesConfig.machineSpecific && seriesConfig.machineSpecific[model.toLowerCase()]) {
      return {
        ...seriesConfig,
        machineModel: seriesConfig.machineSpecific[model.toLowerCase()]
      };
    }
    return seriesConfig;
  },
  /**
   * Generate safe start block for machine
   */
  generateSafeStart(config) {
    if (config.safeStart) {
      return config.safeStart;
    }
    // Default safe start
    return `G00 G17 G40 G49 G80 G90
G28 G91 Z0.
G90`;
  },
  /**
   * Generate safe end block for machine
   */
  generateSafeEnd(config) {
    if (config.safeEnd) {
      return config.safeEnd;
    }
    return `M5
M9
G28 G91 Z0.
M30`;
  },
  /**
   * Get available features for machine
   */
  getFeatures(manufacturer, series) {
    const config = this.getPostConfig(manufacturer, series);
    return config ? config.features : {};
  },
  /**
   * Check if machine supports 5-axis
   */
  is5AxisCapable(manufacturer, series) {
    const config = this.getPostConfig(manufacturer, series);
    return config ? config.is5Axis === true : false;
  },
  /**
   * Get kinematics type
   */
  getKinematics(manufacturer, series) {
    const config = this.getPostConfig(manufacturer, series);
    return config ? config.kinematics : '3axis';
  }
}