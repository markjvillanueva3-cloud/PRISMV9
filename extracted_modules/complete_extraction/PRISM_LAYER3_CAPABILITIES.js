const PRISM_LAYER3_CAPABILITIES = {

    registerAll() {
        // Linear Algebra Operations
        PRISM_CAPABILITY_REGISTRY.register('layer3.numerical', {
            id: 'numerical.linearAlgebra',
            name: 'Linear Algebra Operations',
            description: 'Matrix operations: inverse, determinant, eigenvalues, SVD, LU decomposition',
            category: 'numerical',
            inputs: {
                operation: { type: 'string', required: true, options: ['inverse', 'determinant', 'eigenvalues', 'svd', 'lu', 'qr'] },
                matrix: { type: 'array', required: true, description: '2D array representing matrix' }
            },
            outputs: {
                result: { type: 'object', description: 'Operation result' }
            },
            execute: async (inputs) => {
                const { operation, matrix } = inputs;

                if (typeof PRISM_NUMERICAL_ENGINE === 'undefined') {
                    throw new Error('PRISM_NUMERICAL_ENGINE not available');
                }
                const la = PRISM_NUMERICAL_ENGINE.linearAlgebra;
                let result;

                switch (operation) {
                    case 'inverse':
                        result = la.inverse(matrix);
                        break;
                    case 'determinant':
                        result = la.determinant(matrix);
                        break;
                    case 'eigenvalues':
                        result = PRISM_NUMERICAL_ENGINE.eigenvalues.qrAlgorithm(matrix);
                        break;
                    case 'svd':
                        result = la.svd(matrix);
                        break;
                    case 'lu':
                        result = la.luDecomposition(matrix);
                        break;
                    case 'qr':
                        result = la.qrDecomposition(matrix);
                        break;
                    default:
                        throw new Error(`Unknown operation: ${operation}`);
                }
                PRISM_EVENT_BUS.publish('numerical:linearAlgebra:complete', { operation, matrixSize: matrix.length });
                return result;
            },
            preferredUI: 'matrix-panel'
        });

        // Optimization
        PRISM_CAPABILITY_REGISTRY.register('layer3.numerical', {
            id: 'numerical.optimization',
            name: 'Numerical Optimization',
            description: 'Gradient descent, BFGS, Nelder-Mead simplex, constrained optimization',
            category: 'numerical',
            inputs: {
                method: { type: 'string', required: true, options: ['gradientDescent', 'bfgs', 'simplex', 'conjugateGradient'] },
                objective: { type: 'function', required: true, description: 'Objective function to minimize' },
                x0: { type: 'array', required: true, description: 'Initial guess' },
                options: { type: 'object', required: false }
            },
            outputs: {
                x: { type: 'array', description: 'Optimal point' },
                fval: { type: 'number', description: 'Function value at optimum' },
                iterations: { type: 'number' }
            },
            execute: async (inputs) => {
                const { method, objective, x0, options = {} } = inputs;

                if (typeof PRISM_NUMERICAL_ENGINE === 'undefined') {
                    throw new Error('PRISM_NUMERICAL_ENGINE not available');
                }
                const opt = PRISM_NUMERICAL_ENGINE.optimization;
                let result;

                switch (method) {
                    case 'gradientDescent':
                        result = opt.gradientDescent(objective, null, x0, options);
                        break;
                    case 'bfgs':
                        result = opt.bfgs(objective, x0, options);
                        break;
                    case 'simplex':
                        result = opt.simplex(objective, x0, options);
                        break;
                    case 'conjugateGradient':
                        result = opt.conjugateGradient(objective, null, x0, options);
                        break;
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }
                PRISM_EVENT_BUS.publish('numerical:optimization:complete', { method, iterations: result?.iterations });
                return result;
            },
            preferredUI: 'result-panel'
        });

        // Root Finding
        PRISM_CAPABILITY_REGISTRY.register('layer3.numerical', {
            id: 'numerical.rootFinding',
            name: 'Root Finding',
            description: 'Newton-Raphson, bisection, secant method for finding function roots',
            category: 'numerical',
            inputs: {
                method: { type: 'string', required: true, options: ['newton', 'bisection', 'secant'] },
                f: { type: 'function', required: true },
                x0: { type: 'number', required: true },
                options: { type: 'object', required: false }
            },
            outputs: {
                root: { type: 'number', description: 'Found root' },
                iterations: { type: 'number' }
            },
            execute: async (inputs) => {
                const { method, f, x0, options = {} } = inputs;

                if (typeof PRISM_NUMERICAL_ENGINE === 'undefined') {
                    throw new Error('PRISM_NUMERICAL_ENGINE not available');
                }
                const rf = PRISM_NUMERICAL_ENGINE.rootFinding;
                let result;

                switch (method) {
                    case 'newton':
                        result = rf.newtonRaphson(f, null, x0, options.tol || 1e-10);
                        break;
                    case 'bisection':
                        result = rf.bisection(f, options.a || x0 - 10, options.b || x0 + 10, options.tol || 1e-10);
                        break;
                    case 'secant':
                        result = rf.secant(f, x0, options.x1 || x0 + 0.1, options.tol || 1e-10);
                        break;
                    default:
                        throw new Error(`Unknown method: ${method}`);
                }
                PRISM_EVENT_BUS.publish('numerical:rootFinding:complete', { method, root: result });
                return { root: result, method };
            },
            preferredUI: 'result-panel'
        });

        // State Estimation (EKF, LQR)
        PRISM_CAPABILITY_REGISTRY.register('layer3.control', {
            id: 'control.stateEstimation',
            name: 'State Estimation',
            description: 'Extended Kalman Filter, LQR controller for machine tool state estimation',
            category: 'control',
            inputs: {
                type: { type: 'string', required: true, options: ['ekf', 'lqr', 'machineEKF'] },
                config: { type: 'object', required: true }
            },
            outputs: {
                estimator: { type: 'object', description: 'Configured state estimator' }
            },
            execute: async (inputs) => {
                const { type, config } = inputs;

                if (typeof PRISM_STATE_ESTIMATION === 'undefined') {
                    throw new Error('PRISM_STATE_ESTIMATION not available');
                }
                let estimator;

                switch (type) {
                    case 'ekf':
                        estimator = new PRISM_STATE_ESTIMATION.ExtendedKalmanFilter(
                            config.stateDim,
                            config.measureDim,
                            config
                        );
                        break;
                    case 'lqr':
                        estimator = new PRISM_STATE_ESTIMATION.LQRController(
                            config.A,
                            config.B,
                            config.Q,
                            config.R
                        );
                        break;
                    case 'machineEKF':
                        estimator = PRISM_STATE_ESTIMATION.MachineToolEKF.create(config);
                        break;
                    default:
                        throw new Error(`Unknown type: ${type}`);
                }
                PRISM_EVENT_BUS.publish('control:estimator:created', { type });
                return estimator;
            },
            preferredUI: 'control-panel'
        });

        // FFT / Spectral Analysis
        PRISM_CAPABILITY_REGISTRY.register('layer3.signal', {
            id: 'signal.spectral',
            name: 'Spectral Analysis',
            description: 'FFT, power spectrum, frequency analysis for vibration/chatter detection',
            category: 'signal',
            inputs: {
                signal: { type: 'array', required: true, description: 'Time-domain signal' },
                sampleRate: { type: 'number', required: false, default: 1000 }
            },
            outputs: {
                spectrum: { type: 'array', description: 'Frequency spectrum' },
                dominantFrequency: { type: 'number', description: 'Dominant frequency' }
            },
            execute: async (inputs) => {
                const { signal, sampleRate = 1000 } = inputs;

                if (typeof PRISM_NUMERICAL_ENGINE === 'undefined') {
                    throw new Error('PRISM_NUMERICAL_ENGINE not available');
                }
                const spectrum = PRISM_NUMERICAL_ENGINE.spectral.powerSpectrum(signal);

                // Find dominant frequency
                let maxMag = 0;
                let dominantIdx = 0;
                for (let i = 1; i < spectrum.length / 2; i++) {
                    if (spectrum[i] > maxMag) {
                        maxMag = spectrum[i];
                        dominantIdx = i;
                    }
                }
                const dominantFrequency = (dominantIdx * sampleRate) / spectrum.length;

                PRISM_EVENT_BUS.publish('signal:spectral:complete', { dominantFrequency, signalLength: signal.length });
                return { spectrum, dominantFrequency };
            },
            preferredUI: 'spectrum-panel'
        });

        console.log('[RETROFIT] Layer 3 capabilities registered: 5');
    }
}