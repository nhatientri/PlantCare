const express = require('express');
const router = express.Router();
const db = require('../database');
const mqttClient = require('../lib/mqttClient');
const authenticateToken = require('../middleware/auth');



// Let's create a simple in-memory store
const commandStore = require('../lib/commandStore');

router.post('/', authenticateToken, (req, res) => {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
        return res.status(400).json({ error: "Missing deviceId or command" });
    }

    db.query('SELECT * FROM devices WHERE device_id = $1 AND user_id = $2', [deviceId, req.user.id], (err, resDb) => {
        if (err) return res.status(500).json({ error: err.message });
        if (resDb.rows.length === 0) return res.status(403).json({ error: "You do not own this device" });

        console.log(`Queueing command '${command}' for ${deviceId}`);
        commandStore.set(deviceId, command);

        const topic = `plantcare/${deviceId}/command`;
        mqttClient.publish(topic, command, (err) => {
            if (err) {
                console.error("MQTT Publish Error:", err);
            } else {
                console.log(`MQTT: Published '${command}' to ${topic}`);
            }
        });

        res.json({ message: "Command queued and published", deviceId, command });
    });
});

module.exports = router;
