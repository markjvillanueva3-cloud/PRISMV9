const PRISM_DL = {
  
  // ═══════════════════════════════════════════════════════════════════════════
  // ACTIVATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  relu: function(x) {
    if (Array.isArray(x)) return x.map(v => Math.max(0, v));
    return Math.max(0, x);
  },
  
  reluDerivative: function(x) {
    if (Array.isArray(x)) return x.map(v => v > 0 ? 1 : 0);
    return x > 0 ? 1 : 0;
  },
  
  sigmoid: function(x) {
    if (Array.isArray(x)) return x.map(v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v)))));
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  },
  
  sigmoidDerivative: function(x) {
    const s = this.sigmoid(x);
    if (Array.isArray(s)) return s.map(v => v * (1 - v));
    return s * (1 - s);
  },
  
  tanh: function(x) {
    if (Array.isArray(x)) return x.map(v => Math.tanh(v));
    return Math.tanh(x);
  },
  
  tanhDerivative: function(x) {
    const t = this.tanh(x);
    if (Array.isArray(t)) return t.map(v => 1 - v * v);
    return 1 - t * t;
  },
  
  softmax: function(x) {
    const max = Math.max(...x);
    const exp = x.map(v => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map(v => v / sum);
  },
  
  leakyRelu: function(x, alpha = 0.01) {
    if (Array.isArray(x)) return x.map(v => v > 0 ? v : alpha * v);
    return x > 0 ? x : alpha * x;
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LOSS FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  mseLoss: function(predicted, actual) {
    if (!Array.isArray(predicted)) {
      const diff = predicted - actual;
      return { loss: diff * diff, gradient: 2 * diff };
    }
    
    let sum = 0;
    const gradient = [];
    for (let i = 0; i < predicted.length; i++) {
      const diff = predicted[i] - actual[i];
      sum += diff * diff;
      gradient.push(2 * diff / predicted.length);
    }
    return { loss: sum / predicted.length, gradient };
  },
  
  crossEntropyLoss: function(predicted, actual) {
    const epsilon = 1e-15;
    if (!Array.isArray(predicted)) {
      const p = Math.max(epsilon, Math.min(1 - epsilon, predicted));
      const loss = -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
      const gradient = -(actual / p - (1 - actual) / (1 - p));
      return { loss, gradient };
    }
    
    let loss = 0;
    const gradient = [];
    for (let i = 0; i < predicted.length; i++) {
      const p = Math.max(epsilon, Math.min(1 - epsilon, predicted[i]));
      loss -= actual[i] * Math.log(p);
      gradient.push(-actual[i] / p);
    }
    return { loss, gradient };
  },
  
  huberLoss: function(predicted, actual, delta = 1.0) {
    const diff = predicted - actual;
    const absDiff = Math.abs(diff);
    
    if (absDiff <= delta) {
      return { loss: 0.5 * diff * diff, gradient: diff };
    } else {
      return { 
        loss: delta * absDiff - 0.5 * delta * delta,
        gradient: delta * Math.sign(diff)
      };
    }
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // LAYERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  denseLayer: function(config) {
    const { inputSize, outputSize, activation = 'relu' } = config;
    
    // Xavier initialization
    const scale = Math.sqrt(2 / (inputSize + outputSize));
    const weights = [];
    for (let i = 0; i < outputSize; i++) {
      weights[i] = [];
      for (let j = 0; j < inputSize; j++) {
        weights[i][j] = (Math.random() * 2 - 1) * scale;
      }
    }
    const biases = new Array(outputSize).fill(0);
    
    return {
      type: 'dense',
      weights,
      biases,
      activation,
      inputSize,
      outputSize,
      
      forward: function(input) {
        this.input = input;
        this.z = [];
        
        for (let i = 0; i < this.outputSize; i++) {
          let sum = this.biases[i];
          for (let j = 0; j < this.inputSize; j++) {
            sum += this.weights[i][j] * input[j];
          }
          this.z[i] = sum;
        }
        
        this.output = PRISM_DL[this.activation](this.z);
        return this.output;
      },
      
      backward: function(dOutput, learningRate) {
        const dZ = dOutput.map((d, i) => d * PRISM_DL[this.activation + 'Derivative'](this.z[i]));
        
        const dInput = new Array(this.inputSize).fill(0);
        
        for (let i = 0; i < this.outputSize; i++) {
          this.biases[i] -= learningRate * dZ[i];
          for (let j = 0; j < this.inputSize; j++) {
            dInput[j] += this.weights[i][j] * dZ[i];
            this.weights[i][j] -= learningRate * dZ[i] * this.input[j];
          }
        }
        
        return dInput;
      }
    };
  },
  
  conv1dLayer: function(config) {
    const { inputChannels, outputChannels, kernelSize, stride = 1, padding = 0 } = config;
    
    // Initialize kernels
    const scale = Math.sqrt(2 / (inputChannels * kernelSize));
    const kernels = [];
    for (let o = 0; o < outputChannels; o++) {
      kernels[o] = [];
      for (let i = 0; i < inputChannels; i++) {
        kernels[o][i] = [];
        for (let k = 0; k < kernelSize; k++) {
          kernels[o][i][k] = (Math.random() * 2 - 1) * scale;
        }
      }
    }
    const biases = new Array(outputChannels).fill(0);
    
    return {
      type: 'conv1d',
      kernels,
      biases,
      kernelSize,
      stride,
      padding,
      inputChannels,
      outputChannels,
      
      forward: function(input) {
        // input: [channels][length]
        this.input = input;
        const inputLength = input[0].length;
        const outputLength = Math.floor((inputLength + 2 * this.padding - this.kernelSize) / this.stride) + 1;
        
        const output = [];
        for (let o = 0; o < this.outputChannels; o++) {
          output[o] = [];
          for (let pos = 0; pos < outputLength; pos++) {
            let sum = this.biases[o];
            for (let i = 0; i < this.inputChannels; i++) {
              for (let k = 0; k < this.kernelSize; k++) {
                const idx = pos * this.stride + k - this.padding;
                if (idx >= 0 && idx < inputLength) {
                  sum += this.kernels[o][i][k] * input[i][idx];
                }
              }
            }
            output[o][pos] = Math.max(0, sum); // ReLU activation
          }
        }
        
        this.output = output;
        return output;
      }
    };
  },
  
  lstmLayer: function(config) {
    const { inputSize, hiddenSize } = config;
    const scale = Math.sqrt(2 / (inputSize + hiddenSize));
    
    // Initialize weights for all gates
    const initMatrix = (rows, cols) => {
      const m = [];
      for (let i = 0; i < rows; i++) {
        m[i] = [];
        for (let j = 0; j < cols; j++) {
          m[i][j] = (Math.random() * 2 - 1) * scale;
        }
      }
      return m;
    };
    
    return {
      type: 'lstm',
      inputSize,
      hiddenSize,
      // Weights: [forget, input, candidate, output] gates
      Wf: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wi: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wc: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wo: initMatrix(hiddenSize, inputSize + hiddenSize),
      bf: new Array(hiddenSize).fill(0),
      bi: new Array(hiddenSize).fill(0),
      bc: new Array(hiddenSize).fill(0),
      bo: new Array(hiddenSize).fill(0),
      
      forward: function(sequence) {
        const T = sequence.length;
        let h = new Array(this.hiddenSize).fill(0);
        let c = new Array(this.hiddenSize).fill(0);
        
        const outputs = [];
        
        for (let t = 0; t < T; t++) {
          const x = sequence[t];
          const concat = [...h, ...x];
          
          // Gates
          const ft = PRISM_DL.sigmoid(this._matmul(this.Wf, concat, this.bf));
          const it = PRISM_DL.sigmoid(this._matmul(this.Wi, concat, this.bi));
          const ct_candidate = PRISM_DL.tanh(this._matmul(this.Wc, concat, this.bc));
          const ot = PRISM_DL.sigmoid(this._matmul(this.Wo, concat, this.bo));
          
          // Cell state and hidden state
          c = c.map((cv, i) => ft[i] * cv + it[i] * ct_candidate[i]);
          h = ot.map((o, i) => o * Math.tanh(c[i]));
          
          outputs.push([...h]);
        }
        
        return { outputs, finalHidden: h, finalCell: c };
      },
      
      _matmul: function(W, x, b) {
        const result = [];
        for (let i = 0; i < W.length; i++) {
          let sum = b[i];
          for (let j = 0; j < x.length; j++) {
            sum += W[i][j] * x[j];
          }
          result.push(sum);
        }
        return result;
      }
    };
  },
  
  gruLayer: function(config) {
    const { inputSize, hiddenSize } = config;
    const scale = Math.sqrt(2 / (inputSize + hiddenSize));
    
    const initMatrix = (rows, cols) => {
      const m = [];
      for (let i = 0; i < rows; i++) {
        m[i] = Array(cols).fill(0).map(() => (Math.random() * 2 - 1) * scale);
      }
      return m;
    };
    
    return {
      type: 'gru',
      inputSize,
      hiddenSize,
      Wr: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wz: initMatrix(hiddenSize, inputSize + hiddenSize),
      Wh: initMatrix(hiddenSize, inputSize + hiddenSize),
      br: new Array(hiddenSize).fill(0),
      bz: new Array(hiddenSize).fill(0),
      bh: new Array(hiddenSize).fill(0),
      
      forward: function(sequence) {
        const T = sequence.length;
        let h = new Array(this.hiddenSize).fill(0);
        const outputs = [];
        
        for (let t = 0; t < T; t++) {
          const x = sequence[t];
          const concat = [...h, ...x];
          
          const rt = PRISM_DL.sigmoid(this._matmul(this.Wr, concat, this.br));
          const zt = PRISM_DL.sigmoid(this._matmul(this.Wz, concat, this.bz));
          
          const rh = rt.map((r, i) => r * h[i]);
          const concat2 = [...rh, ...x];
          const ht_candidate = PRISM_DL.tanh(this._matmul(this.Wh, concat2, this.bh));
          
          h = h.map((hv, i) => (1 - zt[i]) * hv + zt[i] * ht_candidate[i]);
          outputs.push([...h]);
        }
        
        return { outputs, finalHidden: h };
      },
      
      _matmul: function(W, x, b) {
        return W.map((row, i) => b[i] + row.reduce((sum, w, j) => sum + w * x[j], 0));
      }
    };
  },
  
  attentionLayer: function(config) {
    const { dim } = config;
    
    return {
      type: 'attention',
      dim,
      
      forward: function(Q, K, V) {
        // Q, K, V: arrays of vectors
        const dk = K[0].length;
        const scale = Math.sqrt(dk);
        
        // Compute attention scores
        const scores = Q.map(q => 
          K.map(k => 
            q.reduce((sum, qi, i) => sum + qi * k[i], 0) / scale
          )
        );
        
        // Softmax over keys
        const weights = scores.map(row => PRISM_DL.softmax(row));
        
        // Weighted sum of values
        const output = weights.map(w => {
          const out = new Array(V[0].length).fill(0);
          w.forEach((weight, i) => {
            V[i].forEach((v, j) => out[j] += weight * v);
          });
          return out;
        });
        
        return { output, weights };
      }
    };
  },
  
  batchNormLayer: function(config) {
    const { size, momentum = 0.1, epsilon = 1e-5 } = config;
    
    return {
      type: 'batchNorm',
      gamma: new Array(size).fill(1),
      beta: new Array(size).fill(0),
      runningMean: new Array(size).fill(0),
      runningVar: new Array(size).fill(1),
      momentum,
      epsilon,
      training: true,
      
      forward: function(x) {
        // x: [batch][features]
        const batchSize = x.length;
        const features = x[0].length;
        
        let mean, variance;
        
        if (this.training) {
          // Compute batch statistics
          mean = new Array(features).fill(0);
          variance = new Array(features).fill(0);
          
          for (let j = 0; j < features; j++) {
            for (let i = 0; i < batchSize; i++) {
              mean[j] += x[i][j];
            }
            mean[j] /= batchSize;
            
            for (let i = 0; i < batchSize; i++) {
              variance[j] += Math.pow(x[i][j] - mean[j], 2);
            }
            variance[j] /= batchSize;
          }
          
          // Update running statistics
          for (let j = 0; j < features; j++) {
            this.runningMean[j] = (1 - this.momentum) * this.runningMean[j] + this.momentum * mean[j];
            this.runningVar[j] = (1 - this.momentum) * this.runningVar[j] + this.momentum * variance[j];
          }
        } else {
          mean = this.runningMean;
          variance = this.runningVar;
        }
        
        // Normalize
        const output = x.map(row => 
          row.map((v, j) => 
            this.gamma[j] * (v - mean[j]) / Math.sqrt(variance[j] + this.epsilon) + this.beta[j]
          )
        );
        
        return output;
      }
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIMIZERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  sgd: function(config = {}) {
    const { learningRate = 0.01 } = config;
    
    return {
      type: 'sgd',
      learningRate,
      
      step: function(params, gradients) {
        return params.map((p, i) => p - this.learningRate * gradients[i]);
      }
    };
  },
  
  momentum: function(config = {}) {
    const { learningRate = 0.01, beta = 0.9 } = config;
    
    return {
      type: 'momentum',
      learningRate,
      beta,
      velocity: null,
      
      step: function(params, gradients) {
        if (!this.velocity) {
          this.velocity = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.velocity[i] = this.beta * this.velocity[i] - this.learningRate * gradients[i];
          return p + this.velocity[i];
        });
      }
    };
  },
  
  adam: function(config = {}) {
    const { learningRate = 0.001, beta1 = 0.9, beta2 = 0.999, epsilon = 1e-8 } = config;
    
    return {
      type: 'adam',
      learningRate,
      beta1,
      beta2,
      epsilon,
      m: null,
      v: null,
      t: 0,
      
      step: function(params, gradients) {
        this.t++;
        
        if (!this.m) {
          this.m = gradients.map(() => 0);
          this.v = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.m[i] = this.beta1 * this.m[i] + (1 - this.beta1) * gradients[i];
          this.v[i] = this.beta2 * this.v[i] + (1 - this.beta2) * gradients[i] * gradients[i];
          
          const mHat = this.m[i] / (1 - Math.pow(this.beta1, this.t));
          const vHat = this.v[i] / (1 - Math.pow(this.beta2, this.t));
          
          return p - this.learningRate * mHat / (Math.sqrt(vHat) + this.epsilon);
        });
      }
    };
  },
  
  rmsprop: function(config = {}) {
    const { learningRate = 0.001, beta = 0.9, epsilon = 1e-8 } = config;
    
    return {
      type: 'rmsprop',
      learningRate,
      beta,
      epsilon,
      cache: null,
      
      step: function(params, gradients) {
        if (!this.cache) {
          this.cache = gradients.map(() => 0);
        }
        
        return params.map((p, i) => {
          this.cache[i] = this.beta * this.cache[i] + (1 - this.beta) * gradients[i] * gradients[i];
          return p - this.learningRate * gradients[i] / (Math.sqrt(this.cache[i]) + this.epsilon);
        });
      }
    };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REGULARIZATION
  // ═══════════════════════════════════════════════════════════════════════════
  
  dropout: function(x, rate = 0.5, training = true) {
    if (!training) return x;
    
    const scale = 1 / (1 - rate);
    return x.map(v => Math.random() > rate ? v * scale : 0);
  },
  
  l2Regularization: function(weights, lambda = 0.01) {
    let penalty = 0;
    const gradients = [];
    
    for (const w of weights.flat()) {
      penalty += w * w;
      gradients.push(2 * lambda * w);
    }
    
    return { penalty: lambda * penalty, gradients };
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // TRAINING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════
  
  forward: function(layers, input) {
    let current = input;
    for (const layer of layers) {
      current = layer.forward(current);
    }
    return current;
  },
  
  backward: function(layers, lossGradient, learningRate) {
    let gradient = lossGradient;
    for (let i = layers.length - 1; i >= 0; i--) {
      if (layers[i].backward) {
        gradient = layers[i].backward(gradient, learningRate);
      }
    }
    return gradient;
  },
  
  step: function(config) {
    const { layers, input, target, lossFunction = 'mse', learningRate = 0.01 } = config;
    
    // Forward
    const output = this.forward(layers, input);
    
    // Compute loss
    const lossResult = this[lossFunction + 'Loss'](output, target);
    
    // Backward
    this.backward(layers, lossResult.gradient, learningRate);
    
    return { loss: lossResult.loss, output };
  }
}