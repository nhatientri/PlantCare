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
        });
    }
});

module.exports = db;
