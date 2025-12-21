const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());

// Root endpoint for health check
app.get('/', (req, res) => {
    res.send('PlantCare API is Running! 🌿');
});

// GET /api/readings - Get latest readings (Grouped by Device logic to be handled by Frontend or here)
// For now, return flat list of readings with nested plants
app.get('/api/readings', (req, res) => {
    const limit = req.query.limit || 50;

    // We get the main readings
    const sql = `SELECT * FROM readings ORDER BY timestamp DESC LIMIT ?`;

    db.all(sql, [limit], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        // Now we need to fetch plant readings for these IDs. 
        // This is N+1 but acceptable for small scale sqlite.
        // A better way is a JOIN, but mapping it back to nested JSON in JS is also fine.

        if (rows.length === 0) {
            return res.json({ "message": "success", "data": [] });
        }

        const ids = rows.map(r => r.id).join(',');
        const plantSql = `SELECT * FROM plant_readings WHERE reading_id IN (${ids})`;

        db.all(plantSql, [], (err, plantRows) => {
            if (err) {
                // If error, just return readings without plants? Or fail.
                console.error(err);
                return res.json({ "message": "success", "data": rows });
            }

            // Map plants to readings
            const readingsWithPlants = rows.map(reading => {
                const plants = plantRows.filter(p => p.reading_id === reading.id);
                return { ...reading, plants: plants.map(p => ({ index: p.sensor_index, moisture: p.moisture })) };
            });

            res.json({
                "message": "success",
                "data": readingsWithPlants
            });
        });
    });
});

// In-memory command queue: { "device_id": "COMMAND_STRING" }
const commands = {};

// POST /api/commands - Queue a command for a device
app.post('/api/commands', (req, res) => {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
        return res.status(400).json({ error: "Missing deviceId or command" });
    }
    console.log(`Queueing command '${command}' for ${deviceId}`);
    commands[deviceId] = command;
    res.json({ message: "Command queued", deviceId, command });
});

// POST /api/readings - Save a new reading
app.post('/api/readings', (req, res) => {
    // Expected Body: { deviceId: "esp32-1", temperature: 25, humidity: 60, pumpState: false, plants: [{index:0, moisture:50}, {index:1, moisture:30}] }

    const { deviceId, temperature, humidity, pumpState, plants } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: "Missing deviceId" });
    }

    // CHECK FOR PENDING COMMANDS
    const pendingCommand = commands[deviceId] || null;
    if (pendingCommand) {
        console.log(`Sending command '${pendingCommand}' to ${deviceId}`);
        delete commands[deviceId]; // Clear after sending
    }

    const sql = 'INSERT INTO readings (device_id, temperature, humidity, pump_state) VALUES (?,?,?,?)';
    const params = [deviceId, temperature, humidity, pumpState ? 1 : 0];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }

        const readingId = this.lastID;

        // Insert Plants
        if (plants && Array.isArray(plants) && plants.length > 0) {
            const placeholder = plants.map(() => '(?, ?, ?)').join(',');
            const flatParams = [];
            plants.forEach(p => {
                flatParams.push(readingId, p.index, p.moisture);
            });

            const plantSql = `INSERT INTO plant_readings (reading_id, sensor_index, moisture) VALUES ${placeholder}`;

            db.run(plantSql, flatParams, (err) => {
                if (err) {
                    console.error("Error inserting plant readings:", err);
                }
            });
        }

        res.json({
            "message": "success",
            "data": req.body,
            "id": readingId,
            "command": pendingCommand // Send command back to ESP32
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
