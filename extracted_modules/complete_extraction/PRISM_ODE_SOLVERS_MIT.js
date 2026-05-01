const PRISM_ODE_SOLVERS_MIT = {
    /**
     * Euler forward (explicit) method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerForward: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            y.push(y[i] + h * f(t[i], y[i]));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Euler backward (implicit) method
     * Uses Newton's method for implicit equation
     * @param {Function} f - ODE function
     * @param {Function} df - Partial derivative ∂f/∂y
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    eulerBackward: function(f, df, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const tNext = t[i] + h;
            let yNext = y[i]; // Initial guess
            
            // Newton iteration to solve y_{n+1} = y_n + h*f(t_{n+1}, y_{n+1})
            for (let iter = 0; iter < 10; iter++) {
                const F = yNext - y[i] - h * f(tNext, yNext);
                const dF = 1 - h * df(tNext, yNext);
                yNext = yNext - F / dF;
            }
            
            y.push(yNext);
            t.push(tNext);
        }
        
        return { t, y };
    },

    /**
     * Classical 4th-order Runge-Kutta method
     * @param {Function} f - ODE function f(t, y)
     * @param {number} y0 - Initial condition
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, y} arrays
     */
    rk4: function(f, y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const t = [t0];
        const y = [y0];
        
        for (let i = 0; i < n; i++) {
            const k1 = f(t[i], y[i]);
            const k2 = f(t[i] + h / 2, y[i] + h * k1 / 2);
            const k3 = f(t[i] + h / 2, y[i] + h * k2 / 2);
            const k4 = f(t[i] + h, y[i] + h * k3);
            
            y.push(y[i] + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4));
            t.push(t[i] + h);
        }
        
        return { t, y };
    },

    /**
     * Solve system of ODEs using RK4
     * @param {Function} F - System function F(t, Y) returning array
     * @param {Array} Y0 - Initial conditions array
     * @param {number} t0 - Initial time
     * @param {number} tf - Final time
     * @param {number} n - Number of steps
     * @returns {Object} {t, Y} where Y is 2D array
     */
    rk4System: function(F, Y0, t0, tf, n) {
        const h = (tf - t0) / n;
        const dim = Y0.length;
        const t = [t0];
        const Y = [Y0.slice()];
        
        for (let i = 0; i < n; i++) {
            const Yi = Y[i];
            const ti = t[i];
            
            const k1 = F(ti, Yi);
            const k2 = F(ti + h / 2, Yi.map((y, j) => y + h * k1[j] / 2));
            const k3 = F(ti + h / 2, Yi.map((y, j) => y + h * k2[j] / 2));
            const k4 = F(ti + h, Yi.map((y, j) => y + h * k3[j]));
            
            const Ynext = Yi.map((y, j) => 
                y + (h / 6) * (k1[j] + 2 * k2[j] + 2 * k3[j] + k4[j])
            );
            
            Y.push(Ynext);
            t.push(ti + h);
        }
        
        return { t, Y };
    }
};