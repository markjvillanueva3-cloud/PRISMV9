// PRISM_LSTM_ENGINE - Extracted from PRISM v8.89.002
// Lines 779142-779205 (64 lines)
// Category: sequence_models
// Extracted: 2026-01-29T21:27:24.559103
// Source: MIT/Stanford AI/ML Courses

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