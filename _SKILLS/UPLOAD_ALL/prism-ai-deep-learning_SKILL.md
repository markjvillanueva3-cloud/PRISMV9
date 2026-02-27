---
name: prism-ai-deep-learning
description: |
  Deep Learning architectures for PRISM. Neural Networks, LSTM, Transformers.
---

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

**END OF PRISM AI DEEP LEARNING SKILL**
**Version 1.0 | Level 4 Reference | 4 Modules | ~573 Lines**
**MIT Foundation: 6.036, Stanford CS 231N, CS 224N**
