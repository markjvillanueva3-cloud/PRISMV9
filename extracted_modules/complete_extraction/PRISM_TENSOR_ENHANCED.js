const PRISM_TENSOR_ENHANCED = {

    // Inherit from base if exists
    ...((typeof PRISM_TENSOR !== 'undefined') ? PRISM_TENSOR : {}),

    zeros: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(0);
        return Array(shape[0]).fill(null).map(() => this.zeros(shape.slice(1)));
    },
    ones: function(shape) {
        if (shape.length === 1) return Array(shape[0]).fill(1);
        return Array(shape[0]).fill(null).map(() => this.ones(shape.slice(1)));
    },
    random: function(shape, scale = 0.1) {
        if (shape.length === 1) {
            return Array(shape[0]).fill(null).map(() => (Math.random() - 0.5) * 2 * scale);
        }
        return Array(shape[0]).fill(null).map(() => this.random(shape.slice(1), scale));
    },
    randomNormal: function(shape, mean = 0, std = 1) {
        const boxMuller = () => {
            const u1 = Math.random();
            const u2 = Math.random();
            return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        };
        if (shape.length === 1) {
            return Array(shape[0]).fill(null).map(() => mean + std * boxMuller());
        }
        return Array(shape[0]).fill(null).map(() => this.randomNormal(shape.slice(1), mean, std));
    },
    shape: function(tensor) {
        const shape = [];
        let current = tensor;
        while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
        }
        return shape;
    },
    reshape: function(tensor, newShape) {
        const flat = this.flatten(tensor);
        return this._unflatten(flat, newShape);
    },
    _unflatten: function(flat, shape) {
        if (shape.length === 1) {
            return flat.slice(0, shape[0]);
        }
        const size = shape.slice(1).reduce((a, b) => a * b, 1);
        const result = [];
        for (let i = 0; i < shape[0]; i++) {
            result.push(this._unflatten(flat.slice(i * size, (i + 1) * size), shape.slice(1)));
        }
        return result;
    },
    transpose: function(matrix) {
        if (!Array.isArray(matrix[0])) return matrix;
        const rows = matrix.length;
        const cols = matrix[0].length;
        const result = this.zeros([cols, rows]);
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                result[j][i] = matrix[i][j];
            }
        }
        return result;
    },
    flatten: function(tensor) {
        if (!Array.isArray(tensor)) return [tensor];
        return tensor.flatMap(t => this.flatten(t));
    },
    clone: function(tensor) {
        if (!Array.isArray(tensor)) return tensor;
        return tensor.map(t => this.clone(t));
    },
    add: function(a, b) {
        if (!Array.isArray(a)) return a + b;
        return a.map((ai, i) => this.add(ai, Array.isArray(b) ? b[i] : b));
    },
    subtract: function(a, b) {
        if (!Array.isArray(a)) return a - b;
        return a.map((ai, i) => this.subtract(ai, Array.isArray(b) ? b[i] : b));
    },
    multiply: function(a, b) {
        if (!Array.isArray(a)) return a * (Array.isArray(b) ? b : b);
        if (!Array.isArray(b)) return a.map(ai => this.multiply(ai, b));
        return a.map((ai, i) => this.multiply(ai, b[i]));
    },
    divide: function(a, b) {
        if (!Array.isArray(a)) return a / b;
        if (!Array.isArray(b)) return a.map(ai => this.divide(ai, b));
        return a.map((ai, i) => this.divide(ai, b[i]));
    },
    matmul: function(a, b) {
        const rowsA = a.length;
        const colsA = a[0].length;
        const colsB = b[0].length;

        const result = this.zeros([rowsA, colsB]);
        for (let i = 0; i < rowsA; i++) {
            for (let j = 0; j < colsB; j++) {
                let sum = 0;
                for (let k = 0; k < colsA; k++) {
                    sum += a[i][k] * b[k][j];
                }
                result[i][j] = sum;
            }
        }
        return result;
    },
    dot: function(a, b) {
        if (!Array.isArray(a)) return a * b;
        return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
    },
    sum: function(tensor, axis = null) {
        if (axis === null) {
            return this.flatten(tensor).reduce((a, b) => a + b, 0);
        }
        // Sum along specific axis
        if (axis === 0) {
            const result = this.zeros([tensor[0].length]);
            for (let i = 0; i < tensor.length; i++) {
                for (let j = 0; j < tensor[0].length; j++) {
                    result[j] += tensor[i][j];
                }
            }
            return result;
        }
        return tensor.map(row => row.reduce((a, b) => a + b, 0));
    },
    mean: function(tensor, axis = null) {
        if (axis === null) {
            const flat = this.flatten(tensor);
            return flat.reduce((a, b) => a + b, 0) / flat.length;
        }
        const s = this.sum(tensor, axis);
        const n = axis === 0 ? tensor.length : tensor[0].length;
        return Array.isArray(s) ? s.map(x => x / n) : s / n;
    },
    variance: function(tensor, axis = null) {
        const m = this.mean(tensor, axis);
        if (axis === null) {
            const flat = this.flatten(tensor);
            return flat.reduce((s, x) => s + Math.pow(x - m, 2), 0) / flat.length;
        }
        // Variance along axis
        if (axis === 0) {
            const result = this.zeros([tensor[0].length]);
            for (let j = 0; j < tensor[0].length; j++) {
                for (let i = 0; i < tensor.length; i++) {
                    result[j] += Math.pow(tensor[i][j] - m[j], 2);
                }
                result[j] /= tensor.length;
            }
            return result;
        }
        return tensor.map((row, i) => {
            const rowMean = Array.isArray(m) ? m[i] : m;
            return row.reduce((s, x) => s + Math.pow(x - rowMean, 2), 0) / row.length;
        });
    },
    sqrt: function(tensor) {
        if (!Array.isArray(tensor)) return Math.sqrt(Math.max(0, tensor));
        return tensor.map(t => this.sqrt(t));
    },
    exp: function(tensor) {
        if (!Array.isArray(tensor)) return Math.exp(Math.min(500, tensor));
        return tensor.map(t => this.exp(t));
    },
    log: function(tensor) {
        if (!Array.isArray(tensor)) return Math.log(Math.max(1e-15, tensor));
        return tensor.map(t => this.log(t));
    },
    max: function(tensor, axis = null) {
        if (axis === null) {
            return Math.max(...this.flatten(tensor));
        }
        if (axis === 0) {
            const result = [...tensor[0]];
            for (let i = 1; i < tensor.length; i++) {
                for (let j = 0; j < tensor[0].length; j++) {
                    result[j] = Math.max(result[j], tensor[i][j]);
                }
            }
            return result;
        }
        return tensor.map(row => Math.max(...row));
    },
    argmax: function(arr) {
        return arr.indexOf(Math.max(...arr));
    },
    // Convolution operation for CNN
    conv2d: function(input, kernel, stride = 1, padding = 0) {
        // input: [height, width] or [channels, height, width]
        // kernel: [kH, kW] or [outChannels, inChannels, kH, kW]
        const is3D = input.length > 0 && Array.isArray(input[0]) && Array.isArray(input[0][0]);

        if (!is3D) {
            // Simple 2D convolution
            const [H, W] = [input.length, input[0].length];
            const [kH, kW] = [kernel.length, kernel[0].length];
            const outH = Math.floor((H + 2 * padding - kH) / stride) + 1;
            const outW = Math.floor((W + 2 * padding - kW) / stride) + 1;

            // Pad input
            let padded = input;
            if (padding > 0) {
                padded = this.zeros([H + 2 * padding, W + 2 * padding]);
                for (let i = 0; i < H; i++) {
                    for (let j = 0; j < W; j++) {
                        padded[i + padding][j + padding] = input[i][j];
                    }
                }
            }
            const output = this.zeros([outH, outW]);
            for (let i = 0; i < outH; i++) {
                for (let j = 0; j < outW; j++) {
                    let sum = 0;
                    for (let ki = 0; ki < kH; ki++) {
                        for (let kj = 0; kj < kW; kj++) {
                            sum += padded[i * stride + ki][j * stride + kj] * kernel[ki][kj];
                        }
                    }
                    output[i][j] = sum;
                }
            }
            return output;
        }
        // 3D convolution (multi-channel)
        const [C, H, W] = [input.length, input[0].length, input[0][0].length];
        const [kH, kW] = [kernel[0].length, kernel[0][0].length];
        const outH = Math.floor((H + 2 * padding - kH) / stride) + 1;
        const outW = Math.floor((W + 2 * padding - kW) / stride) + 1;

        const output = this.zeros([outH, outW]);
        for (let i = 0; i < outH; i++) {
            for (let j = 0; j < outW; j++) {
                let sum = 0;
                for (let c = 0; c < C; c++) {
                    for (let ki = 0; ki < kH; ki++) {
                        for (let kj = 0; kj < kW; kj++) {
                            const ii = i * stride + ki - padding;
                            const jj = j * stride + kj - padding;
                            if (ii >= 0 && ii < H && jj >= 0 && jj < W) {
                                sum += input[c][ii][jj] * kernel[c][ki][kj];
                            }
                        }
                    }
                }
                output[i][j] = sum;
            }
        }
        return output;
    },
    // Max pooling for CNN
    maxPool2d: function(input, poolSize = 2, stride = null) {
        stride = stride || poolSize;
        const [H, W] = [input.length, input[0].length];
        const outH = Math.floor((H - poolSize) / stride) + 1;
        const outW = Math.floor((W - poolSize) / stride) + 1;

        const output = this.zeros([outH, outW]);
        const indices = this.zeros([outH, outW, 2]); // Store max indices for backward

        for (let i = 0; i < outH; i++) {
            for (let j = 0; j < outW; j++) {
                let maxVal = -Infinity;
                let maxI = 0, maxJ = 0;
                for (let pi = 0; pi < poolSize; pi++) {
                    for (let pj = 0; pj < poolSize; pj++) {
                        const val = input[i * stride + pi][j * stride + pj];
                        if (val > maxVal) {
                            maxVal = val;
                            maxI = i * stride + pi;
                            maxJ = j * stride + pj;
                        }
                    }
                }
                output[i][j] = maxVal;
                indices[i][j] = [maxI, maxJ];
            }
        }
        return { output, indices };
    }
}