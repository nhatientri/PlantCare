const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');
const commandStore = require('../lib/commandStore');

// GET Readings
router.get('/', authenticateToken, (req, res) => {
    const limit = req.query.limit || 50;
    const userId = req.user.id;

    db.all('SELECT device_id FROM devices WHERE user_id = ?', [userId], (err, devices) => {
        if (err) return res.status(500).json({ error: err.message });

        if (devices.length === 0) return res.json({ "message": "success", "data": [] });

        const deviceIds = devices.map(d => `'${d.device_id}'`).join(',');
        const sql = `SELECT * FROM readings WHERE device_id IN (${deviceIds}) ORDER BY timestamp DESC LIMIT ?`;

        db.all(sql, [limit], (err, rows) => {
            if (err) return res.status(400).json({ "error": err.message });
            if (rows.length === 0) return res.json({ "message": "success", "data": [] });

            const readingIds = rows.map(r => r.id).join(',');
            const plantSql = `SELECT * FROM plant_readings WHERE reading_id IN (${readingIds})`;

            db.all(plantSql, [], (err, plantRows) => {
                if (err) return res.json({ "message": "success", "data": rows });

                const readingsWithPlants = rows.map(reading => {
                    const plants = plantRows.filter(p => p.reading_id === reading.id);
                    return { ...reading, plants: plants.map(p => ({ index: p.sensor_index, moisture: p.moisture })) };
                });

                res.json({ "message": "success", "data": readingsWithPlants });
            });
        });
    });
});

// POST Readings (From ESP32)
const aiService = require('../services/aiService');

// POST Readings (From ESP32)
router.post('/', async (req, res) => {
    const { deviceId, temperature, humidity, pumpState, plants } = req.body;

    if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

    // Check for pending commands to return to ESP32
    const pendingCommand = commandStore.get(deviceId);
    if (pendingCommand) {
        console.log(`Sending command '${pendingCommand}' to ${deviceId}`);
    }

    // --- AI ANALYSIS ---
    // 1. Detect Anomaly
    const healthData = aiService.detectAnomaly([{
        pump_state: pumpState ? 1 : 0,
        moisture: plants && plants[0] ? plants[0].moisture : 0, // Using 1st plant for simple anomaly check
        timestamp: new Date()
    }]);

    // 2. Predict Dry Time (for first plant as demo)
    let predictedHours = null;
    if (plants && plants[0]) {
        predictedHours = await aiService.predictTimeUntilDry(plants[0].moisture, 30, temperature, humidity);
    }
    // -------------------

    const sql = 'INSERT INTO readings (device_id, temperature, humidity, pump_state) VALUES (?,?,?,?)';
    const params = [deviceId, temperature, humidity, pumpState ? 1 : 0];

    db.run(sql, params, function (err) {
        if (err) return res.status(400).json({ "error": err.message });

        const readingId = this.lastID;

        // Emit via Socket.io
        const io = req.app.get('socketio');
        if (io) {
            io.emit('new_reading', {
                device_id: deviceId,
                temperature: temperature,
                humidity: humidity,
                pump_state: pumpState ? 1 : 0,
                timestamp: new Date().toISOString(),
                plants: plants,
                // AI Data
                health_score: healthData.score,
                predicted_hours: predictedHours
            });
            console.log(`Socket.io: Emitted new_reading for ${deviceId} with AI score ${healthData.score}`);
        }

        if (plants && Array.isArray(plants) && plants.length > 0) {
            const placeholder = plants.map(() => '(?, ?, ?)').join(',');
            const flatParams = [];
            plants.forEach(p => {
                flatParams.push(readingId, p.index, p.moisture);
            });

            const plantSql = `INSERT INTO plant_readings (reading_id, sensor_index, moisture) VALUES ${placeholder}`;
            db.run(plantSql, flatParams, (err) => {
                if (err) console.error("Error inserting plant readings:", err);
            });
        }

        res.json({
            "message": "success",
            "data": { ...req.body, health_score: healthData.score, predicted_hours: predictedHours },
            "id": readingId,
            "command": pendingCommand
        });
    });
});

module.exports = router;
