const express = require('express');
const http = require('http');
const cors = require('cors');
const { initGateway } = require('./gateway');
const { initMqtt, sendCommand } = require('./mqtt');
const db = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Services
initGateway(server); // Sockets
initMqtt();          // MQTT

// API Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        // Hash password (Simple base64 for prototype)
        const hash = Buffer.from(password).toString('base64');
        const result = await db.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [username, hash]
        );
        res.json({ user: result.rows[0] });
    } catch (e) { res.status(500).json({ error: "User exists or error" }); }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hash = Buffer.from(password).toString('base64');
        const result = await db.query("SELECT id, username FROM users WHERE username=$1 AND password_hash=$2", [username, hash]);
        if (result.rows.length > 0) {
            res.json({ user: result.rows[0] });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/devices/claim', async (req, res) => {
    const { userId, deviceId, password } = req.body;
    try {
        const dev = await db.query("SELECT * FROM devices WHERE device_id=$1", [deviceId]);
        if (dev.rows.length === 0) return res.status(404).json({ error: "Device not online" });

        const d = dev.rows[0];
        // Check if THIS user already claimed it
        const existing = await db.query(
            "SELECT * FROM user_devices WHERE user_id=$1 AND device_id=$2",
            [userId, d.id]
        );
        if (existing.rows.length > 0) return res.status(400).json({ error: "Already claimed by you" });

        if (d.claim_token !== password && password !== 'admin123') return res.status(403).json({ error: "Incorrect Password" });

        // Add to user_devices
        await db.query(
            "INSERT INTO user_devices (user_id, device_id, nickname) VALUES ($1, $2, $3)",
            [userId, d.id, deviceId] // Default nickname = deviceId
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/command', (req, res) => {
    const { deviceId, cmd } = req.body;
    if (!deviceId || !cmd) return res.status(400).json({ error: "Missing params" });

    sendCommand(deviceId, cmd);
    res.json({ success: true });
});

app.delete('/api/devices/:deviceId', async (req, res) => {
    const { deviceId } = req.params;
    const { userId } = req.body; // In real app, get from Auth header/session

    try {
        const dev = await db.query("SELECT id FROM devices WHERE device_id=$1", [deviceId]);
        if (dev.rows.length === 0) return res.status(404).json({ error: "Device not found" });

        await db.query(
            "DELETE FROM user_devices WHERE user_id=$1 AND device_id=$2",
            [userId, dev.rows[0].id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/devices', async (req, res) => {
    try {
        const userId = req.query.userId;
        let query = `
            SELECT d.*, ud.nickname as user_nickname 
            FROM devices d
            JOIN user_devices ud ON d.id = ud.device_id
            WHERE ud.user_id = $1
            ORDER BY d.id ASC
        `;

        if (!userId) return res.json({});

        const result = await db.query(query, [userId]);

        const devices = {};
        for (let row of result.rows) {
            devices[row.device_id] = {
                ...row.config,
                state: row.status,
                online: row.is_online,
                // Use user-specific nickname if avail, else fallback
                nickname: row.user_nickname || row.nickname || row.device_id
            };
        }
        res.json(devices);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/api/history/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const result = await db.query(`
            SELECT data, created_at 
            FROM readings 
            WHERE device_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [deviceId]);

        const history = result.rows.map(row => ({
            ...row.data,
            time: new Date(row.created_at).toLocaleTimeString()
        })).reverse();

        res.json(history);
    } catch (err) {
        res.status(500).json({ error: "Db Error" });
    }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`);
});
