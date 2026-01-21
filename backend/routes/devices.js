const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Claim Device
router.post('/claim', authenticateToken, async (req, res) => {
    const { deviceId, name, secret } = req.body;
    if (!deviceId || !secret) return res.status(400).json({ error: "Device ID and Secret required" });

    try {
        // Check availability and verify secret
        const checkRes = await db.query('SELECT user_id, secret FROM devices WHERE device_id = $1', [deviceId]);

        if (checkRes.rows.length === 0) {
            return res.status(404).json({ error: "Device not found. Turn it on first to auto-register." });
        }

        const device = checkRes.rows[0];

        if (device.user_id) {
            return res.status(400).json({ error: "Device already claimed" });
        }

        if (device.secret !== secret) {
            return res.status(403).json({ error: "Invalid Device Secret" });
        }

        // Claim it
        await db.query(
            'UPDATE devices SET user_id = $1, name = $2 WHERE device_id = $3',
            [req.user.id, name, deviceId]
        );

        res.json({ message: "Device claimed successfully" });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List Devices
router.get('/', authenticateToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM devices WHERE user_id = $1', [req.user.id]);
        res.json({ data: result.rows });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
