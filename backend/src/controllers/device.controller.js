const deviceService = require('../services/device.service');

class DeviceController {
    async claim(req, res) {
        const { userId, deviceId, password } = req.body;
        try {
            await deviceService.claimDevice(userId, deviceId, password);
            res.json({ success: true });
        } catch (e) {
            if (e.message === "Device not online") return res.status(404).json({ error: e.message });
            if (e.message === "Already claimed by you") return res.status(400).json({ error: e.message });
            if (e.message === "Incorrect Password") return res.status(403).json({ error: e.message });

            res.status(500).json({ error: e.message });
        }
    }

    async list(req, res) {
        try {
            const devices = await deviceService.getDevices(req.query.userId);
            res.json(devices);
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Internal Server Error" });
        }
    }

    async delete(req, res) {
        const { deviceId } = req.params;
        const { userId } = req.body;
        try {
            await deviceService.deleteDevice(userId, deviceId);
            res.json({ success: true });
        } catch (e) {
            if (e.message === "Device not found") return res.status(404).json({ error: e.message });
            res.status(500).json({ error: e.message });
        }
    }

    async rename(req, res) {
        const { deviceId } = req.params;
        const { userId, nickname } = req.body;
        try {
            await deviceService.renameDevice(userId, deviceId, nickname);
            res.json({ success: true });
        } catch (e) {
            if (e.message === "Device not found") return res.status(404).json({ error: e.message });
            res.status(500).json({ error: e.message });
        }
    }

    async command(req, res) {
        const { deviceId, cmd } = req.body;
        try {
            await deviceService.sendCommand(deviceId, cmd);
            res.json({ success: true });
        } catch (e) {
            if (e.message === "Missing params") return res.status(400).json({ error: e.message });
            res.status(500).json({ error: e.message });
        }
    }
}

module.exports = new DeviceController();
