const PRISM_ATTENTION_VARIANTS = {
    name: 'PRISM Attention Variants',
    version: '1.0.0',
    
    LinearAttention: {
        featureMap: function(x) { return x.map(row => row.map(v => (v > 0 ? v : Math.exp(v) - 1) + 1)); },
        
        forward: function(Q, K, V) {
            const seqLen = Q.length, dK = Q[0].length, dV = V[0].length;
            const phiQ = this.featureMap(Q), phiK = this.featureMap(K);
            
            const KTV = Array(dK).fill(null).map(() => Array(dV).fill(0));
            const KTone = Array(dK).fill(0);
            for (let i = 0; i < dK; i++) {
                for (let n = 0; n < seqLen; n++) {
                    KTone[i] += phiK[n][i];
                    for (let j = 0; j < dV; j++) KTV[i][j] += phiK[n][i] * V[n][j];
                }
            }
            
            return Array(seqLen).fill(null).map((_, n) => {
                const out = Array(dV).fill(0);
                let denom = 0;
                for (let i = 0; i < dK; i++) {
                    denom += phiQ[n][i] * KTone[i];
                    for (let j = 0; j < dV; j++) out[j] += phiQ[n][i] * KTV[i][j];
                }
                return out.map(v => v / (denom + 1e-6));
            });
        },
        
        causalForward: function(Q, K, V) {
            const seqLen = Q.length, dK = Q[0].length, dV = V[0].length;
            const phiQ = this.featureMap(Q), phiK = this.featureMap(K);
            const output = Array(seqLen).fill(null).map(() => Array(dV).fill(0));
            const runningKTV = Array(dK).fill(null).map(() => Array(dV).fill(0));
            const runningKTone = Array(dK).fill(0);
            
            for (let n = 0; n < seqLen; n++) {
                for (let i = 0; i < dK; i++) {
                    runningKTone[i] += phiK[n][i];
                    for (let j = 0; j < dV; j++) runningKTV[i][j] += phiK[n][i] * V[n][j];
                }
                let denom = 0;
                for (let i = 0; i < dK; i++) {
                    denom += phiQ[n][i] * runningKTone[i];
                    for (let j = 0; j < dV; j++) output[n][j] += phiQ[n][i] * runningKTV[i][j];
                }
                for (let j = 0; j < dV; j++) output[n][j] /= (denom + 1e-6);
            }
            return output;
        }
    },
    
    LocalAttention: {
        forward: function(Q, K, V, windowSize = 64) {
            const seqLen = Q.length, dK = Q[0].length, dV = V[0].length;
            return Array(seqLen).fill(null).map((_, i) => {
                const startJ = Math.max(0, i - windowSize), endJ = Math.min(seqLen, i + windowSize + 1);
                const scores = [];
                for (let j = startJ; j < endJ; j++) {
                    scores.push(Q[i].reduce((sum, v, k) => sum + v * K[j][k], 0) / Math.sqrt(dK));
                }
                const maxScore = Math.max(...scores);
                const expScores = scores.map(s => Math.exp(s - maxScore));
                const sumExp = expScores.reduce((a, b) => a + b, 0);
                const weights = expScores.map(e => e / sumExp);
                
                const out = Array(dV).fill(0);
                for (let j = startJ; j < endJ; j++) {
                    const w = weights[j - startJ];
                    for (let k = 0; k < dV; k++) out[k] += w * V[j][k];
                }
                return out;
            });
        }
    }
}