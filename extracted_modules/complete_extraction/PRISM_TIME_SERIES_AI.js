const PRISM_TIME_SERIES_AI = {
    // Moving average
    movingAverage(data, window) {
        const result = [];
        for (let i = window - 1; i < data.length; i++) {
            let sum = 0;
            for (let j = 0; j < window; j++) {
                sum += data[i - j];
            }
            result.push(sum / window);
        }
        return result;
    },
    
    // Exponential moving average
    ema(data, alpha = 0.3) {
        const result = [data[0]];
        for (let i = 1; i < data.length; i++) {
            result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
        }
        return result;
    },
    
    // Double exponential smoothing (Holt's method)
    doubleExponentialSmoothing(data, alpha = 0.3, beta = 0.1, horizon = 5) {
        if (data.length < 2) return { smoothed: data, forecast: [] };
        
        // Initialize
        let level = data[0];
        let trend = data[1] - data[0];
        const smoothed = [level];
        
        // Smooth existing data
        for (let i = 1; i < data.length; i++) {
            const prevLevel = level;
            level = alpha * data[i] + (1 - alpha) * (level + trend);
            trend = beta * (level - prevLevel) + (1 - beta) * trend;
            smoothed.push(level);
        }
        
        // Forecast
        const forecast = [];
        for (let h = 1; h <= horizon; h++) {
            forecast.push(level + h * trend);
        }
        
        return { smoothed, forecast, level, trend };
    },
    
    // Detect trend
    detectTrend(data, window = 10) {
        if (data.length < window) return { trend: 'insufficient_data', slope: 0 };
        
        const recent = data.slice(-window);
        
        // Simple linear regression
        const n = recent.length;
        const xMean = (n - 1) / 2;
        const yMean = recent.reduce((a, b) => a + b, 0) / n;
        
        let numerator = 0;
        let denominator = 0;
        
        for (let i = 0; i < n; i++) {
            numerator += (i - xMean) * (recent[i] - yMean);
            denominator += (i - xMean) ** 2;
        }
        
        const slope = denominator !== 0 ? numerator / denominator : 0;
        
        // Normalize slope
        const normalizedSlope = slope / (Math.abs(yMean) || 1);
        
        let trend = 'stable';
        if (normalizedSlope > 0.05) trend = 'increasing';
        else if (normalizedSlope < -0.05) trend = 'decreasing';
        
        return { trend, slope, normalizedSlope };
    },
    
    // Anomaly detection using statistical methods
    detectAnomalies(data, options = {}) {
        const { method = 'zscore', threshold = 3, window = 20 } = options;
        
        const anomalies = [];
        
        switch (method) {
            case 'zscore':
                const mean = data.reduce((a, b) => a + b, 0) / data.length;
                const std = Math.sqrt(data.reduce((sum, x) => sum + (x - mean) ** 2, 0) / data.length);
                
                data.forEach((value, index) => {
                    const zscore = std !== 0 ? Math.abs(value - mean) / std : 0;
                    if (zscore > threshold) {
                        anomalies.push({ index, value, score: zscore, type: 'zscore' });
                    }
                });
                break;
                
            case 'iqr':
                const sorted = [...data].sort((a, b) => a - b);
                const q1 = sorted[Math.floor(data.length * 0.25)];
                const q3 = sorted[Math.floor(data.length * 0.75)];
                const iqr = q3 - q1;
                const lower = q1 - 1.5 * iqr;
                const upper = q3 + 1.5 * iqr;
                
                data.forEach((value, index) => {
                    if (value < lower || value > upper) {
                        anomalies.push({ index, value, type: 'iqr', bounds: { lower, upper } });
                    }
                });
                break;
                
            case 'rolling':
                for (let i = window; i < data.length; i++) {
                    const windowData = data.slice(i - window, i);
                    const wMean = windowData.reduce((a, b) => a + b, 0) / window;
                    const wStd = Math.sqrt(windowData.reduce((s, x) => s + (x - wMean) ** 2, 0) / window);
                    
                    const zscore = wStd !== 0 ? Math.abs(data[i] - wMean) / wStd : 0;
                    if (zscore > threshold) {
                        anomalies.push({ index: i, value: data[i], score: zscore, type: 'rolling' });
                    }
                }
                break;
        }
        
        return anomalies;
    },
    
    // Tool wear prediction using RUL (Remaining Useful Life)
    predictToolWear(wearHistory, options = {}) {
        const { wearLimit = 0.3, confidenceLevel = 0.95 } = options;
        
        if (wearHistory.length < 3) {
            return { remainingLife: null, confidence: 0, message: 'Insufficient data' };
        }
        
        // Fit degradation model (simplified linear)
        const n = wearHistory.length;
        const times = wearHistory.map((_, i) => i);
        const wears = wearHistory;
        
        // Linear regression
        const tMean = times.reduce((a, b) => a + b, 0) / n;
        const wMean = wears.reduce((a, b) => a + b, 0) / n;
        
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) {
            num += (times[i] - tMean) * (wears[i] - wMean);
            den += (times[i] - tMean) ** 2;
        }
        
        const slope = den !== 0 ? num / den : 0;
        const intercept = wMean - slope * tMean;
        
        // Calculate residual standard error
        let sse = 0;
        for (let i = 0; i < n; i++) {
            const predicted = intercept + slope * times[i];
            sse += (wears[i] - predicted) ** 2;
        }
        const rse = Math.sqrt(sse / (n - 2));
        
        // Predict time to reach wear limit
        const currentWear = wears[wears.length - 1];
        const currentTime = times[times.length - 1];
        
        if (slope <= 0) {
            return { 
                remainingLife: Infinity, 
                confidence: 0.5, 
                message: 'Wear not increasing - model may not apply' 
            };
        }
        
        const timeToLimit = (wearLimit - intercept) / slope;
        const remainingLife = Math.max(0, timeToLimit - currentTime);
        
        // Confidence based on model fit
        const r2 = 1 - sse / wears.reduce((s, w) => s + (w - wMean) ** 2, 0);
        const confidence = Math.max(0, Math.min(1, r2));
        
        return {
            remainingLife: Math.round(remainingLife),
            currentWear,
            wearRate: slope,
            timeToLimit: Math.round(timeToLimit),
            confidence,
            model: { slope, intercept, r2 },
            prediction: {
                lower: Math.round(remainingLife * 0.7),
                expected: Math.round(remainingLife),
                upper: Math.round(remainingLife * 1.3)
            }
        };
    },
    
    // Cycle time prediction
    predictCycleTime(history, features) {
        if (history.length < 5) {
            return { predicted: null, confidence: 0 };
        }
        
        // Simple weighted average based on similar jobs
        let weightedSum = 0;
        let weightSum = 0;
        
        history.forEach(h => {
            // Calculate similarity
            let similarity = 1;
            if (features.material && h.material !== features.material) similarity *= 0.5;
            if (features.operation && h.operation !== features.operation) similarity *= 0.5;
            if (features.complexity) {
                similarity *= 1 - Math.abs(h.complexity - features.complexity) / 10;
            }
            
            // Weight by recency
            const age = (Date.now() - (h.timestamp || 0)) / (24 * 60 * 60 * 1000);
            const recencyWeight = Math.exp(-age / 30);
            
            const weight = similarity * recencyWeight;
            weightedSum += h.cycleTime * weight;
            weightSum += weight;
        });
        
        const predicted = weightSum > 0 ? weightedSum / weightSum : null;
        const confidence = Math.min(weightSum / history.length, 1);
        
        return { predicted, confidence };
    },
    
    // Seasonality detection
    detectSeasonality(data, maxPeriod = 24) {
        if (data.length < maxPeriod * 2) return { seasonal: false };
        
        const autocorrelations = [];
        
        for (let lag = 1; lag <= maxPeriod; lag++) {
            let correlation = 0;
            let count = 0;
            
            for (let i = lag; i < data.length; i++) {
                correlation += data[i] * data[i - lag];
                count++;
            }
            
            autocorrelations.push({ lag, correlation: correlation / count });
        }
        
        // Find peaks in autocorrelation
        const peaks = [];
        for (let i = 1; i < autocorrelations.length - 1; i++) {
            if (autocorrelations[i].correlation > autocorrelations[i-1].correlation &&
                autocorrelations[i].correlation > autocorrelations[i+1].correlation) {
                peaks.push(autocorrelations[i]);
            }
        }
        
        if (peaks.length > 0) {
            const strongestPeak = peaks.reduce((a, b) => 
                a.correlation > b.correlation ? a : b
            );
            
            return {
                seasonal: strongestPeak.correlation > 0.3,
                period: strongestPeak.lag,
                strength: strongestPeak.correlation
            };
        }
        
        return { seasonal: false };
    }
}