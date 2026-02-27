---
name: prism-ai-deep-learning
description: |
  Deep Learning architectures for PRISM Manufacturing Intelligence.
  Covers Neural Networks, LSTM, Transformers, and Autoencoders.
  
  Modules Covered:
  - PRISM_NEURAL_NETWORK (106 lines) - Feedforward networks
  - PRISM_LSTM_ENGINE (64 lines) - Long Short-Term Memory
  - PRISM_TRANSFORMER_ENGINE (262 lines) - Self-attention models
  - PRISM_AUTOENCODER (141 lines) - Encoder-decoder networks
  
  Total: 4 modules, ~573 lines
  Parent: prism-ai-ml-master
  MIT Foundation: 6.036, Stanford CS 231N, CS 224N
---

# PRISM AI DEEP LEARNING
## Neural Networks, LSTM, Transformers, Autoencoders
### Version 1.0 | Level 4 Reference | 4 Modules

---

## TABLE OF CONTENTS

1. [Architecture Selection](#1-architecture-selection)
2. [Feedforward Neural Networks](#2-feedforward-neural-networks)
3. [LSTM - Sequence Models](#3-lstm---sequence-models)
4. [Transformers](#4-transformers)
5. [Autoencoders](#5-autoencoders)
6. [Manufacturing Applications](#6-manufacturing-applications)

---

# 1. ARCHITECTURE SELECTION

## Decision Tree

```
Data Type →
├── Tabular data?
│   └── → Feedforward Neural Network (or ML algorithms)
│
├── Sequential/Time series?
│   ├── Short sequences (<50)? → LSTM/GRU
│   └── Long sequences? → Transformer
│
├── Need compression/features?
│   └── → Autoencoder
│
├── Images?
│   └── → CNN (future module)
│
└── Graphs/Relations?
    └── → GNN (future module)
```

## Architecture Comparison

| Architecture | Best For | Pros | Cons |
|--------------|----------|------|------|
| Feedforward | Tabular, mapping | Simple, fast | No memory |
| LSTM | Time series | Long-term memory | Sequential (slow) |
| Transformer | Sequences, attention | Parallelizable | Memory-heavy |
| Autoencoder | Compression, anomaly | Unsupervised | Reconstruction only |

---

# 2. FEEDFORWARD NEURAL NETWORKS

## Module: PRISM_NEURAL_NETWORK (106 lines)

### Architecture

```
Input Layer → Hidden Layer(s) → Output Layer
    x            σ(Wx + b)         y = f(z)
```

### PRISM Implementation

```javascript
const nn = new PRISM_NEURAL_NETWORK({
  layers: [10, 64, 32, 5],  // Input: 10, Hidden: 64, 32, Output: 5
  activation: 'relu',        // 'sigmoid', 'tanh', 'leaky_relu'
  outputActivation: 'linear', // 'softmax' for classification
  learningRate: 0.001,
  optimizer: 'adam'
});

// Training
for (let epoch = 0; epoch < epochs; epoch++) {
  for (const { x, y } of batches) {
    const output = nn.forward(x);
    const loss = nn.computeLoss(output, y);
    nn.backward();
    nn.updateWeights();
  }
}

// Inference
const prediction = nn.forward(inputData);
```

### Activation Functions

| Function | Formula | Use Case |
|----------|---------|----------|
| ReLU | max(0, x) | Hidden layers (default) |
| Leaky ReLU | max(0.01x, x) | Prevent dying neurons |
| Sigmoid | 1/(1+e^-x) | Binary output |
| Tanh | (e^x - e^-x)/(e^x + e^-x) | Centered output |
| Softmax | e^xi/Σe^xj | Multi-class output |
| Linear | x | Regression output |

### Initialization

**Xavier (Glorot):**
```javascript
// For tanh, sigmoid
W = random.normal(0, sqrt(2 / (fan_in + fan_out)))
```

**He:**
```javascript
// For ReLU
W = random.normal(0, sqrt(2 / fan_in))
```

### Regularization

```javascript
const nn = new PRISM_NEURAL_NETWORK({
  // L2 regularization
  l2Lambda: 0.001,
  
  // Dropout
  dropout: 0.2,  // Drop 20% of neurons
  
  // Batch normalization
  batchNorm: true
});
```

### Loss Functions

| Task | Loss | Formula |
|------|------|---------|
| Regression | MSE | Σ(y - ŷ)² / n |
| Classification | Cross-entropy | -Σ y log(ŷ) |
| Multi-label | Binary CE | -Σ[y log(ŷ) + (1-y)log(1-ŷ)] |

---

# 3. LSTM - SEQUENCE MODELS

## Module: PRISM_LSTM_ENGINE (64 lines)

### LSTM Cell

```
Input Gate:     i_t = σ(W_i · [h_{t-1}, x_t] + b_i)
Forget Gate:    f_t = σ(W_f · [h_{t-1}, x_t] + b_f)
Output Gate:    o_t = σ(W_o · [h_{t-1}, x_t] + b_o)
Cell Candidate: c̃_t = tanh(W_c · [h_{t-1}, x_t] + b_c)
Cell State:     c_t = f_t ⊙ c_{t-1} + i_t ⊙ c̃_t
Hidden State:   h_t = o_t ⊙ tanh(c_t)
```

### PRISM Implementation

```javascript
const lstm = new PRISM_LSTM_ENGINE({
  inputSize: 10,      // Features per timestep
  hiddenSize: 64,     // LSTM hidden units
  numLayers: 2,       // Stacked LSTM layers
  bidirectional: false,
  dropout: 0.2,
  returnSequence: false  // true for seq-to-seq
});

// Input shape: [batchSize, seqLength, inputSize]
// Output shape: [batchSize, hiddenSize] (last hidden)
// Or: [batchSize, seqLength, hiddenSize] if returnSequence

// Training
for (const batch of trainingData) {
  const { sequences, labels } = batch;  // [B, T, F], [B]
  
  lstm.resetState();
  const output = lstm.forward(sequences);
  const loss = computeLoss(output, labels);
  lstm.backward(loss);
  optimizer.step();
}

// Inference for time series prediction
const prediction = lstm.forward(recentSequence);
```

### Sequence Prediction

```javascript
// Predict next N values
function predictSequence(lstm, startSeq, steps) {
  const predictions = [];
  let current = startSeq;
  
  for (let i = 0; i < steps; i++) {
    const pred = lstm.forward(current);
    predictions.push(pred);
    
    // Slide window: drop oldest, add prediction
    current = current.slice(1).concat([pred]);
  }
  
  return predictions;
}
```

### GRU Alternative

```javascript
// Simpler than LSTM, often similar performance
const gru = new PRISM_LSTM_ENGINE({
  cellType: 'gru',  // Fewer parameters than LSTM
  inputSize: 10,
  hiddenSize: 64
});
```

---

# 4. TRANSFORMERS

## Module: PRISM_TRANSFORMER_ENGINE (262 lines)

### Self-Attention

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V

Q = W_Q · X  (Query)
K = W_K · X  (Key)
V = W_V · X  (Value)
```

### Multi-Head Attention

```javascript
function multiHeadAttention(x, heads) {
  const outputs = [];
  for (let h = 0; h < heads; h++) {
    const Q = linear(x, W_Q[h]);
    const K = linear(x, W_K[h]);
    const V = linear(x, W_V[h]);
    outputs.push(attention(Q, K, V));
  }
  return linear(concat(outputs), W_O);
}
```

### PRISM Implementation

```javascript
const transformer = new PRISM_TRANSFORMER_ENGINE({
  inputSize: 64,        // Input embedding size
  modelDim: 128,        // Model dimension (d_model)
  numHeads: 8,          // Attention heads
  numLayers: 4,         // Encoder layers
  ffDim: 256,           // Feedforward dimension
  dropout: 0.1,
  maxSeqLength: 512,
  
  // Positional encoding
  positionalEncoding: 'sinusoidal' // or 'learned'
});

// Input: [batchSize, seqLength, inputSize]
const output = transformer.forward(sequence);
// Output: [batchSize, seqLength, modelDim]
```

### Positional Encoding

**Sinusoidal (fixed):**
```javascript
PE(pos, 2i) = sin(pos / 10000^(2i/d))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d))
```

**Learned:**
```javascript
// Trainable embedding matrix
this.posEmbedding = randomMatrix(maxSeqLength, modelDim);
```

### Encoder Block

```javascript
class TransformerEncoder {
  forward(x) {
    // Self-attention with residual
    const attnOut = this.selfAttention(x, x, x);
    x = this.layerNorm1(x + attnOut);
    
    // Feedforward with residual
    const ffOut = this.feedForward(x);
    x = this.layerNorm2(x + ffOut);
    
    return x;
  }
}
```

### Causal Masking (for autoregressive)

```javascript
function causalMask(seqLength) {
  // Lower triangular matrix
  const mask = [];
  for (let i = 0; i < seqLength; i++) {
    mask[i] = new Array(seqLength).fill(0);
    for (let j = 0; j <= i; j++) {
      mask[i][j] = 1;
    }
  }
  return mask;
}
```

---

# 5. AUTOENCODERS

## Module: PRISM_AUTOENCODER (141 lines)

### Architecture

```
Input → Encoder → Latent → Decoder → Reconstruction
  x       f(x)      z       g(z)        x̂

Loss = ||x - x̂||² + regularization
```

### PRISM Implementation

```javascript
const autoencoder = new PRISM_AUTOENCODER({
  inputSize: 100,         // Input dimension
  encoderLayers: [64, 32, 16],  // Compress
  latentSize: 8,          // Bottleneck
  decoderLayers: [16, 32, 64],  // Expand
  activation: 'relu',
  outputActivation: 'sigmoid',  // For normalized data
  
  // Variational AE
  variational: false  // true for VAE
});

// Training
for (const batch of data) {
  const reconstruction = autoencoder.forward(batch);
  const loss = autoencoder.loss(batch, reconstruction);
  autoencoder.backward(loss);
  optimizer.step();
}

// Get latent representation
const latent = autoencoder.encode(data);

// Reconstruct
const reconstructed = autoencoder.decode(latent);
```

### Variational Autoencoder (VAE)

```javascript
const vae = new PRISM_AUTOENCODER({
  variational: true,
  klWeight: 0.001  // β in β-VAE
});

// VAE loss = reconstruction + KL divergence
// L = ||x - x̂||² + β * KL(q(z|x) || p(z))

// Reparameterization trick
function sample(mean, logVar) {
  const std = Math.exp(0.5 * logVar);
  const eps = randomNormal(0, 1);
  return mean + eps * std;
}
```

### Applications

| Use Case | Configuration |
|----------|---------------|
| Dimensionality reduction | Small latent, no VAE |
| Anomaly detection | Train on normal, high reconstruction error = anomaly |
| Denoising | Add noise to input, reconstruct clean |
| Feature extraction | Use encoder only |
| Generation | VAE, sample from latent |

---

# 6. MANUFACTURING APPLICATIONS

## Tool Wear Prediction (LSTM)

```javascript
// Time series of sensor readings → wear prediction
const lstm = new PRISM_LSTM_ENGINE({
  inputSize: 12,  // Force, vibration, power, temperature...
  hiddenSize: 64,
  numLayers: 2
});

// Training data: [force, vib_x, vib_y, vib_z, power, temp, ...]
// Labels: wear level (0-1)

function predictToolWear(sensorHistory) {
  // Last 100 timesteps
  const sequence = sensorHistory.slice(-100);
  const wear = lstm.forward(sequence);
  return wear;  // 0-1 wear level
}
```

## Chatter Detection (Transformer)

```javascript
// Vibration frequency spectrum → chatter classification
const transformer = new PRISM_TRANSFORMER_ENGINE({
  inputSize: 128,  // FFT bins
  modelDim: 64,
  numHeads: 4,
  numLayers: 2
});

// Add classification head
const classifier = {
  layers: [64, 2],  // [chatter, no_chatter]
  activation: 'softmax'
};

function detectChatter(vibrationSignal) {
  const spectrum = computeFFT(vibrationSignal, 128);
  const features = transformer.forward(spectrum);
  const probs = classifier.forward(features);
  return probs[0] > 0.5 ? 'CHATTER' : 'STABLE';
}
```

## Surface Finish Prediction (Neural Network)

```javascript
const nn = new PRISM_NEURAL_NETWORK({
  layers: [10, 64, 32, 1],  // 10 inputs → 1 Ra value
  activation: 'relu',
  outputActivation: 'linear'
});

// Inputs: speed, feed, DOC, tool radius, tool wear, 
//         material hardness, coolant, rigidity, ...
// Output: Surface roughness Ra (μm)

function predictSurfaceFinish(params) {
  const input = normalizeInputs(params);
  const ra = nn.forward(input);
  return denormalizeOutput(ra);
}
```

## Anomaly Detection (Autoencoder)

```javascript
const ae = new PRISM_AUTOENCODER({
  inputSize: 20,
  encoderLayers: [16, 8],
  latentSize: 4,
  decoderLayers: [8, 16]
});

// Train on NORMAL machining data only
trainOnNormalData(ae, normalOperationData);

// Detect anomalies by reconstruction error
function detectAnomaly(currentState) {
  const reconstruction = ae.forward(currentState);
  const error = mse(currentState, reconstruction);
  
  if (error > anomalyThreshold) {
    return { anomaly: true, severity: error / anomalyThreshold };
  }
  return { anomaly: false };
}
```

## Feature Extraction for CAD

```javascript
// Reduce high-dim mesh/voxel to features
const ae = new PRISM_AUTOENCODER({
  inputSize: 10000,  // Voxel grid
  encoderLayers: [1024, 256, 64],
  latentSize: 32,
  decoderLayers: [64, 256, 1024]
});

// Extract features for classification
function extractCADFeatures(mesh) {
  const voxels = voxelizeMesh(mesh);
  const features = ae.encode(voxels);
  return features;  // 32-dim feature vector
}
```

---

# 7. TRAINING BEST PRACTICES

## Data Preparation

```javascript
// Normalize inputs
function normalize(data, stats) {
  return (data - stats.mean) / stats.std;
}

// Sequence padding
function padSequence(seq, maxLen, padValue = 0) {
  const padded = new Array(maxLen).fill(padValue);
  seq.forEach((v, i) => padded[i] = v);
  return padded;
}

// Train/val/test split
const [train, val, test] = splitData(data, [0.7, 0.15, 0.15]);
```

## Training Loop

```javascript
async function train(model, trainData, valData, config) {
  const { epochs, patience, minDelta } = config;
  let bestLoss = Infinity;
  let noImprove = 0;
  
  for (let epoch = 0; epoch < epochs; epoch++) {
    // Training
    let trainLoss = 0;
    for (const batch of trainData) {
      const loss = model.trainStep(batch);
      trainLoss += loss;
    }
    
    // Validation
    let valLoss = 0;
    for (const batch of valData) {
      valLoss += model.evaluate(batch);
    }
    
    console.log(`Epoch ${epoch}: train=${trainLoss}, val=${valLoss}`);
    
    // Early stopping
    if (valLoss < bestLoss - minDelta) {
      bestLoss = valLoss;
      noImprove = 0;
      model.saveCheckpoint();
    } else {
      noImprove++;
      if (noImprove >= patience) {
        console.log('Early stopping');
        model.loadCheckpoint();
        break;
      }
    }
  }
}
```

## Hyperparameter Guidelines

| Architecture | Hidden Size | Layers | Learning Rate |
|--------------|-------------|--------|---------------|
| Feedforward | 64-256 | 2-4 | 0.001 |
| LSTM | 32-128 | 1-3 | 0.001 |
| Transformer | 64-256 | 2-6 | 0.0001 |
| Autoencoder | Symmetric | 2-4 | 0.001 |

---

## ERROR CODES

| Code | Description | Resolution |
|------|-------------|------------|
| DL-1001 | Gradient explosion | Reduce LR, add gradient clipping |
| DL-1002 | Vanishing gradient | Use ReLU, LSTM/GRU, residuals |
| DL-1003 | Overfitting | Add dropout, regularization |
| DL-1004 | NaN loss | Check data, reduce LR |
| DL-1005 | Memory overflow | Reduce batch/sequence size |

---

**END OF PRISM AI DEEP LEARNING SKILL**
**Version 1.0 | Level 4 Reference | 4 Modules | ~573 Lines**
**MIT Foundation: 6.036, Stanford CS 231N, CS 224N**
