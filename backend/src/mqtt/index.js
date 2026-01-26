const mqtt = require('mqtt');
const db = require('../db');
const { broadcastDeviceUpdate } = require('../gateway');
require('dotenv').config();

const initMqtt = () => {
    const client = mqtt.connect(process.env.MQTT_BROKER);

    client.on('connect', () => {
        console.log('Connected to MQTT Broker');
        client.subscribe('plantcare/+/status');
        client.subscribe('plantcare/+/online');
    });

    client.on('message', async (topic, message) => {
        try {
            // topic: plantcare/DEVICE_ID/TYPE
            const parts = topic.split('/');
            const deviceId = parts[1];
            const type = parts[2];
            const payloadStr = message.toString();

            if (type === 'status') {
                let data;
                try {
                    data = JSON.parse(payloadStr);
                } catch (e) {
                    console.warn(`[MQTT] Received non-JSON on status topic ${topic}: ${payloadStr}`);
                    return;
                }

                // 1. Upsert Device
                // data.claim_pass comes from firmware. Save it as claim_token for verification.
                const claimToken = data.claim_pass || null;

                await db.query(`
          INSERT INTO devices (device_id, name, status, is_online, last_seen, config, claim_token)
          VALUES ($1, $1, $2, true, NOW(), $3, $4)
          ON CONFLICT (device_id) 
          DO UPDATE SET 
            status = EXCLUDED.status,
            is_online = true,
            last_seen = NOW(),
            config = devices.config || EXCLUDED.config,
            claim_token = COALESCE(EXCLUDED.claim_token, devices.claim_token);
        `, [deviceId, data.state, data, claimToken]); // using data as config for now, can refine later

                // 2. Insert Reading
                await db.query(`
          INSERT INTO readings (device_id, data)
          VALUES ($1, $2)
        `, [deviceId, data]);

                // 3. Broadcast to Frontend
                broadcastDeviceUpdate(deviceId, { ...data, online: true });
                console.log(`[${deviceId}] Status updated & saved.`);

            } else if (type === 'online') {
                const isOnline = payloadStr.toLowerCase() === 'true';

                await db.query(`
          INSERT INTO devices (device_id, is_online, last_seen)
          VALUES ($1, $2, NOW())
          ON CONFLICT (device_id)
          DO UPDATE SET is_online = $2, last_seen = NOW();
        `, [deviceId, isOnline]);

                broadcastDeviceUpdate(deviceId, { online: isOnline });
                console.log(`[${deviceId}] Online: ${isOnline}`);
            }
        } catch (err) {
            console.error(`Error processing MQTT message on [${topic}]:`, err);
        }
    });

    return client;
};

const sendCommand = (deviceId, cmd) => {
    // Topic: plantcare/DEVICE_ID/cmd
    const client = mqtt.connect(process.env.MQTT_BROKER);
    // Note: Creating new connection for simplicity, ideally reuse global client.
    // Let's modify initMqtt to export client.
    // Actually, let's keep it simple: just connect, publish, end.
    client.on('connect', () => {
        client.publish(`plantcare/${deviceId}/cmd`, cmd, () => {
            client.end();
        });
    });
};

module.exports = { initMqtt, sendCommand };
