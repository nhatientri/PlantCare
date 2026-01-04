const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'plantcare.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database ' + dbPath + ': ' + err.message);
    } else {
        console.log('Connected to the SQLite database.');

        db.serialize(() => {
            // Main readings table (Device level)
            db.run(`CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id TEXT,
                temperature REAL,
                humidity REAL,
                pump_state INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Plant specific readings (Moisture)
            db.run(`CREATE TABLE IF NOT EXISTS plant_readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                reading_id INTEGER,
                sensor_index INTEGER,
                moisture REAL,
                FOREIGN KEY(reading_id) REFERENCES readings(id)
            )`);

            // Users Table
            db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE,
                password TEXT
            )`);

            // Devices Table (Ownership)
            db.run(`CREATE TABLE IF NOT EXISTS devices (
                device_id TEXT PRIMARY KEY,
                user_id INTEGER,
                name TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )`);
        });
    }
});

module.exports = db;
