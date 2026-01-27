const authService = require('../services/auth.service');

class AuthController {
    async register(req, res) {
        try {
            const { username, password } = req.body;
            const user = await authService.register(username, password);
            res.json({ user });
        } catch (e) {
            res.status(500).json({ error: "User exists or error" });
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const user = await authService.login(username, password);
            if (user) {
                res.json({ user });
            } else {
                res.status(401).json({ error: "Invalid credentials" });
            }
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: "Error" });
        }
    }

    async changePassword(req, res) {
        try {
            const { username, oldPassword, newPassword } = req.body;
            await authService.changePassword(username, oldPassword, newPassword);
            res.json({ success: true });
        } catch (e) {
            if (e.message === "Incorrect old password" || e.message === "User not found") {
                return res.status(401).json({ error: e.message });
            }
            console.error(e);
            res.status(500).json({ error: "Server Error" });
        }
    }
}

module.exports = new AuthController();
