const db = require('../db');
const bcrypt = require('bcrypt');

class AuthService {
    async register(username, password) {
        const hash = await bcrypt.hash(password, 10);
        const result = await db.query(
            "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
            [username, hash]
        );
        return result.rows[0];
    }

    async login(username, password) {
        const result = await db.query("SELECT id, username, password_hash FROM users WHERE username=$1", [username]);

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        const storedHash = user.password_hash;
        let match = await bcrypt.compare(password, storedHash);

        // Legacy Migration
        if (!match) {
            const legacyHash = Buffer.from(password).toString('base64');
            if (legacyHash === storedHash) {
                const newHash = await bcrypt.hash(password, 10);
                await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, user.id]);
                match = true;
                console.log(`[Auth] Migrated user ${username} to bcrypt.`);
            }
        }

        if (match) {
            delete user.password_hash;
            return user;
        }
        return null;
    }

    async changePassword(username, oldPassword, newPassword) {
        const result = await db.query("SELECT id, password_hash FROM users WHERE username=$1", [username]);
        if (result.rows.length === 0) throw new Error("User not found");

        const user = result.rows[0];
        const match = await bcrypt.compare(oldPassword, user.password_hash);

        if (!match) throw new Error("Incorrect old password");

        const newHash = await bcrypt.hash(newPassword, 10);
        await db.query("UPDATE users SET password_hash=$1 WHERE id=$2", [newHash, user.id]);
        return true;
    }
}

module.exports = new AuthService();
