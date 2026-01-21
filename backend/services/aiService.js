const tf = require('@tensorflow/tfjs-node');

class AIService {
    constructor() {
        this.model = null; // Prediction Model
        this.isModelLoaded = false;

        // Health Score State
        this.healthScore = 100;
        this.recentAnomalies = [];
    }

    async init() {
        console.log("Initializing AI Service...");
        try {
            // Define a simple Linear Regression model for "Drying Rate Prediction"
            // Input: [Temperature, Humidity]
            // Output: [MoistureLossPerMinute]
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 1, inputShape: [2] }));

            // Compile
            this.model.compile({ loss: 'meanSquaredError', optimizer: 'sgd' });

            // Dummy training to initialize weights (simulated pre-training)
            // Ideally this loads from a file
            const xs = tf.tensor2d([[25, 40], [30, 60], [20, 30], [35, 20]]);
            const ys = tf.tensor2d([[0.1], [0.08], [0.05], [0.2]]); // Mock drying rates
            await this.model.fit(xs, ys, { epochs: 10 });

            this.isModelLoaded = true;
            console.log("AI Model Initialized.");
        } catch (e) {
            console.error("Failed to init AI model:", e);
        }
    }

    /**
     * Train the model with real historical data
     * @param {Array} trainingData - Array of {temp, humidity, moisture, timestamp}
     */
    async trainModel(trainingData) {
        if (!trainingData || trainingData.length < 10) {
            console.log("Not enough data to train (need > 10 points)");
            return { success: false, message: "Insufficient data" };
        }

        console.log(`Starting training with ${trainingData.length} points...`);

        // 1. Process Data: Calculate "Drying Rate" (Moisture Loss per Minute)
        const inputs = [];
        const outputs = [];

        for (let i = 1; i < trainingData.length; i++) {
            const prev = trainingData[i - 1];
            const curr = trainingData[i];

            // Only learn from "Drying" phases (Pump OFF, Moisture Dropping)
            if (curr.pump_state === 0 && prev.pump_state === 0 && curr.moisture < prev.moisture) {
                const timeDiffMs = new Date(curr.timestamp) - new Date(prev.timestamp);
                const timeDiffMins = timeDiffMs / 1000 / 60;

                if (timeDiffMins > 0) {
                    const moistureLoss = prev.moisture - curr.moisture;
                    const rate = moistureLoss / timeDiffMins;

                    // Filter noise (rate shouldn't be extreme)
                    if (rate > 0 && rate < 5.0) {
                        inputs.push([prev.temperature, prev.humidity]);
                        outputs.push([rate]);
                    }
                }
            }
        }

        if (inputs.length === 0) {
            return { success: false, message: "No valid drying phases found in data" };
        }

        // 2. Convert to Tensors
        const xs = tf.tensor2d(inputs);
        const ys = tf.tensor2d(outputs);

        // 3. Train
        await this.model.fit(xs, ys, {
            epochs: 20,
            shuffle: true,
            callbacks: {
                onEpochEnd: (epoch, logs) => console.log(`Epoch ${epoch}: loss=${logs.loss}`)
            }
        });

        xs.dispose();
        ys.dispose();

        console.log("Training Complete.");
        return { success: true, processedSamples: inputs.length };
    }

    /**
     * Predict how many HOURS until moisture hits the critical threshold (e.g. 30%)
     */
    async predictTimeUntilDry(currentMoisture, criticalThreshold, temp, humidity) {
        if (!this.isModelLoaded) return null;

        const moistureToLose = currentMoisture - criticalThreshold;
        if (moistureToLose <= 0) return 0; // Already dry

        // Predict drying rate (moisture loss per minute)
        const input = tf.tensor2d([[temp, humidity]]);
        const prediction = this.model.predict(input);
        const ratePerMin = (await prediction.data())[0];

        input.dispose();
        prediction.dispose();

        // Safety clamp on rate
        const safeRate = Math.max(0.01, ratePerMin);

        const minutes = moistureToLose / safeRate;
        return (minutes / 60).toFixed(1); // Hours
    }

    /**
     * Calculate System Health Score (0-100)
     * Detects anomalies like "Pump running but moisture not rising"
     */
    detectAnomaly(readings) {
        // readings: Array of recent data points
        // We look at the latest few
        if (!readings || readings.length < 5) return 100;

        let anomalyPenalty = 0;
        const latest = readings[readings.length - 1];
        const prev = readings[readings.length - 2];

        // 1. Pump Failure Detection (Immediate)
        // If pump was ON in previous reading, and moisture DID NOT increase in latest
        if (prev.pump_state === 1 && latest.moisture <= prev.moisture) {
            anomalyPenalty += 30;
            this._logAnomaly("Pump Anomaly: Pump running but moisture steady/dropping");
        }

        // 2. Sensor Noise Detection (Variance Check)
        // If sensor jumps wildly (> 10%) in one reading
        if (Math.abs(latest.moisture - prev.moisture) > 20 && prev.pump_state === 0) {
            anomalyPenalty += 10;
            this._logAnomaly("Sensor Noise: Sudden moisture jump without pump");
        }

        // Decay the score
        this.healthScore = Math.max(0, 100 - anomalyPenalty);
        return {
            score: this.healthScore,
            anomalies: this.recentAnomalies
        };
    }

    _logAnomaly(msg) {
        // Keep last 5 anomalies
        const timestamp = new Date().toISOString();
        this.recentAnomalies.unshift({ timestamp, msg });
        if (this.recentAnomalies.length > 5) this.recentAnomalies.pop();
    }
}

module.exports = new AIService();
