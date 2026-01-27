const dataService = require('../services/data.service');

class DataController {
    async clearHistory(req, res) {
        const { userId } = req.body;
        try {
            await dataService.clearHistory(userId);
            res.json({ success: true, message: "History cleared" });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Db Error" });
        }
    }

    async getHistory(req, res) {
        try {
            const { deviceId } = req.params;
            const { range } = req.query;
            const history = await dataService.getHistory(deviceId, range);
            res.json(history);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Db Error" });
        }
    }

    async getLogs(req, res) {
        try {
            const { deviceId, limit } = req.query;
            const logs = await dataService.getLogs(deviceId, limit);
            res.json(logs);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Db Error" });
        }
    }

    async createLog(req, res) {
        const { deviceId, type, message } = req.body;
        try {
            await dataService.createLog(deviceId, type, message);
            res.json({ success: true });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Db Error" });
        }
    }

    async getAnalytics(req, res) {
        try {
            const { deviceId } = req.query;
            const analytics = await dataService.getAnalytics(deviceId);
            res.json(analytics);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Db Error" });
        }
    }
}

module.exports = new DataController();
