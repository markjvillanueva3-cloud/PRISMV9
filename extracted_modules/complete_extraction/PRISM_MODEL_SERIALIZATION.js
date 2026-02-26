const PRISM_MODEL_SERIALIZATION = {

    /**
     * Serialize model to JSON
     */
    toJSON: function(model) {
        const serialized = {
            name: model.name || 'unnamed',
            version: '2.0',
            timestamp: Date.now(),
            architecture: [],
            weights: []
        };
        if (model.layers) {
            for (let i = 0; i < model.layers.length; i++) {
                const layer = model.layers[i];
                const layerInfo = {
                    type: layer.constructor.name,
                    index: i
                };
                // Store layer configuration
                if (layer.inputSize !== undefined) layerInfo.inputSize = layer.inputSize;
                if (layer.outputSize !== undefined) layerInfo.outputSize = layer.outputSize;
                if (layer.hiddenSize !== undefined) layerInfo.hiddenSize = layer.hiddenSize;
                if (layer.activation !== undefined) layerInfo.activation = layer.activation;
                if (layer.rate !== undefined) layerInfo.rate = layer.rate;
                if (layer.kernelSize !== undefined) layerInfo.kernelSize = layer.kernelSize;
                if (layer.inChannels !== undefined) layerInfo.inChannels = layer.inChannels;
                if (layer.outChannels !== undefined) layerInfo.outChannels = layer.outChannels;

                serialized.architecture.push(layerInfo);

                // Store weights
                if (layer.getParams) {
                    serialized.weights.push(layer.getParams());
                } else if (layer.weights) {
                    serialized.weights.push({
                        weights: PRISM_TENSOR_ENHANCED.clone(layer.weights),
                        biases: layer.biases ? [...layer.biases] : null
                    });
                } else {
                    serialized.weights.push(null);
                }
            }
        }
        return JSON.stringify(serialized);
    },
    /**
     * Deserialize model from JSON
     */
    fromJSON: function(jsonString, PRISM_NN_LAYERS_REF = null) {
        const data = JSON.parse(jsonString);
        const layers = PRISM_NN_LAYERS_REF || PRISM_NN_LAYERS_ADVANCED;

        // Reconstruct model
        const model = {
            name: data.name,
            layers: []
        };
        for (let i = 0; i < data.architecture.length; i++) {
            const arch = data.architecture[i];
            const weights = data.weights[i];

            let layer;
            switch (arch.type) {
                case 'Dense':
                    layer = new (layers.Dense || PRISM_NN_LAYERS.Dense)(
                        arch.inputSize, arch.outputSize, arch.activation
                    );
                    break;
                case 'Conv2D':
                    layer = new layers.Conv2D(
                        arch.inChannels, arch.outChannels, arch.kernelSize
                    );
                    break;
                case 'LSTM':
                    layer = new layers.LSTM(arch.inputSize, arch.hiddenSize);
                    break;
                case 'GRU':
                    layer = new layers.GRU(arch.inputSize, arch.hiddenSize);
                    break;
                case 'MaxPool2D':
                    layer = new layers.MaxPool2D(arch.poolSize);
                    break;
                case 'Flatten':
                    layer = new layers.Flatten();
                    break;
                case 'LayerNorm':
                    layer = new layers.LayerNorm(arch.size);
                    break;
                case 'BatchNorm1D':
                    layer = new layers.BatchNorm1D(arch.numFeatures);
                    break;
                default:
                    console.warn(`[Serialization] Unknown layer type: ${arch.type}`);
                    continue;
            }
            // Restore weights
            if (weights && layer.setParams) {
                layer.setParams(weights);
            } else if (weights && layer.weights) {
                layer.weights = PRISM_TENSOR_ENHANCED.clone(weights.weights);
                if (weights.biases) layer.biases = [...weights.biases];
            }
            model.layers.push(layer);
        }
        return model;
    },
    /**
     * Save to localStorage
     */
    saveToStorage: function(model, key) {
        try {
            const json = this.toJSON(model);
            localStorage.setItem(`prism_model_${key}`, json);
            return { success: true, size: json.length };
        } catch (e) {
            console.error('[Serialization] Save failed:', e);
            return { success: false, error: e.message };
        }
    },
    /**
     * Load from localStorage
     */
    loadFromStorage: function(key, layersRef = null) {
        try {
            const json = localStorage.getItem(`prism_model_${key}`);
            if (!json) return { success: false, error: 'Model not found' };

            const model = this.fromJSON(json, layersRef);
            return { success: true, model };
        } catch (e) {
            console.error('[Serialization] Load failed:', e);
            return { success: false, error: e.message };
        }
    },
    /**
     * Export to downloadable file
     */
    exportToFile: function(model, filename = 'prism_model.json') {
        const json = this.toJSON(model);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        if (typeof document !== 'undefined') {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }
        return { success: true, json };
    },
    /**
     * List saved models
     */
    listSavedModels: function() {
        const models = [];
        if (typeof localStorage !== 'undefined') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key.startsWith('prism_model_')) {
                    const name = key.replace('prism_model_', '');
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        models.push({
                            name,
                            timestamp: data.timestamp,
                            layers: data.architecture.length
                        });
                    } catch (e) {
                        models.push({ name, error: true });
                    }
                }
            }
        }
        return models;
    }
}