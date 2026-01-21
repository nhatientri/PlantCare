const mqtt = require('mqtt');
const db = require('../database');
const mqttClient = mqtt.connect('mqtt://broker.emqx.io:1883');

mqttClient.on('connect', () => {
    console.log('Connected to MQTT Broker');
    mqttClient.subscribe('plantcare/readings', (err) => {
        if (!err) console.log("Subscribed to plantcare/readings");
    });
});

mqttClient.on('message', async (topic, message) => {
    if (topic === 'plantcare/readings') {
        try {
            const payload = JSON.parse(message.toString());
            // Check if this is a "partial" update (like threshold confirmation)
            if (payload.updateType === 'threshold') {
                console.log(`MQTT: Received Threshold Update for ${payload.deviceId}: ${payload.threshold}%`);

                // We need to broadcast this via Socket.IO so the frontend updates immediately
                const io = require('../server').io; // Circular dependency might be tricky. 
                // Better pattern: emit an event or attach io to global/app.
                // For now, let's rely on the DB update + frontend polling/socket logic?
                // Wait, server.js sets app.set('socketio', io). 
                // Getting `io` here is hard without restructuring.

                // Correction: Let's do the ingestion logic here simply:
                // 1. Update DB (if we had a 'threshold' column on devices table? No, it's inside JSON)
                // Actually, readings are immutable history. We should just emit it.
                // But we can't easily emit from here without Refactoring.

                // Quick Fix: Let's move this logic to server.js or inject IO?
            }
        } catch (e) {
            console.error("MQTT Message Error:", e);
        }
    }
});

mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
});

module.exports = mqttClient;
