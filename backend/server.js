const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./database');

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || "super_secret_key_change_me_in_prod"; // Fallback for dev, env for prod

app.use(cors());
app.use(bodyParser.json());

// Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// Root endpoint for health check
app.get('/', (req, res) => {
    res.send('PlantCare API is Running! 🌿');
});

// AUTH ROUTES
app.post('/api/auth/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function (err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: "Username already exists" });
                }
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: "User created", userId: this.lastID });
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(400).json({ error: "User not found" });

        if (await bcrypt.compare(password, user.password)) {
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY);
            res.json({ token });
        } else {
            res.status(403).json({ error: "Invalid credentials" });
        }
    });
});

const mqtt = require('mqtt');
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
});

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

// DEVICE ROUTES
app.post('/api/devices/claim', authenticateToken, (req, res) => {
    const { deviceId, name } = req.body;
    if (!deviceId) return res.status(400).json({ error: "Device ID required" });

    // Check if device is already claimed
    db.get('SELECT * FROM devices WHERE device_id = ?', [deviceId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            // Already claimed, maybe by multiple users or unique? Let's assume unique ownership for now.
            // If we want multiple users to see one device, we need a many-to-many table.
            // For simplify as per plan: "Users will only be able to see readings from devices they own." -> Implies unique ownership.
            return res.status(400).json({ error: "Device already claimed" });
        }

        db.run('INSERT INTO devices (device_id, user_id, name) VALUES (?, ?, ?)', [deviceId, req.user.id, name], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Device claimed successfully" });
        });
    });
});

app.get('/api/devices', authenticateToken, (req, res) => {
    db.all('SELECT * FROM devices WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

// GET /api/readings - Get latest readings (Protected & Filtered)
app.get('/api/readings', authenticateToken, (req, res) => {
    const limit = req.query.limit || 50;
    const userId = req.user.id;

    // Fetch user's devices first
    db.all('SELECT device_id FROM devices WHERE user_id = ?', [userId], (err, devices) => {
        if (err) return res.status(500).json({ error: err.message });

        if (devices.length === 0) {
            return res.json({ "message": "success", "data": [] });
        }

        const deviceIds = devices.map(d => `'${d.device_id}'`).join(',');

        // Filter readings by these device IDs
        const sql = `SELECT * FROM readings WHERE device_id IN (${deviceIds}) ORDER BY timestamp DESC LIMIT ?`;

        db.all(sql, [limit], (err, rows) => {
            if (err) {
                res.status(400).json({ "error": err.message });
                return;
            }

            if (rows.length === 0) {
                return res.json({ "message": "success", "data": [] });
            }

            // Fetch plant readings
            const readingIds = rows.map(r => r.id).join(',');
            const plantSql = `SELECT * FROM plant_readings WHERE reading_id IN (${readingIds})`;

            db.all(plantSql, [], (err, plantRows) => {
                if (err) {
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
});

// In-memory command queue: { "device_id": "COMMAND_STRING" }
const commands = {};

// POST /api/commands - Queue a command for a device AND publish via MQTT
app.post('/api/commands', authenticateToken, (req, res) => {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
        return res.status(400).json({ error: "Missing deviceId or command" });
    }

    // Check ownership
    db.get('SELECT * FROM devices WHERE device_id = ? AND user_id = ?', [deviceId, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(403).json({ error: "You do not own this device" });

        console.log(`Queueing command '${command}' for ${deviceId}`);
        commands[deviceId] = command;

        // MQTT PUBLISH
        const topic = `plantcare/${deviceId}/command`;
        mqttClient.publish(topic, command, (err) => {
            if (err) {
                console.error("MQTT Publish Error:", err);
                // We still respond success because we queued it also
            } else {
                console.log(`MQTT: Published '${command}' to ${topic}`);
            }
        });

        res.json({ message: "Command queued and published", deviceId, command });
    });
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
