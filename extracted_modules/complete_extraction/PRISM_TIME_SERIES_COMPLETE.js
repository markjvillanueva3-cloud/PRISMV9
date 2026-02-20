const PRISM_TIME_SERIES_COMPLETE = {
    name: 'PRISM Time Series Complete',
    version: '1.0.0',
    
    // ─────────────────────────────────────────────────────────────────────────
    // EXPONENTIAL SMOOTHING
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Simple Exponential Smoothing (SES)
     * S_t = α * Y_t + (1 - α) * S_{t-1}
     */
    simpleExponentialSmoothing: function(data, alpha = 0.3) {
        if (data.length === 0) return [];
        
        const smoothed = [data[0]];
        for (let i = 1; i < data.length; i++) {
            smoothed.push(alpha * data[i] + (1 - alpha) * smoothed[i - 1]);
        }
        return smoothed;
    },
    
    /**
     * Double Exponential Smoothing (Holt's method)
     * For data with trend
     * Level: L_t = α * Y_t + (1 - α) * (L_{t-1} + T_{t-1})
     * Trend: T_t = β * (L_t - L_{t-1}) + (1 - β) * T_{t-1}
     */
    holtSmoothing: function(data, alpha = 0.3, beta = 0.1) {
        if (data.length < 2) return { smoothed: data, level: data, trend: [0] };
        
        // Initialize
        let L = data[0];
        let T = data[1] - data[0];
        
        const level = [L];
        const trend = [T];
        const smoothed = [L];
        
        for (let i = 1; i < data.length; i++) {
            const prevL = L;
            L = alpha * data[i] + (1 - alpha) * (L + T);
            T = beta * (L - prevL) + (1 - beta) * T;
            
            level.push(L);
            trend.push(T);
            smoothed.push(L);
        }
        
        return { smoothed, level, trend };
    },
    
    /**
     * Triple Exponential Smoothing (Holt-Winters)
     * For data with trend and seasonality
     */
    holtWinters: function(data, params = {}) {
        const {
            alpha = 0.3,      // Level smoothing
            beta = 0.1,       // Trend smoothing
            gamma = 0.1,      // Seasonal smoothing
            seasonLength = 12, // Period of seasonality
            multiplicative = true
        } = params;
        
        if (data.length < seasonLength * 2) {
            return { error: 'Insufficient data for Holt-Winters' };
        }
        
        // Initialize seasonal indices from first season
        const seasonal = [];
        const firstSeasonAvg = data.slice(0, seasonLength).reduce((a, b) => a + b, 0) / seasonLength;
        
        for (let i = 0; i < seasonLength; i++) {
            seasonal.push(multiplicative ? data[i] / firstSeasonAvg : data[i] - firstSeasonAvg);
        }
        
        // Initialize level and trend
        let L = firstSeasonAvg;
        let T = (data.slice(seasonLength, 2 * seasonLength).reduce((a, b) => a + b, 0) / seasonLength - firstSeasonAvg) / seasonLength;
        
        const level = [L];
        const trend = [T];
        const fitted = [];
        
        for (let i = 0; i < data.length; i++) {
            const seasonIdx = i % seasonLength;
            
            if (i === 0) {
                fitted.push(multiplicative ? L * seasonal[seasonIdx] : L + seasonal[seasonIdx]);
                continue;
            }
            
            const prevL = L;
            const prevS = seasonal[seasonIdx];
            
            // Update level
            if (multiplicative) {
                L = alpha * (data[i] / prevS) + (1 - alpha) * (prevL + T);
            } else {
                L = alpha * (data[i] - prevS) + (1 - alpha) * (prevL + T);
            }
            
            // Update trend
            T = beta * (L - prevL) + (1 - beta) * T;
            
            // Update seasonal
            if (multiplicative) {
                seasonal[seasonIdx] = gamma * (data[i] / L) + (1 - gamma) * prevS;
            } else {
                seasonal[seasonIdx] = gamma * (data[i] - L) + (1 - gamma) * prevS;
            }
            
            level.push(L);
            trend.push(T);
            fitted.push(multiplicative ? L * seasonal[seasonIdx] : L + seasonal[seasonIdx]);
        }
        
        return {
            fitted,
            level,
            trend,
            seasonal: [...seasonal],
            
            // Forecast h steps ahead
            forecast: function(h) {
                const forecasts = [];
                for (let i = 1; i <= h; i++) {
                    const seasonIdx = (data.length + i - 1) % seasonLength;
                    const fL = L + i * T;
                    forecasts.push(multiplicative ? fL * seasonal[seasonIdx] : fL + seasonal[seasonIdx]);
                }
                return forecasts;
            }
        };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // SEASONALITY DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Detect seasonality using autocorrelation
     */
    detectSeasonality: function(data, maxPeriod = null) {
        maxPeriod = maxPeriod || Math.floor(data.length / 2);
        
        if (data.length < maxPeriod * 2) {
            return { seasonal: false, message: 'Insufficient data' };
        }
        
        // Compute autocorrelation for each lag
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0);
        
        const autocorrelations = [];
        for (let lag = 1; lag <= maxPeriod; lag++) {
            let correlation = 0;
            for (let i = lag; i < data.length; i++) {
                correlation += (data[i] - mean) * (data[i - lag] - mean);
            }
            autocorrelations.push({
                lag,
                correlation: correlation / variance
            });
        }
        
        // Find peaks in autocorrelation
        const peaks = [];
        for (let i = 1; i < autocorrelations.length - 1; i++) {
            if (autocorrelations[i].correlation > autocorrelations[i - 1].correlation &&
                autocorrelations[i].correlation > autocorrelations[i + 1].correlation &&
                autocorrelations[i].correlation > 0.2) {
                peaks.push(autocorrelations[i]);
            }
        }
        
        if (peaks.length === 0) {
            return { seasonal: false, autocorrelations };
        }
        
        // Find strongest peak
        const strongest = peaks.reduce((a, b) => a.correlation > b.correlation ? a : b);
        
        return {
            seasonal: strongest.correlation > 0.3,
            period: strongest.lag,
            strength: strongest.correlation,
            allPeaks: peaks,
            autocorrelations
        };
    },
    
    /**
     * Seasonal Decomposition (STL-like)
     * Decompose into: Trend + Seasonal + Residual
     */
    decompose: function(data, period, multiplicative = false) {
        const n = data.length;
        
        // Compute trend using centered moving average
        const trend = [];
        const halfPeriod = Math.floor(period / 2);
        
        for (let i = 0; i < n; i++) {
            if (i < halfPeriod || i >= n - halfPeriod) {
                trend.push(null);
            } else {
                let sum = 0;
                for (let j = -halfPeriod; j <= halfPeriod; j++) {
                    sum += data[i + j];
                }
                trend.push(sum / period);
            }
        }
        
        // Detrend
        const detrended = data.map((d, i) => {
            if (trend[i] === null) return null;
            return multiplicative ? d / trend[i] : d - trend[i];
        });
        
        // Average seasonal pattern
        const seasonalAvg = new Array(period).fill(0);
        const seasonalCount = new Array(period).fill(0);
        
        for (let i = 0; i < n; i++) {
            if (detrended[i] !== null) {
                seasonalAvg[i % period] += detrended[i];
                seasonalCount[i % period]++;
            }
        }
        
        for (let i = 0; i < period; i++) {
            seasonalAvg[i] = seasonalCount[i] > 0 ? seasonalAvg[i] / seasonalCount[i] : (multiplicative ? 1 : 0);
        }
        
        // Normalize seasonal component
        const seasonalMean = seasonalAvg.reduce((a, b) => a + b, 0) / period;
        const seasonal = data.map((_, i) => {
            return multiplicative ? seasonalAvg[i % period] / seasonalMean : seasonalAvg[i % period] - seasonalMean;
        });
        
        // Compute residual
        const residual = data.map((d, i) => {
            if (trend[i] === null) return null;
            if (multiplicative) {
                return d / (trend[i] * seasonal[i]);
            } else {
                return d - trend[i] - seasonal[i];
            }
        });
        
        return { trend, seasonal, residual, seasonalPattern: seasonalAvg };
    },
    
    // ─────────────────────────────────────────────────────────────────────────
    // ANOMALY DETECTION
    // ─────────────────────────────────────────────────────────────────────────
    
    /**
     * Detect anomalies using multiple methods
     */
    detectAnomalies: function(data, options = {}) {
        const {
            method = 'zscore',    // 'zscore', 'iqr', 'mad', 'isolation'
            threshold = 3,
            windowSize = null,
            contamination = 0.1
        } = options;
        
        const anomalies = [];
        
        switch (method) {
            case 'zscore':
                return this._zscoreAnomalies(data, threshold, windowSize);
            
            case 'iqr':
                return this._iqrAnomalies(data, threshold);
            
            case 'mad':
                return this._madAnomalies(data, threshold);
            
            case 'isolation':
                return this._isolationForestAnomalies(data, contamination);
            
            default:
                return this._zscoreAnomalies(data, threshold);
        }
    },
    
    _zscoreAnomalies: function(data, threshold, windowSize = null) {
        const anomalies = [];
        
        if (windowSize) {
            // Rolling z-score
            for (let i = windowSize; i < data.length; i++) {
                const window = data.slice(i - windowSize, i);
                const mean = window.reduce((a, b) => a + b, 0) / windowSize;
                const std = Math.sqrt(window.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / windowSize);
                
                const zscore = std > 0 ? Math.abs(data[i] - mean) / std : 0;
                if (zscore > threshold) {
                    anomalies.push({ index: i, value: data[i], score: zscore, method: 'zscore_rolling' });
                }
            }
        } else {
            // Global z-score
            const mean = data.reduce((a, b) => a + b, 0) / data.length;
            const std = Math.sqrt(data.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / data.length);
            
            data.forEach((value, index) => {
                const zscore = std > 0 ? Math.abs(value - mean) / std : 0;
                if (zscore > threshold) {
                    anomalies.push({ index, value, score: zscore, method: 'zscore_global' });
                }
            });
        }
        
        return { anomalies, method: 'zscore', threshold };
    },
    
    _iqrAnomalies: function(data, multiplier = 1.5) {
        const sorted = [...data].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(data.length * 0.25)];
        const q3 = sorted[Math.floor(data.length * 0.75)];
        const iqr = q3 - q1;
        
        const lower = q1 - multiplier * iqr;
        const upper = q3 + multiplier * iqr;
        
        const anomalies = [];
        data.forEach((value, index) => {
            if (value < lower || value > upper) {
                anomalies.push({
                    index,
                    value,
                    score: value < lower ? (lower - value) / iqr : (value - upper) / iqr,
                    method: 'iqr'
                });
            }
        });
        
        return { anomalies, method: 'iqr', bounds: { lower, upper }, q1, q3, iqr };
    },
    
    _madAnomalies: function(data, threshold = 3.5) {
        const median = this._median(data);
        const deviations = data.map(x => Math.abs(x - median));
        const mad = this._median(deviations);
        
        // Modified z-score using MAD
        const k = 1.4826; // Consistency constant for normal distribution
        
        const anomalies = [];
        data.forEach((value, index) => {
            const modifiedZscore = mad > 0 ? 0.6745 * (value - median) / mad : 0;
            if (Math.abs(modifiedZscore) > threshold) {
                anomalies.push({ index, value, score: Math.abs(modifiedZscore), method: 'mad' });
            }
        });
        
        return { anomalies, method: 'mad', median, mad };
    },
    
    _isolationForestAnomalies: function(data, contamination = 0.1) {
        // Simplified isolation forest
        const numTrees = 100;
        const sampleSize = Math.min(256, data.length);
        
        // Build trees and compute average path lengths
        const pathLengths = data.map(() => 0);
        
        for (let t = 0; t < numTrees; t++) {
            // Sample indices
            const sampleIndices = this._sample(data.length, sampleSize);
            const sampleData = sampleIndices.map(i => data[i]);
            
            // Build isolation tree
            const tree = this._buildIsolationTree(sampleData, 0, Math.ceil(Math.log2(sampleSize)));
            
            // Compute path length for each point
            data.forEach((value, i) => {
                pathLengths[i] += this._pathLength(tree, value, 0);
            });
        }
        
        // Average and normalize
        const avgPathLengths = pathLengths.map(p => p / numTrees);
        const c = this._avgPathLength(sampleSize);
        const anomalyScores = avgPathLengths.map(p => Math.pow(2, -p / c));
        
        // Find threshold based on contamination
        const sortedScores = [...anomalyScores].sort((a, b) => b - a);
        const threshold = sortedScores[Math.floor(data.length * contamination)];
        
        const anomalies = [];
        anomalyScores.forEach((score, index) => {
            if (score >= threshold) {
                anomalies.push({ index, value: data[index], score, method: 'isolation_forest' });
            }
        });
        
        return { anomalies, method: 'isolation_forest', scores: anomalyScores, threshold };
    },
    
    _buildIsolationTree: function(data, depth, maxDepth) {
        if (depth >= maxDepth || data.length <= 1) {
            return { type: 'leaf', size: data.length };
        }
        
        const min = Math.min(...data);
        const max = Math.max(...data);
        
        if (min === max) {
            return { type: 'leaf', size: data.length };
        }