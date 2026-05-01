const PRISM_CONTROL_SYSTEMS_MIT = {
    /**
     * PID Controller implementation
     * @param {number} Kp - Proportional gain
     * @param {number} Ki - Integral gain
     * @param {number} Kd - Derivative gain
     * @returns {Object} PID controller object
     */
    createPIDController: function(Kp, Ki, Kd) {
        return {
            Kp: Kp,
            Ki: Ki,
            Kd: Kd,
            integral: 0,
            prevError: 0,
            
            /**
             * Compute control output
             * @param {number} setpoint - Desired value
             * @param {number} measured - Measured value
             * @param {number} dt - Time step
             * @returns {number} Control output
             */
            compute: function(setpoint, measured, dt) {
                const error = setpoint - measured;
                
                // Proportional term
                const P = this.Kp * error;
                
                // Integral term (with anti-windup)
                this.integral += error * dt;
                const I = this.Ki * this.integral;
                
                // Derivative term (on measurement to avoid derivative kick)
                const derivative = (error - this.prevError) / dt;
                const D = this.Kd * derivative;
                
                this.prevError = error;
                
                return P + I + D;
            },
            
            /**
             * Reset controller state
             */
            reset: function() {
                this.integral = 0;
                this.prevError = 0;
            }
        };
    },

    /**
     * Ziegler-Nichols PID tuning
     * @param {number} Ku - Ultimate gain
     * @param {number} Tu - Ultimate period
     * @param {string} type - 'P', 'PI', or 'PID'
     * @returns {Object} Tuned gains
     */
    zieglerNicholsTuning: function(Ku, Tu, type = 'PID') {
        switch (type) {
            case 'P':
                return { Kp: 0.5 * Ku, Ki: 0, Kd: 0 };
            case 'PI':
                return { Kp: 0.45 * Ku, Ki: 1.2 * Ku / Tu, Kd: 0 };
            case 'PID':
                return { Kp: 0.6 * Ku, Ki: 2 * Ku / Tu, Kd: Ku * Tu / 8 };
            default:
                return { Kp: 0.6 * Ku, Ki: 2 * Ku / Tu, Kd: Ku * Tu / 8 };
        }
    },

    /**
     * First-order system step response
     * @param {number} K - DC gain
     * @param {number} tau - Time constant
     * @param {number} t - Time
     * @returns {number} Output at time t
     */
    firstOrderStep: function(K, tau, t) {
        return K * (1 - Math.exp(-t / tau));
    },

    /**
     * Second-order system step response
     * @param {number} K - DC gain
     * @param {number} wn - Natural frequency
     * @param {number} zeta - Damping ratio
     * @param {number} t - Time
     * @returns {number} Output at time t
     */
    secondOrderStep: function(K, wn, zeta, t) {
        if (zeta < 1) {
            // Underdamped
            const wd = wn * Math.sqrt(1 - zeta * zeta);
            const phi = Math.atan(zeta / Math.sqrt(1 - zeta * zeta));
            return K * (1 - (Math.exp(-zeta * wn * t) / Math.sqrt(1 - zeta * zeta)) *
                   Math.sin(wd * t + phi + Math.PI / 2));
        } else if (zeta === 1) {
            // Critically damped
            return K * (1 - (1 + wn * t) * Math.exp(-wn * t));
        } else {
            // Overdamped
            const s1 = -wn * (zeta - Math.sqrt(zeta * zeta - 1));
            const s2 = -wn * (zeta + Math.sqrt(zeta * zeta - 1));
            return K * (1 + (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s1 - s2));
        }
    }
}