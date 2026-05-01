const PRISM_SIGNAL_PROCESSING = {

    version: '1.0.0',
    source: 'MIT 6.003 Signals and Systems',

    /**
     * Digital filter (IIR) using Direct Form II
     * y[n] = b0*x[n] + b1*x[n-1] + ... - a1*y[n-1] - a2*y[n-2] - ...
     */
    filter: function(b, a, x) {
        const y = new Array(x.length).fill(0);
        const nb = b.length;
        const na = a.length;

        for (let n = 0; n < x.length; n++) {
            // Feed-forward
            for (let i = 0; i < nb; i++) {
                if (n - i >= 0) {
                    y[n] += b[i] * x[n - i];
                }
            }
            // Feedback
            for (let i = 1; i < na; i++) {
                if (n - i >= 0) {
                    y[n] -= a[i] * y[n - i];
                }
            }
            y[n] /= a[0];
        }
        return y;
    },
    /**
     * Butterworth lowpass filter coefficients
     */
    butterworthLowpass: function(order, cutoff) {
        // Simplified 2nd order Butterworth
        const wc = 2 * Math.PI * cutoff;
        const k = wc / Math.tan(wc / 2);

        const a0 = k * k + Math.sqrt(2) * k * wc + wc * wc;
        const b = [wc * wc / a0, 2 * wc * wc / a0, wc * wc / a0];
        const a = [1, (2 * wc * wc - 2 * k * k) / a0, (k * k - Math.sqrt(2) * k * wc + wc * wc) / a0];

        return { b, a };
    },
    /**
     * Moving average filter
     */
    movingAverage: function(x, windowSize) {
        const y = new Array(x.length).fill(0);

        for (let i = 0; i < x.length; i++) {
            let sum = 0, count = 0;
            for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                sum += x[j];
                count++;
            }
            y[i] = sum / count;
        }
        return y;
    },
    /**
     * RMS (Root Mean Square) calculation
     */
    rms: function(x, windowSize = null) {
        if (windowSize === null) {
            // Global RMS
            const sumSq = x.reduce((sum, val) => sum + val * val, 0);
            return Math.sqrt(sumSq / x.length);
        }
        // Windowed RMS
        const y = new Array(x.length).fill(0);
        for (let i = 0; i < x.length; i++) {
            let sumSq = 0, count = 0;
            for (let j = Math.max(0, i - windowSize + 1); j <= i; j++) {
                sumSq += x[j] * x[j];
                count++;
            }
            y[i] = Math.sqrt(sumSq / count);
        }
        return y;
    },
    /**
     * Peak detection
     */
    findPeaks: function(x, threshold = 0, minDistance = 1) {
        const peaks = [];

        for (let i = 1; i < x.length - 1; i++) {
            if (x[i] > x[i - 1] && x[i] > x[i + 1] && x[i] > threshold) {
                // Check minimum distance
                if (peaks.length === 0 || i - peaks[peaks.length - 1].index >= minDistance) {
                    peaks.push({ index: i, value: x[i] });
                } else if (x[i] > peaks[peaks.length - 1].value) {
                    peaks[peaks.length - 1] = { index: i, value: x[i] };
                }
            }
        }
        return peaks;
    },
    /**
     * Chatter detection using frequency analysis
     */
    detectChatter: function(accelerometerData, samplingRate, options = {}) {
        const {
            chatterFreqMin = 500,   // Hz
            chatterFreqMax = 5000,  // Hz
            threshold = 0.1
        } = options;

        // Compute FFT
        const n = accelerometerData.length;
        const paddedLength = Math.pow(2, Math.ceil(Math.log2(n)));
        const padded = [...accelerometerData, ...new Array(paddedLength - n).fill(0)];

        const fft = PRISM_NUMERICAL_ENGINE.spectral.fft(padded.map(v => ({ re: v, im: 0 })));
        const magnitude = fft.map(c => Math.sqrt(c.re * c.re + c.im * c.im));

        // Frequency resolution
        const freqResolution = samplingRate / paddedLength;

        // Find peaks in chatter frequency range
        const minBin = Math.floor(chatterFreqMin / freqResolution);
        const maxBin = Math.ceil(chatterFreqMax / freqResolution);

        let maxMagnitude = 0;
        let chatterFreq = 0;

        for (let i = minBin; i <= maxBin && i < magnitude.length / 2; i++) {
            if (magnitude[i] > maxMagnitude) {
                maxMagnitude = magnitude[i];
                chatterFreq = i * freqResolution;
            }
        }
        // Compute RMS in chatter band
        let bandEnergy = 0;
        for (let i = minBin; i <= maxBin && i < magnitude.length / 2; i++) {
            bandEnergy += magnitude[i] * magnitude[i];
        }
        const bandRMS = Math.sqrt(bandEnergy / (maxBin - minBin + 1));

        // Total RMS for comparison
        const totalRMS = this.rms(accelerometerData);

        // Chatter indicator
        const chatterRatio = bandRMS / (totalRMS + 1e-10);
        const isChatter = chatterRatio > threshold;

        return {
            isChatter,
            chatterFrequency: chatterFreq,
            chatterRatio,
            bandRMS,
            totalRMS,
            recommendation: isChatter ?
                `Chatter detected at ${chatterFreq.toFixed(0)} Hz. Reduce spindle speed or depth of cut.` :
                'No chatter detected.'
        };
    }
}