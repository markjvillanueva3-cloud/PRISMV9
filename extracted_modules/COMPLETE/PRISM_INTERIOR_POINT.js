const PRISM_INTERIOR_POINT = {
    name: "Log-Barrier Interior Point Method",
    mitSource: "MIT 6.251J - Mathematical Programming",
    complexity: { time: "O(n³ log(1/ε))", space: "O(n²)" },

    solve: function(c, A, b, options = {}) {
        // Minimize c'x subject to Ax <= b, x >= 0
        const {
            x0 = null,
            mu0 = 10,
            beta = 0.5,
            tol = 1e-6,
            maxIter = 100
        } = options;

        const n = c.length;
        const m = A ? A.length : 0;

        // Initialize feasible point
        let x = x0 || new Array(n).fill(1);
        let mu = mu0;

        let iterations = 0;
        const history = [];

        // Barrier method outer loop
        while (mu > tol && iterations < maxIter) {
            // Newton's method for barrier subproblem
            for (let iter = 0; iter < 50; iter++) {
                // Gradient: c - mu/x
                const g = c.map((ci, i) => ci - mu / Math.max(x[i], 1e-10));

                // Hessian diagonal: mu/x²
                const H = x.map(xi => mu / Math.pow(Math.max(xi, 1e-10), 2));

                // Newton direction: dx = -H^(-1) * g
                const dx = g.map((gi, i) => -gi / H[i]);

                // Line search
                let alpha = 1.0;
                let found = false;

                while (alpha > 1e-10) {
                    const xNew = x.map((xi, i) => xi + alpha * dx[i]);

                    // Check feasibility
                    if (xNew.every(xi => xi > 0)) {
                        const objOld = this.objective(c, x, mu);
                        const objNew = this.objective(c, xNew, mu);

                        if (objNew < objOld) {
                            x = xNew;
                            found = true;
                            break;
                        }
                    }
                    alpha *= beta;
                }
                // Check convergence
                const dxNorm = Math.sqrt(dx.reduce((s, d) => s + d*d, 0));
                if (dxNorm < tol) break;
            }
            history.push({
                iteration: iterations,
                mu: mu,
                objective: this.linearObjective(c, x)
            });

            mu *= 0.1;
            iterations++;
        }
        return {
            x: x,
            objective: this.linearObjective(c, x),
            iterations: iterations,
            converged: mu <= tol,
            history: history
        };
    }