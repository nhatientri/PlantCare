const db = require('../db');

class DataService {
    async clearHistory(userId) {
        await db.query(`
            DELETE FROM readings 
            WHERE device_id IN (
                SELECT device_id FROM user_devices WHERE user_id = $1
            )
        `, [userId]);
        return true;
    }

    async getHistory(deviceId, range) {
        let interval = '24 hours';
        let sampleRate = 1;

        if (range === '1h') {
            interval = '1 hour';
            sampleRate = 1;
        } else if (range === '24h' || range === '1d') {
            interval = '24 hours';
            sampleRate = 10;
        } else if (range === '7d' || range === '1w') {
            interval = '7 days';
            sampleRate = 60;
        }

        const result = await db.query(`
            SELECT data, created_at 
            FROM readings 
            WHERE device_id = $1 
            AND created_at > NOW() - $2::INTERVAL
            ORDER BY created_at ASC 
        `, [deviceId, interval]);

        return result.rows
            .map(row => ({
                ...row.data,
                time: new Date(row.created_at).getTime()
            }))
            .filter((_, index) => index % sampleRate === 0);
    }

    async getLogs(deviceId, limit = 50) {
        let query = "SELECT * FROM system_logs";
        const params = [];

        if (deviceId) {
            query += " WHERE device_id = $1";
            params.push(deviceId);
        }

        query += " ORDER BY created_at DESC LIMIT $" + (params.length + 1);
        params.push(limit);

        const result = await db.query(query, params);
        return result.rows;
    }

    async createLog(deviceId, type, message) {
        await db.query(
            "INSERT INTO system_logs (device_id, type, message) VALUES ($1, $2, $3)",
            [deviceId, type, message]
        );
        return true;
    }

    async getAnalytics(deviceId) {
        // 1. Avg WiFi Signal (Last 24h)
        const avgWifi = await db.query(`
            SELECT AVG((data->>'rssi')::float) as val 
            FROM readings 
            WHERE created_at > NOW() - INTERVAL '24 HOURS' 
            ${deviceId ? "AND device_id = $1" : ""}
        `, deviceId ? [deviceId] : []);

        // 2. Pump Usage History (For Chart - Keep 7 Days)
        let historyQuery = `
            SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as day, COUNT(*) as count
            FROM system_logs 
            WHERE message LIKE '%PUMP_ON%' 
            AND created_at > NOW() - INTERVAL '7 DAYS' 
            ${deviceId ? "AND device_id = $1" : ""}
            GROUP BY 1
            ORDER BY 1 ASC
        `;

        const historyRes = await db.query(historyQuery, deviceId ? [deviceId] : []);

        // 3. Pump Count (Last 24h - For Cards)
        const pump24h = await db.query(`
            SELECT COUNT(*) as count 
            FROM system_logs
            WHERE message LIKE '%PUMP_ON%'
            AND created_at > NOW() - INTERVAL '24 HOURS'
            ${deviceId ? "AND device_id = $1" : ""}
        `, deviceId ? [deviceId] : []);

        // Fill in missing days
        const history = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const found = historyRes.rows.find(r => r.day === dateStr);
            history.push({
                date: dateStr,
                count: found ? parseInt(found.count) : 0
            });
        }

        return {
            wifiStrength: parseFloat(avgWifi.rows[0].val || 0).toFixed(0),
            uptime: "99.9%",
            pumpCount: parseInt(pump24h.rows[0].count || 0),
            history: history
        };
    }
}

module.exports = new DataService();
