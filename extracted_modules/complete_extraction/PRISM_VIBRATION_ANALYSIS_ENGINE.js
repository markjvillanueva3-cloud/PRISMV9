const PRISM_VIBRATION_ANALYSIS_ENGINE = {
    name: 'PRISM_VIBRATION_ANALYSIS_ENGINE',
    version: '1.0.0',
    source: 'MIT 16.07, Altintas Manufacturing Automation',
    
    // ═══════════════════════════════════════════════════════════════════════════
    // SINGLE DOF VIBRATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Calculate natural frequency and related parameters for SDOF system
     * @param {Object} params - {mass, stiffness, damping}
     * @returns {Object} System characteristics
     */
    sdofNaturalFrequency: function(params) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        
        // Undamped natural frequency
        const omega_n = Math.sqrt(k / m);
        const f_n = omega_n / (2 * Math.PI);
        
        // Damping ratio
        const c_critical = 2 * Math.sqrt(k * m);
        const zeta = c / c_critical;
        
        // Damped natural frequency
        const omega_d = omega_n * Math.sqrt(Math.max(0, 1 - zeta * zeta));
        const f_d = omega_d / (2 * Math.PI);
        
        // Logarithmic decrement
        const delta = zeta < 1 ? 2 * Math.PI * zeta / Math.sqrt(1 - zeta * zeta) : null;
        
        // Quality factor
        const Q = zeta > 0 ? 1 / (2 * zeta) : Infinity;
        
        // Period
        const T_n = 1 / f_n;
        const T_d = zeta < 1 ? 1 / f_d : null;
        
        return {
            undampedNaturalFreq_rad: omega_n,
            undampedNaturalFreq_Hz: f_n,
            dampedNaturalFreq_rad: omega_d,
            dampedNaturalFreq_Hz: f_d,
            dampingRatio: zeta,
            criticalDamping: c_critical,
            logarithmicDecrement: delta,
            qualityFactor: Q,
            period_undamped: T_n,
            period_damped: T_d,
            systemType: zeta < 1 ? 'underdamped' : zeta === 1 ? 'critically_damped' : 'overdamped'
        };
    },
    
    /**
     * Free vibration response of SDOF system
     * @param {Object} params - System parameters
     * @param {Object} initial - {x0, v0} initial conditions
     * @param {number} t - Time
     * @returns {Object} Position and velocity
     */
    sdofFreeResponse: function(params, initial, t) {
        const { mass: m, stiffness: k, damping: c = 0 } = params;
        const { x0 = 0, v0 = 0 } = initial;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        
        let x, v;
        
        if (zeta < 1) {
            // Underdamped
            const omega_d = omega_n * Math.sqrt(1 - zeta * zeta);
            const A = x0;
            const B = (v0 + zeta * omega_n * x0) / omega_d;
            
            const envelope = Math.exp(-zeta * omega_n * t);
            x = envelope * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t));
            v = envelope * (
                -zeta * omega_n * (A * Math.cos(omega_d * t) + B * Math.sin(omega_d * t)) +
                omega_d * (-A * Math.sin(omega_d * t) + B * Math.cos(omega_d * t))
            );
        } else if (zeta === 1) {
            // Critically damped
            const A = x0;
            const B = v0 + omega_n * x0;
            x = (A + B * t) * Math.exp(-omega_n * t);
            v = (B - omega_n * (A + B * t)) * Math.exp(-omega_n * t);
        } else {
            // Overdamped
            const s1 = -omega_n * (zeta - Math.sqrt(zeta * zeta - 1));
            const s2 = -omega_n * (zeta + Math.sqrt(zeta * zeta - 1));
            const A = (v0 - s2 * x0) / (s1 - s2);
            const B = (s1 * x0 - v0) / (s1 - s2);
            x = A * Math.exp(s1 * t) + B * Math.exp(s2 * t);
            v = A * s1 * Math.exp(s1 * t) + B * s2 * Math.exp(s2 * t);
        }
        
        return { position: x, velocity: v };
    },
    
    /**
     * Forced vibration response (harmonic excitation)
     * @param {Object} system - {mass, stiffness, damping}
     * @param {Object} excitation - {amplitude, frequency}
     * @returns {Object} Steady-state response
     */
    sdofForcedResponse: function(system, excitation) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        const { amplitude: F0, frequency: omega } = excitation;
        
        const omega_n = Math.sqrt(k / m);
        const zeta = c / (2 * Math.sqrt(k * m));
        const r = omega / omega_n; // Frequency ratio
        
        // Steady-state amplitude
        const X = (F0 / k) / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Phase angle
        const phi = Math.atan2(2 * zeta * r, 1 - r * r);
        
        // Magnification factor
        const MF = X / (F0 / k);
        
        // Transmissibility (force transmitted to base)
        const TR = Math.sqrt(1 + Math.pow(2 * zeta * r, 2)) / 
                   Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(2 * zeta * r, 2));
        
        // Power dissipated
        const P_dissipated = 0.5 * c * X * X * omega * omega;
        
        return {
            amplitude: X,
            phase_rad: phi,
            phase_deg: phi * 180 / Math.PI,
            magnificationFactor: MF,
            transmissibility: TR,
            frequencyRatio: r,
            dampingRatio: zeta,
            isResonant: Math.abs(r - 1) < 0.1,
            peakResponseFreq: omega_n * Math.sqrt(1 - 2 * zeta * zeta),
            powerDissipated: P_dissipated,
            response: (t) => X * Math.cos(omega * t - phi)
        };
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // FREQUENCY RESPONSE FUNCTION (FRF)
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Compute FRF (compliance) for SDOF system
     * G(jω) = 1 / (k - mω² + jcω)
     */
    computeFRF: function(system, omega) {
        const { mass: m, stiffness: k, damping: c = 0 } = system;
        
        const real = k - m * omega * omega;
        const imag = c * omega;
        const denominator = real * real + imag * imag;
        
        const G_real = real / denominator;
        const G_imag = -imag / denominator;
        const magnitude = 1 / Math.sqrt(denominator);
        const phase = -Math.atan2(imag, real);
        
        return {
            real: G_real,
            imaginary: G_imag,
            magnitude,
            phase_rad: phase,
            phase_deg: phase * 180 / Math.PI,
            frequency_rad: omega,
            frequency_Hz: omega / (2 * Math.PI)
        };
    },
    
    /**
     * Generate FRF data over frequency range
     */
    generateFRFData: function(system, freqRange) {
        const { start, end, points } = freqRange;
        const data = [];
        
        for (let i = 0; i < points; i++) {
            const freq = start + (end - start) * i / (points - 1);
            const omega = 2 * Math.PI * freq;
            const frf = this.computeFRF(system, omega);
            data.push({
                frequency_Hz: freq,
                ...frf
            });
        }
        
        // Find resonance peak
        const peak = data.reduce((max, d) => d.magnitude > max.magnitude ? d : max);
        
        return {
            data,
            resonanceFreq: peak.frequency_Hz,
            peakMagnitude: peak.magnitude,
            halfPowerBandwidth: this._calculateHalfPowerBandwidth(data, peak)
        };
    },
    
    _calculateHalfPowerBandwidth: function(data, peak) {
        const halfPower = peak.magnitude / Math.sqrt(2);
        let f1 = null, f2 = null;
        
        for (let i = 1; i < data.length; i++) {
            if (!f1 && data[i].magnitude >= halfPower && data[i-1].magnitude < halfPower) {
                f1 = data[i].frequency_Hz;
            }
            if (f1 && data[i].magnitude < halfPower && data[i-1].magnitude >= halfPower) {
                f2 = data[i].frequency_Hz;
                break;
            }
        }
        
        return f1 && f2 ? f2 - f1 : null;
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // MULTI-DOF MODAL ANALYSIS
    // ═══════════════════════════════════════════════════════════════════════════
    
    /**
     * Modal analysis for multi-DOF system
     * Solve eigenvalue problem: [K - ω²M]φ = 0
     * @param {Array} M - Mass matrix (n×n)
     * @param {Array} K - Stiffness matrix (n×n)
     * @returns {Object} Natural frequencies and mode shapes
     */
    modalAnalysis: function(M, K) {
        const n = M.length;
        
        // Use inverse power iteration with shifting for multiple modes
        const modes = [];
        const frequencies = [];
        
        // Find all eigenvalues using QR iteration (simplified)
        const eigenData = this._qrEigenvalues(M, K);
        
        // Sort by frequency
        eigenData.sort((a, b) => a.frequency - b.frequency);
        
        // Extract modal mass and stiffness
        for (let i = 0; i < eigenData.length; i++) {
            const phi = eigenData[i].modeShape;
            
            // Modal mass: m_i = φ_i^T * M * φ_i
            const modalMass = this._quadraticForm(phi, M, phi);
            
            // Modal stiffness: k_i = φ_i^T * K * φ_i
            const modalStiffness = this._quadraticForm(phi, K, phi);
            
            // Normalize mode shape
            const norm = Math.sqrt(phi.reduce((s, p) => s + p * p, 0));
            const normalizedPhi = phi.map(p => p / norm);
            
            // Mass-normalize: φ such that φ^T * M * φ = 1
            const massNormalizedPhi = phi.map(p => p / Math.sqrt(modalMass));
            
            modes.push({
                modeNumber: i + 1,
                frequency_rad: eigenData[i].omega,
                frequency_Hz: eigenData[i].frequency,
                modeShape: normalizedPhi,
                massNormalizedModeShape: massNormalizedPhi,
                modalMass,
                modalStiffness,
                participationFactor: this._participationFactor(normalizedPhi, M)
            });
        }
        
        return {
            numberOfModes: modes.length,
            modes,
            massMatrix: M,
            stiffnessMatrix: K
        };
    },
    
    _qrEigenvalues: function(M, K) {
        const n = M.length;
        const results = [];
        
        // Power iteration for each eigenvalue (simplified)
        for (let mode = 0; mode < n; mode++) {
            // Initial guess
            let v = Array(n).fill(0);
            v[mode] = 1;
            
            // Add some randomness to break symmetry
            v = v.map(x => x + 0.01 * (Math.random() - 0.5));
            
            // Solve K*x = λ*M*x iteratively
            for (let iter = 0; iter < 50; iter++) {
                // y = K^-1 * M * v (inverse iteration)
                const Mv = this._matVecMul(M, v);
                const y = this._solveSystem(K, Mv);
                
                // Rayleigh quotient
                const vMv = this._dotProduct(v, Mv);
                const vKv = this._dotProduct(v, this._matVecMul(K, v));
                const lambda = vKv / vMv;
                
                // Normalize
                const norm = Math.sqrt(y.reduce((s, yi) => s + yi * yi, 0));
                v = y.map(yi => yi / norm);
            }
            
            // Final eigenvalue
            const Mv = this._matVecMul(M, v);
            const Kv = this._matVecMul(K, v);
            const lambda = this._dotProduct(v, Kv) / this._dotProduct(v, Mv);
            const omega = Math.sqrt(Math.abs(lambda));
            
            results.push({
                omega,
                frequency: omega / (2 * Math.PI),
                modeShape: v
            });
        }
        
        return results;
    },
    
    _matVecMul: function(A, v) {
        return A.map(row => row.reduce((sum, a, j) => sum + a * v[j], 0));
    },
    
    _dotProduct: function(a, b) {
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    
    _quadraticForm: function(v, M, w) {
        const Mw = this._matVecMul(M, w);
        return this._dotProduct(v, Mw);
    },
    
    _solveSystem: function(A, b) {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            if (Math.abs(aug[i][i]) < 1e-12) aug[i][i] = 1e-12;
            
            for (let k = i + 1; k < n; k++) {
                const factor = aug[k][i] / aug[i][i];
                for (let j = i; j <= n; j++) aug[k][j] -= factor * aug[i][j];
            }
        }
        
        const x = Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) x[i] -= aug[i][j] * x[j];
            x[i] /= aug[i][i];
        }
        
        return x;
    },
    
    _participationFactor: function(phi, M) {
        // Participation factor for seismic/base excitation
        const ones = Array(phi.length).fill(1);
        const numerator = this._dotProduct(phi, this._matVecMul(M, ones));
        const denominator = this._dotProduct(phi, this._matVecMul(M, phi));
        return numerator / denominator;
    },
    
    // Gateway registration
    register: function() {
        if (typeof PRISM_GATEWAY !== 'undefined') {
            PRISM_GATEWAY.register('vibration.sdof.natural', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofNaturalFrequency');
            PRISM_GATEWAY.register('vibration.sdof.freeResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofFreeResponse');
            PRISM_GATEWAY.register('vibration.sdof.forcedResponse', 'PRISM_VIBRATION_ANALYSIS_ENGINE.sdofForcedResponse');
            PRISM_GATEWAY.register('vibration.frf.compute', 'PRISM_VIBRATION_ANALYSIS_ENGINE.computeFRF');
            PRISM_GATEWAY.register('vibration.frf.generate', 'PRISM_VIBRATION_ANALYSIS_ENGINE.generateFRFData');
            PRISM_GATEWAY.register('vibration.modal.analysis', 'PRISM_VIBRATION_ANALYSIS_ENGINE.modalAnalysis');
            console.log('[PRISM] PRISM_VIBRATION_ANALYSIS_ENGINE registered: 6 routes');
        }
    }
}