const PRISM_RNN_ADVANCED = {
    // LSTM Cell
    createLSTMCell(inputSize, hiddenSize) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputSize + hiddenSize));
        
        return {
            inputSize,
            hiddenSize,
            
            // Gates: input, forget, cell, output
            Wi: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wf: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wc: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wo: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            
            Ui: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uf: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uc: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uo: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            
            bi: Array(hiddenSize).fill(0),
            bf: Array(hiddenSize).fill(1), // Forget bias initialized to 1
            bc: Array(hiddenSize).fill(0),
            bo: Array(hiddenSize).fill(0),
            
            forward(x, hPrev, cPrev) {
                const h = hPrev || Array(this.hiddenSize).fill(0);
                const c = cPrev || Array(this.hiddenSize).fill(0);
                
                // Input gate
                const i = this._gate(x, h, this.Wi, this.Ui, this.bi, 'sigmoid');
                
                // Forget gate
                const f = this._gate(x, h, this.Wf, this.Uf, this.bf, 'sigmoid');
                
                // Cell candidate
                const cTilde = this._gate(x, h, this.Wc, this.Uc, this.bc, 'tanh');
                
                // New cell state
                const cNew = c.map((cv, idx) => f[idx] * cv + i[idx] * cTilde[idx]);
                
                // Output gate
                const o = this._gate(x, h, this.Wo, this.Uo, this.bo, 'sigmoid');
                
                // New hidden state
                const hNew = o.map((ov, idx) => ov * Math.tanh(cNew[idx]));
                
                return { h: hNew, c: cNew, gates: { i, f, o, cTilde } };
            },
            
            _gate(x, h, W, U, b, activation) {
                const result = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = b[j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += W[j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += U[j][k] * h[k];
                    }
                    result.push(activation === 'sigmoid' ? 1 / (1 + Math.exp(-sum)) : Math.tanh(sum));
                }
                return result;
            }
        };
    },
    
    // GRU Cell
    createGRUCell(inputSize, hiddenSize) {
        const initWeight = () => (Math.random() - 0.5) * Math.sqrt(2 / (inputSize + hiddenSize));
        
        return {
            inputSize,
            hiddenSize,
            
            // Gates: reset, update, candidate
            Wr: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wz: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            Wh: Array(hiddenSize).fill().map(() => Array(inputSize).fill().map(initWeight)),
            
            Ur: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uz: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            Uh: Array(hiddenSize).fill().map(() => Array(hiddenSize).fill().map(initWeight)),
            
            br: Array(hiddenSize).fill(0),
            bz: Array(hiddenSize).fill(0),
            bh: Array(hiddenSize).fill(0),
            
            forward(x, hPrev) {
                const h = hPrev || Array(this.hiddenSize).fill(0);
                
                // Reset gate
                const r = this._gate(x, h, this.Wr, this.Ur, this.br, 'sigmoid');
                
                // Update gate
                const z = this._gate(x, h, this.Wz, this.Uz, this.bz, 'sigmoid');
                
                // Candidate hidden state (with reset gate applied)
                const hReset = h.map((hv, idx) => r[idx] * hv);
                const hTilde = this._gate(x, hReset, this.Wh, this.Uh, this.bh, 'tanh');
                
                // New hidden state
                const hNew = h.map((hv, idx) => (1 - z[idx]) * hv + z[idx] * hTilde[idx]);
                
                return { h: hNew, gates: { r, z, hTilde } };
            },
            
            _gate(x, h, W, U, b, activation) {
                const result = [];
                for (let j = 0; j < this.hiddenSize; j++) {
                    let sum = b[j];
                    for (let k = 0; k < this.inputSize; k++) {
                        sum += W[j][k] * x[k];
                    }
                    for (let k = 0; k < this.hiddenSize; k++) {
                        sum += U[j][k] * h[k];
                    }
                    result.push(activation === 'sigmoid' ? 1 / (1 + Math.exp(-sum)) : Math.tanh(sum));
                }
                return result;
            }
        };
    },
    
    // Bidirectional RNN wrapper
    createBidirectionalRNN(forwardCell, backwardCell) {
        return {
            forward: forwardCell,
            backward: backwardCell,
            
            process(sequence) {
                const seqLen = sequence.length;
                const forwardOutputs = [];
                const backwardOutputs = [];
                
                // Forward pass
                let hF = null, cF = null;
                for (let t = 0; t < seqLen; t++) {
                    const result = this.forward.forward(sequence[t], hF, cF);
                    hF = result.h;
                    cF = result.c;
                    forwardOutputs.push(hF);
                }
                
                // Backward pass
                let hB = null, cB = null;
                for (let t = seqLen - 1; t >= 0; t--) {
                    const result = this.backward.forward(sequence[t], hB, cB);
                    hB = result.h;
                    cB = result.c;
                    backwardOutputs.unshift(hB);
                }
                
                // Concatenate outputs
                const outputs = forwardOutputs.map((fwd, t) => 
                    [...fwd, ...backwardOutputs[t]]
                );
                
                return {
                    outputs,
                    finalForward: hF,
                    finalBackward: hB
                };
            }
        };
    },
    
    // Sequence-to-Sequence with Attention
    createSeq2Seq(encoderCell, decoderCell, attentionDim) {
        return {
            encoder: encoderCell,
            decoder: decoderCell,
            
            encode(sequence) {
                const outputs = [];
                let h = null, c = null;
                
                for (const x of sequence) {
                    const result = this.encoder.forward(x, h, c);
                    h = result.h;
                    c = result.c;
                    outputs.push(h);
                }
                
                return { encoderOutputs: outputs, finalState: { h, c } };
            },
            
            decode(encoderOutputs, initialState, maxLength, startToken, endToken) {
                const outputs = [];
                let h = initialState.h;
                let c = initialState.c;
                let input = startToken;
                
                for (let t = 0; t < maxLength; t++) {
                    // Attention over encoder outputs
                    const context = this._attention(h, encoderOutputs);
                    
                    // Concatenate input with context
                    const decoderInput = [...input, ...context];
                    
                    // Decoder step
                    const result = this.decoder.forward(decoderInput, h, c);
                    h = result.h;
                    c = result.c;
                    
                    outputs.push(h);
                    input = h; // Use output as next input (teacher forcing would use ground truth)
                    
                    // Check for end token (simplified)
                    if (this._isEndToken(h, endToken)) break;
                }
                
                return outputs;
            },
            
            _attention(query, keys) {
                const scores = keys.map(k => 
                    query.reduce((sum, q, i) => sum + q * k[i], 0)
                );
                
                const maxScore = Math.max(...scores);
                const exps = scores.map(s => Math.exp(s - maxScore));
                const sum = exps.reduce((a, b) => a + b, 0);
                const weights = exps.map(e => e / sum);
                
                // Weighted sum of keys
                const context = new Array(keys[0].length).fill(0);
                for (let i = 0; i < keys.length; i++) {
                    for (let j = 0; j < keys[i].length; j++) {
                        context[j] += weights[i] * keys[i][j];
                    }
                }
                
                return context;
            },
            
            _isEndToken(output, endToken) {
                // Simplified check
                return false;
            }
        };
    },
    
    // Sequence processing utilities
    utils: {
        // Pack sequences for efficient batch processing
        packSequences(sequences, sortByLength = true) {
            if (sortByLength) {
                sequences = [...sequences].sort((a, b) => b.length - a.length);
            }
            
            const lengths = sequences.map(s => s.length);
            const maxLen = Math.max(...lengths);
            
            const packed = [];
            for (let t = 0; t < maxLen; t++) {
                const batch = [];
                for (let i = 0; i < sequences.length; i++) {
                    if (t < sequences[i].length) {
                        batch.push(sequences[i][t]);
                    }
                }
                if (batch.length > 0) {
                    packed.push(batch);
                }
            }
            
            return { packed, lengths };
        },
        
        // Pad sequences to same length
        padSequences(sequences, maxLen = null, padValue = 0) {
            maxLen = maxLen || Math.max(...sequences.map(s => s.length));
            
            return sequences.map(seq => {
                const dim = seq[0]?.length || 1;
                const padded = [...seq];
                while (padded.length < maxLen) {
                    padded.push(Array.isArray(seq[0]) ? new Array(dim).fill(padValue) : padValue);
                }
                return padded;
            });
        }
    }
}