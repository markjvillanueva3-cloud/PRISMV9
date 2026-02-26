const PRISM_NEURAL_NETWORK = {

    Sequential: class {
        constructor(name = 'model') {
            this.name = name;
            this.layers = [];
            this.learningRate = 0.001;
            this.lossType = 'mse';
            this.history = { loss: [], accuracy: [] };
        }
        add(layer) {
            this.layers.push(layer);
            return this;
        }
        compile(options = {}) {
            this.learningRate = options.learningRate || 0.001;
            this.lossType = options.loss || 'mse';
        }
        forward(input) {
            let output = input;
            for (const layer of this.layers) {
                output = layer.forward(output);
            }
            return output;
        }
        predict(input) {
            this.layers.forEach(l => l.setTraining && l.setTraining(false));
            const output = this.forward(input);
            this.layers.forEach(l => l.setTraining && l.setTraining(true));
            return output;
        }
        _computeLoss(predicted, actual) {
            if (this.lossType === 'crossentropy' || this.lossType === 'softmax_crossentropy') {
                return -actual.reduce((sum, a, i) => sum + a * Math.log(predicted[i] + 1e-10), 0);
            } else if (this.lossType === 'bce') {
                return -actual.reduce((sum, a, i) =>
                    sum + a * Math.log(predicted[i] + 1e-10) + (1 - a) * Math.log(1 - predicted[i] + 1e-10), 0
                ) / actual.length;
            } else {
                return predicted.reduce((sum, p, i) => sum + (p - actual[i]) ** 2, 0) / predicted.length;
            }
        }
        _computeLossGradient(predicted, actual) {
            if (this.lossType === 'crossentropy' || this.lossType === 'softmax_crossentropy') {
                return predicted.map((p, i) => p - actual[i]);
            } else if (this.lossType === 'bce') {
                return predicted.map((p, i) =>
                    (-actual[i] / (p + 1e-10) + (1 - actual[i]) / (1 - p + 1e-10)) / actual.length
                );
            } else {
                return predicted.map((p, i) => 2 * (p - actual[i]) / predicted.length);
            }
        }
        fit(X, y, options = {}) {
            const epochs = options.epochs || 100;
            const verbose = options.verbose !== false;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;
                let correct = 0;

                // Shuffle indices
                const indices = [...Array(X.length).keys()];
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                // Train on each sample
                for (const idx of indices) {
                    const input = X[idx];
                    const target = y[idx];

                    const output = this.forward(input);
                    const loss = this._computeLoss(output, target);
                    epochLoss += loss;

                    const predClass = output.indexOf(Math.max(...output));
                    const actualClass = target.indexOf(Math.max(...target));
                    if (predClass === actualClass) correct++;

                    let grad = this._computeLossGradient(output, target);
                    for (let i = this.layers.length - 1; i >= 0; i--) {
                        grad = this.layers[i].backward(grad, this.learningRate);
                    }
                }
                const avgLoss = epochLoss / X.length;
                const accuracy = correct / X.length;

                this.history.loss.push(avgLoss);
                this.history.accuracy.push(accuracy);

                if (verbose && (epoch % Math.max(1, Math.floor(epochs / 10)) === 0 || epoch === epochs - 1)) {
                    console.log(`[${this.name}] Epoch ${epoch + 1}/${epochs} - Loss: ${avgLoss.toFixed(6)} - Acc: ${(accuracy * 100).toFixed(1)}%`);
                }
            }
            return this.history;
        }
        summary() {
            console.log(`Model: ${this.name}`);
            this.layers.forEach((l, i) => {
                const params = l.weights ? l.inputSize * l.outputSize + l.outputSize : 0;
                console.log(`  Layer ${i}: ${l.constructor.name} (${params} params)`);
            });
        }
    }
}