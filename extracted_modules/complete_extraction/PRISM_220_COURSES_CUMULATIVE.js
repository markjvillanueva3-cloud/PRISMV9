const PRISM_220_COURSES_CUMULATIVE = {
    phases: {
        phase1: {
            name: 'Immediate Integration',
            algorithms: 30,
            utilization: 100,
            status: 'COMPLETE',
            categories: ['PSO', 'ACO', 'GA', 'FFT', 'Taylor', 'Merchant', 'Regression', 'Random Forest', 'Butterworth', 'Stability Lobes']
        },
        phase2: {
            name: 'Extended Integration',
            algorithms: 50,
            utilization: 100,
            status: 'COMPLETE',
            categories: ['NSGA-II', 'Interior Point', 'SVM', 'DBSCAN', 'Q-Learning', 'SPC', 'OEE', 'Spectrogram', 'PCA', 'Simulated Annealing']
        },
        phase3: {
            name: 'Complete Integration',
            algorithms: 100,
            utilization: 100,
            status: 'COMPLETE',
            categories: ['CNN', 'LSTM', 'Transformer', 'PPO', 'SAC', 'Wavelet', 'FEA', 'GCN', 'ARIMA', 'Job Shop GA']
        }
    },
    
    getTotalAlgorithms: function() {
        return Object.values(this.phases).reduce((sum, phase) => sum + phase.algorithms, 0);
    },
    
    getAverageUtilization: function() {
        const phases = Object.values(this.phases);
        const totalAlg = this.getTotalAlgorithms();
        let weightedSum = 0;
        
        for (const phase of phases) {
            weightedSum += phase.algorithms * phase.utilization;
        }
        
        return weightedSum / totalAlg;
    },
    
    getReport: function() {
        return {
            totalPhases: Object.keys(this.phases).length,
            totalAlgorithms: this.getTotalAlgorithms(),
            averageUtilization: this.getAverageUtilization().toFixed(1) + '%',
            phases: this.phases
        };
    }
}