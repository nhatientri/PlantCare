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
                // Global Throttle: Ignore same device status < 2 seconds for DB stability
                if (!global.lastMsg) global.lastMsg = {};
                const lastMsgTime = global.lastMsg[deviceId] || 0;
                const now = Date.now();
                if (now - lastMsgTime < 200) return;
                global.lastMsg[deviceId] = now;

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
                // SANITIZE: Remove sensitive claim data before sending to frontend
                const cleanData = { ...data, online: true };
                delete cleanData.claim_pass;
                delete cleanData.claim_token;

                broadcastDeviceUpdate(deviceId, cleanData);
                // console.log(`[${deviceId}] Status updated & saved.`);

                // 4. Log Critical Errors automagically
                const state = parseInt(data.state);
                if (state === 3 || state === 4) {
                    await db.query(
                        "INSERT INTO system_logs (device_id, type, message) VALUES ($1, 'error', $2)",
                        [deviceId, `Critical Error State: ${state}`]
                    );
                }

            } else if (type === 'online') {
                const isOnline = payloadStr.toLowerCase() === 'true';

                await db.query(`
          INSERT INTO devices (device_id, is_online, last_seen)
          VALUES ($1, $2, NOW())
          ON CONFLICT (device_id)
          DO UPDATE SET is_online = $2, last_seen = NOW();
        `, [deviceId, isOnline]);

                broadcastDeviceUpdate(deviceId, { online: isOnline });
                // console.log(`[${deviceId}] Online: ${isOnline}`);

                // Log online/offline events with throttling (Anti-spam)
                // If the same device logs the same status within 1 minute, skip it.
                // We rely on memory cache for this check.
                if (!global.lastLog) global.lastLog = {};
                const lastLogTime = global.lastLog[deviceId] || 0;
                if (Date.now() - lastLogTime > 60000) { // 1 minute throttle for connection logs
                    await db.query(
                        "INSERT INTO system_logs (device_id, type, message) VALUES ($1, $2, $3)",
                        [deviceId, isOnline ? 'info' : 'warning', `Device is ${isOnline ? 'Online' : 'Offline'}`]
                    );
                    global.lastLog[deviceId] = Date.now();
                }
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

    client.on('connect', () => {
        client.publish(`plantcare/${deviceId}/cmd`, cmd, async () => {
            console.log(`Sent command ${cmd} to ${deviceId}`);

            // Log command
            try {
                // We need to import db inside or use the global one if available. 
                // Since 'db' is required at top, we are good.
                await db.query(
                    "INSERT INTO system_logs (device_id, type, message) VALUES ($1, 'info', $2)",
                    [deviceId, `Command Sent: ${cmd}`]
                );
            } catch (e) { console.error("Failed to log command", e); }

            client.end();
        });
    });
};

module.exports = { initMqtt, sendCommand };
