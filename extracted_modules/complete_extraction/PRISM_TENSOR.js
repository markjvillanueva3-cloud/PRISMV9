const PRISM_TENSOR = {

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
    shape: function(tensor) {
        const shape = [];
        let current = tensor;
        while (Array.isArray(current)) {
            shape.push(current.length);
            current = current[0];
        }
        return shape;
    },
    clone: function(tensor) {
        if (!Array.isArray(tensor)) return tensor;
        return tensor.map(t => this.clone(t));
    },
    add: function(a, b) {
        if (!Array.isArray(a)) return a + b;
        return a.map((ai, i) => this.add(ai, b[i]));
    },
    multiply: function(a, scalar) {
        if (!Array.isArray(a)) return a * scalar;
        return a.map(ai => this.multiply(ai, scalar));
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
    flatten: function(tensor) {
        if (!Array.isArray(tensor)) return [tensor];
        return tensor.flatMap(t => this.flatten(t));
    }
}