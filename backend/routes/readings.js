const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const aiService = require('../services/aiService');
const mqttClient = require('../lib/mqttClient');

// GET Readings
router.get('/', authenticateToken, async (req, res) => {
    const limit = req.query.limit || 50;
    const userId = req.user.id;

    try {
        const deviceResult = await db.query('SELECT device_id FROM devices WHERE user_id = $1', [userId]);
        const devices = deviceResult.rows;

        if (devices.length === 0) return res.json({ "message": "success", "data": [] });

        const deviceIds = devices.map(d => d.device_id);

        const sql = `
            SELECT id, device_id, timestamp, data 
            FROM readings 
            WHERE device_id = ANY($1) 
            ORDER BY timestamp DESC 
            LIMIT $2
        `;

        const readingsResult = await db.query(sql, [deviceIds, limit]);

        const formattedReadings = readingsResult.rows.map(row => {
            return {
                id: row.id,
                device_id: row.device_id,
                timestamp: row.timestamp,
                ...row.data
            };
        });

        res.json({ "message": "success", "data": formattedReadings });

    } catch (err) {
        console.error("Error fetching readings:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST Readings (From ESP32)
router.post('/', async (req, res) => {
    const { deviceId, temperature, humidity, pumpState, plants, threshold, tankEmpty } = req.body;
    const deviceSecret = req.headers['x-device-secret'];

    if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });
    if (!deviceSecret) return res.status(401).json({ error: "Missing x-device-secret header" });

    // --- SECURITY CHECK & AUTO-REGISTRATION ---
    try {
        const devCheck = await db.query('SELECT secret FROM devices WHERE device_id = $1', [deviceId]);

        if (devCheck.rows.length === 0) {
            // New Device: Auto-register with secret (Unclaimed)
            await db.query('INSERT INTO devices (device_id, secret) VALUES ($1, $2)', [deviceId, deviceSecret]);
            console.log(`New Device Auto-Registered: ${deviceId}`);
        } else {
            // Existing Device: Verify Secret
            const storedSecret = devCheck.rows[0].secret;
            if (storedSecret !== deviceSecret) {
                console.warn(`Unauthorized access attempt for ${deviceId}`);
                return res.status(403).json({ error: "Invalid Device Secret" });
            }
        }
    } catch (err) {
        console.error("Error during device security check:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }

    // --- AI ANALYSIS ---
    // 1. Detect Anomaly
    const healthData = aiService.detectAnomaly([{
        pump_state: pumpState ? 1 : 0,
        moisture: plants && plants[0] ? plants[0].moisture : 0,
        timestamp: new Date()
    }]);

    // 2. Predict Dry Time
    let predictedHours = null;
    if (plants && plants[0]) {
        predictedHours = await aiService.predictTimeUntilDry(plants[0].moisture, 30, temperature, humidity);
    }

    if (healthData.shouldLockout) {
        console.log(`CRITICAL: Health Score ${healthData.score} < 60. Sending LOCKOUT command.`);
        mqttClient.publish(`plantcare/${deviceId}/command`, 'LOCK_SYSTEM');
    }

    // Prepare Data Object for JSONB
    const dataObj = {
        temperature,
        humidity,
        pumpState: pumpState ? 1 : 0,
        plants: plants || [],
        threshold,
        tankEmpty,
        health_score: healthData.score,
        predicted_hours: predictedHours
    };

    const sql = 'INSERT INTO readings (device_id, data) VALUES ($1, $2) RETURNING id';

    try {
        const result = await db.query(sql, [deviceId, dataObj]);
        const readingId = result.rows[0].id;

        // Emit via Socket.io
        const io = req.app.get('socketio');
        if (io) {
            io.emit('new_reading', {
                device_id: deviceId,
                timestamp: new Date().toISOString(),
                ...dataObj
            });
        }

        res.json({
            "message": "success",
            "data": { deviceId, ...dataObj },
            "id": readingId
        });

    } catch (err) {
        console.error("Error saving reading:", err);
        res.status(500).json({ "error": err.message });
    }
});

module.exports = router;
