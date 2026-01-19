const express = require('express');
const router = express.Router();
const db = require('../database');
const mqttClient = require('../lib/mqttClient');
const authenticateToken = require('../middleware/auth');

// In-memory command queue
const commands = {}; // We might need to export this or move it to a shared state if readings route needs it

// For now, let's keep it local to this module, but wait... 
// The READINGS route needs access to this 'commands' object to send it back to ESP32.
// So we should move this state to a separate module or export it.

// Let's create a simple in-memory store
const commandStore = require('../lib/commandStore');

router.post('/', authenticateToken, (req, res) => {
    const { deviceId, command } = req.body;
    if (!deviceId || !command) {
        return res.status(400).json({ error: "Missing deviceId or command" });
    }

    db.get('SELECT * FROM devices WHERE device_id = ? AND user_id = ?', [deviceId, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(403).json({ error: "You do not own this device" });

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
