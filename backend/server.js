const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now (adjust for prod)
        methods: ["GET", "POST"]
    }
});

// Make io accessible to our router
app.set('socketio', io);

// MQTT Client Integration
const mqttClient = require('./lib/mqttClient');

// Subscribe to readings
mqttClient.on('connect', () => {
    mqttClient.subscribe('plantcare/readings', (err) => {
        if (!err) console.log("Server: Subscribed to plantcare/readings");
    });
});

// Handle incoming MQTT messages
mqttClient.on('message', (topic, message) => {
    if (topic === 'plantcare/readings') {
        try {
            const payload = JSON.parse(message.toString());

            // Normalize ID: Firmware sends 'deviceId', Frontend/DB uses 'device_id'
            if (payload.deviceId && !payload.device_id) {
                payload.device_id = payload.deviceId;
            }

            // Ignore invalid payloads
            if (!payload.device_id) {
                console.warn("Ignored MQTT message with missing device_id");
                return;
            }

            // Add timestamp if missing (critical for frontend "Online" check)
            if (!payload.timestamp) {
                payload.timestamp = new Date().toISOString();
            }

            // Broadcast to frontend via Socket.IO
            io.emit('new_reading', payload);

            if (payload.updateType === 'threshold') {
                console.log(`Socket Broadcast: Threshold Confirmation for ${payload.deviceId}: ${payload.threshold}%`);
                saveThresholdToDb(payload.deviceId, payload.threshold);
            } else if (payload.temperature !== undefined) {
                // Assume it's a full reading if it has temp
                console.log(`Socket Broadcast: Broadcast Reading for ${payload.deviceId}`);
                saveReadingToDb(payload);
            }
        } catch (e) {
            console.error("Error processing MQTT message:", e);
        }
    }
});

// Helper to save threshold update to DB so it persists even if HTTP POST fails
const saveThresholdToDb = async (deviceId, threshold) => {
    try {
        const db = require('./database');
        // We insert a new reading with just the threshold update
        // We need to fetch the last known reading to keep other values or just valid minimal data?
        // Let's just store the threshold. The Frontend overlays latest reading.
        // If we insert a reading with ONLY threshold, does it break frontend?
        // Frontend checks: `if (groups[did].threshold)`
        // If we send partial data, we should be careful.

        // Strategy: Get latest reading, merge threshold, save as new reading.
        const res = await db.query(
            'SELECT data FROM readings WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1',
            [deviceId]
        );

        let newData = { threshold: parseInt(threshold) };
        if (res.rows.length > 0) {
            newData = { ...res.rows[0].data, threshold: parseInt(threshold) };
        }

        // Insert
        await db.query(
            'INSERT INTO readings (device_id, data) VALUES ($1, $2)',
            [deviceId, newData]
        );
        console.log(`DB: Persisted threshold ${threshold}% for ${deviceId}`);

    } catch (dbErr) {
        console.error("Failed to persist threshold to DB:", dbErr);
    }
};

const saveReadingToDb = async (payload) => {
    try {
        const db = require('./database');
        const aiService = require('./services/aiService');
        const deviceId = payload.deviceId;

        // 1. Detect Anomaly
        const healthData = aiService.detectAnomaly([{
            pump_state: payload.pumpState ? 1 : 0,
            moisture: payload.plants && payload.plants[0] ? payload.plants[0].moisture : 0,
            timestamp: new Date()
        }]);

        // 2. Predict Dry Time
        let predictedHours = null;
        if (payload.plants && payload.plants[0]) {
            predictedHours = await aiService.predictTimeUntilDry(payload.plants[0].moisture, 30, payload.temperature, payload.humidity);
        }

        // Prepare Data Object
        const dataObj = {
            temperature: payload.temperature,
            humidity: payload.humidity,
            pumpState: payload.pumpState ? 1 : 0,
            plants: payload.plants || [],
            threshold: payload.threshold,
            tankEmpty: payload.tankEmpty,
            health_score: healthData.score,
            ai_status: healthData.status,
            anomalies: healthData.anomalies,
            predicted_hours: predictedHours
        };

        // Insert
        await db.query(
            'INSERT INTO readings (device_id, data) VALUES ($1, $2)',
            [deviceId, dataObj]
        );
        console.log(`DB: Saved full reading via MQTT for ${deviceId}`);

    } catch (dbErr) {
        console.error("Failed to persist reading to DB:", dbErr);
    }
};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Routes
const authRoutes = require('./routes/auth');
const deviceRoutes = require('./routes/devices');
const readingRoutes = require('./routes/readings');
const commandRoutes = require('./routes/commands');

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/readings', readingRoutes);
app.use('/api/commands', commandRoutes);
app.use('/api/ai', require('./routes/ai'));

// Root endpoint
app.get('/', (req, res) => {
    res.send('PlantCare API is Running! 🌿');
});

// Initialize AI Service
const aiService = require('./services/aiService');
const db = require('./database');

// Start Server Function
const startServer = async () => {
    try {
        // 1. Initialize Database
        await db.init();

        // 2. Initialize AI Service (Dependent on DB)
        await aiService.init();

        // 3. Start Listening
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();
