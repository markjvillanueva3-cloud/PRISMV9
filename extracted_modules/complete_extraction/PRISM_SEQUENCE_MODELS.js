const PRISM_SEQUENCE_MODELS = {
    name: 'PRISM Sequence Models',
    version: '1.0.0',
    
    BiLSTM: {
        create: function(inputDim, hiddenDim) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            const createWeights = () => ({
                Wi: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Ui: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bi: Array(hiddenDim).fill(0),
                Wf: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Uf: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bf: Array(hiddenDim).fill(1),
                Wc: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Uc: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bc: Array(hiddenDim).fill(0),
                Wo: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Uo: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bo: Array(hiddenDim).fill(0)
            });
            return { inputDim, hiddenDim, forward: createWeights(), backward: createWeights() };
        },
        
        lstmCell: function(weights, x, hPrev, cPrev) {
            const hiddenDim = weights.bi.length;
            const sigmoid = v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v))));
            const tanh = v => Math.tanh(v);
            
            const computeGate = (W, U, b, activation) => b.map((bias, j) => {
                let sum = bias;
                for (let k = 0; k < x.length; k++) sum += x[k] * W[k][j];
                for (let k = 0; k < hiddenDim; k++) sum += hPrev[k] * U[k][j];
                return activation(sum);
            });
            
            const i = computeGate(weights.Wi, weights.Ui, weights.bi, sigmoid);
            const f = computeGate(weights.Wf, weights.Uf, weights.bf, sigmoid);
            const cCandidate = computeGate(weights.Wc, weights.Uc, weights.bc, tanh);
            const o = computeGate(weights.Wo, weights.Uo, weights.bo, sigmoid);
            
            const c = cPrev.map((cp, j) => f[j] * cp + i[j] * cCandidate[j]);
            const h = c.map((cj, j) => o[j] * tanh(cj));
            return { h, c };
        },
        
        forward: function(model, sequence) {
            const seqLen = sequence.length, hiddenDim = model.hiddenDim;
            let hF = Array(hiddenDim).fill(0), cF = Array(hiddenDim).fill(0);
            let hB = Array(hiddenDim).fill(0), cB = Array(hiddenDim).fill(0);
            const fwdOut = [], bwdOut = [];
            
            for (let t = 0; t < seqLen; t++) {
                const res = this.lstmCell(model.forward, sequence[t], hF, cF);
                hF = res.h; cF = res.c;
                fwdOut.push([...hF]);
            }
            for (let t = seqLen - 1; t >= 0; t--) {
                const res = this.lstmCell(model.backward, sequence[t], hB, cB);
                hB = res.h; cB = res.c;
                bwdOut.unshift([...hB]);
            }
            return { outputs: fwdOut.map((f, t) => [...f, ...bwdOut[t]]), finalForward: hF, finalBackward: hB };
        }
    },
    
    BiGRU: {
        create: function(inputDim, hiddenDim) {
            const xavier = (fanIn, fanOut) => Math.sqrt(6 / (fanIn + fanOut));
            const createWeights = () => ({
                Wr: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Ur: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                br: Array(hiddenDim).fill(0),
                Wz: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Uz: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bz: Array(hiddenDim).fill(0),
                Wh: Array(inputDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(inputDim,hiddenDim))),
                Uh: Array(hiddenDim).fill(0).map(() => Array(hiddenDim).fill(0).map(() => (Math.random()-0.5)*2*xavier(hiddenDim,hiddenDim))),
                bh: Array(hiddenDim).fill(0)
            });
            return { inputDim, hiddenDim, forward: createWeights(), backward: createWeights() };
        },
        
        gruCell: function(weights, x, hPrev) {
            const hiddenDim = weights.br.length;
            const sigmoid = v => 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, v))));
            const tanh = v => Math.tanh(v);
            
            const r = weights.br.map((b, j) => {
                let sum = b;
                for (let k = 0; k < x.length; k++) sum += x[k] * weights.Wr[k][j];
                for (let k = 0; k < hiddenDim; k++) sum += hPrev[k] * weights.Ur[k][j];
                return sigmoid(sum);
            });
            const z = weights.bz.map((b, j) => {
                let sum = b;
                for (let k = 0; k < x.length; k++) sum += x[k] * weights.Wz[k][j];
                for (let k = 0; k < hiddenDim; k++) sum += hPrev[k] * weights.Uz[k][j];
                return sigmoid(sum);
            });
            const hCandidate = weights.bh.map((b, j) => {
                let sum = b;
                for (let k = 0; k < x.length; k++) sum += x[k] * weights.Wh[k][j];
                for (let k = 0; k < hiddenDim; k++) sum += (r[k] * hPrev[k]) * weights.Uh[k][j];
                return tanh(sum);
            });
            return hPrev.map((hp, j) => (1 - z[j]) * hp + z[j] * hCandidate[j]);
        },
        
        forward: function(model, sequence) {
            const seqLen = sequence.length, hiddenDim = model.hiddenDim;
            let hF = Array(hiddenDim).fill(0), hB = Array(hiddenDim).fill(0);
            const fwdOut = [], bwdOut = [];
            
            for (let t = 0; t < seqLen; t++) {
                hF = this.gruCell(model.forward, sequence[t], hF);
                fwdOut.push([...hF]);
            }
            for (let t = seqLen - 1; t >= 0; t--) {
                hB = this.gruCell(model.backward, sequence[t], hB);
                bwdOut.unshift([...hB]);
            }
            return { outputs: fwdOut.map((f, t) => [...f, ...bwdOut[t]]), finalForward: hF, finalBackward: hB };
        }
    }
}