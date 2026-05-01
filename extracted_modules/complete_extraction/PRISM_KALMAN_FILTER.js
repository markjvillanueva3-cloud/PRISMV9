const PRISM_KALMAN_FILTER = {

    /**
     * Extended Kalman Filter for Tool Wear Estimation
     */
    ToolWearEKF: {
        // State: [wear_amount, wear_rate]
        x: [0, 0.001],

        // State covariance
        P: [[0.1, 0], [0, 0.0001]],

        // Process noise
        Q: [[0.01, 0], [0, 0.00001]],

        // Measurement noise
        R: [[0.1]],

        // Time step
        dt: 1, // minutes

        /**
         * Predict step
         */
        predict: function() {
            // State transition: wear grows at wear_rate
            const x_new = [
                this.x[0] + this.x[1] * this.dt,
                this.x[1] * 1.001 // Wear rate slowly increases
            ];

            // State transition Jacobian
            const F = [
                [1, this.dt],
                [0, 1.001]
            ];

            // Covariance prediction
            const P_new = [
                [F[0][0] * this.P[0][0] + F[0][1] * this.P[1][0], F[0][0] * this.P[0][1] + F[0][1] * this.P[1][1]],
                [F[1][0] * this.P[0][0] + F[1][1] * this.P[1][0], F[1][0] * this.P[0][1] + F[1][1] * this.P[1][1]]
            ];

            // Add process noise
            this.P = [
                [P_new[0][0] + this.Q[0][0], P_new[0][1] + this.Q[0][1]],
                [P_new[1][0] + this.Q[1][0], P_new[1][1] + this.Q[1][1]]
            ];

            this.x = x_new;

            return { state: [...this.x], covariance: this.P.map(r => [...r]) };
        },
        /**
         * Update step with measurement
         */
        update: function(measurement) {
            // Measurement model: z = wear_amount + noise
            const H = [[1, 0]];

            // Innovation
            const y = measurement - this.x[0];

            // Innovation covariance
            const S = this.P[0][0] + this.R[0][0];

            // Kalman gain
            const K = [this.P[0][0] / S, this.P[1][0] / S];

            // State update
            this.x = [
                this.x[0] + K[0] * y,
                this.x[1] + K[1] * y
            ];

            // Covariance update
            this.P = [
                [(1 - K[0]) * this.P[0][0], (1 - K[0]) * this.P[0][1]],
                [-K[1] * this.P[0][0] + this.P[1][0], -K[1] * this.P[0][1] + this.P[1][1]]
            ];

            return {
                wearAmount: this.x[0],
                wearRate: this.x[1],
                uncertainty: Math.sqrt(this.P[0][0]),
                remainingLife: this._estimateRemainingLife()
            };
        },
        _estimateRemainingLife: function() {
            const maxWear = 0.3; // mm maximum wear
            const currentWear = this.x[0];
            const wearRate = this.x[1];

            if (wearRate <= 0) return Infinity;
            return (maxWear - currentWear) / wearRate;
        },
        reset: function() {
            this.x = [0, 0.001];
            this.P = [[0.1, 0], [0, 0.0001]];
        }
    },
    /**
     * Kalman Filter for Feed Rate Control
     */
    FeedRateKF: {
        // State: [actual_feed, feed_error]
        x: [0, 0],
        P: [[1, 0], [0, 0.1]],
        Q: [[0.01, 0], [0, 0.001]],
        R: [[0.1]],

        predict: function(commandedFeed) {
            // State transition: actual feed approaches commanded
            const alpha = 0.8; // Response factor
            this.x = [
                alpha * this.x[0] + (1 - alpha) * commandedFeed,
                this.x[1]
            ];

            // Add process noise
            this.P[0][0] += this.Q[0][0];
            this.P[1][1] += this.Q[1][1];

            return this.x[0];
        },
        update: function(measuredFeed) {
            const y = measuredFeed - this.x[0];
            const S = this.P[0][0] + this.R[0][0];
            const K = [this.P[0][0] / S, this.P[1][0] / S];

            this.x = [
                this.x[0] + K[0] * y,
                y // Error is the innovation
            ];

            this.P[0][0] *= (1 - K[0]);

            return {
                estimatedFeed: this.x[0],
                feedError: this.x[1],
                uncertainty: Math.sqrt(this.P[0][0])
            };
        }
    }
}