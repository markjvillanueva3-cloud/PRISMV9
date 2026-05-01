/**
 * PRISM_THERMAL_COMPENSATION
 * Extracted from PRISM v8.89.002 monolith
 * References: 10
 * Category: thermal
 * Lines: 197
 * Session: R2.3.4 Formula Extraction
 */

const PRISM_THERMAL_COMPENSATION = {
    name: 'Predictive Thermal Compensation',
    sources: ['MIT 6.241J', 'MIT 2.810'],
    patentClaim: 'Kalman filter-based thermal error prediction for CNC machine compensation',
    
    /**
     * Create thermal compensation system
     */
    createSystem: function(config = {}) {
        const {
            numSensors = 5,
            thermalTimeConstant = 1800,  // seconds
            ambientTemp = 20
        } = config;
        
        // State: [T1, T2, ..., Tn, dT1/dt, dT2/dt, ..., dTn/dt]
        const stateDim = numSensors * 2;
        
        return {
            // Kalman filter
            x: Array(stateDim).fill(ambientTemp).map((v, i) => i < numSensors ? v : 0),
            P: this._eye(stateDim, 1.0),
            Q: this._eye(stateDim, 0.01),
            R: this._eye(numSensors, 0.5),
            
            // Thermal model parameters
            thermalTimeConstant,
            ambientTemp,
            numSensors,
            
            // Error model coefficients (to be calibrated)
            errorCoeffs: {
                x: Array(numSensors).fill(0.001),  // mm/°C
                y: Array(numSensors).fill(0.001),
                z: Array(numSensors).fill(0.002)
            },
            
            // History
            history: []
        };
    },
    
    /**
     * Update with new temperature readings
     */
    update: function(system, temperatures, dt = 1.0) {
        const n = system.numSensors;
        
        // State transition matrix (thermal dynamics)
        const tau = system.thermalTimeConstant;
        const F = this._eye(n * 2, 1);
        for (let i = 0; i < n; i++) {
            F[i][n + i] = dt;
            F[n + i][n + i] = Math.exp(-dt / tau);
        }
        
        // Predict
        const x_pred = this._matVec(F, system.x);
        const P_pred = this._addMat(
            this._matMul(this._matMul(F, system.P), this._transpose(F)),
            system.Q
        );
        
        // Measurement matrix (observe temperatures)
        const H = Array(n).fill(null).map((_, i) => {
            const row = Array(n * 2).fill(0);
            row[i] = 1;
            return row;
        });
        
        // Kalman gain
        const S = this._addMat(
            this._matMul(this._matMul(H, P_pred), this._transpose(H)),
            system.R
        );
        const K = this._matMul(this._matMul(P_pred, this._transpose(H)), this._invertMat(S));
        
        // Update
        const y = temperatures.map((t, i) => t - x_pred[i]);
        const Ky = this._matVec(K, y);
        system.x = x_pred.map((v, i) => v + Ky[i]);
        
        const IKH = this._addMat(
            this._eye(n * 2, 1),
            this._scaleMat(this._matMul(K, H), -1)
        );
        system.P = this._matMul(IKH, P_pred);
        
        // Store history
        system.history.push({
            time: Date.now(),
            temperatures: [...temperatures],
            state: [...system.x]
        });
        
        return this._predictError(system);
    },
    
    /**
     * Predict thermal error in X, Y, Z
     */
    _predictError: function(system) {
        const temps = system.x.slice(0, system.numSensors);
        const tempRates = system.x.slice(system.numSensors);
        
        // Calculate temperature deviations from ambient
        const deltaT = temps.map(t => t - system.ambientTemp);
        
        // Predict errors using linear model
        const errorX = deltaT.reduce((sum, dt, i) => sum + dt * system.errorCoeffs.x[i], 0);
        const errorY = deltaT.reduce((sum, dt, i) => sum + dt * system.errorCoeffs.y[i], 0);
        const errorZ = deltaT.reduce((sum, dt, i) => sum + dt * system.errorCoeffs.z[i], 0);
        
        // Predict future error (using temperature rates)
        const predictTime = 300; // 5 minutes ahead
        const futureErrorX = errorX + tempRates.reduce((sum, dr, i) => 
            sum + dr * predictTime * system.errorCoeffs.x[i], 0);
        const futureErrorY = errorY + tempRates.reduce((sum, dr, i) => 
            sum + dr * predictTime * system.errorCoeffs.y[i], 0);
        const futureErrorZ = errorZ + tempRates.reduce((sum, dr, i) => 
            sum + dr * predictTime * system.errorCoeffs.z[i], 0);
        
        return {
            currentError: { x: errorX, y: errorY, z: errorZ },
            predictedError: { x: futureErrorX, y: futureErrorY, z: futureErrorZ },
            compensation: { x: -errorX, y: -errorY, z: -errorZ },
            temperatures: temps,
            temperatureRates: tempRates,
            confidence: this._calculateConfidence(system)
        };
    },
    
    _calculateConfidence: function(system) {
        const tracePdiag = system.P.reduce((sum, row, i) => sum + row[i], 0);
        return Math.max(0, 1 - tracePdiag / (system.numSensors * 2));
    },
    
    _eye: function(n, scale = 1) {
        return Array(n).fill(null).map((_, i) => 
            Array(n).fill(0).map((_, j) => i === j ? scale : 0)
        );
    },
    
    _matVec: function(M, v) {
        return M.map(row => row.reduce((sum, m, j) => sum + m * v[j], 0));
    },
    
    _matMul: function(A, B) {
        const m = A.length, n = B[0].length, k = B.length;
        return Array(m).fill(null).map((_, i) =>
            Array(n).fill(null).map((_, j) =>
                A[i].reduce((sum, a, l) => sum + a * B[l][j], 0)
            )
        );
    },
    
    _transpose: function(M) {
        return M[0].map((_, j) => M.map(row => row[j]));
    },
    
    _addMat: function(A, B) {
        return A.map((row, i) => row.map((v, j) => v + B[i][j]));
    },
    
    _scaleMat: function(M, s) {
        return M.map(row => row.map(v => v * s));
    },
    
    _invertMat: function(A) {
        // Simplified 2x2 or use Gauss-Jordan for larger
        const n = A.length;
        if (n === 1) return [[1 / A[0][0]]];
        
        // Gauss-Jordan elimination
        const aug = A.map((row, i) => [...row, ...Array(n).fill(0).map((_, j) => i === j ? 1 : 0)]);
        
        for (let i = 0; i < n; i++) {
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > Math.abs(aug[maxRow][i])) maxRow = k;
            }
            [aug[i], aug[maxRow]] = [aug[maxRow], aug[i]];
            
            const pivot = aug[i][i] || 1e-10;
            for (let j = i; j < 2 * n; j++) aug[i][j] /= pivot;
            
            for (let k = 0; k < n; k++) {
                if (k !== i) {
                    const factor = aug[k][i];
                    for (let j = i; j < 2 * n; j++) aug[k][j] -= factor * aug[i][j];
                }
            }
        }
        
        return aug.map(row => row.slice(n));
    }
}