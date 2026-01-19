const express = require('express');
const router = express.Router();
const db = require('../database');
const authenticateToken = require('../middleware/auth');

// Claim Device
router.post('/claim', authenticateToken, (req, res) => {
    const { deviceId, name } = req.body;
    if (!deviceId) return res.status(400).json({ error: "Device ID required" });

    db.get('SELECT * FROM devices WHERE device_id = ?', [deviceId], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            return res.status(400).json({ error: "Device already claimed" });
        }

        db.run('INSERT INTO devices (device_id, user_id, name) VALUES (?, ?, ?)', [deviceId, req.user.id, name], function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "Device claimed successfully" });
        });
    });
});

// List Devices
router.get('/', authenticateToken, (req, res) => {
    db.all('SELECT * FROM devices WHERE user_id = ?', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ data: rows });
    });
});

module.exports = router;
