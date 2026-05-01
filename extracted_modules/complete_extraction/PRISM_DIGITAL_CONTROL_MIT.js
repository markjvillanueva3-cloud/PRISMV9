const PRISM_DIGITAL_CONTROL_MIT = {
    /**
     * Tustin (bilinear) discretization of continuous transfer function
     * Converts s-domain to z-domain
     * @param {Object} tf - {num: [], den: []} continuous TF coefficients
     * @param {number} T - Sampling period
     * @returns {Object} Discrete transfer function
     */
    tustinDiscretize: function(tf, T) {
        // For first-order system: G(s) = K/(τs + 1)
        // G(z) = K(1 + z^-1) / ((2τ/T + 1) + (1 - 2τ/T)z^-1)
        
        // This is simplified - full implementation would handle arbitrary order
        const K = tf.num[0] / tf.den[tf.den.length - 1];
        const tau = tf.den[0] / tf.den[tf.den.length - 1];
        
        const a = 2 * tau / T;
        const numZ = [K, K]; // K(1 + z^-1)
        const denZ = [a + 1, 1 - a]; // (a+1) + (1-a)z^-1
        
        // Normalize
        const norm = denZ[0];
        return {
            num: numZ.map(x => x / norm),
            den: denZ.map(x => x / norm),
            T: T
        };
    },

    /**
     * Zero-order hold discretization
     * @param {Object} ss - {A, B, C, D} continuous state space
     * @param {number} T - Sampling period
     * @returns {Object} Discrete state space {Phi, Gamma, C, D}
     */
    zohDiscretize: function(ss, T) {
        const { A, B, C, D } = ss;
        const n = A.length;
        
        // Phi = e^(AT) ≈ I + AT + (AT)²/2! + ...
        // Using Padé approximation for small T
        const AT = A.map(row => row.map(x => x * T));
        
        // Simple approximation: Phi ≈ I + AT
        const Phi = A.map((row, i) => 
            row.map((x, j) => (i === j ? 1 : 0) + x * T)
        );
        
        // Gamma ≈ BT
        const Gamma = B.map(x => x * T);
        
        return { Phi, Gamma, C, D, T };
    },

    /**
     * Digital PID controller
     * @param {number} Kp - Proportional gain
     * @param {number} Ki - Integral gain
     * @param {number} Kd - Derivative gain
     * @param {number} T - Sampling period
     * @returns {Object} Digital PID controller object
     */
    createDigitalPID: function(Kp, Ki, Kd, T) {
        return {
            Kp, Ki, Kd, T,
            integral: 0,
            prevError: 0,
            
            compute: function(setpoint, measured) {
                const error = setpoint - measured;
                
                // Proportional
                const P = this.Kp * error;
                
                // Integral (trapezoidal)
                this.integral += this.T * (error + this.prevError) / 2;
                const I = this.Ki * this.integral;
                
                // Derivative (backward difference)
                const D = this.Kd * (error - this.prevError) / this.T;
                
                this.prevError = error;
                
                return P + I + D;
            },
            
            reset: function() {
                this.integral = 0;
                this.prevError = 0;
            }
        };
    }
}