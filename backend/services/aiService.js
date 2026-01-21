const tf = require('@tensorflow/tfjs-node');
const db = require('../database');

class AIService {
    constructor() {
        this.model = null; // Prediction Model
        this.isModelLoaded = false;

        // Health Score State
        this.healthScore = 100;
        this.recentAnomalies = [];
        this.successfulWaterings = []; // History of moisture rise per burst

        // Soak Timer State
        this.soakStartTime = null;
        this.soakStartMoisture = 0;
        this.lastPumpState = 0;
    }

    async init() {
        console.log("Initializing AI Service...");
        try {
            // Load Persistent Learning History
            const historyRes = await db.query('SELECT data_point FROM ai_learning ORDER BY timestamp DESC LIMIT 20');
            if (historyRes.rows.length > 0) {
                // Reverse to keep oldest->newest order in memory
                this.successfulWaterings = historyRes.rows.map(r => r.data_point).reverse();
                console.log(`AI: Loaded ${this.successfulWaterings.length} learning points from DB:`, this.successfulWaterings);
            }

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
     * Track a successful watering session to learn "normal" rise
     */
    trackWateringSession(riseAmount) {
        if (riseAmount > 0) {
            this.successfulWaterings.push(riseAmount);
            if (this.successfulWaterings.length > 10) this.successfulWaterings.shift();
            console.log(`AI: Learned new normal. History: [${this.successfulWaterings}]`);

            // Persist to DB (Fire and Forget)
            db.query('INSERT INTO ai_learning (data_point) VALUES ($1)', [riseAmount]).catch(err => {
                console.error("Failed to save AI learning point:", err);
            });
        }
    }

    /**
     * Calculate System Health Score (0-100)
     * Detects anomalies with consideration for 30s soak time
     */
    detectAnomaly(readings) {
        // We only process the LATEST reading
        if (!readings || readings.length === 0) return { score: this.healthScore, shouldLockout: this.healthScore < 60 };

        const latest = readings[readings.length - 1];
        const currentPumpState = latest.pump_state;
        const currentMoisture = latest.moisture;

        // --- 1. Detect Pump Stop (Start Soak Timer) ---
        if (this.lastPumpState === 1 && currentPumpState === 0) {
            console.log(`AI: Pump finished. Starting 35s Soak Timer. Baseline Moisture: ${currentMoisture}%`);
            this.soakStartTime = Date.now();
            this.soakStartMoisture = currentMoisture;
        }

        // --- 2. Check Soak Timer ---
        if (this.soakStartTime) {
            const elapsed = Date.now() - this.soakStartTime;

            if (elapsed >= 35000) { // 35 Seconds (30s Soak + 5s Buffer)
                console.log("AI: Soak Complete. Analyzing Rise...");

                // Calculate Rise from START of soak (when water was added) to NOW
                const rise = currentMoisture - this.soakStartMoisture;
                this._analyzeRise(rise);

                // Reset Timer
                this.soakStartTime = null;
            } else {
                // Still soaking, do not judge yet
                // console.log(`AI: Soaking... (${(elapsed/1000).toFixed(1)}s)`);
            }
        }

        // --- 3. Immediate Sensor Noise Check (Instant) ---
        // If sensor jumps wildly (> 20%) in one reading WITHOUT pump
        // We need 'prev' for this, but simplistic check is ok for now or we rely on sensor firmware valid range
        // For simplicity, let's skip single-frame variance check to avoid "missing prev" bug in this stateless payload version

        // Update State
        this.lastPumpState = currentPumpState;

        return {
            score: this.healthScore,
            anomalies: this.recentAnomalies,
            shouldLockout: this.healthScore < 60
        };
    }

    _analyzeRise(rise) {
        let anomalyPenalty = 0;

        // Adaptive Check: If we have history, compare against it
        if (this.successfulWaterings.length > 3) {
            const avgRise = this.successfulWaterings.reduce((a, b) => a + b, 0) / this.successfulWaterings.length;
            const threshold = avgRise * 0.2; // Expect at least 20% of normal rise

            if (rise < threshold) {
                anomalyPenalty += 40;
                this._logAnomaly(`Pump Anomaly: Rise ${rise}% is below expected ${threshold.toFixed(1)}%`);
            } else {
                this.trackWateringSession(rise);
            }
        } else {
            // Fallback: Simple check
            if (rise <= 0) {
                anomalyPenalty += 30;
                this._logAnomaly(`Pump Anomaly: Pump ran but moisture changed by ${rise}%`);
            } else {
                this.trackWateringSession(rise);
            }
        }

        // Decay the score
        this.healthScore = Math.max(0, this.healthScore - anomalyPenalty);
        // Optionally recover score slowly if good? 
        // For now, "Reset System" is the way to restore.
    }

    _logAnomaly(msg) {
        // Keep last 5 anomalies
        const timestamp = new Date().toISOString();
        this.recentAnomalies.unshift({ timestamp, msg });
        if (this.recentAnomalies.length > 5) this.recentAnomalies.pop();
    }
}

module.exports = new AIService();
